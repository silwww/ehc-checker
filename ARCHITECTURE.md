# Architecture

## Design principle: engine vs rule set separation

The EHC Checker is built as a generic certificate verification engine that knows nothing about any specific commodity. All commodity-specific knowledge — which fields to check, which stamps to look for, which establishments are approved, what attestation text to expect — lives in rule sets. The engine loads a rule set at request time and passes it to Claude alongside the certificate PDF.

This separation means adding a new commodity (meat, fish, honey) or a new destination (China, Japan) requires no engine code changes. Only a new rule set folder and a new registry entry.

## Three-Layer Rule Set Architecture

Starting with rule set v2.7 (April 2026), the rule set is composed from three layers instead of a single monolithic markdown file. Each incoming certificate type resolves to an ordered composition of layers, plus an optional tenant practice layer.

### Layers

1. **Core layer (`rules/_core/`)** — universal rules that apply to every EHC regardless of route or commodity. Parts 0 (session briefing), A (A1, A3, A4, A5, A7, A7.1, A8, A9, A11 — universal document, stamp, signing and severity rules), B (all Part I field rules), and I (check sequence and report format). Plus the core OV library and universal Part G calibration notes.
2. **Route layer (`rules/_routes/uk-eu/`)** — rules that depend on origin+destination (UK→EU). Part A sections that change by route: A2 (template versions and page count by second language), A6 (language check by BCP country), A10 (Windsor Framework / boilerplate). Plus the BCP library, generic logistics agents, and route-specific calibrations like `routes/immingham-esbjerg.json`.
3. **Commodity layer (`rules/<commodity>-uk-eu/`)** — rules for a specific commodity on the UK→EU route. Each commodity has a stub `rule_set.md` and a `types/` folder containing one markdown file per certificate type (e.g. `types/8468.md`). Plus commodity-specific libraries (establishments, consignees, destinations) and commodity-specific calibration notes.

Currently registered commodities: `dairy-uk-eu` (8322, 8468), `meat-products-uk-eu` (8384), `petfood-uk-eu` (8324), `composite-uk-eu` (8350), `hatching-eggs-uk-eu` (8436), `egg-products-uk-eu` (8471).

### Composition at request time

`rules/_registry.json` declares one entry per certificate type under `certificateTypes`. Each entry carries an ordered `layerComposition` array such as `["core", "routes.uk-eu", "commodities.dairy-uk-eu"]`, the certificate-specific markdown file (`commodityFile`), and detection patterns (`footerPatterns`, `headerKeywords`) the engine uses to classify incoming PDFs.

At request time, `loadRuleSetForCertificate(certificateType, tenantId)` in `src/check.js`:

1. Reads `_registry.json` and looks up the certificate type.
2. For each layer in composition order, reads the layer's markdown (`rule_set.md` or `route.md`), merges its JSON libraries, and collects calibration notes.
3. Appends the certificate-specific commodity markdown (e.g. `dairy-uk-eu/types/8468.md`).
4. Optionally overlays the tenant practice layer if `tenants[tenantId].practiceLayer` is set.
5. Returns `{ systemPrompt, libraries, calibrationNotes, metadata }` — ready to pass to the Claude API.

For backward compatibility, the deprecated `loadRuleSet(ruleSetId)` remains as a shim that composes a combined rule set across every certificate type under a given commodity id.

### OVs vs Tenants

Two related but distinct concepts:

- **OVs** (`rules/_core/libraries/ovs.json`) — a reference library of known Official Veterinarians whose stamps and signatures the checker should recognise on certificates. Used for cross-reference and for calibration note E4 (SP vs RCVS numbering). This library describes *who might have signed this certificate*.
- **Tenants** (`_registry.json` `tenants` block) — OVs who have given explicit consent to use the application themselves. Each tenant can have an optional practice layer (`_tenants/<id>/`) with personal conventions, local BCP preferences, or practice-specific establishments. This registry describes *who is using this application*.

