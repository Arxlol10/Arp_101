'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function getDifficultyBadge(diff) {
  const d = (diff || 'MEDIUM').toUpperCase();
  if (d === 'EASY') return <span className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.2)' }}>EASY</span>;
  if (d === 'HARD') return <span className="badge" style={{ background: 'rgba(255,59,92,0.1)', color: 'var(--neon-red)', border: '1px solid rgba(255,59,92,0.2)' }}>HARD</span>;
  return <span className="badge" style={{ background: 'rgba(255,138,0,0.1)', color: 'var(--neon-orange)', border: '1px solid rgba(255,138,0,0.2)' }}>MEDIUM</span>;
}

export default function ChallengeDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // { type: 'success'|'error', msg: '' }

  useEffect(() => {
    async function fetchChallenge() {
      const res = await fetch(`/api/challenges/${id}`);
      if (res.status === 401) { router.push('/login'); return; }
      if (res.status === 404) { router.push('/challenges'); return; }
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    fetchChallenge();
  }, [id, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!flag.trim() || submitting || data?.solved) return;
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag }),
      });
      const d = await res.json();
      if (res.ok) {
        setSubmitStatus({ 
          type: 'success', 
          msg: `FLAG ACCEPTED. ACCESS GRANTED. (+${d.pointsAwarded} pts)` 
        });
        setData(prev => ({ ...prev, solved: true }));
        setFlag('');
      } else {
        setSubmitStatus({ 
          type: 'error', 
          msg: d.error || 'INVALID FLAG. TRY AGAIN.' 
        });
      }
    } catch {
      setSubmitStatus({ type: 'error', msg: 'CONNECTION INTERRUPTED.' });
    }
    setSubmitting(false);
  }

  async function handleUnlockHint(hintId, penalty) {
    if (!confirm(`Unlock this hint? It will reduce your award by ${penalty}% if you solve this challenge.`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hints/${hintId}/unlock`, { method: 'POST' });
      if (res.ok) {
        const refreshRes = await fetch(`/api/challenges/${id}`);
        if (refreshRes.ok) setData(await refreshRes.json());
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to unlock hint.');
      }
    } catch {
      alert('Network error.');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </main>
    );
  }

  if (!data) return null;

  const { challenge: c, stats, solved } = data;

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: 1200, margin: '0 auto' }}>
      
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '.75rem', fontFamily: 'var(--font-mono)', fontSize: '.85rem' }}>
        <Link href="/challenges" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>challenges</Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{c.category.toLowerCase()}</span>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--neon-green)' }}>{c.id}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem', alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: Description & Attachments ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              {getDifficultyBadge(c.difficulty)}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-green)', fontWeight: 700, fontSize: '1.2rem' }}>{c.points} PTS</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-primary)', marginBottom: '1.5rem', textShadow: '0 0 15px rgba(255,255,255,0.1)' }}>
              {c.name}
            </h1>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>&gt; DESCRIPTION</h3>
            <div style={{ lineHeight: 1.7, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {c.description || 'No description provided.'}
            </div>
          </div>

          {c.attachment && (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>&gt; ATTACHMENTS</h3>
              
              <a href={c.attachment.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', background: 'rgba(0,212,255,0.05)', transition: 'all 0.2s', cursor: 'pointer' }}
                     onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.borderColor = 'var(--neon-blue)'; }}
                     onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'; }}>
                  <div style={{ fontSize: '2rem' }}>📦</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--neon-blue)', marginBottom: '.25rem' }}>{c.attachment.name}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                      {c.attachment.size && <span>Size: {c.attachment.size}</span>}
                      {c.attachment.hash && <span>SHA256: {c.attachment.hash.slice(0, 16)}...</span>}
                    </div>
                  </div>
                  <div style={{ color: 'var(--neon-blue)', fontSize: '1.5rem' }}>↓</div>
                </div>
              </a>
            </div>
          )}

          {/* Hints Section */}
          {c.hints && c.hints.length > 0 && (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
                &gt; INTELLIGENCE_HINTS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {c.hints.map((hint, i) => (
                  <div key={hint.id} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1.25rem', background: 'var(--bg-base)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hint.unlocked ? '.75rem' : 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--neon-orange)', fontWeight: 700 }}>HINT 0{i+1}</span>
                      {!hint.unlocked && (
                        <button 
                          onClick={() => handleUnlockHint(hint.id, hint.penaltyPct)}
                          className="btn" 
                          style={{ padding: '.4rem .8rem', fontSize: '.75rem', background: 'rgba(255,138,0,0.1)', color: 'var(--neon-orange)', border: '1px solid rgba(255,138,0,0.3)', letterSpacing: '1px' }}
                          disabled={submitting}
                        >
                          UNLOCK (-{hint.penaltyPct}%)
                        </button>
                      )}
                    </div>
                    {hint.unlocked && (
                      <div style={{ fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {hint.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>

        {/* ── RIGHT COLUMN: Submit & Stats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'sticky', top: '100px' }}>
          
          {/* Submit Panel */}
          <div className="card" style={{ padding: '1.5rem', borderColor: solved ? 'var(--neon-green)' : undefined, boxShadow: solved ? '0 0 20px rgba(0,255,136,0.15)' : undefined }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
              &gt; SUBMIT PAYLOAD
            </h3>
            
            {solved ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--neon-green)', textShadow: 'var(--glow-green)' }}>✓</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '1px' }}>CHALLENGE COMPLETED</div>
                <p style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}>You have successfully captured the flag.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="terminal-input-wrapper">
                  <span className="terminal-prompt">&gt;</span>
                  <input 
                    type="text" 
                    className="terminal-input"
                    placeholder="FLAG{...}" 
                    value={flag} 
                    onChange={(e) => setFlag(e.target.value)} 
                    disabled={submitting}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn--primary btn--full" 
                  disabled={submitting || !flag}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
                >
                  {submitting ? 'Authenticating...' : 'Submit_Payload'}
                </button>
              </form>
            )}

            {submitStatus && (
              <div className={`alert alert--${submitStatus.type}`} style={{ marginTop: '1.5rem', marginBottom: 0, fontSize: '.75rem', padding: '.75rem 1rem' }}>
                {submitStatus.msg}
              </div>
            )}
          </div>

          {/* Global Statistics */}
          <div className="card" style={{ padding: '1.5rem' }}>
             <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
              &gt; GLOBAL_STATISTICS
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '.25rem' }}>{stats.solves}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Solves</div>
              </div>
              <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: stats.successRate > 50 ? 'var(--neon-green)' : (stats.successRate > 20 ? 'var(--neon-orange)' : 'var(--neon-red)'), fontWeight: 700, marginBottom: '.25rem' }}>{stats.successRate}%</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Success Rate</div>
              </div>
            </div>

            <div style={{ fontSize: '.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              Total Attempts: <span style={{ color: 'var(--text-primary)' }}>{stats.attempts}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
