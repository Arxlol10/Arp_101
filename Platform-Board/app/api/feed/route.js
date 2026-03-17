import { NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/db';

export const revalidate = 10; // Cache for 10 seconds

export async function GET() {
  try {
    await initializeDatabase();
    
    // Fetch last 20 submissions for the feed
    // Note: We join with teams and challenges to get names
    const { rows: events } = await sql`
      SELECT 
        s.id, 
        s.is_correct, 
        s.submitted_at, 
        t.name as team_name,
        c.name as challenge_name,
        c.is_honeypot
      FROM submissions s
      JOIN teams t ON s.team_id = t.id
      JOIN challenges c ON s.challenge_id = c.id
      ORDER BY s.submitted_at DESC
      LIMIT 20
    `;

    // Map rows directly to a clean array
    const feed = events.map(e => ({
      id: e.id,
      team: e.team_name,
      challenge: e.challenge_name,
      timestamp: e.submitted_at,
      isCorrect: e.is_correct,
      isHoneypot: e.is_honeypot
    }));

    return NextResponse.json({ feed });
  } catch (err) {
    console.error('Feed API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
