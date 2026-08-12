'use strict';

// The check loader is the OV's only company for 45-130 seconds, so its
// failure mode is not a crash — it is a screen that stops moving and reads
// as "frozen". That exact bug shipped: setSecondaryStatus() cleared the
// rotation interval and never restarted it, and index.html called it a few
// milliseconds after start(), so six of the seven reassurance messages were
// unreachable code and the OV watched one static line for two minutes.
//
// The fix is structural, not a restarted timer: the PHASE (real state -
// uploading / analysing) and the REASSURANCE (rotating filler) are two
// concerns that were sharing one DOM element, so writing one destroyed the
// other. They now own separate elements, and these tests hold that line.
//
// Browser code with no jsdom in the project: the module is loaded into a
// fake window with fake document/timers, following the same new Function
// pattern the render-report tests use.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

class FakeEl {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.textContent = '';
    this.style = {};
    this.children = [];
    this.attrs = {};
    this.listeners = {};
    this._innerHTML = '';
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = v; if (v === '') this.children = []; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  click() { (this.listeners.click || []).forEach((f) => f()); }
  querySelector(sel) {
    const want = sel.replace(/^\./, '');
    const walk = (el) => {
      for (const c of el.children) {
        if (String(c.className).split(/\s+/).includes(want)) return c;
        const hit = walk(c);
        if (hit) return hit;
      }
      return null;
    };
    return walk(this);
  }
}

function loadLoader(reassurances) {
  const src = fs.readFileSync(
    path.join(__dirname, '../../public/assets/loader-controller.js'), 'utf8');

  const timers = { intervals: new Map(), timeouts: new Map(), nextId: 1 };
  const win = { EHCLoaderContent: { reassurances } };
  const doc = { createElement: (tag) => new FakeEl(tag) };

  const fakeSetInterval = (fn, ms) => {
    const id = timers.nextId++;
    timers.intervals.set(id, { fn, ms });
    return id;
  };
  const fakeClearInterval = (id) => { timers.intervals.delete(id); };
  const fakeSetTimeout = (fn) => {
    const id = timers.nextId++;
    timers.timeouts.set(id, fn);
    return id;
  };
  const fakeClearTimeout = (id) => { timers.timeouts.delete(id); };
  // The SVG fetch must never decide whether the loader works.
  const fakeFetch = () => Promise.resolve({ text: () => Promise.resolve('<svg/>') });

  // eslint-disable-next-line no-new-func
  new Function(
    'window', 'document', 'fetch', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
    src
  )(win, doc, fakeFetch, fakeSetInterval, fakeClearInterval, fakeSetTimeout, fakeClearTimeout);

  return { loader: win.EHCShaggyLoader, timers, doc };
}

const THREE = ['first message', 'second message', 'third message'];

function fireRotation(timers) {
  // Rotation is the interval whose period is the multi-second reassurance
  // cadence; the elapsed-time ticker runs at 1000ms.
  for (const [, t] of timers.intervals) if (t.ms !== 1000) t.fn();
  // The new text lands inside the fade's setTimeout, so a rotation that is
  // never flushed looks identical to a rotation that never fired.
  const pending = [...timers.timeouts.entries()];
  timers.timeouts.clear();
  for (const [, fn] of pending) fn();
}

