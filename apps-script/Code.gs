// Baby Routine Dashboard — Apps Script v1.1 — private endpoint for your Google Sheet (read, quick-log, edits, timestamps)
const SECRET = 'change-me-to-a-long-random-phrase'; // shared with caregivers only
const SHEET_NAME = 'Daily Log';                     // tab holding one row per event
const SCRIPT_VERSION = '1.1';                       // the dashboard checks this to tell you when to redeploy

// Planned visits from your Google Calendar (optional). Timed events whose title matches VISIT_MATCH, from 60 days back
// to 60 days ahead, let the dashboard pick the right day template before the visit is logged. Only the date, start and
// end are sent: never titles, places or descriptions, and never to viewer keys. Set CALENDAR_ID = '' to turn it off.
const CALENDAR_ID = 'primary';                      // or a calendar's ID from Google Calendar → Settings → Integrate calendar
const VISIT_MATCH = /\bvisit|\bvisite/i;            // titles that count as an off-site visit…
const NOT_VISIT = /home visit|visite à domicile|à domicile|cancel|annul/i;   // …unless they also match this

// Optional read-only viewer keys (e.g. for a caseworker). A viewer key can only read, never add rows.
// Rows in an excluded category are removed HERE, before anything leaves Google, and the viewer's
// dashboard and reports show a "Not included: …" line naming those categories.
// Create a line in the dashboard (Settings → Sharing) and paste it between the braces:
const VIEWERS = {
  // 'long-random-viewer-key': { label: 'Caseworker', exclude: ['Guest', 'Outing / Excursion'], from: '2026-10-01' },
  // With several children, add  child: ['ava'], childName: 'Ava', blank: true  to share only that child's rows.
};
const ALL_KIDS_ = ['all', 'both', 'everyone', 'tous', 'toutes', 'les deux', 'kids', 'enfants'];
const kidNames_ = c => String(c || '').toLowerCase().split(/\s*(?:,|;|&|\+|\/|\band\b|\bet\b)\s*/).map(x => x.trim()).filter(String);
/** Does a Child cell belong to one of these names? Blank cells count when blankOk. */
const kidMatch_ = (cell, keys, blankOk) => { const n = kidNames_(cell); return n.length ? n.some(x => ALL_KIDS_.indexOf(x) >= 0 || keys.indexOf(x) >= 0) : !!blankOk; };

function out_(obj, cb) {
  const json = JSON.stringify(obj);
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb))   // optional JSONP fallback for strict browsers
    return ContentService.createTextOutput(cb + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
const sheet_ = () => SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
const headers_ = sh => sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim());
// "Logged At" column (created on first use): when each row was first entered — shows entries were kept in real time.
function loggedCol_(sh) {
  const h = headers_(sh); let c = h.indexOf('Logged At') + 1;
  if (!c) { c = h.length + 1; sh.getRange(1, c).setValue('Logged At'); }
  return c;
}

function plannedVisits_() {
  if (!CALENDAR_ID) return [];
  const cal = CALENDAR_ID === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) return [];
  const tz = Session.getScriptTimeZone(), now = Date.now(), f = (d, p) => Utilities.formatDate(d, tz, p);
  return cal.getEvents(new Date(now - 60 * 864e5), new Date(now + 60 * 864e5))
    .filter(ev => !ev.isAllDayEvent() && VISIT_MATCH.test(ev.getTitle()) && !NOT_VISIT.test(ev.getTitle()))
    .map(ev => ({ date: f(ev.getStartTime(), 'yyyy-MM-dd'), start: f(ev.getStartTime(), 'HH:mm'), end: f(ev.getEndTime(), 'HH:mm') }));
}
// Run once from the editor (▸ Run) to approve calendar access and see which events count as visits.
function checkCalendar() { Logger.log(JSON.stringify(plannedVisits_(), null, 1)); }

