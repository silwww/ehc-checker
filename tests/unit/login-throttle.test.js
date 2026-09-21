'use strict';

// Tests for the failed-login throttle added at v4.8.
//
// The property that matters is NOT "attackers are slowed" — it is that a real
// OV is never locked out. The shared password is one value typed by three
// people; a lockout on it is a denial of service anyone on the internet can
// trigger against the whole practice at once, which during a certification
// week is worse than the guessing run it defends against. So every assertion
// below is about delays staying bounded and clearing, not about blocking.
//
// auth.js fail-fasts at require() time if the two secrets are absent, so they
// are set before the module is loaded.

process.env.EHC_SHARED_SECRET = process.env.EHC_SHARED_SECRET || 'test-shared-secret';
process.env.EHC_COOKIE_SECRET = process.env.EHC_COOKIE_SECRET || 'a'.repeat(64);

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const auth = require('../../server/auth.js');

const reqFrom = ip => ({ ip });

describe('failed-login throttle', () => {
  beforeEach(() => auth._resetLoginThrottle());

  it('the first failure costs a real user almost nothing', () => {
    const delay = auth.recordLoginFailure(reqFrom('1.2.3.4'));
    assert.ok(delay <= 125, `first failure should be imperceptible, got ${delay}ms`);
  });

  it('repeated failures from one key grow the delay', () => {
    const key = reqFrom('1.2.3.4');
    const delays = [];
    for (let i = 0; i < 5; i += 1) delays.push(auth.recordLoginFailure(key));
    for (let i = 1; i < delays.length; i += 1) {
      assert.ok(
        delays[i] >= delays[i - 1],
        `delay must not shrink as failures accumulate: ${JSON.stringify(delays)}`
      );
    }
    assert.ok(delays[4] > delays[0], 'the fifth failure must cost more than the first');
  });

  it('the delay is capped, so no caller can ever be held indefinitely', () => {
    const key = reqFrom('1.2.3.4');
    let delay = 0;
    for (let i = 0; i < 40; i += 1) delay = auth.recordLoginFailure(key);
    assert.ok(delay <= 5000, `delay must stay bounded, got ${delay}ms`);
  });

  it('a successful login clears that key — a user who mistypes then succeeds starts clean', () => {
    const key = reqFrom('1.2.3.4');
    auth.recordLoginFailure(key);
    auth.recordLoginFailure(key);
    auth.clearLoginFailures(key);
    const delay = auth.recordLoginFailure(key);
    assert.ok(delay <= 125, `after a success the next failure should be cheap again, got ${delay}ms`);
  });

  it('one key failing does not slow a different key below the global threshold', () => {
    const attacker = reqFrom('9.9.9.9');
    for (let i = 0; i < 6; i += 1) auth.recordLoginFailure(attacker);
    const innocent = auth.recordLoginFailure(reqFrom('1.2.3.4'));
    assert.ok(innocent <= 125, `an unrelated user should not inherit another key's delay, got ${innocent}ms`);
  });

  // The per-key bucket is keyed on a client-claimed header, so an attacker can
  // rotate it and never meet their own bucket. The global counter is the part
  // they cannot dodge — and it must raise a FLOOR, never a block.
  it('rotating the key does not escape the global floor', () => {
    for (let i = 0; i < 45; i += 1) auth.recordLoginFailure(reqFrom(`10.0.0.${i}`));
    const fresh = auth.recordLoginFailure(reqFrom('203.0.113.7'));
    assert.ok(fresh >= 2000, `a fresh key during a global burst should still wait, got ${fresh}ms`);
    assert.ok(fresh <= 5000, `...but still bounded, got ${fresh}ms`);
  });

  it('a missing ip does not throw', () => {
    assert.doesNotThrow(() => auth.recordLoginFailure({}));
    assert.doesNotThrow(() => auth.recordLoginFailure(undefined));
  });
});
