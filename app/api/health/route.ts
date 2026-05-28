import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET() {
  const diagnostics: Record<string, any> = {
    node_env: process.env.NODE_ENV,
    has_postgres_url: !!process.env.POSTGRES_URL,
    postgres_url_preview: process.env.POSTGRES_URL
      ? process.env.POSTGRES_URL.substring(0, 30) + '...'
      : 'NOT SET',
  };

  try {
    const result = await sql`SELECT COUNT(*) as user_count FROM users`;
    diagnostics.db_connected = true;
    diagnostics.user_count = result.rows[0]?.user_count ?? result.rows[0]?.c ?? 0;
  } catch (e: any) {
    diagnostics.db_connected = false;
    diagnostics.db_error = e.message?.substring(0, 200);
  }

  return NextResponse.json(diagnostics);
}
