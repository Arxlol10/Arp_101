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

    // Solves per challenge
    const { rows: challengeStats } = await sql`
      SELECT c.id, c.name, c.tier, c.is_honeypot, c.points,
             COUNT(CASE WHEN s.is_correct = TRUE THEN 1 END) as solve_count,
             COUNT(CASE WHEN s.is_correct = FALSE AND c.is_honeypot = TRUE THEN 1 END) as honeypot_hits
      FROM challenges c
      LEFT JOIN submissions s ON s.challenge_id = c.id
      GROUP BY c.id, c.name, c.tier, c.is_honeypot, c.points
      ORDER BY c.tier ASC, c.name ASC
    `;

    // Overall stats
    const { rows: overallRows } = await sql`
      SELECT
        (SELECT COUNT(*) FROM teams) as total_teams,
        (SELECT COUNT(*) FROM submissions) as total_submissions,
        (SELECT COUNT(*) FROM submissions WHERE is_correct = TRUE) as correct_submissions,
        (SELECT COUNT(*) FROM challenges) as total_challenges,
        (SELECT COUNT(*) FROM challenges WHERE is_honeypot = TRUE) as total_honeypots,
        (SELECT COUNT(*) FROM tier_unlocks) as total_tier_unlocks
    `;

    return NextResponse.json({
      challenges: challengeStats,
      overall: overallRows[0],
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
