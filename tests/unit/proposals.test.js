'use strict';

// Proposal validation + the express router, tested over a real HTTP
// listener on an ephemeral port with a fake in-memory store — no
// network, no GitHub, no supertest dependency.

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { validateNewProposal, createProposalsRouter } = require('../../server/proposals');
const { ConflictError, NotConfiguredError, StoreUnreachableError, RateLimitedError } = require('../../server/github-store');

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

describe('delta export ordering and honesty', () => {
  async function createApprovedOn(theBase, title) {
    const c = await fetch(`${theBase}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), flag_title: title })
    });
    const { id } = await c.json();
    await fetch(`${theBase}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' })
    });
    return id;
  }

  // Marking is irreversible: an exported proposal never reappears in a later
  // delta. So a document that cannot be built must leave storage untouched.
  it('a docx build failure marks NOTHING as exported', async () => {
    await new Promise((r) => server.close(r));
    const s = fakeStore();
    const app = express();
    app.use(express.json());
    app.use('/api/proposals', createProposalsRouter({
      store: s,
      buildDocx: async () => { throw new Error('docx exploded'); }
    }));
    await new Promise((res) => { server = app.listen(0, res); });
    const b = `http://127.0.0.1:${server.address().port}`;

    await createApprovedOn(b, 'Rule Z');
    const res = await fetch(`${b}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.code, 'delta_build_failed');
    assert.match(body.error, /nothing was marked/i);

    const all = (await (await fetch(`${b}/api/proposals`)).json()).proposals;
    assert.equal(all.filter((p) => p.exported_at).length, 0, 'no proposal may carry exported_at');
    assert.equal(all.filter((p) => p.status === 'approved' && !p.exported_at).length, 1, 'it stays eligible');
  });

  // The batch is chosen from a listing, then each member is re-read to get a
  // fresh sha. A parallel export can land in between — which is the ONLY way
  // to reach the skip, and the previous version of this test never did: by
  // the time it ran, loadAll had already filtered the proposal out, so the
  // 409 came from a different branch entirely.
  it('skips a proposal that a parallel export stamped between the listing and the write', async () => {
    await createApprovedOn(base, 'Rule R1');
    await createApprovedOn(base, 'Rule R2');

    const realRead = store.readJson.bind(store);
    const seen = new Map();
    store.readJson = async (p) => {
      const r = await realRead(p);
      const n = (seen.get(p) || 0) + 1;
      seen.set(p, n);
      // First read (the listing) shows it unexported; the second read (the
      // marking loop) finds a parallel export got there first.
      if (n >= 2 && r && r.data.flag_title === 'Rule R1') {
        return { ...r, data: { ...r.data, exported_at: '2026-08-11T00:00:00.000Z', delta_id: 'other-export' } };
      }
      return r;
    };

    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    store.readJson = realRead;
    assert.equal(res.status, 200);
    // R1 belongs to the other export's document, so this one ships R2 alone
    // and reports itself partial rather than claiming both.
    assert.equal(res.headers.get('X-Delta-Partial'), '1/2');
    // The real store is the witness: this export must not have written its
    // own stamp over R1, which belongs to the other export's document.
    const all = (await (await fetch(`${base}/api/proposals`)).json()).proposals;
    const r1 = all.find((p) => p.flag_title === 'Rule R1');
    const r2 = all.find((p) => p.flag_title === 'Rule R2');
    assert.ok(!r1.exported_at, 'R1 must not be stamped by this export');
    assert.ok(r2.exported_at, 'R2 is the one this export delivered');
  });

  it('a proposal already exported by a parallel export is not re-stamped or re-shipped', async () => {
    await createApprovedOn(base, 'Rule P');
    await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    const first = (await (await fetch(`${base}/api/proposals`)).json()).proposals[0].exported_at;
    assert.ok(first);
    // A second export with nothing new must not overwrite the first stamp.
    const second = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(second.status, 409);
    const after = (await (await fetch(`${base}/api/proposals`)).json()).proposals[0].exported_at;
    assert.equal(after, first, 'the original export timestamp survives');
  });

  it('a partial export announces itself in a header, not only in the server log', async () => {
    await createApprovedOn(base, 'Rule E');
    await createApprovedOn(base, 'Rule F');
    const realWrite = store.writeJson.bind(store);
    let n = 0;
    store.writeJson = async (p, obj, message, sha) => {
      if (obj.exported_at && ++n === 2) throw new Error('transient github error');
      return realWrite(p, obj, message, sha);
    };
    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    store.writeJson = realWrite;
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Delta-Partial'), '1/2');
  });
});

describe('decision field hardening', () => {
  it('strips control characters from reviewed_by and the decision note', async () => {
    const c = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody())
    });
    const { id } = await c.json();
    const res = await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'S\u000BS', note: 'ok\u0000fine' })
    });
    const updated = await res.json();
    assert.equal(updated.reviewed_by, 'SS');
    assert.equal(updated.decision_note, 'okfine');
  });
});

describe('409 responses are distinguishable', () => {
  it('a duplicate carries a duplicate code, a storage conflict carries storage_conflict', async () => {
    await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    const dup = await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    assert.equal(dup.status, 409);
    assert.equal((await dup.json()).code, 'duplicate_pending');

    // A ConflictError means the write was REJECTED — nothing was saved. The
    // client must never render that as "already proposed".
    store.writeJson = async () => { throw new ConflictError('sha mismatch'); };
    const conflict = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), flag_title: 'something else' })
    });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).code, 'storage_conflict');
  });
});

describe('a listed but unreadable proposal', () => {
  it('fails loud instead of quietly disappearing from every route', async () => {
    await fetch(`${base}/api/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody()) });
    // list() still reports it; readJson cannot return it.
    store.readJson = async () => null;
    const res = await fetch(`${base}/api/proposals`);
    assert.equal(res.status, 502, 'must not report an empty queue');
  });
});

