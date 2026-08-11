'use strict';

// Spreadsheet supporting documents (.xlsx / .csv) for the check payload.
// Spec: docs/superpowers/specs/2026-08-11-excel-upload-design.md.
// Spreadsheets are born-digital: converting to CSV text hands the model
// exact values (weights, batches, dates) with zero OCR risk — deliberately
// NOT sent as images/PDF. .xls and .numbers are out of scope by decision.

const path = require('path');
const ExcelJS = require('exceljs');

const SPREADSHEET_CHAR_LIMIT = 50000;
const TRUNCATION_MARKER = '[TRUNCATED — remaining rows omitted]';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Excel/Word write a "~$<name>" owner stub next to any open document. It is
// ~165 bytes of lock metadata, not a workbook — recognise it so the UI can
// say so instead of failing to parse it (seen live 11 Aug 2026).
function isOfficeLockFile(filename) {
  return path.basename(String(filename || '')).startsWith('~$');
}

// 'xlsx' | 'csv' | null. Extension fallback matters in practice: Windows
// browsers with Excel installed report CSV as application/vnd.ms-excel and
// some Android pickers send application/octet-stream.
function spreadsheetKind(filename, mimetype) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  if (mimetype === XLSX_MIME || ext === '.xlsx') return 'xlsx';
  if (mimetype === 'text/csv' || ext === '.csv') return 'csv';
  return null;
}

// One CSV cell. Formula cells carry { formula, result } — the cached result
// is the value the OV's Excel showed; the formula itself is noise here.
function cellString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (value.result !== undefined) return cellString(value.result);
    if (Array.isArray(value.richText)) return value.richText.map(rt => rt.text).join('');
    if (value.text !== undefined) return cellString(value.text);
    if (value.error !== undefined) return String(value.error);
    return String(value);
  }
  return String(value);
}

function csvEscape(s) {
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function capText(text, filename) {
  if (text.length <= SPREADSHEET_CHAR_LIMIT) return { text, truncated: false };
  const kept = text.slice(0, SPREADSHEET_CHAR_LIMIT);
  console.warn(
    `[spreadsheet] ${filename}: ${text.length} chars exceeds the ${SPREADSHEET_CHAR_LIMIT}-char cap — ` +
      `${text.length - SPREADSHEET_CHAR_LIMIT} chars truncated (marker appended, visible to the model)`
  );
  return { text: kept + '\n' + TRUNCATION_MARKER, truncated: true };
}

// → { text, truncated }. Throws on an unreadable .xlsx (fail-loud — the
// caller decides whether that means "unsupported" at classification time or
// a hard check error at payload time). CSV decode cannot fail: any byte
// sequence decodes; emptiness gets an explicit marker.
async function spreadsheetToText(buffer, filename, mimetype) {
  const kind = spreadsheetKind(filename, mimetype);
  if (kind === 'csv') {
    let text = buffer.toString('utf8');
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    if (!text.trim()) text = '[Empty spreadsheet]';
    return capText(text, filename);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer); // throws on non-xlsx input
  const blocks = [];
  workbook.eachSheet((ws) => {
    const lines = ['=== Sheet: ' + ws.name + ' ==='];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(csvEscape(cellString(cell.value)));
      });
      lines.push(cells.join(','));
    });
    blocks.push(lines.join('\n'));
  });
  const text = blocks.length > 0 ? blocks.join('\n\n') : '[Empty spreadsheet]';
  return capText(text, filename);
}

module.exports = { isOfficeLockFile, spreadsheetKind, spreadsheetToText, SPREADSHEET_CHAR_LIMIT };
