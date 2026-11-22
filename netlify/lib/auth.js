// Shared auth helpers for the dashboard functions.
// Env vars (set in Netlify > Site configuration > Environment variables):
//   DASH_PASSWORD  - the passphrase typed at the login prompt
//   DASH_SECRET    - long random string used to sign session tokens
//                    (change it to sign every device out)
const crypto = require('crypto');

const TOKEN_DAYS = 30;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(data, secret) {
  return b64url(crypto.createHmac('sha256', secret).update(data).digest());
}

function sameString(a, b) {
  // Compare fixed-length digests so the comparison time does not leak the length or content.
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function configured() {
  return Boolean(process.env.DASH_PASSWORD && process.env.DASH_SECRET);
}

function issueToken() {
  const exp = Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000;
  const body = b64url(JSON.stringify({ exp }));
  return { token: body + '.' + sign(body, process.env.DASH_SECRET), exp };
}

function tokenValid(token) {
  if (!configured() || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  if (!sameString(sig, sign(body, process.env.DASH_SECRET))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch (e) {
    return false;
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(obj)
  };
}

// Returns a response object to send back if the request is NOT authorized, or null if it is.
function requireAuth(event) {
  if (!configured()) return json(503, { error: 'Auth not configured' }); // fail closed
  const header = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return tokenValid(token) ? null : json(401, { error: 'Unauthorized' });
}

module.exports = { configured, issueToken, requireAuth, sameString, json };
