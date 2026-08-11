'use strict';

// JSON storage on a dedicated git branch of the app's own repo, via the
// GitHub contents API. Rationale (spec §Storage): survives Render's
// ephemeral filesystem, every write is an audited commit, and pushes to
// the data branch never trigger a deploy (Render watches main only).

const API = 'https://api.github.com';

class ConflictError extends Error {}
class NotConfiguredError extends Error {}
// The token cannot see the repository: expired, revoked, or wrongly scoped.
// Never to be confused with "there is no data yet".
class StoreUnreachableError extends Error {}
class RateLimitedError extends Error {}

// The contents API caps a directory listing at 1000 entries, offers no
// pagination on this endpoint, and gives no signal that it truncated.
const LISTING_CEILING = 1000;

// Encode each segment but keep the slashes: a path is a path.
function encodePath(p) {
  return String(p).split('/').map(encodeURIComponent).join('/');
}

function createStore(env) {
  const token = env.GITHUB_DATA_TOKEN;
  const repo = env.GITHUB_DATA_REPO || 'silwww/ehc-checker';
  const branch = env.GITHUB_DATA_BRANCH || 'app-data';
  const configured = Boolean(token);
  const repoPath = encodePath(repo);
  const branchQ = encodeURIComponent(branch);

  function headers() {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      // GitHub documents that requests without a User-Agent are rejected.
      // Node's fetch happens to send "node", so this worked by accident.
      'User-Agent': 'ehc-checker-app',
      // Pin the version so a future default change cannot alter behaviour
      // under us.
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function assertConfigured() {
    if (!configured) {
      throw new NotConfiguredError(
        'github-store not configured: set GITHUB_DATA_TOKEN (fine-grained token, Contents read/write on ' + repo + ')'
      );
    }
  }

  async function gh(path, opts) {
    return fetch(`${API}${path}`, { ...opts, headers: headers() });
  }

  function header(res, name) {
    return res.headers && typeof res.headers.get === 'function' ? res.headers.get(name) : null;
  }

  // Both 403 and 429 carry rate limiting. Recognising it matters because
  // GitHub's guidance is explicit that hammering on while limited can get the
  // integration banned — so this has to surface, not look like a random 502.
  function rateLimitError(res) {
    const retry = header(res, 'retry-after');
    const remaining = header(res, 'x-ratelimit-remaining');
    if (res.status === 429 || (res.status === 403 && (remaining === '0' || retry))) {
      const reset = header(res, 'x-ratelimit-reset');
      return new RateLimitedError(
        `github-store: GitHub rate limit hit (status ${res.status}` +
        (retry ? `, retry after ${retry}s` : '') +
        (reset ? `, quota resets at ${reset}` : '') + ')'
      );
    }
    return null;
  }

  async function guard(res, what) {
    const rl = rateLimitError(res);
    if (rl) throw rl;
    if (res.status === 401) {
      throw new StoreUnreachableError(`github-store ${what}: 401 bad credentials — GITHUB_DATA_TOKEN is invalid or expired`);
    }
    if (res.status === 403) {
      throw new StoreUnreachableError(`github-store ${what}: 403 — the token is not permitted Contents access to ${repo}`);
    }
  }

  // GitHub answers 404 rather than 403 for any resource a token cannot see
  // (documented, to avoid confirming that private repos exist). So a 404 on a
  // read cannot by itself tell "nothing stored yet" from "this token is
  // dead" — and reporting the second as the first is how a full review queue
  // renders as "Nothing waiting".
  //
  // Probing the REPOSITORY settles it. Probing the branch would not: before
  // the first write the data branch legitimately does not exist, and empty is
  // the honest answer then.
  async function assertReachable(what) {
    const probe = await gh(`/repos/${repoPath}`, { method: 'GET' });
    if (probe.ok) return; // repo visible → the path/branch genuinely has no data yet
    const rl = rateLimitError(probe);
    if (rl) throw rl;
    throw new StoreUnreachableError(
      `github-store ${what}: repository ${repo} is unreachable (probe returned ${probe.status}). ` +
      'The token is expired, revoked, or lacks access to this repo — refusing to report empty data.'
    );
  }

  async function readJson(path) {
    assertConfigured();
    const res = await gh(`/repos/${repoPath}/contents/${encodePath(path)}?ref=${branchQ}`, { method: 'GET' });
    if (res.status === 404) {
      await assertReachable(`read ${path}`);
      return null;
    }
    await guard(res, `read ${path}`);
    if (!res.ok) throw new Error(`github-store read ${path}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    if (body.encoding && body.encoding !== 'base64') {
      throw new Error(`github-store read ${path}: unexpected encoding "${body.encoding}" — file too large for this endpoint?`);
    }
    const raw = body.content ? Buffer.from(body.content, 'base64').toString('utf8') : '';
    if (!raw.trim()) {
      throw new Error(`github-store read ${path}: the stored file is empty — a half-written record on ${branch}`);
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error(`github-store read ${path}: not valid JSON (${e.message})`);
    }
    return { data, sha: body.sha };
  }

  async function ensureBranch() {
    const main = await gh(`/repos/${repoPath}/git/ref/heads/main`, { method: 'GET' });
    if (!main.ok) throw new Error(`github-store: cannot read main ref: ${main.status}`);
    const sha = (await main.json()).object.sha;
    const created = await gh(`/repos/${repoPath}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha })
    });
    // 422 and 409 are both documented here, and the docs do not say which one
    // the already-exists case produces. Either means the branch now exists —
    // a concurrent first write won the race, which is fine.
    if (!created.ok && created.status !== 422 && created.status !== 409) {
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
    return gh(`/repos/${repoPath}/contents/${encodePath(path)}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  async function writeJson(path, obj, message, sha) {
    assertConfigured();
    let res = await putContent(path, obj, message, sha);
    if (res.status === 409) throw new ConflictError(`github-store write ${path}: conflict (sha mismatch)`);
    // The live API answers a PUT against a missing branch with 404 "Branch X
    // not found"; 422 is handled too because the contents API is documented
    // loosely here. Only the branch message is recoverable — any other 404 is
    // the token failing to reach the repo and must stay loud.
    if (res.status === 404 || res.status === 422) {
      const text = await res.text();
      if (/branch.*not found/i.test(text)) {
        await ensureBranch();
        res = await putContent(path, obj, message, sha);
      } else if (res.status === 422 && /sha/i.test(text)) {
        throw new ConflictError(`github-store write ${path}: ${text}`);
      } else {
        throw new Error(`github-store write ${path}: ${res.status} ${text}`);
      }
    }
    if (res.status === 409) throw new ConflictError(`github-store write ${path}: conflict (sha mismatch)`);
    await guard(res, `write ${path}`);
    if (!res.ok) throw new Error(`github-store write ${path}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    // The commit has landed by this point. `content` is documented nullable,
    // and throwing here would report a failed write to a caller that would
    // then retry and duplicate it. Every caller discards this value anyway.
    return body && body.content ? body.content.sha : null;
  }

  async function list(dir) {
    assertConfigured();
    const res = await gh(`/repos/${repoPath}/contents/${encodePath(dir)}?ref=${branchQ}`, { method: 'GET' });
    if (res.status === 404) {
      await assertReachable(`list ${dir}`);
      return [];
    }
    await guard(res, `list ${dir}`);
    if (!res.ok) throw new Error(`github-store list ${dir}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    if (!Array.isArray(body)) {
      throw new Error(`github-store list ${dir}: expected a directory, got a single ${(body && body.type) || 'entry'}`);
    }
    if (body.length >= LISTING_CEILING) {
      throw new Error(
        `github-store list ${dir}: ${body.length} entries — this endpoint truncates at ${LISTING_CEILING} and cannot paginate. ` +
        'Older records would drop out of the duplicate checks and out of every future delta. Move to the Git Trees API before continuing.'
      );
    }
    // Directories and submodules must not be read back as files: a single
    // subfolder here used to take down every route with an opaque TypeError.
    return body
      .filter((e) => !e.type || e.type === 'file')
      .map((e) => ({ name: e.name, path: e.path, sha: e.sha }));
  }

  return { configured, readJson, writeJson, list };
}

module.exports = { createStore, ConflictError, NotConfiguredError, StoreUnreachableError, RateLimitedError };
