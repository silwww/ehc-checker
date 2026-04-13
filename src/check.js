// System prompt is built dynamically from two layers:
//   1. ENGINE_PROMPT — generic instructions on how to read a certificate PDF
//      and use the submit_check_report tool. Commodity-agnostic.
//   2. Rule set markdown — domain-specific rules written by the OV,
//      loaded from the registry via loadRuleSet(ruleSetId).
// The engine layer must never contain dairy-specific or EHC-number-specific
// text. All commodity knowledge lives in the rule set markdown.

const Anthropic = require('@anthropic-ai/sdk');
const Busboy = require('busboy');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';

/**
 * Parse multipart form data from an Express request.
 * Returns { files, fields } where each file has
 * { fieldname, filename, mimetype, buffer }.
 */
function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('Content-Type must be multipart/form-data'));
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });
    const files = [];
    const fields = {};

    busboy.on('file', (fieldname, fileStream, fileInfo) => {
      const chunks = [];
      fileStream.on('data', (chunk) => chunks.push(chunk));
      fileStream.on('end', () => {
        files.push({
          fieldname,
          filename: fileInfo.filename,
          mimetype: fileInfo.mimeType,
          buffer: Buffer.concat(chunks)
        });
      });
    });

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    busboy.on('finish', () => resolve({ files, fields }));
    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

/**
 * Load a rule set by ID from the registry.
 * Reads rules/_registry.json, finds the matching entry, and returns the
 * rule set content along with metadata.
 */
function loadRuleSet(ruleSetId) {
  const registryPath = path.join(process.cwd(), 'rules', '_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

  const entry = registry.ruleSets.find(rs => rs.id === ruleSetId);
  if (!entry || !entry.enabled) {
    throw new Error(`Rule set not found or disabled: ${ruleSetId}`);
  }

  const markdownPath = path.join(process.cwd(), entry.path, entry.ruleSetFile);
  const markdown = fs.readFileSync(markdownPath, 'utf-8');

  return {
    id: entry.id,
    name: entry.name,
    version: entry.version,
    versionDate: entry.versionDate,
    markdown,
    certificateTypes: entry.certificateTypes
  };
}

/**
 * Load shared and rule-set-specific libraries, merged into a single object.
 * Each library file may contain { entries: [...] } or a direct array — both
 * shapes are handled by unwrapping to the inner array.
 */
function loadLibraries(ruleSetId) {
  const registryPath = path.join(process.cwd(), 'rules', '_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

  const entry = registry.ruleSets.find(rs => rs.id === ruleSetId);
  if (!entry) {
    throw new Error(`Rule set not found: ${ruleSetId}`);
  }

  const unwrap = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.entries)) return data.entries;
    return [];
  };

  const readLibDir = (dirPath) => {
    const result = {};
    if (!fs.existsSync(dirPath)) return result;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const key = path.basename(file, '.json');
      const raw = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
      result[key] = unwrap(raw);
    }
    return result;
  };

  const sharedDir = path.join(process.cwd(), entry.sharedLibrariesPath);
  const specificDir = path.join(process.cwd(), entry.path, entry.librariesPath);

  return {
    ...readLibDir(sharedDir),
    ...readLibDir(specificDir)
  };
}

