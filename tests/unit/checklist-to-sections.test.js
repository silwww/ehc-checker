'use strict';

// Deterministic node:test coverage for public/assets/render-report.js's
// checklistToSections — pure and DOM-free, but previously verified only by
// a manual browser smoke. It now decides what an Official Veterinarian
// sees as PASS versus NOT REPORTED in the audit artefact.
//
// render-report.js is browser JS with no module.exports (it assigns
// global.EHCRenderReport). It is loaded here via new Function('window', src)
// into a minimal fake global that stubs only what the module touches at
// LOAD time — the EHCCertificateFields guard at the top of the IIFE.
// checklistToSections / verdictCheck / c6Check / c10Check never touch
// `document`, so no DOM stub is required to call the function under test.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { composeSkeleton } = require('../../src/skeleton');

function loadRenderReport() {
  const src = fs.readFileSync(
    path.join(__dirname, '../../public/assets/render-report.js'),
    'utf8'
  );
  const fakeWindow = { EHCCertificateFields: {} };
  const fn = new Function('window', src); // eslint-disable-line no-new-func
  fn(fakeWindow);
  if (!fakeWindow.EHCRenderReport || typeof fakeWindow.EHCRenderReport.checklistToSections !== 'function') {
    throw new Error('Test bug: render-report.js did not expose checklistToSections on the fake window');
  }
  return fakeWindow.EHCRenderReport;
}

const { checklistToSections } = loadRenderReport();

// 8322 has a type checklist spec on disk -> the full 47-row skeleton
// (24 Part I + 18 C6 + 4 C10 + 1 page_structure). Real rows, not a
// hand-rolled fixture, so this test exercises the actual production shape.
const { rows: ROWS } = composeSkeleton('8322');

function cleanFilledChecklist() {
  const filled = {};
  for (const row of ROWS) {
    if (row.rowClass === 'verdict') {
      filled[row.id] = { verdict: 'PASS', observed: 'as printed' };
    } else if (row.family === 'c6') {
      filled[row.id] = { observed: row.expected === 'DELETE' ? 'struck' : 'not_struck', confidence: 'high' };
    } else {
      filled[row.id] = { observed: 'stamped', confidence: 'high' };
    }
  }
  return filled;
}

function sectionByTitlePrefix(sections, prefix) {
  return sections.find((s) => typeof s.title === 'string' && s.title.indexOf(prefix) === 0);
}

