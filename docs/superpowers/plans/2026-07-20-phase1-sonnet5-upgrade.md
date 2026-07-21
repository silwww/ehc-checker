# Phase 1 — Sonnet 5 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the checker model from `claude-sonnet-4-6` to `claude-sonnet-5`, validated against a saved golden regression corpus, with real per-check cost telemetry.

**Architecture:** The model id is a single env-overridable constant (`src/check.js:26`). Before swapping it, add (a) a cost-telemetry helper that turns the already-logged token usage into a USD figure, and (b) a golden-corpus harness that runs real certificates through `runCheckStream` and compares verdicts to human-verified expected values. Then swap the model and validate the corpus against Sonnet 5.

**Tech Stack:** Node.js ≥20, `node:test` built-in test runner (no external framework), `@anthropic-ai/sdk`, Anthropic Messages streaming API.

## Global Constraints

- Model id must stay env-overridable via `CLAUDE_MODEL` — never hardcode past the default (rollback lever).
- No real certificate PDF enters git. Golden certs live in `tests/fixtures/golden/` and are git-ignored; only the expected-verdict manifest is committed. Mirror the existing rule `tests/fixtures/*.pdf` at `.gitignore`.
- Golden expected verdicts are OV-verified-correct, authored by Silvia — never fabricated from a single model run.
- No silent failures: a missing cert file or an unrecorded expected verdict must produce a clear skip message, never a false pass.
- `node:test` fast suite (`npm test`) must not call the Anthropic API. Real-API checks run only under `npm run test:integration`.
- The `final_report` SSE payload keys are contract (asserted in `tests/integration/sse-final-report.test.js` `FINAL_REPORT_KEYS`). Do not add keys to that payload in this phase — cost telemetry goes to logs only.

---

### Task 1: Cost telemetry helper

**Files:**
- Create: `src/pricing.js`
- Create: `tests/unit/pricing.test.js`
- Modify: `src/check.js` (add require near line 14; add cost log after the usage log at line 1105)

**Interfaces:**
- Produces: `computeCostUsd(model: string, usage: {input_tokens, output_tokens, cache_read_input_tokens?, cache_creation_input_tokens?}) => number | null` — USD cost rounded to 4 dp, or `null` for an unknown model. Also exports `MODEL_PRICING`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pricing.test.js`:

```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeCostUsd } = require('../../src/pricing');

