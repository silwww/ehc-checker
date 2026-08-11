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
    return fetch(`${API}${path}`, { ...opts, headers: headers() });
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
    if (res.status === 409) throw new ConflictError(`github-store write ${path}: conflict (sha mismatch)`);
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
