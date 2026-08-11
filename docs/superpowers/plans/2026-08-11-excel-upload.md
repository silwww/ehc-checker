# Excel / CSV Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept `.xlsx` and `.csv` uploads as supporting documents, converted server-side to CSV text and cross-checked by the model against the certificate.

**Architecture:** New `src/spreadsheet.js` module (detection + conversion via exceljs), two insertion points in `src/check.js` (classification branch, payload-assembly branch), two small client edits in `public/index.html` (accept attribute, unsupported-reason badge messages). Spec: `docs/superpowers/specs/2026-08-11-excel-upload-design.md` (approved 11 Aug 2026).

**Tech Stack:** Node 20, Express, exceljs (new dependency), node:test.

## Global Constraints

- Formats: `.xlsx` and `.csv` ONLY (no `.xls`, no `.numbers`).
- A spreadsheet is ALWAYS `kind: 'supporting_document'` — never a certificate candidate.
- Char cap per file: 50,000 — truncation appends `[TRUNCATED — remaining rows omitted]` and logs; NEVER silent.
- `~$`-prefixed basenames are Office lock files: `unsupported` + `unsupported_reason: 'office_lock_file'`, never parsed.
- Unreadable spreadsheet at classification: `unsupported` + `unsupported_reason: 'spreadsheet_unreadable'` + `spreadsheet_error: true`.
- Conversion failure at payload time: throw `Supporting spreadsheet "<filename>" could not be read: <cause>` — never skip silently.
- No changes under `rules/`; `RESIZABLE_TYPES` in index.html untouched.
- Branch: `feature/excel-upload`. Run `npm test` (unit only) — never `npm run test:integration`.

---

### Task 1: `src/spreadsheet.js` — detection + conversion module

**Files:**
- Create: `src/spreadsheet.js`
- Create: `tests/unit/spreadsheet.test.js`
- Create: `tests/fixtures/allocation-sample.xlsx` (generated in Step 1)
- Modify: `package.json` (exceljs dependency, via npm install)

**Interfaces:**
- Consumes: nothing from this codebase.
- Produces (Tasks 2 and 3 rely on these exact exports):
  - `isOfficeLockFile(filename: string): boolean`
  - `spreadsheetKind(filename: string, mimetype: string): 'xlsx' | 'csv' | null`
  - `spreadsheetToText(buffer: Buffer, filename: string, mimetype: string): Promise<{ text: string, truncated: boolean }>` — throws on unreadable xlsx
  - `SPREADSHEET_CHAR_LIMIT: number` (50000)

- [ ] **Step 1: Install exceljs and generate the fixture**

```bash
npm install exceljs
node -e "
const ExcelJS = require('exceljs');
(async () => {
  const wb = new ExcelJS.Workbook();
  const ws1 = wb.addWorksheet('Allocation');
  ws1.addRow(['Batch', 'Net kg', 'Production date']);
  ws1.addRow(['TEST-BATCH-001', 21500, '2026-08-11']);
  ws1.addRow(['TEST-BATCH-002', 3500, '2026-08-11']);
  const ws2 = wb.addWorksheet('Totals');
  ws2.addRow(['Total net']);
  ws2.addRow([{ formula: 'SUM(Allocation!B2:B3)', result: 25000 }]);
  await wb.xlsx.writeFile('tests/fixtures/allocation-sample.xlsx');
  console.log('fixture written');
})();
"
```

