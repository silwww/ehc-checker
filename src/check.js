// System prompt is built dynamically from two cached prefixes:
//   1. Engine layer — behavioural instructions on how to read a certificate
//      PDF, how to use the submit_check_report tool, and report-output
//      discipline. Loaded from rules/_engine/instructions.md via
//      loadEngineLayer(). Commodity- and route-agnostic.
//   2. Layered rule set — composed at request time from the engine layer
//      plus core + route + commodity layers for the detected certificate
//      type via loadRuleSetForCertificate(certificateType, tenantId).
// Each prefix has its own cache_control breakpoint so the engine layer and
// the rule set evolve independently without invalidating each other's cache.

const Anthropic = require('@anthropic-ai/sdk');
const Busboy = require('busboy');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

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
 * Format the loaded libraries object as a markdown block ready to append
 * to a rule set system prompt. Each library becomes a table with one row
 * per entry. Empty libraries are skipped. Field detection is dynamic — the
 * table columns come from the union of keys across entries, in stable
 * first-appearance order, so adding new fields to a library JSON
 * automatically reflects in the prompt without code changes.
 *
 * Library name mapping for human-friendly section headings:
 *   ovs              → "A12 — Authorised Official Veterinarians"
 *   bcps             → "A11 — Border Control Posts"
 *   consignees       → "H1 — Consignees"
 *   establishments   → "H2 — Approved Establishments"
 *   destinations     → "H3 — Destinations and approval numbers"
 *   logistics-agents → "H4 — Logistics agents and hauliers"
 *
 * Unknown library names fall back to a title-cased version of the key.
 *
 * @param {object} libraries - the libraries map built by loadRuleSetForCertificate
 * @returns {string} markdown block, or empty string if no libraries have entries
 */
