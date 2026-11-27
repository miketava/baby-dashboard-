// Baby Routine Dashboard — Apps Script v1.7 — private endpoint for your Google Sheet (read, quick-log, edits, timestamps)
// Nothing personal lives in this code. The secret and the viewer keys are kept in this project's Script Properties
// (⚙ Project Settings → Script properties), set by the dashboard the first time it connects and by its Sharing screen.
// To update the script: replace ALL of this file with the new version (or use “Update script” in the dashboard).
const props_ = () => PropertiesService.getScriptProperties();
const secret_ = () => props_().getProperty('SECRET') || '';
const viewers_ = () => { try { return JSON.parse(props_().getProperty('VIEWERS') || '{}') || {}; } catch (err) { return {}; } };
const SECRET_MIN = 16;
// Optional read-only viewer keys (e.g. for a caseworker), created in the dashboard (Settings → Sharing) and stored here.
// Rows in an excluded category are removed HERE, before anything leaves Google, and the viewer's dashboard and reports
// show a "Not included: …" line naming those categories. Each key: { label, exclude: [...], from, child, childName, blank }.
const PRIVATE_COL = /^\s*priv(ate|é|e)/i;   // private columns, never sent to viewer keys (v1.8)
const SHEET_NAME = 'Daily Log';                     // tab holding one row per event
const SCRIPT_VERSION = '1.9';                       // the dashboard checks this to tell you when to redeploy

// Planned visits from your Google Calendar (optional). Timed events whose title matches VISIT_MATCH, from 60 days back
// to 60 days ahead, let the dashboard pick the right day template before the visit is logged. Only the date, start and
// end are sent: never titles, places or descriptions, and never to viewer keys.
// CALENDARS: 'shown' = every calendar ticked in your Google Calendar (your own and shared ones, e.g. a family calendar);
// or a list of calendar names or IDs, e.g. ['primary', 'Famille']; or '' to turn it off.
const CALENDARS = 'shown';
const VISIT_MATCH = /\bvisit|\bvisite/i;            // titles that count as an off-site visit…
const NOT_VISIT = /cancel|annul/i;                  // …unless they also match this
// Visits at home (e.g. the social worker coming over): put “à domicile” or “à la maison” in the title. They're not
// time away: the dashboard treats them like an appointment at home (no car naps) and asks once if they're for the child.
const HOME_VISIT = /domicile|[àa] la maison|chez nous|at home|home[ -]?visit/i;
// What a title means is decided by the part before a dash, so “Home visit - Marie (TS)” or “Visite parents et Ava - Julie”
// can carry names or notes after it without changing anything; if that part says nothing, the whole title is used.
function eventKind_(t) {
  if (NOT_VISIT.test(t)) return null;
  const head = String(t).split(/\s+[-–—]\s+/)[0];
  for (const p of head === t ? [t] : [head, t]) {
    if (HOME_VISIT.test(p)) return 'home';
    if (APPOINTMENTS && APPT_MATCH.test(p)) return 'appt';
    if (VISIT_MATCH.test(p)) return 'visit';
  }
  return null;
}
// Appointments (v1.4): timed events that look like a doctor, dentist, clinic or vaccine appointment, from the same calendars.
// The dashboard asks once whether each one is for the child; only then does it plan the day around it. For that question it
// needs the title and calendar name (and, to show when you tap it, its place and description), so those are sent for these events only, to the family's key only (never to viewer keys).
// Set APPOINTMENTS = false to turn this off.
const APPOINTMENTS = true;
const APPT_MATCH = /m[ée]decin|m[ée]dical|docteur|doctor|\bdr\b|p[ée]diatr|pediatr|dentist|dentiste|orthodont|clsc|clinique|clinic|vaccin|rendez-vous|\brdv\b|appointment|\bappt\b|optom|ophtalm|audiolog|orthophon|physio|ergoth|h[ôo]pital|hospital|urgence|checkup|check-up|bilan de sant[ée]/i;

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

