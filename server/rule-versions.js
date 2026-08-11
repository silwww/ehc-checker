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
    return a.filename.localeCompare(b.filename);
  }
  if (va) return -1;
  if (vb) return 1;
  return a.filename.localeCompare(b.filename);
}

// Git added-date per file (one call per file, cached for the process
// lifetime — the archive changes only on deploys). Filesystem mtimes are
// useless here: a fresh clone stamps every file with clone time. When git
// is unavailable (unlikely, but possible on some hosts), date is null and
// the UI simply omits it — never a fabricated date.
const dateCache = new Map();
function gitAddedDate(repoRoot, relPath) {
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
  dateCache.set(relPath, date);
  return date;
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

module.exports = { listRuleVersions, resolveVersionFile };
