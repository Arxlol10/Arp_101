import { NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request, { params }) {
  try {
    await initializeDatabase();
    const team = await getSession(request);
    if (!team) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    // 1. Fetch challenge details
    const { rows: challenges } = await sql`
      SELECT id, name, category, points, tier, difficulty, description, 
             attachment_url, attachment_name, attachment_size, attachment_hash, is_honeypot
      FROM challenges
      WHERE id = ${id}
    `;
    if (challenges.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const challenge = challenges[0];

    // Don't leak honeypot details via the detail page
    if (challenge.is_honeypot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Fetch global statistics for this challenge
    const { rows: solves } = await sql`
      SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ${id} AND is_correct = TRUE
    `;
    const { rows: total } = await sql`
      SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ${id}
    `;
    const solvesCount = Number(solves[0].count);
    const totalCount = Number(total[0].count);
    const successRate = totalCount === 0 ? 0 : Math.round((solvesCount / totalCount) * 100);

    // 3. Did this team solve it?
    const { rows: teamSolves } = await sql`
      SELECT 1 FROM submissions WHERE challenge_id = ${id} AND team_id = ${team.id} AND is_correct = TRUE LIMIT 1
    `;
    const solvedByMe = teamSolves.length > 0;

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        name: challenge.name,
        category: challenge.category,
        points: challenge.points,
        tier: challenge.tier,
        difficulty: challenge.difficulty,
        description: challenge.description,
        attachment: challenge.attachment_url ? {
          url: challenge.attachment_url,
          name: challenge.attachment_name,
          size: challenge.attachment_size,
          hash: challenge.attachment_hash
        } : null,
      },
      stats: {
        solves: solvesCount,
        attempts: totalCount,
        successRate
      },
      solved: solvedByMe
    });

  } catch (err) {
    console.error('Challenge Detail API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
