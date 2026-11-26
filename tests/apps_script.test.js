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
t('end merges tags and saves Asleep At (v1.5)', () => {
  gas.post({ action: 'append', row: { Date: '2026-11-26', 'Start Time': '09:57', Category: 'Sleep - Nap', Tags: 'crib' } });
  assert.ok(gas.post({ action: 'end', row: { Category: 'Sleep - Nap', 'End Time': '11:20', 'Duration (min)': 83, Tags: 'rocking, crib, lullaby', 'Asleep At': '10:12' } }).ok);
  const r = gas.get().rows.find(x => x['Start Time'] === '09:57');
  assert.strictEqual(r.Tags, 'crib, rocking, lullaby'); assert.strictEqual(r['Asleep At'], '10:12'); assert.strictEqual(r['End Time'], '11:20');
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
  assert.strictEqual(g2.scriptVersion, '1.7');
});
t('the part before a dash decides: home visit, family visit, appointment', () => {
  const day = (h, d) => { const x = new Date(Date.now() + d * 864e5); x.setUTCHours(h, 0, 0, 0); return x; };
  const ev = (title, d) => ({ title, start: day(10, d), end: day(11, d) });
  const g3 = load({ calendars: [{ name: 'Famille', events: [ev('Home visit - Marie (TS)', 2), ev('Home visit - Dr Martin', 3), ev('Visite parents et Ava - Julie TS', 4), ev('Ava - pédiatre', 5), ev('Visite à domicile CLSC', 6)] }] }).get();
  assert.deepStrictEqual(g3.planned.length, 1, 'only the parents’ visit is time away');
  const byT = Object.fromEntries(g3.appts.map(a => [a.title, a.home]));
  assert.deepStrictEqual(byT, { 'Home visit - Marie (TS)': true, 'Home visit - Dr Martin': true, 'Ava - pédiatre': false, 'Visite à domicile CLSC': true });
});
t('viewer keys get no appointments or settings', () => {
  const code = require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  assert.ok(/const shared = viewer \? \{\} :/.test(code));
});

