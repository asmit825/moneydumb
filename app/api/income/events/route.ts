import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT e.id, e.income_source_id, e.amount, e.received_date, e.is_bonus, e.notes, e.created_at, e.account_id 
      FROM income_events e
      JOIN accounts a ON e.account_id = a.id
      WHERE a.user_id = ${userId}
      ORDER BY e.received_date DESC
    `;
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET /api/income/events error:', error);
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
    const { income_source_id, amount, received_date, is_bonus, notes, account_id } = body;
    if (!amount || !received_date || !account_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify account ownership
    const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;
    if (checkAccount.rows.length === 0) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify income source ownership if provided
    if (income_source_id) {
      const checkSource = await sql`SELECT id FROM income_sources WHERE id = ${income_source_id} AND user_id = ${userId}`;
      if (checkSource.rows.length === 0) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const id = crypto.randomUUID();
    const amt = parseFloat(amount) || 0.0;
    const bonus = is_bonus ? 1 : 0;

    await sql`
      INSERT INTO income_events (id, income_source_id, amount, received_date, is_bonus, notes, account_id) 
      VALUES (${id}, ${income_source_id || null}, ${amt}, ${received_date}, ${bonus}, ${notes || ''}, ${account_id})
    `;

    // Automatically update the account balance when an income event is recorded!
    // This matches the local-first react/rust application expectations.
    await sql`
      UPDATE accounts 
      SET balance = balance + ${amt}, balance_updated_at = ${new Date().toISOString()} 
      WHERE id = ${account_id}
    `;

    const result = await sql`SELECT * FROM income_events WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/income/events error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
