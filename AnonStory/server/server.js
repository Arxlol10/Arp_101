const path = require('node:path');
const fs = require('node:fs');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = process.env.PSST_DB || path.join(__dirname, '..', 'data', 'psst.db');

if (DB_FILE !== ':memory:') fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!process.env.PSST_SECRET) {
  console.warn('PSST_SECRET is not set; sender hashes (blocks) will not survive a restart.');
}

const { server } = createApp({ dbFile: DB_FILE });
server.listen(PORT, () => console.log(`psst listening on http://localhost:${PORT}`));
