import { sql } from '@vercel/postgres';

export async function query(queryString: string, params: any[] = []) {
  try {
    return await sql.query(queryString, params);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch data.');
  }
}