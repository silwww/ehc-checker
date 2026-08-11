'use strict';

// Rule-proposal domain + HTTP router. Storage is injected (github-store
// in production, an in-memory fake in tests). One JSON file per proposal
// under proposals/ on the app-data branch; every state change is a commit.

const express = require('express');
const { ConflictError, NotConfiguredError, StoreUnreachableError, RateLimitedError } = require('./github-store');
const { buildDeltaDocx } = require('./delta-docx');

const SOURCE_KINDS = ['flag', 'recommendations', 'manual'];
const DIR = 'proposals';

function slugRef(ref) {
  return String(ref || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// C0 control chars are illegal in docx XML — a crafted title would make
// Word refuse Roger's delta. Stripped at the door, never downstream.
function clean(s) {
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

// Commit messages must stay one line regardless of what a flag title holds.
function oneLine(s) {
  return String(s).replace(/\s+/g, ' ').trim().slice(0, 120);
}

// Millisecond timestamps are not unique under quick succession — two
// proposals in the same ms would collide on id and the second would die
// on a storage conflict. The per-process counter breaks the tie.
let idSeq = 0;

function validateNewProposal(body) {
  const b = body || {};
  if (!b.certificate_ref || !String(b.certificate_ref).trim()) return { ok: false, error: 'certificate_ref is required' };
  if (!SOURCE_KINDS.includes(b.source_kind)) return { ok: false, error: `source_kind must be one of ${SOURCE_KINDS.join(', ')}` };
  if (!b.flag_title || !String(b.flag_title).trim()) return { ok: false, error: 'flag_title is required' };
  const created = new Date().toISOString();
  idSeq += 1;
  const proposal = {
    id: `${created.replace(/[:.]/g, '-')}-${idSeq.toString(36)}-${slugRef(b.certificate_ref)}`,
    created_at: created,
    certificate_ref: clean(b.certificate_ref),
    cert_type: b.cert_type ? clean(b.cert_type) : null,
    source_kind: b.source_kind,
    flag_severity: b.flag_severity ? clean(b.flag_severity) : null,
    flag_title: clean(b.flag_title),
    flag_description: b.flag_description ? clean(b.flag_description) : '',
    model_recommendation: b.model_recommendation ? clean(b.model_recommendation) : '',
    proposer_note: b.proposer_note ? clean(b.proposer_note) : '',
    proposed_by: b.proposed_by ? clean(b.proposed_by) : null,
    status: 'pending',
    tier: null,
    reviewed_by: null,
    reviewed_at: null,
    decision_note: null
  };
  return { ok: true, proposal };
}

// Reads stay SERIAL on purpose: GitHub's own best-practice guidance is to
// make requests serially rather than concurrently, and insisting while rate
// limited risks the integration being banned. The 30s list cache is what
// keeps the cost down, not parallelism.
async function loadAll(store) {
  const entries = await store.list(DIR);
  const out = [];
  for (const e of entries) {
    const r = await store.readJson(e.path);
    // Listed by the store but unreadable is never normal. Skipping it
    // silently made a proposal vanish from the review queue, stop blocking
    // duplicates, and sit approved-but-unexportable forever.
    if (!r) throw new Error(`proposal ${e.path} was listed but could not be read`);
    out.push({ ...r.data, _sha: r.sha, _path: e.path });
  }
  return out;
}

function publicView(p) {
  const { _sha, _path, ...rest } = p;
  return rest;
}

// buildDocx is injectable so the "a render failure must mark nothing" rule
// can be tested without a corrupt fixture.
function createProposalsRouter({ store, buildDocx = buildDeltaDocx }) {
  const router = express.Router();

  function handleStoreError(res, err) {
    // Classified by type, not by matching words in the message: GitHub error
    // bodies get interpolated into these messages, so a body that happened to
    // contain "not configured" used to send the operator hunting a healthy
    // environment variable.
    if (err instanceof NotConfiguredError || /not configured/i.test(err.message)) {
      return res.status(503).json({ code: 'not_configured', error: 'Proposal storage not configured — set GITHUB_DATA_TOKEN (see spec).' });
    }
    if (err instanceof StoreUnreachableError) {
      console.error('[proposals] store unreachable:', err.message);
      return res.status(502).json({
        code: 'store_unreachable',
        error: 'The proposal store cannot be reached — the GitHub token is expired, revoked, or lacks access. Proposals are NOT lost, but none can be shown or saved until this is fixed.'
      });
    }
    if (err instanceof RateLimitedError) {
      console.error('[proposals] rate limited:', err.message);
      return res.status(429).json({ code: 'rate_limited', error: 'GitHub rate limit reached — wait a few minutes and retry.' });
    }
    if (err instanceof ConflictError) {
      // A 409 here means the write was REJECTED and nothing was saved — the
      // opposite of the duplicate 409s below. The client distinguishes them
      // by `code`, never by the status alone, and this must leave a trace.
      console.error('[proposals] storage conflict:', err.message);
      return res.status(409).json({ code: 'storage_conflict', error: 'Storage conflict — nothing was saved. Reload and retry.' });
    }
    // Full detail server-side only — GitHub error bodies can name the
    // backing repo/branch and token health; clients get a generic line.
    console.error('[proposals]', err.message);
    return res.status(502).json({ error: 'Proposal storage error — check the server log.' });
  }

  // Modest per-IP rate limit on proposal creation: the pipeline has ~3
  // real users; a runaway script would otherwise burn the GitHub token's
  // API quota (every list costs one call per stored proposal).
  const POST_LIMIT = 20;
  const POST_WINDOW_MS = 10 * 60 * 1000;
  const postTimes = new Map();
  function rateLimited(ip) {
    const now = Date.now();
    const recent = (postTimes.get(ip) || []).filter((t) => now - t < POST_WINDOW_MS);
    if (recent.length >= POST_LIMIT) { postTimes.set(ip, recent); return true; }
    recent.push(now);
    postTimes.set(ip, recent);
    return false;
  }

  router.post('/', async (req, res) => {
    if (rateLimited(req.ip)) {
      return res.status(429).json({ error: 'Too many proposals in a short time — wait a few minutes and retry.' });
    }
    const v = validateNewProposal(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    try {
      const all = await loadAll(store);
      const same = (p) => p.certificate_ref === v.proposal.certificate_ref && p.flag_title === v.proposal.flag_title;
      const pendingDup = all.find((p) => p.status === 'pending' && same(p));
      if (pendingDup) return res.status(409).json({ code: 'duplicate_pending', error: 'Already proposed for this certificate — pending review.' });
      // Duplicates must hold across days, not just while pending: the
      // "Proposed ✓" button state dies with the browser session, so the
      // server is the memory. Approved → refuse loudly; rejected → allow
      // deliberately, with a notice the client shows.
      const approvedDup = all.find((p) => p.status === 'approved' && same(p));
      if (approvedDup) {
        return res.status(409).json({
          code: 'duplicate_approved',
          error: `Already approved by ${approvedDup.reviewed_by} on ${String(approvedDup.reviewed_at).slice(0, 10)}.`
        });
      }
      const rejectedDup = all.find((p) => p.status === 'rejected' && same(p));
      await store.writeJson(`${DIR}/${v.proposal.id}.json`, v.proposal,
        oneLine(`proposal: ${v.proposal.flag_title} (${v.proposal.certificate_ref})`));
      invalidateListCache();
      const response = { ...v.proposal };
      if (rejectedDup) {
        response.notice = `Note: the same finding was rejected by ${rejectedDup.reviewed_by} on ${String(rejectedDup.reviewed_at).slice(0, 10)}` +
          (rejectedDup.decision_note ? ` (${rejectedDup.decision_note})` : '') + ' — it is now pending again.';
      }
      return res.status(201).json(response);
    } catch (err) { return handleStoreError(res, err); }
  });

  function sendDocx(res, buf) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="EHC_Checker_rule_set_delta_${new Date().toISOString().slice(0, 10)}.docx"`);
    return res.send(buf);
  }

  // Export is a POST: it CHANGES state (stamps exported_at), and a
  // state-changing GET would be CSRF-able via top-level navigation under
  // SameSite=Lax. Registered before /:id/decision so "delta.docx" is
  // never read as an id.
  //
  // Three steps, in this order, and the order is the whole design:
  //   1. BUILD a throwaway document to prove the batch can be rendered.
  //      Marking is irreversible — an exported proposal never reappears in
  //      a later delta — so nothing may be recorded as delivered until we
  //      know a document exists. (Marking first stranded the entire batch
  //      on any render failure, and ?again=1 rebuilt from the same data,
  //      reproducing the failure forever.)
  //   2. MARK, skipping anything a parallel export already stamped.
  //   3. REBUILD from exactly what got marked, so the file can never
  //      contain a proposal that is still queued for the next delta.
  router.post('/delta.docx', async (req, res) => {
    try {
      const all = await loadAll(store);
      const batch = all.filter((p) => p.status === 'approved' && !p.exported_at);
      if (batch.length === 0) return res.status(409).json({ error: 'No approved, unexported proposals — nothing to put in a delta.' });

      try {
        await buildDocx(batch);
      } catch (err) {
        // Storage is untouched here, so this is safe to retry once the
        // offending record is corrected. Say so — the reviewer must not be
        // left thinking approvals were lost.
        console.error('[proposals] delta build failed before marking:', err.message);
        return res.status(500).json({
          code: 'delta_build_failed',
          error: 'The Word delta could not be generated, so nothing was marked as exported — no proposal was lost. Report this: ' + err.message
        });
      }

      const stamp = new Date().toISOString();
      const marked = [];
      let markErr = null;
      for (const p of batch) {
        let cur;
        try {
          cur = await store.readJson(p._path);
        } catch (err) {
          markErr = err;
          break;
        }
        // Listed by the store but unreadable is never a normal condition,
        // and a parallel export may have stamped this one already — in
        // which case it belongs to that document, not this one.
        if (!cur) { markErr = new Error(`proposal ${p._path} was listed but could not be read back`); break; }
        if (cur.data.exported_at) continue;
        try {
          await store.writeJson(p._path, { ...cur.data, exported_at: stamp },
            oneLine(`delta export: ${p.flag_title}`), cur.sha);
        } catch (err) {
          markErr = err;
          break;
        }
        marked.push({ ...p, exported_at: stamp });
      }

      if (marked.length === 0) {
        if (markErr) return handleStoreError(res, markErr);
        return res.status(409).json({ error: 'Every approved proposal was already exported by a parallel export — nothing new to deliver.' });
      }

      invalidateListCache();
      const partial = marked.length < batch.length;
      if (partial) {
        console.error(`[proposals] delta export partial: ${marked.length}/${batch.length} marked` +
          (markErr ? ` — ${markErr.message}` : ' (the rest were already exported elsewhere)') +
          '. Unmarked proposals stay eligible for the next export.');
      }
      // The document reaches Roger without this page attached, so the
      // warning goes inside the file too, not only in the header the UI reads.
      const buf = await buildDocx(marked,
        partial ? { partial: { shipped: marked.length, total: batch.length } } : undefined);
      if (partial) res.setHeader('X-Delta-Partial', `${marked.length}/${batch.length}`);
      return sendDocx(res, buf);
    } catch (err) { return handleStoreError(res, err); }
  });

  // Read-only re-download of the most recent exported batch — no writes,
  // so a GET is safe here.
  router.get('/delta.docx', async (req, res) => {
    if (!req.query.again) {
      return res.status(405).json({ error: 'Delta export is a POST (it marks proposals as exported). Use ?again=1 to re-download the last batch.' });
    }
    try {
      const all = await loadAll(store);
      const exported = all.filter((p) => p.exported_at);
      if (exported.length === 0) return res.status(409).json({ error: 'No previously exported delta to re-download.' });
      const last = exported.map((p) => p.exported_at).sort().pop();
      const buf = await buildDocx(exported.filter((p) => p.exported_at === last));
      return sendDocx(res, buf);
    } catch (err) { return handleStoreError(res, err); }
  });

  // Short-lived list cache: every sidebar badge fetch would otherwise
  // cost one GitHub call per stored proposal. Any write invalidates it,
  // so reviewers always see their own actions immediately; the badge on
  // OTHER pages may lag up to 30s — declared an ornament by design.
  let listCache = null;
  let listCacheAt = 0;
  const LIST_CACHE_MS = 30 * 1000;
  function invalidateListCache() { listCache = null; }

  router.get('/', async (req, res) => {
    try {
      if (!listCache || Date.now() - listCacheAt > LIST_CACHE_MS) {
        const all = await loadAll(store);
        all.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        listCache = all.map(publicView);
        listCacheAt = Date.now();
      }
      return res.json({ proposals: listCache });
    } catch (err) { return handleStoreError(res, err); }
  });

  router.post('/:id/decision', async (req, res) => {
    const { decision, tier, reviewed_by, note } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected' });
    if (!reviewed_by || !String(reviewed_by).trim()) return res.status(400).json({ error: 'reviewed_by is required' });
    if (decision === 'approved' && !['library', 'rule'].includes(tier)) {
      return res.status(400).json({ error: 'tier (library | rule) is required on approve' });
    }
    // The id becomes a storage path — accept only the exact shape our
    // generator produces. Anything else (../, slashes, unicode tricks)
    // is a 404, not a path.
    if (!/^[A-Za-z0-9._-]+$/.test(req.params.id) || req.params.id.includes('..')) {
      return res.status(404).json({ error: 'Proposal not found' });
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
        // clean() here too, not just at creation: these two fields are the
        // only ones that reach Roger's document without passing the door,
        // and one control byte makes Word refuse the whole delta.
        reviewed_by: clean(reviewed_by),
        reviewed_at: new Date().toISOString(),
        decision_note: note ? clean(note) : null
      };
      await store.writeJson(path, updated, oneLine(`decision: ${decision} — ${updated.flag_title} (by ${updated.reviewed_by})`), cur.sha);
      invalidateListCache();
      return res.json(updated);
    } catch (err) {
      if (err instanceof ConflictError) return res.status(409).json({ error: 'Already decided in a parallel session — reload.' });
      return handleStoreError(res, err);
    }
  });

  return router;
}

module.exports = { validateNewProposal, createProposalsRouter, loadAll, DIR };
