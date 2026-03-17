import { sql, initializeDatabase } from '@/lib/db';
import ScoreGraph from '../components/ScoreGraph';

export const revalidate = 10;

async function getTeams() {
  try {
    await initializeDatabase();
    const { rows } = await sql`
      SELECT t.id, t.name, t.score, t.created_at,
             (SELECT COUNT(*) FROM submissions s WHERE s.team_id = t.id AND s.is_correct = TRUE) as solve_count
      FROM teams t
      ORDER BY t.score DESC, t.created_at ASC
    `;
    return rows;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const { rows: teamsRes }   = await sql`SELECT COUNT(*) as count FROM teams`;
    const { rows: subsRes }    = await sql`SELECT COUNT(*) as count FROM submissions`;
    const { rows: challRes }   = await sql`SELECT COUNT(*) as count FROM challenges`;
    const { rows: hpRes }      = await sql`SELECT COUNT(*) as count FROM challenges WHERE is_honeypot = true`;
    return {
      teams:       Number(teamsRes[0].count),
      submissions: Number(subsRes[0].count),
      challenges:  Number(challRes[0].count),
      honeypots:   Number(hpRes[0].count),
    };
  } catch {
    return { teams: 0, submissions: 0, challenges: 0, honeypots: 0 };
  }
}

async function getTierProgress(teams) {
  try {
    const { rows } = await sql`
      SELECT team_id, tier FROM tier_unlocks ORDER BY tier ASC
    `;
    const map = {};
    for (const r of rows) {
      if (!map[r.team_id]) map[r.team_id] = [];
      map[r.team_id].push(r.tier);
    }
    return map;
  } catch {
    return {};
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
  const tierProgress = await getTierProgress(teams);

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
          <div className="stat-card__value" style={{ color: 'var(--neon-red)' }}>{stats.honeypots}</div>
          <div className="stat-card__label">🍯 Honeypots</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ color: 'var(--neon-blue)' }}>{stats.submissions}</div>
          <div className="stat-card__label">Total Submissions</div>
        </div>
      </div>

      {/* Score Graph */}
      {teams.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <ScoreGraph teams={teams} />
        </div>
      )}

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
                <th>Solves</th>
                <th>Tier Progress</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, i) => {
                const tiers = tierProgress[team.id] || [];
                return (
                  <tr key={team.id}>
                    <td>
                      <span className={getRankClass(i)}>{i + 1}</span>
                    </td>
                    <td style={{ fontWeight: i < 3 ? 600 : 400 }}>{team.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '.82rem', color: 'var(--neon-blue)' }}>
                      {Number(team.solve_count)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '.68rem' }}>
                        {[0,1,2,3,4].map(t => (
                          <span key={t} style={{
                            padding: '2px 6px', borderRadius: '4px',
                            background: tiers.includes(t) ? 'rgba(0,255,136,.15)' : 'var(--bg-surface)',
                            color: tiers.includes(t) ? 'var(--neon-green)' : 'var(--text-muted)',
                            border: tiers.includes(t) ? '1px solid rgba(0,255,136,.3)' : 'var(--border-subtle)',
                            fontWeight: tiers.includes(t) ? 600 : 400,
                          }}>
                            T{t}{tiers.includes(t) ? ' ✓' : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={getScoreClass(team.score)}
                        style={{ fontSize: i < 3 ? '1.05rem' : '.88rem', fontWeight: i < 3 ? 700 : 400 }}>
                        {team.score > 0 ? `+${team.score}` : team.score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
