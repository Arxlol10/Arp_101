import { sql, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(request, { params }) {
  try {
    await initializeDatabase();

    const team = await getSession(request);
    if (!team) {
      return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
    }

    const hintId = Number(params.id);
    if (!hintId) {
      return NextResponse.json({ error: 'Invalid hint ID.' }, { status: 400 });
    }

    // Get hint details
    const { rows: hintRows } = await sql`
      SELECT h.id, h.content, h.penalty_pct, h.challenge_id, c.points as challenge_points
      FROM hints h
      JOIN challenges c ON c.id = h.challenge_id
      WHERE h.id = ${hintId} AND c.is_honeypot = FALSE
    `;

    if (hintRows.length === 0) {
      return NextResponse.json({ error: 'Hint not found.' }, { status: 404 });
    }

    const hint = hintRows[0];

    // Already unlocked?
    const { rows: existing } = await sql`
      SELECT id FROM hint_unlocks WHERE team_id = ${team.id} AND hint_id = ${hintId}
    `;

    if (existing.length > 0) {
      // Already unlocked — just return hint content
      return NextResponse.json({
        content: hint.content,
        pointsLost: 0,
        alreadyUnlocked: true,
      });
    }

    // Calculate penalty
    const pointsLost = Math.floor(hint.challenge_points * hint.penalty_pct / 100);

    // Record unlock
    await sql`
      INSERT INTO hint_unlocks (team_id, hint_id, points_lost)
      VALUES (${team.id}, ${hintId}, ${pointsLost})
    `;

    // Deduct points from team
    await sql`UPDATE teams SET score = score - ${pointsLost} WHERE id = ${team.id}`;

    return NextResponse.json({
      content: hint.content,
      pointsLost,
      alreadyUnlocked: false,
    });
  } catch (err) {
    console.error('Hint unlock error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
