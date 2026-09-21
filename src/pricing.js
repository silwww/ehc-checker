'use strict';

// USD per 1,000,000 tokens.
// Sonnet 5's introductory pricing ($2 input / $10 output) ran through
// 2026-08-31 and has ENDED; standard pricing ($3 / $15) applies from
// 2026-09-01. The note to update these numbers was left in the file and not
// acted on, so every [cost] line logged since 1 September under-reported by
// about a third. Corrected 2026-09-21.
// Cache read is 0.1x input; cache write is 1.25x input (Anthropic standard).
const MODEL_PRICING = {
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-sonnet-5':   { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 }
};

/**
 * Turn an Anthropic usage object into a USD cost for the given model.
 * Returns null if the model has no pricing entry (so the caller can log
 * 'n/a' rather than a wrong number).
 */
function computeCostUsd(model, usage) {
  const p = MODEL_PRICING[model];
  if (!p) return null;
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const cost =
    (input * p.input +
     output * p.output +
     cacheRead * p.cacheRead +
     cacheWrite * p.cacheWrite) / 1000000;
  return Math.round(cost * 10000) / 10000;
}

module.exports = { MODEL_PRICING, computeCostUsd };
