'use strict';

// Deterministic node:test coverage for the CERTIFICATE block of the Full
// Report PDF (public/assets/generate-pdf.js, renderCertificateFromCompact).
//
// Bug this guards against: the block ran straight after FINDINGS with no
// page-break guard, so with ~4 findings its rows (HS code, departure,
// tractor, seal) were written at y > 297mm — past the edge of the A4 sheet —
// and were absent from the filed record while the screen showed them.
//
// The whole production stack (vendored jsPDF 2.5.1, Geist fonts,
// certificate-fields.js, render-report.js, generate-pdf.js) is loaded into a
// fake `window` exactly as the browser does, with two hooks: pdf.text() is
// logged (page + y), and pdf.save() is captured (it needs a DOM). No other
// stubbing — jsPDF constructs and draws without `document`.
//
// Set GENERATE_PDF_SRC to a path to run this suite against a different
// generate-pdf.js (e.g. `git show 50a5882:public/assets/generate-pdf.js`),
// which is how the suite was shown to FAIL on the pre-fix file.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { composeSkeleton } = require('../../src/skeleton');

const ASSETS = path.join(__dirname, '../../public/assets');
const BODY_BOTTOM = 275;   // generate-pdf.js: PAGE_H - MARGIN_B
const PAGE_H = 297;
const LABEL_X = 18;        // MARGIN_L
const VALUE_X = 38;        // MARGIN_L + 20

function renderInstrumented(reportData, mode) {
  const { jsPDF: RealJsPDF } = require(path.join(ASSETS, 'jspdf.umd.min.js'));
  const calls = [];
  let pdfRef = null;
  function InstrumentedJsPDF(options) {
    const pdf = new RealJsPDF(options);
    pdfRef = pdf;
    const origText = pdf.text;
    pdf.text = function (text, x, y, o) {
      calls.push({ page: pdf.internal.getCurrentPageInfo().pageNumber, x, y, text: String(text) });
      return origText.call(pdf, text, x, y, o);
    };
    pdf.save = function () { return pdf; };
    return pdf;
  }
  const win = { jspdf: { jsPDF: InstrumentedJsPDF } };
  const generateSrc = process.env.GENERATE_PDF_SRC || path.join(ASSETS, 'generate-pdf.js');
  const files = [
    path.join(ASSETS, 'fonts/geist-fonts-base64.js'),
    path.join(ASSETS, 'certificate-fields.js'),
    path.join(ASSETS, 'render-report.js'),
    generateSrc
  ];
  for (const f of files) {
    new Function('window', fs.readFileSync(f, 'utf8'))(win); // eslint-disable-line no-new-func
  }
  win.EHCGeneratePDF.generate(reportData, mode);
  return { calls, pages: pdfRef.getNumberOfPages() };
}

// A realistic HOLD: the field names are the ones src/check.js emits and
// certificate-fields.js reads.
const CERT_INFO = {
  certificate_ref: '26/2/126149', commercial_doc_ref: 'PO-4471928', certificate_type: '8322', pages: '6',
  ov_name: 'Silvia Soescu MRCVS', sp_reference: 'SP 632477', rcvs_number: '7280697',
  bcp_name: 'Calais BCP (FRCQF1)', signing_date: '11/05/2026',
  consignor: 'Saputo Dairy UK Ltd, Davidstow Creamery, Camelford, Cornwall PL32 9XG, United Kingdom',
  consignee: 'Farmel Dairy Products B.V., Industrieweg 12, 8071 CS Nunspeet, Netherlands',
  dispatch_establishment: 'Saputo Davidstow Creamery — UK CW 010 EC',
  destination: 'Farmel Dairy Products B.V., Nunspeet, Netherlands',
  commodity: 'Sweet whey powder, food grade, 25 kg paper sacks on pallets',
  net_weight_kg: 24000, gross_weight_kg: 24960, packages: '960 sacks / 24 pallets',
  hs_code: '0404 10 02', departure_date: '12/05/2026',
  vehicle_id: 'PX21 KLM', trailer: 'T-88412', seal: 'DEFRA 0451923'
};
const EXPECTED_LABELS = ['Reference', 'OV', 'BCP', 'Trade', 'Dispatch', 'Destination',
  'Commodity', 'HS Code', 'Departure', 'Tractor', 'Seal'];
const EXPECTED_VALUES = ['0404 10 02', '12/05/2026', 'PX21 KLM · Trailer T-88412', 'DEFRA 0451923'];

const DESC = 'Box I.11 gives the approval number as UK CW 010 EC but the H1 establishment library lists ' +
  'Davidstow Creamery under UK CW 010 EC only for cheese (8350); for whey powder (8322) the dispatch ' +
  'establishment must carry the dairy-products approval. OV to confirm the approval scope with the ' +
  'establishment before signing.';

