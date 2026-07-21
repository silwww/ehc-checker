# Design — Sonnet 5 upgrade, single API call, and Full Report UX

**Date:** 2026-07-20
**Status:** Approved for spec review
**Author:** Silvia + Claude (brainstorming session)

## Overview

Three sequenced improvements to the EHC Checker, in order, each on its own footing so
regressions are attributable:

1. **Sonnet 5 upgrade** — move the checker model from `claude-sonnet-4-6` to
   `claude-sonnet-5`, validated against a saved golden corpus.
2. **Single API call** — collapse today's two independent LLM calls (concise + full) into
   one, so the Full Report is a client-side re-render of an already-computed payload rather
   than a second full re-analysis.
3. **Full Report UX + PDF + mobile** — redesign the Full Report flow (instant page with a
   prominent PDF button), improve the downloaded PDF design, and improve the mobile layout.

Admin panel work stays deferred until after these three phases (explicit user decision).

## Goals

- Run the current, most capable Sonnet model with no verdict regression.
- Eliminate the ~130s wait and the double cost incurred when a user opens the Full Report.
- Guarantee concise and full can never disagree (single source of truth).
- Make "Open Full Report" instant and clear: full report on screen + PDF button.
- Better-looking downloaded PDF; usable mobile layout.
- Replace estimated per-certificate cost with real telemetry.

## Non-goals

- Admin panel features (checks-log CSV, Change Log tab, Training Review) — deferred.
- Rule set content changes — the F3↔F4b BSE contradiction is Roger's call for v4.6, out of
  scope here.
- The reserved `training` flag→rule learning feature — untouched.

---

## Current architecture (as-is)

- `src/check.js` — `runCheckStream({ files, fields, mode, onEvent })` builds an
  `anthropic.messages.stream()` call. `MODEL` defaults to `claude-sonnet-4-6`
  (`src/check.js:26`, env-overridable via `CLAUDE_MODEL`). `mode` is `'concise'` (16k
  max_tokens) or `'full'` (32k max_tokens). Both modes run the SAME field-by-field audit;
  they differ only in output verbosity (concise = short labels + one section; full = five
  sections + narrative).
- `server/server.js` — `POST /api/check/stream` accepts `?mode=concise|full` and streams SSE.
- Client — the main tab runs a concise check. "Open Full Report" opens `public/audit.html`
  in a new tab, which re-sends the same files via `BroadcastChannel('ehc-audit-channel')` /
  `sessionStorage` and fetches `/api/check/stream?mode=full` — **re-running the entire
  analysis from scratch** (~130s), then offers a PDF download.

**Two problems this design creates:**
1. Cost/latency — opening full re-sends the full input (large rule set + PDF + images) and
   re-generates output. Input dominates cost, so this roughly doubles per-certificate cost
   and adds a 2–3 minute wait.
2. Correctness — concise and full are two independent LLM runs and can, in principle,
   disagree on the same certificate.

## Parked work to build on

Branch `refactor/single-call-skeleton` (5 commits ahead of main, WIP at `9cee4c2`) already
contains the foundation:
- `rules/_core/part-i-checklist.json` (220 lines) — machine-readable, content-preserving
  spec of the universal Part I field rules.
- `src/skeleton.js` (290 lines) — `composeSkeleton(certType)` reads the registry + JSON specs
  and builds a **fixed checklist tool schema** (all Part I universal + type-specific rows).
  Commodity-neutral: all type-specific content comes from JSON on disk, never hardcoded.
  Currently **inert** — nothing calls it yet (wiring is sub-phase 3.2b).
- `src/check.js` rewritten (net −190 lines) toward the skeleton composer.
- A parked test fixture problem: `tests/unit/truncation-fail-loud.test.js` fails with
  `REPORT_INCOMPLETE` because it does not emit the checklist rows the WIP composer requires.

---

## Phase 1 — Sonnet 5 upgrade

Small, independent, shippable on its own branch (`chore/sonnet-5-upgrade` off `main`).

### Changes
- `src/check.js:26` — default model `claude-sonnet-4-6` → `claude-sonnet-5`. Stays
  env-overridable via `CLAUDE_MODEL`, so we can A/B without redeploy.
- `public/assets/render-report.js:329` — displayed footer fallback string
  `'claude-sonnet-4-6'` → `'claude-sonnet-5'` (cosmetic only).
- Confirm `max_tokens` remains valid: Sonnet 5 supports 128k max output and 1M context, so
  `32000` (full) and `16000` (concise) are safe with large headroom.
- **Cost telemetry (new):** log `response.usage` (input_tokens, output_tokens, and any cache
  fields) per check to the server log, so we capture real per-certificate token counts and
  can compute exact cost. Small addition; replaces the estimates below with real numbers.

### Validation — golden corpus
- Build a small saved regression corpus: 3–5 representative real certificates + their
  expected verdicts (including the 3 false-positive cases that rule set v4.5 fixed).
- **Storage (decided):** real certificate PDFs live in a **local, git-ignored** folder (e.g.
  `tests/golden/certs/`) and are never committed. Only the non-sensitive, valuable part is
  committed to the repo: a manifest of expected verdicts (cert type, expected flags,
  PASS/FAIL) plus a reference id per certificate. The test harness reads PDFs from the local
  folder if present; if absent (e.g. a fresh clone), the corpus tests skip with a clear
  message rather than fail. Rationale: no real client data ever enters git history (permanent,
  on GitHub, clonable), which also covers future clients who have not consented — the rule
  "no real certificate in git" removes the per-field sensitivity-classification burden
  entirely.
