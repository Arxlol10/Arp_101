import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request) {
  try {
    const team = await getSession(request);
    if (!team) {
      return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
    }

    return NextResponse.json({
      id: team.id,
      name: team.name,
      score: team.score,
    });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
