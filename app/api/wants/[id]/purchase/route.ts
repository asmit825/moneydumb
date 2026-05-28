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
    const check = await sql`SELECT id FROM wants WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const purchasedAt = new Date().toISOString();
    await sql`UPDATE wants SET purchased_at = ${purchasedAt} WHERE id = ${id}`;

    const result = await sql`SELECT * FROM wants WHERE id = ${id}`;
    return Response.json({
      ...result.rows[0],
      estimated_cost: parseFloat(result.rows[0].estimated_cost) || 0.0
    });
  } catch (error) {
    console.error('PUT /api/wants/[id]/purchase error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
