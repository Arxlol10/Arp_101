import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, initializeDatabase } from '@/lib/db';
import { createSession, sessionCookie } from '@/lib/session';

export async function POST(request) {
  try {
    await initializeDatabase();

    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Team name and password are required.' }, { status: 400 });
    }

    // Find team
    const { rows } = await sql`
      SELECT id, name, password_hash FROM teams
      WHERE LOWER(name) = LOWER(${name})
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    const team = rows[0];
    const valid = await bcrypt.compare(password, team.password_hash);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    // Create session
    const token = await createSession(team.id);

    const res = NextResponse.json(
      { message: `Welcome back, ${team.name}!`, teamId: team.id, teamName: team.name },
      { status: 200 }
    );
    res.headers.set('Set-Cookie', sessionCookie(token));
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
