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
    if (reportMode === 'full') return 'Full Audit Report';
    return 'Training Report';
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

  // Build the on-screen CERTIFICATE compact block.
  // Mirrors renderCertificateBlock() in generate-pdf.js: three sub-blocks
  // (Identity, Trade, Transport), each a 2-col label/value grid. Empty rows
  // and empty sub-blocks are omitted entirely. Layout is intentionally
  // airier than the PDF (8px row gap vs ~4.5mm).
  function compactBlockHTML(info) {
    info = info || {};

    function rowHTML(label, value) {
      if (value === undefined || value === null || value === '') return '';
      return '<div style="display:grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: baseline;">' +
        '<div class="text-secondary text-sm">' + escapeHtml(label) + '</div>' +
        '<div class="text-primary text-sm">' + escapeHtml(value) + '</div>' +
      '</div>';
    }

    function subBlock(heading, rows) {
      const body = rows.filter(Boolean).join('<div style="height: 8px;"></div>');
      if (!body) return '';
      return '<div>' +
        '<div class="id-section-header">' + escapeHtml(heading) + '</div>' +
        body +
      '</div>';
    }

    // Identity sub-block.
    const idRows = [];
    {
      const parts = [];
      if (info.certificate_ref)  parts.push(info.certificate_ref);
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

    // Trade sub-block.
    const tradeRows = [];
    if (info.consignor || info.consignee) {
      tradeRows.push(rowHTML('Trade', (info.consignor || 'N/A') + ' → ' + (info.consignee || 'N/A')));
    }
    if (info.dispatch_establishment) tradeRows.push(rowHTML('Dispatch', info.dispatch_establishment));
    if (info.destination)            tradeRows.push(rowHTML('Destination', info.destination));
    {
      const parts = [];
      if (info.commodity) parts.push(info.commodity);
      const weights = formatWeights(info);
      if (weights) parts.push(weights);
      if (info.packages) parts.push(info.packages);
      if (parts.length) tradeRows.push(rowHTML('Commodity', parts.join(' · ')));
    }

    // Transport sub-block.
    const transportRows = [];
    {
      const parts = [];
      if (info.vehicle_id) parts.push(info.vehicle_id);
      if (info.trailer)    parts.push('Trailer ' + info.trailer);
      if (parts.length) transportRows.push(rowHTML('Tractor', parts.join(' · ')));
    }
    if (info.seal) transportRows.push(rowHTML('Seal', info.seal));

    const subBlocks = [
      subBlock('IDENTITY',  idRows),
      subBlock('TRADE',     tradeRows),
      subBlock('TRANSPORT', transportRows)
    ].filter(Boolean);

    if (subBlocks.length === 0) return '';

    return '<div class="card-flat" style="margin-bottom: 24px;">' +
      '<div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">CERTIFICATE</div>' +
      '<div style="display: flex; flex-direction: column; gap: 20px;">' +
        subBlocks.join('') +
      '</div>' +
    '</div>';
  }

  // Shared report renderer used by index.html and audit.html.
  //
  // helpers (all optional):
  //   onDownloadPDF   - if set, header shows a Download PDF button wired to this fn
  //   onPrint         - if set, header shows a Download PDF button wired to this fn
  //   onNew           - if set, header shows a New Check button wired to this fn
  //   onDownloadAudit - if set AND data.report_mode === 'training', an Open
  //                     Full Audit Report section is rendered before the footer
  //                     and wired to this fn
  function render(target, data, helpers) {
    helpers = helpers || {};
    const info = data.certificate_info || {};
    const verdict = data.overall_verdict || '—';
    const verdictClass =
      verdict === 'PASS' ? 'verdict-pass' :
      verdict === 'HOLD' ? 'verdict-hold' : '';
    const verdictSubtitle =
      verdict === 'PASS' ? 'No hard errors found. Review medium / low items as needed.' :
      verdict === 'HOLD' ? 'Hard errors found. Resolve before signing.' :
      'Review the findings below before signing.';

    const counters = data.counters || { hard_errors: 0, medium_warnings: 0, low_notices: 0 };
    const certRef = info.certificate_ref || '';

    let html = '';

    const headerButtons = [];
    if (helpers.onDownloadPDF) {
      headerButtons.push('<button id="btn-download-pdf" class="btn btn-secondary">Download PDF</button>');
    }
    if (helpers.onPrint) {
      headerButtons.push('<button id="btn-print" class="btn btn-secondary">Download PDF</button>');
    }
    if (helpers.onNew) {
      headerButtons.push('<button id="btn-new" class="btn btn-primary">New Check</button>');
    }

    html += `
      <div class="card-flat no-print" style="margin-bottom: 24px;">
        <div class="row-between row-md-stack" style="gap: 16px;">
          <div>
            <div class="text-uppercase text-tertiary" style="margin-bottom: 4px;">Check report</div>
            <div class="text-mono text-sm">${escapeHtml(certRef || 'No certificate ref')}</div>
          </div>
          <div class="row">${headerButtons.join('')}</div>
        </div>
      </div>`;

    html += `
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

    // CERTIFICATE compact block — sits between verdict and flags, mirroring
    // the PDF page-1 layout. Returns '' if all sub-blocks are empty.
    html += compactBlockHTML(info);

    // Flags
    html += '<div class="card-flat" style="margin-bottom: 24px;"><div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Flags</div>';
    if (data.flags && data.flags.length > 0) {
      const retractedCount = data.flags.filter(f => f && f.retracted === true).length;
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
      const cls = {
        hard:   { card: 'flag-card flag-card-hard',   badge: 'badge badge-hard',   label: 'HARD' },
        medium: { card: 'flag-card flag-card-medium', badge: 'badge badge-medium', label: 'MEDIUM' },
        low:    { card: 'flag-card flag-card-low',    badge: 'badge badge-low',    label: 'LOW' }
      };
      for (const flag of data.flags) {
        const c = cls[flag.severity] || { card: 'flag-card', badge: 'badge badge-neutral', label: (flag.severity || '').toUpperCase() };
        const isRetracted = flag.retracted === true;
        const cardCls = c.card + (isRetracted ? ' flag-retracted' : '');
        const cardStyle = isRetracted ? ' style="display:none;"' : '';
        const retractedNotice = isRetracted
          ? '<div class="text-uppercase" style="margin-bottom: 8px;">⚠ Retracted — visible for audit only, not counted</div>'
          : '';
        html += `
          <div class="${cardCls}"${cardStyle}>
            ${retractedNotice}
            <div class="flag-card-header">
              <h4 class="flag-card-title">${escapeHtml(flag.title || '')}</h4>
              <span class="${c.badge}">${c.label}</span>
            </div>
            <div class="flag-card-body">${escapeHtml(flag.description || '')}</div>
            ${flag.field_reference ? `<div class="flag-card-meta">${escapeHtml(flag.field_reference)}</div>` : ''}
          </div>`;
      }
      html += '</div>';
    } else {
      html += '<div class="banner-success">No flags raised — the certificate passed all checks.</div>';
    }
    html += '</div>';

    // FULL ID grid — full identification card, three columns. Lives below
    // flags so the user sees critical findings before the deep field dump.
    const netWt = (info.net_weight_kg != null) ? (Number(info.net_weight_kg).toLocaleString() + ' KG') : 'N/A';
    const transportText = escapeHtml(info.transport || 'N/A') + (info.vehicle_id ? '. I.15 ID: ' + escapeHtml(info.vehicle_id) : '');

    html += `
      <div class="card-flat" style="margin-bottom: 24px;">
        <div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Identification</div>
        <div class="id-grid">
          <div>
            <div class="id-section-header">Certificate</div>
            <dl class="kv">
              <dt>Certificate Ref</dt><dd class="text-mono">${escapeHtml(info.certificate_ref || 'N/A')}</dd>
              <dt>Type</dt><dd>EHC ${escapeHtml(info.certificate_type || 'N/A')}</dd>
              <dt>Filename</dt><dd class="break-all">${escapeHtml(info.filename || 'N/A')}</dd>
              <dt>OV</dt><dd>${escapeHtml(info.ov_name || 'N/A')}</dd>
              <dt>SP Reference</dt><dd class="text-mono">${escapeHtml(info.sp_reference || 'N/A')}</dd>
              <dt>RCVS No</dt><dd class="text-mono">${escapeHtml(info.rcvs_number || 'N/A')}</dd>
              <dt>BCP</dt><dd>${escapeHtml(info.bcp_name || 'N/A')}${info.bcp_country ? ' (' + escapeHtml(info.bcp_country) + ')' : ''}</dd>
              <dt>Language</dt><dd>${escapeHtml(info.second_language || 'N/A')}</dd>
            </dl>
          </div>

          <div>
            <div class="id-section-header">Parties</div>
            <dl class="kv">
              <dt>Consignor</dt><dd>${escapeHtml(info.consignor || 'N/A')}</dd>
              <dt>Consignee</dt><dd>${escapeHtml(info.consignee || 'N/A')}</dd>
              <dt>I.6 Operator</dt><dd>${escapeHtml(info.i6_operator || 'N/A')}</dd>
              <dt>Dispatch establishment</dt><dd>${escapeHtml(info.dispatch_establishment || 'N/A')}</dd>
              <dt>Loading</dt><dd>${escapeHtml(info.loading || 'N/A')}</dd>
              <dt>Destination</dt><dd>${escapeHtml(info.destination || 'N/A')}</dd>
            </dl>
          </div>

          <div>
            <div class="id-section-header">Commodity &amp; transport</div>
            <dl class="kv">
              <dt>Commodity</dt><dd>${escapeHtml(info.commodity || 'N/A')}</dd>
              <dt>HS Code</dt><dd class="text-mono">${escapeHtml(info.hs_code || 'N/A')}</dd>
              <dt>Net weight</dt><dd class="text-mono">${netWt}</dd>
              <dt>Packages</dt><dd>${escapeHtml(info.packages || 'N/A')}</dd>
              <dt>Departure</dt><dd>${escapeHtml(info.departure_date || 'N/A')}</dd>
              <dt>Signing date</dt><dd>${escapeHtml(info.signing_date || 'N/A')}</dd>
              <dt>Transport</dt><dd>${transportText}</dd>
              <dt>Trailer</dt><dd class="text-mono">${escapeHtml(info.trailer || 'N/A')}</dd>
              <dt>Seal</dt><dd class="text-mono">${escapeHtml(info.seal || 'N/A')}</dd>
              <dt>Pages</dt><dd>${escapeHtml(info.pages || 'N/A')}</dd>
            </dl>
          </div>
        </div>
      </div>`;

    // Full check report (sections) — only present in full audit mode
    if (Array.isArray(data.sections) && data.sections.length > 0) {
      html += '<div class="card-flat" style="margin-bottom: 24px;"><div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Full check report</div>';
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

      if (data.rule_set_update_recommendations && data.rule_set_update_recommendations.trim()) {
        html += `<h4 class="text-md text-medium" style="margin: 24px 0 8px;">Rule Set Update Recommendations</h4>
          <p class="text-sm text-secondary" style="white-space: pre-wrap;">${escapeHtml(data.rule_set_update_recommendations)}</p>`;
      }
      html += '</div>';
    } else if (data.rule_set_update_recommendations && data.rule_set_update_recommendations.trim()) {
      // Training mode often still carries rule set update recommendations.
      html += `
        <div class="card-flat" style="margin-bottom: 24px;">
          <div class="text-uppercase text-tertiary" style="margin-bottom: 16px;">Rule set update recommendations</div>
          <p class="text-sm text-secondary" style="white-space: pre-wrap;">${escapeHtml(data.rule_set_update_recommendations)}</p>
        </div>`;
    }

    // Audit upgrade section — training reports only
    if (helpers.onDownloadAudit && data.report_mode === 'training') {
      html += `
        <div class="card-flat no-print" style="margin-bottom: 24px; text-align: center;">
          <button id="btn-download-audit" class="btn btn-primary">Open Full Audit Report</button>
          <p class="text-sm text-secondary" style="margin-top: 12px;">Opens the complete audit-grade report in a new tab. Takes 2 to 3 minutes.</p>
          <p id="audit-error" hidden class="banner-error" style="margin-top: 12px; text-align: left;"></p>
        </div>`;
    }

    const tokens = data.tokens_used || {};
    const tokenStr = tokens.input != null
      ? ` · Tokens: ${tokens.input} in / ${tokens.output} out${tokens.cache_read ? ' (' + tokens.cache_read + ' cached)' : ''}`
      : '';
    const procTime = data.processing_time_seconds != null ? data.processing_time_seconds.toFixed(1) : 'N/A';

    html += `
      <div class="text-xs text-tertiary text-center text-mono" style="border-top: 0.5px solid var(--color-border-subtle); padding-top: 16px;">
        ${escapeHtml(modeLabel(data.report_mode))}
        · Rule Set ${escapeHtml(data.rule_set_version || 'v3.1')}
        · Model: ${escapeHtml(data.checker_model || 'claude-sonnet-4-5')}
        · Processing: ${procTime}s${tokenStr}
      </div>`;

    target.innerHTML = html;

    // Wire callbacks for any header buttons we rendered.
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
    if (helpers.onDownloadAudit && data.report_mode === 'training') {
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

  global.EHCRenderReport = { render, escapeHtml };
})(window);
