// A small in-memory Google Sheets / Apps Script stand-in, so apps-script/Code.gs can run under Node.
// Usage: const { load } = require('./gas_mock'); const gas = load(); gas.doGet(...), gas.doPost(...), gas.tabs
const fs = require('fs'), path = require('path');
function mkSheet(name, rows) {
  const sheet = {};
  const cell = (r, c) => { while (rows.length < r) rows.push([]); while (rows[r - 1].length < c) rows[r - 1].push(''); return rows[r - 1][c - 1]; };
  const lastRow = () => { let n = rows.length; while (n > 0 && rows[n - 1].every(x => x === '')) n--; return n; };
  const rng = (r, c, nr = 1, nc = 1) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')),
    getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (rows[r - 1 + i] || [])[c - 1 + j] ?? ''; return v instanceof Date ? v.toISOString() : String(v); })),
    setValues: v => { v.forEach((row, i) => row.forEach((x, j) => { cell(r + i, c + j); rows[r - 1 + i][c - 1 + j] = x; })); return rng(r, c, nr, nc); },
    setValue: x => { cell(r, c); rows[r - 1][c - 1] = x; }, getValue: () => cell(r, c),
    getDisplayValue: () => { const v = cell(r, c); return v instanceof Date ? v.toISOString() : String(v ?? ''); },
    clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (rows[r - 1 + i]) rows[r - 1 + i][c - 1 + j] = ''; },
    setNumberFormat: () => rng(r, c, nr, nc), setFontWeight: () => rng(r, c, nr, nc),
    getSheet: () => sheet, getRow: () => r, getLastRow: () => r + nr - 1, getColumn: () => c, getNumColumns: () => nc,
  });
  return Object.assign(sheet, {
    getName: () => name, getRange: rng, getLastRow: lastRow, getMaxRows: () => 1000, setFrozenRows() {},
    getLastColumn: () => Math.max(0, ...rows.map(r => r.length)),
    getDataRange: () => rng(1, 1, Math.max(1, lastRow()), Math.max(1, ...rows.map(r => r.length))),
    appendRow: a => { rows.splice(lastRow(), 0, a); }, deleteRow: r => { rows.splice(r - 1, 1); }, rows,
  });
}
// claim: set the secret through the dashboard's first-connect “claim” (true by default, like a connected dashboard).
// props: initial Script Properties. project: files the fake Apps Script API serves for self-update tests.
function load({ secret = 'test-secret-0123456789', dailyLog, calendars = [], reminders = false, claim = true, props = {}, project = null, apiError = null } = {}) {
  const sent = [], cacheStore = {}, logs = [], store = { ...props }, apiCalls = [];
  const proj = project || { files: [{ name: 'appsscript', type: 'JSON', source: '{}' }, { name: 'Code', type: 'SERVER_JS', source: 'function doGet(e) {}' }] };
  const apiFetch = (url, o) => {
    const m = url.match(/^https:\/\/script\.googleapis\.com\/v1\/projects\/([^/]+)(\/.*)$/), body = o.payload ? JSON.parse(o.payload) : null, method = (o.method || 'get').toLowerCase();
    apiCalls.push({ method, path: m[2], body, auth: o.headers && o.headers.Authorization });
    const res = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
    if (apiError) return res(403, { error: { message: apiError } });
    if (m[2] === '/content' && method === 'get') return res(200, JSON.parse(JSON.stringify(proj)));
    if (m[2] === '/content' && method === 'put') { proj.files = body.files; return res(200, proj); }
    if (m[2] === '/versions') return res(200, { versionNumber: 8 });
    if (m[2].startsWith('/deployments/')) return res(200, { deploymentId: m[2].split('/')[2] });
    return res(404, { error: { message: 'not found' } });
  };
  const tabs = {};
  tabs['Daily Log'] = mkSheet('Daily Log', dailyLog || [['Date', 'Start Time', 'End Time', 'Duration (min)', 'Category', 'Milk (oz)', 'Notes', 'Water (ml)', 'Tags', 'Outcome / Rating', 'Value']]);
  const g = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => tabs[n] || null, insertSheet: n => (tabs[n] = mkSheet(n, [])) }) },
    ContentService: { MimeType: { JSON: 'json', JAVASCRIPT: 'js' }, createTextOutput: t => ({ setMimeType: () => t }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    // calendars: [{ name, events: [{ title, start: Date, end: Date, allDay? }] }]
    CalendarApp: { getAllCalendars: () => calendars.map(c => ({ getName: () => c.name, isHidden: () => false, isSelected: () => true,
      getEvents: (a, b) => c.events.filter(e => e.start >= a && e.start <= b).map((e, i) => ({ getTitle: () => e.title, isAllDayEvent: () => !!e.allDay, getStartTime: () => e.start, getEndTime: () => e.end, getId: () => c.name + '#' + i })) })) },
    Session: { getScriptTimeZone: () => 'UTC' },
    Utilities: { formatDate: (d, tz, p) => { const iso = d.toISOString(); return p === 'HH:mm' ? iso.slice(11, 16) : iso.slice(0, 10); } }, Logger: { log: x => logs.push(String(x)) },
    CacheService: { getScriptCache: () => ({ get: k => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; } }) },
    UrlFetchApp: { fetch: (url, o = {}) => /script\.googleapis\.com/.test(url) ? apiFetch(url, o) : (sent.push({ url, ...o }), {}) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create() {} }) }) }),
      getScriptId: () => 'SCRIPT_ID', getOAuthToken: () => 'oauth-tok', getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/DEPLOY_ID/exec' }) },
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  const rem = reminders ? '\n' + fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Reminders.gs'), 'utf8') : '';
  const fn = new Function(...Object.keys(g), code + rem + '\nreturn { doGet, doPost, allowOneTapUpdates, stopOneTapUpdates, resetConnection' + (reminders ? ', sendReminders, dueReminders_, previewReminders, installReminderTrigger' : '') + ' };');
  const api = fn(...Object.values(g));
  const raw = body => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }));
  if (claim) { const r = raw({ action: 'claim', secret }); if (!r.ok) throw new Error('claim failed: ' + r.error); }
  return {
    tabs, secret, sent, logs, api, store, apiCalls, project: proj, raw,
    get: (params = {}) => JSON.parse(api.doGet({ parameter: { token: secret, ...params } })),
    post: body => JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ token: secret, ...body }) } })),
  };
}
module.exports = { load };
