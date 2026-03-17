'use client';

import { useState, useEffect } from 'react';

// Color map for the top 5 teams
const COLORS = [
  'var(--neon-green)',   // #1
  'var(--neon-blue)',    // #2
  'var(--neon-purple)',  // #3
  'var(--neon-orange)',  // #4
  'var(--neon-red)'      // #5
];

export default function ScoreboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/scoreboard');
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </main>
    );
  }

  if (!data) return null;

  const { teams, categories, timeline } = data;
  
  // --- Simple SVG Line Chart Logic ---
  // If there's timeline data, find max score and max time to scale the SVG
  let maxScore = 1;
  let maxTime = 1;
  const activeTeams = teams.slice(0, 5);
  
  Object.values(timeline).forEach(points => {
    points.forEach(p => {
      if (p.score > maxScore) maxScore = p.score;
      if (p.time > maxTime) maxTime = p.time;
    });
  });

  // Calculate percentage of teams that solved at least one challenge in each category
  // For simplicity, we just look at the total # of solves across teams for that category.
  const teamCount = Math.max(1, teams.length);

  return (
    <main className="page" style={{ maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="page__title">Live Telemetry</h1>
          <p className="page__subtitle" style={{ margin: 0 }}>// real-time operational status</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Teams</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--neon-green)', textShadow: 'var(--glow-green)' }}>{teams.length}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* ── TOP TEAMS CHART ── */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>&gt; SCORE_PROGRESSION (TOP 5)</span>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Auto-updating</span>
          </h3>

          <div style={{ flex: 1, position: 'relative', minHeight: 250, borderLeft: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '0 1rem 1rem 0' }}>
            {maxTime === 1 && maxScore === 1 ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '.85rem' }}>Awaiting initial submissions...</div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {activeTeams.map((t, i) => {
                  const points = timeline[t.id];
                  if (!points || points.length === 0) return null;
                  
                  // Add a final point at maxTime to draw the line all the way to the right
                  const lastP = points[points.length - 1];
                  const extendedPoints = [...points, { time: maxTime, score: lastP.score }];

                  const d = extendedPoints.map((p, j) => {
                    const x = (p.time / maxTime) * 100;
                    const y = 100 - ((p.score / maxScore) * 100);
                    return `${j === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');

                  return (
                    <g key={t.id}>
                      <path d={d} fill="none" stroke={COLORS[i]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${COLORS[i]}40)` }} />
                      <circle cx={(extendedPoints[extendedPoints.length-1].time / maxTime) * 100} cy={100 - ((extendedPoints[extendedPoints.length-1].score / maxScore) * 100)} r="2" fill={COLORS[i]} vectorEffect="non-scaling-stroke" />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            {activeTeams.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontFamily: 'var(--font-mono)', fontSize: '.75rem' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: COLORS[i], boxShadow: `0 0 8px ${COLORS[i]}` }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>0{i+1}.</span>
                <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
              </div>
            ))}
          </div>

        </div>

        {/* ── CATEGORY DISTRIBUTION ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>
            &gt; DOMAIN_DISTRIBUTION
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {categories.map((cat, i) => {
              // Calculate avg solves across all teams for this category
              // Maximum possible solves is (cat.total * teamCount)
              const totalPossible = Math.max(cat.total * teamCount, 1);
              const totalActual = teams.reduce((acc, t) => acc + (t[cat.name] || 0), 0);
              const pct = Math.round((totalActual / totalPossible) * 100);

              return (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '.75rem', marginBottom: '.4rem' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{pct}% Complete</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── RANKINGS TABLE ── */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="scoreboard" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Rank</th>
              <th>Team Alias</th>
              {categories.map(c => (
                <th key={c.name} style={{ textAlign: 'center' }}>{c.name}</th>
              ))}
              <th style={{ textAlign: 'right', color: 'var(--neon-green)' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={categories.length + 3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No teams registered.</td>
              </tr>
            ) : (
              teams.map((t, i) => (
                <tr key={t.id}>
                  <td>
                    <span className={`rank ${i < 3 ? `rank--${i+1}` : 'rank--default'}`}>{i + 1}</span>
                  </td>
                  <td style={{ fontWeight: i < 3 ? 600 : 400, color: i < 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {t.name}
                  </td>
                  
                  {/* Category Solves (e.g. 2/4) */}
                  {categories.map((c, j) => {
                    const solves = t[c.name] || 0;
                    const total = c.total;
                    const isPerfect = solves === total && total > 0;
                    
                    return (
                      <td key={c.name} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '.8rem', color: isPerfect ? COLORS[j % COLORS.length] : 'var(--text-muted)' }}>
                        {solves} <span style={{ opacity: 0.3 }}>/ {total}</span>
                      </td>
                    );
                  })}
                  
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: i < 3 ? '1.1rem' : '.95rem', fontWeight: 700, color: t.score > 0 ? 'var(--neon-green)' : 'var(--text-muted)' }}>
                    {t.score}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </main>
  );
}
