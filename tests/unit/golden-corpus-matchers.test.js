'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { matchExpectedFindings } = require('../integration/golden-corpus-matchers.js');

// Coverage for the per-finding matcher that backs cert-26-2-120241's
// expectedFindings assertion in golden-corpus.test.js. This is a pure
// function with no API calls, so it's the free way to get real evidence for
// that matcher's logic — the integration test itself is out of bounds
// (real, paid Anthropic API calls) and was NOT run to produce this
// evidence.

const EXPECTED_FINDINGS = [
  { label: 'II.1 added-text-without-adjacent-stamp', pattern: 'II\\.1|adjacent stamp|added.?text', severity: 'hard' },
  { label: 'I.25 tickbox', pattern: 'I\\.25|tickbox', severity: null },
  { label: 'A9 signing-date-not-today', pattern: 'A9|signing date', severity: 'medium' }
];

function flag(severity, title) {
  return { severity, title, field_reference: title, description: title };
}

describe('matchExpectedFindings', () => {
  it('(a) passes when all three findings are present at their expected severities', () => {
    const flags = [
      flag('hard', 'II.1 added text without adjacent stamp'),
      flag('hard', 'I.25 tickbox mismatch'),
      flag('medium', 'A9 signing date not today')
    ];

    const result = matchExpectedFindings(flags, EXPECTED_FINDINGS);

    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
  });

  it('(b) fails and names I.25 when the I.25 finding is missing entirely', () => {
    const flags = [
      flag('hard', 'II.1 added text without adjacent stamp'),
      flag('medium', 'A9 signing date not today')
      // no I.25 flag at all
    ];

    const result = matchExpectedFindings(flags, EXPECTED_FINDINGS);

    assert.equal(result.ok, false);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /I\.25 tickbox/);
  });

  it('(c) passes when I.25 is present at the OTHER severity (severity unpinned)', () => {
    const flags = [
      flag('hard', 'II.1 added text without adjacent stamp'),
      flag('medium', 'I.25 tickbox mismatch'), // hard on golden run, medium here — both must pass
      flag('medium', 'A9 signing date not today')
    ];

    const result = matchExpectedFindings(flags, EXPECTED_FINDINGS);

    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
  });

  it('(d) fails and names II.1 when II.1 is present but its pinned severity has changed', () => {
    const flags = [
      flag('medium', 'II.1 added text without adjacent stamp'), // pinned hard, degraded to medium
      flag('hard', 'I.25 tickbox mismatch'),
      flag('medium', 'A9 signing date not today')
    ];

    const result = matchExpectedFindings(flags, EXPECTED_FINDINGS);

    assert.equal(result.ok, false);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /II\.1 added-text-without-adjacent-stamp/);
  });

  it('treats a missing/empty expectedFindings as trivially satisfied', () => {
    assert.deepEqual(matchExpectedFindings([], []), { ok: true, failures: [] });
    assert.deepEqual(matchExpectedFindings([], undefined), { ok: true, failures: [] });
  });

  it('tolerates a non-array flags argument defensively', () => {
    const result = matchExpectedFindings(null, EXPECTED_FINDINGS);
    assert.equal(result.ok, false);
    assert.equal(result.failures.length, 3);
  });
});
