import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const numMonths = Math.max(1, Math.min(12, parseInt(url.searchParams.get('months') || '3')));

  try {
    // 1. Monthly income
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

    // 2. Monthly recurring expenses
    const expensesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ${userId} AND is_recurring = 1
    `;
    const monthlyExpenses = parseFloat(expensesResult.rows[0].total) || 0.0;

    // 3. Total account balance (starting balance)
    const balanceResult = await sql`
      SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ${userId}
    `;
    const totalBalance = parseFloat(balanceResult.rows[0].total) || 0.0;

    // 4. Committed payoff plan
    const committedResult = await sql`
      SELECT strategy, extra_payment, target_months, excluded_debt_ids 
      FROM committed_payoff_plan 
      WHERE user_id = ${userId} 
      ORDER BY committed_at DESC 
      LIMIT 1
    `;
    const committed = committedResult.rows[0];

    const committedPlanSummary = committed
      ? {
          strategy: committed.strategy,
          extra_payment: parseFloat(committed.extra_payment) || 0.0,
          target_months: committed.target_months ? parseInt(committed.target_months) : null,
          excluded_debt_ids: committed.excluded_debt_ids ? committed.excluded_debt_ids.split(',').filter((x: string) => x !== '') : []
        }
      : null;

    // 5. Active debts
    const debtsResult = await sql`
      SELECT id, name, balance, interest_rate, minimum_payment 
      FROM debts 
      WHERE user_id = ${userId} AND balance > 0
    `;
    let debts = debtsResult.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      balance: parseFloat(row.balance) || 0.0,
      apr: parseFloat(row.interest_rate) || 0.0,
      minPay: parseFloat(row.minimum_payment) || 0.0
    }));

    // Filter and sort active debts according to committed plan parameters
    if (committedPlanSummary) {
      if (committed.excluded_debt_ids) {
        const excluded = committed.excluded_debt_ids.split(',').map((s: string) => s.trim());
        debts = debts.filter(d => !excluded.includes(d.id));
      }
      if (committedPlanSummary.strategy === 'avalanche') {
        debts.sort((a, b) => b.apr - a.apr);
      } else {
        debts.sort((a, b) => a.balance - b.balance);
      }
    }

    // Clone active debts for multi-month mutation state
    const debtStates = debts.map(d => ({ ...d }));

    const extra = committedPlanSummary ? committedPlanSummary.extra_payment : 0.0;
    const target = committedPlanSummary ? committedPlanSummary.target_months : null;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentYear = now.getFullYear();

    const monthsResult = [];
    let runningBalance = totalBalance;

    for (let i = 0; i < numMonths; i++) {
      const projMonth = ((currentMonth - 1 + i) % 12 + 1);
      const projYear = currentYear + Math.floor((currentMonth - 1 + i) / 12);
      const label = `${monthNames[projMonth - 1]} ${projYear}`;

      // Envelope budgets for this projected month
      const envelopesResult = await sql`
        SELECT COALESCE(SUM(budgeted_amount), 0) as total 
        FROM envelopes 
        WHERE user_id = ${userId} AND month = ${projMonth} AND year = ${projYear}
      `;
      const envelopeTotal = parseFloat(envelopesResult.rows[0].total) || 0.0;

      // Simulate debt payments for this month
      let monthDebtPayments = 0.0;
      const debtDetails = [];
      const totalMin = debtStates.reduce((sum, d) => sum + (d.balance > 0 ? d.minPay : 0.0), 0.0);
      const totalBudget = totalMin + extra;

      let remainingBudget = totalBudget;

      // 1. Pay minimums first
      for (const ds of debtStates) {
        if (ds.balance <= 0.01) {
          debtDetails.push({
            debt_id: ds.id,
            debt_name: ds.name,
            payment: 0.0,
            remaining_balance: 0.0,
            paid_off: true
          });
          continue;
        }

        const monthlyRate = ds.apr / 100.0 / 12.0;

        let required = ds.minPay;
        if (target) {
          const n = parseFloat(target as any);
          if (monthlyRate > 0.0) {
            const factor = Math.pow(1.0 + monthlyRate, n);
            required = ds.balance * (monthlyRate * factor) / (factor - 1.0);
          } else {
            required = ds.balance / n;
          }
        }

        const pay = Math.min(Math.max(required, ds.minPay), ds.balance + ds.balance * monthlyRate);
        remainingBudget -= pay;
        const interest = ds.balance * monthlyRate;
        ds.balance = Math.max(0.0, ds.balance + interest - pay);
        monthDebtPayments += pay;

        debtDetails.push({
          debt_id: ds.id,
          debt_name: ds.name,
          payment: Math.round(pay * 100) / 100,
          remaining_balance: Math.round(ds.balance * 100) / 100,
          paid_off: ds.balance <= 0.01
        });
      }

      // 2. Apply extra to first non-paid-off debt (snowball/avalanche)
      if (remainingBudget > 0.01) {
        for (let idx = 0; idx < debtStates.length; idx++) {
          const ds = debtStates[idx];
          if (ds.balance <= 0.01) continue;

          const canApply = Math.min(remainingBudget, ds.balance);
          ds.balance -= canApply;
          monthDebtPayments += canApply;

          const detail = debtDetails[idx];
          if (detail) {
            detail.payment = Math.round((detail.payment + canApply) * 100) / 100;
            detail.remaining_balance = Math.round(ds.balance * 100) / 100;
            detail.paid_off = ds.balance <= 0.01;
          }
          break;
        }
      }

      const ending = runningBalance + monthlyIncome - monthlyExpenses - monthDebtPayments - envelopeTotal;
      const surplus = monthlyIncome - monthlyExpenses - monthDebtPayments - envelopeTotal;

      monthsResult.push({
        month: projMonth,
        year: projYear,
        label,
        starting_balance: Math.round(runningBalance * 100) / 100,
        total_income: Math.round(monthlyIncome * 100) / 100,
        total_recurring_expenses: Math.round(monthlyExpenses * 100) / 100,
        total_debt_payments: Math.round(monthDebtPayments * 100) / 100,
        total_envelope_budgets: Math.round(envelopeTotal * 100) / 100,
        ending_balance: Math.round(ending * 100) / 100,
        surplus: Math.round(surplus * 100) / 100,
        debt_details: debtDetails
      });

      runningBalance = ending;
    }

    return Response.json({
      months: monthsResult,
      committed_plan: committedPlanSummary
    });
  } catch (error) {
    console.error('GET /api/summary/budget-projection error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
