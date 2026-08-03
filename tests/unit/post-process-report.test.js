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
