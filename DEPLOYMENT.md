# Deployment

This guide is for deploying EHC Checker to a production environment. The current staging deployment is on Render.com (Frankfurt EU Central) at `https://shaggy-ehc-checker.onrender.com`. The intended production deployment is on Dr. Cunningham's company server.

## Prerequisites

- Node.js 20 or higher
- An Anthropic API key with credit (separate from staging — production uses your own)
- A way to set environment variables (systemd, PM2, Docker env file, hosting dashboard, etc)
- TLS termination (most deployments handle this at a reverse proxy / load balancer / hosting platform layer; the app itself runs HTTP)

## Environment variables

Three required: `ANTHROPIC_API_KEY`, `EHC_SHARED_SECRET`, `EHC_COOKIE_SECRET`. Optional: `CLAUDE_MODEL`, `PORT`. See [ENV.md](ENV.md) for full reference.

For production:

- Generate a fresh `EHC_COOKIE_SECRET` (do NOT reuse the staging value)
- Set an `EHC_SHARED_SECRET` distinct from staging — production and staging passwords should be different
- The Anthropic API key should be on Dr. Cunningham's company's Anthropic account, not Silvia's

## Deploy steps (generic Node.js server)

```bash
# On your server:
git clone https://github.com/silwww/ehc-checker.git
cd ehc-checker
npm install --production

# Set the three required env vars (method depends on your stack)
export ANTHROPIC_API_KEY=sk-ant-...
export EHC_SHARED_SECRET=...
export EHC_COOKIE_SECRET=...

# Start the server
npm start
```

The server listens on `process.env.PORT || 3000`. Put it behind a reverse proxy (Nginx, Caddy, hosting platform) for TLS termination and process supervision.

## Recommended process supervision

- **PM2:** `pm2 start npm --name ehc-checker -- start`
- **systemd:** standard Node.js unit file pointing at `node server/server.js` with the env vars in `Environment=` lines or `EnvironmentFile=`
- **Docker:** the codebase has no Dockerfile yet, but it's a stock Node.js + Express app — a 5-line Dockerfile (FROM node:20-alpine, COPY, npm install, EXPOSE, CMD) works

## Three authentication handover scenarios

Authentication is isolated in `server/auth.js` so the rest of the codebase doesn't depend on the auth model. Pick the scenario that fits your environment:

### Scenario A — Keep shared-secret auth (zero work)

Leave `server/auth.js` untouched. Set `EHC_SHARED_SECRET` and `EHC_COOKIE_SECRET` for production. All four OVs use the same password. To rotate (someone leaves the team, or to refresh): change `EHC_SHARED_SECRET` and redeploy.

This is the recommended default until Scooby SSO is ready.

### Scenario B — Replace with Scooby SSO (one file)

Replace the contents of `server/auth.js` with a Scooby OIDC integration. The rest of the codebase requires no changes:

- The middleware exported as `requireAuth` must continue to: read the session, set `req.user` (or equivalent), redirect unauthenticated requests to login
- The function exported as `mountAuthRoutes(app)` must register login/callback/logout routes appropriate to your IdP
- The endpoint `GET /api/auth/status` must return JSON `{ authEnabled: true, authenticated: true|false, user?: { name } }` — the frontend reads this to decide whether to render the logout button

The frontend's logout button is wired to this endpoint, so any auth replacement that returns the right shape from `/api/auth/status` will integrate cleanly.

### Scenario C — Remove auth (VPN-only deployment)

If the app sits behind a corporate VPN where network-level access control is sufficient:

1. Delete `server/auth.js`
2. In `server/server.js`, remove these lines:
   - `const { requireAuth, mountAuthRoutes } = require('./auth');`
   - `app.use(requireAuth);`
   - the call to `mountAuthRoutes(app);`
3. Update `/api/auth/status` (or remove it) so the frontend hides the logout component. Easiest: replace the endpoint with a one-liner returning `{ authEnabled: false }`. The frontend will hide the logout button automatically.

This option is documented for completeness; the recommended default is to keep auth even behind a VPN as a defence-in-depth layer.

## Rule set updates post-handover

Rule sets are markdown files under `rules/` (currently `dairy-uk-eu/` is the only commodity actively used; six commodity layers are registered). Updates from Silvia to Dr. Cunningham's team are sent as a Word document; the `.docx` → markdown conversion is done locally before the markdown reaches your repository (Silvia maintains the conversion tooling on her workstation).

The recommended workflow:

1. Silvia notifies Dr. Cunningham of a new rule set version (Notion / email).
2. Dr. Cunningham receives the converted markdown alongside the Word source.
3. Your team reviews the diff against the prior version, commits to your repo, and deploys.

This is intentionally manual — rule set updates are infrequent (every few weeks) and benefit from a human review pass. See [RULE_SET_GUIDE.md](RULE_SET_GUIDE.md) for the structure of a rule set folder.

## Cache busting after a deploy

After every deploy, OVs may need a hard refresh in their browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to pick up changes to static assets — especially CSS and the jsPDF mascot bundle. Browsers occasionally cache the prior `shaggy-loader.svg` and `geist-fonts-base64.js`. This is a known browser caching quirk, not an app bug.

## Health check

`GET /health` returns `{ status: "ok", timestamp: ... }`. Use this for hosting platform liveness probes. The endpoint is public (no auth required).
