import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';
import { loadDebtsWithCalculated, debtQualityFor } from '@/app/lib/payoff';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { name, balance, interest_rate, minimum_payment, amount_due_immediately, account_id, due_day_of_month, debt_type, payment_strategy, url } = body;

    // Check ownership
    const check = await sql`SELECT id FROM debts WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    if (account_id !== undefined) {
      if (account_id) {
        const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;
        if (checkAccount.rows.length === 0) {
          return Response.json({ error: 'Account Not Found' }, { status: 404 });
        }
      }
      await sql`UPDATE debts SET account_id = ${account_id || null} WHERE id = ${id}`;
    }

    if (name !== undefined) {
      await sql`UPDATE debts SET name = ${name} WHERE id = ${id}`;
    }
    if (balance !== undefined) {
      const bal = parseFloat(balance) || 0.0;
      await sql`UPDATE debts SET balance = ${bal} WHERE id = ${id}`;
    }
    if (interest_rate !== undefined) {
      const apr = parseFloat(interest_rate) || 0.0;
      await sql`UPDATE debts SET interest_rate = ${apr} WHERE id = ${id}`;
    }
    if (minimum_payment !== undefined) {
      const minPay = parseFloat(minimum_payment) || 0.0;
      await sql`UPDATE debts SET minimum_payment = ${minPay} WHERE id = ${id}`;
    }
    if (amount_due_immediately !== undefined) {
      const dueNow = parseFloat(amount_due_immediately) || 0.0;
      await sql`UPDATE debts SET amount_due_immediately = ${dueNow} WHERE id = ${id}`;
    }
    if (due_day_of_month !== undefined) {
      const dueDay = due_day_of_month !== null ? parseInt(due_day_of_month) : null;
      await sql`UPDATE debts SET due_day_of_month = ${dueDay} WHERE id = ${id}`;
    }
    if (debt_type !== undefined) {
      const quality = debtQualityFor(debt_type);
      await sql`UPDATE debts SET debt_type = ${debt_type}, debt_quality = ${quality} WHERE id = ${id}`;
    }
    if (payment_strategy !== undefined) {
      await sql`UPDATE debts SET payment_strategy = ${payment_strategy} WHERE id = ${id}`;
    }
    if (url !== undefined) {
      await sql`UPDATE debts SET url = ${url} WHERE id = ${id}`;
    }

    const debts = await loadDebtsWithCalculated(userId);
    const updated = debts.find(d => d.id === id);
    return Response.json(updated);
  } catch (error) {
    console.error('PUT /api/debts/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const check = await sql`SELECT id FROM debts WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    await sql`DELETE FROM debts WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/debts/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