describe('unconfigured store', () => {
  it('surfaces 503 "not configured", never an empty success', async () => {
    await new Promise((r) => server.close(r));
    const un = fakeStore();
    un.configured = false;
    // The typed error, not a plain Error whose MESSAGE happens to say so.
    // Throwing a plain Error here quietly required the router to keep a
    // regex on err.message — the very thing its comment says was removed —
    // so this test was holding the bug in place.
    un.readJson = un.writeJson = un.list = async () => { throw new NotConfiguredError('github-store not configured'); };
    await start(un);
    const res = await fetch(`${base}/api/proposals`);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, 'not_configured');
  });
});

// Deleting either branch used to leave the suite fully green, turning "your
// token is dead, nothing is lost" and "GitHub rate limit" into an
// indistinguishable generic 502.
describe('store failures keep their identity through the router', () => {
  async function withThrowingStore(err) {
    await new Promise((r) => server.close(r));
    const s = fakeStore();
    s.list = async () => { throw err; };
    await start(s);
    return fetch(`${base}/api/proposals`);
  }

  it('an unreachable store is 502 store_unreachable, and says proposals are not lost', async () => {
    const res = await withThrowingStore(new StoreUnreachableError('repo unreachable'));
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.code, 'store_unreachable');
    assert.match(body.error, /NOT lost/i);
  });

  it('a rate limit is 429 rate_limited, not a storage error', async () => {
    const res = await withThrowingStore(new RateLimitedError('limited'));
    assert.equal(res.status, 429);
    assert.equal((await res.json()).code, 'rate_limited');
  });

  it('an unknown failure stays a generic 502 without leaking GitHub detail', async () => {
    const res = await withThrowingStore(new Error('boom: token ghp_secret repo private/x'));
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.doesNotMatch(body.error, /ghp_secret|private\/x/);
  });
});

