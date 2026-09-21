'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeCostUsd } = require('../../src/pricing');

describe('computeCostUsd', () => {
  it('computes Sonnet 5 cost at standard rates from input+output tokens', () => {
    const usage = {
      input_tokens: 60000,
      output_tokens: 6000,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0
    };
    // 60000*3/1e6 + 6000*15/1e6 = 0.18 + 0.09 = 0.27
    //
    // Was 0.18 under the introductory $2/$10, which ran to 2026-08-31 and has
    // ended. This test pinned the intro number, so it went on asserting a
    // price that no longer existed instead of catching the stale constants —
    // every [cost] line logged from 1 September under-reported by a third.
    // If Anthropic changes pricing again, this fails, which is the point.
    assert.equal(computeCostUsd('claude-sonnet-5', usage), 0.27);
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
