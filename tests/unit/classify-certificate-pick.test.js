'use strict';

// Which file is treated as THE certificate.
//
// This is the most consequential decision the app makes before the model is
// called: it fixes the rule set, the Part II skeleton, certificate_info, the
// pagination checks and every field reference. Get it wrong and the report is
// not wrong-looking — it is complete, coherent and about the wrong document.
//
// Real certificates are scans with no text layer (the repo's own fixture is 11
// pages and 22 characters), so every content signal is dead and the FILENAME is
// the only classifier that actually runs in production.
//
// This table exists because the rule took three attempts to get right, and each
// attempt fixed the reported case rather than the class:
//
//   1. A hint-word list ("dn", "invoice", "pallet", …). Defeated by every name
//      not on the list: "Packing List 26-2-…", CMR, COA, weighbridge, and a
//      bare "26-2-097680.pdf".
//   2. Requiring the literal EHC/HC token immediately before the number. Broke
//      "DN EHC 26-2-…" and "Invoice EHC 26-2-…" — a supporting document named
//      FOR its certificate now beat the certificate — and still missed
//      "EHC No 26-2-…", "EHC signed 26-2-…", "EHC(26-2-…)".
//   3. Position. A filename leads with what the document IS: "DN EHC 26-2-…" is
//      a delivery note for an EHC; "EHC 26-2-… dispatch" is an EHC. Both
//      contain both words; only the order separates them.
//
// The table is written as data so a new name shape is one line, and so the
// whole class is visible at once rather than one case at a time.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { classifyFiles } = require('../../src/check.js');

const pdf = filename => ({
  filename,
  mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 no text layer')
});

const REAL = 'EHC 26-2-097680.pdf';

// [description, uploaded filenames, expected certificate]
const CASES = [
  ['a plain EHC filename', [REAL], REAL],
  ['a word between the token and the reference', ['EHC No 26-2-097680.pdf'], 'EHC No 26-2-097680.pdf'],
  ['...or two', ['EHC signed 26-2-097680.pdf'], 'EHC signed 26-2-097680.pdf'],
  ['...or the certificate type', ['EHC 8324 26-2-097680.pdf'], 'EHC 8324 26-2-097680.pdf'],
  ['a bracketed reference', ['EHC(26-2-097680).pdf'], 'EHC(26-2-097680).pdf'],
  ['the short HC form', ['HC 26-2-097680.pdf'], 'HC 26-2-097680.pdf'],

  // A certificate whose name mentions a supporting document AFTER the token.
  ['a certificate that mentions dispatch', ['EHC 26-2-097680 dispatch.pdf'], 'EHC 26-2-097680 dispatch.pdf'],
  ['a certificate that mentions a pallet', ['EHC 26-2-097680 pallet.pdf'], 'EHC 26-2-097680 pallet.pdf'],
  ['a certificate that mentions an invoice', ['EHC 26-2-097680 - invoice attached.pdf'], 'EHC 26-2-097680 - invoice attached.pdf'],
  ['LDN in a route name is not a delivery note', ['EHC 26-2-097680 LDN to Esbjerg.pdf'], 'EHC 26-2-097680 LDN to Esbjerg.pdf'],

  // Supporting documents NAMED FOR the certificate — the hint leads, so they lose.
  ['a delivery note named for its EHC', ['DN EHC 26-2-097680.pdf', REAL], REAL],
  ['...spelled out', ['Delivery Note EHC 26-2-097680.pdf', REAL], REAL],
  ['an invoice named for its EHC', ['Invoice EHC 26-2-097680.pdf', REAL], REAL],
  ['pallet labels named for their EHC', ['Pallet labels EHC 26-2-097680.pdf', REAL], REAL],

  // No hint word, but the token sits later: the name that leads with EHC wins.
  ['a CMR quoting the EHC', ['CMR for EHC 26-2-097680.pdf', REAL], REAL],
  ['a filed copy', ['Copy of EHC 26-2-097680 for file.pdf', REAL], REAL],

  // A bare reference is always weaker than a name that says EHC. Every document
  // in a consignment quotes the EHC number — that IS the cross-reference
  // convention — so the reference alone decides nothing.
  ['a packing list', ['Packing List 26-2-097680.pdf', REAL], REAL],
  ['a CMR', ['CMR 26-2-097680.pdf', 'EHC No 26-2-097680.pdf'], 'EHC No 26-2-097680.pdf'],
  ['a certificate of analysis', ['COA 26-2-097680.pdf', REAL], REAL],
  ['a weighbridge ticket', ['Weighbridge 26-2-097680.pdf', REAL], REAL],
  ['a customs document', ['Customs 26-2-097680.pdf', REAL], REAL],
  ['a bare reference', ['26-2-097680.pdf', REAL], REAL],

  // A word merely ENDING in "hc" is not the token.
  ['a batch reference', ['BATCHC 26-2-097680.pdf', REAL], REAL],
  ['another', ['WHC 26-2-097680.pdf', REAL], REAL],

  // The original bug, both upload orders.
  ['a delivery note uploaded first', ['DN 26-2-097680.pdf', REAL], REAL],
  ['a delivery note uploaded second', ['EHC 26-2-219286.pdf', 'DN 26-2-219286.pdf'], 'EHC 26-2-219286.pdf'],

  // A four-digit year donated its last two digits to the reference pattern.
  ['a 2026-dated invoice is not certificate 26-2-…', ['Commercial Invoice 2026-2-123456.pdf'], null],
  ['nothing claims to be a certificate', ['Invoice.pdf', 'Packing list.pdf'], null]
];

