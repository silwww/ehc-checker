'use strict';

// Pure-function coverage for validateChecklistAgainstSkeleton — the
// WARN-level (never REPORT_INTEGRITY, Decision D1) reconciliation between
// the model-filled checklist and the deterministic skeleton rows.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { validateChecklistAgainstSkeleton } = require('../../src/skeleton');

const ROWS = [
  { id: 'i_1_consignor_exporter', rowClass: 'verdict', family: 'part_i', label: 'Consignor / Exporter' },
  { id: 'ii_1_country_fmd', rowClass: 'perception', family: 'c6', label: 'Country/FMD', expected: 'RETAIN' },
  { id: 'page_structure', rowClass: 'verdict', family: 'page_structure', label: 'Page structure / count' }
];

describe('validateChecklistAgainstSkeleton', () => {
  it('full coverage, all PASS: no missing, no unknown, no findings', () => {
    const checklist = {
      i_1_consignor_exporter: { verdict: 'PASS', observed: 'Saputo Dairy UK' },
      ii_1_country_fmd: { observed: 'not_struck', confidence: 'high' },
      page_structure: { verdict: 'PASS', observed: '10 of 10' }
    };
    assert.deepEqual(validateChecklistAgainstSkeleton(checklist, ROWS), {
      missingRowIds: [], unknownRowIds: [], findingRowIds: []
    });
  });

  it('reports missing rows (no PASS-by-omission) and unknown ids', () => {
    const checklist = {
      i_1_consignor_exporter: { verdict: 'PASS' },
      invented_row: { verdict: 'PASS' }
    };
    const v = validateChecklistAgainstSkeleton(checklist, ROWS);
    assert.deepEqual(v.missingRowIds, ['ii_1_country_fmd', 'page_structure']);
    assert.deepEqual(v.unknownRowIds, ['invented_row']);
  });

  it('collects HARD/MEDIUM/LOW verdict rows as findingRowIds', () => {
    const checklist = {
      i_1_consignor_exporter: { verdict: 'MEDIUM', observed: 'GREAT BRITAN', note: 'A10 typo' },
      ii_1_country_fmd: { observed: 'struck', confidence: 'high' },
      page_structure: { verdict: 'PASS' }
    };
    const v = validateChecklistAgainstSkeleton(checklist, ROWS);
    assert.deepEqual(v.findingRowIds, ['i_1_consignor_exporter']);
  });

  it('never throws on null / non-object checklist — everything reported missing', () => {
    const v = validateChecklistAgainstSkeleton(null, ROWS);
    assert.equal(v.missingRowIds.length, 3);
    assert.deepEqual(v.unknownRowIds, []);
    assert.deepEqual(v.findingRowIds, []);
  });
});
