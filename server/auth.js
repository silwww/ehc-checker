// ============================================================================
// EHC Checker — Authentication module (ISOLATED)
//
// This file is the ONLY auth implementation in the app. To migrate to SSO
// post-handover, replace the contents of this file. To remove auth entirely
// (e.g., VPN-only deployment), delete this file and remove the requireAuth +
// mountAuthRoutes references from server/server.js. See DEPLOYMENT.md.
//
// Model: shared team secret + HMAC-signed cookie. No per-user accounts, no
// database, no password hashing library. The cookie does NOT contain the
// password — it contains a constant payload signed with EHC_COOKIE_SECRET.
// ============================================================================

const crypto = require('crypto');
const path = require('path');

// Read env vars ONCE at module load. Fail fast if either is missing — we
// must never silently run unprotected.
const SHARED_SECRET = process.env.EHC_SHARED_SECRET;
const COOKIE_SECRET = process.env.EHC_COOKIE_SECRET;

if (!SHARED_SECRET || !COOKIE_SECRET) {
  console.error('[auth] FATAL: EHC_SHARED_SECRET and EHC_COOKIE_SECRET must both be set.');
  console.error('[auth] Generate a cookie secret with:');
  console.error('[auth]   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const COOKIE_NAME = 'ehc_session';
const COOKIE_PAYLOAD = 'authenticated';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signPayload(payload) {
  return crypto
    .createHmac('sha256', COOKIE_SECRET)
    .update(payload)
    .digest('hex');
}

function buildCookieValue() {
  return `${COOKIE_PAYLOAD}.${signPayload(COOKIE_PAYLOAD)}`;
}

function verifyCookieValue(value) {
  if (typeof value !== 'string') return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (payload !== COOKIE_PAYLOAD) return false;
  const expected = signPayload(payload);
  // Constant-time compare. Buffers must be equal length or timingSafeEqual throws.
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch (_e) {
    return false;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  };
}

function setSessionCookie(res) {
  res.cookie(COOKIE_NAME, buildCookieValue(), cookieOptions());
}

function clearSessionCookie(res) {
  res.cookie(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 });
}

// Path is same-origin only (must start with `/` and not `//` to block
// protocol-relative URLs). Anything else falls back to `/`.
function sanitizeNext(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  return raw;
}

function wantsJSON(req) {
  const accept = req.headers['accept'] || '';
  if (accept.includes('application/json')) return true;
  if (req.path && req.path.startsWith('/api/')) return true;
  return false;
}

function timingSafeStringEqual(a, b) {
  // Both must be strings. Pad to equal length using a separate buffer so
  // mismatched-length comparisons still take constant time relative to the
  // longer of the two.
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Still do a compare to avoid a fast-path early return revealing length.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function requireAuth(req, res, next) {
  const cookieValue = req.cookies && req.cookies[COOKIE_NAME];
  if (verifyCookieValue(cookieValue)) {
    // Rolling expiry: re-issue with fresh 30d window so active users stay in.
    setSessionCookie(res);
    return next();
  }

  if (wantsJSON(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const nextUrl = encodeURIComponent(req.originalUrl || '/');
  return res.redirect(`/login?next=${nextUrl}`);
}

function serveLoginPage(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.resolve('public', 'login.html'));
}

function handleLogin(req, res) {
  const submittedPassword = (req.body && req.body.password) || '';
  const nextUrl = sanitizeNext(req.body && req.body.next);
  const isJSON = (req.headers['content-type'] || '').includes('application/json')
    || (req.headers['accept'] || '').includes('application/json');

  const ok = timingSafeStringEqual(submittedPassword, SHARED_SECRET);
  if (!ok) {
    if (isJSON) {
      return res.status(401).json({ ok: false, error: 'Incorrect password' });
    }
    const target = `/login?error=1${nextUrl !== '/' ? `&next=${encodeURIComponent(nextUrl)}` : ''}`;
    return res.redirect(target);
  }

  setSessionCookie(res);
  if (isJSON) {
    return res.status(200).json({ ok: true, redirect: nextUrl });
  }
  return res.redirect(nextUrl);
}

function handleLogout(req, res) {
  clearSessionCookie(res);
  const isJSON = (req.headers['accept'] || '').includes('application/json');
  if (isJSON) {
    return res.status(200).json({ ok: true });
  }
  return res.redirect('/login');
}

function handleAuthStatus(req, res) {
  const cookieValue = req.cookies && req.cookies[COOKIE_NAME];
  const authenticated = verifyCookieValue(cookieValue);
  res.json({ authEnabled: true, authenticated });
}

function mountAuthRoutes(app) {
  app.get('/login', serveLoginPage);
  app.post('/login', handleLogin);
  app.post('/logout', handleLogout);
  app.get('/api/auth/status', handleAuthStatus);
}

module.exports = {
  requireAuth,
  mountAuthRoutes,
  serveLoginPage
};
