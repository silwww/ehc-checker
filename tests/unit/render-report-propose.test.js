'use strict';

// The propose-rule buttons ride the flag cards and the recommendations
// block. DOM-free: we assert the HTML strings the block helpers emit.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function loadRenderReport() {
  const fakeWindow = {};
  for (const asset of ['certificate-fields.js', 'render-report.js']) {
    const src = fs.readFileSync(path.join(__dirname, '../../public/assets/', asset), 'utf8');
    new Function('window', src)(fakeWindow); // eslint-disable-line no-new-func
  }
  return fakeWindow.EHCRenderReport;
}

const rr = loadRenderReport();

describe('propose-rule buttons', () => {
  it('flagHTML carries a propose button with escaped data attributes', () => {
    const html = rr.blocks.flagHTML({
      severity: 'low',
      title: 'New "destination" <x>',
      description: 'Consignee & co "Van der Vaart" not in library',
      field_reference: 'I.5'
    }, false);
    assert.match(html, /propose-rule-btn/);
    assert.match(html, /data-kind="flag"/);
    assert.match(html, /data-title="New &quot;destination&quot; &lt;x&gt;"/);
    // data-description was the one attribute left unasserted, so dropping
    // escapeHtml there kept the suite green — and the model writes these
    // strings, so a quote in a description breaks out of the attribute.
    assert.match(html, /data-description="Consignee &amp; co &quot;Van der Vaart&quot; not in library"/);
    assert.match(html, /data-severity="low"/);
    assert.match(html, /data-field-ref="I\.5"/);
    assert.match(html, /Propose as rule/);
  });
  it('retracted flags do NOT offer proposing', () => {
    const html = rr.blocks.flagHTML({ severity: 'low', title: 'x', description: 'y', retracted: true }, true);
    assert.doesNotMatch(html, /propose-rule-btn/);
  });
  it('recommendationsHTML carries one propose button for the whole block', () => {
    const html = rr.blocks.recommendationsHTML({ rule_set_update_recommendations: 'Add X to Y' });
    assert.match(html, /propose-rule-btn/);
    assert.match(html, /data-kind="recommendations"/);
  });
  it('empty recommendations render nothing at all (unchanged)', () => {
    assert.equal(rr.blocks.recommendationsHTML({ rule_set_update_recommendations: '' }), '');
  });
});

// The propose HANDLER (not just the buttons) is shared. It used to live
// inside index.html, which is the only reason the Full Report tab shipped
// the buttons and then hid them with CSS: the markup was there, the
// behaviour was not. These tests hold the wiring, because the failure mode
// is silent — buttons that render and do nothing look exactly like buttons
// that work until someone clicks one.
describe('shared propose handler', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '../../public/', p), 'utf8');

  it('render-report exports wireProposeHandler', () => {
    assert.equal(typeof rr.wireProposeHandler, 'function');
  });

  it('the checker page wires it instead of carrying its own copy', () => {
    const html = read('index.html');
    assert.match(html, /EHCRenderReport\.wireProposeHandler\(/);
    // The old inline implementation is gone, not merely bypassed.
    assert.doesNotMatch(html, /data-propose-send>Send proposal/,
      'index.html must not still build the note row itself');
  });

  it('the Full Report page wires it too', () => {
    assert.match(read('audit.html'), /EHCRenderReport\.wireProposeHandler\(/);
  });

  it('the Full Report page no longer hides the propose buttons', () => {
    assert.doesNotMatch(read('audit.html'), /\.propose-rule-btn\s*\{[^}]*display:\s*none/,
      'hiding the buttons was the workaround for the missing handler');
  });

});

