# EHC Checker

Web application for verifying UK Export Health Certificates (EHCs) against structured rule sets, using the Claude API. Built for and currently used by four Official Veterinarians on Dr. RR Cunningham's team.

## Tech stack

- **Frontend** — HTML + vanilla JavaScript + design tokens in `public/css/design-system.css`. No framework, no build step.
- **Backend** — Express + Node.js. No serverless, no platform lock-in.
- **AI** — Claude Sonnet 4.6 via the Anthropic SDK.
- **PDF generation** — jsPDF with embedded Geist font, generated client-side.
- **Authentication** — HMAC-signed cookie, shared team secret. All auth logic isolated in `server/auth.js`.
- **No database** — rule sets are markdown files; libraries are JSON.

## Project structure

```
ehc-checker-app/
├── public/                 # Frontend (HTML + JS + CSS, no build step)
│   ├── index.html          # Upload + check page
│   ├── audit.html          # Full audit report page
│   ├── admin.html          # Admin panel (library editing)
│   ├── login.html          # Login page (gated by auth)
│   ├── css/                # design-system.css
│   └── assets/             # mascots, fonts, jsPDF generator
├── server/                 # Express backend
│   ├── server.js           # Entry point + routes
│   └── auth.js             # Isolated auth module (~178 LOC)
├── src/
│   └── check.js            # Business logic (Claude API, rule loading, classification)
├── rules/                  # Rule sets + libraries
│   ├── _registry.json      # certificateTypes + layerComposition + tenants
│   ├── _schema.json        # JSON schema
│   ├── _core/              # Core layer (universal rules, Parts 0/A/B/I)
│   ├── _routes/uk-eu/      # Route layer (UK→EU specifics)
│   └── dairy-uk-eu/        # Commodity layer (8322 + 8468 dairy)
├── package.json
├── README.md, ARCHITECTURE.md, ENV.md, DEPLOYMENT.md, RULE_SET_GUIDE.md
└── .env.example
```

## Quick start (local)

```bash
git clone https://github.com/silwww/ehc-checker.git
cd ehc-checker
npm install
cp .env.example .env       # then fill in real values
npm start                  # serves on http://localhost:3000
```

`npm run dev` is also available for nodemon-based auto-reload during active development; `npm start` is the stable default.

## Authentication

EHC Checker uses a shared-team-secret model. Set `EHC_SHARED_SECRET` (the password all team members use) and `EHC_COOKIE_SECRET` (a random 32+ character string used to sign session cookies). Sessions persist for 30 days with rolling extension on activity.

The full handover guide for replacing or removing auth lives in [DEPLOYMENT.md](DEPLOYMENT.md).

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — engine design, three-layer rule set model, request flow, auth model
- [DEPLOYMENT.md](DEPLOYMENT.md) — production deployment, env vars in production, three auth handover scenarios, rule set update workflow
- [ENV.md](ENV.md) — environment variables reference
- [RULE_SET_GUIDE.md](RULE_SET_GUIDE.md) — how to add a new commodity / route / certificate type

## License

UNLICENSED — internal use only. Do not distribute without permission.

## Contributors

- **Silvia Soescu** (MRCVS, SP 632477) — Development
- **RR Cunningham** (BVetMed MRCVS, SP 136830) — Rule set owner & domain expert
