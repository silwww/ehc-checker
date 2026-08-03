'use strict';

// Deterministic unit coverage for the integrity-retry wrapper in
// src/check.js (runCheckStream / runCheckStreamAttempt) and the
// per-tool_use-block progressive-emit counters.
//
// Covers (strict-review fix wave, area I):
//   1. Attempt 1 fails REPORT_INTEGRITY (flags not an array) — the
//      wrapper emits 'reset_flags' exactly once and silently retries;
//      attempt 2 is valid and its verdict/final_report reach the client.
//   2. Both attempts fail REPORT_INTEGRITY — the wrapper rejects with
//      err.code === 'REPORT_INTEGRITY' and the "twice" user-facing
//      message; no verdict/final_report ever reaches the client.
//   3. A single attempt whose finalMessage carries TWO tool_use blocks —
//      the per-block counter reset (content_block_start handler) means
//      the second block's progressive flag events are indexed against
//      ITS OWN flags array, not carried over from the first block; the
//      assembled report comes from the LAST block (existing >1-block
//      contract).
//   4. The flag emit-guard: a flags array with [complete, incomplete
//      (no description), retracted] only streams the complete one as a
//      'flag' event, while final_report.flags (post-strip) keeps the
//      complete + incomplete pair and drops the retracted one.
//
// Does NOT cover:
//   - End-to-end shape/field-level correctness of a real model payload
//     (that's the integration suite's job — see sse-final-report.test.js).
//   - The partial-json incremental-parse behavior itself (each mocked
//     block's delta is sent as one complete JSON chunk — the held-back
//     "last array entry until stop" behavior described in check.js's
//     runCheckStreamAttempt docblock still exercises the same code path,
//     since content_block_stop is a required, separate event here).
//
// Isolation: same require-hook pattern as truncation-fail-loud.test.js —
// read that file first if this one is unclear. The Anthropic SDK is
// mocked via Module.prototype.require BEFORE src/check.js is required,
// so no network call is made and no API key is required.

// Skip src/check.js's persistRawReport disk writes for this whole file —
// must be set before check.js is required below.
process.env.EHC_NO_RAW_PERSIST = '1';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// --- Anthropic SDK mock ----------------------------------------------------
// Unlike truncation-fail-loud.test.js's single mutable slot, the retry
// wrapper can call messages.stream() twice in one runCheckStream()
// invocation (attempt 1, then attempt 2), so this mock uses a FIFO queue —
// each test enqueues one stream per expected attempt.
let streamQueue = [];

function enqueueStream(stream) {
  streamQueue.push(stream);
}

// A stream with no progressive content_block events — only finalMessage()
// matters. Used for the retry-wrapper scenarios (1, 2), which only care
// about REPORT_INTEGRITY handling, not the progressive preview.
function makeFinalOnlyStream(finalMessage) {
  return {
    [Symbol.asyncIterator]() {
      return { next: async () => ({ value: undefined, done: true }) };
    },
    controller: { abort() {} },
    finalMessage: async () => finalMessage
  };
}

// A stream that replays content_block_start/delta/stop for each entry in
// `blocks` (in order), then resolves finalMessage(). Each block's whole
// JSON input is sent as a single delta chunk — partial-json parses a
// complete JSON buffer the same way it parses a truly partial one, and
// runCheckStreamAttempt still holds back the array's last entry until the
// content_block_stop (final=true) pass, so the "held back" contract in
// tryEmitProgress is still exercised even without simulating byte-by-byte
// streaming.
function makeMultiBlockStream(blocks, finalMessage) {
  const events = [];
  for (const b of blocks) {
    events.push({ type: 'content_block_start', index: b.index, content_block: { type: 'tool_use' } });
    events.push({
      type: 'content_block_delta',
      index: b.index,
      delta: { type: 'input_json_delta', partial_json: JSON.stringify(b.input) }
    });
    events.push({ type: 'content_block_stop', index: b.index });
  }
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          if (i < events.length) return { value: events[i++], done: false };
          return { value: undefined, done: true };
        }
      };
    },
    controller: { abort() {} },
    finalMessage: async () => finalMessage
  };
}

