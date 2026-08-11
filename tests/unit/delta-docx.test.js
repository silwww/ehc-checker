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
    const s = deltaSections([approved({ tier: 'library', flag_title: 'Lib entry' }), approved({ proposed_by: 'Silvia' })]);
    assert.equal(s[0].heading.includes('New destination'), true);
    assert.match(s[0].lines.join('\n'), /26\/2\/219286/);
    assert.match(s[0].lines.join('\n'), /Proposed by Silvia/);
    assert.match(s[0].lines.join('\n'), /Approved by SS/);
    const last = s[s.length - 1];
    assert.match(last.heading, /Library additions/);
    assert.match(last.lines.join('\n'), /Lib entry/);
  });
  it('uses model_recommendation as the proposed rule text, falling back to the flag description', () => {
    const s = deltaSections([approved({ model_recommendation: '' })]);
    assert.match(s[0].lines.join('\n'), /Consignee not in library/);
  });

  // A tier the renderer does not know must never make a proposal vanish:
  // the export marks proposals delivered, so a dropped one is lost for good.
  it('routes an unrecognised tier into a visible "needs classification" section', () => {
    const s = deltaSections([approved({ tier: null, flag_title: 'Orphan entry' })]);
    const all = s.map((x) => x.heading + '\n' + x.lines.join('\n')).join('\n');
    assert.match(all, /Orphan entry/);
    assert.match(all, /classification/i);
  });

  it('never silently drops a proposal, whatever its tier', () => {
    const props = [
      approved({ tier: 'rule', flag_title: 'R1' }),
      approved({ tier: 'library', flag_title: 'L1' }),
      approved({ tier: 'nonsense', flag_title: 'X1' }),
      approved({ tier: undefined, flag_title: 'X2' })
    ];
    const all = deltaSections(props).map((x) => x.heading + '\n' + x.lines.join('\n')).join('\n');
    for (const title of ['R1', 'L1', 'X1', 'X2']) assert.match(all, new RegExp(title));
  });

  // An empty rule body used to render as a heading, the label "Proposed rule
  // text:" and a blank line — indistinguishable from a rule Roger must read.
  it('marks a missing rule body instead of shipping a blank one', () => {
    const s = deltaSections([approved({ model_recommendation: '', flag_description: '' })]);
    assert.match(s[0].lines.join('\n'), /NO RULE TEXT/);
  });

  // join() turns a stray undefined into '', so asserting on the joined
  // string hides the defect: the renderer does String(line) and writes the
  // literal word "undefined" into Roger's document. Assert per line.
  it('emits only strings, so no line can render as literal "undefined"', () => {
    const s = deltaSections([approved({ model_recommendation: undefined, flag_description: undefined })]);
    for (const line of s[0].lines) assert.equal(typeof line, 'string', `line was ${String(line)}`);
  });

  // C0 control chars are illegal in XML 1.0 and the docx library does not
  // strip them (its escaper only handles & " < > '), so Word refuses the
  // file. This is the last gate before render.
  it('strips control characters from every rendered line and heading', () => {
    const s = deltaSections([approved({
      flag_title: 'Title\u000Bwith break',
      reviewed_by: 'SS\u0000',
      decision_note: 'note\u001Fhere'
    })]);
    const all = s.map((x) => x.heading + '\n' + x.lines.join('\n')).join('\n');
    assert.doesNotMatch(all, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
    assert.match(all, /Titlewith break/);
  });

  // The document travels to Roger without the UI attached, so a partial
  // export has to say so inside the file itself.
  it('states a partial export at the top of the document', () => {
    const s = deltaSections([approved({})], { partial: { shipped: 3, total: 8 } });
    const first = s[0].heading + '\n' + s[0].lines.join('\n');
    assert.match(first, /PARTIAL/i);
    assert.match(first, /3/);
    assert.match(first, /8/);
  });

  it('adds no partial notice on a complete export', () => {
    const s = deltaSections([approved({})]);
    assert.doesNotMatch(s.map((x) => x.heading).join('\n'), /PARTIAL/i);
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