describe('computeCostUsd', () => {
  it('computes Sonnet 5 intro cost from input+output tokens', () => {
    const usage = {
      input_tokens: 60000,
      output_tokens: 6000,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0
    };
    // 60000*2/1e6 + 6000*10/1e6 = 0.12 + 0.06 = 0.18
    assert.equal(computeCostUsd('claude-sonnet-5', usage), 0.18);
  });

  it('computes Sonnet 4.6 cost from input+output tokens', () => {
    const usage = { input_tokens: 60000, output_tokens: 6000 };
    // 60000*3/1e6 + 6000*15/1e6 = 0.18 + 0.09 = 0.27
    assert.equal(computeCostUsd('claude-sonnet-4-6', usage), 0.27);
  });

  it('returns null for an unknown model', () => {
    assert.equal(computeCostUsd('some-other-model', { input_tokens: 1 }), null);
  });

  it('treats missing token fields as zero', () => {
    assert.equal(computeCostUsd('claude-sonnet-5', {}), 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/pricing.test.js`
Expected: FAIL — `Cannot find module '../../src/pricing'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/pricing.js`:

```js
'use strict';

// USD per 1,000,000 tokens.
// Sonnet 5 shows introductory pricing in effect through 2026-08-31
// ($2 input / $10 output); standard pricing ($3 / $15) applies after that
// date — update the sonnet-5 numbers here when the introductory period ends.
// Cache read is 0.1x input; cache write is 1.25x input (Anthropic standard).
const MODEL_PRICING = {
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-sonnet-5':   { input: 2, output: 10, cacheRead: 0.20, cacheWrite: 2.50 }
};

/**
 * Turn an Anthropic usage object into a USD cost for the given model.
 * Returns null if the model has no pricing entry (so the caller can log
 * 'n/a' rather than a wrong number).
 */
function computeCostUsd(model, usage) {
  const p = MODEL_PRICING[model];
  if (!p) return null;
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const cost =
    (input * p.input +
     output * p.output +
     cacheRead * p.cacheRead +
     cacheWrite * p.cacheWrite) / 1000000;
  return Math.round(cost * 10000) / 10000;
}

module.exports = { MODEL_PRICING, computeCostUsd };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/pricing.test.js`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Wire the cost log into the stream completion**

In `src/check.js`, add the require alongside the other local requires (after line 20 `const partialJson = require('partial-json');`):

```js
const { computeCostUsd } = require('./pricing');
```

Then, immediately after the existing usage log line (currently `src/check.js:1105`, the `[check-stream] Claude stream completed ...` line), add:

```js
  const costUsd = computeCostUsd(MODEL, usage);
  console.log(`[cost] model=${MODEL} check_cost_usd=${costUsd === null ? 'n/a' : '$' + costUsd.toFixed(4)} (input=${usage.input_tokens || 0}, output=${usage.output_tokens || 0}, cache_read=${usage.cache_read_input_tokens || 0}, cache_creation=${usage.cache_creation_input_tokens || 0})`);
```

- [ ] **Step 6: Run the fast suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — existing util/unit tests plus the new `pricing.test.js` all pass. No API calls.

- [ ] **Step 7: Commit**

```bash
git add src/pricing.js tests/unit/pricing.test.js src/check.js
git commit -m "feat(telemetry): log per-check USD cost from token usage"
```

---

### Task 2: Golden corpus harness

**Files:**
- Create: `tests/fixtures/golden/manifest.json`
- Create: `tests/fixtures/golden/.gitkeep`
- Create: `tests/unit/golden-manifest.test.js`
- Create: `tests/integration/golden-corpus.test.js`
- Create: `scripts/record-golden.js`
- Modify: `.gitignore` (add golden certs rule)
- Modify: `tests/README.md` (document the golden corpus)

**Interfaces:**
- Produces: manifest shape `{ certificates: Array<{ id, file, consignorId, expectedVerdict: 'PASS'|'HOLD'|null, expectedCertType, expectedFlags: {hard_errors, medium_warnings, low_notices} }> }`. `expectedVerdict: null` marks an entry whose correct verdict Silvia has not yet recorded — the integration test skips it.
- Consumes (integration test only): `runCheckStream` from `src/check.js` (signature: `runCheckStream({ files, fields, mode, onEvent, signal }) => Promise<report>`, where `report.overall_verdict` is `'PASS'|'HOLD'` and `report.counters` is `{hard_errors, medium_warnings, low_notices}`).

- [ ] **Step 1: Add the git-ignore rule so golden certs never get committed**

In `.gitignore`, under the existing `# Test fixtures` block, add a line after `!tests/fixtures/.gitkeep`:

```
# Golden regression corpus — real cert PDFs, never commit (only manifest.json is tracked)
tests/fixtures/golden/*.pdf
```

- [ ] **Step 2: Create the committed manifest with a seed entry**

Create `tests/fixtures/golden/manifest.json`:

```json
{
  "$comment": "Golden regression corpus. Real cert PDFs sit beside this file and are git-ignored (tests/fixtures/golden/*.pdf); only this manifest is committed. Each expectedVerdict is OV-verified-correct, not merely echoed from a model run. expectedVerdict: null means 'not yet recorded' — the integration test skips that entry until it is filled.",
  "certificates": [
    {
      "id": "cert-26-2-126149",
      "file": "cert-26-2-126149.pdf",
      "consignorId": "saputo-county-milk",
      "expectedVerdict": null,
      "expectedCertType": "8322",
      "expectedFlags": { "hard_errors": 0, "medium_warnings": 0, "low_notices": 0 },
      "note": "seed — same PDF as the existing integration fixture; record expectedVerdict after the OV confirms the baseline run"
    }
  ]
}
```

- [ ] **Step 3: Create the .gitkeep so the folder exists on a fresh clone**

Create empty file `tests/fixtures/golden/.gitkeep` (no content).

- [ ] **Step 4: Write the failing manifest-shape unit test**

Create `tests/unit/golden-manifest.test.js`:

```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_PATH = path.join(__dirname, '..', 'fixtures', 'golden', 'manifest.json');
const VERDICT_ENUM = ['PASS', 'HOLD'];

describe('golden corpus manifest', () => {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw);

  it('is valid JSON with a certificates array', () => {
    assert.ok(Array.isArray(manifest.certificates));
    assert.ok(manifest.certificates.length >= 1);
  });

  it('every entry has the required shape', () => {
    for (const c of manifest.certificates) {
      assert.equal(typeof c.id, 'string', `id on ${JSON.stringify(c)}`);
      assert.equal(typeof c.file, 'string', `file on ${c.id}`);
      assert.equal(typeof c.consignorId, 'string', `consignorId on ${c.id}`);
      assert.ok(
        c.expectedVerdict === null || VERDICT_ENUM.includes(c.expectedVerdict),
        `expectedVerdict on ${c.id} must be null or one of ${VERDICT_ENUM.join('/')}`
      );
      assert.equal(typeof c.expectedFlags, 'object', `expectedFlags on ${c.id}`);
    }
  });
});
```

- [ ] **Step 5: Run the unit test to verify it passes**

Run: `node --test tests/unit/golden-manifest.test.js`
Expected: PASS — 2 tests pass (manifest parses, seed entry has valid shape).

- [ ] **Step 6: Write the integration test that runs present certs and compares verdicts**

Create `tests/integration/golden-corpus.test.js`:

```js
'use strict';

// Golden regression corpus against the real Anthropic API.
// For each manifest entry: skip if the PDF is not present locally, skip if
// its expectedVerdict has not been recorded yet, otherwise run the check and
// assert the verdict + flag counters match the OV-verified expected values.
//
// Requires ANTHROPIC_API_KEY in .env and the real PDFs in tests/fixtures/golden/.
// Run with: npm run test:integration

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { runCheckStream } = require('../../src/check.js');

const GOLDEN_DIR = path.join(__dirname, '..', 'fixtures', 'golden');
const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'manifest.json'), 'utf8'));

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY missing in .env — golden corpus needs a real API key.');
}

async function runCert(entry) {
  const pdfBuffer = fs.readFileSync(path.join(GOLDEN_DIR, entry.file));
  const files = [{ filename: entry.file, buffer: pdfBuffer, mimetype: 'application/pdf' }];
  const fields = entry.consignorId ? { consignorId: entry.consignorId } : {};
  return runCheckStream({ files, fields, mode: 'concise', onEvent: () => {}, signal: undefined });
}

describe('golden corpus — verdicts match OV-verified expected values', () => {
  for (const entry of manifest.certificates) {
    const present = fs.existsSync(path.join(GOLDEN_DIR, entry.file));

    it(`${entry.id} — verdict matches expected`, { skip: !present
        ? `PDF not present locally (${entry.file}) — copy it into tests/fixtures/golden/`
        : entry.expectedVerdict === null
          ? 'expectedVerdict not recorded yet — run baseline, confirm, then fill manifest'
          : false
    }, async () => {
      const report = await runCert(entry);
      assert.equal(report.overall_verdict, entry.expectedVerdict,
        `${entry.id}: verdict`);
      assert.deepEqual(
        {
          hard_errors: report.counters.hard_errors,
          medium_warnings: report.counters.medium_warnings,
          low_notices: report.counters.low_notices
        },
        entry.expectedFlags,
        `${entry.id}: flag counters`
      );
    });
  }
});
```

- [ ] **Step 7: Run the integration test to confirm it skips gracefully**

Run: `npm run test:integration`
Expected: PASS — the seed entry is reported as skipped (either "PDF not present" or "expectedVerdict not recorded yet"), and the existing `sse-final-report` test runs. No assertion failure from the golden suite.

- [ ] **Step 8: Add the baseline-recording helper script**

The integration test deliberately *skips* entries whose `expectedVerdict` is
`null` (it must never assert against an unrecorded value). Recording the
baseline is therefore a separate, explicit tool — not a test that asserts
nothing. Create `scripts/record-golden.js`:

```js
'use strict';

// One-off helper to capture actual verdicts for golden corpus entries.
// Runs each PRESENT cert through the checker and prints verdict + counters so
// the OV can confirm them and write them into manifest.json. This is a tool,
// not a test — it never asserts. Uses whatever model CLAUDE_MODEL selects
// (default in src/check.js), so run it under the model you want to baseline.
//
// Run: node scripts/record-golden.js
//   or: CLAUDE_MODEL=claude-sonnet-4-6 node scripts/record-golden.js

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { runCheckStream } = require('../src/check.js');

const GOLDEN_DIR = path.join(__dirname, '..', 'tests', 'fixtures', 'golden');
const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'manifest.json'), 'utf8'));

(async () => {
  for (const entry of manifest.certificates) {
    const pdfPath = path.join(GOLDEN_DIR, entry.file);
    if (!fs.existsSync(pdfPath)) {
      console.log(`SKIP   ${entry.id}: ${entry.file} not present locally`);
      continue;
    }
    const files = [{ filename: entry.file, buffer: fs.readFileSync(pdfPath), mimetype: 'application/pdf' }];
    const fields = entry.consignorId ? { consignorId: entry.consignorId } : {};
    try {
      const report = await runCheckStream({ files, fields, mode: 'concise', onEvent: () => {}, signal: undefined });
      console.log(`RECORD ${entry.id}: verdict=${report.overall_verdict} flags=${JSON.stringify(report.counters)}`);
    } catch (err) {
      console.log(`ERROR  ${entry.id}: ${err.code || ''} ${err.message}`);
    }
  }
})();
```

- [ ] **Step 9: Document the golden corpus in tests/README.md**

Append to `tests/README.md`:

```markdown
## Golden regression corpus

`tests/fixtures/golden/` holds real certificate PDFs (git-ignored, like the
other fixtures) plus a committed `manifest.json` of OV-verified expected
verdicts. To use it:

1. Copy representative cert PDFs into `tests/fixtures/golden/`.
2. Add an entry per cert to `manifest.json` (id, file, consignorId,
   expectedCertType, expectedFlags). Leave `expectedVerdict: null` at first.
3. Run `node scripts/record-golden.js` to print the actual verdict per cert.
   Confirm each is correct, then set `expectedVerdict` (`PASS` or `HOLD`) and
   the flag counts in the manifest.
4. From then on, `npm run test:integration` fails loudly if any model or rule
   set change alters a recorded verdict.

The integration test skips entries with a missing PDF or `expectedVerdict:
null` (never fails them), so the corpus is safe to run on a machine that has
only some of the certs. `record-golden.js` is the tool for capturing verdicts
before they are recorded.
```

- [ ] **Step 10: Commit**

```bash
git add .gitignore tests/fixtures/golden/manifest.json tests/fixtures/golden/.gitkeep tests/unit/golden-manifest.test.js tests/integration/golden-corpus.test.js scripts/record-golden.js tests/README.md
git commit -m "test(golden): add regression corpus harness (local certs, committed verdicts)"
```

---

### Task 3: Swap model to Sonnet 5

**Files:**
- Modify: `src/check.js:26`
- Modify: `public/assets/render-report.js:329`

**Interfaces:**
- Consumes: nothing new.
- Produces: default `MODEL === 'claude-sonnet-5'` when `CLAUDE_MODEL` is unset.

- [ ] **Step 1: Change the model default**

In `src/check.js:26`, change:

```js
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
```

to:

```js
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
```

- [ ] **Step 2: Update the cosmetic footer fallback string**

In `public/assets/render-report.js:329`, change the fallback in:

```js
          · Model: ${escapeHtml(data.checker_model || 'claude-sonnet-4-6')}
```

to:

```js
          · Model: ${escapeHtml(data.checker_model || 'claude-sonnet-5')}
```

- [ ] **Step 3: Run the fast suite**

Run: `npm test`
Expected: PASS — no unit test hardcodes the model id, so all pass.

- [ ] **Step 4: Commit**

```bash
git add src/check.js public/assets/render-report.js
git commit -m "feat(model): default checker model to claude-sonnet-5 (env-overridable)"
```

---

### Task 4: Validate Sonnet 5 against the corpus (OV-in-the-loop)

This task has no code deliverable — it produces confidence and a filled manifest. It requires Silvia (the OV) because expected verdicts and discrepancy triage are domain judgement. Do not merge Phase 1 until this task is complete.

**Files:**
- Modify (data, by Silvia): `tests/fixtures/golden/manifest.json` (add certs, fill expected verdicts)

- [ ] **Step 1: Populate the corpus locally**

Silvia copies 3–5 representative cert PDFs into `tests/fixtures/golden/` — including the 3 false-positive cases that rule set v4.5 fixed — and adds a manifest entry for each (leaving `expectedVerdict: null` for now).

- [ ] **Step 2: Capture the Sonnet 4.6 baseline**

Run the recording helper on the old model to see current verdicts and cost:

Run: `CLAUDE_MODEL=claude-sonnet-4-6 node scripts/record-golden.js`
Expected: one `RECORD <id>: verdict=... flags=...` line per present cert, plus the `[cost]` log line per cert. These are the actual Sonnet 4.6 verdicts to confirm.

- [ ] **Step 3: Record OV-verified expected verdicts**

Silvia confirms each baseline verdict is actually correct, then writes `expectedVerdict` and `expectedFlags` into the manifest for each entry. The 3 false-positive certs must be recorded as clean (`PASS`, zero errors where v4.5 resolved them).

- [ ] **Step 4: Run the corpus against Sonnet 5**

Run: `npm run test:integration`
(default model is now `claude-sonnet-5`)
Expected: every recorded entry PASSES the verdict + counter assertions.

- [ ] **Step 5: Triage any discrepancy**

For any entry where Sonnet 5 differs from the recorded expected verdict: inspect the report, decide whether Sonnet 5 is wrong (blocker — investigate before merge) or whether the expected value was itself wrong (correct the manifest). The 3 false-positive cases staying clean is a hard gate.

- [ ] **Step 6: Record real per-cert cost**

From the `[cost]` log lines, note the actual USD cost per certificate on Sonnet 5 vs the 4.6 baseline, replacing the spec's estimates.

- [ ] **Step 7: Commit the filled manifest**

```bash
git add tests/fixtures/golden/manifest.json
git commit -m "test(golden): record OV-verified expected verdicts for Sonnet 5 validation"
```

---

## Merge

Once Task 4 passes with no unresolved discrepancy: merge `chore/sonnet-5-upgrade` into `main`, let Render auto-deploy, and confirm the live footer shows `claude-sonnet-5`. Rollback if needed via the `CLAUDE_MODEL=claude-sonnet-4-6` env var on Render (no redeploy).

## Self-review notes

- **Spec coverage:** model swap (Task 3), env-overridable rollback (Global Constraints + Merge), golden corpus with local certs + committed verdicts (Task 2), 3 false-positive gate (Task 4 Step 5), cost telemetry (Task 1), integration suite run (Task 4). All Phase 1 spec items map to a task.
- **No API in fast suite:** pricing + manifest-shape tests are pure; corpus API test is integration-only (Global Constraints).
- **Contract safety:** cost telemetry is log-only; `final_report` payload keys unchanged (Global Constraints).