class MockAnthropic {
  constructor() {
    this.messages = {
      stream: (_params) => {
        if (streamQueue.length === 0) {
          throw new Error('Test bug: streamQueue empty — enqueue one stream per expected messages.stream() call');
        }
        return streamQueue.shift();
      }
    };
  }
}

// Install the require hook BEFORE loading src/check, so its module-level
// `require('@anthropic-ai/sdk')` and `new Anthropic(...)` use the mock.
const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === '@anthropic-ai/sdk') return MockAnthropic;
  return originalRequire.apply(this, arguments);
};

const { runCheckStream } = require('../../src/check');

// Restore so other test files that don't want the mock are unaffected.
Module.prototype.require = originalRequire;

// --- Minimal valid inputs ----------------------------------------------
// Filename matches the EHC reference pattern, so classifyFiles takes the
// filename-only fast path and never calls pdf-parse.
function makeFiles() {
  return [{
    filename: 'EHC 26-2-097680.pdf',
    buffer: Buffer.from('not a real pdf'),
    mimetype: 'application/pdf'
  }];
}

// certTypeOverride bypasses detection (Obs #1 path) and forces the real
// 8468 rule set to load from rules/.
const FIELDS = { certTypeOverride: '8468' };

function captureOnEvent() {
  const calls = [];
  const onEvent = (name, data) => calls.push({ name, data });
  return { calls, onEvent };
}

function baseInput(overrides) {
  return Object.assign({
    certificate_info: {},
    flags: [],
    sections: [],
    rule_set_update_recommendations: ''
  }, overrides);
}

