// Real profile handlers with mocked UI state and push operations. No mounted React.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/components/Layout/NavUserProfile.jsx'), 'utf8');
function setup(options = {}) {
  const events = [], listeners = {};
  let effect;
  const accountId = 'u1:auth1';
  const ctx = { user: { id: 'u1', authUserId: 'auth1' }, accountId,
    accountRef: { current: accountId }, pushBusyRef: { current: false }, pushCleanupRef: { current: null }, pushCheckRef: { current: 0 },
    showRoleMenu: false, pushStatus: options.status || 'inactive',
    useCallback: f => f, useEffect: f => { effect = f; },
    setPushStatus: s => events.push(['status', s]), setPushError: e => events.push(['error', e]),
    setPushLoading() {}, setShowRoleMenu() {},
    getPushSubscriptionState: options.check || (async () => { events.push(['check']); return { status: 'inactive' }; }),
    subscribeUserToPush: options.subscribe || (async () => { events.push(['subscribe']); return { success: true }; }),
    unsubscribeUserFromPush: options.unsubscribe || (async () => { events.push(['unsubscribe']); return { success: false, endpoint: 'old', error: 'Partial' }; }),
    logout: async () => events.push(['logout']), toast: { warning: m => events.push(['warning', m]) },
    window: { addEventListener: (name, cb) => { listeners[name] = cb; }, removeEventListener() {} },
    navigator: { serviceWorker: { addEventListener: (name, cb) => { listeners[name] = cb; }, removeEventListener() {} } }
  };
  const code = source.slice(source.indexOf('  const checkPushState ='), source.indexOf('  const handleSelfAvatarUpload ='));
  vm.runInNewContext(code + '\nglobalThis.handlers = {checkPushState, handleTogglePush, handleLogout};', ctx);
  return { ctx, events, listeners, effect: () => effect(), ...ctx.handlers };
}
test('logout continues and warns if push cleanup returns partial failure', async () => {
  const h = setup(); await h.handleLogout();
  assert.deepEqual(h.events.map(e => e[0]), ['unsubscribe', 'warning', 'logout']);
  assert.equal(h.ctx.pushBusyRef.current, false);
});
test('logout continues even if cleanup throws', async () => {
  const h = setup({ unsubscribe: async () => { throw new Error('timeout'); } }); await h.handleLogout();
  assert.deepEqual(h.events.map(e => e[0]), ['warning', 'logout']);
});
test('renewal message rechecks state without creating subscription', async () => {
  const h = setup(); h.effect(); h.listeners.message({ data: { type: 'PUSH_SUBSCRIPTION_CHANGED' } });
  await new Promise(r => setImmediate(r));
  assert.ok(h.events.some(e => e[0] === 'check')); assert.ok(!h.events.some(e => e[0] === 'subscribe'));
});
test('unknown state retries verification, not activation', async () => {
  const h = setup({ status: 'unknown' }); await h.handleTogglePush();
  assert.ok(h.events.some(e => e[0] === 'check')); assert.ok(!h.events.some(e => e[0] === 'subscribe'));
});
test('partial cleanup keeps endpoint and offers retry', async () => {
  const h = setup({ status: 'active' }); await h.handleTogglePush();
  assert.equal(h.ctx.pushCleanupRef.current.endpoint, 'old');
  assert.ok(h.events.some(e => e[0] === 'status' && e[1] === 'partial'));
});
test('stale account result cannot mark new account active', async () => {
  let resolve;
  const h = setup({ check: () => new Promise(r => { resolve = r; }) });
  const promise = h.checkPushState(); h.ctx.accountRef.current = 'other'; resolve({ status: 'active' }); await promise;
  assert.ok(!h.events.some(e => e[0] === 'status' && e[1] === 'active'));
});
test('double activation click starts only one operation', async () => {
  let resolve, calls = 0;
  const h = setup({ subscribe: () => { calls++; return new Promise(r => { resolve = r; }); } });
  const first = h.handleTogglePush(); await h.handleTogglePush(); assert.equal(calls, 1);
  resolve({ success: true }); await first;
});
