/* ════════════════════════════════════════════════════════════════════════════
   V7 phase 1 — one-tap logging, Undo / Edit snackbar, haptics, mini sheets.
   Appends (diaper, milk, start a nap…) are saved at once, so they show everywhere straight away; Undo deletes the
   row again. Ending something (Woke up, End outing) waits 5 seconds before it is saved, so Undo costs nothing; it
   is saved at once if the app goes to the background.
   ════════════════════════════════════════════════════════════════════════════ */
const UNDO_MS = 5000;
let SNACK = null;           // { timer, commit?, undo, edit }
let HERO_HOLD = null;       // optimistic hero state while an “end” waits for its undo window

const haptic = ms => { try { if (S.haptics !== false && navigator.vibrate) navigator.vibrate(ms); } catch {} };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const blankRow = () => ({ 'Date': isoOf(todayIdx()), 'Start Time': fmtTime(nowMin()), 'End Time': '', 'Duration (min)': '', 'Category': '', 'Milk (oz)': '', 'Notes': '', 'Water (ml)': '', 'Tags': '', 'Outcome / Rating': '', 'Value': '' });
const canLog = () => { if (viewOnly()) { toast(L('This is a view-only connection — logging is done by the family', 'Accès en lecture seulement — la famille fait les entrées')); return false; } return true; };

