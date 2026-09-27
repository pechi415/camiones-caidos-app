// These tests execute the actual persistence and UI handlers without mounting React.
// All database and notification operations are in memory; no network or credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const source = read('src/context/ReportContext.jsx');
const mappings = source.slice(source.indexOf('const mapSupabaseReport'), source.indexOf('// Mapeos de Operadores'));
const operations = source.slice(source.indexOf('  const addReport ='), source.indexOf('  const deleteReport ='));
const stored = { id: 'r1', truck_id: '2001', mine: 'Pribbenow', shift: 'Diurno', status: 'OPERATIVO', date: '2026-09-27', system: 'Frenos', updated_at: '2026-09-27T12:00:00Z' };
function setup(result) {
  let writes = 0; const calls = [];
  const context = { reports: [{ id: 'r1', truckId: '2001', status: 'DOWN', mine: 'Pribbenow' }], getOperationalDateISO: () => '2026-09-27' };
  context.setReports = fn => { context.reports = fn(context.reports); };
  const query = {
    insert(payload) { writes++; calls.push(['insert', payload]); return this; },
    update(payload) { writes++; calls.push(['update', payload]); return this; },
    select() { return this; }, eq(k, v) { calls.push(['eq', k, v]); return this; },
    async single() { return await result; }
  };
  context.supabase = { from: () => query };
  vm.runInNewContext(mappings + operations + '\nglobalThis.ops = {addReport, updateReportStatus, editReport};', context);
  return { context, calls, writes: () => writes, ...context.ops };
}
for (const name of ['addReport', 'updateReportStatus', 'editReport']) {
  const args = name === 'addReport' ? [{ truckId: '2001', mine: 'Pribbenow' }] : name === 'updateReportStatus' ? ['r1', 'OPERATIVO'] : ['r1', { failureDescription: 'Updated' }];
  test(`${name}: database failure rejects and leaves UI unchanged`, async () => {
    const s = setup({ error: new Error('Database rejected write'), data: null });
    await assert.rejects(s[name](...args), /Database rejected write/);
    assert.equal(s.context.reports.length, 1); assert.equal(s.context.reports[0].status, 'DOWN');
    assert.equal(s.writes(), 1);
  });
  test(`${name}: missing confirmation rejects`, async () => {
    const s = setup({ data: null, error: null }); await assert.rejects(s[name](...args), /confirmar/);
    assert.equal(s.context.reports[0].status, 'DOWN');
  });
  test(`${name}: waits for persistence and returns saved data`, async () => {
    let resolve; const pending = new Promise(r => { resolve = r; });
    const s = setup(pending); const request = s[name](...args);
    assert.equal(s.context.reports[0].status, 'DOWN');
    resolve({ data: stored, error: null }); const saved = await request;
    assert.equal(saved.truckId, '2001'); assert.equal(saved.status, 'OPERATIVO');
    assert.equal(s.context.reports.length, 1); assert.equal(s.context.reports[0].status, 'OPERATIVO');
  });
}
test('status update filters previous status and only updates status fields', async () => {
  const s = setup({ data: stored, error: null }); await s.updateReportStatus('r1', 'OPERATIVO', '09:00 AM');
  assert.ok(s.calls.some(c => c[0] === 'eq' && c[1] === 'status' && c[2] === 'DOWN'));
  assert.deepEqual(Object.keys(s.calls[0][1]).sort(), ['actual_return_time', 'status', 'updated_at']);
});
test('missing report or invalid/no-op status cannot write', async () => {
  const s = setup({ data: stored, error: null });
  await assert.rejects(s.updateReportStatus('missing', 'OPERATIVO'));
  await assert.rejects(s.updateReportStatus('r1', 'invalid'));
  await assert.rejects(s.updateReportStatus('r1', 'DOWN'));
  assert.equal(s.writes(), 0);
});
function statusUI(onUpdateStatus) {
  const source = read('src/components/Dashboard/TruckTable.jsx');
  const code = source.slice(source.indexOf('  const saveStatus ='), source.indexOf('  const handleStatusClick ='));
  const events = [];
  const context = { statusSavingRef: { current: false }, setIsStatusSaving() {}, onUpdateStatus,
    setOperativoConfirmReport: v => events.push(['modal', v]),
    notifyStatusChange: async payload => { events.push(['notify', payload]); },
    toast: { error: message => events.push(['error', message]) }, console };
  vm.runInNewContext(code + '\nglobalThis.save = saveStatus;', context);
  return { events, context };
}
test('status UI retains modal and sends no notification when write fails', async () => {
  const { events, context } = statusUI(async () => { throw new Error('offline'); });
  await context.save({ id: 'r1', status: 'DOWN' }, 'OPERATIVO');
  assert.deepEqual(events.map(x => x[0]), ['error']); assert.equal(context.statusSavingRef.current, false);
});
test('status UI uses confirmed data, and blocks a duplicate click during save', async () => {
  let resolve; let calls = 0;
  const { events, context } = statusUI(() => { calls++; return new Promise(r => { resolve = r; }); });
  const first = context.save({ id: 'r1', status: 'DOWN', truckId: 'old' }, 'OPERATIVO');
  await context.save({ id: 'r1', status: 'DOWN' }, 'OPERATIVO');
  assert.equal(calls, 1); assert.equal(events.length, 0);
  resolve({ id: 'r1', status: 'OPERATIVO', truckId: '2001', shift: 'Diurno', updatedAt: 'saved-version' });
  await first;
  assert.deepEqual(events.map(x => x[0]), ['modal', 'notify']); assert.equal(events[1][1].truck_id, '2001');
});
function formUI({ editing = false, write }) {
  const source = read('src/components/Forms/TruckReportModal.jsx');
  const code = source.slice(source.indexOf('  const handleSubmit ='), source.indexOf('\n  return (', source.indexOf('  const handleSubmit =')));
  const events = [];
  const context = { savingRef: { current: false }, formData: { truckId: '2001', bayLocation: 'Rampa', failureDescription: 'Falla', mine: 'Pribbenow', shift: 'Diurno' },
    editingReport: editing ? { id: 'r1' } : null, user: { name: 'Test' }, correctTextWithAI: x => x,
    setIsSaving() {}, setErrorMsg: x => { if (x) events.push(['error', x]); },
    addReport: write, editReport: write,
    notifyNewReport: async p => { events.push(['notify', p]); },
    setActiveMine() {}, setActiveShift() {}, setSelectedDate() {}, getTodayISO: () => '2026-09-27',
    onSuccess: () => events.push(['success']), onClose: () => events.push(['close']), console };
  vm.runInNewContext(code + '\nglobalThis.submit = handleSubmit;', context);
  return { context, events };
}
for (const editing of [false, true]) {
  test(`form ${editing ? 'edit' : 'create'} failure keeps user input and does not close or notify`, async () => {
    const { context, events } = formUI({ editing, write: async () => { throw new Error('offline'); } });
    await context.submit({ preventDefault() {} });
    assert.deepEqual(events.map(x => x[0]), ['error']); assert.equal(context.formData.failureDescription, 'Falla');
  });
}
test('new report notifies and closes only after confirmed write', async () => {
  let resolve; const { context, events } = formUI({ write: () => new Promise(r => { resolve = r; }) });
  const request = context.submit({ preventDefault() {} }); assert.equal(events.length, 0);
  resolve({ id: 'r1', truckId: '2001', systemCategory: 'Frenos', shift: 'Diurno' }); await request;
  assert.deepEqual(events.map(x => x[0]), ['notify', 'success', 'close']);
});
