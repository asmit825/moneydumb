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
    const { category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes, url } = body;

    // Check ownership
    const check = await sql`SELECT id FROM expenses WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    if (category_id !== undefined) {
      // Verify category ownership
      const checkCat = await sql`SELECT id FROM expense_categories WHERE id = ${category_id} AND user_id = ${userId}`;
      if (checkCat.rows.length === 0) {
        return Response.json({ error: 'Category Not Found' }, { status: 404 });
      }
      await sql`UPDATE expenses SET category_id = ${category_id} WHERE id = ${id}`;
    }

    if (account_id !== undefined) {
      if (account_id) {
        // Verify account ownership
        const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;
        if (checkAccount.rows.length === 0) {
          return Response.json({ error: 'Account Not Found' }, { status: 404 });
        }
      }
      await sql`UPDATE expenses SET account_id = ${account_id || null} WHERE id = ${id}`;
    }

    if (name !== undefined) {
      await sql`UPDATE expenses SET name = ${name} WHERE id = ${id}`;
    }
    if (amount !== undefined) {
      const amt = parseFloat(amount) || 0.0;
      await sql`UPDATE expenses SET amount = ${amt} WHERE id = ${id}`;
    }
    if (due_day_of_month !== undefined) {
      const dueDay = due_day_of_month !== null ? parseInt(due_day_of_month) : null;
      await sql`UPDATE expenses SET due_day_of_month = ${dueDay} WHERE id = ${id}`;
    }
    if (is_recurring !== undefined) {
      const rec = is_recurring ? 1 : 0;
      await sql`UPDATE expenses SET is_recurring = ${rec} WHERE id = ${id}`;
    }
    if (frequency !== undefined) {
      await sql`UPDATE expenses SET frequency = ${frequency} WHERE id = ${id}`;
    }
    if (notes !== undefined) {
      await sql`UPDATE expenses SET notes = ${notes} WHERE id = ${id}`;
    }
    if (url !== undefined) {
      await sql`UPDATE expenses SET url = ${url} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM expenses WHERE id = ${id}`;
    return Response.json(updated.rows[0]);
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
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
    const check = await sql`SELECT id FROM expenses WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    await sql`DELETE FROM expenses WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
