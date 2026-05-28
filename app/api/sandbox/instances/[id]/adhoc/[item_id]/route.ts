import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; item_id: string }> }
) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: instanceId, item_id: itemId } = params;

  try {
    // Verify instance ownership
    const check = await sql`SELECT id FROM sandbox_instances WHERE id = ${instanceId} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    await sql`
      DELETE FROM sandbox_items 
      WHERE id = ${itemId} AND instance_id = ${instanceId} AND item_type = 'adhoc'
    `;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/sandbox/instances/[id]/adhoc/[item_id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
