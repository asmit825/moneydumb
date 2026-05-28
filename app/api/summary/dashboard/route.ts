import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total balance across all accounts
    const totalBalanceResult = await sql`
      SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ${userId}
    `;
    const totalBalance = parseFloat(totalBalanceResult.rows[0].total) || 0.0;

    // 2. Per-account summary
    const accountsResult = await sql`
      SELECT name, account_type, balance FROM accounts WHERE user_id = ${userId} ORDER BY name
    `;
    const accountsSummary = accountsResult.rows.map(row => ({
      name: row.name,
      account_type: row.account_type,
      balance: parseFloat(row.balance) || 0.0
    }));

    // 3. Monthly income (prorated by frequency)
    const incomeResult = await sql`
      SELECT COALESCE(SUM(CASE frequency
        WHEN 'weekly' THEN net_amount * 4.33
        WHEN 'biweekly' THEN net_amount * 2.167
        WHEN 'semimonthly' THEN net_amount * 2
        WHEN 'monthly' THEN net_amount
        ELSE net_amount END
      ), 0) as total FROM income_sources WHERE user_id = ${userId}
    `;
    const monthlyIncome = parseFloat(incomeResult.rows[0].total) || 0.0;

    // 4. Monthly recurring expenses
    const expensesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ${userId} AND is_recurring = 1
    `;
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total) || 0.0;

    // 5. Monthly debt payments
    const debtResult = await sql`
      SELECT COALESCE(SUM(minimum_payment), 0) as total FROM debts WHERE user_id = ${userId} AND balance > 0
    `;
    const monthlyDebtPayments = parseFloat(debtResult.rows[0].total) || 0.0;

    const netCashFlow = monthlyIncome - monthlyExpenses - monthlyDebtPayments;

    // 6. Total debt
    const totalDebtResult = await sql`
      SELECT COALESCE(SUM(balance), 0) as total FROM debts WHERE user_id = ${userId} AND balance > 0
    `;
    const totalDebt = parseFloat(totalDebtResult.rows[0].total) || 0.0;

    // 7. Envelopes status for current month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentYear = now.getFullYear();

    const envelopesResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN spent_amount > budgeted_amount THEN 1 END) as over_budget
      FROM envelopes 
      WHERE user_id = ${userId} AND month = ${currentMonth} AND year = ${currentYear}
    `;
    const envelopesTotal = parseInt(envelopesResult.rows[0].total) || 0;
    const envelopesOverBudget = parseInt(envelopesResult.rows[0].over_budget) || 0;

    // 8. Upcoming recurring expenses
    const upcomingResult = await sql`
      SELECT e.name, e.amount, e.due_day_of_month, COALESCE(c.name, 'General') as category_name
      FROM expenses e 
      LEFT JOIN expense_categories c ON e.category_id = c.id 
      WHERE e.user_id = ${userId} AND e.is_recurring = 1 AND e.due_day_of_month IS NOT NULL 
      ORDER BY e.due_day_of_month ASC 
      LIMIT 10
    `;
    const upcomingExpenses = upcomingResult.rows.map(row => ({
      name: row.name,
      amount: parseFloat(row.amount) || 0.0,
      due_day: parseInt(row.due_day_of_month) || 1,
      category_name: row.category_name
    }));

    // 9. 12-month projections
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Fetch income events to prorate custom events
    const eventsResult = await sql`
      SELECT received_date, amount FROM income_events e
      JOIN accounts a ON e.account_id = a.id
      WHERE a.user_id = ${userId} AND e.received_date IS NOT NULL
    `;
    const events = eventsResult.rows.map(row => ({
      date: row.received_date as string,
      amount: parseFloat(row.amount) || 0.0
    }));

    const projections = [];
    for (let i = 0; i < 12; i++) {
      const projMonthIndex = (currentMonth - 1 + i) % 12; // 0-indexed
      const projYear = currentYear + Math.floor((currentMonth - 1 + i) / 12);
      
      const eventIncome = events
        .filter(e => {
          if (!e.date) return false;
          const [y, m] = e.date.split('-');
          return parseInt(y) === projYear && parseInt(m) === (projMonthIndex + 1);
        })
        .reduce((sum, e) => sum + e.amount, 0.0);

      const incomeWithEvents = monthlyIncome + eventIncome;
      const totalOutflows = monthlyExpenses + monthlyDebtPayments;

      projections.push({
        month: monthNames[projMonthIndex],
        income: Math.round(monthlyIncome * 100) / 100,
        income_with_events: Math.round(incomeWithEvents * 100) / 100,
        expenses: Math.round(totalOutflows * 100) / 100,
        net: Math.round((incomeWithEvents - totalOutflows) * 100) / 100
      });
    }

    return Response.json({
      total_balance: Math.round(totalBalance * 100) / 100,
      accounts_summary: accountsSummary,
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      monthly_expenses: Math.round(monthlyExpenses * 100) / 100,
      monthly_debt_payments: Math.round(monthlyDebtPayments * 100) / 100,
      net_cash_flow: Math.round(netCashFlow * 100) / 100,
      total_debt: Math.round(totalDebt * 100) / 100,
      envelopes_over_budget: envelopesOverBudget,
      envelopes_total: envelopesTotal,
      upcoming_expenses: upcomingExpenses,
      monthly_projections: projections
    });
  } catch (error) {
    console.error('GET /api/summary/dashboard error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