// Shared settings (v1.3). Two tabs, created automatically on first use:
//  • Config: one row per setting — Key | Value (JSON) | Updated At | Updated By. Child profiles, templates, targets…
//    are best changed from the dashboard; the JSON is there so nothing is lost.
//  • Medications: one row per medication — easy to read and edit by hand.
// Only the family's own key reads or writes these; viewer keys never receive them.
const CONFIG_SHEET = 'Config', MEDS_SHEET = 'Medications';
const MED_COLS = ['Child', 'Name', 'Dose', 'Times', 'From', 'Until', 'Note', 'Updated At', 'Updated By'];
function tab_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@'); sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function readConfig_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues().forEach(r => { if (!r[0]) return; let v; try { v = JSON.parse(r[1]); } catch (err) { v = r[1]; } out[r[0]] = { value: v, updated: r[2], by: r[3] }; });
  return out;
}
function readMeds_() {   // null = no Medications tab yet
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEDS_SHEET); if (!sh) return null;
  if (sh.getLastRow() < 2) return [];
  const h = headers_(sh);
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues().filter(r => r.some(c => String(c).trim() !== '')).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
function writeConfig_(items, by) {
  const sh = tab_(CONFIG_SHEET, ['Key', 'Value', 'Updated At', 'Updated By']), now = new Date().toISOString(), out = {};
  const keys = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(r => r[0]) : [];
  items.forEach(it => { const row = [it.key, JSON.stringify(it.value), now, by || ''], i = keys.indexOf(it.key);
    if (i >= 0) sh.getRange(i + 2, 1, 1, 4).setValues([row]); else { sh.appendRow(row); keys.push(it.key); }
    out[it.key] = now; });
  return out;
}
function writeMeds_(rows, by) {
  const sh = tab_(MEDS_SHEET, MED_COLS), now = new Date().toISOString();
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  const vals = rows.map(r => MED_COLS.map(c => c === 'Updated At' ? now : c === 'Updated By' ? (r['Updated By'] || by || '') : (r[c] == null ? '' : String(r[c]))));
  if (vals.length) sh.getRange(2, 1, vals.length, MED_COLS.length).setValues(vals);
  return now;
}