function formatLibraries(libraries) {
  if (!libraries || typeof libraries !== 'object') return '';

  const NAME_MAP = {
    'ovs': 'A12 — Authorised Official Veterinarians',
    'bcps': 'A11 — Border Control Posts',
    'consignees': 'H1 — Consignees',
    'establishments': 'H2 — Approved Establishments',
    'destinations': 'H3 — Destinations and approval numbers',
    'logistics-agents': 'H4 — Logistics agents and hauliers'
  };

  const titleCase = (s) => s
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const sections = [];

  for (const [libKey, entries] of Object.entries(libraries)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;

    const heading = NAME_MAP[libKey] || titleCase(libKey);

    // Collect union of keys in stable first-appearance order.
    const keys = [];
    const seen = new Set();
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      for (const k of Object.keys(entry)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    if (keys.length === 0) continue;

    const headerRow = '| ' + keys.map(titleCase).join(' | ') + ' |';
    const separator = '|' + keys.map(() => '---').join('|') + '|';
    const rows = entries.map(entry => {
      const cells = keys.map(k => {
        const v = entry && entry[k];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      });
      return '| ' + cells.join(' | ') + ' |';
    });

    sections.push(`### ${heading}\n\n${headerRow}\n${separator}\n${rows.join('\n')}`);
  }

  if (sections.length === 0) return '';
  return `## Part H — Loaded Libraries\n\n${sections.join('\n\n')}`;
}

/**
 * Recompute counters and verdict from the flags array as emitted by the
 * model. Adaptive thinking means the model deliberates before the tool
 * call, so the flags array no longer contains self-retracted entries
 * that need filtering out. This post-pass exists only to guarantee that
 * counters and verdict are derived from the flags array — not to override
 * the model's own assessment of any individual flag.
 *
 * Mutates and returns the report.
 */
function postProcessReport(report) {
  if (!report || !Array.isArray(report.flags)) return report;

  const flags = report.flags;
  const counters = {
    hard_errors: flags.filter(f => f.severity === 'hard').length,
    medium_warnings: flags.filter(f => f.severity === 'medium').length,
    low_notices: flags.filter(f => f.severity === 'low').length
  };

  const newVerdict = (counters.hard_errors === 0 && counters.medium_warnings === 0)
    ? 'PASS'
    : 'HOLD';

  console.log(`[post-process] ${flags.length} flags — ${counters.hard_errors} hard / ${counters.medium_warnings} medium / ${counters.low_notices} low — verdict: ${newVerdict}`);

  report.counters = counters;
  report.overall_verdict = newVerdict;
  report.retracted_count = 0;

  return report;
}

function resolveLayerPath(layerRef, registry) {
  if (layerRef === 'engine') {
    // The engine layer is loaded separately by loadEngineLayer() and
    // composed into the system prompt as its own cache_control block.
    // It appears in layerComposition for documentation/order purposes;
    // resolving its path here lets loadRuleSetForCertificate() iterate
    // without throwing, but the folder contains only instructions.md
    // (no rule_set.md / route.md / libraries / calibration-notes.json)
    // so nothing gets concatenated into the rule set markdown.
    const engineEntry = registry.layers.engine;
    if (!engineEntry || !engineEntry.path) {
      throw new Error('Registry missing layers.engine.path');
    }
    return path.join(RULES_DIR, engineEntry.path);
  }
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
 * Load the engine layer (rules/_engine/instructions.md).
 * The engine layer is behavioural — how to read a certificate and how to
 * report findings — and is independent of any commodity, route, or rule
 * set version. It is loaded once per process lifetime and cached, since
 * the file does not change between requests (only on server restart).
 *
 * Returns { text, version, versionDate } where text is the markdown
 * contents and version/versionDate come from rules/_registry.json under
 * layers.engine. The returned object is suitable for placement as the
 * first cache_control block in the Claude system prompt.
 */
let engineLayerCache = null;

async function loadEngineLayer() {
  if (engineLayerCache) return engineLayerCache;

  const registry = JSON.parse(
    await fs.promises.readFile(path.join(__dirname, '../rules/_registry.json'), 'utf8')
  );
  const engineConfig = registry.layers.engine;
  if (!engineConfig) {
    throw new Error('Registry missing layers.engine — engine layer not configured');
  }

  const instructionsPath = path.join(
    __dirname,
    '../rules',
    engineConfig.path,
    'instructions.md'
  );
  const text = await fs.promises.readFile(instructionsPath, 'utf8');

  engineLayerCache = {
    text,
    version: engineConfig.version,
    versionDate: engineConfig.versionDate
  };
  return engineLayerCache;
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
function loadRuleSetForCertificate(certificateType, tenantId = null, pdfText = null, selectedConsignorId = null) {
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
      libraries[key] = (libraries[key] || []).concat(raw.entries || []);
    }
  };

  const mergeCalibrationFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    calibrationNotes.push(...(raw.entries || []));
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

  // Consignor section — appended after all commodity layers.
  // selectedConsignorId (from UI dropdown) takes priority over text detection.
  // Text detection runs only when no explicit selection is provided.
  let consignorMatch = null;

  if (selectedConsignorId) {
    // Direct lookup by consignorId in the routing table.
    const certEntry2 = registry.certificateTypes[certificateType];
    if (certEntry2 && Array.isArray(certEntry2.consignorRouting)) {
      const route = certEntry2.consignorRouting.find(r => r.consignorId === selectedConsignorId);
      if (route) {
        consignorMatch = { consignorId: route.consignorId, file: route.file, fallback: route.fallback || false };
        console.log(`[rule-set] Consignor section selected by OV: ${consignorMatch.consignorId}`);
      } else {
        console.warn(`[rule-set] Consignor '${selectedConsignorId}' not found in routing table for ${certificateType} — skipping consignor section`);
      }
    }
  } else if (pdfText) {
    consignorMatch = detectConsignor(certificateType, pdfText);
    if (consignorMatch && !consignorMatch.fallback) {
      console.log(`[rule-set] Consignor section detected from PDF text: ${consignorMatch.consignorId}`);
    } else if (consignorMatch && consignorMatch.fallback) {
      console.log(`[rule-set] Consignor routing: fallback (no consignor-specific section for this load)`);
    }
  }

  if (consignorMatch && consignorMatch.file && !consignorMatch.fallback) {
    const commodityLayerRef2 = certEntry.layerComposition.find(l => l.startsWith('commodities.'));
    if (commodityLayerRef2) {
      const commodityPath2 = resolveLayerPath(commodityLayerRef2, registry);
      const consignorFilePath = path.join(commodityPath2, consignorMatch.file);
      if (fs.existsSync(consignorFilePath)) {
        const consignorMd = fs.readFileSync(consignorFilePath, 'utf-8');
        markdownParts.push(
          `=== Consignor section: ${consignorMatch.consignorId} ===\n\n${consignorMd}`
        );
        console.log(`[rule-set] Consignor section loaded: ${consignorMatch.consignorId} (${consignorMatch.file})`);
      } else {
        console.warn(`[rule-set] Consignor file not found: ${consignorFilePath}`);
      }
    }
  }

  const baseMarkdown = markdownParts.join('\n\n');
  const calibrationBlock = formatCalibrationNotes(calibrationNotes, certificateType);
  const librariesBlock = formatLibraries(libraries);

  const parts = [baseMarkdown];
  if (calibrationBlock) parts.push(calibrationBlock);
  if (librariesBlock) parts.push(librariesBlock);
  const composedSystemPrompt = parts.join('\n\n');

  const libCounts = Object.entries(libraries)
    .filter(([, v]) => Array.isArray(v) && v.length > 0)
    .map(([k, v]) => `${k}:${v.length}`)
    .join(', ');
  console.log(`[rule-set] Libraries injected: ${libCounts || 'none'} — system prompt: ${(composedSystemPrompt.length / 1024).toFixed(1)} KB`);

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
        // 'training' is reserved for a future flag-to-rule learning feature — not yet implemented.
        // Until that lands, the server returns 501 Not Implemented for ?mode=training requests.
        enum: ['concise', 'full'],
        description: 'Required. The format of the report to produce. `concise` (default) returns the condensed I3 format: certificate_info, overall_verdict, counters, flags, and rule_set_update_recommendations only — omit the `sections` array entirely. `full` returns the I2 audit format: all of the above PLUS the `sections` array with the 5 numbered sections and per-field PASS/FAIL/WARNING/NOTICE checks.'
      },
      certificate_info: {
        type: 'object',
        required: ['certificate_ref', 'certificate_type'],
        properties: {
          certificate_ref: { type: 'string', description: 'e.g. "26/2/085165"' },
          certificate_type: { type: 'string', enum: ['8468', '8322', '8384', '8324', '8350', '8436', '8471', 'unknown'], description: 'Detected from footer code (e.g. 8468EHC, 8322EHC, 8384EHC, 8324EHC, 8350EHC, 8436EHC, 8471EHC) or header text' },
          commercial_doc_ref: {
            type: 'string',
            description: 'I.17 commercial document reference — the Purchase Order (PO), Shipment Order (SOP), Invoice number, or other unique identifier from the EHC I.17 "Commercial document reference" field. This is the cross-reference number that ties the EHC, delivery note, picklist, and filename together. For most dairy loads (Saputo, Arla, Novades) this is a numeric PO. For Aviagen poultry, this is the SOP order ref. For Waldron\'s composite, this is an invoice number. Use "N/A" or omit if the field is genuinely absent on the certificate.'
          },
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
    // First attempt: 1400px max, quality 78
    const newBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();

    if (Math.ceil(newBuffer.length * 4 / 3) <= MAX_BASE64_BYTES) {
      console.log(`[check] Image ${filename}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(newBuffer.length / 1024 / 1024).toFixed(1)}MB (resized to 1400px max, quality 78)`);
      return { buffer: newBuffer, mimetype: 'image/jpeg' };
    }

    // Second attempt: 1000px max, quality 70
    const smallerBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    if (Math.ceil(smallerBuffer.length * 4 / 3) <= MAX_BASE64_BYTES) {
      console.log(`[check] Image ${filename}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(smallerBuffer.length / 1024 / 1024).toFixed(1)}MB (resized to 1000px max, quality 70)`);
      return { buffer: smallerBuffer, mimetype: 'image/jpeg' };
    }

    console.log(`[check] WARNING: Image ${filename} could not be reduced below 4.5MB even at 1000px quality 70. Skipping this image to avoid API error.`);
    return null;
  } catch (err) {
    console.log(`[check] WARNING: Failed to process image ${filename}: ${err.message}. Skipping this image.`);
    return null;
  }
}

async function runCheck({ files, fields, mode = 'concise' }) {
  if (mode !== 'concise' && mode !== 'full') {
    const err = new Error("Invalid report mode. Use 'concise' or 'full'.");
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

  // Certificate PDF text for consignor routing and cert-type fallback.
  // classifyFiles caches parsed text on cert.pdfText whenever it ran
  // pdf-parse during classification (only happens for PDFs with no
  // filename signal). For the common EHC-filename case we parse here
  // on demand — exactly once per request.
  let certPdfText = cert.pdfText || null;
  if (!certPdfText) {
    try {
      const certFileForText = files.find(f => f.filename === cert.filename);
      if (certFileForText) {
        const parsed = await pdfParse(certFileForText.buffer);
        certPdfText = parsed.text || null;
      }
    } catch (err) {
      console.warn(`[check] Could not extract PDF text for consignor routing: ${err.message}`);
    }
  }

  // Find the original file buffer for the certificate by matching filename
  const certFile = files.find(f => f.filename === cert.filename);

  // Resolve certificate type. classifyFiles() may have produced cert_type: null
  // when the filename matched the EHC pattern (skipping pdf-parse). In that case,
  // re-run detectCertType() on the already-extracted certPdfText.
  let resolvedCertType = cert.cert_type || null;
  if (!resolvedCertType && certPdfText) {
    resolvedCertType = detectCertType(certPdfText) || null;
    if (resolvedCertType) {
      console.log(`[check] cert_type resolved from PDF text: ${resolvedCertType}`);
    }
  }

  // Default fallback when cert type cannot be determined.
  // 8468 is the most common certificate type on this team's workload.
  // Consignor routing will still run — it just uses the 8468 routing table.
  const effectiveCertType = resolvedCertType || '8468';
  if (!resolvedCertType) {
    console.warn(`[check] cert_type could not be resolved — defaulting to 8468 for rule set loading`);
  }

  let ruleSet;
  try {
    const selectedConsignorId = (fields && fields.consignorId && fields.consignorId !== 'auto')
      ? fields.consignorId
      : null;

    const rs = loadRuleSetForCertificate(effectiveCertType, null, certPdfText, selectedConsignorId);
    ruleSet = {
      version: rs.metadata.version,
      versionDate: rs.metadata.versionDate,
      markdown: rs.systemPrompt
    };
  } catch (err) {
    console.error(`[check] loadRuleSetForCertificate failed for ${effectiveCertType}: ${err.message}`);
    // Hard fallback: load without consignor routing rather than crash the request.
    const rs = loadRuleSetForCertificate('8468', null, null);
    ruleSet = {
      version: rs.metadata.version,
      versionDate: rs.metadata.versionDate,
      markdown: rs.systemPrompt
    };
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
  const modeInstruction = mode === 'concise'
    ? 'Report mode for this submission: CONCISE. Set `report_mode` to "concise" in the tool input. Produce the condensed I3 format defined in the rule set: certificate_info, overall_verdict, counters, flags (in severity order), and rule_set_update_recommendations. DO NOT include the `sections` array — omit it entirely. The full report is generated separately on demand.'
    : 'Report mode for this submission: FULL. Set `report_mode` to "full" in the tool input. Produce the complete I2 audit format defined in the rule set: certificate_info, overall_verdict, counters, flags (in severity order), the full `sections` array with all 5 numbered sections (Preliminary Checks, Part I Field-by-Field, Weight/Date/Document Cross-Check, Part II and Stamps, Rule Set Update Recommendations) populated with per-field PASS/FAIL/WARNING/NOTICE checks, and rule_set_update_recommendations. This is the audit-grade artefact for BCP queries and post-check reference.';

  userContent.push({
    type: 'text',
    text: `Please analyze this EHC and produce a structured check report using the submit_check_report tool.

User-selected certificate type: ${userCertType}
Original filename: ${cert.filename}

${modeInstruction}

Apply the rule set thoroughly. Detect the certificate type from the footer code and header. Identify all fields in Part I. Verify all deletions in Part II. Check stamps, signatures, weights, dates, and cross-reference with any supporting documents or photos provided.

You MUST return the report by calling the submit_check_report tool exactly once. Do not return prose, do not return a text reply, do not skip the tool call. The tool call is the only valid output for this request.`
  });

  const engineLayer = await loadEngineLayer();

  // Thinking tokens count against max_tokens. With budget_tokens: 5000 in
  // the thinking config, the model uses up to 5k for reasoning; the remaining
  // headroom is for the tool call output.
  const maxTokens = mode === 'full' ? 16000 : 10000;
  const selectedConsignorId = (fields && fields.consignorId && fields.consignorId !== 'auto')
    ? fields.consignorId
    : null;
  console.log(`[check] Calling Claude API with ${userContent.length} content blocks, cert_type: ${effectiveCertType} (user hint: ${userCertType}), consignor: ${selectedConsignorId || 'auto'}, max_tokens: ${maxTokens}, engine layer v${engineLayer.version}`);
  const startTime = Date.now();
  const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'enabled', budget_tokens: 5000 },
    system: [
      {
        type: 'text',
        text: `Today's date is ${todayFormatted}.`
      },
      {
        type: 'text',
        text: engineLayer.text,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: `=== RULE SET v${ruleSet.version} ===\n\n${ruleSet.markdown}`,
        cache_control: { type: 'ephemeral' }
      }
    ],
    tools: [TOOL_DEFINITION],
    // tool_choice: 'auto' (not forced) is REQUIRED by adaptive thinking —
    // forced tool selection ({type:'tool',name:...}) returns 400 when
    // thinking is enabled. Reliability of tool use comes from the engine
    // layer and the user-content instruction below, not from forcing.
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: userContent
      }
    ]
  });

  const processingTime = (Date.now() - startTime) / 1000;
  // Thinking tokens are billed as part of output_tokens. The SDK may also
  // expose a thinking-specific field — log it if present, otherwise 0.
  const thinkingTokens = response.usage.thinking_tokens || response.usage.cache_creation?.thinking_tokens || 0;
  console.log(`[check] Claude API responded in ${Date.now() - startTime}ms — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}, thinking: ${thinkingTokens}, cache_creation: ${response.usage.cache_creation_input_tokens || 0}, cache_read: ${response.usage.cache_read_input_tokens || 0}`);

  const toolUseBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolUseBlock) {
    const blockTypes = response.content.map(b => b.type).join(', ');
    const textBlocks = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    console.error(`No tool_use block in response. Content block types: [${blockTypes}]. Stop reason: ${response.stop_reason}. Text content: ${textBlocks.substring(0, 500)}`);
    throw new Error('Claude did not call the submit_check_report tool. Check thinking/tool_choice config and the user-content mandate.');
  }

  const report = toolUseBlock.input;

  report.report_mode = mode;
  report.rule_set_version = `${ruleSet.version} — ${ruleSet.versionDate}`;
  report.engine_layer_version = engineLayer.version;
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
 * Detect the consignor section for a given certificate type from PDF text.
 * Reads consignorRouting from the registry entry for the certificate type.
 * Returns { consignorId, file, fallback } for the first matching entry,
 * or the fallback entry if no match found.
 * Returns null if the certificate type has no consignorRouting defined.
 *
 * @param {string} certType - e.g. '8468', '8322', '8384'
 * @param {string} pdfText - full text content of the certificate PDF
 * @returns {{ consignorId: string, file: string|null, fallback: boolean }|null}
 */
