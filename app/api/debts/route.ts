import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';
import { loadDebtsWithCalculated, debtQualityFor } from '@/app/lib/payoff';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const debts = await loadDebtsWithCalculated(userId);
    return Response.json(debts);
  } catch (error) {
    console.error('GET /api/debts error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, payment_strategy, url } = body;
    if (!name || balance === undefined || minimum_payment === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify account if provided
    if (account_id) {
      const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;
      if (checkAccount.rows.length === 0) {
        return Response.json({ error: 'Account Not Found' }, { status: 404 });
      }
    }

    const id = crypto.randomUUID();
    const bal = parseFloat(balance) || 0.0;
    const apr = parseFloat(interest_rate) || 0.0;
    const minPay = parseFloat(minimum_payment) || 0.0;
    const dueNow = parseFloat(amount_due_immediately) || 0.0;
    const dtype = debt_type || 'other';
    const quality = debtQualityFor(dtype);
    const strategy = payment_strategy || 'minimum';
    const dueDay = due_day_of_month !== undefined ? parseInt(due_day_of_month) : null;

    await sql`
      INSERT INTO debts (id, user_id, name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, debt_quality, payment_strategy, url) 
      VALUES (${id}, ${userId}, ${name}, ${bal}, ${apr}, ${minPay}, ${dueNow}, ${account_id || null}, ${dueDay}, ${dtype}, ${quality}, ${strategy}, ${url || ''})
    `;

    const debts = await loadDebtsWithCalculated(userId);
    const created = debts.find(d => d.id === id);
    return Response.json(created);
  } catch (error) {
    console.error('POST /api/debts error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