describe('checklistToSections', () => {
  it('full clean fill: one check per skeleton row, every one PASS (no summary section appended without sections[])', () => {
    const data = { checklist_rows: ROWS, checklist: cleanFilledChecklist() };
    const sections = checklistToSections(data);

    assert.ok(!sections.some((s) => s.title === 'Checks Performed (summary)'));
    const allChecks = sections.flatMap((s) => s.checks);
    assert.equal(allChecks.length, ROWS.length, 'one check per skeleton row');
    for (const c of allChecks) {
      assert.equal(c.result, 'PASS', `expected PASS for "${c.check_name}", got ${c.result}: ${c.detail}`);
    }
  });

  it('empty checklist ({}): every row NOT REPORTED — no PASS-by-omission', () => {
    const data = { checklist_rows: ROWS, checklist: {} };
    const sections = checklistToSections(data);
    const allChecks = sections.flatMap((s) => s.checks);
    assert.equal(allChecks.length, ROWS.length);
    for (const c of allChecks) {
      assert.equal(c.result, 'NOTICE');
      assert.match(c.detail, /NOT REPORTED/);
    }
  });

  it('null checklist behaves identically to {} — no PASS-by-omission', () => {
    const data = { checklist_rows: ROWS, checklist: null };
    const sections = checklistToSections(data);
    const allChecks = sections.flatMap((s) => s.checks);
    for (const c of allChecks) assert.equal(c.result, 'NOTICE');
  });

  it('partial fill: the gap renders NOT REPORTED, the filled row renders its verdict', () => {
    const data = {
      checklist_rows: ROWS,
      checklist: { i_1_consignor_exporter: { verdict: 'HARD', observed: 'Missing', note: 'Blank field' } }
    };
    const sections = checklistToSections(data);
    const partI = sectionByTitlePrefix(sections, 'Part I');

    const filledCheck = partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0);
    assert.ok(filledCheck, 'expected the filled I.1 row to be present');
    assert.equal(filledCheck.result, 'FAIL'); // HARD -> FAIL

    const gapChecks = partI.checks.filter((c) => c.check_name.indexOf('I.1 — ') !== 0);
    assert.ok(gapChecks.length > 0);
    for (const c of gapChecks) {
      assert.equal(c.result, 'NOTICE');
      assert.match(c.detail, /NOT REPORTED/);
    }
  });

  it('out-of-enum verdict renders LOUD (FAIL) with the verdict string named, never the un-filled NOTICE (fix 1)', () => {
    const data = {
      checklist_rows: ROWS,
      checklist: { i_1_consignor_exporter: { verdict: 'CRITICAL', observed: 'GB', note: 'model invented a verdict' } }
    };
    const sections = checklistToSections(data);
    const partI = sectionByTitlePrefix(sections, 'Part I');
    const check = partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0);
    assert.equal(check.result, 'FAIL');
    assert.match(check.detail, /not recognised/);
    assert.match(check.detail, /CRITICAL/);
  });

  it('a lowercase verdict matching the flags severity enum (e.g. "hard") is still recognised after normalisation, not rendered as unrecognised (fix 1)', () => {
    const data = {
      checklist_rows: ROWS,
      checklist: { i_1_consignor_exporter: { verdict: 'hard', observed: 'GB', note: 'A10' } }
    };
    const sections = checklistToSections(data);
    const partI = sectionByTitlePrefix(sections, 'Part I');
    const check = partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0);
    assert.equal(check.result, 'FAIL'); // HARD -> FAIL, via case-insensitive match
    assert.doesNotMatch(check.detail, /not recognised/);
  });

  it('perception row (c6) with an "unclear" observation renders NOTICE, never FAIL/WARNING', () => {
    const c6Row = ROWS.find((r) => r.family === 'c6');
    const data = {
      checklist_rows: ROWS,
      checklist: { [c6Row.id]: { observed: 'unclear', confidence: 'low' } }
    };
    const sections = checklistToSections(data);
    const c6Section = sectionByTitlePrefix(sections, 'Part II — Attestation clauses');
    const check = c6Section.checks.find((c) => c.check_name.indexOf(c6Row.clauseRef) === 0);
    assert.equal(check.result, 'NOTICE');
    assert.notEqual(check.result, 'FAIL');
    assert.notEqual(check.result, 'WARNING');
  });

  it('perception row (c6) with low confidence (even if the observation matches expected) renders NOTICE, never PASS — severity stays in flags', () => {
    const c6Row = ROWS.find((r) => r.family === 'c6' && r.expected === 'RETAIN');
    assert.ok(c6Row, 'fixture requires a RETAIN c6 row on the real 8322 skeleton');
    const data = {
      checklist_rows: ROWS,
      checklist: { [c6Row.id]: { observed: 'not_struck', confidence: 'low' } }
    };
    const sections = checklistToSections(data);
    const c6Section = sectionByTitlePrefix(sections, 'Part II — Attestation clauses');
    const check = c6Section.checks.find((c) => c.check_name.indexOf(c6Row.clauseRef) === 0);
    assert.equal(check.result, 'NOTICE');
  });

  it('c6 row whose skeleton row.expected is neither DELETE nor RETAIN is NOTICE "unknown expectation", never silently RETAIN (fix 1)', () => {
    const brokenRow = { id: 'zz_broken', rowClass: 'perception', family: 'c6', label: 'Broken clause', clauseRef: 'ZZ', expected: 'GARBAGE' };
    const data = {
      checklist_rows: [brokenRow],
      checklist: { zz_broken: { observed: 'struck', confidence: 'high' } }
    };
    const sections = checklistToSections(data);
    const check = sections[0].checks[0];
    assert.equal(check.result, 'NOTICE');
    assert.match(check.detail, /[Ee]xpectation unknown/);
  });

  // ─── observed-value enum discipline on perception rows ────────────────
  // A clause that is struck but must be RETAINed is a hard error. The
  // observed value is therefore decided on ENUM MEMBERSHIP, never on
  // inequality with the single literal 'struck': "STRUCK", "struck
  // through" and "deleted" must never satisfy "not struck" and render a
  // green PASS on a RETAIN row.
  const C6_RETAIN_ROW = ROWS.find((r) => r.family === 'c6' && r.expected === 'RETAIN');
  const C6_DELETE_ROW = ROWS.find((r) => r.family === 'c6' && r.expected === 'DELETE');
  const C6_ROWS = ROWS.filter((r) => r.family === 'c6');
  const C10_ROWS = ROWS.filter((r) => r.family === 'c10');

  function c6Result(row, observed, confidence) {
    const sections = checklistToSections({
      checklist_rows: ROWS,
      checklist: { [row.id]: { observed: observed, confidence: confidence || 'high' } }
    });
    const section = sectionByTitlePrefix(sections, 'Part II — Attestation clauses');
    return section.checks[C6_ROWS.indexOf(row)];
  }

  function c10Result(row, observed, confidence) {
    const sections = checklistToSections({
      checklist_rows: ROWS,
      checklist: { [row.id]: { observed: observed, confidence: confidence || 'high' } }
    });
    const section = sectionByTitlePrefix(sections, 'Part II — Blank fields');
    return section.checks[C10_ROWS.indexOf(row)];
  }

  it('c6 RETAIN row: a struck clause never renders PASS, whatever casing the model used', () => {
    assert.ok(C6_RETAIN_ROW, 'fixture requires a RETAIN c6 row on the real 8322 skeleton');
    for (const observed of ['struck', 'STRUCK', ' Struck ']) {
      const check = c6Result(C6_RETAIN_ROW, observed);
      assert.equal(check.result, 'NOTICE', `observed ${JSON.stringify(observed)} must not render PASS on a RETAIN row`);
    }
  });

  it('c6 RETAIN row: an out-of-enum or non-string observation renders NOTICE and NAMES the value', () => {
    for (const observed of ['struck through', 'deleted', 'crossed out', 42, {}]) {
      const check = c6Result(C6_RETAIN_ROW, observed);
      assert.equal(check.result, 'NOTICE', `observed ${JSON.stringify(observed)} must not render PASS`);
      assert.match(check.detail, /not recognised/);
    }
    assert.match(c6Result(C6_RETAIN_ROW, 'struck through').detail, /struck through/);
    assert.match(c6Result(C6_RETAIN_ROW, 'deleted').detail, /deleted/);
    assert.match(c6Result(C6_RETAIN_ROW, 42).detail, /42/);
  });

  it('c6 RETAIN row: only an in-enum not_struck with high confidence renders PASS', () => {
    assert.equal(c6Result(C6_RETAIN_ROW, 'not_struck').result, 'PASS');
    assert.equal(c6Result(C6_RETAIN_ROW, 'NOT_STRUCK').result, 'PASS');
    assert.equal(c6Result(C6_RETAIN_ROW, 'not_struck', 'low').result, 'NOTICE');
    assert.equal(c6Result(C6_RETAIN_ROW, 'unclear').result, 'NOTICE');
    assert.doesNotMatch(c6Result(C6_RETAIN_ROW, 'unclear').detail, /not recognised/);
  });

  it('c6 DELETE row: struck (any casing) is the clean state; everything else is NOTICE', () => {
    assert.ok(C6_DELETE_ROW, 'fixture requires a DELETE c6 row on the real 8322 skeleton');
    assert.equal(c6Result(C6_DELETE_ROW, 'struck').result, 'PASS');
    assert.equal(c6Result(C6_DELETE_ROW, 'STRUCK').result, 'PASS');
    assert.equal(c6Result(C6_DELETE_ROW, 'not_struck').result, 'NOTICE');
    assert.equal(c6Result(C6_DELETE_ROW, 'unclear').result, 'NOTICE');
    for (const observed of ['struck through', 'deleted', 42, {}]) {
      const check = c6Result(C6_DELETE_ROW, observed);
      assert.equal(check.result, 'NOTICE');
      assert.match(check.detail, /not recognised/);
    }
  });

  it('c10 row: observed is matched on enum membership too, case-insensitively', () => {
    const row = C10_ROWS[0];
    assert.ok(row, 'fixture requires a c10 row on the real 8322 skeleton');
    assert.equal(c10Result(row, 'stamped').result, 'PASS');
    assert.equal(c10Result(row, 'STAMPED').result, 'PASS');
    assert.equal(c10Result(row, 'stamped', 'low').result, 'NOTICE');
    assert.equal(c10Result(row, 'unstamped').result, 'NOTICE');
    assert.equal(c10Result(row, 'no_entry').result, 'NOTICE');
    for (const observed of ['stamped and initialled', 'signed', 42]) {
      const check = c10Result(row, observed);
      assert.equal(check.result, 'NOTICE');
      assert.match(check.detail, /not recognised/);
    }
  });

  // ─── Unbacked (withdrawn) finding rows ────────────────────────────────
  // A retracted flag is stripped server-side, so counters/verdict read
  // clean while the checklist row still carries the model's original HARD.
  // Rendering that row as a red FAIL contradicts the PASS verdict; hiding
  // it as a green PASS hides the model's own judgement. It renders as a
  // NOTICE that says the finding was withdrawn on review.
  it('a finding row named in checklist_integrity.unbacked_row_ids renders as WITHDRAWN, not FAIL and not PASS', () => {
    const data = {
      checklist_rows: ROWS,
      checklist: { i_1_consignor_exporter: { verdict: 'HARD', observed: 'Saputo Dairy UK', note: 'Looked blank on first pass' } },
      checklist_integrity: { unbacked_row_ids: ['i_1_consignor_exporter'] }
    };
    const sections = checklistToSections(data);
    const partI = sectionByTitlePrefix(sections, 'Part I');
    const check = partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0);

    assert.equal(check.result, 'NOTICE');
    assert.match(check.detail, /[Ww]ithdrew|WITHDRAWN/);
    assert.match(check.detail, /HARD/);
    // The model's own observation and note survive — nothing is hidden.
    assert.match(check.detail, /Saputo Dairy UK/);
    assert.match(check.detail, /Looked blank on first pass/);
  });

  it('a finding row NOT named as unbacked keeps its 1:1 verdict mapping', () => {
    const data = {
      checklist_rows: ROWS,
      checklist: { i_1_consignor_exporter: { verdict: 'HARD', observed: 'Missing' } },
      checklist_integrity: { unbacked_row_ids: [] }
    };
    const partI = sectionByTitlePrefix(checklistToSections(data), 'Part I');
    assert.equal(partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0).result, 'FAIL');
  });

  it('a PASS row is never re-labelled, even if its id somehow appears as unbacked', () => {
    const data = {
      checklist_rows: ROWS,
      checklist: { i_1_consignor_exporter: { verdict: 'PASS', observed: 'Saputo Dairy UK' } },
      checklist_integrity: { unbacked_row_ids: ['i_1_consignor_exporter'] }
    };
    const partI = sectionByTitlePrefix(checklistToSections(data), 'Part I');
    assert.equal(partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0).result, 'PASS');
  });

  it('legacy payload with no checklist_integrity renders exactly as before', () => {
    const base = { checklist_rows: ROWS, checklist: { i_1_consignor_exporter: { verdict: 'HARD', observed: 'Missing' } } };
    const withNullField = Object.assign({}, base, { checklist_integrity: null });
    assert.deepEqual(checklistToSections(withNullField), checklistToSections(base));
    const partI = sectionByTitlePrefix(checklistToSections(base), 'Part I');
    assert.equal(partI.checks.find((c) => c.check_name.indexOf('I.1 — ') === 0).result, 'FAIL');
  });

  // ─── Missing Part II enumeration is stated, never implied clean ───────
  // Six of the seven registry types have no <code>-checklist.json, so the
  // skeleton carries no Part II rows and the page silently had no Part II
  // section — indistinguishable from "Part II was enumerated and clean".
  const PART_I_ONLY_ROWS = composeSkeleton('8468').rows;

  it('checklist_type_spec_present false pushes a visible NOTICE section saying Part II was not enumerated', () => {
    const data = {
      checklist_rows: PART_I_ONLY_ROWS,
      checklist: {},
      checklist_type_spec_present: false
    };
    const sections = checklistToSections(data);
    const partII = sections.find((s) => /Part II/.test(s.title));
    assert.ok(partII, 'expected an explicit Part II section; got: ' + JSON.stringify(sections.map((s) => s.title)));
    assert.equal(partII.checks.length, 1);
    assert.equal(partII.checks[0].result, 'NOTICE');
    assert.notEqual(partII.checks[0].result, 'PASS');
    // Must say BOTH things: no clause list here, and Part II was still checked.
    assert.match(partII.checks[0].detail, /not been published|not available|cannot list/i);
    assert.match(partII.checks[0].detail, /still checked|findings above|flags/i);
    // Section numbers stay contiguous.
    assert.deepEqual(sections.map((s) => s.section_number), sections.map((_, i) => i + 1));
  });

  it('checklist_type_spec_present true (or absent) pushes no such section', () => {
    const withSpec = { checklist_rows: ROWS, checklist: cleanFilledChecklist(), checklist_type_spec_present: true };
    assert.ok(!checklistToSections(withSpec).some((s) => /not available|not been published/i.test(s.title)));

    const legacy = { checklist_rows: PART_I_ONLY_ROWS, checklist: {} };
    assert.deepEqual(
      checklistToSections(legacy).map((s) => s.title),
      ['Part I — Field-by-field']
    );
  });

  it('legacy payload without checklist_rows returns [] (untouched fallback path keeps rendering)', () => {
    assert.deepEqual(
      checklistToSections({ sections: [{ section_number: 1, title: 'Checks Performed', checks: [{ check_name: 'x', result: 'PASS', detail: '' }] }] }),
      []
    );
    assert.deepEqual(checklistToSections({}), []);
    assert.deepEqual(checklistToSections(null), []);
    assert.deepEqual(checklistToSections({ checklist_rows: [] }), []);
  });

  it('appends "Checks Performed (summary)" as the final section when sections[0] has checks (fix 2 — Full Report must not cover less than Concise)', () => {
    const modelChecks = [
      { check_name: 'Weight arithmetic', result: 'PASS', detail: 'Sums match.' },
      { check_name: 'EN/FR parity', result: 'WARNING', detail: 'Minor mismatch p.3.' }
    ];
    const data = {
      checklist_rows: ROWS,
      checklist: cleanFilledChecklist(),
      sections: [{ section_number: 1, title: 'Checks Performed', checks: modelChecks }]
    };
    const sections = checklistToSections(data);
    const last = sections[sections.length - 1];
    assert.equal(last.title, 'Checks Performed (summary)');
    assert.equal(last.section_number, sections.length);
    assert.deepEqual(last.checks, modelChecks);
    // The checks are copied through unchanged, not re-derived.
    assert.equal(last.checks[1].result, 'WARNING');
  });

  it('does NOT append a summary section when sections[0].checks is empty, or sections is absent', () => {
    const dataEmptyChecks = {
      checklist_rows: ROWS,
      checklist: cleanFilledChecklist(),
      sections: [{ section_number: 1, title: 'Checks Performed', checks: [] }]
    };
    assert.ok(!checklistToSections(dataEmptyChecks).some((s) => s.title === 'Checks Performed (summary)'));

    const dataNoSections = { checklist_rows: ROWS, checklist: cleanFilledChecklist() };
    assert.ok(!checklistToSections(dataNoSections).some((s) => s.title === 'Checks Performed (summary)'));
  });
});
