// Node.js >= 24. Tests the actual Edge handler with isolated in-memory services.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,
  '../supabase/functions/notify-operational-event/index.ts'), 'utf8').replace(/^import .*;\s*$/mg, ''), { mode: 'strip' });
const defaultActor = { id: 'actor', auth_user_id: 'auth-actor', name: 'Actor Test', role: 'Digitador', mine: 'Pribbenow', group_name: 'Grupo 1', is_active: true };
const defaultReport = { id: 'r1', truck_id: '2001', mine: 'Pribbenow', shift: 'Diurno', date: '2026-09-27', status: 'DOWN', system: 'Frenos', created_at: '2026-09-27T12:00:00Z', updated_at: '2026-09-27T12:01:00Z' };
const newReport = { event_type: 'new_report', report_id: 'r1', truck_id: '2001' };
function setup({ actor = {}, report = {}, visible = true, validSession = true } = {}) {
  const profile = { ...defaultActor, ...actor };
  const row = { ...defaultReport, ...report };
  const notifications = [];
  const reportClients = [];
  const profiles = [profile,
    { id: 'peer', auth_user_id: 'peer', role: 'Encargado', mine: row.mine, group_name: 'Grupo 1', is_active: true },
    { id: 'other-group', auth_user_id: 'other-group', role: 'Digitador', mine: row.mine, group_name: 'Grupo 2', is_active: true },
    { id: 'other-mine', auth_user_id: 'other-mine', role: 'Digitador', mine: 'Other', group_name: 'Grupo 1', is_active: true },
    { id: 'inactive', auth_user_id: 'inactive', role: 'Administrador', is_active: false },
    { id: 'admin', auth_user_id: 'admin', role: 'Administrador', mine: 'Other', group_name: 'Grupo 2', is_active: true }];
  class Query {
    constructor(table, client) { this.table = table; this.client = client; this.filters = []; }
    select() { return this; }
    eq(k, v) { this.filters.push(x => x[k] === v); return this; }
    neq(k, v) { this.filters.push(x => x[k] !== v); return this; }
    not(k, op, v) { this.filters.push(x => x[k] !== v); return this; }
    async single() {
      if (this.table === 'truck_reports') {
        reportClients.push(this.client);
        return { data: visible ? row : null, error: null };
      }
      return { data: profiles.find(x => this.filters.every(f => f(x))) || null, error: null };
    }
    upsert(rows) {
      this.inserted = rows.filter(x => !notifications.some(n => n.user_id === x.user_id && n.event_key === x.event_key));
      notifications.push(...this.inserted);
      return this;
    }
    then(resolve, reject) {
      return Promise.resolve({ data: this.inserted || profiles.filter(x => this.filters.every(f => f(x))), error: null }).then(resolve, reject);
    }
  }
  let handler;
  vm.runInNewContext(source, {
    serve: f => { handler = f; },
    createClient: (_url, key) => ({
      auth: { getUser: async () => ({ data: { user: validSession ? { id: profile.auth_user_id } : null }, error: null }) },
      from: table => new Query(table, key)
    }),
    Deno: { env: { get: key => key === 'SCHEDULER_SECRET' ? '' : key } },
    corsHeaders: {}, Response, console,
    fetch: () => { throw new Error('Network is forbidden in regression tests'); }
  });
  return { notifications, reportClients, async invoke(payload = newReport) {
    const response = await handler({ method: 'POST', headers: new Headers({ Authorization: 'Bearer local-test' }), json: async () => payload });
    return { status: response.status, body: await response.json() };
  } };
}
test('restricted roles cannot notify on another mine, even if the query returns the row', async () => {
  for (const role of ['Digitador', 'Encargado']) {
    const s = setup({ actor: { role }, report: { mine: 'El Descanso' } });
    assert.equal((await s.invoke()).status, 403); assert.equal(s.notifications.length, 0);
  }
});
test('administrator retains cross-mine access', async () => {
  const s = setup({ actor: { role: 'Administrador' }, report: { mine: 'El Descanso' } });
  assert.equal((await s.invoke()).status, 200); assert.equal(s.notifications.length, 2);
});
test('report is read with caller credentials, and an invisible row produces no notices', async () => {
  const s = setup({ visible: false });
  assert.equal((await s.invoke()).status, 404); assert.deepEqual(s.reportClients, ['SUPABASE_ANON_KEY']); assert.equal(s.notifications.length, 0);
});
test('inactive, unknown-role and unauthenticated callers rejected', async () => {
  for (const [options, status] of [[{ actor: { is_active: false } }, 403], [{ actor: { role: 'Unknown' } }, 403], [{ validSession: false }, 401]]) {
    const s = setup(options); assert.equal((await s.invoke()).status, status); assert.equal(s.notifications.length, 0);
  }
});
test('recipients remain own group and global administrators; actor and inactive users excluded', async () => {
  const s = setup(); assert.equal((await s.invoke()).status, 200);
  assert.deepEqual(s.notifications.map(x => x.auth_user_id).sort(), ['admin', 'peer']);
});
test('mismatching truck rejected', async () => {
  const s = setup(); assert.equal((await s.invoke({ ...newReport, truck_id: '2999' })).status, 409); assert.equal(s.notifications.length, 0);
});
test('failure system comes from stored row, not request', async () => {
  const s = setup(); await s.invoke({ ...newReport, failure_system: 'Motor' });
  assert.match(s.notifications[0].message, /Frenos/); assert.doesNotMatch(s.notifications[0].message, /Motor/);
});
test('unpersisted target status rejected', async () => {
  const s = setup(); const r = await s.invoke({ ...newReport, event_type: 'status_change', previous_status: 'DOWN', new_status: 'OPERATIVO' });
  assert.equal(r.status, 409); assert.equal(s.notifications.length, 0);
});
test('both persisted transition directions accepted', async () => {
  for (const [previous, next] of [['DOWN', 'OPERATIVO'], ['OPERATIVO', 'DOWN']]) {
    const s = setup({ report: { status: next } });
    assert.equal((await s.invoke({ ...newReport, event_type: 'status_change', previous_status: previous, new_status: next })).status, 200);
    assert.equal(s.notifications[0].metadata.new_status, next);
  }
});
test('same-status request is omitted', async () => {
  const s = setup(); const r = await s.invoke({ ...newReport, event_type: 'status_change', previous_status: 'DOWN', new_status: 'DOWN' });
  assert.equal(r.body.reason, 'NO_STATUS_CHANGE'); assert.equal(s.notifications.length, 0);
});
test('invalid previous status rejected', async () => {
  const s = setup(); assert.equal((await s.invoke({ ...newReport, event_type: 'status_change', new_status: 'DOWN', previous_status: {} })).status, 400);
});
test('changing client event identifier cannot duplicate a persisted version', async () => {
  const s = setup({ report: { status: 'OPERATIVO' } });
  const payload = { ...newReport, event_type: 'status_change', previous_status: 'DOWN', new_status: 'OPERATIVO' };
  const first = await s.invoke({ ...payload, event_id: 'one' });
  const second = await s.invoke({ ...payload, event_id: 'two' });
  assert.equal(first.body.event_key, second.body.event_key); assert.equal(second.body.notifications_created, 0); assert.equal(s.notifications.length, 2);
});