function calendars_() {
  if (!CALENDARS) return [];
  if (CALENDARS === 'shown') return CalendarApp.getAllCalendars().filter(c => !c.isHidden() && c.isSelected());
  return [].concat(CALENDARS).flatMap(k => k === 'primary' ? [CalendarApp.getDefaultCalendar()]
    : [CalendarApp.getCalendarById(k)].concat(CalendarApp.getCalendarsByName(k))).filter(Boolean);
}
function plannedVisits_(withTitles) {
  const tz = Session.getScriptTimeZone(), now = Date.now(), f = (d, p) => Utilities.formatDate(d, tz, p), seen = {}, out = [];
  calendars_().forEach(cal => cal.getEvents(new Date(now - 60 * 864e5), new Date(now + 60 * 864e5)).forEach(ev => {
    if (ev.isAllDayEvent() || eventKind_(ev.getTitle()) !== 'visit') return;   // “Visite médicale” is an appointment; home visits aren't time away
    const v = { date: f(ev.getStartTime(), 'yyyy-MM-dd'), start: f(ev.getStartTime(), 'HH:mm'), end: f(ev.getEndTime(), 'HH:mm') };
    const key = v.date + ' ' + v.start + ' ' + v.end; if (seen[key]) return; seen[key] = 1;   // same visit in two calendars counts once
    out.push(withTitles ? Object.assign(v, { title: ev.getTitle(), calendar: cal.getName() }) : v);
  }));
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
const hash_ = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
function appointments_() {
  if (!APPOINTMENTS) return [];
  const tz = Session.getScriptTimeZone(), now = Date.now(), f = (d, p) => Utilities.formatDate(d, tz, p), seen = {}, out = [];
  calendars_().forEach(cal => cal.getEvents(new Date(now - 14 * 864e5), new Date(now + 60 * 864e5)).forEach(ev => {
    const t = ev.getTitle();
    const kind = eventKind_(t), home = kind === 'home';
    if (ev.isAllDayEvent() || !(kind === 'appt' || home)) return;
    const a = { date: f(ev.getStartTime(), 'yyyy-MM-dd'), start: f(ev.getStartTime(), 'HH:mm'), end: f(ev.getEndTime(), 'HH:mm'), title: t, calendar: cal.getName(), home: home,
      where: String(ev.getLocation() || '').slice(0, 200), desc: String(ev.getDescription() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400) };   // v1.9: shown when you tap it (family key only)
    const key = a.date + ' ' + a.start + ' ' + t; if (seen[key]) return; seen[key] = 1;   // the same event in two calendars counts once
    a.id = hash_(String(ev.getId()) + '|' + a.date + ' ' + a.start);   // stable per event and time: moving it asks again
    out.push(a);
  }));
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
// Run once from the editor (▸ Run) to approve calendar access and see which events count as visits or appointments, and from which calendar.
function checkCalendar() {
  Logger.log('Calendars read: ' + calendars_().map(c => c.getName()).join(', '));
  Logger.log('Visits: ' + JSON.stringify(plannedVisits_(true), null, 1));
  Logger.log('Appointments: ' + JSON.stringify(appointments_(), null, 1));
}

// READ — GET …/exec?token=SECRET  →  { ok, headers, rows, planned }
function doGet(e) {
  const p = (e && e.parameter) || {};
  const SECRET = secret_();
  if (!SECRET) return out_({ ok: false, unclaimed: true, scriptVersion: SCRIPT_VERSION, error: 'Not connected yet: paste this script’s URL into the dashboard (Settings → Data source).' }, p.callback);
  const viewer = p.token && p.token !== SECRET ? viewers_()[p.token] : null;
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
  // v1.8: “Private Notes” (and any column whose name starts with Private / Privé) is for the family only: never sent to a viewer key
  const shown = headers.map((h, i) => viewer && PRIVATE_COL.test(h) ? -1 : i).filter(i => i >= 0);
  const rows = data.map(r => Object.assign(Object.fromEntries(shown.map(i => [headers[i], r[i]])), viewer ? {} : { _row: r._row }));
  let planned = [], calError = '';
  if (!viewer) try { planned = plannedVisits_(); } catch (err) { calError = String(err.message || err); }
  let appts = [];
  if (!viewer) try { appts = appointments_(); } catch (err) { calError = calError || String(err.message || err); }
  const shared = viewer ? {} : { config: readConfig_(), meds: readMeds_(), appts: appts };
  if (!viewer) shared.selfUpdate = props_().getProperty('ALLOW_SELF_UPDATE') === 'true';
  return out_(Object.assign({ ok: true, headers: shown.map(i => headers[i]), rows: rows, viewer: scope, planned: planned, calError: calError, scriptVersion: SCRIPT_VERSION, generated: new Date().toISOString() }, shared), p.callback);
}

// WRITE (Quick Log) — POST {token, action: 'append' | 'end', row: {Header: value}}
// 'end' fills End Time on the most recent row of that Category that has no End Time yet.
function doPost(e) {
  const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (p.action === 'claim') {                                     // first connection: the dashboard sets the secret (and viewer keys)
      if (secret_()) return out_({ ok: false, claimed: true, error: 'This script is already connected to a dashboard. To start over: ⚙ Project Settings → Script properties → delete SECRET.' });
      if (!p.secret || String(p.secret).length < SECRET_MIN) return out_({ ok: false, error: 'The secret must be at least ' + SECRET_MIN + ' characters.' });
      props_().setProperty('SECRET', String(p.secret));
      if (p.viewers && typeof p.viewers === 'object') props_().setProperty('VIEWERS', JSON.stringify(p.viewers));
      return out_({ ok: true, claimed: true, scriptVersion: SCRIPT_VERSION });
    }
    const SECRET = secret_();
    if (!SECRET) return out_({ ok: false, unclaimed: true, error: 'Not connected yet: paste this script’s URL into the dashboard.' });
    if (p.token !== SECRET) return out_({ ok: false, error: viewers_()[p.token] ? 'This is a read-only viewer key' : 'Unauthorized: token mismatch' });
    if (p.action === 'viewers') { props_().setProperty('VIEWERS', JSON.stringify(p.viewers && typeof p.viewers === 'object' ? p.viewers : {})); return out_({ ok: true, viewers: Object.keys(viewers_()).length }); }
    if (p.action === 'secret') {                                    // change the secret (every phone needs the new one)
      if (!p.newSecret || String(p.newSecret).length < SECRET_MIN) return out_({ ok: false, error: 'The secret must be at least ' + SECRET_MIN + ' characters.' });
      props_().setProperty('SECRET', String(p.newSecret)); return out_({ ok: true });
    }
    if (p.action === 'selfUpdate') return out_(selfUpdate_(p.files || {}));
    if (p.action === 'config') return out_({ ok: true, updated: writeConfig_(p.items || [], p.by) });
    if (p.action === 'meds') return out_({ ok: true, updated: writeMeds_(p.rows || [], p.by) });
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
        if (row['Tags']) {                                         // v1.5: tags added when ending (e.g. what helped her sleep) join the row's tags
          if (!col('Tags')) { sh.getRange(1, headers.length + 1).setValue('Tags'); headers.push('Tags'); }
          const cur = String(sh.getRange(r, col('Tags')).getDisplayValue() || '').split(',').map(t => t.trim()).filter(String);
          String(row['Tags']).split(',').map(t => t.trim()).filter(String).forEach(t => { if (cur.indexOf(t) < 0) cur.push(t); });
          sh.getRange(r, col('Tags')).setValue(cur.join(', '));
        }
        Object.keys(row).forEach(k => {                            // v1.5: any other column sent (e.g. Asleep At), added if missing
          if (['Category', 'End Time', 'Duration (min)', 'Notes', 'Outcome / Rating', 'Tags', 'Child'].indexOf(k) >= 0 || row[k] === '' || row[k] == null) return;
          if (!col(k)) { sh.getRange(1, headers.length + 1).setValue(k); headers.push(k); }
          sh.getRange(r, col(k)).setValue(row[k]);
        });
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

// ── One-tap updates (optional) ─────────────────────────────────────────────────────────────────
// Lets the dashboard's “Update script” button replace this code with the version it carries. Off until you turn it on
// here, in the editor (a secret alone can't turn it on). Needs, once: the Google Apps Script API switched on at
// script.google.com/home/usersettings, and the project manifest (appsscript.json) from the dashboard's setup guide.
function allowOneTapUpdates() { props_().setProperty('ALLOW_SELF_UPDATE', 'true'); Logger.log('One-tap updates are on. Turn them off with stopOneTapUpdates.'); }
function stopOneTapUpdates() { props_().deleteProperty('ALLOW_SELF_UPDATE'); Logger.log('One-tap updates are off.'); }
/** ▸ Run to disconnect every dashboard (the next one to connect sets a new secret). Viewer keys are kept. */
function resetConnection() { props_().deleteProperty('SECRET'); Logger.log('Disconnected. Paste this script’s URL into the dashboard to connect again.'); }

function selfUpdate_(files) {
  if (props_().getProperty('ALLOW_SELF_UPDATE') !== 'true') return { ok: false, error: 'One-tap updates are off. In Apps Script, ▸ Run allowOneTapUpdates once (see the setup guide).' };
  const code = files.Code;
  if (!code || code.indexOf('function doGet(') < 0 || !/const SCRIPT_VERSION = '([\d.]+)'/.test(code)) return { ok: false, error: 'That doesn’t look like this script.' };
  const ver = code.match(/const SCRIPT_VERSION = '([\d.]+)'/)[1];
  const id = ScriptApp.getScriptId(), api = 'https://script.googleapis.com/v1/projects/' + id, auth = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  const call = (method, path, body) => {
    const r = UrlFetchApp.fetch(api + path, { method: method, headers: auth, contentType: 'application/json', payload: body ? JSON.stringify(body) : undefined, muteHttpExceptions: true });
    let j = {}; try { j = JSON.parse(r.getContentText() || '{}'); } catch (err) {}
    if (r.getResponseCode() >= 300) throw new Error((j.error && j.error.message) || ('HTTP ' + r.getResponseCode()));
    return j;
  };
  try {
    const cur = call('get', '/content');
    // keep each file's “YOUR SETTINGS” block (e.g. the reminders topic) when replacing it
    const keep = (oldSrc, newSrc) => { const re = /(\/\/ +YOUR SETTINGS[^\n]*\n)([\s\S]*?)(\n\/\/ ═+)/; const o = String(oldSrc).match(re); return o ? String(newSrc).replace(re, (m, a, b, c) => a + o[2] + c) : newSrc; };
    let touched = 0;
    const next = cur.files.map(f => {
      const src = String(f.source || '');
      if (f.type === 'SERVER_JS' && src.indexOf('function doGet(') >= 0) { touched++; return { name: f.name, type: f.type, source: code }; }
      if (f.type === 'SERVER_JS' && files.Reminders && src.indexOf('function sendReminders(') >= 0) { touched++; return { name: f.name, type: f.type, source: keep(src, files.Reminders) }; }
      return { name: f.name, type: f.type, source: src };
    });
    if (!touched) return { ok: false, error: 'Couldn’t find the main script file.' };
    call('put', '/content', { files: next });
    const v = call('post', '/versions', { description: 'Dashboard update to v' + ver });
    const dep = (ScriptApp.getService().getUrl() || '').match(/\/s\/([^/]+)\/(?:exec|dev)/);
    if (!dep) return { ok: false, error: 'Code updated, but couldn’t find this deployment: use Deploy → Manage deployments → New version.' };
    call('put', '/deployments/' + dep[1], { deploymentConfig: { scriptId: id, versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: 'v' + ver } });
    if (typeof NTFY_TOPIC !== 'undefined' && !/CHANGE-ME/.test(NTFY_TOPIC))   // a heads-up on your phones, so an update you didn't make stands out
      UrlFetchApp.fetch('https://ntfy.sh/' + NTFY_TOPIC, { method: 'post', payload: 'The dashboard script was updated to v' + ver + '.', headers: { Title: 'Baby dashboard', Tags: 'gear' }, muteHttpExceptions: true });
    return { ok: true, version: ver, versionNumber: v.versionNumber };
  } catch (err) {
    return { ok: false, error: String(err.message || err) + (/disabled|has not been used|SERVICE_DISABLED/i.test(String(err)) ? ' (switch on the Google Apps Script API at script.google.com/home/usersettings)'
      : /insufficient authentication scopes/i.test(String(err)) ? ' (the deployed version predates the manifest: deploy a new version by hand once, then one-tap updates work)' : '') };
  }
}
