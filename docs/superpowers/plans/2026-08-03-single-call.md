# Phase 2 — Single API Call Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One LLM call produces a payload that renders BOTH the concise report and the Full Report — audit.html stops re-fetching (~130s and ~$0.25 saved per full view), and concise/full can never disagree.

**Architecture:** Recover the parked `composeSkeleton(certType)` composer (deterministic, commodity-neutral, reads registry + JSON specs) and wire it into the CURRENT main `src/check.js` (the branch's check.js rewrite is stale — do NOT rebase). The concise (default) mode's tool schema gains a fixed `checklist` object property — one required row per pre-composed skeleton row, so the model fills known slots (verdict + observed value + note) with no PASS-by-omission. `final_report` carries the filled `checklist` plus the deterministic `checklist_rows` metadata (labels/rules/expected states from the JSON specs); the Full Report page becomes a client-side re-render of that payload via a shared `checklistToSections()` converter feeding the EXISTING full-mode section renderers (HTML + PDF). audit.html's BroadcastChannel/re-fetch machinery is removed; handoff is a sessionStorage copy at `window.open` time.

**Tech Stack:** Node >= 20 (`node:test` runner), Express, `@anthropic-ai/sdk` `messages.stream()`, `partial-json`, vanilla-JS browser assets (no bundler), jsPDF.

## Global Constraints

- Branch: `feat/single-call` off `main` @ `dad81a1`. Do NOT rebase or merge `refactor/single-call-skeleton`; recover its two files via `git show` only (its `src/check.js` rewrite pre-dates the integrity architecture and is discarded).
- `postProcessReport` contract is UNCHANGED: `flags[]` stays the authoritative findings source; counters and `overall_verdict` are derived from flags; `REPORT_INTEGRITY` retry-once semantics, `reset_flags`, `persistRawReport`, `disable_parallel_tool_use`, last-block selection, and per-block emit-counter resets are untouched.
- Checklist enforcement is WARN-level, never `REPORT_INTEGRITY` (Decision D1 below). Un-filled rows fail VISIBLY in the render ("NOT REPORTED"), never silently.
- Concise on-screen UX is unchanged: streamed flags, verdict, the single "Checks Performed" section (`sections[0]`) all render exactly as today.
- Never run `tests/integration/*` or the golden corpus during implementation — the final live-validation session (Task 9) runs them once. Unit tests only: `npm test`.
- All new unit test files set `process.env.EHC_NO_RAW_PERSIST = '1'` BEFORE requiring `src/check.js`.
- No new npm dependencies. Real certificates never enter git.
- Engine instructions bump to **v1.7**; registry `layers.engine.version` bumps to `1.7` / `2026-08-03`.

## Resolved Open Questions (positions, one-line justifications)

- **D1 — checklist vs flags/counters:** `checklist` is a NEW field alongside the existing `flags`/`counters` contract; flags stay authoritative for verdict/counters, checklist rows carry per-field verdicts+values for the full render; cross-validation (missing rows, checklist findings with empty flags) is `console.warn` `[checklist-integrity]` only — a mismatch cannot corrupt the verdict, and a hard retry would double API cost over a cosmetic inconsistency while un-filled rows already fail visibly as "NOT REPORTED".
- **D2 — token budget:** single-call `max_tokens: 32000` (was 24k concise / 32k full) — the 8322 skeleton is 47 rows × ~50-70 output tokens ≈ +3.3k over the observed 15.4k Sonnet 5 concise peak (thinking included), so 32k keeps ~65% headroom and simply reuses the retired full budget.
- **D3 — `?mode=full`:** keep accepted and fully functional but log a deprecation warning; removal rides Phase 3 (which rewrites audit.html/PDF anyway) so manual/test flows and rolling deploys never break mid-transition.
- **D4 — `sections[]`:** the concise single "Checks Performed" section stays exactly as today (streaming + concise render untouched); the Full Report renders from `checklist` via `checklistToSections()`, and the model is never asked for 5 verbose sections in single-call mode.
- **D5 — engine instructions / schema migration:** instructions v1.7 rewrites §7 Concise as the single-call mode (adds the checklist duty) and adds a §6 note that the `checklist` schema property is injected at runtime per certificate type by the server; the schema itself lives in code (`composeSkeleton`), never in the markdown.

## File Map

- Recover+extend: `src/skeleton.js` (composer + validator), `rules/_core/part-i-checklist.json` (24 universal Part I rows)
- Already on main: `rules/dairy-uk-eu/types/8322-checklist.json` (18 C6 + 4 C10 rows)
- Modify: `src/check.js` (buildCheckParams schema injection + meta, final_report payload, warn-validation), `server/server.js` (mode=full deprecation log), `rules/_engine/instructions.md` (§6/§7, v1.7), `rules/_registry.json` (engine version), `public/assets/render-report.js` (`checklistToSections` + render path + copy), `public/index.html` (final_report fields + instant handoff), `public/audit.html` (strip re-fetch machinery), `public/assets/generate-pdf.js` (full PDF from checklist)
- New tests: `tests/unit/compose-skeleton.test.js`, `tests/unit/checklist-validate.test.js`, `tests/unit/single-call-checklist.test.js`

---

### Task 1: Recover the skeleton composer and Part I spec; add render metadata

**Files:**
- Create: `src/skeleton.js` (recovered from `refactor/single-call-skeleton`, then extended)
- Create: `rules/_core/part-i-checklist.json` (recovered verbatim)
- Test: `tests/unit/compose-skeleton.test.js`

**Interfaces:**
- Produces: `composeSkeleton(certType) -> { rows, checklistSchema }` where `rows` is an ordered array of `{ id, rowClass: 'verdict'|'perception', family: 'part_i'|'c6'|'c10'|'page_structure', label, fieldRef?, rule?, clauseRef?, expected?, notes?, expectedEntry? }` and `checklistSchema` is a JSON-schema object `{ type:'object', required:[...all row ids], properties:{ [id]: perRowSchema } }`. Consumed by Tasks 3-4 (server) and mirrored client-side in Task 6 via the `checklist_rows` payload.

- [ ] **Step 1: Create the branch**

```bash
cd /Users/sorina/Documents/Claude/projects/ehc-checker-app
git checkout -b feat/single-call main
```

- [ ] **Step 2: Recover the two parked files (file-level only, no rebase)**

```bash
git show refactor/single-call-skeleton:rules/_core/part-i-checklist.json > rules/_core/part-i-checklist.json
git show refactor/single-call-skeleton:src/skeleton.js > src/skeleton.js
```

- [ ] **Step 3: Write the failing test**

Create `tests/unit/compose-skeleton.test.js`:

```js
'use strict';

// Deterministic unit coverage for the fixed-checklist skeleton composer
// (src/skeleton.js), recovered from refactor/single-call-skeleton and
// extended with render metadata (rule / expected / notes per row) so the
// client can render the Full Report deterministically from checklist_rows.
//
// Row-count expectations are pinned to the specs on disk:
//   rules/_core/part-i-checklist.json          -> 24 partIFields rows
//   rules/dairy-uk-eu/types/8322-checklist.json -> 18 partIIClauses + 4 blank-field rows
// plus the always-present synthetic page_structure row.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { composeSkeleton } = require('../../src/skeleton');

describe('composeSkeleton', () => {
  it('8322: composes 24 Part I + 18 C6 + 4 C10 + 1 page_structure = 47 rows, schema requires every id', () => {
    const { rows, checklistSchema } = composeSkeleton('8322');
    assert.equal(rows.length, 47);
    assert.equal(rows.filter(r => r.family === 'part_i').length, 24);
    assert.equal(rows.filter(r => r.family === 'c6').length, 18);
    assert.equal(rows.filter(r => r.family === 'c10').length, 4);
    assert.equal(rows.filter(r => r.family === 'page_structure').length, 1);
    assert.equal(rows[rows.length - 1].id, 'page_structure');

    assert.equal(checklistSchema.type, 'object');
    assert.equal(checklistSchema.required.length, 47);
    assert.deepEqual(checklistSchema.required, rows.map(r => r.id));
    for (const row of rows) {
      assert.ok(checklistSchema.properties[row.id], `schema missing property for row ${row.id}`);
    }
  });

  it('8322: row ids are stable, deterministic slugs (spot checks)', () => {
    const { rows } = composeSkeleton('8322');
    const ids = rows.map(r => r.id);
    assert.equal(ids[0], 'i_1_consignor_exporter');
    assert.ok(ids.includes('ii_1_country_fmd'), 'first C6 clause slug');
    assert.ok(ids.some(id => id.startsWith('c10_')), 'C10 rows carry the c10_ prefix');
  });

  it('two calls produce deep-equal output (deterministic composition)', () => {
    assert.deepEqual(composeSkeleton('8322'), composeSkeleton('8322'));
  });

  it('8468 (no type spec on disk yet): graceful — Part I + page_structure only (25 rows)', () => {
    const { rows } = composeSkeleton('8468');
    assert.equal(rows.length, 25);
    assert.equal(rows.filter(r => r.family === 'c6').length, 0);
    assert.equal(rows.filter(r => r.family === 'c10').length, 0);
  });

  it('unknown certificate type throws (fail-loud)', () => {
    assert.throws(() => composeSkeleton('9999'), /unknown certificate type/);
  });

  it('rows carry the render metadata the Full Report needs', () => {
    const { rows } = composeSkeleton('8322');
    const i1 = rows.find(r => r.id === 'i_1_consignor_exporter');
    assert.equal(i1.rowClass, 'verdict');
    assert.equal(i1.fieldRef, 'I.1');
    assert.match(i1.rule, /Must be populated/);

    const c6 = rows.find(r => r.id === 'ii_1_country_fmd');
    assert.equal(c6.rowClass, 'perception');
    assert.equal(c6.clauseRef, 'II.1');
    assert.equal(c6.expected, 'RETAIN');

    const c10 = rows.find(r => r.family === 'c10');
    assert.equal(c10.rowClass, 'perception');
    assert.ok(typeof c10.expectedEntry === 'string' && c10.expectedEntry.length > 0);
  });

  it('perception rows never carry a verdict property in the schema; verdict rows always do', () => {
    const { rows, checklistSchema } = composeSkeleton('8322');
    for (const row of rows) {
      const props = checklistSchema.properties[row.id].properties;
      if (row.rowClass === 'verdict') {
        assert.ok(props.verdict, `verdict row ${row.id} missing verdict property`);
        assert.deepEqual(props.verdict.enum, ['PASS', 'HARD', 'MEDIUM', 'LOW', 'NA']);
      } else {
        assert.equal(props.verdict, undefined, `perception row ${row.id} must not judge`);
        assert.ok(props.observed.enum, `perception row ${row.id} needs an observed enum`);
      }
    }
  });
});
```

- [ ] **Step 4: Run the test — the metadata assertions must fail**

Run: `node --test tests/unit/compose-skeleton.test.js`
Expected: FAIL — the recovered composer builds rows as `{ id, rowClass, family, label }` only, so `fieldRef` / `rule` / `clauseRef` / `expected` / `expectedEntry` assertions fail. (Row counts and determinism should already pass.)

- [ ] **Step 5: Extend the recovered composer with render metadata**

In `src/skeleton.js`, inside `composeSkeleton`, replace the three `rows.push({...})` loops (Part I, C6, C10) and the page_structure push with:

```js
  // Part I rows (verdict). One per partIFields entry, in source order.
  const partIFields = Array.isArray(coreSpec.partIFields) ? coreSpec.partIFields : [];
  for (const entry of partIFields) {
    rows.push({
      id: slug(entry.field + ' ' + entry.label),
      rowClass: 'verdict',
      family: 'part_i',
      label: entry.label,
      fieldRef: entry.field,
      rule: entry.rule || ''
    });
  }
```

```js
    // C6 rows (perception). One per partIIClauses entry, in source order.
    const clauses = Array.isArray(typeSpec.partIIClauses) ? typeSpec.partIIClauses : [];
    for (const clause of clauses) {
      rows.push({
        id: slug(clause.clause + ' ' + clause.label),
        rowClass: 'perception',
        family: 'c6',
        label: clause.label,
        clauseRef: clause.clause,
        expected: clause.expected,
        notes: clause.notes || ''
      });
    }

    // C10 rows (perception). One per blankFieldsRequiringAdjacentStamp entry.
    const blanks = Array.isArray(typeSpec.blankFieldsRequiringAdjacentStamp)
      ? typeSpec.blankFieldsRequiringAdjacentStamp
      : [];
    for (const blank of blanks) {
      rows.push({
        id: 'c10_' + slug(blank.section + ' ' + blank.field),
        rowClass: 'perception',
        family: 'c10',
        label: blank.section + ' — ' + blank.field,
        expectedEntry: blank.expectedEntry || ''
      });
    }
```

```js
  // Page structure row (verdict). Exactly one, always present.
  rows.push({
    id: 'page_structure',
    rowClass: 'verdict',
    family: 'page_structure',
    label: 'Page structure / count',
    rule: typeSpec && typeSpec.pageStructure
      ? 'Expected page structure: ' + JSON.stringify(typeSpec.pageStructure)
      : 'Verify declared vs actual pagination and per-page reference consistency.'
  });
```

Also update the module header comment: change "INERT AS OF 3.2a" to "Wired into src/check.js buildCheckParams (Phase 2 single-call, 2026-08-03)."

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test tests/unit/compose-skeleton.test.js`
Expected: PASS (7 tests). The 8468 test prints the composer's graceful `skeleton: no type spec…` warning — expected.

- [ ] **Step 7: Run the whole unit suite to prove nothing regressed**

Run: `npm test`
Expected: PASS — the new module is not yet imported by anything else.

- [ ] **Step 8: Commit**

```bash
git add src/skeleton.js rules/_core/part-i-checklist.json tests/unit/compose-skeleton.test.js
git commit -m "feat(skeleton): recover composeSkeleton + Part I spec from parked branch, add render metadata"
```

---

### Task 2: Warn-level checklist coverage validator

**Files:**
- Modify: `src/skeleton.js` (add + export `validateChecklistAgainstSkeleton`)
- Test: `tests/unit/checklist-validate.test.js`

**Interfaces:**
- Produces: `validateChecklistAgainstSkeleton(checklist, rows) -> { missingRowIds: string[], unknownRowIds: string[], findingRowIds: string[] }` — pure, never throws. Consumed by Task 4 (`src/check.js` logs `[checklist-integrity]` warnings from it).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/checklist-validate.test.js`:

```js
'use strict';

// Pure-function coverage for validateChecklistAgainstSkeleton — the
// WARN-level (never REPORT_INTEGRITY, Decision D1) reconciliation between
// the model-filled checklist and the deterministic skeleton rows.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { validateChecklistAgainstSkeleton } = require('../../src/skeleton');

const ROWS = [
  { id: 'i_1_consignor_exporter', rowClass: 'verdict', family: 'part_i', label: 'Consignor / Exporter' },
  { id: 'ii_1_country_fmd', rowClass: 'perception', family: 'c6', label: 'Country/FMD', expected: 'RETAIN' },
  { id: 'page_structure', rowClass: 'verdict', family: 'page_structure', label: 'Page structure / count' }
];

describe('validateChecklistAgainstSkeleton', () => {
  it('full coverage, all PASS: no missing, no unknown, no findings', () => {
    const checklist = {
      i_1_consignor_exporter: { verdict: 'PASS', observed: 'Saputo Dairy UK' },
      ii_1_country_fmd: { observed: 'not_struck', confidence: 'high' },
      page_structure: { verdict: 'PASS', observed: '10 of 10' }
    };
    assert.deepEqual(validateChecklistAgainstSkeleton(checklist, ROWS), {
      missingRowIds: [], unknownRowIds: [], findingRowIds: []
    });
  });

  it('reports missing rows (no PASS-by-omission) and unknown ids', () => {
    const checklist = {
      i_1_consignor_exporter: { verdict: 'PASS' },
      invented_row: { verdict: 'PASS' }
    };
    const v = validateChecklistAgainstSkeleton(checklist, ROWS);
    assert.deepEqual(v.missingRowIds, ['ii_1_country_fmd', 'page_structure']);
    assert.deepEqual(v.unknownRowIds, ['invented_row']);
  });

  it('collects HARD/MEDIUM/LOW verdict rows as findingRowIds', () => {
    const checklist = {
      i_1_consignor_exporter: { verdict: 'MEDIUM', observed: 'GREAT BRITAN', note: 'A10 typo' },
      ii_1_country_fmd: { observed: 'struck', confidence: 'high' },
      page_structure: { verdict: 'PASS' }
    };
    const v = validateChecklistAgainstSkeleton(checklist, ROWS);
    assert.deepEqual(v.findingRowIds, ['i_1_consignor_exporter']);
  });

  it('never throws on null / non-object checklist — everything reported missing', () => {
    const v = validateChecklistAgainstSkeleton(null, ROWS);
    assert.equal(v.missingRowIds.length, 3);
    assert.deepEqual(v.unknownRowIds, []);
    assert.deepEqual(v.findingRowIds, []);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/checklist-validate.test.js`
Expected: FAIL with `validateChecklistAgainstSkeleton is not a function`.

- [ ] **Step 3: Implement in `src/skeleton.js`**

Add above `module.exports` and export it:

```js
const CHECKLIST_FINDING_VERDICTS = ['HARD', 'MEDIUM', 'LOW'];

/**
 * WARN-level reconciliation between the model-filled checklist and the
 * deterministic skeleton rows (Decision D1: flags stay authoritative for
 * the verdict; a checklist gap is a visibility problem, not a retry
 * trigger). Pure and total — never throws, tolerates any checklist shape.
 *
 * Returns { missingRowIds, unknownRowIds, findingRowIds }:
 *   missingRowIds — skeleton rows the model did not fill (rendered as
 *                   "NOT REPORTED" by the client; no PASS-by-omission).
 *   unknownRowIds — filled ids not in the skeleton (model invention;
 *                   ignored by the renderer).
 *   findingRowIds — verdict rows filled with HARD/MEDIUM/LOW (used to
 *                   cross-check against the flags array).
 */
function validateChecklistAgainstSkeleton(checklist, rows) {
  const filled = (checklist && typeof checklist === 'object' && !Array.isArray(checklist)) ? checklist : {};
  const skeletonIds = new Set(rows.map((r) => r.id));
  return {
    missingRowIds: rows.filter((r) => !(r.id in filled)).map((r) => r.id),
    unknownRowIds: Object.keys(filled).filter((id) => !skeletonIds.has(id)),
    findingRowIds: rows
      .filter((r) => {
        const entry = filled[r.id];
        return entry && typeof entry === 'object' && CHECKLIST_FINDING_VERDICTS.includes(entry.verdict);
      })
      .map((r) => r.id)
  };
}

module.exports = { composeSkeleton, validateChecklistAgainstSkeleton };
```

(Replace the existing `module.exports = { composeSkeleton };` line.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/checklist-validate.test.js tests/unit/compose-skeleton.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/skeleton.js tests/unit/checklist-validate.test.js
git commit -m "feat(skeleton): validateChecklistAgainstSkeleton — warn-level checklist coverage report"
```

---

### Task 3: Server wiring — inject the checklist schema into the single call

**Files:**
- Modify: `src/check.js` (imports at ~line 22; `buildCheckParams` at lines 867 `effectiveCertType`, 934-976 concise `modeInstruction`, 1016 `maxTokens`, 1038 `tools`, 1049-1058 return `meta`)
- Test: `tests/unit/single-call-checklist.test.js` (new — reuses the retry-integrity mock harness, plus captures the params passed to `messages.stream`)

**Interfaces:**
- Consumes: `composeSkeleton(certType)` from Task 1.
- Produces: `buildCheckParams` returns `meta.checklistRows` (the skeleton `rows` array, or `null` in deprecated full mode); `params.tools[0].input_schema` gains a required `checklist` property in concise mode; `params.max_tokens === 32000` in both modes. Task 4 consumes `meta.checklistRows`.

- [ ] **Step 1: Write the failing test (harness + params-capture scenarios)**

Create `tests/unit/single-call-checklist.test.js`:

```js
'use strict';

// Deterministic coverage for Phase 2 single-call wiring: the checklist
// schema injected into the tool definition per certificate type, the
// filled checklist riding final_report together with the deterministic
// checklist_rows, and the WARN-only behaviour on partial coverage.
//
// Isolation: same Module.prototype.require hook as retry-integrity.test.js
// (read that file first if this one is unclear) — the Anthropic SDK is
// mocked BEFORE src/check.js is required; no network, no API key. The
// mock additionally CAPTURES the params object handed to messages.stream
// so the injected tool schema can be asserted directly.

process.env.EHC_NO_RAW_PERSIST = '1';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let streamQueue = [];
let capturedParams = [];

function enqueueStream(stream) { streamQueue.push(stream); }

function makeFinalOnlyStream(finalMessage) {
  return {
    [Symbol.asyncIterator]() {
      return { next: async () => ({ value: undefined, done: true }) };
    },
    controller: { abort() {} },
    finalMessage: async () => finalMessage
  };
}

class MockAnthropic {
  constructor() {
    this.messages = {
      stream: (params) => {
        capturedParams.push(params);
        if (streamQueue.length === 0) {
          throw new Error('Test bug: streamQueue empty — enqueue one stream per expected call');
        }
        return streamQueue.shift();
      }
    };
  }
}

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === '@anthropic-ai/sdk') return MockAnthropic;
  return originalRequire.apply(this, arguments);
};
const { runCheckStream } = require('../../src/check');
Module.prototype.require = originalRequire;

