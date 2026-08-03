# Report Integrity Fix — Design

**Date:** 2026-08-03
**Status:** Draft for review
**Branch:** `fix/report-integrity`
**Phase:** 1 of 3 (then: v4.6 sync, then AFI/tanker corrections + v4.7 proposal doc)

## Problem

Two live reports produced headers that contradict their own findings list, in opposite directions:

| Report | Date | Header | Findings list | Failure |
|---|---|---|---|---|
| 26/2/203073 | 28.07.2026 | HOLD, 0 hard / 1 medium / 0 low | **empty** ("No active flags raised") | Counted flag never rendered; checks_performed says "see flag" pointing at nothing |
| 26/2/203141 | 31.07.2026 | **PASS**, 0 / 0 / 0 | **1 HARD flag** (M119 destination approval absent) | False PASS with a hard error — worst-case outcome for BCP trust |

Both occurred after the 21 July deploy (Sonnet 5 + engine v1.5).

## Root causes (from 4-agent investigation, 2026-08-03)

1. **Dual, unreconciled data paths.** Flags reach the client only as incremental SSE
   `flag` events emitted from a partial-JSON buffer (`src/check.js:1031-1070`). Counters
   and verdict reach the client only via the `verdict` SSE event, computed server-side by
   `postProcessReport` (`src/check.js:205-226`) from the final tool-call input. The
   `final_report` event carries **neither flags nor counters** (`src/check.js:1141-1151`).
   Nothing ever compares the two paths. UI metric row and PDF counters read
   `data.counters`; PDF "FINDINGS (N ACTIVE FLAGS)" reads `data.flags.length` — different
   sources, never validated against each other.
