'use strict';

// Archive listing runs against the REAL rules/ tree — the repo ships
// 15+ archived master versions, so the test asserts real content.

const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { listRuleVersions, resolveVersionFile } = require('../../server/rule-versions');

const RULES = path.join(__dirname, '../../rules');

describe('listRuleVersions', () => {
  it('finds the dairy archive with v4_6 present, sizes > 0', () => {
    const all = listRuleVersions(RULES);
    const dairy = all.filter((v) => v.commodity === 'dairy-uk-eu');
    assert.ok(dairy.length >= 10);
    assert.ok(dairy.some((v) => v.filename.includes('v4_6')));
    for (const v of dairy) assert.ok(v.size > 0);
  });
  it('sorts by extracted version number descending — notes sit with their version, not above everything', () => {
    const dairy = listRuleVersions(RULES).filter((v) => v.commodity === 'dairy-uk-eu');
    const rawIdx = (needle) => dairy.findIndex((v) => v.filename.includes(needle));

    // findIndex gives -1 for a missing file and -1 < n is true, so a version

    // silently dropped from the scan used to satisfy every ordering assertion.

    const idx = (needle) => {

      const i = rawIdx(needle);

      assert.ok(i >= 0, `${needle} must be present in the listing`);

      return i;

    };
    assert.ok(idx('RULE_SET_v4_6') < idx('v4_5_1'), 'v4.6 before v4.5.1');
    assert.ok(idx('v4_5_1') < idx('v4_1'), 'v4.5.1 before v4.1');
    assert.ok(idx('v3_9') < idx('v3_5'), 'v3.9 before v3.5');
    assert.ok(idx('v2_7') < idx('v1_8'), 'v2.7 before v1.8');
    // The v4.5 sync note carries version 4.5 — it must NOT outrank v4.6.
    assert.ok(idx('RULE_SET_v4_6') < idx('Note_for_Silvia_v4.5'), 'note sorts by its own version');
  });
  it('each entry carries the git added date (YYYY-MM-DD) when git history is available', () => {
    const dairy = listRuleVersions(RULES).filter((v) => v.commodity === 'dairy-uk-eu');
    const v46 = dairy.find((v) => v.filename === 'EHC_Checker_RULE_SET_v4_6.docx');
    assert.match(String(v46.date), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('resolveVersionFile', () => {
  it('resolves a real archived file', () => {
    const p = resolveVersionFile(RULES, 'dairy-uk-eu', 'EHC_Checker_RULE_SET_v4_6.docx');
    assert.ok(p && p.endsWith(path.join('source', 'EHC_Checker_RULE_SET_v4_6.docx')));
  });
  it('rejects traversal and unknown files', () => {
    assert.equal(resolveVersionFile(RULES, '..', 'x'), null);
    assert.equal(resolveVersionFile(RULES, 'dairy-uk-eu', '../../.env'), null);
    assert.equal(resolveVersionFile(RULES, 'dairy-uk-eu', 'nope.docx'), null);
  });
});
