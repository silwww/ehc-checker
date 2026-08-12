'use strict';

// Shell-page invariants.
//
// This project has been bitten twice by the same shape: one behaviour
// hand-copied into several pages, fixed in one copy, left broken in the
// others — the logout button (four copies, three broken, and the CSS that
// retired them only applied above 900px, so the broken one was the visible
// one on a depot tablet) and the XML sanitiser (two copies with identical
// blind spots). Copies are invisible to a reviewer reading one file, so the
// guard belongs in the suite rather than in anyone's attention.

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const PUBLIC = path.join(__dirname, '../../public');
// Every page that carries the shared footer. audit.html has no sidebar at
// any width, but it does show a report — and it is the source of the
// exported PDF — so it takes the same footer and the same disclaimer.
// Leaving it out is what let "three copies became two, not one" stand.
const SHELL = ['index.html', 'admin.html', 'proposals.html', 'rule-set.html', 'audit.html'];

// Pages that display a report, and must therefore say so.
const REPORT_PAGES = ['index.html', 'audit.html'];

const read = (f) => fs.readFileSync(path.join(PUBLIC, f), 'utf8');

// Comments are stripped before any structural assertion. An earlier version
// of this file matched /<body[^>]*data-ai-disclaimer/ against the WHOLE
// document — and index.html carries a comment that explains the attribute by
// quoting it. The comment satisfied the regex, so deleting the real
// attribute from the real <body> left the suite green. A test that its own
// documentation can satisfy is not a test.
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
const bodyTag = (html) => (stripComments(html).match(/<body\b[^>]*>/i) || [''])[0];

// indexOf returns -1 for "absent", and -1 is less than every real index, so
// an ordering assertion written as a < b silently passes when a is missing
// entirely — which is the failure the ordering test exists to catch.
function scriptIndex(html, src) {
  const i = html.indexOf(src);
  assert.notEqual(i, -1, `${src} is not loaded at all`);
  return i;
}

describe('shell pages share one footer', () => {
  for (const page of SHELL) {
    it(`${page} loads footer.js exactly once`, () => {
      const html = read(page);
      const tags = html.match(/<script src="\/assets\/footer\.js"/g) || [];
      assert.equal(tags.length, 1);
    });

    it(`${page} does not hand-write its own footer`, () => {
      assert.doesNotMatch(read(page), /<footer/,
        'the footer is injected — a hand-written one would drift from the others');
    });

    it(`${page} does not carry its own auth-status fetch`, () => {
      const html = read(page);
      assert.doesNotMatch(html, /initAuthStatus/,
        'auth status belongs to the footer that displays it');
      assert.doesNotMatch(html, /id="authStatus"/,
        'the auth-status element is built by footer.js');
    });

    it(`${page} loads logout.js before footer.js`, () => {
      // footer.js calls EHCWireLogout at injection time; loaded first — or
      // not loaded at all — the function does not exist and the injected
      // Log out button throws instead of silently doing nothing.
      const html = read(page);
      assert.ok(scriptIndex(html, '/assets/logout.js') < scriptIndex(html, '/assets/footer.js'),
        'footer.js wires its own logout button and needs logout.js already defined');
    });
  }
});

// A check is 45-130s and one paid model call. The loader carried the only
// Cancel, and the 45s skeleton reveal destroys the loader — so Cancel was
// offered exactly while the wait was still cheap and withdrawn for the
// expensive half.
describe('the check can be abandoned for its whole length', () => {
  const html = read('index.html');

  it('offers a cancel control beside the streaming report', () => {
    assert.match(html, /id="streaming-cancel-bar"/);
    assert.match(html, /id="btn-cancel-check"/);
  });

  it('keeps that control OUTSIDE the container the renderer rewrites', () => {
    const bar = html.indexOf('id="streaming-cancel-bar"');
    const report = html.indexOf('id="report-section"');
    assert.notEqual(bar, -1);
    assert.notEqual(report, -1);
    assert.ok(bar < report, 'the bar must precede the report container');
    // The report container ships EMPTY: everything in it is generated, and
    // streaming.init() replaces its innerHTML wholesale. A cancel button
    // placed inside it would be destroyed by the reveal it must survive.
    assert.match(html, /<section id="report-section"[^>]*><\/section>/,
      'report-section must stay empty in the markup for this to hold');
  });

  it('the reveal hands Cancel over instead of dropping it', () => {
    // ensureReportVisible() stops the loader; the bar must appear in the
    // same step, or there is a gap with no way out.
    const reveal = html.slice(html.indexOf('function ensureReportVisible'));
    const body = reveal.slice(0, reveal.indexOf('\n    }'));
    assert.match(body, /EHCShaggyLoader\.stop\(\)/);
    assert.match(body, /cancelBar\.hidden = false/);
  });
});

