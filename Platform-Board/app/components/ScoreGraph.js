'use client';

export default function ScoreGraph({ teams }) {
  if (!teams || teams.length === 0) return null;

  const top = teams.slice(0, 15); // show top 15 teams
  const maxScore = Math.max(...top.map(t => Math.abs(t.score)), 1);

  return (
    <div className="graph-container">
      <h2 className="graph-title">📊 Score Distribution</h2>
      <div className="graph-chart">
        {top.map((team, i) => {
          const isNeg = team.score < 0;
          const width = Math.max((Math.abs(team.score) / maxScore) * 100, 2);
          const barColor = isNeg
            ? 'var(--neon-red)'
            : i === 0 ? '#ffd700'
            : i === 1 ? '#c0c0c0'
            : i === 2 ? '#cd7f32'
            : 'var(--neon-green)';
          const glowColor = isNeg
            ? 'rgba(255,59,92,.3)'
            : i === 0 ? 'rgba(255,215,0,.3)'
            : 'rgba(0,255,136,.2)';

          return (
            <div className="graph-row" key={team.id}>
              <span className="graph-label">{team.name}</span>
              <div className="graph-bar-track">
                <div
                  className="graph-bar"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                    boxShadow: `0 0 12px ${glowColor}`,
                    animationDelay: `${i * 0.06}s`,
                  }}
                />
              </div>
              <span className={`graph-score ${isNeg ? 'score--negative' : 'score--positive'}`}>
                {isNeg ? team.score : `+${team.score}`}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .graph-container {
          margin-bottom: 2rem;
        }
        .graph-title {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .graph-chart {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .graph-row {
          display: grid;
          grid-template-columns: 140px 1fr 70px;
          align-items: center;
          gap: 12px;
        }
        .graph-label {
          font-family: var(--font-mono);
          font-size: .78rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .graph-bar-track {
          height: 28px;
          background: var(--bg-surface);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }
        .graph-bar {
          height: 100%;
          border-radius: 6px;
          min-width: 4px;
          animation: barGrow .6s var(--ease-out-expo) both;
        }
        .graph-score {
          font-family: var(--font-mono);
          font-size: .82rem;
          font-weight: 600;
          text-align: right;
        }
        @keyframes barGrow {
          from { width: 0% !important; opacity: 0; }
          to   { opacity: 1; }
        }
        @media (max-width: 600px) {
          .graph-row {
            grid-template-columns: 90px 1fr 55px;
            gap: 6px;
          }
          .graph-label { font-size: .7rem; }
          .graph-bar-track { height: 22px; }
        }
      `}</style>
    </div>
  );
}
