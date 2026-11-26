// Checks apps-script/Code.gs against an in-memory Sheet. Run: node tests/apps_script.test.js
const assert = require('assert'), { load } = require('./gas_mock');
let n = 0; const t = (name, f) => { f(); n++; console.log('  ✓ ' + name); };
const gas = load();
t('rejects a wrong token', () => assert.strictEqual(JSON.parse(JSON.stringify(gas.get({ token: 'nope' }))).ok, false));
t('append writes a row with Logged At', () => {
  assert.ok(gas.post({ action: 'append', row: { Date: '2026-11-25', 'Start Time': '19:30', Category: 'Meds', Notes: 'Septra 2 ml', 'Logged By': 'Mike' } }).ok);
  const g = gas.get(); assert.strictEqual(g.rows.length, 1); assert.strictEqual(g.rows[0]['Logged By'], 'Mike'); assert.ok(g.rows[0]['Logged At']);
});
t('end fills End Time on the open row', () => {
  gas.post({ action: 'append', row: { Date: '2026-11-25', 'Start Time': '13:00', Category: 'Sleep - Nap' } });
  assert.ok(gas.post({ action: 'end', row: { Category: 'Sleep - Nap', 'End Time': '14:10', 'Duration (min)': 70 } }).ok);
  assert.strictEqual(gas.get().rows.find(r => r.Category === 'Sleep - Nap')['End Time'], '14:10');
});
t('update and delete find the row', () => {
  const r = gas.get().rows.find(x => x.Category === 'Sleep - Nap');
  assert.ok(gas.post({ action: 'update', rowNum: r._row, match: { Date: r.Date, Category: r.Category, 'Start Time': r['Start Time'] }, row: { Notes: 'fixed' } }).ok);
  assert.strictEqual(gas.get().rows.find(x => x.Category === 'Sleep - Nap').Notes, 'fixed');
  assert.ok(gas.post({ action: 'delete', rowNum: r._row, match: { Date: r.Date, Category: r.Category, 'Start Time': r['Start Time'] } }).ok);
  assert.ok(!gas.get().rows.some(x => x.Category === 'Sleep - Nap'));
});
t('no Config / Medications tabs until first write', () => { const g = gas.get(); assert.deepStrictEqual(g.config, {}); assert.strictEqual(g.meds, null); });
t('config upsert creates the tab and stamps updates', () => {
  assert.ok(gas.post({ action: 'config', by: 'Mike', items: [{ key: 'title', value: 'Ava' }, { key: 'child:main:targets', value: { bedtime: '19:30' } }] }).ok);
  gas.post({ action: 'config', items: [{ key: 'title', value: 'Ava routine' }] });
  const c = gas.get().config; assert.strictEqual(c.title.value, 'Ava routine'); assert.strictEqual(c['child:main:targets'].value.bedtime, '19:30');
  assert.strictEqual(gas.tabs.Config.rows.filter(r => r[0] === 'title').length, 1);
});
t('medications rewrite and clear', () => {
  gas.post({ action: 'meds', by: 'Mike', rows: [{ Name: 'Septra', Dose: '2 ml', Times: '19:30', From: '2026-11-01' }] });
  let m = gas.get().meds; assert.strictEqual(m.length, 1); assert.strictEqual(m[0].Dose, '2 ml'); assert.strictEqual(m[0]['Updated By'], 'Mike');
  gas.post({ action: 'meds', rows: [] }); m = gas.get().meds; assert.deepStrictEqual(m, []);
});
t('appointments: matched, titled, visits kept apart', () => {
  const day = (h, m, d = 3) => { const x = new Date(Date.now() + d * 864e5); x.setUTCHours(h, m, 0, 0); return x; };
  const g2 = load({ calendars: [
    { name: 'Famille', events: [
      { title: 'Visite parents et Ava', start: day(12, 0), end: day(13, 30) },
      { title: 'Dentiste Ava', start: day(14, 30), end: day(15, 15) },
      { title: 'Visite médicale CLSC', start: day(9, 30, 5), end: day(10, 0, 5) },
      { title: 'Pédiatre (annulé)', start: day(9, 0, 6), end: day(9, 30, 6) },
      { title: 'Vaccin', start: day(0, 0, 7), end: day(0, 0, 8), allDay: true } ] },
    { name: 'Mike travail', events: [{ title: 'Doctor appointment', start: day(16, 0), end: day(16, 30) }] } ] }).get();
  assert.deepStrictEqual(g2.planned.map(v => v.start), ['12:00'], 'only the parents’ visit is a visit (not “Visite médicale”)');
  assert.deepStrictEqual(g2.appts.map(a => a.title), ['Dentiste Ava', 'Doctor appointment', 'Visite médicale CLSC'], 'cancelled and all-day ones are left out');
  assert.ok(g2.appts.every(a => a.id && a.calendar && /^\d\d:\d\d$/.test(a.start)));
  assert.strictEqual(g2.scriptVersion, '1.4');
});
t('viewer keys get no appointments or settings', () => {
  const code = require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  assert.ok(/const shared = viewer \? \{\} :/.test(code));
});
console.log(`apps_script: ${n} checks passed`);
