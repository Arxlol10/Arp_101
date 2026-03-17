import { NextResponse } from 'next/server';
import { deleteSession, clearSessionCookie } from '@/lib/session';

export async function POST(request) {
  try {
    await deleteSession(request);

    const res = NextResponse.json({ message: 'Logged out.' }, { status: 200 });
    res.headers.set('Set-Cookie', clearSessionCookie());
    return res;
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
