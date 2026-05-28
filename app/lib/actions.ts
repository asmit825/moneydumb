'use server';

import { sql } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

// --- 1. IDENTITY & AUTHENTICATION ---

export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  if (!username || !password) return { message: 'Missing fields' };

  try {
    const existing = await sql`SELECT * FROM users WHERE username = ${username}`;
    if (existing.rows.length > 0) return { message: 'Identity exists' };

    const id = crypto.randomUUID();
    const hashed = await bcrypt.hash(password, 10);
    await sql`INSERT INTO users (id, username, password_hash) VALUES (${id}, ${username}, ${hashed})`;
    return { success: true };
  } catch (e: any) {
    console.error('Registration error:', e);
    return { message: 'Database identity configuration failed' };
  }
}

export async function authenticate(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  let userId: string | null = null;

  try {
    const userResult = await sql`SELECT * FROM users WHERE username = ${username}`;
    
    if (userResult.rows.length === 0) {
      console.log('[Auth] User not found:', username);
      redirect('/');
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.log('[Auth] Password mismatch for:', username);
      redirect('/');
    }

    userId = user.id;

    // Success: Establish secure HTTP-only Session Cookie
    const cookieStore = await cookies();
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

  } catch (e: any) {
    // Next.js redirect() works by throwing — always re-throw it
    if (e?.digest?.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    console.error('Authentication error:', e);
    redirect('/');
  }
  
  redirect('/dashboard');
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/');
}

// --- 2. PREMIUM SANDBOX & DEMO SEEDING ---

export async function loginDemoUser() {
  const cookieStore = await cookies();
  
  try {
    // A. AUTO-CLEANUP: Wipe demo accounts older than 24 hours to optimize database health
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await sql`
      DELETE FROM users 
      WHERE username LIKE 'demo_%' 
      AND created_at < ${cutoff}
    `;

    // B. Create a unique throwaway sandbox account
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const uniqueUsername = `demo_${timestamp}_${randomSuffix}`;
    const hashed = await bcrypt.hash('demo123', 10);
    
    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, username, password_hash) 
      VALUES (${userId}, ${uniqueUsername}, ${hashed})
    `;

    // C. COMPREHENSIVE SEEDING SYSTEM (Matching 16-Table Schema)
    
    // 1. Core Financial Accounts
    const chaseId = crypto.randomUUID();
    const savingsId = crypto.randomUUID();
    const brokerageId = crypto.randomUUID();

    await sql`INSERT INTO accounts (id, user_id, name, account_type, balance, notes) VALUES (${chaseId}, ${userId}, 'Chase Checking', 'checking', 4250.00, 'Primary household transactions')`;
    await sql`INSERT INTO accounts (id, user_id, name, account_type, balance, notes) VALUES (${savingsId}, ${userId}, 'Amex Savings', 'savings', 12000.00, 'Emergency reserves (5.0% APY)')`;
    await sql`INSERT INTO accounts (id, user_id, name, account_type, balance, notes) VALUES (${brokerageId}, ${userId}, 'Fidelity Brokerage', 'investment', 18500.00, 'Roth IRA & core market indices')`;

    // 2. Customized Expense Categories
    const housingId = crypto.randomUUID();
    const subId = crypto.randomUUID();
    const foodId = crypto.randomUUID();
    const utilId = crypto.randomUUID();
    const entId = crypto.randomUUID();
    const transportId = crypto.randomUUID();
    const debtCatId = crypto.randomUUID();
    const otherId = crypto.randomUUID();

    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${housingId}, ${userId}, 'Housing', '#ef4444', '🏠')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${subId}, ${userId}, 'Subscriptions', '#3b82f6', '🔄')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${foodId}, ${userId}, 'Food', '#10b981', '🍔')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${utilId}, ${userId}, 'Utilities', '#f59e0b', '⚡')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${entId}, ${userId}, 'Entertainment', '#ec4899', '🎬')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${transportId}, ${userId}, 'Transport', '#14b8a6', '🚗')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${debtCatId}, ${userId}, 'Debts', '#8b5cf6', '💸')`;
    await sql`INSERT INTO expense_categories (id, user_id, name, color, icon) VALUES (${otherId}, ${userId}, 'Other', '#6b7280', '📦')`;

    // 3. Regular Income Sources & Splits
    const paycheckId = crypto.randomUUID();
    const sideHustleId = crypto.randomUUID();

    // Set payday dates dynamically to keep projections fresh
    const nextPayDate = new Date();
    nextPayDate.setDate(nextPayDate.getDate() + 7);
    const nextPayDateStr = nextPayDate.toISOString().split('T')[0];

    const nextHustleDate = new Date();
    nextHustleDate.setDate(nextHustleDate.getDate() + 14);
    const nextHustleDateStr = nextHustleDate.toISOString().split('T')[0];

    await sql`INSERT INTO income_sources (id, user_id, name, gross_amount, net_amount, frequency, next_pay_date, notes) VALUES (${paycheckId}, ${userId}, 'Primary Job Paycheck', 3500.00, 2650.00, 'biweekly', ${nextPayDateStr}, 'Software Engineering salary')`;
    await sql`INSERT INTO income_sources (id, user_id, name, gross_amount, net_amount, frequency, next_pay_date, notes) VALUES (${sideHustleId}, ${userId}, 'Side Freelance', 600.00, 500.00, 'monthly', ${nextHustleDateStr}, 'Full-stack UI consulting contracts')`;

    // Income Split Allocations (100% distribution setups)
    await sql`INSERT INTO income_allocations (id, income_source_id, account_id, allocation_type, allocation_value) VALUES (${crypto.randomUUID()}, ${paycheckId}, ${chaseId}, 'percent', 80.0)`;
    await sql`INSERT INTO income_allocations (id, income_source_id, account_id, allocation_type, allocation_value) VALUES (${crypto.randomUUID()}, ${paycheckId}, ${savingsId}, 'percent', 20.0)`;
    await sql`INSERT INTO income_allocations (id, income_source_id, account_id, allocation_type, allocation_value) VALUES (${crypto.randomUUID()}, ${sideHustleId}, ${chaseId}, 'percent', 50.0)`;
    await sql`INSERT INTO income_allocations (id, income_source_id, account_id, allocation_type, allocation_value) VALUES (${crypto.randomUUID()}, ${sideHustleId}, ${savingsId}, 'percent', 50.0)`;

    // 4. Custom Single/Bonus Income Events
    const bonusEventId = crypto.randomUUID();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    await sql`INSERT INTO income_events (id, income_source_id, amount, received_date, is_bonus, notes, account_id) VALUES (${bonusEventId}, NULL, 1200.00, ${threeDaysAgoStr}, 1, 'Q1 Performance Incentive', ${chaseId})`;

    // 5. Debt Payoff Engine & Accounts
    const ccDebtId = crypto.randomUUID();
    const studentDebtId = crypto.randomUUID();
    const autoDebtId = crypto.randomUUID();

    await sql`INSERT INTO debts (id, user_id, name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, debt_quality, payment_strategy) VALUES (${ccDebtId}, ${userId}, 'Chase Sapphire CC', 3200.00, 22.99, 95.00, 0.00, ${chaseId}, 15, 'credit_card', 'toxic', 'minimum')`;
    await sql`INSERT INTO debts (id, user_id, name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, debt_quality, payment_strategy) VALUES (${studentDebtId}, ${userId}, 'Federal Student Loan', 18500.00, 4.50, 220.00, 0.00, ${chaseId}, 18, 'student', 'neutral', 'minimum')`;
    await sql`INSERT INTO debts (id, user_id, name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, debt_quality, payment_strategy) VALUES (${autoDebtId}, ${userId}, 'Mazda 3 Auto Loan', 8500.00, 5.25, 310.00, 0.00, ${chaseId}, 8, 'auto', 'neutral', 'minimum')`;

    // 6. Active Cash Flow Bills & Core Expenditures
    // Recurring Templates
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${housingId}, 'Rent Transfer', 1850.00, 1, 1, 'monthly', ${chaseId}, 'Lease agreement payment')`;
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${subId}, 'Netflix Premium', 15.99, 15, 1, 'monthly', ${chaseId}, '4K streaming sharing tier')`;
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${subId}, 'Spotify Duo', 10.99, 22, 1, 'monthly', ${chaseId}, 'Hi-Fi music package')`;
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${utilId}, 'Electric Grid', 115.00, 10, 1, 'monthly', ${chaseId}, 'Power and cooling supply')`;
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${subId}, 'Athletic Center', 45.00, 5, 1, 'monthly', ${chaseId}, 'Gym gym club access')`;

    // One-Off Cash Outflows (is_recurring = 0)
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, is_recurring, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${foodId}, 'HEB Grocery Run', 124.50, 0, ${chaseId}, 'Weekly grocery stocking')`;
    await sql`INSERT INTO expenses (id, user_id, category_id, name, amount, is_recurring, account_id, notes) VALUES (${crypto.randomUUID()}, ${userId}, ${foodId}, 'Restaurant Dinner', 68.00, 0, ${chaseId}, 'Social dinner night')`;

    // 7. Month-Specific Envelope Allocations
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const foodEnvelopeId = crypto.randomUUID();
    const entEnvelopeId = crypto.randomUUID();
    const utilEnvelopeId = crypto.randomUUID();

    await sql`INSERT INTO envelopes (id, user_id, name, category_id, budgeted_amount, spent_amount, month, year, account_id, notes) VALUES (${foodEnvelopeId}, ${userId}, 'Food & Groceries', ${foodId}, 500.00, 192.50, ${currentMonth}, ${currentYear}, ${chaseId}, 'Groceries and restaurant outings')`;
    await sql`INSERT INTO envelopes (id, user_id, name, category_id, budgeted_amount, spent_amount, month, year, account_id, notes) VALUES (${entEnvelopeId}, ${userId}, 'Entertainment & Fun', ${entId}, 300.00, 150.00, ${currentMonth}, ${currentYear}, ${chaseId}, 'Movies, gigs, and weekend events')`;
    await sql`INSERT INTO envelopes (id, user_id, name, category_id, budgeted_amount, spent_amount, month, year, account_id, notes) VALUES (${utilEnvelopeId}, ${userId}, 'Utilities Envelope', ${utilId}, 200.00, 115.00, ${currentMonth}, ${currentYear}, ${chaseId}, 'Utilities buffer pool')`;

    // Envelope Transactions History
    await sql`INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date) VALUES (${crypto.randomUUID()}, ${foodEnvelopeId}, 45.20, 'HEB Grocery Store', ${threeDaysAgoStr})`;
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];
    await sql`INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date) VALUES (${crypto.randomUUID()}, ${foodEnvelopeId}, 79.30, 'Whole Foods Market', ${oneDayAgoStr})`;

    const todayStr = new Date().toISOString().split('T')[0];
    await sql`INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date) VALUES (${crypto.randomUUID()}, ${foodEnvelopeId}, 68.00, 'Local Sushi Dinner', ${todayStr})`;

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    await sql`INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date) VALUES (${crypto.randomUUID()}, ${entEnvelopeId}, 150.00, 'Indie Concert Tickets', ${twoDaysAgoStr})`;
    await sql`INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date) VALUES (${crypto.randomUUID()}, ${utilEnvelopeId}, 115.00, 'Power Grid Invoice', ${oneDayAgoStr})`;

    // 8. Wants Prioritizer List
    await sql`INSERT INTO wants (id, user_id, name, estimated_cost, priority, notes, purchased_at) VALUES (${crypto.randomUUID()}, ${userId}, 'OLED Gaming Monitor', 850.00, 'high', 'Ultrawide panel (wait for discount)', NULL)`;
    await sql`INSERT INTO wants (id, user_id, name, estimated_cost, priority, notes, purchased_at) VALUES (${crypto.randomUUID()}, ${userId}, 'Ergonomic Task Chair', 650.00, 'medium', 'Better mesh back support', NULL)`;
    await sql`INSERT INTO wants (id, user_id, name, estimated_cost, priority, notes, purchased_at) VALUES (${crypto.randomUUID()}, ${userId}, 'Active ANC Headphones', 350.00, 'low', 'Sony WH-1000XM5 premium black', NULL)`;
    await sql`INSERT INTO wants (id, user_id, name, estimated_cost, priority, notes, purchased_at) VALUES (${crypto.randomUUID()}, ${userId}, 'Mechanical Keychron Keyboard', 180.00, 'medium', 'Keychron Q1 custom switches', '2026-05-20')`;

    // 9. Structured Committed Debt Payoff Plan
    await sql`INSERT INTO committed_payoff_plan (id, user_id, strategy, extra_payment) VALUES (${crypto.randomUUID()}, ${userId}, 'avalanche', 350.00)`;

    // D. Log the user in to their fresh sandbox instance
    cookieStore.set('session', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24-hour sandbox lifecycle
      path: '/',
    });

  } catch (error) {
    console.error('Sandbox Seeding Failure:', error);
  }

  redirect('/dashboard');
}