# Admin Rule Pipeline (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OVs propose rules from report findings with one click; Silvia/Roger review in a sidebar section; approved rule text exports as a Word delta for Roger's next master version; the rule set version archive becomes browsable.

**Architecture:** Proposals live as JSON files on a dedicated `app-data` git branch written via the GitHub REST API (survives Render redeploys, audit trail = commits, no deploy triggers). New server modules keep server.js thin: `github-store` (storage), `proposals` (validation + router), `delta-docx` (Word generation), `rule-versions` (archive listing). Client: propose buttons in the existing report blocks, two new sidebar pages.

**Tech Stack:** Node 20 (global fetch), Express 4 router, npm `docx` (new dep, server-side), vanilla JS pages on the existing design system. Spec: `docs/superpowers/specs/2026-08-11-admin-rule-pipeline-design.md`.

## Global Constraints

- Branch `feature/admin-rule-pipeline`; never merge/push without Silvia.
- Zero Claude API calls anywhere in this feature.
- Storage: GitHub repo from env `GITHUB_DATA_REPO` (default `silwww/ehc-checker`), branch `GITHUB_DATA_BRANCH` (default `app-data`), token `GITHUB_DATA_TOKEN`. Missing token → loud startup log + "not configured" API errors; NEVER silent.
- No silent drops: failed writes surface to the client with retry possible; double-decisions surface as conflict naming the first reviewer.
- `tier` (`library` | `rule`) is chosen by the reviewer at decision time; `reviewed_by` free-text required on every decision.
- Run `npm test` only (unit); never `tests/integration/`.
- All new pages behind existing `requireAuth`; styled from design-system tokens only.

---

### Task 1: `server/github-store.js`

**Files:**
- Create: `server/github-store.js`
- Test: `tests/unit/github-store.test.js`

**Interfaces:**
- Consumes: nothing from this codebase (global `fetch`, env).
- Produces (Tasks 2, 6 rely on these exact names):
  - `createStore(env)` → `{ configured: boolean, readJson(path), writeJson(path, obj, message, sha?), list(dir) }`
  - `readJson(path)` → `Promise<{ data: object, sha: string } | null>` (null on 404)
  - `writeJson(path, obj, message, sha?)` → `Promise<string>` (new sha); creates the branch from `main` HEAD on first write; throws `ConflictError` on sha mismatch (GitHub 409/422)
  - `list(dir)` → `Promise<Array<{ name, path, sha }>>` ([] on 404)
  - `ConflictError` class exported

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/github-store.test.js`:

```js
'use strict';

// github-store talks to the GitHub contents API for the app-data branch.
// All tests mock global.fetch — no network, no tokens.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { createStore, ConflictError } = require('../../server/github-store');

const ENV = {
  GITHUB_DATA_TOKEN: 'tok',
  GITHUB_DATA_REPO: 'silwww/ehc-checker',
  GITHUB_DATA_BRANCH: 'app-data'
};

let calls;
let responses;
const realFetch = global.fetch;

function respond(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
  });
}

beforeEach(() => {
  calls = [];
  responses = [];
  global.fetch = (url, opts) => {
    calls.push({ url: String(url), opts: opts || {} });
    if (responses.length === 0) throw new Error('Test bug: no queued response');
    return responses.shift();
  };
});
afterEach(() => { global.fetch = realFetch; });

describe('createStore', () => {
  it('configured=false without a token — and operations throw a loud not-configured error', async () => {
    const store = createStore({});
    assert.equal(store.configured, false);
    await assert.rejects(() => store.readJson('proposals/x.json'), /not configured/i);
  });
});

describe('readJson', () => {
  it('returns decoded data + sha', async () => {
    const store = createStore(ENV);
    const content = Buffer.from(JSON.stringify({ a: 1 })).toString('base64');
    responses.push(respond(200, { content, sha: 'abc', encoding: 'base64' }));
    const r = await store.readJson('proposals/x.json');
    assert.deepEqual(r.data, { a: 1 });
    assert.equal(r.sha, 'abc');
    assert.match(calls[0].url, /repos\/silwww\/ehc-checker\/contents\/proposals\/x\.json\?ref=app-data/);
    assert.equal(calls[0].opts.headers.Authorization, 'Bearer tok');
  });
  it('returns null on 404', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Not Found' }));
    assert.equal(await store.readJson('proposals/x.json'), null);
  });
  it('throws loud on other errors, naming the status', async () => {
    const store = createStore(ENV);
    responses.push(respond(500, { message: 'boom' }));
    await assert.rejects(() => store.readJson('p.json'), /500/);
  });
});

describe('writeJson', () => {
  it('PUTs base64 content on the data branch and returns the new sha', async () => {
    const store = createStore(ENV);
    responses.push(respond(201, { content: { sha: 'new' } }));
    const sha = await store.writeJson('proposals/x.json', { a: 1 }, 'msg');
    assert.equal(sha, 'new');
    const put = calls[0];
    assert.equal(put.opts.method, 'PUT');
    const body = JSON.parse(put.opts.body);
    assert.equal(body.branch, 'app-data');
    assert.equal(body.message, 'msg');
    assert.deepEqual(JSON.parse(Buffer.from(body.content, 'base64').toString()), { a: 1 });
    assert.equal(body.sha, undefined);
  });
  it('passes sha for updates and throws ConflictError on 409', async () => {
    const store = createStore(ENV);
    responses.push(respond(409, { message: 'conflict' }));
    await assert.rejects(() => store.writeJson('p.json', {}, 'm', 'oldsha'), ConflictError);
  });
  it('a 422 "branch not found" triggers branch creation from main, then retries the PUT', async () => {
    const store = createStore(ENV);
    responses.push(respond(422, { message: 'Branch app-data not found' })); // first PUT
    responses.push(respond(200, { object: { sha: 'mainsha' } }));           // GET main ref
    responses.push(respond(201, { ref: 'refs/heads/app-data' }));           // POST create ref
    responses.push(respond(201, { content: { sha: 'new' } }));              // retry PUT
    const sha = await store.writeJson('proposals/x.json', { a: 1 }, 'msg');
    assert.equal(sha, 'new');
    assert.match(calls[1].url, /git\/ref\/heads\/main/);
    assert.match(calls[2].url, /git\/refs$/);
    assert.equal(JSON.parse(calls[2].opts.body).ref, 'refs/heads/app-data');
  });
});

