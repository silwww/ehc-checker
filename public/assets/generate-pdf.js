// Native vector PDF generator for EHC Checker. Shared between the Training
// Report (index.html) and the Full Audit Report (audit.html). Emits real
// jsPDF text (not a rasterised screenshot), so output is searchable, sharp at
// any zoom, and small (typical 50–200 KB).
//
// Public API:
//   window.EHCGeneratePDF.generate(reportData, mode)
//     reportData: the JSON object returned by submit_check_report
//     mode: 'training' or 'full' — controls Detailed Checks inclusion and
//           the footer label
(function (global) {
  'use strict';

  // ─── Layout constants (millimetres) ──────────────────────────────────────
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_L = 15;
  const MARGIN_R = 15;
  const MARGIN_T = 15;
  const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // 180
  const BODY_BOTTOM = 262; // body cursor must not pass this — footer lives below
  const FOOTER_RULE_Y = 280;
  const FOOTER_LINE_1_Y = 282;
  const FOOTER_LINE_2_Y = 286;

  // ─── Colour palette (print-aware, deep tones) ────────────────────────────
  const COLOR = {
    hard:       [185, 28, 28],   // #B91C1C
    medium:     [180, 83, 9],    // #B45309
    low:        [29, 78, 216],   // #1D4ED8
    pass:       [21, 128, 61],   // #15803D
    teal:       [15, 118, 110],  // #0F766E
    tealDark:   [11, 88, 82],    // header bar verdict pill
    body:       [17, 24, 39],    // #111827
    secondary:  [75, 85, 99],    // #4B5563
    rule:       [209, 213, 219], // #D1D5DB
    white:      [255, 255, 255]
  };

  // 3pt → mm. jsPDF lineWidth is in current unit (mm here).
  const PT_TO_MM = 25.4 / 72;
  const STRIPE_W_MM = 3 * PT_TO_MM;

  // ─── jsPDF helpers ───────────────────────────────────────────────────────
  function setText(pdf, rgb)   { pdf.setTextColor(rgb[0], rgb[1], rgb[2]); }
  function setFill(pdf, rgb)   { pdf.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setDraw(pdf, rgb)   { pdf.setDrawColor(rgb[0], rgb[1], rgb[2]); }

  // Approx visual line height in mm for a font size in points, at jsPDF's
  // default line-height factor of 1.15.
  function lineMm(fontSize) {
    return fontSize * PT_TO_MM * 1.15;
  }

  // Render text with top-baseline so y is the top of the visible glyph row.
  // Easier to reason about than the default (alphabetic baseline at y).
  function writeText(pdf, text, x, y, options) {
    pdf.text(text, x, y, Object.assign({ baseline: 'top' }, options || {}));
  }

  // Make sure there is `needed` mm of vertical room before the body bottom.
  // If not, advance to a new page and reset cursor to the top margin.
  function ensureSpace(ctx, needed) {
    if (ctx.y + needed > BODY_BOTTOM) {
      ctx.pdf.addPage();
      ctx.y = MARGIN_T;
    }
  }

  // ─── Severity helpers ────────────────────────────────────────────────────
  function severityColor(severity) {
    if (severity === 'hard')   return COLOR.hard;
    if (severity === 'medium') return COLOR.medium;
    if (severity === 'low')    return COLOR.low;
    return COLOR.secondary;
  }

  function severityLabel(severity) {
    return (severity || 'NOTE').toUpperCase();
  }

  // Active flag = not retracted. final_conclusion takes precedence; legacy
  // payloads without that field default to confirmed/active.
  function isActiveFlag(flag) {
    if (!flag) return false;
    if (flag.final_conclusion === 'retracted') return false;
    if (flag.retracted === true) return false;
    return true;
  }

  // ─── Top-level generator ─────────────────────────────────────────────────
  function generate(reportData, mode) {
    const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFCtor) throw new Error('jsPDF library not loaded');
    if (!reportData) throw new Error('No report data');

    const pdf = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setLineHeightFactor(1.15);

    const ctx = {
      pdf,
      mode: mode === 'full' ? 'full' : 'training',
      data: reportData,
      info: reportData.certificate_info || {},
      y: MARGIN_T
    };

    // Page 1: header bar, certificate sub-line, counters, certificate block,
    // findings.
    renderHeaderBar(ctx);
    renderCertificateSubline(ctx);
    renderCounters(ctx);
    renderCertificateBlock(ctx);
    renderFindings(ctx);

    // Always start the full identification on a fresh page.
    pdf.addPage();
    ctx.y = MARGIN_T;
    renderFullIdentification(ctx);

    // Detailed checks (full mode only). Same page if room, else a new page is
    // taken inside the renderer.
    if (ctx.mode === 'full' && Array.isArray(reportData.sections) && reportData.sections.length > 0) {
      renderDetailedChecks(ctx);
    }

    // Recommendations (always, if non-empty).
    const rec = reportData.rule_set_update_recommendations;
    if (rec && String(rec).trim()) {
      renderRecommendations(ctx, rec);
    }

    // Footer on every page after layout is final, so Page X of Y is correct.
    renderAllFooters(ctx);

    pdf.save(buildFilename(ctx));
  }

  // ─── Page 1 — Header bar ─────────────────────────────────────────────────
  function renderHeaderBar(ctx) {
    const { pdf } = ctx;
    const verdict = (ctx.data.overall_verdict || '—').toUpperCase();

    // Teal header bar across the full page width, 10mm tall.
    setFill(pdf, COLOR.teal);
    pdf.rect(0, 0, PAGE_W, 10, 'F');

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    setText(pdf, COLOR.white);
    writeText(pdf, 'EHC CHECK REPORT', MARGIN_L, 2.6);

    // Verdict pill (right-aligned)
    pdf.setFontSize(11);
    const pillText = verdict === 'PASS' ? 'PASS' : (verdict === 'HOLD' ? 'HOLD' : verdict);
    const pillTextWidth = pdf.getTextWidth(pillText);
    const pillW = pillTextWidth + 6;
    const pillH = 6;
    const pillX = PAGE_W - MARGIN_R - pillW;
    const pillY = 2;

    setFill(pdf, COLOR.tealDark);
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(pillX, pillY, pillW, pillH, 1.2, 1.2, 'F');
    } else {
      pdf.rect(pillX, pillY, pillW, pillH, 'F');
    }
    setText(pdf, COLOR.white);
    writeText(pdf, pillText, pillX + 3, pillY + 1.4);

    ctx.y = 13; // 10mm bar + 3mm gap
  }

  // ─── Page 1 — "Certificate {ref} · {type}" sub-line ──────────────────────
  function renderCertificateSubline(ctx) {
    const { pdf, info } = ctx;
    const ref = info.certificate_ref || 'N/A';
    const type = info.certificate_type ? ('EHC ' + info.certificate_type) : 'EHC unknown';
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(pdf, COLOR.body);
    writeText(pdf, 'Certificate ' + ref + '  ·  ' + type, MARGIN_L, ctx.y);
    ctx.y += lineMm(9) + 2;
  }

  // ─── Page 1 — Counters row ───────────────────────────────────────────────
  function renderCounters(ctx) {
    const { pdf } = ctx;
    const c = ctx.data.counters || { hard_errors: 0, medium_warnings: 0, low_notices: 0 };

    pdf.setFontSize(9);
    let x = MARGIN_L;
    const items = [
      { n: c.hard_errors || 0,    label: 'Hard',   color: COLOR.hard },
      { n: c.medium_warnings || 0, label: 'Medium', color: COLOR.medium },
      { n: c.low_notices || 0,    label: 'Low',    color: COLOR.low }
    ];

    for (const item of items) {
      pdf.setFont('helvetica', 'bold');
      setText(pdf, item.color);
      writeText(pdf, String(item.n), x, ctx.y);
      const numW = pdf.getTextWidth(String(item.n));
      pdf.setFont('helvetica', 'normal');
      setText(pdf, COLOR.body);
      writeText(pdf, ' ' + item.label, x + numW, ctx.y);
      x += numW + pdf.getTextWidth(' ' + item.label) + 8; // 8mm gap to next group
    }

    ctx.y += lineMm(9) + 1.5;

    // Faint divider line
    setDraw(pdf, COLOR.rule);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_L, ctx.y, PAGE_W - MARGIN_R, ctx.y);
    ctx.y += 4;
  }

  // ─── Page 1 — CERTIFICATE compact block ──────────────────────────────────
  function renderCertificateBlock(ctx) {
    const { pdf, info } = ctx;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setText(pdf, COLOR.secondary);
    writeText(pdf, 'CERTIFICATE', MARGIN_L, ctx.y);
    ctx.y += lineMm(9) + 1.2;

    // Build the three sub-blocks from optional fields. Lines that would be
    // entirely empty are omitted.
    const identityLines = [];
    {
      const parts = [];
      if (info.certificate_ref)  parts.push('Ref: ' + info.certificate_ref);
      if (info.certificate_type) parts.push('Type: ' + info.certificate_type);
      if (info.pages)            parts.push('Pages: ' + info.pages);
      if (parts.length) identityLines.push(parts.join(' · '));
    }
    {
      const parts = [];
      if (info.ov_name)      parts.push('OV: ' + info.ov_name);
      if (info.sp_reference) parts.push(info.sp_reference);
      if (info.rcvs_number)  parts.push('RCVS ' + info.rcvs_number);
      if (parts.length) identityLines.push(parts.join(' · '));
    }
    {
      const parts = [];
      if (info.bcp_name)     parts.push('BCP: ' + info.bcp_name);
      if (info.signing_date) parts.push('Signing date: ' + info.signing_date);
      if (parts.length) identityLines.push(parts.join(' · '));
    }

    const tradeLines = [];
    if (info.consignor || info.consignee) {
      tradeLines.push('I.1 → I.5: ' + (info.consignor || 'N/A') + ' → ' + (info.consignee || 'N/A'));
    }
    if (info.dispatch_establishment) tradeLines.push('I.11: ' + info.dispatch_establishment);
    if (info.destination)            tradeLines.push('I.12: ' + info.destination);
    {
      const parts = [];
      if (info.commodity) parts.push('Commodity: ' + info.commodity);
      const weights = formatWeights(info);
      if (weights) parts.push(weights);
      if (info.packages) parts.push(info.packages);
      if (parts.length) tradeLines.push(parts.join(' · '));
    }

    const transportLines = [];
    {
      const parts = [];
      if (info.vehicle_id) parts.push('Tractor: ' + info.vehicle_id);
      if (info.trailer)    parts.push('Trailer: ' + info.trailer);
      if (parts.length) transportLines.push(parts.join(' · '));
    }
    if (info.seal) transportLines.push('Seal: ' + info.seal);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(pdf, COLOR.body);

    const groups = [identityLines, tradeLines, transportLines].filter(g => g.length > 0);
    for (let i = 0; i < groups.length; i++) {
      for (const line of groups[i]) {
        const wrapped = pdf.splitTextToSize(line, CONTENT_W);
        for (const w of wrapped) {
          ensureSpace(ctx, lineMm(9));
          writeText(pdf, w, MARGIN_L, ctx.y);
          ctx.y += lineMm(9);
        }
      }
      // Blank line between groups (but not after the last)
      if (i < groups.length - 1) ctx.y += lineMm(9) * 0.5;
    }

    ctx.y += 4;
  }

  // "23,000 KG (23,500 KG)" if both, "23,000 KG" if only net, "" otherwise.
  function formatWeights(info) {
    const hasNet = info.net_weight_kg != null && info.net_weight_kg !== '';
    const hasGross = info.gross_weight_kg != null && info.gross_weight_kg !== '';
    if (hasNet && hasGross) {
      return Number(info.net_weight_kg).toLocaleString() + ' KG (' +
             Number(info.gross_weight_kg).toLocaleString() + ' KG)';
    }
    if (hasNet)   return Number(info.net_weight_kg).toLocaleString() + ' KG';
    if (hasGross) return Number(info.gross_weight_kg).toLocaleString() + ' KG (gross)';
    return '';
  }

  // ─── Page 1 — FINDINGS cards ─────────────────────────────────────────────
  function renderFindings(ctx) {
    const { pdf } = ctx;
    const flags = Array.isArray(ctx.data.flags) ? ctx.data.flags : [];
    const active = flags.filter(isActiveFlag);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(pdf, COLOR.body);
    ensureSpace(ctx, lineMm(11) + 4);
    writeText(pdf, 'FINDINGS (' + active.length + ' active flag' + (active.length === 1 ? '' : 's') + ')', MARGIN_L, ctx.y);
    ctx.y += lineMm(11) + 2;

    if (active.length === 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setText(pdf, COLOR.pass);
      writeText(pdf, 'No active flags raised — the certificate passed all checks.', MARGIN_L, ctx.y);
      ctx.y += lineMm(9) + 4;
      return;
    }

    for (const flag of active) {
      renderFlagCard(ctx, flag);
      ctx.y += 3; // gap between cards
    }
    ctx.y += 1;
  }

  function renderFlagCard(ctx, flag) {
    const { pdf } = ctx;
    const cardX = MARGIN_L;
    const stripeX = cardX;
    const innerX = cardX + STRIPE_W_MM + 3; // 3mm padding after stripe
    const innerW = CONTENT_W - (STRIPE_W_MM + 3);

    const sevColor = severityColor(flag.severity);
    const sevLabel = severityLabel(flag.severity);

    // Pre-compute sizes so we can draw the stripe at the right height.
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    const titleText = flag.title || '';
    // Title sits to the right of the badge, on its own wrap area.
    const badgeText = sevLabel;
    pdf.setFontSize(7.5);
    const badgeW = pdf.getTextWidth(badgeText) + 3;
    const badgeH = 4.2;

    pdf.setFontSize(9.5);
    const titleAvailW = innerW - badgeW - 2;
    const titleLines = pdf.splitTextToSize(titleText, titleAvailW);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const fieldRefText = flag.field_reference || '';
    const fieldRefLines = fieldRefText
      ? pdf.splitTextToSize(fieldRefText, innerW)
      : [];

    pdf.setFontSize(9);
    const descText = flag.description || '';
    const descLines = descText
      ? pdf.splitTextToSize(descText, innerW)
      : [];

    const padTop = 2;
    const padBottom = 2;
    const titleH = Math.max(badgeH, titleLines.length * lineMm(9.5));
    const fieldRefH = fieldRefLines.length ? (1 + fieldRefLines.length * lineMm(8)) : 0;
    const descH = descLines.length ? (2 + descLines.length * lineMm(9)) : 0;
    const cardH = padTop + titleH + fieldRefH + descH + padBottom;

    // Page break if the whole card doesn't fit. Cards never split mid-card.
    ensureSpace(ctx, cardH);

    // Severity stripe (filled rect, 3pt wide).
    setFill(pdf, sevColor);
    pdf.rect(stripeX, ctx.y, STRIPE_W_MM, cardH, 'F');

    let lineY = ctx.y + padTop;

    // Severity badge (filled small rect).
    setFill(pdf, sevColor);
    pdf.rect(innerX, lineY, badgeW, badgeH, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    setText(pdf, COLOR.white);
    writeText(pdf, badgeText, innerX + 1.5, lineY + 0.7);

    // Title text, beside the badge.
    pdf.setFontSize(9.5);
    setText(pdf, COLOR.body);
    let titleY = lineY;
    for (const t of titleLines) {
      writeText(pdf, t, innerX + badgeW + 2, titleY);
      titleY += lineMm(9.5);
    }
    lineY += titleH;

    // Field reference (secondary).
    if (fieldRefLines.length) {
      lineY += 1;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setText(pdf, COLOR.secondary);
      for (const t of fieldRefLines) {
        writeText(pdf, t, innerX, lineY);
        lineY += lineMm(8);
      }
    }

    // Description (body).
    if (descLines.length) {
      lineY += 2;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setText(pdf, COLOR.body);
      for (const t of descLines) {
        writeText(pdf, t, innerX, lineY);
        lineY += lineMm(9);
      }
    }

    ctx.y += cardH;
  }

  // ─── Page 2+ — FULL CERTIFICATE IDENTIFICATION (3 columns) ──────────────
  function renderFullIdentification(ctx) {
    const { pdf, info } = ctx;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(pdf, COLOR.body);
    ensureSpace(ctx, lineMm(11) + 4);
    writeText(pdf, 'FULL CERTIFICATE IDENTIFICATION', MARGIN_L, ctx.y);
    ctx.y += lineMm(11) + 3;

    const colW = 58;
    const gap = (CONTENT_W - colW * 3) / 2; // 3mm
    const col1X = MARGIN_L;
    const col2X = MARGIN_L + colW + gap;
    const col3X = MARGIN_L + 2 * (colW + gap);

    // Column data builders — only push rows whose value is present.
    function pushRow(rows, label, value) {
      if (value === undefined || value === null || value === '') return;
      rows.push({ label: label, value: String(value) });
    }

    const col1 = [];
    pushRow(col1, 'Ref',           info.certificate_ref);
    pushRow(col1, 'Type',          info.certificate_type ? ('EHC ' + info.certificate_type) : '');
    pushRow(col1, 'Pages',         info.pages);
    pushRow(col1, 'OV',            info.ov_name);
    pushRow(col1, 'SP',            info.sp_reference);
    pushRow(col1, 'RCVS',          info.rcvs_number);
    pushRow(col1, 'BCP',           info.bcp_name);
    pushRow(col1, 'BCP Country',   info.bcp_country);
    pushRow(col1, '2nd language',  info.second_language);
    pushRow(col1, 'Filename',      info.filename);

    const col2 = [];
    pushRow(col2, 'I.1 Consignor',   info.consignor);
    pushRow(col2, 'I.5 Consignee',   info.consignee);
    pushRow(col2, 'I.6 Operator',    info.i6_operator);
    pushRow(col2, 'I.11 Dispatch',   info.dispatch_establishment);
    pushRow(col2, 'I.12 Destination', info.destination);
    pushRow(col2, 'I.13 Loading',    info.loading);

    const col3 = [];
    pushRow(col3, 'Commodity',     info.commodity);
    pushRow(col3, 'HS code',       info.hs_code);
    if (info.net_weight_kg != null && info.net_weight_kg !== '')
      pushRow(col3, 'Net weight',  Number(info.net_weight_kg).toLocaleString() + ' KG');
    if (info.gross_weight_kg != null && info.gross_weight_kg !== '')
      pushRow(col3, 'Gross weight', Number(info.gross_weight_kg).toLocaleString() + ' KG');
    pushRow(col3, 'Packages',      info.packages);
    pushRow(col3, 'Departure',     info.departure_date);
    pushRow(col3, 'Signing date',  info.signing_date);
    pushRow(col3, 'Transport',     info.transport);
    pushRow(col3, 'Vehicle',       info.vehicle_id);
    pushRow(col3, 'Trailer',       info.trailer);
    pushRow(col3, 'Seal',          info.seal);

    const headers = [
      { x: col1X, label: 'Certificate' },
      { x: col2X, label: 'Parties' },
      { x: col3X, label: 'Commodity & Transport' }
    ];

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setText(pdf, COLOR.secondary);
    for (const h of headers) {
      writeText(pdf, h.label.toUpperCase(), h.x, ctx.y);
    }
    const headerY = ctx.y;
    ctx.y += lineMm(8) + 1.5;

    // Render each column independently from the row baseline. If a column
    // overflows the page, it continues on the next page from the top margin.
    // The body cursor advances to the deepest tail across all three columns.
    const baseY = ctx.y;
    const labelW = 22;

    let deepestY = baseY;
    deepestY = Math.max(deepestY, renderColumnRows(ctx.pdf, col1, col1X, baseY, colW, labelW));
    deepestY = Math.max(deepestY, renderColumnRows(ctx.pdf, col2, col2X, baseY, colW, labelW));
    deepestY = Math.max(deepestY, renderColumnRows(ctx.pdf, col3, col3X, baseY, colW, labelW));

    ctx.y = Math.min(deepestY + 4, BODY_BOTTOM);
  }

  // Renders rows top-down inside one column. Returns the y at which the
  // column ended. Does not paginate — caller is expected to keep the section
  // on a single page (typical certs fit comfortably).
  function renderColumnRows(pdf, rows, x, startY, colW, labelW) {
    const valueX = x + labelW;
    const valueW = colW - labelW;
    let y = startY;

    for (const row of rows) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setText(pdf, COLOR.secondary);
      writeText(pdf, row.label, x, y);

      pdf.setFont('helvetica', 'normal');
      setText(pdf, COLOR.body);
      const valueLines = pdf.splitTextToSize(row.value, valueW);
      let vy = y;
      for (const v of valueLines) {
        writeText(pdf, v, valueX, vy);
        vy += lineMm(9);
      }
      const rowH = Math.max(lineMm(9), valueLines.length * lineMm(9));
      y += rowH + 0.8;
    }
    return y;
  }

  // ─── Full mode — DETAILED CHECKS ─────────────────────────────────────────
  function renderDetailedChecks(ctx) {
    const { pdf } = ctx;

    // Heading on a new page if there is little room left.
    ensureSpace(ctx, lineMm(11) + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(pdf, COLOR.body);
    writeText(pdf, 'DETAILED CHECKS', MARGIN_L, ctx.y);
    ctx.y += lineMm(11) + 3;

    for (const section of ctx.data.sections) {
      ensureSpace(ctx, lineMm(11) + 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setText(pdf, COLOR.body);
      const heading = 'Section ' + (section.section_number || '?') + ' — ' + (section.title || '');
      writeText(pdf, heading, MARGIN_L, ctx.y);
      ctx.y += lineMm(11) + 1.5;

      // Column geometry: icon | name | detail
      const iconX = MARGIN_L;
      const iconW = 4;
      const nameX = MARGIN_L + iconW;
      const nameW = 60;
      const detailX = nameX + nameW;
      const detailW = CONTENT_W - iconW - nameW;

      for (const check of (section.checks || [])) {
        const status = (check.result || '').toUpperCase();
        const icon = statusIcon(status);
        const iconColor = statusColor(status);

        const nameText = check.check_name || '';
        const detailText = check.detail || '';

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        const nameLines = pdf.splitTextToSize(nameText, nameW - 1.5);
        pdf.setFont('helvetica', 'normal');
        const detailLines = pdf.splitTextToSize(detailText, detailW);

        const rowH = Math.max(
          lineMm(8.5),
          nameLines.length * lineMm(8.5),
          detailLines.length * lineMm(8.5)
        ) + 1.5;

        ensureSpace(ctx, rowH);

        // Icon
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        setText(pdf, iconColor);
        writeText(pdf, icon, iconX, ctx.y);

        // Name
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        setText(pdf, COLOR.body);
        let ny = ctx.y;
        for (const ln of nameLines) {
          writeText(pdf, ln, nameX, ny);
          ny += lineMm(8.5);
        }

        // Detail
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        setText(pdf, COLOR.body);
        let dy = ctx.y;
        for (const ln of detailLines) {
          writeText(pdf, ln, detailX, dy);
          dy += lineMm(8.5);
        }

        ctx.y += rowH;
      }

      ctx.y += 2;
    }
  }

  // Status icon — kept ASCII-safe so jsPDF's WinAnsi-encoded Helvetica
  // renders every glyph cleanly. (✓ and ✗ are not in WinAnsi, so they would
  // render as boxes without an embedded Unicode font.)
  function statusIcon(status) {
    if (status === 'PASS')    return '+';
    if (status === 'FAIL')    return 'X';
    if (status === 'WARNING') return '!';
    if (status === 'NOTICE') return String.fromCharCode(0xB7); // middle dot
    if (status === 'N/A')    return String.fromCharCode(0x2014); // em dash
    return '-';
  }

  function statusColor(status) {
    if (status === 'PASS')    return COLOR.pass;
    if (status === 'FAIL')    return COLOR.hard;
    if (status === 'WARNING') return COLOR.medium;
    if (status === 'NOTICE')  return COLOR.low;
    return COLOR.secondary;
  }

  // ─── Recommendations ─────────────────────────────────────────────────────
  function renderRecommendations(ctx, text) {
    const { pdf } = ctx;
    ensureSpace(ctx, lineMm(11) + 6);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setText(pdf, COLOR.body);
    writeText(pdf, 'RULE SET UPDATE RECOMMENDATIONS', MARGIN_L, ctx.y);
    ctx.y += lineMm(11) + 2;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(pdf, COLOR.body);

    // Preserve paragraphs (double newline) but wrap each paragraph to width.
    const paragraphs = String(text).split(/\n{2,}/);
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].replace(/\n+/g, ' ').trim();
      if (!p) continue;
      const lines = pdf.splitTextToSize(p, CONTENT_W);
      for (const ln of lines) {
        ensureSpace(ctx, lineMm(9));
        writeText(pdf, ln, MARGIN_L, ctx.y);
        ctx.y += lineMm(9);
      }
      if (i < paragraphs.length - 1) ctx.y += 2;
    }
  }

  // ─── Footer (rendered after layout, knows total page count) ──────────────
  function renderAllFooters(ctx) {
    const { pdf, info, mode } = ctx;
    const total = pdf.getNumberOfPages();
    const modeLabel = mode === 'full' ? 'Full Audit Report' : 'Training Report';
    const ruleSetLabel = pickRuleSetLabel(ctx.data.rule_set_version);

    const left1 = 'EHC Checker · ' + modeLabel + ' · ' + ruleSetLabel;
    const left2Parts = [];
    if (info.certificate_ref) left2Parts.push('Certificate: ' + info.certificate_ref);
    if (info.sp_reference)    left2Parts.push('OV: ' + info.sp_reference);
    const left2 = left2Parts.join(' · ');

    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);

      // Rule line
      setDraw(pdf, COLOR.rule);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_L, FOOTER_RULE_Y, PAGE_W - MARGIN_R, FOOTER_RULE_Y);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      setText(pdf, COLOR.secondary);

      writeText(pdf, left1, MARGIN_L, FOOTER_LINE_1_Y);
      if (left2) writeText(pdf, left2, MARGIN_L, FOOTER_LINE_2_Y);

      const pageStr = 'Page ' + p + ' of ' + total;
      const pageW = pdf.getTextWidth(pageStr);
      writeText(pdf, pageStr, PAGE_W - MARGIN_R - pageW, FOOTER_LINE_1_Y);
    }
  }

  // Prefer the label from the report payload if present, else fall back to
  // the bundled default.
  function pickRuleSetLabel(version) {
    if (version && String(version).trim()) {
      return 'Rule Set ' + String(version).trim();
    }
    return 'Rule Set 3.1 — April 2026';
  }

  // ─── Filename ────────────────────────────────────────────────────────────
  function buildFilename(ctx) {
    const ref = (ctx.info.certificate_ref || 'EHC')
      .replace(/[\/\\\s]+/g, '-')
      .replace(/[^A-Za-z0-9._-]/g, '');
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return 'EHC_Check_Report_' + (ref || 'EHC') + '_' + dd + '_' + mm + '_' + yyyy + '.pdf';
  }

  global.EHCGeneratePDF = { generate };
})(window);
