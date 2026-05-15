'use strict';

// Integration tests for runCheckStream against the real Anthropic API.
//
// Runs the cert through concise mode and asserts on the SSE event
// contract (Shape 1): verdict event payload, final_report event
// payload, event sequence and cardinality, plus postProcessReport
// invariants and tool-schema enums.
//
// Requires:
//   - ANTHROPIC_API_KEY in .env at the repo root
//   - tests/fixtures/cert-26-2-126149.pdf (gitignored; see tests/README.md)
//
// Cost: ~$0.10 per run. Time: ~120-130s.
// Concise-mode smoke test. Full mode is intentionally excluded
// (see comment block above before() for rationale).

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'cert-26-2-126149.pdf');

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    'ANTHROPIC_API_KEY missing in .env — integration tests require a real API key. ' +
    'See tests/README.md.'
  );
}
if (!fs.existsSync(FIXTURE_PATH)) {
  throw new Error(
    `Fixture missing: ${FIXTURE_PATH}\n` +
    'Copy from the Desktop folder per tests/README.md before running integration tests.'
  );
}

const { runCheckStream } = require('../../src/check.js');

// ─── Contract constants ────────────────────────────────────────────────
const VERDICT_ENUM   = ['PASS', 'HOLD'];
const SEVERITY_ENUM  = ['hard', 'medium', 'low'];
// RESULT_ENUM is sections-only; reserved for future full-mode
// integration test (Phase 8+ observation). Unused in concise-mode
// smoke test.
const RESULT_ENUM    = ['PASS', 'FAIL', 'WARNING', 'NOTICE', 'N/A'];
const CERT_TYPE_ENUM = ['8468', '8322', '8384', '8324', '8350', '8436', '8471', 'unknown'];

// applyReportMeta builds rule_set_version as `${version} — ${versionDate}`
// with a space-em-dash-space separator (src/check.js:930). Date is YYYY-MM-DD.
const RULE_SET_VERSION_REGEX = /^\S.+ — \d{4}-\d{2}-\d{2}$/;

// Verbatim keys of the final_report event payload (src/check.js:1069–1079).
// `checks_performed` is slated for removal at Phase 8 obs #37 — when that
// commit lands, drop it from this list and from src/check.js together.
const FINAL_REPORT_KEYS = [
  'certificate_info',
  'sections',
  'rule_set_update_recommendations',
  'rule_set_version',
  'processing_time_seconds',
  'tokens_used',
  'checker_model',
  'report_mode',
  'checks_performed'
];

const TOKENS_USED_KEYS = ['input', 'output', 'cache_creation', 'cache_read'];

async function runOne(mode) {
  const pdfBuffer = fs.readFileSync(FIXTURE_PATH);
  const files = [{
    filename: 'cert-26-2-126149.pdf',
    buffer: pdfBuffer,
    mimetype: 'application/pdf'
  }];
  const fields = { consignorId: 'saputo-county-milk' };
  const events = [];

  let report;
  let threw = null;
  try {
    report = await runCheckStream({
      files,
      fields,
      mode,
      onEvent: (name, data) => events.push({ name, data }),
      signal: undefined
    });
  } catch (err) {
    threw = err;
  }
  return { events, report, threw };
}