const TOOL_DEFINITION = {
  name: 'submit_check_report',
  description: 'Submit the structured check report after analyzing the certificate against the rule set. You MUST use this tool to return your findings. Do not return prose.',
  input_schema: {
    type: 'object',
    required: ['certificate_info', 'overall_verdict', 'counters', 'flags', 'sections'],
    properties: {
      certificate_info: {
        type: 'object',
        required: ['certificate_ref', 'certificate_type'],
        properties: {
          certificate_ref: { type: 'string', description: 'e.g. "26/2/085165"' },
          certificate_type: { type: 'string', enum: ['8468', '8322', 'unknown'], description: 'Detected from footer code (8468EHC en/fr or 8322EHC en/fr) or header text' },
          ov_name: { type: 'string', description: 'Full name including qualification, e.g. "Silvia Soescu MRCVS"' },
          sp_reference: { type: 'string', description: 'e.g. "SP 632477"' },
          rcvs_number: { type: 'string', description: 'e.g. "7280697"' },
          bcp_name: { type: 'string', description: 'e.g. "Zeebrugge BE-BEZEE1"' },
          bcp_country: { type: 'string', description: 'e.g. "Belgium"' },
          second_language: { type: 'string', description: 'e.g. "French" or "None"' },
          consignor: { type: 'string', description: 'I.1 field value' },
          consignee: { type: 'string', description: 'I.5 field value' },
          i6_operator: { type: 'string', description: 'I.6 field value or "N/A" or "same as I.5"' },
          dispatch_establishment: { type: 'string', description: 'I.11 with approval number' },
          loading: { type: 'string', description: 'I.13 field value' },
          destination: { type: 'string', description: 'I.12 field value' },
          commodity: { type: 'string', description: 'Human-readable product description' },
          hs_code: { type: 'string', description: 'CN code from I.27 or I.28' },
          net_weight_kg: { type: 'number', description: 'Net weight in kilograms' },
          packages: { type: 'string', description: 'e.g. "880 bags (22 pallets x 40 bags)"' },
          departure_date: { type: 'string', description: 'I.14 date' },
          signing_date: { type: 'string', description: 'Date on final signing page' },
          transport: { type: 'string', description: 'I.15 means of transport' },
          vehicle_id: { type: 'string', description: 'I.15 identification' },
          trailer: { type: 'string', description: 'I.19 container number' },
          seal: { type: 'string', description: 'I.19 seal number' },
          pages: { type: 'string', description: 'e.g. "11 of 11"' },
          filename: { type: 'string', description: 'Original filename if provided' }
        }
      },
      overall_verdict: {
        type: 'string',
        enum: ['PASS', 'HOLD'],
        description: 'PASS = no hard errors. HOLD = one or more hard errors or unresolved medium warnings requiring confirmation before dispatch.'
      },
      counters: {
        type: 'object',
        required: ['hard_errors', 'medium_warnings', 'low_notices'],
        properties: {
          hard_errors: { type: 'number' },
          medium_warnings: { type: 'number' },
          low_notices: { type: 'number' }
        }
      },
      flags: {
        type: 'array',
        description: 'All issues found, in order of severity (hard errors first, then medium, then low)',
        items: {
          type: 'object',
          required: ['severity', 'field_reference', 'title', 'description'],
          properties: {
            severity: { type: 'string', enum: ['hard', 'medium', 'low'] },
            field_reference: { type: 'string', description: 'e.g. "I.1 / I.11" or "Part II II.2.1" or "Signing page"' },
            title: { type: 'string', description: 'Short title for the flag' },
            description: { type: 'string', description: 'Detailed explanation of the issue and any context' }
          }
        }
      },
      sections: {
        type: 'array',
        description: 'The 5 numbered report sections with detailed checks',
        items: {
          type: 'object',
          required: ['section_number', 'title', 'checks'],
          properties: {
            section_number: { type: 'number' },
            title: { type: 'string', description: 'e.g. "Preliminary Checks"' },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                required: ['check_name', 'result', 'detail'],
                properties: {
                  check_name: { type: 'string' },
                  result: { type: 'string', enum: ['PASS', 'FAIL', 'WARNING', 'NOTICE', 'N/A'] },
                  detail: { type: 'string' }
                }
              }
            }
          }
        }
      },
      rule_set_update_recommendations: {
        type: 'string',
        description: 'Optional narrative of any new library entries, new patterns, or rule clarifications that should be added to the rule set based on this certificate'
      }
    }
  }
};

const ENGINE_PROMPT = `You are the EHC Checker, an AI assistant that verifies UK Export Health Certificates against a structured rule set. You analyze certificate PDFs and produce structured reports.

Your role:
- Analyze the uploaded certificate PDF carefully, including all pages, stamps, signatures, deletions, and field values
- Apply the rule set provided in the system context
- Identify any issues and classify them as hard errors (RED — BCP will reject the consignment, load must not depart), medium warnings (AMBER — BCP may reject on a bad day, resolve before dispatch where possible), or low notices (BLUE — valid variation worth noting, no action required)
- Produce a structured report using the submit_check_report tool
- The overall_verdict is binary: PASS or HOLD. There is no FAIL. HOLD means the load should be reviewed before dispatch.

Key principles:
- Be thorough but not overly cautious. False positives are worse than missed issues — do not flag things that the rule set explicitly says to ignore.
- Read the calibration notes carefully — they prevent common false positives like Z-strikes, blank fields, and ink color detection.
- When the rule set says "do not flag" or "normal practice", respect that.
- Use PAS (British English) spelling consistently in your descriptions.
- When referring to field values, quote them exactly as they appear on the certificate.
- For deletions, distinguish between Method 1 (pen strikethrough), Method 2 (Adobe strikethrough), and Method 3 (redaction/whiteout).
- Trust codes over text on fields that carry both. When a field contains a machine-printed code alongside a textual label (e.g. BCP name + BCP code, establishment name + approval number), the code is authoritative. Cross-verify the text against the code using the rule set library. If the text you read does not match what the code implies, re-read the text before flagging — do not raise a flag based on a misread label when the code is correct and unambiguous.
- Do not emit withdrawn or self-retracted flags. If, while drafting a flag, you realise on closer inspection that the issue is in fact acceptable, a misreading, or a normal variation, omit the flag entirely. Never include phrases such as "upon closer review this is acceptable", "withdrawing this as a hard error", or "on second thought this is correct" in a flag description. Rule: if you have doubts at the end, do not emit the flag.
- Cross-check numeric values before flagging discrepancies. Weights, counts, and values typically appear in two or three places on the certificate (e.g. I.26 header, I.27 commodity table, supporting delivery notes). Verify the same figure in at least two locations before raising a discrepancy flag, and distinguish clearly between net weight and gross weight. Figures shown in brackets alongside a net weight (e.g. "22,000 KG (22,550 KG)") are normally gross weight notation and must not be flagged as discrepancies against the net weight.

Output format:
- You MUST use the submit_check_report tool to return your findings.
- Do not return prose or natural language responses.
- Every field in certificate_info should be populated if possible. Use "N/A" or "not present" for fields that are genuinely absent.
- Flags should be ordered: hard errors first, then medium, then low.
- Sections should contain 5-10 checks each, covering the major verification points.

The rule set follows. It is cached for efficiency — treat it as your authoritative reference.`;

