# Excel / CSV Upload Support — Design

**Date:** 11 August 2026
**Status:** Approved approach (Variant A — server-side conversion to CSV text), spec pending Silvia's review
**Branch:** `feature/excel-upload`

## Purpose

OVs receive consignment data (packing lists, loading lists) as spreadsheets. Today the
uploader accepts only PDFs and photos: the file picker won't even offer an `.xlsx`, and a
dropped one is classified `unsupported` with the badge "Unsupported (please convert to PDF)".
This feature accepts `.xlsx` and `.csv` files as **supporting documents**, cross-checked by
the model against the certificate exactly like supporting PDFs are today.

Formats: **`.xlsx` and `.csv` only** (Silvia, 11 Aug 2026). No `.xls`, no `.numbers`.

## Why text conversion (not PDF-style native upload)

The Claude API accepts PDFs and images natively but not spreadsheets. Conversion to CSV text
is not a workaround — it is better: spreadsheets are born-digital structured data, so the
model receives exact values (weights, dates, references) with zero OCR risk. Weight
cross-checks between certificate and packing list become text arithmetic.

## Design

### Client — `public/index.html`

- `accept` attribute gains `.xlsx,.csv` (extensions, so every browser's picker allows them
  regardless of OS mimetype quirks).
- Spreadsheets are never resized — `RESIZABLE_TYPES` untouched.
- No new client-side classification logic: the server classifies; the client renders the
  server's answer. Spreadsheet files land in the existing `supporting_documents` bucket and
  show the existing Supporting badge — no dedicated Spreadsheet badge (out of scope).

### Server — classification (`src/check.js`, `classifyFiles`)

- New branch **before** the `unsupported` fallback: a file is a spreadsheet when its
  mimetype matches (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  `text/csv`) **or** its filename ends in `.xlsx`/`.csv` (case-insensitive). The extension
  fallback matters in practice: Windows browsers with Excel installed report CSV as
  `application/vnd.ms-excel`, and some Android pickers send `application/octet-stream`.
- A spreadsheet is **always** `kind: 'supporting_document'` — it can never be the
  certificate. `classification_source: 'spreadsheet'`, `confidence: 'high'`.
- **Early validation at classification time:** the file is parsed once during
  `classifyFiles`. A file that cannot be parsed is classified `unsupported` with a
  distinct marker (`spreadsheet_error: true`) so the UI can say "Could not read this
  spreadsheet — re-export it or convert to PDF" **before** the OV pays for a check.
  No silent skips.

### Server — conversion (new module `src/spreadsheet.js`)

- `spreadsheetToText(buffer, filename, mimetype)` → `{ text, truncated }`.
- `.xlsx` via **`exceljs`** (new dependency; actively maintained, avoids the stale npm
  `xlsx`/SheetJS package with known unpatched CVEs). Each sheet renders as a labelled CSV
  block (`=== Sheet: <name> ===`). Formula cells emit their cached `result` value.
- `.csv` is decoded as UTF-8 with BOM stripped — no library needed.
- **Size cap:** 50,000 characters per file. On truncation, the text ends with an explicit
  `[TRUNCATED — remaining rows omitted]` marker and the server logs what was dropped.
  Never a silent cut.

### Server — payload assembly (`src/check.js`)

The supporting-documents loop currently assumes every supporting doc is a PDF. It branches:
spreadsheets are pushed as a text-source document block —

```js
{ type: 'document',
  source: { type: 'text', media_type: 'text/plain', data: text },
  title: `Supporting: ${filename}` }
```

— in the same position supporting PDFs occupy today. If conversion throws at payload time
(rare — the file already parsed at classification), the check fails loudly with a clear
stream error naming the file; it is never silently omitted.

### No prompt / rule set changes

The system prompt already instructs cross-checking of commercial documents. The model sees
the spreadsheet as one more titled supporting document. Zero changes under `rules/`.

## Error handling summary

| Failure | Behaviour |
|---|---|
| Corrupt / unreadable spreadsheet at upload | Classified `unsupported` + `spreadsheet_error`, UI message before any paid check |
| Conversion fails at check time | Check aborts with a clear error naming the file |
| File exceeds 50k chars | Truncated with visible `[TRUNCATED …]` marker + server log |
| Empty spreadsheet (no cells) | Text says `[Empty spreadsheet]`; check proceeds |

## Testing

Unit only — no paid integration runs:

- Classification: `.xlsx`/`.csv` by mimetype; by extension fallback (`application/vnd.ms-excel`,
  `application/octet-stream`); never certificate_candidate; corrupt file → `unsupported` +
  `spreadsheet_error`.
- Conversion: tiny `.xlsx` fixture (2 sheets, formula cell, checked-in under
  `tests/fixtures/`) → labelled CSV text; CSV BOM strip; truncation marker; empty file.
- Payload: spreadsheet becomes a text-source document block titled `Supporting: <name>`;
  PDFs unchanged.

## Out of scope (YAGNI)

`.xls` and `.numbers`; spreadsheet-specific prompt instructions; formatting/styling
fidelity; formula re-evaluation; merging multiple spreadsheets; a dedicated UI badge.
