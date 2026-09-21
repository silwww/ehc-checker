'use strict';

// Pins every Part II clause expectation for the two certificate types that
// have a machine-readable checklist.
//
// Why this exists. compose-skeleton.test.js asserts CARDINALITY — 10 c6 rows,
// 2 c10 rows — and three individual `expected` values. That gave a false
// impression of coverage: when v4.8 flipped II.1a on 8468 from DELETE to
// RETAIN, which is the single highest-stakes change in that version, the row
// count did not move and no test asserted the value, so the flip was
// completely unguarded. Reverting it today would leave the suite green.
//
// What a silent revert would do. `expected` is NOT sent to the model — the
// tool schema only asks it to observe struck / not_struck / unclear, and the
// prompt tells it not to judge. `c6Check` in public/assets/render-report.js
// compares that observation against `expected` to decide the icon. So with
// `expected: "DELETE"` restored, a struck or redacted AMR attestation on a
// post-3-September 8468 renders as a green PASS in the Full Report — the
// precise inversion v4.8 exists to prevent — while the flags say otherwise.
// Concise and Full would disagree on the AMR clause, which is the
// false-reassurance class this project has already shipped once.
//
// The list is ORDERED and EXACT. Clause refs repeat (II.2.1 and II.2.2 each
// appear twice on 8468, "II.4 (2) or" four times on 8322), so clause alone is
// not a key — the triple is. A deliberate rule change updates this file in the
// same commit, which is the point: the value becomes something a reviewer sees.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const CHECKLISTS = {
  '8468': path.join(__dirname, '../../rules/dairy-uk-eu/types/8468-checklist.json'),
  '8322': path.join(__dirname, '../../rules/dairy-uk-eu/types/8322-checklist.json')
};

const PINNED = {
  '8468': [
    ['II.1', 'Public health attestation (a-e)', 'RETAIN'],
    ['II.1a', 'AMR attestation', 'RETAIN'],
    ['II.2', 'Animal health attestation', 'RETAIN'],
    ['II.2.1', 'Annex XVII entry route', 'RETAIN'],
    ['II.2.1', 'Annex XXII transit route', 'DELETE'],
    ['II.2.2', 'Raw milk / Bos taurus', 'RETAIN'],
    ['II.2.2', 'Member States option', 'RETAIN'],
    ['Signature block', 'Official veterinarian option', 'RETAIN'],
    ['Signature block', 'Certifying officer option', 'DELETE'],
    ['Notes', 'Windsor Framework note', 'RETAIN']
  ],
  '8322': [
    ['II.1', 'Country/FMD', 'RETAIN'],
    ['II.2', 'Raw milk animal health', 'RETAIN'],
    ['II.3 (2) either', 'Treatments in II.4', 'RETAIN'],
    ['II.3 (2) or', 'Whey/FMD arm', 'DELETE'],
    ['II.4 header', 'HTST header', 'RETAIN'],
    ['II.4 (2) either', 'Second HTST', 'DELETE'],
    ['II.4 (2) or', 'Drying process', 'RETAIN'],
    ['II.4 (2) or', 'pH reduction', 'DELETE'],
    ['II.4 (2)(5) or', '21 days FMD', 'DELETE'],
    ['II.4 (2)(5) or', 'Voyage date', 'DELETE'],
    ['II.4 (2) or', 'UHT 132 degrees', 'DELETE'],
    ['II.4 (2) or', 'Sterilisation Fo3', 'DELETE'],
    ['II.5', 'Contamination precautions', 'RETAIN'],
    ['II.6 (2) either', 'New containers', 'RETAIN'],
    ['II.6 (2) or', 'Bulk container disinfection', 'DELETE'],
    ['II.6 and', 'Cat 3 labelling', 'RETAIN'],
    ['II.7 (2) either', 'No ovine/caprine', 'RETAIN'],
    ['II.7 (2) or', 'Ovine/caprine arm', 'DELETE']
  ]
};

function actualTriples(code) {
  const spec = JSON.parse(fs.readFileSync(CHECKLISTS[code], 'utf8'));
  return spec.partIIClauses.map(r => [r.clause, r.label, r.expected]);
}

describe('Part II clause expectations are pinned', () => {
  for (const code of Object.keys(PINNED)) {
    it(`${code}: every clause keeps its expected state, in order`, () => {
      assert.deepEqual(
        actualTriples(code),
        PINNED[code],
        `${code}-checklist.json partIIClauses changed. If that was deliberate, ` +
          `update the pin in this file in the SAME commit and say why in the ` +
          `message. If it was not, a clause expectation has been altered and ` +
          `the Full Report will render that clause against the wrong standard.`
      );
    });
  }

  // Stated separately from the list above so it cannot be lost in a bulk
  // re-pin: this is the v4.8 headline rule and the reason the file exists.
  it('8468 II.1a AMR attestation is RETAIN, not DELETE', () => {
    const row = actualTriples('8468').find(([clause]) => clause === 'II.1a');
    assert.ok(row, '8468 must carry a II.1a clause row');
    assert.equal(
      row[2],
      'RETAIN',
      'Rule set v4.8 made the AMR attestation live: it must be retained and ' +
        'completed, and deleted or redacted is a hard error. DELETE here makes ' +
        'the Full Report show a struck AMR clause as a green PASS.'
    );
  });

  it('every pinned expectation is a value the renderer understands', () => {
    for (const code of Object.keys(PINNED)) {
      for (const [clause, label, expected] of actualTriples(code)) {
        assert.ok(
          ['RETAIN', 'DELETE'].includes(expected),
          `${code} ${clause} "${label}" has expected="${expected}", which c6Check ` +
            `does not handle — it compares against RETAIN/DELETE only, so this row ` +
            `would render against no standard at all.`
        );
      }
    }
  });
});
