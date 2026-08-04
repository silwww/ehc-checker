'use strict';

// Deterministic coverage for Phase 2 single-call wiring: the checklist
// schema injected into the tool definition per certificate type, the
// filled checklist riding final_report together with the deterministic
// checklist_rows, and the WARN-only behaviour on partial coverage.
//
// Isolation: same Module.prototype.require hook as retry-integrity.test.js
// (read that file first if this one is unclear) — the Anthropic SDK is
// mocked BEFORE src/check.js is required; no network, no API key. The
// mock additionally CAPTURES the params object handed to messages.stream
// so the injected tool schema can be asserted directly.

process.env.EHC_NO_RAW_PERSIST = '1';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let streamQueue = [];
let capturedParams = [];

function enqueueStream(stream) { streamQueue.push(stream); }

function makeFinalOnlyStream(finalMessage) {
  return {
    [Symbol.asyncIterator]() {
      return { next: async () => ({ value: undefined, done: true }) };
    },
    controller: { abort() {} },
    finalMessage: async () => finalMessage
  };
}

class MockAnthropic {
  constructor() {
    this.messages = {
      stream: (params) => {
        capturedParams.push(params);
        if (streamQueue.length === 0) {
          throw new Error('Test bug: streamQueue empty — enqueue one stream per expected call');
        }
        return streamQueue.shift();
      }
    };
  }
}

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === '@anthropic-ai/sdk') return MockAnthropic;
  return originalRequire.apply(this, arguments);
};
const { runCheckStream } = require('../../src/check');
Module.prototype.require = originalRequire;

const { composeSkeleton } = require('../../src/skeleton');

function makeFiles() {
  return [{
    filename: 'EHC 26-2-097680.pdf',
    buffer: Buffer.from('not a real pdf'),
    mimetype: 'application/pdf'
  }];
}

// 8322 has a type checklist spec on disk -> the full 47-row skeleton.
const FIELDS = { certTypeOverride: '8322' };

// A fully-filled checklist matching the 8322 skeleton: PASS/observed for
// every verdict row, matches-expected observation for every perception row.
function makeFilledChecklist() {
  const { rows } = composeSkeleton('8322');
  const filled = {};
  for (const row of rows) {
    if (row.rowClass === 'verdict') {
      filled[row.id] = { verdict: 'PASS', observed: 'as printed' };
    } else if (row.family === 'c6') {
      filled[row.id] = { observed: row.expected === 'DELETE' ? 'struck' : 'not_struck', confidence: 'high' };
    } else {
      filled[row.id] = { observed: 'stamped', confidence: 'high' };
    }
  }
  return filled;
}

function baseInput(overrides) {
  return Object.assign({
    certificate_info: { certificate_ref: '26/2/097680' },
    flags: [],
    sections: [{ section_number: 1, title: 'Checks Performed', checks: [] }],
    rule_set_update_recommendations: ''
  }, overrides);
}

function captureOnEvent() {
  const calls = [];
  return { calls, onEvent: (name, data) => calls.push({ name, data }) };
}

beforeEach(() => { streamQueue = []; capturedParams = []; });

describe('single-call wiring — checklist schema injection (buildCheckParams)', () => {
  it('concise call carries a required checklist property with one required entry per skeleton row, max_tokens 32000', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({ checklist: makeFilledChecklist() }) }]
    }));

    const { onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    assert.equal(capturedParams.length, 1);
    const params = capturedParams[0];
    assert.equal(params.max_tokens, 32000);

    const schema = params.tools[0].input_schema;
    assert.ok(schema.required.includes('checklist'), 'checklist must be a required top-level property');
    const { rows } = composeSkeleton('8322');
    assert.deepEqual(schema.properties.checklist.required, rows.map(r => r.id));
    assert.ok(schema.properties.checklist.description.length > 0);
  });

  it('deprecated full mode does NOT inject checklist (legacy 5-section path untouched)', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const schema = capturedParams[0].tools[0].input_schema;
    assert.ok(!schema.required.includes('checklist'));
    assert.equal(schema.properties.checklist, undefined);
    assert.equal(capturedParams[0].max_tokens, 32000);
  });

  it('the module-level TOOL_DEFINITION is not mutated across calls (clone-per-request)', async () => {
    // Call 1: concise (injects checklist into a clone).
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({ checklist: makeFilledChecklist() }) }]
    }));
    const a = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent: a.onEvent });

    // Call 2: full — must see the pristine definition, not call 1's clone.
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));
    const b = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent: b.onEvent });

    assert.equal(capturedParams[1].tools[0].input_schema.properties.checklist, undefined);
  });
});

