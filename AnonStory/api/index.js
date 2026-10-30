// Vercel serverless entrypoint. Every route is handled by the same router as
// the local server; see server/app.js. Static files are bundled via the
// includeFiles rule in vercel.json.
const path = require('node:path');

process.env.PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public');
// Behind Vercel's edge, trust the forwarded client IP and set Secure cookies.
process.env.TRUST_PROXY = process.env.TRUST_PROXY || '1';

const { getApp } = require('../server/app');

module.exports = async (req, res) => {
  const { handle } = await getApp();
  return handle(req, res);
};
