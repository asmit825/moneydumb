import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Return allocations for this user's income sources
    const result = await sql`
      SELECT a.id, a.income_source_id, a.account_id, a.allocation_type, a.allocation_value 
      FROM income_allocations a
      JOIN income_sources s ON a.income_source_id = s.id
      WHERE s.user_id = ${userId}
    `;
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET /api/income/allocations error:', error);
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
    const { income_source_id, account_id, allocation_type, allocation_value } = body;
    if (!income_source_id || !account_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership of income source and account
    const checkSource = await sql`SELECT id FROM income_sources WHERE id = ${income_source_id} AND user_id = ${userId}`;
    const checkAccount = await sql`SELECT id FROM accounts WHERE id = ${account_id} AND user_id = ${userId}`;

    if (checkSource.rows.length === 0 || checkAccount.rows.length === 0) {
      return Response.json({ error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    const id = crypto.randomUUID();
    const val = parseFloat(allocation_value) || 0.0;

    await sql`
      INSERT INTO income_allocations (id, income_source_id, account_id, allocation_type, allocation_value) 
      VALUES (${id}, ${income_source_id}, ${account_id}, ${allocation_type || 'percent'}, ${val})
    `;

    const result = await sql`SELECT * FROM income_allocations WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/income/allocations error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
