import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, name, estimated_cost, priority, notes, url, created_at, purchased_at 
      FROM wants 
      WHERE user_id = ${userId}
      ORDER BY 
        CASE priority 
          WHEN 'dream' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4
        END, 
        created_at DESC
    `;

    const mapped = result.rows.map(row => ({
      ...row,
      estimated_cost: parseFloat(row.estimated_cost) || 0.0
    }));

    return Response.json(mapped);
  } catch (error) {
    console.error('GET /api/wants error:', error);
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
    const { name, estimated_cost, priority, notes, url } = body;
    if (!name || estimated_cost === undefined) {
      return Response.json({ error: 'Missing name or cost' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const cost = parseFloat(estimated_cost) || 0.0;

    await sql`
      INSERT INTO wants (id, user_id, name, estimated_cost, priority, notes, url) 
      VALUES (${id}, ${userId}, ${name}, ${cost}, ${priority || 'medium'}, ${notes || ''}, ${url || ''})
    `;

    const result = await sql`SELECT * FROM wants WHERE id = ${id}`;
    return Response.json({
      ...result.rows[0],
      estimated_cost: cost
    });
  } catch (error) {
    console.error('POST /api/wants error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
