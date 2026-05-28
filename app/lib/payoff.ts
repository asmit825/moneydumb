import { sql } from './db';

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
  amount_due_immediately: number;
  account_id: string | null;
  due_day_of_month: number | null;
  debt_type: string;
  debt_quality: string;
  url: string | null;
  payment_strategy: string;
  calculated_payment: number;
  created_at: string;
}

export function debtQualityFor(debtType: string): string {
  switch (debtType) {
    case 'mortgage':
    case 'student_loan':
      return 'good';
    case 'car_loan':
    case 'medical':
      return 'neutral';
    case 'credit_card':
    case 'personal_loan':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function calcPaymentAmount(
  balance: number,
  minimumPayment: number,
  amountDueImmediately: number,
  paymentStrategy: string,
  payoffPlanAmount: number | undefined
): number {
  switch (paymentStrategy) {
    case 'minimum':
      return balance <= minimumPayment ? balance : minimumPayment;
    case 'due_now':
      return amountDueImmediately;
    case 'payoff_plan':
      return payoffPlanAmount !== undefined ? payoffPlanAmount : (balance <= minimumPayment ? balance : minimumPayment);
    default:
      return balance <= minimumPayment ? balance : minimumPayment;
  }
}

export async function loadDebtsWithCalculated(userId: string): Promise<Debt[]> {
  // Fetch committed payoff plan
  const committedResult = await sql`
    SELECT strategy, extra_payment, target_months, excluded_debt_ids 
    FROM committed_payoff_plan 
    WHERE user_id = ${userId} 
    ORDER BY committed_at DESC 
    LIMIT 1
  `;
  const committed = committedResult.rows[0];

  const planPayments = new Map<string, number>();

  if (committed) {
    const { strategy, extra_payment, target_months, excluded_debt_ids } = committed;
    const extra = parseFloat(extra_payment) || 0.0;
    const target = target_months ? parseInt(target_months) : null;

    // Fetch active debts
    const planDebtsResult = await sql`
      SELECT id, name, balance, interest_rate, minimum_payment 
      FROM debts 
      WHERE user_id = ${userId} AND balance > 0
    `;
    let planDebts = planDebtsResult.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      balance: parseFloat(row.balance) || 0.0,
      apr: parseFloat(row.interest_rate) || 0.0,
      minPay: parseFloat(row.minimum_payment) || 0.0,
    }));

    // Filter out excluded ones
    if (excluded_debt_ids) {
      const excludedIds = excluded_debt_ids.split(',').map((s: string) => s.trim());
      planDebts = planDebts.filter(d => !excludedIds.includes(d.id));
    }

    // Sort per strategy
    if (strategy === 'avalanche') {
      planDebts.sort((a, b) => b.apr - a.apr);
    } else {
      // snowball
      planDebts.sort((a, b) => a.balance - b.balance);
    }

    // Compute payments
    for (let i = 0; i < planDebts.length; i++) {
      const d = planDebts[i];
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

      const basePay = Math.min(Math.max(required, d.minPay), d.balance + d.balance * monthlyRate);
      const pay = Math.min(basePay + (i === 0 ? extra : 0.0), d.balance + d.balance * monthlyRate);
      planPayments.set(d.id, Math.round(pay * 100) / 100);
    }
  }

  // Load actual debts
  const debtsResult = await sql`
    SELECT id, name, balance, interest_rate, minimum_payment, amount_due_immediately, 
           account_id, due_day_of_month, debt_type, debt_quality, payment_strategy, created_at, url 
    FROM debts 
    WHERE user_id = ${userId}
    ORDER BY balance ASC
  `;

  return debtsResult.rows.map(row => {
    const balance = parseFloat(row.balance) || 0.0;
    const minPay = parseFloat(row.minimum_payment) || 0.0;
    const amountDue = parseFloat(row.amount_due_immediately) || 0.0;
    const strategy = row.payment_strategy || 'minimum';

    const calculated_payment = calcPaymentAmount(
      balance,
      minPay,
      amountDue,
      strategy,
      planPayments.get(row.id)
    );

    return {
      id: row.id,
      name: row.name,
      balance,
      interest_rate: parseFloat(row.interest_rate) || 0.0,
      minimum_payment: minPay,
      amount_due_immediately: amountDue,
      account_id: row.account_id,
      due_day_of_month: row.due_day_of_month ? parseInt(row.due_day_of_month) : null,
      debt_type: row.debt_type,
      debt_quality: row.debt_quality,
      payment_strategy: strategy,
      calculated_payment: Math.round(calculated_payment * 100) / 100,
      url: row.url,
      created_at: row.created_at,
    };
  });
}