Expected: `fixture written`; `tests/fixtures/allocation-sample.xlsx` exists (a few KB).

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/spreadsheet.test.js`:

```js
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
    const buf = Buffer.from('﻿Batch,Net kg\nB-1,100\n', 'utf8');
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/unit/spreadsheet.test.js`
Expected: FAIL — `Cannot find module '../../src/spreadsheet'`.

- [ ] **Step 4: Write the implementation**

Create `src/spreadsheet.js`:

```js
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/unit/spreadsheet.test.js`
Expected: PASS, all subtests.

- [ ] **Step 6: Run the full suite, then commit**

Run: `npm test` — expected all pass (baseline on this branch is 118).

```bash
git add package.json package-lock.json src/spreadsheet.js tests/unit/spreadsheet.test.js tests/fixtures/allocation-sample.xlsx
git commit -m "feat(spreadsheet): detection + xlsx/csv→CSV-text conversion module (exceljs)"
```

---

### Task 2: classification — spreadsheets become supporting documents

**Files:**
- Modify: `src/check.js` — top-of-file requires, and `classifyFiles` (the `else if (mimetype && mimetype.startsWith('image/') ...)` chain, currently ~line 1815)
- Create: `tests/unit/classify-spreadsheet.test.js`

**Interfaces:**
- Consumes (Task 1): `isOfficeLockFile`, `spreadsheetKind`, `spreadsheetToText` from `src/spreadsheet.js`.
- Produces (Task 4's client relies on these response fields): classified items with
  `kind: 'supporting_document'`, `classification_source: 'spreadsheet'`, `confidence: 'high'` for good spreadsheets;
  `kind: 'unsupported'`, `unsupported_reason: 'office_lock_file'` for `~$` stubs;
  `kind: 'unsupported'`, `unsupported_reason: 'spreadsheet_unreadable'`, `spreadsheet_error: true` for corrupt ones.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/classify-spreadsheet.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/unit/classify-spreadsheet.test.js`
Expected: FAIL — spreadsheets currently land in `unsupported` (first three tests), lock/corrupt items lack `unsupported_reason` (next two). The `.xls` test may already pass.

- [ ] **Step 3: Implement the classification branches**

In `src/check.js`, add to the require block at the top of the file:

```js
const { isOfficeLockFile, spreadsheetKind, spreadsheetToText } = require('./spreadsheet');
```

In `classifyFiles`, the per-file classifier is an `if (mimetype === 'application/pdf') { … } else if (mimetype && mimetype.startsWith('image/') …) { … } else { …unsupported… }` chain. Insert a lock-file branch BEFORE the PDF branch (a `~$x.xlsx` would otherwise match the spreadsheet extension), and a spreadsheet branch between the PDF and image branches:

```js
    if (isOfficeLockFile(filename)) {
      // Excel's owner stub for an open workbook (~165 B) — arrives via
      // folder drag-and-drop next to the real file. Not a document.
      console.log(`[classify] ${filename} → unsupported (Office lock file)`);
      return {
        ...base,
        kind: 'unsupported',
        classification_source: 'unsupported',
        unsupported_reason: 'office_lock_file',
        confidence: 'high'
      };
    }

    if (mimetype === 'application/pdf') {
      // …existing PDF logic, unchanged…
    } else if (spreadsheetKind(filename, mimetype)) {
      // A spreadsheet can never be the certificate. Parse it NOW so an
      // unreadable file is surfaced before the OV pays for a check.
      try {
        await spreadsheetToText(buffer, filename, mimetype);
        console.log(`[classify] ${filename} → supporting (spreadsheet, ${spreadsheetKind(filename, mimetype)})`);
        return {
          ...base,
          kind: 'supporting_document',
          classification_source: 'spreadsheet',
          confidence: 'high'
        };
      } catch (err) {
        console.warn(`[classify] ${filename} → unsupported (spreadsheet unreadable: ${err.message})`);
        return {
          ...base,
          kind: 'unsupported',
          classification_source: 'unsupported',
          unsupported_reason: 'spreadsheet_unreadable',
          spreadsheet_error: true,
          confidence: 'high'
        };
      }
    } else if (
      mimetype && mimetype.startsWith('image/') &&
      // …existing image branch, unchanged…
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/classify-spreadsheet.test.js`
Expected: PASS, all six.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npm test` — all pass.

```bash
git add src/check.js tests/unit/classify-spreadsheet.test.js
git commit -m "feat(classify): spreadsheets are supporting documents; lock files and corrupt workbooks surfaced with reasons"
```

---

### Task 3: payload — spreadsheet supporting docs ride as text document blocks

**Files:**
- Modify: `src/check.js` — the `for (const doc of classification.supporting_documents)` loop in the payload builder (currently ~line 1010; it unconditionally builds a base64 PDF document block)
- Create: `tests/unit/spreadsheet-payload.test.js`

**Interfaces:**
- Consumes (Task 1): `spreadsheetKind`, `spreadsheetToText` (already required in check.js by Task 2).
- Produces: for each spreadsheet supporting doc, a user-content block
  `{ type: 'document', source: { type: 'text', media_type: 'text/plain', data: <converted text> }, title: 'Supporting: <filename>' }`
  in the same position PDFs occupy. PDFs keep their existing base64 block byte-identically.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/spreadsheet-payload.test.js`:

