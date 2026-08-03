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
      // expectedHard/expectedMedium are what golden-corpus.test.js actually
      // asserts against once a verdict is recorded — a recorded verdict
      // with no counters to check it against is a silently-incomplete
      // baseline, so require both once expectedVerdict is set.
      if (c.expectedVerdict !== null) {
        assert.ok(
          Number.isInteger(c.expectedHard),
          `expectedHard on ${c.id} must be an integer once expectedVerdict is recorded`
        );
        assert.ok(
          Number.isInteger(c.expectedMedium),
          `expectedMedium on ${c.id} must be an integer once expectedVerdict is recorded`
        );
      }
    }
  });
});