// ── v1.7: secret and viewer keys in Script Properties; claim; one-tap updates ──
t('a fresh script is unclaimed until a dashboard claims it', () => {
  const g = load({ claim: false });
  const r = JSON.parse(g.api.doGet({ parameter: { token: '' } }));
  assert.strictEqual(r.ok, false); assert.strictEqual(r.unclaimed, true); assert.strictEqual(r.scriptVersion, '1.7');
  assert.strictEqual(g.raw({ action: 'append', token: 'x', row: { Category: 'Meds' } }).unclaimed, true, 'no writes before claim');
  assert.strictEqual(g.raw({ action: 'claim', secret: 'too-short' }).ok, false);
  assert.ok(g.raw({ action: 'claim', secret: 'a-long-enough-secret-123', viewers: { 'view-abc': { label: 'TS', exclude: ['Guest'] } } }).ok);
  assert.strictEqual(g.store.SECRET, 'a-long-enough-secret-123');
  const again = g.raw({ action: 'claim', secret: 'someone-elses-secret-99999' });
  assert.strictEqual(again.ok, false); assert.strictEqual(again.claimed, true); assert.strictEqual(g.store.SECRET, 'a-long-enough-secret-123');
  assert.strictEqual(JSON.parse(g.api.doGet({ parameter: { token: 'a-long-enough-secret-123' } })).ok, true);
});
t('viewer keys come from Script Properties and can be replaced or revoked', () => {
  const g = load();
  g.post({ action: 'append', row: { Date: '2026-11-25', 'Start Time': '10:00', Category: 'Guest' } });
  g.post({ action: 'append', row: { Date: '2026-11-25', 'Start Time': '11:00', Category: 'Meds' } });
  assert.strictEqual(g.get({ token: 'view-1' }).ok, false);
  assert.ok(g.post({ action: 'viewers', viewers: { 'view-1': { label: 'TS', exclude: ['Guest'] } } }).ok);
  const v = g.get({ token: 'view-1' });
  assert.ok(v.ok); assert.deepStrictEqual(v.rows.map(r => r.Category), ['Meds']); assert.strictEqual(v.viewer.label, 'TS'); assert.strictEqual(v.config, undefined);
  assert.strictEqual(g.raw({ action: 'append', token: 'view-1', row: { Category: 'Meds' } }).error, 'This is a read-only viewer key');
  assert.strictEqual(g.raw({ action: 'viewers', token: 'view-1', viewers: {} }).ok, false, 'a viewer can’t change keys');
  g.post({ action: 'viewers', viewers: {} });
  assert.strictEqual(g.get({ token: 'view-1' }).ok, false, 'revoked');
});
t('the secret can be changed; resetConnection lets a dashboard claim again', () => {
  const g = load();
  assert.ok(g.post({ action: 'secret', newSecret: 'brand-new-secret-abcdefgh' }).ok);
  assert.strictEqual(g.get().ok, false); assert.ok(g.get({ token: 'brand-new-secret-abcdefgh' }).ok);
  g.api.resetConnection(); assert.strictEqual(g.get().unclaimed, true);
});
const NEW_CODE = "// v9\nconst SCRIPT_VERSION = '9.0';\nfunction doGet(e) {}\n";
const NEW_REM = "// ═══\n//  YOUR SETTINGS (filled in)\nconst NTFY_TOPIC = 'baby-routine-CHANGE-ME';\n// ═══\nfunction sendReminders() {} // v3\n";
t('self-update is off until switched on in the editor', () => {
  const g = load();
  assert.strictEqual(g.get().selfUpdate, false);
  const r = g.post({ action: 'selfUpdate', files: { Code: NEW_CODE } });
  assert.strictEqual(r.ok, false); assert.ok(/off/.test(r.error)); assert.strictEqual(g.apiCalls.length, 0);
  g.api.allowOneTapUpdates(); assert.strictEqual(g.get().selfUpdate, true);
  assert.strictEqual(g.get({ token: 'nope' }).selfUpdate, undefined);
  assert.strictEqual(g.raw({ action: 'selfUpdate', token: 'wrong', files: { Code: NEW_CODE } }).ok, false);
  assert.strictEqual(g.apiCalls.length, 0, 'a wrong secret never reaches the API');
});
t('self-update replaces the code, keeps reminder settings and redeploys the same URL', () => {
  const project = { files: [
    { name: 'appsscript', type: 'JSON', source: '{"timeZone":"America/Toronto"}' },
    { name: 'Code', type: 'SERVER_JS', source: "const SCRIPT_VERSION = '1.7';\nfunction doGet(e) {}" },
    { name: 'Reminders', type: 'SERVER_JS', source: "// ═══\n//  YOUR SETTINGS (filled in)\nconst NTFY_TOPIC = 'baby-ours-xyz';\nconst LEAD_MIN = 10;\n// ═══\nfunction sendReminders() {} // v2" },
    { name: 'Notes', type: 'SERVER_JS', source: '// mine' } ] };
  const g = load({ props: { ALLOW_SELF_UPDATE: 'true' }, project });
  assert.strictEqual(g.post({ action: 'selfUpdate', files: { Code: 'not a script' } }).ok, false);
  const r = g.post({ action: 'selfUpdate', files: { Code: NEW_CODE, Reminders: NEW_REM } });
  assert.ok(r.ok, r.error); assert.strictEqual(r.version, '9.0'); assert.strictEqual(r.versionNumber, 8);
  const by = Object.fromEntries(g.project.files.map(f => [f.name, f.source]));
  assert.strictEqual(by.Code, NEW_CODE); assert.strictEqual(by.appsscript, '{"timeZone":"America/Toronto"}'); assert.strictEqual(by.Notes, '// mine');
  assert.ok(/baby-ours-xyz/.test(by.Reminders) && /LEAD_MIN = 10/.test(by.Reminders) && /\/\/ v3/.test(by.Reminders), 'new reminders code, old settings');
  assert.deepStrictEqual(g.apiCalls.map(c => c.method + ' ' + c.path), ['get /content', 'put /content', 'post /versions', 'put /deployments/DEPLOY_ID']);
  assert.strictEqual(g.apiCalls[3].body.deploymentConfig.versionNumber, 8); assert.strictEqual(g.apiCalls[0].auth, 'Bearer oauth-tok');
});
t('self-update explains a switched-off Apps Script API', () => {
  const g = load({ props: { ALLOW_SELF_UPDATE: 'true' }, apiError: 'Apps Script API has not been used in project 123 before or it is disabled.' });
  const r = g.post({ action: 'selfUpdate', files: { Code: NEW_CODE } });
  assert.strictEqual(r.ok, false); assert.ok(/usersettings/.test(r.error));
});
t('the code holds no secret', () => {
  const code = require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  assert.ok(!/const SECRET\s*=\s*'/.test(code) && !/const VIEWERS\s*=/.test(code));
  const m = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'appsscript.json'), 'utf8'));
  assert.ok(m.oauthScopes.includes('https://www.googleapis.com/auth/script.projects') && m.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets.currentonly'));
});
console.log(`apps_script: ${n} checks passed`);
