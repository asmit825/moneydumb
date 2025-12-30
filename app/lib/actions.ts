'use server'

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// --- AUTH ACTIONS ---

export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  if (!username || !password) return { message: 'Missing fields' };

  const existing = await sql`SELECT * FROM users WHERE username=${username}`;
  if (existing.rows.length > 0) return { message: 'User exists' };

  const hashed = await bcrypt.hash(password, 10);
  try {
    await sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${hashed})`;
  } catch (e) { return { message: 'DB Error' }; }
  
  return { success: true };
}

export async function loginUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const user = await sql`SELECT * FROM users WHERE username=${username}`;
  if (user.rows.length === 0) return { message: 'User not found' };

  const match = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!match) return { message: 'Invalid credentials' };

  const cookieStore = await cookies();
  cookieStore.set('session', user.rows[0].id, { httpOnly: true, path: '/' });
  return { success: true };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/');
}

// --- DASHBOARD STATS (Consolidated Logic) ---

export async function getDashboardStats() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  if (!userId) return { totalAssets: 0, pendingOut: 0, safeBalance: 0, bankCount: 0, upcomingBills: [], banks: [], chartData: [], completion: { total: 0, completed: 0, percent: 0 }, coverage: { assets: 0, inbound: 0, expenses: 0, status: 'ok' } };

  try {
    // 1. Assets (Bank Balances)
    const assets = await sql`SELECT SUM(current_balance) as total FROM banks WHERE user_id=${userId}`;
    const totalAssets = Number(assets.rows[0].total) || 0;

    // 2. Pending Expenses (Total Outstanding)
    const pending = await sql`
      SELECT SUM(amount) as total 
      FROM expenses 
      WHERE user_id=${userId} 
      AND status IN ('not-paid', 'pending') 
      AND is_recurring = FALSE
    `;
    const pendingOut = Number(pending.rows[0].total) || 0;
    
    // 3. Current Month Inbound (Future Money coming in this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startStr = startOfMonth.toISOString().split('T')[0];
    
    // Get end of month
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
    const endStr = endOfMonth.toISOString().split('T')[0];

    const inboundResult = await sql`
      SELECT SUM(amount) as total
      FROM inbounds
      WHERE bank_id IN (SELECT id FROM banks WHERE user_id=${userId})
      AND date >= ${startStr}::date 
      AND date <= ${endStr}::date
    `;
    const monthlyInbound = Number(inboundResult.rows[0].total) || 0;

    // 4. Banks List
    const banksResult = await sql`
      SELECT b.id, b.name, b.current_balance, COALESCE(SUM(e.amount), 0) as pending_total
      FROM banks b
      LEFT JOIN expenses e ON b.id = e.bank_id AND e.status IN ('not-paid', 'pending') AND e.is_recurring = FALSE
      WHERE b.user_id = ${userId}
      GROUP BY b.id
      ORDER BY b.current_balance DESC
    `;
    const banks = banksResult.rows.map(b => ({ ...b, current_balance: Number(b.current_balance), pending_total: Number(b.pending_total) }));

    // 5. Chart Data (Category Breakdown)
    const categoryResult = await sql`
      SELECT t.name, SUM(e.amount) as total
      FROM expenses e
      JOIN expense_types t ON e.type_id = t.id
      WHERE e.user_id = ${userId} AND e.due_date >= ${startStr}::date AND e.is_recurring = FALSE
      GROUP BY t.name
      ORDER BY total DESC
    `;
    const chartData = categoryResult.rows.map(c => ({ name: c.name, value: Number(c.total) }));

    // 6. Completion Gauge
    const completionResult = await sql`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM expenses
      WHERE user_id = ${userId} AND due_date >= ${startStr}::date AND is_recurring = FALSE
    `;
    const totalCount = Number(completionResult.rows[0].total) || 0;
    const completedCount = Number(completionResult.rows[0].completed) || 0;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // 7. Pending Queue (The List)
    const pendingRaw = await sql`
      SELECT id, name, amount, due_date, status
      FROM expenses 
      WHERE user_id=${userId} AND status IN ('not-paid', 'pending') AND is_recurring = FALSE
      ORDER BY due_date ASC
      LIMIT 10
    `;
    const today = new Date();
    const upcomingBills = pendingRaw.rows.map(exp => {
      const dueDate = new Date(exp.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return { id: exp.id, name: exp.name, amount: Number(exp.amount), daysUntil, status: exp.status };
    });

    const safeBalance = totalAssets - pendingOut;
    const bankCount = banks.length;

    return { 
      totalAssets, pendingOut, safeBalance, bankCount, upcomingBills, banks, chartData, 
      completion: { total: totalCount, completed: completedCount, percent },
      coverage: { assets: totalAssets, inbound: monthlyInbound, expenses: pendingOut } // <--- NEW DATA
    };

  } catch (e) {
    console.error(e);
    return { totalAssets: 0, pendingOut: 0, safeBalance: 0, bankCount: 0, upcomingBills: [], banks: [], chartData: [], completion: { total: 0, completed: 0, percent: 0 }, coverage: { assets: 0, inbound: 0, expenses: 0 } };
  }
}

// --- BANK ACTIONS ---

export async function getBanks() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  if (!userId) return [];

  // Sum pending expenses (non-recurring only)
  const result = await sql`
    SELECT b.*, COALESCE(SUM(e.amount), 0) as pending_total
    FROM banks b
    LEFT JOIN expenses e ON b.id = e.bank_id 
      AND e.status IN ('not-paid', 'pending') 
      AND e.is_recurring = FALSE
    WHERE b.user_id = ${userId}
    GROUP BY b.id
    ORDER BY b.name ASC
  `;
  return result.rows;
}

export async function createBank(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  const name = formData.get('name') as string;
  const balance = parseFloat(formData.get('balance') as string) || 0;

  try {
    await sql`INSERT INTO banks (user_id, name, current_balance) VALUES (${userId}, ${name}, ${balance})`;
    return { success: true };
  } catch (e) { return { success: false }; }
}

export async function deleteBank(bankId: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  await sql`DELETE FROM banks WHERE id=${bankId} AND user_id=${userId}`;
  return { success: true };
}

export async function updateAllBalances(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('balance_')) {
      const bankId = key.replace('balance_', '');
      const newBalance = parseFloat(value as string);
      if (!isNaN(newBalance)) {
        await sql`UPDATE banks SET current_balance=${newBalance} WHERE id=${bankId} AND user_id=${userId}`;
      }
    }
  }
  redirect('/dashboard');
}

export async function getBankById(id: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  try {
    const result = await sql`
      SELECT b.*, COALESCE(SUM(e.amount), 0) as pending_total
      FROM banks b
      LEFT JOIN expenses e ON b.id = e.bank_id 
        AND e.status IN ('not-paid', 'pending') 
        AND e.is_recurring = FALSE
      WHERE b.id = ${id} AND b.user_id = ${userId}
      GROUP BY b.id
    `;
    return result.rows[0];
  } catch (e) { return null; }
}

export async function updateBankBalance(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  const bankId = formData.get('bankId') as string;
  const newBalance = parseFloat(formData.get('balance') as string);
  await sql`UPDATE banks SET current_balance=${newBalance} WHERE id=${bankId} AND user_id=${userId}`;
  redirect(`/dashboard/banks/${bankId}`);
}

// --- INBOUND ACTIONS ---

export async function getInbounds(bankId: string) {
  const result = await sql`SELECT * FROM inbounds WHERE bank_id=${bankId} ORDER BY date ASC`;
  return result.rows;
}

export async function createInbound(formData: FormData) {
  const bankId = formData.get('bankId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const date = formData.get('date') as string;
  const note = formData.get('note') as string;
  await sql`INSERT INTO inbounds (bank_id, amount, date, note) VALUES (${bankId}, ${amount}, ${date}, ${note})`;
  redirect(`/dashboard/banks/${bankId}`);
}

export async function deleteInbound(formData: FormData) {
  const id = formData.get('id') as string;
  const bankId = formData.get('bankId') as string;
  await sql`DELETE FROM inbounds WHERE id=${id}`;
  redirect(`/dashboard/banks/${bankId}`);
}

// --- EXPENSE ACTIONS (The Master Table) ---

export async function getExpenses() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  // Get ONLY non-recurring logs for the "Recent Activity" list
  const result = await sql`
    SELECT 
      e.id, e.amount, e.due_date as date, e.name as description, e.status,
      b.name as bank_name, t.name as type_name
    FROM expenses e
    LEFT JOIN banks b ON e.bank_id = b.id
    LEFT JOIN expense_types t ON e.type_id = t.id
    WHERE e.user_id = ${userId} AND e.is_recurring = FALSE
    ORDER BY e.due_date DESC
    LIMIT 50
  `;
  return result.rows;
}

export async function getRecurringExpenses() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  // Get ONLY recurring templates
  const result = await sql`
    SELECT 
      e.id, e.amount, e.due_day, e.name as description, 
      b.name as bank_name, t.name as type_name
    FROM expenses e
    LEFT JOIN banks b ON e.bank_id = b.id
    LEFT JOIN expense_types t ON e.type_id = t.id
    WHERE e.user_id = ${userId} AND e.is_recurring = TRUE
    ORDER BY e.due_day ASC
  `;
  return result.rows;
}

export async function createExpense(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  
  const bankId = formData.get('bankId') as string;
  const typeId = formData.get('typeId') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const name = formData.get('description') as string;
  const isRecurring = formData.get('isRecurring') === 'true';
  
  // Logic: 
  // If Recurring -> We need 'dueDay' and status is likely ignored or 'template'
  // If One-Off -> We need 'date' and 'status'
  
  try {
    if (isRecurring) {
      const dueDay = parseInt(formData.get('dueDay') as string) || 1;
      await sql`
        INSERT INTO expenses (user_id, bank_id, type_id, amount, name, is_recurring, due_day, status)
        VALUES (${userId}, ${bankId}, ${typeId}, ${amount}, ${name}, TRUE, ${dueDay}, 'template')
      `;
    } else {
      const date = formData.get('date') as string;
      const status = formData.get('status') as string;
      await sql`
        INSERT INTO expenses (user_id, bank_id, type_id, amount, name, due_date, status, is_recurring)
        VALUES (${userId}, ${bankId}, ${typeId}, ${amount}, ${name}, ${date}, ${status}, FALSE)
      `;
    }
    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { success: false, message: e.message };
  }
}

export async function deleteExpense(formData: FormData) {
  const id = formData.get('id') as string;
  const isRecurring = formData.get('isRecurring') === 'true';
  await sql`DELETE FROM expenses WHERE id=${id}`;
  
  if (isRecurring) {
    redirect('/dashboard/bills');
  } else {
    redirect('/dashboard/expenses');
  }
}

// --- TYPES ACTIONS ---

export async function getExpenseTypes() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  const result = await sql`SELECT * FROM expense_types WHERE user_id=${userId} ORDER BY name ASC`;
  return result.rows;
}

export async function createExpenseType(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  const name = formData.get('name') as string;
  await sql`INSERT INTO expense_types (user_id, name) VALUES (${userId}, ${name})`;
  return { success: true };
}

export async function deleteExpenseType(typeId: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  await sql`DELETE FROM expense_types WHERE id=${typeId} AND user_id=${userId}`;
  return { success: true };
}