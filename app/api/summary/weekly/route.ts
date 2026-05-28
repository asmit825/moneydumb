import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

function monthToWeeks(year: number, month: number): Array<{ start: Date; end: Date; daysInMonth: number }> {
  const first = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month, 1);
  const last = new Date(nextMonth.getTime() - 86400000);

  const weeks: Array<{ start: Date; end: Date; daysInMonth: number }> = [];
  
  const dow = first.getDay(); // 0 = Sunday
  const weekStart = new Date(first);
  weekStart.setDate(first.getDate() - dow);

  const ws = new Date(weekStart);
  while (ws <= last) {
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6); // Saturday

    const effectiveStart = ws < first ? first : ws;
    const effectiveEnd = we > last ? last : we;
    
    let dim = 0;
    if (effectiveStart <= effectiveEnd) {
      dim = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000) + 1;
    }

    weeks.push({
      start: new Date(ws),
      end: new Date(we),
      daysInMonth: dim
    });

    ws.setDate(ws.getDate() + 7);
  }

  return weeks;
}

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get('year') || '') || now.getFullYear();
  const month = parseInt(url.searchParams.get('month') || '') || (now.getMonth() + 1);

  if (month < 1 || month > 12) {
    return Response.json({ error: 'Invalid month' }, { status: 400 });
  }

  try {
    const first = new Date(year, month - 1, 1);
    const nextMonth = new Date(year, month, 1);
    const last = new Date(nextMonth.getTime() - 86400000);
    const daysInMonth = last.getDate();

    const weeks = monthToWeeks(year, month);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

    // Monthly debt payments
    const debtResult = await sql`
      SELECT COALESCE(SUM(minimum_payment), 0) as total FROM debts WHERE user_id = ${userId} AND balance > 0
    `;
    const monthlyDebt = parseFloat(debtResult.rows[0].total) || 0.0;

    const totalMonthlyExpenses = monthlyExpenses + monthlyDebt;
    const dailyIncome = monthlyIncome / daysInMonth;
    const dailyExpenses = totalMonthlyExpenses / daysInMonth;

    // Custom income events
    const eventsResult = await sql`
      SELECT received_date, amount FROM income_events e
      JOIN accounts a ON e.account_id = a.id
      WHERE a.user_id = ${userId} AND e.received_date IS NOT NULL
    `;
    const events = eventsResult.rows.map(row => ({
      date: row.received_date as string,
      amount: parseFloat(row.amount) || 0.0
    }));

    const calendarWeeks = [];
    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      const proratedIncome = dailyIncome * w.daysInMonth;
      const proratedExpenses = dailyExpenses * w.daysInMonth;

      // Filter events in this week & month
      const eventIncome = events
        .filter(e => {
          if (!e.date) return false;
          const ed = new Date(e.date);
          return (
            ed >= w.start && 
            ed <= w.end && 
            ed.getMonth() + 1 === month && 
            ed.getFullYear() === year
          );
        })
        .reduce((sum, e) => sum + e.amount, 0.0);

      const incomeWithEvents = proratedIncome + eventIncome;

      const startDay = w.start.getMonth() + 1 === month && w.start.getFullYear() === year ? w.start.getDate() : 1;
      const endDay = w.end.getMonth() + 1 === month && w.end.getFullYear() === year ? w.end.getDate() : daysInMonth;
      
      const label = `${monthNames[month - 1]} ${startDay}–${endDay}`;

      calendarWeeks.push({
        week_index: i,
        label,
        start_date: w.start.toISOString().split('T')[0],
        end_date: w.end.toISOString().split('T')[0],
        days_in_month: w.daysInMonth,
        income: Math.round(proratedIncome * 100) / 100,
        income_with_events: Math.round(incomeWithEvents * 100) / 100,
        expenses: Math.round(proratedExpenses * 100) / 100,
        net: Math.round((incomeWithEvents - proratedExpenses) * 100) / 100
      });
    }

    return Response.json({
      year,
      month,
      month_label: `${monthNames[month - 1]} ${year}`,
      weeks: calendarWeeks
    });
  } catch (error) {
    console.error('GET /api/summary/weekly error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
