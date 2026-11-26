// Checks apps-script/Reminders.gs (v2) with Code.gs against an in-memory Sheet. Run: node tests/reminders.test.js
const assert = require('assert'), { load } = require('./gas_mock');
let n = 0; const t = (name, f) => { f(); n++; console.log('  ✓ ' + name); };
const D = '2026-12-02';   // a Wednesday
const at = hhmm => new Date(D + 'T' + hhmm + ':00Z');   // the mock runs in UTC
const baseline = { id: 'baseline', name: 'Baseline Home Day', items: [
  { label: 'Breakfast', kind: 'meal', start: '07:45' }, { label: 'Wind-down + milk', kind: 'note', start: '09:55', note: '4–5 oz' },
  { label: 'Nap 1', kind: 'nap', start: '10:15', end: '11:30' }, { label: 'Lunch', kind: 'meal', start: '12:00' }, { label: 'Nap 2', kind: 'nap', start: '14:45', end: '16:00' },
  { label: 'Hard Nap Cutoff', kind: 'cutoff', start: '16:00' }, { label: 'Bath + bedtime routine', kind: 'note', start: '19:15', beforeBed: 45, days: 'Mon, Wed' },
  { label: 'Bedtime', kind: 'bedtime', start: '20:00' }] };
const midday = { id: 'midday-visit', name: 'Midday Visit Day', items: [{ label: 'Nap 1', kind: 'nap', start: '09:45', end: '10:45' }, { label: 'Lunch', kind: 'meal', start: '11:00' },
  { label: 'Visit', kind: 'visit', start: '12:00', end: '13:30' }, { label: 'Car Nap', kind: 'nap', start: '13:40', end: '14:30' }, { label: 'Bedtime (no bridge)', kind: 'bedtime', start: '19:00' }] };
const apptPm = { id: 'appt-pm', name: 'Afternoon Appointment', items: [{ label: 'Nap 1', kind: 'nap', start: '10:30', end: '12:00' },
  { label: 'Appointment', kind: 'visit', start: '14:30', end: '15:15', appt: true }, { label: 'Car Nap', kind: 'nap', start: '15:30', end: '16:15' }, { label: 'Bedtime', kind: 'bedtime', start: '20:00' }] };
function setup(extra = {}) {
  const g = load({ reminders: true, calendars: extra.calendars || [] });
  g.post({ action: 'config', items: [{ key: 'child:main:templates', value: [baseline, midday, apptPm] }, { key: 'child:main:targets', value: { earlyVisitCutoff: '09:30' } },
    { key: 'child:main:profile', value: { name: 'Ava' } }, ...(extra.config || [])] });
  g.post({ action: 'meds', rows: [{ Name: 'Septra', Dose: '2 ml', Times: '19:30', From: '2026-11-01' }] });
  (extra.rows || []).forEach(r => g.post({ action: 'append', row: { Date: D, ...r } }));
  return g;
}
const texts = (g, hhmm) => { g.sent.length = 0; g.api.sendReminders(null, at(hhmm)); return g.sent.map(s => s.payload); };
t('baseline: Nap 1 fifteen minutes ahead, once', () => {
  const g = setup();
  assert.deepStrictEqual(texts(g, '10:02'), ['Nap 1 at 10:15 (in 13 min)']);
  assert.deepStrictEqual(texts(g, '10:07'), [], 'not sent twice');
});
t('bedtime routine follows bedtime, only on its weekdays', () => {
  const g = setup(); assert.ok(texts(g, '19:05').some(x => x.startsWith('Bath + bedtime routine at 19:15')));
});
t('no nap reminder while she is already asleep', () => {
  const g = setup({ rows: [{ 'Start Time': '14:20', Category: 'Sleep - Nap' }] }); assert.deepStrictEqual(texts(g, '14:35'), []);
});
t('a calendar visit at 12:00 picks the midday visit day', () => {
  const g = setup({ calendars: [{ name: 'Famille', events: [{ title: 'Visite parents et Ava', start: at('12:00'), end: at('13:30') }] }] });
  assert.deepStrictEqual(texts(g, '10:50'), ['Lunch at 11:00 (in 10 min)']);
  assert.ok(texts(g, '11:50').some(x => x.startsWith('Visit at 12:00')));
});
t('an accepted appointment picks its day and lines up with the real time', () => {
  const g = setup({ calendars: [{ name: 'Famille', events: [{ title: 'Pédiatre Ava', start: at('15:00'), end: at('15:45') }] }] });
  const id = g.get().appts[0].id; g.post({ action: 'config', items: [{ key: 'apptFor', value: { [id]: 'main' } }] });
  assert.ok(texts(g, '14:50').some(x => x.startsWith('Appointment at 15:00')), 'moved +30 min');
  assert.ok(texts(g, '15:50').some(x => x.startsWith('Car Nap at 16:00')));
});
t('an appointment not marked for her changes nothing', () => {
  const g = setup({ calendars: [{ name: 'Mike', events: [{ title: 'Dentiste Mike', start: at('14:30'), end: at('15:00') }] }] });
  assert.ok(texts(g, '14:35').some(x => x.startsWith('Nap 2 at 14:45')));
});
t('medication at dose time, a nudge an hour later, nothing once given', () => {
  const g = setup();
  assert.ok(texts(g, '19:31').some(x => x.includes('Septra 2 ml now')));
  assert.ok(texts(g, '20:32').some(x => x.includes('isn’t checked off yet')));
  const h = setup({ rows: [{ 'Start Time': '19:28', Category: 'Meds', Notes: 'Septra 2 ml', Tags: 'septra' }] });
  assert.ok(!texts(h, '19:31').some(x => x.includes('Septra')));
});
t('a home visit keeps the usual day and adds the visit', () => {
  const g = setup({ calendars: [{ name: 'Famille', events: [{ title: 'Visite TS à domicile', start: at('14:00'), end: at('15:00') }] }] });
  assert.deepStrictEqual(g.get().planned, [], 'not a family visit');
  const a = g.get().appts[0]; assert.ok(a.home);
  g.post({ action: 'config', items: [{ key: 'apptFor', value: { [a.id]: 'main' } }] });
  assert.deepStrictEqual(texts(g, '13:50'), ['Home visit at 14:00 (in 10 min)']);
  assert.ok(texts(g, '14:35').some(x => x.startsWith('Nap 2 at 14:45')), 'naps unchanged');
});
t('previewReminders lists the day; install sends a test', () => {
  const g = setup(); g.api.previewReminders(); assert.ok(/Nap 1 at 10:15/.test(g.logs.join('\n')) && /Septra 2 ml at 19:30/.test(g.logs.join('\n')));
  g.sent.length = 0; g.api.installReminderTrigger(); assert.strictEqual(g.sent.length, 1);
});
console.log(`reminders: ${n} checks passed`);