const certOf = r => (r.certificate ? r.certificate.filename : null);
const supportingOf = r => (r.supporting_documents || []).map(f => f.filename);

describe('certificate selection', () => {
  for (const [what, files, expected] of CASES) {
    it(what, async () => {
      const r = await classifyFiles(files.map(pdf), {});
      assert.equal(
        certOf(r),
        expected,
        `uploaded [${files.join(', ')}] — expected the certificate to be ` +
          `${expected === null ? 'none' : expected}`
      );
    });
  }

  it('the loser is kept as a supporting document, never dropped', async () => {
    for (const [, files, expected] of CASES) {
      if (expected === null || files.length < 2) continue;
      const r = await classifyFiles(files.map(pdf), {});
      const seen = [certOf(r), ...supportingOf(r), ...(r.photos || []).map(f => f.filename),
        ...(r.unclassified || []).map(f => f.filename), ...(r.unsupported || []).map(f => f.filename)];
      for (const f of files) {
        assert.ok(seen.includes(f), `${f} fell into no bucket and would vanish from the check`);
      }
    }
  });

  // The OV's deliberate designation outranks every heuristic above, wherever
  // the file sits in upload order.
  it('an explicit override beats an auto-detected certificate', async () => {
    const r = await classifyFiles([pdf(REAL), pdf('Scan B.pdf')], { 'Scan B.pdf': 'certificate' });
    assert.equal(certOf(r), 'Scan B.pdf');
    assert.ok(supportingOf(r).includes(REAL));
  });

  it('an explicit override wins even when it is uploaded last', async () => {
    const r = await classifyFiles(
      [pdf(REAL), pdf('X.pdf'), pdf('Y.pdf')],
      { 'Y.pdf': 'certificate' }
    );
    assert.equal(certOf(r), 'Y.pdf');
  });

  // The client re-buckets locally on a dropdown change or a file removal, with
  // no round trip, so it must rank the same way. It reads this field.
  it('the token position is exported so the client can rank identically', async () => {
    const r = await classifyFiles([pdf('CMR for EHC 26-2-097680.pdf'), pdf(REAL)], {});
    assert.equal(r.certificate.ehc_token_index, 0);
    const cmr = supportingOf(r).includes('CMR for EHC 26-2-097680.pdf');
    assert.ok(cmr, 'the CMR must be kept as a supporting document');
  });
});
