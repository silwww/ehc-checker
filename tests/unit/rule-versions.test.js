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
  it('sorts newest-looking filenames first within a commodity', () => {
    const dairy = listRuleVersions(RULES).filter((v) => v.commodity === 'dairy-uk-eu');
    assert.ok(dairy.findIndex((v) => v.filename.includes('v4_6')) <
              dairy.findIndex((v) => v.filename.includes('v2_7')));
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
