// System prompt is built dynamically from two parts:
//   1. ENGINE_PROMPT — generic instructions on how to read a certificate PDF
//      and use the submit_check_report tool. Commodity-agnostic.
//   2. Layered rule set — composed at request time from three layers
//      (core + route + commodity) for the detected certificate type via
//      loadRuleSetForCertificate(certificateType, tenantId).
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

const RULES_DIR = path.join(process.cwd(), 'rules');

function readRegistry() {
  return JSON.parse(fs.readFileSync(path.join(RULES_DIR, '_registry.json'), 'utf-8'));
}

function unwrapEntries(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.entries)) return raw.entries;
  return [];
}

/**
 * Format a calibration notes array as a markdown section ready to append
 * to a rule set system prompt. Filters by certificate type via appliesTo
 * field: notes with appliesTo === 'all' or an array containing 'all' or
 * the provided certType are included. Notes with unknown certType or
 * empty appliesTo default to include (fail-open — missing metadata must
 * never silently drop a note).
 *
 * @param {Array<object>} notes - calibration note entries
 * @param {string} certType - certificate type code, e.g. '8468', '8322'
 * @returns {string} markdown block, or empty string if no notes apply
 */
function formatCalibrationNotes(notes, certType) {
  if (!Array.isArray(notes) || notes.length === 0) return '';

  const applicable = notes.filter(n => {
    if (!n || !n.appliesTo) return true; // fail-open
    if (n.appliesTo === 'all') return true;
    if (Array.isArray(n.appliesTo)) {
      if (n.appliesTo.length === 0) return true;
      if (n.appliesTo.includes('all')) return true;
      if (certType && n.appliesTo.includes(certType)) return true;
      return false;
    }
    return true; // unknown shape — fail-open
  });

  if (applicable.length === 0) return '';

  const lines = ['## Part E — Calibration Notes', ''];
  for (const n of applicable) {
    const id = n.id || '(no id)';
    const title = n.title || '';
    const heading = title ? `**${id} — ${title}**` : `**${id}**`;
    lines.push(heading);
    if (n.description) lines.push(n.description);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/**
 * Retraction patterns that indicate the model self-contradicted inside
 * a flag body. Conservative by design: prefers false negatives (a
 * retraction not caught) over false positives (a real flag hidden).
 *
 * Each pattern is case-insensitive. Matches against concatenation of
 * flag.title + flag.description + flag.details + flag.explanation
 * (any of these may be the schema field in use).
 */
const RETRACTION_PATTERNS = [
  // Existing patterns (14)
  /removing this flag/i,
  /no error\s*[—-]\s*confirming pass/i,
  /this is not a hard error/i,
  /this is not an error/i,
  /after full review this is not/i,
  /upon[^.]{0,40}review[^.]{0,40}acceptable/i,
  /re-examining/i,
  /withdrawing this/i,
  /self-retracted/i,
  /on closer inspection/i,
  /this flag is retracted/i,
  /flag retracted/i,
  /actually this is a pass/i,
  /on second thought this is correct/i,

  // New patterns from 23 April Glenkrag live test
  /retract(ing|ed)\s+(this\s+)?(flag|entry|finding)/i,
  /this entry is retracted/i,
  /no hard error on/i,
  /no hard error,? /i,
  /see flag emission discipline/i,
  /per (?:the )?(?:observation|flag emission) discipline/i,
  /technically permitted\.?\s+(?:no|not)/i,
  /(?:is|are) consistent\s*[—-]\s*no (?:hard )?error/i
];

/**
 * Decide whether a flag was effectively retracted by the model.
 *
 * Decision tree:
 * - If flag.final_conclusion === 'retracted' → true (Layer 1 structural)
 * - If flag.final_conclusion === 'confirmed' → false (Layer 1 authoritative;
 *   respect model's explicit confirmation, do not override via patterns.
 *   Prevents legitimate severity downgrades being mis-detected as retractions.)
 * - Otherwise (no structural signal): fall through to pattern matching
 *   against RETRACTION_PATTERNS (Layer 2 safety net).
 */
function isRetractedFlag(flag) {
  if (!flag) return false;

  // Layer 1: structural signal is authoritative when present.
  // If model explicitly declared 'confirmed', respect that and do NOT
  // fall through to pattern matching. This prevents Layer 2 from
  // overriding a valid severity downgrade (e.g. "no hard error is
  // raised. This notice is downgraded to medium warning.") as a
  // false retraction.
  if (flag.final_conclusion === 'retracted') return true;
  if (flag.final_conclusion === 'confirmed') return false;

  // Layer 2: pattern matching is only a safety net for when the
  // model failed to set final_conclusion at all.
  const body = [
    flag.title,
    flag.description,
    flag.details,
    flag.explanation,
    flag.body,
    flag.note
  ].filter(v => typeof v === 'string').join(' \n ');
  if (!body) return false;
  return RETRACTION_PATTERNS.some(p => p.test(body));
}

/**
 * Post-process a report object returned by Claude:
 * - Mark each flag with retracted: true/false.
 * - Recompute counters over non-retracted flags only.
 * - Recompute overall_verdict: PASS if zero hard and zero medium among
 *   non-retracted flags, otherwise HOLD. Low notices never cause HOLD.
 * - Log a summary of what changed.
 *
 * Mutates and returns the report.
 */
function postProcessReport(report) {
  if (!report || !Array.isArray(report.flags)) return report;

  const flags = report.flags;
  const retracted = [];
  const active = [];

  for (const flag of flags) {
    if (isRetractedFlag(flag)) {
      flag.retracted = true;
      retracted.push(flag);
    } else {
      flag.retracted = false;
      active.push(flag);
    }
  }

  const activeCounters = {
    hard_errors: active.filter(f => f.severity === 'hard').length,
    medium_warnings: active.filter(f => f.severity === 'medium').length,
    low_notices: active.filter(f => f.severity === 'low').length
  };

  const modelCounters = report.counters || {};
  const newVerdict = (activeCounters.hard_errors === 0 && activeCounters.medium_warnings === 0)
    ? 'PASS'
    : 'HOLD';
  const modelVerdict = report.overall_verdict;

  console.log(`[post-process] Input: ${flags.length} total flags ` +
    `(model counters: ${modelCounters.hard_errors||0} hard / ` +
    `${modelCounters.medium_warnings||0} medium / ` +
    `${modelCounters.low_notices||0} low)`);

  if (retracted.length > 0) {
    console.log(`[post-process] Removed ${retracted.length} retracted flag(s):`);
    for (const f of retracted) {
      const label = (f.severity || '?').toUpperCase();
      const title = f.title || f.description?.substring(0, 80) || '(no title)';
      console.log(`[post-process]   - [${label}] ${title}`);
    }
  } else {
    console.log('[post-process] No retracted flags detected.');
  }

  console.log(`[post-process] Output: ${active.length} active flags ` +
    `(filtered counters: ${activeCounters.hard_errors} hard / ` +
    `${activeCounters.medium_warnings} medium / ` +
    `${activeCounters.low_notices} low)`);

  if (newVerdict !== modelVerdict) {
    console.log(`[post-process] Verdict changed: ${modelVerdict} -> ${newVerdict} (after filtering)`);
  } else {
    console.log(`[post-process] Verdict unchanged: ${newVerdict}`);
  }

  // Sanity check: does post-processing account for all retractions the
  // model implicitly declared via counter discrepancy?
  const modelTotal = (modelCounters.hard_errors || 0) +
                     (modelCounters.medium_warnings || 0) +
                     (modelCounters.low_notices || 0);
  const arrayTotal = flags.length;
  const modelImpliedRetractions = Math.max(0, arrayTotal - modelTotal);
  const filterDetectedRetractions = retracted.length;

  if (modelImpliedRetractions > 0 && filterDetectedRetractions < modelImpliedRetractions) {
    console.warn(`[post-process] SANITY: model counters imply ${modelImpliedRetractions} retraction(s) but filter detected only ${filterDetectedRetractions}. Some retractions may have slipped through.`);
  } else if (modelImpliedRetractions === 0 && filterDetectedRetractions > 0) {
    console.log(`[post-process] Note: model did not retract in counters, but filter marked ${filterDetectedRetractions} flag(s) as retracted via patterns.`);
  } else if (modelImpliedRetractions > 0 && filterDetectedRetractions >= modelImpliedRetractions) {
    console.log(`[post-process] Sanity OK: filter caught ${filterDetectedRetractions} >= model-implied ${modelImpliedRetractions} retraction(s).`);
  }

  report.counters = activeCounters;
  report.overall_verdict = newVerdict;
  report.retracted_count = retracted.length;

  return report;
}

function resolveLayerPath(layerRef, registry) {
  if (layerRef === 'core') {
    return path.join(RULES_DIR, registry.layers.core);
  }
  if (layerRef.startsWith('routes.')) {
    const routeId = layerRef.slice('routes.'.length);
    const routePath = registry.layers.routes[routeId];
    if (!routePath) throw new Error(`Unknown route layer: ${routeId}`);
    return path.join(RULES_DIR, routePath);
  }
  if (layerRef.startsWith('commodities.')) {
    const commodityId = layerRef.slice('commodities.'.length);
    const commodityPath = registry.layers.commodities[commodityId];
    if (!commodityPath) throw new Error(`Unknown commodity layer: ${commodityId}`);
    return path.join(RULES_DIR, commodityPath);
  }
  throw new Error(`Unrecognised layer reference: ${layerRef}`);
}

/**
 * Load a fully composed rule set for a single certificate type.
 * Reads the layered structure from rules/_registry.json, concatenates the
 * relevant markdown files in layer order, merges JSON libraries, and collects
 * calibration notes. The returned systemPrompt is ready to paste into a
 * Claude system message.
 *
 * @param {string} certificateType - e.g. '8468', '8322', '8384' …
 * @param {string|null} tenantId - optional tenant id for a practice overlay.
 *                                  Defaults to DEFAULT_TENANT_ID env var or
 *                                  registry.defaultTenant.
 * @returns {{ systemPrompt: string, libraries: object, calibrationNotes: array, metadata: object }}
 */
function loadRuleSetForCertificate(certificateType, tenantId = null) {
  const registry = readRegistry();
  const certEntry = registry.certificateTypes[certificateType];
  if (!certEntry) {
    throw new Error(`Certificate type not found in registry: ${certificateType}`);
  }

  const markdownParts = [];
  const libraries = {};
  const calibrationNotes = [];

  const mergeLibDir = (libsDir) => {
    if (!fs.existsSync(libsDir)) return;
    for (const f of fs.readdirSync(libsDir).filter(n => n.endsWith('.json'))) {
      const key = path.basename(f, '.json');
      const raw = JSON.parse(fs.readFileSync(path.join(libsDir, f), 'utf-8'));
      libraries[key] = (libraries[key] || []).concat(unwrapEntries(raw));
    }
  };

  const mergeCalibrationFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    calibrationNotes.push(...unwrapEntries(raw));
  };

  for (const layerRef of certEntry.layerComposition) {
    const layerPath = resolveLayerPath(layerRef, registry);

    for (const candidate of ['rule_set.md', 'route.md']) {
      const mdPath = path.join(layerPath, candidate);
      if (fs.existsSync(mdPath)) {
        markdownParts.push(`=== Layer: ${layerRef} (${candidate}) ===\n\n${fs.readFileSync(mdPath, 'utf-8')}`);
        break;
      }
    }

    mergeLibDir(path.join(layerPath, 'libraries'));
    mergeCalibrationFile(path.join(layerPath, 'calibration-notes.json'));

    const routesDir = path.join(layerPath, 'routes');
    if (fs.existsSync(routesDir)) {
      for (const f of fs.readdirSync(routesDir).filter(n => n.endsWith('.json'))) {
        mergeCalibrationFile(path.join(routesDir, f));
      }
    }
  }

  const commodityLayerRef = certEntry.layerComposition.find(l => l.startsWith('commodities.'));
  if (commodityLayerRef) {
    const commodityPath = resolveLayerPath(commodityLayerRef, registry);
    const commodityFile = path.join(commodityPath, certEntry.commodityFile);
    if (fs.existsSync(commodityFile)) {
      markdownParts.push(`=== Certificate type: ${certificateType} (${certEntry.commodityFile}) ===\n\n${fs.readFileSync(commodityFile, 'utf-8')}`);
    } else {
      throw new Error(`Commodity file not found for ${certificateType}: ${commodityFile}`);
    }
  }

  const effectiveTenantId = tenantId || process.env.DEFAULT_TENANT_ID || registry.defaultTenant;
  const tenant = registry.tenants[effectiveTenantId] || null;

  if (tenant && tenant.practiceLayer) {
    const practicePath = path.join(RULES_DIR, tenant.practiceLayer);
    const practiceMd = path.join(practicePath, 'practice.md');
    if (fs.existsSync(practiceMd)) {
      markdownParts.push(`=== Tenant practice layer: ${effectiveTenantId} ===\n\n${fs.readFileSync(practiceMd, 'utf-8')}`);
    }
    mergeLibDir(path.join(practicePath, 'libraries'));
    mergeCalibrationFile(path.join(practicePath, 'calibration-notes.json'));
  }

  const baseMarkdown = markdownParts.join('\n\n');
  const calibrationBlock = formatCalibrationNotes(calibrationNotes, certificateType);
  const composedSystemPrompt = calibrationBlock
    ? `${baseMarkdown}\n\n${calibrationBlock}`
    : baseMarkdown;

  return {
    systemPrompt: composedSystemPrompt,
    libraries,
    calibrationNotes,
    metadata: {
      version: registry.version,
      versionDate: registry.versionDate,
      certificateType,
      title: certEntry.title,
      tenantId: effectiveTenantId,
      tenantOvName: tenant ? tenant.ovName : null
    }
  };
}

/**
 * @deprecated Use loadRuleSetForCertificate(certificateType, tenantId) instead.
 *
 * Backward-compatibility shim. Accepts either a certificate type code (e.g.
 * '8468') or a commodity id (e.g. 'dairy-uk-eu'). For a commodity id it
 * composes a combined rule set covering every certificate type under that
 * commodity. Returns the old shape: { id, name, version, versionDate,
 * markdown, certificateTypes }. New code should detect the certificate type
 * first and call loadRuleSetForCertificate directly.
 */
function loadRuleSet(ruleSetId) {
  const registry = readRegistry();

  if (registry.certificateTypes[ruleSetId]) {
    const rs = loadRuleSetForCertificate(ruleSetId);
    return {
      id: ruleSetId,
      name: rs.metadata.title,
      version: rs.metadata.version,
      versionDate: rs.metadata.versionDate,
      markdown: rs.systemPrompt,
      certificateTypes: [{ code: ruleSetId, name: rs.metadata.title }]
    };
  }

  const matchingCertTypes = Object.entries(registry.certificateTypes)
    .filter(([, entry]) => entry.layerComposition.includes(`commodities.${ruleSetId}`));

  if (matchingCertTypes.length === 0) {
    throw new Error(`Rule set not found: ${ruleSetId} (neither a certificate type nor a commodity)`);
  }

  const markdownParts = [];
  for (const [code, entry] of matchingCertTypes) {
    const rs = loadRuleSetForCertificate(code);
    markdownParts.push(`=== Certificate type ${code} — ${entry.title} ===\n\n${rs.systemPrompt}`);
  }

  return {
    id: ruleSetId,
    name: `Combined rule set for ${ruleSetId}`,
    version: registry.version,
    versionDate: registry.versionDate,
    markdown: markdownParts.join('\n\n---\n\n'),
    certificateTypes: matchingCertTypes.map(([code, entry]) => ({ code, name: entry.title }))
  };
}

/**
 * @deprecated Libraries are now returned by loadRuleSetForCertificate under
 * `.libraries`. This shim remains for callers that still pass a commodity id
 * or certificate type code.
 */
function loadLibraries(ruleSetId) {
  const registry = readRegistry();

  if (registry.certificateTypes[ruleSetId]) {
    return loadRuleSetForCertificate(ruleSetId).libraries;
  }

  const merged = {};
  for (const [code, entry] of Object.entries(registry.certificateTypes)) {
    if (entry.layerComposition.includes(`commodities.${ruleSetId}`)) {
      const libs = loadRuleSetForCertificate(code).libraries;
      for (const [key, entries] of Object.entries(libs)) {
        merged[key] = (merged[key] || []).concat(entries);
      }
    }
  }
  return merged;
}

const TOOL_DEFINITION = {
  name: 'submit_check_report',
  description: 'Submit the structured check report after analyzing the certificate against the rule set. You MUST use this tool to return your findings. Do not return prose.',
  input_schema: {
    type: 'object',
    required: ['certificate_info', 'overall_verdict', 'counters', 'flags', 'report_mode'],
    properties: {
      report_mode: {
        type: 'string',
        enum: ['training', 'full'],
        description: 'Required. The format of the report to produce. `training` (default) returns the condensed I3 format: certificate_info, overall_verdict, counters, flags, and rule_set_update_recommendations only — omit the `sections` array entirely. `full` returns the I2 audit format: all of the above PLUS the `sections` array with the 5 numbered sections and per-field PASS/FAIL/WARNING/NOTICE checks.'
      },
      certificate_info: {
        type: 'object',
        required: ['certificate_ref', 'certificate_type'],
        properties: {
          certificate_ref: { type: 'string', description: 'e.g. "26/2/085165"' },
          certificate_type: { type: 'string', enum: ['8468', '8322', '8384', '8324', '8350', '8436', '8471', 'unknown'], description: 'Detected from footer code (e.g. 8468EHC, 8322EHC, 8384EHC, 8324EHC, 8350EHC, 8436EHC, 8471EHC) or header text' },
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
          gross_weight_kg: {
            type: 'number',
            description: 'Gross weight in kilograms from I.22 (or I.20 if I.22 absent). Optional — populate when visible on the certificate. Used for cross-reference with despatch documents which typically show gross weight.'
          },
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
          required: ['severity', 'field_reference', 'title', 'description', 'final_conclusion'],
          properties: {
            severity: { type: 'string', enum: ['hard', 'medium', 'low'] },
            field_reference: { type: 'string', description: 'e.g. "I.1 / I.11" or "Part II II.2.1" or "Signing page"' },
            title: { type: 'string', description: 'Short title for the flag' },
            description: { type: 'string', description: 'Detailed explanation of the issue and any context' },
            final_conclusion: {
              type: 'string',
              enum: ['confirmed', 'retracted'],
              description: 'MANDATORY. Your own assessment of this specific flag after writing its description.\n\nSet to \'confirmed\' if the flag represents a real finding at the severity you chose (hard, medium, or low). A finding that you chose to emit as medium or low rather than hard is still a confirmed finding — it exists at that severity and requires OV attention at that level. Confirmed is the default for any flag you intentionally included in the report.\n\nSet to \'retracted\' ONLY if the issue should not appear as a flag at any severity. This means the observation turned out to be: a misreading on closer inspection, a valid normal variation, a typographical artefact, or otherwise not a finding at all. Phrases like \'retracting this\', \'removing this flag\', \'upon review this is acceptable\', \'actually this is correct\', or \'no error — confirming pass\' all indicate retraction.\n\nImportant distinction:\n- Downgrade (e.g. \'this is not a hard error, only a medium warning\'): final_conclusion = \'confirmed\' because the finding is real at medium severity.\n- Retraction (e.g. \'on review this is not an error at all\'): final_conclusion = \'retracted\' because no finding remains.\n\nThere is no middle ground. Every flag MUST have a value of either \'confirmed\' or \'retracted\'.'
            }
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

const OBSERVATION_DISCIPLINE_PROMPT = `CRITICAL: Report observations literally. When describing certificate content in the check report — footer codes, field values, stamps, signatures, batch numbers, dates, or any other visible element — always describe what you see on the page, not what the rule set or a typical template would predict. Templates vary; the rule set describes typical patterns but does not guarantee them. If what you observe differs from the rule set description, that is a finding worth flagging as a rule set update recommendation, not a discrepancy to silently paper over.

ZERO TOLERANCE for self-retracted flags. Before finalising any flag, search your own draft output for these phrases: 'Re-examining', 'Withdrawing this', 'Self-retracted', 'On closer inspection', 'Actually this', 'This flag is retracted', 'Flag retracted'. If ANY of these phrases appear in your flag body, that flag is INVALID and MUST be removed from the report before it is submitted. Do not include it as 'retracted' or with a note. Delete it entirely. A report with a retracted flag is a failed report. There is no middle ground: either emit a concluded finding, or emit nothing for that observation. The flag count and verdict must be computed AFTER self-retracted flags are removed, not before.`;

const FINAL_FLAG_CHECK_PROMPT = `FINAL CHECK BEFORE OUTPUT: Review your complete flag list. For any flag whose body contains retraction or self-correction language (Re-examining, Withdrawing, Self-retracted, On closer inspection, Actually this is a pass, etc.), remove that flag entirely. Do not include retracted flags in the report under any circumstances. The hard / medium / low counts must reflect only concluded findings. Additionally, for every flag you do emit, set final_conclusion explicitly to either 'confirmed' (real finding) or 'retracted' (flag body concludes it is not an error). This schema field is your ground truth — if in doubt whether a flag is real, set final_conclusion='retracted' and explain why in the description.`;

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
- Extract gross weight into the \`gross_weight_kg\` field of certificate_info when it is visible. The primary source is I.22; if I.22 is empty, fall back to I.20. If neither field carries a gross weight figure, leave \`gross_weight_kg\` unset rather than guessing or copying the net weight. Gross weight on the certificate is the figure most commonly cross-referenced against despatch / delivery notes.
- Honour the \`report_mode\` instruction in the user message. In \`training\` mode, omit the \`sections\` array entirely from the tool input. In \`full\` mode, populate the \`sections\` array completely with all 5 numbered sections and per-field checks. The \`report_mode\` field in the tool input must match the mode requested in the user message.

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

async function runCheck({ files, fields, mode = 'training' }) {
  if (mode !== 'training' && mode !== 'full') {
    const err = new Error("Invalid report mode. Use 'training' or 'full'.");
    err.statusCode = 400;
    throw err;
  }

  const requestStart = Date.now();
  console.log(`[check] Request received at ${new Date().toISOString()} (mode=${mode})`);

  // Classify all uploaded files. The frontend may send manual overrides
  // as a JSON field (`classification_overrides`) — pass through so the
  // server-side reclassification honours user dropdown choices.
  const fileObjects = files.map(f => ({ filename: f.filename, buffer: f.buffer, mimetype: f.mimetype }));
  let overrides = {};
  if (fields && fields.classification_overrides) {
    try { overrides = JSON.parse(fields.classification_overrides) || {}; } catch (_) { overrides = {}; }
  }
  const classification = await classifyFiles(fileObjects, overrides);

  if (!classification.certificate) {
    const err = new Error('No certificate found in uploaded files. Please include at least one PDF.');
    err.statusCode = 400;
    throw err;
  }

  const cert = classification.certificate;
  console.log(`[check] Classified: 1 certificate (cert_type: ${cert.cert_type || 'unknown'}), ${classification.supporting_documents.length} supporting, ${classification.photos.length} photos (fallback: ${classification.fallback_used})`);

  // Find the original file buffer for the certificate by matching filename
  const certFile = files.find(f => f.filename === cert.filename);

  // Load the rule set for the detected certificate type. If the classifier
  // hasn't produced a type (or produced one the registry doesn't know), fall
  // back to the deprecated commodity shim so behaviour is unchanged.
  let ruleSet;
  if (cert.cert_type) {
    try {
      const rs = loadRuleSetForCertificate(cert.cert_type);
      ruleSet = {
        version: rs.metadata.version,
        versionDate: rs.metadata.versionDate,
        markdown: rs.systemPrompt
      };
    } catch (_) {
      ruleSet = loadRuleSet('dairy-uk-eu');
    }
  } else {
    ruleSet = loadRuleSet('dairy-uk-eu');
  }

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
  const modeInstruction = mode === 'training'
    ? 'Report mode for this submission: TRAINING. Set `report_mode` to "training" in the tool input. Produce the condensed I3 format defined in the rule set: certificate_info, overall_verdict, counters, flags (in severity order), and rule_set_update_recommendations. DO NOT include the `sections` array — omit it entirely. The full audit report is generated separately on demand.'
    : 'Report mode for this submission: FULL. Set `report_mode` to "full" in the tool input. Produce the complete I2 audit format defined in the rule set: certificate_info, overall_verdict, counters, flags (in severity order), the full `sections` array with all 5 numbered sections (Preliminary Checks, Part I Field-by-Field, Weight/Date/Document Cross-Check, Part II and Stamps, Rule Set Update Recommendations) populated with per-field PASS/FAIL/WARNING/NOTICE checks, and rule_set_update_recommendations. This is the audit-grade artefact for BCP queries and post-check reference.';

  userContent.push({
    type: 'text',
    text: `Please analyze this EHC and produce a structured check report using the submit_check_report tool.

User-selected certificate type: ${userCertType}
Original filename: ${cert.filename}

${modeInstruction}

Apply the rule set thoroughly. Detect the certificate type from the footer code and header. Identify all fields in Part I. Verify all deletions in Part II. Check stamps, signatures, weights, dates, and cross-reference with any supporting documents or photos provided.

Return the report via the submit_check_report tool. Do not return prose.`
  });

  const maxTokens = mode === 'full' ? 16000 : 4096;
  console.log(`[check] Calling Claude API with ${userContent.length} content blocks, cert_type hint: ${userCertType}, max_tokens: ${maxTokens}`);
  const startTime = Date.now();
  const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: `Today's date is ${todayFormatted}.\n\n${OBSERVATION_DISCIPLINE_PROMPT}`
      },
      {
        type: 'text',
        text: ENGINE_PROMPT
      },
      {
        type: 'text',
        text: `=== RULE SET v${ruleSet.version} ===\n\n${ruleSet.markdown}`,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: FINAL_FLAG_CHECK_PROMPT
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

  report.report_mode = mode;
  report.rule_set_version = `${ruleSet.version} — ${ruleSet.versionDate}`;
  report.checker_model = MODEL;
  report.processing_time_seconds = processingTime;
  report.tokens_used = {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
    cache_creation: response.usage.cache_creation_input_tokens || 0,
    cache_read: response.usage.cache_read_input_tokens || 0
  };

  postProcessReport(report);

  console.log(`[check] Total processing time: ${Date.now() - requestStart}ms`);
  return report;
}

/**
 * Classify uploaded files by type: certificate, supporting_document, photo, or unsupported.
 * Uses pdf-parse to detect EHC pattern in PDFs for certificate identification.
 */
const DAIRY_COMMODITY_KEYWORDS = ['whey', 'milk', 'dairy', 'lactose', 'casein'];
const PETFOOD_COMMODITY_KEYWORDS = ['petfood', 'canned', 'tinned', 'pet food'];

/**
 * Stage 0a — Detect EHC reference pattern in filename.
 *
 * Real-world OV practice produces these variants for the same load:
 *   EHC 26-2-097680
 *   EHC 26.2.097680
 *   EHC 26/2/097680
 *   26-2-097680  (no EHC prefix)
 *   HC 26-2-097680  (copy-paste dropped the leading E)
 *
 * Pattern is year-agnostic (25-2, 26-2, 27-2, ...) — six digits at the
 * end. Returns { matched: true, ref: '26-2-097680' } or { matched: false }.
 */
function detectEhcInFilename(filename) {
  if (!filename) return { matched: false };
  const pattern = /(?:EHC|HC)?[\s._\-/]*(\d{2})[\s._\-/]+2[\s._\-/]+(\d{6})/i;
  const m = filename.match(pattern);
  if (!m) return { matched: false };
  return { matched: true, ref: `${m[1]}-2-${m[2]}` };
}

/**
 * Stage 0b — Detect supporting-document hints in filename.
 *
 * Returns { matched: true, hint: 'cominv' } when a hint is found, or
 * { matched: false } otherwise. The hint string is used in console
 * logs to explain the classification decision.
 */
function detectSupportingInFilename(filename) {
  if (!filename) return { matched: false };
  const lower = filename.toLowerCase();
  const hints = [
    'delivery note', 'deliverynote', 'dn ',
    'cominv', 'commercial invoice', 'invoice',
    'pallet label', 'pallet', 'allocation', 'picklist',
    'dispatch'
  ];
  for (const hint of hints) {
    if (lower.includes(hint)) return { matched: true, hint };
  }
  return { matched: false };
}

/**
 * Detect the certificate type code from extracted PDF text.
 *
 * Three-stage detection cascade:
 *   1. Footer regex (\d{4})EHC — works for human-consumption templates
 *      (8468, 8384, 8350, 8436, 8471) which carry '<code>EHC <lang>' in
 *      the page footer.
 *   2. Registry headerKeywords substring match — fallback for
 *      non-human-consumption templates (8322 confirmed, 8324 TBC) whose
 *      footers carry only a language code.
 *   3. bodyKeywords multi-anchor match — relies on field I.25 'Commodity
 *      certified for' with its four tickbox labels, which appears on
 *      8322 and 8324 but NOT on human-consumption certificates. Requires
 *      the field sentinel plus at least 2 of the 4 tickbox labels to
 *      guard against false positives.
 *
 * Stage-3 ambiguity resolution: both 8322 and 8324 share the same I.25
 * anchors. When both match, we disambiguate by commodity keywords
 * searched outside the I.25 tickbox span (so the 'petfood' that appears
 * in the 'Production of petfood' tickbox label doesn't false-positive
 * every 8322 cert).
 *
 * Returns the 4-digit certificate code as a string, the literal
 * '8322-or-8324-ambiguous' marker when I.25 matches but commodity
 * differentiation fails, or null if no type could be identified.
 */
function detectCertType(pdfText) {
  if (!pdfText) return null;

  // Stage 1: footer regex (human-consumption family)
  const footerMatch = pdfText.substring(0, 4000).match(/(\d{4})EHC/i);
  if (footerMatch) return footerMatch[1];

  const registry = readRegistry();
  const haystack = pdfText.toLowerCase();

  // Stage 2: header keyword substring match
  for (const [code, entry] of Object.entries(registry.certificateTypes)) {
    const keywords = (entry.detection && entry.detection.headerKeywords) || [];
    for (const kw of keywords) {
      if (kw && haystack.includes(kw.toLowerCase())) return code;
    }
  }

  // Stage 3: body multi-anchor match (I.25 tickbox field)
  const candidates = [];
  for (const [code, entry] of Object.entries(registry.certificateTypes)) {
    const bodyKeywords = (entry.detection && entry.detection.bodyKeywords) || [];
    if (bodyKeywords.length < 2) continue;

    const [fieldSentinel, ...tickboxLabels] = bodyKeywords;
    if (!haystack.includes(fieldSentinel.toLowerCase())) continue;

    const tickboxMatches = tickboxLabels.filter(
      kw => haystack.includes(kw.toLowerCase())
    ).length;
    if (tickboxMatches >= 2) candidates.push(code);
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple stage-3 candidates: disambiguate by commodity keywords in
  // text OUTSIDE the I.25 tickbox span (so tickbox labels themselves
  // don't false-match — 'petfood' appears in 'Production of petfood').
  const i25Mask = /Commodity certified for[\s\S]*?Technical use/i;
  const commodityHaystack = haystack.replace(i25Mask, '');
  const hasDairy = DAIRY_COMMODITY_KEYWORDS.some(k => commodityHaystack.includes(k));
  const hasPetfood = PETFOOD_COMMODITY_KEYWORDS.some(k => commodityHaystack.includes(k));

  if (hasDairy && !hasPetfood && candidates.includes('8322')) return '8322';
  if (hasPetfood && !hasDairy && candidates.includes('8324')) return '8324';

  if (candidates.includes('8322') && candidates.includes('8324')) {
    return '8322-or-8324-ambiguous';
  }
  return candidates[0];
}

/**
 * Classify uploaded files into certificate / supporting / photo / unclassified.
 *
 * Detection cascade per PDF (in order):
 *   Stage 0a — filename matches EHC reference pattern → strong Certificate signal
 *   Stage 0b — filename contains supporting-doc hint   → strong Supporting signal
 *   Stages 1-3 — content peek via detectCertType()     → Certificate candidate (with cert_type)
 *   No signal — file goes to 'unclassified', awaiting user disambiguation
 *
 * Signal combination rules:
 *   - filename Cert + content Cert (any cert_type)         → confidence 'high'
 *   - filename Cert only OR content Cert only              → confidence 'medium'
 *   - filename Cert + content Supporting                   → prefer filename, log warning, 'medium'
 *   - filename Supporting + content Cert                   → prefer filename, log warning, 'medium'
 *   - no signal at all                                     → 'unclassified', confidence 'low'
 *
 * Multiple Certificate candidates: first by upload order wins (composite
 * consignments will need explicit handling later). Others stay as
 * supporting_document with a `was_certificate_candidate: true` marker.
 *
 * Manual overrides (optional second arg): a map keyed by filename to a
 * forced classification ('certificate' | 'supporting_document' | 'photo' |
 * 'skip'). Files marked 'skip' are excluded from the response entirely.
 * Used by /api/check to honour the per-file override dropdown.
 */
async function classifyFiles(files, overrides = {}) {
  const classified = [];

  for (const file of files) {
    const { filename, buffer, mimetype } = file;
    const base = {
      filename,
      mimetype,
      size: buffer.length,
      classification_source: 'unclassified',
      confidence: 'low'
    };

    if (mimetype === 'application/pdf') {
      const ehcMatch = detectEhcInFilename(filename);
      const supportingMatch = detectSupportingInFilename(filename);

      let contentCertType = null;
      let parseError = false;
      try {
        const parsed = await pdfParse(buffer);
        contentCertType = detectCertType(parsed.text);
      } catch (_) {
        parseError = true;
      }

      // Combine signals
      if (ehcMatch.matched && contentCertType) {
        classified.push({
          ...base,
          kind: 'certificate_candidate',
          cert_type: contentCertType,
          ref_from_filename: ehcMatch.ref,
          classification_source: 'content_certificate',
          confidence: 'high'
        });
        console.log(`[classify] ${filename} → certificate (filename ref ${ehcMatch.ref} + content cert_type ${contentCertType}, confidence high)`);
      } else if (ehcMatch.matched && !contentCertType) {
        classified.push({
          ...base,
          kind: 'certificate_candidate',
          cert_type: null,
          ref_from_filename: ehcMatch.ref,
          classification_source: 'filename_certificate',
          confidence: 'medium',
          parse_error: parseError || undefined
        });
        console.log(`[classify] ${filename} → certificate (filename pattern, ref ${ehcMatch.ref})`);
      } else if (!ehcMatch.matched && contentCertType) {
        // Content peek says certificate. Check if filename suggests supporting —
        // that conflict means a renamed cert PDF; trust the filename per task rule.
        if (supportingMatch.matched) {
          console.warn(`[classify] ${filename} → supporting (filename hint: ${supportingMatch.hint}; content peek detected cert_type ${contentCertType} — filename wins per policy)`);
          classified.push({
            ...base,
            kind: 'supporting_document',
            classification_source: 'filename_supporting',
            confidence: 'medium',
            content_cert_type_override: contentCertType
          });
        } else {
          classified.push({
            ...base,
            kind: 'certificate_candidate',
            cert_type: contentCertType,
            classification_source: 'content_certificate',
            confidence: 'medium'
          });
          console.log(`[classify] ${filename} → certificate (content cert_type ${contentCertType})`);
        }
      } else if (supportingMatch.matched) {
        classified.push({
          ...base,
          kind: 'supporting_document',
          classification_source: 'filename_supporting',
          confidence: 'medium',
          parse_error: parseError || undefined
        });
        console.log(`[classify] ${filename} → supporting (filename hint: ${supportingMatch.hint})`);
      } else {
        // No signal at all
        classified.push({
          ...base,
          kind: 'unclassified',
          classification_source: 'unclassified',
          confidence: 'low',
          parse_error: parseError || undefined
        });
        console.log(`[classify] ${filename} → unclassified (no signals detected)`);
      }
    } else if (
      mimetype && mimetype.startsWith('image/') &&
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimetype)
    ) {
      classified.push({
        ...base,
        kind: 'photo',
        classification_source: 'mimetype_photo',
        confidence: 'high'
      });
    } else {
      classified.push({
        ...base,
        kind: 'unsupported',
        classification_source: 'unsupported',
        confidence: 'high'
      });
    }
  }

  // Apply manual overrides (from frontend dropdown). Overrides win over
  // auto-detection; we tag the file so the response shape carries the source.
  let userOverrideCount = 0;
  for (const item of classified) {
    const ov = overrides[item.filename];
    if (!ov) continue;
    userOverrideCount++;
    if (ov === 'skip') {
      item.kind = '_skipped';
      continue;
    }
    item.kind = ov === 'certificate' ? 'certificate_candidate' : ov;
    item.classification_source = 'user_override';
    item.confidence = 'high';
    if (ov === 'certificate' && !item.cert_type) {
      item.cert_type = null;
    }
    console.log(`[classify] ${item.filename} → ${ov} (user override)`);
  }

  // Drop skipped files — they won't be sent to Claude.
  const active = classified.filter(f => f.kind !== '_skipped');

  // Determine the certificate from candidates (first wins on upload order).
  let certificate = null;
  const candidateIndex = active.findIndex(f => f.kind === 'certificate_candidate');
  if (candidateIndex !== -1) {
    active[candidateIndex].kind = 'certificate';
    certificate = active[candidateIndex];
    for (let i = candidateIndex + 1; i < active.length; i++) {
      if (active[i].kind === 'certificate_candidate') {
        active[i].kind = 'supporting_document';
        active[i].was_certificate_candidate = true;
      }
    }
  }

  // Build classification_summary counters for the banner logic.
  const summary = {
    used_filename: active.filter(f =>
      f.classification_source === 'filename_certificate' ||
      f.classification_source === 'filename_supporting'
    ).length,
    used_content: active.filter(f => f.classification_source === 'content_certificate').length,
    used_combined: active.filter(f =>
      f.classification_source === 'content_certificate' && f.confidence === 'high'
    ).length,
    used_user_override: userOverrideCount,
    fully_unclassified: active.filter(f => f.kind === 'unclassified').length
  };

  return {
    certificate,
    supporting_documents: active.filter(f => f.kind === 'supporting_document'),
    photos: active.filter(f => f.kind === 'photo'),
    unclassified: active.filter(f => f.kind === 'unclassified'),
    unsupported: active.filter(f => f.kind === 'unsupported'),
    classification_summary: summary,
    fallback_used: false
  };
}

module.exports = {
  parseMultipartForm,
  runCheck,
  loadRuleSetForCertificate,
  loadRuleSet,
  loadLibraries,
  classifyFiles,
  detectCertType,
  detectEhcInFilename,
  detectSupportingInFilename,
  OBSERVATION_DISCIPLINE_PROMPT,
  ENGINE_PROMPT,
  FINAL_FLAG_CHECK_PROMPT
};