describe('runCheckStream — integrity retry (strict-review area I.1)', () => {
  it('Scenario 1: attempt 1 invalid (flags not an array), attempt 2 valid — retries once and succeeds', async () => {
    // Attempt 1: flags is a string, not an array — postProcessReport
    // throws REPORT_INTEGRITY before any verdict/final_report emission.
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: { flags: 'not an array' } }]
    }));
    // Attempt 2: valid, one medium flag.
    const mediumFlag = { severity: 'medium', field_reference: 'I.12', title: 'Retry ok', description: 'Valid on attempt 2.' };
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 60 },
      content: [{ type: 'tool_use', input: baseInput({ flags: [mediumFlag] }) }]
    }));

    const { calls, onEvent } = captureOnEvent();
    const report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const eventNames = calls.map((c) => c.name);
    assert.equal(eventNames.filter((n) => n === 'reset_flags').length, 1,
      `expected exactly one 'reset_flags' event; got: ${JSON.stringify(eventNames)}`);
    assert.ok(eventNames.includes('verdict'), `expected a 'verdict' event; got: ${JSON.stringify(eventNames)}`);
    assert.ok(eventNames.includes('final_report'), `expected a 'final_report' event; got: ${JSON.stringify(eventNames)}`);

    const finalReportEvent = calls.find((c) => c.name === 'final_report');
    assert.equal(finalReportEvent.data.flags.length, 1);
    assert.equal(finalReportEvent.data.flags[0].title, 'Retry ok');

    assert.deepEqual(report.counters, { hard_errors: 0, medium_warnings: 1, low_notices: 0 });
    assert.equal(report.overall_verdict, 'HOLD');
  });

  it('Scenario 2: both attempts invalid — rejects REPORT_INTEGRITY with the "twice" message, no verdict/final_report', async () => {
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: { flags: 'still not an array' } }]
    }));
    enqueueStream(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: { flags: { not: 'an array either' } } }]
    }));

    const { calls, onEvent } = captureOnEvent();

    await assert.rejects(
      () => runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent }),
      (err) => {
        assert.equal(err.code, 'REPORT_INTEGRITY');
        assert.match(err.message, /twice/);
        return true;
      }
    );

    const eventNames = calls.map((c) => c.name);
    assert.ok(!eventNames.includes('verdict'), `expected no 'verdict' event; got: ${JSON.stringify(eventNames)}`);
    assert.ok(!eventNames.includes('final_report'), `expected no 'final_report' event; got: ${JSON.stringify(eventNames)}`);
  });

  it('Scenario 3: two tool_use blocks in one attempt — per-block counters restart, report comes from the LAST block', async () => {
    const flagBlock1 = { severity: 'low', field_reference: 'B1', title: 'Block1 flag', description: 'from block one' };
    const flagA = { severity: 'hard', field_reference: 'B2A', title: 'Block2 flagA', description: 'first flag of block two' };
    const flagB = { severity: 'medium', field_reference: 'B2B', title: 'Block2 flagB', description: 'second flag of block two' };

    const input1 = baseInput({ certificate_info: { certificate_ref: 'BLOCK1-REF' }, flags: [flagBlock1] });
    const input2 = baseInput({ certificate_info: { certificate_ref: 'BLOCK2-REF' }, flags: [flagA, flagB] });

    enqueueStream(makeMultiBlockStream(
      [{ index: 0, input: input1 }, { index: 1, input: input2 }],
      {
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 80 },
        content: [
          { type: 'tool_use', input: input1 },
          { type: 'tool_use', input: input2 }
        ]
      }
    ));

    const { calls, onEvent } = captureOnEvent();
    const report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const flagEvents = calls.filter((c) => c.name === 'flag');
    const flagTitles = flagEvents.map((c) => c.data.title);
    // No skipped indices: block1 streams its own single flag, then block2
    // streams BOTH of its own flags (not just the tail end of an array
    // indexed from block1's leftover counter).
    assert.deepEqual(flagTitles, ['Block1 flag', 'Block2 flagA', 'Block2 flagB'],
      `expected block1's flag then both of block2's flags with no skips; got: ${JSON.stringify(flagTitles)}`);

    // Report is assembled from the LAST block (existing >1-block contract).
    assert.equal(report.certificate_info.certificate_ref, 'BLOCK2-REF');
    assert.equal(report.flags.length, 2);
    assert.deepEqual(report.flags.map((f) => f.title), ['Block2 flagA', 'Block2 flagB']);
    assert.deepEqual(report.counters, { hard_errors: 1, medium_warnings: 1, low_notices: 0 });
  });

  it('Scenario 4: emit guard — only the complete flag streams; final_report keeps valid+incomplete, drops retracted', async () => {
    const validFlag = { severity: 'hard', field_reference: 'I.1', title: 'Valid flag', description: 'A valid complete flag.' };
    const incompleteFlag = { severity: 'medium', title: 't' }; // no description — fails the emit guard
    const retractedFlag = { severity: 'low', field_reference: 'I.2', title: 'Retracted item', description: 'Was flagged but resolved', retracted: true };

    const input = baseInput({ flags: [validFlag, incompleteFlag, retractedFlag] });

    enqueueStream(makeMultiBlockStream(
      [{ index: 0, input }],
      {
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 70 },
        content: [{ type: 'tool_use', input }]
      }
    ));

    const { calls, onEvent } = captureOnEvent();
    const report = await runCheckStream({ files: makeFiles(), fields: FIELDS, mode: 'full', onEvent });

    const flagEvents = calls.filter((c) => c.name === 'flag');
    assert.equal(flagEvents.length, 1, `expected exactly 1 'flag' event; got: ${JSON.stringify(flagEvents.map((c) => c.data.title))}`);
    assert.equal(flagEvents[0].data.title, 'Valid flag');

    // final_report.flags: valid + guard-skipped incomplete flag survive
    // (guard only gates the STREAMED preview, not the final report);
    // retracted is stripped by postProcessReport.
    assert.equal(report.flags.length, 2);
    assert.deepEqual(report.flags.map((f) => f.title), ['Valid flag', 't']);
    assert.equal(report.retracted_count, 1);
    assert.deepEqual(report.counters, { hard_errors: 1, medium_warnings: 1, low_notices: 0 });
  });
});
