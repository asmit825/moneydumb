#!/usr/bin/env node
/**
 * migrate-to-neon.mjs
 * 
 * Migrates all data from local SQLite (moneydumb.db) to Neon Postgres
 * using raw SQL strings (no parameterized queries — safe for migration only).
 * 
 * Usage:
 *   POSTGRES_URL="postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" \
 *   node scripts/migrate-to-neon.mjs
 */

import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import { resolve } from 'path';

// ── Configuration ──────────────────────────────────────────────────────
const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('❌ Missing POSTGRES_URL environment variable.');
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

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  // Escape single quotes by doubling them
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function migrateTable(tableName) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) {
    console.log(`   ⏭️  ${tableName}: 0 rows (skipped)`);
    return 0;
  }

  const columns = getColumns(tableName);
  const colNames = columns.map((c) => `"${c}"`).join(', ');

  let inserted = 0;
  for (const row of rows) {
    const values = columns.map((col) => escapeValue(row[col])).join(', ');
    const queryText = `INSERT INTO ${tableName} (${colNames}) VALUES (${values}) ON CONFLICT DO NOTHING`;

    try {
      await sql.unsafe(queryText);
      inserted++;
    } catch (err) {
      console.error(`   ⚠️  ${tableName} error:`, err.message?.substring(0, 120));
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
  sqlite.close();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
