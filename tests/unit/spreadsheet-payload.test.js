'use strict';

// Payload contract for spreadsheet supporting documents. Same
// Module.prototype.require SDK mock as single-call-checklist.test.js —
// capturedParams receives the REAL params runCheckStream builds; the
// assertion runs against those, never a re-implementation.

process.env.EHC_NO_RAW_PERSIST = '1';

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let streamQueue = [];
let capturedParams = [];

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

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FIXTURE = fs.readFileSync(path.join(__dirname, '../fixtures/allocation-sample.xlsx'));

beforeEach(() => { streamQueue = []; capturedParams = []; });

describe('payload — spreadsheet supporting documents', () => {
  it('a classified .xlsx lands as a text-source document block titled Supporting: <name>', async () => {
    streamQueue.push(makeFinalOnlyStream({
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
      content: [{ type: 'tool_use', input: {
        certificate_info: { certificate_ref: '26/2/097680' },
        flags: [],
        sections: [{ section_number: 1, title: 'Checks Performed', checks: [] }],
        rule_set_update_recommendations: ''
      } }]
    }));

    const files = [
      { filename: 'EHC 26-2-097680.pdf', buffer: Buffer.from('not a real pdf'), mimetype: 'application/pdf' },
      { filename: 'Allocation - 7933762.xlsx', buffer: FIXTURE, mimetype: XLSX_MIME }
    ];
    const events = [];
    await runCheckStream({
      files, fields: { certTypeOverride: '8322' }, mode: 'concise',
      onEvent: (name, data) => events.push({ name, data })
    });

    const content = capturedParams[0].messages[0].content;
    const sheetBlock = content.find(b =>
      b.type === 'document' && b.title === 'Supporting: Allocation - 7933762.xlsx');
    assert.ok(sheetBlock, 'expected a document block for the spreadsheet');
    assert.equal(sheetBlock.source.type, 'text');
    assert.equal(sheetBlock.source.media_type, 'text/plain');
    assert.match(sheetBlock.source.data, /TEST-BATCH-001,21500/);

    const pdfBlock = content.find(b => b.type === 'document' && b.title === 'EHC 26-2-097680.pdf');
    assert.ok(pdfBlock, 'certificate PDF block unchanged');
    assert.equal(pdfBlock.source.type, 'base64');
  });
});
