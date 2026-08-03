# Report Integrity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the server the single source of truth for flags, counters, and verdict, failing loudly on any inconsistency, so a report can never again show a header that contradicts its own findings list.

**Architecture:** Three defensive layers per the spec (`docs/superpowers/specs/2026-08-03-report-integrity-fix-design.md`): (1) `postProcessReport` becomes a strict validator that strips retracted flags, derives counters/verdict, and throws on malformed payloads; (2) the API call and stream finalisation are pinned to one snapshot (`disable_parallel_tool_use`, last-block selection) and the authoritative flags ride the `final_report` event; (3) the client replaces its streamed preview with the authoritative array at finalisation.

**Tech Stack:** Node.js/Express, Anthropic SDK streaming + partial-json, vanilla JS frontend, node:test.

## Global Constraints

- Branch: `fix/report-integrity` (already created; spec committed on it).
- All code, comments, and commit messages in English.
- Report visual format unchanged: same flag cards, same metric row, same PDF layout (project rule 10). Only the DATA feeding them changes.
- `tool_choice` MUST stay `type: 'auto'` — forced tool choice is incompatible with adaptive thinking (`thinkingConfigFor` in `src/thinking-config.js`). Use `disable_parallel_tool_use: true` instead.
- Do not touch `rules/` except `rules/_engine/instructions.md` and the `layers.engine` block of `rules/_registry.json`.
- Do NOT run integration tests (`tests/integration/*`) during implementation — they call the real API (~$0.10+/run) and need a local gitignored fixture. They run once in Task 8 with Silvia.
- Unit tests run with: `node --test tests/unit/`.

---

### Task 1: `postProcessReport` becomes a strict validator

**Files:**
- Modify: `src/check.js:186-227` (the `postProcessReport` function and its doc comment)
- Modify: `src/check.js` module exports (bottom of file — add `postProcessReport`)
- Test: `tests/unit/post-process-report.test.js` (create)

