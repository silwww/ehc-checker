'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_PATH = path.join(__dirname, '..', 'fixtures', 'golden', 'manifest.json');
const VERDICT_ENUM = ['PASS', 'HOLD'];
const FLAG_SEVERITIES = ['hard', 'medium', 'low'];

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
      // `typeof null === 'object'` in JS, so a bare `typeof === 'object'`
      // check is vacuously true for null and never actually distinguishes
      // "not yet recorded" from a real object — branch on null explicitly.
      const flagsIsNull = c.expectedFlags === null;
      const flagsIsPlainObject = c.expectedFlags !== null &&
        typeof c.expectedFlags === 'object' &&
        !Array.isArray(c.expectedFlags);
      assert.ok(
        flagsIsNull || flagsIsPlainObject,
        `expectedFlags on ${c.id} must be null or a plain object`
      );
      // expectedFindings (per-finding matchers) is an alternative to the
      // expectedHard/expectedMedium counters, used where a fixed
      // hard/medium split is not a reliable baseline (e.g. cert-26-2-120241,
      // where I.25's severity has been observed to oscillate run-to-run
      // even with the correct consignor loaded). When present, validate its
      // shape.
      if (c.expectedFindings !== undefined) {
        assert.ok(
          Array.isArray(c.expectedFindings) && c.expectedFindings.length > 0,
          `expectedFindings on ${c.id} must be a non-empty array when present`
        );
        for (const finding of c.expectedFindings) {
          assert.equal(typeof finding.label, 'string', `expectedFindings[].label on ${c.id}`);
          assert.equal(typeof finding.pattern, 'string', `expectedFindings[].pattern on ${c.id}`);
          assert.doesNotThrow(
            () => new RegExp(finding.pattern, 'i'),
            `expectedFindings[].pattern on ${c.id} must be a valid regex`
          );
          assert.ok(
            finding.severity === null || finding.severity === undefined || FLAG_SEVERITIES.includes(finding.severity),
            `expectedFindings[].severity on ${c.id} must be null/undefined (severity not pinned) or one of ${FLAG_SEVERITIES.join('/')}`
          );
        }
      }

      // expectedHard/expectedMedium are what golden-corpus.test.js asserts
      // against once a verdict is recorded — a recorded verdict with
      // nothing to check it against is a silently-incomplete baseline, so
      // once expectedVerdict is set, require EITHER both counters OR a
      // non-empty expectedFindings array (per-finding matchers are strictly
      // stronger than counters — see cert-26-2-120241's note — so they
      // satisfy the same "there's something to check the verdict against"
      // requirement).
      if (c.expectedVerdict !== null) {
        const hasCounters = Number.isInteger(c.expectedHard) && Number.isInteger(c.expectedMedium);
        const hasFindings = Array.isArray(c.expectedFindings) && c.expectedFindings.length > 0;
        assert.ok(
          hasCounters || hasFindings,
          `${c.id}: once expectedVerdict is recorded, entry needs either integer expectedHard+expectedMedium, or a non-empty expectedFindings array`
        );
      }
    }
  });
});
