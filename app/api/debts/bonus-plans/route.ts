import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const plansResult = await sql`
      SELECT id, income_event_id, total_amount, strategy, notes, created_at 
      FROM bonus_plans 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC
    `;

    const plans = [];

    for (const plan of plansResult.rows) {
      const allocationsResult = await sql`
        SELECT id, allocation_type, reference_id, amount, order_index 
        FROM bonus_plan_allocations 
        WHERE bonus_plan_id = ${plan.id}
        ORDER BY order_index ASC
      `;

      plans.push({
        ...plan,
        total_amount: parseFloat(plan.total_amount) || 0.0,
        allocations: allocationsResult.rows.map(a => ({
          ...a,
          amount: parseFloat(a.amount) || 0.0
        }))
      });
    }

    return Response.json(plans);
  } catch (error) {
    console.error('GET /api/debts/bonus-plans error:', error);
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
    const { income_event_id, total_amount, strategy, notes } = body;
    if (total_amount === undefined) {
      return Response.json({ error: 'Missing total amount' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const amt = parseFloat(total_amount) || 0.0;

    await sql`
      INSERT INTO bonus_plans (id, user_id, income_event_id, total_amount, strategy, notes) 
      VALUES (${id}, ${userId}, ${income_event_id || null}, ${amt}, ${strategy || 'snowball'}, ${notes || ''})
    `;

    const plan = await sql`SELECT * FROM bonus_plans WHERE id = ${id}`;
    return Response.json({
      ...plan.rows[0],
      total_amount: amt,
      allocations: []
    });
  } catch (error) {
    console.error('POST /api/debts/bonus-plans error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