**Interfaces:**
- Produces: `postProcessReport(report)` — mutates and returns `report` with `flags` (retracted stripped), `counters`, `overall_verdict`, `retracted_count`; throws `Error` with `err.code === 'REPORT_INTEGRITY'` on missing/non-array `flags` or out-of-enum severity. Exported from `src/check.js` for tests and used by `applyReportMeta` (unchanged call site, `src/check.js:993`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/post-process-report.test.js`:

```js
'use strict';

// Unit tests for postProcessReport — the single reconciliation point
// between the model's tool payload and everything the client renders.
// Covers the two live incidents of 28/31 July 2026 (spec:
// docs/superpowers/specs/2026-08-03-report-integrity-fix-design.md).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { postProcessReport } = require('../../src/check.js');

function flag(severity, extra) {
  return Object.assign(
    { severity, field_reference: 'I.1', title: 't', description: 'd' },
    extra || {}
  );
}

describe('postProcessReport', () => {
  it('derives counters and HOLD from a mixed flags array', () => {
    const r = postProcessReport({ flags: [flag('hard'), flag('medium'), flag('low')] });
    assert.deepEqual(r.counters, { hard_errors: 1, medium_warnings: 1, low_notices: 1 });
    assert.equal(r.overall_verdict, 'HOLD');
  });

  it('PASS when only low notices remain', () => {
    const r = postProcessReport({ flags: [flag('low'), flag('low')] });
    assert.equal(r.overall_verdict, 'PASS');
    assert.equal(r.counters.low_notices, 2);
  });

  it('strips retracted:true flags before counting (26/2/203073 regression)', () => {
    // Live incident: model emitted one medium flag marked retracted:true.
    // Old behavior: counted (HOLD 0/1/0) while every renderer hid it.
    // New behavior: stripped everywhere — clean PASS with empty flags.
    const r = postProcessReport({ flags: [flag('medium', { retracted: true })] });
    assert.deepEqual(r.flags, []);
    assert.deepEqual(r.counters, { hard_errors: 0, medium_warnings: 0, low_notices: 0 });
    assert.equal(r.overall_verdict, 'PASS');
    assert.equal(r.retracted_count, 1);
  });

  it("strips final_conclusion:'retracted' flags too", () => {
    const r = postProcessReport({
      flags: [flag('hard'), flag('medium', { final_conclusion: 'retracted' })]
    });
    assert.equal(r.flags.length, 1);
    assert.deepEqual(r.counters, { hard_errors: 1, medium_warnings: 0, low_notices: 0 });
    assert.equal(r.overall_verdict, 'HOLD');
  });

  it('throws REPORT_INTEGRITY when flags is missing', () => {
    assert.throws(
      () => postProcessReport({ overall_verdict: 'HOLD', counters: { hard_errors: 0, medium_warnings: 1, low_notices: 0 } }),
      (err) => err.code === 'REPORT_INTEGRITY'
    );
  });

  it('throws REPORT_INTEGRITY when flags is not an array', () => {
    assert.throws(
      () => postProcessReport({ flags: { severity: 'hard' } }),
      (err) => err.code === 'REPORT_INTEGRITY'
    );
  });

  it('throws REPORT_INTEGRITY on out-of-enum severity', () => {
    assert.throws(
      () => postProcessReport({ flags: [flag('HARD')] }),
      (err) => err.code === 'REPORT_INTEGRITY' && /severity/i.test(err.message)
    );
  });

  it('throws REPORT_INTEGRITY when report itself is missing', () => {
    assert.throws(() => postProcessReport(null), (err) => err.code === 'REPORT_INTEGRITY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/post-process-report.test.js`
Expected: FAIL — `postProcessReport` is not exported (undefined), or (if it is) the retracted/throw assertions fail against the old silent-bail implementation.

- [ ] **Step 3: Replace the implementation**

In `src/check.js`, replace the whole `postProcessReport` function (lines ~186-227, keeping its position) with:

```js
const FLAG_SEVERITIES = ['hard', 'medium', 'low'];

/**
 * Single reconciliation point between the model's tool payload and
 * everything the client renders. STRICT by design (spec 2026-08-03):
 * a report that cannot be validated is thrown away, never rendered —
 * a wrong report is worse than no report (26/2/203141 false PASS).
 *
 * - Strips retracted flags (engine contract: "no withdrawn flags shown").
 * - Derives counters and overall_verdict from the surviving flags array.
 * - Throws err.code='REPORT_INTEGRITY' on missing/non-array flags or
 *   out-of-enum severity, so runCheckStream can retry once and then
 *   surface a visible SSE error.
 *
 * Mutates and returns the report.
 */
function postProcessReport(report) {
  if (!report || typeof report !== 'object') {
    const err = new Error('Model returned no report object.');
    err.code = 'REPORT_INTEGRITY';
    throw err;
  }
  if (!Array.isArray(report.flags)) {
    const got = report.flags === undefined ? 'undefined' : typeof report.flags;
    const err = new Error(`Model returned a report without a flags array (got ${got}) — counters cannot be derived.`);
    err.code = 'REPORT_INTEGRITY';
    throw err;
  }

  const retracted = report.flags.filter(
    (f) => f && (f.retracted === true || f.final_conclusion === 'retracted')
  );
  for (const f of retracted) {
    console.warn(`[post-process] stripped retracted flag: "${f.title || 'untitled'}" (severity=${f.severity || 'none'})`);
  }
  const flags = report.flags.filter((f) => !retracted.includes(f));

  const badSeverity = flags.filter((f) => !f || !FLAG_SEVERITIES.includes(f.severity));
  if (badSeverity.length > 0) {
    const detail = badSeverity
      .map((f) => `"${(f && f.title) || 'untitled'}"=${f && f.severity}`)
      .join(', ');
    const err = new Error(`${badSeverity.length} flag(s) carry a severity outside ${FLAG_SEVERITIES.join('/')}: ${detail}.`);
    err.code = 'REPORT_INTEGRITY';
    throw err;
  }

  const counters = {
    hard_errors: flags.filter((f) => f.severity === 'hard').length,
    medium_warnings: flags.filter((f) => f.severity === 'medium').length,
    low_notices: flags.filter((f) => f.severity === 'low').length
  };

  const newVerdict = (counters.hard_errors === 0 && counters.medium_warnings === 0)
    ? 'PASS'
    : 'HOLD';

  console.log(`[post-process] ${flags.length} flags (${retracted.length} retracted stripped) — ${counters.hard_errors} hard / ${counters.medium_warnings} medium / ${counters.low_notices} low — verdict: ${newVerdict}`);

  report.flags = flags;
  report.counters = counters;
  report.overall_verdict = newVerdict;
  report.retracted_count = retracted.length;

  return report;
}
```

Also update the function's preceding doc comment block (lines ~186-204) if it duplicates outdated claims — the new JSDoc above replaces it entirely.

Then find the `module.exports` block at the bottom of `src/check.js` and add `postProcessReport` to it (keep all existing exports).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/post-process-report.test.js`
Expected: PASS (8/8)

- [ ] **Step 5: Run the whole unit suite to catch regressions**

Run: `node --test tests/unit/`
Expected: all pass. If `truncation-fail-loud.test.js` or others fail because they stub reports without flags arrays, fix THOSE fixtures to include `flags: []` — the strictness is the point.

- [ ] **Step 6: Commit**

```bash
git add src/check.js tests/unit/post-process-report.test.js
git commit -m "fix(engine): postProcessReport validates strictly — strips retracted flags, derives counters, throws REPORT_INTEGRITY"
```

---

### Task 2: One snapshot — disable parallel tool use, pick the LAST block, log the seams

**Files:**
- Modify: `src/check.js:958` (tool_choice)
- Modify: `src/check.js:1031-1070` (`tryEmitProgress` guard + catch)
- Modify: `src/check.js:1125-1132` (block selection)

**Interfaces:**
- Consumes: nothing new.
- Produces: `runCheckStream` internals only; no signature change.

- [ ] **Step 1: tool_choice**

At `src/check.js:958` replace:

```js
    tool_choice: { type: 'auto' },
```

with:

```js
    // 'auto' is mandatory with adaptive thinking (forced tool_choice is
    // rejected); disable_parallel_tool_use pins the response to at most
    // one submit_check_report block — the 26/2/203141 false PASS came
    // from counters and streamed flags being read from different blocks.
    tool_choice: { type: 'auto', disable_parallel_tool_use: true },
```

- [ ] **Step 2: belt-and-braces last-block selection**

At `src/check.js:1125-1130` replace:

```js
  const toolUseBlock = finalMessage.content.find(b => b.type === 'tool_use');
  if (!toolUseBlock) {
    const blockTypes = finalMessage.content.map(b => b.type).join(', ');
    console.error(`No tool_use block in streamed response. Content block types: [${blockTypes}]. Stop reason: ${finalMessage.stop_reason}.`);
    throw new Error('Claude did not call the submit_check_report tool. Check thinking/tool_choice config and the user-content mandate.');
  }
```

with:

```js
  const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use');
  if (toolUseBlocks.length === 0) {
    const blockTypes = finalMessage.content.map(b => b.type).join(', ');
    console.error(`No tool_use block in streamed response. Content block types: [${blockTypes}]. Stop reason: ${finalMessage.stop_reason}.`);
    throw new Error('Claude did not call the submit_check_report tool. Check thinking/tool_choice config and the user-content mandate.');
  }
  if (toolUseBlocks.length > 1) {
    // Should be impossible with disable_parallel_tool_use, but if it
    // happens, use the LAST block — the same one the progressive flag
    // stream followed — so counters and streamed flags share a snapshot.
    console.error(`[integrity] model emitted ${toolUseBlocks.length} tool_use blocks — using the LAST to match the streamed preview.`);
  }
  const toolUseBlock = toolUseBlocks[toolUseBlocks.length - 1];
```

- [ ] **Step 3: fail-loud emit guard and final-parse logging**

In `tryEmitProgress` (`src/check.js:1031-1070`):

Replace the catch:

```js
    let parsed;
    try {
      parsed = partialJson.parse(jsonBuffer, PARTIAL_MASK);
    } catch (_) {
      return;
    }
```

with:

```js
    let parsed;
    try {
      parsed = partialJson.parse(jsonBuffer, PARTIAL_MASK);
    } catch (err) {
      // Mid-stream partial buffers legitimately fail to parse; only the
      // final pass (content_block_stop) failing is a real signal.
      if (final) console.warn(`[flag-emitter] final parse of tool_use buffer failed: ${err.message}`);
      return;
    }
```

Replace the flag emit loop body:

```js
      while (flagsEmittedCount < cap) {
        const flag = arr[flagsEmittedCount];
        if (flag && typeof flag === 'object' &&
            flag.severity && flag.title && flag.description) {
          onEvent('flag', flag);
        }
        flagsEmittedCount++;
      }
```

with:

```js
      while (flagsEmittedCount < cap) {
        const flag = arr[flagsEmittedCount];
        if (flag && typeof flag === 'object' &&
            flag.severity && flag.title && flag.description) {
          onEvent('flag', flag);
        } else {
          // The flag still reaches the client via the authoritative
          // final_report array; this log makes the skip visible.
          console.warn(`[flag-emitter] flag ${flagsEmittedCount} failed the emit guard (severity=${flag && flag.severity ? 'set' : 'missing'}, title=${flag && flag.title ? 'set' : 'missing'}, description=${flag && flag.description ? 'set' : 'missing'}) — not streamed, rides final_report only`);
        }
        flagsEmittedCount++;
      }
```

- [ ] **Step 3b: reject stray keys at the schema layer**

In the `TOOL_DEFINITION` flags schema (`src/check.js:600-613`), inside `items`, add `additionalProperties: false` alongside `required`:

```js
        items: {
          type: 'object',
          required: ['severity', 'field_reference', 'title', 'description'],
          additionalProperties: false,
          properties: {
```

(The 26/2/203073 flag arrived with a stray `retracted: true` key. Schema enforcement is best-effort at the API layer; `postProcessReport`'s strip from Task 1 remains the guarantee.)

- [ ] **Step 4: stream-vs-final integrity log**

In `runCheckStream`, immediately after `const report = applyReportMeta(...)` (`src/check.js:1132`), add:

```js
  if (report.flags.length !== flagsEmittedCount) {
    console.warn(`[integrity] streamed ${flagsEmittedCount} flag event(s) but the final report has ${report.flags.length} — client reconciles from final_report`);
  }
```

- [ ] **Step 5: Run unit suite**

Run: `node --test tests/unit/`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/check.js
git commit -m "fix(engine): pin report to one tool_use snapshot (disable_parallel_tool_use, last-block, loud emit guard)"
```

---

### Task 3: Authoritative `final_report` + raw payload persistence

**Files:**
- Modify: `src/check.js:1141-1151` (final_report payload)
- Modify: `src/check.js` (add `persistRawReport` helper near `postProcessReport`; verify `fs`/`path` are already required at the top — they are used by the rule-set loader; add if missing)
- Modify: `.gitignore` (add `data/raw-reports/`)
- Modify: `tests/integration/sse-final-report.test.js` (FINAL_REPORT_KEYS + de-tautologised assertions)

**Interfaces:**
- Produces: `final_report` SSE event now ALSO carries `flags` (array, post-strip), `counters` (object), `overall_verdict` (string). Task 5's client code consumes exactly these three keys.

- [ ] **Step 1: persistence helper**

In `src/check.js`, directly above `postProcessReport`, add:

```js
const RAW_REPORT_DIR = path.join(__dirname, '..', 'data', 'raw-reports');

/**
 * Persist the raw tool-call input to disk before any post-processing.
 * The July 2026 incident investigation had NO surviving payloads —
 * only Render stdout with 14-day retention. Never throws.
 */
function persistRawReport(input) {
  try {
    fs.mkdirSync(RAW_REPORT_DIR, { recursive: true });
    const ref = String(
      (input && input.certificate_info && input.certificate_info.certificate_ref) || 'unknown'
    ).replace(/[^\w.-]+/g, '-');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(RAW_REPORT_DIR, `${stamp}_${ref}.json`),
      JSON.stringify(input, null, 2)
    );
  } catch (err) {
    console.warn(`[raw-report] persist failed: ${err.message}`);
  }
}
```

If `src/check.js` does not already `require('fs')` / `require('path')` at the top, add them.

- [ ] **Step 2: call it before post-processing**

In `runCheckStream`, right after the `toolUseBlock` selection (end of Task 2 Step 2 code) and BEFORE `applyReportMeta`, add:

```js
  persistRawReport(toolUseBlock.input);
```

- [ ] **Step 3: extend the final_report event**

Replace `src/check.js:1141-1151`:

```js
  onEvent('final_report', {
    certificate_info: report.certificate_info,
    sections: report.sections,
    rule_set_update_recommendations: report.rule_set_update_recommendations,
    rule_set_version: report.rule_set_version,
    cert_type_resolved: meta.effectiveCertType,
    processing_time_seconds: report.processing_time_seconds,
    tokens_used: report.tokens_used,
    checker_model: report.checker_model,
    report_mode: report.report_mode
  });
```

with:

```js
  onEvent('final_report', {
    certificate_info: report.certificate_info,
    sections: report.sections,
    rule_set_update_recommendations: report.rule_set_update_recommendations,
    rule_set_version: report.rule_set_version,
    cert_type_resolved: meta.effectiveCertType,
    processing_time_seconds: report.processing_time_seconds,
    tokens_used: report.tokens_used,
    checker_model: report.checker_model,
    report_mode: report.report_mode,
    // Authoritative snapshot (spec 2026-08-03): the client REPLACES its
    // streamed preview with these. Streamed 'flag' events are preview only.
    flags: report.flags,
    counters: report.counters,
    overall_verdict: report.overall_verdict
  });
```

- [ ] **Step 4: gitignore**

Append to `.gitignore` (respect existing style):

```
# Raw model tool payloads persisted per check for incident diagnosis
data/raw-reports/
```

- [ ] **Step 5: update the integration test contract (do NOT run it)**

In `tests/integration/sse-final-report.test.js`:
- Add `'flags'`, `'counters'`, `'overall_verdict'` to the `FINAL_REPORT_KEYS` array.
- Find the two assertions described in their comments as "counters match flag-severity counts" and "PASS iff hard=0 && medium=0" (they currently compare `report.counters` against `report.flags` — values `postProcessReport` computed from each other, i.e. tautologies). Repoint them at the **event payload** so they test the client contract instead: assert `finalReportEvent.flags` is an array, its severity composition equals `finalReportEvent.counters`, and `finalReportEvent.overall_verdict === (counters.hard_errors === 0 && counters.medium_warnings === 0 ? 'PASS' : 'HOLD')`. Also assert no received `flag` event object carries `retracted === true`.

- [ ] **Step 6: Run unit suite + syntax check the integration test**

Run: `node --test tests/unit/ && node --check tests/integration/sse-final-report.test.js`
Expected: unit pass; `--check` exits clean (integration executes only in Task 8).

- [ ] **Step 7: Commit**

```bash
git add src/check.js .gitignore tests/integration/sse-final-report.test.js
git commit -m "feat(engine): authoritative flags/counters/verdict on final_report + raw payload persistence"
```

---

### Task 4: Retry-once on integrity failure

**Files:**
- Modify: `src/check.js:1022-1155` (split `runCheckStream` into wrapper + attempt)

**Interfaces:**
- Produces: unchanged external signature `runCheckStream({ files, fields, mode, onEvent, signal })`. New SSE event `reset_flags` (empty payload) emitted before a retry — Task 5's client consumes it.

- [ ] **Step 1: restructure**

Rename the existing `async function runCheckStream(...)` to `async function runCheckStreamAttempt({ params, meta, onEvent, signal })` and remove its first line (`const { params, meta } = await buildCheckParams(...)`) — `params`/`meta` now arrive as arguments. Everything else inside stays as produced by Tasks 2-3.

Then add the new wrapper in its place:

```js
/**
 * Streaming EHC check with a one-shot retry on report integrity
 * failure (spec 2026-08-03). A payload that fails validation is never
 * rendered: first failure retries silently (after telling the client
 * to drop its streamed preview via 'reset_flags'); second failure
 * propagates as a visible SSE error.
 */
async function runCheckStream({ files, fields, mode = 'concise', onEvent, signal }) {
  const { params, meta } = await buildCheckParams({ files, fields, mode });
  try {
    return await runCheckStreamAttempt({ params, meta, onEvent, signal });
  } catch (err) {
    const aborted = signal && signal.aborted;
    if (err && err.code === 'REPORT_INTEGRITY' && !aborted) {
      console.warn(`[integrity] attempt 1 failed validation (${err.message}) — retrying once`);
      onEvent('reset_flags', {});
      return await runCheckStreamAttempt({ params, meta, onEvent, signal });
    }
    throw err;
  }
}
```

Note: `meta.requestStart` predates both attempts, so the final
"Total processing time" log covers the retry — correct and intended.

- [ ] **Step 2: error message for the terminal failure**

The second `REPORT_INTEGRITY` throw propagates to `server/server.js`'s catch, which already forwards `err.message` + `err.code` over the SSE `error` event — no server change needed. Improve the client-facing text by wrapping at the end of the wrapper's catch: replace `throw err;` with:

```js
    if (err && err.code === 'REPORT_INTEGRITY') {
      err.message = 'The check produced an internally inconsistent report twice and was stopped for safety — no verdict was issued. Please run the check again.';
    }
    throw err;
```

- [ ] **Step 3: Run unit suite**

Run: `node --test tests/unit/`
Expected: all pass (unit tests import `postProcessReport` and, via `truncation-fail-loud`, possibly `runCheckStream` — signature unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/check.js
git commit -m "feat(engine): retry once on REPORT_INTEGRITY, then fail loudly — no invalid report is ever rendered"
```

---

### Task 5: Client reconciles from the authoritative snapshot

**Files:**
- Modify: `public/index.html` (`final_report` case ~line 1218, `flag` case ~1247, add `reset_flags` case, `done` case ~1264)
- Modify: `public/assets/render-report.js` (`streaming` object: add `renderFlagsFinal`, `resetFlags`; fix the stale comment in `appendFlag`)

**Interfaces:**
- Consumes: `final_report.flags` / `.counters` / `.overall_verdict` and `reset_flags` from Tasks 3-4.
- Produces: `window.EHCRenderReport.streaming.renderFlagsFinal(data)` and `.resetFlags()`.

- [ ] **Step 1: render-report.js — authoritative flags renderer**

In the `streaming` object of `public/assets/render-report.js`, fix the stale comment on `appendFlag` (it claims "server filters them out" — as of this branch, true again, but keep the accurate version):

```js
    // Streamed preview card. The server strips retracted flags before
    // streaming (postProcessReport), and finalize() replaces this whole
    // stack with the authoritative final_report array anyway.
    appendFlag(flag /*, retractedShown */) {
```

Then add two methods to `streaming` (after `appendFlag`):

```js
    // Drop the streamed preview stack (server is retrying the check).
    resetFlags() {
      const slot = document.getElementById('ehc-slot-flags');
      if (slot) slot.innerHTML = '';
    },

    // Replace the streamed preview with the authoritative final_report
    // flags array — the single source of truth for cards, counters and
    // the PDF (spec 2026-08-03).
    renderFlagsFinal(data) {
      const slot = document.getElementById('ehc-slot-flags');
      if (!slot) return;
      const flags = Array.isArray(data.flags) ? data.flags : [];
      if (flags.length === 0) {
        slot.innerHTML = blocks.flagsEmptyHTML();
        return;
      }
      slot.innerHTML =
        '<div class="card-flat" style="margin-bottom: 24px;">' +
          '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div>' +
          '<div class="stack-3 streaming-flags-stack">' +
            flags.map(function (f) { return blocks.flagHTML(f, false); }).join('') +
          '</div>' +
        '</div>';
    },
```

- [ ] **Step 2: render-report.js — finalize uses it**

In `streaming.finalize(data, helpers)`, insert as the FIRST line of the function body:

```js
      this.renderFlagsFinal(data);
```

(The placeholder sweep later in `finalize` no longer sees a placeholder in the flags slot, and its `flagsEmptyHTML()` special case remains as dead-code safety for the zero-event path.)

- [ ] **Step 3: index.html — consume the authoritative keys**

In the `final_report` case (after `currentReportData.report_mode = data.report_mode;`), add:

```js
            // Authoritative snapshot — replaces the streamed preview
            // (spec 2026-08-03). verdict event already set counters, but
            // final_report wins: same server values, later snapshot.
            if (Array.isArray(data.flags)) currentReportData.flags = data.flags;
            if (data.counters) currentReportData.counters = data.counters;
            if (data.overall_verdict) currentReportData.overall_verdict = data.overall_verdict;
            // Belt-and-braces (spec): counters and flags now share one
            // snapshot, so a mismatch here means a server bug — make it
            // loud in the console rather than silently rendering.
            (function () {
              const fl = currentReportData.flags || [];
              const c = currentReportData.counters || {};
              const derived = {
                hard_errors: fl.filter(function (f) { return f.severity === 'hard'; }).length,
                medium_warnings: fl.filter(function (f) { return f.severity === 'medium'; }).length,
                low_notices: fl.filter(function (f) { return f.severity === 'low'; }).length
              };
              if (derived.hard_errors !== (c.hard_errors || 0) ||
                  derived.medium_warnings !== (c.medium_warnings || 0) ||
                  derived.low_notices !== (c.low_notices || 0)) {
                console.error('[integrity] final_report counters do not match its flags array', { counters: c, derived: derived });
              }
            })();
```

- [ ] **Step 4: index.html — reset_flags case**

Add to the switch, next to the `flag` case:

```js
          case 'reset_flags':
            // Server discarded attempt 1 (integrity retry): drop the
            // streamed preview so attempt 2 starts from a clean slate.
            currentReportData.flags = [];
            window.EHCRenderReport.streaming.resetFlags();
            break;
```

- [ ] **Step 5: verify the persisted payload path**

The `done` case persists `currentReportData` to sessionStorage — after Step 3 it now stores the authoritative flags. No change needed; confirm by reading the `done` case once.

- [ ] **Step 6: syntax check**

Run: `node --check public/assets/render-report.js` and load `public/index.html` mentally for balanced braces in the edited switch (or run `npx acorn --silent public/index.html` — skip if not installed; the live check in Task 8 is the real gate).

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/assets/render-report.js
git commit -m "fix(ui): render flags from the authoritative final_report snapshot; handle integrity retry reset"
```

---

### Task 6: Engine instructions v1.6 + registry version sync

**Files:**
- Modify: `rules/_engine/instructions.md`
- Modify: `rules/_registry.json` (`layers.engine` block only)

**Interfaces:** none (prompt text).

- [ ] **Step 1: version header + doc control**

- Header (line ~3): `Version 1.5 — July 2026` → `Version 1.6 — August 2026` (match exact existing formatting).
- Doc-control table (bottom of file): add row `| 1.6 | 2026-08-03 | Derived counters, lowercase severity enum, consolidated-flag counting; server-side integrity validation noted |` matching the table's column layout.

- [ ] **Step 2: severity enum made explicit**

In §4 (severity table section), directly after the table, add:

```markdown
In the tool payload, `severity` must be exactly `hard`, `medium`, or `low` (lowercase). RED / AMBER / BLUE are display labels only and are never valid `severity` values.
```

In §2 line ~43, replace the phrase `flag it as A10 AMBER` with `emit a flag with severity "medium" (rule A10, AMBER)`.

In §2 line ~63, replace `raise the A9 MEDIUM WARNING` with `raise an A9 flag with severity "medium" (AMBER)`.

- [ ] **Step 3: counters are derived, not authored**

In §7 Concise "Populate" list, replace the line:

```markdown
- `counters` — flag counts by severity (red / amber / blue)
```

with:

```markdown
- `counters` — derived strictly by counting the FINAL `flags` array (after calibration suppression, withdrawn-flag removal, consolidation, and deduplication): `hard_errors` = flags with severity `hard`, `medium_warnings` = `medium`, `low_notices` = `low`. Never author counters independently of the flags array — the server recomputes them from `flags` and rejects the report if they cannot be derived.
```

If §7's Full Report section carries the same `counters` bullet, apply the same replacement there.

- [ ] **Step 4: consolidated flags count once — restore the §2.5 reconciliation**

At the end of §2.5 ("Flag deduplication — one root cause, one flag"), add:

```markdown
A consolidated repeated-value flag (one flag naming several fields, e.g. field reference "I.1 / I.11") is a single flag for both deduplication and counting: it appears once in `flags` and counts once in `counters` at its stated severity. Consolidation does not withdraw the finding — never mark a consolidated flag as retracted, and never omit it from `flags` while still describing it in the checks table.
```

- [ ] **Step 5: registry engine version**

In `rules/_registry.json`, `layers.engine`: `"version": "1.4"` → `"version": "1.6"`, `"versionDate": "2026-07-04"` → `"versionDate": "2026-08-03"`. (This also closes the pre-existing 1.4-vs-1.5 mismatch — every stored report finally carries the true engine version.)

- [ ] **Step 6: validate**

Run: `node -e "JSON.parse(require('fs').readFileSync('rules/_registry.json','utf8')); console.log('registry ok')" && node --test tests/unit/`
Expected: `registry ok`, unit tests pass.

- [ ] **Step 7: Commit**

```bash
git add rules/_engine/instructions.md rules/_registry.json
git commit -m "fix(rules): engine v1.6 — derived counters, lowercase severity enum, consolidated-flag counting; registry engine version synced"
```

---

### Task 7: Golden corpus becomes a real gate

**Files:**
- Modify: `tests/fixtures/golden/manifest.json` (fill `expectedVerdict` + add `expectedHard`, `expectedMedium`)
- Modify: `tests/integration/golden-corpus.test.js` (assert verdict + hard + medium; stop skipping)

**Interfaces:** none.

**Note:** needs the local gitignored certs and API budget (~$0.25/cert). Execute WITH Silvia in the Task 8 session if budget is a concern; the code edits can be prepared first.

- [ ] **Step 1: read the current harness**

Read `tests/integration/golden-corpus.test.js` and `scripts/record-golden.js` fully. Identify: how manifest entries map to fixture files, where `expectedVerdict: null` causes a skip, and what the recorder outputs.

- [ ] **Step 2: relax the assertion surface**

Edit `golden-corpus.test.js` so each non-null manifest entry asserts EXACTLY: `report.overall_verdict === entry.expectedVerdict`, `report.counters.hard_errors === entry.expectedHard`, `report.counters.medium_warnings === entry.expectedMedium`. Low notices are intentionally NOT asserted (known run-to-run non-determinism, handoff note 2026-07-21). Keep the skip behavior for entries still null.

- [ ] **Step 3: record baselines (with Silvia)**

Run: `node scripts/record-golden.js`
Review each recorded verdict/hard/medium against the known character of each cert (e.g. the R2 Agro implanted-errors cert must be HOLD with ≥1 hard). Copy the reviewed values into `manifest.json` as `expectedVerdict`/`expectedHard`/`expectedMedium`.

- [ ] **Step 4: run the golden suite once**

Run: `node --test tests/integration/golden-corpus.test.js`
Expected: PASS for every filled entry.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/golden/manifest.json tests/integration/golden-corpus.test.js
git commit -m "test: golden corpus asserts verdict+hard+medium — no longer vacuously skipped"
```

---

### Task 8: Live validation (with Silvia)

**Files:** none (verification only).

- [ ] **Step 1:** `npm start`, run a clean cert through the UI. Verify: `[post-process] N flags (0 retracted stripped)` log; UI and PDF agree; `data/raw-reports/` gained a JSON file.
- [ ] **Step 2:** run the R2 Agro implanted-errors test cert. Verify HOLD, counters == rendered flag count == PDF "FINDINGS (N ACTIVE FLAGS)" N.
- [ ] **Step 3:** run `node --test tests/integration/sse-final-report.test.js` once (real API, ~$0.10) — the updated contract must pass.
- [ ] **Step 4:** if available, re-run the original 26/2/203073 certificate + photos — expect the GREAT BRITAN flag to now appear as a visible consolidated MEDIUM card with matching header.
- [ ] **Step 5:** merge decision with Silvia (superpowers:finishing-a-development-branch), then deploy to Render and verify the footer/startup log shows engine v1.6.
