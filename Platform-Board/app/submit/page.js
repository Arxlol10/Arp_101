'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitFlagPage() {
  const [team, setTeam]     = useState(null);
  const [flag, setFlag]     = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setTeam(data);
        else router.push('/login');
      })
      .catch(() => router.push('/login'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!flag.trim()) {
      setStatus({ type: 'error', message: 'Flag is required.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flag.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: data.honeypot ? 'error' : 'success', message: data.message });
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

  if (!team) {
    return (
      <main className="page">
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="page__title">🚩 Submit Flag</h1>
      <p className="page__subtitle">// submitting as <span style={{ color: 'var(--neon-green)' }}>{team.name}</span></p>

      <div className="card" style={{ maxWidth: 520 }}>
        {status && (
          <div className={`alert alert--${status.type}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} id="submit-flag-form">
          <div className="form-group">
            <label className="form-label" htmlFor="submit-flag">Flag</label>
            <input
              id="submit-flag"
              className="form-input"
              type="text"
              placeholder="FLAG{...}"
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

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '.78rem',
          color: 'var(--text-muted)', textAlign: 'center', marginTop: '1.25rem'
        }}>
          Tip: You can also submit flags directly from the{' '}
          <a href="/challenges" style={{ color: 'var(--neon-green)' }}>Challenges</a> page.
        </p>
      </div>
    </main>
  );
}
