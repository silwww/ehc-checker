'use strict';

// Unit tests for public/assets/certificate-fields.js (Phase 8 obs #34 util).
//
// The file under test is a browser-side IIFE that assigns to
// global.EHCCertificateFields. We alias `window` to `global` before loading
// so the IIFE finds its target in Node.
//
// Note on weight formatting: formatWeights() in certificate-fields.js uses
// Number#toLocaleString() with the default Node ICU locale, which on macOS /
// most Linux dev machines is en-US / en-GB and produces comma-thousands
// (e.g. "23,000"). If a future CI machine uses a non-comma locale, the
// three weight tests below will need a fixed locale via Intl.NumberFormat.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
require('../../public/assets/certificate-fields.js');
const { selectCertificateRows } = global.EHCCertificateFields;

describe('selectCertificateRows', () => {

  it('returns empty array for undefined input', () => {
    assert.deepEqual(selectCertificateRows(undefined), []);
  });

  it('returns empty array for null input', () => {
    assert.deepEqual(selectCertificateRows(null), []);
  });

  it('returns empty array for empty object', () => {
    assert.deepEqual(selectCertificateRows({}), []);
  });

  it('renders identity-only input with no leading or trailing gap', () => {
    const rows = selectCertificateRows({
      certificate_ref: '26/2/126149',
      certificate_type: '8468'
    });
    assert.ok(rows.length > 0, 'expected at least one row');
    assert.notEqual(rows[0].kind, 'gap', 'no leading gap');
    assert.notEqual(rows[rows.length - 1].kind, 'gap', 'no trailing gap');
  });

  it('emits trade row with N/A consignee when only consignor present', () => {
    const rows = selectCertificateRows({ consignor: 'Saputo Davidstow' });
    const trade = rows.find(r => r.kind === 'trade');
    assert.ok(trade, 'expected a trade row');
    assert.equal(trade.consignor, 'Saputo Davidstow');
    assert.equal(trade.consignee, 'N/A');
  });

  it('emits trade row with N/A consignor when only consignee present', () => {
    const rows = selectCertificateRows({ consignee: 'Farmel Dairy Products BV' });
    const trade = rows.find(r => r.kind === 'trade');
    assert.ok(trade);
    assert.equal(trade.consignor, 'N/A');
    assert.equal(trade.consignee, 'Farmel Dairy Products BV');
  });

  it('does not emit trade row when consignor and consignee both absent', () => {
    const rows = selectCertificateRows({
      certificate_ref: '26/2/126149',
      dispatch_establishment: 'Some Dairy Plant'
    });
    assert.equal(rows.find(r => r.kind === 'trade'), undefined);
  });

  it('emits transport-only input with no leading gap', () => {
    const rows = selectCertificateRows({ seal: 'SEAL12345' });
    assert.ok(rows.length > 0);
    assert.notEqual(rows[0].kind, 'gap');
  });

  it('places gaps between groups, never as first or last row', () => {
    const rows = selectCertificateRows({
      certificate_ref: '26/2/126149',
      consignor: 'Saputo Davidstow',
      seal: 'SEAL12345'
    });
    assert.notEqual(rows[0].kind, 'gap');
    assert.notEqual(rows[rows.length - 1].kind, 'gap');
    const gapCount = rows.filter(r => r.kind === 'gap').length;
    assert.equal(gapCount, 2, 'expected exactly two gaps between three populated groups');
  });

  it('drops PO part when commercial_doc_ref is literal N/A', () => {
    const rows = selectCertificateRows({
      certificate_ref: '26/2/126149',
      commercial_doc_ref: 'N/A'
    });
    const ref = rows.find(r => r.kind === 'row' && r.label === 'Reference');
    assert.ok(ref);
    assert.equal(ref.value, '26/2/126149');
    assert.equal(ref.value.includes('PO'), false);
  });

  it('keeps and PO-prefixes a real commercial_doc_ref', () => {
    const rows = selectCertificateRows({
      certificate_ref: '26/2/126149',
      commercial_doc_ref: '7904187'
    });
    const ref = rows.find(r => r.kind === 'row' && r.label === 'Reference');
    assert.ok(ref);
    assert.equal(ref.value, '26/2/126149 · PO 7904187');
  });

  const weightCases = [
    {
      name: 'net and gross both present',
      input: { commodity: 'Pork', net_weight_kg: 23000, gross_weight_kg: 23500 },
      expected: 'Pork · 23,000 KG (23,500 KG)'
    },
    {
      name: 'net only',
      input: { commodity: 'Pork', net_weight_kg: 23000 },
      expected: 'Pork · 23,000 KG'
    },
    {
      name: 'gross only',
      input: { commodity: 'Pork', gross_weight_kg: 23500 },
      expected: 'Pork · 23,500 KG (gross)'
    }
  ];

  for (const { name, input, expected } of weightCases) {
    it(`formats weights when ${name}`, () => {
      const rows = selectCertificateRows(input);
      const commodity = rows.find(r => r.kind === 'row' && r.label === 'Commodity');
      assert.ok(commodity, `expected a Commodity row for case "${name}"`);
      assert.equal(commodity.value, expected);
    });
  }

  it('omits weights and trailing separator when neither net nor gross present', () => {
    const rowsA = selectCertificateRows({ commodity: 'Sweet Whey Powder' });
    const commodityA = rowsA.find(r => r.kind === 'row' && r.label === 'Commodity');
    assert.ok(commodityA);
    assert.equal(commodityA.value, 'Sweet Whey Powder');

    const rowsB = selectCertificateRows({
      commodity: 'Sweet Whey Powder',
      packages: '550 bags'
    });
    const commodityB = rowsB.find(r => r.kind === 'row' && r.label === 'Commodity');
    assert.ok(commodityB);
    assert.equal(commodityB.value, 'Sweet Whey Powder · 550 bags');
    assert.equal(commodityB.value.includes('KG'), false);
  });

  it('skips fields where value is undefined, null, or empty string', () => {
    const rows = selectCertificateRows({
      certificate_ref: '26/2/126149',
      ov_name: undefined,
      sp_reference: null,
      rcvs_number: '',
      bcp_name: 'Calais BCP'
    });
    const ref = rows.find(r => r.kind === 'row' && r.label === 'Reference');
    assert.ok(ref);
    assert.equal(ref.value, '26/2/126149');
    assert.equal(rows.find(r => r.kind === 'row' && r.label === 'OV'), undefined);
    const bcp = rows.find(r => r.kind === 'row' && r.label === 'BCP');
    assert.ok(bcp);
    assert.equal(bcp.value, 'Calais BCP');
  });

  it('trade row contract is exactly { kind, label, consignor, consignee }', () => {
    const rows = selectCertificateRows({
      consignor: 'Saputo Davidstow Ltd',
      consignee: 'Farmel Dairy Products BV'
    });
    const trade = rows.find(r => r.kind === 'trade');
    assert.deepEqual(trade, {
      kind: 'trade',
      label: 'Trade',
      consignor: 'Saputo Davidstow Ltd',
      consignee: 'Farmel Dairy Products BV'
    });
  });

});