describe('check loader — phase vs reassurance', () => {
  it('keeps the reassurance rotating after a phase change', () => {
    const { loader, timers } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['cert.pdf'] });

    const reassure = target.querySelector('.shaggy-loader-reassure');
    assert.equal(reassure.textContent, THREE[0]);

    // This is the exact sequence that broke: a phase update lands a few ms
    // after start(), while the OV still has minutes of waiting ahead.
    loader.setPhase('Analysing…');

    const rotating = [...timers.intervals.values()].filter((t) => t.ms !== 1000);
    assert.equal(rotating.length, 1,
      'the rotation interval must survive a phase change — clearing it makes every later message dead code');

    fireRotation(timers);
    assert.equal(reassure.textContent, THREE[1],
      'the reassurance must still advance after a phase change');
  });

  it('writes the phase to its own element, leaving the reassurance intact', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['cert.pdf'] });

    loader.setPhase('Uploading files…');

    assert.equal(target.querySelector('.shaggy-loader-phase').textContent, 'Uploading files…');
    assert.equal(target.querySelector('.shaggy-loader-reassure').textContent, THREE[0],
      'a phase update must not overwrite the reassurance line');
  });

  it('reaches every reassurance message, not just the first', () => {
    const { loader, timers } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['cert.pdf'] });
    loader.setPhase('Analysing…');

    const reassure = target.querySelector('.shaggy-loader-reassure');
    const seen = new Set([reassure.textContent]);
    for (let i = 0; i < THREE.length; i++) {
      fireRotation(timers);
      seen.add(reassure.textContent);
    }
    assert.deepEqual([...seen].sort(), [...THREE].sort(),
      'every configured message must be reachable during a real wait');
  });

  it('stop() clears both timers', () => {
    const { loader, timers } = loadLoader(THREE);
    loader.start(new FakeEl('div'), { files: ['cert.pdf'] });
    assert.ok(timers.intervals.size >= 2);
    loader.stop();
    assert.equal(timers.intervals.size, 0);
  });

  it('setPhase is a no-op when the loader is not running', () => {
    const { loader } = loadLoader(THREE);
    assert.doesNotThrow(() => loader.setPhase('Analysing…'));
  });

  it('the elapsed tick writes to the timer line and leaves the phase alone', () => {
    // The 1000ms interval's BODY was never fired by any test, so pointing it
    // at the phase element — which would blank the real status every second —
    // passed. Fire it explicitly.
    const { loader, timers } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['cert.pdf'] });
    loader.setPhase('Analysing certificate…');

    for (const [, t] of timers.intervals) if (t.ms === 1000) t.fn();

    assert.match(target.querySelector('.shaggy-loader-timer').textContent, /\dm \ds/);
    assert.equal(target.querySelector('.shaggy-loader-phase').textContent, 'Analysing certificate…',
      'the elapsed tick must not overwrite the phase');
  });

  it('a second start() does not leave the first one\'s timers running', () => {
    const { loader, timers } = loadLoader(THREE);
    loader.start(new FakeEl('div'), { files: ['a.pdf'] });
    const first = new Set(timers.intervals.keys());
    loader.start(new FakeEl('div'), { files: ['b.pdf'] });
    for (const id of first) {
      assert.equal(timers.intervals.has(id), false,
        'two overlapping rotations flicker the reassurance between two indices');
    }
  });
});

describe('check loader — honest waiting', () => {
  it('names the files being checked', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['EHC_8468.pdf', 'trailer.jpg'] });

    const files = target.querySelector('.shaggy-loader-files').textContent;
    assert.match(files, /2 files/);
    assert.match(files, /EHC_8468\.pdf/);
    assert.match(files, /trailer\.jpg/);
  });

  it('says "1 file" for a single file rather than "1 files"', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['only.pdf'] });
    assert.match(target.querySelector('.shaggy-loader-files').textContent, /^1 file\b/);
  });

  it('summarises a long file list instead of overflowing the card', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['a.pdf', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg', 'f.jpg'] });

    const files = target.querySelector('.shaggy-loader-files').textContent;
    assert.match(files, /6 files/);
    assert.match(files, /\+3 more/, 'the tail must be summarised, not printed in full');
  });

  it('states the expected wait, not just the elapsed time', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['cert.pdf'] });

    // The elapsed counter alone gives the OV no way to tell 40s from stuck.
    const timer = target.querySelector('.shaggy-loader-timer').textContent;
    assert.match(timer, /0m 0s/);
    assert.match(timer, /minute/i, 'the card must declare how long a check usually takes');
  });

  it('offers Cancel and calls back exactly once', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    let cancelled = 0;
    loader.start(target, { files: ['cert.pdf'], onCancel: () => { cancelled++; } });

    const btn = target.querySelector('.shaggy-loader-cancel');
    assert.ok(btn, 'a check the OV cannot abandon costs a paid call to escape');
    btn.click();
    assert.equal(cancelled, 1);
    btn.click();
    assert.equal(cancelled, 1, 'a second click must not fire a second cancel');
  });

  it('omits Cancel when no handler is supplied', () => {
    const { loader } = loadLoader(THREE);
    const target = new FakeEl('div');
    loader.start(target, { files: ['cert.pdf'] });
    assert.equal(target.querySelector('.shaggy-loader-cancel'), null,
      'a dead Cancel button is worse than none');
  });
});