/**
 * Run the EHC check against the Claude API.
 * Takes already-parsed { files, fields } and returns the report object.
 */
/**
 * Resize an image if its base64 encoding would exceed the Anthropic API limit.
 * Returns { buffer, mimetype } or null if the image cannot be processed.
 */
async function prepareImageForClaude(buffer, filename, mimetype) {
  const MAX_BASE64_BYTES = 4_500_000;

  const estimatedBase64Size = Math.ceil(buffer.length * 4 / 3);
  if (estimatedBase64Size <= MAX_BASE64_BYTES) {
    console.log(`[check] Image ${filename}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB — within limit, no resize`);
    return { buffer, mimetype };
  }

  try {
    // First attempt: 1600px max, quality 82
    const newBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    if (Math.ceil(newBuffer.length * 4 / 3) <= MAX_BASE64_BYTES) {
      console.log(`[check] Image ${filename}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(newBuffer.length / 1024 / 1024).toFixed(1)}MB (resized to 1600px max, quality 82)`);
      return { buffer: newBuffer, mimetype: 'image/jpeg' };
    }

    // Second attempt: 1200px max, quality 75
    const smallerBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    if (Math.ceil(smallerBuffer.length * 4 / 3) <= MAX_BASE64_BYTES) {
      console.log(`[check] Image ${filename}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(smallerBuffer.length / 1024 / 1024).toFixed(1)}MB (resized to 1200px max, quality 75)`);
      return { buffer: smallerBuffer, mimetype: 'image/jpeg' };
    }

    console.log(`[check] WARNING: Image ${filename} could not be reduced below 4.5MB even at 1200px quality 75. Skipping this image to avoid API error.`);
    return null;
  } catch (err) {
    console.log(`[check] WARNING: Failed to process image ${filename}: ${err.message}. Skipping this image.`);
    return null;
  }
}

