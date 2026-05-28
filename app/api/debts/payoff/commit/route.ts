import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { strategy, extra_payment, target_months, excluded_debt_ids } = body;

    const id = crypto.randomUUID();
    const extra = parseFloat(extra_payment) || 0.0;
    const target = target_months ? parseInt(target_months) : null;
    const excludedStr = Array.isArray(excluded_debt_ids) ? excluded_debt_ids.join(',') : (excluded_debt_ids || null);

    // Delete existing committed plans for this user (only 1 active at a time)
    await sql`DELETE FROM committed_payoff_plan WHERE user_id = ${userId}`;

    await sql`
      INSERT INTO committed_payoff_plan (id, user_id, strategy, extra_payment, target_months, excluded_debt_ids) 
      VALUES (${id}, ${userId}, ${strategy || 'snowball'}, ${extra}, ${target}, ${excludedStr})
    `;

    const result = await sql`SELECT * FROM committed_payoff_plan WHERE id = ${id}`;
    
    // Map excluded_debt_ids back to an array for client compatibility
    const committed = result.rows[0];
    const mapped = {
      ...committed,
      excluded_debt_ids: committed.excluded_debt_ids ? committed.excluded_debt_ids.split(',') : []
    };

    return Response.json(mapped);
  } catch (error) {
    console.error('POST /api/debts/payoff/commit error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
