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
  it('path-traversal ids are rejected as 404, never used as a storage path', async () => {
    for (const evil of ['..%2F..%2Frules%2Fx', 'a%2F..%2F..%2Fescape', '..']) {
      const res = await fetch(`${base}/api/proposals/${evil}/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' })
      });
      assert.equal(res.status, 404, `expected 404 for ${evil}`);
    }
    assert.equal(store.files.size, 0, 'nothing may be written for traversal ids');
  });
  it('unknown id → 404', async () => {
    const res = await fetch(`${base}/api/proposals/nope/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' }) });
    assert.equal(res.status, 404);
  });
});

describe('delta export', () => {
  async function createApproved(title) {
    const res = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...goodBody(), flag_title: title }) });
    const { id } = await res.json();
    await fetch(`${base}/api/proposals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' }) });
    return id;
  }
  it('POST downloads a docx of approved-unexported proposals and marks them exported', async () => {
    await createApproved('Rule A');
    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /officedocument/);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf[0], 0x50);
    const all = await (await fetch(`${base}/api/proposals`)).json();
    assert.ok(all.proposals.find((p) => p.flag_title === 'Rule A').exported_at);
  });
  it('plain GET is refused (405) — the export changes state and must not be CSRF-able', async () => {
    const res = await fetch(`${base}/api/proposals/delta.docx`);
    assert.equal(res.status, 405);
  });
  it('nothing eligible → 409 with a clear message', async () => {
    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /no approved/i);
  });
  it('GET ?again=1 re-downloads the last exported batch without re-marking', async () => {
    await createApproved('Rule B');
    await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    const again = await fetch(`${base}/api/proposals/delta.docx?again=1`);
    assert.equal(again.status, 200);
  });
  it('a marking failure midway ships the marked subset and leaves the rest eligible — nothing lost', async () => {
    await createApproved('Rule C');
    await createApproved('Rule D');
    // Fail the SECOND exported_at write only.
    const realWrite = store.writeJson.bind(store);
    let exportWrites = 0;
    store.writeJson = async (p, obj, message, sha) => {
      if (obj.exported_at) {
        exportWrites += 1;
        if (exportWrites === 2) throw new Error('transient github error');
      }
      return realWrite(p, obj, message, sha);
    };
    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(res.status, 200, 'the marked subset still ships');
    store.writeJson = realWrite;
    const all = (await (await fetch(`${base}/api/proposals`)).json()).proposals;
    const exported = all.filter((p) => p.exported_at);
    const eligible = all.filter((p) => p.status === 'approved' && !p.exported_at);
    assert.equal(exported.length, 1, 'exactly the marked one carries exported_at');
    assert.equal(eligible.length, 1, 'the unmarked one stays eligible for the next export');
  });
});

describe('proposed_by + duplicates across decisions', () => {
  it('proposed_by is stored when supplied', async () => {
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), proposed_by: 'Silvia' })
    });
    assert.equal((await res.json()).proposed_by, 'Silvia');
  });
  it('a previously APPROVED identical finding is refused with the approver named', async () => {
    const c = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    const { id } = await c.json();
    await fetch(`${base}/api/proposals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' }) });
    const again = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    assert.equal(again.status, 409);
    assert.match((await again.json()).error, /approved by SS/i);
  });
  it('a previously REJECTED identical finding is allowed again, with a notice naming the rejection', async () => {
    const c = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    const { id } = await c.json();
    await fetch(`${base}/api/proposals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'rejected', reviewed_by: 'RRC', note: 'covered by E16' }) });
    const again = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    assert.equal(again.status, 201);
    const body = await again.json();
    assert.match(body.notice, /rejected by RRC/);
    assert.match(body.notice, /covered by E16/);
  });
});

describe('input hardening', () => {
  it('C0 control characters are stripped at validation — they would corrupt the docx XML', () => {
    const r = validateNewProposal({ ...goodBody(), flag_title: 'a\u0008b\u0000c' });
    assert.equal(r.ok, true);
    assert.equal(r.proposal.flag_title, 'abc');
  });
  it('proposal creation is rate limited per IP', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${base}/api/proposals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...goodBody(), flag_title: `unique ${i}` })
      });
      assert.equal(res.status, 201, `post ${i} within the window`);
    }
    const overflow = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), flag_title: 'one too many' })
    });
    assert.equal(overflow.status, 429);
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