// Revert-to-pending. The guard that matters is exported_at: once a proposal
// has ridden a delta out to the rule set author, the app is no longer the
// only holder of that decision, and quietly pulling it back would leave the
// two out of step. Before that moment a reviewer may freely change their
// mind — the revert is itself a commit, so nothing is lost either way.
describe('POST /api/proposals/:id/revert', () => {
  async function create() {
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodBody())
    });
    return (await res.json()).id;
  }
  async function approve(id) {
    return fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'library', reviewed_by: 'SS', note: 'yes' })
    });
  }
  function revert(id, body) {
    return fetch(`${base}/api/proposals/${id}/revert`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body === undefined ? { reverted_by: 'SS' } : body)
    });
  }

  it('returns an approved proposal to the queue and clears the decision', async () => {
    const id = await create();
    await approve(id);
    const res = await revert(id);
    assert.equal(res.status, 200);
    const p = await res.json();
    assert.equal(p.status, 'pending');
    assert.equal(p.tier, null);
    assert.equal(p.reviewed_by, null);
    assert.equal(p.reviewed_at, null);
    assert.equal(p.decision_note, null);
  });

  it('puts it back in the pending list, not the decided one', async () => {
    const id = await create();
    await approve(id);
    await revert(id);
    const list = await (await fetch(`${base}/api/proposals`)).json();
    assert.equal(list.proposals.find((p) => p.id === id).status, 'pending');
  });

  it('reverts a rejection too', async () => {
    const id = await create();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected', reviewed_by: 'RRC' })
    });
    assert.equal((await revert(id)).status, 200);
  });

  it('refuses once the proposal has been exported', async () => {
    const id = await create();
    await approve(id);
    // The real path that sets exported_at: the delta went out.
    const exp = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(exp.status, 200);

    const res = await revert(id);
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, 'already_exported');
    assert.match(body.error, /export/i);

    // And it really did not move.
    const list = await (await fetch(`${base}/api/proposals`)).json();
    assert.equal(list.proposals.find((p) => p.id === id).status, 'approved');
  });

  it('refuses to revert something that is still pending', async () => {
    const id = await create();
    const res = await revert(id);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'not_decided');
  });

  it('requires a name — the revert is an audit event like the decision', async () => {
    const id = await create();
    await approve(id);
    assert.equal((await revert(id, {})).status, 400);
    assert.equal((await revert(id, { reverted_by: '   ' })).status, 400);
  });

  it('names the reverter in a one-line commit message', async () => {
    const id = await create();
    await approve(id);
    const messages = [];
    const realWrite = store.writeJson.bind(store);
    store.writeJson = async (p, obj, message, sha) => {
      messages.push(message);
      return realWrite(p, obj, message, sha);
    };
    await revert(id, { reverted_by: 'Silvia' });
    assert.equal(messages.length, 1);
    assert.match(messages[0], /revert/i);
    assert.match(messages[0], /Silvia/);
    assert.ok(messages[0].indexOf('\n') === -1, 'commit messages stay one line');
  });

  it('404s on an unknown id and on a traversal attempt', async () => {
    assert.equal((await revert('nope')).status, 404);
    for (const evil of ['..%2F..%2Fetc', 'a%2Fb']) {
      const res = await fetch(`${base}/api/proposals/${evil}/revert`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reverted_by: 'SS' })
      });
      assert.equal(res.status, 404, `expected 404 for ${evil}`);
    }
  });

  it('keeps the decision it undid, so the app can say a decision was reversed', async () => {
    const id = await create();
    await approve(id);
    const p = await (await revert(id, { reverted_by: 'Silvia' })).json();
    assert.equal(p.reverted_by, 'Silvia');
    assert.ok(p.reverted_at);
    // Without this the reversal is recoverable only from the data branch's
    // git history, which nothing in the app reads.
    assert.equal(p.previous_decision.status, 'approved');
    assert.equal(p.previous_decision.tier, 'library');
    assert.equal(p.previous_decision.reviewed_by, 'SS');
    assert.equal(p.previous_decision.decision_note, 'yes');
  });

  it('serves the reverted state immediately, not the cached approved one', async () => {
    const id = await create();
    await approve(id);
    // Warm the 30s list cache with the APPROVED view. Without this GET the
    // test passes even if the revert never invalidates, because the decision
    // route already invalidated and nothing had re-populated the cache.
    const warm = await (await fetch(`${base}/api/proposals`)).json();
    assert.equal(warm.proposals.find((p) => p.id === id).status, 'approved');

    await revert(id);

    const after = await (await fetch(`${base}/api/proposals`)).json();
    assert.equal(after.proposals.find((p) => p.id === id).status, 'pending',
      'a stale cache would show the proposal as approved for up to 30s, including in the next-delta preview');
  });
});