The tenants block in `_registry.json` is minimal by design. Only OVs who have given explicit consent to use the application are listed as tenants. Currently this is Silvia and Roger (by co-builder consent). Additional OVs (Hector Lopez, Neil Blake, and any others) will be added when they opt in via a future signup or invite flow. This approach applies the same consent principle used for the `ovs.json` library: no personal data without explicit agreement.

## Components

### Frontend (`public/`)

- **`index.html`** — upload form and report display. Fetches libraries from the registry (layered) and POSTs certificate PDF to the backend.
- **`admin.html`** — library management panel. Tab-based UI. Library sub-categories are currently hardcoded for dairy; this will be refactored to read category definitions from the selected layered rule set in a future task.
- **`assets/generate-pdf.js`** — shared native jsPDF generator used by both the Training Report (`index.html`) and the Full Audit Report (`audit.html`). Emits vector text on A4 (not a rasterised screenshot), so output is searchable and small (~50–200 KB).

### Backend (`src/check.js` + `server/server.js`)

All business logic lives in `src/check.js` as portable Node.js with no platform-specific dependencies outside the thin Express handler wrapper. This keeps migration between Node.js environments (Render, Heroku, AWS, on-premise) straightforward.

**Request flow:**

1. Frontend POSTs multipart form data with the EHC PDF.
2. Backend parses the multipart body (busboy) and classifies the uploaded files.
3. Backend detects the certificate type from the PDF footer (e.g. `8468EHC`, `8384EHC`).
4. Backend calls `loadRuleSetForCertificate(detectedType)` to compose core + route + commodity layers for that type. If detection fails, the deprecated `loadRuleSet('dairy-uk-eu')` shim is used as a fallback so behaviour is unchanged from v2.2.
5. Backend builds the system prompt as `ENGINE_PROMPT` + the composed rule set markdown, with the rule set in a `cache_control` block for prompt caching.
6. Backend calls the Anthropic Messages API with the PDF attached as a document and forces tool use of `submit_check_report`.
7. Backend extracts the structured tool input as the report, adds metadata (processing time, tokens used, rule set version), and returns JSON to the frontend.
8. Frontend renders the verdict, flags, and full report.

### Rules layer (`rules/`)

- **`_registry.json`** — three-layer registry. Declares layer folder locations, `certificateTypes` (with detection patterns and `layerComposition`), and `tenants`.
- **`_schema.json`** — JSON schema for the registry and for every library / calibration-note shape used in the layered structure.
- **`_core/`** — universal layer. `rule_set.md`, `libraries/ovs.json`, `calibration-notes.json`.
- **`_routes/<route>/`** — route layer. `route.md`, `libraries/` (BCPs, logistics-agents), `routes/` (route-specific calibrations).
- **`<commodity>/`** — commodity layer. `rule_set.md` (stub), `types/<code>.md` (certificate-specific), `libraries/` (establishments, consignees, destinations), `calibration-notes.json`.

## System prompt construction

The system prompt sent to Claude is built from two top-level parts:

1. **`ENGINE_PROMPT`** — a generic constant in `check.js` describing how to read a certificate PDF, how to use the `submit_check_report` tool, and how to structure the output. Commodity-agnostic. No mention of dairy or EHC numbers.
2. **Layered rule set** — composed dynamically by `loadRuleSetForCertificate()` from the three layers + certificate-specific markdown + optional tenant overlay.

The two parts are concatenated at request time. This keeps the engine's instructions separate from the domain rules, so updating one does not risk corrupting the other.

## Report formats

Every check returns a structured report. The format comes in two flavours:

- **Training Report (I3)** — default. Condensed format for daily operational use: `certificate_info`, `overall_verdict`, `counters`, `flags` (in severity order), and `rule_set_update_recommendations`. The `sections` array is omitted entirely. Calls run with `max_tokens: 4096` to stay well clear of the model's output ceiling.
- **Full Audit Report (I2)** — on demand. Adds the full `sections` array with all five numbered sections (Preliminary Checks, Part I Field-by-Field, Weight/Date/Document Cross-Check, Part II and Stamps, Rule Set Update Recommendations) populated with per-field PASS/FAIL/WARNING/NOTICE checks. Calls run with `max_tokens: 16000` to fit the longer output.

