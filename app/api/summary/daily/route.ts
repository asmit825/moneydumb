import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get('year') || '') || now.getFullYear();
  const month = parseInt(url.searchParams.get('month') || '') || (now.getMonth() + 1);
  const weekStartStr = url.searchParams.get('week_start');

  if (month < 1 || month > 12) {
    return Response.json({ error: 'Invalid month' }, { status: 400 });
  }

  try {
    const first = new Date(year, month - 1, 1);
    const nextMonth = new Date(year, month, 1);
    const last = new Date(nextMonth.getTime() - 86400000);
    const daysInMonth = last.getDate();

    // Parse week_start or default to Sunday containing the 1st of month
    let ws = new Date(first);
    if (weekStartStr) {
      ws = new Date(weekStartStr);
    } else {
      const dow = first.getDay(); // 0 = Sunday
      ws.setDate(first.getDate() - dow);
    }

    const we = new Date(ws);
    we.setDate(ws.getDate() + 6); // Saturday

    // Monthly income
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

    // Monthly recurring expenses
    const expensesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ${userId} AND is_recurring = 1
    `;
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total) || 0.0;

    // Monthly debt
    const debtResult = await sql`
      SELECT COALESCE(SUM(minimum_payment), 0) as total FROM debts WHERE user_id = ${userId} AND balance > 0
    `;
    const monthlyDebt = parseFloat(debtResult.rows[0].total) || 0.0;

    const totalMonthlyExpenses = monthlyExpenses + monthlyDebt;
    const dailyIncome = monthlyIncome / daysInMonth;
    const dailyExpenses = totalMonthlyExpenses / daysInMonth;

    // Income events
    const eventsResult = await sql`
      SELECT received_date, amount FROM income_events e
      JOIN accounts a ON e.account_id = a.id
      WHERE a.user_id = ${userId} AND e.received_date IS NOT NULL
    `;
    const events = eventsResult.rows.map(row => ({
      date: row.received_date as string,
      amount: parseFloat(row.amount) || 0.0
    }));

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const calendarDays = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);

      const inMonth = d.getMonth() + 1 === month && d.getFullYear() === year;

      const inc = inMonth ? dailyIncome : 0.0;
      const exp = inMonth ? dailyExpenses : 0.0;

      const dateStr = d.toISOString().split('T')[0];
      const eventIncome = inMonth
        ? events.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0.0)
        : 0.0;

      const incomeWithEvents = inc + eventIncome;

      calendarDays.push({
        date: dateStr,
        day_label: `${dayNames[d.getDay()]} ${d.getDate()}`,
        in_month: inMonth,
        income: Math.round(inc * 100) / 100,
        income_with_events: Math.round(incomeWithEvents * 100) / 100,
        expenses: Math.round(exp * 100) / 100,
        net: Math.round((incomeWithEvents - exp) * 100) / 100
      });
    }

    return Response.json({
      year,
      month,
      week_start: ws.toISOString().split('T')[0],
      week_end: we.toISOString().split('T')[0],
      days: calendarDays
    });
  } catch (error) {
    console.error('GET /api/summary/daily error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
