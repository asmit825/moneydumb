import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT e.id, e.category_id, e.name, e.amount, e.due_day_of_month, e.is_recurring, e.frequency, e.account_id, e.notes, e.url, e.created_at, c.name as category_name
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      WHERE e.user_id = ${userId}
      ORDER BY e.created_at DESC
    `;

    // Map `is_recurring` to boolean for client compatibility
    const mapped = result.rows.map(row => ({
      ...row,
      is_recurring: row.is_recurring === 1 || row.is_recurring === true
    }));

    return Response.json(mapped);
  } catch (error) {
    console.error('GET /api/expenses error:', error);
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
    const { category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes, url } = body;
    if (!category_id || !name) {
      return Response.json({ error: 'Missing category or name' }, { status: 400 });
    }

    // Verify category ownership
    const checkCat = await sql`SELECT id FROM expense_categories WHERE id = ${category_id} AND user_id = ${userId}`;
    if (checkCat.rows.length === 0) {
      return Response.json({ error: 'Category Not Found' }, { status: 404 });
    }

    // Verify account ownership if provided
    if (account_id) {
      const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;
      if (checkAccount.rows.length === 0) {
        return Response.json({ error: 'Account Not Found' }, { status: 404 });
      }
    }

    const id = crypto.randomUUID();
    const amt = parseFloat(amount) || 0.0;
    const recurringVal = is_recurring ? 1 : 0;
    const dueDay = due_day_of_month !== undefined ? parseInt(due_day_of_month) : null;

    await sql`
      INSERT INTO expenses (id, user_id, category_id, name, amount, due_day_of_month, is_recurring, frequency, account_id, notes, url) 
      VALUES (${id}, ${userId}, ${category_id}, ${name}, ${amt}, ${dueDay}, ${recurringVal}, ${frequency || 'monthly'}, ${account_id || null}, ${notes || ''}, ${url || ''})
    `;

    const result = await sql`SELECT * FROM expenses WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
