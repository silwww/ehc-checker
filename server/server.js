require('dotenv').config();

const express = require('express');
const { parseMultipartForm, runCheck, classifyFiles } = require('../src/check');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parsing for future endpoints (harmlessly ignores multipart)
app.use(express.json());

// Serve frontend files from public/
app.use(express.static('public'));

// Health check for deployment probes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// File classification endpoint (no Claude API call — just pdf-parse).
// Accepts an optional `classification_overrides` JSON form field so the
// UI's per-file dropdown choices reach the server.
app.post('/api/classify', async (req, res) => {
  try {
    const { files, fields } = await parseMultipartForm(req);
    const fileObjects = files.map(f => ({
      filename: f.filename,
      buffer: f.buffer,
      mimetype: f.mimetype
    }));
    let overrides = {};
    if (fields && fields.classification_overrides) {
      try { overrides = JSON.parse(fields.classification_overrides) || {}; } catch (_) { overrides = {}; }
    }
    const result = await classifyFiles(fileObjects, overrides);
    const unclassifiedCount = (result.unclassified || []).length;
    console.log(`[classify] Classified ${files.length} files: ${result.certificate ? 1 : 0} certificate, ${result.supporting_documents.length} supporting, ${result.photos.length} photos, ${unclassifiedCount} unclassified, ${result.unsupported.length} unsupported`);
    res.json(result);
  } catch (err) {
    console.error(`[classify] Error:`, err.message);
    res.status(500).json({ error: 'Classification failed', message: err.message });
  }
});

// EHC check endpoint
app.post('/api/check', async (req, res) => {
  try {
    const { files, fields } = await parseMultipartForm(req);

    const report = await runCheck({ files, fields });
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
