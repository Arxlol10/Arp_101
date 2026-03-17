import { sql, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return key && key === process.env.ADMIN_KEY;
}

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await initializeDatabase();
    const { team_id, tier } = await request.json();

    if (!team_id || tier === undefined) {
      return NextResponse.json({ error: 'team_id and tier are required.' }, { status: 400 });
    }

    const bonusAwarded = 200;

    // Check if already awarded
    const { rows: existing } = await sql`
      SELECT id FROM tier_unlocks WHERE team_id = ${team_id} AND tier = ${tier}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Tier bonus already awarded for this team.' }, { status: 409 });
    }

    await sql`
      INSERT INTO tier_unlocks (team_id, tier, bonus_awarded)
      VALUES (${team_id}, ${tier}, ${bonusAwarded})
    `;
    await sql`UPDATE teams SET score = score + ${bonusAwarded} WHERE id = ${team_id}`;

    return NextResponse.json({ message: `+${bonusAwarded} tier bonus awarded.` });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
