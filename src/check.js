// System prompt is built dynamically from two layers:
//   1. ENGINE_PROMPT — generic instructions on how to read a certificate PDF
//      and use the submit_check_report tool. Commodity-agnostic.
//   2. Rule set markdown — domain-specific rules written by the OV,
//      loaded from the registry via loadRuleSet(ruleSetId).
// The engine layer must never contain dairy-specific or EHC-number-specific
// text. All commodity knowledge lives in the rule set markdown.

const Anthropic = require('@anthropic-ai/sdk');
const Busboy = require('busboy');
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

Industry-specific patterns learned from real certificates:

Pattern 1 — Pallet configuration in filenames and I.17
Filenames and I.17 commercial document references often contain pallet
configuration notations like "22x25 KG SWP" or "40x25 KG". These describe
the composition of one pallet (e.g. 22 bags of 25kg each per pallet), NOT
the total number of packages on the consignment. The authoritative total
is ALWAYS I.24 (Total number of packages) and I.26 (Total net/gross weight).
Never use filename content or I.17 descriptions to contradict I.24 or I.26.
Never interpret "NxM KG" notations as total counts.

Pattern 2 — Bracketed gross weight in I.26 is normal notation
I.26 commonly shows net and gross weight in the format "22,000 KG (22,550 KG)"
where the first figure is net weight and the bracketed figure is gross weight.
This is standard EHC notation and is NOT a discrepancy. Do not flag bracketed
weight notation as "Gross weight shown where net expected" or similar. The
two figures appearing together in I.26 are net + gross, both correct, no
action required. Only flag if the bracketed figure is missing entirely AND
the I.27 commodity table net weights do not sum to the I.26 single figure.

Pattern 3 — Alphanumeric identifier reading discipline
Trailer numbers, container numbers, seal numbers, and batch numbers in I.15,
I.19, and I.27 are short alphanumeric strings printed in small fonts. OCR
mistakes on these are common (e.g. EJL2018 read as PS12028, B as 8, O as 0).
Apply this discipline:

Re-read alphanumeric identifiers character by character from the PDF
before reporting them in certificate_info.
If you are not confident about an identifier, return the string
"unable to read clearly — please verify visually" in the relevant field
instead of guessing a value.
Never raise a discrepancy flag based solely on an alphanumeric identifier
you read with low confidence — the discrepancy is more likely to be a
misread than a real error.
When a photograph of the trailer plate or seal is provided alongside the
certificate, the photograph is the authoritative source — read the
identifier from the photo, not the PDF.

Pattern 4 — Trust rule set library tables over uncertain PDF text reads
The rule set markdown contains library tables for known parties — for example
Part B6 (I.5/I.6 Consignee Library), Part B7 (I.12 Destination Library),
Part H1 (Establishment Lookup), and Part H2 (Known Dairy Consignees). These
tables are sections of text within the rule set itself, not separate files.
When you read a BCP name, establishment name, OV name, or consignee name from
the PDF and that name appears in one of these library tables within the rule
set, prefer the table entry over your PDF read. Specifically:

If the PDF text closely matches a library table entry but with minor
character differences (e.g. "Zeebrugge BE-BEZEE1" vs "Zeebrugge BE BEZEE1"),
assume it is a match and use the table entry — do not flag a discrepancy.
If the PDF text resembles no library table entry at all but a code or
approval number elsewhere in the same field matches a table entry, trust
the code and look up the corresponding name from the table.
Only flag a "not in library" finding when both the text and the code
genuinely fail to match any entry in the relevant table within the rule set.

Output format:
- You MUST use the submit_check_report tool to return your findings.
- Do not return prose or natural language responses.
- Every field in certificate_info should be populated if possible. Use "N/A" or "not present" for fields that are genuinely absent.
- Flags should be ordered: hard errors first, then medium, then low.
- Sections should contain 5-10 checks each, covering the major verification points.

