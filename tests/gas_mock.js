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
function load({ secret = 'test-secret', dailyLog, calendars = [] } = {}) {
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
    Utilities: { formatDate: (d, tz, p) => { const iso = d.toISOString(); return p === 'HH:mm' ? iso.slice(11, 16) : iso.slice(0, 10); } }, Logger: { log() {} },
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8').replace(/const SECRET = '[^']*'/, `const SECRET = '${secret}'`);
  const fn = new Function(...Object.keys(g), code + '\nreturn { doGet, doPost };');
  const api = fn(...Object.values(g));
  return {
    tabs, secret,
    get: (params = {}) => JSON.parse(api.doGet({ parameter: { token: secret, ...params } })),
    post: body => JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ token: secret, ...body }) } })),
  };
}
module.exports = { load };
