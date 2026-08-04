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

  // --- Soundness gap coverage (feat/selection-mismatch-guard) ---------
  //
  // A reviewer proved by execution that the old matcher could be satisfied
  // by a finding that was only *mentioned* inside another flag's free-text
  // description, and that it never enforced distinct flags per finding.
  // These tests pin down the fix: pattern matching restricted to
  // title/field_reference (never description), plus an exhaustive
  // backtracking assignment that requires each finding to claim its own
  // flag.

  it('RED-evidence counter-example: I.25 only named inside II.1\'s description must FAIL, naming I.25', () => {
    // Faithful reproduction of the reviewer's exact inputs. Against the
    // pre-fix matcher (which also searched `description`), this returned
    // { ok: true, failures: [] } — confirmed by direct execution before
    // this fix landed. It must now fail, and the failure must name I.25.
    const flags = [
      {
        severity: 'hard',
        title: 'II.1 added text...',
        field_reference: 'II.1',
        description:
          '...Note the I.25 tickbox selection nearby also looks inconsistent... though this was not raised as a separate flag.'
      },
      { severity: 'medium', title: 'A9 signing date not today', field_reference: 'A9', description: '...' }
    ];

    const result = matchExpectedFindings(flags, EXPECTED_FINDINGS);

    assert.equal(result.ok, false);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /I\.25 tickbox/);
  });

  it('three genuinely distinct flags, one per finding, pass', () => {
    const flags = [
      flag('hard', 'II.1 added text without adjacent stamp'),
      flag('hard', 'I.25 tickbox mismatch'),
      flag('medium', 'A9 signing date not today')
    ];

    const result = matchExpectedFindings(flags, EXPECTED_FINDINGS);

    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
  });

  it('distinctness enforced: one flag matching two findings, with no second flag, fails', () => {
    const findings = [
      { label: 'X', pattern: 'foo', severity: null },
      { label: 'Y', pattern: 'foo|bar', severity: null }
    ];
    // A single flag whose title matches BOTH patterns — only one finding
    // can claim it. The DFS visits findings in order, so X (index 0) claims
    // the only candidate first, leaving Y (index 1) with no distinct flag.
    const flags = [flag('low', 'foo bar shared marker')];

    const result = matchExpectedFindings(flags, findings);

    assert.equal(result.ok, false);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /"Y"/);
    assert.match(result.failures[0], /already claimed by another expected finding/);
  });

  it('a correct (non-greedy) assignment is found when a greedy first-match pass would fail', () => {
    // Finding A matches BOTH flags; finding B matches only the first flag.
    // A greedy left-to-right pass processes A first and grabs the first
    // matching flag (flag0) — leaving B with nothing, even though the
    // assignment A->flag1, B->flag0 satisfies both. This is exactly the
    // scenario the exhaustive backtracking search exists to solve.
    const findings = [
      { label: 'A', pattern: 'alpha', severity: null },
      { label: 'B', pattern: 'beta', severity: null }
    ];
    const flags = [
      flag('low', 'alpha beta shared marker'), // matches both A and B
      flag('low', 'alpha only marker')          // matches only A
    ];

    const result = matchExpectedFindings(flags, findings);

    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
  });
});
