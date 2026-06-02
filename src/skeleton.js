// Fixed checklist skeleton composer (sub-phase 3.2a).
//
// INERT AS OF 3.2a: nothing in the codebase calls this module yet. It is
// wired into src/check.js in sub-phase 3.2b. Until then it is dead code on
// the refactor/single-call-skeleton branch and changes no runtime behaviour.
//
// The engine stays commodity-neutral. composeSkeleton() resolves the
// commodity/type spec generically from rules/_registry.json — there is no
// per-commodity or per-type branching in this file. ALL commodity- and
// type-specific content (Part II C6 clauses, C10 blank-field stamp rows,
// page structure) is read from the JSON spec files on disk and is NEVER
// hardcoded here. To support a new commodity or certificate type, add its
// JSON spec plus a registry entry; this module does not change.
//
// This module deliberately does NOT import from src/check.js — it reads the
// registry directly from disk to avoid a circular dependency.

const fs = require('fs');
const path = require('path');

const RULES_DIR = path.join(__dirname, '../rules');

/**
 * Deterministic id slug: lowercase, collapse every run of non [a-z0-9]
 * characters to a single '_', then trim leading/trailing '_'.
 */
function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Read and parse a JSON file. Throws (fail-loud) if it is missing or
 * unparseable. Used for spec files whose absence is a hard error.
 */
function readJsonOrThrow(filePath, what) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`skeleton: cannot read ${what} at ${filePath}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`skeleton: cannot parse ${what} at ${filePath}: ${err.message}`);
  }
}

/**
 * Read and parse a type spec. Returns null if the file is absent (a future
 * commodity with no type spec yet — handled gracefully by the caller). A
 * present-but-unparseable file, or any non-ENOENT read error, throws
 * (fail-loud — never silently return a partial skeleton for a broken spec).
 */
function readTypeSpecOrNull(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`skeleton: cannot read type spec at ${filePath}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`skeleton: type spec present but unparseable at ${filePath}: ${err.message}`);
  }
}

/**
 * Resolve the commodity directory for a certificate type from the registry,
 * with no commodity hardcoding: find the certificate's `commodities.*` layer,
 * strip the prefix, and look the id up in registry.layers.commodities.
 * Throws if the cert type, its commodity layer, or the directory mapping is
 * missing.
 */
function resolveCommodityDir(registry, certType) {
  const certEntry = registry.certificateTypes && registry.certificateTypes[certType];
  if (!certEntry) {
    throw new Error(`skeleton: unknown certificate type "${certType}" — not in registry`);
  }
  const composition = Array.isArray(certEntry.layerComposition) ? certEntry.layerComposition : [];
  const commodityRef = composition.find(
    (layer) => typeof layer === 'string' && layer.startsWith('commodities.')
  );
  if (!commodityRef) {
    throw new Error(`skeleton: cert type "${certType}" has no commodities.* layer in layerComposition`);
  }
  const commodityId = commodityRef.slice('commodities.'.length);
  const commodityDirName =
    registry.layers && registry.layers.commodities && registry.layers.commodities[commodityId];
  if (!commodityDirName) {
    throw new Error(`skeleton: registry.layers.commodities has no entry for "${commodityId}"`);
  }
  return path.join(RULES_DIR, commodityDirName);
}

/**
 * Build the per-row item schema from its rowClass / family.
 *   verdict            — Class 1: model reads typed text and judges (severity).
 *   perception + c6    — Class 2: strikethrough perception, observed only.
 *   perception + c10   — Class 2: adjacent-stamp perception, observed only.
 */
function itemSchemaFor(row) {
  if (row.rowClass === 'verdict') {
    return {
      type: 'object',
      required: ['verdict'],
      properties: {
        verdict: {
          type: 'string',
          enum: ['PASS', 'HARD', 'MEDIUM', 'LOW', 'NA'],
          description:
            'Severity-bearing verdict for this field. PASS = compliant. HARD/MEDIUM/LOW = a red/amber/blue finding. NA = not applicable on this certificate. If you cannot read the field, use MEDIUM with a note "OV to verify" — never invent a HARD on something you could not read.'
        },
        observed: {
          type: 'string',
          description: 'Short: the value seen on the certificate.'
        },
        note: {
          type: 'string',
          description: 'Short; populate when verdict is not PASS.'
        }
      }
    };
  }

  if (row.rowClass === 'perception' && row.family === 'c6') {
    return {
      type: 'object',
      required: ['observed', 'confidence'],
      properties: {
        observed: {
          type: 'string',
          enum: ['struck', 'not_struck', 'unclear'],
          description:
            'Is this Part II clause struck through / deleted on the certificate? Report only what you see. Do NOT decide whether it should be struck.'
        },
        confidence: {
          type: 'string',
          enum: ['high', 'low'],
          description: 'high if the strike state is unambiguous; low if faint, partial, or hard to read.'
        },
        note: {
          type: 'string',
          description: 'Short; e.g. strike method observed.'
        }
      }
    };
  }

  if (row.rowClass === 'perception' && row.family === 'c10') {
    return {
      type: 'object',
      required: ['observed', 'confidence'],
      properties: {
        observed: {
          type: 'string',
          enum: ['stamped', 'unstamped', 'no_entry', 'unclear'],
          description:
            'For this blank field requiring an adjacent SP stamp: stamped = entry present with adjacent stamp/initials; unstamped = entry present without adjacent stamp; no_entry = field left blank; unclear = cannot tell. Report only what you see.'
        },
        confidence: {
          type: 'string',
          enum: ['high', 'low']
        },
        note: {
          type: 'string',
          description: 'Short.'
        }
      }
    };
  }

  throw new Error(
    `skeleton: no item schema for rowClass="${row.rowClass}" family="${row.family}" (id "${row.id}")`
  );
}

