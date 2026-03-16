import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

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
    const { rows } = await sql`
      SELECT id, name, category, points, is_honeypot, created_at
      FROM challenges
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await initializeDatabase();
    const { name, category, flag, points, is_honeypot } = await request.json();

    if (!name || !flag || points === undefined) {
      return NextResponse.json({ error: 'Name, flag, and points are required.' }, { status: 400 });
    }

    await sql`
      INSERT INTO challenges (name, category, flag, points, is_honeypot)
      VALUES (${name}, ${category || 'General'}, ${flag}, ${Number(points)}, ${!!is_honeypot})
    `;

    return NextResponse.json({ message: 'Challenge created.' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing challenge id.' }, { status: 400 });

    await sql`DELETE FROM challenges WHERE id = ${id}`;
    return NextResponse.json({ message: 'Deleted.' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