describe('the AI disclaimer is claimed, not assumed', () => {
  for (const page of REPORT_PAGES) {
    it(`${page} opts in — it shows a report`, () => {
      assert.match(bodyTag(read(page)), /\bdata-ai-disclaimer\b/);
    });
  }

  for (const page of SHELL.filter((p) => !REPORT_PAGES.includes(p))) {
    it(`${page} does not — it shows no report`, () => {
      assert.doesNotMatch(bodyTag(read(page)), /\bdata-ai-disclaimer\b/);
    });
  }

  it('the exported PDF carries it too — that is the copy that leaves the app', () => {
    // The PDF is emailed and filed; a reader may only ever see one printed
    // page of it, so the notice goes on every page, not once at the end.
    const src = fs.readFileSync(path.join(PUBLIC, 'assets/generate-pdf.js'), 'utf8');
    assert.match(src, /AI-assisted verification/);
    assert.match(src, /remains fully responsible/);
    const footers = src.slice(src.indexOf('function renderAllFooters'));
    assert.match(footers, /PDF_DISCLAIMER/,
      'the disclaimer must be drawn in the per-page footer loop');
  });
});

// These run footer.js for real, against a minimal document stub, and assert
// on what it PRODUCES. The previous version grepped its source text: an
// inverted gate (`if (!hasAttribute(...))`) kept every asserted string and
// stayed green while printing the disclaimer on exactly the three pages the
// block above says must not have it.
describe('the shared footer, executed', () => {
  const SRC = fs.readFileSync(path.join(PUBLIC, 'assets/footer.js'), 'utf8');

  function runFooter({ disclaimer }) {
    const nodes = [];
    const make = (tag) => {
      const el = {
        tagName: tag, className: '', textContent: '', innerHTML: '', attrs: {},
        children: [], listeners: {},
        appendChild(c) { this.children.push(c); return c; },
        setAttribute(k, v) { this.attrs[k] = v; },
        addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
        querySelector(sel) {
          // Good enough for #id and .class over the built subtree.
          const hay = this.innerHTML + this.children.map((c) => c.innerHTML).join('');
          return hay.indexOf(sel.replace(/^[#.]/, '')) !== -1 ? make('stub') : null;
        }
      };
      nodes.push(el);
      return el;
    };
    const body = make('body');
    body.hasAttribute = (a) => (a === 'data-ai-disclaimer' ? Boolean(disclaimer) : false);
    const wired = [];
    const win = { EHCWireLogout: (btn) => wired.push(btn) };
    const doc = { createElement: make, body };
    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'fetch', SRC)(
      win, doc, () => Promise.resolve({ json: () => Promise.resolve({}) })
    );
    const footer = body.children[body.children.length - 1];
    const html = footer.children.map((c) => c.innerHTML).join('');
    return { footer, html, wired };
  }

  it('prints the disclaimer only when the page claims it', () => {
    const withIt = runFooter({ disclaimer: true });
    const withoutIt = runFooter({ disclaimer: false });
    const textOf = (r) => r.footer.children
      .flatMap((c) => [c.innerHTML, ...c.children.map((g) => g.innerHTML + g.textContent)]).join(' ');
    assert.match(textOf(withIt), /AI-assisted verification/);
    assert.doesNotMatch(textOf(withoutIt), /AI-assisted verification/);
  });

  it('attaches the footer to the document rather than building it and dropping it', () => {
    const { footer } = runFooter({ disclaimer: false });
    assert.equal(footer.className, 'app-footer');
  });

  it('wires exactly one logout button, the only way off a shared depot machine', () => {
    const { wired } = runFooter({ disclaimer: false });
    assert.equal(wired.length, 1);
    assert.ok(wired[0], 'wiring a null element is the same as not wiring one');
  });

  it('throws rather than shipping an unwired Log out button', () => {
    // If logout.js failed to load, a guarded call would leave a fully styled,
    // fully visible button that does nothing — the OV walks away from the
    // tablet believing the session ended. Loud beats plausible.
    const body = { children: [], appendChild(c) { this.children.push(c); }, hasAttribute: () => false };
    const make = (tag) => ({
      tagName: tag, className: '', textContent: '', innerHTML: '', children: [],
      appendChild(c) { this.children.push(c); return c; },
      setAttribute() {}, querySelector: () => null
    });
    assert.throws(() => {
      // eslint-disable-next-line no-new-func
      new Function('window', 'document', 'fetch', SRC)(
        {}, { createElement: make, body }, () => Promise.resolve({ json: () => Promise.resolve({}) })
      );
    }, /EHCWireLogout/);
  });

  it('names both authors — the tool and the rule set have different owners', () => {
    const { footer } = runFooter({ disclaimer: false });
    const text = footer.children.map((c) => c.innerHTML).join(' ');
    assert.match(text, /Silvia Soescu MRCVS/);
    assert.match(text, /RR Cunningham MRCVS/);
  });

  it('ships the logout hidden until a session is confirmed', () => {
    const { footer } = runFooter({ disclaimer: false });
    assert.match(footer.children.map((c) => c.innerHTML).join(' '), /id="authStatus" hidden/);
  });
});
