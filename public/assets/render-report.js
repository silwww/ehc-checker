(function (global) {
  'use strict';

  if (!global.EHCCertificateFields) {
    throw new Error('certificate-fields.js not loaded — must load before render-report.js');
  }

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

  // Maps a structured check.result enum (PASS / FAIL / WARNING / NOTICE /
  // N/A) to an inline icon span with colour. Unknown / missing values
  // render as a neutral '?' so a malformed row never throws and is still
  // visible to the OV.
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

  // Inter-row spacer policy for the CERTIFICATE block in HTML.
  // Any two consecutive content entries (row or trade) get an 8px gap.
  // A 'gap' entry produces its own 16px spacer (handled in compactHTML loop).
  // This helper makes the spacing semantics explicit at call site.
  function spacerBetween(prev, current) {
    if (prev && prev.kind !== 'gap' && current.kind !== 'gap') {
      return '<div style="height: 8px;"></div>';
    }
    return '';
  }

  // Presentation hints per label. HTML-only — PDF ignores hints.
  // Keep this list short and explicit; the util emits pure business data.
  function hintsFor(label) {
    if (label === 'Filename') return { breakAll: true };
    if (label === 'HS Code')  return { mono: true };
    return null;
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

      const rows = global.EHCCertificateFields.selectCertificateRows(info);
      if (rows.length === 0) return '';

      const parts = [];
      let prev = null;
      for (const row of rows) {
        parts.push(spacerBetween(prev, row));
        if (row.kind === 'gap') {
          parts.push('<div style="height: 16px;"></div>');
        } else if (row.kind === 'trade') {
          parts.push(
            '<div style="display:grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: baseline;">' +
              '<div class="text-secondary text-sm">Trade</div>' +
              '<div class="text-primary text-sm">' +
                escapeHtml(row.consignor) + ' → ' + escapeHtml(row.consignee) +
              '</div>' +
            '</div>'
          );
        } else {
          parts.push(rowHTML(row.label, row.value, hintsFor(row.label)));
        }
        prev = row;
      }

      return '<div class="card-flat" style="margin-bottom: 24px;">' +
        '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">CERTIFICATE</div>' +
        parts.join('') +
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

    // Empty-flags banner (no flags raised). Used by both render() and
    // streaming.appendFlag's fallback when no flag events arrived.
    flagsEmptyHTML() {
      return '<div class="card-flat" style="margin-bottom: 24px;">' +
        '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div>' +
        '<div class="banner-success">No flags raised — the certificate passed all checks.</div>' +
      '</div>';
    },

    // 3-column table renderer: icon | check name | detail. Inline styles
    // only. options.mode === 'concise' (default) renders one table off
    // sections[0].checks. options.mode === 'full' renders one section
    // card per entry in sections[], each with an eyebrow + H3 + rule
    // above the table; empty sections show an affirmative message.
    //
    // Defensive: missing check_name / detail / result on a row do NOT
    // skip the row. Each missing field renders as an empty cell. A
    // missing or unknown result still produces an icon via the
    // resultIconHTML defensive default.
    sectionsTableHTML(data, options) {
      const mode = (options && options.mode) || 'concise';

      if (mode === 'full') {
        const sectionsAll = Array.isArray(data && data.sections) ? data.sections : [];
        if (sectionsAll.length === 0) return '';
        return sectionsAll.map(section => {
          const s = section || {};
          const sChecks = Array.isArray(s.checks) ? s.checks : [];
          const num = s.section_number != null ? s.section_number : '?';
          const title = s.title || '';
          let body;
          if (sChecks.length === 0) {
            body = '<p style="margin: 0; font-style: italic; color: var(--color-text-secondary); font-size: var(--text-sm);">No issues identified in this area.</p>';
          } else {
            const rows = sChecks.map((check, i) => {
              const c = check || {};
              const isLast = (i === sChecks.length - 1);
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
            body = '<table class="checks-table" style="width: 100%; border-collapse: collapse;"><tbody>' + rows + '</tbody></table>';
          }
          return '<div class="card-flat" style="margin-bottom: 24px;">' +
            '<div class="text-uppercase text-tertiary" style="margin-bottom: 4px;">SECTION ' + escapeHtml(String(num)) + '</div>' +
            '<h3 class="text-md text-medium" style="margin: 0 0 12px;">' + escapeHtml(title) + '</h3>' +
            '<div style="border-top: 0.5px solid var(--color-border-subtle); margin-bottom: 12px;"></div>' +
            body +
          '</div>';
        }).join('');
      }

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
    html += blocks.sectionsTableHTML(data, { mode: 'full' });
    html += blocks.recommendationsHTML(data);
    html += blocks.auditUpgradeHTML(data, helpers);
    html += blocks.footerHTML(data);

    target.innerHTML = html;
    wireHelpers(target, data, helpers);
  }

  // ─── Streaming API ────────────────────────────────────────────────────
  // Mirrors render(), but each SSE event writes into its own fixed-position
  // slot pre-allocated at init() in final visual order. No event ever moves
  // a sibling block — the report's final DOM is byte-identical to the
  // one-shot render(), only the intermediate paints differ. The progressive
  // /api/check/stream endpoint drives this — it emits separate flag and
  // verdict events plus a single 'final_report' event with the full payload.
  // Callers:
  //   1. streaming.init(target, helpers)               — once, at the start
  //   2. streaming.appendFlag(flag)                    — N times, in order
  //   3. streaming.appendSections(data)                — full mode only
  //   4. streaming.appendChecksPerformedSection(data, options) — concise
  //   5. streaming.appendRecommendations(data)         — only if non-empty
  //   6. streaming.prependVerdict(data)                — verdict fires last
  //   7. streaming.finalize(data, helpers)             — once, at the end
  //
  // The header card with action buttons is injected at finalize time
  // (afterbegin of target) so it sits above the verdict slot naturally.
  let streamTarget = null;
  let streamHelpers = null;

  // Discreet pending-state card placed in each pre-allocated slot at init
  // so the report has a stable layout from the first paint. The SVG is
  // decorative (aria-hidden); the placeholder remains meaningful from its
  // text alone if the icon fails to render. Reuses the global
  // @keyframes spin from design-system.css — no new CSS introduced.
  function placeholderHTML(text) {
    return (
      '<div data-ehc-placeholder="true" style="' +
        'background: var(--color-bg-surface);' +
        ' border: 1px dashed var(--color-border-default);' +
        ' border-radius: var(--radius-lg);' +
        ' padding: var(--space-6);' +
        ' margin-bottom: 24px;' +
        ' color: var(--color-text-tertiary);' +
        ' display: flex; align-items: center; gap: 12px;">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"' +
        ' aria-hidden="true"' +
        ' style="animation: spin 800ms linear infinite; flex-shrink: 0;">' +
          '<circle cx="12" cy="12" r="9" stroke="var(--color-text-tertiary)"' +
          ' stroke-width="2" stroke-opacity="0.2"/>' +
          '<path d="M12 3 a9 9 0 0 1 9 9" stroke="var(--color-text-tertiary)"' +
          ' stroke-width="2" stroke-linecap="round"/>' +
        '</svg>' +
        '<span>' + escapeHtml(text) + '</span>' +
      '</div>'
    );
  }

  const streaming = {
    init(target, helpers) {
      streamTarget = target;
      streamHelpers = helpers || {};
      target.innerHTML =
        '<div id="ehc-slot-verdict">' + placeholderHTML('Overall verdict — pending') + '</div>' +
        '<div id="ehc-slot-flags">'   + placeholderHTML('Running checks — flags will appear here') + '</div>' +
        '<div id="ehc-slot-body">'    + placeholderHTML('Preparing checks performed') + '</div>' +
        '<div id="ehc-slot-recs"></div>' +
        '<div id="ehc-slot-footer">'  + placeholderHTML('Rule set & report metadata — pending') + '</div>';
    },

    prependVerdict(data) {
      const slot = document.getElementById('ehc-slot-verdict');
      if (slot) slot.innerHTML = blocks.verdictHTML(data);
    },

    // Retained for the legacy one-shot render path only; not wired into
    // any slot under the progressive streaming model.
    appendCompact(info) {
      streamTarget.insertAdjacentHTML('beforeend', blocks.compactHTML(info || {}));
      const last = streamTarget.lastElementChild;
      if (last) last.classList.add('streaming-certificate-card');
    },

    appendFlag(flag /*, retractedShown */) {
      // Retracted flags should never reach this method (server filters
      // them out, and the client's defensive check filters again). Render
      // unconditionally as visible inside the fixed flags slot.
      const slot = document.getElementById('ehc-slot-flags');
      if (!slot) return;
      let stack = slot.querySelector('.streaming-flags-stack');
      if (!stack) {
        slot.innerHTML =
          '<div class="card-flat" style="margin-bottom: 24px;">' +
            '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div>' +
            '<div class="stack-3 streaming-flags-stack"></div>' +
          '</div>';
        stack = slot.querySelector('.streaming-flags-stack');
      }
      stack.insertAdjacentHTML('beforeend', blocks.flagHTML(flag, false));
    },

    appendSections(data) {
      const slot = document.getElementById('ehc-slot-body');
      if (slot) slot.innerHTML = blocks.sectionsTableHTML(data, { mode: 'full' });
    },

    appendChecksPerformedSection(data, options) {
      const slot = document.getElementById('ehc-slot-body');
      if (slot) slot.innerHTML = blocks.checksPerformedSectionHTML(data, options);
    },

    appendRecommendations(data) {
      const slot = document.getElementById('ehc-slot-recs');
      if (slot) slot.innerHTML = blocks.recommendationsHTML(data);
    },

    finalize(data, helpers) {
      const h = helpers || streamHelpers || {};
      streamTarget.insertAdjacentHTML('afterbegin', blocks.headerHTML(data, h));
      const footerSlot = document.getElementById('ehc-slot-footer');
      if (footerSlot) {
        footerSlot.innerHTML = blocks.auditUpgradeHTML(data, h) + blocks.footerHTML(data);
      }
      // Any slot still holding its placeholder had no matching SSE event
      // arrive — replace it so the finished DOM matches the one-shot
      // render byte-for-byte. The flags slot is special: render() emits
      // blocks.flagsEmptyHTML() for the zero-flags case (a clean cert),
      // so reproduce that here rather than emptying the slot.
      streamTarget.querySelectorAll('[data-ehc-placeholder="true"]').forEach(function (el) {
        const slot = el.parentNode;
        if (!slot || !slot.id || slot.id.indexOf('ehc-slot-') !== 0) return;
        if (slot.id === 'ehc-slot-flags') {
          slot.innerHTML = blocks.flagsEmptyHTML();
        } else {
          slot.innerHTML = '';
        }
      });
      wireHelpers(streamTarget, data, h);
    }
  };

  global.EHCRenderReport = { render, escapeHtml, streaming };
})(window);