describe('single-call finalisation — checklist on final_report', () => {
  it('final_report carries the filled checklist and the deterministic checklist_rows', async () => {
    const filled = makeFilledChecklist();
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({ checklist: filled }) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.ok(fr, 'final_report must be emitted');
    assert.deepEqual(fr.data.checklist, filled);
    const { rows } = composeSkeleton('8322');
    assert.equal(fr.data.checklist_rows.length, rows.length);
    assert.equal(fr.data.checklist_rows[0].id, 'i_1_consignor_exporter');
    assert.ok(fr.data.checklist_rows[0].rule.length > 0, 'rows carry render metadata');
    // Authoritative trio untouched:
    assert.deepEqual(fr.data.counters, { hard_errors: 0, medium_warnings: 0, low_notices: 0 });
    assert.equal(fr.data.overall_verdict, 'PASS');
  });

  it('partial checklist is WARN-only: no throw, final_report still emitted, flags contract intact', async () => {
    const mediumFlag = { severity: 'medium', field_reference: 'I.1', title: 'Typo', description: 'GREAT BRITAN in I.1.' };
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{
        type: 'tool_use',
        input: baseInput({
          flags: [mediumFlag],
          checklist: { i_1_consignor_exporter: { verdict: 'MEDIUM', observed: 'GREAT BRITAN', note: 'A10' } }
        })
      }]
    }));

    const { calls, onEvent } = captureOnEvent();
    const report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(Object.keys(fr.data.checklist).length, 1);
    assert.equal(fr.data.checklist_rows.length, 47);
    assert.deepEqual(report.counters, { hard_errors: 0, medium_warnings: 1, low_notices: 0 });
    assert.equal(report.overall_verdict, 'HOLD');
  });

  it('missing checklist entirely (model ignored the mandate) — warn-only, checklist:null on final_report', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(fr.data.checklist, null);
    assert.equal(fr.data.checklist_rows.length, 47);
  });

  it('deprecated full mode: final_report carries checklist:null and checklist_rows:null', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(fr.data.checklist, null);
    assert.equal(fr.data.checklist_rows, null);
  });
});

