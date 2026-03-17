'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChallengesPage() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [expandedTiers, setExpanded] = useState({});
  const [flagInputs, setFlagInputs] = useState({});
  const [submitStatus, setSubmitStatus] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [celebration, setCelebration] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchChallenges();
  }, []);

  async function fetchChallenges() {
    try {
      const res = await fetch('/api/challenges');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      setData(json);
      // Expand all tiers by default
      const expanded = {};
      for (const t of json.tiers) expanded[t.tier] = true;
      setExpanded(expanded);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function toggleTier(tier) {
    setExpanded(prev => ({ ...prev, [tier]: !prev[tier] }));
  }

  async function submitFlag(challengeId) {
    const flag = flagInputs[challengeId];
    if (!flag?.trim()) return;

    setSubmitting(prev => ({ ...prev, [challengeId]: true }));
    setSubmitStatus(prev => ({ ...prev, [challengeId]: null }));

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: flag.trim() }),
      });
      const result = await res.json();

      if (res.ok) {
        setSubmitStatus(prev => ({
          ...prev,
          [challengeId]: { type: result.honeypot ? 'error' : 'success', message: result.message },
        }));
        setFlagInputs(prev => ({ ...prev, [challengeId]: '' }));

        // Tier unlock celebration
        if (result.tierUnlocked !== null && result.tierUnlocked !== undefined) {
          setCelebration({ tier: result.tierUnlocked, bonus: result.bonusAwarded });
          setTimeout(() => setCelebration(null), 5000);
        }

        // Refresh challenges
        fetchChallenges();
      } else {
        setSubmitStatus(prev => ({
          ...prev,
          [challengeId]: { type: 'error', message: result.error },
        }));
      }
    } catch {
      setSubmitStatus(prev => ({
        ...prev,
        [challengeId]: { type: 'error', message: 'Network error.' },
      }));
    } finally {
      setSubmitting(prev => ({ ...prev, [challengeId]: false }));
    }
  }

  async function unlockHint(hintId, challengeId) {
    if (!confirm('Unlock this hint? This will deduct points from your score.')) return;

    try {
      const res = await fetch(`/api/hints/${hintId}/unlock`, { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        if (result.pointsLost > 0) {
          alert(`Hint unlocked! -${result.pointsLost} pts\n\n${result.content}`);
        } else {
          alert(`${result.content}`);
        }
        fetchChallenges();
      }
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <main className="page">
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading challenges...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page">
        <h1 className="page__title">⚠️ Error</h1>
        <p>Could not load challenges. <a href="/login" style={{ color: 'var(--neon-green)' }}>Login again</a></p>
      </main>
    );
  }

  const tierNames = { 0: 'Reconnaissance', 1: 'Intermediate', 2: 'Advanced', 3: 'Expert', 4: 'Root' };

  return (
    <main className="page">
      <h1 className="page__title">🧩 Challenges</h1>
      <p className="page__subtitle">// logged in as <span style={{ color: 'var(--neon-green)' }}>{data.teamName}</span></p>

      {/* Tier unlock celebration */}
      {celebration && (
        <div className="alert alert--success" style={{
          textAlign: 'center', fontSize: '1.1rem', fontWeight: 700,
          background: 'rgba(0,255,136,.12)', borderColor: 'var(--neon-green)',
          animation: 'slideIn .4s var(--ease-out-expo)',
        }}>
          🎉 TIER {celebration.tier} COMPLETED! +{celebration.bonus} bonus points!
        </div>
      )}

      {data.tiers.map(tierGroup => (
        <div key={tierGroup.tier} style={{ marginBottom: '1.5rem' }}>
          {/* Tier Header */}
          <button
            onClick={() => toggleTier(tierGroup.tier)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: tierGroup.tierUnlocked ? 'rgba(0,255,136,.08)' : 'var(--bg-card)',
              border: tierGroup.tierUnlocked ? '1px solid rgba(0,255,136,.25)' : 'var(--border-subtle)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
              transition: 'all .25s var(--ease-out-expo)',
            }}
          >
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>
              {tierGroup.tierUnlocked ? '✅' : '🔓'} T{tierGroup.tier} — {tierNames[tierGroup.tier] || `Tier ${tierGroup.tier}`}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                fontSize: '.82rem',
                color: tierGroup.solvedCount === tierGroup.totalChallenges ? 'var(--neon-green)' : 'var(--text-secondary)',
              }}>
                {tierGroup.solvedCount} / {tierGroup.totalChallenges} solved
              </span>
              {tierGroup.tierUnlocked && (
                <span className="badge badge--normal" style={{ fontWeight: 600 }}>+{tierGroup.tierBonus} pts</span>
              )}
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                {expandedTiers[tierGroup.tier] ? '▾' : '▸'}
              </span>
            </span>
          </button>

          {/* Challenge Cards */}
          {expandedTiers[tierGroup.tier] && (
            <div style={{ display: 'grid', gap: '.75rem', marginTop: '.75rem' }}>
              {tierGroup.challenges.map(ch => (
                <div key={ch.id} className="card" style={{
                  padding: '1.25rem',
                  borderColor: ch.solved ? 'rgba(0,255,136,.2)' : undefined,
                  background: ch.solved ? 'rgba(0,255,136,.03)' : undefined,
                }}>
                  {/* Challenge header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '.9rem' }}>
                        {ch.solved ? '✅' : '⬜'} {ch.name}
                      </span>
                      <span className="badge badge--normal" style={{ fontSize: '.6rem' }}>{ch.category}</span>
                      {ch.firstBlood && (
                        <span style={{ fontSize: '.7rem', color: 'var(--neon-red)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          🩸 First Blood!
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                        {ch.solveCount} solve{ch.solveCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: 'var(--neon-green)', fontSize: '.9rem',
                      }}>
                        {ch.points} pts
                      </span>
                    </div>
                  </div>

                  {/* Hints */}
                  {ch.hints.length > 0 && (
                    <div style={{ marginBottom: '.75rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {ch.hints.map(hint => (
                        <button
                          key={hint.id}
                          onClick={() => unlockHint(hint.id, ch.id)}
                          className="btn btn--secondary"
                          style={{ padding: '.3rem .7rem', fontSize: '.72rem' }}
                        >
                          {hint.unlocked ? '💡 View Hint' : `🔒 Hint (-${hint.penaltyPct}%)`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Submit status */}
                  {submitStatus[ch.id] && (
                    <div className={`alert alert--${submitStatus[ch.id].type}`} style={{ marginBottom: '.75rem', fontSize: '.82rem' }}>
                      {submitStatus[ch.id].message}
                    </div>
                  )}

                  {/* Inline flag submission */}
                  {!ch.solved && (
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="FLAG{...}"
                        value={flagInputs[ch.id] || ''}
                        onChange={(e) => setFlagInputs(prev => ({ ...prev, [ch.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitFlag(ch.id); }}
                        style={{ flex: 1, padding: '.5rem .75rem', fontSize: '.82rem', fontFamily: 'var(--font-mono)' }}
                      />
                      <button
                        onClick={() => submitFlag(ch.id)}
                        className={`btn btn--primary ${submitting[ch.id] ? 'btn--disabled' : ''}`}
                        disabled={submitting[ch.id]}
                        style={{ padding: '.5rem 1rem', fontSize: '.82rem' }}
                      >
                        {submitting[ch.id] ? '⟳' : 'Submit'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
