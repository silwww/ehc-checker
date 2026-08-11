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
    assert.deepEqual(await store.list('proposals'), []);
  });
});