describe('list', () => {
  it('lists a directory on the data branch', async () => {
    const store = createStore(ENV);
    responses.push(respond(200, [{ name: 'a.json', path: 'proposals/a.json', sha: 's1' }]));
    const items = await store.list('proposals');
    assert.equal(items.length, 1);
    assert.equal(items[0].name, 'a.json');
  });
  it('returns [] when the directory does not exist yet', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Not Found' }));
    assert.deepEqual(await store.list('proposals'), []);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/unit/github-store.test.js`
Expected: FAIL — `Cannot find module '../../server/github-store'`.

- [ ] **Step 3: Implement `server/github-store.js`**

```js
'use strict';

// JSON storage on a dedicated git branch of the app's own repo, via the
// GitHub contents API. Rationale (spec §Storage): survives Render's
// ephemeral filesystem, every write is an audited commit, and pushes to
// the data branch never trigger a deploy (Render watches main only).

const API = 'https://api.github.com';

class ConflictError extends Error {}

function createStore(env) {
  const token = env.GITHUB_DATA_TOKEN;
  const repo = env.GITHUB_DATA_REPO || 'silwww/ehc-checker';
  const branch = env.GITHUB_DATA_BRANCH || 'app-data';
  const configured = Boolean(token);

  function headers() {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
  }

  function assertConfigured() {
    if (!configured) {
      throw new Error(
        'github-store not configured: set GITHUB_DATA_TOKEN (fine-grained token, Contents read/write on ' + repo + ')'
      );
    }
  }

  async function gh(path, opts) {
    const res = await fetch(`${API}${path}`, { ...opts, headers: headers() });
    return res;
  }

  async function readJson(path) {
    assertConfigured();
    const res = await gh(`/repos/${repo}/contents/${path}?ref=${branch}`, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`github-store read ${path}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const data = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    return { data, sha: body.sha };
  }

  async function ensureBranch() {
    const main = await gh(`/repos/${repo}/git/ref/heads/main`, { method: 'GET' });
    if (!main.ok) throw new Error(`github-store: cannot read main ref: ${main.status}`);
    const sha = (await main.json()).object.sha;
    const created = await gh(`/repos/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha })
    });
    if (!created.ok && created.status !== 422) {
      // 422 here means the branch now exists (race) — that is fine.
      throw new Error(`github-store: cannot create branch ${branch}: ${created.status}`);
    }
  }

  async function putContent(path, obj, message, sha) {
    const body = {
      message,
      branch,
      content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64')
    };
    if (sha) body.sha = sha;
    return gh(`/repos/${repo}/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  async function writeJson(path, obj, message, sha) {
    assertConfigured();
    let res = await putContent(path, obj, message, sha);
    if (res.status === 409) throw new ConflictError(`github-store write ${path}: conflict (sha mismatch)`);
    if (res.status === 422) {
      const text = await res.text();
      if (/branch.*not found/i.test(text)) {
        await ensureBranch();
        res = await putContent(path, obj, message, sha);
      } else if (/sha/i.test(text)) {
        throw new ConflictError(`github-store write ${path}: ${text}`);
      } else {
        throw new Error(`github-store write ${path}: 422 ${text}`);
      }
    }
    if (!res.ok) throw new Error(`github-store write ${path}: ${res.status} ${await res.text()}`);
    return (await res.json()).content.sha;
  }

  async function list(dir) {
    assertConfigured();
    const res = await gh(`/repos/${repo}/contents/${dir}?ref=${branch}`, { method: 'GET' });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`github-store list ${dir}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    return body.map((e) => ({ name: e.name, path: e.path, sha: e.sha }));
  }

  return { configured, readJson, writeJson, list };
}

module.exports = { createStore, ConflictError };
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test tests/unit/github-store.test.js` → all pass. Then `npm test` → all pass (baseline 142 + new).

- [ ] **Step 5: Commit**

```bash
git add server/github-store.js tests/unit/github-store.test.js
git commit -m "feat(store): JSON storage on the app-data git branch via GitHub API"
```

---

### Task 2: proposals domain + router (`server/proposals.js`)

**Files:**
- Create: `server/proposals.js`
- Test: `tests/unit/proposals.test.js`

**Interfaces:**
- Consumes (Task 1): `store.readJson/writeJson/list`, `ConflictError`.
- Produces:
  - `validateNewProposal(body)` → `{ ok: true, proposal } | { ok: false, error }` — fills id/status/timestamps
  - `createProposalsRouter({ store })` → Express Router mounting `POST /`, `GET /`, `POST /:id/decision`
  - Proposal JSON shape exactly as spec (id, created_at, certificate_ref, cert_type, source_kind, flag_severity, flag_title, flag_description, model_recommendation, proposer_note, status, tier, reviewed_by, reviewed_at, decision_note, exported_at?)

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/proposals.test.js`:

```js
'use strict';

// Proposal validation + the express router, tested over a real HTTP
// listener on an ephemeral port with a fake in-memory store — no
// network, no GitHub, no supertest dependency.

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { validateNewProposal, createProposalsRouter } = require('../../server/proposals');
const { ConflictError } = require('../../server/github-store');

function fakeStore() {
  const files = new Map(); // path -> { data, sha }
  let n = 0;
  return {
    configured: true,
    files,
    async readJson(p) { return files.has(p) ? { ...files.get(p) } : null; },
    async writeJson(p, obj, message, sha) {
      const cur = files.get(p);
      if (cur && sha && cur.sha !== sha) throw new ConflictError('sha mismatch');
      if (cur && !sha) throw new ConflictError('exists');
      const newSha = 's' + (++n);
      files.set(p, { data: obj, sha: newSha });
      return newSha;
    },
    async list() {
      return [...files.keys()].map((p) => ({ name: p.split('/').pop(), path: p, sha: files.get(p).sha }));
    }
  };
}

let server, base, store;

async function start(theStore) {
  const app = express();
  app.use(express.json());
  app.use('/api/proposals', createProposalsRouter({ store: theStore }));
  await new Promise((res) => { server = app.listen(0, res); });
  base = `http://127.0.0.1:${server.address().port}`;
}

