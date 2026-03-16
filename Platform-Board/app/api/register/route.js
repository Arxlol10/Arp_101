import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { initializeDatabase } from '@/lib/db';

export async function POST(request) {
  try {
    await initializeDatabase();

    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Team name and password are required.' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Team name is too long (max 100 characters).' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
    }

    // Check if team already exists
    const existing = await sql`SELECT id FROM teams WHERE LOWER(name) = LOWER(${name})`;
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Team name already taken.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO teams (name, password_hash, score)
      VALUES (${name}, ${passwordHash}, 0)
    `;

    return NextResponse.json({ message: `Team "${name}" registered successfully!` }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
