'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [status, setStatus]     = useState(null); // { type, message }
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!teamName.trim() || !password) {
      setStatus({ type: 'error', message: 'All fields are required.' });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (password.length < 4) {
      setStatus({ type: 'error', message: 'Password must be at least 4 characters.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: data.message || 'Team registered!' });
        setTeamName('');
        setPassword('');
        setConfirm('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Registration failed.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1 className="page__title">🛡️ Team Registration</h1>
      <p className="page__subtitle">// register your team to compete</p>

      <div className="card" style={{ maxWidth: 480 }}>
        {status && (
          <div className={`alert alert--${status.type}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label" htmlFor="team-name">Team Name</label>
            <input
              id="team-name"
              className="form-input"
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              className="form-input"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={`btn btn--primary btn--full ${loading ? 'btn--disabled' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }}></span> Registering…</>
            ) : (
              'Register Team →'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
