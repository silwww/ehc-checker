'use strict';

// Golden regression corpus against the real Anthropic API.
// For each manifest entry: skip if the PDF is not present locally, skip if
// its expectedVerdict has not been recorded yet, otherwise run the check and
// assert the verdict + flag counters match the OV-verified expected values.
//
// Requires ANTHROPIC_API_KEY in .env and the real PDFs in tests/fixtures/golden/.
// Run with: npm run test:integration

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { runCheckStream } = require('../../src/check.js');

const GOLDEN_DIR = path.join(__dirname, '..', 'fixtures', 'golden');
const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'manifest.json'), 'utf8'));

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY missing in .env — golden corpus needs a real API key.');
}

async function runCert(entry) {
  const pdfBuffer = fs.readFileSync(path.join(GOLDEN_DIR, entry.file));
  const files = [{ filename: entry.file, buffer: pdfBuffer, mimetype: 'application/pdf' }];
  // Scanned certs have no text for cert-type/consignor auto-detection, so the
  // manifest supplies them explicitly (as the OV does in the UI). 'auto' = let
  // the app auto-detect.
  const fields = {};
  if (entry.consignorId && entry.consignorId !== 'auto') fields.consignorId = entry.consignorId;
  if (entry.certTypeOverride) fields.certTypeOverride = entry.certTypeOverride;
  return runCheckStream({ files, fields, mode: 'concise', onEvent: () => {}, signal: undefined });
}

describe('golden corpus — verdicts match OV-verified expected values', () => {
  for (const entry of manifest.certificates) {
    const present = fs.existsSync(path.join(GOLDEN_DIR, entry.file));

    it(`${entry.id} — verdict matches expected`, { skip: !present
        ? `PDF not present locally (${entry.file}) — copy it into tests/fixtures/golden/`
        : entry.expectedVerdict === null
          ? 'expectedVerdict not recorded yet — run baseline, confirm, then fill manifest'
          : false
    }, async () => {
      const report = await runCert(entry);
      assert.equal(report.overall_verdict, entry.expectedVerdict,
        `${entry.id}: verdict`);
      assert.deepEqual(
        {
          hard_errors: report.counters.hard_errors,
          medium_warnings: report.counters.medium_warnings,
          low_notices: report.counters.low_notices
        },
        entry.expectedFlags,
        `${entry.id}: flag counters`
      );
    });
  }
});
