'use strict';

// Content building is pure and fully asserted; the docx rendering is
// checked structurally (valid non-trivial zip) — content correctness
// lives in deltaSections, which the renderer consumes 1:1.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { deltaSections, buildDeltaDocx } = require('../../server/delta-docx');

function approved(overrides) {
  return {
    id: 'x', created_at: '2026-08-11T15:00:00Z', certificate_ref: '26/2/219286',
    cert_type: '8468', source_kind: 'flag', flag_severity: 'low',
    flag_title: 'New destination — Van der Vaart',
    flag_description: 'Consignee not in library.',
    model_recommendation: 'Add Van der Vaart (NL) to consignees.',
    proposer_note: 'seen twice', status: 'approved', tier: 'rule',
    reviewed_by: 'SS', reviewed_at: '2026-08-11T16:00:00Z', decision_note: null,
    ...overrides
  };
}

describe('deltaSections', () => {
  it('rule-tier proposals come first, each with provenance lines', () => {
    const s = deltaSections([approved({ tier: 'library', flag_title: 'Lib entry' }), approved({})]);
    assert.equal(s[0].heading.includes('New destination'), true);
    assert.match(s[0].lines.join('\n'), /26\/2\/219286/);
    assert.match(s[0].lines.join('\n'), /Approved by SS/);
    const last = s[s.length - 1];
    assert.match(last.heading, /Library additions/);
    assert.match(last.lines.join('\n'), /Lib entry/);
  });
  it('uses model_recommendation as the proposed rule text, falling back to the flag description', () => {
    const s = deltaSections([approved({ model_recommendation: '' })]);
    assert.match(s[0].lines.join('\n'), /Consignee not in library/);
  });
});

describe('buildDeltaDocx', () => {
  it('produces a non-trivial docx (zip) buffer', async () => {
    const buf = await buildDeltaDocx([approved({})]);
    assert.equal(buf[0], 0x50); // 'P'
    assert.equal(buf[1], 0x4b); // 'K'
    assert.ok(buf.length > 2000);
  });
});
