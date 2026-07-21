'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeCostUsd } = require('../../src/pricing');

describe('computeCostUsd', () => {
  it('computes Sonnet 5 intro cost from input+output tokens', () => {
    const usage = {
      input_tokens: 60000,
      output_tokens: 6000,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0
    };
    // 60000*2/1e6 + 6000*10/1e6 = 0.12 + 0.06 = 0.18
    assert.equal(computeCostUsd('claude-sonnet-5', usage), 0.18);
  });

  it('computes Sonnet 4.6 cost from input+output tokens', () => {
    const usage = { input_tokens: 60000, output_tokens: 6000 };
    // 60000*3/1e6 + 6000*15/1e6 = 0.18 + 0.09 = 0.27
    assert.equal(computeCostUsd('claude-sonnet-4-6', usage), 0.27);
  });

  it('returns null for an unknown model', () => {
    assert.equal(computeCostUsd('some-other-model', { input_tokens: 1 }), null);
  });

  it('treats missing token fields as zero', () => {
    assert.equal(computeCostUsd('claude-sonnet-5', {}), 0);
  });
});