async function runCheck({ files, fields }) {
  const requestStart = Date.now();
  console.log(`[check] Request received at ${new Date().toISOString()}`);

  // Classify all uploaded files
  const fileObjects = files.map(f => ({ filename: f.filename, buffer: f.buffer, mimetype: f.mimetype }));
  const classification = await classifyFiles(fileObjects);

  if (!classification.certificate) {
    const err = new Error('No certificate found in uploaded files. Please include at least one PDF.');
    err.statusCode = 400;
    throw err;
  }

  const cert = classification.certificate;
  console.log(`[check] Classified: 1 certificate (cert_type: ${cert.cert_type || 'unknown'}), ${classification.supporting_documents.length} supporting, ${classification.photos.length} photos (fallback: ${classification.fallback_used})`);

  // Find the original file buffer for the certificate by matching filename
  const certFile = files.find(f => f.filename === cert.filename);

  // TODO: replace with dynamic rule set selection based on PDF content detection (registry-based)
  const ruleSet = loadRuleSet('dairy-uk-eu');

  const userContent = [];

  // Certificate as the primary document
  userContent.push({
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: certFile.buffer.toString('base64')
    },
    title: certFile.filename
  });

  // Supporting documents
  for (const doc of classification.supporting_documents) {
    const docFile = files.find(f => f.filename === doc.filename);
    if (docFile) {
      userContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: docFile.buffer.toString('base64')
        },
        title: `Supporting: ${docFile.filename}`
      });
    }
  }

  // Photos
  for (const photo of classification.photos) {
    const photoFile = files.find(f => f.filename === photo.filename);
    if (photoFile) {
      const prepared = await prepareImageForClaude(photoFile.buffer, photoFile.filename, photoFile.mimetype);
      if (prepared === null) continue;
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: prepared.mimetype,
          data: prepared.buffer.toString('base64')
        }
      });
    }
  }

  const userCertType = fields.certificate_type || cert.cert_type || 'auto-detect';
  userContent.push({
    type: 'text',
    text: `Please analyze this EHC and produce a structured check report using the submit_check_report tool.

User-selected certificate type: ${userCertType}
Original filename: ${cert.filename}

Apply the rule set thoroughly. Detect the certificate type from the footer code and header. Identify all fields in Part I. Verify all deletions in Part II. Check stamps, signatures, weights, dates, and cross-reference with any supporting documents or photos provided.

Return the report via the submit_check_report tool. Do not return prose.`
  });

  console.log(`[check] Calling Claude API with ${userContent.length} content blocks, cert_type hint: ${userCertType}`);
  const startTime = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: ENGINE_PROMPT
      },
      {
        type: 'text',
        text: `=== RULE SET v${ruleSet.version} ===\n\n${ruleSet.markdown}`,
        cache_control: { type: 'ephemeral' }
      }
    ],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: 'tool', name: 'submit_check_report' },
    messages: [
      {
        role: 'user',
        content: userContent
      }
    ]
  });

  const processingTime = (Date.now() - startTime) / 1000;
  console.log(`[check] Claude API responded in ${Date.now() - startTime}ms — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}, cache_creation: ${response.usage.cache_creation_input_tokens || 0}, cache_read: ${response.usage.cache_read_input_tokens || 0}`);

  const toolUseBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolUseBlock) {
    console.error('No tool_use block in response:', JSON.stringify(response.content));
    throw new Error('Claude did not use the submit_check_report tool as required');
  }

  const report = toolUseBlock.input;

  report.rule_set_version = `${ruleSet.version} — ${ruleSet.versionDate}`;
  report.checker_model = MODEL;
  report.processing_time_seconds = processingTime;
  report.tokens_used = {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
    cache_creation: response.usage.cache_creation_input_tokens || 0,
    cache_read: response.usage.cache_read_input_tokens || 0
  };

  console.log(`[check] Total processing time: ${Date.now() - requestStart}ms`);
  return report;
}

/**
 * Classify uploaded files by type: certificate, supporting_document, photo, or unsupported.
 * Uses pdf-parse to detect EHC pattern in PDFs for certificate identification.
 */
async function classifyFiles(files) {
  const classified = [];

  for (const file of files) {
    const { filename, buffer, mimetype } = file;
    const base = { filename, mimetype, size: buffer.length };

    if (mimetype === 'application/pdf') {
      try {
        const parsed = await pdfParse(buffer);
        const snippet = parsed.text.substring(0, 2000);
        const match = snippet.match(/(\d{4})EHC/i);
        if (match) {
          classified.push({ ...base, kind: 'certificate_candidate', cert_type: match[1] });
        } else {
          classified.push({ ...base, kind: 'supporting_document' });
        }
      } catch (_) {
        classified.push({ ...base, kind: 'supporting_document', parse_error: true });
      }
    } else if (
      mimetype && mimetype.startsWith('image/') &&
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimetype)
    ) {
      classified.push({ ...base, kind: 'photo' });
    } else {
      classified.push({ ...base, kind: 'unsupported' });
    }
  }

  // Determine the certificate
  let certificate = null;
  let fallback_used = false;

  const candidateIndex = classified.findIndex(f => f.kind === 'certificate_candidate');
  if (candidateIndex !== -1) {
    // First candidate becomes the certificate
    classified[candidateIndex].kind = 'certificate';
    certificate = classified[candidateIndex];
    // Remaining candidates become supporting_document
    for (let i = candidateIndex + 1; i < classified.length; i++) {
      if (classified[i].kind === 'certificate_candidate') {
        classified[i].kind = 'supporting_document';
      }
    }
  } else {
    // Fallback: first PDF becomes certificate
    const firstPdf = classified.find(f => f.mimetype === 'application/pdf');
    if (firstPdf) {
      firstPdf.kind = 'certificate';
      firstPdf.cert_type = null;
      firstPdf.fallback_detection = true;
      certificate = firstPdf;
      fallback_used = true;
    }
  }

  return {
    certificate,
    supporting_documents: classified.filter(f => f.kind === 'supporting_document'),
    photos: classified.filter(f => f.kind === 'photo'),
    unsupported: classified.filter(f => f.kind === 'unsupported'),
    fallback_used
  };
}

module.exports = {
  parseMultipartForm,
  runCheck,
  loadRuleSet,
  loadLibraries,
  classifyFiles
};