The mode is selected via a query parameter on the same `/api/check` endpoint:

- `POST /api/check?mode=training` (or no `mode` param) → I3
- `POST /api/check?mode=full` → I2

The frontend issues a training call by default. After the report renders, a "Download Full Audit Report" button triggers a second call with the cached `FormData`. The audit-grade response is handed off to `audit.html` via `sessionStorage` and opened in a new tab. The audit page reuses the same renderer (`public/assets/render-report.js`) — both pages share design tokens, components, and layout.

Prompt caching is warm on the second call (the rule set lives in a `cache_control: ephemeral` block), so the audit run pays only the marginal cost of generating the longer output. Input tokens are billed at the cached rate.

Rule reference: Rule Set v3.0 introduced the I3 condensed format alongside the existing I2 audit format. Rule Set v3.1 (April 2026) made I3 the operational default; I2 is on-demand only.

## Deployment portability

Business logic lives in `src/check.js` as portable Node.js. The Express server in `server/server.js` is a thin entry point that mounts routes and middleware — it can be replaced or wrapped without touching business logic. This makes redeployment to other Node.js environments (PM2, Docker, systemd, Nginx + Node) straightforward.

For the current OV team, the app runs on Render.com (Frankfurt EU Central) as a single web service. For Dr. Cunningham's company server post-handover, see [DEPLOYMENT.md](DEPLOYMENT.md) for migration steps.

## Authentication

Authentication is fully isolated in `server/auth.js` — a single ~180-line module that is the only place the auth model is defined. The rest of the app interacts with auth through one middleware (`requireAuth`) and one public endpoint (`GET /api/auth/status`).

**Current model (shared team secret):**

- One environment variable holds the password (`EHC_SHARED_SECRET`)
- Cookies are HMAC-signed with `EHC_COOKIE_SECRET` (the password is never stored in the cookie)
- Sessions persist 30 days with rolling extension on activity
- Constant-time password comparison via `crypto.timingSafeEqual` to avoid timing attacks
- Streaming SSE responses (60–130s `runCheck` operations) survive cookie refresh because expiry is rolling

**Why this model and not email + password?** The four-OV team is small and personally known to one another; a shared password (like an office Wi-Fi password) is the right pattern. Per-user accounts would add a database, password reset flow, and email service for ~80 → ~600 lines of code, with the per-user identity being overwritten anyway when this team migrates to Scooby SSO post-handover.

**Three handover paths** are documented in [DEPLOYMENT.md](DEPLOYMENT.md):

- A. Keep — leave `auth.js` as-is
- B. Replace with SSO — swap the contents of `auth.js` (one file)
- C. Remove auth — delete `auth.js`, drop two lines from `server.js` (for VPN-only deployments)

## Multi-rule-set roadmap

1. **Phase 1 (complete, v2.2):** Single rule set (`dairy-uk-eu`) hardcoded in the backend handler. Monolithic markdown, flat registry.
2. **Phase 2 (complete, v2.7):** Three-layer architecture. Seven certificate types (8322, 8468, 8384, 8324, 8350, 8436, 8471) composed at request time from core + route + commodity layers. Detection patterns wired into the registry; the backend uses detected type to select the composition.
3. **Phase 3 (future):** Tenant signup/invite flow. Additional OV teams onboard via a self-serve flow that creates a per-tenant directory with their own practice conventions on top of the shared core/route/commodity layers.
4. **Phase 4:** Multiple destinations per commodity (`dairy-uk-eu`, `dairy-uk-cn`, `dairy-uk-jp`). Each is a new route layer; commodity markdown stays shared across routes where possible.
