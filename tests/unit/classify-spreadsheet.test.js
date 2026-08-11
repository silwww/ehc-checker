'use strict';

// classifyFiles branches for spreadsheet uploads. No mocking: classifyFiles
// only touches pdf-parse for PDFs without filename signals, and these
// fixtures are spreadsheets — the calls are pure and offline.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { classifyFiles } = require('../../src/check');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FIXTURE = fs.readFileSync(path.join(__dirname, '../fixtures/allocation-sample.xlsx'));

function file(filename, buffer, mimetype) {
  return { fieldname: 'files', filename, buffer, mimetype };
}

describe('classifyFiles — spreadsheets', () => {
  it('.xlsx by mimetype → supporting_document, high confidence, never a certificate', async () => {
    const r = await classifyFiles([file('Allocation - 7933762.xlsx', FIXTURE, XLSX_MIME)]);
    assert.equal(r.certificate, null);
    assert.equal(r.supporting_documents.length, 1);
    const item = r.supporting_documents[0];
    assert.equal(item.kind, 'supporting_document');
    assert.equal(item.classification_source, 'spreadsheet');
    assert.equal(item.confidence, 'high');
  });

  it('.csv with a Windows/Excel mimetype (extension fallback) → supporting_document', async () => {
    const r = await classifyFiles([file('loads.csv', Buffer.from('a,b\n1,2\n'), 'application/vnd.ms-excel')]);
    assert.equal(r.supporting_documents.length, 1);
    assert.equal(r.supporting_documents[0].classification_source, 'spreadsheet');
  });

  it('.xlsx with application/octet-stream (Android picker) → supporting_document', async () => {
    const r = await classifyFiles([file('Allocation.xlsx', FIXTURE, 'application/octet-stream')]);
    assert.equal(r.supporting_documents.length, 1);
  });

  it('~$ Office lock file → unsupported with office_lock_file reason, never parsed', async () => {
    const r = await classifyFiles([file('~$Allocation - 7933762.xlsx', Buffer.alloc(165), XLSX_MIME)]);
    assert.equal(r.unsupported.length, 1);
    assert.equal(r.unsupported[0].unsupported_reason, 'office_lock_file');
  });

  it('corrupt .xlsx → unsupported + spreadsheet_unreadable + spreadsheet_error (validated BEFORE any paid check)', async () => {
    const r = await classifyFiles([file('broken.xlsx', Buffer.from('not a zip'), XLSX_MIME)]);
    assert.equal(r.unsupported.length, 1);
    assert.equal(r.unsupported[0].unsupported_reason, 'spreadsheet_unreadable');
    assert.equal(r.unsupported[0].spreadsheet_error, true);
  });

  it('.xls stays unsupported — out of scope by decision', async () => {
    const r = await classifyFiles([file('old.xls', Buffer.from('x'), 'application/vnd.ms-excel')]);
    assert.equal(r.unsupported.length, 1);
    assert.equal(r.unsupported[0].unsupported_reason, undefined);
  });
});
