import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const strategy = url.searchParams.get('strategy') || 'snowball';
  const extra = parseFloat(url.searchParams.get('extra_payment') || '0.0');
  const excludeIdsStr = url.searchParams.get('exclude_ids') || '';
  const targetMonthsStr = url.searchParams.get('target_months');
  const target = targetMonthsStr ? parseInt(targetMonthsStr) : null;

  try {
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
      minPay: parseFloat(row.minimum_payment) || 0.0,
    }));

    // Filter out excluded ones
    if (excludeIdsStr) {
      const excluded = excludeIdsStr.split(',').map(s => s.trim());
      debts = debts.filter(d => !excluded.includes(d.id));
    }

    // Sort by strategy
    if (strategy === 'avalanche') {
      debts.sort((a, b) => b.apr - a.apr);
    } else {
      // snowball
      debts.sort((a, b) => a.balance - b.balance);
    }

    const payoffItems = [];
    let totalInterest = 0.0;
    let maxMonths = 0;

    let availableExtra = extra;

    for (let i = 0; i < debts.length; i++) {
      const d = debts[i];
      const monthlyRate = d.apr / 100.0 / 12.0;

      let required = d.minPay;
      if (target) {
        const n = parseFloat(target as any);
        if (monthlyRate > 0.0) {
          const factor = Math.pow(1.0 + monthlyRate, n);
          required = d.balance * (monthlyRate * factor) / (factor - 1.0);
        } else {
          required = d.balance / n;
        }
      }

      const basePayment = Math.max(required, d.minPay);
      const payment = basePayment + (i === 0 ? availableExtra : 0.0);

      let remaining = d.balance;
      let months = 0;
      let debtInterest = 0.0;

      while (remaining > 0.01 && months < 600) {
        const interest = remaining * monthlyRate;
        debtInterest += interest;
        remaining = remaining + interest - payment;
        if (remaining < 0.0) remaining = 0.0;
        months++;
      }

      if (months > maxMonths) maxMonths = months;
      totalInterest += debtInterest;

      payoffItems.push({
        debt_id: d.id,
        debt_name: d.name,
        starting_balance: d.balance,
        interest_rate: d.apr,
        months_to_payoff: months,
        total_interest: Math.round(debtInterest * 100) / 100,
        required_payment: Math.round(payment * 100) / 100,
        order: i + 1,
      });
    }

    return Response.json({
      strategy,
      debts_order: payoffItems,
      total_months: maxMonths,
      total_interest_paid: Math.round(totalInterest * 100) / 100,
    });
  } catch (error) {
    console.error('GET /api/debts/payoff error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
