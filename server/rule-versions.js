'use strict';

// Read-only rule set version archive: lists rules/*/source/* from the
// deployed repo itself (the archive already holds every master docx
// since v1.8) and resolves download paths traversal-safely by matching
// ONLY names that the scan itself produced.

const fs = require('fs');
const path = require('path');

function listRuleVersions(rulesDir) {
  const out = [];
  for (const commodity of fs.readdirSync(rulesDir)) {
    const src = path.join(rulesDir, commodity, 'source');
    if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) continue;
    for (const filename of fs.readdirSync(src)) {
      const full = path.join(src, filename);
      if (!fs.statSync(full).isFile()) continue;
      out.push({ commodity, filename, size: fs.statSync(full).size });
    }
  }
  out.sort((a, b) => a.commodity.localeCompare(b.commodity) || b.filename.localeCompare(a.filename));
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
