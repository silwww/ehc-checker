# Environment variables

All secrets and runtime configuration are read from environment variables. No secrets are hardcoded; nothing platform-specific is used.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude. Get from https://console.anthropic.com/settings/keys | `sk-ant-...` |
| `EHC_SHARED_SECRET` | Shared team password used to sign in to the app. All authorised OVs use the same value. | _(any string, kept secret)_ |
| `EHC_COOKIE_SECRET` | Server-side secret used to HMAC-sign session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | _(64 hex chars)_ |

If any of the three required variables are missing at startup, the server logs an explicit error and exits — it never runs unprotected by accident.

## Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_MODEL` | Claude model identifier. | `claude-sonnet-4-6` |
| `PORT` | Port the Express server listens on. | `3000` |

## Local development

Copy `.env.example` to `.env` (gitignored) and fill in real values:

```bash
cp .env.example .env
# edit .env
npm start
```

Then visit http://localhost:3000.

## Production

Set the variables at the OS level, in a process manager (systemd, PM2), or in a hosting platform's secret store (Render Environment, fly.io secrets, etc). The `dotenv` package is loaded at the top of `server/server.js` and reads `process.env` — there are no platform-specific wrappers.

## Rotating secrets

- **Rotate the shared password** (e.g. when an OV leaves the team): change `EHC_SHARED_SECRET` and redeploy. All existing sessions remain valid until they expire (30 days), but new logins will require the new password.
- **Invalidate all sessions immediately** (e.g. suspected leak): change `EHC_COOKIE_SECRET` and redeploy. All existing cookies become invalid immediately; everyone logs in again.
- The two secrets are deliberately separate so password rotation and session invalidation are independent operations.
