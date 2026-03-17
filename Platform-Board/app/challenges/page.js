'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getDifficultyBadge(diff) {
  const d = (diff || 'MEDIUM').toUpperCase();
  if (d === 'EASY') return <span className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.2)' }}>EASY</span>;
  if (d === 'HARD') return <span className="badge" style={{ background: 'rgba(255,59,92,0.1)', color: 'var(--neon-red)', border: '1px solid rgba(255,59,92,0.2)' }}>HARD</span>;
  return <span className="badge" style={{ background: 'rgba(255,138,0,0.1)', color: 'var(--neon-orange)', border: '1px solid rgba(255,138,0,0.2)' }}>MEDIUM</span>;
}

export default function ChallengesPage() {
  const router = useRouter();
  
  const [teamInfo, setTeamInfo] = useState({ id: 0, name: '', score: 0 });
  const [challenges, setChallenges] = useState([]);
  const [categories, setCategories] = useState(['ALL']);
  const [activeCategory, setActiveCategory] = useState('ALL');
  
  const [feed, setFeed] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [loading, setLoading] = useState(true);

  // Load challenges (flattened from tiers)
  useEffect(() => {
    async function loadData() {
      const res = await fetch('/api/challenges');
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) return;
      
      const data = await res.json();
      setTeamInfo({ id: data.teamId, name: data.teamName, score: 0 }); // Score isn't in this endpoint directly

      // Flatten tiers 
      let allChalls = [];
      const cats = new Set(['ALL']);
      
      for (const t of data.tiers) {
        for (const c of t.challenges) {
          // If the tier is unlocked, or it's Tier 0, it's playable. Otherwise "locked".
          const isPlayable = t.tierUnlocked || t.tier === 0;
          allChalls.push({ ...c, isPlayable });
          cats.add(c.category);
        }
      }
      setChallenges(allChalls);
      setCategories(Array.from(cats));
      setLoading(false);
    }
    loadData();
  }, [router]);

  // Load feed and scoreboard data for sidebar
  useEffect(() => {
    async function fetchSidebar() {
      // Feed
      const feedRes = await fetch('/api/feed');
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setFeed(feedData.feed || []);
      }
      // Top 5 and my score
      const scoreRes = await fetch('/api/scoreboard');
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setTopTeams(scoreData.teams.slice(0, 5));
        
        // Update my score if I'm in the table
        if (teamInfo.id) {
          const me = scoreData.teams.find(t => t.id === teamInfo.id);
          const myRank = scoreData.teams.findIndex(t => t.id === teamInfo.id) + 1;
          if (me) setTeamInfo(prev => ({ ...prev, score: me.score, rank: myRank }));
        }
      }
    }
    
    if (!loading) {
      fetchSidebar();
      const interval = setInterval(fetchSidebar, 15000);
      return () => clearInterval(interval);
    }
  }, [loading, teamInfo.id]);

  // Countdown timer clock
  useEffect(() => {
    // If CTF_END_TIME isn't perfectly provided to client, fallback to a 24h clock from mount for aesthetic
    let target = new Date().getTime() + 24 * 60 * 60 * 1000; 
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      if (distance < 0) { setTimeLeft('00:00:00'); return; }
      
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const s = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleChallenges = challenges.filter(c => activeCategory === 'ALL' || c.category === activeCategory);

  if (loading) {
    return (
      <main className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </main>
    );
  }

  return (
    <div style={{ padding: '0 2rem 4rem', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* ── HEADER BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, background: 'var(--neon-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: 'var(--glow-green)' }}>
            A
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', margin: 0, letterSpacing: '2px' }}>ARP_101</h2>
            <div style={{ color: 'var(--neon-green)', fontSize: '.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>System Status: Operational</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '.25rem' }}>Time Remaining</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
            {timeLeft}
          </div>
        </div>

        <div style={{ textAlign: 'right', background: 'rgba(0,255,136,0.05)', padding: '.75rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(0,255,136,0.1)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '.25rem' }}>Operator: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{teamInfo.name}</span></div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--neon-green)', fontWeight: 700 }}>{teamInfo.score} PTS <span style={{ color: 'var(--text-muted)', marginLeft: '.5rem', fontSize: '.8rem' }}>| #{teamInfo.rank || '-'}</span></div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem', alignItems: 'start' }}>
        
        {/* ── LEFT SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'sticky', top: '100px' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>// Top 5 Teams</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topTeams.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>No data.</p> : null}
              {topTeams.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <span style={{ color: i < 3 ? 'var(--neon-yellow)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '.85rem', fontWeight: i < 3 ? 'bold' : 'normal' }}>0{i+1}</span>
                    <span style={{ fontSize: '.9rem', color: t.id === teamInfo.id ? 'var(--neon-green)' : 'var(--text-primary)' }}>{t.name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--text-secondary)' }}>{t.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>// Live Feed</span>
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-red)', animation: 'pulse 2s infinite' }}></span>
                <span style={{ fontSize: '.65rem', color: 'var(--neon-red)' }}>REC</span>
              </span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '.5rem' }}>
              {feed.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>No activity yet.</p> : null}
              {feed.map(f => {
                const timeStr = new Date(f.timestamp).toLocaleTimeString([], { hour12: false });
                const isFail = !f.isCorrect || f.isHoneypot;
                
                return (
                  <div key={f.id} style={{ fontSize: '.8rem', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>[{timeStr}]</span>{' '}
                    {isFail ? (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Failed attempt by <span style={{ color: 'var(--neon-red)' }}>{f.team}</span> on <span style={{ color: 'var(--text-primary)' }}>{f.challenge}</span>
                      </span>
                    ) : (
                      <span>
                        <span style={{ color: 'var(--neon-blue)' }}>{f.team}</span> solved <span style={{ color: 'var(--neon-green)' }}>{f.challenge}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        {/* ── MAIN GRID ── */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: 'transparent',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)',
                  color: activeCategory === cat ? 'var(--neon-green)' : 'var(--text-secondary)',
                  padding: '.5rem 1rem',
                  borderRadius: '100px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '.75rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: activeCategory === cat ? '0 0 15px rgba(0,255,136,0.15)' : 'none'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {visibleChallenges.map(c => {
              
              if (!c.isPlayable) {
                return (
                  <div key={c.id} className="card" style={{ opacity: 0.5, filter: 'grayscale(1)', cursor: 'not-allowed', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '2px' }}>TIER {c.tier} LOCKED</div>
                  </div>
                );
              }

              return (
                <div 
                  key={c.id} 
                  className="card" 
                  onClick={() => router.push(`/challenges/${c.id}`)}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: '220px',
                    borderColor: c.solved ? 'var(--neon-green)' : undefined,
                    background: c.solved ? 'linear-gradient(to bottom, rgba(0,255,136,0.03), rgba(0,0,0,0))' : undefined
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    {getDifficultyBadge(c.difficulty)}
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-green)', fontWeight: 700, fontSize: '1.2rem' }}>
                      {c.points}
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '.75rem', color: 'var(--text-primary)' }}>{c.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.description || 'No description provided for this challenge.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                      Solves: <span style={{ color: 'var(--text-primary)' }}>{c.solveCount}</span>
                    </div>
                    {c.solved ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)', fontSize: '.75rem', fontWeight: 'bold' }}>
                        <span>●</span> SOLVED
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '.75rem' }}>
                        Unsolved
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {visibleChallenges.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                No challenges found in this category.
              </div>
            )}
            
          </div>
        </div>

      </div>

    </div>
  );
}
