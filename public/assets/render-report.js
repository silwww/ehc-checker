(function (global) {
  'use strict';

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function modeLabel(reportMode) {
    if (reportMode === 'full') return 'Full Report';
    return 'Concise Report';
  }

  // Parse a checks_performed entry. Returns the kind (pass/warn/fail/skip/
  // other), icon glyph, colours, and the display text with the prefix
  // stripped. Falls back to a neutral bullet for unprefixed / legacy data.
  function parseCheckPrefix(rawCheck) {
    const raw = String(rawCheck == null ? '' : rawCheck).trim();
    const m = raw.match(/^(PASS|WARN|FAIL|SKIP)\s*:\s*(.*)$/i);
    if (!m) {
      return {
        kind: 'other',
        icon: '•',
        iconColor: '#6b7280',
        textColor: 'var(--color-text-primary, #111827)',
        italic: false,
        text: raw
      };
    }
    const prefix = m[1].toUpperCase();
    const text = m[2].trim() || raw;
    const palette = {
      PASS: { kind: 'pass', icon: '✓', iconColor: '#16a34a', textColor: 'var(--color-text-primary, #111827)', italic: false },
      WARN: { kind: 'warn', icon: '⚠', iconColor: '#d97706', textColor: '#92400e', italic: false },
      FAIL: { kind: 'fail', icon: '✗', iconColor: '#dc2626', textColor: '#991b1b', italic: false },
      SKIP: { kind: 'skip', icon: '?', iconColor: '#9ca3af', textColor: '#6b7280', italic: true }
    };
    return Object.assign({ text }, palette[prefix]);
  }

  // Maps a structured check.result enum (PASS / FAIL / WARNING / NOTICE /
  // N/A) to an inline icon span with colour. Colours reuse the existing
  // parseCheckPrefix palette so the new structured CHECKS PERFORMED block
  // is visually continuous with the legacy prefix-based block OVs are used
  // to. NOTICE and N/A both fall back to the muted grey already used for
  // SKIP rows. Unknown / missing values render as a neutral '?' so a
  // malformed row never throws and is still visible to the OV.
  function resultIconHTML(result) {
    const r = String(result == null ? '' : result).toUpperCase();
    const palette = {
      PASS:    { icon: '✓', color: '#16a34a', label: 'Pass' },
      FAIL:    { icon: '✗', color: '#dc2626', label: 'Fail' },
      WARNING: { icon: '⚠', color: '#d97706', label: 'Warning' },
      NOTICE:  { icon: '?',      color: '#9ca3af', label: 'Notice' },
      'N/A':   { icon: '-',      color: '#9ca3af', label: 'Not applicable' }
    };
    const entry = palette[r] || { icon: '?', color: '#9ca3af', label: 'Unknown' };
    return '<span class="result-icon" style="color: ' + entry.color + '; font-weight: 700;" aria-label="' + entry.label + '" title="' + entry.label + '">' + entry.icon + '</span>';
  }

  // Mirror of generate-pdf.js formatWeights().
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

  // ─── Block-level HTML producers ────────────────────────────────────────
  // Both the one-shot render() and the streaming API use these helpers, so
  // the two code paths produce identical HTML for the same input. Each
  // helper takes plain data and returns a (possibly empty) HTML string.

  const blocks = {

    headerHTML(data, helpers) {
      helpers = helpers || {};
      const info = data.certificate_info || {};
      const certRef = info.certificate_ref || '';
      const buttons = [];
      if (helpers.onDownloadPDF) buttons.push('<button id="btn-download-pdf" class="btn btn-secondary">Download PDF</button>');
      if (helpers.onPrint)       buttons.push('<button id="btn-print" class="btn btn-secondary">Download PDF</button>');
      if (helpers.onNew)         buttons.push('<button id="btn-new" class="btn btn-primary">New Check</button>');
      return `
        <div class="card-flat no-print" style="margin-bottom: 24px;">
          <div class="row-between row-md-stack" style="gap: 16px;">
            <div>
              <div class="text-uppercase text-tertiary" style="margin-bottom: 4px;">Check report</div>
              <div class="text-mono text-sm">${escapeHtml(certRef || 'No certificate ref')}</div>
            </div>
            <div class="row">${buttons.join('')}</div>
          </div>
        </div>`;
    },

    verdictHTML(data) {
      const verdict = data.overall_verdict || '—';
      const verdictClass =
        verdict === 'PASS' ? 'verdict-pass' :
        verdict === 'HOLD' ? 'verdict-hold' : '';
      const counters = data.counters || { hard_errors: 0, medium_warnings: 0, low_notices: 0 };
      const verdictSubtitle =
        verdict === 'PASS' ? 'No hard errors found. Review medium / low items as needed.' :
        verdict === 'HOLD' && counters.hard_errors > 0 ? 'Hard errors found. Resolve before signing.' :
        verdict === 'HOLD' && counters.medium_warnings > 0 ? 'Medium warnings to resolve before signing.' :
        verdict === 'HOLD' ? 'Review the findings below before signing.' :
        'Review the findings below before signing.';
      return `
        <div class="card" style="margin-bottom: 24px;">
          <div class="verdict-block">
            <div>
              <div class="text-uppercase text-tertiary" style="margin-bottom: 8px;">Overall verdict</div>
              <div class="verdict ${verdictClass}">${escapeHtml(verdict)}</div>
              <div class="verdict-subtitle">${escapeHtml(verdictSubtitle)}</div>
            </div>
            <div class="verdict-metrics">
              <div class="metric metric-hard">
                <div class="metric-label">Hard errors</div>
                <div class="metric-value">${counters.hard_errors}</div>
              </div>
              <div class="metric metric-medium">
                <div class="metric-label">Medium warnings</div>
                <div class="metric-value">${counters.medium_warnings}</div>
              </div>
              <div class="metric metric-low">
                <div class="metric-label">Low notices</div>
                <div class="metric-value">${counters.low_notices}</div>
              </div>
            </div>
          </div>
        </div>`;
    },

    // CERTIFICATE compact block — flat 2-col grid of label/value rows.
    // Empty rows are omitted; if no rows remain, the helper returns ''.
    compactHTML(info) {
      info = info || {};

      // opts: { breakAll: bool, mono: bool } — extra classes on the value cell.
      function rowHTML(label, value, opts) {
        if (value === undefined || value === null || value === '') return '';
        let valueClass = 'text-primary text-sm';
        if (opts && opts.mono)     valueClass += ' text-mono';
        if (opts && opts.breakAll) valueClass += ' break-all';
        return '<div style="display:grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: baseline;">' +
          '<div class="text-secondary text-sm">' + escapeHtml(label) + '</div>' +
          '<div class="' + valueClass + '">' + escapeHtml(value) + '</div>' +
        '</div>';
      }

      const idRows = [];
      {
        const parts = [];
        if (info.certificate_ref) parts.push(info.certificate_ref);
        if (info.commercial_doc_ref && info.commercial_doc_ref !== 'N/A') {
          parts.push('PO ' + info.commercial_doc_ref);
        }
        if (info.certificate_type) parts.push('Type ' + info.certificate_type);
        if (info.pages)            parts.push('Pages ' + info.pages);
        if (parts.length) idRows.push(rowHTML('Reference', parts.join(' · ')));
      }
      {
        const parts = [];
        if (info.ov_name)      parts.push(info.ov_name);
        if (info.sp_reference) parts.push(info.sp_reference);
        if (info.rcvs_number)  parts.push('RCVS ' + info.rcvs_number);
        if (parts.length) idRows.push(rowHTML('OV', parts.join(' · ')));
      }
      {
        const parts = [];
        if (info.bcp_name)     parts.push(info.bcp_name);
        if (info.signing_date) parts.push('Signing date ' + info.signing_date);
        if (parts.length) idRows.push(rowHTML('BCP', parts.join(' · ')));
      }
      if (info.filename)        idRows.push(rowHTML('Filename', info.filename, { breakAll: true }));
      if (info.second_language) idRows.push(rowHTML('Language', info.second_language));

      const tradeRows = [];
      if (info.consignor || info.consignee) {
        tradeRows.push(rowHTML('Trade', (info.consignor || 'N/A') + ' → ' + (info.consignee || 'N/A')));
      }
      if (info.dispatch_establishment) tradeRows.push(rowHTML('Dispatch', info.dispatch_establishment));
      if (info.destination)            tradeRows.push(rowHTML('Destination', info.destination));
      if (info.i6_operator)            tradeRows.push(rowHTML('I.6 Operator', info.i6_operator));
      if (info.loading)                tradeRows.push(rowHTML('Loading', info.loading));
      {
        const parts = [];
        if (info.commodity) parts.push(info.commodity);
        const weights = formatWeights(info);
        if (weights) parts.push(weights);
        if (info.packages) parts.push(info.packages);
        if (parts.length) tradeRows.push(rowHTML('Commodity', parts.join(' · ')));
      }
      if (info.hs_code)        tradeRows.push(rowHTML('HS Code', info.hs_code, { mono: true }));
      if (info.departure_date) tradeRows.push(rowHTML('Departure', info.departure_date));

      const transportRows = [];
      {
        const parts = [];
        if (info.vehicle_id) parts.push(info.vehicle_id);
        if (info.trailer)    parts.push('Trailer ' + info.trailer);
        if (parts.length) transportRows.push(rowHTML('Tractor', parts.join(' · ')));
      }
      if (info.seal) transportRows.push(rowHTML('Seal', info.seal));

      // Whitespace-only micro-grouping: 8px between rows within a group
      // (Identity / Trade / Transport), 16px between groups. Empty groups
      // are dropped so no double-gap appears when an optional group has
      // no rows.
      const groups = [idRows, tradeRows, transportRows]
        .map(rs => rs.filter(Boolean).join('<div style="height: 8px;"></div>'))
        .filter(Boolean);
      if (groups.length === 0) return '';

      return '<div class="card-flat" style="margin-bottom: 24px;">' +
        '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">CERTIFICATE</div>' +
        groups.join('<div style="height: 16px;"></div>') +
      '</div>';
    },

    // Single flag card. retractedShown=true means "render visible even if
    // retracted" — used by the offline retraction toggle. Streaming never
    // renders retracted cards.
    flagHTML(flag, retractedShown) {
      const cls = {
        hard:   { card: 'flag-card flag-card-hard',   badge: 'badge badge-hard',   label: 'HARD' },
        medium: { card: 'flag-card flag-card-medium', badge: 'badge badge-medium', label: 'MEDIUM' },
        low:    { card: 'flag-card flag-card-low',    badge: 'badge badge-low',    label: 'LOW' }
      };
      const c = cls[flag.severity] || { card: 'flag-card', badge: 'badge badge-neutral', label: (flag.severity || '').toUpperCase() };
      const isRetracted = flag.retracted === true;
      const cardCls = c.card + (isRetracted ? ' flag-retracted' : '');
      const cardStyle = isRetracted && !retractedShown ? ' style="display:none;"' : '';
      const retractedNotice = isRetracted
        ? '<div class="text-uppercase" style="margin-bottom: 8px;">⚠ Retracted — visible for audit only, not counted</div>'
        : '';
      return `
        <div class="${cardCls}"${cardStyle}>
          ${retractedNotice}
          <div class="flag-card-header">
            <h4 class="flag-card-title">${escapeHtml(flag.title || '')}</h4>
            <span class="${c.badge}">${c.label}</span>
          </div>
          <div class="flag-card-body">${escapeHtml(flag.description || '')}</div>
          ${flag.field_reference ? `<div class="flag-card-meta">${escapeHtml(flag.field_reference)}</div>` : ''}
        </div>`;
    },

    // CHECKS PERFORMED block — prefix-aware list of verifications.
    // Each entry must begin with PASS:, WARN:, FAIL: or SKIP: followed by
    // the check label and result on a single line. Unknown / unprefixed
    // strings render with a neutral bullet so legacy data is never dropped.
    // Inline styles so no stylesheet changes are needed.
    checksPerformedHTML(data) {
      const checks = Array.isArray(data && data.checks_performed) ? data.checks_performed : [];
      if (checks.length === 0) return '';
      const rows = checks.map((c, i) => {
        return blocks.checkRowHTML(c, i === checks.length - 1);
      }).join('');
      return '<div class="card-flat checks-performed-section" style="margin-bottom: 24px;">' +
        '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Checks Performed</div>' +
        '<div class="check-rows-container">' + rows + '</div>' +
      '</div>';
    },

    // Single check row. Parses the prefix (PASS/WARN/FAIL/SKIP) and maps
    // to an icon + colour. Stripping the prefix from the displayed text
    // keeps the row compact. Unknown prefixes fall through to a neutral
    // bullet so older payloads or off-spec entries still render.
    checkRowHTML(rawCheck, isLast) {
      const parsed = parseCheckPrefix(rawCheck);
      const sepIdx = parsed.text.indexOf(' — ');
      let label = '';
      let result = parsed.text;
      if (sepIdx !== -1) {
        label = parsed.text.slice(0, sepIdx);
        result = parsed.text.slice(sepIdx + 3);
      }
      const rowBase = 'display: grid; grid-template-columns: 1.2em 12em auto; gap: 10px; padding: 5px 0; align-items: baseline;';
      const rowBordered = isLast ? rowBase : rowBase + ' border-bottom: 1px solid var(--color-border-subtle, #e5e7eb);';
      const iconStyle = 'font-weight: 600; text-align: center; color: ' + parsed.iconColor + ';';
      const labelStyle = 'font-size: 0.8125rem; line-height: 1.5; font-weight: 500; color: var(--color-text-primary, #111827); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      let resultStyle = 'font-size: 0.8125rem; line-height: 1.5; font-weight: 400; color: var(--color-text-secondary, #6b7280);';
      if (parsed.italic) resultStyle += ' font-style: italic;';
      return '<div class="check-row check-row-' + parsed.kind + '" style="' + rowBordered + '">' +
        '<span class="check-icon" style="' + iconStyle + '" aria-label="' + parsed.kind + '">' + parsed.icon + '</span>' +
        '<span class="check-label" style="' + labelStyle + '">' + escapeHtml(label) + '</span>' +
        '<span class="check-result" style="' + resultStyle + '">' + escapeHtml(result) + '</span>' +
      '</div>';
    },

    // Empty-flags banner (no flags raised). Used by both render() and the
    // streaming path when no flag events arrived before info_full.
    flagsEmptyHTML() {
      return '<div class="card-flat" style="margin-bottom: 24px;">' +
        '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div>' +
        '<div class="banner-success">No flags raised — the certificate passed all checks.</div>' +
      '</div>';
    },

    // Retained as a no-op so the streaming appendFullId helper still
    // resolves a callable. The six fields previously surfaced here
    // (Filename, Language, I.6 Operator, Loading, HS Code, Departure)
    // are now rendered inline by compactHTML. See MVP-2.5.4 commit.
    fullIdHTML(_data) {
      return '';
    },

    sectionsHTML(data) {
      if (!Array.isArray(data.sections) || data.sections.length === 0) return '';
      let html = '<div class="card-flat" style="margin-bottom: 24px;"><div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Full check report</div>';
      for (const section of data.sections) {
        html += `<h4 class="text-md text-medium" style="margin: 16px 0 8px;">${section.section_number}. ${escapeHtml(section.title)}</h4>`;
        html += '<table class="report-table"><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody>';
        for (const check of (section.checks || [])) {
          const badgeCls = {
            PASS: 'badge badge-pass',
            FAIL: 'badge badge-hard',
            WARNING: 'badge badge-medium',
            NOTICE: 'badge badge-low'
          }[check.result] || '';
          const resultHtml = badgeCls
            ? `<span class="${badgeCls}">${escapeHtml(check.result)}</span>`
            : escapeHtml(check.result || '');
          html += `<tr><td>${escapeHtml(check.check_name)}</td><td>${resultHtml}</td><td>${escapeHtml(check.detail)}</td></tr>`;
        }
        html += '</tbody></table>';
      }
      html += '</div>';
      return html;
    },

    // Concise-mode 3-column table renderer: icon | check name | detail.
    // Sourced from sections[0].checks (the model populates exactly one
    // section in concise mode per Phase 2). Inline styles only, reusing
    // the same border/colour/font-size tokens as the legacy checkRowHTML
    // grid so the new block reads as visually continuous.
    //
    // options.mode === 'full' is reserved for Phase 5 (multi-section full
    // audit) and returns '' for now so callers can pass it without
    // throwing. options.mode === 'concise' (default) renders one table
    // off sections[0].
    //
    // Defensive: missing check_name / detail / result on a row do NOT
    // skip the row. Each missing field renders as an empty cell. A
    // missing or unknown result still produces an icon via the
    // resultIconHTML defensive default.
    sectionsTableHTML(data, options) {
      const mode = (options && options.mode) || 'concise';
      if (mode === 'full') return '';
      const sections = Array.isArray(data && data.sections) ? data.sections : [];
      if (sections.length === 0) return '';
      const section0 = sections[0] || {};
      const checks = Array.isArray(section0.checks) ? section0.checks : [];
      if (checks.length === 0) return '';

      const rows = checks.map((check, i) => {
        const c = check || {};
        const isLast = (i === checks.length - 1);
        const borderBottom = isLast ? '' : ' border-bottom: 1px solid var(--color-border-subtle, #e5e7eb);';
        const cellBase = 'padding: 6px 8px; vertical-align: middle;' + borderBottom;
        const iconCellStyle = cellBase + ' width: 32px; text-align: center;';
        const nameCellStyle = cellBase + ' width: 200px; font-size: 0.8125rem; font-weight: 500; color: var(--color-text-primary, #111827); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        const detailCellStyle = cellBase + ' font-size: 0.8125rem; color: var(--color-text-secondary, #6b7280);';
        return '<tr>' +
          '<td style="' + iconCellStyle + '">' + resultIconHTML(c.result) + '</td>' +
          '<td style="' + nameCellStyle + '">' + escapeHtml(c.check_name || '') + '</td>' +
          '<td style="' + detailCellStyle + '">' + escapeHtml(c.detail || '') + '</td>' +
        '</tr>';
      }).join('');

      return '<table class="checks-table" style="width: 100%; border-collapse: collapse;"><tbody>' + rows + '</tbody></table>';
    },

    // Block wrapper for the new CHECKS PERFORMED section. Produces a
    // card-flat container with the section title and the sectionsTable
    // body. When sections[0].checks is empty (or sections is absent),
    // renders the title plus a muted "No checks performed." message so
    // the card never appears empty / broken.
    checksPerformedSectionHTML(data, options) {
      const tableHtml = blocks.sectionsTableHTML(data, options);
      const body = tableHtml
        ? tableHtml
        : '<p class="text-sm text-secondary" style="margin: 0; color: var(--color-text-secondary, #6b7280);">No checks performed.</p>';
      return '<div class="card-flat checks-performed-section" style="margin-bottom: 24px;">' +
        '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Checks Performed</div>' +
        body +
      '</div>';
    },

    recommendationsHTML(data) {
      const recs = data.rule_set_update_recommendations;
      if (!recs || !String(recs).trim()) return '';
      return `
        <div class="card-flat" style="margin-bottom: 24px;">
          <div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Rule set update recommendations</div>
          <p class="text-sm text-secondary" style="white-space: pre-wrap;">${escapeHtml(recs)}</p>
        </div>`;
    },

    auditUpgradeHTML(data, helpers) {
      helpers = helpers || {};
      if (!helpers.onDownloadAudit || data.report_mode !== 'concise') return '';
      return `
        <div class="card-flat no-print" style="margin-bottom: 24px; text-align: center;">
          <button id="btn-download-audit" class="btn btn-primary">Open Full Report</button>
          <p class="text-sm text-secondary" style="margin-top: 12px;">Opens the complete audit-grade report in a new tab. Takes 2 to 3 minutes.</p>
          <p id="audit-error" hidden class="banner-error" style="margin-top: 12px; text-align: left;"></p>
        </div>`;
    },

    footerHTML(data) {
      const tokens = data.tokens_used || {};
      const tokenStr = tokens.input != null
        ? ` · Tokens: ${tokens.input} in / ${tokens.output} out${tokens.cache_read ? ' (' + tokens.cache_read + ' cached)' : ''}`
        : '';
      const procTime = data.processing_time_seconds != null ? data.processing_time_seconds.toFixed(1) : 'N/A';
      return `
        <div class="text-xs text-tertiary text-center text-mono" style="border-top: 0.5px solid var(--color-border-subtle); padding-top: 16px;">
          ${escapeHtml(modeLabel(data.report_mode))}
          · Rule Set${data.rule_set_version ? ' ' + escapeHtml(data.rule_set_version) : ''}
          · Model: ${escapeHtml(data.checker_model || 'claude-sonnet-4-6')}
          · Processing: ${procTime}s${tokenStr}
        </div>`;
    }
  };

  // ─── Wiring helpers ───────────────────────────────────────────────────
  function wireHelpers(target, data, helpers) {
    helpers = helpers || {};
    if (helpers.onDownloadPDF) {
      const btn = document.getElementById('btn-download-pdf');
      if (btn) btn.addEventListener('click', helpers.onDownloadPDF);
    }
    if (helpers.onPrint) {
      const btn = document.getElementById('btn-print');
      if (btn) btn.addEventListener('click', helpers.onPrint);
    }
    if (helpers.onNew) {
      const btn = document.getElementById('btn-new');
      if (btn) btn.addEventListener('click', helpers.onNew);
    }
    if (helpers.onDownloadAudit && data.report_mode === 'concise') {
      const btn = document.getElementById('btn-download-audit');
      if (btn) btn.addEventListener('click', helpers.onDownloadAudit);
    }
    const showRetracted = document.getElementById('show-retracted');
    if (showRetracted) {
      showRetracted.addEventListener('change', (e) => {
        const visible = e.target.checked;
        document.querySelectorAll('.flag-retracted').forEach(el => {
          el.style.display = visible ? '' : 'none';
        });
      });
    }
  }

  // ─── One-shot render ──────────────────────────────────────────────────
  // Concatenates the block helpers in canonical order and writes once.
  // Order: header → verdict → flags → compact → checks performed →
  // full ID → sections → recommendations → audit upgrade → footer.
  function render(target, data, helpers) {
    helpers = helpers || {};
    const flags = Array.isArray(data.flags) ? data.flags : [];
    const retractedCount = flags.filter(f => f && f.retracted === true).length;
    const info = data.certificate_info || {};

    let html = '';
    html += blocks.headerHTML(data, helpers);
    html += blocks.verdictHTML(data);

    // Flags wrapper card. Empty case uses the shared empty banner so the
    // streaming path can reuse it.
    if (flags.length === 0) {
      html += blocks.flagsEmptyHTML();
    } else {
      html += '<div class="card-flat" style="margin-bottom: 24px;"><div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div>';
      if (retractedCount > 0) {
        html += `
          <div id="retracted-toggle-container" style="margin-bottom: 16px;">
            <label class="row text-sm text-secondary" style="cursor: pointer;">
              <input type="checkbox" id="show-retracted">
              <span>Show <span id="retracted-count">${retractedCount}</span> retracted flag(s) (audit view)</span>
            </label>
          </div>`;
      }
      html += '<div class="stack-3">';
      for (const flag of flags) html += blocks.flagHTML(flag, false);
      html += '</div></div>';
    }

    html += blocks.compactHTML(info);
    html += blocks.checksPerformedHTML(data);
    html += blocks.fullIdHTML(data);
    html += blocks.sectionsHTML(data);
    html += blocks.recommendationsHTML(data);
    html += blocks.auditUpgradeHTML(data, helpers);
    html += blocks.footerHTML(data);

    target.innerHTML = html;
    wireHelpers(target, data, helpers);
  }

  // ─── Streaming API ────────────────────────────────────────────────────
  // Mirrors render(), but each block is appended to the DOM as its event
  // arrives over SSE. Callers:
  //   1. streaming.init(target, helpers)        — once, at the start
  //   2. streaming.appendVerdict(data)
  //   3. streaming.appendCompact(certificate_info)
  //   4. streaming.appendFlag(flag)             — N times, in order
  //   5. streaming.appendFullId(data)
  //   6. streaming.appendSections(data)         — only in Full Report
  //   7. streaming.appendRecommendations(data)  — only if non-empty
  //   8. streaming.finalize(data, helpers)      — once, at the end
  //
  // The header card with action buttons is injected at finalize time
  // (afterbegin) so it sits at the top of the report without blocking
  // earlier blocks from rendering.
  let streamTarget = null;
  let streamHelpers = null;

  const streaming = {
    init(target, helpers) {
      streamTarget = target;
      streamHelpers = helpers || {};
      target.innerHTML = '';
    },

    appendVerdict(data) {
      streamTarget.insertAdjacentHTML('beforeend', blocks.verdictHTML(data));
    },

    // The progressive /api/check/stream endpoint emits 'verdict' only after
    // the model finishes generating, so by the time it arrives the report
    // body is already partly rendered. Prepend (afterbegin) so the verdict
    // banner lands at the visual top, matching the layout of the non-stream
    // path. The header card is still injected before verdict in finalize().
    prependVerdict(data) {
      streamTarget.insertAdjacentHTML('afterbegin', blocks.verdictHTML(data));
    },

    appendCompact(info) {
      streamTarget.insertAdjacentHTML('beforeend', blocks.compactHTML(info || {}));
      const last = streamTarget.lastElementChild;
      if (last) last.classList.add('streaming-certificate-card');
    },

    appendFlag(flag /*, retractedShown */) {
      // Retracted flags should never reach this method (server filters
      // them out, and the client's defensive check filters again). Render
      // unconditionally as visible. Flags must sit between verdict and the
      // certificate card, so we insert the wrapper before the cert card
      // when one exists (the common path during streaming).
      let stack = streamTarget.querySelector('.streaming-flags-stack');
      if (!stack) {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-flat';
        wrapper.style.marginBottom = '24px';
        wrapper.innerHTML = '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div><div class="stack-3 streaming-flags-stack"></div>';
        const certCard = streamTarget.querySelector('.streaming-certificate-card');
        if (certCard) {
          streamTarget.insertBefore(wrapper, certCard);
        } else {
          streamTarget.appendChild(wrapper);
        }
        stack = wrapper.querySelector('.streaming-flags-stack');
      }
      stack.insertAdjacentHTML('beforeend', blocks.flagHTML(flag, false));
    },

    appendFullId(data) {
      // If no flag events arrived between info_compact and info_full,
      // emit the empty flags banner so the visual order stays stable.
      // Insert it before the cert card so flags sit above CERTIFICATE.
      if (!streamTarget.querySelector('.streaming-flags-stack')) {
        const certCard = streamTarget.querySelector('.streaming-certificate-card');
        if (certCard) {
          certCard.insertAdjacentHTML('beforebegin', blocks.flagsEmptyHTML());
        } else {
          streamTarget.insertAdjacentHTML('beforeend', blocks.flagsEmptyHTML());
        }
      }
      streamTarget.insertAdjacentHTML('beforeend', blocks.checksPerformedHTML(data));
      streamTarget.insertAdjacentHTML('beforeend', blocks.fullIdHTML(data));
    },

    // Progressive append for a single checks_performed entry as it arrives
    // over the live stream. Lazily creates the section card the first time
    // it is called so an empty checks list never produces an empty card.
    // Always appends to the end of the container — order matches arrival.
    appendCheckPerformed(rawCheck) {
      let card = streamTarget.querySelector('.streaming-checks-card');
      let container;
      if (!card) {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-flat streaming-checks-card';
        wrapper.style.marginBottom = '24px';
        wrapper.innerHTML = '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Checks Performed</div>' +
          '<div class="check-rows-container streaming-checks-container"></div>';
        streamTarget.appendChild(wrapper);
        container = wrapper.querySelector('.streaming-checks-container');
      } else {
        container = card.querySelector('.streaming-checks-container');
        const prev = container.lastElementChild;
        if (prev) {
          prev.style.borderBottom = '1px solid var(--color-border-subtle, #e5e7eb)';
        }
      }
      container.insertAdjacentHTML('beforeend', blocks.checkRowHTML(rawCheck, true));
    },

    appendSections(data) {
      streamTarget.insertAdjacentHTML('beforeend', blocks.sectionsHTML(data));
    },

    // Append the new structured CHECKS PERFORMED block (sourced from
    // sections[0].checks) at beforeend. The relative DOM order at the
    // time this fires is always [VERDICT, FLAGS_WRAPPER] (verdict was
    // prepended, flags were appended), and the audit-upgrade card +
    // footer are added later by finalize() at beforeend. So a simple
    // beforeend insertion here lands CHECKS PERFORMED naturally between
    // FLAGS and FOOTER. No need to query for the flags wrapper — the
    // SSE event ordering guarantees flags arrive before final_report,
    // which is the trigger event for this call.
    appendChecksPerformedSection(data, options) {
      streamTarget.insertAdjacentHTML('beforeend', blocks.checksPerformedSectionHTML(data, options));
    },

    appendRecommendations(data) {
      streamTarget.insertAdjacentHTML('beforeend', blocks.recommendationsHTML(data));
    },

    finalize(data, helpers) {
      const h = helpers || streamHelpers || {};
      streamTarget.insertAdjacentHTML('afterbegin', blocks.headerHTML(data, h));
      streamTarget.insertAdjacentHTML('beforeend', blocks.auditUpgradeHTML(data, h));
      streamTarget.insertAdjacentHTML('beforeend', blocks.footerHTML(data));
      wireHelpers(streamTarget, data, h);
    }
  };

  global.EHCRenderReport = { render, escapeHtml, streaming, parseCheckPrefix };
})(window);