function goodBody() {
  return {
    certificate_ref: '26/2/219286',
    cert_type: '8468',
    source_kind: 'flag',
    flag_severity: 'low',
    flag_title: 'New destination — Van der Vaart',
    flag_description: 'Consignee not in library.',
    model_recommendation: 'Add Van der Vaart to consignees.',
    proposer_note: 'seen twice this week'
  };
}

beforeEach(async () => {
  if (server) await new Promise((r) => server.close(r));
  store = fakeStore();
  await start(store);
});
after(async () => { if (server) await new Promise((r) => server.close(r)); });

describe('validateNewProposal', () => {
  it('accepts a full body and stamps id/status/created_at', () => {
    const r = validateNewProposal(goodBody());
    assert.equal(r.ok, true);
    assert.equal(r.proposal.status, 'pending');
    assert.match(r.proposal.id, /^\d{4}-\d{2}-\d{2}T.*-26-2-219286/);
    assert.equal(r.proposal.tier, null);
  });
  it('rejects missing certificate_ref / flag_title / bad source_kind', () => {
    assert.equal(validateNewProposal({ ...goodBody(), certificate_ref: '' }).ok, false);
    assert.equal(validateNewProposal({ ...goodBody(), flag_title: '' }).ok, false);
    assert.equal(validateNewProposal({ ...goodBody(), source_kind: 'weird' }).ok, false);
  });
});

describe('POST /api/proposals', () => {
  it('creates a pending proposal (201) and stores it', async () => {
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody())
    });
    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.status, 'pending');
    assert.equal(store.files.size, 1);
  });
  it('rejects a duplicate pending (same cert_ref + flag_title) with 409', async () => {
    await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    const res = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /already proposed/i);
  });
  it('invalid body → 400 with the reason', async () => {
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_kind: 'flag' })
    });
    assert.equal(res.status, 400);
  });
});

describe('GET /api/proposals', () => {
  it('returns all proposals', async () => {
    await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    const res = await fetch(`${base}/api/proposals`);
    const all = await res.json();
    assert.equal(all.proposals.length, 1);
  });
});

