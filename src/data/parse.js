/* ════════════════════════════════════════════════════════════════════════════
   6. PARSING — records (objects keyed by header) → normalised events + warnings
   ════════════════════════════════════════════════════════════════════════════ */
const FIELD_RULES = [
  ['date',    k => k === 'date' || k === 'day' || k === 'logdate'],
  ['start',   k => k.startsWith('start') || k === 'time' || k === 'from'],
  ['end',     k => k.startsWith('end') || k === 'stop' || k === 'to'],
  ['dur',     k => k.startsWith('dur') || k === 'minutes' || k === 'mins'],
  ['cat',     k => k.startsWith('categ') || k === 'type' || k === 'event' || k === 'activity'],
  ['milk',    k => k.startsWith('milk') || k === 'oz' || k === 'ounces'],
  ['priv',    k => k.startsWith('private') || k.startsWith('privé') || k.startsWith('prive')],
  ['notes',   k => k.startsWith('note') || k.startsWith('comment')],
  ['water',   k => k.startsWith('water') || k.startsWith('hydration') || k === 'ml'],
  ['tags',    k => k === 'tags' || k === 'tag' || k === 'labels'],
  ['outcome', k => k.startsWith('outcome') || k.startsWith('rating') || k === 'status' || k === 'result'],
  ['logged',  k => (k.startsWith('logged') && k !== 'loggedby') || k === 'timestamp' || k === 'enteredat' || k === 'createdat'],
  ['value',   k => k === 'value' || k === 'measurement' || k === 'reading' || k === 'amount'],
  ['noted',   k => k.startsWith('noted') || k === 'notetime' || k === 'writtenat' || k === 'notetimestamp'],
  ['edited',  k => k.startsWith('edited') || k === 'modifiedat' || k === 'correctedat'],
  ['mood',    k => k === 'mood' || k === 'tone' || k === 'humeur'],
  ['by',      k => k === 'loggedby' || k === 'enteredby' || k === 'by' || k === 'notépar' || k === 'notepar'],
  ['qtype',   k => k === 'questiontype' || k === 'typeofquestion'],
  ['asleep',  k => k === 'asleepat' || k === 'asleep' || k === 'fellasleep' || k === 'fellasleepat' || k.startsWith('endormi')],
  ['kid',     k => k === 'child' || k === 'kid' || k === 'baby' || k === 'enfant' || k === 'childname' || k === 'children'],
];
const FIELD_CANON = { date:'Date', start:'Start Time', end:'End Time', dur:'Duration (min)', cat:'Category', milk:'Milk (oz)', notes:'Notes', priv:'Private Notes', water:'Water (ml)', tags:'Tags', outcome:'Outcome / Rating', logged:'Logged At', noted:'Noted At', value:'Value', asleep:'Asleep At', kid:'Child', edited:'Edited At', mood:'Mood', qtype:'Question Type', by:'Logged By' };
function mapHeaders(headers){
  const map = {}, extras = [];
  headers.forEach(h => {
    const k = String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g,'');
    if (!k || k.startsWith('_')) return;
    const rule = FIELD_RULES.find(([f, test]) => !map[f] && test(k));
    if (rule) map[rule[0]] = h; else extras.push(String(h));
  });
  return { map, extras };
}

/**
 * Normalise raw records. Never throws on bad rows: malformed rows become warnings.
 * Event: { id, row, d (day idx), st/en (min | null), s/t (absolute min), dur, cat, k (kind), g (group),
 *          milk, water, tags[], outcome, notes, extra{}, cross, allDay, open, ongoing, local }
 */
