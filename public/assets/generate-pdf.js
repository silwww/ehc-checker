// Native vector PDF generator for EHC Checker. Shared between the Concise
// Report (index.html) and the Full Report (audit.html). Uses Geist /
// Geist Mono via jsPDF's VFS so the output matches the on-screen UI.
//
// Public API:
//   window.EHCGeneratePDF.generate(reportData, mode)
//     reportData: the JSON object returned by submit_check_report
//     mode: 'concise' or 'full' — controls Detailed Checks inclusion and
//           the footer label
(function (global) {
  'use strict';

  // ─── Layout constants (millimetres) ──────────────────────────────────────
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_L = 18;
  const MARGIN_R = 18;
  const MARGIN_T = 16;
  const MARGIN_B = 22;
  const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // 174
  const CONTENT_RIGHT = PAGE_W - MARGIN_R;        // 192
  const BODY_BOTTOM = PAGE_H - MARGIN_B - 0;      // 275 — body cursor must not pass this
  const FOOTER_RULE_Y = 285;
  const FOOTER_LINE_1_Y = 287;
  const FOOTER_LINE_2_Y = 291;

  const PT_TO_MM = 25.4 / 72;

  // ─── Design tokens — single source of truth, mirrors design-system.css ──
  const TOKENS = {
    bgPage:       [250, 250, 249],
    bgSurface:    [255, 255, 255],
    bgSecondary:  [245, 244, 240],

    textPrimary:   [28, 27, 25],
    textSecondary: [95, 94, 90],
    textTertiary:  [136, 135, 128],

    borderSubtle:  [232, 231, 228],
    borderDefault: [220, 219, 215],

    accent:        [29, 158, 117],   // teal — PASS
    accentHover:   [15, 110, 86],

    hardBg:        [252, 235, 235],
    hardText:      [121, 31, 31],    // hardText on hardBg: 8.98:1 (WCAG AA, print-safe)
    hardAccent:    [163, 45, 45],

    mediumBg:      [250, 238, 218],
    mediumText:    [99, 56, 6],      // mediumText on mediumBg: 8.72:1 (WCAG AA, print-safe)
    mediumAccent:  [133, 79, 11],
    mediumBorder:  [186, 117, 23],   // amber — HOLD

    lowBg:         [230, 241, 251],
    lowText:       [12, 68, 124],    // lowText on lowBg: 8.60:1 (WCAG AA, print-safe)
    lowAccent:     [24, 95, 165],
    lowBorder:     [55, 138, 221],

    passBg:        [225, 245, 238],
    passAccent:    [15, 110, 86],

    white:         [255, 255, 255]
  };

  // ─── Table rhythm — column widths and line heights per renderer ──────────
  const TABLE_RHYTHM = {
    concise: {
      nameOffsetX:   6,
      nameW:         42,
      detailOffsetX: 52,
      lineH:         4,
      rowGap:        1.5
    },
    detailed: {
      nameOffsetX:   6,
      nameW:         60,
      detailOffsetX: 70,
      lineH:         4,
      rowGap:        4
    }
  };

  // ─── jsPDF colour helpers ────────────────────────────────────────────────
  function setText(pdf, rgb)   { pdf.setTextColor(rgb[0], rgb[1], rgb[2]); }
  function setFill(pdf, rgb)   { pdf.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setDraw(pdf, rgb)   { pdf.setDrawColor(rgb[0], rgb[1], rgb[2]); }

  // Render text with top-baseline so y is the top of the visible glyph row.
  function writeText(pdf, text, x, y, options) {
    pdf.text(text, x, y, Object.assign({ baseline: 'top' }, options || {}));
  }

  // Approx visible glyph height for a font size in points (used for vertical
  // centering, not line spacing).
  function glyphHeightMm(fontSize) {
    return fontSize * PT_TO_MM * 0.72;
  }

  // ─── Font registration (per PDF; VFS is per-document) ────────────────────
  // Returns the font family name to use throughout — 'Geist' on success,
  // 'helvetica' if the EHCFonts payload isn't loaded.
  function registerFonts(pdf) {
    if (!global.EHCFonts) {
      console.warn('[generate-pdf] EHCFonts not loaded — falling back to Helvetica');
      return { sans: 'helvetica', mono: 'courier', hasArrow: false };
    }
    pdf.addFileToVFS('Geist-Regular.ttf', global.EHCFonts.GeistRegular);
    pdf.addFont('Geist-Regular.ttf', 'Geist', 'normal');
    pdf.addFileToVFS('Geist-Medium.ttf', global.EHCFonts.GeistMedium);
    pdf.addFont('Geist-Medium.ttf', 'Geist', 'bold');
    pdf.addFileToVFS('GeistMono-Regular.ttf', global.EHCFonts.GeistMonoRegular);
    pdf.addFont('GeistMono-Regular.ttf', 'GeistMono', 'normal');
    return { sans: 'Geist', mono: 'GeistMono', hasArrow: true };
  }

  // ─── Severity helpers ────────────────────────────────────────────────────
  function severityBar(severity) {
    if (severity === 'hard')   return TOKENS.hardAccent;
    if (severity === 'medium') return TOKENS.mediumBorder;
    if (severity === 'low')    return TOKENS.lowBorder;
    return TOKENS.textTertiary;
  }

  function severityBadgeBg(severity) {
    if (severity === 'hard')   return TOKENS.hardBg;
    if (severity === 'medium') return TOKENS.mediumBg;
    if (severity === 'low')    return TOKENS.lowBg;
    return TOKENS.bgSecondary;
  }

  function severityBadgeText(severity) {
    if (severity === 'hard')   return TOKENS.hardText;
    if (severity === 'medium') return TOKENS.mediumText;
    if (severity === 'low')    return TOKENS.lowText;
    return TOKENS.textPrimary;
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
    const jsPDFCtor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFCtor) throw new Error('jsPDF library not loaded');
    if (!reportData) throw new Error('No report data');

    const pdf = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setLineHeightFactor(1.15);
    const fonts = registerFonts(pdf);

    const ctx = {
      pdf,
      fonts,
      mode: mode === 'full' ? 'full' : 'concise',
      data: reportData,
      info: reportData.certificate_info || {},
      verdict: (reportData.overall_verdict || '—').toUpperCase(),
      y: MARGIN_T
    };

    // ── PAGE 1 ──
    renderHeaderBar(ctx);
    renderCertificateSubline(ctx);
    renderCounters(ctx);
    renderFindings(ctx);

    if (ctx.mode === 'full') {
      ctx.y += 8;
      renderCertificateFromCompact(ctx);
      pdf.addPage();
      ctx.y = MARGIN_T + 8;
      renderSections(ctx);
    } else {
      renderSectionsTable(ctx);
    }

    // ── Recommendations (always last, if non-empty) ──
    const rec = reportData.rule_set_update_recommendations;
    if (rec && String(rec).trim()) {
      renderRecommendations(ctx, rec);
    }

    // Footer is rendered after layout so Page X of Y is correct.
    renderAllFooters(ctx);

    pdf.save(buildFilename(ctx));
  }

  // ═══ PAGE 1 — Header bar ═════════════════════════════════════════════════
  function renderHeaderBar(ctx) {
    const { pdf, fonts, verdict } = ctx;

    const barH = 18;
    const barColor = verdict === 'PASS' ? TOKENS.accent : TOKENS.mediumBorder;

    // Full-bleed verdict-tinted bar.
    setFill(pdf, barColor);
    pdf.rect(0, 0, PAGE_W, barH, 'F');

    // "EHC CHECK REPORT" left, vertically centred at y = 11mm baseline.
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(14);
    setText(pdf, TOKENS.white);
    // Vertical centre within the 18mm bar: top ≈ (barH - glyphH)/2
    const titleTop = (barH - glyphHeightMm(14)) / 2;
    writeText(pdf, 'EHC CHECK REPORT', MARGIN_L, titleTop);

    // Verdict pill — white bg, verdict word in tint colour.
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(12);
    const pillText = verdict;
    const pillTextW = pdf.getTextWidth(pillText);
    const pillPadX = 2.5;
    const pillPadY = 1.6;
    const pillW = pillTextW + pillPadX * 2;
    const pillH = glyphHeightMm(12) + pillPadY * 2;
    const pillX = CONTENT_RIGHT - pillW;
    const pillY = (barH - pillH) / 2;

    setFill(pdf, TOKENS.white);
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(pillX, pillY, pillW, pillH, 2, 2, 'F');
    } else {
      pdf.rect(pillX, pillY, pillW, pillH, 'F');
    }
    setText(pdf, barColor);
    writeText(pdf, pillText, pillX + pillPadX, pillY + pillPadY);

    ctx.y = barH + 4; // 22 mm
  }

  // ═══ PAGE 1 — "Certificate {ref} · {type}" sub-line ══════════════════════
  function renderCertificateSubline(ctx) {
    const { pdf, fonts, info } = ctx;
    const ref = info.certificate_ref || 'N/A';
    const type = info.certificate_type ? ('EHC ' + info.certificate_type) : 'EHC unknown';
    pdf.setFont(fonts.sans, 'normal');
    pdf.setFontSize(9);
    setText(pdf, TOKENS.textSecondary);
    writeText(pdf, 'Certificate ' + ref + '  ·  ' + type, MARGIN_L, ctx.y);
    ctx.y += 6; // bring cursor to ~28mm
  }

  // ═══ PAGE 1 — Counters row (3 severity cards) ════════════════════════════
  function renderCounters(ctx) {
    const { pdf, fonts } = ctx;
    const c = ctx.data.counters || { hard_errors: 0, medium_warnings: 0, low_notices: 0 };

    // Cursor enters at ~28; nudge down to y=32 as per spec.
    if (ctx.y < 32) ctx.y = 32;

    const cardW = 56;
    const cardH = 18;
    const cardGap = 3;
    const stripeW = 3 * PT_TO_MM; // 3pt vertical bar
    const padIn = 4;

    const cards = [
      {
        n: c.hard_errors || 0,
        label: 'HARD ERRORS',
        bar: TOKENS.hardAccent,
        text: TOKENS.hardText,
        border: TOKENS.hardAccent
      },
      {
        n: c.medium_warnings || 0,
        label: 'MEDIUM WARNINGS',
        bar: TOKENS.mediumBorder,
        text: TOKENS.mediumText,
        border: TOKENS.mediumBorder
      },
      {
        n: c.low_notices || 0,
        label: 'LOW NOTICES',
        bar: TOKENS.lowBorder,
        text: TOKENS.lowText,
        border: TOKENS.lowBorder
      }
    ];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardX = MARGIN_L + i * (cardW + cardGap);
      const cardY = ctx.y;

      // White surface
      setFill(pdf, TOKENS.bgSurface);
      pdf.rect(cardX, cardY, cardW, cardH, 'F');

      // 0.5pt severity-coloured border
      setDraw(pdf, card.border);
      pdf.setLineWidth(0.18);
      pdf.rect(cardX, cardY, cardW, cardH);

      // 3pt severity bar at left edge
      setFill(pdf, card.bar);
      pdf.rect(cardX, cardY, stripeW, cardH, 'F');

      // Number — top-right with 4mm padding
      pdf.setFont(fonts.sans, 'bold');
      pdf.setFontSize(14);
      setText(pdf, card.text);
      const nStr = String(card.n);
      const nW = pdf.getTextWidth(nStr);
      writeText(pdf, nStr, cardX + cardW - padIn - nW, cardY + padIn - 1);

      // Label — bottom-left, after the bar + small padding
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(7.5);
      setText(pdf, TOKENS.textSecondary);
      writeText(pdf, card.label, cardX + stripeW + 3, cardY + cardH - padIn - glyphHeightMm(7.5) + 1);
    }

    ctx.y += cardH + 8; // 8mm gap below counters
  }

  // ═══ PAGE 1 — CERTIFICATE key-value block (mirrors compactHTML) ══════════
  function renderCertificateFromCompact(ctx) {
    const { pdf, fonts, info } = ctx;

    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(7.5);
    setText(pdf, TOKENS.textTertiary);
    writeText(pdf, 'CERTIFICATE', MARGIN_L, ctx.y);
    ctx.y += 2 + glyphHeightMm(7.5);

    const labelX = MARGIN_L;
    const valueX = MARGIN_L + 20;
    const valueW = CONTENT_W - 20;
    const lineH = 4.5;

    const rows = [];
    function pushRow(label, value) {
      if (value === undefined || value === null || value === '') return;
      rows.push({ label, value: String(value), gap: false });
    }
    function pushGap() {
      if (rows.length > 0) rows.push({ gap: true });
    }

    // Identity sub-block
    {
      const parts = [];
      if (info.certificate_ref)  parts.push(info.certificate_ref);
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

    // Trade sub-block
    if (info.consignor || info.consignee) {
      const arrow = ctx.fonts.hasArrow ? '→' : 'to';
      pushRow('Trade', (info.consignor || 'N/A') + ' ' + arrow + ' ' + (info.consignee || 'N/A'));
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

    // Transport sub-block
    {
      const parts = [];
      if (info.vehicle_id) parts.push(info.vehicle_id);
      if (info.trailer)    parts.push('Trailer ' + info.trailer);
      if (parts.length) pushRow('Tractor', parts.join(' · '));
    }
    if (info.seal) pushRow('Seal', info.seal);

    while (rows.length > 0 && rows[rows.length - 1].gap) rows.pop();

    pdf.setFontSize(9);
    for (const row of rows) {
      if (row.gap) {
        ctx.y += 2;
        continue;
      }
      pdf.setFont(fonts.sans, 'normal');
      setText(pdf, TOKENS.textSecondary);
      writeText(pdf, row.label, labelX, ctx.y);

      setText(pdf, TOKENS.textPrimary);
      const valueLines = pdf.splitTextToSize(row.value, valueW);
      let vy = ctx.y;
      for (const v of valueLines) {
        writeText(pdf, v, valueX, vy);
        vy += lineH;
      }
      ctx.y += Math.max(lineH, valueLines.length * lineH);
    }
  }

  // "23,000 KG (23,500 KG)" if both, "23,000 KG" if only net.
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

  // ═══ PAGE 1 — FINDINGS cards ═════════════════════════════════════════════
  function renderFindings(ctx) {
    const { pdf, fonts } = ctx;
    const flags = Array.isArray(ctx.data.flags) ? ctx.data.flags : [];
    const active = flags.filter(isActiveFlag);

    // Heading "FINDINGS (n active flag(s))"
    ensureSpace(ctx, 12);
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(7.5);
    setText(pdf, TOKENS.textTertiary);
    writeText(pdf,
      'FINDINGS (' + active.length + ' ACTIVE FLAG' + (active.length === 1 ? '' : 'S') + ')',
      MARGIN_L, ctx.y);
    ctx.y += 3 + glyphHeightMm(7.5);

    if (active.length === 0) {
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.passAccent);
      writeText(pdf, 'No active flags raised — the certificate passed all checks.', MARGIN_L, ctx.y);
      ctx.y += 6;
      return;
    }

    for (let i = 0; i < active.length; i++) {
      renderFlagCard(ctx, active[i]);
      if (i < active.length - 1) ctx.y += 4; // 4mm gap between cards
    }
  }

  function renderFlagCard(ctx, flag) {
    const { pdf, fonts } = ctx;
    const cardX = MARGIN_L;
    const cardW = CONTENT_W;

    const sevBarColor   = severityBar(flag.severity);
    const sevBgColor    = severityBadgeBg(flag.severity);
    const sevTextColor  = severityBadgeText(flag.severity);
    const sevLabel      = (flag.severity || 'NOTE').toUpperCase();

    const barW = 4 * PT_TO_MM; // 4pt = 1.41mm
    const padOuterTop = 4;
    const padOuterBottom = 4;
    const padOuterLeft = 5;
    const padOuterRight = 5;
    const contentX = cardX + barW + padOuterLeft;
    const contentW = cardW - barW - padOuterLeft - padOuterRight;

    // ── Pre-measure to compute card height ──
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(7.5);
    const badgeTextW = pdf.getTextWidth(sevLabel);
    const badgePadX = 1.5;
    const badgePadY = 0.8;
    const badgeW = badgeTextW + badgePadX * 2;
    const badgeH = glyphHeightMm(7.5) + badgePadY * 2;

    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(11);
    const titleAvailW = contentW - badgeW - 3;
    const titleLines = pdf.splitTextToSize(flag.title || '', titleAvailW);
    const titleLineH = 4.5;
    const titleBlockH = Math.max(badgeH, titleLines.length * titleLineH);

    pdf.setFont(fonts.sans, 'normal');
    pdf.setFontSize(7.5);
    const fieldRefLines = flag.field_reference
      ? pdf.splitTextToSize(flag.field_reference, contentW)
      : [];
    const fieldRefLineH = 4;
    const fieldRefBlockH = fieldRefLines.length
      ? (1.5 + fieldRefLines.length * fieldRefLineH)
      : 0;

    const dividerSpaceAbove = 3;
    const dividerSpaceBelow = 3;
    const dividerH = 0.3 * PT_TO_MM;

    pdf.setFont(fonts.sans, 'normal');
    pdf.setFontSize(9);
    const descLines = flag.description
      ? pdf.splitTextToSize(flag.description, contentW)
      : [];
    const descLineH = 4;
    const descBlockH = descLines.length ? (descLines.length * descLineH) : 0;

    const cardH =
      padOuterTop +
      titleBlockH +
      fieldRefBlockH +
      (descLines.length ? (dividerSpaceAbove + dividerH + dividerSpaceBelow + descBlockH) : 0) +
      padOuterBottom;

    // Page-break before drawing if the card wouldn't fit.
    ensureSpace(ctx, cardH);

    const cardY = ctx.y;

    // White surface
    setFill(pdf, TOKENS.bgSurface);
    pdf.rect(cardX, cardY, cardW, cardH, 'F');

    // 0.5pt subtle border
    setDraw(pdf, TOKENS.borderSubtle);
    pdf.setLineWidth(0.18);
    pdf.rect(cardX, cardY, cardW, cardH);

    // 4pt severity bar at left edge, full card height
    setFill(pdf, sevBarColor);
    pdf.rect(cardX, cardY, barW, cardH, 'F');

    // ── Row 1: severity badge + title (vertically centred together) ──
    const row1Top = cardY + padOuterTop;
    const badgeX = contentX;
    // Centre the badge against the first title line so they sit on a shared baseline.
    const badgeY = row1Top + Math.max(0, (titleLineH - badgeH) / 2);

    setFill(pdf, sevBgColor);
    setDraw(pdf, sevTextColor);
    pdf.setLineWidth(0.4 * PT_TO_MM); // 0.4pt severity-coloured anchor for print
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
    } else {
      pdf.rect(badgeX, badgeY, badgeW, badgeH, 'FD');
    }
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(7.5);
    setText(pdf, sevTextColor);
    writeText(pdf, sevLabel, badgeX + badgePadX, badgeY + badgePadY);

    // Title — Geist Medium 11pt, primary text
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(11);
    setText(pdf, TOKENS.textPrimary);
    let ty = row1Top;
    for (const line of titleLines) {
      writeText(pdf, line, badgeX + badgeW + 3, ty);
      ty += titleLineH;
    }

    let cursorY = row1Top + titleBlockH;

    // ── Row 2: field reference (aligned with badge left edge) ──
    if (fieldRefLines.length) {
      cursorY += 1.5;
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(7.5);
      setText(pdf, TOKENS.textTertiary);
      for (const line of fieldRefLines) {
        writeText(pdf, line, contentX, cursorY);
        cursorY += fieldRefLineH;
      }
    }

    // ── Divider + description ──
    if (descLines.length) {
      cursorY += dividerSpaceAbove;
      setDraw(pdf, TOKENS.borderSubtle);
      pdf.setLineWidth(0.1);
      pdf.line(contentX, cursorY, contentX + contentW, cursorY);
      cursorY += dividerSpaceBelow;

      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.textPrimary);
      for (const line of descLines) {
        writeText(pdf, line, contentX, cursorY);
        cursorY += descLineH;
      }
    }

    ctx.y += cardH;
  }

  // ═══ PAGE 1 — CHECKS PERFORMED tick-list ═════════════════════════════════
  function renderChecksPerformed(ctx) {
    const { pdf, fonts } = ctx;
    const checks = Array.isArray(ctx.data.checks_performed) ? ctx.data.checks_performed : [];
    if (checks.length === 0) return;

    ctx.y += 4; // breathing room after FINDINGS
    ensureSpace(ctx, 12);

    // Heading matches FINDINGS (7.5pt bold textTertiary)
    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(7.5);
    setText(pdf, TOKENS.textTertiary);
    writeText(pdf, 'CHECKS PERFORMED', MARGIN_L, ctx.y);
    ctx.y += 3 + glyphHeightMm(7.5);

    const tickX = MARGIN_L;
    const textX = MARGIN_L + 5;
    const textW = CONTENT_W - 5;
    const lineH = 4;
    const rowGap = 1.5;

    for (const check of checks) {
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      const lines = pdf.splitTextToSize(String(check || ''), textW);
      const rowH = lines.length * lineH + rowGap;
      ensureSpace(ctx, rowH);

      // Green tick
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.accent);
      writeText(pdf, '✓', tickX, ctx.y);

      // Text
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.textPrimary);
      let ty = ctx.y;
      for (const line of lines) {
        writeText(pdf, line, textX, ty);
        ty += lineH;
      }

      ctx.y += rowH;
    }
  }

  // ═══ PAGE 1 — CHECKS PERFORMED (structured, sections[]-based) ════════════
  // Concise-mode renderer for the new CHECKS PERFORMED block, sourced from
  // sections[0].checks (the model populates exactly one section in concise
  // mode since Phase 2, commit 476ee4d). Mirrors the on-screen layout added
  // in Phase 3 (render-report.js sectionsTableHTML): 3 columns —
  // icon | check_name | detail — with row-level page-break safety. When the
  // table overflows to a new page, the section title is repeated as
  // "CHECKS PERFORMED (CONTINUED)" at the top of the new page.
  function renderSectionsTable(ctx) {
    const { pdf, fonts } = ctx;
    const sections = Array.isArray(ctx.data.sections) ? ctx.data.sections : [];
    const section0 = sections[0] || {};
    const checks = Array.isArray(section0.checks) ? section0.checks : [];

    ctx.y += 4; // breathing room after FINDINGS, matches renderChecksPerformed
    ensureSpace(ctx, 12);

    // Heading writer — used at start and after each forced page break so
    // continuation pages stay self-describing. Style matches FINDINGS /
    // CERTIFICATE / CHECKS PERFORMED headings elsewhere in this file
    // (7.5pt bold textTertiary).
    function writeHeading(continued) {
      pdf.setFont(fonts.sans, 'bold');
      pdf.setFontSize(7.5);
      setText(pdf, TOKENS.textTertiary);
      writeText(pdf, continued ? 'CHECKS PERFORMED (CONTINUED)' : 'CHECKS PERFORMED', MARGIN_L, ctx.y);
      ctx.y += 3 + glyphHeightMm(7.5);
    }
    writeHeading(false);

    // Empty-state: render the heading and a muted "No checks performed."
    // message so the block never appears as a stranded title.
    if (checks.length === 0) {
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.textTertiary);
      writeText(pdf, 'No checks performed.', MARGIN_L, ctx.y);
      ctx.y += 6;
      return;
    }

    // Column layout — see TABLE_RHYTHM.concise.
    const rhythm  = TABLE_RHYTHM.concise;
    const iconX   = MARGIN_L;
    const nameX   = MARGIN_L + rhythm.nameOffsetX;
    const nameW   = rhythm.nameW;
    const detailX = MARGIN_L + rhythm.detailOffsetX;
    const detailW = CONTENT_W - rhythm.detailOffsetX;
    const lineH   = rhythm.lineH;
    const rowGap  = rhythm.rowGap;

    let drawnPrev = false;

    for (let i = 0; i < checks.length; i++) {
      const check = checks[i] || {};
      const status = String(check.result || '').toUpperCase();
      const iconColor = statusColor(status);

      // Pre-measure: split name and detail with their column widths and
      // take the taller of the two as the row's text-line count.
      pdf.setFont(fonts.sans, 'bold');
      pdf.setFontSize(9);
      const nameLines = pdf.splitTextToSize(String(check.check_name || ''), nameW - 2);
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      const detailLines = pdf.splitTextToSize(String(check.detail || ''), detailW);
      const lines = Math.max(1, nameLines.length, detailLines.length);
      const rowH = lines * lineH + rowGap;

      // Row-level page break with heading repeat. ensureSpace is not used
      // here because it does not re-emit the section title on the new page.
      if (ctx.y + rowH > BODY_BOTTOM) {
        pdf.addPage();
        ctx.y = MARGIN_T + 8;
        writeHeading(true);
        drawnPrev = false;
      }

      if (drawnPrev) {
        setDraw(pdf, TOKENS.borderSubtle);
        pdf.setLineWidth(0.1);
        pdf.line(MARGIN_L, ctx.y - rowGap / 2, CONTENT_RIGHT, ctx.y - rowGap / 2);
      }

      drawStatusGlyph(pdf, fonts, status, iconX, ctx.y, iconColor);

      // Check name — primary text, medium weight, stacked at nameX.
      pdf.setFont(fonts.sans, 'bold');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.textPrimary);
      let ny = ctx.y;
      for (const ln of nameLines) {
        writeText(pdf, ln, nameX, ny);
        ny += lineH;
      }

      // Detail — secondary text, normal weight, stacked at detailX.
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, TOKENS.textSecondary);
      let dy = ctx.y;
      for (const ln of detailLines) {
        writeText(pdf, ln, detailX, dy);
        dy += lineH;
      }

      ctx.y += rowH;
      drawnPrev = true;
    }
  }

  // ═══ Full mode — five-section verbose body (mirrors on-screen Phase 5) ══
  function renderSections(ctx) {
    const sections = Array.isArray(ctx.data.sections) ? ctx.data.sections : [];
    if (sections.length === 0) return;

    const { pdf, fonts } = ctx;
    const rhythm = TABLE_RHYTHM.detailed;

    const SECTION_GAP           = 8;
    const SECTION_EYEBROW_TO_H3 = 1.5;
    const SECTION_H3_TO_RULE    = 2;
    const SECTION_RULE_TO_BODY  = 3;

    const iconX   = MARGIN_L;
    const nameX   = MARGIN_L + rhythm.nameOffsetX;
    const nameW   = rhythm.nameW;
    const detailX = MARGIN_L + rhythm.detailOffsetX;
    const detailW = CONTENT_W - rhythm.detailOffsetX;
    const lineH   = rhythm.lineH;
    const rowGap  = rhythm.rowGap;

    function writeSectionHeader(num, title, continued) {
      pdf.setFont(fonts.sans, 'bold');
      pdf.setFontSize(7.5);
      setText(pdf, TOKENS.textTertiary);
      const eyebrow = 'SECTION ' + String(num) + (continued ? ' (CONTINUED)' : '');
      writeText(pdf, eyebrow, MARGIN_L, ctx.y);
      ctx.y += glyphHeightMm(7.5) + SECTION_EYEBROW_TO_H3;

      pdf.setFont(fonts.sans, 'bold');
      pdf.setFontSize(11);
      setText(pdf, TOKENS.textPrimary);
      const h3 = title + (continued ? ' (continued)' : '');
      writeText(pdf, h3, MARGIN_L, ctx.y);
      ctx.y += glyphHeightMm(11) + SECTION_H3_TO_RULE;

      setDraw(pdf, TOKENS.borderSubtle);
      pdf.setLineWidth(0.1);
      pdf.line(MARGIN_L, ctx.y, CONTENT_RIGHT, ctx.y);
      ctx.y += SECTION_RULE_TO_BODY;
    }

    const headerClusterH = glyphHeightMm(7.5) + SECTION_EYEBROW_TO_H3
                         + glyphHeightMm(11) + SECTION_H3_TO_RULE
                         + SECTION_RULE_TO_BODY;

    for (let si = 0; si < sections.length; si++) {
      const section = sections[si] || {};
      const num = section.section_number != null ? section.section_number : '?';
      const title = section.title || '';
      const checks = Array.isArray(section.checks) ? section.checks : [];

      if (si > 0) ctx.y += SECTION_GAP;

      ensureSpace(ctx, headerClusterH + lineH + rowGap);
      writeSectionHeader(num, title, false);

      if (checks.length === 0) {
        pdf.setFont(fonts.sans, 'normal');
        pdf.setFontSize(9);
        setText(pdf, TOKENS.textTertiary);
        writeText(pdf, '— No issues identified in this area.', MARGIN_L, ctx.y);
        ctx.y += glyphHeightMm(9) + 4;
        continue;
      }

      let drawnPrev = false;
      for (let ci = 0; ci < checks.length; ci++) {
        const check = checks[ci] || {};
        const status = String(check.result || '').toUpperCase();
        const iconColor = statusColor(status);

        pdf.setFont(fonts.sans, 'bold');
        pdf.setFontSize(8.5);
        const nameLines = pdf.splitTextToSize(String(check.check_name || ''), nameW - 2);
        pdf.setFont(fonts.sans, 'normal');
        pdf.setFontSize(8.5);
        const detailLines = pdf.splitTextToSize(String(check.detail || ''), detailW);
        const lines = Math.max(1, nameLines.length, detailLines.length);
        const rowH = lines * lineH + rowGap;

        if (ctx.y + rowH > BODY_BOTTOM) {
          pdf.addPage();
          ctx.y = MARGIN_T + 8;
          writeSectionHeader(num, title, true);
          drawnPrev = false;
        }

        if (drawnPrev) {
          setDraw(pdf, TOKENS.borderSubtle);
          pdf.setLineWidth(0.1);
          pdf.line(MARGIN_L, ctx.y - rowGap / 2, CONTENT_RIGHT, ctx.y - rowGap / 2);
        }

        drawStatusGlyph(pdf, fonts, status, iconX, ctx.y, iconColor);

        pdf.setFont(fonts.sans, 'bold');
        pdf.setFontSize(8.5);
        setText(pdf, TOKENS.textPrimary);
        let ny = ctx.y;
        for (const ln of nameLines) {
          writeText(pdf, ln, nameX, ny);
          ny += lineH;
        }

        pdf.setFont(fonts.sans, 'normal');
        pdf.setFontSize(8.5);
        setText(pdf, TOKENS.textSecondary);
        let dy = ctx.y;
        for (const ln of detailLines) {
          writeText(pdf, ln, detailX, dy);
          dy += lineH;
        }

        ctx.y += rowH;
        drawnPrev = true;
      }
    }
  }

  // Maps check.result enum → glyph. PASS / FAIL / WARNING are drawn as
  // vectors by drawStatusGlyph (Geist Regular's TTF subset omits ✓ ✗ ⚠);
  // NOTICE ('?') and N/A ('—') render as text from this function.
  function statusIcon(status) {
    if (status === 'PASS')    return '✓';
    if (status === 'FAIL')    return '✗';
    if (status === 'WARNING') return '⚠';
    if (status === 'NOTICE')  return '?';
    if (status === 'N/A')     return '—';
    return '-';
  }

  function statusColor(status) {
    if (status === 'PASS')    return TOKENS.accent;
    if (status === 'FAIL')    return TOKENS.hardAccent;
    if (status === 'WARNING') return TOKENS.mediumBorder;
    if (status === 'NOTICE')  return TOKENS.lowBorder;
    return TOKENS.textTertiary;
  }

  // Geist Regular's TTF subset omits ✓ (U+2713), ✗ (U+2717), ⚠ (U+26A0) —
  // the icon vocabulary added at Phase 3 post-dates the subset. Draw those
  // three as vector primitives so rendering doesn't depend on the font
  // subset. NOTICE ('?') and N/A ('—') are in the subset and stay as text.
  function drawStatusGlyph(pdf, fonts, status, x, y, color) {
    if (status === 'PASS' || status === 'FAIL' || status === 'WARNING') {
      setDraw(pdf, color);
      pdf.setLineWidth(0.5);
      if (status === 'PASS') {
        pdf.line(x + 0.3, y + 1.6, x + 1.3, y + 2.5);
        pdf.line(x + 1.3, y + 2.5, x + 2.8, y + 0.8);
      } else if (status === 'FAIL') {
        pdf.line(x + 0.3, y + 0.8, x + 2.6, y + 2.5);
        pdf.line(x + 0.3, y + 2.5, x + 2.6, y + 0.8);
      } else {
        pdf.line(x + 1.45, y + 0.5, x + 0.3, y + 2.7);
        pdf.line(x + 0.3, y + 2.7, x + 2.6, y + 2.7);
        pdf.line(x + 2.6, y + 2.7, x + 1.45, y + 0.5);
      }
    } else {
      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(9);
      setText(pdf, color);
      writeText(pdf, statusIcon(status), x, y);
    }
  }

  // ═══ Recommendations ═════════════════════════════════════════════════════
  function renderRecommendations(ctx, text) {
    const { pdf, fonts } = ctx;

    // New page if there's no comfortable room (≥ 60mm) — otherwise inline.
    if (ctx.y + 60 > BODY_BOTTOM) {
      pdf.addPage();
      ctx.y = MARGIN_T + 8;
    } else {
      ctx.y += ctx.mode === 'full' ? 8 : 4;
    }

    pdf.setFont(fonts.sans, 'bold');
    pdf.setFontSize(12);
    setText(pdf, TOKENS.textPrimary);
    writeText(pdf, 'RULE SET UPDATE RECOMMENDATIONS', MARGIN_L, ctx.y);
    ctx.y += glyphHeightMm(12) + 4;

    pdf.setFont(fonts.sans, 'normal');
    pdf.setFontSize(9);
    setText(pdf, TOKENS.textPrimary);

    const lineH = 4.2;
    // Strip markdown bold markers; preserve paragraphs.
    const cleaned = String(text).replace(/\*\*/g, '');
    const paragraphs = cleaned.split(/\n{2,}/);
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].replace(/\n+/g, ' ').trim();
      if (!p) continue;
      const wrapped = pdf.splitTextToSize(p, CONTENT_W);
      for (const line of wrapped) {
        ensureSpace(ctx, lineH);
        writeText(pdf, line, MARGIN_L, ctx.y);
        ctx.y += lineH;
      }
      if (i < paragraphs.length - 1) ctx.y += 2;
    }
  }

  // ═══ Footer (rendered after layout) ═══════════════════════════════════════
  function renderAllFooters(ctx) {
    const { pdf, fonts, info, mode } = ctx;
    const total = pdf.getNumberOfPages();
    const modeLabel = mode === 'full' ? 'Full' : 'Concise';
    const ruleSetLabel = pickRuleSetLabel(ctx.data.rule_set_version);
    const ref = info.certificate_ref || '';
    const ov = info.sp_reference ? 'OV ' + info.sp_reference : '';

    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);

      // Rule line
      setDraw(pdf, TOKENS.borderSubtle);
      pdf.setLineWidth(0.1);
      pdf.line(MARGIN_L, FOOTER_RULE_Y, CONTENT_RIGHT, FOOTER_RULE_Y);

      pdf.setFont(fonts.sans, 'normal');
      pdf.setFontSize(7.5);
      setText(pdf, TOKENS.textTertiary);

      // Right: page number — measure first to bound the left side.
      const pageStr = 'Page ' + p + ' of ' + total;
      const pageW = pdf.getTextWidth(pageStr);

      // Left: tokens joined with ' · '; on overflow, truncate the rule set
      // label (NOT the REF or OV) with an ellipsis until it fits.
      const gutter = 4;
      const leftMaxW = CONTENT_W - pageW - gutter;
      const tokens = ['EHC Checker', modeLabel, ruleSetLabel];
      if (ref) tokens.push(ref);
      if (ov)  tokens.push(ov);
      let leftStr = tokens.join(' · ');
      let rs = ruleSetLabel;
      while (pdf.getTextWidth(leftStr) > leftMaxW && rs.length > 0) {
        rs = rs.slice(0, -1);
        tokens[2] = rs + '…';
        leftStr = tokens.join(' · ');
      }

      writeText(pdf, leftStr, MARGIN_L, FOOTER_LINE_1_Y);
      writeText(pdf, pageStr, CONTENT_RIGHT - pageW, FOOTER_LINE_1_Y);
    }
  }

  // ═══ Helpers ═════════════════════════════════════════════════════════════
  function ensureSpace(ctx, needed) {
    if (ctx.y + needed > BODY_BOTTOM) {
      ctx.pdf.addPage();
      ctx.y = MARGIN_T + 8;
    }
  }

  function pickRuleSetLabel(version) {
    if (version && String(version).trim()) {
      return 'Rule Set ' + String(version).trim();
    }
    return 'Rule Set';
  }

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
