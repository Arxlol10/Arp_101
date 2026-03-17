'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name || !password) {
      setError('Name and Access Key are required.');
      return;
    }

    if (tab === 'create' && password !== confirmPassword) {
      setError('Access Keys do not match.');
      return;
    }

    setLoading(true);

    if (tab === 'join') {
      // "Join Team" is functionally just a login, but we present it differently
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      if (res.ok) {
        router.push('/challenges');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to join team. Check alias and access key.');
        setLoading(false);
      }
    } else {
      // Create Team
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      if (res.ok) {
        router.push('/login?registered=1');
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
        setLoading(false);
      }
    }
  }

  return (
    <main className="page" style={{ 
      minHeight: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '2rem',
      background: 'radial-gradient(circle at top, rgba(0,255,136,0.05), transparent 40%)'
    }}>
      
      <div style={{ maxWidth: 500, width: '100%', marginBottom: '2rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            color: 'var(--neon-green)',
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            🛡️
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, margin: 0 }}>Initialize Protocol</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-secondary)', marginTop: '.5rem' }}>
            Assemble your team for the upcoming operation.
          </p>
        </div>

        <div className="card" style={{ padding: '0', backdropFilter: 'blur(16px)', background: 'rgba(15, 20, 30, 0.7)' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: 'var(--border-subtle)' }}>
            <button 
              type="button"
              onClick={() => { setTab('create'); setError(''); }}
              style={{ 
                flex: 1, 
                padding: '1.25rem', 
                background: tab === 'create' ? 'rgba(0, 255, 136, 0.05)' : 'transparent',
                border: 'none',
                borderBottom: tab === 'create' ? '2px solid var(--neon-green)' : '2px solid transparent',
                color: tab === 'create' ? 'var(--neon-green)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '.9rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Create Team
            </button>
            <button 
              type="button"
              onClick={() => { setTab('join'); setError(''); }}
              style={{ 
                flex: 1, 
                padding: '1.25rem', 
                background: tab === 'join' ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
                border: 'none',
                borderBottom: tab === 'join' ? '2px solid var(--neon-blue)' : '2px solid transparent',
                color: tab === 'join' ? 'var(--neon-blue)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '.9rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Join Operation
            </button>
          </div>

          <div style={{ padding: '2rem' }}>
            {error && <div className="alert alert--error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Team Alias</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={tab === 'create' ? "Choose a unique squad name..." : "Enter existing team name..."}
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Access Key</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder={tab === 'create' ? "Generate a strong password..." : "Enter team access key..."}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  disabled={loading}
                  required
                />
              </div>

              {tab === 'create' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: 'var(--text-primary)' }}>Confirm Access Key</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Verify password..." 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    disabled={loading}
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                className={`btn btn--full ${tab === 'create' ? 'btn--primary' : ''}`}
                style={{ 
                  marginTop: '1rem', 
                  padding: '1rem',
                  fontSize: '1rem',
                  background: tab === 'join' ? 'rgba(0, 212, 255, 0.1)' : undefined,
                  color: tab === 'join' ? 'var(--neon-blue)' : undefined,
                  borderColor: tab === 'join' ? 'var(--neon-blue)' : undefined,
                  borderStyle: tab === 'join' ? 'solid' : undefined,
                  borderWidth: tab === 'join' ? '1px' : undefined,
                }}
                disabled={loading || !name || !password || (tab === 'create' && !confirmPassword)}
              >
                {loading ? 'Processing...' : (tab === 'create' ? '> REGISTER_TEAM' : '> JOIN_OPERATION')}
              </button>
              
            </form>
          </div>

        </div>

        {/* Rules of Engagement */}
        <div style={{ 
          marginTop: '2.5rem', 
          padding: '1.25rem', 
          background: 'rgba(255, 138, 0, 0.05)', 
          borderLeft: '3px solid var(--neon-orange)',
          borderRadius: '4px',
          display: 'flex',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--neon-orange)', marginBottom: '.25rem', textTransform: 'uppercase' }}>Rules of Engagement</h4>
            <ul style={{ fontSize: '.8rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '1.2rem', lineHeight: 1.5 }}>
              <li>Attacking the scoring infrastructure is strictly forbidden.</li>
              <li>Flags are formatted as <code>FLAG{"{...}"}</code> unless otherwise specified.</li>
              <li>Sharing flags with other teams will result in disqualification.</li>
            </ul>
          </div>
        </div>

      </div>

    </main>
  );
}
