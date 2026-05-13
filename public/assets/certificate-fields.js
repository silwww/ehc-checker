// public/assets/certificate-fields.js
// Single source of truth for CERTIFICATE block field selection, ordering,
// composition, and empty-value policy. Used by both generate-pdf.js and
// render-report.js. Output rendering (jsPDF text calls, DOM strings) stays
// in each renderer. Presentation hints (mono, break-all) also stay in the
// renderer — this util emits pure business data.
//
// Loaded via plain <script src="..."> tags. IIFE-on-window pattern to match
// the existing public/assets/ modules.
(function (global) {
  'use strict';

  // Private. Not exported. Called only by selectCertificateRows.
  function formatWeights(info) {
    const hasNet   = info.net_weight_kg   != null && info.net_weight_kg   !== '';
    const hasGross = info.gross_weight_kg != null && info.gross_weight_kg !== '';
    if (hasNet && hasGross) {
      return Number(info.net_weight_kg).toLocaleString() + ' KG (' +
             Number(info.gross_weight_kg).toLocaleString() + ' KG)';
    }
    if (hasNet)   return Number(info.net_weight_kg).toLocaleString() + ' KG';
    if (hasGross) return Number(info.gross_weight_kg).toLocaleString() + ' KG (gross)';
    return '';
  }

  // Returns a flat list of row descriptors in canonical order.
  //
  // Each entry is one of:
  //   { kind: 'row',   label: string, value: string }
  //   { kind: 'gap' }                                 — sub-block separator
  //   { kind: 'trade', label: 'Trade', consignor: string, consignee: string }
  //     — special-cased so the PDF renderer can apply its font-subset
  //       arrow fallback while HTML always renders ' → '.
  //
  // Empty rows are filtered. Trailing gaps are dropped. Leading gaps are
  // never emitted (pushGap only fires after at least one row).
  //
  // Presentation hints (monospace, break-all) live in the renderers, not here.
  function selectCertificateRows(info) {
    info = info || {};
    const rows = [];

    function pushRow(label, value) {
      if (value === undefined || value === null || value === '') return;
      rows.push({ kind: 'row', label: label, value: String(value) });
    }
    function pushGap() {
      if (rows.length > 0 && rows[rows.length - 1].kind !== 'gap') {
        rows.push({ kind: 'gap' });
      }
    }

    // ── Identity ────────────────────────────────────────────────────
    {
      const parts = [];
      if (info.certificate_ref) parts.push(info.certificate_ref);
      if (info.commercial_doc_ref && info.commercial_doc_ref !== 'N/A') {
        parts.push('PO ' + info.commercial_doc_ref);
      }
      if (info.certificate_type) parts.push('Type ' + info.certificate_type);
      if (info.pages)            parts.push('Pages ' + info.pages);
      if (parts.length) pushRow('Reference', parts.join(' · '));
    }
    {
      const parts = [];
      if (info.ov_name)      parts.push(info.ov_name);
      if (info.sp_reference) parts.push(info.sp_reference);
      if (info.rcvs_number)  parts.push('RCVS ' + info.rcvs_number);
      if (parts.length) pushRow('OV', parts.join(' · '));
    }
    {
      const parts = [];
      if (info.bcp_name)     parts.push(info.bcp_name);
      if (info.signing_date) parts.push('Signing date ' + info.signing_date);
      if (parts.length) pushRow('BCP', parts.join(' · '));
    }
    if (info.filename)        pushRow('Filename', info.filename);
    if (info.second_language) pushRow('Language', info.second_language);

    pushGap();

    // ── Trade ───────────────────────────────────────────────────────
    if (info.consignor || info.consignee) {
      rows.push({
        kind: 'trade',
        label: 'Trade',
        consignor: info.consignor || 'N/A',
        consignee: info.consignee || 'N/A'
      });
    }
    if (info.dispatch_establishment) pushRow('Dispatch', info.dispatch_establishment);
    if (info.destination)            pushRow('Destination', info.destination);
    if (info.i6_operator)            pushRow('I.6 Operator', info.i6_operator);
    if (info.loading)                pushRow('Loading', info.loading);
    {
      const parts = [];
      if (info.commodity) parts.push(info.commodity);
      const weights = formatWeights(info);
      if (weights) parts.push(weights);
      if (info.packages) parts.push(info.packages);
      if (parts.length) pushRow('Commodity', parts.join(' · '));
    }
    if (info.hs_code)        pushRow('HS Code', info.hs_code);
    if (info.departure_date) pushRow('Departure', info.departure_date);

    pushGap();

    // ── Transport ───────────────────────────────────────────────────
    {
      const parts = [];
      if (info.vehicle_id) parts.push(info.vehicle_id);
      if (info.trailer)    parts.push('Trailer ' + info.trailer);
      if (parts.length) pushRow('Tractor', parts.join(' · '));
    }
    if (info.seal) pushRow('Seal', info.seal);

    while (rows.length > 0 && rows[rows.length - 1].kind === 'gap') rows.pop();
    return rows;
  }

  global.EHCCertificateFields = {
    selectCertificateRows: selectCertificateRows
  };
})(window);
