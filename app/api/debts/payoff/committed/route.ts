import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, strategy, extra_payment, target_months, excluded_debt_ids, committed_at 
      FROM committed_payoff_plan 
      WHERE user_id = ${userId} 
      ORDER BY committed_at DESC 
      LIMIT 1
    `;
    const committed = result.rows[0];
    if (!committed) {
      return Response.json(null);
    }

    const mapped = {
      ...committed,
      extra_payment: parseFloat(committed.extra_payment) || 0.0,
      target_months: committed.target_months ? parseInt(committed.target_months) : null,
      excluded_debt_ids: committed.excluded_debt_ids ? committed.excluded_debt_ids.split(',') : []
    };

    return Response.json(mapped);
  } catch (error) {
    console.error('GET /api/debts/payoff/committed error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await sql`DELETE FROM committed_payoff_plan WHERE user_id = ${userId}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/debts/payoff/committed error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
