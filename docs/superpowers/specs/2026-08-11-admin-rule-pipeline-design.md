# Admin Rule Pipeline — Design (Phase 1)

**Date:** 11 August 2026
**Status:** Draft — awaiting Silvia's review
**Branch:** `feature/admin-rule-pipeline`
**Target:** working and demonstrable before Roger's September conference talk
**Context:** memory/admin-rule-pipeline-design.md holds the full decision trail. This is
the feature the name `training` was reserved for.

## Purpose

Today, rule set update recommendations are hand-copied into a file; when it fills up,
Roger folds it into the next master version. This feature replaces the hand-copying:
an OV proposes a rule from a report finding with one click, the proposal waits in an
admin queue with full context, Silvia or Roger reviews it, and approved rule text
exports as a Word delta document Roger pastes into his next master version. The master
Word document remains the single source of truth for rule text — nothing in this phase
writes rules into the app.

## Scope

**Phase 1 (this spec, September-guaranteed):**
1. "Propose as rule" on report findings → proposal queue
2. Admin "Rule proposals" section: pending/decided lists, Approve/Reject with reviewer identity
3. Word delta export of approved rule-text proposals ("Download delta for Roger")
4. Read-only rule set version archive (list + download the `source/` .docx files)

**Explicitly OUT of Phase 1** (designed for, not built):
- Tier-2 live library writes to `main` (approved library entries going live via app commit)
- Uploading new master versions through the app
- The full checks in/out audit log (all checks, verdicts, per-OV counts) — Phase 3;
  the approvals audit trail, however, comes free in Phase 1 (see Storage)

## Storage — the central decision

Render's filesystem is ephemeral, so the queue must live elsewhere. **Proposals are
stored as JSON files on a dedicated git branch (`app-data`) of the same GitHub repo,
written via the GitHub REST API** (a fine-grained personal access token, new env var
`GITHUB_DATA_TOKEN`, contents read/write on this one repo).

Why this over a database or a Render persistent disk:
- Survives redeploys; zero new infrastructure or cost
- Every proposal and every decision is a commit — the approvals audit trail
  ("cine, când, ce a verificat") exists by construction, forever, with diffs
- Pushes to `app-data` do NOT trigger Render deploys (Render watches `main` only)
- It is the same mechanism Tier 2 needs later (writes to `main`) — built once, de-risked early

Layout on the `app-data` branch:

```
proposals/
  2026-08-11-1502-26-2-219286-a.json     ← one file per proposal
```

Proposal shape (all fields stored; nothing silently dropped):

```json
{
  "id": "2026-08-11-1502-26-2-219286-a",
  "created_at": "2026-08-11T15:02:00Z",
  "certificate_ref": "26/2/219286",
  "cert_type": "8468",
  "source_kind": "flag",
  "flag_severity": "low",
  "flag_title": "New destination — OP- EN OVERSLAGBEDRIJF VAN DER VAART",
  "flag_description": "…full flag text…",
  "model_recommendation": "…the rule_set_update_recommendations text, when present…",
  "proposer_note": "…optional free text typed at propose time…",
  "status": "pending",
  "tier": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "decision_note": null
}
```

- `tier` (`"library"` | `"rule"`) is chosen by the REVIEWER at decision time, not by the
  proposing OV — OVs propose findings, reviewers classify them.