// The tests above assert that the pages WIRE the handler. These run it.
//
// An earlier version of this block asserted on the handler's source text —
// including a regex for the exact spelling of the getContext call. Inserting
// `return;` as the first statement of the click listener, which kills the
// entire propose flow, left all of them green. The block's own comment says
// "buttons that render and do nothing look exactly like buttons that work";
// only firing a click can tell those two apart.
describe('the propose handler, executed', () => {
  // Minimal DOM: the handler builds its note row by assigning an HTML string,
  // so the fake parses the two tags that string contains.
  function el(tag, attrs) {
    const node = {
      tagName: tag, className: (attrs && attrs.class) || '', value: '', textContent: '',
      disabled: false, style: {}, dataset: (attrs && attrs.dataset) || {},
      attrs: attrs || {}, children: [], parent: null, listeners: {},
      focus() { this.focused = true; },
      appendChild(c) { c.parent = this; this.children.push(c); return c; },
      remove() {
        if (!this.parent) return;
        this.parent.children = this.parent.children.filter((c) => c !== this);
        this.parent = null;
      },
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      get parentElement() { return this.parent; },
      set innerHTML(html) {
        this._html = html;
        this.children = [];
        const re = /<(input|button)\b([^>]*)>/g;
        let m;
        while ((m = re.exec(html)) !== null) {
          const attrMap = {};
          const attrRe = /([a-zA-Z-]+)(?:="([^"]*)")?/g;
          let a;
          while ((a = attrRe.exec(m[2])) !== null) attrMap[a[1]] = a[2] === undefined ? '' : a[2];
          this.appendChild(el(m[1], { class: attrMap.class || '', ...attrMap }));
        }
      },
      get innerHTML() { return this._html || ''; },
      matches(sel) {
        if (sel.startsWith('.')) return String(this.className).split(/\s+/).includes(sel.slice(1));
        if (sel.startsWith('[')) return Object.prototype.hasOwnProperty.call(this.attrs, sel.slice(1, -1));
        return this.tagName === sel;
      },
      closest(sel) {
        let n = this;
        while (n) { if (n.matches(sel)) return n; n = n.parent; }
        return null;
      },
      querySelector(sel) { return this.queryAll(sel)[0] || null; },
      querySelectorAll(sel) { return this.queryAll(sel); },
      queryAll(sel) {
        const parts = sel.split(',').map((s) => s.trim());
        const out = [];
        const walk = (n) => {
          for (const c of n.children) {
            if (parts.some((p) => c.matches(p))) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      }
    };
    return node;
  }

  function setup(context, storage) {
    const rr = loadRenderReport();
    const container = el('div', { class: 'report' });
    const wrap = el('div', { class: 'no-print' });
    const btn = el('button', {
      class: 'propose-rule-btn',
      dataset: { kind: 'flag', severity: 'low', title: 'New destination not in library', description: 'Van der Vaart, first appearance', fieldRef: 'I.12' }
    });
    wrap.appendChild(btn);
    container.appendChild(wrap);

    const posts = [];
    global.document = { createElement: (t) => el(t, {}) };
    const store = Object.assign({ ehc_identity: 'Silvia' }, storage || {});
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = v; }
    };
    global.fetch = async (url, init) => {
      posts.push({ url, body: JSON.parse(init.body) });
      return { ok: true, status: 201, json: async () => ({ id: 'p1' }) };
    };

    rr.wireProposeHandler(container, () => context);
    const fire = (target) => Promise.all(
      (container.listeners.click || []).map((f) => f({ target }))
    );
    return { container, wrap, btn, posts, fire };
  }

  const STORE_KEY = 'ehc_internal_note:26/2/219286';

  const CONTEXT = {
    reportData: {
      certificate_info: { certificate_ref: '26/2/219286' },
      cert_type_resolved: '8468',
      rule_set_update_recommendations: 'Always expect HS 0406 here'
    },
    certRef: '26/2/219286'
  };

  it('opens an inline note row on the first click', async () => {
    const { wrap, btn, fire } = setup(CONTEXT);
    await fire(btn);
    const row = wrap.querySelector('.propose-note-row');
    assert.ok(row, 'the propose button must open the note row');
    assert.ok(row.querySelector('[data-propose-name]'));
    assert.ok(row.querySelector('[data-propose-send]'));
    assert.ok(row.querySelector('[data-propose-cancel]'));
  });

  it('sends the flag context the reviewer needs to act on it', async () => {
    const { wrap, btn, posts, fire } = setup(CONTEXT);
    await fire(btn);
    await fire(wrap.querySelector('[data-propose-send]'));

    assert.equal(posts.length, 1);
    assert.equal(posts[0].url, '/api/proposals');
    assert.deepEqual(posts[0].body, {
      certificate_ref: '26/2/219286',
      cert_type: '8468',
      source_kind: 'flag',
      flag_severity: 'low',
      flag_title: 'New destination not in library',
      flag_description: 'Van der Vaart, first appearance',
      // The certificate box the finding is about. Emitted by flagHTML since
      // the beginning, read by nobody until today.
      field_reference: 'I.12',
      // Empty for a flag: the report-level recommendations belong only to a
      // recommendations proposal, and the delta prefers this field over the
      // flag's own text.
      model_recommendation: '',
      proposer_note: '',
      // The practice's own filing reference (pCloud folder). Separate from
      // proposer_note ON PURPOSE: that one is rendered into the rule set
      // author's Word delta and this one must never leave the app.
      internal_note: '',
      proposed_by: 'Silvia'
    });
  });

  it('sends the internal note in its own field, never folded into the reviewer note', async () => {
    const { wrap, btn, posts, fire } = setup(CONTEXT);
    await fire(btn);
    wrap.querySelector('[data-propose-note]').value = 'seen twice this week';
    wrap.querySelector('[data-propose-internal]').value = 'pCloud 4471';
    await fire(wrap.querySelector('[data-propose-send]'));
    assert.equal(posts[0].body.proposer_note, 'seen twice this week');
    assert.equal(posts[0].body.internal_note, 'pCloud 4471');
  });

  it('offers an internal note input on the propose row', async () => {
    const { wrap, btn, fire } = setup(CONTEXT);
    await fire(btn);
    const row = wrap.querySelector('.propose-note-row');
    assert.ok(row.querySelector('[data-propose-internal]'),
      'the internal note is written at propose time -- the OV has the folder number, the reviewer does not');
    // The placeholder is the ONLY thing on screen separating this field from
    // the one beside it: one travels into the rule set author's delta, this
    // one never leaves the app. If the wording drifts, the rule is gone and
    // nothing else would notice.
    assert.match(row.innerHTML, /placeholder="Internal note \(stays in the app\)"/);
    assert.match(row.innerHTML, /placeholder="Optional note for the reviewer"/);
  });


  it('pre-fills the internal note from the last one used for this certificate', async () => {
    // Three flags on one certificate means typing the same folder number
    // three times. The value is remembered per certificate, not globally:
    // the next certificate lives in a different folder.
    const { wrap, btn, fire } = setup(CONTEXT, { [STORE_KEY]: 'pCloud 4471' });
    await fire(btn);
    assert.equal(wrap.querySelector('[data-propose-internal]').value, 'pCloud 4471');
  });

  it('remembers the internal note against this certificate after a send', async () => {
    const { wrap, btn, fire } = setup(CONTEXT);
    await fire(btn);
    wrap.querySelector('[data-propose-internal]').value = 'pCloud 4471';
    await fire(wrap.querySelector('[data-propose-send]'));
    assert.equal(global.localStorage.getItem(STORE_KEY), 'pCloud 4471');
  });

  it('reads the attributes flagHTML actually emits', async () => {
    // THE SEAM. Every other test here hand-writes `dataset`, and the block
    // tests assert on emitted HTML — so the two halves were verified
    // independently and the join between them by nothing. That is how
    // data-field-ref came to be emitted, asserted, and read by no one: the
    // certificate box the OV is looking at never reached Roger's delta.
    // This test takes the renderer's real output and feeds it to the handler.
    const html = rr.blocks.flagHTML({
      severity: 'medium',
      title: 'Signing date not today',
      description: 'Both pages dated 11.08',
      field_reference: 'Signing pages (pages 5, 11)'
    }, false);

    const attrs = {};
    const btnTag = html.slice(html.indexOf('<button'), html.indexOf('>', html.indexOf('<button')));
    for (const m of btnTag.matchAll(/data-([a-z-]+)="([^"]*)"/g)) {
      // Exactly the kebab -> camelCase mapping the browser does for dataset.
      attrs[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] =
        m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }

    const { wrap, btn, posts, fire } = setup(CONTEXT);
    btn.dataset = attrs;
    await fire(btn);
    await fire(wrap.querySelector('[data-propose-send]'));

    assert.equal(posts.length, 1);
    assert.equal(posts[0].body.flag_title, 'Signing date not today');
    assert.equal(posts[0].body.flag_severity, 'medium');
    assert.equal(posts[0].body.field_reference, 'Signing pages (pages 5, 11)',
      'the field reference on the card must reach the proposal, and so the rule set author');
  });

  it('carries the recommendations text only on a recommendations proposal', async () => {
    const { wrap, btn, posts, fire } = setup(CONTEXT);
    btn.dataset.kind = 'recommendations';
    await fire(btn);
    await fire(wrap.querySelector('[data-propose-send]'));
    assert.equal(posts[0].body.model_recommendation, 'Always expect HS 0406 here');
  });

  it('reads the context at SEND time, so a report that arrives later still proposes', async () => {
    // The checker page wires this at load, before the stream delivers the
    // certificate reference. A snapshot taken at wire time would be empty.
    let ctx = { reportData: null, certRef: '' };
    const rr = loadRenderReport();
    const container = el('div', {});
    const wrap = el('div', {});
    const btn = el('button', { class: 'propose-rule-btn', dataset: { kind: 'flag', title: 't', description: 'd' } });
    wrap.appendChild(btn); container.appendChild(wrap);
    const posts = [];
    global.document = { createElement: (t) => el(t, {}) };
    global.localStorage = { getItem: () => '', setItem: () => {} };
    global.fetch = async (url, init) => { posts.push(JSON.parse(init.body)); return { ok: true, status: 201, json: async () => ({}) }; };
    rr.wireProposeHandler(container, () => ctx);
    const fire = (t) => Promise.all((container.listeners.click || []).map((f) => f({ target: t })));

    ctx = CONTEXT; // the stream lands AFTER wiring
    await fire(btn);
    await fire(wrap.querySelector('[data-propose-send]'));
    assert.equal(posts.length, 1);
    assert.equal(posts[0].certificate_ref, '26/2/219286');
  });

  it('refuses to file a proposal that cannot be tied to a certificate', async () => {
    const { wrap, btn, posts, fire } = setup({ reportData: { certificate_info: {} }, certRef: '' });
    await fire(btn);
    await fire(wrap.querySelector('[data-propose-send]'));
    assert.equal(posts.length, 0, 'an untraceable proposal must never be written');
    assert.match(wrap.querySelector('.propose-note-row').querySelector('.propose-message').textContent,
      /No certificate reference/);
  });

  it('Cancel closes the row without sending', async () => {
    const { wrap, btn, posts, fire } = setup(CONTEXT);
    await fire(btn);
    await fire(wrap.querySelector('[data-propose-cancel]'));
    assert.equal(wrap.querySelector('.propose-note-row'), null);
    assert.equal(posts.length, 0);
  });

  it('a second Send while the first is in flight does not file twice', async () => {
    const { wrap, btn, posts, fire } = setup(CONTEXT);
    await fire(btn);
    const send = wrap.querySelector('[data-propose-send]');
    await Promise.all([fire(send), fire(send)]);
    assert.equal(posts.length, 1, 'the guard belongs on Send, not on the outer toggle button');
  });
});