function fullReport(nFlags) {
  const rows = composeSkeleton('8322').rows;
  const checklist = {};
  for (const row of rows) {
    if (row.rowClass === 'verdict') checklist[row.id] = { verdict: 'PASS', observed: 'as printed' };
    else if (row.family === 'c6') checklist[row.id] = { observed: row.expected === 'DELETE' ? 'struck' : 'not_struck', confidence: 'high' };
    else checklist[row.id] = { observed: 'stamped', confidence: 'high' };
  }
  const flags = Array.from({ length: nFlags }, (_, i) => ({
    severity: 'hard', title: 'Finding ' + (i + 1), field_reference: 'I.' + (i + 1),
    description: DESC, final_conclusion: 'confirmed'
  }));
  return {
    report_mode: 'full', overall_verdict: nFlags ? 'HOLD' : 'PASS', rule_set_version: 'v4.8 (8322)',
    counters: { hard_errors: nFlags, medium_warnings: 0, low_notices: 0 },
    flags, certificate_info: CERT_INFO, checklist_rows: rows, checklist
  };
}

// Everything from the CERTIFICATE heading to the first SECTION eyebrow,
// footers (y = 287, by design below BODY_BOTTOM) excluded.
function certificateBlock(calls) {
  const start = calls.findIndex(c => c.text === 'CERTIFICATE');
  assert.ok(start >= 0, 'CERTIFICATE heading was never written');
  const end = calls.findIndex((c, i) => i > start && /^SECTION /.test(c.text));
  return calls.slice(start, end < 0 ? undefined : end).filter(c => c.y !== 287);
}

describe('Full Report PDF — CERTIFICATE block survives the page break', () => {
  // The bug depended on where the last finding card left the cursor, not on
  // the count as such (the pre-fix file wrote rows off the sheet at 4 and 5
  // findings with one set of descriptions, at 4 only with another). Sweep
  // 1..8 so the block starts at eight different heights, plus 12.
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 12]) {
    it(`${n} finding(s): every row is on the sheet, above the footer, and labelled`, () => {
      const { calls } = renderInstrumented(fullReport(n), 'full');
      const blk = certificateBlock(calls);

      const offSheet = blk.filter(c => c.y > PAGE_H);
      assert.deepEqual(offSheet.map(c => c.text), [], 'text written past the page edge');
      const inFooter = blk.filter(c => c.y > BODY_BOTTOM);
      assert.deepEqual(inFooter.map(c => c.text), [], 'text written below the body bottom');

      const labels = blk.filter(c => c.x === LABEL_X && EXPECTED_LABELS.includes(c.text));
      assert.deepEqual(
        EXPECTED_LABELS.filter(l => !labels.some(c => c.text === l)), [],
        'certificate rows missing from the PDF');
      for (const v of EXPECTED_VALUES) {
        assert.ok(blk.some(c => c.x === VALUE_X && c.text === v), `value "${v}" missing from the PDF`);
      }
      // A label and its value never straddle a page.
      for (const l of labels) {
        assert.ok(blk.some(c => c.x === VALUE_X && c.page === l.page && Math.abs(c.y - l.y) < 0.01),
          `label "${l.text}" on page ${l.page} has no value beside it`);
      }
      // A heading is never orphaned or doubled.
      blk.forEach((c, i) => {
        if (!/^CERTIFICATE/.test(c.text)) return;
        const next = blk[i + 1];
        assert.ok(next, `heading "${c.text}" has no rows under it`);
        assert.ok(!/^CERTIFICATE/.test(next.text), `heading "${c.text}" is followed by another heading`);
        assert.equal(next.page, c.page, `heading "${c.text}" is orphaned at the foot of page ${c.page}`);
      });
    });
  }

  it('some finding count splits the block across pages, and the overleaf part is re-headed exactly once', () => {
    // Proves the sweep above actually exercised the boundary: if no count
    // ever splits the block, the guard was never tested.
    const splits = [];
    for (let n = 1; n <= 8; n++) {
      const { calls } = renderInstrumented(fullReport(n), 'full');
      const blk = certificateBlock(calls);
      const pages = [...new Set(blk.map(c => c.page))];
      if (pages.length > 1) {
        splits.push(n);
        assert.deepEqual(pages, [pages[0], pages[0] + 1], `${n} findings: block spans non-adjacent pages`);
        assert.equal(blk.filter(c => c.text === 'CERTIFICATE (CONTINUED)').length, 1,
          `${n} findings: continuation heading count`);
      }
    }
    assert.ok(splits.length > 0, 'no finding count in 1..8 made the CERTIFICATE block cross a page');
  });
});