function parseRecords(records, headers){
  const { map, extras } = mapHeaders(headers || Object.keys(records[0] || {}));
  const warnings = [], events = [], typos = new Map();
  const milkInMl = !!map.milk && /\bml\b|millil/i.test(map.milk);
  const missing = ['date','cat'].filter(f => !map[f]);
  if (missing.length) warnings.push({ row:'—', msg:`Missing expected column(s): ${missing.join(', ')}. Found: ${(headers||[]).join(', ') || 'none'}` });
  resetCats();
  records.forEach((rec, i) => {
    const row = rec._local ? 'device' : i + 2; // spreadsheet row number (header = row 1)
    const get = f => map[f] != null ? String(rec[map[f]] ?? '').trim() : '';
    const raw = Object.fromEntries(Object.keys(FIELD_CANON).map(f => [f, get(f)]));
    if (!Object.values(raw).some(Boolean) && !extras.some(x => String(rec[x] ?? '').trim())) return; // blank row
    const d = parseDate(raw.date);
    if (d == null) { warnings.push({ row, msg:`Missing or unreadable date "${raw.date}" — row skipped` }); return; }
    const catName = canonCat(raw.cat); const info = registerCat(catName);
    if (!raw.cat) warnings.push({ row, msg:'Blank category — filed as "Uncategorized"' });
    else { const ty = typoOf(catName); if (ty) { if (!typos.has(catName)) typos.set(catName, { ty, rows:[] }); typos.get(catName).rows.push(row); } }
    // Start Time is optional in v2: blank → all-day / static entry pinned to the date header
    let st = parseTime(raw.start), allDay = false;
    if (st == null || st >= DAY) {
      allDay = true; st = null;
      if (raw.start) warnings.push({ row, msg:`Unreadable start time "${raw.start}" — kept as an all-day entry` });
      else if (DURATIONAL.has(info.kind)) warnings.push({ row, msg:`${catName} has no Start Time — shown as an all-day note`, info:true });
    }
    let en = !allDay && raw.end ? parseTime(raw.end) : null;
    if (!allDay && raw.end && en == null) warnings.push({ row, msg:`Unreadable end time "${raw.end}" — shown as an instant event` });
    const durN = raw.dur !== '' ? Number(raw.dur.replace(',', '.')) : NaN;
    if (raw.dur !== '' && !isFinite(durN)) warnings.push({ row, msg:`Duration "${raw.dur}" is not a number — computed from times` });
    if (!allDay && en == null && !raw.end && isFinite(durN) && durN > 0) en = (st + durN) % DAY; // end missing but duration given
    if (en != null && en === st) en = null;                                                        // zero-length → instant
    const num = (v, label) => { if (!v) return null; const x = parseFloat(v.replace(',', '.').replace(/[^0-9.\-]/g,'')); if (!isFinite(x)) { warnings.push({ row, msg:`${label} "${v}" is not a number — ignored` }); return null; } return x; };
    let milk = num(raw.milk, 'Milk value'); const water = num(raw.water, 'Water value');
    if (milk != null && milkInMl) milk = milk / OZ_ML;   // a "Milk (ml)" column is converted to oz internally
    const oc = canonOutcome(raw.outcome);
    if (oc.fixed) warnings.push({ row, msg:`Outcome "${raw.outcome}" read as "${oc.v}"`, info:true });
    if (oc.unknown) warnings.push({ row, msg:`Outcome "${raw.outcome}" is not a standard value (${OUT_ALL.join(', ')}) — kept as typed`, info:true });
    const s = allDay ? d*DAY : d*DAY + st;
    const t = en == null ? null : (en <= st ? (d+1)*DAY + en : d*DAY + en);  // End < Start → crosses midnight
    const dur = t == null ? 0 : t - s;
    if (t != null && isFinite(durN) && Math.abs(durN - dur) > 5) warnings.push({ row, msg:`Duration column says ${durN} min but times give ${dur} min — using times`, info:true });
    if (dur > 16*60) warnings.push({ row, msg:`Unusually long event (${fmtDur(dur)}) — check the times`, info:true });
    const extra = {}; extras.forEach(x => { const v = String(rec[x] ?? '').trim(); if (v) extra[x] = v; });
    const tags = parseTags(raw.tags);
    // Reactions: reaction tags, a Difficult/Distressed/Positive outcome, or reaction words in Notes (Behaviour / Handover / Awake rows)
    const reactCtx = ['behaviour','handover','awake'].includes(info.kind);
    const reactNeg = tags.some(t => REACT_NEG.includes(t)) || ['Difficult','Distressed','Unsettled'].includes(oc.v) || (reactCtx && REACT_NEG_RE.test(raw.notes));
    const reactPos = !reactNeg && (tags.some(t => REACT_POS.includes(t)) || ['Positive','Calm'].includes(oc.v) && info.kind === 'behaviour');
    const ev = { id:0, row, d, st, en, s, t, dur, cat: catName, k: info.kind, g: info.group, milk, water, outcome: oc.v,
      tags, reactNeg, reactPos, valueRaw: raw.value, loggedAt: parseDateTime(raw.logged), preTracking: /before tracking/i.test(raw.logged), notedAt: parseDateTime(raw.noted),
      notes: raw.notes, priv: String(raw.priv || '').trim(), extra, cross: t != null && t > (d+1)*DAY, allDay,
      open: t == null && !allDay && !raw.end && DURATIONAL.has(info.kind) && !(isFinite(durN) && durN > 0), local: !!rec._local, localId: rec._localId };
    // v4b: measurements in the Value column (standardised to kg / cm / °C / oz)
    ev.kidNames = splitKids(raw.kid); ev.raw = raw; ev.sheetRow = rec._row; ev.editedAt = parseDateTime(raw.edited);
    ev.match = Object.fromEntries(['date', 'cat', 'start'].filter(f => map[f]).map(f => [map[f], String(rec[map[f]] ?? '')]));
    ev.mk = measureKind(ev);
    if (ev.mk && raw.value) { ev.mv = parseMeasure(raw.value, ev.mk); if (ev.mv == null) warnings.push({ row, msg:`Couldn't read the ${ev.mk} value "${raw.value}" — try e.g. ${{ weight:'3.4 kg or 7 lb 8 oz', length:'52 cm or 20.5 in', head:'35 cm', temp:'37.6 °C or 99.7 °F', volume:'90 ml or 3 oz' }[ev.mk]}` }); }
    events.push(ev);
  });
  for (const [name, { ty, rows }] of typos) warnings.push({ row: rows.length > 3 ? rows.slice(0,3).join(', ') + '…' : rows.join(', '), msg:`Category “${name}” looks like a typo of “${ty}” (${rows.length} row${rows.length>1?'s':''}) — kept as its own category; fix it in the Sheet to merge` });
  events.sort((a,b) => a.s - b.s || (b.t ?? b.s) - (a.t ?? a.s));
  const dups = dedupe(events);
  dups.forEach(([drop, keep, kind]) => warnings.push({ row: drop.row, dup:true, double: kind === 'double', msg: kind === 'double' ? `Logged twice: rows ${keep.row} and ${drop.row} (${drop.cat}${drop.st != null ? ' ' + fmtTime(drop.st) : ''}, ${isoOf(drop.d)}) with different details — both kept, merge them in Data check` : `Looks like a duplicate of row ${keep.row} (${drop.cat}${drop.st != null ? ' ' + fmtTime(drop.st) : ''}, ${isoOf(drop.d)}) — counted once` }));
  const dropped = new Set(dups.filter(p => p[2] !== 'double').map(([x]) => x));
  for (let i = events.length - 1; i >= 0; i--) if (dropped.has(events[i])) events.splice(i, 1);
  events.forEach((e, i) => e.id = i);
  const newCats = [...CATS.values()].filter(c => !c.known && events.some(e => e.cat === c.name)).map(c => c.name);
  return { events, warnings, extras, newCats, map, dups };
}

