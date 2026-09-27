// Execute the real Edge handler with in-memory recipients and a fake web-push sender.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../supabase/functions/send-web-push/index.ts'), 'utf8').replace(/^import .*;\s*$/mg, ''), { mode: 'strip' });
const payload = { title: 'Local test', body: 'No real delivery' };
function setup({ authorized = true, admin = false } = {}) {
  const sent = [], queries = [];
  const rows = [
    { id: 's1', user_id: 'u1', auth_user_id: 'a1', is_active: true, endpoint: 'https://test.invalid/one', p256dh: 'fake', auth: 'fake' },
    { id: 's2', user_id: 'u2', auth_user_id: 'a2', is_active: true, endpoint: 'https://test.invalid/two', p256dh: 'fake', auth: 'fake' },
    { id: 's3', user_id: 'u1', auth_user_id: 'a1', is_active: false, endpoint: 'https://test.invalid/inactive', p256dh: 'fake', auth: 'fake' }
  ];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.isUpdate = false; }
    select() { return this; }
    eq(k, v) { this.filters.push(x => x[k] === v); return this; }
    in(k, values) { this.filters.push(x => values.includes(x[k])); return this; }
    update() { this.isUpdate = true; return this; }
    async single() { return { data: { role: admin ? 'Administrador' : 'Digitador' }, error: null }; }
    then(resolve, reject) {
      if (!this.isUpdate) queries.push(this.table);
      return Promise.resolve({ data: rows.filter(x => this.filters.every(f => f(x))), error: null }).then(resolve, reject);
    }
  }
  let handler;
  vm.runInNewContext(source, {
    serve: fn => { handler = fn; }, createClient: () => ({ from: table => new Query(table), auth: { getUser: async () => ({ data: { user: { id: 'local' } }, error: null }) } }),
    Deno: { env: { get: key => key === 'SCHEDULER_SECRET' ? 'local-secret' : 'fake' } },
    webpush: { setVapidDetails() {}, sendNotification: async subscription => { sent.push(subscription.endpoint); return { statusCode: 201 }; } },
    corsHeaders: {}, Response, URL, console,
    fetch: () => { throw new Error('Network forbidden'); }
  });
  return { sent, queries, async run(input) {
    const headers = new Headers(admin ? { Authorization: 'Bearer local' } : authorized ? { 'x-scheduler-secret': 'local-secret' } : {});
    const response = await handler({ method: 'POST', headers, json: async () => input });
    return { status: response.status, data: await response.json() };
  } };
}
const badDestinations = [
  {}, { target_auth_user_ids: [] }, { target_user_ids: [], target_auth_user_ids: [], target_subscription_ids: [] },
  { target_auth_user_ids: null }, { target_auth_user_ids: 'a1' }, { target_auth_user_ids: [''] },
  { target_auth_user_ids: ['  '] }, { target_user_ids: [1] }, { target_user_ids: ['u1', null] },
  { target_subscription: {} }, { target_subscription: { endpoint: 'https://test.invalid', keys: {} } },
  { target_subscription: { endpoint: 'not-url', keys: { p256dh: 'x', auth: 'y' } } },
  { target_subscription: { endpoint: 'http://test.invalid', keys: { p256dh: 'x', auth: 'y' } } },
  { target_auth_user_ids: ['a1'], target_subscription: {} }
];
for (const [i, targets] of badDestinations.entries()) {
  test(`invalid or missing destination ${i + 1}: 400, no subscription query and zero sends`, async () => {
    const h = setup(); assert.equal((await h.run({ ...payload, ...targets })).status, 400);
    assert.equal(h.queries.length, 0); assert.equal(h.sent.length, 0);
  });
}
for (const [field, id] of [['target_user_ids', 'u1'], ['target_auth_user_ids', 'a1'], ['target_subscription_ids', 's1']]) {
  test(`${field} sends only to the specified active subscription`, async () => {
    const h = setup(); const r = await h.run({ ...payload, [field]: [id] });
    assert.equal(r.status, 200); assert.equal(r.data.successful, 1);
    assert.deepEqual(h.sent, ['https://test.invalid/one']);
  });
}
test('empty unused lists do not widen a valid target list; whitespace and duplicate IDs normalized', async () => {
  const h = setup(); const r = await h.run({ ...payload, target_user_ids: [], target_auth_user_ids: [' a1 ', 'a1'] });
  assert.equal(r.status, 200); assert.deepEqual(h.sent, ['https://test.invalid/one']);
});
test('multiple filters keep intersection behavior', async () => {
  const h = setup(); const r = await h.run({ ...payload, target_user_ids: ['u1'], target_auth_user_ids: ['a2'] });
  assert.equal(r.status, 200); assert.equal(r.data.total_targets, 0); assert.equal(h.sent.length, 0);
});
test('valid but unmatched target does not fall back to everyone', async () => {
  const h = setup(); const r = await h.run({ ...payload, target_auth_user_ids: ['missing'] });
  assert.equal(r.status, 200); assert.equal(r.data.total_targets, 0); assert.equal(h.sent.length, 0);
});
test('complete direct subscription still works without reading recipient directory', async () => {
  const h = setup(); const r = await h.run({ ...payload, target_subscription: { endpoint: 'https://test.invalid/direct', keys: { p256dh: 'fake', auth: 'fake' } } });
  assert.equal(r.status, 200); assert.deepEqual(h.sent, ['https://test.invalid/direct']); assert.equal(h.queries.length, 0);
});
test('admin authentication remains subject to explicit destinations', async () => {
  const h = setup({ admin: true }); assert.equal((await h.run(payload)).status, 400);
  assert.equal((await h.run({ ...payload, target_auth_user_ids: ['a1'] })).status, 200);
  assert.deepEqual(h.sent, ['https://test.invalid/one']);
});
test('unauthorized caller rejected even with a valid target', async () => {
  const h = setup({ authorized: false }); assert.equal((await h.run({ ...payload, target_auth_user_ids: ['a1'] })).status, 403);
  assert.equal(h.sent.length, 0);
});
test('non-object JSON rejected without delivery', async () => {
  for (const input of [null, [], 'text']) {
    const h = setup(); assert.equal((await h.run(input)).status, 400); assert.equal(h.sent.length, 0);
  }
});