/* ── Snackbar ── */
function snack(text, { undo, edit, commit } = {}){
  snackFlush();   // a new action settles the previous one
  const el = $('#snack'); if (!el) return;
  el.innerHTML = `<span class="sn-t">${text}</span>${undo ? `<button type="button" class="sn-b" data-sn="undo">${L('Undo', 'Annuler')}</button>` : ''}${edit ? `<button type="button" class="sn-b" data-sn="edit">${L('Edit', 'Modifier')}</button>` : ''}<i class="sn-bar"></i>`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  SNACK = { undo, edit, commit, timer: setTimeout(() => snackFlush(), UNDO_MS) };
}
/** Close the snackbar; a waiting “end” is saved now. */
function snackFlush(){
  const s = SNACK; if (!s) return; SNACK = null; clearTimeout(s.timer);
  $('#snack')?.classList.remove('on');
  if (s.commit) s.commit();
}
function onSnack(e){
  const b = e.target.closest('[data-sn]'); if (!b || !SNACK) return;
  const s = SNACK; SNACK = null; clearTimeout(s.timer); $('#snack').classList.remove('on');
  if (b.dataset.sn === 'undo') { haptic(20); s.undo?.(); } else s.edit?.();
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') snackFlush(); });
addEventListener('pagehide', snackFlush);

/* ── Saving ── */
const evOfRow = (row, q) => DATA.events.find(e => q && e.local && e.localId === q.id)
  || DATA.events.filter(e => !e.local && e.cat === canonCat(row['Category']) && e.d === parseDate(row['Date']) && (row['Start Time'] ? e.st === parseTime(row['Start Time']) : e.allDay)).sort((a, b) => (b.sheetRow ?? 0) - (a.sheetRow ?? 0))[0];
/** Save a new row now; the snackbar offers Undo (deletes it) and Edit (opens it in Quick Log). */
async function quickAppend(row, what, { tile } = {}){
  if (!canLog()) return;
  const before = new Set(QUEUE.map(q => q.id)), pr = saveQuickOp('append', row, { batch: true }), q = QUEUE.find(x => !before.has(x.id));
  haptic(10); if (tile) tileDone(tile);
  snack(`✓ ${what}${row['Start Time'] ? ` · ${row['Start Time']}` : ''}`, {
    undo: async () => { await pr; const still = q && QUEUE.find(x => x.id === q.id && x.op === 'append');
      if (still) return saveQuickOp('delete', {}, { localId: q.id });
      const ev = evOfRow(row, null); if (ev?.sheetRow != null) saveQuickOp('delete', {}, { rowNum: ev.sheetRow, match: ev.match }); else toast(L('Couldn’t find it to undo: fix it from Today’s entries', 'Introuvable pour annuler : corrigez-la dans les entrées du jour'), true); },
    edit: async () => { await pr; const ev = evOfRow(row, q && QUEUE.some(x => x.id === q.id) ? q : null); if (ev) openEdit(ev); },
  });
  await pr;
  if (S.endpoint && q && !QUEUE.some(x => x.id === q.id)) await syncLive({ quiet: true, skipFlush: true });
}
/** End something in progress now, after the undo window. */
function quickEnd(tgt){
  if (!canLog()) return;
  const endAbs = nowAbs(), row = { 'Category': tgt.cat, 'End Time': fmtTime(endAbs % DAY), 'Duration (min)': Math.max(1, endAbs - tgt.s), 'Notes': '', 'Outcome / Rating': '' };
  const sleep = isSleep(tgt);
  const waking = isAwake(tgt);
  HERO_HOLD = waking ? null : { kind: 'awake', since: endAbs, label: sleep ? L('Awake', 'Éveillé') : L('Back home', 'De retour'), icon: '☀️' };
  haptic(10); renderToday();
  const what = waking ? L(`Back asleep · awake ${fmtDur(endAbs - tgt.s)}`, `Rendormi · éveillé ${fmtDur(endAbs - tgt.s)}`) : sleep ? L(`Woke up · ${isNight(tgt) ? 'night' : 'nap'} ${fmtDur(endAbs - tgt.s)}`, `Réveil · ${isNight(tgt) ? 'nuit' : 'sieste'} ${fmtDur(endAbs - tgt.s)}`) : L(`${catL(tgt.cat)} ended · ${fmtDur(endAbs - tgt.s)}`, `${catL(tgt.cat)} terminé · ${fmtDur(endAbs - tgt.s)}`);
  snack(`✓ ${esc(what)}`, {
    commit: () => { HERO_HOLD = null; saveQuickOp('end', row, { batch: true }).then(() => S.endpoint && syncLive({ quiet: true, skipFlush: true })); },
    undo: () => { HERO_HOLD = null; renderToday(); },
    edit: () => { HERO_HOLD = null; QL = { op: 'end', row: { ...row, 'Duration (min)': undefined }, target: tgt }; renderQuickLog(); $('#qlog').classList.add('on'); $('#scrim').classList.add('on'); renderToday(); },
  });
}
/** A tile shows a ✓ for a moment. */
function tileDone(el){ if (!el || reduceMotion()) return; el.classList.remove('done'); void el.offsetWidth; el.classList.add('done'); setTimeout(() => el.classList.remove('done'), 900); }

/* ── Mini sheets (diaper, milk, meal, water, meds, feed) ── */
let M2S = null;   // { kind, sel:{} }
function openMini(kind){
  if (!canLog()) return;
  M2S = { kind, sel: { meal: mealByTime(nowMin()) } }; renderMini();
  $('#m2sheet').classList.add('on'); haptic(5);
}
function closeMini(){ $('#m2sheet')?.classList.remove('on'); M2S = null; }
const bigBtn = (act, icon, label, sub = '') => `<button type="button" class="m2big" data-mact="${act}"><span class="e">${icon}</span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
const pillRow = (key, opts, sel) => `<div class="m2pills">${opts.map(([v, l, ic = '']) => `<button type="button" class="m2pill${sel === v ? ' on' : ''}" data-mpick="${key}" data-v="${esc(v)}">${ic}${esc(l)}</button>`).join('')}</div>`;
function renderMini(){
  const box = $('#m2sheetBody'); if (!box || !M2S) return;
  const k = M2S.kind, s = M2S.sel, unit = metric() ? 'ml' : 'oz';
  let title = '', body = '';
  if (k === 'diaper') {
    title = L('Diaper', 'Couche');
    body = `<div class="m2lbl">${L('How wet (optional)', 'Quantité de pipi (facultatif)')}</div>${pillRow('pee', PEE().map(([v, n], i) => [v, n, '💧'.repeat(i + 1) + ' ']), s.pee)}
      <div class="m2lbl">${L('Poop (optional)', 'Caca (facultatif)')}</div>${pillRow('stool', STOOL().map(([v, n]) => [v, n]), s.stool)}
      <div class="m2grid3">${bigBtn('wet', '💧', L('Wet', 'Pipi'))}${bigBtn('poop', '💩', L('Poop', 'Caca'))}${bigBtn('both', '💧💩', L('Both', 'Les deux'))}</div>`;
  } else if (k === 'milk' || k === 'water') {
    const water = k === 'water', chips = water ? waterChips() : milkChips();
    title = water ? L('Water', 'Eau') : L('Milk', 'Lait');
    body = `<div class="m2grid${chips.length > 4 ? '3' : '2'}">${chips.map(v => bigBtn(`${k}:${v}`, water ? '💧' : '🍼', `${v} ${water ? 'ml' : unit}`)).join('')}</div>
      <button type="button" class="m2link" data-mact="${k}:other">${L('Other amount, time or notes…', 'Autre quantité, heure ou notes…')}</button>`;
  } else if (k === 'meal') {
    title = L('Meal', 'Repas');
    body = `${pillRow('meal', ['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(c => [c, catL(c)]), s.meal)}
      <div class="m2grid3">${bigBtn('meal:Ate Well', '😋', L('Ate well', 'Bien mangé'))}${bigBtn('meal:Partial', '😐', L('Partly', 'En partie'))}${bigBtn('meal:Refused', '🙅', L('Refused', 'Refusé'))}</div>
      <button type="button" class="m2link" data-mact="meal:other">${L('Add foods, time or notes…', 'Ajouter aliments, heure ou notes…')}</button>`;
  } else if (k === 'meds') {
    title = L('Medication', 'Médicament');
    const ds = medDoses(todayIdx());
    body = `${ds.length ? `<div class="m2list">${ds.map(d => `<div class="m2row"><div><b>${esc(d.md.name)}</b>${d.md.dose ? ' ' + esc(d.md.dose) : ''}<small>${d.t != null ? fmtTime(d.t) : L('today', 'aujourd’hui')}</small></div>${d.given ? `<span class="pl-did">✓ ${fmtTime(d.given.st ?? 0)}</span>` : `<button type="button" class="btn primary" data-medgive="${d.i}" data-mclose>✓ ${L('Given', 'Donné')}</button>`}</div>`).join('')}</div>` : `<p class="muted">${L('No medication scheduled today (Settings → Reminders → Medications).', 'Aucun médicament prévu aujourd’hui (Réglages → Rappels → Médicaments).')}</p>`}
      <button type="button" class="m2link" data-mact="meds:other">${L('Log another medication…', 'Noter un autre médicament…')}</button>`;
  } else if (k === 'feed') {
    title = L('Feed', 'Boire');
    const last = FEEDS.filter(f => f.s <= nowAbs() && f.breastMin).pop();
    const hint = sd => last ? (last.lastSide === sd ? L('ended last feed', 'a fini le dernier') : last.firstSide === sd ? L('started last feed', 'a commencé le dernier') : '') : '';
    body = `<div class="m2grid2">${bigBtn('feed:left', '🤱', L('Start left', 'Commencer à gauche'), hint('left'))}${bigBtn('feed:right', '🤱', L('Start right', 'Commencer à droite'), hint('right'))}</div>
      <div class="m2lbl">${L('Bottle', 'Biberon')}</div><div class="m2grid${milkChips().length > 4 ? '3' : '2'}">${milkChips().map(v => bigBtn(`bottle:${v}`, '🍼', `${v} ${unit}`)).join('')}</div>`;
  }
  $('#m2sheetTitle').textContent = title; box.innerHTML = body;
}
function onMini(e){
  if (e.target.closest('[data-mclose]')) { setTimeout(closeMini, 0); return; }
  const p = e.target.closest('[data-mpick]');
  if (p) { const k = p.dataset.mpick; M2S.sel[k] = M2S.sel[k] === p.dataset.v && k !== 'meal' ? null : p.dataset.v; haptic(5); renderMini(); return; }
  const b = e.target.closest('[data-mact]'); if (!b || !M2S) return;
  const [act, arg] = b.dataset.mact.split(':'), s = M2S.sel, r = blankRow(), tile = $(`.m2tile[data-tile="${M2S.kind === 'feed' ? 'feed' : M2S.kind}"]`);
  if (arg === 'other') { closeMini(); return openQuickLogWith({ 'Category': act === 'meal' ? s.meal : act === 'water' ? 'Water' : act === 'meds' ? 'Meds' : 'Milk' }); }
  closeMini();
  if (act === 'wet' || act === 'poop' || act === 'both') {
    r['Category'] = act === 'wet' ? 'Diaper - Wet' : act === 'poop' ? 'Diaper - Poop' : 'Diaper - Wet + Poop';
    r['Tags'] = [act !== 'poop' && s.pee, act !== 'wet' && s.stool].filter(Boolean).join(', ');
    return quickAppend(r, { wet: L('Wet diaper', 'Couche pipi'), poop: L('Poop diaper', 'Couche caca'), both: L('Wet + poop', 'Pipi + caca') }[act], { tile });
  }
  if (act === 'milk' || act === 'bottle') { r['Category'] = act === 'bottle' ? 'Bottle' : 'Milk'; r['Milk (oz)'] = +fromDisp(+arg).toFixed(2); return quickAppend(r, `${act === 'bottle' ? L('Bottle', 'Biberon') : L('Milk', 'Lait')} ${arg} ${metric() ? 'ml' : 'oz'}`, { tile }); }
  if (act === 'water') { r['Category'] = 'Water'; r['Water (ml)'] = +arg; return quickAppend(r, `${L('Water', 'Eau')} ${arg} ml`, { tile }); }
  if (act === 'meal') { r['Category'] = s.meal; r['Outcome / Rating'] = arg; return quickAppend(r, `${catL(s.meal)} · ${ocL(arg)}`, { tile }); }
  if (act === 'feed') { r['Category'] = 'Breastfeed'; r['Tags'] = arg; return quickAppend(r, arg === 'left' ? L('Feeding, left side', 'Boire, côté gauche') : L('Feeding, right side', 'Boire, côté droit'), { tile }); }
}
