'use strict';

// Deterministic unit coverage for the fixed-checklist skeleton composer
// (src/skeleton.js), recovered from refactor/single-call-skeleton and
// extended with render metadata (rule / expected / notes per row) so the
// client can render the Full Report deterministically from checklist_rows.
//
// Row-count expectations are pinned to the specs on disk:
//   rules/_core/part-i-checklist.json          -> 24 partIFields rows
//   rules/dairy-uk-eu/types/8322-checklist.json -> 18 partIIClauses + 4 blank-field rows
// plus the always-present synthetic page_structure row.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { composeSkeleton } = require('../../src/skeleton');

describe('composeSkeleton', () => {
  it('8322: composes 24 Part I + 18 C6 + 4 C10 + 1 page_structure = 47 rows, schema requires every id', () => {
    const { rows, checklistSchema } = composeSkeleton('8322');
    assert.equal(rows.length, 47);
    assert.equal(rows.filter(r => r.family === 'part_i').length, 24);
    assert.equal(rows.filter(r => r.family === 'c6').length, 18);
    assert.equal(rows.filter(r => r.family === 'c10').length, 4);
    assert.equal(rows.filter(r => r.family === 'page_structure').length, 1);
    assert.equal(rows[rows.length - 1].id, 'page_structure');

    assert.equal(checklistSchema.type, 'object');
    assert.equal(checklistSchema.required.length, 47);
    assert.deepEqual(checklistSchema.required, rows.map(r => r.id));
    for (const row of rows) {
      assert.ok(checklistSchema.properties[row.id], `schema missing property for row ${row.id}`);
    }
  });

  it('8322: row ids are stable, deterministic slugs (spot checks)', () => {
    const { rows } = composeSkeleton('8322');
    const ids = rows.map(r => r.id);
    assert.equal(ids[0], 'i_1_consignor_exporter');
    assert.ok(ids.includes('ii_1_country_fmd'), 'first C6 clause slug');
    assert.ok(ids.some(id => id.startsWith('c10_')), 'C10 rows carry the c10_ prefix');
  });

  it('two calls produce deep-equal output (deterministic composition)', () => {
    assert.deepEqual(composeSkeleton('8322'), composeSkeleton('8322'));
  });

  it('8468 (no type spec on disk yet): graceful — Part I + page_structure only (25 rows)', () => {
    const { rows } = composeSkeleton('8468');
    assert.equal(rows.length, 25);
    assert.equal(rows.filter(r => r.family === 'c6').length, 0);
    assert.equal(rows.filter(r => r.family === 'c10').length, 0);
  });

  it('unknown certificate type throws (fail-loud)', () => {
    assert.throws(() => composeSkeleton('9999'), /unknown certificate type/);
  });

  it('rows carry the render metadata the Full Report needs', () => {
    const { rows } = composeSkeleton('8322');
    const i1 = rows.find(r => r.id === 'i_1_consignor_exporter');
    assert.equal(i1.rowClass, 'verdict');
    assert.equal(i1.fieldRef, 'I.1');
    assert.match(i1.rule, /Must be populated/);

    const c6 = rows.find(r => r.id === 'ii_1_country_fmd');
    assert.equal(c6.rowClass, 'perception');
    assert.equal(c6.clauseRef, 'II.1');
    assert.equal(c6.expected, 'RETAIN');

    const c10 = rows.find(r => r.family === 'c10');
    assert.equal(c10.rowClass, 'perception');
    assert.ok(typeof c10.expectedEntry === 'string' && c10.expectedEntry.length > 0);
  });

  it('perception rows never carry a verdict property in the schema; verdict rows always do', () => {
    const { rows, checklistSchema } = composeSkeleton('8322');
    for (const row of rows) {
      const props = checklistSchema.properties[row.id].properties;
      if (row.rowClass === 'verdict') {
        assert.ok(props.verdict, `verdict row ${row.id} missing verdict property`);
        assert.deepEqual(props.verdict.enum, ['PASS', 'HARD', 'MEDIUM', 'LOW', 'NA']);
      } else {
        assert.equal(props.verdict, undefined, `perception row ${row.id} must not judge`);
        assert.ok(props.observed.enum, `perception row ${row.id} needs an observed enum`);
      }
    }
  });
});
