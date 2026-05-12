require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { parseMultipartForm, runCheck, runCheckStream, classifyFiles } = require('../src/check');
const { requireAuth, mountAuthRoutes } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

const REPO_ROOT = path.resolve(__dirname, '..');

// JSON parsing for future endpoints (harmlessly ignores multipart)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check for deployment probes — public, no auth required.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Rule set version metadata — public, no auth required.
// Read fresh from registry on each request (small JSON, no caching needed).
app.get('/api/version', (req, res) => {
  try {
    const registryPath = path.join(REPO_ROOT, 'rules', '_registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    res.json({
      version: registry.version,
      versionDate: registry.versionDate,
      sourceDocument: registry.sourceDocument
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read rule set registry', message: err.message });
  }
});

// Auth routes — must be mounted BEFORE static middleware
// so /login is served by our handler, not by static file serving.
mountAuthRoutes(app);

// Public assets needed by the login page (CSS, fonts, mascot images).
// Served BEFORE requireAuth so the login page renders correctly.
app.use('/css', express.static(path.join('public', 'css')));
app.use('/fonts', express.static(path.join('public', 'fonts')));
app.use('/assets/fonts', express.static(path.join('public', 'assets', 'fonts')));
app.get('/assets/shaggy-mascot.svg', (req, res) => res.sendFile(path.resolve('public', 'assets', 'shaggy-mascot.svg')));
app.get('/assets/shaggy-mascot-2x.png', (req, res) => res.sendFile(path.resolve('public', 'assets', 'shaggy-mascot-2x.png')));

// Everything below this line requires authentication.
app.use(requireAuth);

// Serve frontend files from public/ (gated by requireAuth above).
app.use(express.static('public'));

// GET /api/consignors?certType=8468
// Returns the consignorRouting array for the given certificate type,
// or an empty array if the type has no consignorRouting defined.
app.get('/api/consignors', requireAuth, (req, res) => {
  try {
    const { certType } = req.query;
    const registry = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'rules', '_registry.json'), 'utf8')
    );

    // If no certType provided, return all unique consignors across all cert types.
    // Used to populate the dropdown before cert type is known (scanned PDFs).
    const allRoutes = [];
    const seen = new Set();

    const sources = certType
      ? [registry.certificateTypes[certType]].filter(Boolean)
      : Object.values(registry.certificateTypes);

    for (const certEntry of sources) {
      if (!Array.isArray(certEntry.consignorRouting)) continue;
      for (const route of certEntry.consignorRouting) {
        if (seen.has(route.consignorId)) continue;
        seen.add(route.consignorId);
        allRoutes.push({
          consignorId: route.consignorId,
          fallback: route.fallback || false,
          note: route.note || null
        });
      }
    }

    res.json({ consignors: allRoutes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load consignors', message: err.message });
  }
});

// File classification endpoint (no Claude API call — just pdf-parse)
app.post('/api/classify', async (req, res) => {
  try {
    const { files } = await parseMultipartForm(req);
    const fileObjects = files.map(f => ({
      filename: f.filename,
      buffer: f.buffer,
      mimetype: f.mimetype
    }));
    const result = await classifyFiles(fileObjects);
    console.log(`[classify] Classified ${files.length} files: ${result.certificate ? 1 : 0} certificate, ${result.supporting_documents.length} supporting, ${result.photos.length} photos, ${result.unsupported.length} unsupported (fallback: ${result.fallback_used})`);
    res.json(result);
  } catch (err) {
    console.error(`[classify] Error:`, err.message);
    res.status(500).json({ error: 'Classification failed', message: err.message });
  }
});

// Lightweight admin stats. Reads rule set metadata from the registry and
// reports whether the audit log file has shipped yet. Per-OV counts and
// PASS/HOLD rates are intentionally absent until data/checks_log.csv
// exists — see Notion 'CSV audit log' notes.
async function computeStats() {
  const registryPath = path.join(REPO_ROOT, 'rules', '_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

  const checksLogPath = path.join(REPO_ROOT, 'data', 'checks_log.csv');
  const checksLogPresent = fs.existsSync(checksLogPath);

  return {
    generated_at: new Date().toISOString(),
    rule_set_version: registry.version,
    rule_set_version_date: registry.versionDate,
    rule_set_source_document: registry.sourceDocument || null,
    total_checks_estimated: null,
    checks_log_present: checksLogPresent,
    note: "Per-OV usage statistics require a checks log (data/checks_log.csv). The log is a planned feature scheduled after MVP-0 and PDF refactor — see Notion 'CSV audit log' notes. For now, this endpoint returns rule set metadata and a placeholder for usage stats."
  };
}

app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = await computeStats();
    res.json(stats);
  } catch (err) {
    console.error('[admin/stats] Error:', err.message);
    res.status(500).json({ error: 'Stats computation failed', message: err.message });
  }
});

