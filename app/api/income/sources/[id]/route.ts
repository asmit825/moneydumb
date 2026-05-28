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
    const body = await request.json();
    const { name, gross_amount, net_amount, frequency, next_pay_date, notes } = body;

    // Check ownership
    const check = await sql`SELECT id FROM income_sources WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    if (name !== undefined) {
      await sql`UPDATE income_sources SET name = ${name} WHERE id = ${id}`;
    }
    if (gross_amount !== undefined) {
      const gross = parseFloat(gross_amount) || 0.0;
      await sql`UPDATE income_sources SET gross_amount = ${gross} WHERE id = ${id}`;
    }
    if (net_amount !== undefined) {
      const net = parseFloat(net_amount) || 0.0;
      await sql`UPDATE income_sources SET net_amount = ${net} WHERE id = ${id}`;
    }
    if (frequency !== undefined) {
      await sql`UPDATE income_sources SET frequency = ${frequency} WHERE id = ${id}`;
    }
    if (next_pay_date !== undefined) {
      await sql`UPDATE income_sources SET next_pay_date = ${next_pay_date} WHERE id = ${id}`;
    }
    if (notes !== undefined) {
      await sql`UPDATE income_sources SET notes = ${notes} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM income_sources WHERE id = ${id}`;
    return Response.json(updated.rows[0]);
  } catch (error) {
    console.error('PUT /api/income/sources/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const check = await sql`SELECT id FROM income_sources WHERE id = ${id} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    await sql`DELETE FROM income_sources WHERE id = ${id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/income/sources/[id] error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
