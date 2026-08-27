'use strict';

// The proposals page renders from template functions inside an inline
// <script>. An earlier version of this file asserted on the page SOURCE --
// regexes for '/delete', 'deleted=1', 'internal_note'. A mutation run showed
// six ways to break the feature completely (renaming data-action="restore"
// so the handler never matches, deleting both wireBinActions() calls,
// deleting the internal note from both render sites, removing the Bin button
// entirely) that all left this file green. Source text survives the removal
// of the behaviour it describes.
//
// render-report-propose.test.js already learned this lesson for this repo,
// in almost these words. So: extract the render functions and RUN them, and
// assert on what they produce.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const PAGE = path.join(__dirname, '../../public/proposals.html');
const page = fs.readFileSync(PAGE, 'utf8');
const script = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/.exec(page)[1];

// Brace-match a named function out of the inline script. Deliberately not a
// regex over the whole body: a greedy match would swallow the rest of the
// file and the tests would assert on the wrong thing while still passing.
function extract(name) {
  const start = script.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, `proposals.html must define ${name}()`);
  let depth = 0;
  for (let i = script.indexOf('{', start); i < script.length; i++) {
    if (script[i] === '{') depth++;
    else if (script[i] === '}' && --depth === 0) return script.slice(start, i + 1);
  }
  throw new Error(`unbalanced braces in ${name}()`);
}

const NAMES = ['esc', 'severityBadge', 'internalNoteHTML', 'provenanceHTML',
  'contextHTML', 'trashIcon', 'binZoneHTML', 'pendingCard', 'decidedRows'];
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(NAMES.map(extract).join('\n') + '\n', sandbox);
const render = (fn, arg) => vm.runInContext(`${fn}(${JSON.stringify(arg)})`, sandbox);

const PENDING = {
  id: 'q1', created_at: '2026-08-25T09:00:00Z', source_kind: 'flag',
  certificate_ref: '26/2/133948', cert_type: '8468', flag_severity: 'medium',
  flag_title: 'Seal number does not match the dispatch note',
  flag_description: 'Certificate reads BB546; dispatch note reads 33546.',
  model_recommendation: '', internal_note: 'pCloud 4471',
  proposed_by: 'Silvia', proposer_note: 'third time this week'
};

const DECIDED = {
  id: 'p1', reviewed_at: '2026-08-12', certificate_ref: '26/2/219286',
  cert_type: '8468', flag_title: 'New destination not in library',
  status: 'approved', tier: 'library', reviewed_by: 'Silvia',
  exported_at: '2026-08-12', internal_note: 'pCloud 4468',
  flag_description: 'Van der Vaart, first appearance.',
  model_recommendation: '', proposed_by: 'Silvia', proposer_note: '', decision_note: ''
};

describe('proposals page — the bin is actually rendered', () => {
  it('puts a bin control on a pending card', () => {
    const html = render('pendingCard', PENDING);
    assert.match(html, /data-role="bin-open"/);
    assert.match(html, /data-action="delete"/);
    assert.match(html, new RegExp(`data-id="${PENDING.id}"`));
  });

  it('puts a bin control on a decided row, exported ones included', () => {
    const html = render('decidedRows', DECIDED);
    assert.match(html, /data-role="bin-open"/);
    assert.match(html, /data-action="delete"/);
  });

  // Revert is refused once exported; the bin is not. If these two ever swap,
  // an old row becomes unclearable and a delivered decision becomes undoable.
  it('offers the bin but not revert on an exported row', () => {
    const html = render('decidedRows', DECIDED);
    assert.match(html, /data-role="bin-open"/);
    assert.doesNotMatch(html, /data-action="revert"/);
  });

  it('offers revert as well as the bin while nothing has been exported', () => {
    const html = render('decidedRows', { ...DECIDED, exported_at: null });
    assert.match(html, /data-action="revert"/);
    assert.match(html, /data-role="bin-open"/);
  });

  it('draws the bin icon rather than emitting an emoji glyph', () => {
    assert.match(render('binZoneHTML', 'x'), /<svg/);
  });

  it('hides the confirm strip until the bin is opened', () => {
    assert.match(render('binZoneHTML', 'x'), /data-role="bin-strip" hidden/);
  });
});

describe('proposals page — the internal note reaches the reviewer', () => {
  it('renders on a pending card', () => {
    assert.match(render('pendingCard', PENDING), /pCloud 4471/);
  });

  it('renders on a decided row', () => {
    assert.match(render('decidedRows', DECIDED), /pCloud 4468/);
  });

  it('says on screen that it is not sent to the rule set author', () => {
    assert.match(render('internalNoteHTML', PENDING), /not sent to the rule set author/i);
  });

  it('renders nothing at all when there is no note', () => {
    assert.equal(render('internalNoteHTML', { ...PENDING, internal_note: '' }), '');
  });

  it('escapes it — a filing reference is free text typed by a person', () => {
    const html = render('internalNoteHTML', { ...PENDING, internal_note: '<img src=x onerror=alert(1)>' });
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img/);
  });
});

describe('proposals page — source-level guards', () => {
  // These two genuinely belong at source level: one is about a string that
  // must NOT exist anywhere, the other about a URL the handlers call. Neither
  // is reachable through the render functions.
  it('does not name the rule set author anywhere in the UI', () => {
    assert.doesNotMatch(page, /Roger/);
  });

  it('asks the server for deleted records rather than filtering client-side', () => {
    assert.match(page, /deleted=1/);
  });
});

// STILL NOT COVERED, stated rather than implied: the click wiring itself.
// wireBinActions(), the restore handler and the Bin toggle are event
// listeners on live DOM nodes; deleting the wireBinActions() calls leaves
// every button inert and every test above still passes. Closing that needs a
// fake-DOM harness like the one in render-report-propose.test.js.
