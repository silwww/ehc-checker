const Anthropic = require('@anthropic-ai/sdk');
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';

function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
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

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);
    busboy.end(body);
  });
}

// Load rule set once at module startup (not on every request)
const RULE_SET = (() => {
  try {
    const ruleSetPath = path.join(process.cwd(), 'rules', '_source', 'rule_set_v1_5.md');
    return fs.readFileSync(ruleSetPath, 'utf-8');
  } catch (err) {
    console.error('Failed to load rule set at startup:', err.message);
    try {
      const altPath = path.join(__dirname, '..', '..', 'rules', '_source', 'rule_set_v1_5.md');
      return fs.readFileSync(altPath, 'utf-8');
    } catch (err2) {
      console.error('Alternative path also failed:', err2.message);
      return null;
    }
  }
})();

const TOOL_DEFINITION = {
  name: 'submit_ehc_report',
  description: 'Submit the structured EHC check report after analyzing the certificate against the rule set. You MUST use this tool to return your findings. Do not return prose.',
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
        enum: ['PASS', 'HOLD', 'FAIL'],
        description: 'PASS = no hard errors. HOLD = medium warnings that may cause BCP issues. FAIL = hard errors that will cause rejection.'
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

const SYSTEM_PROMPT = `You are the EHC Checker, an AI assistant that verifies UK Export Health Certificates for dairy products being exported to the EU. You analyze EHC PDFs against a comprehensive rule set and produce structured reports.

Your role:
- Analyze the uploaded EHC PDF carefully, including all pages, stamps, signatures, deletions, and field values
- Apply the rule set provided in the system context
- Identify any issues and classify them as hard errors (BCP will reject), medium warnings (BCP may reject), or low notices (valid variations)
- Produce a structured report using the submit_ehc_report tool

Key principles:
- Be thorough but not overly cautious. False positives are worse than missed issues — do not flag things that the rule set explicitly says to ignore.
- Read the calibration notes (Part E) carefully — they prevent common false positives like Z-strikes, blank fields, and ink color detection.
- When the rule set says "do not flag" or "normal practice", respect that.
- Use PAS (British English) spelling consistently in your descriptions.
- When referring to field values, quote them exactly as they appear on the certificate.
- For deletions, distinguish between Method 1 (pen strikethrough), Method 2 (Adobe strikethrough), and Method 3 (redaction/whiteout).

Output format:
- You MUST use the submit_ehc_report tool to return your findings.
- Do not return prose or natural language responses.
- Every field in certificate_info should be populated if possible. Use "N/A" or "not present" for fields that are genuinely absent.
- Flags should be ordered: hard errors first, then medium, then low.
- Sections should contain 5-10 checks each, covering the major verification points.

The rule set follows. It is cached for efficiency — treat it as your authoritative reference.`;

exports.handler = async (event, context) => {
  const requestStart = Date.now();
  console.log(`[check] Request received at ${new Date().toISOString()}`);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const parseStart = Date.now();
    const { files, fields } = await parseMultipartForm(event);
    const ehcFileLog = files.find(f => f.fieldname === 'ehc_pdf');
    console.log(`[check] Multipart parsed in ${Date.now() - parseStart}ms — ${files.length} file(s), EHC: ${ehcFileLog ? ehcFileLog.filename : 'N/A'}`);

    const ehcFile = files.find(f => f.fieldname === 'ehc_pdf');
    if (!ehcFile) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'EHC PDF is required (field name: ehc_pdf)' })
      };
    }

    if (!RULE_SET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Rule set not loaded',
          message: 'The rule set file could not be read at startup. Check that rules/_source/rule_set_v1_5.md exists.'
        })
      };
    }

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
      text: `Please analyze this EHC and produce a structured check report using the submit_ehc_report tool.

User-selected certificate type: ${userCertType}
Original filename: ${ehcFile.filename}

Apply the rule set thoroughly. Detect the certificate type from the footer code and header. Identify all fields in Part I. Verify all deletions in Part II. Check stamps, signatures, weights, dates, and cross-reference with any supporting documents or photos provided.

Return the report via the submit_ehc_report tool. Do not return prose.`
    });

    console.log(`[check] Calling Claude API with ${userContent.length} content blocks, cert_type hint: ${userCertType}`);
    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT
        },
        {
          type: 'text',
          text: `=== RULE SET v1.5 ===\n\n${RULE_SET}`,
          cache_control: { type: 'ephemeral' }
        }
      ],
      tools: [TOOL_DEFINITION],
      tool_choice: { type: 'tool', name: 'submit_ehc_report' },
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Claude did not use the submit_ehc_report tool as required',
          raw_response: response.content
        })
      };
    }

    const report = toolUseBlock.input;

    report.rule_set_version = '1.5 — April 2026';
    report.checker_model = MODEL;
    report.processing_time_seconds = processingTime;
    report.tokens_used = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cache_creation: response.usage.cache_creation_input_tokens || 0,
      cache_read: response.usage.cache_read_input_tokens || 0
    };

    console.log(`[check] Total processing time: ${Date.now() - requestStart}ms`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report)
    };

  } catch (error) {
    console.error(`[check] Error after ${Date.now() - requestStart}ms:`, error.message);
    console.error(error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