```js
'use strict';

// Payload contract for spreadsheet supporting documents. Same
// Module.prototype.require SDK mock as single-call-checklist.test.js —
// capturedParams receives the REAL params runCheckStream builds; the
// assertion runs against those, never a re-implementation.

process.env.EHC_NO_RAW_PERSIST = '1';

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let streamQueue = [];
let capturedParams = [];

function makeFinalOnlyStream(finalMessage) {
  return {
    [Symbol.asyncIterator]() {
      return { next: async () => ({ value: undefined, done: true }) };
    },
    controller: { abort() {} },
    finalMessage: async () => finalMessage
  };
}

class MockAnthropic {
  constructor() {
    this.messages = {
      stream: (params) => {
        capturedParams.push(params);
        return streamQueue.shift();
      }
    };
  }
}

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === '@anthropic-ai/sdk') return MockAnthropic;
  return originalRequire.apply(this, arguments);
};
const { runCheckStream } = require('../../src/check');
Module.prototype.require = originalRequire;

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FIXTURE = fs.readFileSync(path.join(__dirname, '../fixtures/allocation-sample.xlsx'));

beforeEach(() => { streamQueue = []; capturedParams = []; });

describe('payload — spreadsheet supporting documents', () => {
  it('a classified .xlsx lands as a text-source document block titled Supporting: <name>', async () => {
    streamQueue.push(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: {
        certificate_info: { certificate_ref: '26/2/097680' },
        flags: [],
        sections: [{ section_number: 1, title: 'Checks Performed', checks: [] }],
        rule_set_update_recommendations: ''
      } }]
    }));

    const files = [
      { filename: 'EHC 26-2-097680.pdf', buffer: Buffer.from('not a real pdf'), mimetype: 'application/pdf' },
      { filename: 'Allocation - 7933762.xlsx', buffer: FIXTURE, mimetype: XLSX_MIME }
    ];
    const events = [];
    await runCheckStream({
      files, fields: { certTypeOverride: '8322' }, mode: 'concise',
      onEvent: (name, data) => events.push({ name, data })
    });

    const content = capturedParams[0].messages[0].content;
    const sheetBlock = content.find(b =>
      b.type === 'document' && b.title === 'Supporting: Allocation - 7933762.xlsx');
    assert.ok(sheetBlock, 'expected a document block for the spreadsheet');
    assert.equal(sheetBlock.source.type, 'text');
    assert.equal(sheetBlock.source.media_type, 'text/plain');
    assert.match(sheetBlock.source.data, /TEST-BATCH-001,21500/);

    const pdfBlock = content.find(b => b.type === 'document' && b.title === 'EHC 26-2-097680.pdf');
    assert.ok(pdfBlock, 'certificate PDF block unchanged');
    assert.equal(pdfBlock.source.type, 'base64');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/spreadsheet-payload.test.js`
Expected: FAIL — the spreadsheet currently produces a base64 "PDF" block (`source.type === 'base64'`), or no block matching the assertion.

- [ ] **Step 3: Implement the payload branch**

In `src/check.js`, replace the supporting-documents loop body (the one pushing `media_type: 'application/pdf'` with `title: 'Supporting: ...'`):