const { composeSkeleton } = require('../../src/skeleton');

function makeFiles() {
  return [{
    filename: 'EHC 26-2-097680.pdf',
    buffer: Buffer.from('not a real pdf'),
    mimetype: 'application/pdf'
  }];
}

// 8322 has a type checklist spec on disk -> the full 47-row skeleton.
const FIELDS = { certTypeOverride: '8322' };

// A fully-filled checklist matching the 8322 skeleton: PASS/observed for
// every verdict row, matches-expected observation for every perception row.
function makeFilledChecklist() {
  const { rows } = composeSkeleton('8322');
  const filled = {};
  for (const row of rows) {
    if (row.rowClass === 'verdict') {
      filled[row.id] = { verdict: 'PASS', observed: 'as printed' };
    } else if (row.family === 'c6') {
      filled[row.id] = { observed: row.expected === 'DELETE' ? 'struck' : 'not_struck', confidence: 'high' };
    } else {
      filled[row.id] = { observed: 'stamped', confidence: 'high' };
    }
  }
  return filled;
}

function baseInput(overrides) {
  return Object.assign({
    certificate_info: { certificate_ref: '26/2/097680' },
    flags: [],
    sections: [{ section_number: 1, title: 'Checks Performed', checks: [] }],
    rule_set_update_recommendations: ''
  }, overrides);
}

