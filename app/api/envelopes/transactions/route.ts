import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { envelope_id, amount, description } = body;
    if (!envelope_id || amount === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify envelope ownership
    const checkEnvelope = await sql`
      SELECT id, account_id, spent_amount 
      FROM envelopes 
      WHERE id = ${envelope_id} AND user_id = ${userId}
    `;
    const envelope = checkEnvelope.rows[0];
    if (!envelope) {
      return Response.json({ error: 'Envelope Not Found' }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const amt = parseFloat(amount) || 0.0;
    const dateStr = new Date().toISOString();

    // Create transaction
    await sql`
      INSERT INTO envelope_transactions (id, envelope_id, amount, description, transaction_date) 
      VALUES (${id}, ${envelope_id}, ${amt}, ${description || ''}, ${dateStr})
    `;

    // Update envelope spent amount
    await sql`
      UPDATE envelopes 
      SET spent_amount = spent_amount + ${amt} 
      WHERE id = ${envelope_id}
    `;

    // If envelope has an associated account, deduct from the account balance!
    if (envelope.account_id) {
      await sql`
        UPDATE accounts 
        SET balance = balance - ${amt}, balance_updated_at = ${dateStr} 
        WHERE id = ${envelope.account_id}
      `;
    }

    const result = await sql`SELECT * FROM envelope_transactions WHERE id = ${id}`;
    return Response.json({
      ...result.rows[0],
      amount: amt
    });
  } catch (error) {
    console.error('POST /api/envelopes/transactions error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
