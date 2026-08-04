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
