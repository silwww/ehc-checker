'use strict';

// Deterministic coverage for the certificate-type gate in buildCheckParams.
//
// effectiveCertType is validated against the registry only when the OV
// picks the type manually; a DETECTED type is passed through raw. Two
// reachable producers of a type the registry does not know:
//   1. detectCertType's stage-1 footer regex returns whatever four digits
//      precede "EHC" — any real UK EHC template not yet registered.
//   2. detectCertType returns the literal '8322-or-8324-ambiguous' marker.
// Both must surface the EXISTING recoverable CERT_TYPE_REQUIRED error so
// the OV gets the manual type-picker and can re-run — never a raw crash,
// and never a silent fallback to another commodity's rule set.
//
// Isolation: same Module.prototype.require hook as retry-integrity.test.js
// — the Anthropic SDK is mocked BEFORE src/check.js is required (no
// network, no API key), and pdf-parse is mocked so the certificate text
// (and therefore detectCertType's answer) is chosen by the test instead of
// by a fixture PDF. buildCheckParams is called directly: it throws before
// any API call, so no stream is needed.

process.env.EHC_NO_RAW_PERSIST = '1';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Text handed to every pdf-parse call; set per scenario.
let pdfText = '';

class MockAnthropic {
  constructor() {
    this.messages = { stream: () => { throw new Error('Test bug: no API call expected'); } };
  }
}

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === '@anthropic-ai/sdk') return MockAnthropic;
  if (id === 'pdf-parse') return async () => ({ text: pdfText });
  return originalRequire.apply(this, arguments);
};
const { buildCheckParams, detectCertType } = require('../../src/check');
Module.prototype.require = originalRequire;

const REGISTRY = require('../../rules/_registry.json');

function makeFiles() {
  return [{
    filename: 'EHC 26-2-097680.pdf',
    buffer: Buffer.from('not a real pdf'),
    mimetype: 'application/pdf'
  }];
}

// Stage-1 footer regex: any four digits before "EHC". 8449 is a real UK
// template that is not in the registry.
const UNREGISTERED_TEXT = 'EXPORT HEALTH CERTIFICATE\n8449EHC\nI.1 Consignor';

// Stage-3 I.25 tickbox anchors match BOTH 8322 and 8324, and the commodity
// disambiguation finds neither dairy nor petfood outside the I.25 span.
const AMBIGUOUS_TEXT =
  'Veterinary certificate\nCommodity certified for Animal feedingstuff ' +
  'Further process Production of petfood Technical use\nI.1 Consignor';

async function expectCertTypeRequired(text) {
  pdfText = text;
  let caught = null;
  try {
    await buildCheckParams({ files: makeFiles(), fields: {}, mode: 'concise' });
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, 'buildCheckParams must reject');
  return caught;
}

describe('unregistered / ambiguous certificate type', () => {
  it('an unregistered four-digit code surfaces the recoverable CERT_TYPE_REQUIRED error, not a skeleton crash', async () => {
    assert.equal(detectCertType(UNREGISTERED_TEXT), '8449');
    assert.equal(REGISTRY.certificateTypes['8449'], undefined, 'fixture requires 8449 to be absent from the registry');

    const err = await expectCertTypeRequired(UNREGISTERED_TEXT);
    assert.equal(err.code, 'CERT_TYPE_REQUIRED');
    assert.equal(err.statusCode, 400);
    assert.doesNotMatch(err.message, /skeleton:/);
    assert.ok(Array.isArray(err.certificateTypes) && err.certificateTypes.length > 0);
    assert.deepEqual(
      err.certificateTypes.map((t) => t.code).sort(),
      Object.keys(REGISTRY.certificateTypes).sort()
    );
    for (const t of err.certificateTypes) {
      assert.ok(typeof t.code === 'string' && typeof t.title === 'string');
    }
  });

  it("the '8322-or-8324-ambiguous' marker surfaces the same recoverable error", async () => {
    assert.equal(detectCertType(AMBIGUOUS_TEXT), '8322-or-8324-ambiguous');

    const err = await expectCertTypeRequired(AMBIGUOUS_TEXT);
    assert.equal(err.code, 'CERT_TYPE_REQUIRED');
    assert.equal(err.statusCode, 400);
    assert.ok(Array.isArray(err.certificateTypes) && err.certificateTypes.length > 0);
  });

  it('a registered detected type still builds params normally (the gate is not over-broad)', async () => {
    pdfText = 'Veterinary certificate\n8468EHC\nI.1 Consignor';
    const { meta } = await buildCheckParams({ files: makeFiles(), fields: {}, mode: 'concise' });
    assert.equal(meta.effectiveCertType, '8468');
    assert.ok(Array.isArray(meta.checklistRows) && meta.checklistRows.length > 0);
  });
});
