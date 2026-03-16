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
    const { rows } = await sql`
      SELECT id, name, score, created_at
      FROM teams
      ORDER BY score DESC, created_at ASC
    `;
    return NextResponse.json(rows);
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
    if (!id) return NextResponse.json({ error: 'Missing team id.' }, { status: 400 });

    await sql`DELETE FROM teams WHERE id = ${id}`;
    return NextResponse.json({ message: 'Deleted.' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
