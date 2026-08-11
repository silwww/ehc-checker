'use strict';

// Deterministic node:test coverage for render()'s displayMode contract.
//
// Bug this guards against: index.html restores the last concise report from
// sessionStorage via the one-shot render(), which used to render the
// full-mode section breakdown unconditionally (checklistToSections →
// sectionsTableHTML mode:'full'). The OV saw a full audit layout under a
// footer that said "Concise Report". render() now takes options.displayMode:
// 'concise' mirrors the streaming path's Checks Performed card; the default
// ('full') keeps audit.html's behaviour byte-identical.
//
// Loading pattern mirrors checklist-to-sections.test.js: render-report.js is
// browser JS with no module.exports, loaded via new Function('window', src).
// render() additionally calls wireHelpers, which touches the global
// `document` — stubbed here with null-safe lookups for the duration of each
// render call.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { composeSkeleton } = require('../../src/skeleton');

function loadRenderReport() {
  const fakeWindow = {};
  // render() → compactHTML calls EHCCertificateFields.selectCertificateRows,
  // so load the real production util first, then render-report.js on top.
  for (const asset of ['certificate-fields.js', 'render-report.js']) {
    const src = fs.readFileSync(
      path.join(__dirname, '../../public/assets/', asset),
      'utf8'
    );
    const fn = new Function('window', src); // eslint-disable-line no-new-func
    fn(fakeWindow);
  }
  if (!fakeWindow.EHCRenderReport || typeof fakeWindow.EHCRenderReport.render !== 'function') {
    throw new Error('Test bug: render-report.js did not expose render on the fake window');
  }
  return fakeWindow.EHCRenderReport;
}

const { render } = loadRenderReport();

// wireHelpers reads the global document; every lookup is null-guarded in
// production code, so a stub returning "nothing found" is sufficient.
function withDocumentStub(fn) {
  global.document = {
    getElementById: () => null,
    querySelectorAll: () => []
  };
  try {
    return fn();
  } finally {
    delete global.document;
  }
}

// Single-call concise payload shape: sections[0] carries the Checks
// Performed table (streaming path input) AND checklist_rows carries the
// skeleton for the Full Report re-render. Real 8322 skeleton rows, not a
// hand-rolled fixture.
function concisePayload() {
  return {
    report_mode: 'concise',
    overall_verdict: 'PASS',
    flags: [],
    certificate_info: { certificate_ref: 'TEST/1' },
    sections: [{
      section_number: 1,
      title: 'Checks Performed',
      checks: [{ check_name: 'I.1 Consignor', detail: 'as printed', result: 'PASS' }]
    }],
    checklist_rows: composeSkeleton('8322').rows,
    checklist: {}
  };
}

function renderToHtml(data, options) {
  const target = { innerHTML: '' };
  withDocumentStub(() => render(target, data, {}, options));
  return target.innerHTML;
}

describe('render() displayMode', () => {
  it('concise displayMode renders the Checks Performed card, not the full section breakdown', () => {
    const html = renderToHtml(concisePayload(), { displayMode: 'concise' });
    assert.ok(
      html.includes('checks-performed-section'),
      'expected the streaming-path Checks Performed card in concise displayMode'
    );
    assert.ok(
      !html.includes('>SECTION '),
      'full-mode per-section eyebrows must not appear in concise displayMode'
    );
    assert.ok(
      !html.includes('>CERTIFICATE<'),
      'the CERTIFICATE compact card was dropped from streaming concise in Phase 3 — the restored view must match'
    );
  });

  it('default (no options) keeps the full-mode breakdown — the audit.html contract', () => {
    const html = renderToHtml(concisePayload());
    assert.ok(
      html.includes('>SECTION '),
      'expected full-mode section eyebrows on the default path'
    );
    assert.ok(
      !html.includes('checks-performed-section'),
      'the concise Checks Performed card must not leak into the default full render'
    );
    assert.ok(
      html.includes('>CERTIFICATE<'),
      'the CERTIFICATE compact card stays on the full path (audit.html contract)'
    );
  });
});
