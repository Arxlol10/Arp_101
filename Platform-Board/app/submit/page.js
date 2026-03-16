'use client';

import { useState } from 'react';

export default function SubmitFlagPage() {
  const [teamName, setTeamName]   = useState('');
  const [password, setPassword]   = useState('');
  const [flag, setFlag]           = useState('');
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!teamName.trim() || !password || !flag.trim()) {
      setStatus({ type: 'error', message: 'All fields are required.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName.trim(),
          password,
          flag: flag.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
        setFlag('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Submission failed.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1 className="page__title">🚩 Submit Flag</h1>
      <p className="page__subtitle">// submit your captured flag for points</p>

      <div className="card" style={{ maxWidth: 520 }}>
        {status && (
          <div className={`alert alert--${status.type}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} id="submit-flag-form">
          <div className="form-group">
            <label className="form-label" htmlFor="submit-team">Team Name</label>
            <input
              id="submit-team"
              className="form-input"
              type="text"
              placeholder="Your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="submit-password">Team Password</label>
            <input
              id="submit-password"
              className="form-input"
              type="password"
              placeholder="Your team password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="submit-flag">Flag</label>
            <input
              id="submit-flag"
              className="form-input"
              type="text"
              placeholder="ARP{...}"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}
            />
          </div>

          <button
            type="submit"
            className={`btn btn--primary btn--full ${loading ? 'btn--disabled' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }}></span> Submitting…</>
            ) : (
              'Submit Flag →'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
