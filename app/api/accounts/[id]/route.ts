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
    const { name, account_type, balance, notes } = body;

    // Check if account belongs to user
    const check = await sql`SELECT id FROM accounts WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const balanceUpdatedAt = new Date().toISOString();

    if (name !== undefined) {
      await sql`UPDATE accounts SET name = ${name} WHERE id = ${id}`;
    }
    if (account_type !== undefined) {
      await sql`UPDATE accounts SET account_type = ${account_type} WHERE id = ${id}`;
    }
    if (balance !== undefined) {
      const parsedBalance = parseFloat(balance) || 0.0;
      await sql`UPDATE accounts SET balance = ${parsedBalance}, balance_updated_at = ${balanceUpdatedAt} WHERE id = ${id}`;
    }
    if (notes !== undefined) {
      await sql`UPDATE accounts SET notes = ${notes} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM accounts WHERE id = ${id}`;
    return Response.json(updated.rows[0]);
  } catch (error) {
    console.error('PUT /api/accounts/[id] error:', error);
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
    // Check if account belongs to user
    const check = await sql`SELECT id FROM accounts WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    await sql`DELETE FROM accounts WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/accounts/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
