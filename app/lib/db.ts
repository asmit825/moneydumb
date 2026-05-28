import fs from 'fs';
import path from 'path';
import { sql as vercelSql } from '@vercel/postgres';

// Determine environment
const isSqlite = 
  process.env.USE_SQLITE === 'true' || 
  process.env.NODE_ENV === 'development' ||
  !process.env.POSTGRES_URL;

let sqliteDb: any = null;
let initialized = false;

// Initialize Database connection and run migrations if needed
function getDb() {
  if (isSqlite) {
    if (!sqliteDb) {
      // Dynamic require — prevents Vercel from bundling the native C++ module
      const Database = require('better-sqlite3');

      const dbPath = path.resolve(process.cwd(), process.env.SQLITE_DB_PATH || 'moneydumb.db');
      console.log(`🔌 [DB] Connecting to SQLite at: ${dbPath}`);
      
      // Ensure the parent directory exists
      const parentDir = path.dirname(dbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      sqliteDb = new Database(dbPath);
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');

      // Run local SQLite migrations
      runMigrations(sqliteDb);
    }
    return sqliteDb;
  }
  return null;
}

// Run migrations script
function runMigrations(db: any) {
  if (initialized) return;
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableCheck) {
      console.log("⚙️ [DB] Running SQLite migrations...");
      const schemaPath = path.resolve(process.cwd(), 'app/lib/schema-sqlite.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schemaSql);
      
      // Seed default categories
      const count = db.prepare("SELECT COUNT(*) as count FROM expense_categories").get().count;
      if (count === 0) {
        console.log("🌱 [DB] Seeding default categories...");
        // Creating a temporary system user for seeding if none exists, or let sandbox seed it
      }
      console.log("✅ [DB] SQLite migrations completed successfully.");
    }
    initialized = true;
  } catch (error) {
    console.error("❌ [DB] SQLite Migrations Error:", error);
  }
}

// Unified query function supporting both SQLite and Postgres
export async function query(queryString: string, params: any[] = []) {
  if (isSqlite) {
    const db = getDb();
    try {
      // Replace Postgres-style parameters ($1, $2, ...) with SQLite (?)
      const sqliteQuery = queryString.replace(/\$\d+/g, '?');
      const stmt = db.prepare(sqliteQuery);
      
      const isReader = stmt.reader !== undefined ? stmt.reader : /^\s*(select|with)/i.test(sqliteQuery);
      if (isReader) {
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const result = stmt.run(...params);
        const rows = result.lastInsertRowid ? [{ id: String(result.lastInsertRowid) }] : [];
        return { rows };
      }
    } catch (error) {
      console.error('Database Error (SQLite):', error);
      throw new Error(`Failed to query SQLite: ${(error as Error).message}`);
    }
  } else {
    // Postgres Cloud
    try {
      return await vercelSql.query(queryString, params);
    } catch (error) {
      console.error('Database Error (Postgres):', error);
      throw new Error(`Failed to query Postgres: ${(error as Error).message}`);
    }
  }
}

// Dynamic tagged template literal matching Vercel Postgres's `sql`
export async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<{ rows: any[] }> {
  if (isSqlite) {
    const db = getDb();
    try {
      // Construct parameter placeholder query (using ?)
      const sqliteQuery = strings.join('?');
      const stmt = db.prepare(sqliteQuery);
      
      const isReader = stmt.reader !== undefined ? stmt.reader : /^\s*(select|with)/i.test(sqliteQuery);
      if (isReader) {
        const rows = stmt.all(...values);
        return { rows };
      } else {
        const result = stmt.run(...values);
        const rows = result.lastInsertRowid ? [{ id: String(result.lastInsertRowid) }] : [];
        return { rows };
      }
    } catch (error) {
      console.error('Database Error (SQLite Template):', error, '\nQuery:', strings.join('?'), '\nValues:', values);
      throw new Error(`SQLite query execution failed: ${(error as Error).message}`);
    }
  } else {
    // Fall back to production Vercel Postgres sql template literal
    try {
      return await vercelSql(strings, ...values);
    } catch (error) {
      console.error('Database Error (Postgres Template):', error);
      throw new Error(`Postgres query execution failed: ${(error as Error).message}`);
    }
  }
}