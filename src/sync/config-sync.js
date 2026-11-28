/* ════════════════════════════════════════════════════════════════════════════
   v1.23 — Shared settings in the Sheet (Apps Script v1.3+).
   • Config tab: one row per setting (Key | Value JSON | Updated At | Updated By).
     Per child: child:<id>:<key> for profile, targets, templates, score, cocoon, report.
     Family-wide: kids, blankKid, title, dayBoundary, foodWords, presets, catColors,
     checkinAt, contactRules, vaxSchedule, todayTpl.
   • Medications tab: one readable row per medication (Child | Name | Dose | Times | From | Until | Note).
   On each sync: an empty Sheet is seeded from this device; a value that changed in the
   Sheet (another device, or edited by hand) is applied here; a value changed on this
   device is pushed. Device-only: language, theme, filters, reminders, connection, Who am I.
   ════════════════════════════════════════════════════════════════════════════ */
const LS_CFGSYNC = 'bld.cfgsync.v1';
const CFG_CHILD_KEYS = KID_KEYS.filter(k => k !== 'meds');
const CFG_GLOBAL_KEYS = ['kids', 'blankKid', 'title', 'dayBoundary', 'foodWords', 'presets', 'catColors', 'checkinAt', 'contactRules', 'vaxSchedule', 'todayTpl', 'apptFor', 'apptIgnoreCals', 'libSeen', 'share', 'trendAck', 'dupKeep', 'badges', 'privateNotes', 'music', 'musicTipOff'];   // share: viewer keys, so “Copy script” has them on every device
const MED_SHEET_COLS = ['Child', 'Name', 'Dose', 'Times', 'From', 'Until', 'Note'];
let CFGS = lsGet(LS_CFGSYNC, null) || { hash: {}, at: null };
let cfgApplying = false, cfgPushTimer = null, cfgReady = false;
const cfgSave = () => lsSet(LS_CFGSYNC, CFGS);
const cfgJSON = v => JSON.stringify(v === undefined ? null : v);
const cfgCan = () => DATA.source === 'live' && !!S.endpoint && !viewOnly() && !!SCRIPT_SEEN && cmpVer(SCRIPT_SEEN, '1.3') >= 0;
const kidCfgId = i => S.kids?.length ? S.kids[i].id : 'main';

/** What this device would write to the Config tab, as { key: value }. */
function cfgLocal(){
  const out = {};
  CFG_GLOBAL_KEYS.forEach(k => {
    if (k === 'kids') out.kids = (S.kids || []).map(x => ({ id: x.id, aliases: x.aliases || [] }));
    else if (S[k] !== undefined) out[k] = S[k];
  });
  const n = S.kids?.length || 1;
  for (let i = 0; i < n; i++) { const sn = kidSnap(i) || {}; CFG_CHILD_KEYS.forEach(k => { if (sn[k] !== undefined) out[`child:${kidCfgId(i)}:${k}`] = sn[k]; }); }
  return out;
}
/** This device's medications as Medications-tab rows. */
function medsLocalRows(){
  const n = S.kids?.length || 1, rows = [];
  for (let i = 0; i < n; i++) (kidSnap(i)?.meds || []).filter(m => m.name).forEach(m =>
    rows.push({ Child: S.kids?.length > 1 ? kidName(i) : '', Name: m.name || '', Dose: m.dose || '', Times: m.times || '', From: m.from || '', Until: m.until || '', Note: m.note || '' }));
  return rows;
}
const medsNorm = rows => cfgJSON((rows || []).map(r => MED_SHEET_COLS.map(c => String(r[c] ?? '').trim())).filter(r => r[1]));

