'use strict';

// Thinking configuration per model. Kept in its own dependency-free module
// (like src/pricing.js) so it can be unit-tested without loading the Anthropic
// SDK.
//
// Sonnet 5 replaced the fixed extended-thinking budget with adaptive thinking
// controlled by output_config.effort. The 4.6-era models still use the
// enabled/budget_tokens form, so we branch on the model id — this keeps a
// `CLAUDE_MODEL=claude-sonnet-4-6` rollback working as a live safety lever.
//
// Effort is 'medium' (not the API default 'high'): on real certificates high
// roughly doubled report time AND overran the 16k concise token cap, cutting
// the report off mid-generation, with no better verdict. Medium reaches the
// same verdict with a complete report in ~20% more time than 4.6.

/**
 * Return the thinking-related request params for a model.
 * @param {string} model - the model id (e.g. 'claude-sonnet-5')
 * @returns {object} params to spread into the messages.create/stream call
 */
function thinkingConfigFor(model) {
  if (/sonnet-4-6/.test(model)) {
    return { thinking: { type: 'enabled', budget_tokens: 5000 } };
  }
  return { thinking: { type: 'adaptive' }, output_config: { effort: 'medium' } };
}

module.exports = { thinkingConfigFor };
