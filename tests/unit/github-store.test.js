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

function respond(status, body, headers) {
  const h = headers || {};
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (k) => (k.toLowerCase() in h ? h[k.toLowerCase()] : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
  });
}

// A 404 on a read is ambiguous by design: GitHub answers 404 rather than 403
// for resources a token cannot see, so "nothing stored yet" and "the token is
// dead" look identical. The store settles it by probing the repository.
const REPO_VISIBLE = () => respond(200, { full_name: 'silwww/ehc-checker' });
const REPO_INVISIBLE = () => respond(404, { message: 'Not Found' });

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
    responses.push(REPO_VISIBLE());
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
  // What the live API actually answers on the very first write: 404, not 422.
  it('a 404 "branch not found" triggers branch creation from main, then retries the PUT', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Branch app-data not found' })); // first PUT
    responses.push(respond(200, { object: { sha: 'mainsha' } }));           // GET main ref
    responses.push(respond(201, { ref: 'refs/heads/app-data' }));           // POST create ref
    responses.push(respond(201, { content: { sha: 'new' } }));              // retry PUT
    const sha = await store.writeJson('proposals/x.json', { a: 1 }, 'msg');
    assert.equal(sha, 'new');
    assert.match(calls[1].url, /git\/ref\/heads\/main/);
    assert.equal(JSON.parse(calls[2].opts.body).ref, 'refs/heads/app-data');
  });
  // A 404 that is NOT about the branch means the token cannot reach the repo.
  // That must stay loud rather than be mistaken for a missing branch.
  it('a 404 without a branch message throws loud instead of creating a branch', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Not Found' }));
    await assert.rejects(() => store.writeJson('p.json', {}, 'm'), /404/);
    assert.equal(calls.length, 1, 'must not attempt branch creation');
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
    responses.push(REPO_VISIBLE());
    assert.deepEqual(await store.list('proposals'), []);
  });

  // The reason this matters: an empty queue and an unreachable store used to
  // render identically — "Nothing waiting" — while proposals sat unseen.
  it('a 404 with an unreachable repo throws loud instead of reporting an empty list', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Not Found' }));
    responses.push(REPO_INVISIBLE());
    await assert.rejects(() => store.list('proposals'), /unreachable/i);
  });

  it('skips directories, so a subfolder cannot be read back as a file', async () => {
    const store = createStore(ENV);
    responses.push(respond(200, [
      { name: 'a.json', path: 'proposals/a.json', sha: 's1', type: 'file' },
      { name: 'archive', path: 'proposals/archive', sha: 's2', type: 'dir' }
    ]));
    const items = await store.list('proposals');
    assert.equal(items.length, 1);
    assert.equal(items[0].name, 'a.json');
  });

  it('throws when the path is a file rather than a directory', async () => {
    const store = createStore(ENV);
    responses.push(respond(200, { name: 'a.json', type: 'file' }));
    await assert.rejects(() => store.list('proposals/a.json'), /directory/i);
  });

  // The contents API caps a directory at 1000 entries with no pagination and
  // no signal. Silently truncating would drop older proposals out of the
  // duplicate checks and out of every future delta.
  it('throws when a listing hits the API 1000-entry ceiling', async () => {
    const store = createStore(ENV);
    const many = Array.from({ length: 1000 }, (_, i) => ({ name: `${i}.json`, path: `proposals/${i}.json`, sha: 's', type: 'file' }));
    responses.push(respond(200, many));
    await assert.rejects(() => store.list('proposals'), /1000|truncat/i);
  });
});

describe('reads distinguish "no data" from "no access"', () => {
  it('readJson returns null for a missing path when the repo is visible', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Not Found' }));
    responses.push(REPO_VISIBLE());
    assert.equal(await store.readJson('proposals/x.json'), null);
  });

  it('readJson throws loud when the repo itself cannot be reached', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Not Found' }));
    responses.push(REPO_INVISIBLE());
    await assert.rejects(() => store.readJson('proposals/x.json'), /unreachable/i);
  });

  it('401 bad credentials is loud, never an empty read', async () => {
    const store = createStore(ENV);
    responses.push(respond(401, { message: 'Bad credentials' }));
    await assert.rejects(() => store.readJson('proposals/x.json'), /credential|401/i);
  });

  it('an empty content field names the offending file instead of a bare parse error', async () => {
    const store = createStore(ENV);
    responses.push(respond(200, { content: '', encoding: 'base64', sha: 's1' }));
    await assert.rejects(() => store.readJson('proposals/broken.json'), /broken\.json/);
  });
});

describe('rate limiting and request hygiene', () => {
  it('a 429 is reported as rate limiting, not as a generic failure', async () => {
    const store = createStore(ENV);
    responses.push(respond(429, { message: 'rate limited' }, { 'retry-after': '60' }));
    await assert.rejects(() => store.readJson('p.json'), /rate limit/i);
  });

  it('a 403 with no remaining quota is reported as rate limiting', async () => {
    const store = createStore(ENV);
    responses.push(respond(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0' }));
    await assert.rejects(() => store.readJson('p.json'), /rate limit/i);
  });

  it('sends a User-Agent and pins the API version', async () => {
    const store = createStore(ENV);
    responses.push(respond(200, [{ name: 'a.json', path: 'proposals/a.json', sha: 's', type: 'file' }]));
    await store.list('proposals');
    const h = calls[0].opts.headers;
    assert.ok(h['User-Agent'], 'GitHub rejects requests with no User-Agent');
    assert.ok(h['X-GitHub-Api-Version'], 'pin the version so a default change cannot surprise us');
  });

  it('url-encodes the branch so an odd branch name cannot corrupt the request', async () => {
    const store = createStore({ ...ENV, GITHUB_DATA_BRANCH: 'app data#1' });
    responses.push(respond(200, { content: Buffer.from('{}').toString('base64'), encoding: 'base64', sha: 's' }));
    await store.readJson('proposals/a.json');
    assert.doesNotMatch(calls[0].url, /app data#1/);
    assert.match(calls[0].url, /app%20data%231/);
  });
});

describe('writeJson result handling', () => {
  it('a successful commit with no content object does not throw after the fact', async () => {
    const store = createStore(ENV);
    responses.push(respond(201, { content: null, commit: { sha: 'c1' } }));
    // The commit landed; throwing here would tell the caller it failed and
    // invite a duplicate retry.
    assert.equal(await store.writeJson('p.json', {}, 'm'), null);
  });

  it('accepts 409 as well as 422 when the branch already exists', async () => {
    const store = createStore(ENV);
    responses.push(respond(404, { message: 'Branch app-data not found' })); // first PUT
    responses.push(respond(200, { object: { sha: 'mainsha' } }));           // GET main ref
    responses.push(respond(409, { message: 'Reference already exists' }));  // POST create ref
    responses.push(respond(201, { content: { sha: 'new' } }));              // retry PUT
    assert.equal(await store.writeJson('proposals/x.json', { a: 1 }, 'msg'), 'new');
  });
});