/** Find (or create) the child a Config key / Medications row belongs to. */
function cfgKidIdx(id){
  if (!S.kids?.length) return id === 'main' ? 0 : -1;
  return S.kids.findIndex(k => k.id === id);
}
function cfgSetKid(i, key, val){
  if (i === kidIdx()) S[key] = val;
  else { S.kids[i].snap = S.kids[i].snap || {}; S.kids[i].snap[key] = val; }
}
/** Apply a remote value here (no push back). */
function cfgApply(key, val){
  if (key === 'kids') {
    const remote = Array.isArray(val) ? val : [];
    if (remote.length > 1 && !(S.kids?.length)) { ensureKidList(); S.kids[0].id = remote[0].id; }
    remote.forEach(r => {
      const k = (S.kids || []).find(x => x.id === r.id);
      if (k) { k.aliases = r.aliases || []; return; }
      if (!(S.kids?.length)) return;
      const base = structuredClone(DEFAULT_SETTINGS);
      S.kids.push({ id: r.id, aliases: r.aliases || [], snap: Object.fromEntries(KID_KEYS.map(x => [x, base[x]])) });
    });
    return;
  }
  const m = /^child:([^:]+):(\w+)$/.exec(key);
  if (m) { const i = cfgKidIdx(m[1]); if (i >= 0 && CFG_CHILD_KEYS.includes(m[2])) cfgSetKid(i, m[2], val); return; }
  if (CFG_GLOBAL_KEYS.includes(key)) S[key] = val;
}
function medsApply(rows){
  const n = S.kids?.length || 1, per = Array.from({ length: n }, () => []);
  rows.forEach(r => {
    if (!String(r.Name || '').trim()) return;
    let i = 0;
    if (n > 1) { const c = String(r.Child || '').trim().toLowerCase(); i = c ? S.kids.findIndex((_, j) => kidKeys(j).includes(c)) : (S.blankKid ?? 0); if (i < 0) return; }
    const md = { name: String(r.Name).trim(), dose: String(r.Dose || '').trim(), times: String(r.Times || '').trim() };
    ['From', 'Until', 'Note'].forEach(c => { const v = String(r[c] || '').trim(); if (v) md[c.toLowerCase()] = v; });
    per[i].push(md);
  });
  // keep half-filled rows still being typed on this device (no name yet)
  per.forEach((list, i) => cfgSetKid(i, 'meds', [...list, ...((kidSnap(i)?.meds || []).filter(m => !m.name))]));
}