The rule set follows. It is cached for efficiency — treat it as your authoritative reference.`;

/**
 * Internal helper: makes a single Claude API call with the given max_tokens.
 * Returns the full response object.
 */
async function callClaudeAPI(maxTokens, userContent, ruleSet, attemptLabel) {
  console.log(`[check] Calling Claude API with max_tokens=${maxTokens} (${attemptLabel})`);
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
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

  const elapsed = Date.now() - startTime;
  const cacheCreation = response.usage.cache_creation_input_tokens || 0;
  const cacheRead = response.usage.cache_read_input_tokens || 0;
  console.log(`[check] Claude API responded in ${elapsed}ms — stop_reason: ${response.stop_reason}, input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}, cache_creation: ${cacheCreation}, cache_read: ${cacheRead}`);

  return response;
}

/**
 * Run the EHC check against the Claude API.
 * Takes already-parsed { files, fields } and returns the report object.
 * Uses adaptive max_tokens: starts at 6000, retries with 8192 on truncation.
 */
async function runCheck({ files, fields }) {
  const requestStart = Date.now();
  console.log(`[check] Request received at ${new Date().toISOString()}`);

  const ehcFile = files.find(f => f.fieldname === 'ehc_pdf');
  if (!ehcFile) {
    throw new Error('EHC PDF is required (field name: ehc_pdf)');
  }

  console.log(`[check] ${files.length} file(s), EHC: ${ehcFile.filename}`);

  // TODO: replace with dynamic rule set selection based on PDF content detection (registry-based)
  const ruleSet = loadRuleSet('dairy-uk-eu');

  const userContent = [];

  userContent.push({
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: ehcFile.buffer.toString('base64')
    },
    title: ehcFile.filename
  });

  for (const file of files) {
    if (file.fieldname === 'ehc_pdf') continue;

    if (file.mimetype === 'application/pdf') {
      userContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: file.buffer.toString('base64')
        },
        title: `${file.fieldname}: ${file.filename}`
      });
    } else if (file.mimetype && file.mimetype.startsWith('image/')) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mimetype,
          data: file.buffer.toString('base64')
        }
      });
    }
  }

  const userCertType = fields.certificate_type || 'auto-detect';
  userContent.push({
    type: 'text',
    text: `Please analyze this EHC and produce a structured check report using the submit_check_report tool.

User-selected certificate type: ${userCertType}
Original filename: ${ehcFile.filename}

Apply the rule set thoroughly. Detect the certificate type from the footer code and header. Identify all fields in Part I. Verify all deletions in Part II. Check stamps, signatures, weights, dates, and cross-reference with any supporting documents or photos provided.

Return the report via the submit_check_report tool. Do not return prose.`
  });

  console.log(`[check] ${userContent.length} content blocks, cert_type hint: ${userCertType}`);

  // Adaptive max_tokens: start with 6000, retry with 8192 if truncated
  let response = await callClaudeAPI(6000, userContent, ruleSet, 'initial attempt');

  if (response.stop_reason === 'max_tokens') {
    console.log(`[check] Output truncated at max_tokens=6000. Retrying with max_tokens=8192...`);
    response = await callClaudeAPI(8192, userContent, ruleSet, 'retry attempt');
  }

  const toolUseBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolUseBlock) {
    console.error('No tool_use block in response:', JSON.stringify(response.content));
    throw new Error('Claude did not use the submit_check_report tool as required');
  }

  const report = toolUseBlock.input;

  if (response.stop_reason === 'max_tokens') {
    report.truncated = true;
    console.log(`[check] WARNING: Report truncated even at max_tokens=8192. Returning with truncated flag set.`);
  }

  const processingTime = (Date.now() - requestStart) / 1000;
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
 * Pre-warm the Anthropic prompt cache by making a minimal API call
 * with the same system block structure used in runCheck.
 * Returns elapsed ms on success, null on failure. Never throws.
 */
async function prewarmCache() {
  try {
    const ruleSet = loadRuleSet('dairy-uk-eu');
    console.log(`[prewarm] Starting cache prewarm for rule set ${ruleSet.id} v${ruleSet.version}`);

    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
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
      messages: [
        {
          role: 'user',
          content: 'Cache prewarm ping. Reply with the single word OK and nothing else.'
        }
      ]
    });

    const elapsed = Date.now() - startTime;
    const cacheCreation = response.usage.cache_creation_input_tokens || 0;
    console.log(`[prewarm] Cache pre-warmed in ${elapsed}ms (cache_creation: ${cacheCreation} tokens)`);
    return elapsed;
  } catch (error) {
    console.log(`[prewarm] Failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  parseMultipartForm,
  runCheck,
  loadRuleSet,
  loadLibraries,
  prewarmCache
};
