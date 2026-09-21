'use strict';

// Which file is treated as THE certificate.
//
// This is the most consequential decision the app makes before the model is
// called: it fixes the rule set, the Part II skeleton, certificate_info, the
// pagination checks and every field reference. Get it wrong and the report is
// not wrong-looking — it is complete, coherent and about the wrong document.
//
// The bug this pins against was live and reproducible: uploading
// "DN 26-2-097680.pdf" alongside "EHC 26-2-097680.pdf" made the DELIVERY NOTE
// the certificate and demoted the real EHC to a supporting document. Two
// faults compounded. The filename EHC-reference pattern has an optional
// prefix, so it matched the bare NN-2-NNNNNN that a delivery note carries by
// the practice's own cross-referencing convention; and the decision cascade
// never consulted the supporting-document signal on the one branch that runs
// in production. Real certificates are scans with no text layer — the repo's
// own fixture is 11 pages and 22 characters — so every content signal is dead
// and the filename is the only classifier that actually runs.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { classifyFiles } = require('../../src/check.js');

const pdf = filename => ({
  filename,
  mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 no text layer')
});

const certOf = r => (r.certificate ? r.certificate.filename : null);
const supportingOf = r => (r.supporting_documents || []).map(f => f.filename);

describe('certificate selection', () => {
  it('a delivery note carrying its EHC reference is NOT the certificate', async () => {
    const r = await classifyFiles([pdf('DN 26-2-097680.pdf'), pdf('EHC 26-2-097680.pdf')], {});
    assert.equal(certOf(r), 'EHC 26-2-097680.pdf');
    assert.ok(supportingOf(r).includes('DN 26-2-097680.pdf'));
  });

  it('and upload order does not change that', async () => {
    const r = await classifyFiles([pdf('EHC 26-2-219286.pdf'), pdf('DN 26-2-219286.pdf')], {});
    assert.equal(certOf(r), 'EHC 26-2-219286.pdf');
  });

  it('other supporting-document names carrying the reference behave the same', async () => {
    for (const name of ['Picklist 26-2-097680.pdf', 'Delivery Note 26-2-097680.pdf']) {
      const r = await classifyFiles([pdf(name), pdf('EHC 26-2-097680.pdf')], {});
      assert.equal(certOf(r), 'EHC 26-2-097680.pdf', `${name} must not take the certificate role`);
    }
  });

  // A four-digit year donated its last two digits to the reference pattern, so
  // an invoice dated 2026 looked like certificate 26-2-NNNNNN.
  it('a four-digit year is not read as an EHC reference', async () => {
    const r = await classifyFiles([pdf('Commercial Invoice 2026-2-123456.pdf')], {});
    assert.notEqual(certOf(r), 'Commercial Invoice 2026-2-123456.pdf');
  });

  it('a plain EHC filename is still the certificate', async () => {
    const r = await classifyFiles([pdf('EHC 26-2-219286.pdf')], {});
    assert.equal(certOf(r), 'EHC 26-2-219286.pdf');
  });

  // The OV's deliberate designation must beat auto-detection, wherever the
  // file sits in upload order. It previously lost to an auto-detected
  // certificate earlier in the list, and the client resolved the same contest
  // in display order — so screen and server could name different documents.
  it('an explicit override beats an auto-detected certificate', async () => {
    const r = await classifyFiles(
      [pdf('EHC 26-2-097680.pdf'), pdf('Scan B.pdf')],
      { 'Scan B.pdf': 'certificate' }
    );
    assert.equal(certOf(r), 'Scan B.pdf');
    assert.ok(supportingOf(r).includes('EHC 26-2-097680.pdf'));
  });

  it('an explicit override wins even when it is uploaded last', async () => {
    const r = await classifyFiles(
      [pdf('EHC 26-2-097680.pdf'), pdf('X.pdf'), pdf('Y.pdf')],
      { 'Y.pdf': 'certificate' }
    );
    assert.equal(certOf(r), 'Y.pdf');
  });

  it('with no certificate signal at all, none is invented', async () => {
    const r = await classifyFiles([pdf('Invoice.pdf'), pdf('Packing list.pdf')], {});
    assert.equal(certOf(r), null);
  });
});
