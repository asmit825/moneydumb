import { getAuthUserId } from '@/app/lib/auth';
import { sql } from '@/app/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT id, username FROM users WHERE id = ${userId}
    `;
    if (result.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