// READ — GET …/exec?token=SECRET  →  { ok, headers, rows, planned }
function doGet(e) {
  const p = (e && e.parameter) || {};
  const viewer = p.token && p.token !== SECRET ? VIEWERS[p.token] : null;
  if (p.token !== SECRET && !viewer) return out_({ ok: false, error: 'Unauthorized: token mismatch' }, p.callback);
  const sh = sheet_();
  if (!sh) return out_({ ok: false, error: 'Tab "' + SHEET_NAME + '" not found' }, p.callback);
  const values = sh.getDataRange().getDisplayValues();          // exactly what you see
  const headers = values.shift().map(h => String(h).trim());
  let data = values.map((r, i) => { r._row = i + 2; return r; }).filter(r => r.some(c => String(c).trim() !== ''));   // _row = sheet row (for edits)
  let scope = null;
  if (viewer) {                                                 // read-only key: filter before sending
    const ex = (viewer.exclude || []).map(c => String(c).trim().toLowerCase());
    const cat = headers.indexOf('Category'), date = headers.indexOf('Date'), from = viewer.from ? new Date(viewer.from) : null;
    data = data.filter(r => !(cat >= 0 && ex.indexOf(String(r[cat]).trim().toLowerCase()) >= 0)
      && !(from && date >= 0 && new Date(r[date]) < from));
    const kc = headers.indexOf('Child');
    if (viewer.child && kc >= 0) {                              // one child only; sibling names are removed from shared rows
      const keys = viewer.child.map(k => String(k).toLowerCase());
      data = data.filter(r => kidMatch_(r[kc], keys, viewer.blank)).map(r => { const c = r.slice(); c[kc] = viewer.childName || ''; c._row = r._row; return c; });
    }
    scope = { label: viewer.label || 'Viewer', excluded: viewer.exclude || [], from: viewer.from || '', child: viewer.childName || '' };
  }
  const rows = data.map(r => Object.assign(Object.fromEntries(headers.map((h, i) => [h, r[i]])), viewer ? {} : { _row: r._row }));
  let planned = [], calError = '';
  if (!viewer) try { planned = plannedVisits_(); } catch (err) { calError = String(err.message || err); }
  return out_({ ok: true, headers: headers, rows: rows, viewer: scope, planned: planned, calError: calError, scriptVersion: SCRIPT_VERSION, generated: new Date().toISOString() }, p.callback);
}

// WRITE (Quick Log) — POST {token, action: 'append' | 'end', row: {Header: value}}
// 'end' fills End Time on the most recent row of that Category that has no End Time yet.
function doPost(e) {
  const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (p.token !== SECRET) return out_({ ok: false, error: VIEWERS[p.token] ? 'This is a read-only viewer key' : 'Unauthorized: token mismatch' });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(), row = p.row || {};
    loggedCol_(sh);
    const headers = headers_(sh);
    const col = h => headers.indexOf(h) + 1;   // 0 = column missing
    if (p.action === 'end') {
      const last = sh.getLastRow(), first = Math.max(2, last - 300);
      const vals = sh.getRange(first, 1, last - first + 1, headers.length).getDisplayValues();
      for (let i = vals.length - 1; i >= 0; i--) {
        if (vals[i][col('Category') - 1] !== row['Category'] || vals[i][col('End Time') - 1]) continue;
        if (p.childKeys && col('Child') && !kidMatch_(vals[i][col('Child') - 1], p.childKeys, p.blankOk)) continue;   // that child's open nap
        const r = first + i, notes = col('Notes') ? vals[i][col('Notes') - 1] : '';
        sh.getRange(r, col('End Time')).setValue(row['End Time']);
        if (col('Duration (min)') && row['Duration (min)'] !== '') sh.getRange(r, col('Duration (min)')).setValue(row['Duration (min)']);
        if (col('Notes') && row['Notes']) sh.getRange(r, col('Notes')).setValue(notes ? notes + '; ' + row['Notes'] : row['Notes']);
        if (col('Outcome / Rating') && row['Outcome / Rating']) sh.getRange(r, col('Outcome / Rating')).setValue(row['Outcome / Rating']);
        return out_({ ok: true, updated: r });
      }
      return out_({ ok: false, error: 'No open "' + row['Category'] + '" row to end' });
    }
    if (p.action === 'update' || p.action === 'delete') {          // correct or remove one row (from the dashboard's Edit)
      const r = findRow_(sh, headers, p.rowNum, p.match || {});
      if (!r) return out_({ ok: false, error: 'That row has changed in the Sheet since the last sync. Refresh and try again.' });
      if (p.action === 'delete') { sh.deleteRow(r); return out_({ ok: true, deleted: r }); }
      delete row['Logged At'];                                      // the original entry time never changes
      row['Edited At'] = new Date();
      Object.keys(row).forEach(k => {
        let c = col(k);
        if (!c) { if (row[k] === '' || row[k] == null) return; sh.getRange(1, headers.length + 1).setValue(k); headers.push(k); c = headers.length; }
        sh.getRange(r, c).setValue(row[k]);
      });
      return out_({ ok: true, updated: r });
    }
    row['Logged At'] = new Date();                                  // server-side timestamp
    Object.keys(row).forEach(k => {                                 // add any missing column (e.g. Value) instead of dropping it
      if (row[k] !== '' && row[k] != null && headers.indexOf(k) < 0) { sh.getRange(1, headers.length + 1).setValue(k); headers.push(k); }
    });
    sh.appendRow(headers.map(h => (row[h] !== undefined ? row[h] : '')));
    return out_({ ok: true, appended: sh.getLastRow() });
  } finally { lock.releaseLock(); }
}

