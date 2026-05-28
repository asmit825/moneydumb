import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, name, account_type, balance, notes, created_at, balance_updated_at 
      FROM accounts 
      WHERE user_id = ${userId} 
      ORDER BY name ASC
    `;
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET /api/accounts error:', error);
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
    const { name, account_type, balance, notes } = body;
    if (!name) {
      return Response.json({ error: 'Missing account name' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const initialBalance = parseFloat(balance) || 0.0;
    const balanceUpdatedAt = new Date().toISOString();

    await sql`
      INSERT INTO accounts (id, user_id, name, account_type, balance, notes, balance_updated_at) 
      VALUES (${id}, ${userId}, ${name}, ${account_type || 'checking'}, ${initialBalance}, ${notes || ''}, ${balanceUpdatedAt})
    `;

    // Return the newly created account
    const result = await sql`SELECT * FROM accounts WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/accounts error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
