# Architecture

## Design principle: engine vs rule set separation

The EHC Checker is built as a generic certificate verification engine that knows nothing about any specific commodity. All commodity-specific knowledge — which fields to check, which stamps to look for, which establishments are approved, what attestation text to expect — lives in rule sets. The engine loads a rule set at request time and passes it to Claude alongside the certificate PDF.

This separation means adding a new commodity (meat, fish, honey) or a new destination (China, Japan) requires no engine code changes. Only a new rule set folder and a new registry entry.

## Components

### Frontend (`public/`)

- **`index.html`** — upload form and report display. Fetches libraries from `rules/_shared/libraries/` and `rules/<rule-set-id>/libraries/`. POSTs certificate PDF to the backend.
- **`admin.html`** — library management panel. Tab-based UI. Library sub-categories are currently hardcoded for dairy; this will be refactored to read category definitions from the selected rule set in a future task.

### Backend (`netlify/functions/check.js`)

The handler is a Netlify Function for development. All business logic (PDF parsing, Claude API call, report shaping) is written in portable Node.js with no Netlify-specific dependencies outside the thin handler wrapper. This keeps migration to another Node.js runtime (Express, Fastify, standalone server) straightforward.

**Request flow:**

1. Frontend POSTs multipart form data with the EHC PDF.
2. Backend parses the multipart body (busboy).
3. Backend calls `loadRuleSet('dairy-uk-eu')` — for now hardcoded to dairy; future versions will detect the certificate type from the PDF and select the matching rule set from the registry.
4. Backend builds the system prompt as `ENGINE_PROMPT` + rule set markdown, with the rule set in a `cache_control` block for prompt caching.
5. Backend calls the Anthropic Messages API with the PDF attached as a document and forces tool use of `submit_check_report`.
6. Backend extracts the structured tool input as the report, adds metadata (processing time, tokens used, rule set version), and returns JSON to the frontend.
7. Frontend renders the verdict, flags, and full report.

### Rules layer (`rules/`)

- **`_registry.json`** — authoritative list of all rule sets known to the engine. Each entry defines an ID, version, path, certificate types with detection patterns, and enabled flag.
- **`_schema.json`** — JSON schema for validating `_registry.json`.
- **`_shared/libraries/`** — libraries that are identical across rule sets: Official Veterinarians (OVs), Border Control Posts (BCPs), consignees, logistics agents. The same OV signs both dairy and meat certificates; the same BCP handles all commodities.
- **`<rule-set-id>/`** — one folder per rule set. Contains `rule_set.md` (the markdown rule set), `types/` (for future per-certificate-type splits), and `libraries/` (rule-set-specific libraries like establishments, which are commodity-specific).

## Registry-driven rule set selection

The engine loads rule sets by ID via the registry. The `loadRuleSet(ruleSetId)` function:

1. Reads `rules/_registry.json`.
2. Finds the entry with matching ID.
3. Reads the markdown file at `<path>/<ruleSetFile>`.
4. Returns an object with `id`, `name`, `version`, `versionDate`, `markdown`, and `certificateTypes`.

This means the engine never hardcodes a path or a filename. To add a new rule set, you add a folder and a registry entry — zero engine code changes.

## System prompt construction

The system prompt sent to Claude is built from two layers:

1. **`ENGINE_PROMPT`** — a generic constant in `check.js` describing how to read a certificate PDF, how to use the `submit_check_report` tool, and how to structure the output. Commodity-agnostic. No mention of dairy or EHC numbers.
2. **Rule set markdown** — loaded dynamically from the registry. Domain-specific voice of the veterinarian who wrote the rules.

The two layers are concatenated at request time. This keeps the engine's instructions separate from the domain rules, so updating one does not risk corrupting the other.

## Portability

Netlify is the development environment, not the final destination. The app will be handed over to Dr. Cunningham's developer and deployed on a company server (most likely Node.js on Linux). To support this:

- All business logic lives in portable Node.js modules. The Netlify Function handler is a thin wrapper.
- Secrets are read from environment variables with standard names (`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`) — see [ENV.md](ENV.md).
- No Netlify-specific features are used outside the handler wrapper.
- Folder structure (`public/`, `rules/`, `netlify/functions/`) is meaningful in any Node.js runtime, not just Netlify.

## Multi-rule-set roadmap

1. **Phase 1 (current):** Single rule set (`dairy-uk-eu`) hardcoded in the backend handler. The registry structure exists but is not yet used for dynamic selection.
2. **Phase 2:** Certificate type auto-detection from PDF content. Backend reads the registry, matches the incoming PDF against detection patterns (footer code, header keywords), and selects the matching rule set.
3. **Phase 3:** Multiple rule sets enabled in the registry (e.g. `dairy-uk-eu` + `meat-uk-eu`). Admin panel reads library category definitions per rule set.
4. **Phase 4:** Multiple destinations per commodity (`dairy-uk-eu`, `dairy-uk-cn`, `dairy-uk-jp`). Each is an independent rule set in the registry.
