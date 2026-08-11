'use strict';

// Rule-proposal domain + HTTP router. Storage is injected (github-store
// in production, an in-memory fake in tests). One JSON file per proposal
// under proposals/ on the app-data branch; every state change is a commit.

const express = require('express');
const { ConflictError } = require('./github-store');
const { buildDeltaDocx } = require('./delta-docx');

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

  // Registered before /:id/decision so "delta.docx" is never read as an id.
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