function detectConsignor(certType, pdfText) {
  if (!certType || !pdfText) return null;
  const registry = readRegistry();
  const certEntry = registry.certificateTypes[certType];
  if (!certEntry || !Array.isArray(certEntry.consignorRouting)) return null;

  const haystack = pdfText.toLowerCase();

  for (const route of certEntry.consignorRouting) {
    if (route.fallback) {
      return { consignorId: route.consignorId, file: route.file, fallback: true };
    }
    if (Array.isArray(route.matchTerms) && route.matchTerms.length > 0) {
      const matched = route.matchTerms.some(term => haystack.includes(term.toLowerCase()));
      if (matched) {
        return { consignorId: route.consignorId, file: route.file, fallback: false };
      }
    }
  }

  return null;
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
 * Performance: the content peek (pdf-parse) is SKIPPED when either filename
 * signal already matched — the filename alone is treated as sufficient and
 * Claude reads the full PDF text during the check anyway, where it confirms
 * the certificate type from content. pdf-parse only runs for PDFs with no
 * filename signal at all (the genuinely ambiguous case, e.g. scan001.pdf).
 * Per-file classifications run concurrently via Promise.all; output order
 * matches input order.
 *
 * Multiple Certificate candidates: first by upload order wins (composite
 * consignments will need explicit handling later). Others stay as
 * supporting_document with a `was_certificate_candidate: true` marker.
 *
 * Manual overrides (optional second arg): a map keyed by filename to a
 * forced classification ('certificate' | 'supporting_document' | 'photo').
 * Used by /api/check to honour the per-file override dropdown.
 */
async function classifyFiles(files, overrides = {}) {
  const classified = await Promise.all(files.map(async (file) => {
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
      let parsedPdfText = null;
      let parseError = false;

      const hasFilenameSignal = ehcMatch.matched || supportingMatch.matched;
      if (!hasFilenameSignal) {
        try {
          const parsed = await pdfParse(buffer);
          parsedPdfText = parsed.text || null;
          contentCertType = detectCertType(parsedPdfText);
        } catch (_) {
          parseError = true;
        }
      }

      // Combine signals
      if (ehcMatch.matched && contentCertType) {
        console.log(`[classify] ${filename} → certificate (filename ref ${ehcMatch.ref} + content cert_type ${contentCertType}, confidence high)`);
        return {
          ...base,
          kind: 'certificate_candidate',
          cert_type: contentCertType,
          ref_from_filename: ehcMatch.ref,
          classification_source: 'content_certificate',
          confidence: 'high',
          pdfText: parsedPdfText
        };
      } else if (ehcMatch.matched && !contentCertType) {
        console.log(`[classify] ${filename} → certificate (filename pattern, ref ${ehcMatch.ref})`);
        return {
          ...base,
          kind: 'certificate_candidate',
          cert_type: null,
          ref_from_filename: ehcMatch.ref,
          classification_source: 'filename_certificate',
          confidence: 'medium',
          parse_error: parseError || undefined
        };
      } else if (!ehcMatch.matched && contentCertType) {
        // Content peek says certificate. Check if filename suggests supporting —
        // that conflict means a renamed cert PDF; trust the filename per task rule.
        if (supportingMatch.matched) {
          console.warn(`[classify] ${filename} → supporting (filename hint: ${supportingMatch.hint}; content peek detected cert_type ${contentCertType} — filename wins per policy)`);
          return {
            ...base,
            kind: 'supporting_document',
            classification_source: 'filename_supporting',
            confidence: 'medium',
            content_cert_type_override: contentCertType
          };
        } else {
          console.log(`[classify] ${filename} → certificate (content cert_type ${contentCertType})`);
          return {
            ...base,
            kind: 'certificate_candidate',
            cert_type: contentCertType,
            classification_source: 'content_certificate',
            confidence: 'medium',
            pdfText: parsedPdfText
          };
        }
      } else if (supportingMatch.matched) {
        console.log(`[classify] ${filename} → supporting (filename hint: ${supportingMatch.hint})`);
        return {
          ...base,
          kind: 'supporting_document',
          classification_source: 'filename_supporting',
          confidence: 'medium',
          parse_error: parseError || undefined
        };
      } else {
        // No signal at all
        console.log(`[classify] ${filename} → unclassified (no signals detected)`);
        return {
          ...base,
          kind: 'unclassified',
          classification_source: 'unclassified',
          confidence: 'low',
          parse_error: parseError || undefined
        };
      }
    } else if (
      mimetype && mimetype.startsWith('image/') &&
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimetype)
    ) {
      return {
        ...base,
        kind: 'photo',
        classification_source: 'mimetype_photo',
        confidence: 'high'
      };
    } else {
      return {
        ...base,
        kind: 'unsupported',
        classification_source: 'unsupported',
        confidence: 'high'
      };
    }
  }));

  // Apply manual overrides (from frontend dropdown). Overrides win over
  // auto-detection; we tag the file so the response shape carries the source.
  let userOverrideCount = 0;
  for (const item of classified) {
    const ov = overrides[item.filename];
    if (!ov) continue;
    userOverrideCount++;
    item.kind = ov === 'certificate' ? 'certificate_candidate' : ov;
    item.classification_source = 'user_override';
    item.confidence = 'high';
    if (ov === 'certificate' && !item.cert_type) {
      item.cert_type = null;
    }
    console.log(`[classify] ${item.filename} → ${ov} (user override)`);
  }

  const active = classified;

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
  loadEngineLayer,
  loadRuleSetForCertificate,
  classifyFiles,
  detectCertType,
  detectConsignor,
  detectEhcInFilename,
  detectSupportingInFilename
};
