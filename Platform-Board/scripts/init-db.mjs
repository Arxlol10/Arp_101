import { initializeDatabase } from '../lib/db.js';

async function main() {
  try {
    console.log('⚡ Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB init error:', err.message);
    // Don't fail the build — DB might not be connected during first deploy
    process.exit(0);
  }
}

main();