function captureOnEvent() {
  const calls = [];
  return { calls, onEvent: (name, data) => calls.push({ name, data }) };
}

beforeEach(() => { streamQueue = []; capturedParams = []; });

describe('single-call wiring — checklist schema injection (buildCheckParams)', () => {
  it('concise call carries a required checklist property with one required entry per skeleton row, max_tokens 32000', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({ checklist: makeFilledChecklist() }) }]
    }));

    const { onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    assert.equal(capturedParams.length, 1);
    const params = capturedParams[0];
    assert.equal(params.max_tokens, 32000);

    const schema = params.tools[0].input_schema;
    assert.ok(schema.required.includes('checklist'), 'checklist must be a required top-level property');
    const { rows } = composeSkeleton('8322');
    assert.deepEqual(schema.properties.checklist.required, rows.map(r => r.id));
    assert.ok(schema.properties.checklist.description.length > 0);
  });

  it('deprecated full mode does NOT inject checklist (legacy 5-section path untouched)', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const schema = capturedParams[0].tools[0].input_schema;
    assert.ok(!schema.required.includes('checklist'));
    assert.equal(schema.properties.checklist, undefined);
    assert.equal(capturedParams[0].max_tokens, 32000);
  });

  it('the module-level TOOL_DEFINITION is not mutated across calls (clone-per-request)', async () => {
    // Call 1: concise (injects checklist into a clone).
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({ checklist: makeFilledChecklist() }) }]
    }));
    const a = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent: a.onEvent });

    // Call 2: full — must see the pristine definition, not call 1's clone.
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));
    const b = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent: b.onEvent });

    assert.equal(capturedParams[1].tools[0].input_schema.properties.checklist, undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/single-call-checklist.test.js`
Expected: FAIL — `max_tokens` is 24000 in concise, `schema.required` lacks `'checklist'`, `schema.properties.checklist` is undefined.

- [ ] **Step 3: Implement the wiring in `src/check.js`**

3a. Add the import next to the other local requires (~line 22):

```js
const { composeSkeleton, validateChecklistAgainstSkeleton } = require('./skeleton');
```

3b. In `buildCheckParams`, immediately after `const effectiveCertType = resolvedCertType;` (line 867), add:

```js
  // Phase 2 single-call: compose the fixed checklist skeleton for this
  // certificate type and inject it into a per-request CLONE of the tool
  // definition (the module-level TOOL_DEFINITION must stay pristine).
  // Concise (the default) IS the single-call mode; the deprecated
  // ?mode=full path keeps the legacy 5-section schema untouched (D3).
  // composeSkeleton is fail-loud on a broken spec file — a corrupt spec
  // must stop the check visibly, never produce a partial skeleton.
  let checklistRows = null;
  let toolDefinition = TOOL_DEFINITION;
  if (mode === 'concise') {
    const skeleton = composeSkeleton(effectiveCertType);
    checklistRows = skeleton.rows;
    toolDefinition = JSON.parse(JSON.stringify(TOOL_DEFINITION));
    toolDefinition.input_schema.properties.checklist = Object.assign(
      {
        description: 'Fixed per-field checklist for this certificate type. Fill EVERY required row id — a skipped row is shown to the OV as NOT REPORTED, never as a pass. Verdict rows judge against the rule set; perception rows report only what is seen.'
      },
      skeleton.checklistSchema
    );
    toolDefinition.input_schema.required = toolDefinition.input_schema.required.concat(['checklist']);
    console.log(`[check] checklist skeleton composed for ${effectiveCertType}: ${skeleton.rows.length} rows`);
  }
```

3c. In the concise `modeInstruction` template string (the branch ending "...Concise must not under-report relative to it.", line 976), append before the closing backtick:

```text

FIXED CHECKLIST (single-call payload — REQUIRED):
The tool schema for this request contains a \`checklist\` object with one REQUIRED property per
pre-composed row id. You MUST fill EVERY row. There is no PASS-by-omission: a row you skip is
rendered to the OV as "NOT REPORTED", never as a pass.
- Rows whose schema has a \`verdict\` property: judge the field against the rule set. verdict is
  PASS / HARD / MEDIUM / LOW / NA; \`observed\` is the exact value as printed (observe literally,
  do not auto-correct); \`note\` is populated when the verdict is not PASS.
- Rows whose schema has an \`observed\` enum (perception rows — Part II strike state, adjacent
  stamps): report ONLY what you see, with \`confidence\`. Do NOT decide what should be struck or
  stamped — the rule layer owns that judgement.
- The checklist does not replace \`flags\`: every HARD / MEDIUM / LOW checklist verdict must have a
  corresponding entry in \`flags\` (one root cause, one flag — §2.5 consolidation applies), and
  \`counters\` are still derived strictly from the final \`flags\` array.
- Emit \`flags\` BEFORE \`checklist\` in the tool input so findings stream progressively.
```

3d. Replace the `maxTokens` block (lines 1012-1016):

```js
  // Single-call budget (Phase 2): the filled checklist adds ~47 rows ×
  // ~50-70 output tokens (~3.3k) on top of the observed 15.4k Sonnet 5
  // concise peak (thinking included), so both modes now share the retired
  // full budget: 32k, ~65% headroom, well under Sonnet 5's 128k ceiling.
  const maxTokens = 32000;
```

3e. In `params`, change `tools: [TOOL_DEFINITION],` (line 1038) to:

```js
    tools: [toolDefinition],
```

3f. Extend the returned `meta` (lines 1050-1057):

```js
    meta: {
      mode,
      requestStart,
      ruleSet,
      engineLayer,
      effectiveCertType,
      checklistRows
    }
```

- [ ] **Step 4: Run the new test to verify the injection scenarios pass**

Run: `node --test tests/unit/single-call-checklist.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the whole unit suite — retry/truncation/post-process harnesses must be untouched**

Run: `npm test`
Expected: PASS. In particular `tests/unit/retry-integrity.test.js` and `tests/unit/truncation-fail-loud.test.js` still pass: checklist absence is warn-only, so their fixtures (which emit no checklist) must NOT fail — this is exactly the parked-branch `REPORT_INCOMPLETE` fixture problem, designed out by Decision D1.

- [ ] **Step 6: Commit**

```bash
git add src/check.js tests/unit/single-call-checklist.test.js
git commit -m "feat(check): single-call wiring — checklist schema injected per certType, 32k budget"
```

---

### Task 4: final_report carries the filled checklist; warn-level integrity; mode=full deprecation log

**Files:**
- Modify: `src/check.js` (`runCheckStreamAttempt` finalisation, lines 1285-1314)
- Modify: `server/server.js` (mode resolution, line 189)
- Test: `tests/unit/single-call-checklist.test.js` (extend)

**Interfaces:**
- Consumes: `meta.checklistRows` (Task 3), `validateChecklistAgainstSkeleton` (Task 2).
- Produces: the `final_report` SSE event gains `checklist` (model-filled object or `null`) and `checklist_rows` (skeleton metadata array or `null`). Tasks 6-8 consume both fields client-side. The authoritative `flags`/`counters`/`overall_verdict` trio is unchanged.

- [ ] **Step 1: Write the failing tests (append to `tests/unit/single-call-checklist.test.js`)**

```js
describe('single-call finalisation — checklist on final_report', () => {
  it('final_report carries the filled checklist and the deterministic checklist_rows', async () => {
    const filled = makeFilledChecklist();
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({ checklist: filled }) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.ok(fr, 'final_report must be emitted');
    assert.deepEqual(fr.data.checklist, filled);
    const { rows } = composeSkeleton('8322');
    assert.equal(fr.data.checklist_rows.length, rows.length);
    assert.equal(fr.data.checklist_rows[0].id, 'i_1_consignor_exporter');
    assert.ok(fr.data.checklist_rows[0].rule.length > 0, 'rows carry render metadata');
    // Authoritative trio untouched:
    assert.deepEqual(fr.data.counters, { hard_errors: 0, medium_warnings: 0, low_notices: 0 });
    assert.equal(fr.data.overall_verdict, 'PASS');
  });

  it('partial checklist is WARN-only: no throw, final_report still emitted, flags contract intact', async () => {
    const mediumFlag = { severity: 'medium', field_reference: 'I.1', title: 'Typo', description: 'GREAT BRITAN in I.1.' };
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{
        type: 'tool_use',
        input: baseInput({
          flags: [mediumFlag],
          checklist: { i_1_consignor_exporter: { verdict: 'MEDIUM', observed: 'GREAT BRITAN', note: 'A10' } }
        })
      }]
    }));

    const { calls, onEvent } = captureOnEvent();
    const report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(Object.keys(fr.data.checklist).length, 1);
    assert.equal(fr.data.checklist_rows.length, 47);
    assert.deepEqual(report.counters, { hard_errors: 0, medium_warnings: 1, low_notices: 0 });
    assert.equal(report.overall_verdict, 'HOLD');
  });

  it('missing checklist entirely (model ignored the mandate) — warn-only, checklist:null on final_report', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(fr.data.checklist, null);
    assert.equal(fr.data.checklist_rows.length, 47);
  });

  it('deprecated full mode: final_report carries checklist:null and checklist_rows:null', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(fr.data.checklist, null);
    assert.equal(fr.data.checklist_rows, null);
  });
});
```

- [ ] **Step 2: Run test to verify the new scenarios fail**

Run: `node --test tests/unit/single-call-checklist.test.js`
Expected: FAIL — `fr.data.checklist` / `fr.data.checklist_rows` are `undefined`.

- [ ] **Step 3: Implement in `src/check.js`**

3a. In `runCheckStreamAttempt`, after `const report = applyReportMeta(toolUseBlock.input, meta, usage, processingTime);` (line 1287) and before the flag-count `[integrity]` warn, add:

```js
  // Phase 2 single-call: warn-level checklist reconciliation (Decision D1).
  // Flags stay authoritative for verdict/counters; a checklist gap fails
  // VISIBLY in the render ("NOT REPORTED"), never via a paid retry.
  if (meta.checklistRows) {
    const v = validateChecklistAgainstSkeleton(report.checklist, meta.checklistRows);
    if (v.missingRowIds.length > 0) {
      console.warn(`[checklist-integrity] ${v.missingRowIds.length}/${meta.checklistRows.length} row(s) not reported — rendered as NOT REPORTED: ${v.missingRowIds.join(', ')}`);
    }
    if (v.unknownRowIds.length > 0) {
      console.warn(`[checklist-integrity] ${v.unknownRowIds.length} unknown row id(s) ignored by the renderer: ${v.unknownRowIds.join(', ')}`);
    }
    if (v.findingRowIds.length > 0 && report.flags.length === 0) {
      console.warn(`[checklist-integrity] checklist carries finding verdict(s) on [${v.findingRowIds.join(', ')}] but the flags array is empty — flags remain authoritative; review raw report`);
    }
  }
