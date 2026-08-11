'use strict';

// Deterministic coverage for src/spreadsheet.js — spreadsheet detection and
// xlsx/csv → CSV-text conversion for the Claude payload. The xlsx fixture is
// a real exceljs-written workbook (2 sheets, one formula cell with a cached
// result) checked in under tests/fixtures/.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  isOfficeLockFile,
  spreadsheetKind,
  spreadsheetToText,
  SPREADSHEET_CHAR_LIMIT
} = require('../../src/spreadsheet');

const FIXTURE = fs.readFileSync(path.join(__dirname, '../fixtures/allocation-sample.xlsx'));

describe('isOfficeLockFile', () => {
  it('matches ~$ basenames, including paths', () => {
    assert.equal(isOfficeLockFile('~$Allocation - 7933762.xlsx'), true);
    assert.equal(isOfficeLockFile('folder/~$doc.xlsx'), true);
  });
  it('does not match normal names', () => {
    assert.equal(isOfficeLockFile('Allocation - 7933762.xlsx'), false);
    assert.equal(isOfficeLockFile('report~$.xlsx'), false);
  });
});

describe('spreadsheetKind', () => {
  it('xlsx by mimetype', () => {
    assert.equal(spreadsheetKind('a', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'xlsx');
  });
  it('csv by mimetype', () => {
    assert.equal(spreadsheetKind('a', 'text/csv'), 'csv');
  });
  it('extension fallback beats unknown mimetypes (Windows/Android quirks)', () => {
    assert.equal(spreadsheetKind('Allocation.XLSX', 'application/octet-stream'), 'xlsx');
    assert.equal(spreadsheetKind('loads.csv', 'application/vnd.ms-excel'), 'csv');
  });
  it('null for everything else — .xls and .numbers are out of scope', () => {
    assert.equal(spreadsheetKind('cert.pdf', 'application/pdf'), null);
    assert.equal(spreadsheetKind('old.xls', 'application/vnd.ms-excel'), null);
    assert.equal(spreadsheetKind('sheet.numbers', 'application/octet-stream'), null);
  });
});

describe('spreadsheetToText — xlsx', () => {
  it('renders every sheet as a labelled CSV block with exact values', async () => {
    const { text, truncated } = await spreadsheetToText(FIXTURE, 'allocation-sample.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.equal(truncated, false);
    assert.match(text, /=== Sheet: Allocation ===/);
    assert.match(text, /=== Sheet: Totals ===/);
    assert.match(text, /Batch,Net kg,Production date/);
    assert.match(text, /TEST-BATCH-001,21500,2026-08-11/);
  });
  it('formula cells emit their cached result, not the formula', async () => {
    const { text } = await spreadsheetToText(FIXTURE, 'allocation-sample.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.match(text, /25000/);
    assert.doesNotMatch(text, /SUM\(/);
  });
  it('unreadable xlsx throws (fail-loud)', async () => {
    await assert.rejects(
      () => spreadsheetToText(Buffer.from('this is not a zip'), 'junk.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    );
  });
});

describe('spreadsheetToText — csv', () => {
  it('decodes UTF-8 and strips the BOM', async () => {
    const buf = Buffer.from('﻿' + 'Batch,Net kg\nB-1,100\n', 'utf8');
    const { text } = await spreadsheetToText(buf, 'loads.csv', 'text/csv');
    assert.ok(text.startsWith('Batch,Net kg'), 'BOM must be stripped');
  });
  it('empty file renders the explicit empty marker', async () => {
    const { text } = await spreadsheetToText(Buffer.from(''), 'empty.csv', 'text/csv');
    assert.match(text, /\[Empty spreadsheet\]/);
  });
});

describe('spreadsheetToText — truncation', () => {
  it('caps at SPREADSHEET_CHAR_LIMIT with a visible marker, never silently', async () => {
    const big = Buffer.from('x'.repeat(SPREADSHEET_CHAR_LIMIT + 5000), 'utf8');
    const { text, truncated } = await spreadsheetToText(big, 'big.csv', 'text/csv');
    assert.equal(truncated, true);
    assert.ok(text.length <= SPREADSHEET_CHAR_LIMIT + 100);
    assert.match(text, /\[TRUNCATED — remaining rows omitted\]/);
  });
});
