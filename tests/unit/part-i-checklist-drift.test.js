'use strict';

// Drift guard for rules/_core/part-i-checklist.json against the PART B
// "B1. Field Rules" tables in rules/_core/rule_set.md.
//
// The JSON is a content-preserving extraction of those tables, and its
// `rule` strings are printed to the Official Veterinarian in the Full
// Report as THE rule the field was judged against. When rule_set.md moves
// and the extraction does not, the OV is shown stale veterinary rules as
// authoritative — which is how four rows sat on v4.1 text (I.1 UK-address,
// I.12 EU/XI/CH-address, I.13 Felixstowe, I.22 Switzerland/E71) after
// rule_set.md reached v4.5. This test turns that drift into a test failure.
//
// The B1 cell is matched by the row's `field + ' ' + label`, which is
// exactly the first column of the B1 tables. Equality — not "contains" —
// is asserted, because a TRUNCATED extraction (I.22 kept its first
// sentence and dropped the E71 sentence) still appears verbatim inside
// rule_set.md while being materially wrong.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const RULE_SET_PATH = path.join(__dirname, '../../rules/_core/rule_set.md');
const SPEC_PATH = path.join(__dirname, '../../rules/_core/part-i-checklist.json');

const ruleSetMd = fs.readFileSync(RULE_SET_PATH, 'utf8');
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));

// Field -> rule text, read from the two-column rows of every "## B1." table
// (the by-certificate-type sub-tables live under the same headings and are
// keyed by their own first column, so they never collide with a field key).
function parseB1Cells(md) {
  const cells = new Map();
  let inB1 = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) inB1 = line.startsWith('## B1.');
    if (!inB1) continue;
    const m = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!m || m[1].startsWith('**')) continue;
    cells.set(m[1], m[2]);
  }
  return cells;
}

describe('part-i-checklist.json ↔ rule_set.md B1 tables', () => {
  it('every partIFields[].rule appears verbatim inside rule_set.md', () => {
    for (const entry of spec.partIFields) {
      assert.ok(
        ruleSetMd.includes(entry.rule),
        `part-i-checklist.json row ${entry.field} "${entry.label}" carries rule text that is NOT in ` +
          `rules/_core/rule_set.md — re-extract that row VERBATIM from its B1 table cell. Stale text: ${JSON.stringify(entry.rule)}`
      );
    }
  });

  it('every partIFields[].rule is byte-identical to its B1 table cell (catches truncated extractions)', () => {
    const cells = parseB1Cells(ruleSetMd);
    for (const entry of spec.partIFields) {
      const key = entry.field + ' ' + entry.label;
      assert.ok(
        cells.has(key),
        `part-i-checklist.json row ${entry.field} "${entry.label}" has no matching B1 table row ` +
          `("${key}") in rules/_core/rule_set.md — the field/label pair must match the B1 first column exactly.`
      );
      assert.equal(
        entry.rule,
        cells.get(key),
        `part-i-checklist.json row ${entry.field} "${entry.label}" has drifted from its B1 table cell — ` +
          're-extract that row VERBATIM from rules/_core/rule_set.md (copy, never paraphrase).'
      );
    }
  });

  it('ruleSetVersion matches the version rule_set.md declares in its own frontmatter', () => {
    const fm = ruleSetMd.match(/^---\n[\s\S]*?\nversion:\s*([^\n]+)\n/);
    assert.ok(fm, 'rules/_core/rule_set.md must declare a version in its frontmatter');
    assert.equal(
      spec.ruleSetVersion,
      fm[1].trim(),
      'part-i-checklist.json ruleSetVersion is stale relative to rules/_core/rule_set.md — ' +
        're-extract the B1 rows and bump it in the same commit.'
    );
  });
});