```

3b. Extend the `onEvent('final_report', {...})` payload (lines 1299-1314) — add two lines after `report_mode: report.report_mode,`:

```js
    // Phase 2 single-call: the filled checklist (model) + the deterministic
    // skeleton rows (server-composed labels/rules/expected states). The
    // Full Report is a client-side re-render of these two fields.
    checklist: (report.checklist && typeof report.checklist === 'object') ? report.checklist : null,
    checklist_rows: meta.checklistRows || null,
```

3c. In `server/server.js`, after `const mode = requestedMode === 'full' ? 'full' : 'concise';` (line 189), add:

```js
  if (mode === 'full') {
    console.warn(`[check-stream] DEPRECATED: ?mode=full requested — the default single-call concise mode now carries the full-report payload (checklist). The full mode path is kept during transition and will be removed in Phase 3.`);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/single-call-checklist.test.js` then `npm test`
Expected: PASS everywhere (retry-integrity Scenario tests still pass — their `mode:'full'` calls hit the untouched legacy path).

- [ ] **Step 5: Commit**

```bash
git add src/check.js server/server.js tests/unit/single-call-checklist.test.js
git commit -m "feat(check): final_report carries filled checklist + skeleton rows; mode=full deprecated"
```

---

### Task 5: Engine instructions v1.7 + registry engine bump

**Files:**
- Modify: `rules/_engine/instructions.md` (header, §6, §7, document control)
- Modify: `rules/_registry.json` (`layers.engine.version`, `layers.engine.versionDate`)

**Interfaces:**
- Produces: engine layer text the model receives; `final_report.engine_layer_version` becomes `"1.7"` via the existing `loadEngineLayer()` registry read. No code change.

- [ ] **Step 1: Edit `rules/_engine/instructions.md`**

1a. Header (line 3): `**Version 1.6 — August 2026**` → `**Version 1.7 — August 2026**`, and append to the version-note block after the v1.5 paragraph:

```markdown
*v1.7: Single-call protocol. Concise Report is now the single-call mode: its tool schema carries a fixed, server-composed `checklist` object (one required row per certificate field, injected at runtime per certificate type) and the Full Report is a client-side re-render of that same payload — full mode is no longer requested from the model in normal operation. §6 documents the runtime-injected checklist property; §7 Concise gains the checklist duty. No change to detection, severity, or calibration discipline.*
```

1b. §6 (Tool use protocol) — append after the existing three paragraphs:

```markdown
For Concise (single-call) requests, the server injects a `checklist` object property into the
`submit_check_report` schema at runtime, composed per certificate type from machine-readable
specs (`rules/_core/part-i-checklist.json` plus the type's `<code>-checklist.json`). Every
property of that object is required: fill every row. Rows with a `verdict` property are judged
against the rule set (PASS / HARD / MEDIUM / LOW / NA, plus the observed value as printed).
Rows with an `observed` enum are perception rows: report only what you see (strike state,
stamp state) with a confidence level — the rule layer owns the judgement. A skipped row is
displayed to the operator as "NOT REPORTED", never as a pass. The checklist never replaces
`flags`: every HARD / MEDIUM / LOW checklist verdict must have a corresponding consolidated
entry in `flags` (§2.5), and `counters` are still derived strictly from the final `flags`
array. Emit `flags` before `checklist` so findings stream progressively.
```

1c. §7 — in "### Concise Report (default)", retitle to `### Concise Report (default — single call)` and add to the **Populate:** list after the `flags` bullet:

```markdown
- `checklist` — every runtime-injected row filled per §6 (verdict rows judged, perception rows observed-only); no PASS-by-omission
```

And in "### Full Report (on-demand)" add as a first line:

```markdown
*Deprecated as a model mode: the Full Report is now rendered client-side from the Concise single-call payload. This section applies only to legacy `?mode=full` requests, kept during the transition.*
```

1d. Document control table — add:

```markdown
| 1.7 | 2026-08-03 | Single-call protocol: runtime-injected `checklist` schema documented in §6; Concise gains the checklist duty; Full Report deprecated as a model mode (client-side re-render). |
```

- [ ] **Step 2: Bump the registry**

In `rules/_registry.json`, under `layers.engine`: `"version": "1.6"` → `"version": "1.7"` (keep `"versionDate": "2026-08-03"` — same date, that is correct).

- [ ] **Step 3: Run the unit suite (golden-manifest and others must not pin the engine version)**

Run: `npm test`
Expected: PASS. If any test pins `engine_layer_version` to `1.6`, update that expectation in the same commit and say so in the commit body.

- [ ] **Step 4: Commit**

```bash
git add rules/_engine/instructions.md rules/_registry.json
git commit -m "docs(engine): instructions v1.7 — single-call checklist protocol; registry engine bump"
```

---

### Task 6: Client — Full Report renders from the checklist payload

**Files:**
- Modify: `public/assets/render-report.js` (add `checklistToSections`; wire into `render()`; export)
- Modify: `public/index.html` (`final_report` handler, lines 1219-1276 — store the two new fields)

**Interfaces:**
- Consumes: `final_report.checklist` + `final_report.checklist_rows` (Task 4 shapes).
- Produces: `window.EHCRenderReport.checklistToSections(data) -> [{ section_number, title, checks: [{ check_name, result, detail }] }]` — synthetic sections in the exact shape `blocks.sectionsTableHTML(…, { mode: 'full' })` and the PDF's `renderSections` already consume. Task 7 (audit page) and Task 8 (PDF) rely on this exact name and shape.

- [ ] **Step 1: Add `checklistToSections` to `render-report.js`**

Insert after the `blocks` object closes (after line 333) and before `wireHelpers`:

```js
  // ─── Checklist → synthetic sections (Phase 2 single-call) ──────────────
  // Converts the single-call payload (checklist_rows skeleton metadata +
  // model-filled checklist) into the sections[] shape the existing
  // full-mode renderers (sectionsTableHTML mode:'full' and the PDF's
  // renderSections) already consume — the Full Report is a pure re-render,
  // zero new layout code.
  //
  // Judgement discipline: verdict rows map verdict→result 1:1. Perception
  // rows are OBSERVATIONS — the client derives only PASS (clean match with
  // high confidence) or NOTICE (anything else, pointing at flags); it never
  // invents FAIL/WARNING, because severity lives exclusively in the
  // authoritative flags array (single source of truth — concise and full
  // can never disagree). An un-filled row renders as NOTICE "NOT REPORTED"
  // (no PASS-by-omission).
  function checklistToSections(data) {
    const rows = Array.isArray(data && data.checklist_rows) ? data.checklist_rows : [];
    if (rows.length === 0) return [];
    const filled = (data.checklist && typeof data.checklist === 'object') ? data.checklist : {};

    const VERDICT_RESULT = { PASS: 'PASS', HARD: 'FAIL', MEDIUM: 'WARNING', LOW: 'NOTICE', NA: 'N/A' };
    const NOT_REPORTED = {
      result: 'NOTICE',
      detail: 'NOT REPORTED — the model returned no entry for this row. Re-run the check for full coverage.'
    };

    function verdictCheck(row) {
      const e = filled[row.id];
      if (!e || !e.verdict) {
        return { check_name: row.label, result: NOT_REPORTED.result, detail: NOT_REPORTED.detail };
      }
      const parts = [];
      if (e.observed) parts.push('Observed: ' + e.observed + '.');
      if (e.note) parts.push(e.note);
      if (row.rule) parts.push('Rule: ' + row.rule);
      return {
        check_name: (row.fieldRef ? row.fieldRef + ' — ' : '') + row.label,
        result: VERDICT_RESULT[e.verdict] || 'NOTICE',
        detail: parts.join(' ')
      };
    }

    function c6Check(row) {
      const e = filled[row.id];
      const name = (row.clauseRef ? row.clauseRef + ' — ' : '') + row.label;
      if (!e || !e.observed) {
        return { check_name: name, result: NOT_REPORTED.result, detail: NOT_REPORTED.detail };
      }
      const expectStruck = row.expected === 'DELETE';
      const matches = (e.observed === 'struck') === expectStruck && e.observed !== 'unclear';
      const clean = matches && e.confidence === 'high';
      const detail =
        'Expected ' + (row.expected || '?') + ' — observed ' + e.observed +
        ' (' + (e.confidence || '?') + ' confidence).' +
        (row.notes ? ' ' + row.notes : '') +
        (e.note ? ' ' + e.note : '') +
        (clean ? '' : ' See flags for the authoritative finding.');
      return { check_name: name, result: clean ? 'PASS' : 'NOTICE', detail: detail };
    }

    function c10Check(row) {
      const e = filled[row.id];
      if (!e || !e.observed) {
        return { check_name: row.label, result: NOT_REPORTED.result, detail: NOT_REPORTED.detail };
      }
      const clean = e.observed === 'stamped' && e.confidence === 'high';
      const detail =
        'Expected entry: ' + (row.expectedEntry || 'n/a') + ' — observed ' + e.observed +
        ' (' + (e.confidence || '?') + ' confidence).' +
        (e.note ? ' ' + e.note : '') +
        (clean ? '' : ' See flags for the authoritative finding.');
      return { check_name: row.label, result: clean ? 'PASS' : 'NOTICE', detail: detail };
    }

    const partI = rows.filter(function (r) { return r.family === 'part_i' || r.family === 'page_structure'; }).map(verdictCheck);
    const c6 = rows.filter(function (r) { return r.family === 'c6'; }).map(c6Check);
    const c10 = rows.filter(function (r) { return r.family === 'c10'; }).map(c10Check);

    const sections = [];
    if (partI.length) sections.push({ section_number: sections.length + 1, title: 'Part I — Field-by-field', checks: partI });
    if (c6.length) sections.push({ section_number: sections.length + 1, title: 'Part II — Attestation clauses (observed strike state)', checks: c6 });
    if (c10.length) sections.push({ section_number: sections.length + 1, title: 'Part II — Blank fields & adjacent stamps (observed)', checks: c10 });
    return sections;
  }
```

- [ ] **Step 2: Wire it into the one-shot `render()`**

In `render()` (line 399-400), replace:

```js
    html += blocks.compactHTML(info);
    html += blocks.sectionsTableHTML(data, { mode: 'full' });
```

with:

```js
    html += blocks.compactHTML(info);
    // Single-call payloads carry checklist_rows; legacy full payloads carry
    // model-authored sections[]. Checklist wins when present.
    const checklistSections = checklistToSections(data);
    if (checklistSections.length > 0) {
      html += blocks.sectionsTableHTML({ sections: checklistSections }, { mode: 'full' });
    } else {
      html += blocks.sectionsTableHTML(data, { mode: 'full' });
    }
```

- [ ] **Step 3: Export it**

Change line 582 to:

```js
  global.EHCRenderReport = { render, escapeHtml, streaming, checklistToSections };
```

- [ ] **Step 4: Store the new fields in `index.html`'s final_report handler**

In the `case 'final_report':` block, after `currentReportData.report_mode = data.report_mode;` (line 1229), add:

```js
            // Phase 2 single-call: the Full Report payload rides the same
            // event — persisted so Open Full Report can render instantly.
            currentReportData.checklist = data.checklist || null;
            currentReportData.checklist_rows = data.checklist_rows || null;
```

- [ ] **Step 5: Syntax-check both assets**

Run: `node --check public/assets/render-report.js && echo OK`
Expected: `OK` (index.html is inline JS — proceed to the smoke check).

- [ ] **Step 6: Manual smoke — deterministic fixture render**

Run `npm start`, open `http://localhost:3000/audit.html` in a browser, and in DevTools console seed a fixture then reload:

```js
sessionStorage.setItem('audit_report_payload', JSON.stringify({
  overall_verdict: 'HOLD',
  counters: { hard_errors: 0, medium_warnings: 1, low_notices: 0 },
  flags: [{ severity: 'medium', field_reference: 'I.1', title: 'Typo', description: 'GREAT BRITAN in I.1.' }],
  sections: [], rule_set_update_recommendations: '',
  certificate_info: { certificate_ref: '26/2/000001' }, report_mode: 'concise',
  checklist: { i_1_consignor_exporter: { verdict: 'MEDIUM', observed: 'GREAT BRITAN', note: 'A10 typo' } },
  checklist_rows: [
    { id: 'i_1_consignor_exporter', rowClass: 'verdict', family: 'part_i', label: 'Consignor / Exporter', fieldRef: 'I.1', rule: 'Must be populated.' },
    { id: 'ii_1_country_fmd', rowClass: 'perception', family: 'c6', label: 'Country/FMD', clauseRef: 'II.1', expected: 'RETAIN', notes: '' },
    { id: 'page_structure', rowClass: 'verdict', family: 'page_structure', label: 'Page structure / count', rule: '' }
  ]
})); location.reload();
```

Expected: verdict card HOLD, one MEDIUM flag card, then section cards "SECTION 1 / Part I — Field-by-field" showing I.1 as ⚠ WARNING with the observed value, `page_structure` as `?` NOT REPORTED, and "SECTION 2 / Part II — Attestation clauses" showing II.1 as `?` NOT REPORTED.

- [ ] **Step 7: Commit**

```bash
git add public/assets/render-report.js public/index.html
git commit -m "feat(ui): full report renders client-side from the single-call checklist"
```

---

### Task 7: Instant "Open Full Report" — sessionStorage handoff, BroadcastChannel machinery removed

**Files:**
- Modify: `public/index.html` (`handleDownloadAudit`, lines 1373-1450)
- Modify: `public/audit.html` (strip lines 115-364: `runGenerate`, `buildAuditFormData`, `runAuditProgressiveStream`; simplify dispatch)
- Modify: `public/assets/render-report.js` (`auditUpgradeHTML` copy, line 314)

**Interfaces:**
- Consumes: `currentReportData` now carrying `checklist`/`checklist_rows` (Task 6); `runDisplay()`/`showReport()` in audit.html (kept verbatim); `window.EHCRenderReport.render` full path (Task 6).
- Produces: `window.open('/audit.html')` with the payload under sessionStorage key `audit_report_payload` — the HTML spec copies the opener's sessionStorage into a `window.open`'d same-origin tab, which is exactly how the pre-existing `runDisplay` path already worked.

- [ ] **Step 1: Replace `handleDownloadAudit` in `index.html`**

Replace the entire function (lines 1389-1450) and its lead comment (1373-1388) with:

```js
  // Phase 2 single-call: "Open Full Report" is instant. The concise check's
  // final_report already carries the full payload (checklist +
  // checklist_rows), so the audit tab is a pure re-render — no re-upload,
  // no second /api/check/stream call, no BroadcastChannel. The payload is
  // written to sessionStorage BEFORE the synchronous window.open: the HTML
  // spec copies the opener's sessionStorage into a same-origin tab opened
  // via window.open, which is the same mechanism audit.html's runDisplay
  // path has always used. window.open stays synchronous inside the click
  // handler so Safari/Firefox keep the user-gesture chain.
  function handleDownloadAudit() {
    const errEl = document.getElementById('audit-error');
    if (errEl) errEl.hidden = true;

    if (!currentReportData || !currentReportData.certificate_info) {
      if (errEl) {
        errEl.textContent = 'No completed check available — please run a check first.';
        errEl.hidden = false;
      }
      return;
    }

    try {
      sessionStorage.setItem('audit_report_payload', JSON.stringify(currentReportData));
    } catch (e) {
      if (errEl) {
        errEl.textContent = 'Could not stage the report for the full view: ' + e.message;
        errEl.hidden = false;
      }
      return;
    }

    const opened = window.open('/audit.html', '_blank');
    if (!opened && errEl) {
      errEl.textContent = 'Popup blocker prevented the full report tab from opening. Allow popups for this site and click again.';
      errEl.hidden = false;
    }
  }
```

(`lastCheckFiles` / `lastCheckOverrides` stay in place — other code still assigns them; removing them entirely is Phase 3 cleanup.)

- [ ] **Step 2: Strip audit.html's re-analysis machinery**

In `public/audit.html`:
- Delete `runGenerate()` (lines 115-193), `buildAuditFormData()` (lines 195-212), and `runAuditProgressiveStream()` (lines 214-364).
- Delete the `showLoading`/`hideLoading` functions (366-376) and the `#audit-loading` section markup (lines 35-37) plus the two loader script tags (`/assets/loader-tips.js`, `/assets/loader-controller.js`, lines 14-15) — nothing loads anymore.
- Delete the retry button block (lines 39-51 keep the error card but drop the Retry button and its listener, lines 89-92) — with no fetch there is nothing to retry; keep `showError` + Close tab.
- Replace the bottom dispatch (lines 389-395) with:

```js
  // Phase 2 single-call: the audit tab is display-only. The payload was
  // staged in sessionStorage by the opener (or survives a refresh); the
  // legacy ?action=generate URL now falls through to the same display path.
  runDisplay();
```

- Update `runDisplay`'s lead comment (lines 97-99) to:

```js
  // Render the single-call report payload staged in sessionStorage under
  // audit_report_payload by index.html's handleDownloadAudit (copied into
  // this tab by window.open, and surviving refresh within the tab).
```

`showReport` (lines 382-387) stays byte-identical — `EHCRenderReport.render` now takes the checklist path from Task 6.

- [ ] **Step 3: Update the button copy**

In `public/assets/render-report.js` `auditUpgradeHTML` (line 314), replace:

```js
          <p class="text-sm text-secondary" style="margin-top: 12px;">Opens the complete audit-grade report in a new tab. Takes 2 to 3 minutes.</p>
```

with:

```js
          <p class="text-sm text-secondary" style="margin-top: 12px;">Opens the complete audit-grade report instantly in a new tab — no extra analysis run.</p>
```

- [ ] **Step 4: Syntax + smoke check**

Run: `node --check public/assets/render-report.js && echo OK`
Then `npm start`, open `http://localhost:3000/`, and in DevTools on the MAIN page seed a completed-check state and click through:

```js
// Simulate a finished check without paying for one:
sessionStorage.setItem('last_report_payload', JSON.stringify({
  overall_verdict: 'PASS', counters: { hard_errors: 0, medium_warnings: 0, low_notices: 0 },
  flags: [], sections: [{ section_number: 1, title: 'Checks Performed', checks: [{ check_name: 'Cert type', result: 'PASS', detail: '8322EHC footer (D1)' }] }],
  rule_set_update_recommendations: '', certificate_info: { certificate_ref: '26/2/000002' },
  report_mode: 'concise',
  checklist: { i_1_consignor_exporter: { verdict: 'PASS', observed: 'Saputo Dairy UK' } },
  checklist_rows: [{ id: 'i_1_consignor_exporter', rowClass: 'verdict', family: 'part_i', label: 'Consignor / Exporter', fieldRef: 'I.1', rule: 'Must be populated.' }]
})); location.reload();
```

Expected: restored report shows the "Open Full Report" button with the new instant copy; clicking it opens `/audit.html` which renders IMMEDIATELY (no loader, no network call to `/api/check/stream` in the Network tab), Part I section visible. Refresh the audit tab: still renders (sessionStorage copy persists in the tab).

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/audit.html public/assets/render-report.js
git commit -m "feat(ui): Open Full Report is instant — sessionStorage handoff, BroadcastChannel machinery removed"
```

---

### Task 8: Full-mode PDF renders from the checklist payload

**Files:**
- Modify: `public/assets/generate-pdf.js` (`generate()`, lines 152-197)

**Interfaces:**
- Consumes: `window.EHCRenderReport.checklistToSections` (Task 6 — resolved at click time, so script load order is irrelevant).
- Produces: unchanged API `window.EHCGeneratePDF.generate(reportData, 'full')`; visual redesign is explicitly Phase 3.

- [ ] **Step 1: Convert checklist to sections inside `generate()`**

In `generate()` (line 161-169), after the `ctx` object is built, add:

```js
    // Phase 2 single-call: a payload carrying checklist_rows has no
    // model-authored sections[] — synthesise them via the shared converter
    // so the existing full-mode section renderer is reused unchanged.
    // (Visual redesign of this PDF is Phase 3.)
    if (ctx.mode === 'full' &&
        global.EHCRenderReport && typeof global.EHCRenderReport.checklistToSections === 'function') {
      const synthetic = global.EHCRenderReport.checklistToSections(reportData);
      if (synthetic.length > 0) {
        ctx.data = Object.assign({}, reportData, { sections: synthetic });
      }
    }
```

(`renderSections(ctx)` at line 182 reads `ctx.data.sections`, `renderFindings`/`renderCounters` read flags/counters from `ctx.data` — all untouched. Legacy `?mode=full` payloads still carry real sections and skip the branch because `checklistToSections` returns `[]` without `checklist_rows`.)

- [ ] **Step 2: Syntax + smoke check**

Run: `node --check public/assets/generate-pdf.js && echo OK`
Then with the Task 7 fixture still seeded, open `/audit.html` and click "Download PDF". Expected: a PDF downloads with the counters block, the flag/empty-findings block, the CERTIFICATE block, and a "Part I — Field-by-field" section table listing the checklist rows (NOT an empty page 2).

- [ ] **Step 3: Commit**

```bash
git add public/assets/generate-pdf.js
git commit -m "feat(pdf): full-mode PDF renders from the checklist payload"
```

---

### Task 9: Final live validation (with Silvia) + integration suite

**Files:** none (validation only; any fix found becomes its own commit).

**Interfaces:** consumes the deployed/local branch end-to-end.

- [ ] **Step 1: Run the full automated suite once (the only integration run of this plan)**

```bash
npm test
ANTHROPIC_API_KEY=<real key> npm run test:integration
```

Expected: unit suite PASS; `sse-final-report` integration PASS; golden-corpus tests PASS or SKIP (skips cleanly when the local git-ignored cert folder is absent).

- [ ] **Step 2: Live single-call check (Silvia drives)**

Start the server (`npm start`), upload ONE real certificate bundle (an 8322 dairy load if available — it exercises the full 47-row skeleton; otherwise 8468 exercises the graceful Part-I-only path). Verify, in order:
1. Concise report streams exactly as before (flags appear progressively; verdict; single "Checks Performed" section; verdict/counters/flags consistent).
2. Server log shows `[check] checklist skeleton composed for <type>: N rows` and NO `[checklist-integrity]` missing-row warnings (or, if some appear, the audit page shows those rows as NOT REPORTED — visible, not silent).
3. Click "Open Full Report": the tab renders INSTANTLY (Network tab shows zero `/api/check/stream` requests from audit.html), Part I / Part II sections populated from the checklist, flags identical to the concise view.
4. Download PDF from the audit tab: sections present, findings match on-screen.
5. Refresh the audit tab: report still renders.

- [ ] **Step 3: Cost/latency telemetry comparison**

From the server log's `[cost]` lines: record `check_cost_usd`, `input`, `output` for this single call. Compare against a pre-change baseline (a recent main-branch concise+full pair from Render logs, or run one `?mode=full` legacy check via curl if a fresh baseline is needed). Expected: single-call output tokens ≈ concise + ~3-4k (checklist rows); a full view now costs $0 extra vs ~$0.25 + ~130s before. Record the numbers in the PR description.

- [ ] **Step 4: Verdict-parity spot check**

Confirm the concise flags/verdict and the full-report page show identical findings (they are the same payload — this is a render check, not a model check). Confirm the checklist verdict rows with HARD/MEDIUM/LOW all have a corresponding flag; if not, the `[checklist-integrity]` warn fired and the discrepancy goes to the calibration backlog, NOT a code fix in this plan.

- [ ] **Step 5: Merge decision**

If all green: merge `feat/single-call` → `main` per the finishing-a-development-branch skill. The parked branch `refactor/single-call-skeleton` is now fully superseded — delete it after merge.

---

## Self-Review Notes

- Spec coverage: fixed schema from composeSkeleton (T1/T3), fill-every-row / no PASS-by-omission (T3 instruction + T2/T4 warn + T6 NOT REPORTED render), concise renders as today (untouched paths, asserted in T3/T4 tests via unchanged flags/counters), full = client re-render (T6/T7), progressive SSE kept (no changes to tryEmitProgress or event vocabulary besides two new final_report fields), audit re-fetch machinery removed (T7), "2 to 3 minutes" copy removed (T7), truncation-fixture problem designed out (D1, asserted T3 step 5), unit tests for composeSkeleton (T1) incl. fail-loud, mocked single-call test on the retry-integrity harness (T3/T4), engine v1.7 + registry bump (T5), live validation + telemetry (T9).
- Type consistency: `checklistToSections` (T6) is the exact name consumed in T7 smoke and T8 code; `checklist_rows`/`checklist` field names identical across T4 server, T6 client, T8 PDF; `meta.checklistRows` consistent T3→T4; `validateChecklistAgainstSkeleton` signature identical T2→T4.
- Known deferred items (intentional): removal of `?mode=full`, `lastCheckFiles` plumbing, and the legacy `runDisplay` comment debt → Phase 3; unreachable `check_performed` emitter (obs #43) stays untouched per its own comment.
