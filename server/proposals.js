'use strict';

// Rule-proposal domain + HTTP router. Storage is injected (github-store
// in production, an in-memory fake in tests). One JSON file per proposal
// under proposals/ on the app-data branch; every state change is a commit.

const crypto = require('crypto');
const express = require('express');
const { ConflictError, NotConfiguredError, StoreUnreachableError, RateLimitedError } = require('./github-store');
const { buildDeltaDocx } = require('./delta-docx');
const { xmlSafeText } = require('./xml-safe-text');

const SOURCE_KINDS = ['flag', 'recommendations', 'manual'];
const DIR = 'proposals';

function slugRef(ref) {
  return String(ref || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// C0 control chars are illegal in docx XML — a crafted title would make
// Word refuse Roger's delta. Stripped at the door, never downstream.
// Trimmed too: flag titles come from model output, whose surrounding
// whitespace is not stable across runs, and the duplicate check is exact
// string equality — so "Missing signature " slipped past "Missing signature"
// and reached Roger as a second, near-identical section.
function clean(s) {
  return xmlSafeText(s).trim();
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
    // The certificate field the finding is about (I.5, I.12, "Signing
    // pages"). The report card has shown it since the beginning and the
    // button has always carried it as data-field-ref — but nothing read it,
    // so the rule set author received "New destination not in library" with
    // no way to know which box on the certificate it concerns.
    field_reference: b.field_reference ? clean(b.field_reference) : '',
    flag_description: b.flag_description ? clean(b.flag_description) : '',
    model_recommendation: b.model_recommendation ? clean(b.model_recommendation) : '',
    proposer_note: b.proposer_note ? clean(b.proposer_note) : '',
    // Deliberately SEPARATE from proposer_note, which is rendered into the
    // rule set author's Word delta. This one is the practice's own filing
    // reference (the pCloud folder number, or any internal remark) and must
    // never leave the app -- see the guard in delta-docx.test.js.
    internal_note: b.internal_note ? clean(b.internal_note) : '',
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
// Binned records are excluded BY DEFAULT — opting in is explicit. A caller
// that forgets the flag gets the safe answer, so a future call site cannot
// leak a deleted proposal into a review queue or an export by omission.
async function loadAll(store, { withDeleted = false } = {}) {
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
  return withDeleted ? out : out.filter((p) => !p.deleted_at);
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
    if (err instanceof NotConfiguredError) {
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
      // A batch identity of its own. Keying ?again=1 on timestamp equality
      // merged two exports that started in the same millisecond into a
      // document matching neither, and made the older of two overlapping
      // exports permanently unrecoverable once the newer one won the max.
      const deltaId = crypto.randomUUID();
      const marked = [];
      let markErr = null;
      // Counted SEPARATELY, because the two skips need opposite sentences
      // and a batch can suffer both. Collapsing them to one cause told the
      // rule set author that a proposal a parallel export had just delivered
      // to him was "withdrawn, NOT approved — do not act on it".
      let reverted = 0;
      let alreadyExported = 0;
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
        if (cur.data.exported_at) { alreadyExported += 1; continue; }
        // Re-check the STATUS too, not only exported_at. This loop could once
        // assume status was monotonic after a decision — nothing took a
        // proposal back out of 'approved'. The revert endpoint broke that
        // assumption, and a revert landing between loadAll/buildDocx and this
        // read would stamp exported_at onto a record that is now 'pending':
        // the document reaches the rule set author while the app shows the
        // proposal as queued, and the record becomes permanently stuck (the
        // export filter excludes it forever, re-proposing is blocked as a
        // duplicate, and reverting answers "not decided"). That is precisely
        // the app-and-master-diverge state the two-tier design exists to
        // prevent, and this was the only path to it.
        if (cur.data.status !== 'approved') { reverted += 1; continue; }
        try {
          await store.writeJson(p._path,
            { ...cur.data, exported_at: stamp, delta_id: deltaId, delta_total: batch.length },
            oneLine(`delta export: ${p.flag_title}`), cur.sha);
        } catch (err) {
          markErr = err;
          break;
        }
        marked.push({ ...p, exported_at: stamp, delta_id: deltaId, delta_total: batch.length });
      }

      // Unconditionally, and BEFORE any early return: a write may have landed
      // even on the path that reports failure (github-store can throw after
      // GitHub accepted the commit). Leaving the cache warm there served a
      // 30s window in which the queue showed exported proposals as still
      // pending — and hid the "Re-download last delta" link that recovers them.
      invalidateListCache();

      if (marked.length === 0) {
        if (markErr) return handleStoreError(res, markErr);
        if (reverted > 0) {
          return res.status(409).json({
            code: 'all_reverted',
            error: 'Every approved proposal in this batch was returned to the queue while the document was being built — nothing to deliver. Reload and try again.'
          });
        }
        return res.status(409).json({ error: 'Every approved proposal was already exported by a parallel export — nothing new to deliver.' });
      }

      // Each cause needs its own sentence, and a batch can carry more than
      // one. "could not be recorded, still queued" is TRUE for a storage
      // failure, FALSE when a parallel export already shipped them, and
      // FALSE again when a reviewer undid the approval mid-build. The
      // counts travel with the cause so the document can name both.
      const cause = markErr ? 'error'
        : (reverted > 0 && alreadyExported > 0) ? 'mixed'
          : reverted > 0 ? 'reverted'
            : 'parallel';
      const partial = marked.length < batch.length
        ? { shipped: marked.length, total: batch.length, cause, reverted, already_exported: alreadyExported }
        : null;
      if (partial) {
        console.error(`[proposals] delta export partial: ${marked.length}/${batch.length} marked` +
          ` (cause=${cause}, reverted=${reverted}, already_exported=${alreadyExported})` +
          (markErr ? ` — ${markErr.message}` : ''));
      }
      // The document reaches Roger without this page attached, so the
      // warning goes inside the file too, not only in the header the UI reads.
      let buf;
      try {
        buf = await buildDocx(marked, partial ? { partial } : undefined);
      } catch (err) {
        // Distinct from the pre-marking build failure: the marks HAVE landed,
        // so this is recoverable and must not be reported as a storage error.
        console.error('[proposals] delta rebuild failed after marking:', err.message);
        return res.status(500).json({
          code: 'delta_rebuild_failed',
          error: 'The proposals were marked as exported but the Word document could not be generated. Nothing is lost — use "Re-download last delta" to fetch it. Report this: ' + err.message
        });
      }
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
      // withDeleted: the ONLY call site that opts in. This document already
      // reached the rule set author, so re-downloading it must reproduce
      // what was sent — binning a row tidies the archive, never the past.
      const all = await loadAll(store, { withDeleted: true });
      const exported = all.filter((p) => p.exported_at);
      if (exported.length === 0) return res.status(409).json({ error: 'No previously exported delta to re-download.' });
      // Newest export by timestamp, then EXACTLY that export's batch by its
      // id. Records written before delta_id existed fall back to timestamp
      // equality, which is all they can offer.
      const newest = exported.reduce((a, b) => (String(b.exported_at) > String(a.exported_at) ? b : a));
      const group = newest.delta_id
        ? exported.filter((p) => p.delta_id === newest.delta_id)
        : exported.filter((p) => p.exported_at === newest.exported_at);
      // Reproduce the delivered document, partial notice and all — a
      // re-download that silently drops the PARTIAL heading is a different
      // document wearing the same name.
      const total = newest.delta_total;
      // The cause is NOT recoverable here: it is only known once the mark
      // loop has finished, and persisting it would mean a second write pass
      // over every record in the batch. So the re-download says plainly that
      // it cannot reproduce the reason, rather than picking a sentence that
      // might contradict the delivered copy.
      const partial = total && group.length < total
        ? { shipped: group.length, total, cause: 'unknown' }
        : null;
      const buf = await buildDocx(group, partial ? { partial } : undefined);
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
  let cacheGen = 0;
  function invalidateListCache() { listCache = null; cacheGen += 1; }

  router.get('/', async (req, res) => {
    try {
      // The bin is read rarely and must never be served from — or poison —
      // the live list cache, so it takes its own uncached path.
      if (req.query.deleted) {
        const all = await loadAll(store, { withDeleted: true });
        const binned = all.filter((p) => p.deleted_at);
        binned.sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
        return res.json({ proposals: binned.map(publicView) });
      }
      if (!listCache || Date.now() - listCacheAt > LIST_CACHE_MS) {
        // loadAll is serial by design — one GitHub round-trip per proposal —
        // so this read can be in flight for a long time. If a write lands
        // meanwhile it clears the cache, and populating it afterwards would
        // republish the PRE-write snapshot with a fresh timestamp, hiding the
        // reviewer's own approval for another 30 seconds.
        const genAtStart = cacheGen;
        const all = await loadAll(store);
        all.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        const view = all.map(publicView);
        if (cacheGen === genAtStart) {
          listCache = view;
          listCacheAt = Date.now();
        }
        return res.json({ proposals: view });
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
      // Checked FIRST, like exported_at in revert below, and for the same
      // reason: a record in the bin is out of the review flow, so "already
      // decided" or "nothing to undo" would answer a question nobody asked
      // and hide the state that actually blocks the write. Delete leaves
      // `status` alone, and both handlers re-read the record rather than
      // checking a sha the client held, so nothing else stops this.
      if (cur.data.deleted_at) {
        return res.status(409).json({
          code: 'deleted',
          error: 'This proposal is in the bin. Restore it first if it should be acted on.'
        });
      }
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

  // Undo a decision, returning the proposal to the queue.
  //
  // The one hard boundary is exported_at. Until the delta goes out, the app
  // is the only holder of the decision and a reviewer may change their mind
  // freely. After it, the rule set author has the document in hand — undoing
  // it here would leave the app and that document disagreeing, silently,
  // which is the exact failure the two-tier design exists to prevent.
  router.post('/:id/revert', async (req, res) => {
    const { reverted_by } = req.body || {};
    if (!reverted_by || !String(reverted_by).trim()) {
      return res.status(400).json({ error: 'reverted_by is required' });
    }
    if (!/^[A-Za-z0-9._-]+$/.test(req.params.id) || req.params.id.includes('..')) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    try {
      const path = `${DIR}/${req.params.id}.json`;
      const cur = await store.readJson(path);
      if (!cur) return res.status(404).json({ error: 'Proposal not found' });
      // Same bin guard as the decision route above — one closed door, both
      // writers.
      if (cur.data.deleted_at) {
        return res.status(409).json({
          code: 'deleted',
          error: 'This proposal is in the bin. Restore it first if it should be acted on.'
        });
      }
      // exported_at is checked FIRST, deliberately. Ordering it after the
      // pending check meant a record that was somehow both pending and
      // exported answered "there is no decision to undo" — the one answer
      // that hides the fact the document already went out.
      if (cur.data.exported_at) {
        return res.status(409).json({
          code: 'already_exported',
          error: `This proposal was included in a delta export on ${String(cur.data.exported_at).slice(0, 10)}. The rule set author already has it, so it cannot be reverted here — raise it with them instead.`
        });
      }
      if (cur.data.status === 'pending') {
        return res.status(409).json({ code: 'not_decided', error: 'This proposal is already pending — there is no decision to undo.' });
      }
      const who = clean(reverted_by);
      const updated = {
        ...cur.data,
        status: 'pending',
        tier: null,
        reviewed_by: null,
        reviewed_at: null,
        decision_note: null,
        // Kept IN the record, not only in the commit message. This is a
        // veterinary compliance artefact: a proposal approved by one person,
        // undone by a second and re-approved by a third otherwise shows only
        // the third name, with the reversal recoverable solely by digging
        // through the data branch's git history. The app must be able to say
        // that a decision was undone, by whom, and what it was.
        reverted_by: who,
        reverted_at: new Date().toISOString(),
        previous_decision: {
          status: cur.data.status,
          tier: cur.data.tier || null,
          reviewed_by: cur.data.reviewed_by || null,
          reviewed_at: cur.data.reviewed_at || null,
          decision_note: cur.data.decision_note || null
        }
      };
      await store.writeJson(path, updated, oneLine(`revert to pending: ${updated.flag_title} (by ${who})`), cur.sha);
      invalidateListCache();
      return res.json(updated);
    } catch (err) {
      if (err instanceof ConflictError) return res.status(409).json({ error: 'Changed in a parallel session — reload.' });
      return handleStoreError(res, err);
    }
  });

  // Soft delete. A proposal carries a reviewer's typed signature and may
  // already have travelled to the rule set author in a delta, so nothing is
  // ever physically removed — the record is tombstoned and stays readable
  // in the bin. Unlike revert, this does NOT refuse an exported proposal:
  // exported rows are precisely what needs clearing out of the archive, the
  // delta document that went out is untouched by this, and exported_at
  // survives on the record so a restore loses nothing.
  router.post('/:id/delete', async (req, res) => {
    const { deleted_by } = req.body || {};
    if (!deleted_by || !String(deleted_by).trim()) {
      return res.status(400).json({ error: 'deleted_by is required' });
    }
    if (!/^[A-Za-z0-9._-]+$/.test(req.params.id) || req.params.id.includes('..')) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    try {
      const path = `${DIR}/${req.params.id}.json`;
      const cur = await store.readJson(path);
      if (!cur) return res.status(404).json({ error: 'Proposal not found' });
      if (cur.data.deleted_at) {
        return res.status(409).json({ code: 'already_deleted', error: 'This proposal is already in the bin.' });
      }
      const who = clean(deleted_by);
      const updated = { ...cur.data, deleted_by: who, deleted_at: new Date().toISOString() };
      await store.writeJson(path, updated, oneLine(`delete: ${updated.flag_title} (by ${who})`), cur.sha);
      invalidateListCache();
      return res.json(updated);
    } catch (err) {
      if (err instanceof ConflictError) return res.status(409).json({ error: 'Changed in a parallel session — reload.' });
      return handleStoreError(res, err);
    }
  });

  // Restore from the bin. The tombstone is the ONLY thing cleared — status,
  // tier and the reviewer's signature come back exactly as they were, so
  // binning a decided proposal can never quietly undo the decision. Who
  // took it out is kept in the record for the same reason revert keeps
  // reverted_by: this is a compliance artefact, and the app must be able to
  // answer the question without anyone reading the data branch's history.
  router.post('/:id/restore', async (req, res) => {
    const { restored_by } = req.body || {};
    if (!restored_by || !String(restored_by).trim()) {
      return res.status(400).json({ error: 'restored_by is required' });
    }
    if (!/^[A-Za-z0-9._-]+$/.test(req.params.id) || req.params.id.includes('..')) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    try {
      const path = `${DIR}/${req.params.id}.json`;
      const cur = await store.readJson(path);
      if (!cur) return res.status(404).json({ error: 'Proposal not found' });
      if (!cur.data.deleted_at) {
        return res.status(409).json({ code: 'not_deleted', error: 'This proposal is not in the bin.' });
      }
      const who = clean(restored_by);
      const updated = {
        ...cur.data,
        deleted_at: null,
        deleted_by: null,
        restored_by: who,
        restored_at: new Date().toISOString()
      };
      await store.writeJson(path, updated, oneLine(`restore: ${updated.flag_title} (by ${who})`), cur.sha);
      invalidateListCache();
      return res.json(updated);
    } catch (err) {
      if (err instanceof ConflictError) return res.status(409).json({ error: 'Changed in a parallel session — reload.' });
      return handleStoreError(res, err);
    }
  });

  return router;
}

module.exports = { validateNewProposal, createProposalsRouter, loadAll, DIR };
