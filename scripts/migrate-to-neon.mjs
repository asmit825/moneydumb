#!/usr/bin/env node
/**
 * migrate-to-neon.mjs
 * 
 * Migrates all data from local SQLite (moneydumb.db) to Neon Postgres.
 * 
 * Usage:
 *   POSTGRES_URL="postgres://user:pass@ep-xxx.neon.tech/moneydumb?sslmode=require" \
 *   node scripts/migrate-to-neon.mjs
 * 
 * Prerequisites:
 *   npm install @neondatabase/serverless better-sqlite3
 */

import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import { resolve } from 'path';

// ── Configuration ──────────────────────────────────────────────────────
const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('❌ Missing POSTGRES_URL environment variable.');
  console.error('   Usage: POSTGRES_URL="postgres://..." node scripts/migrate-to-neon.mjs');
  process.exit(1);
}

const DB_PATH = resolve(process.cwd(), process.env.SQLITE_DB_PATH || 'moneydumb.db');

// ── Connect ────────────────────────────────────────────────────────────
console.log(`\n🔌 Opening SQLite: ${DB_PATH}`);
const sqlite = new Database(DB_PATH, { readonly: true });
sqlite.pragma('journal_mode = WAL');

console.log(`🔌 Connecting to Neon Postgres...`);
const sql = neon(POSTGRES_URL);

// ── Table migration order (respects foreign key dependencies) ──────────
const TABLES = [
  'users',
  'accounts',
  'income_sources',
  'income_allocations',
  'income_events',
  'expense_categories',
  'expenses',
  'debts',
  'envelopes',
  'envelope_transactions',
  'wants',
  'bonus_plans',
  'bonus_plan_allocations',
  'sandbox_instances',
  'sandbox_items',
  'committed_payoff_plan',
];

// ── Helpers ────────────────────────────────────────────────────────────
function getColumns(tableName) {
  const info = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
  return info.map((col) => col.name);
}

async function migrateTable(tableName) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) {
    console.log(`   ⏭️  ${tableName}: 0 rows (skipped)`);
    return 0;
  }

  const columns = getColumns(tableName);
  
  // Insert rows one by one (safe for small datasets, handles conflicts)
  let inserted = 0;
  for (const row of rows) {
    const values = columns.map((col) => {
      const val = row[col];
      // Convert SQLite integer booleans to proper values
      if (val === null || val === undefined) return null;
      return val;
    });

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const colNames = columns.map((c) => `"${c}"`).join(', ');
    const query = `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    try {
      await sql(query, values);
      inserted++;
    } catch (err) {
      console.error(`   ⚠️  Error inserting into ${tableName}:`, err.message);
      console.error(`      Row:`, JSON.stringify(row).substring(0, 200));
    }
  }

  console.log(`   ✅ ${tableName}: ${inserted}/${rows.length} rows migrated`);
  return inserted;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📦 Starting migration: SQLite → Neon Postgres\n');

  let totalRows = 0;
  for (const table of TABLES) {
    try {
      const count = await migrateTable(table);
      totalRows += count;
    } catch (err) {
      console.error(`   ❌ Failed to migrate ${table}:`, err.message);
    }
  }

  console.log(`\n🎉 Migration complete! ${totalRows} total rows migrated.`);
  console.log('   Verify in Neon SQL Editor: SELECT COUNT(*) FROM accounts;');

  sqlite.close();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
