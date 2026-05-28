import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, name, color, icon 
      FROM expense_categories 
      WHERE user_id = ${userId} 
      ORDER BY name ASC
    `;
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET /api/expenses/categories error:', error);
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
    const { name, color, icon } = body;
    if (!name) {
      return Response.json({ error: 'Missing name' }, { status: 400 });
    }

    const id = crypto.randomUUID();

    await sql`
      INSERT INTO expense_categories (id, user_id, name, color, icon) 
      VALUES (${id}, ${userId}, ${name}, ${color || '#6366f1'}, ${icon || '📁'})
    `;

    const result = await sql`SELECT * FROM expense_categories WHERE id = ${id}`;
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/expenses/categories error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