// The revert endpoint introduced the first backwards status transition in
// the app. The delta export's mark loop predates it and was written when
// "decided" was permanent: it re-checked exported_at but not status. A
// revert landing inside the export's build window therefore stamped
// exported_at onto a proposal that was no longer approved — the document
// reached the rule set author while the app showed the finding as queued,
// and the record became permanently undeliverable.
describe('delta export vs a revert landing mid-build', () => {
  let lastBuild = null;

  // The revert is applied straight to the store rather than over HTTP: the
  // race is a storage-level one, and re-entering the same listener from
  // inside its own handler deadlocks the test client rather than the app.
  // What lands in the store here is byte-for-byte what the revert route
  // writes — status back to pending, decision fields cleared.
  async function startWith(revertDuringBuild) {
    // beforeEach already stood one up; replacing the reference without
    // closing it leaks a listening handle and the test FILE never exits.
    if (server) await new Promise((r) => server.close(r));
    store = fakeStore();
    const app = express();
    app.use(express.json());
    app.use('/api/proposals', createProposalsRouter({
      store,
      buildDocx: async (batch, opts) => {
        if (revertDuringBuild) { await revertDuringBuild(); revertDuringBuild = null; }
        lastBuild = { batch, opts };
        return Buffer.from('docx');
      }
    }));
    await new Promise((res) => { server = app.listen(0, res); });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  async function revertInStore(id) {
    const p = `proposals/${id}.json`;
    const cur = await store.readJson(p);
    await store.writeJson(p, {
      ...cur.data,
      status: 'pending',
      tier: null,
      reviewed_by: null,
      reviewed_at: null,
      decision_note: null,
      reverted_by: 'RRC',
      reverted_at: new Date().toISOString()
    }, 'revert to pending', cur.sha);
  }

  async function createApproved(title, tier) {
    const c = await (await fetch(`${base}/api/proposals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), flag_title: title })
    })).json();
    await fetch(`${base}/api/proposals/${c.id}/decision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier, reviewed_by: 'SS' })
    });
    return c.id;
  }

  it('does not stamp a proposal that was returned to the queue while the document built', async () => {
    let target = null;
    // Fires inside buildDocx — exactly the window loadAll + the render leave
    // open on a real queue (serial GitHub reads, then a Packer render).
    await startWith(() => revertInStore(target));
    target = await createApproved('New destination not in library', 'library');

    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });

    const stored = (await store.readJson(`proposals/${target}.json`)).data;
    assert.equal(stored.status, 'pending', 'the revert must stand');
    assert.equal(stored.exported_at, undefined,
      'a proposal that is no longer approved must never be stamped as exported — that is the state where the app and the master document disagree in silence');

    // Nothing survived to ship, so the export must say so rather than report
    // a complete delivery of a document nobody should act on.
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'all_reverted');
  });

  it('warns inside the document when only part of the batch survived the build', async () => {
    let target = null;
    await startWith(() => revertInStore(target));
    target = await createApproved('first finding', 'rule');
    const survivor = await createApproved('second finding', 'rule');

    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-Delta-Partial'), '1/2');

    // The document travels to the rule set author without this page
    // attached, so the reason has to be inside it — and the existing
    // "still queued for the next delta" wording would be a lie here.
    assert.equal(lastBuild.opts.partial.cause, 'reverted');
    assert.equal((await store.readJson(`proposals/${target}.json`)).data.exported_at, undefined);
    assert.ok((await store.readJson(`proposals/${survivor}.json`)).data.exported_at);
  });
});

