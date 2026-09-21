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

// --- Failed-login throttling -------------------------------------------
//
// The shared password is the entire perimeter, so an unlimited-rate guessing
// run against POST /login was the most plausible route to the certificate
// corpus — and handleLogin logged nothing, so such a run left no trace at all.
//
// This throttles with DELAYS, never lockouts. A lockout on a single shared
// password is a denial-of-service anyone on the internet can trigger against
// all three OVs at once; a delay costs an attacker everything and costs a real
// user who mistypes roughly a quarter of a second.
//
// The per-IP bucket is best-effort on purpose. Render sits behind Cloudflare,
// so the hop depth in X-Forwarded-For is not known here, and with `trust proxy`
// the client-claimed leftmost entry is spoofable. An attacker rotating that
// header escapes their own bucket — which is exactly why the global counter
// below exists and is not keyed on anything the caller controls.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_DELAY_MS = 5000;
const LOGIN_GLOBAL_THRESHOLD = 40;
const LOGIN_GLOBAL_FLOOR_MS = 2000;
const LOGIN_BUCKET_CAP = 5000; // hard ceiling on tracked keys, so the map cannot grow without bound

const loginFailures = new Map(); // key -> { count, windowStart }
let globalFailures = 0;
let globalWindowStart = Date.now();

function pruneLoginFailures(now) {
  for (const [key, rec] of loginFailures) {
    if (now - rec.windowStart > LOGIN_WINDOW_MS) loginFailures.delete(key);
  }
  if (loginFailures.size > LOGIN_BUCKET_CAP) loginFailures.clear();
}

function loginKey(req) {
  return (req && (req.ip || (req.connection && req.connection.remoteAddress))) || 'unknown';
}

// Returns how long to wait before answering this failed attempt.
function recordLoginFailure(req) {
  const now = Date.now();
  pruneLoginFailures(now);

  if (now - globalWindowStart > LOGIN_WINDOW_MS) {
    globalWindowStart = now;
    globalFailures = 0;
  }
  globalFailures += 1;

  const key = loginKey(req);
  const rec = loginFailures.get(key);
  const current = rec && now - rec.windowStart <= LOGIN_WINDOW_MS
    ? { count: rec.count + 1, windowStart: rec.windowStart }
    : { count: 1, windowStart: now };
  loginFailures.set(key, current);

  // First failure is free of any perceptible cost; doubling after that.
  const perKey = Math.min(125 * Math.pow(2, current.count - 1), LOGIN_MAX_DELAY_MS);
  const floor = globalFailures > LOGIN_GLOBAL_THRESHOLD ? LOGIN_GLOBAL_FLOOR_MS : 0;
  const delay = Math.min(Math.max(perKey, floor), LOGIN_MAX_DELAY_MS);

  console.warn(
    `[auth] failed login attempt — key=${key} attempts=${current.count} ` +
    `globalFailures=${globalFailures} delayMs=${delay}`
  );
  return delay;
}

function clearLoginFailures(req) {
  loginFailures.delete(loginKey(req));
}

// Exported for tests; resets all throttle state.
function _resetLoginThrottle() {
  loginFailures.clear();
  globalFailures = 0;
  globalWindowStart = Date.now();
}

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
    const delay = recordLoginFailure(req);
    return setTimeout(() => {
      if (isJSON) {
        return res.status(401).json({ ok: false, error: 'Incorrect password' });
      }
      const target = `/login?error=1${nextUrl !== '/' ? `&next=${encodeURIComponent(nextUrl)}` : ''}`;
      return res.redirect(target);
    }, delay);
  }

  clearLoginFailures(req);
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
  serveLoginPage,
  recordLoginFailure,
  clearLoginFailures,
  _resetLoginThrottle
};
