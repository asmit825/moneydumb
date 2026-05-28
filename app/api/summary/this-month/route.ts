import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

function payDatesInMonth(frequency: string, nextPayDate: string | null, year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstOfNext = new Date(year, month, 1);

  if (!nextPayDate) {
    return [firstOfMonth];
  }

  const npd = new Date(nextPayDate);
  if (isNaN(npd.getTime())) {
    return [firstOfMonth];
  }

  const dates: Date[] = [];

  if (frequency === 'monthly') {
    const day = Math.min(npd.getDate(), 28);
    dates.push(new Date(year, month - 1, day));
  } else if (frequency === 'semimonthly') {
    dates.push(new Date(year, month - 1, 1));
    dates.push(new Date(year, month - 1, 15));
  } else {
    // weekly or biweekly
    const intervalDays = frequency === 'weekly' ? 7 : 14;
    
    // Walk back to find start date
    const d = new Date(npd);
    while (d >= firstOfNext) {
      d.setDate(d.getDate() - intervalDays);
    }
    while (d >= firstOfMonth) {
      d.setDate(d.getDate() - intervalDays);
    }
    
    // Walk forward to collect dates inside target month
    d.setDate(d.getDate() + intervalDays);
    while (d < firstOfNext) {
      if (d >= firstOfMonth) {
        dates.push(new Date(d));
      }
      d.setDate(d.getDate() + intervalDays);
    }
  }

  if (dates.length === 0) {
    dates.push(firstOfMonth);
  }

  return dates;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthLabel = `${monthNames[month - 1]} ${year}`;

    // 1. Accounts
    const accountsResult = await sql`
      SELECT id, name, account_type, balance FROM accounts WHERE user_id = ${userId} ORDER BY name
    `;
    const accounts = accountsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      account_type: row.account_type,
      balance: parseFloat(row.balance) || 0.0
    }));
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0.0);

    // 2. Income sources and pay dates
    const sourcesResult = await sql`
      SELECT id, name, net_amount, frequency, next_pay_date 
      FROM income_sources 
      WHERE user_id = ${userId} 
      ORDER BY name
    `;
    
    const incomeItems = [];
    let incomeCounter = 0;
    for (const source of sourcesResult.rows) {
      const dates = payDatesInMonth(source.frequency, source.next_pay_date, year, month);
      const netAmount = parseFloat(source.net_amount) || 0.0;
      for (const d of dates) {
        incomeCounter++;
        incomeItems.push({
          id: `${source.id}-${incomeCounter}`,
          source_id: source.id,
          name: source.name,
          amount: Math.round(netAmount * 100) / 100,
          pay_date: d.toISOString().split('T')[0],
          frequency: source.frequency
        });
      }
    }
    incomeItems.sort((a, b) => a.pay_date.localeCompare(b.pay_date));
    const totalIncome = incomeItems.reduce((sum, i) => sum + i.amount, 0.0);

    // 3. Recurring Expenses
    const expensesResult = await sql`
      SELECT e.id, e.name, e.amount, e.due_day_of_month, COALESCE(c.name, 'General') as category_name, e.account_id, e.url
      FROM expenses e 
      LEFT JOIN expense_categories c ON e.category_id = c.id 
      WHERE e.user_id = ${userId} AND e.is_recurring = 1 
      ORDER BY e.due_day_of_month ASC, e.name ASC
    `;
    const expenseItems = expensesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      amount: parseFloat(row.amount) || 0.0,
      due_day: row.due_day_of_month ? parseInt(row.due_day_of_month) : 1,
      category_name: row.category_name,
      account_id: row.account_id,
      url: row.url
    }));
    const totalExpenses = expenseItems.reduce((sum, e) => sum + e.amount, 0.0);

    // 4. Committed Payoff Plan scheduled payments for debts
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
      const extra = parseFloat(committed.extra_payment) || 0.0;
      const target = committed.target_months ? parseInt(committed.target_months) : null;
      
      const planDebtsResult = await sql`
        SELECT id, balance, interest_rate, minimum_payment FROM debts WHERE user_id = ${userId} AND balance > 0
      `;
      let planDebts = planDebtsResult.rows.map(row => ({
        id: row.id as string,
        balance: parseFloat(row.balance) || 0.0,
        apr: parseFloat(row.interest_rate) || 0.0,
        minPay: parseFloat(row.minimum_payment) || 0.0,
      }));

      if (committed.excluded_debt_ids) {
        const excluded = committed.excluded_debt_ids.split(',').map((s: string) => s.trim());
        planDebts = planDebts.filter(d => !excluded.includes(d.id));
      }

      if (committed.strategy === 'avalanche') {
        planDebts.sort((a, b) => b.apr - a.apr);
      } else {
        planDebts.sort((a, b) => a.balance - b.balance);
      }

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

    // Load active debts
    const debtRowsResult = await sql`
      SELECT id, name, minimum_payment, due_day_of_month, balance, interest_rate, account_id, amount_due_immediately, 
             debt_type, payment_strategy, url 
      FROM debts 
      WHERE user_id = ${userId} AND balance > 0 
      ORDER BY due_day_of_month ASC, name ASC
    `;
    
    const debtItems = debtRowsResult.rows.map(row => {
      const balance = parseFloat(row.balance) || 0.0;
      const minPay = parseFloat(row.minimum_payment) || 0.0;
      const dueNow = parseFloat(row.amount_due_immediately) || 0.0;
      const strategy = row.payment_strategy || 'minimum';

      let calculated_payment = minPay;
      if (strategy === 'minimum') {
        calculated_payment = balance <= minPay ? balance : minPay;
      } else if (strategy === 'due_now') {
        calculated_payment = dueNow;
      } else if (strategy === 'payoff_plan') {
        const planPay = planPayments.get(row.id);
        calculated_payment = planPay !== undefined ? planPay : (balance <= minPay ? balance : minPay);
      }

      return {
        id: row.id,
        name: row.name,
        minimum_payment: minPay,
        amount_due_immediately: dueNow,
        due_day: row.due_day_of_month ? parseInt(row.due_day_of_month) : null,
        balance,
        interest_rate: parseFloat(row.interest_rate) || 0.0,
        account_id: row.account_id,
        debt_type: row.debt_type || 'other',
        payment_strategy: strategy,
        calculated_payment: Math.round(calculated_payment * 100) / 100,
        url: row.url
      };
    });
    const totalDebtPayments = debtItems.reduce((sum, d) => sum + d.calculated_payment, 0.0);

    // 5. Allocations
    const allocationsResult = await sql`
      SELECT a.income_source_id, a.account_id, a.allocation_type, a.allocation_value 
      FROM income_allocations a
      JOIN income_sources s ON a.income_source_id = s.id
      WHERE s.user_id = ${userId}
    `;
    const allocations = allocationsResult.rows.map(row => ({
      income_source_id: row.income_source_id,
      account_id: row.account_id,
      allocation_type: row.allocation_type,
      allocation_value: parseFloat(row.allocation_value) || 0.0
    }));

    return Response.json({
      month_label: monthLabel,
      accounts,
      income_items: incomeItems,
      expense_items: expenseItems,
      debt_items: debtItems,
      allocations,
      totals: {
        total_balance: Math.round(totalBalance * 100) / 100,
        total_income: Math.round(totalIncome * 100) / 100,
        total_expenses: Math.round(totalExpenses * 100) / 100,
        total_debt_payments: Math.round(totalDebtPayments * 100) / 100
      }
    });
  } catch (error) {
    console.error('GET /api/summary/this-month error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
