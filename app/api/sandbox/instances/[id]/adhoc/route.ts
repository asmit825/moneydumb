import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: instanceId } = params;

  try {
    // Verify instance ownership
    const check = await sql`SELECT id FROM sandbox_instances WHERE id = ${instanceId} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, amount } = body;
    if (!name || amount === undefined) {
      return Response.json({ error: 'Missing name or amount' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const refId = `adhoc-${id}`;
    const parsedAmount = parseFloat(amount) || 0.0;

    await sql`
      INSERT INTO sandbox_items (id, instance_id, item_type, item_ref_id, is_paid, amount_override, name) 
      VALUES (${id}, ${instanceId}, 'adhoc', ${refId}, 0, ${parsedAmount}, ${name})
    `;

    return Response.json({
      id,
      item_type: 'adhoc',
      item_ref_id: refId,
      is_paid: false,
      amount_override: parsedAmount,
      account_id: null,
      name
    });
  } catch (error) {
    console.error('POST /api/sandbox/instances/[id]/adhoc error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
