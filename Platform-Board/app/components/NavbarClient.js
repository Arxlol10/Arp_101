'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import '../globals.css';

export default function NavbarClient({ children }) {
  const [team, setTeam] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setTeam(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    setTeam(null);
    router.push('/');
  }

  return (
    <>
      <nav className="navbar">
        <a href="/" className="navbar__brand">
          <span className="navbar__logo">ARP_101</span>
          <span className="navbar__tag">CTF</span>
        </a>
        <ul className="navbar__links">
          <li><a href="/scoreboard" className={`navbar__link ${pathname === '/scoreboard' ? 'navbar__link--active' : ''}`}>Scoreboard</a></li>
          {team ? (
            <>
              <li><a href="/challenges" className={`navbar__link ${pathname === '/challenges' ? 'navbar__link--active' : ''}`}>Challenges</a></li>
              <li>
                <button onClick={handleLogout} className="navbar__link" style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 'inherit',
                }}>
                  Logout
                </button>
              </li>
              <li>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '.75rem',
                  color: 'var(--neon-green)', padding: '.5rem .75rem',
                  opacity: loaded ? 1 : 0, transition: 'opacity .3s',
                }}>
                  {team.name}
                </span>
              </li>
            </>
          ) : (
            <>
              <li><a href="/register" className={`navbar__link ${pathname === '/register' ? 'navbar__link--active' : ''}`}>Register</a></li>
              <li><a href="/login" className={`navbar__link ${pathname === '/login' ? 'navbar__link--active' : ''}`}>Login</a></li>
            </>
          )}
        </ul>
      </nav>
      {children}
    </>
  );
}
