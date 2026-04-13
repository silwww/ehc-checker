require('dotenv').config();

const express = require('express');
const { parseMultipartForm, runCheck } = require('../src/check');

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

// EHC check endpoint
app.post('/api/check', async (req, res) => {
  try {
    const { files, fields } = await parseMultipartForm(req);

    const ehcFile = files.find(f => f.fieldname === 'ehc_pdf');
    if (!ehcFile) {
      return res.status(400).json({
        error: 'EHC PDF is required (field name: ehc_pdf)'
      });
    }

    const report = await runCheck({ files, fields });
    res.json(report);
  } catch (err) {
    console.error(`[check] Error:`, err.message);
    console.error(err.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`[server] EHC Checker running on http://localhost:${PORT}`);
});
