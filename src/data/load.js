/* ════════════════════════════════════════════════════════════════════════════
   7. DATA LOADING — demo, CSV, live Apps Script endpoint, local cache, quick-log queue
   ════════════════════════════════════════════════════════════════════════════ */
let DATA = { events:[], warnings:[], extras:[], newCats:[], source:'demo', label:'Demo Mode', synced:null, base:null, map:{} };
let DAYS = new Map();   // day idx → metrics (see analyze())

/**
 * Quick-log queue (localStorage). Each op: { id, op:'append'|'end', row:{canonical header: value},
 * status:'local' (no endpoint — device only) | 'pending' (POST failed, retried on next sync), created }
 */
let QUEUE = lsGet(LS_LOCAL, []);
const saveQueue = () => lsSet(LS_LOCAL, QUEUE);

/** Which demo set fits the current family path. */
const demoVariant = () => PATHS[S.profile.path]?.demo || 'routine';
function demoRecords(variant = demoVariant()){
  const base = todayIdx() - 7, now = nowAbs();
  const records = []; let k = 0;
  for (const r of (variant === 'newborn' ? demoNewbornRows() : [...demoHistoryRows(), ...DEMO_ROWS])) {
    const d = base + r[0], st = parseTime(r[1]), en = parseTime(r[2]), prefill = !!r[10];
    let end = r[2], dur = r[3];
    if (st != null) {
      const s = d*DAY + st, t = en == null ? null : (en <= st ? (d+1)*DAY + en : d*DAY + en);
      if (s > now && !prefill) continue;                         // hasn't happened yet
      if (t != null && t > now && !prefill) { end = ''; dur = ''; } // happening now → in progress
    } else if (d > todayIdx()) continue;
    // Demo "Logged At": most rows within minutes of the event; every 9th entered that evening from notes
    const evEnd = st == null ? d*DAY + 1200 : en != null && end ? (en <= st ? (d+1)*DAY + en : d*DAY + en) : d*DAY + st;
    const lg = prefill ? evEnd - 3*DAY : (++k % 9 === 0 ? Math.max(evEnd, d*DAY + 1290) + 30 : evEnd + 2 + (k % 7));
    const stamp = lg > now ? '' : `${isoOf(Math.floor(lg / DAY))} ${fmtTime(lg % DAY)}:00`;
    records.push({ 'Date': isoOf(d), 'Start Time': r[1], 'End Time': end, 'Duration (min)': dur, 'Category': r[4], 'Milk (oz)': r[5] ?? '', 'Notes': r[6] ?? '', 'Water (ml)': r[7] ?? '', 'Tags': r[8] ?? '', 'Outcome / Rating': r[9] ?? '', 'Value': r[11] ?? '', 'Logged At': stamp });
  }
  return { headers: [...HEADERS, 'Value', 'Logged At'], records: variant === 'routine' ? records.map(neutralizeRec).filter(Boolean) : records, variant };
}

/** Merge queued quick-log entries into a record set (appends + "end" patches), in the sheet's own header names. */
function withQueue(headers, records){
  if (!QUEUE.length) return { headers, records };
  const { map } = mapHeaders(headers);
  const H = f => map[f] || FIELD_CANON[f];
  const hdrs = [...headers, ...Object.keys(FIELD_CANON).filter(f => !map[f]).map(f => FIELD_CANON[f])];
  const recs = records.slice();
  const canonToSheet = (row, extra={}) => { const o = { ...extra }; for (const [f, h] of Object.entries(FIELD_CANON)) if (row[h] !== undefined && row[h] !== '') o[H(f)] = row[h]; return o; };
  for (const q of QUEUE) {
    if (q.op === 'append') recs.push(canonToSheet(q.row, { _local:true, _localId:q.id }));
    else if (q.op === 'update' || q.op === 'delete') {
      const i = recs.findIndex(r => r._row === q.rowNum); if (i < 0) continue;
      if (q.op === 'delete') recs.splice(i, 1); else recs[i] = { ...recs[i], ...canonToSheet(q.row), _local:true, _localId:q.id };
    }
    else if (q.op === 'end') {
      // close the latest open record of this category (sheet or local)
      for (let i = recs.length - 1; i >= 0; i--) {
        const r = recs[i]; if (canonCat(r[H('cat')]) !== canonCat(q.row['Category']) || String(r[H('end')] ?? '').trim() || !String(r[H('start')] ?? '').trim()) continue;
        if (q.row['Child'] && !kidRowMatch(r[H('kid')], q.row['Child'], q.blankOk)) continue;
        recs[i] = { ...r, [H('end')]: q.row['End Time'], [H('dur')]: q.row['Duration (min)'] ?? '', _local:true, _localId:q.id,
          ...(q.row['Notes'] ? { [H('notes')]: [r[H('notes')], q.row['Notes']].filter(Boolean).join('; ') } : {}),
          ...(q.row['Outcome / Rating'] ? { [H('outcome')]: q.row['Outcome / Rating'] } : {}),
          ...(q.row['Tags'] ? { [H('tags')]: [...new Set([...parseTags(r[H('tags')]), ...parseTags(q.row['Tags'])])].join(', ') } : {}),
          ...(q.row['Asleep At'] ? { [H('asleep')]: q.row['Asleep At'] } : {}) };
        break;
      }
    }
  }
  return { headers: hdrs, records: recs };
}

