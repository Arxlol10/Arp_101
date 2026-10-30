const path = require('node:path');
const fs = require('node:fs');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
// Local default: a libSQL file. On Vercel set LIBSQL_URL to a Turso URL.
const STORE_URL = process.env.LIBSQL_URL || `file:${path.join(__dirname, '..', 'data', 'psst.db')}`;

if (STORE_URL.startsWith('file:')) fs.mkdirSync(path.dirname(STORE_URL.slice('file:'.length)), { recursive: true });
if (!process.env.PSST_SECRET) {
  console.warn('PSST_SECRET is not set; sender hashes (blocks) will not survive a restart.');
}

createApp({ storeUrl: STORE_URL }).then(({ server }) => {
  server.listen(PORT, () => console.log(`psst listening on http://localhost:${PORT}`));
});