describe('single-call finalisation — per-severity checklist/flags cross-check (fix 3)', () => {
  // The pre-fix guard was `findingRowIds.length > 0 && flags.length === 0` —
  // it missed a checklist HARD row paired with a non-empty flags array that
  // simply omitted the matching hard flag (e.g. only a `low` flag present).
  // That shape reads counters.hard_errors === 0 / overall_verdict === PASS
  // with NO warning at all — the exact silent false-PASS this project
  // fears. Fix 3 compares per severity instead of only against flags.length.
  it('warns [checklist-integrity] HARD-vs-hard_errors even though flags is non-empty', async () => {
    const lowFlag = { severity: 'low', field_reference: 'I.2', title: 'Minor formatting', description: 'Spacing only.' };
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{
        type: 'tool_use',
        input: baseInput({
          flags: [lowFlag],
          checklist: { i_1_consignor_exporter: { verdict: 'HARD', observed: 'Missing', note: 'Field blank' } }
        })
      }]
    }));

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => { warnings.push(msg); };
    let report;
    try {
      const { onEvent } = captureOnEvent();
      report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });
    } finally {
      console.warn = originalWarn;
    }

    // Flags stay authoritative — no verdict/counter contamination (LOG ONLY).
    assert.deepEqual(report.counters, { hard_errors: 0, medium_warnings: 0, low_notices: 1 });
    assert.equal(report.overall_verdict, 'PASS');

    const hardWarning = warnings.find((w) => /HARD verdict.*counters\.hard_errors is 0/.test(w));
    assert.ok(hardWarning, 'expected a [checklist-integrity] HARD-vs-hard_errors warning; got: ' + JSON.stringify(warnings));
    assert.ok(hardWarning.includes('i_1_consignor_exporter'));

    // No MEDIUM finding rows here — the MEDIUM-specific warning must not fire.
    assert.ok(!warnings.some((w) => /MEDIUM verdict/.test(w)));
  });

  it('warns [checklist-integrity] MEDIUM-vs-medium_warnings the same way', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{
        type: 'tool_use',
        input: baseInput({
          flags: [],
          checklist: { page_structure: { verdict: 'MEDIUM', observed: '9 of 10', note: 'Page missing' } }
        })
      }]
    }));

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => { warnings.push(msg); };
    try {
      const { onEvent } = captureOnEvent();
      await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });
    } finally {
      console.warn = originalWarn;
    }

    const mediumWarning = warnings.find((w) => /MEDIUM verdict.*counters\.medium_warnings is 0/.test(w));
    assert.ok(mediumWarning, 'expected a [checklist-integrity] MEDIUM-vs-medium_warnings warning; got: ' + JSON.stringify(warnings));
    assert.ok(mediumWarning.includes('page_structure'));
  });
});

describe('single-call finalisation — unbacked checklist rows on final_report (fix 3)', () => {
  // A model response with a RETRACTED hard flag plus a checklist row
  // carrying verdict HARD yields counters.hard_errors 0 / overall_verdict
  // PASS (the flag was stripped — flags stay authoritative), while the
  // client's converter, which cannot see flags[].retracted, mapped
  // HARD -> FAIL and rendered a red row. Concise said PASS, Full said FAIL.
  // The server already knows which finding rows the post-strip counters do
  // not back; it now says so on final_report as an INERT field so the
  // client can render that row honestly. Nothing here touches flags,
  // counters, the verdict, or the retry machinery.
  const retractedHardFlag = {
    severity: 'hard',
    field_reference: 'I.1',
    title: 'Consignor blank',
    description: 'Looked blank on first pass.',
    retracted: true
  };

  it('names the row whose HARD verdict the counters do not back', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{
        type: 'tool_use',
        input: baseInput({
          flags: [retractedHardFlag],
          checklist: { i_1_consignor_exporter: { verdict: 'HARD', observed: 'Saputo Dairy UK', note: 'Withdrawn' } }
        })
      }]
    }));

    const { calls, onEvent } = captureOnEvent();
    const report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    // Authoritative trio untouched by this fix.
    assert.deepEqual(report.counters, { hard_errors: 0, medium_warnings: 0, low_notices: 0 });
    assert.equal(report.overall_verdict, 'PASS');

    const fr = calls.find(c => c.name === 'final_report');
    assert.ok(fr.data.checklist_integrity, 'final_report must carry checklist_integrity');
    assert.deepEqual(fr.data.checklist_integrity.unbacked_row_ids, ['i_1_consignor_exporter']);
  });

  it('a checklist finding that IS backed by the counters is not listed', async () => {
    const mediumFlag = { severity: 'medium', field_reference: 'I.1', title: 'Typo', description: 'GREAT BRITAN in I.1.' };
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{
        type: 'tool_use',
        input: baseInput({
          flags: [mediumFlag],
          checklist: { i_1_consignor_exporter: { verdict: 'MEDIUM', observed: 'GREAT BRITAN', note: 'A10' } }
        })
      }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'concise', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.deepEqual(fr.data.checklist_integrity.unbacked_row_ids, []);
  });

  it('deprecated full mode carries checklist_integrity:null (nothing to reconcile)', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: baseInput({}) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const fr = calls.find(c => c.name === 'final_report');
    assert.equal(fr.data.checklist_integrity, null);
  });
});
