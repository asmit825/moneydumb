import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const check = await sql`SELECT id FROM envelopes WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    await sql`DELETE FROM envelopes WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/envelopes/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
