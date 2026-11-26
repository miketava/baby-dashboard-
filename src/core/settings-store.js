/* ════════════════════════════════════════════════════════════════════════════
   4. SETTINGS (localStorage, deep-merged over defaults, v1 → v2 migration)
   ════════════════════════════════════════════════════════════════════════════ */
function deepMerge(base, over){
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') { const out = {...base}; if (over && typeof over === 'object') for (const k of Object.keys(over)) out[k] = k in base ? deepMerge(base[k], over[k]) : over[k]; return out; }
  return over === undefined ? base : over;
}
/** v1 templates had no meal items / optional flags / per-template targets: add them to the stock templates. */
function migrateSettings(s){
  if ((s.schema || 1) >= 2) return migrate3(s);
  s.templates = (s.templates || []).map(tp => {
    const def = DEFAULT_TEMPLATES.find(d => d.id === tp.id);
    tp = { targets:{}, ...tp };
    if (def) {
      if (!tp.items.some(i => i.kind === 'meal')) tp.items = [...tp.items, ...def.items.filter(i => i.kind === 'meal')].sort((a,b) => (parseTime(a.start) ?? 0) - (parseTime(b.start) ?? 0));
      tp.items.forEach(i => { const d = def.items.find(x => x.label === i.label); if (d?.optional) i.optional = true; });
      if (!Object.keys(tp.targets).length) tp.targets = { ...def.targets };
    }
    return tp;
  });
  s.schema = 2; return migrate3(s);
}
/** v1.7: stock templates gain notes, wind-down markers and weekday routines. Added only to stock templates that have no notes yet;
    nothing the family changed is overwritten (items are matched by label, new ones only added when no item has that label). */
function migrate3(s){
  if ((s.schema || 1) >= 3) return s;
  (s.templates || []).forEach(tp => { const def = DEFAULT_TEMPLATES.find(d => d.id === tp.id); if (!def || tp.items.some(i => i.note || i.days)) return;
    tp.items.forEach(i => { const d = def.items.find(x => x.label === i.label && x.kind === i.kind); if (d?.note && d.start === i.start) i.note = d.note; });
    def.items.filter(d => d.kind === 'note' && !tp.items.some(i => i.label === d.label && i.start === d.start)).forEach(d => tp.items.push({ ...d }));
    tp.items.sort((a, b) => (parseTime(a.start) ?? 0) - (parseTime(b.start) ?? 0)); });
  s.schema = 3; return migrate4(s);
}
/** v1.16: the stock bath / non-bath routines become “minutes before bedtime”, so they follow visit-day bedtimes too. */
function migrate4(s){
  if ((s.schema || 1) >= 4) return s;
  (s.templates || []).forEach(tp => tp.items.forEach(i => { if (i.beforeBed) return;
    if (i.label === 'Bath + bedtime routine' && i.start === '19:15') i.beforeBed = 45;
    else if (i.label === 'Bedtime routine' && i.start === '19:30') i.beforeBed = 30; }));
  s.schema = 4; return s;
}
const STORED_SETTINGS = lsGet(LS_SETTINGS, null);
let S = migrateSettings(deepMerge(structuredClone(DEFAULT_SETTINGS), STORED_SETTINGS || {}));
if (!S.lang) S.lang = /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
if (!STORED_SETTINGS) S.seenVersion = APP_VERSION;              // brand-new users don't need a “what's new” note
S.schema = 4;
// v4: people who used v1–v3 keep everything as it was (placement path, all features on) and get a "what's new" note.
if (STORED_SETTINGS && !STORED_SETTINGS.profile) S.profile = { ...S.profile, onboarded:true, path:'placement', modules:{ ...ALL_ON, newborn:false }, whatsNew:'4.0' };
/** Is a feature module switched on? (Everything is on until the setup wizard says otherwise.) */
/** Features added after a family set up the dashboard default to their path (adoption / placement only). */
const PATH_ONLY = { familyContact:['placement'], cocooning:['placement'], checkins:['placement'] };
const mod = k => { if (k === 'quicklog' && viewOnly()) return false; const v = S.profile?.modules?.[k]; if (v === undefined && PATH_ONLY[k]) return PATH_ONLY[k].includes(S.profile?.path || 'placement'); return v !== false; };
/** Connected with a read-only viewer key (the server says so) — no Quick Log, scope shown everywhere. */
const viewOnly = () => !!DATA?.viewer;
/** Who is using this device (first name). Kept per device, never in the exported config, so each caregiver sets their own. */
const LS_ME = 'bld.me.v1';
let ME = lsGet(LS_ME, null) || { name:'' };
const saveMe = () => lsSet(LS_ME, ME);
const saveSettings = () => { lsSet(LS_SETTINGS, S); if (typeof flashSaved === 'function') flashSaved(); if (typeof cfgQueuePush === 'function') cfgQueuePush(); };
/** Apps Script version reported by the last sync ('' = not synced this session; '0' = older script without a version). */
let SCRIPT_SEEN = '';
const scriptOutdated = () => DATA.source === 'live' && SCRIPT_SEEN && !viewOnly() && cmpVer(SCRIPT_SEEN, REQUIRED_SCRIPT) < 0;
const T = () => S.targets;
let UI = Object.assign({ todayCollapsed:false, hlFilter:'all', msTag:'', newOnly:false, foodQ:'' }, lsGet(LS_UI, {}));
const saveUI = () => lsSet(LS_UI, UI);