// EHC check endpoint. ?mode=concise (default) returns the condensed I3
// format; ?mode=full returns the full I2 audit report with the sections
// array populated. ?mode=training is reserved for a future flag-to-rule
// learning feature and currently returns 501 Not Implemented.
//
// The response is delivered as a Server-Sent Events stream. The Claude
// API call itself runs to completion as before — token streaming is
// intentionally NOT used here because postProcessReport (src/check.js)
// filters retracted flags and recomputes verdict + counters from the
// filtered set, which requires the full report. Once runCheck resolves,
// the report is sliced into events with small inter-event sleeps so the
// client can render block-by-block:
//
//   start → heartbeat (× N) → verdict → info_compact →
//   flag (× N filtered, retracted excluded) → info_full →
//   sections (Full Report only) → recommendations (only if non-empty) →
//   done
//
// On error, runCheck's exception is wrapped as an 'error' event and the
// stream is closed.
app.post('/api/check', async (req, res) => {
  // Validate mode query param BEFORE flushing SSE headers. Once the SSE
  // stream is opened the response is committed as 200 OK and we cannot
  // return a non-200 status. Mode validation must respond as a plain
  // HTTP error.
  const requestedMode = req.query.mode;
  if (requestedMode === 'training') {
    res.status(501).json({
      error: 'Not Implemented',
      message: "mode=training is reserved for a future flag-to-rule learning feature. Use mode=concise (default) or mode=full."
    });
    return;
  }
  if (requestedMode !== undefined && requestedMode !== 'concise' && requestedMode !== 'full') {
    res.status(400).json({
      error: 'Bad Request',
      message: `Invalid mode '${requestedMode}'. Use 'concise' (default) or 'full'.`
    });
    return;
  }
  const mode = requestedMode === 'full' ? 'full' : 'concise';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function sendEvent(eventName, dataObj) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
  }
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  sendEvent('start', { ts: Date.now() });

  // Heartbeat keeps the spinner alive on the client and lets it surface
  // an elapsed-time message. Cleared as soon as runCheck resolves or
  // rejects, before any final events fire.
  const heartbeat = setInterval(() => {
    sendEvent('heartbeat', { stage: 'processing' });
  }, 5000);

  try {
    const { files, fields } = await parseMultipartForm(req);
    const report = await runCheck({ files, fields, mode });

    clearInterval(heartbeat);

    const flags = Array.isArray(report.flags) ? report.flags : [];
    const retractedCount = flags.filter(f => f && f.retracted === true).length;
    const activeFlags = flags.filter(f => !f || f.retracted !== true);

    sendEvent('verdict', {
      overall_verdict: report.overall_verdict,
      counters: report.counters,
      retracted_count: retractedCount
    });
    await sleep(250);

    sendEvent('info_compact', { certificate_info: report.certificate_info });
    await sleep(250);

    for (let i = 0; i < activeFlags.length; i++) {
      sendEvent('flag', activeFlags[i]);
      if (i < activeFlags.length - 1) await sleep(200);
    }
    await sleep(250);

    sendEvent('info_full', {
      certificate_info: report.certificate_info,
      rule_set_version: report.rule_set_version,
      processing_time_seconds: report.processing_time_seconds,
      checker_model: report.checker_model,
      tokens_used: report.tokens_used,
      report_mode: report.report_mode,
      checks_performed: report.checks_performed
    });

    if (Array.isArray(report.sections) && report.sections.length > 0) {
      await sleep(200);
      sendEvent('sections', { sections: report.sections });
    }

    const recs = report.rule_set_update_recommendations;
    if (recs && String(recs).trim()) {
      await sleep(200);
      sendEvent('recommendations', { rule_set_update_recommendations: recs });
    }

    await sleep(100);
    sendEvent('done', { ok: true });
    res.end();
  } catch (err) {
    clearInterval(heartbeat);
    const status = err.statusCode || 500;
    console.error(`[check] Error:`, err.message);
    console.error(err.stack);
    sendEvent('error', {
      error: status === 400 ? err.message : 'Internal server error',
      message: err.message
    });
    res.end();
  }
});