```js
  for (const doc of classification.supporting_documents) {
    const docFile = files.find(f => f.filename === doc.filename);
    if (!docFile) continue;
    if (spreadsheetKind(docFile.filename, docFile.mimetype)) {
      // Born-digital values, zero OCR risk. Already parsed once at
      // classification; a failure HERE is unexpected — fail the check
      // loudly rather than silently dropping a document the OV uploaded.
      let converted;
      try {
        converted = await spreadsheetToText(docFile.buffer, docFile.filename, docFile.mimetype);
      } catch (err) {
        throw new Error(`Supporting spreadsheet "${docFile.filename}" could not be read: ${err.message}`);
      }
      userContent.push({
        type: 'document',
        source: { type: 'text', media_type: 'text/plain', data: converted.text },
        title: `Supporting: ${docFile.filename}`
      });
    } else {
      userContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: docFile.buffer.toString('base64')
        },
        title: `Supporting: ${docFile.filename}`
      });
    }
  }
```

(If the enclosing function is not `async` at this point, it is — `prepareImageForClaude` is already awaited a few lines below.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/spreadsheet-payload.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite, then commit**

Run: `npm test` — all pass.

```bash
git add src/check.js tests/unit/spreadsheet-payload.test.js
git commit -m "feat(payload): spreadsheet supporting docs sent as text-source document blocks"
```

---

### Task 4: client — accept the files, explain the lock file

**Files:**
- Modify: `public/index.html:58` (file input `accept`)
- Modify: `public/index.html` `classificationBadge()` (~line 740)

**Interfaces:**
- Consumes (Task 2's response fields): `item.unsupported_reason` (`'office_lock_file'` | `'spreadsheet_unreadable'` | absent).
- Produces: nothing consumed downstream — UI only.

- [ ] **Step 1: Extend the accept attribute**

In `public/index.html` line 58, change:

```html
<input type="file" id="file-input" multiple accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" hidden>
```

to:

```html
<input type="file" id="file-input" multiple accept=".pdf,.xlsx,.csv,image/png,image/jpeg,image/jpg,image/webp" hidden>
```

(Extensions, not spreadsheet mimetypes, so every OS file picker allows them. `RESIZABLE_TYPES` and the resize path are untouched — spreadsheets are not images.)

- [ ] **Step 2: Per-reason unsupported badges**

In `classificationBadge()`, replace:

```js
    if (bucket === 'unsupported') return { cls: 'badge badge-hard', label: 'Unsupported (please convert to PDF)' };
```

with:

```js
    if (bucket === 'unsupported') {
      if (item && item.unsupported_reason === 'office_lock_file') {
        return { cls: 'badge badge-hard', label: 'Excel lock file — not a document (the real file has the same name without ~$)' };
      }
      if (item && item.unsupported_reason === 'spreadsheet_unreadable') {
        return { cls: 'badge badge-hard', label: 'Could not read this spreadsheet — re-export it or convert to PDF' };
      }
      return { cls: 'badge badge-hard', label: 'Unsupported (please convert to PDF)' };
    }
```

- [ ] **Step 3: Manual smoke check (no test framework covers index.html)**

Restart the local server (`npm start` — Node caches modules), open `http://localhost:3000`, and verify:
- The file picker now offers `.xlsx`/`.csv`.
- Dropping a real `.xlsx` shows the "Supporting" badge and no classification dropdown.
- A `~$` file shows the lock-file badge; a text file renamed `.xlsx` shows the unreadable badge.
- The unsupported files are still excluded from FormData at check time (existing `unsupportedNames` logic — no change needed).

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(upload): accept .xlsx/.csv in the picker; per-reason unsupported badges"
```

---

### Task 5: close out

**Files:**
- Modify: `docs/superpowers/specs/2026-08-11-excel-upload-design.md` (status line only)

- [ ] **Step 1: Full suite one last time**

Run: `npm test`
Expected: all pass (baseline 118 + 15 new subtests across three files).

- [ ] **Step 2: Mark the spec implemented**

Change the spec's `**Status:**` line to: `Implemented on feature/excel-upload — awaiting Silvia's live validation (upload a real Allocation .xlsx alongside a certificate) before merge.`

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-11-excel-upload-design.md
git commit -m "docs(excel-spec): mark implemented, pending live validation"
```

Do NOT merge to main and do NOT push — Silvia validates live first (her standing workflow).
