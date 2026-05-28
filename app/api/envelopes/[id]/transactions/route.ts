import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: envelopeId } = params;

  try {
    // Verify envelope ownership
    const check = await sql`SELECT id FROM envelopes WHERE id = ${envelopeId} AND user_id = ${userId}`;
    if (check.rows.length === 0) {
      return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const result = await sql`
      SELECT id, envelope_id, amount, description, transaction_date 
      FROM envelope_transactions 
      WHERE envelope_id = ${envelopeId}
      ORDER BY transaction_date DESC
    `;

    const mapped = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0.0
    }));

    return Response.json(mapped);
  } catch (error) {
    console.error('GET /api/envelopes/[id]/transactions error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
