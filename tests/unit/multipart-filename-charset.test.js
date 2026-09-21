'use strict';

// The uploaded filename must survive the wire byte-for-byte.
//
// busboy decodes the multipart `filename` parameter with latin1Slice by
// DEFAULT, so every non-ASCII byte in a name is mangled. macOS writes
// U+00A0 (no-break space) and U+202F (narrow no-break space) into screenshot
// and scan filenames — "Bottom Seal 2026-09-21 10-39-23<U+202F>am.jpeg" — and
// the practice's own certificate names carry U+00A0 between fields. Those
// arrived at the server as "10-39-23â€¯am.jpeg" and "257449 Â AF26387001".
//
// This is not a display defect. The filename is the JOIN KEY between browser
// and server:
//   - classification_overrides is an object keyed by filename, so
//     `overrides[item.filename]` missed and the OV's manual classification was
//     silently discarded while the UI still showed it applied;
//   - the client de-duplicates its file list by name, so a file the server had
//     already classified was not recognised and was listed a second time —
//     which is how this was spotted, on a real AFI tanker upload;
//   - buildCheckParams joins classification to bytes with
//     `files.find(f => f.filename === …)`.
//
// Found by running a real certificate through the live app, not by a review.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('stream');

const { parseMultipartForm } = require('../../src/check.js');

const BOUNDARY = 'ehcTestBoundary';

// A real request object is not needed — parseMultipartForm only reads
// `headers` and pipes the stream — but it must be a genuine Readable so the
// abort handling (req.on('aborted'|'close'|'error'), req.complete) behaves.
function requestWith(parts) {
  const chunks = [];
  for (const p of parts) {
    chunks.push(Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${p.field}"` +
      (p.filename ? `; filename="${p.filename}"` : '') + '\r\n' +
      (p.filename ? `Content-Type: ${p.type || 'application/pdf'}\r\n` : '') +
      '\r\n', 'utf8'));
    chunks.push(Buffer.from(p.body, 'utf8'));
    chunks.push(Buffer.from('\r\n', 'utf8'));
  }
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`, 'utf8'));

  const req = Readable.from([Buffer.concat(chunks)]);
  req.headers = { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` };
  req.complete = true;
  return req;
}

const NBSP = ' ';
const NNBSP = ' ';

describe('multipart filename decoding', () => {
  it('a no-break space in a filename survives the upload', async () => {
    const name = `EHC 26-2- 257449 ${NBSP}AF26387001 ${NBSP}21.09.26 ${NBSP}AFI-WPC 01_39.pdf`;
    const { files } = await parseMultipartForm(requestWith([
      { field: 'files', filename: name, body: '%PDF-1.4' }
    ]));
    assert.equal(files.length, 1);
    assert.equal(files[0].filename, name);
    assert.ok(!files[0].filename.includes('Â'), 'name was decoded as latin-1 (Â appeared)');
  });

  it('a narrow no-break space survives too — macOS writes these into screenshot names', async () => {
    const name = `Bottom Seal 2026-09-21 10-39-23${NNBSP}am.jpeg`;
    const { files } = await parseMultipartForm(requestWith([
      { field: 'files', filename: name, body: 'JPEGDATA', type: 'image/jpeg' }
    ]));
    assert.equal(files[0].filename, name);
  });

  it('accented and non-Latin names survive', async () => {
    for (const name of ['Hørsholm Kød EHC 26-2-097680.pdf', 'Anexă 26-2-097680.pdf', 'EHC – 26-2-097680.pdf']) {
      const { files } = await parseMultipartForm(requestWith([
        { field: 'files', filename: name, body: '%PDF-1.4' }
      ]));
      assert.equal(files[0].filename, name, `mangled: ${name}`);
    }
  });

  // The whole point: the override the OV set in the browser must still find
  // its file on the server.
  it('an overrides map keyed by the browser filename still matches server-side', async () => {
    const name = `DN INV${NBSP}AF26387001 ${NBSP}21.09.26.pdf`;
    const overrides = { [name]: 'supporting_document' };
    const { files } = await parseMultipartForm(requestWith([
      { field: 'files', filename: name, body: '%PDF-1.4' }
    ]));
    assert.equal(
      overrides[files[0].filename],
      'supporting_document',
      'the override lookup missed — the OV\'s manual classification would be dropped'
    );
  });

  it('plain ASCII names are unaffected', async () => {
    const { files } = await parseMultipartForm(requestWith([
      { field: 'files', filename: 'EHC 26-2-097680.pdf', body: '%PDF-1.4' },
      { field: 'files', filename: 'DN 26-2-097680.pdf', body: '%PDF-1.4' }
    ]));
    assert.deepEqual(files.map(f => f.filename), ['EHC 26-2-097680.pdf', 'DN 26-2-097680.pdf']);
  });
});
