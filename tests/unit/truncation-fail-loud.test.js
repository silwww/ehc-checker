'use strict';

// Deterministic unit test for the Obs #3 fail-loud truncation branch in
// runCheckStream (src/check.js).
//
// Covers:
//   - When the model stream finishes with stop_reason === 'max_tokens',
//     runCheckStream throws with `.code === 'REPORT_TRUNCATED'` and
//     emits NEITHER 'verdict' NOR 'final_report' (no partial report
//     reaches the client).
//   - Control case: a natural stop ('end_turn') with a valid tool_use
//     block does not throw the truncation error and still emits
//     'final_report' — proves the gate is specific to truncation.
//
// Does NOT cover:
//   - End-to-end shape of the final_report payload (that's the
//     integration suite's job).
//   - PDF parsing or rule-set composition correctness.
//   - The 32000 token-budget value itself (mechanical, separate concern).
//
// Isolation:
//   - The Anthropic SDK is mocked via Module.prototype.require BEFORE
//     src/check.js is required, so the module-level
//     `new Anthropic(...)` at src/check.js:20 gets the stub. The real
//     SDK is never instantiated, no network call is made, no API key
//     is required.
//   - classifyFiles' pdf-parse fast path is bypassed by using an
//     EHC-pattern filename (src/check.js:1308-1314 documents the skip).
//   - buildCheckParams' detection cascade is bypassed by passing
//     fields.certTypeOverride='8468' (the Obs #1 override path).
//   - The real rules/ directory is read by loadRuleSetForCertificate
//     and loadEngineLayer — offline, deterministic.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// --- Anthropic SDK mock ----------------------------------------------------
// One mutable "next stream" slot per test. Each test sets it before
// invoking runCheckStream; the mocked anthropic.messages.stream(params)
// pops it and returns it.
let nextStream = null;

function makeFakeStream(finalMessage) {
  return {
    [Symbol.asyncIterator]() {
      // No partial events; the loop completes immediately, then
      // runCheckStream awaits finalMessage().
      return { next: async () => ({ value: undefined, done: true }) };
    },
    controller: { abort() {} },
    finalMessage: async () => finalMessage
  };
}

class MockAnthropic {
  constructor() {
    this.messages = {
      stream: (_params) => {
        if (!nextStream) {
          throw new Error('Test bug: nextStream not set before runCheckStream');
        }
        const s = nextStream;
        nextStream = null;
        return s;
      }
    };
  }
}

// Install the require hook BEFORE loading src/check, so its
// module-level `require('@anthropic-ai/sdk')` and
// `new Anthropic(...)` use the mock.
const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === '@anthropic-ai/sdk') return MockAnthropic;
  return originalRequire.apply(this, arguments);
};

const { runCheckStream } = require('../../src/check');

// Restore so other test files that don't want the mock are unaffected.
Module.prototype.require = originalRequire;

// --- Minimal valid inputs --------------------------------------------------
// Filename matches the EHC reference pattern, so classifyFiles takes
// the filename-only fast path and never calls pdf-parse. The buffer
// content is irrelevant; pdf-parse only runs in buildCheckParams'
// consignor-routing path, where its throw is caught and ignored.
function makeFiles() {
  return [{
    filename: 'EHC 26-2-097680.pdf',
    buffer: Buffer.from('not a real pdf'),
    mimetype: 'application/pdf'
  }];
}

// certTypeOverride bypasses detection (Obs #1 path) and forces the
// real 8468 rule set to load from rules/.
const FIELDS = { certTypeOverride: '8468' };

function captureOnEvent() {
  const calls = [];
  const onEvent = (name, data) => calls.push({ name, data });
  return { calls, onEvent };
}

// --- Tests -----------------------------------------------------------------

describe('runCheckStream — truncation fail-loud (obs #3)', () => {
  it('throws REPORT_TRUNCATED when finalMessage.stop_reason === "max_tokens"', async () => {
    nextStream = makeFakeStream({
      stop_reason: 'max_tokens',
      usage: { input_tokens: 1234, output_tokens: 32000 },
      // A real truncated response usually still carries a partial
      // tool_use block. The fail-loud gate must fire BEFORE this is
      // inspected — include one to prove the gate short-circuits.
      content: [{ type: 'tool_use', input: { flags: [] } }]
    });
    const { onEvent } = captureOnEvent();

    await assert.rejects(
      () => runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent }),
      (err) => err.code === 'REPORT_TRUNCATED'
    );
  });

  it('emits NO verdict and NO final_report when truncation fires', async () => {
    nextStream = makeFakeStream({
      stop_reason: 'max_tokens',
      usage: { input_tokens: 1234, output_tokens: 32000 },
      content: [{ type: 'tool_use', input: { flags: [] } }]
    });
    const { calls, onEvent } = captureOnEvent();

    await assert.rejects(
      () => runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent }),
      (err) => err.code === 'REPORT_TRUNCATED'
    );

    const eventNames = calls.map(c => c.name);
    assert.ok(!eventNames.includes('verdict'),
      `expected no 'verdict' event on truncation; got: ${JSON.stringify(eventNames)}`);
    assert.ok(!eventNames.includes('final_report'),
      `expected no 'final_report' event on truncation; got: ${JSON.stringify(eventNames)}`);
  });

  it('control: natural stop ("end_turn") does NOT throw and DOES emit final_report', async () => {
    nextStream = makeFakeStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 1234, output_tokens: 5000 },
      content: [{
        type: 'tool_use',
        input: {
          // Minimum shape applyReportMeta + postProcessReport accept:
          // flags must be an array; everything else gets filled in by
          // meta or defaults during finalisation.
          certificate_info: {},
          flags: [],
          sections: [],
          rule_set_update_recommendations: ''
        }
      }]
    });
    const { calls, onEvent } = captureOnEvent();

    await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const eventNames = calls.map(c => c.name);
    assert.ok(eventNames.includes('final_report'),
      `expected a 'final_report' event on natural stop; got: ${JSON.stringify(eventNames)}`);
  });
});