// --- Soft delete + restore (tombstone with a door) -------------------
// Silvia 25 Aug: a bin icon AND "un bin in care sa putem intra sa vedem
// ce s-a sters si sa recuperam". Records are compliance artefacts with a
// signature and some have already travelled to the rule set author, so
// nothing is ever physically removed.

async function createProposal(body) {
  const res = await fetch(`${base}/api/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || goodBody())
  });
  return (await res.json()).id;
}

async function del(id, body) {
  return fetch(`${base}/api/proposals/${id}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body === undefined ? { deleted_by: 'Silvia' } : body)
  });
}

describe('POST /:id/delete', () => {
  it('stamps deleted_at and deleted_by', async () => {
    const id = await createProposal();
    const res = await del(id);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.deleted_by, 'Silvia');
    assert.match(body.deleted_at, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('requires deleted_by', async () => {
    const id = await createProposal();
    const res = await del(id, {});
    assert.equal(res.status, 400);
  });

  it('answers 409 when the proposal is already deleted', async () => {
    const id = await createProposal();
    await del(id);
    const again = await del(id);
    assert.equal(again.status, 409);
    assert.equal((await again.json()).code, 'already_deleted');
  });

  it('answers 404 for an unknown id', async () => {
    const res = await del('no-such-proposal');
    assert.equal(res.status, 404);
  });

  // Deliberately UNLIKE revert, which refuses once exported. Her own two
  // test rows were exported on 12 Aug and are exactly what she wants gone.
  // Safe because the delta document that travelled is untouched and
  // exported_at survives on the record, so restore is lossless.
  it('succeeds on an exported proposal, keeping exported_at intact', async () => {
    const id = await createProposal();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'library', reviewed_by: 'Silvia' })
    });
    await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    const res = await del(id);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.exported_at, 'exported_at must survive the delete');
    assert.ok(body.deleted_at);
  });
});

