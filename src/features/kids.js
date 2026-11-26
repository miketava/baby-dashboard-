/* ════════════════════════════════════════════════════════════════════════════
   MULTIPLE CHILDREN — one Sheet with a “Child” column, one profile per child
   S.kids = [] → single-child mode (no Child column needed). With 2+ children:
   S.kids[i] = { id, aliases:[…], snap:{ profile, targets, templates, score, cocoon, report } }
   The ACTIVE child's settings always live at the top level of S (S.profile, S.targets…);
   its snap is refreshed whenever we switch, save or export.
   Rows with a blank Child cell belong to S.blankKid (default: the first child).
   ════════════════════════════════════════════════════════════════════════════ */
const KID_KEYS = ['profile', 'targets', 'templates', 'score', 'cocoon', 'report', 'meds'];
const KID_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#22c55e', '#ef4444', '#0ea5e9'];
const newKidId = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const multiKid = () => (S.kids?.length || 0) > 1;
const kidIdx = () => Math.min(S.kid || 0, Math.max(0, (S.kids?.length || 1) - 1));
const kidSnap = i => i === kidIdx() ? Object.fromEntries(KID_KEYS.map(k => [k, S[k]])) : S.kids[i].snap;
const kidName = i => (kidSnap(i)?.profile?.name || '').trim() || L(`Child ${i + 1}`, `Enfant ${i + 1}`);
const kidColor = i => KID_COLORS[i % KID_COLORS.length];
/** Lower-case names a row's Child cell may use for child i (name + aliases). */
const kidKeys = i => [kidSnap(i)?.profile?.name, ...(S.kids[i]?.aliases || [])].filter(Boolean).map(x => String(x).trim().toLowerCase());
const ALL_WORDS = ['all', 'both', 'everyone', 'tous', 'toutes', 'les deux', 'kids', 'enfants'];
/** Split a Child cell (“Ava, Leo”, “Ava & Leo”, “both”) into lower-case names. */
const splitKids = s => String(s || '').split(/\s*(?:,|;|&|\+|\/|\band\b|\bet\b)\s*/i).map(x => x.trim().toLowerCase()).filter(Boolean);
/** Does event ev belong to child i? */
function evForKid(ev, i){
  const ns = ev.kidNames || [];
  if (!ns.length) return i === (S.blankKid ?? 0);
  if (ns.some(n => ALL_WORDS.includes(n))) return true;
  const keys = kidKeys(i); return ns.some(n => keys.includes(n));
}
/** Child-cell names that match nobody (typos) → data-health warnings. */
function unknownKidNames(events){
  if (!multiKid()) return [];
  const known = new Set([...S.kids.flatMap((_, i) => kidKeys(i)), ...ALL_WORDS]), bad = new Map();
  events.forEach(e => (e.kidNames || []).forEach(n => { if (!known.has(n)) bad.set(n, (bad.get(n) || 0) + 1); }));
  return [...bad];
}
const cloneKidSnap = () => structuredClone(Object.fromEntries(KID_KEYS.map(k => [k, S[k]])));
function storeActiveKid(){ if (multiKid() || S.kids?.length) S.kids[kidIdx()].snap = cloneKidSnap(); }
/** Make child i the active one (swap its settings to the top level). */
function useKid(i, { render = true } = {}){
  if (!S.kids?.length || i === kidIdx() && S.kids[i].snap) { S.kid = i; }
  else { storeActiveKid(); Object.assign(S, structuredClone(S.kids[i].snap)); S.kid = i; }
  FOOD_DICT = null;
  if (render) { saveSettings(); reingest(); }
}
/** Give every child a unique id (older saves could repeat one). */
function fixKidIds(){ const seen = new Set(); (S.kids || []).forEach(k => { if (!k.id || seen.has(k.id)) k.id = newKidId(); seen.add(k.id); }); }
/** Turn single-child mode into a list (the current child becomes child 1). */
function ensureKidList(){
  if (S.kids?.length) return;
  S.kids = [{ id: newKidId(), aliases: [], snap: cloneKidSnap() }]; S.kid = 0; S.blankKid = 0;
}
/** “＋ Add a child”: start the setup wizard for a new child; the current data is kept. */
function addKid(){
  ensureKidList(); storeActiveKid();
  const prev = kidIdx(), base = structuredClone(DEFAULT_SETTINGS);
  const snap = Object.fromEntries(KID_KEYS.map(k => [k, base[k]]));
  snap.profile = { ...snap.profile, onboarded:false, units: S.profile.units, modules:{ ...ALL_ON } };
  snap.report = { ...snap.report, preparedBy: S.report.preparedBy || '' };
  S.kids.push({ id: newKidId(), aliases: [], snap });
  useKid(S.kids.length - 1, { render:false });
  openWizard({ addKid:true, prevKid: prev });
}
function cancelAddKid(){
  const prev = W.prevKid; S.kids.pop(); S.kid = prev; Object.assign(S, structuredClone(S.kids[prev].snap));
  if (S.kids.length < 2) { S.kids = []; S.kid = 0; }
  W = null; saveSettings(); reingest();
}
function removeKid(i){
  if (!multiKid()) return;
  storeActiveKid(); S.kids.splice(i, 1);
  if ((S.blankKid ?? 0) === i) S.blankKid = 0; else if ((S.blankKid ?? 0) > i) S.blankKid--;
  const next = Math.min(i, S.kids.length - 1); Object.assign(S, structuredClone(S.kids[next].snap)); S.kid = next;
  if (S.kids.length < 2) { S.kids = []; S.kid = 0; S.kidView = 'one'; }
  saveSettings(); reingest();
}
/** Header chips: one per child, plus “All” (timeline side by side). */
function renderKidSeg(){
  const el = $('#kidSeg'); if (!el) return;
  el.classList.toggle('hidden', !multiKid() || viewOnly());
  if (!multiKid()) return;
  const all = S.kidView === 'all';
  el.innerHTML = S.kids.map((_, i) => `<button data-kid="${i}" class="${!all && i === kidIdx() ? 'on' : ''}" style="--kc:${kidColor(i)}"><i></i>${esc(kidName(i))}</button>`).join('')
    + `<button data-kid="all" class="${all ? 'on' : ''}" title="${L('All children on one timeline', 'Tous les enfants sur une même chronologie')}">${L('All', 'Tous')}</button>`;
}
function onKidSeg(e){
  const b = e.target.closest('[data-kid]'); if (!b) return;
  if (b.dataset.kid === 'all') { S.kidView = 'all'; saveSettings(); setView('timeline'); renderAll(); return; }
  S.kidView = 'one'; useKid(+b.dataset.kid);
}
/** “All” timeline: each child's day rows, stacked under each date. */
function renderTimelineAll(){
  const cur = kidIdx(), per = [];
  S.kids.forEach((_, i) => {
    useKid(i, { render:false }); filterKidEvents(); analyze();
    per.push(new Map(visibleDays().map(m => [m.D, dayRowHTML(m)])));
  });
  useKid(cur, { render:false }); filterKidEvents(); analyze();
  const Ds = [...new Set(per.flatMap(m => [...m.keys()]))].sort((a, b) => S.sortDays === 'desc' ? b - a : a - b);
  if (!Ds.length) { $('#timeline').innerHTML = emptyState(); return; }
  $('#timeline').innerHTML = `<div class="tl h">${axisHTML()}${Ds.map(D => per.map((m, i) => m.has(D) ? `<div class="kidrow" data-kidrow="${i}" style="--kc:${kidColor(i)}">${m.get(D).replace('class="tl-lab">', `class="tl-lab"><div class="kidname">${esc(kidName(i))}</div>`)}</div>` : '').join('') + '<div class="kidgap"></div>').join('')}</div>`;
}
/** Keep only the active child's rows (multi-child mode). DATA.allEvents keeps everything. */
function filterKidEvents(){
  if (!DATA.allEvents) DATA.allEvents = DATA.events;
  DATA.events = multiKid() ? DATA.allEvents.filter(e => evForKid(e, kidIdx())) : DATA.allEvents;
}
/** Settings → Child & features: the list of children. */
function kidsPaneHTML(){
  if (viewOnly()) return '';
  if (!multiKid()) return `<h4>${L('Children', 'Enfants')}</h4><p class="hint" style="margin-top:0">${L('Tracking more than one child? Add them here. Each child gets their own profile, targets, schedule and reports, and a “Child” column in your Sheet says whose row it is.', 'Vous suivez plus d’un enfant? Ajoutez-les ici. Chaque enfant a son propre profil, ses cibles, son horaire et ses rapports, et une colonne « Child » dans votre feuille indique à qui appartient chaque ligne.')}</p><div class="row wrap"><button class="btn" data-act="kidAdd">＋ ${L('Add a child', 'Ajouter un enfant')}</button></div>`;
  return `<h4>${L('Children', 'Enfants')}</h4>
    <p class="hint" style="margin-top:0">${L('Rows are matched by the <b>Child</b> column in your Sheet (a name, or several separated by commas; “both” or “all” counts for everyone). Add other spellings you use as aliases.', 'Les lignes sont associées grâce à la colonne <b>Child</b> de votre feuille (un nom, ou plusieurs séparés par des virgules; « both » ou « all » compte pour tous). Ajoutez les autres façons d’écrire le nom comme alias.')}</p>
    <div class="kidlist">${S.kids.map((k, i) => `<div class="kidcard" style="--kc:${kidColor(i)}">
      <div class="row wrap"><b><i class="kdot"></i>${esc(kidName(i))}</b><span class="faint">${esc(PATHS[kidSnap(i).profile.path]?.label || '')}${kidSnap(i).profile.dob ? ' · ' + esc(kidSnap(i).profile.dob) : ''}</span><span class="grow"></span>
        ${i === kidIdx() ? `<span class="pill">${L('showing', 'affiché')}</span>` : `<button class="btn sm" data-act="kidUse" data-i="${i}">${L('Show', 'Afficher')}</button>`}
        <button class="btn sm danger" data-act="kidRemove" data-i="${i}">${L('Remove', 'Retirer')}</button></div>
      <label class="field">${L('Aliases (other spellings in the Sheet, comma-separated)', 'Alias (autres façons de l’écrire dans la feuille, séparés par des virgules)')}<input type="text" data-kidalias="${i}" value="${esc((k.aliases || []).join(', '))}" placeholder="${L('e.g. A, Ava M.', 'p. ex. A, Ava M.')}"></label>
    </div>`).join('')}</div>
    <div class="fgrid" style="margin-top:8px"><label class="field">${L('Rows with an empty Child cell belong to', 'Les lignes sans enfant indiqué appartiennent à')}<select id="blankKid">${S.kids.map((_, i) => `<option value="${i}" ${(S.blankKid ?? 0) === i ? 'selected' : ''}>${esc(kidName(i))}</option>`).join('')}</select></label></div>
    <div class="row wrap" style="margin-top:8px"><button class="btn" data-act="kidAdd">＋ ${L('Add a child', 'Ajouter un enfant')}</button></div>
    <p class="hint">${L('The settings below (profile, features, targets, schedule, routine score, reports, cocooning) are for the child shown. Theme, language, data source and reminders are shared.', 'Les paramètres ci-dessous (profil, fonctions, cibles, horaire, score de routine, rapports, cocooning) concernent l’enfant affiché. Le thème, la langue, la source de données et les rappels sont communs.')}</p>`;
}

