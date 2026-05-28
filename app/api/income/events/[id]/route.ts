import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { amount, received_date, notes, account_id } = body;

    // Verify ownership via account link
    const check = await sql`
      SELECT e.id, e.amount, e.account_id 
      FROM income_events e
      JOIN accounts a ON e.account_id = a.id
      WHERE e.id = ${id} AND a.user_id = ${userId}
    `;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const oldEvent = check.rows[0];

    if (amount !== undefined && parseFloat(amount) !== oldEvent.amount) {
      const newAmt = parseFloat(amount) || 0.0;
      const difference = newAmt - oldEvent.amount;

      // Update event
      await sql`UPDATE income_events SET amount = ${newAmt} WHERE id = ${id}`;

      // Update account balance
      await sql`
        UPDATE accounts 
        SET balance = balance + ${difference}, balance_updated_at = ${new Date().toISOString()} 
        WHERE id = ${oldEvent.account_id}
      `;
    }

    if (received_date !== undefined) {
      await sql`UPDATE income_events SET received_date = ${received_date} WHERE id = ${id}`;
    }
    if (notes !== undefined) {
      await sql`UPDATE income_events SET notes = ${notes} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM income_events WHERE id = ${id}`;
    return Response.json(updated.rows[0]);
  } catch (error) {
    console.error('PUT /api/income/events/[id] error:', error);
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
    // Verify ownership
    const check = await sql`
      SELECT e.id, e.amount, e.account_id 
      FROM income_events e
      JOIN accounts a ON e.account_id = a.id
      WHERE e.id = ${id} AND a.user_id = ${userId}
    `;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const event = check.rows[0];

    // Revert the account balance change!
    await sql`
      UPDATE accounts 
      SET balance = balance - ${event.amount}, balance_updated_at = ${new Date().toISOString()} 
      WHERE id = ${event.account_id}
    `;

    // Delete event
    await sql`DELETE FROM income_events WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/income/events/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
