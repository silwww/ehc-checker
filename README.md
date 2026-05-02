# EHC Checker

A web application for verifying UK Export Health Certificates (EHCs) against structured rule sets. Built with HTML, vanilla JavaScript, and Netlify Functions, powered by Claude API.

## Status

🚧 **Under active development** — April 2026

## What it does

EHC Checker automates the verification of UK Export Health Certificates by:
- Accepting uploaded EHC PDFs, delivery notes, dispatch confirmations, and photos
- Running them against a structured rule set (Parts A–F)
- Producing a structured compliance report with PASS / HOLD / FAIL verdict
- Learning from new patterns through a feedback loop (flags → admin review → rule set updates)

Supported certificate types (v2.8): EHC 8468 (dairy, human consumption), EHC 8322 (Cat 3 ABP dairy), EHC 8384 MPNT (cooked meat products), EHC 8324 (canned petfood), EHC 8350EHC COMP (composite products), EHC 8436 HEP (hatching eggs), EHC 8471 EGG-PRODUCTS-PT (egg products).
Future: additional EHC types for EU and third-country exports (China, India, South Africa, New Zealand).

## Tech stack

- **Frontend:** HTML + vanilla JavaScript + Tailwind CSS (via CDN)
- **Backend:** Netlify Functions (Node.js serverless)
- **AI:** Claude Sonnet 4.5 via Anthropic API
- **Storage:** Netlify Blobs (for flags, queue, and change log)
- **Rule sets:** JSON files in `rules/`
- **Hosting:** Netlify (development & staging), company server (production)

## Project structure

```
ehc-checker-app/
├── netlify/
│   └── functions/          # Serverless backend functions
├── rules/
│   ├── libraries/          # Consignees, establishments, BCPs, OVs
│   ├── _schema.json        # Generic rule set schema
│   ├── ehc_8468.json       # EHC 8468 rule set
│   └── ehc_8322.json       # EHC 8322 rule set
├── public/
│   ├── index.html          # Main checker interface
│   ├── admin.html          # Admin panel
│   └── assets/             # Static assets
├── .env.example            # Environment variables template
├── netlify.toml            # Netlify configuration
└── package.json            # Dependencies
```

## Development setup

### Prerequisites

- Node.js 20 or higher
- npm
- An Anthropic API key with credit ([console.anthropic.com](https://console.anthropic.com/))
- A GitHub account (for version control)
- A Netlify account (for hosting)

### Local setup

1. Clone the repo:
   ```bash
   git clone https://github.com/silwww/ehc-checker.git
   cd ehc-checker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your real Anthropic API key and admin password.

4. Run the dev server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:8888`.

## Authentication

EHC Checker uses a shared team password to gate access. Set two environment variables:

- `EHC_SHARED_SECRET` — the password all team members use to sign in
- `EHC_COOKIE_SECRET` — a random server-side string used to sign session cookies (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

Sessions persist for 30 days with rolling extension on activity. To rotate the password: change `EHC_SHARED_SECRET` in environment variables and redeploy — all existing sessions become invalid immediately.

Authentication is fully isolated in `server/auth.js`. To replace with SSO (e.g., OIDC), swap the contents of that single file. To remove auth entirely (e.g., for VPN-only deployments), delete `server/auth.js` and remove the `requireAuth` references in `server/server.js`. See `DEPLOYMENT.md` for full handover guidance.

## Deployment

### Netlify (staging)

1. Connect the GitHub repo to Netlify via the dashboard
2. Add environment variables in Netlify settings:
   - `ANTHROPIC_API_KEY`
   - `ADMIN_PASSWORD`
   - `CLAUDE_MODEL` (optional, defaults to `claude-sonnet-4-6`)
3. Deploy happens automatically on every `git push` to main

### Company server (production)

To be configured when ready for production rollout.

## Rule set

The current rule set is **v2.8 — April 2026**, based on the combined rule set and checker brief developed by RR Cunningham for UK dairy EHCs and extended to cover meat products, petfood, composite products, hatching eggs, and egg products. Credit to the original author; this project adapts the rule set into a structured, queryable three-layer format (core + route + commodity).

## License

UNLICENSED — internal use only. Do not distribute without permission.

## Contributors

- **Silvia Soescu** (MRCVS, SP 632477) — Development
- **RR Cunningham** (BVetMed MRCVS, SP 136830) — Rule set owner & domain expert

---

*Last updated: April 2026*

## Project structure (updated 2026-04-09)

```
ehc-checker-app/
├── public/                    # Frontend (HTML + Tailwind + vanilla JS)
│   ├── index.html             # Main upload and check page
│   └── admin.html             # Admin panel for libraries
├── netlify/
│   └── functions/
│       └── check.js           # Backend verification handler
├── rules/
│   ├── _registry.json         # Three-layer registry: certificateTypes → layerComposition, plus tenants
│   ├── _schema.json           # JSON schema for registry + all library shapes
│   ├── _core/                 # Core layer — universal rules (Parts 0, A, B, I)
│   │   ├── rule_set.md
│   │   ├── calibration-notes.json
│   │   └── libraries/ovs.json
│   ├── _routes/
│   │   └── uk-eu/             # Route layer — UK→EU specifics (A2, A6, A10)
│   │       ├── route.md
│   │       ├── libraries/     # bcps.json, logistics-agents.json
│   │       └── routes/        # Route-specific calibrations (e.g. immingham-esbjerg.json)
│   ├── dairy-uk-eu/           # Commodity: dairy (8322 + 8468)
│   │   ├── rule_set.md        # Commodity stub
│   │   ├── calibration-notes.json
│   │   ├── types/{8322,8468}.md
│   │   └── libraries/         # establishments, consignees, destinations
│   ├── meat-products-uk-eu/   # Commodity: 8384 MPNT cooked meat products
│   ├── petfood-uk-eu/         # Commodity: 8324 canned petfood
│   ├── composite-uk-eu/       # Commodity: 8350EHC COMP composite products
│   ├── hatching-eggs-uk-eu/   # Commodity: 8436 HEP hatching eggs
│   └── egg-products-uk-eu/    # Commodity: 8471 EGG-PRODUCTS-PT egg products
├── netlify.toml
├── package.json
├── README.md                  # This file
├── ARCHITECTURE.md            # Engine and multi-rule-set design
├── ENV.md                     # Environment variables reference
└── RULE_SET_GUIDE.md          # How to add a new rule set
```

### Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — engine design, multi-rule-set model, request flow
- [ENV.md](ENV.md) — environment variables reference
- [RULE_SET_GUIDE.md](RULE_SET_GUIDE.md) — how to add a new rule set