describe('runCheckStream integration — real Anthropic API', () => {
  let conciseResult;

  // Concise-mode smoke test against the real Anthropic API. 17
  // contract assertions on the SSE event payloads, covering the
  // primary OV workflow path.
  //
  // What this test does NOT cover (intentional):
  //   - Full report mode (separate test observation post-handover;
  //     full mode runs ~256s and generates ~14-16k output tokens,
  //     unsuitable for daily smoke test budget)
  //   - Cold-cache behaviour (test always runs in fresh Node process)
  //   - Auto-consignor path (consignorId is set explicitly)
  // These warrant separate test observations.
  before(async () => {
    conciseResult = await runOne('concise');
  }, { timeout: 180000 });

  function assertModeContract(label, getResult, expectedMode) {

    it(`[${label}] #1 — runCheckStream did not throw`, () => {
      const result = getResult();
      assert.equal(result.threw, null,
        result.threw ? `threw: ${result.threw.message}\n${result.threw.stack}` : '');
    });

    it(`[${label}] #2 — verdict event fires exactly once`, () => {
      const verdictEvents = getResult().events.filter(e => e.name === 'verdict');
      assert.equal(verdictEvents.length, 1);
    });

    it(`[${label}] #3 — final_report event fires exactly once`, () => {
      const finalEvents = getResult().events.filter(e => e.name === 'final_report');
      assert.equal(finalEvents.length, 1);
    });

    it(`[${label}] #4 — verdict fires before final_report`, () => {
      const events = getResult().events;
      const vIdx = events.findIndex(e => e.name === 'verdict');
      const fIdx = events.findIndex(e => e.name === 'final_report');
      assert.ok(vIdx >= 0 && fIdx >= 0 && vIdx < fIdx,
        `event order: ${events.map(e => e.name).join(' → ')}`);
    });

    it(`[${label}] #5 — verdict.overall_verdict ∈ VERDICT_ENUM`, () => {
      const v = getResult().events.find(e => e.name === 'verdict').data;
      assert.ok(VERDICT_ENUM.includes(v.overall_verdict),
        `got ${v.overall_verdict}`);
    });

    it(`[${label}] #6 — verdict counters are non-negative integers`, () => {
      const v = getResult().events.find(e => e.name === 'verdict').data;
      for (const k of ['hard_errors', 'medium_warnings', 'low_notices']) {
        assert.equal(typeof v[k], 'number');
        assert.ok(Number.isInteger(v[k]) && v[k] >= 0, `${k}=${v[k]}`);
      }
    });

    it(`[${label}] #7 — final_report has exactly the 9 expected keys`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.deepEqual(Object.keys(f).sort(), [...FINAL_REPORT_KEYS].sort());
    });

    it(`[${label}] #8 — final_report.report_mode === '${expectedMode}'`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.equal(f.report_mode, expectedMode);
    });

    it(`[${label}] #9 — final_report.rule_set_version matches version regex`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.match(f.rule_set_version, RULE_SET_VERSION_REGEX);
    });

    it(`[${label}] #10 — final_report.processing_time_seconds is positive number`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.equal(typeof f.processing_time_seconds, 'number');
      assert.ok(f.processing_time_seconds > 0);
    });

    it(`[${label}] #11 — final_report.tokens_used has 4 non-negative numeric keys`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.deepEqual(Object.keys(f.tokens_used).sort(), [...TOKENS_USED_KEYS].sort());
      for (const k of TOKENS_USED_KEYS) {
        assert.equal(typeof f.tokens_used[k], 'number');
        assert.ok(f.tokens_used[k] >= 0, `${k}=${f.tokens_used[k]}`);
      }
    });

    it(`[${label}] #12 — final_report.checker_model is a non-empty string`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.equal(typeof f.checker_model, 'string');
      assert.ok(f.checker_model.length > 0);
    });

    it(`[${label}] #13 — certificate_info.certificate_ref is a non-empty string`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.equal(typeof f.certificate_info.certificate_ref, 'string');
      assert.ok(f.certificate_info.certificate_ref.length > 0);
    });

    it(`[${label}] #14 — certificate_info.certificate_type ∈ CERT_TYPE_ENUM`, () => {
      const f = getResult().events.find(e => e.name === 'final_report').data;
      assert.ok(CERT_TYPE_ENUM.includes(f.certificate_info.certificate_type),
        `got "${f.certificate_info.certificate_type}"`);
    });

    it(`[${label}] #15 — every flag has severity ∈ SEVERITY_ENUM + 4 required fields`, () => {
      // Flags live on the returned report (not the final_report event).
      // Tool schema: required = ['severity', 'field_reference', 'title', 'description']
      const flags = getResult().report.flags || [];
      for (const flag of flags) {
        assert.ok(SEVERITY_ENUM.includes(flag.severity),
          `severity="${flag.severity}" not in ${SEVERITY_ENUM.join('/')}`);
        assert.equal(typeof flag.field_reference, 'string');
        assert.equal(typeof flag.title, 'string');
        assert.equal(typeof flag.description, 'string');
      }
    });

    it(`[${label}] #16 — counters match flag-severity counts (postProcessReport invariant)`, () => {
      const report = getResult().report;
      const flags = report.flags || [];
      const c = report.counters;
      assert.equal(c.hard_errors,     flags.filter(x => x.severity === 'hard').length);
      assert.equal(c.medium_warnings, flags.filter(x => x.severity === 'medium').length);
      assert.equal(c.low_notices,     flags.filter(x => x.severity === 'low').length);
    });

    it(`[${label}] #17 — verdict derivation: PASS iff hard=0 && medium=0`, () => {
      const report = getResult().report;
      const c = report.counters;
      const expected = (c.hard_errors === 0 && c.medium_warnings === 0) ? 'PASS' : 'HOLD';
      assert.equal(report.overall_verdict, expected);
    });
  }

  assertModeContract('concise', () => conciseResult, 'concise');

});
