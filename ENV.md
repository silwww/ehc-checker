# Environment variables

All secrets and environment-specific configuration are read from environment variables. No secrets are hardcoded, and no Netlify-specific environment APIs are used.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key used by the backend to call Claude. Obtain from https://console.anthropic.com/. | `sk-ant-...` |

## Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_MODEL` | Claude model identifier used for verification. | `claude-sonnet-4-5` |
| `ADMIN_PASSWORD` | Password for the admin panel login. If unset, admin features are disabled. | _(unset)_ |

## Local development

Copy `.env.example` to `.env` (gitignored) and fill in the values:

```bash
cp .env.example .env
```

Then run:

```bash
npx netlify dev
```

Netlify Dev loads variables from `.env` automatically.

## Production (Netlify)

Set environment variables in the Netlify site dashboard under **Site settings → Environment variables**. Netlify injects them at function runtime.

## Production (non-Netlify Node.js server)

Set environment variables at the OS or systemd level, or use a `.env` loader in the entry point (e.g. `dotenv`). The business logic reads `process.env.ANTHROPIC_API_KEY` and `process.env.CLAUDE_MODEL` with no Netlify-specific wrapping.
