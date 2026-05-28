#!/usr/bin/env node
/**
 * migrate-to-neon.mjs — SQLite → Neon Postgres migration
 * 
 * Uses individual tagged-template INSERT statements per row.
 * This is the only reliable approach with @neondatabase/serverless.
 */

import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import { resolve } from 'path';

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) { console.error('❌ Missing POSTGRES_URL'); process.exit(1); }

const DB_PATH = resolve(process.cwd(), process.env.SQLITE_DB_PATH || 'moneydumb.db');
console.log(`\n🔌 SQLite: ${DB_PATH}`);
const sqlite = new Database(DB_PATH, { readonly: true });
sqlite.pragma('journal_mode = WAL');

console.log(`🔌 Connecting to Neon...`);
const sql = neon(POSTGRES_URL);

// ── Each table gets its own insert function with explicit columns ──

async function insertUser(row) {
  await sql`INSERT INTO users (id, username, password_hash, created_at)
    VALUES (${row.id}, ${row.username}, ${row.password_hash}, ${row.created_at})
    ON CONFLICT DO NOTHING`;
}

async function insertAccount(row) {
  await sql`INSERT INTO accounts (id, user_id, name, account_type, balance, notes, created_at, balance_updated_at)
    VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.account_type}, ${row.balance}, ${row.notes}, ${row.created_at}, ${row.balance_updated_at})
    ON CONFLICT DO NOTHING`;
}

async function insertIncomeSource(row) {
  await sql`INSERT INTO income_sources (id, user_id, name, gross_amount, net_amount, frequency, next_pay_date, notes, created_at)
    VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.gross_amount}, ${row.net_amount}, ${row.frequency}, ${row.next_pay_date}, ${row.notes}, ${row.created_at})
    ON CONFLICT DO NOTHING`;
}

async function insertIncomeAllocation(row) {
  await sql`INSERT INTO income_allocations (id, income_source_id, account_id, allocation_type, allocation_value)
    VALUES (${row.id}, ${row.income_source_id}, ${row.account_id}, ${row.allocation_type}, ${row.allocation_value})
    ON CONFLICT DO NOTHING`;
}

async function insertIncomeEvent(row) {
  await sql`INSERT INTO income_events (id, income_source_id, amount, received_date, is_bonus, notes, created_at, account_id)
    VALUES (${row.id}, ${row.income_source_id}, ${row.amount}, ${row.received_date}, ${row.is_bonus}, ${row.notes}, ${row.created_at}, ${row.account_id})
    ON CONFLICT DO NOTHING`;
}

async function insertExpenseCategory(row) {
  await sql`INSERT INTO expense_categories (id, user_id, name, color, icon)
    VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.color}, ${row.icon})
    ON CONFLICT DO NOTHING`;
}

