import { sql } from './db';
import crypto from 'crypto';

const SESSION_EXPIRY_HOURS = 24;

/**
 * Create a new session for a team. Returns the token string.
 */
export async function createSession(teamId) {
  // Clean up any expired sessions for this team
  await sql`DELETE FROM sessions WHERE team_id = ${teamId} AND expires_at < NOW()`;

  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  await sql`
    INSERT INTO sessions (team_id, token, expires_at)
    VALUES (${teamId}, ${token}, ${expiresAt.toISOString()})
  `;

  return token;
}

/**
 * Get team from session cookie. Returns team row or null.
 */
export async function getSession(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/arp_session=([^;]+)/);
  if (!match) return null;

  const token = match[1];

  const { rows } = await sql`
    SELECT t.id, t.name, t.score, s.expires_at
    FROM sessions s
    JOIN teams t ON t.id = s.team_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `;

  if (rows.length === 0) return null;
  return rows[0];
}

/**
 * Delete session (logout). Reads token from cookie.
 */
export async function deleteSession(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/arp_session=([^;]+)/);
  if (!match) return;

  const token = match[1];
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

/**
 * Build Set-Cookie header for session token.
 */
export function sessionCookie(token, maxAge = SESSION_EXPIRY_HOURS * 3600) {
  return `arp_session=${token}; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=${maxAge}`;
}

/**
 * Build Set-Cookie header to clear session.
 */
export function clearSessionCookie() {
  return 'arp_session=; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=0';
}