- In Phase 1, both tiers end up in the Word delta (library entries as a "Library
  additions" section Roger can also action); Tier-2 live writes come later.
- `reviewed_by` is a required free-text name/initials at Approve/Reject time (the app
  has shared-secret auth, no per-user identity — the reviewer states who they are;
  Silvia and Roger are the only reviewers in practice).

If the GitHub write fails (network, token), the proposal is NOT silently dropped: the
client shows a clear error and keeps the button active to retry. No local fallback
queue — a fallback that vanishes on redeploy is worse than an honest error.

## The pieces

### 1. Report: "Propose as rule"

- Each flag card gets a small `Propose as rule` button (post-check, both live and
  restored reports; concise and full).
- The `rule_set_update_recommendations` block, when present, gets one too.
- Click → small inline prompt for an optional note → POST `/api/proposals` → button
  becomes `Proposed ✓` (disabled). Duplicate protection: same cert_ref + flag_title
  already pending → server responds "already proposed", client shows it.

### 2. Admin: "Rule proposals"

New section on admin.html:
- **Pending** list: date, cert ref, severity, title; expandable full context.
- Decision controls per proposal: `Approve` / `Reject`, tier picker
  (`Rule text` / `Library entry`) required on approve, reviewer name required, optional
  note. Decision = one commit updating the proposal file on `app-data`.
- **Decided** list (approved + rejected, newest first) — the visible audit trail.

### 3. Word delta export

- Button `Download delta for Roger (.docx)` in the proposals section.
- Server generates a Word document (npm `docx` package, server-side this time) from all
  **approved, not-yet-exported** proposals: one section per proposal in the master-doc
  style proven by `EHC_Checker_8468_Page_Structure_Addition.docx` — proposed rule text,
  then provenance (cert ref, date, proposer note, approved by/when). Library entries
  grouped under a "Library additions" heading.
- Export marks the included proposals `exported_at` (one commit) so the next delta
  starts empty; a `Re-download last delta` link avoids losing a file.
- Roger's loop closes exactly as today, minus the hand-copying: paste delta → next
  master version → normal layered sync → new docx lands in `source/` → appears in the
  archive below.

### 4. Version archive

- Admin section "Rule set versions": lists `rules/*/source/*.docx` (name, size, git
  date of addition), grouped by commodity, newest first; each row downloads the file.
- Read-only, served from the deployed repo itself — no storage question, and it has
  15+ real versions (v1.8 → v4.6) from day one.

## Endpoints

| Method | Path | Does |
|---|---|---|
| POST | `/api/proposals` | Create proposal (validates shape, writes to `app-data`) |
| GET | `/api/proposals` | List all (admin page) |
| POST | `/api/proposals/:id/decision` | Approve/reject: `{decision, tier, reviewed_by, note}` |
| GET | `/api/proposals/delta.docx` | Generate + download the Word delta; marks exported |
| GET | `/api/rule-versions` | List archive entries |
| GET | `/api/rule-versions/download?f=` | Download one archived .docx (path-validated) |

All behind the existing `requireAuth`. No Claude API calls anywhere — the whole
pipeline costs zero tokens.

## New module: `server/github-store.js`

Small, dependency-free (plain `fetch` + token): `readJson(path)`, `writeJson(path,
obj, commitMessage)`, `list(dir)` against the `app-data` branch. Fail-loud errors with
the GitHub status text. Unit-tested with mocked fetch. This module is deliberately the
future home of Tier-2 `main` writes.

## Setup (one-time, Silvia)

1. Create a fine-grained GitHub token: repo `silwww/ehc-checker`, permission
   Contents read/write, long expiry. Add as `GITHUB_DATA_TOKEN` in `.env` (local) and
   Render env vars.
2. The app creates the `app-data` branch on first write if absent.

## Error handling

| Failure | Behaviour |
|---|---|
| GitHub write fails at propose | Clear client error, retry stays possible, nothing dropped |
| GitHub read fails on admin load | Section shows the error, never an empty "no proposals" |
| Two reviewers decide the same proposal | Second write detects the changed file (SHA mismatch) → "already decided by X" |
| Delta export with zero approved proposals | Button disabled with count shown |
| Missing/invalid token | Server logs loud at startup; proposals section shows "not configured" |

## Testing

Unit only (node:test, mocked fetch — no network, no tokens in CI):
- github-store: read/write/list, SHA-conflict path, error propagation
- Proposal validation (shape, duplicate detection)
- Decision transitions (pending→approved/rejected; double-decision conflict)
- Delta docx generation: document builds, contains proposal text + provenance, marks
  exported (validated with the docx package's own reader or XML unzip)
- Endpoints wired behind auth (mocked store)

Manual validation by Silvia: propose from a real report finding → see it in admin →
approve as each tier → download delta → open in Word.

## Out-of-scope reminders recorded elsewhere

- After the September conference: make the repo private (memory note).
- Tier 2 (live library writes), version upload, checks in/out log: next specs.