describe('POST /api/proposals/:id/decision', () => {
  async function createOne() {
    const res = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    return (await res.json()).id;
  }
  it('approve requires tier and reviewed_by; stamps the decision', async () => {
    const id = await createOne();
    const bad = await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved' })
    });
    assert.equal(bad.status, 400);
    const ok = await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'library', reviewed_by: 'SS' })
    });
    assert.equal(ok.status, 200);
    const updated = await ok.json();
    assert.equal(updated.status, 'approved');
    assert.equal(updated.tier, 'library');
    assert.equal(updated.reviewed_by, 'SS');
    assert.ok(updated.reviewed_at);
  });
  it('reject needs reviewed_by but no tier', async () => {
    const id = await createOne();
    const ok = await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected', reviewed_by: 'RRC', note: 'covered by E16' })
    });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).status, 'rejected');
  });
  it('deciding an already-decided proposal → 409 naming the first reviewer', async () => {
    const id = await createOne();
    await fetch(`${base}/api/proposals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' }) });
    const again = await fetch(`${base}/api/proposals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'rejected', reviewed_by: 'RRC' }) });
    assert.equal(again.status, 409);
    assert.match((await again.json()).error, /SS/);
  });
  it('unknown id → 404', async () => {
    const res = await fetch(`${base}/api/proposals/nope/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' }) });
    assert.equal(res.status, 404);
  });
});

describe('unconfigured store', () => {
  it('surfaces 503 "not configured", never an empty success', async () => {
    await new Promise((r) => server.close(r));
    const un = fakeStore();
    un.configured = false;
    un.readJson = un.writeJson = un.list = async () => { throw new Error('github-store not configured'); };
    await start(un);
    const res = await fetch(`${base}/api/proposals`);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /not configured/i);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/unit/proposals.test.js` → module not found.

- [ ] **Step 3: Implement `server/proposals.js`**

```js
'use strict';

// Rule-proposal domain + HTTP router. Storage is injected (github-store
// in production, an in-memory fake in tests). One JSON file per proposal
// under proposals/ on the app-data branch; every state change is a commit.

const express = require('express');
const { ConflictError } = require('./github-store');

const SOURCE_KINDS = ['flag', 'recommendations', 'manual'];
const DIR = 'proposals';

function slugRef(ref) {
  return String(ref || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function validateNewProposal(body) {
  const b = body || {};
  if (!b.certificate_ref || !String(b.certificate_ref).trim()) return { ok: false, error: 'certificate_ref is required' };
  if (!SOURCE_KINDS.includes(b.source_kind)) return { ok: false, error: `source_kind must be one of ${SOURCE_KINDS.join(', ')}` };
  if (!b.flag_title || !String(b.flag_title).trim()) return { ok: false, error: 'flag_title is required' };
  const created = new Date().toISOString();
  const proposal = {
    id: `${created.replace(/[:.]/g, '-')}-${slugRef(b.certificate_ref)}`,
    created_at: created,
    certificate_ref: String(b.certificate_ref),
    cert_type: b.cert_type ? String(b.cert_type) : null,
    source_kind: b.source_kind,
    flag_severity: b.flag_severity ? String(b.flag_severity) : null,
    flag_title: String(b.flag_title),
    flag_description: b.flag_description ? String(b.flag_description) : '',
    model_recommendation: b.model_recommendation ? String(b.model_recommendation) : '',
    proposer_note: b.proposer_note ? String(b.proposer_note) : '',
    status: 'pending',
    tier: null,
    reviewed_by: null,
    reviewed_at: null,
    decision_note: null
  };
  return { ok: true, proposal };
}

async function loadAll(store) {
  const entries = await store.list(DIR);
  const out = [];
  for (const e of entries) {
    const r = await store.readJson(e.path);
    if (r) out.push({ ...r.data, _sha: r.sha, _path: e.path });
  }
  return out;
}

function publicView(p) {
  const { _sha, _path, ...rest } = p;
  return rest;
}

function createProposalsRouter({ store }) {
  const router = express.Router();

  function handleStoreError(res, err) {
    if (/not configured/i.test(err.message)) {
      return res.status(503).json({ error: 'Proposal storage not configured — set GITHUB_DATA_TOKEN (see spec).' });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: 'Storage conflict — reload and retry.' });
    }
    console.error('[proposals]', err.message);
    return res.status(502).json({ error: `Proposal storage error: ${err.message}` });
  }

  router.post('/', async (req, res) => {
    const v = validateNewProposal(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    try {
      const all = await loadAll(store);
      const dup = all.find((p) => p.status === 'pending' &&
        p.certificate_ref === v.proposal.certificate_ref && p.flag_title === v.proposal.flag_title);
      if (dup) return res.status(409).json({ error: 'Already proposed for this certificate — pending review.' });
      await store.writeJson(`${DIR}/${v.proposal.id}.json`, v.proposal,
        `proposal: ${v.proposal.flag_title} (${v.proposal.certificate_ref})`);
      return res.status(201).json(v.proposal);
    } catch (err) { return handleStoreError(res, err); }
  });

  router.get('/', async (req, res) => {
    try {
      const all = await loadAll(store);
      all.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return res.json({ proposals: all.map(publicView) });
    } catch (err) { return handleStoreError(res, err); }
  });

  router.post('/:id/decision', async (req, res) => {
    const { decision, tier, reviewed_by, note } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected' });
    if (!reviewed_by || !String(reviewed_by).trim()) return res.status(400).json({ error: 'reviewed_by is required' });
    if (decision === 'approved' && !['library', 'rule'].includes(tier)) {
      return res.status(400).json({ error: 'tier (library | rule) is required on approve' });
    }
    try {
      const path = `${DIR}/${req.params.id}.json`;
      const cur = await store.readJson(path);
      if (!cur) return res.status(404).json({ error: 'Proposal not found' });
      if (cur.data.status !== 'pending') {
        return res.status(409).json({ error: `Already decided by ${cur.data.reviewed_by} (${cur.data.status}).` });
      }
      const updated = {
        ...cur.data,
        status: decision,
        tier: decision === 'approved' ? tier : null,
        reviewed_by: String(reviewed_by),
        reviewed_at: new Date().toISOString(),
        decision_note: note ? String(note) : null
      };
      await store.writeJson(path, updated, `decision: ${decision} — ${updated.flag_title} (by ${updated.reviewed_by})`, cur.sha);
      return res.json(updated);
    } catch (err) {
      if (err instanceof ConflictError) return res.status(409).json({ error: 'Already decided in a parallel session — reload.' });
      return handleStoreError(res, err);
    }
  });

  return router;
}

module.exports = { validateNewProposal, createProposalsRouter, loadAll, DIR };
```

- [ ] **Step 4: Run** — `node --test tests/unit/proposals.test.js` then `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add server/proposals.js tests/unit/proposals.test.js
git commit -m "feat(proposals): validation + router — create, list, decide with conflict safety"
```

---

### Task 3: mount in server.js + env plumbing

**Files:**
- Modify: `server/server.js` (near the `/api/classify` route; requires at top)
- Test: manual smoke in Task 8 (mounting is 6 lines; the router itself is covered by Task 2)

**Interfaces:**
- Consumes: `createStore` (Task 1), `createProposalsRouter` (Task 2).
- Produces: live endpoints under `/api/proposals` behind `requireAuth`.

- [ ] **Step 1: Add requires + mount**

In `server/server.js`, with the other requires:

```js
const { createStore } = require('./github-store');
const { createProposalsRouter } = require('./proposals');
```

After `app.use(requireAuth);` (and near the other /api routes):

```js
// Rule-proposal pipeline (spec: docs/superpowers/specs/2026-08-11-admin-rule-pipeline-design.md).
// Storage on the app-data git branch; loud when unconfigured, never silent.
const proposalStore = createStore(process.env);
if (!proposalStore.configured) {
  console.warn('[proposals] GITHUB_DATA_TOKEN not set — proposal endpoints will answer 503 until configured.');
}
app.use('/api/proposals', express.json(), createProposalsRouter({ store: proposalStore }));
```

(Confirm `express` is imported in server.js — it is — and that `express.json()` is not already globally mounted; mounting it route-local keeps the multipart routes untouched.)

- [ ] **Step 2: Boot check**

Run: `node -e "require('./server/server.js')" & sleep 1; curl -s localhost:3000/api/proposals | head -c 200; kill %1`
Expected: an auth redirect/401 (requireAuth) — NOT a crash. (With PORT set if 3000 busy.)

- [ ] **Step 3: Run `npm test`** → all pass (nothing server-boot-dependent in unit suite).

- [ ] **Step 4: Commit**

```bash
git add server/server.js
git commit -m "feat(server): mount /api/proposals behind auth; loud warning when store unconfigured"
```

---

### Task 4: propose buttons in the report

**Files:**
- Modify: `public/assets/render-report.js` (blocks.flagHTML ~line 174, blocks.recommendationsHTML ~line 298)
- Modify: `public/index.html` (delegated click handler in the main IIFE, near the other fileListEl listeners)
- Modify: `public/audit.html` (one CSS rule hiding the buttons in the document view)
- Test: `tests/unit/render-report-propose.test.js`

**Interfaces:**
- Consumes: `currentReportData` fields on index.html: `certificate_info.certificate_ref`, `cert_type_resolved`, `rule_set_update_recommendations`.
- Produces: buttons `.propose-rule-btn` with `data-kind="flag"|"recommendations"`, `data-title`, `data-severity`, `data-description`, `data-field-ref` (all HTML-escaped); POST body per Task 2's `validateNewProposal`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/render-report-propose.test.js` (same `new Function('window', src)` harness as checklist-to-sections.test.js — load certificate-fields.js then render-report.js into a fake window):

```js
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
      description: 'Consignee & co not in library',
      field_reference: 'I.5'
    }, false);
    assert.match(html, /propose-rule-btn/);
    assert.match(html, /data-kind="flag"/);
    assert.match(html, /data-title="New &quot;destination&quot; &lt;x&gt;"/);
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
```

Note: `blocks` is module-private today — this test requires exporting it: add `blocks` to the `global.EHCRenderReport = { ... }` export object (line ~813). That is part of this task's implementation.

- [ ] **Step 2: Run to verify failure** — `node --test tests/unit/render-report-propose.test.js`.

- [ ] **Step 3: Implement**

In `render-report.js` `flagHTML`, before the closing `</div>` of the card, add (skip when retracted):

```js
      const proposeBtn = isRetracted ? '' : `
          <div class="no-print" style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary btn-sm propose-rule-btn"
              data-kind="flag"
              data-title="${escapeHtml(flag.title || '')}"
              data-severity="${escapeHtml(flag.severity || '')}"
              data-description="${escapeHtml(flag.description || '')}"
              data-field-ref="${escapeHtml(flag.field_reference || '')}">Propose as rule</button>
          </div>`;
```

and interpolate `${proposeBtn}` after the meta line. In `recommendationsHTML`, add the same button (kind `recommendations`, `data-title="Rule set update recommendations"`, `data-description="${escapeHtml(String(recs))}"`) inside the card. Export `blocks` in the module export object. (If `btn-sm` doesn't exist in design-system.css, add a minimal `.btn-sm { padding: 4px 10px; font-size: var(--text-xs); }` next to the other `.btn` rules.)

In `public/index.html`, next to the existing delegated listeners:

```js
  // Propose-as-rule: delegated on the report container. Reads the flag
  // data from the button's attributes and the report context from
  // currentReportData; the button narrates its own state transitions.
  report.addEventListener('click', async (event) => {
    const btn = event.target.closest('.propose-rule-btn');
    if (!btn || btn.disabled) return;
    const note = window.prompt('Optional note for the reviewer (or leave empty):', '') ;
    if (note === null) return; // cancelled
    const info = (currentReportData && currentReportData.certificate_info) || {};
    const payload = {
      certificate_ref: info.certificate_ref || currentCertRef || 'unknown',
      cert_type: (currentReportData && currentReportData.cert_type_resolved) || null,
      source_kind: btn.dataset.kind,
      flag_severity: btn.dataset.severity || null,
      flag_title: btn.dataset.title,
      flag_description: btn.dataset.description || '',
      model_recommendation: (currentReportData && currentReportData.rule_set_update_recommendations) || '',
      proposer_note: note
    };
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Proposing…';
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (res.ok) { btn.textContent = 'Proposed ✓'; return; }
      if (res.status === 409) { btn.textContent = 'Already proposed'; return; }
      throw new Error(body.error || res.statusText);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = original;
      alert('Proposal failed: ' + err.message + '\nNothing was saved — you can retry.');
    }
  });
```

In `public/audit.html`, in its `<style>` (or a style tag near head): `.propose-rule-btn { display: none; }` with a one-line comment: the audit tab is a display-only document; proposing happens on the checker page.

- [ ] **Step 4: Run** — new test + `npm test` all pass.

- [ ] **Step 5: Commit**

```bash
git add public/assets/render-report.js public/index.html public/audit.html public/css/design-system.css tests/unit/render-report-propose.test.js
git commit -m "feat(report): Propose-as-rule buttons on flags and recommendations"
```

---

### Task 5: Word delta module (`server/delta-docx.js`)

**Files:**
- Create: `server/delta-docx.js`
- Test: `tests/unit/delta-docx.test.js`
- Modify: `package.json` (`npm install docx`)

**Interfaces:**
- Consumes: proposal objects (Task 2 shape).
- Produces (Task 6 relies on):
  - `deltaSections(proposals)` → `Array<{ heading, lines: string[] }>` — pure, fully unit-tested content builder (rule-tier proposals first, then a "Library additions" group)
  - `buildDeltaDocx(proposals)` → `Promise<Buffer>` — renders those sections with npm `docx` (A4, Arial, same conventions as the 8468 Desktop doc)

- [ ] **Step 1: `npm install docx`** (server dependency; version ^8 or ^9, whatever npm resolves).

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/delta-docx.test.js`:

```js
'use strict';

// Content building is pure and fully asserted; the docx rendering is
// checked structurally (valid non-trivial zip) — content correctness
// lives in deltaSections, which the renderer consumes 1:1.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { deltaSections, buildDeltaDocx } = require('../../server/delta-docx');

function approved(overrides) {
  return {
    id: 'x', created_at: '2026-08-11T15:00:00Z', certificate_ref: '26/2/219286',
    cert_type: '8468', source_kind: 'flag', flag_severity: 'low',
    flag_title: 'New destination — Van der Vaart',
    flag_description: 'Consignee not in library.',
    model_recommendation: 'Add Van der Vaart (NL) to consignees.',
    proposer_note: 'seen twice', status: 'approved', tier: 'rule',
    reviewed_by: 'SS', reviewed_at: '2026-08-11T16:00:00Z', decision_note: null,
    ...overrides
  };
}

describe('deltaSections', () => {
  it('rule-tier proposals come first, each with provenance lines', () => {
    const s = deltaSections([approved({ tier: 'library', flag_title: 'Lib entry' }), approved({})]);
    assert.equal(s[0].heading.includes('New destination'), true);
    assert.match(s[0].lines.join('\n'), /26\/2\/219286/);
    assert.match(s[0].lines.join('\n'), /Approved by SS/);
    const last = s[s.length - 1];
    assert.match(last.heading, /Library additions/);
    assert.match(last.lines.join('\n'), /Lib entry/);
  });
  it('uses model_recommendation as the proposed rule text, falling back to the flag description', () => {
    const s = deltaSections([approved({ model_recommendation: '' })]);
    assert.match(s[0].lines.join('\n'), /Consignee not in library/);
  });
});

describe('buildDeltaDocx', () => {
  it('produces a non-trivial docx (zip) buffer', async () => {
    const buf = await buildDeltaDocx([approved({})]);
    assert.equal(buf[0], 0x50); // 'P'
    assert.equal(buf[1], 0x4b); // 'K'
    assert.ok(buf.length > 2000);
  });
});
```

- [ ] **Step 3: Run to verify failure**, then implement `server/delta-docx.js`:

```js
'use strict';

// Word delta for Roger: approved proposals rendered as paste-ready
// sections for the next master rule set version. Content building
// (deltaSections) is pure; buildDeltaDocx renders it with npm docx.

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

function fmtDate(iso) { return String(iso || '').slice(0, 10); }

function provenance(p) {
  return [
    `Source: certificate ${p.certificate_ref}` + (p.cert_type ? ` (EHC ${p.cert_type})` : '') + `, ${fmtDate(p.created_at)}.`,
    p.proposer_note ? `Proposer note: ${p.proposer_note}` : null,
    `Approved by ${p.reviewed_by} on ${fmtDate(p.reviewed_at)}` + (p.decision_note ? ` — ${p.decision_note}` : '') + '.'
  ].filter(Boolean);
}

function ruleText(p) {
  return p.model_recommendation && p.model_recommendation.trim()
    ? p.model_recommendation.trim()
    : p.flag_description;
}

function deltaSections(proposals) {
  const rules = proposals.filter((p) => p.tier === 'rule');
  const libs = proposals.filter((p) => p.tier === 'library');
  const sections = rules.map((p) => ({
    heading: p.flag_title,
    lines: ['Proposed rule text:', ruleText(p), ...provenance(p)]
  }));
  if (libs.length > 0) {
    sections.push({
      heading: 'Library additions',
      lines: libs.flatMap((p) => [`• ${p.flag_title}`, ruleText(p), ...provenance(p), ''])
    });
  }
  return sections;
}

async function buildDeltaDocx(proposals) {
  const sections = deltaSections(proposals);
  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('EHC Checker — Rule set delta')] }),
    new Paragraph({ children: [new TextRun({ text: 'Approved proposals awaiting inclusion in the next master rule set version. Generated by the EHC Checker admin pipeline.', italics: true })] })
  ];
  for (const s of sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(s.heading)] }));
    for (const line of s.lines) {
      children.push(new Paragraph({ children: [new TextRun(String(line))] }));
    }
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children
    }]
  });
  return Packer.toBuffer(doc);
}

