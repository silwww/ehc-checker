require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const { parseMultipartForm, runCheck, classifyFiles } = require('../src/check');

const app = express();
const PORT = process.env.PORT || 3000;

const REPO_ROOT = path.resolve(__dirname, '..');

// JSON parsing for future endpoints (harmlessly ignores multipart)
app.use(express.json());

// Serve frontend files from public/
app.use(express.static('public'));

// Health check for deployment probes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
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

// EHC check endpoint. ?mode=training (default) returns the condensed I3
// format; ?mode=full returns the full I2 audit report with the sections
// array populated.
app.post('/api/check', async (req, res) => {
  try {
    const { files, fields } = await parseMultipartForm(req);
    const mode = req.query.mode === 'full' ? 'full' : 'training';

    const report = await runCheck({ files, fields, mode });
    res.json(report);
  } catch (err) {
    const status = err.statusCode || 500;
    console.error(`[check] Error:`, err.message);
    console.error(err.stack);
    res.status(status).json({
      error: status === 400 ? err.message : 'Internal server error',
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`[server] EHC Checker running on http://localhost:${PORT}`);
});