// Progressive SSE streaming endpoint. Uses anthropic.messages.stream() and
// partial-json to emit tool_use input deltas as discrete events:
//
//   started → check_performed (× N) → flag (× N) →
//   verdict → final_report → done
//
// certificate_info, sections, recommendations, and meta-info ride on the
// single consolidated `final_report` event emitted at stream finalisation,
// after `verdict`. The wrapper below is allowlist-free, so the runCheckStream
// caller controls the event vocabulary directly.
//
// On any error during streaming an 'error' event is emitted and the stream
// is closed. A keep-alive SSE comment fires every 15 seconds while the
// Claude API is generating so Render Free tier proxies do not drop the
// idle TCP connection. The existing /api/check endpoint is untouched and
// stays as the fallback path for clients that fail to consume this stream.
app.post('/api/check/stream', async (req, res) => {
  const requestedMode = req.query.mode;
  if (requestedMode === 'training') {
    res.status(501).json({
      error: 'Not Implemented',
      message: "mode=training is reserved for a future flag-to-rule learning feature. Use mode=concise (default) or mode=full."
    });
    return;
  }
  if (requestedMode !== undefined && requestedMode !== 'concise' && requestedMode !== 'full') {
    res.status(400).json({
      error: 'Bad Request',
      message: `Invalid mode '${requestedMode}'. Use 'concise' (default) or 'full'.`
    });
    return;
  }
  const mode = requestedMode === 'full' ? 'full' : 'concise';

  // Per-request id used to correlate stream lifecycle logs when multiple
  // /api/check/stream requests run concurrently or overlap.
  const rid = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();
  const log = (msg, extra) => {
    const dt = String(Date.now() - t0).padStart(5, ' ');
    if (extra !== undefined) console.log(`[check-stream ${rid} +${dt}ms] ${msg}`, extra);
    else console.log(`[check-stream ${rid} +${dt}ms] ${msg}`);
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  log('opened, headers flushed');

  let eventsSent = 0;
  function sendEvent(eventName, dataObj) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(dataObj || {})}\n\n`);
    eventsSent++;
  }

  sendEvent('started', { message: 'Loading rule set and libraries...' });

  const keepAlive = setInterval(() => {
    res.write(`: keep-alive\n\n`);
  }, 15000);

  const abortController = new AbortController();
  let clientGone = false;
  // `req.on('close')` on a POST fires when the multipart body finishes
  // uploading — NOT when the client disconnects. With small uploads on
  // localhost that is ~20ms in, which incorrectly suppressed every
  // subsequent onEvent and the final 'done' write. The reliable signal
  // for "client disconnected during the response" is `res.on('close')`
  // before `res.end()` runs (i.e. res.writableEnded is still false).
  req.on('close', () => {
    log('req close fired', { complete: req.complete, eventsSent });
    if (!req.complete) {
      // Client aborted mid-upload; safe to mark gone.
      clientGone = true;
      try { abortController.abort(); } catch (_) {}
      log('client aborted upload before completing');
    }
  });
  res.on('close', () => {
    log('res close fired', { eventsSent, writableEnded: res.writableEnded });
    if (!res.writableEnded && !clientGone) {
      clientGone = true;
      try { abortController.abort(); } catch (_) {}
      log('client disconnected during response — aborting');
    }
  });
  res.on('error', (e) => log('res error fired', e && e.message));

  try {
    const { files, fields } = await parseMultipartForm(req);
    log('multipart parsed, entering runCheckStream');

    await runCheckStream({
      files,
      fields,
      mode,
      signal: abortController.signal,
      onEvent: (eventName, data) => {
        if (clientGone) return;
        sendEvent(eventName, data);
      }
    });

    log('runCheckStream resolved', { eventsSent, clientGone });
    if (!clientGone) {
      res.write('event: done\ndata: {}\n\n');
      log('wrote done event');
    } else {
      log('skipped done write — client gone');
    }
  } catch (err) {
    console.error(`[check-stream ${rid}] Error:`, err.message);
    if (err.stack) console.error(err.stack);
    log('catch entered', { clientGone, eventsSent });
    if (!clientGone) {
      sendEvent('error', {
        message: err.message || 'Internal server error'
      });
      log('wrote error event');
    } else {
      log('skipped error write — client gone');
    }
  } finally {
    clearInterval(keepAlive);
    if (!res.writableEnded) res.end();
    log('finally — stream closed', { eventsSent });
  }
});

app.listen(PORT, () => {
  console.log(`[server] EHC Checker running on http://localhost:${PORT}`);
});