module.exports = { deltaSections, buildDeltaDocx };
```

- [ ] **Step 4: Run** — module tests + `npm test` all pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json server/delta-docx.js tests/unit/delta-docx.test.js
git commit -m "feat(delta): Word delta builder for approved proposals (docx)"
```

---

### Task 6: delta endpoint with export marking

**Files:**
- Modify: `server/proposals.js` (add route to the router)
- Test: extend `tests/unit/proposals.test.js`

**Interfaces:**
- Consumes: `buildDeltaDocx` (Task 5), `loadAll`.
- Produces: `GET /api/proposals/delta.docx` → docx download of approved+unexported (marks them `exported_at`); `?again=1` regenerates the most recent exported batch without marking; zero eligible → 409 with count message.

- [ ] **Step 1: Add failing tests** to `tests/unit/proposals.test.js`:

```js
describe('GET /api/proposals/delta.docx', () => {
  async function createApproved(title) {
    const res = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...goodBody(), flag_title: title }) });
    const { id } = await res.json();
    await fetch(`${base}/api/proposals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' }) });
    return id;
  }
  it('downloads a docx of approved-unexported proposals and marks them exported', async () => {
    await createApproved('Rule A');
    const res = await fetch(`${base}/api/proposals/delta.docx`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /officedocument/);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf[0], 0x50);
    const all = await (await fetch(`${base}/api/proposals`)).json();
    assert.ok(all.proposals.find((p) => p.flag_title === 'Rule A').exported_at);
  });
  it('nothing eligible → 409 with a clear message', async () => {
    const res = await fetch(`${base}/api/proposals/delta.docx`);
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /no approved/i);
  });
  it('?again=1 re-downloads the last exported batch without re-marking', async () => {
    await createApproved('Rule B');
    await fetch(`${base}/api/proposals/delta.docx`);
    const again = await fetch(`${base}/api/proposals/delta.docx?again=1`);
    assert.equal(again.status, 200);
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement in `createProposalsRouter` (BEFORE the `/:id/decision` route so `delta.docx` isn't captured as an id):

```js
  const { buildDeltaDocx } = require('./delta-docx'); // top of file

  router.get('/delta.docx', async (req, res) => {
    try {
      const all = await loadAll(store);
      let batch;
      if (req.query.again) {
        const exported = all.filter((p) => p.exported_at);
        if (exported.length === 0) return res.status(409).json({ error: 'No previously exported delta to re-download.' });
        const last = exported.map((p) => p.exported_at).sort().pop();
        batch = exported.filter((p) => p.exported_at === last);
      } else {
        batch = all.filter((p) => p.status === 'approved' && !p.exported_at);
        if (batch.length === 0) return res.status(409).json({ error: 'No approved, unexported proposals — nothing to put in a delta.' });
      }
      const buf = await buildDeltaDocx(batch);
      if (!req.query.again) {
        const stamp = new Date().toISOString();
        for (const p of batch) {
          const cur = await store.readJson(p._path);
          await store.writeJson(p._path, { ...cur.data, exported_at: stamp }, `delta export: ${p.flag_title}`, cur.sha);
        }
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="EHC_Checker_rule_set_delta_${new Date().toISOString().slice(0, 10)}.docx"`);
      return res.send(buf);
    } catch (err) { return handleStoreError(res, err); }
  });
