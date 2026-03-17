'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [tab, setTab]           = useState('teams');
  const [teams, setTeams]       = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [hints, setHints]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(false);

  // -- New challenge form
  const [chName, setChName]       = useState('');
  const [chCategory, setChCategory] = useState('');
  const [chFlag, setChFlag]       = useState('');
  const [chPoints, setChPoints]   = useState('');
  const [chTier, setChTier]       = useState('0');
  const [chHoneypot, setChHoneypot] = useState(false);
  const [chDifficulty, setChDifficulty] = useState('Medium');
  const [chDescription, setChDescription] = useState('');
  const [chAttUrl, setChAttUrl] = useState('');
  const [chAttName, setChAttName] = useState('');

  // -- New hint form
  const [hintChallId, setHintChallId] = useState('');
  const [hintContent, setHintContent] = useState('');
  const [hintPenalty, setHintPenalty] = useState('25');

  // -- Tier bonus
  const [bonusTeamId, setBonusTeamId] = useState('');
  const [bonusTier, setBonusTier] = useState('0');

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  const fetchData = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const [tRes, cRes, sRes, hRes, stRes] = await Promise.all([
        fetch('/api/admin/teams',       { headers }),
        fetch('/api/admin/challenges',  { headers }),
        fetch('/api/admin/submissions', { headers }),
        fetch('/api/admin/hints',       { headers }),
        fetch('/api/admin/stats',       { headers }),
      ]);
      if (tRes.ok) setTeams(await tRes.json());
      if (cRes.ok) setChallenges(await cRes.json());
      if (sRes.ok) { const d = await sRes.json(); setSubmissions(d.submissions || []); }
      if (hRes.ok) setHints(await hRes.json());
      if (stRes.ok) setStats(await stRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [authed, adminKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleLogin(e) {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setAuthed(true);
  }

  async function deleteTeam(id) {
    if (!confirm('Delete this team and all their data?')) return;
    const res = await fetch(`/api/admin/teams?id=${id}`, { method: 'DELETE', headers });
    if (res.ok) { setStatus({ type: 'success', message: 'Team deleted.' }); fetchData(); }
    else setStatus({ type: 'error', message: 'Failed.' });
  }

  async function resetTeam(id) {
    if (!confirm('Reset this team? This zeros their score and deletes all submissions.')) return;
    const res = await fetch(`/api/admin/teams?id=${id}&action=reset`, { method: 'POST', headers });
    if (res.ok) { setStatus({ type: 'success', message: 'Team reset.' }); fetchData(); }
    else setStatus({ type: 'error', message: 'Failed.' });
  }

  async function deleteChallenge(id) {
    if (!confirm('Delete this challenge?')) return;
    const res = await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE', headers });
    if (res.ok) { setStatus({ type: 'success', message: 'Deleted.' }); fetchData(); }
    else setStatus({ type: 'error', message: 'Failed.' });
  }

  async function seedChallenges() {
    if (!confirm('Seed all T0-T4 challenges from .env?')) return;
    setLoading(true);
    const res = await fetch('/api/admin/seed', { method: 'POST', headers });
    const data = await res.json();
    if (res.ok) setStatus({ type: 'success', message: data.message });
    else setStatus({ type: 'error', message: data.error || 'Failed.' });
    setLoading(false);
    fetchData();
  }

  async function addChallenge(e) {
    e.preventDefault();
    if (!chName || !chFlag || !chPoints) { setStatus({ type: 'error', message: 'Name, flag, points required.' }); return; }
    const payload = {
      name: chName, category: chCategory || 'General', flag: chFlag, points: Number(chPoints), tier: Number(chTier), is_honeypot: chHoneypot,
      difficulty: chDifficulty.toUpperCase(), description: chDescription, attachment_url: chAttUrl, attachment_name: chAttName
    };
    const res = await fetch('/api/admin/challenges', {
      method: 'POST', headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setStatus({ type: 'success', message: 'Challenge added!' });
      setChName(''); setChCategory(''); setChFlag(''); setChPoints(''); setChTier('0'); setChHoneypot(false);
      setChDifficulty('Medium'); setChDescription(''); setChAttUrl(''); setChAttName('');
      fetchData();
    } else { const d = await res.json(); setStatus({ type: 'error', message: d.error }); }
  }

  async function addHint(e) {
    e.preventDefault();
    if (!hintChallId || !hintContent) { setStatus({ type: 'error', message: 'Challenge and content required.' }); return; }
    const res = await fetch('/api/admin/hints', {
      method: 'POST', headers,
      body: JSON.stringify({ challenge_id: Number(hintChallId), content: hintContent, penalty_pct: Number(hintPenalty) || 25 }),
    });
    if (res.ok) {
      setStatus({ type: 'success', message: 'Hint added!' });
      setHintChallId(''); setHintContent(''); setHintPenalty('25');
      fetchData();
    } else { const d = await res.json(); setStatus({ type: 'error', message: d.error }); }
  }

  async function deleteHint(id) {
    if (!confirm('Delete this hint?')) return;
    const res = await fetch(`/api/admin/hints?id=${id}`, { method: 'DELETE', headers });
    if (res.ok) { setStatus({ type: 'success', message: 'Hint deleted.' }); fetchData(); }
  }

  async function awardTierBonus(e) {
    e.preventDefault();
    if (!bonusTeamId || bonusTier === '') return;
    const res = await fetch('/api/admin/award-tier-bonus', {
      method: 'POST', headers,
      body: JSON.stringify({ team_id: Number(bonusTeamId), tier: Number(bonusTier) }),
    });
    const data = await res.json();
    if (res.ok) { setStatus({ type: 'success', message: data.message }); fetchData(); }
    else setStatus({ type: 'error', message: data.error });
  }

  // -- Not authenticated
  if (!authed) {
    return (
      <main className="page">
        <h1 className="page__title">🔐 Control Panel</h1>
        <p className="page__subtitle">// authorized access only</p>
        <div className="card" style={{ maxWidth: 400 }}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-key">Access Key</label>
              <input id="admin-key" className="form-input" type="password" placeholder="Enter key"
                value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary btn--full">Authenticate →</button>
          </form>
        </div>
      </main>
    );
  }

  const tabs = [
    { id: 'teams', label: `Teams (${teams.length})` },
    { id: 'challenges', label: `Challenges (${challenges.length})` },
    { id: 'submissions', label: `Submissions (${submissions.length})` },
    { id: 'add-challenge', label: '+ Challenge' },
    { id: 'hints', label: `Hints (${hints.length})` },
    { id: 'stats', label: 'Stats' },
    { id: 'tools', label: 'Tools' },
  ];

  return (
    <main className="page">
      <h1 className="page__title">🔐 Control Panel</h1>
      <p className="page__subtitle">// manage platform</p>

      {status && <div className={`alert alert--${status.type}`}>{status.message}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setTab(t.id)} style={{ fontSize: '.78rem', padding: '.5rem .8rem' }}>{t.label}</button>
        ))}
        <button className="btn btn--secondary" onClick={fetchData} style={{ marginLeft: 'auto', fontSize: '.75rem' }}>
          {loading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>

      {/* TEAMS */}
      {tab === 'teams' && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          {teams.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No teams.</p>
          ) : (
            <table className="scoreboard">
              <thead><tr><th>ID</th><th>Name</th><th>Score</th><th>Registered</th><th></th></tr></thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.name}</td>
                    <td className={t.score < 0 ? 'score--negative' : t.score > 0 ? 'score--positive' : 'score--zero'}>{t.score}</td>
                    <td style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleString()}</td>
                    <td style={{ display: 'flex', gap: '.3rem' }}>
                      <button className="btn btn--secondary" style={{ padding: '.3rem .6rem', fontSize: '.7rem' }} onClick={() => resetTeam(t.id)}>Reset</button>
                      <button className="btn btn--danger" style={{ padding: '.3rem .6rem', fontSize: '.7rem' }} onClick={() => deleteTeam(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CHALLENGES */}
      {tab === 'challenges' && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <div style={{ padding: '1rem', borderBottom: 'var(--border-subtle)' }}>
            <button className="btn btn--secondary" onClick={seedChallenges}
              style={{ padding: '.4rem .8rem', fontSize: '.75rem', background: 'rgba(168,85,247,.1)', borderColor: 'rgba(168,85,247,.3)', color: '#a855f7' }}>
              🌱 Seed All from .env
            </button>
          </div>
          {challenges.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No challenges.</p>
          ) : (
            <table className="scoreboard">
              <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Tier</th><th>Pts</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {challenges.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td style={{ fontSize: '.78rem' }}>{c.name}</td>
                    <td>{c.category}</td>
                    <td>T{c.tier}</td>
                    <td>{c.points}</td>
                    <td><span className={`badge ${c.is_honeypot ? 'badge--honeypot' : 'badge--normal'}`}>{c.is_honeypot ? '🍯' : '✓'}</span></td>
                    <td><button className="btn btn--danger" style={{ padding: '.3rem .6rem', fontSize: '.7rem' }} onClick={() => deleteChallenge(c.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SUBMISSIONS */}
      {tab === 'submissions' && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          {submissions.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No submissions.</p>
          ) : (
            <table className="scoreboard">
              <thead><tr><th>Time</th><th>Team</th><th>Challenge</th><th>Flag</th><th>Correct</th><th>Points</th></tr></thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{new Date(s.submitted_at).toLocaleString()}</td>
                    <td>{s.team_name}</td>
                    <td style={{ fontSize: '.78rem' }}>{s.challenge_name || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.submitted_flag}</td>
                    <td><span className={`badge ${s.is_correct ? 'badge--normal' : 'badge--honeypot'}`}>{s.is_correct ? '✓' : '✗'}</span></td>
                    <td className={s.points_awarded < 0 ? 'score--negative' : 'score--positive'}>{s.points_awarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ADD CHALLENGE */}
      {tab === 'add-challenge' && (
        <div className="card" style={{ maxWidth: 800 }}>
          <form onSubmit={addChallenge}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" type="text" value={chName} onChange={(e) => setChName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" type="text" value={chCategory} onChange={(e) => setChCategory(e.target.value)} placeholder="Web, Crypto..." />
              </div>
              <div className="form-group">
                <label className="form-label">Tier</label>
                <select className="form-input" value={chTier} onChange={(e) => setChTier(e.target.value)}>
                  <option value="0">T0</option><option value="1">T1</option><option value="2">T2</option>
                  <option value="3">T3</option><option value="4">T4</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-input" value={chDifficulty} onChange={(e) => setChDifficulty(e.target.value)}>
                  <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Description (Markdown)</label>
              <textarea className="form-input" rows="4" value={chDescription} onChange={(e) => setChDescription(e.target.value)} placeholder="Enter markdown description..."></textarea>
            </div>
            
            <div className="form-group">
              <label className="form-label">Flag</label>
              <input className="form-input" type="text" value={chFlag} onChange={(e) => setChFlag(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input className="form-input" type="number" value={chPoints} onChange={(e) => setChPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Honeypot?</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontFamily: 'var(--font-mono)', fontSize: '.82rem', color: chHoneypot ? 'var(--neon-red)' : 'var(--text-secondary)', cursor: 'pointer', paddingTop: '.4rem' }}>
                  <input type="checkbox" checked={chHoneypot} onChange={(e) => setChHoneypot(e.target.checked)} />
                  {chHoneypot ? '🍯 Yes' : 'No'}
                </label>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Attachment URL</label>
                <input className="form-input" type="text" value={chAttUrl} onChange={(e) => setChAttUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Attachment Name</label>
                <input className="form-input" type="text" value={chAttName} onChange={(e) => setChAttName(e.target.value)} placeholder="binary.elf" />
              </div>
            </div>
            
            <button type="submit" className="btn btn--primary btn--full">Add Challenge →</button>
          </form>
        </div>
      )}

      {/* HINTS */}
      {tab === 'hints' && (
        <div>
          <div className="card" style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Add Hint</h3>
            <form onSubmit={addHint}>
              <div className="form-group">
                <label className="form-label">Challenge ID</label>
                <input className="form-input" type="number" value={hintChallId} onChange={(e) => setHintChallId(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Hint Content</label>
                <input className="form-input" type="text" value={hintContent} onChange={(e) => setHintContent(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Penalty % of points</label>
                <input className="form-input" type="number" value={hintPenalty} onChange={(e) => setHintPenalty(e.target.value)} />
              </div>
              <button type="submit" className="btn btn--primary btn--full">Add Hint →</button>
            </form>
          </div>
          {hints.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="scoreboard">
                <thead><tr><th>ID</th><th>Challenge</th><th>Penalty</th><th>Content</th><th></th></tr></thead>
                <tbody>
                  {hints.map(h => (
                    <tr key={h.id}>
                      <td>{h.id}</td>
                      <td style={{ fontSize: '.78rem' }}>{h.challenge_name}</td>
                      <td>{h.penalty_pct}%</td>
                      <td style={{ fontSize: '.75rem', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.content}</td>
                      <td><button className="btn btn--danger" style={{ padding: '.3rem .6rem', fontSize: '.7rem' }} onClick={() => deleteHint(h.id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      {tab === 'stats' && stats && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-card__value">{stats.overall.total_teams}</div><div className="stat-card__label">Teams</div></div>
            <div className="stat-card"><div className="stat-card__value">{stats.overall.total_submissions}</div><div className="stat-card__label">Submissions</div></div>
            <div className="stat-card"><div className="stat-card__value" style={{ color: 'var(--neon-green)' }}>{stats.overall.correct_submissions}</div><div className="stat-card__label">Correct</div></div>
            <div className="stat-card"><div className="stat-card__value" style={{ color: 'var(--neon-purple)' }}>{stats.overall.total_tier_unlocks}</div><div className="stat-card__label">Tier Unlocks</div></div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="scoreboard">
              <thead><tr><th>Challenge</th><th>Tier</th><th>Pts</th><th>Solves</th><th>HP Hits</th><th>Type</th></tr></thead>
              <tbody>
                {stats.challenges.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontSize: '.78rem' }}>{c.name}</td>
                    <td>T{c.tier}</td>
                    <td>{c.points}</td>
                    <td className="score--positive">{Number(c.solve_count)}</td>
                    <td className="score--negative">{Number(c.honeypot_hits)}</td>
                    <td><span className={`badge ${c.is_honeypot ? 'badge--honeypot' : 'badge--normal'}`}>{c.is_honeypot ? '🍯' : '✓'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOOLS */}
      {tab === 'tools' && (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 520 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Award Tier Bonus</h3>
            <form onSubmit={awardTierBonus}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Team ID</label>
                  <input className="form-input" type="number" value={bonusTeamId} onChange={(e) => setBonusTeamId(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tier</label>
                  <select className="form-input" value={bonusTier} onChange={(e) => setBonusTier(e.target.value)}>
                    <option value="0">T0</option><option value="1">T1</option><option value="2">T2</option>
                    <option value="3">T3</option><option value="4">T4</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--full">Award +200 pts →</button>
            </form>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Seed Challenges</h3>
            <button className="btn btn--secondary btn--full" onClick={seedChallenges}
              style={{ background: 'rgba(168,85,247,.1)', borderColor: 'rgba(168,85,247,.3)', color: '#a855f7' }}>
              🌱 Seed All T0-T4 from .env
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
