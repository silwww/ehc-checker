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

Initial support: EHC 8468 (dairy for human consumption) and EHC 8322 (Category 3 ABP dairy).
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

## Deployment

### Netlify (staging)

1. Connect the GitHub repo to Netlify via the dashboard
2. Add environment variables in Netlify settings:
   - `ANTHROPIC_API_KEY`
   - `ADMIN_PASSWORD`
   - `CLAUDE_MODEL` (optional, defaults to `claude-sonnet-4-5`)
3. Deploy happens automatically on every `git push` to main

### Company server (production)

To be configured when ready for production rollout.

## Rule set

The current rule set is **v2.1 — April 2026**, based on the combined rule set and checker brief developed by RR Cunningham for UK dairy EHCs. Credit to the original author; this project adapts the rule set into a structured, queryable format.

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
│   ├── _registry.json         # Registry of all available rule sets
│   ├── _schema.json           # JSON schema for the registry
│   ├── _shared/
│   │   └── libraries/         # Libraries shared across all rule sets
│   │       ├── ovs.json
│   │       ├── bcps.json
│   │       ├── consignees.json
│   │       └── logistics.json (placeholder)
│   ├── dairy-uk-eu/           # First rule set: UK dairy → EU
│   │   ├── rule_set.md        # Monolithic rule set (Parts A-I, v2.1)
│   │   ├── types/             # Future per-certificate-type splits
│   │   └── libraries/
│   │       └── establishments.json
│   └── meat-uk-eu/            # Placeholder for future meat rule set
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
