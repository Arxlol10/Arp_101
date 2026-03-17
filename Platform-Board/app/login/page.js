'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !password) return;
    
    setLoading(true);
    setError('');

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
      setError(data.error || 'Authentication failed');
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="scanline"></div>
      
      <div style={{ maxWidth: 440, width: '100%', marginBottom: '4rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', color: 'var(--text-primary)', textShadow: '0 0 20px rgba(255,255,255,0.1)', letterSpacing: '4px', margin: 0 }}>ARP_101</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--neon-green)', marginTop: '.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Authorized Access Only</p>
        </div>

        <div className="terminal-card">
          {error && <div className="alert alert--error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
            
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Team Alias</label>
              </div>
              <div className="terminal-input-wrapper">
                <span className="terminal-prompt">&gt;</span>
                <input 
                  type="text" 
                  className="terminal-input"
                  placeholder="enter team alias..." 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Access Key</label>
              </div>
              <div className="terminal-input-wrapper">
                <span className="terminal-prompt">&gt;</span>
                <input 
                  type="password" 
                  className="terminal-input"
                  placeholder="••••••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn--primary btn--full" 
              disabled={loading || !name || !password}
              style={{ padding: '1rem', marginTop: '.5rem', fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
            
          </form>

        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--text-muted)' }}>
            New team in the arena? <a href="/register" style={{ color: 'var(--neon-green)', textDecoration: 'none', borderBottom: '1px dashed var(--neon-green)' }}>Register your team</a>
          </p>
        </div>

      </div>

      {/* Footer server status ticker */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '.75rem 2rem', background: '#000', borderTop: 'var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 8px var(--neon-green)' }}></span> SERVER: Online</span>
          <span>LAT: 24ms</span>
        </div>
        <div>v2.0.4-stable</div>
      </div>

    </main>
  );
}