async function cfgPost(body){
  const r = await fetch(S.endpoint.trim(), { method: 'POST', body: JSON.stringify({ token: S.token, by: ME.name || '', ...body }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
  const j = JSON.parse(await r.text()); if (!j.ok) throw new Error(j.error || 'Endpoint error'); return j;
}
/** Push what changed on this device since the last sync (or everything with all=true). */
async function cfgPush({ all = false, quiet = true } = {}){
  if (!cfgCan()) return false;
  const loc = cfgLocal(), items = Object.entries(loc).filter(([k, v]) => all || CFGS.hash[k] !== cfgJSON(v)).map(([key, value]) => ({ key, value }));
  const mr = medsLocalRows(), medsChanged = all || CFGS.hash.__meds !== medsNorm(mr);
  if (!items.length && !medsChanged) { if (!quiet) toast(L('The Sheet already has these settings', 'La feuille a déjà ces réglages')); return true; }
  try {
    if (items.length) await cfgPost({ action: 'config', items });
    if (medsChanged) await cfgPost({ action: 'meds', rows: mr });
    items.forEach(it => CFGS.hash[it.key] = cfgJSON(it.value));
    if (medsChanged) CFGS.hash.__meds = medsNorm(mr);
    CFGS.at = new Date().toISOString(); cfgSave();
    if (!quiet) toast(L('Settings saved to the Sheet', 'Réglages enregistrés dans la feuille'));
    return true;
  } catch (err) { if (!quiet) toast(L('Could not save settings to the Sheet: ', 'Impossible d’enregistrer les réglages dans la feuille : ') + err.message, true); return false; }
}
/** Called after every sync with the doGet payload. */
async function cfgOnSync(data){
  if (!cfgCan() || !data || data.config === undefined) return;
  const remote = data.config || {}, rMeds = data.meds;
  const empty = !Object.keys(remote).length && !(Array.isArray(rMeds) && rMeds.length);
  if (empty) { cfgReady = true; const ok = await cfgPush({ all: true }); if (ok) toast(L('This device’s settings were copied to the Sheet (Config and Medications tabs)', 'Les réglages de cet appareil ont été copiés dans la feuille (onglets Config et Medications)')); return; }
  const changed = [];
  cfgApplying = true;
  try {
    const keys = Object.keys(remote).sort((a, b) => (a === 'kids' ? -1 : b === 'kids' ? 1 : 0));
    keys.forEach(k => { const h = cfgJSON(remote[k].value); if (CFGS.hash[k] !== h) { cfgApply(k, remote[k].value); CFGS.hash[k] = h; changed.push(k); } });
    if (Array.isArray(rMeds)) { const h = medsNorm(rMeds); if (CFGS.hash.__meds !== h) { medsApply(rMeds); CFGS.hash.__meds = h; changed.push('meds'); } }
    if (changed.length) { ensureLibTemplates(); lsSet(LS_SETTINGS, S); FOOD_DICT = null; }
  } finally { cfgApplying = false; }
  cfgReady = true; CFGS.at = new Date().toISOString(); cfgSave();
  if (changed.length && S.profile?.onboarded && $('#mWizard')?.classList.contains('on') && !W?.addKid) closeModals();   // a new device that joins a set-up family skips the setup wizard
  if (changed.length) { reingest(); if (typeof renderSettings === 'function' && $('#mSettings')?.classList.contains('on')) renderSettings(); toast(L('Settings updated from the Sheet', 'Réglages mis à jour depuis la feuille')); }
  cfgPush();   // anything changed here while offline or before this version
}
/** saveSettings hook: push shared changes a moment later (typing in a field saves often). */
function cfgQueuePush(){
  if (cfgApplying || !cfgReady || !cfgCan()) return;
  clearTimeout(cfgPushTimer); cfgPushTimer = setTimeout(() => cfgPush(), 1500);
}
function cfgStatusHTML(){
  if (DATA.source !== 'live') return '';
  const head = `<h4>${L('Shared settings', 'Réglages partagés')}</h4>`;
  if (viewOnly()) return head + `<p class="hint">${L('View-only connections don’t receive the family’s settings.', 'Les accès en lecture seule ne reçoivent pas les réglages de la famille.')}</p>`;
  if (!cfgCan()) return head + `<p class="hint">${L(`Update the Apps Script to v${REQUIRED_SCRIPT} to keep child profiles, templates and medications in the Sheet (Config and Medications tabs), shared by every device.`, `Mettez l’Apps Script à jour (v${REQUIRED_SCRIPT}) pour garder profils, modèles et médicaments dans la feuille (onglets Config et Medications), partagés entre les appareils.`)}</p>`;
  return head + `<p class="hint">${L('Child profiles, targets, templates, scoring, medications and family rules live in the Sheet’s Config and Medications tabs, so every caregiver’s device stays in step. Language, theme, filters and reminders stay on each device.', 'Profils, cibles, modèles, pointage, médicaments et règles familiales vivent dans les onglets Config et Medications de la feuille : tous les appareils restent synchronisés. Langue, thème, filtres et rappels restent propres à chaque appareil.')}${CFGS.at ? ' ' + L('Last synced ', 'Dernière synchro ') + esc(new Date(CFGS.at).toLocaleString(S.lang === 'fr' ? 'fr-CA' : 'en-CA', { dateStyle: 'medium', timeStyle: 'short' })).replace(/\.?$/, '.') : ''}</p>
    <button class="btn sm" data-act="cfgPushAll">⬆ ${L('Push this device’s settings to the Sheet', 'Envoyer les réglages de cet appareil à la feuille')}</button>`;
}
