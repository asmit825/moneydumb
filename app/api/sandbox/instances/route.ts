import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, month, year, created_at 
      FROM sandbox_instances 
      WHERE user_id = ${userId} 
      ORDER BY year DESC, month DESC
    `;
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET /api/sandbox/instances error:', error);
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
    const { month, year } = body;
    if (month === undefined || year === undefined) {
      return Response.json({ error: 'Missing month or year' }, { status: 400 });
    }

    // Check if instance already exists
    const existingResult = await sql`
      SELECT id, month, year, created_at 
      FROM sandbox_instances 
      WHERE user_id = ${userId} AND month = ${month} AND year = ${year}
    `;
    
    if (existingResult.rows.length > 0) {
      return Response.json(existingResult.rows[0]);
    }

    const id = crypto.randomUUID();
    await sql`
      INSERT INTO sandbox_instances (id, user_id, month, year) 
      VALUES (${id}, ${userId}, ${month}, ${year})
    `;

    const result = await sql`SELECT * FROM sandbox_instances WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/sandbox/instances error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
