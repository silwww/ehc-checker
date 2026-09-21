'use strict';

// Every path the registry names must resolve on disk.
//
// This exists because of a silent production failure: _registry.json routed
// 8384 Forthglade loads to meat-products-uk-eu/consignors/forthglade.md, a
// file that has never existed — the dossier lives under petfood-uk-eu, because
// Forthglade is one consignor spanning two commodity layers. src/check.js
// wraps the read in `if (fs.existsSync(...))` and falls through to a
// console.warn, so an OV certifying a Forthglade 8384 got a check with ZERO
// Forthglade rules loaded and nothing on screen to say so.
//
// It was invisible for two reasons worth remembering. The prompt still NAMES
// the selected consignor and lists its match terms, so the report reads as
// consignor-aware while the rules are absent. And no test had ever inspected
// params.system, so every mutation of the consignor-loading block survived the
// suite.
//
// A missing file is therefore not a runtime error anyone will notice. It has
// to be a test failure.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const RULES_DIR = path.join(__dirname, '../../rules');
const registry = JSON.parse(
  fs.readFileSync(path.join(RULES_DIR, '_registry.json'), 'utf8')
);

function commodityDirFor(entry) {
  const ref = (entry.layerComposition || []).find(l => l.startsWith('commodities.'));
  if (!ref) return null;
  const key = ref.slice('commodities.'.length);
  const dir = registry.layers.commodities[key];
  assert.ok(dir, `layerComposition names commodities.${key}, which _registry.json does not define`);
  return dir;
}

describe('_registry.json paths all resolve on disk', () => {
  it('every layer directory exists', () => {
    assert.ok(fs.existsSync(path.join(RULES_DIR, registry.layers.engine.path)));
    assert.ok(fs.existsSync(path.join(RULES_DIR, registry.layers.core)));
    for (const dir of Object.values(registry.layers.routes)) {
      assert.ok(fs.existsSync(path.join(RULES_DIR, dir)), `route layer missing: ${dir}`);
    }
    for (const dir of Object.values(registry.layers.commodities)) {
      assert.ok(fs.existsSync(path.join(RULES_DIR, dir)), `commodity layer missing: ${dir}`);
    }
  });

  it('every certificate type resolves its commodityFile', () => {
    for (const [code, entry] of Object.entries(registry.certificateTypes)) {
      if (!entry.commodityFile) continue;
      const dir = commodityDirFor(entry);
      const file = path.join(RULES_DIR, dir, entry.commodityFile);
      assert.ok(
        fs.existsSync(file),
        `certificate type ${code} names commodityFile "${entry.commodityFile}" ` +
          `under ${dir}, which does not exist at ${file}`
      );
    }
  });

  // The one that would have caught Forthglade. Note the file is resolved the
  // same way src/check.js resolves it — joined onto the commodity layer path —
  // so a cross-layer reference ("../petfood-uk-eu/consignors/forthglade.md")
  // is tested exactly as the loader will read it.
  it('every consignor routing entry resolves its dossier', () => {
    const checked = [];
    for (const [code, entry] of Object.entries(registry.certificateTypes)) {
      for (const route of entry.consignorRouting || []) {
        if (route.fallback || !route.file) continue;
        const dir = commodityDirFor(entry);
        const file = path.join(RULES_DIR, dir, route.file);
        assert.ok(
          fs.existsSync(file),
          `certificate type ${code}, consignor "${route.consignorId}" routes to ` +
            `"${route.file}" under ${dir} — no such file. An OV selecting this ` +
            `consignor would get a check with none of its rules loaded, silently.`
        );
        checked.push(`${code}/${route.consignorId}`);
      }
    }
    assert.ok(checked.length >= 9, `expected every routed consignor to be checked, got ${checked.length}`);
  });

  it('a routing entry with no file is explicitly marked as the fallback', () => {
    for (const [code, entry] of Object.entries(registry.certificateTypes)) {
      for (const route of entry.consignorRouting || []) {
        if (route.file) continue;
        assert.equal(
          route.fallback,
          true,
          `certificate type ${code}, consignor "${route.consignorId}" has no file ` +
            `and is not marked fallback:true — it would load nothing without saying so.`
        );
      }
    }
  });
});