```

Note: `loadAll` must keep `_path`/`_sha` for this route — it already does; `publicView` strips them only for the JSON list.

- [ ] **Step 3: Run** — extended tests + `npm test` all pass.

- [ ] **Step 4: Commit**

```bash
git add server/proposals.js tests/unit/proposals.test.js
git commit -m "feat(delta): /api/proposals/delta.docx — export approved proposals, marked and re-downloadable"
```

---

### Task 7: version archive (`server/rule-versions.js` + endpoints)

**Files:**
- Create: `server/rule-versions.js`
- Modify: `server/server.js` (two GET routes)
- Test: `tests/unit/rule-versions.test.js`

**Interfaces:**
- Produces:
  - `listRuleVersions(rulesDir)` → `Array<{ commodity, filename, size }>` (scans `rules/*/source/*`, name-sorted descending per commodity)
  - `resolveVersionFile(rulesDir, commodity, filename)` → absolute path | null (rejects traversal, unknown names)
  - `GET /api/rule-versions` → `{ versions: [...] }`; `GET /api/rule-versions/download?commodity=&file=` → file download or 404

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/rule-versions.test.js`:

```js
'use strict';

// Archive listing runs against the REAL rules/ tree — the repo ships
// 15+ archived master versions, so the test asserts real content.

const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { listRuleVersions, resolveVersionFile } = require('../../server/rule-versions');

const RULES = path.join(__dirname, '../../rules');

describe('listRuleVersions', () => {
  it('finds the dairy archive with v4_6 present, sizes > 0', () => {
    const all = listRuleVersions(RULES);
    const dairy = all.filter((v) => v.commodity === 'dairy-uk-eu');
    assert.ok(dairy.length >= 10);
    assert.ok(dairy.some((v) => v.filename.includes('v4_6')));
    for (const v of dairy) assert.ok(v.size > 0);
  });
  it('sorts newest-looking filenames first within a commodity', () => {
    const dairy = listRuleVersions(RULES).filter((v) => v.commodity === 'dairy-uk-eu');
    assert.ok(dairy.findIndex((v) => v.filename.includes('v4_6')) <
              dairy.findIndex((v) => v.filename.includes('v2_7')));
  });
});

describe('resolveVersionFile', () => {
  it('resolves a real archived file', () => {
    const p = resolveVersionFile(RULES, 'dairy-uk-eu', 'EHC_Checker_RULE_SET_v4_6.docx');
    assert.ok(p && p.endsWith('source/EHC_Checker_RULE_SET_v4_6.docx'));
  });
  it('rejects traversal and unknown files', () => {
    assert.equal(resolveVersionFile(RULES, '..', 'x'), null);
    assert.equal(resolveVersionFile(RULES, 'dairy-uk-eu', '../../.env'), null);
    assert.equal(resolveVersionFile(RULES, 'dairy-uk-eu', 'nope.docx'), null);
  });
});
```

- [ ] **Step 2: Run to verify failure**, then implement `server/rule-versions.js`:

```js
'use strict';

// Read-only rule set version archive: lists rules/*/source/* from the
// deployed repo itself (the archive already holds every master docx
// since v1.8) and resolves download paths traversal-safely by matching
// ONLY names that the scan itself produced.

const fs = require('fs');
const path = require('path');

function listRuleVersions(rulesDir) {
  const out = [];
  for (const commodity of fs.readdirSync(rulesDir)) {
    const src = path.join(rulesDir, commodity, 'source');
    if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) continue;
    for (const filename of fs.readdirSync(src)) {
      const full = path.join(src, filename);
      if (!fs.statSync(full).isFile()) continue;
      out.push({ commodity, filename, size: fs.statSync(full).size });
    }
  }
  out.sort((a, b) => a.commodity.localeCompare(b.commodity) || b.filename.localeCompare(a.filename));
  return out;
}

function resolveVersionFile(rulesDir, commodity, filename) {
  const known = listRuleVersions(rulesDir).find(
    (v) => v.commodity === commodity && v.filename === filename
  );
  if (!known) return null;
  return path.join(rulesDir, commodity, 'source', filename);
}

module.exports = { listRuleVersions, resolveVersionFile };
```

In `server/server.js` (near the other GET routes, behind requireAuth; `REPO_ROOT`/`path` already exist there):

```js
const { listRuleVersions, resolveVersionFile } = require('./rule-versions');

app.get('/api/rule-versions', requireAuth, (req, res) => {
  try {
    res.json({ versions: listRuleVersions(path.join(REPO_ROOT, 'rules')) });
  } catch (err) {
    res.status(500).json({ error: `Archive listing failed: ${err.message}` });
  }
});

app.get('/api/rule-versions/download', requireAuth, (req, res) => {
  const p = resolveVersionFile(path.join(REPO_ROOT, 'rules'), String(req.query.commodity || ''), String(req.query.file || ''));
  if (!p) return res.status(404).json({ error: 'Unknown archive file' });
  res.download(p);
});
```

- [ ] **Step 3: Run** — new tests + `npm test` all pass.

- [ ] **Step 4: Commit**

```bash
git add server/rule-versions.js server/server.js tests/unit/rule-versions.test.js
git commit -m "feat(archive): rule set version archive endpoints — list + traversal-safe download"
```

---

### Task 8: the two sidebar pages + wire-up + visual check

**Files:**
- Create: `public/proposals.html`
- Create: `public/rule-set.html`
- Modify: `public/assets/sidebar.js` (flip two NAV entries live; pending-count badge)
- Modify: `public/css/design-system.css` (only if a small `.sidebar-badge` class is needed)

**Interfaces:**
- Consumes: `GET/POST /api/proposals`, `POST /api/proposals/:id/decision`, `GET /api/proposals/delta.docx(?again=1)`, `GET /api/rule-versions(/download)`.
- Produces: working pages at `/proposals.html` and `/rule-set.html`.

- [ ] **Step 1: `public/proposals.html`** — same skeleton as admin.html (head: design-system.css + sidebar.js defer; a simple `.container.app-main`). Content:
  - `<h1>Rule proposals</h1>`, subtitle: "OVs propose from report findings; a reviewer approves or rejects. Approved rule text goes into the next Word delta for the rule set author."
  - Toolbar: `<button id="btn-delta" class="btn btn-primary" disabled>Download delta for Roger</button>` `<a id="link-delta-again" class="text-sm" hidden href="/api/proposals/delta.docx?again=1">Re-download last delta</a>` and `<span id="delta-count" class="text-sm text-secondary"></span>`.
  - `<section id="pending-list">` and `<section id="decided-list">`, each a stack of `card-flat` cards.
  - Inline script: `loadProposals()` fetches `/api/proposals`; renders pending cards with full context (title, severity badge reusing `badge badge-<severity>`, cert ref mono, description, model recommendation, proposer note) + a decision row: `<select>` tier (Rule text / Library entry), `<input placeholder="Your name (required)">`, `<input placeholder="Note (optional)">`, Approve (btn-primary) / Reject (btn-secondary) buttons; POSTs to `/api/proposals/<id>/decision`, re-renders, shows any error text inline in the card (`banner-error`), including the 409 "already decided by …". Decided cards show status, tier, reviewer, date, exported-at when present. 503 from the API renders a `banner-warning` with the not-configured message — never an empty list. Delta button enabled iff `approved && !exported_at` count > 0, label shows the count; clicking navigates to `/api/proposals/delta.docx`; re-download link visible iff any `exported_at` exists.
- [ ] **Step 2: `public/rule-set.html`** — same skeleton. Content: `<h1>Rule set</h1>`; a `card-flat` with the current version (fetch `/api/admin/stats` — it already returns rule_set_version, version date, source document); then "Version archive" — fetch `/api/rule-versions`, group by commodity, one row per file: mono filename, size in KB, `<a class="btn btn-secondary btn-sm" href="/api/rule-versions/download?commodity=..&file=..">Download</a>`. Errors render as `banner-error`, empty archive states itself honestly.
  (Check the actual stats endpoint path in server.js — it is the one admin.html's Stats tab calls; reuse exactly that path.)
- [ ] **Step 3: `sidebar.js`** — flip `{ label: 'Rule proposals', href: '/proposals.html' }` and `{ label: 'Rule set', href: '/rule-set.html' }`. After injection, fetch `/api/proposals` and, on success, render `<span class="sidebar-badge">N</span>` (pending count, only if > 0) inside the Rule proposals item; on failure (503/network) skip silently — the badge is an ornament, the page itself reports errors loudly. Add `.sidebar-badge { margin-left: auto; background: var(--color-accent); color: #fff; border-radius: 999px; font-size: var(--text-xs); padding: 0 7px; line-height: 1.7; }` to design-system.css (and make `.sidebar-item` keep `justify-content: space-between` working with it: put the badge before the Soon-tag position).
- [ ] **Step 4: Visual check** — start the server (`PORT=3999 node server/server.js`), Playwright: login, screenshot `/proposals.html` (expect the not-configured banner if no token, which IS the correct honest state) and `/rule-set.html` (expect the real 15-version archive). Fix anything broken.
- [ ] **Step 5: Full suite** — `npm test` all pass.
- [ ] **Step 6: Commit**

```bash
git add public/proposals.html public/rule-set.html public/assets/sidebar.js public/css/design-system.css
git commit -m "feat(pages): Rule proposals + Rule set sidebar pages; pending-count badge"
```

---

### Task 9: close out

- [ ] **Step 1:** `npm test` one last time — all pass.
- [ ] **Step 2:** Update the spec's Status line: `Phase 1 implemented on feature/admin-rule-pipeline — awaiting Silvia's review, live GitHub-token setup, and live validation.`
- [ ] **Step 3:** Commit. Do NOT merge, do NOT push. Silvia must: review the pages live, create the fine-grained `GITHUB_DATA_TOKEN` (guide her), and validate one full propose→approve→delta cycle before merge.
