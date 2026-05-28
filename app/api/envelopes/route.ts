import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get('month') || '');
  const year = parseInt(url.searchParams.get('year') || '');

  if (isNaN(month) || isNaN(year)) {
    return Response.json({ error: 'Missing month or year' }, { status: 400 });
  }

  try {
    const result = await sql`
      SELECT e.id, e.name, e.category_id, e.budgeted_amount, e.spent_amount, e.month, e.year, e.account_id, e.notes, c.name as category_name
      FROM envelopes e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE e.user_id = ${userId} AND e.month = ${month} AND e.year = ${year}
      ORDER BY e.name ASC
    `;
    
    const mapped = result.rows.map(row => ({
      ...row,
      budgeted_amount: parseFloat(row.budgeted_amount) || 0.0,
      spent_amount: parseFloat(row.spent_amount) || 0.0,
    }));

    return Response.json(mapped);
  } catch (error) {
    console.error('GET /api/envelopes error:', error);
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
    const { name, category_id, budgeted_amount, month, year, account_id, notes } = body;
    if (!name || isNaN(month) || isNaN(year)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify category if provided
    if (category_id) {
      const checkCat = await sql`SELECT id FROM expense_categories WHERE id = ${category_id} AND user_id = ${userId}`;
      if (checkCat.rows.length === 0) {
        return Response.json({ error: 'Category Not Found' }, { status: 404 });
      }
    }

    // Verify account if provided
    if (account_id) {
      const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;
      if (checkAccount.rows.length === 0) {
        return Response.json({ error: 'Account Not Found' }, { status: 404 });
      }
    }

    const id = crypto.randomUUID();
    const budgeted = parseFloat(budgeted_amount) || 0.0;

    await sql`
      INSERT INTO envelopes (id, user_id, name, category_id, budgeted_amount, spent_amount, month, year, account_id, notes) 
      VALUES (${id}, ${userId}, ${name}, ${category_id || null}, ${budgeted}, 0.0, ${month}, ${year}, ${account_id || null}, ${notes || ''})
    `;

    const result = await sql`SELECT * FROM envelopes WHERE id = ${id}`;
    return Response.json({
      ...result.rows[0],
      budgeted_amount: budgeted,
      spent_amount: 0.0
    });
  } catch (error) {
    console.error('POST /api/envelopes error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