/** For “end” ops: does a Sheet row's Child cell match this child? (blank cell matches when blankOk) */
function kidRowMatch(cell, child, blankOk){
  const ns = splitKids(cell); if (!ns.length) return !!blankOk;
  if (ns.some(n => ALL_WORDS.includes(n))) return true;
  const i = S.kids.findIndex((_, k) => kidName(k) === child), keys = i >= 0 ? kidKeys(i) : [String(child).toLowerCase()];
  return ns.some(n => keys.includes(n));
}
/* Quick Log child picker: which child(ren) a new entry is for. */
let QLKIDS = null;
const qlKidSet = () => { if (!QLKIDS || !QLKIDS.size) QLKIDS = new Set([kidIdx()]); return QLKIDS; };
const qlKidCell = () => [...qlKidSet()].sort((a, b) => a - b).map(kidName).join(', ');
function qlKidPickerHTML(){
  if (!multiKid()) return '';
  const set = qlKidSet();
  return `<div class="qlkids" role="group" aria-label="${L('Which child', 'Quel enfant')}">${S.kids.map((_, i) => `<button type="button" data-qlkid="${i}" class="${set.has(i) ? 'on' : ''}" style="--kc:${kidColor(i)}"><i></i>${esc(kidName(i))}</button>`).join('')}<span class="faint">${set.size > 1 ? L('one row for all ticked children', 'une ligne pour tous les enfants cochés') : L('tap more than one for a shared moment', 'touchez-en plusieurs pour un moment partagé')}</span></div>`;
}
function onQlKid(i){
  const set = qlKidSet();
  if (set.has(i) && set.size > 1) set.delete(i); else set.add(i);
  if (set.size === 1 && [...set][0] !== kidIdx()) { S.kidView = 'one'; useKid([...set][0]); }   // presets (open nap…) follow the child
  renderQuickLog();
}
