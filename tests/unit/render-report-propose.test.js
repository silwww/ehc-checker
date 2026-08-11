'use strict';

// The propose-rule buttons ride the flag cards and the recommendations
// block. DOM-free: we assert the HTML strings the block helpers emit.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function loadRenderReport() {
  const fakeWindow = {};
  for (const asset of ['certificate-fields.js', 'render-report.js']) {
    const src = fs.readFileSync(path.join(__dirname, '../../public/assets/', asset), 'utf8');
    new Function('window', src)(fakeWindow); // eslint-disable-line no-new-func
  }
  return fakeWindow.EHCRenderReport;
}

const rr = loadRenderReport();

describe('propose-rule buttons', () => {
  it('flagHTML carries a propose button with escaped data attributes', () => {
    const html = rr.blocks.flagHTML({
      severity: 'low',
      title: 'New "destination" <x>',
      description: 'Consignee & co "Van der Vaart" not in library',
      field_reference: 'I.5'
    }, false);
    assert.match(html, /propose-rule-btn/);
    assert.match(html, /data-kind="flag"/);
    assert.match(html, /data-title="New &quot;destination&quot; &lt;x&gt;"/);
    // data-description was the one attribute left unasserted, so dropping
    // escapeHtml there kept the suite green — and the model writes these
    // strings, so a quote in a description breaks out of the attribute.
    assert.match(html, /data-description="Consignee &amp; co &quot;Van der Vaart&quot; not in library"/);
    assert.match(html, /data-severity="low"/);
    assert.match(html, /data-field-ref="I\.5"/);
    assert.match(html, /Propose as rule/);
  });
  it('retracted flags do NOT offer proposing', () => {
    const html = rr.blocks.flagHTML({ severity: 'low', title: 'x', description: 'y', retracted: true }, true);
    assert.doesNotMatch(html, /propose-rule-btn/);
  });
  it('recommendationsHTML carries one propose button for the whole block', () => {
    const html = rr.blocks.recommendationsHTML({ rule_set_update_recommendations: 'Add X to Y' });
    assert.match(html, /propose-rule-btn/);
    assert.match(html, /data-kind="recommendations"/);
  });
  it('empty recommendations render nothing at all (unchanged)', () => {
    assert.equal(rr.blocks.recommendationsHTML({ rule_set_update_recommendations: '' }), '');
  });
});