/** Categories left out: by the viewer key (server-side, already removed) and/or by this device's Sharing setting. */
const exclKey = c => String(c || '').trim().toLowerCase();
function ingest(base, source, label, { synced, viewer } = {}){
  if (viewer === undefined) viewer = source === DATA.source ? DATA.viewer : null;
  const merged = viewer ? base : withQueue(base.headers, base.records);   // view-only: no local Quick Log queue
  const parsed = parseRecords(merged.records, merged.headers);
  const local = (S.share?.exclude || []).map(exclKey), counts = new Map();
  if (local.length) parsed.events = parsed.events.filter(e => { const hit = local.includes(exclKey(e.cat)); if (hit) counts.set(e.cat, (counts.get(e.cat) || 0) + 1); return !hit; });
  const excluded = [...new Set([...(viewer?.excluded || []), ...(S.share?.exclude || [])])];
  DATA = { ...parsed, source, label, synced: synced || new Date().toISOString(), base, viewer: viewer || null, excluded, excludedCounts: counts };
  DATA.allEvents = DATA.events; filterKidEvents();
  for (const [n, c] of unknownKidNames(DATA.allEvents)) DATA.warnings.push({ row:'—', msg:`Child “${n}” (${c} row${c > 1 ? 's' : ''}) doesn't match any child — add it as an alias in Settings → Child & features` });
  analyze();
  if (S.cacheData && source !== 'demo') lsSet(LS_CACHE, { headers: base.headers, records: base.records, planned: base.planned || null, appts: base.appts || null, source, label, synced: DATA.synced, viewer: DATA.viewer });
  ensureCustomRange();
  renderAll();
}
/** Re-parse the current base data (e.g. after a quick-log entry or queue change). */
const reingest = () => ingest(DATA.base || demoRecords(), DATA.source, DATA.label, { synced: DATA.synced, viewer: DATA.viewer });
function loadDemo(variant){ ingest(demoRecords(variant), 'demo', 'Demo Mode'); }
function loadCSVFile(file){
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { const p = parseCSVText(String(rd.result)); if (!p.records.length) throw new Error('No rows found'); ingest(p, 'csv', file.name); toast(`Loaded ${DATA.events.length} events from ${file.name}`); }
    catch (err) { toast('Could not read CSV: ' + err.message, true); }
  };
  rd.readAsText(file);
}
/** JSONP fallback for browsers that block fetch() to Apps Script (e.g. strict file:// policies). */
function jsonp(url, timeout=20000){
  return new Promise((res, rej) => {
    const cb = '__bld_cb_' + Date.now(); const sc = document.createElement('script');
    const done = () => { delete window[cb]; sc.remove(); clearTimeout(tm); };
    const tm = setTimeout(() => { done(); rej(new Error('Timed out')); }, timeout);
    window[cb] = data => { done(); res(data); };
    const u = new URL(url); u.searchParams.set('callback', cb); sc.src = u.toString();
    sc.onerror = () => { done(); rej(new Error('Network error')); };
    document.head.appendChild(sc);
  });
}
let syncing = false;
async function syncLive({ quiet=false, skipFlush=false } = {}){
  if (!S.endpoint) { if (!quiet) { toast('No endpoint yet — add one in Settings → Data source'); openSettings('source'); } return false; }
  if (syncing) return false; syncing = true; $('#btnRefresh').classList.add('spin');
  try {
    if (!skipFlush) await flushQueue({ quiet:true });
    const url = new URL(S.endpoint.trim()); url.searchParams.set('token', S.token || ''); url.searchParams.set('_', Date.now());
    let data;
    try { const r = await fetch(url, { cache:'no-store', redirect:'follow' }); if (!r.ok) throw new Error('HTTP ' + r.status); data = JSON.parse(await r.text()); }
    catch (e1) {
      try { data = await jsonp(url); }
      catch (e2) { throw new Error(e1 instanceof SyntaxError ? 'Endpoint did not return JSON — is the Web App access set to "Anyone"?' : 'Could not reach endpoint (' + e1.message + ')'); }
    }
    if (!data || data.ok === false) throw new Error(data?.error || 'Endpoint returned an error');
    let headers = data.headers, records = data.rows ?? data.data ?? data;
    if (Array.isArray(records) && Array.isArray(records[0])) { headers = records.shift().map(String); records = records.map(r => Object.fromEntries(headers.map((h,i) => [h, r[i]]))); }
    if (!Array.isArray(records)) throw new Error('Unexpected response shape');
    if (data.calError) toast(L('Calendar: ', 'Agenda : ') + data.calError, true);
    ingest({ headers: headers || Object.keys(records[0] || {}), records, planned: Array.isArray(data.planned) ? data.planned : null, appts: Array.isArray(data.appts) ? data.appts : null }, 'live', data.viewer ? 'Live · view only' : 'Live · Google Sheet', { viewer: data.viewer || null });
    SCRIPT_SEEN = data.scriptVersion || '0'; renderNotice(); if (typeof renderVerPill === 'function') renderVerPill();
    if (typeof cfgOnSync === 'function') cfgOnSync(data).catch(e => console.warn('config sync', e));
    if (!quiet) toast(`Synced ${DATA.events.length} events`);
    return true;
  } catch (err) { toast('Sync failed: ' + err.message, true); return false; }
  finally { syncing = false; $('#btnRefresh').classList.remove('spin'); }
}
let autoTimer = null;
function setupAutoRefresh(){ clearInterval(autoTimer); const m = +S.autoRefreshMin; if (m > 0 && S.endpoint) autoTimer = setInterval(() => syncLive({ quiet:true }), m*60000); }

