import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, name, gross_amount, net_amount, frequency, next_pay_date, notes, created_at 
      FROM income_sources 
      WHERE user_id = ${userId} 
      ORDER BY name ASC
    `;
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET /api/income/sources error:', error);
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
    const { name, gross_amount, net_amount, frequency, next_pay_date, notes } = body;
    if (!name) {
      return Response.json({ error: 'Missing name' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const gross = parseFloat(gross_amount) || 0.0;
    const net = parseFloat(net_amount) || 0.0;

    await sql`
      INSERT INTO income_sources (id, user_id, name, gross_amount, net_amount, frequency, next_pay_date, notes) 
      VALUES (${id}, ${userId}, ${name}, ${gross}, ${net}, ${frequency || 'biweekly'}, ${next_pay_date || ''}, ${notes || ''})
    `;

    const result = await sql`SELECT * FROM income_sources WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/income/sources error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
