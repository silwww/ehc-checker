'use strict';

// One-off helper to capture actual verdicts for golden corpus entries.
// Runs each PRESENT cert through the checker and prints verdict + counters so
// the OV can confirm them and write them into manifest.json. This is a tool,
// not a test — it never asserts. Uses whatever model CLAUDE_MODEL selects
// (default in src/check.js), so run it under the model you want to baseline.
//
// Run: node scripts/record-golden.js
//   or: CLAUDE_MODEL=claude-sonnet-4-6 node scripts/record-golden.js

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { runCheckStream } = require('../src/check.js');

const GOLDEN_DIR = path.join(__dirname, '..', 'tests', 'fixtures', 'golden');
const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'manifest.json'), 'utf8'));

(async () => {
  for (const entry of manifest.certificates) {
    const pdfPath = path.join(GOLDEN_DIR, entry.file);
    if (!fs.existsSync(pdfPath)) {
      console.log(`SKIP   ${entry.id}: ${entry.file} not present locally`);
      continue;
    }
    const files = [{ filename: entry.file, buffer: fs.readFileSync(pdfPath), mimetype: 'application/pdf' }];
    // Scanned (image-only) certs have no extractable text, so cert-type and
    // consignor auto-detection can't fire — the manifest supplies them
    // explicitly, exactly as the OV picks them in the UI. 'auto' means "let
    // the app auto-detect" (same as omitting).
    const fields = {};
    if (entry.consignorId && entry.consignorId !== 'auto') fields.consignorId = entry.consignorId;
    if (entry.certTypeOverride) fields.certTypeOverride = entry.certTypeOverride;
    try {
      const report = await runCheckStream({ files, fields, mode: 'concise', onEvent: () => {}, signal: undefined });
      console.log(`RECORD ${entry.id}: verdict=${report.overall_verdict} cert_type=${report.cert_type_resolved || (report.certificate_info && report.certificate_info.certificate_type) || '?'} flags=${JSON.stringify(report.counters)}`);
    } catch (err) {
      console.log(`ERROR  ${entry.id}: ${err.code || ''} ${err.message}`);
    }
  }
})();
