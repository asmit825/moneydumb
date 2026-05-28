import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
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

    const result = await sql`
      SELECT id, item_type, item_ref_id, is_paid, amount_override, account_id, name 
      FROM sandbox_items 
      WHERE instance_id = ${instanceId}
    `;

    const mapped = result.rows.map(row => ({
      ...row,
      is_paid: row.is_paid === 1 || row.is_paid === true,
      amount_override: row.amount_override ? parseFloat(row.amount_override) : null
    }));

    return Response.json(mapped);
  } catch (error) {
    console.error('GET /api/sandbox/instances/[id]/items error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
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

    const items = await request.json();
    if (!Array.isArray(items)) {
      return Response.json({ error: 'Body must be an array of sandbox items' }, { status: 400 });
    }

    for (const item of items) {
      const isPaidInt = item.is_paid ? 1 : 0;
      const amtOverride = item.amount_override !== undefined && item.amount_override !== null 
        ? parseFloat(item.amount_override) 
        : null;

      // Check if item already exists in this sandbox instance
      const existingResult = await sql`
        SELECT id FROM sandbox_items 
        WHERE instance_id = ${instanceId} AND item_ref_id = ${item.item_ref_id} AND item_type = ${item.item_type}
      `;

      if (existingResult.rows.length > 0) {
        // Update
        const existingId = existingResult.rows[0].id;
        await sql`
          UPDATE sandbox_items 
          SET is_paid = ${isPaidInt}, amount_override = ${amtOverride}, account_id = ${item.account_id || null}, name = ${item.name || null} 
          WHERE id = ${existingId}
        `;
      } else {
        // Insert
        const id = item.id || crypto.randomUUID();
        await sql`
          INSERT INTO sandbox_items (id, instance_id, item_type, item_ref_id, is_paid, amount_override, account_id, name) 
          VALUES (${id}, ${instanceId}, ${item.item_type}, ${item.item_ref_id}, ${isPaidInt}, ${amtOverride}, ${item.account_id || null}, ${item.name || null})
        `;
      }
    }

    // Return the full updated items list
    const result = await sql`
      SELECT id, item_type, item_ref_id, is_paid, amount_override, account_id, name 
      FROM sandbox_items 
      WHERE instance_id = ${instanceId}
    `;

    const mapped = result.rows.map(row => ({
      ...row,
      is_paid: row.is_paid === 1 || row.is_paid === true,
      amount_override: row.amount_override ? parseFloat(row.amount_override) : null
    }));

    return Response.json(mapped);
  } catch (error) {
    console.error('PUT /api/sandbox/instances/[id]/items error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
