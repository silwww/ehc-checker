'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { thinkingConfigFor } = require('../../src/thinking-config');

describe('thinkingConfigFor', () => {
  it('uses adaptive thinking + medium effort for Sonnet 5', () => {
    assert.deepEqual(thinkingConfigFor('claude-sonnet-5'), {
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' }
    });
  });

  it('uses the legacy enabled/budget_tokens form for Sonnet 4.6 (rollback lever)', () => {
    assert.deepEqual(thinkingConfigFor('claude-sonnet-4-6'), {
      thinking: { type: 'enabled', budget_tokens: 5000 }
    });
    // The legacy branch must NOT emit output_config (unsupported alongside
    // the enabled form on 4.6).
    assert.equal(thinkingConfigFor('claude-sonnet-4-6').output_config, undefined);
  });

  it('defaults any non-4.6 model to the adaptive path', () => {
    const cfg = thinkingConfigFor('claude-sonnet-6');
    assert.equal(cfg.thinking.type, 'adaptive');
    assert.equal(cfg.output_config.effort, 'medium');
  });
});
