import { sql } from '@vercel/postgres';
import { initializeDatabase } from '@/lib/db';

export const revalidate = 10; // ISR – refresh every 10s

async function getTeams() {
  try {
    await initializeDatabase();
    const { rows } = await sql`
      SELECT id, name, score, created_at
      FROM teams
      ORDER BY score DESC, created_at ASC
    `;
    return rows;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const teamsRes   = await sql`SELECT COUNT(*) as count FROM teams`;
    const subsRes    = await sql`SELECT COUNT(*) as count FROM submissions`;
    const challRes   = await sql`SELECT COUNT(*) as count FROM challenges`;
    return {
      teams:       Number(teamsRes.rows[0].count),
      submissions: Number(subsRes.rows[0].count),
      challenges:  Number(challRes.rows[0].count),
    };
  } catch {
    return { teams: 0, submissions: 0, challenges: 0 };
  }
}

function getRankClass(i) {
  if (i === 0) return 'rank rank--1';
  if (i === 1) return 'rank rank--2';
  if (i === 2) return 'rank rank--3';
  return 'rank rank--default';
}

function getScoreClass(score) {
  if (score > 0) return 'score--positive';
  if (score < 0) return 'score--negative';
  return 'score--zero';
}

export default async function ScoreboardPage() {
  const [teams, stats] = await Promise.all([getTeams(), getStats()]);

  return (
    <main className="page">
      <h1 className="page__title">⚡ Live Scoreboard</h1>
      <p className="page__subtitle">// real-time rankings — updates every 10 seconds</p>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__value">{stats.teams}</div>
          <div className="stat-card__label">Teams Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.challenges}</div>
          <div className="stat-card__label">Challenges</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.submissions}</div>
          <div className="stat-card__label">Total Submissions</div>
        </div>
      </div>

      {/* Table */}
      {teams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            No teams registered yet. Be the first to join!
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table className="scoreboard" id="scoreboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, i) => (
                <tr key={team.id}>
                  <td>
                    <span className={getRankClass(i)}>{i + 1}</span>
                  </td>
                  <td>{team.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={getScoreClass(team.score)}>
                      {team.score > 0 ? `+${team.score}` : team.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
