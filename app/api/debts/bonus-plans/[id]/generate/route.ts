import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: planId } = params;

  try {
    // Fetch plan details
    const planResult = await sql`
      SELECT total_amount, strategy 
      FROM bonus_plans 
      WHERE id = ${planId} AND user_id = ${userId}
    `;
    const plan = planResult.rows[0];
    if (!plan) {
      return Response.json({ error: 'Plan Not Found' }, { status: 404 });
    }

    const totalAmount = parseFloat(plan.total_amount) || 0.0;
    const strategy = plan.strategy || 'snowball';

    // Fetch active debts
    const debtsResult = await sql`
      SELECT id, name, balance, interest_rate 
      FROM debts 
      WHERE user_id = ${userId} AND balance > 0
    `;
    const debts = debtsResult.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      balance: parseFloat(row.balance) || 0.0,
      apr: parseFloat(row.interest_rate) || 0.0,
    }));

    // Sort by strategy
    if (strategy === 'avalanche') {
      debts.sort((a, b) => b.apr - a.apr);
    } else {
      debts.sort((a, b) => a.balance - b.balance);
    }

    // Delete existing allocations
    await sql`DELETE FROM bonus_plan_allocations WHERE bonus_plan_id = ${planId}`;

    let remainingBonus = totalAmount;
    const allocations = [];

    for (let i = 0; i < debts.length; i++) {
      if (remainingBonus <= 0.001) break;
      const d = debts[i];
      const alloc = Math.min(remainingBonus, d.balance);
      const allocId = crypto.randomUUID();

      await sql`
        INSERT INTO bonus_plan_allocations (id, bonus_plan_id, allocation_type, reference_id, amount, order_index) 
        VALUES (${allocId}, ${planId}, 'debt', ${d.id}, ${alloc}, ${i})
      `;

      allocations.push({
        id: allocId,
        bonus_plan_id: planId,
        allocation_type: 'debt',
        reference_id: d.id,
        amount: Math.round(alloc * 100) / 100,
        order_index: i,
      });

      remainingBonus -= alloc;
    }

    // Return updated plan details
    const fullPlanResult = await sql`
      SELECT id, income_event_id, total_amount, strategy, notes, created_at 
      FROM bonus_plans 
      WHERE id = ${planId}
    `;

    return Response.json({
      ...fullPlanResult.rows[0],
      total_amount: totalAmount,
      allocations,
    });
  } catch (error) {
    console.error('POST /api/debts/bonus-plans/[id]/generate error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