// Finds the row the dashboard means: the row number it saw, if Date / Category / Start Time still match; otherwise a unique match.
function findRow_(sh, headers, rowNum, match) {
  const keys = Object.keys(match).filter(k => headers.indexOf(k) >= 0);
  const same = v => keys.every(k => String(v[headers.indexOf(k)]).trim() === String(match[k]).trim());
  if (rowNum >= 2 && rowNum <= sh.getLastRow() && same(sh.getRange(rowNum, 1, 1, headers.length).getDisplayValues()[0])) return rowNum;
  if (!keys.length) return 0;
  const all = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), headers.length).getDisplayValues(), hits = [];
  all.forEach((v, i) => { if (same(v)) hits.push(i + 2); });
  return hits.length === 1 ? hits[0] : 0;
}
const editedCol_ = sh => { const h = headers_(sh); let c = h.indexOf('Edited At') + 1; if (!c) { c = h.length + 1; sh.getRange(1, c).setValue('Edited At'); } return c; };

// Simple trigger (no setup needed): stamps "Logged At" the first time a row is typed directly into the Sheet.
// Rows that already have a value are never changed, so later corrections keep their original timestamp;
// a correction to an already-stamped row is recorded in "Edited At".
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== SHEET_NAME || e.range.getLastRow() < 2) return;
  const c = loggedCol_(sh);
  const ec = headers_(sh).indexOf('Edited At') + 1;
  if ((e.range.getColumn() === c || e.range.getColumn() === ec) && e.range.getNumColumns() === 1) return;   // editing a stamp itself
  const first = Math.max(2, e.range.getRow()), n = Math.min(e.range.getLastRow() - first + 1, 500);
  const stamps = sh.getRange(first, c, n, 1).getValues(), dates = sh.getRange(first, 1, n, 1).getValues();
  let changed = false;
  const edits = [];
  for (let i = 0; i < n; i++) {
    if (stamps[i][0] === '' && dates[i][0] !== '') { stamps[i][0] = new Date(); changed = true; }
    else if (stamps[i][0] !== '') edits.push(first + i);            // a correction to an existing row
  }
  if (changed) sh.getRange(first, c, n, 1).setValues(stamps);
  if (edits.length) { const ecol = editedCol_(sh); edits.forEach(r => sh.getRange(r, ecol).setValue(new Date())); }
}

// Run ONCE after adding this script: marks rows that existed before timestamps were turned on,
// so later corrections to them are not mistaken for new entries.
function markExistingRows() {
  const sh = sheet_(), c = loggedCol_(sh), n = sh.getLastRow() - 1;
  if (n < 1) return;
  const r = sh.getRange(2, c, n, 1), v = r.getValues();
  r.setValues(v.map(x => [x[0] === '' ? 'before tracking' : x[0]]));
}