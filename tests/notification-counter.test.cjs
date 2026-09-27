// Executes the actual provider with simulated hooks, delayed state updates and Supabase.
// No React renderer, network, credentials or real notifications are used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let source = fs.readFileSync(path.join(__dirname, '../src/context/NotificationContext.jsx'), 'utf8');
source = source.replace(/^import .*;\s*$/mg, '').replace('export function NotificationProvider', 'function NotificationProvider');
source = source.slice(0, source.indexOf('  return (\n    <NotificationContext.Provider')) + '\n return value;\n}\nglobalThis.renderProvider = NotificationProvider;';
function harness() {
  const states = [], pending = [], refs = [], handlers = {};
  let cursor = 0, refCursor = 0, effect, fetchResolve, writeResult = { error: null };
  let user = { authUserId: 'local-user' };
  const fetchPromise = new Promise(resolve => { fetchResolve = resolve; });
  const ctx = {
    createContext: () => ({}), useAuth: () => ({ user, loadingSession: false }),
    useToast: () => ({ toast: { info() {} } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = initial;
      return [states[i], value => pending.push(() => { states[i] = typeof value === 'function' ? value(states[i]) : value; })];
    },
    useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => { effect = fn; },
    console: { warn() {} }, setTimeout: () => 1, clearTimeout() {},
    supabase: {
      from: () => ({
        select() { return this; }, order() { return this; }, limit: () => fetchPromise,
        update() { return this; }, eq: async () => await writeResult
      }),
      channel: () => ({ on(_name, filter, cb) { handlers[filter.event] = cb; return this; }, subscribe() { return {}; } }),
      removeChannel() {}
    }
  };
  vm.runInNewContext(source, ctx);
  function render() { cursor = 0; refCursor = 0; return ctx.renderProvider({}); }
  function flush() { while (pending.length) pending.shift()(); return render(); }
  render(); effect(); flush();
  return {
    render, flush, insert: item => handlers.INSERT({ new: item }), update: item => handlers.UPDATE({ new: item }),
    resolveFetch: async data => { fetchResolve({ data, error: null }); await new Promise(r => setImmediate(r)); },
    setWriteResult: result => { writeResult = result; },
    logout() { user = null; render(); effect(); return flush(); }
  };
}
const notice = (id, is_read = false) => ({ id, is_read, created_at: '2026-09-27T12:00:00Z', event_type: 'new_report' });
test('duplicate INSERT before state updates flush produces one card and count one', () => {
  const h = harness(); h.insert(notice('a')); h.insert(notice('a'));
  const v = h.flush(); assert.equal(v.notifications.length, 1); assert.equal(v.unreadCount, 1);
});
test('distinct unread notices count individually; read notice does not increment', () => {
  const h = harness(); h.insert(notice('a')); h.insert(notice('b')); h.insert(notice('c', true));
  const v = h.flush(); assert.equal(v.notifications.length, 3); assert.equal(v.unreadCount, 2);
});
test('fetch overlapping Realtime merges duplicates without losing a recent notice', async () => {
  const h = harness(); h.insert(notice('a')); h.insert(notice('b')); h.flush();
  await h.resolveFetch([notice('a'), notice('c', true)]);
  const v = h.flush(); assert.equal(v.notifications.length, 3); assert.equal(v.unreadCount, 2);
});
test('individual read updates count even with delayed state processing; repeat stays zero', async () => {
  const h = harness(); h.insert(notice('a')); const v = h.flush();
  const request = v.markAsRead('a'); h.flush(); await request;
  assert.equal(h.flush().unreadCount, 0);
  await h.render().markAsRead('a'); assert.equal(h.flush().unreadCount, 0);
});
test('mark all read resets count, next arrival increments to one', async () => {
  const h = harness(); h.insert(notice('a')); h.insert(notice('b')); h.flush();
  const request = h.render().markAllAsRead(); h.flush(); await request;
  assert.equal(h.flush().unreadCount, 0); h.insert(notice('c')); assert.equal(h.flush().unreadCount, 1);
});
for (const all of [false, true]) {
  test(`failed ${all ? 'all' : 'individual'} read restores list and count`, async () => {
    const h = harness(); h.insert(notice('a')); h.insert(notice('b')); h.flush();
    let resolve; h.setWriteResult(new Promise(r => { resolve = r; }));
    const request = all ? h.render().markAllAsRead() : h.render().markAsRead('a');
    assert.equal(h.flush().unreadCount, all ? 0 : 1);
    resolve({ error: { message: 'Simulated rejection' } }); await request;
    const v = h.flush(); assert.equal(v.notifications.length, 2); assert.equal(v.unreadCount, 2);
  });
}
test('Realtime read update repeated stays consistent', () => {
  const h = harness(); h.insert(notice('a')); h.flush();
  h.update(notice('a', true)); h.update(notice('a', true));
  assert.equal(h.flush().unreadCount, 0);
});
test('logout clears loaded list and count', () => {
  const h = harness(); h.insert(notice('a')); h.flush();
  const v = h.logout(); assert.equal(v.notifications.length, 0); assert.equal(v.unreadCount, 0);
});
