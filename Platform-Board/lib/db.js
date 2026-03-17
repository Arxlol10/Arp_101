import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pgSql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Tagged-template sql wrapper — returns { rows, rowCount }
 * to match the shape all route files expect.
 */
export async function sql(strings, ...values) {
  const rows = await pgSql(strings, ...values);
  return { rows: Array.from(rows), rowCount: rows.length };
}

export async function initializeDatabase() {
  // ── Teams ──
  await pgSql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // ── Challenges (with tier and new UI columns) ──
  await pgSql`
    CREATE TABLE IF NOT EXISTS challenges (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) DEFAULT 'General',
      flag VARCHAR(500) NOT NULL,
      points INTEGER NOT NULL,
      tier SMALLINT DEFAULT 0,
      is_honeypot BOOLEAN DEFAULT FALSE,
      difficulty VARCHAR(10) DEFAULT 'MEDIUM',
      description TEXT DEFAULT '',
      attachment_url VARCHAR(500) DEFAULT NULL,
      attachment_name VARCHAR(200) DEFAULT NULL,
      attachment_size VARCHAR(50) DEFAULT NULL,
      attachment_hash VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // ── Submissions ──
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

  // ── Sessions ──
  await pgSql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      token VARCHAR(128) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // ── Hints ──
  await pgSql`
    CREATE TABLE IF NOT EXISTS hints (
      id SERIAL PRIMARY KEY,
      challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      penalty_pct SMALLINT DEFAULT 25
    );
  `;

  // ── Hint Unlocks ──
  await pgSql`
    CREATE TABLE IF NOT EXISTS hint_unlocks (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      hint_id INTEGER REFERENCES hints(id) ON DELETE CASCADE,
      points_lost INTEGER NOT NULL,
      unlocked_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(team_id, hint_id)
    );
  `;

  // ── Tier Unlocks ──
  await pgSql`
    CREATE TABLE IF NOT EXISTS tier_unlocks (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      tier SMALLINT NOT NULL,
      bonus_awarded INTEGER DEFAULT 200,
      unlocked_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(team_id, tier)
    );
  `;

  // ── Indexes ──
  await pgSql`CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);`;
  await pgSql`CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_id);`;
  await pgSql`CREATE INDEX IF NOT EXISTS idx_submissions_time ON submissions(submitted_at DESC);`;
  await pgSql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);`;
  await pgSql`CREATE INDEX IF NOT EXISTS idx_sessions_team ON sessions(team_id);`;
  await pgSql`CREATE INDEX IF NOT EXISTS idx_hints_challenge ON hints(challenge_id);`;
  await pgSql`CREATE INDEX IF NOT EXISTS idx_tier_unlocks_team ON tier_unlocks(team_id);`;

  // ── Add new columns if they don't exist (migrations for existing DBs) ──
  await pgSql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='challenges' AND column_name='tier'
      ) THEN
        ALTER TABLE challenges ADD COLUMN tier SMALLINT DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='challenges' AND column_name='difficulty'
      ) THEN
        ALTER TABLE challenges ADD COLUMN difficulty VARCHAR(10) DEFAULT 'MEDIUM';
        ALTER TABLE challenges ADD COLUMN description TEXT DEFAULT '';
        ALTER TABLE challenges ADD COLUMN attachment_url VARCHAR(500) DEFAULT NULL;
        ALTER TABLE challenges ADD COLUMN attachment_name VARCHAR(200) DEFAULT NULL;
        ALTER TABLE challenges ADD COLUMN attachment_size VARCHAR(50) DEFAULT NULL;
        ALTER TABLE challenges ADD COLUMN attachment_hash VARCHAR(100) DEFAULT NULL;
      END IF;
    END $$;
  `;

  // ── Unique partial index: prevent duplicate correct solves ──
  await pgSql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique
    ON submissions(team_id, challenge_id) WHERE is_correct = TRUE;
  `;
}
