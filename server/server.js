require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { parseMultipartForm, runCheck, classifyFiles } = require('../src/check');
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

// EHC check endpoint. ?mode=training (default) returns the condensed I3
// format; ?mode=full returns the full I2 audit report with the sections
// array populated.
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
//   sections (Full Audit only) → recommendations (only if non-empty) →
//   done
//
// On error, runCheck's exception is wrapped as an 'error' event and the
// stream is closed.
app.post('/api/check', async (req, res) => {
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
    const mode = req.query.mode === 'full' ? 'full' : 'training';
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
      report_mode: report.report_mode
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

app.listen(PORT, () => {
  console.log(`[server] EHC Checker running on http://localhost:${PORT}`);
});