async function restore(id, body) {
  return fetch(`${base}/api/proposals/${id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body === undefined ? { restored_by: 'Silvia' } : body)
  });
}

describe('POST /:id/restore', () => {
  it('clears the tombstone and records who took it out of the bin', async () => {
    const id = await createProposal();
    await del(id);
    const res = await restore(id);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.deleted_at, null);
    assert.equal(body.deleted_by, null);
    assert.equal(body.restored_by, 'Silvia');
    assert.match(body.restored_at, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('requires restored_by', async () => {
    const id = await createProposal();
    await del(id);
    const res = await restore(id, {});
    assert.equal(res.status, 400);
  });

  it('answers 409 when the proposal is not in the bin', async () => {
    const id = await createProposal();
    const res = await restore(id);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'not_deleted');
  });

  // Deleting must not quietly undo a decision: a proposal approved by one
  // person and binned by another comes back APPROVED, not pending.
  it('returns the proposal to the status it held before deletion', async () => {
    const id = await createProposal();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'RRC' })
    });
    await del(id);
    const body = await (await restore(id)).json();
    assert.equal(body.status, 'approved');
    assert.equal(body.tier, 'rule');
    assert.equal(body.reviewed_by, 'RRC');
  });
});

describe('binned proposals are excluded everywhere it matters', () => {
  it('GET / omits them', async () => {
    const id = await createProposal();
    await del(id);
    const { proposals } = await (await fetch(`${base}/api/proposals`)).json();
    assert.equal(proposals.find((p) => p.id === id), undefined);
  });

  it('GET /?deleted=1 returns only them — that is the bin view', async () => {
    const kept = await createProposal({ ...goodBody(), flag_title: 'Kept' });
    const binned = await createProposal({ ...goodBody(), flag_title: 'Binned' });
    await del(binned);
    const { proposals } = await (await fetch(`${base}/api/proposals?deleted=1`)).json();
    assert.deepEqual(proposals.map((p) => p.id), [binned]);
    assert.equal(proposals.find((p) => p.id === kept), undefined);
  });

  // The correctness point of the whole batch: an approved proposal that
  // was binned must never reach the rule set author's next document.
  it('an approved-but-binned proposal never enters the delta export', async () => {
    const id = await createProposal();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' })
    });
    await del(id);
    const res = await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    assert.equal(res.status, 409);
  });

  // Her actual reason for wanting a bin: the same finding re-flags on every
  // certificate until the rule set author ships the new version. Binning one
  // must leave the finding proposable again.
  it('a binned pending proposal no longer blocks the same finding', async () => {
    const id = await createProposal();
    await del(id);
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goodBody())
    });
    assert.equal(res.status, 201);
  });

  it('a binned approved proposal no longer blocks the same finding', async () => {
    const id = await createProposal();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'library', reviewed_by: 'SS' })
    });
    await del(id);
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goodBody())
    });
    assert.equal(res.status, 201);
  });

  // The one place a binned proposal must STILL be visible. The delivered
  // delta is a historical artefact: the rule set author already holds that
  // document, so re-downloading it must reproduce what was sent, not a
  // quietly shortened version. Binning tidies the archive, never the past.
  it('?again=1 still reproduces a delivered delta containing a since-binned proposal', async () => {
    const id = await createProposal();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' })
    });
    await fetch(`${base}/api/proposals/delta.docx`, { method: 'POST' });
    await del(id);
    const again = await fetch(`${base}/api/proposals/delta.docx?again=1`);
    assert.equal(again.status, 200);
    const buf = Buffer.from(await again.arrayBuffer());
    assert.equal(buf[0], 0x50, 'must still be a real docx');
  });
});

// --- internal_note ----------------------------------------------------
// Silvia 25 Aug: the OV proposing has the pCloud folder number in front of
// them; a reviewer two days later does not. So it is captured at propose
// time -- but in its OWN field, because proposer_note travels into the rule
// set author's Word delta and a filing reference has no business there.

describe('internal_note', () => {
  it('is stored on the proposal', async () => {
    const res = await fetch(`${base}/api/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), internal_note: 'pCloud 4471' })
    });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).internal_note, 'pCloud 4471');
  });

  it('defaults to empty when not supplied', () => {
    const r = validateNewProposal(goodBody());
    assert.equal(r.proposal.internal_note, '');
  });

  it('is cleaned like every other free-text field', () => {
    const r = validateNewProposal({ ...goodBody(), internal_note: '  pCloud 4471  ' });
    assert.equal(r.proposal.internal_note, 'pCloud 4471');
  });

  it('survives to the list', async () => {
    await fetch(`${base}/api/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goodBody(), internal_note: 'pCloud 4471' })
    });
    const { proposals } = await (await fetch(`${base}/api/proposals`)).json();
    assert.equal(proposals[0].internal_note, 'pCloud 4471');
  });
});

// A record in the bin is out of the review flow, and "out" has to mean it
// for every writer -- not just for the readers that hide it. Delete does not
// touch `status`, and both handlers re-read the record fresh rather than
// checking a sha the client held, so optimistic concurrency does not catch
// this either: a stale form in a second tab (shared password, three users,
// depot machines) could decide a proposal that no one could see.
describe('a binned proposal is closed to writes', () => {
  it('cannot be decided while it is in the bin', async () => {
    const id = await createProposal();
    await del(id);
    const res = await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'library', reviewed_by: 'SS' })
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'deleted');
  });

  it('cannot be reverted while it is in the bin', async () => {
    const id = await createProposal();
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'rule', reviewed_by: 'SS' })
    });
    await del(id);
    const res = await fetch(`${base}/api/proposals/${id}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reverted_by: 'SS' })
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'deleted');
  });

  // The decision must not have happened at all -- a 409 that still wrote
  // would be worse than no guard, because it would look safe.
  it('leaves the record untouched when it refuses', async () => {
    const id = await createProposal();
    await del(id);
    await fetch(`${base}/api/proposals/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', tier: 'library', reviewed_by: 'SS' })
    });
    const { proposals } = await (await fetch(`${base}/api/proposals?deleted=1`)).json();
    const rec = proposals.find((p) => p.id === id);
    assert.equal(rec.status, 'pending');
    assert.equal(rec.reviewed_by, null);
  });
});
