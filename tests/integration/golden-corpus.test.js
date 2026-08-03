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

      // expectedHard/expectedMedium may not exist yet on entries mid-migration
      // (manifest still using the older expectedFlags shape, or not yet
      // recorded). Treat a missing field as "skip this one assertion" so the
      // suite stays runnable while baselines are filled in incrementally.
      if (entry.expectedHard === undefined || entry.expectedHard === null) {
        console.log(`${entry.id}: expectedHard not recorded yet — skipping hard_errors assertion`);
      } else {
        assert.equal(report.counters.hard_errors, entry.expectedHard,
          `${entry.id}: hard_errors`);
      }

      if (entry.expectedMedium === undefined || entry.expectedMedium === null) {
        console.log(`${entry.id}: expectedMedium not recorded yet — skipping medium_warnings assertion`);
      } else {
        assert.equal(report.counters.medium_warnings, entry.expectedMedium,
          `${entry.id}: medium_warnings`);
      }

      // low_notices intentionally NOT asserted — known run-to-run
      // non-determinism (handoff note 2026-07-21).

      // Flag-identity check: some baselines depend on a SPECIFIC flag
      // firing (e.g. the A9 archived-cert-date medium), not merely on the
      // right counters — two different flags could coincidentally sum to
      // the same counters. When present, require at least one flag whose
      // title/field_reference/description matches the pattern.
      if (entry.expectedFlagPattern) {
        const pattern = new RegExp(entry.expectedFlagPattern, 'i');
        const matched = (report.flags || []).some((f) =>
          pattern.test(f.title || '') ||
          pattern.test(f.field_reference || '') ||
          pattern.test(f.description || '')
        );
        assert.ok(matched,
          `${entry.id}: expected a flag matching /${entry.expectedFlagPattern}/i in title/field_reference/description, got: ${JSON.stringify((report.flags || []).map(f => f.title))}`);
      }
    });
  }
});