- Run the existing integration suite (`tests/integration/sse-final-report.test.js`) against
  Sonnet 5.
- Run the golden corpus on the branch (locally or Render preview); compare verdicts against
  Sonnet 4.6 output. The 3 previously-false-positive cases must stay clean.
- Triage any new discrepancy before merge.

### Rollback
`CLAUDE_MODEL=claude-sonnet-4-6` env var reverts instantly without a code change or redeploy.

### Cost estimate (to be replaced by telemetry)
Per-token: Sonnet 5 is ~33% cheaper than 4.6 through 2026-08-31 ($2/$10 vs $3/$15), equal
after. Estimated per-certificate cost (assumptions: ~60k input tokens, ~6k output concise /
~20k output full):

| Scenario | Sonnet 4.6 today | Sonnet 5 intro + single-call |
|----------|------------------|------------------------------|
| Concise only (common) | ~$0.27 | ~$0.18 |
| Full opened | ~$0.75 (2 calls) | ~$0.32 (1 call) |

---

## Phase 2 — Single API call (skeleton composer)

On `refactor/single-call-skeleton`, rebased onto the Sonnet-5 `main`.

### Architecture
- One LLM call is given a **deterministic tool schema** from `composeSkeleton(certType)`: all
  Part I universal rows + type-specific rows, resolved generically from the JSON specs.
- The model fills every row once: a verdict + the extracted value + any flag detail. Because
  the schema is fixed, the model fills known slots rather than inventing structure.
- **Concise** renders as today (flags + summary) from the filled skeleton.
- **Full Report** becomes a **client-side re-render** of the same payload — zero extra API
  call, instant.
- Deterministic composition carries the heavy, non-analytical parts of the full report
  (field labels, rules, page structure, and PASS rows for un-flagged fields) from the JSON
  specs, so the model emits compact per-row data, not verbose prose. This keeps the concise
  path only moderately heavier than today (one verdict per row instead of flags-only), not
  full-verbose-heavy.

### No silent failures
The model asserts an explicit verdict for **every** skeleton row. A field the model skips
surfaces visibly as un-filled, never as a silent PASS-by-omission. This is safer than a
composer that infers PASS for anything not flagged.

### What gets removed
- `public/audit.html`'s re-analysis machinery: `BroadcastChannel('ehc-audit-channel')`, file
  re-upload, and the second `fetch('/api/check/stream?mode=full')`.
- The "Takes 2 to 3 minutes" messaging on the Open Full Report control.

### Streaming
Keep the existing progressive SSE model: concise-relevant rows appear as the skeleton fills,
so perceived latency stays low even though one call now produces the full payload.

### Remaining build steps (from handoff)
1. Fix the `tests/unit/truncation-fail-loud.test.js` fixture so it emits the checklist rows
   the composer requires (currently fails with `REPORT_INCOMPLETE`).
2. Wire `composeSkeleton` into `src/check.js` (sub-phase 3.2b — currently inert).
3. Client-side full render from the payload + remove `audit.html` re-fetch machinery.
4. Preserve progressive SSE streaming.

---

## Phase 3 — Full Report UX + PDF + mobile

Enabled by Phase 2 (full is now instant). Design-quality work; invoke the frontend-design
skill at implementation time.

### Full Report flow
"Open Full Report" opens a full-report **page** that renders instantly from the
already-computed payload, with a prominent **Download PDF** button at the top. The user keeps
the on-screen full view (useful for BCP queries) and downloads the PDF on demand. (Chosen over
direct-to-PDF and inline-expand.)

### Downloaded PDF design
Improve the visual design of the generated PDF (`public/assets/generate-pdf.js`). Specifics
to be defined at implementation time with the frontend-design skill.

### Mobile
Improve the mobile layout of the report views. Specific breakpoints and issues to be
enumerated at implementation time.

---

## Testing strategy

- **Phase 1:** integration suite against Sonnet 5 + golden corpus verdict comparison; the 3
  known false-positive cases must stay clean.
- **Phase 2:** fix and pass `truncation-fail-loud` unit test; add/keep unit tests for
  `composeSkeleton`; assert concise and full render from the same payload (they cannot
  disagree); integration test that a single call produces both views.
- **Phase 3:** manual/visual verification of the Full Report page, PDF output, and mobile
  layout; Playwright where practical.

## Risks & open questions

- **Golden corpus storage** — resolved: local git-ignored certs + committed verdict manifest
  (see Phase 1). No redaction needed; no real client data in git.
- **Concise path weight** — one verdict per skeleton row is heavier than today's flags-only
  concise; Sonnet 5's speed should offset it, but measure via telemetry.
- **Prompt caching** — previously removed because the 5-min TTL was ineffective for
  spaced-out checks; a future lever if checks arrive in bursts (90% input savings). Out of
  scope here, noted.
- **Rebase** — `refactor/single-call-skeleton` must rebase cleanly onto the Sonnet-5 `main`
  before Phase 2 resumes.

## Sequencing & branches

1. `chore/sonnet-5-upgrade` off `main` → validate → merge.
2. Rebase `refactor/single-call-skeleton` onto new `main` → complete single-call → merge.
3. Phase 3 branch off `main` → UX + PDF + mobile → merge.
4. (Later) Admin panel features.