/**
 * Duplicate detection — the same event logged twice (e.g. Quick Log + transcribed from notes):
 * same category and date, starts within 10 min, compatible end / milk / notes. Keeps the richer row.
 */
/** Does `x` hold nothing that `y` lacks (notes, tags, rating, amounts, value, end)? */
function addsNothing(x, y){
  const nx = norm(x.notes), ny = norm(y.notes);
  return (!nx || ny.includes(nx)) && x.tags.every(t => y.tags.includes(t)) && (!x.outcome || x.outcome === y.outcome)
    && (x.milk == null || x.milk === y.milk) && (x.water == null || x.water === y.water) && (!x.valueRaw || norm(x.valueRaw) === norm(y.valueRaw))
    && (x.t == null || y.t != null);
}
function dedupe(events){
  const out = [], richness = e => (e.t != null ? 4 : 0) + (e.notes ? 2 : 0) + e.tags.length + (e.outcome ? 1 : 0) + (e.local ? -1 : 0);
  const byCat = new Map(); events.forEach(e => { const k = e.cat + '|' + e.d; if (!byCat.has(k)) byCat.set(k, []); byCat.get(k).push(e); });
  for (const list of byCat.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j]; if (a._dup || b._dup || (a._dbl && b._dbl)) continue;
      let same;
      if (a.allDay || b.allDay) same = a.allDay && b.allDay && !!norm(a.notes) && !!norm(b.notes) && (norm(a.notes) === norm(b.notes) || norm(a.notes).includes(norm(b.notes)) || norm(b.notes).includes(norm(a.notes)));
      else same = Math.abs(a.s - b.s) <= 10 && (a.t == null || b.t == null || Math.abs(a.t - b.t) <= 15) && (a.milk == null || b.milk == null || a.milk === b.milk)
                 && !(/^meds?$/i.test(a.cat) && a.notes && b.notes && norm(a.notes) !== norm(b.notes));   // two different medications at once
      if (same && a.cat === 'Breastfeed' && a.tags.length && b.tags.length && a.tags.join() !== b.tags.join()) same = false;   // left vs right side
      if (same && a.valueRaw && b.valueRaw && norm(a.valueRaw) !== norm(b.valueRaw)) same = false;  // two different measurements
      if (same && (a.kidNames || []).join() !== (b.kidNames || []).join()) same = false;               // twins napping at the same time
      if (!same) continue;
      const [drop, keep] = richness(a) >= richness(b) ? [b, a] : [a, b];
      // v1.33: only a copy that adds nothing is hidden. Two caregivers logging the same dinner with their own notes,
      // tags or rating are both kept, flagged as a “double entry” to merge (never silently dropped).
      if (!addsNothing(drop, keep)) { a._dbl = b._dbl = true; const [first, second] = (a.sheetRow ?? 1e9) <= (b.sheetRow ?? 1e9) ? [a, b] : [b, a]; out.push([second, first, 'double']); continue; }
      drop._dup = true; out.push([drop, keep]);
    }
  }
  return out;
}

/** Minimal CSV parser fallback (used only if PapaParse failed to load from CDN). */
function parseCSVFallback(text){
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const headers = (rows.shift() || []).map(h => h.trim());
  return { headers, records: rows.filter(r => r.some(c => c.trim())).map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] ?? '']))) };
}
function parseCSVText(text){
  text = text.replace(/^﻿/, '');
  if (window.Papa) { const r = Papa.parse(text, { header:true, skipEmptyLines:'greedy', transformHeader: h => h.trim() }); return { headers: r.meta.fields || [], records: r.data }; }
  return parseCSVFallback(text);
}

