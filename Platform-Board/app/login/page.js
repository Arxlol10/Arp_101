'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!teamName.trim() || !password) {
      setStatus({ type: 'error', message: 'All fields are required.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/challenges');
      } else {
        setStatus({ type: 'error', message: data.error || 'Login failed.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1 className="page__title">🔑 Team Login</h1>
      <p className="page__subtitle">// sign in to submit flags and view challenges</p>

      <div className="card" style={{ maxWidth: 440 }}>
        {status && (
          <div className={`alert alert--${status.type}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-team">Team Name</label>
            <input
              id="login-team"
              className="form-input"
              type="text"
              placeholder="Enter your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="Your team password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={`btn btn--primary btn--full ${loading ? 'btn--disabled' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }}></span> Signing in…</>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '.8rem',
          color: 'var(--text-muted)', textAlign: 'center', marginTop: '1.5rem'
        }}>
          Don&apos;t have a team? <a href="/register" style={{ color: 'var(--neon-green)' }}>Register here</a>
        </p>
      </div>
    </main>
  );
}
