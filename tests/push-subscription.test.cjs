// Real utility functions; browser, session and database are in-memory doubles.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/pushUtils.js'), 'utf8')
  .replace(/^import .*;\s*$/mg, '').replace(/^export /mg, '')
  .replace('import.meta.env.VITE_VAPID_PUBLIC_KEY', 'testVapid');
const user = { id: 'u1', authUserId: 'auth1' };
function setup(options = {}) {
  let sessionId = options.sessionId || 'auth1';
  let row = options.row === undefined ? { user_id: 'u1', auth_user_id: 'auth1', endpoint: 'old', is_active: true } : options.row;
  let subscription;
  const calls = [];
  const signals = [];
  function makeSubscription(endpoint) {
    return { endpoint, toJSON: () => ({ endpoint, keys: { p256dh: 'test', auth: 'test' } }),
      unsubscribe: async () => {
        calls.push(['unsubscribe', endpoint]);
        if (options.unsubscribeThrow) throw new Error('Browser failure');
        if (options.unsubscribeResult !== false) subscription = null;
        return options.unsubscribeResult !== false;
      }
    };
  }
  subscription = options.subscription === false ? null : makeSubscription('old');
  const pushManager = {
    getSubscription: async () => subscription,
    subscribe: async () => { calls.push(['subscribe']); subscription = makeSubscription('new'); return subscription; }
  };
  class Query {
    constructor() { this.filters = []; this.operation = 'select'; }
    abortSignal(signal) { signals.push(signal); return this; }
    select() { return this; }
    eq(k, v) { this.filters.push([k, v]); return this; }
    maybeSingle() { return this; }
    upsert(value) { this.operation = 'upsert'; this.value = value; return this; }
    delete() { this.operation = 'delete'; return this; }
    then(resolve, reject) {
      calls.push([this.operation, this.filters]);
      if (this.operation === 'upsert' && options.stuckUpsert) return new Promise(() => {});
      const matches = row && this.filters.every(([k, v]) => row[k] === v);
      let error = null; let data = null;
      if (this.operation === 'select') { error = options.selectError ? { message: 'DB unavailable' } : null; data = matches ? { ...row } : null; }
      if (this.operation === 'upsert') { error = options.upsertError ? { message: 'Rejected' } : null; if (!error) row = { ...this.value }; }
      if (this.operation === 'delete') { error = options.deleteError ? { message: 'Delete failed' } : null; if (!error && matches) row = null; }
      return Promise.resolve({ data, error }).then(resolve, reject);
    }
  }
  const navigator = { userAgent: options.ios ? 'iPhone' : 'Macintosh', maxTouchPoints: 0,
    serviceWorker: { ready: options.stuckReady ? new Promise(() => {}) : Promise.resolve({ pushManager }) } };
  const Notification = { permission: options.permission || 'granted', requestPermission: async () => { calls.push(['permission']); Notification.permission = options.grant || 'granted'; if (options.permissionSessionId) sessionId = options.permissionSessionId; return Notification.permission; } };
  const ctx = { navigator, Notification, document: { referrer: '' }, testVapid: options.noVapid ? '' : 'dGVzdA',
    window: { navigator, Notification, PushManager: {}, atob: x => Buffer.from(x, 'base64').toString('binary'), matchMedia: () => ({ matches: !!options.standalone }) },
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: sessionId } } }, error: null }) }, from: () => new Query() },
    AbortController,
    setTimeout: (fn, ms) => setTimeout(fn, options.stuckReady || options.stuckUpsert ? 5 : ms), clearTimeout, console
  };
  if (options.unsupported) delete ctx.window.PushManager;
  vm.runInNewContext(source + '\nglobalThis.api = {getPushSubscriptionState, subscribeUserToPush, unsubscribeUserFromPush};', ctx);
  return { ...ctx.api, calls, signals, get row() { return row; }, get subscription() { return subscription; },
    setSession(id) { sessionId = id; }, options };
}
test('active requires both browser subscription and active row for this identity', async () => {
  const s = setup(); assert.equal((await s.getPushSubscriptionState(user)).status, 'active');
  for (const row of [null, { user_id: 'u1', auth_user_id: 'auth1', endpoint: 'old', is_active: false }, { user_id: 'other', auth_user_id: 'other', endpoint: 'old', is_active: true }]) {
    assert.equal((await setup({ row }).getPushSubscriptionState(user)).status, 'repair');
  }
});
test('read-only state check never creates, removes or transfers a subscription', async () => {
  const s = setup({ row: null }); await s.getPushSubscriptionState(user);
  assert.ok(s.calls.every(c => c[0] === 'select'));
});
test('server error is unknown, not active or inactive', async () => {
  assert.equal((await setup({ selectError: true }).getPushSubscriptionState(user)).status, 'unknown');
});
test('no browser subscription is inactive', async () => {
  assert.equal((await setup({ subscription: false }).getPushSubscriptionState(user)).status, 'inactive');
});
test('unsupported, denied and iPhone without installation are distinguished', async () => {
  for (const [options, status] of [[{ unsupported: true }, 'unsupported'], [{ permission: 'denied' }, 'denied'], [{ ios: true }, 'ios_not_standalone']]) {
    assert.equal((await setup(options).getPushSubscriptionState(user)).status, status);
  }
});
test('changed session cannot register or remove subscriptions', async () => {
  const s = setup({ sessionId: 'auth2' });
  assert.equal((await s.subscribeUserToPush(user)).success, false);
  assert.equal((await s.unsubscribeUserFromPush(user)).success, false);
  assert.equal(s.calls.length, 0);
});
test('fresh activation confirmed in browser and server', async () => {
  const s = setup({ subscription: false, row: null });
  assert.equal((await s.subscribeUserToPush(user)).success, true);
  assert.equal(s.row.auth_user_id, 'auth1'); assert.equal(s.row.endpoint, 'new');
});
test('existing own subscription is reused and reactivated', async () => {
  const s = setup({ row: { user_id: 'u1', auth_user_id: 'auth1', endpoint: 'old', is_active: false } });
  assert.equal((await s.subscribeUserToPush(user)).success, true);
  assert.equal(s.row.endpoint, 'old'); assert.equal(s.row.is_active, true);
  assert.ok(!s.calls.some(c => c[0] === 'subscribe' || c[0] === 'unsubscribe'));
});
test('other-account endpoint is retired in browser, not reassigned in DB', async () => {
  const s = setup({ row: { user_id: 'u2', auth_user_id: 'auth2', endpoint: 'old', is_active: true } });
  assert.equal((await s.subscribeUserToPush(user)).success, true);
  assert.equal(s.row.endpoint, 'new');
  assert.deepEqual(s.calls.filter(c => ['unsubscribe', 'subscribe'].includes(c[0])).map(c => c[0]), ['unsubscribe', 'subscribe']);
});
test('cannot create replacement when old browser subscription persists', async () => {
  const s = setup({ row: null, unsubscribeResult: false });
  assert.equal((await s.subscribeUserToPush(user)).success, false);
  assert.ok(!s.calls.some(c => c[0] === 'subscribe' || c[0] === 'upsert'));
});
test('activation failure in DB is reported without claiming success', async () => {
  const s = setup({ subscription: false, upsertError: true });
  assert.equal((await s.subscribeUserToPush(user)).success, false);
});
test('no permission or missing key performs no server write', async () => {
  for (const options of [{ permission: 'denied' }, { noVapid: true }, { permission: 'default', grant: 'denied' }]) {
    const s = setup(options); assert.equal((await s.subscribeUserToPush(user)).success, false);
    assert.ok(!s.calls.some(c => c[0] === 'upsert'));
  }
});
test('successful deactivation removes browser and own server row', async () => {
  const s = setup(); assert.equal((await s.unsubscribeUserFromPush(user)).success, true);
  assert.equal(s.row, null); assert.equal(s.subscription, null);
  const filters = s.calls.find(c => c[0] === 'delete')[1];
  assert.deepEqual(filters, [['auth_user_id', 'auth1'], ['endpoint', 'old']]);
});
test('server deletion failure retains endpoint for a later retry', async () => {
  const s = setup({ deleteError: true }); const first = await s.unsubscribeUserFromPush(user);
  assert.equal(first.success, false); assert.equal(first.browserRemoved, true); assert.equal(first.serverRemoved, false);
  s.options.deleteError = false;
  assert.equal((await s.unsubscribeUserFromPush(user, first.endpoint)).success, true); assert.equal(s.row, null);
});
test('browser false or exception cannot claim successful deactivation; DB cleanup still attempted', async () => {
  for (const options of [{ unsubscribeResult: false }, { unsubscribeThrow: true }]) {
    const s = setup(options); const r = await s.unsubscribeUserFromPush(user);
    assert.equal(r.success, false); assert.equal(r.serverRemoved, true); assert.equal(r.browserRemoved, false);
  }
});
test('both failures produce partial state', async () => {
  const s = setup({ deleteError: true, unsubscribeResult: false }); const r = await s.unsubscribeUserFromPush(user);
  assert.equal(r.success, false); assert.equal(r.serverRemoved, false); assert.equal(r.browserRemoved, false);
});
test('cleanup retry cannot unsubscribe a different current endpoint', async () => {
  const s = setup(); const r = await s.unsubscribeUserFromPush(user, 'previous-endpoint');
  assert.equal(r.success, true); assert.ok(!s.calls.some(c => c[0] === 'unsubscribe'));
  assert.equal(s.subscription.endpoint, 'old');
});
test('stuck Service Worker yields a bounded failure', async () => {
  const s = setup({ stuckReady: true }); const r = await s.unsubscribeUserFromPush(user);
  assert.equal(r.success, false); assert.match(r.error, /tiempo/);
});
test('account changes while permission prompt is open: no subscription or write', async () => {
  const s = setup({ permission: 'default', permissionSessionId: 'auth2' });
  const result = await s.subscribeUserToPush(user);
  assert.equal(result.success, false); assert.ok(!s.calls.some(c => ['subscribe', 'upsert'].includes(c[0])));
});
test('stuck database activation aborts its HTTP signal and reports failure', async () => {
  const s = setup({ stuckUpsert: true });
  const result = await s.subscribeUserToPush(user);
  assert.equal(result.success, false); assert.match(result.message, /tiempo/);
  assert.ok(s.signals.every(signal => signal.aborted));
});
