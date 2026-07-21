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
