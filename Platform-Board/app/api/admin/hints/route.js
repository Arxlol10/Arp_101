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
      SELECT h.id, h.challenge_id, h.content, h.penalty_pct, c.name as challenge_name
      FROM hints h
      JOIN challenges c ON c.id = h.challenge_id
      ORDER BY c.name ASC, h.id ASC
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
    const { challenge_id, content, penalty_pct } = await request.json();

    if (!challenge_id || !content) {
      return NextResponse.json({ error: 'challenge_id and content are required.' }, { status: 400 });
    }

    await sql`
      INSERT INTO hints (challenge_id, content, penalty_pct)
      VALUES (${Number(challenge_id)}, ${content}, ${Number(penalty_pct) || 25})
    `;

    return NextResponse.json({ message: 'Hint created.' }, { status: 201 });
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
    if (!id) return NextResponse.json({ error: 'Missing hint id.' }, { status: 400 });

    await sql`DELETE FROM hints WHERE id = ${id}`;
    return NextResponse.json({ message: 'Deleted.' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
