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
    // The phrase, not two bare digits: matched separately, "8 of 3" passed.
    assert.match(first, /contains 3 of 8/);
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

// The assertions above are structural only, and a document containing NOTHING
// but its two title paragraphs is 8629 bytes and starts with PK — so deleting
// the renderer's entire line loop, or the safe() calls it depends on, left the
// suite green. These open the file instead. This is the layer where the
// artefact Roger receives actually exists.
describe('the rendered document itself', () => {
  const JSZip = require('jszip');

  async function documentXml(proposals, opts) {
    const buf = await buildDeltaDocx(proposals, opts);
    const zip = await JSZip.loadAsync(buf);
    const entry = zip.file('word/document.xml');
    assert.ok(entry, 'word/document.xml must exist');
    // Read as bytes, then decode — going straight to a string would hide
    // encoding damage, which is the class of bug this suite keeps missing.
    return Buffer.from(await entry.async('nodebuffer')).toString('utf8');
  }

  it('contains the flag title and the rule text of every proposal', async () => {
    const xml = await documentXml([
      approved({ tier: 'rule', flag_title: 'RULE-ALPHA', model_recommendation: 'BODY-ALPHA' }),
      approved({ tier: 'library', flag_title: 'LIB-BETA', model_recommendation: 'BODY-BETA' })
    ]);
    for (const needle of ['RULE-ALPHA', 'BODY-ALPHA', 'LIB-BETA', 'BODY-BETA']) {
      assert.ok(xml.includes(needle), `${needle} must appear in the document`);
    }
  });

  // THE guard for internal_note. The practice files each certificate in a
  // pCloud folder and records that number on the proposal; it is their own
  // bookkeeping, and the rule set author's document must never carry it.
  // proposer_note sits one field away and IS exported, so the two are one
  // slip apart.
  //
  // Three things this asserts that an earlier, narrower version did not, all
  // found by running the leaks rather than imagining them:
  //   1. EVERY zip entry, not just word/document.xml. A .docx has 18 of them
  //      and `description` lands in docProps/core.xml — a real leak the
  //      single-entry check could not see.
  //   2. Every tier branch. The renderer builds `rule`, `library` and
  //      unrecognised-tier sections in three separate places, so a guard that
  //      only exercises one covers a third of the surface. The empty
  //      model_recommendation case is here too, because that is the branch
  //      where ruleText() falls back and could pick the wrong field.
  //   3. A needle with no XML-special characters, carried inside a note that
  //      HAS them. A real reference like "pCloud R&D 4471" is escaped to
  //      "R&amp;D" in the file, so asserting on the raw string would miss the
  //      leak it was written to catch.
  async function everyEntryText(proposals, opts) {
    const buf = await buildDeltaDocx(proposals, opts);
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    const parts = [];
    for (const name of names) {
      parts.push(Buffer.from(await zip.file(name).async('nodebuffer')).toString('utf8'));
    }
    return { text: parts.join('\n'), entries: names };
  }

  const NEEDLE = 'PCLOUDNEEDLE4471';
  const INTERNAL = `pCloud R&D <${NEEDLE}>`;

  it('never leaks internal_note into any part of the document', async () => {
    const cases = [
      ['rule tier', { tier: 'rule' }],
      ['library tier', { tier: 'library' }],
      ['unrecognised tier', { tier: 'something-else' }],
      ['no model recommendation — ruleText falls back', { tier: 'rule', model_recommendation: '' }],
      ['no rule text at all', { tier: 'rule', model_recommendation: '', flag_description: '' }]
    ];
    for (const [label, overrides] of cases) {
      const { text, entries } = await everyEntryText([approved({
        ...overrides,
        proposer_note: 'NOTE-FOR-AUTHOR',
        internal_note: INTERNAL
      })]);
      assert.ok(entries.length > 1, 'the archive must really have been opened');
      assert.ok(!text.includes(NEEDLE),
        `internal_note leaked into the document (${label}); entries searched: ${entries.join(', ')}`);
    }
  });

  it('still carries the proposer note, which IS meant to travel', async () => {
    const { text } = await everyEntryText([approved({
      proposer_note: 'NOTE-FOR-AUTHOR',
      internal_note: INTERNAL
    })]);
    assert.ok(text.includes('NOTE-FOR-AUTHOR'),
      'the guard must not pass by simply exporting nothing');
  });

  it('carries the provenance of each entry into the file', async () => {
    const xml = await documentXml([approved({ proposed_by: 'PROPOSER-X', reviewed_by: 'REVIEWER-Y' })]);
    assert.ok(xml.includes('PROPOSER-X'));
    assert.ok(xml.includes('REVIEWER-Y'));
    assert.ok(xml.includes('26/2/219286'), 'the certificate reference is the provenance that matters most');
  });

  it('emits XML that survives a parse — control characters and noncharacters included', async () => {
    const xml = await documentXml([approved({
      flag_title: 'Title\u000Bbreak\uFFFF',
      flag_description: 'Body\u0000null\uFFFE',
      reviewed_by: 'SS\u001F',
      decision_note: 'note\u0008x',
      proposer_note: 'lone\uD800surrogate'
    })]);
    // A well-formedness proxy that does not need an XML parser dependency:
    // these bytes are illegal in XML 1.0 and are exactly what broke Word.
    assert.doesNotMatch(xml, /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/);
    assert.doesNotMatch(xml, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    assert.ok(xml.includes('Titlebreak'), 'the surrounding text must survive');
  });

  it('escapes rather than injects when a title contains markup', async () => {
    const xml = await documentXml([approved({ flag_title: '</w:t><w:p>INJECTED</w:p><w:t>' })]);
    assert.ok(xml.includes('&lt;/w:t&gt;'), 'markup must be escaped, not emitted');
    assert.ok(!xml.includes('<w:p>INJECTED</w:p>'), 'no paragraph may be injected by text');
  });

  it('states the partial export inside the document, where Roger will read it', async () => {
    const xml = await documentXml([approved({})], { partial: { shipped: 3, total: 8, cause: 'error' } });
    assert.match(xml, /contains 3 of 8/, 'the numbers must be in this order');
    assert.match(xml, /PARTIAL/);
  });

  it('says the RIGHT thing about why an export was partial', async () => {
    const stillQueued = await documentXml([approved({})], { partial: { shipped: 1, total: 2, cause: 'error' } });
    assert.match(stillQueued, /remain queued/i);
    const elsewhere = await documentXml([approved({})], { partial: { shipped: 1, total: 2, cause: 'parallel' } });
    assert.match(elsewhere, /NOT queued|separate document/i);
  });

  it('never prints a placeholder when partial numbers are missing', async () => {
    const xml = await documentXml([approved({})], { partial: {} });
    assert.doesNotMatch(xml, /undefined|NaN|\[object Object\]/);
  });

  it('labels an untitled proposal instead of emitting a blank heading', async () => {
    const xml = await documentXml([approved({ flag_title: '' })]);
    assert.match(xml, /UNTITLED PROPOSAL/);
  });
});

// The partial notice travels to the rule set author with no UI attached, so
// its wording IS the safety mechanism. Two of the causes are opposite
// instructions — "in a separate document, still approved" vs "withdrawn, do
// not act on it" — and a single batch can suffer both.
describe('partial-export wording', () => {
  const partialOf = (partial) =>
    deltaSections([approved({})], { partial })
      .find((s) => /PARTIAL EXPORT/.test(s.heading)).lines.join(' | ');

  it('a parallel export does not read as a withdrawal', () => {
    const text = partialOf({ shipped: 1, total: 2, cause: 'parallel' });
    assert.match(text, /separate document/);
    assert.doesNotMatch(text, /withdrawn/);
  });

  it('a revert does not read as "still queued"', () => {
    const text = partialOf({ shipped: 1, total: 2, cause: 'reverted' });
    assert.match(text, /withdrawn by a reviewer/);
    assert.doesNotMatch(text, /remain queued/);
  });

  it('a mixed batch states BOTH, with counts', () => {
    // Collapsing these told the author that a proposal a parallel export had
    // just delivered to him was withdrawn and not to be acted on.
    const text = partialOf({ shipped: 2, total: 4, cause: 'mixed', reverted: 1, already_exported: 1 });
    assert.match(text, /1 were exported by a parallel export/);
    assert.match(text, /1 had their approval withdrawn/);
    assert.match(text, /2 of 4/);
  });

  it('a re-download admits it cannot reproduce the reason', () => {
    const text = partialOf({ shipped: 1, total: 2, cause: 'unknown' });
    assert.match(text, /not recorded in this re-download/);
    assert.doesNotMatch(text, /withdrawn/);
    assert.doesNotMatch(text, /separate document/);
  });
});

// The certificate field the finding is about. Emitted on the flag card since
// the beginning, but never carried into the proposal — so the author read
// "New destination not in library" with no idea it concerned I.12.
describe('certificate field reference', () => {
  it('reaches the document when present', () => {
    const lines = deltaSections([approved({ field_reference: 'I.12' })])[0].lines.join(' | ');
    assert.match(lines, /Certificate field: I\.12/);
  });

  it('is simply absent when the model did not report one', () => {
    const lines = deltaSections([approved({ field_reference: '' })])[0].lines.join(' | ');
    assert.doesNotMatch(lines, /Certificate field/);
  });
});
