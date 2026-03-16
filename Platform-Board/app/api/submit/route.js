import { sql, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await initializeDatabase();

    const { teamName, password, flag } = await request.json();

    if (!teamName || !password || !flag) {
      return NextResponse.json({ error: 'Team name, password, and flag are required.' }, { status: 400 });
    }

    // Authenticate team
    const teamRes = await sql`
      SELECT id, name, password_hash, score
      FROM teams
      WHERE LOWER(name) = LOWER(${teamName})
    `;

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    const team = teamRes.rows[0];
    const passwordValid = await bcrypt.compare(password, team.password_hash);

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    // Find the challenge by matching the flag
    const challRes = await sql`
      SELECT id, name, flag, points, is_honeypot
      FROM challenges
      WHERE flag = ${flag}
    `;

    if (challRes.rows.length === 0) {
      // Flag doesn't match any challenge — record as incorrect
      await sql`
        INSERT INTO submissions (team_id, challenge_id, submitted_flag, is_correct, points_awarded)
        VALUES (${team.id}, NULL, ${flag}, FALSE, 0)
      `;
      return NextResponse.json({ error: 'Incorrect flag. No points awarded.' }, { status: 400 });
    }

    const challenge = challRes.rows[0];

    // Check if already submitted correctly
    const dupCheck = await sql`
      SELECT id FROM submissions
      WHERE team_id = ${team.id}
        AND challenge_id = ${challenge.id}
        AND is_correct = TRUE
    `;

    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ error: 'You already solved this challenge.' }, { status: 409 });
    }

    // Calculate points
    let pointsAwarded = challenge.points;
    let message = '';

    if (challenge.is_honeypot) {
      // Honeypot: DEDUCT points
      pointsAwarded = -Math.abs(challenge.points);
      message = `🍯 HONEYPOT! You fell for "${challenge.name}". ${pointsAwarded} points.`;
    } else {
      // Normal challenge: ADD points
      message = `✅ Correct! "${challenge.name}" solved. +${pointsAwarded} points!`;
    }

    // Record submission
    await sql`
      INSERT INTO submissions (team_id, challenge_id, submitted_flag, is_correct, points_awarded)
      VALUES (${team.id}, ${challenge.id}, ${flag}, TRUE, ${pointsAwarded})
    `;

    // Update team score
    await sql`
      UPDATE teams SET score = score + ${pointsAwarded} WHERE id = ${team.id}
    `;

    return NextResponse.json({ message, points: pointsAwarded }, { status: 200 });
  } catch (err) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
