import { sql, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return key && key === process.env.ADMIN_KEY;
}

export async function GET(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await initializeDatabase();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const offset = (page - 1) * limit;

    const { rows } = await sql`
      SELECT s.id, s.submitted_flag, s.is_correct, s.points_awarded, s.submitted_at,
             t.name as team_name,
             c.name as challenge_name, c.is_honeypot
      FROM submissions s
      JOIN teams t ON t.id = s.team_id
      LEFT JOIN challenges c ON c.id = s.challenge_id
      ORDER BY s.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const { rows: countRows } = await sql`SELECT COUNT(*) as total FROM submissions`;

    return NextResponse.json({
      submissions: rows,
      total: Number(countRows[0].total),
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
