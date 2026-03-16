import postgres from 'postgres';

// Create a single connection instance using POSTGRES_URL
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pgSql = postgres(connectionString, {
  ssl: 'require',
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Tagged-template wrapper that mimics @vercel/postgres's sql`...` API.
 * Returns { rows: [...], rowCount: N } so all existing route code works unchanged.
 */
export async function sql(strings, ...values) {
  const rows = await pgSql(strings, ...values);
  return { rows: Array.from(rows), rowCount: rows.length };
}

export async function initializeDatabase() {
  await pgSql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await pgSql`
    CREATE TABLE IF NOT EXISTS challenges (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) DEFAULT 'General',
      flag VARCHAR(500) NOT NULL,
      points INTEGER NOT NULL,
      is_honeypot BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await pgSql`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
      submitted_flag VARCHAR(500) NOT NULL,
      is_correct BOOLEAN NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      submitted_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await pgSql`
    CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);
  `;

  await pgSql`
    CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_id);
  `;
}
