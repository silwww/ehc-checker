'use strict';

// Read-only rule set version archive: lists rules/*/source/* from the
// deployed repo itself (the archive already holds every master docx
// since v1.8) and resolves download paths traversal-safely by matching
// ONLY names that the scan itself produced.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// "v4_6", "v4.5.1", "v3_9" → [4, 6, 0] / [4, 5, 1] / [3, 9, 0].
// Files without a recognisable version sort to the bottom.
function parseVersion(filename) {
  const m = String(filename).match(/v(\d+)[._](\d+)(?:[._](\d+))?/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
}

function compareVersionsDesc(a, b) {
  const va = parseVersion(a.filename);
  const vb = parseVersion(b.filename);
  if (va && vb) {
    for (let i = 0; i < 3; i++) {
      if (va[i] !== vb[i]) return vb[i] - va[i];
    }
    return byFilename(a, b);
  }
  if (va) return -1;
  if (vb) return 1;
  return byFilename(a, b);
}

// A shallow clone has exactly one reachable commit, so `git log -1` reports
// that commit's date for EVERY file — one identical date on all versions,
// advancing on each deploy. Render builds with `git fetch --depth=1`, so this
// is the production case, not an edge case, and it does not throw: it answers
// plausibly and wrongly. Detected once per process; when shallow, dates are
// omitted entirely, which is what "never a fabricated date" has to mean.
let shallowCache = null;
function isShallowRepo(repoRoot) {
  if (shallowCache !== null) return shallowCache;
  let shallow = true; // if we cannot tell, withhold dates rather than invent them
  try {
    const out = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: repoRoot, encoding: 'utf8', timeout: 5000
    }).trim();
    if (out === 'false') shallow = false;
  } catch (_) { /* no git — treated as "cannot tell", dates withheld */ }
  shallowCache = shallow;
  return shallow;
}

// Git added-date per file (one call per file, cached for the process
// lifetime — the archive changes only on deploys). Filesystem mtimes are
// useless here: a fresh clone stamps every file with clone time. When git
// is unavailable or the clone is shallow, date is null and the UI simply
// omits it — never a fabricated date.
const dateCache = new Map();
function gitAddedDate(repoRoot, relPath) {
  if (isShallowRepo(repoRoot)) return null;
  if (dateCache.has(relPath)) return dateCache.get(relPath);
  let date = null;
  try {
    // --date=short + %ad rather than %as: %as needs git >= 2.21 and this
    // must work on older local installs too.
    const out = execFileSync('git', ['log', '-1', '--date=short', '--format=%ad', '--', relPath], {
      cwd: repoRoot, encoding: 'utf8', timeout: 5000
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) date = out;
  } catch (_) { /* git unavailable — date stays null */ }
  // Only successful lookups are cached: a transient timeout must not blank
  // this file's date for the rest of the process lifetime.
  if (date) dateCache.set(relPath, date);
  return date;
}

// Deliberately NOT localeCompare: the ICU default locale comes from the
// host's LANG, so two files of equal parsed version could order differently
// on a Mac and on Render. Code-unit order is stable everywhere.
function byFilename(a, b) {
  return a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0;
}

// The archive directory holds more than masters — sync notes to Silvia and a
// stray .md conversion live there too, and two of them even parse as version
// numbers. Presenting them as master versions told Roger he had sent a v4.5
// master he never sent, on the one page whose job is saying what is authoritative.
function isMasterDocument(filename) {
  return /\.docx$/i.test(filename) && /RULE_SET|Rule_Set_and_Brief/i.test(filename);
}

function listRuleVersions(rulesDir) {
  const repoRoot = path.dirname(rulesDir);
  const out = [];
  for (const commodity of fs.readdirSync(rulesDir)) {
    const src = path.join(rulesDir, commodity, 'source');
    if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) continue;
    for (const filename of fs.readdirSync(src)) {
      const full = path.join(src, filename);
      if (!fs.statSync(full).isFile()) continue;
      out.push({
        commodity,
        filename,
        size: fs.statSync(full).size,
        isMaster: isMasterDocument(filename),
        date: gitAddedDate(repoRoot, path.relative(repoRoot, full))
      });
    }
  }
  out.sort((a, b) => a.commodity.localeCompare(b.commodity) || compareVersionsDesc(a, b));
  return out;
}

function resolveVersionFile(rulesDir, commodity, filename) {
  const known = listRuleVersions(rulesDir).find(
    (v) => v.commodity === commodity && v.filename === filename
  );
  if (!known) return null;
  return path.join(rulesDir, commodity, 'source', filename);
}

module.exports = { listRuleVersions, resolveVersionFile, isMasterDocument };
