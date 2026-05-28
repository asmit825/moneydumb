import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const wantResult = await sql`
      SELECT id, name, estimated_cost, priority, notes, url, created_at, purchased_at 
      FROM wants 
      WHERE id = ${id} AND user_id = ${userId}
    `;
    const want = wantResult.rows[0];
    if (!want) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const estimatedCost = parseFloat(want.estimated_cost) || 0.0;

    // Calculate monthly income
    // Note: CASE statement is identical on both SQLite and Postgres
    const incomeResult = await sql`
      SELECT COALESCE(SUM(CASE frequency
        WHEN 'weekly' THEN net_amount * 4.33
        WHEN 'biweekly' THEN net_amount * 2.167
        WHEN 'semimonthly' THEN net_amount * 2
        WHEN 'monthly' THEN net_amount
        ELSE net_amount END
      ), 0) as total FROM income_sources
      WHERE user_id = ${userId}
    `;
    const monthlyIncome = parseFloat(incomeResult.rows[0].total) || 0.0;

    // Calculate monthly expenses
    const expensesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE user_id = ${userId} AND is_recurring = 1
    `;
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total) || 0.0;

    // Calculate monthly debt
    const debtResult = await sql`
      SELECT COALESCE(SUM(minimum_payment), 0) as total 
      FROM debts 
      WHERE user_id = ${userId} AND balance > 0
    `;
    const monthlyDebt = parseFloat(debtResult.rows[0].total) || 0.0;

    const discretionary = Math.max(monthlyIncome - monthlyExpenses - monthlyDebt, 0.0);
    const costPercent = monthlyIncome > 0.0 ? Math.round((estimatedCost / monthlyIncome) * 100.0) : 999.0;
    const monthsToSave = discretionary > 0.0 ? Math.ceil(estimatedCost / discretionary) : 999;

    let recommendation = '';
    if (costPercent > 100.0) {
      recommendation = '⛔ This costs more than your entire monthly income. Save for multiple months before purchasing.';
    } else if (costPercent > 50.0) {
      recommendation = '⚠️ This is a significant expense (>50% of monthly income). Consider saving over several months.';
    } else if (costPercent > 25.0) {
      recommendation = '🟡 Moderate expense. Budget for this over the next 1-2 months.';
    } else {
      recommendation = '✅ Affordable! This fits within your monthly discretionary budget.';
    }

    let timing = '';
    if (monthsToSave <= 1) {
      timing = 'You could buy this now or next month.';
    } else if (monthsToSave <= 3) {
      timing = `Save for ${monthsToSave} months. Consider buying around month ${monthsToSave}.`;
    } else {
      timing = `This requires ${monthsToSave} months of saving. Wait for a bonus or windfall to accelerate.`;
    }

    return Response.json({
      want: {
        ...want,
        estimated_cost: estimatedCost
      },
      monthly_discretionary: Math.round(discretionary * 100) / 100,
      cost_as_percent_of_income: costPercent,
      months_to_save: monthsToSave,
      recommendation,
      best_purchase_timing: timing
    });
  } catch (error) {
    console.error('GET /api/wants/[id]/analyze error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
