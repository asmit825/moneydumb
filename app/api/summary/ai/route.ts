import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // 3. Monthly debt
    const debtResult = await sql`
      SELECT COALESCE(SUM(minimum_payment), 0) as total FROM debts WHERE user_id = ${userId} AND balance > 0
    `;
    const monthlyDebt = parseFloat(debtResult.rows[0].total) || 0.0;

    // 4. Total debt
    const totalDebtResult = await sql`
      SELECT COALESCE(SUM(balance), 0) as total FROM debts WHERE user_id = ${userId} AND balance > 0
    `;
    const totalDebt = parseFloat(totalDebtResult.rows[0].total) || 0.0;

    // 5. Total balance (assets)
    const totalBalanceResult = await sql`
      SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ${userId}
    `;
    const totalBalance = parseFloat(totalBalanceResult.rows[0].total) || 0.0;

    // 6. Highest APR debt
    const highestAprResult = await sql`
      SELECT name, interest_rate, balance FROM debts 
      WHERE user_id = ${userId} AND balance > 0 
      ORDER BY interest_rate DESC 
      LIMIT 1
    `;
    const highestApr = highestAprResult.rows[0];

    // 7. Envelopes over budget
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const overBudgetResult = await sql`
      SELECT name, budgeted_amount, spent_amount 
      FROM envelopes 
      WHERE user_id = ${userId} AND month = ${currentMonth} AND year = ${currentYear} AND spent_amount > budgeted_amount
    `;
    const overBudget = overBudgetResult.rows.map(row => ({
      name: row.name,
      budgeted_amount: parseFloat(row.budgeted_amount) || 0.0,
      spent_amount: parseFloat(row.spent_amount) || 0.0
    }));

    const surplus = monthlyIncome - monthlyExpenses - monthlyDebt;
    const savingsRate = monthlyIncome > 0.0 ? Math.round((surplus / monthlyIncome) * 100.0) : 0.0;

    // Build narrative paragraphs
    const paragraphs = [];
    const alerts = [];

    // Income & Expenses Overview
    if (monthlyIncome > 0.0) {
      paragraphs.push(
        `This month you have $${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in projected income and $${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in recurring expenses, plus $${monthlyDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in debt payments. That leaves $${surplus.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in surplus (${savingsRate}% savings rate).`
      );
    } else {
      paragraphs.push("No income sources configured yet. Add your paycheck details under 'Income' to get started.");
    }

    // Debt analysis
    if (totalDebt > 0.0) {
      paragraphs.push(
        `Your total outstanding debt is $${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}. Monthly debt minimum payments total $${monthlyDebt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}.`
      );
      
      if (highestApr) {
        const apr = parseFloat(highestApr.interest_rate) || 0.0;
        const bal = parseFloat(highestApr.balance) || 0.0;
        const monthlyInterest = bal * (apr / 100.0 / 12.0);
        
        paragraphs.push(
          `Your highest-interest debt is "${highestApr.name}" at ${apr.toFixed(1)}% APR ($${bal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} balance). It costs you approximately $${monthlyInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month in interest fees alone. We highly recommend prioritizing paying this down first.`
        );

        if (apr > 20.0) {
          alerts.push({
            level: 'danger',
            message: `"${highestApr.name}" has a very high APR (${apr.toFixed(1)}%). Consider accelerating payoff immediately.`
          });
        }
      }
    }

    // Envelope warnings
    if (overBudget.length > 0) {
      const names = overBudget.map(e => `${e.name} (+$${Math.round(e.spent_amount - e.budgeted_amount)})`);
      alerts.push({
        level: 'warning',
        message: `Over-budget envelopes: ${names.join(', ')}`
      });
    }

    // Surplus/deficit alerts
    if (surplus < 0.0) {
      alerts.push({
        level: 'danger',
        message: `You are spending $${Math.round(Math.abs(surplus))} more than you earn each month. Cut expenses or increase income immediately.`
      });
    } else if (savingsRate < 10.0 && monthlyIncome > 0.0) {
      alerts.push({
        level: 'warning',
        message: `Your savings rate is only ${savingsRate}%. Aim for at least 20% to build security.`
      });
    }

    // Assets warning
    if (totalBalance < monthlyExpenses && monthlyExpenses > 0.0) {
      alerts.push({
        level: 'warning',
        message: 'Your total bank account balance is less than one month of recurring expenses. Build an emergency fund immediately.'
      });
    }

    // Grade calculation
    let grade = '';
    if (surplus < 0.0) {
      grade = 'Needs Attention 🔴';
    } else if (savingsRate < 10.0) {
      grade = 'Fair 🟡';
    } else if (savingsRate < 20.0) {
      grade = 'Good 🟢';
    } else {
      grade = 'Excellent 💚';
    }

    return Response.json({
      overall_grade: grade,
      paragraphs,
      alerts,
      savings_rate: savingsRate
    });
  } catch (error) {
    console.error('GET /api/summary/ai error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
