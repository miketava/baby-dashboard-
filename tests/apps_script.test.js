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
console.log(`apps_script: ${n} checks passed`);