/**
 * Build the top-level checklistSchema: a JSON-schema object whose properties
 * are keyed by row id and whose required list is every row id (every row must
 * be reported).
 */
function buildChecklistSchema(rows) {
  const properties = {};
  const required = [];
  for (const row of rows) {
    properties[row.id] = itemSchemaFor(row);
    required.push(row.id);
  }
  return { type: 'object', required, properties };
}

/**
 * Compose the fixed checklist skeleton for a certificate type.
 * Returns { rows, checklistSchema }.
 *
 * rows is an ordered array of { id, rowClass, family, label }:
 *   - Part I (verdict)        from _core/part-i-checklist.json partIFields
 *   - C6 (perception)         from <certType>-checklist.json partIIClauses
 *   - C10 (perception)        from <certType>-checklist.json blankFieldsRequiringAdjacentStamp
 *   - page_structure (verdict) exactly one synthetic row
 *
 * Core spec missing/unparseable → throws. Type spec missing → warns and
 * composes Part I + page_structure only. Type spec present-but-broken →
 * throws. Duplicate row id → throws.
 */
function composeSkeleton(certType) {
  const registry = readJsonOrThrow(path.join(RULES_DIR, '_registry.json'), 'rule-set registry');

  // Core Part I spec — fail loud if missing or unparseable.
  const coreSpec = readJsonOrThrow(
    path.join(RULES_DIR, '_core', 'part-i-checklist.json'),
    'core Part I spec'
  );

  const rows = [];

  // Part I rows (verdict). One per partIFields entry, in source order.
  const partIFields = Array.isArray(coreSpec.partIFields) ? coreSpec.partIFields : [];
  for (const entry of partIFields) {
    rows.push({
      id: slug(entry.field + ' ' + entry.label),
      rowClass: 'verdict',
      family: 'part_i',
      label: entry.label
    });
  }

  // Type spec (commodity layer). Graceful if absent, fail-loud if broken.
  const commodityDir = resolveCommodityDir(registry, certType);
  const typeSpecPath = path.join(commodityDir, 'types', `${certType}-checklist.json`);
  const typeSpec = readTypeSpecOrNull(typeSpecPath);

  if (typeSpec) {
    // C6 rows (perception). One per partIIClauses entry, in source order.
    const clauses = Array.isArray(typeSpec.partIIClauses) ? typeSpec.partIIClauses : [];
    for (const clause of clauses) {
      rows.push({
        id: slug(clause.clause + ' ' + clause.label),
        rowClass: 'perception',
        family: 'c6',
        label: clause.label
      });
    }

    // C10 rows (perception). One per blankFieldsRequiringAdjacentStamp entry.
    const blanks = Array.isArray(typeSpec.blankFieldsRequiringAdjacentStamp)
      ? typeSpec.blankFieldsRequiringAdjacentStamp
      : [];
    for (const blank of blanks) {
      rows.push({
        id: 'c10_' + slug(blank.section + ' ' + blank.field),
        rowClass: 'perception',
        family: 'c10',
        label: blank.section + ' — ' + blank.field
      });
    }
  } else {
    console.warn(
      `skeleton: no type spec for certificate type "${certType}" at ${typeSpecPath} — ` +
        'composing Part I + page_structure rows only (graceful).'
    );
  }

  // Page structure row (verdict). Exactly one, always present.
  rows.push({
    id: 'page_structure',
    rowClass: 'verdict',
    family: 'page_structure',
    label: 'Page structure / count'
  });

  // Uniqueness assertion — fail loud on the first duplicate id.
  const seenIds = new Set();
  for (const row of rows) {
    if (seenIds.has(row.id)) {
      throw new Error(`skeleton: duplicate row id produced: "${row.id}"`);
    }
    seenIds.add(row.id);
  }

  return { rows, checklistSchema: buildChecklistSchema(rows) };
}

module.exports = { composeSkeleton };