2. **Three silent-failure points** (violating the project rule "no silent validation
   failures"):
   - `src/check.js:206` — if the model omits `flags` or sends a non-array,
     post-processing silently bails: model-supplied counters and verdict pass through
     unvalidated, and the `[post-process]` log line never fires.
   - `src/check.js:1032-1037` — flag-emitter parse errors swallowed by an empty catch.
   - `src/check.js:1063-1067` — a flag rejected by the emit guard (missing
     title/description) is dropped permanently with no log and no retry, while still
     being counted server-side.
3. **Schema and API config permit inconsistency.** `overall_verdict`, `counters`, and
   `flags` are three independent schema fields with no coupling. `tool_choice` is
   `auto` and parallel tool use is not disabled (`src/check.js:958`), so the model may
   emit multiple `submit_check_report` blocks — the streamer follows the **last** block
   (`src/check.js:1083-1088`) while `applyReportMeta` reads the **first**
   (`src/check.js:1125`). This is the leading hypothesis for 203141.
4. **Engine v1.5 wording pushed the model toward inconsistent payloads.** No instruction
   says counters must be derived from the final flags array (the only mention is
   "`counters` — flag counts by severity", instructions.md:193). Imperative sentences
   use uppercase labels ("flag it as A10 AMBER", "raise the A9 MEDIUM WARNING") while
   the lowercase enum tokens `hard`/`medium`/`low` appear nowhere in instructions.md.
   Commit 880f18c (FIX-B consolidation) deleted the §2.5 reconciliation paragraph,
   leaving consolidation and dedup rules contradictory.

Evidence check (Render logs, `[post-process]` lines for the two requests) pending —
decisive between "silent bail" and "dropped/diverged payload" per report, but the fix
below covers all confirmed mechanisms regardless.

## Design

Defense in depth: make the server the single authority (guarantee), fix the engine
wording (reduce trigger frequency), make the client reconcile (last line of defense).

### 1. Server — single source of truth, fail loud (`src/check.js`)

- **Force the tool call:** `tool_choice: { type: 'tool', name: 'submit_check_report' }`
  and `disable_parallel_tool_use: true`. If the final message still contains more than
  one `tool_use` block, log loudly and use the **last** block for BOTH streaming and
  final input (same snapshot; never mixed sources).
- **`postProcessReport` becomes a validator, not a best-effort pass:**
  - `flags` missing or non-array → **throw** a structured integrity error (no silent
    bail). The check fails visibly; a wrong report is worse than no report.
  - Always derive `counters` and `overall_verdict` from `flags[]`. Unknown severity
    tokens (anything outside `hard|medium|low`) → integrity error, not a skipped count.
  - Always log `[post-process]` with flags count, per-severity counts, verdict, and
    `flagsEmittedCount` for stream-vs-final comparison.
- **`final_report` carries the authoritative `flags` and `counters`.** The streamed
  `flag` events become preview-only.
- **Retry-once policy:** on integrity error, retry the model call once (same inputs).
  Second failure → SSE `error` event with a clear message ("report failed integrity
  validation — please run the check again"). Never render a report that failed
  validation.
- **Persist the raw final tool input** per check to `data/raw-reports/` (gitignored,
  filename = cert ref + timestamp) so future incidents are diagnosable without relying
  on Render log retention.
- **Emit-guard and parse errors log loudly** (`[flag-emitter]` prefix) instead of
  silent drop / empty catch.

### 2. Client — reconcile on final (`public/index.html`, `render-report.js`, `generate-pdf.js`)

- On `final_report`: **replace** the accumulated streamed flags with the authoritative
  array, re-render the findings block, and use the same object for the PDF. Metric row,
  findings count, and flag cards all read from one snapshot.
- Client-side assertion: if `counters` ≠ recount of `flags[]` (cannot happen after the
  server change, but belt-and-braces), render a visible integrity warning banner instead
  of a normal report.
- `render-report.js` severity fallback (`badge-neutral` for unknown severities) stays,
  but unknown severities can no longer reach the client (server rejects them).

### 3. Engine instructions v1.6 (`rules/_engine/instructions.md`)

- New §: "**Counters and verdict are derived, not authored.** Populate `counters` by
  counting the FINAL `flags` array — after calibration suppression, withdrawn-flag
  removal, consolidation, and deduplication. The server recomputes both and rejects the
  report if they cannot be derived."
- Severity vocabulary: state the enum explicitly — `severity` must be exactly `hard`,
  `medium`, or `low`; RED/AMBER/BLUE are display labels only. Rewrite line 43 ("flag it
  as A10 AMBER" → "emit a flag with `severity: \"medium\"` (AMBER)") and line 63
  likewise.
- Restore the §2.5 reconciliation paragraph deleted by 880f18c, rewritten for the
  consolidated-flag rule: a consolidated repeated-value flag counts ONCE, and its
  compound field reference (e.g. "I.1 / I.11") is one flag for dedup purposes.
- Keep FIX-B consolidation behavior itself (one flag naming every field) — Roger's OV
  preference stands; only the counting/severity ambiguity around it is fixed.
- Doc-control row v1.6; bump `_registry.json` `layers.engine.version` to `1.6`
  (also closing the current 1.4-vs-1.5 mismatch).

### 4. Tests

- Unit: `postProcessReport` — derives counts/verdict; throws on missing/non-array
  flags; throws on unknown severity; multiple-tool_use handling.
- Integration (SSE): streamed flag events vs `final_report.flags` consistency; replace
  tautological tests 16/17 with assertions against fixture payloads (including a
  crafted inconsistent payload → expect integrity error).
- Golden corpus: fill `expectedVerdict` for the 3 manifest entries (assert verdict +
  hard + medium counts only; low notices stay unasserted per known non-determinism).

## Out of scope (later phases, same investigation)

- v4.6 rule set sync (Phase 2) — mapping table ready.
- AFI/tanker prose + library corrections, Viby-J address `10-12` (Silvia confirmed
  2026-08-03), I.11 GB DE 030 HARD ruling, E8 appliesTo (Phase 3).
- v4.7 proposal doc for Roger (end of session): LPC→bulk-tanker wording, M119 severity
  asymmetry 8468 vs 8322, Viby-J correction, E43/E44 severity drift, stale F3 vs F4b
  BSE contradiction (still present in v4.6 master; repo already correct), 3 missing H2
  consignees (Buiteman, Gobia, Dairy Consumer Foods), E12 extra sentence, I.11
  GB DE 030 hard-error ruling.
- `formatLibraries` H-label swap (`src/check.js:130-136`) — Phase 2 hygiene.
- Single-call skeleton refactor (unchanged parked plan).

## Decisions taken

- Integrity failure UX: **block the report** (error + retry-once), do not render with a
  warning. Rationale: OVs act on the header; a rendered-but-wrong report caused this
  incident.
- Streamed flags stay (UX) but are demoted to preview; final report is authoritative.
