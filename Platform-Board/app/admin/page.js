'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [tab, setTab]           = useState('teams');     // teams | challenges | add-challenge
  const [teams, setTeams]       = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(false);

  // — new challenge form
  const [chName, setChName]       = useState('');
  const [chCategory, setChCategory] = useState('');
  const [chFlag, setChFlag]       = useState('');
  const [chPoints, setChPoints]   = useState('');
  const [chHoneypot, setChHoneypot] = useState(false);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  const fetchData = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/admin/teams',      { headers }),
        fetch('/api/admin/challenges', { headers }),
      ]);
      if (tRes.ok) setTeams(await tRes.json());
      if (cRes.ok) setChallenges(await cRes.json());
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
    if (!confirm('Delete this team?')) return;
    const res = await fetch(`/api/admin/teams?id=${id}`, { method: 'DELETE', headers });
    if (res.ok) {
      setStatus({ type: 'success', message: 'Team deleted.' });
      fetchData();
    } else {
      setStatus({ type: 'error', message: 'Failed to delete team.' });
    }
  }

  async function deleteChallenge(id) {
    if (!confirm('Delete this challenge?')) return;
    const res = await fetch(`/api/admin/challenges?id=${id}`, { method: 'DELETE', headers });
    if (res.ok) {
      setStatus({ type: 'success', message: 'Challenge deleted.' });
      fetchData();
    } else {
      setStatus({ type: 'error', message: 'Failed to delete challenge.' });
    }
  }

  async function seedChallenges() {
    if (!confirm('Seed all challenges from .env? This will add all T0-T4 challenges.')) return;
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST', headers });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
        fetchData();
      } else {
        setStatus({ type: 'error', message: data.error || 'Seed failed.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error.' });
    }
    setLoading(false);
  }

  async function addChallenge(e) {
    e.preventDefault();
    setStatus(null);
    if (!chName || !chFlag || !chPoints) {
      setStatus({ type: 'error', message: 'Name, flag, and points are required.' });
      return;
    }
    const res = await fetch('/api/admin/challenges', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: chName,
        category: chCategory || 'General',
        flag: chFlag,
        points: Number(chPoints),
        is_honeypot: chHoneypot,
      }),
    });
    if (res.ok) {
      setStatus({ type: 'success', message: 'Challenge added!' });
      setChName(''); setChCategory(''); setChFlag(''); setChPoints(''); setChHoneypot(false);
      fetchData();
    } else {
      const data = await res.json();
      setStatus({ type: 'error', message: data.error || 'Failed.' });
    }
  }

  // — Not authenticated
  if (!authed) {
    return (
      <main className="page">
        <h1 className="page__title">🔐 Admin Panel</h1>
        <p className="page__subtitle">// enter admin key to continue</p>
        <div className="card" style={{ maxWidth: 400 }}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-key">Admin Key</label>
              <input
                id="admin-key"
                className="form-input"
                type="password"
                placeholder="Enter ADMIN_KEY"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--primary btn--full">Authenticate →</button>
          </form>
        </div>
      </main>
    );
  }

  // — Authenticated
  return (
    <main className="page">
      <h1 className="page__title">🔐 Admin Panel</h1>
      <p className="page__subtitle">// manage teams &amp; challenges</p>

      {status && <div className={`alert alert--${status.type}`}>{status.message}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
        <button className={`btn ${tab === 'teams' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setTab('teams')}>Teams ({teams.length})</button>
        <button className={`btn ${tab === 'challenges' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setTab('challenges')}>Challenges ({challenges.length})</button>
        <button className={`btn ${tab === 'add-challenge' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setTab('add-challenge')}>+ Add Challenge</button>
        <button className="btn btn--secondary" onClick={seedChallenges}
          style={{ background: 'rgba(168,85,247,.1)', borderColor: 'rgba(168,85,247,.3)', color: '#a855f7' }}>
          🌱 Seed All
        </button>
        <button className="btn btn--secondary" onClick={fetchData}
          style={{ marginLeft: 'auto' }}>
          {loading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>

      {/* Teams tab */}
      {tab === 'teams' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {teams.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              No teams found.
            </p>
          ) : (
            <table className="scoreboard">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Team Name</th>
                  <th>Score</th>
                  <th>Registered</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.name}</td>
                    <td className={t.score < 0 ? 'score--negative' : t.score > 0 ? 'score--positive' : 'score--zero'}>
                      {t.score}
                    </td>
                    <td style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td>
                      <button className="btn btn--danger" style={{ padding: '.4rem .8rem', fontSize: '.75rem' }}
                        onClick={() => deleteTeam(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Challenges tab */}
      {tab === 'challenges' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {challenges.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              No challenges found.
            </p>
          ) : (
            <table className="scoreboard">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Points</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.category}</td>
                    <td>{c.points}</td>
                    <td>
                      <span className={`badge ${c.is_honeypot ? 'badge--honeypot' : 'badge--normal'}`}>
                        {c.is_honeypot ? '🍯 Honeypot' : '✓ Normal'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn--danger" style={{ padding: '.4rem .8rem', fontSize: '.75rem' }}
                        onClick={() => deleteChallenge(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Challenge tab */}
      {tab === 'add-challenge' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <form onSubmit={addChallenge} id="add-challenge-form">
            <div className="form-group">
              <label className="form-label">Challenge Name</label>
              <input className="form-input" type="text" value={chName}
                onChange={(e) => setChName(e.target.value)} placeholder="e.g. SQL Injection 101" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-input" type="text" value={chCategory}
                onChange={(e) => setChCategory(e.target.value)} placeholder="e.g. Web, Crypto, Forensics" />
            </div>
            <div className="form-group">
              <label className="form-label">Flag</label>
              <input className="form-input" type="text" value={chFlag}
                onChange={(e) => setChFlag(e.target.value)} placeholder="ARP{secret_flag_here}" 
                style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input className="form-input" type="number" value={chPoints}
                  onChange={(e) => setChPoints(e.target.value)} placeholder="100" />
              </div>
              <div className="form-group">
                <label className="form-label">Honeypot?</label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '.65rem',
                  fontFamily: 'var(--font-mono)', fontSize: '.85rem',
                  color: chHoneypot ? 'var(--neon-red)' : 'var(--text-secondary)',
                  cursor: 'pointer', paddingTop: '.4rem',
                }}>
                  <input type="checkbox" checked={chHoneypot}
                    onChange={(e) => setChHoneypot(e.target.checked)} />
                  {chHoneypot ? '🍯 Yes — deducts points' : 'No'}
                </label>
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--full">Add Challenge →</button>
          </form>
        </div>
      )}
    </main>
  );
}