async function insertExpense(row) {
  await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes, url, created_at)
    VALUES (${row.id}, ${row.user_id}, ${row.category_id}, ${row.name}, ${row.amount}, ${row.due_day_of_month}, ${row.is_recurring}, ${row.frequency}, ${row.account_id}, ${row.notes}, ${row.url}, ${row.created_at})
    ON CONFLICT DO NOTHING`;
}

async function insertDebt(row) {
  await sql`INSERT INTO debts (id, user_id, name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, debt_quality, url, created_at, payment_strategy)
    VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.balance}, ${row.interest_rate}, ${row.minimum_payment}, ${row.amount_due_immediately}, ${row.account_id}, ${row.due_day_of_month}, ${row.debt_type}, ${row.debt_quality}, ${row.url}, ${row.created_at}, ${row.payment_strategy})
    ON CONFLICT DO NOTHING`;
}

async function insertEnvelope(row) {
  await sql`INSERT INTO envelopes (id, user_id, name, category_id, budgeted_amount, spent_amount, month, year, account_id, notes)
    VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.category_id}, ${row.budgeted_amount}, ${row.spent_amount}, ${row.month}, ${row.year}, ${row.account_id}, ${row.notes})
    ON CONFLICT DO NOTHING`;
}

async function insertEnvelopeTransaction(row) {
  await sql`INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date)
    VALUES (${row.id}, ${row.envelope_id}, ${row.amount}, ${row.description}, ${row.transaction_date})
    ON CONFLICT DO NOTHING`;
}

async function insertWant(row) {
  await sql`INSERT INTO wants (id, user_id, name, estimated_cost, priority, notes, url, created_at, purchased_at)
    VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.estimated_cost}, ${row.priority}, ${row.notes}, ${row.url}, ${row.created_at}, ${row.purchased_at})
    ON CONFLICT DO NOTHING`;
}

async function insertBonusPlan(row) {
  await sql`INSERT INTO bonus_plans (id, user_id, income_event_id, total_amount, strategy, notes, created_at)
    VALUES (${row.id}, ${row.user_id}, ${row.income_event_id}, ${row.total_amount}, ${row.strategy}, ${row.notes}, ${row.created_at})
    ON CONFLICT DO NOTHING`;
}

async function insertBonusPlanAllocation(row) {
  await sql`INSERT INTO bonus_plan_allocations (id, bonus_plan_id, allocation_type, reference_id, amount, order_index)
    VALUES (${row.id}, ${row.bonus_plan_id}, ${row.allocation_type}, ${row.reference_id}, ${row.amount}, ${row.order_index})
    ON CONFLICT DO NOTHING`;
}

async function insertSandboxInstance(row) {
  await sql`INSERT INTO sandbox_instances (id, user_id, month, year, created_at)
    VALUES (${row.id}, ${row.user_id}, ${row.month}, ${row.year}, ${row.created_at})
    ON CONFLICT DO NOTHING`;
}

async function insertSandboxItem(row) {
  await sql`INSERT INTO sandbox_items (id, instance_id, item_type, item_ref_id, is_paid, amount_override, account_id, name)
    VALUES (${row.id}, ${row.instance_id}, ${row.item_type}, ${row.item_ref_id}, ${row.is_paid}, ${row.amount_override}, ${row.account_id}, ${row.name})
    ON CONFLICT DO NOTHING`;
}

async function insertCommittedPayoffPlan(row) {
  await sql`INSERT INTO committed_payoff_plan (id, user_id, strategy, extra_payment, target_months, excluded_debt_ids, committed_at)
    VALUES (${row.id}, ${row.user_id}, ${row.strategy}, ${row.extra_payment}, ${row.target_months}, ${row.excluded_debt_ids}, ${row.committed_at})
    ON CONFLICT DO NOTHING`;
}

// ── Table config ──
const TABLES = [
  { name: 'users', insert: insertUser },
  { name: 'accounts', insert: insertAccount },
  { name: 'income_sources', insert: insertIncomeSource },
  { name: 'income_allocations', insert: insertIncomeAllocation },
  { name: 'income_events', insert: insertIncomeEvent },
  { name: 'expense_categories', insert: insertExpenseCategory },
  { name: 'expenses', insert: insertExpense },
  { name: 'debts', insert: insertDebt },
  { name: 'envelopes', insert: insertEnvelope },
  { name: 'envelope_transactions', insert: insertEnvelopeTransaction },
  { name: 'wants', insert: insertWant },
  { name: 'bonus_plans', insert: insertBonusPlan },
  { name: 'bonus_plan_allocations', insert: insertBonusPlanAllocation },
  { name: 'sandbox_instances', insert: insertSandboxInstance },
  { name: 'sandbox_items', insert: insertSandboxItem },
  { name: 'committed_payoff_plan', insert: insertCommittedPayoffPlan },
];

// ── Main ──
async function main() {
  console.log('\n📦 Migrating SQLite → Neon Postgres\n');

  let total = 0;
  for (const { name, insert } of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM ${name}`).all();
    if (!rows.length) { console.log(`   ⏭️  ${name}: 0 rows`); continue; }
    
    let ok = 0;
    for (const row of rows) {
      try { await insert(row); ok++; }
      catch (e) { console.error(`   ⚠️  ${name}:`, e.message?.substring(0, 100)); }
    }
    console.log(`   ✅ ${name}: ${ok}/${rows.length}`);
    total += ok;
  }

  // Verify
  console.log('\n🔍 Verifying row counts in Neon...');
  const counts = await sql`
    SELECT 'users' as t, COUNT(*) as c FROM users UNION ALL
    SELECT 'accounts', COUNT(*) FROM accounts UNION ALL
    SELECT 'income_sources', COUNT(*) FROM income_sources UNION ALL
    SELECT 'expenses', COUNT(*) FROM expenses UNION ALL
    SELECT 'debts', COUNT(*) FROM debts UNION ALL
    SELECT 'envelopes', COUNT(*) FROM envelopes UNION ALL
    SELECT 'wants', COUNT(*) FROM wants UNION ALL
    SELECT 'sandbox_items', COUNT(*) FROM sandbox_items
  `;
  for (const r of counts) console.log(`   ${r.t}: ${r.c}`);

  console.log(`\n🎉 Done! ${total} rows migrated.`);
  sqlite.close();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
