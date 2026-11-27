/* ════════════════════════════════════════════════════════════════════════════
   20. QUICK LOG (two-way: doPost to the Sheet, or device-only when not connected)
   ════════════════════════════════════════════════════════════════════════════ */
let QL = null;   // current form state {op, row, target?}
/** Planned start of a meal today (template), used when back-logging an earlier meal from the Meal form. */
function plannedMealStart(cat){
  const tp = typeof todayMetrics === 'function' ? todayMetrics()?.tpl : null;
  const it = (tp?.items || []).find(x => x.kind === 'meal' && String(x.label).toLowerCase().startsWith(cat.toLowerCase()));
  return it?.start || { Breakfast:'07:45', Lunch:'12:00', Snack:'15:30', Dinner:'17:45' }[cat] || null;
}
const mealByTime = m => m < 630 ? 'Breakfast' : m < 870 ? 'Lunch' : m < 1020 ? 'Snack' : 'Dinner';
/** Visible statement of anything left out of this view, so a report never silently omits categories. */
function scopeNoteHTML(){
  const ex = DATA.excluded || [], v = DATA.viewer;
  if (!ex.length && !v?.from) return '';
  const fd = v?.from ? esc(fmtDay(parseDate(v.from), { month:'long', day:'numeric', year:'numeric' })) : '';
  return FRL()
    ? `<p class="scopenote"><b>Non inclus :</b> ${ex.length ? 'les entrées des catégories ' + ex.map(c => '« ' + esc(catL(c)) + ' »').join(', ') : ''}${v?.from ? `${ex.length ? '; ' : ''}les entrées avant le ${fd}` : ''}. Toutes les autres entrées sont incluses telles que consignées.</p>`
    : `<p class="scopenote"><b>Not included:</b> ${ex.length ? 'entries in the categories ' + ex.map(c => '“' + esc(c) + '”').join(', ') : ''}${v?.from ? `${ex.length ? '; ' : ''}entries before ${fd}` : ''}. All other entries are included as logged.</p>`;
}
function openQuickLog(){ if (viewOnly()) return toast(L('This is a view-only connection — logging is done by the family', 'Accès en lecture seulement — la famille fait les entrées')); QL = null; renderQuickLog(); $('#qlog').classList.add('on'); $('#scrim').classList.add('on'); }
/* ── Unsaved drafts (v1.37.2): closing Quick Log (✕, Back, swipe down, ← Back to the list) with something typed and not
   saved keeps it as a draft, on this device for 6 hours. Reopening Quick Log offers Restore / Discard at the top. */
let QL_DRAFT = lsGet('bld.qlDraft', null);
const QL_DRAFT_MS = 6 * 3600e3;
function qlStash(){
  const form = $('#qlForm'); if (!QL || !QL.dirty || QL.submitting || !form) return false;
  const row = { ...QL.row, ...Object.fromEntries(new FormData(form).entries()) };
  const ev = QL.ev && { sheetRow: QL.ev.sheetRow, match: QL.ev.match, local: QL.ev.local, localId: QL.ev.localId, loggedAt: QL.ev.loggedAt };
  QL_DRAFT = { ...QL, row, ev, target: QL.op === 'end' ? QL.target : undefined, dirty: true, at: Date.now() };
  lsSet('bld.qlDraft', { ...QL_DRAFT, target: undefined });   // an “end” draft (needs the open entry) only survives in memory
  return true;
}
function qlDropDraft(){ QL_DRAFT = null; try { localStorage.removeItem('bld.qlDraft'); } catch {} }
function qlDraftHTML(){
  const d = QL_DRAFT; if (!d || Date.now() - d.at > QL_DRAFT_MS || (d.op === 'end' && !d.target)) return '';
  const r = d.row || {}, what = r['Category'] || L('entry', 'entrée'), t = r['Start Time'] || r['End Time'] || '', n = String(r['Notes'] || '').trim();
  return `<div class="callout warn qldraft" style="margin:0 0 10px">✏️ ${L(`Not saved: <b>${esc(d.op === 'update' ? 'edit of ' + catL(what) : catL(what))}</b>`, `Non enregistré : <b>${esc(d.op === 'update' ? 'modification ' + catL(what) : catL(what))}</b>`)}${t ? ' ' + esc(t) : ''}${n ? ` · “${esc(n.length > 60 ? n.slice(0, 60) + '…' : n)}”` : ''}
    <div class="row wrap" style="margin-top:6px"><button type="button" class="btn sm primary" data-qldraft="restore">↩ ${L('Restore', 'Reprendre')}</button><button type="button" class="btn sm ghost" data-qldraft="discard">${L('Discard', 'Jeter')}</button></div></div>`;
}
function qlDraftAct(act){
  if (act === 'restore' && QL_DRAFT) { QL = { ...QL_DRAFT, dirty: true }; if (QL.ev && !QL.ev.cat) QL.ev = DATA.events.find(e => e.sheetRow === QL.ev.sheetRow && (!e.local || e.localId === QL.ev.localId)) || QL.ev; qlDropDraft(); renderQuickLog(); return; }
  qlDropDraft(); renderQuickLog();
}
function closeQuickLog(){
  if (qlStash()) toast(L('Not saved: reopen Quick Log to restore it', 'Non enregistré : rouvrez l’Entrée rapide pour le reprendre'));
  $('#qlog').classList.remove('on'); if (!$('.modal.on') && drawerDay == null) $('#scrim').classList.remove('on'); }
function qlPresets(){
  const now = nowMin(), open = DATA.events.filter(e => e.ongoing);
  const P = [];
  // v4b newborn: one-tap breastfeeding (start a side, switch, end) — saved immediately, no form
  if (mod('newborn')) {
    const nurse = open.find(e => e.k === 'nurse');
    if (nurse) { const side = sideOf(nurse), other = side === 'left' ? 'right' : 'left';
      P.push({ e:'🔁', label:`Switch to ${other}`, sub:`${side || 'feeding'} · ${fmtDur(nowAbs() - nurse.s)}`, live:true, instant:'switch', target:nurse, side:other }, { e:'⏹', label:'End feed', sub: fmtDur(nowAbs() - nurse.s), live:true, instant:'end', target:nurse }); }
    else { const last = FEEDS.filter(f => f.s <= nowAbs() && f.breastMin).pop();
      ['left','right'].forEach(sd => P.push({ e:'🤱', label:`Start ${sd[0].toUpperCase() + sd.slice(1)}`, sub: last ? (last.firstSide === sd ? 'started last feed' : last.lastSide === sd ? 'ended last feed' : '') : '', instant:'start', side:sd })); }
    P.push({ e:'🍼', label:'Bottle', cat:'Bottle' }, { e:'🧴', label:'Pump', cat:'Pump', start:true, value:true });
  }
  open.filter(e => !(mod('newborn') && e.k === 'nurse')).forEach(e => P.push({ e: '⏹', label: `End ${e.cat.replace(/^Sleep - /,'')}`, sub: fmtDur(nowAbs() - e.s), live:true, op:'end', cat:e.cat, target:e }));
  const sleepOpen = open.some(isSleep);
  if (!sleepOpen) P.push({ e:'💤', label:L('Start Nap', 'Début de sieste'), cat:'Sleep - Nap', start:true }, { e:'🌙', label:'Bedtime', cat:'Sleep - Night', start:true });
  P.push({ e:'⚡', label:'Awake / Restless', cat:'Awake / Restless', start:true });
  P.push({ e:'🍼', label:L('Milk', 'Lait'), cat:'Milk' });   // v1.23.6: one button; the amounts are chips in the form
  if (mod('hydration')) P.push({ e:'💧', label:'Water', cat:'Milk', water:true });
  if (mod('food')) P.push({ e:'🍽', label:L('Meal', 'Repas'), cat: mealByTime(now), meal:true });   // v1.24.2: one button; breakfast / lunch / snack / dinner are picked in the form
  if (mod('visits')) P.push({ e:'👋', label:'Drop-off', cat:'Handover', tags:'drop-off', notes:'Drop-off' }, { e:'🤗', label:'Pick-up', cat:'Handover', tags:'pick-up', notes:'Pick-up' },);
  P.push({ e:'🙂', label:'Reaction / mood', cat:'Behaviour' });
  if (mod('diapers')) P.push({ e:'💧', label:'Diaper - Wet', cat:'Diaper - Wet' }, { e:'💩', label:'Diaper - Poop', cat:'Diaper - Poop' }, { e:'💧💩', label:L('Wet + poop', 'Pipi + caca'), cat:'Diaper - Poop', both:true, sub:L('two rows, same time', 'deux lignes, même heure') }, { e:'💊', label:'Meds', cat:'Meds' });
  if (mod('milestones')) P.push({ e:'⭐', label:'Add Milestone', cat:'Milestone', allDay:true });
  if (mod('growth')) P.push({ e:'⚖️', label:'Weight', cat:'Weight', allDay:true, value:true }, { e:'📏', label:'Length', cat:'Height', allDay:true, value:true });
  if (mod('health')) P.push({ e:'🌡️', label:'Temperature', cat:'Temperature', value:true });
  if (mod('health')) P.push({ e:'✚', label:'Log Incident', cat:'Health / Incident' }, { e:'🩺', label:'Appointment', cat:'Medical / Appointment', start:true });
  P.push({ e:'🛁', label:'Bath', cat:'Bath', start:true }, { e:'🚗', label:'Car Ride', cat:'Car Ride', start:true }, { e:'🛒', label:'Outing', cat:'Outing / Excursion', start:true }, ...(mod('checkins') ? [{ e:'📝', label:L('Day check-in', 'Bilan du jour'), checkin:true }] : []), { e:'🧸', label:L('Play', 'Jeu'), cat:'Play', start:true }, ...(mod('familyContact') ? [{ e:'💬', label:L('Family contact', 'Contact famille'), cat:'Family Contact', tags: S.lastContactTags || 'text, from-family' }] : []), ...(mod('cocooning') ? [{ e:'👥', label:'Guests', cat:'Guest', start:true }] : []), { e:'✏️', label:'Custom…', cat:'' });
  return P;
}
/* v1.24 — Quick Log buttons in groups with small headings. */
const QL_GROUPS = [['sleep', 'Sleep', 'Sommeil'], ['feed', 'Feeding', 'Alimentation'], ['diaper', 'Diapers', 'Couches'],
  ['health', 'Health & growth', 'Santé et croissance'], ['day', 'Activities', 'Activités'], ['family', 'Visits & family', 'Visites et famille'], ['other', 'Other', 'Autre']];
function qlGroup(p){
  if (p.instant || p.water || p.meal) return 'feed';   // breastfeeding start / switch / end
  // things in progress (End nap…) sit first in their own group, highlighted
  const k = p.cat ? catKind(p.cat) : '', c = p.cat || '';
  if (p.checkin || /^(Handover|Family Contact)$/.test(c)) return 'family';
  if (/^Sleep|^Awake/.test(c)) return 'sleep';
  if (/^(Milk|Bottle|Pump)$/.test(c)) return 'feed';
  if (/^Diaper/.test(c)) return 'diaper';
  if (/^(Meds|Temperature|Health \/ Incident|Medical \/ Appointment|Weight|Height|Milestone)$/.test(c) || ['growth', 'temp', 'meds'].includes(k)) return 'health';
  if (/^(Bath|Car Ride|Outing \/ Excursion|Play|Behaviour|Guest)$/.test(c)) return 'day';
  return 'other';
}
function qlPresetsHTML(P){
  const btn = (p, i) => `<button class="preset ${p.live ? 'live' : ''}" data-p="${i}"><span class="e">${p.e}</span>${esc(p.label)}${p.sub ? `<span class="faint" style="font-size:11px">${p.sub}</span>` : ''}</button>`;
  const by = new Map(QL_GROUPS.map(g => [g[0], []])); P.forEach((p, i) => by.get(qlGroup(p)).push(btn(p, i)));
  return QL_GROUPS.filter(([g]) => by.get(g).length).map(([g, en, fr]) => `<div class="qlgrp" data-g="${g}"><h5>${L(en, fr)}</h5><div class="presets">${by.get(g).join('')}</div></div>`).join('');
}
/* v1.23.2 — Who am I, right in Quick Log (it was only in Settings → General). */
let QL_WHO_EDIT = false;
function qlWhoHTML(){
  if (ME.name && !QL_WHO_EDIT) return `<p class="qlwho faint">👤 ${L('Logging as', 'Noté par')} <b>${esc(ME.name)}</b> <button class="linkbtn" data-qlwho="edit">${L('change', 'modifier')}</button></p>`;
  if (!ME.name && !QL_WHO_EDIT && sessionStorage.getItem('bld.whoLater')) return `<p class="qlwho faint">👤 <button class="linkbtn" data-qlwho="edit">${L('Sign entries with your name', 'Signer les entrées avec votre nom')}</button></p>`;
  return `<div class="qlwho-form"><b>👤 ${L('Who’s logging on this device?', 'Qui note sur cet appareil?')}</b>
    <div class="row" style="gap:6px;margin-top:6px"><input type="text" id="qlMeName" value="${esc(ME.name || '')}" placeholder="${esc(L('First name', 'Prénom'))}" maxlength="24" style="flex:1;min-width:0"></div>
    <div class="row" style="gap:6px;margin-top:6px"><button class="btn sm primary" data-qlwho="save">✓ ${L('Save', 'Enregistrer')}</button><button class="btn sm ghost" data-qlwho="later">${L('Not now', 'Plus tard')}</button></div>
    <p class="hint" style="margin:6px 0 0">${L('Your entries get a “Logged By” column in the Sheet. Kept on this device only; also in Settings → General.', 'Vos entrées reçoivent une colonne « Logged By » dans la feuille. Gardé sur cet appareil seulement; aussi dans Paramètres → Général.')}</p></div>`;
}
function renderQuickLog(){
  if (QL !== renderQuickLog.last) { renderQuickLog.last = QL; [$('#qlog'), $('#qlBody'), $('#qlBody')?.parentElement].forEach(el => { if (el) el.scrollTop = 0; }); }   // a new form starts at the top
  $('#qlDest').textContent = S.endpoint ? '→ Google Sheet' : '→ this device only';
  $('#qlDest').className = 'pill ' + (S.endpoint ? 'live' : 'local');
  if (!QL) {
    $('#qlTitle').textContent = 'Quick Log';
    const P = qlPresets(); window.__qlp = P;
    const queued = QUEUE.length ? `<p class="queue-note">${QUEUE.length} entr${QUEUE.length>1?'ies':'y'} not yet in the Sheet${S.endpoint ? ' — they retry on every sync.' : ' (no Sheet connected).'}</p>` : '';
    $('#qlBody').innerHTML = `${qlDraftHTML()}${!ME.name || QL_WHO_EDIT ? qlWhoHTML() : ''}${qlKidPickerHTML()}${smartRowHTML(P)}${qlPresetsHTML(P)}${queued}
      ${!S.endpoint ? '<p class="queue-note">Connect your Sheet (Settings → Data source) and redeploy the Apps Script with <b>doPost</b> to save straight into Google Sheets.</p>' : ''}${ME.name && !QL_WHO_EDIT ? qlWhoHTML() : ''}`;
    return;
  }
  const f = QL, catKindNow = f.row['Category'] ? catKind(f.row['Category']) : '';
  const ocOpts = f.op === 'end' ? (isSleep({ k: catKindNow }) ? OUTCOMES.sleep : []) : catKindNow === 'contact' ? OUTCOMES.contact : catKindNow === 'meal' ? OUTCOMES.meal : (catKindNow === 'nap' || catKindNow === 'night') ? OUTCOMES.sleep : (catKindNow === 'incident' || catKindNow === 'medical') ? OUTCOMES.incident : catKindNow === 'handover' ? OUTCOMES.handover : catKindNow === 'behaviour' ? OUTCOMES.behaviour : [];
  const sugg = catKindNow === 'behaviour' || catKindNow === 'awake' ? [...REACT_NEG.slice(0, 10), ...REACT_POS.slice(0, 5)] : catKindNow === 'handover' ? [...HANDOVER_TAGS, 'upset-at-handover', 'calm'] : catKindNow === 'milestone' ? ['motor','speech','feeding','social'] : catKindNow === 'meal' ? ['new-food','accepted','refused','self-fed'] : [];
  $('#qlTitle').textContent = f.both ? L('Log wet + poop diaper', 'Noter couche pipi + caca') : f.op === 'update' ? L('Edit entry', 'Modifier l’entrée') : f.op === 'end' ? `End ${f.row['Category']}` : f.row['Category'] ? L(`Log ${f.row['Category']}`, `Noter : ${catL(f.row['Category'])}`) : 'Custom entry';
  const known = [...new Set([...Object.keys(DEFAULT_CATS), ...CATS.keys()])];
  const v = h => esc(f.row[h] ?? '');
  // v1.24.1 — only the fields that make sense for this category (a field that already has a value always shows)
  const has = h => f.row[h] !== '' && f.row[h] != null, custom = !catKindNow || catKindNow === 'other';
  const showMilk = custom || catKindNow === 'milk' || has('Milk (oz)');
  const showWater = custom || catKindNow === 'water' || catKindNow === 'meal' || has('Water (ml)');
  const showOutcome = ocOpts.length > 0 || has('Outcome / Rating');
  $('#qlBody').innerHTML = `<form class="qform" id="qlForm" autocomplete="off">
    ${f.op === 'end' ? `<div class="full callout info">Ending <b>${esc(f.row['Category'])}</b> that started at ${fmtTime(f.target.st)} (${fmtDur(nowAbs() - f.target.s)} so far).</div>
      <label class="field">End time<input type="time" name="End Time" value="${v('End Time')}" required></label>
      ${agoChips('End Time', L('Ended', 'Fin'))}
      ${isSleep({ k: catKindNow }) && !/car/i.test(f.row['Category']) ? asleepFieldHTML(f.row, fmtTime(f.target.st)) : ''}
      ${isSleep({ k: catKindNow }) || catKindNow === 'awake' ? `<label class="field">Tags <span class="faint">(comma-separated)</span><input type="text" name="Tags" value="${v('Tags')}"></label>${soothChipsHTML(f.row['Tags'], catKindNow === 'awake' ? 'awake' : 'sleep')}` : ''}`
    : `<label class="field full">Category<input type="text" name="Category" list="qlCats" value="${v('Category')}" required placeholder="e.g. Lunch, Sleep - Nap, Milestone"><datalist id="qlCats">${known.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
      ${catKindNow === 'meal' && f.op !== 'end' ? `<div class="full tchips mealchips" data-for="Category"><span class="faint">${L('Meal', 'Repas')}</span>${['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(c => `<button type="button" class="chip ${f.row['Category'] === c ? '' : 'off'}" data-set-v="${c}">${esc(catL(c))}</button>`).join('')}</div>` : ''}
      <label class="field tfield">Date<input type="date" name="Date" value="${v('Date')}" required></label>
      <label class="field tfield">Start time ${catKindNow === 'milestone' || catKindNow === 'incident' ? '<span class="faint">(optional)</span>' : ''}<input type="time" name="Start Time" value="${v('Start Time')}"></label>
      ${f.op === 'append' ? agoChips('Start Time', L('Started', 'Début')) : ''}
      <label class="field tfield">${catKindNow === 'contact' ? L('Replied at / call ended <span class="faint">(optional)</span>', 'Réponse envoyée / fin d’appel <span class="faint">(facultatif)</span>') : `End time <span class="faint">(blank = ${DURATIONAL.has(catKindNow) ? 'in progress' : 'instant'})</span>`}<input type="time" name="End Time" value="${v('End Time')}"></label>
      ${f.op === 'append' && (DURATIONAL.has(catKindNow) || catKindNow === 'contact') ? agoChips('End Time', catKindNow === 'contact' ? L('Replied', 'Réponse') : L('Ended', 'Fin')) : ''}
      ${isSleep({ k: catKindNow }) && !/car/i.test(f.row['Category'] || '') ? asleepFieldHTML(f.row, '') : ''}
      ${showMilk ? `<label class="field">Milk (${MU()})<input type="number" step="${metric() ? 5 : 0.5}" min="0" name="Milk (oz)" value="${f.row['Milk (oz)'] === '' || f.row['Milk (oz)'] == null ? '' : toDisp(+f.row['Milk (oz)'])}"></label>` : ''}
      ${/milk|bottle/i.test(f.row['Category'] || '') ? `<div class="full tchips" data-for="Milk (oz)">${milkChips().map(a => `<button type="button" class="chip ${f.row['Milk (oz)'] !== '' && f.row['Milk (oz)'] != null && Math.abs(toDisp(+f.row['Milk (oz)']) - a) < .01 ? '' : f.row['Milk (oz)'] !== '' && f.row['Milk (oz)'] != null ? 'off' : ''}" data-set-v="${a}">${a} ${MU()}</button>`).join('')}</div>` : ''}
      ${['pump','growth','temp','meds'].includes(catKindNow) ? `<label class="field">${catKindNow === 'meds' ? L('Dose', 'Dose') : catKindNow === 'pump' ? 'Amount pumped' : catKindNow === 'temp' ? 'Temperature' : 'Measurement'}<input type="text" name="Value" value="${v('Value')}" placeholder="${catKindNow === 'meds' ? L('e.g. 2 ml', 'p. ex. 2 ml') : catKindNow === 'pump' ? (metric() ? 'e.g. 90 ml' : 'e.g. 3 oz') : catKindNow === 'temp' ? (metric() ? 'e.g. 37.6 °C' : 'e.g. 99.7 °F') : /head/i.test(f.row['Category']) ? (metric() ? 'e.g. 35.2 cm' : 'e.g. 13.9 in') : /height|length/i.test(f.row['Category']) ? (metric() ? 'e.g. 54 cm' : 'e.g. 21.3 in') : (metric() ? 'e.g. 4.2 kg' : 'e.g. 9 lb 4 oz')}"></label>` : ''}
      ${showWater ? `<label class="field">Water (ml)<input type="number" step="5" min="0" name="Water (ml)" value="${v('Water (ml)')}"></label>` : ''}
      ${catKindNow === 'water' ? `<div class="full tchips" data-for="Water (ml)">${waterChips().map(a => `<button type="button" class="chip" data-set-v="${a}">${a} ml</button>`).join('')}</div>` : ''}
      <label class="field">Tags <span class="faint">(comma-separated)</span><input type="text" name="Tags" value="${v('Tags')}" placeholder="${catKindNow === 'meal' ? 'eggs, toast, new-food' : catKindNow === 'milestone' ? 'motor, speech, feeding' : 'tags'}"></label>
      ${catKindNow === 'meds' ? medPickHTML(f.row) : ''}
      ${isPoopCat(f.row['Category']) ? stoolChipsHTML(f.row['Tags']) : ''}
      ${catKindNow === 'contact' ? contactChipsHTML(f.row['Tags']) : catKindNow === 'play' ? playChipsHTML(f.row['Tags']) : (isSleep({ k: catKindNow }) && !/car/i.test(f.row['Category'] || '')) || catKindNow === 'awake' ? soothChipsHTML(f.row['Tags'], catKindNow === 'awake' ? 'awake' : 'sleep') : ''}${sugg.length && catKindNow !== 'contact' && catKindNow !== 'play' && catKindNow !== 'awake' && !isSleep({ k: catKindNow }) ? `<div class="full chips" id="qlTagChips">${sugg.map(t => `<span class="chip ${String(f.row['Tags'] || '').split(/\s*,\s*/).includes(t) ? '' : 'off'}" data-tag="${esc(t)}" style="text-decoration:none">${esc(t)}</span>`).join('')}</div>` : ''}`}
    ${showOutcome ? `<label class="field">Outcome / Rating<select name="Outcome / Rating"><option value="">—</option>${[...ocOpts, ...(has('Outcome / Rating') && !ocOpts.includes(f.row['Outcome / Rating']) ? [f.row['Outcome / Rating']] : [])].map(o => `<option value="${esc(o)}" ${f.row['Outcome / Rating'] === o ? 'selected' : ''}>${esc(ocL(o))}</option>`).join('')}</select></label>` : ''}
    ${privOn() || f.row['Private Notes'] ? `<label class="field full privfield">🔒 ${L('Private notes', 'Notes privées')} <span class="faint">${L('· only for the family, never in reports or shared', '· pour la famille seulement, jamais dans les rapports ni partagées')}</span><textarea name="Private Notes" rows="2">${v('Private Notes')}</textarea></label>` : ''}
    <label class="field full">Notes<textarea name="Notes" rows="2" placeholder="${catKindNow === 'milestone' ? 'e.g. First steps!' : catKindNow === 'incident' ? 'What happened?' : ''}">${v('Notes')}</textarea></label>
    ${f.op === 'update' ? `<div class="full faint" style="font-size:12px">${L(`Sheet row ${f.ev.sheetRow ?? '—'} · first logged ${f.ev.loggedAt ? fmtDayShort(Math.floor(f.ev.loggedAt / DAY)) + ' ' + fmtTime(f.ev.loggedAt % DAY) : '—'}. Saving stamps “Edited At”; the original entry time is kept.`, `Ligne ${f.ev.sheetRow ?? '—'} de la feuille · saisie le ${f.ev.loggedAt ? fmtDayShort(Math.floor(f.ev.loggedAt / DAY)) + ' ' + fmtTime(f.ev.loggedAt % DAY) : '—'}. L’enregistrement ajoute « Edited At »; l’heure de saisie originale est conservée.`)}</div>` : ''}
    <div class="full row sp qlactions">${f.op === 'update' ? `<button type="button" class="btn danger" id="qlDelete">🗑 ${L('Delete', 'Supprimer')}</button>` : `<button type="button" class="btn" id="qlBack">← Back</button>`}<button type="submit" class="btn primary">${f.op === 'update' ? L('Save changes', 'Enregistrer') : `Save ${S.endpoint ? 'to Sheet' : 'on device'}`}</button></div>
  </form>`;
  // a small “Now” button right beside every time field (start and end, new entries and edits)
  $$('#qlForm input[type=time], #qlForm input.tin').forEach(i => { if (i.parentElement.classList.contains('tw')) return;
    const w = document.createElement('span'); w.className = 'tw'; i.replaceWith(w); w.appendChild(i);
    w.insertAdjacentHTML('beforeend', `<button type="button" class="btn sm nowbtn" data-now="${esc(i.name)}" data-noi18n>${L('Now', 'Maint.')}</button>`); });
}
/** “−10 · −5 · −1 · +1 · +5 · +10 min” buttons nudge whatever is in the field, so taps add up (v1.27). “Now” is the button beside the field (v1.37.1). */
const agoChips = (field, label) => `<div class="full tchips" data-for="${field}"><span class="faint">${label}</span>${[-10, -5, -1, 1, 5, 10].map(d => `<button type="button" class="chip nudge" data-nudge="${d}">${d < 0 ? '−' + -d : '+' + d}</button>`).join('')}</div>`;
const milkChips = () => metric() ? [60, 90, 120, 150] : [2, 3, 4, 5];
function waterChips(){ return String(T().waterChips || '').split(/[\s,;]+/).map(Number).filter(n => n > 0 && n < 2000).slice(0, 8); }
function stoolChipsHTML(tagsStr){
  const cur = new Set(parseTags(tagsStr));
  return `<div class="full ctchips"><div class="ctg"><span class="faint">${L('Consistency', 'Consistance')} · <a href="https://bitss-stoolscale.com" target="_blank" rel="noopener" class="faint">BITSS</a></span><div class="chips">${STOOL().map(([v, n, d]) => `<span class="chip ${cur.has(v) ? '' : 'off'}" data-tag="${v}" data-single="stool" title="${esc(d)}">${stoolIcon(v)}<span class="st-n">${esc(n)}<span class="faint">${esc(d.split(' · ')[0])}</span></span></span>`).join('')}</div></div></div>`;
}
/** Open Quick Log straight into a form for a given row (e.g. from the tooth chart). */
function openQuickLogWith(row){ if (viewOnly()) return toast(L('This is a view-only connection — logging is done by the family', 'Accès en lecture seulement — la famille fait les entrées')); QL = { op:'append', row:{ 'Date': isoOf(todayIdx()), 'Start Time':'', 'End Time':'', 'Duration (min)':'', 'Category':'', 'Milk (oz)':'', 'Notes':'', 'Water (ml)':'', 'Tags':'', 'Outcome / Rating':'', 'Value':'', ...row } }; renderQuickLog(); $('#qlog').classList.add('on'); $('#scrim').classList.add('on'); }
async function pickPreset(i){
  const p = window.__qlp[i]; if (!p) return;
  if (p.checkin) { closeQuickLog(); return openCheckin(); }
  if (p.instant) {   // one-tap breastfeeding actions
    const now = nowMin(), base = { 'Date': isoOf(todayIdx()), 'Start Time': fmtTime(now), 'End Time':'', 'Duration (min)':'', 'Category':'Breastfeed', 'Milk (oz)':'', 'Notes':'', 'Water (ml)':'', 'Tags':'', 'Outcome / Rating':'', 'Value':'' };
    closeQuickLog();
    if (p.instant === 'start') return saveQuickOp('append', { ...base, 'Tags': p.side });
    const tgt = p.target, endAbs = nowAbs(), ended = { 'Category': tgt.cat, 'End Time': fmtTime(now), 'Duration (min)': Math.max(1, endAbs - tgt.s), 'Notes':'', 'Outcome / Rating':'' };
    await saveQuickOp('end', ended);
    if (p.instant === 'switch') await saveQuickOp('append', { ...base, 'Tags': p.side });
    return;
  }
  const now = nowMin(), row = { 'Date': isoOf(todayIdx()), 'Start Time': fmtTime(now), 'End Time':'', 'Duration (min)':'', 'Category': p.cat, 'Milk (oz)':'', 'Notes':'', 'Water (ml)':'', 'Tags':'', 'Outcome / Rating':'' };
  if (p.op === 'end') { QL = { op:'end', row:{ 'Category': p.cat, 'End Time': fmtTime(now), 'Notes':'', 'Outcome / Rating':'' }, target:p.target }; return renderQuickLog(); }
  if (p.milk) row['Milk (oz)'] = p.milk;
  if (p.water) { row['Category'] = 'Water'; row['Water (ml)'] = waterChips()[2] ?? waterChips()[0] ?? 60; }
  if (p.allDay) row['Start Time'] = '';
  if (p.tags) row['Tags'] = p.tags;
  if (p.notes) row['Notes'] = p.notes;
  row['Value'] = '';
  QL = { op:'append', row, both: !!p.both, autoStart: row['Start Time'], nowStart: row['Start Time'] }; renderQuickLog();
  setTimeout(() => $('#qlForm button[type=submit]')?.focus(), 50);
}
async function submitQuickLog(form){
  const fd = Object.fromEntries(new FormData(form).entries());
  const _close = closeQuickLog; closeQuickLog = () => { QL.submitting = true; qlDropDraft(); _close(); closeQuickLog = _close; };   // saving isn't abandoning
  try { return await submitQuickLog0(form, fd); } finally { closeQuickLog = _close; }
}
async function submitQuickLog0(form, fd){
  if (QL.op === 'end') {
    const tgt = QL.target, en = parseTime(fd['End Time']); if (en == null) return toast('Pick an end time', true);
    const endAbs = (en < tgt.st ? tgt.d + 1 : tgt.d) * DAY + en;
    const row = { 'Category': tgt.cat, 'End Time': fmtTime(en), 'Duration (min)': endAbs - tgt.s, 'Notes': fd['Notes'] || '', 'Outcome / Rating': fd['Outcome / Rating'] || '' };
    if (fd['Tags']?.trim()) row['Tags'] = fd['Tags'].trim();                 // v1.27: soothing methods, merged into the row's tags
    if (fd['Asleep At']?.trim()) { const a = parseTime(fd['Asleep At']); let aa = a == null ? null : tgt.d * DAY + a; if (aa != null && aa < tgt.s - 60) aa += DAY;
      if (aa == null || aa < tgt.s || aa >= endAbs) return toast(L('“Asleep at” has to be between going up and the end time', '« Endormi·e à » doit être entre le début et la fin'), true);
      row['Asleep At'] = fmtTime(a); }
    closeQuickLog(); saveQuickOp('end', row); return;
  }
  const row = { ...QL.row, ...fd }, both = QL.both;
  if (row['Milk (oz)'] !== '' && row['Milk (oz)'] != null) row['Milk (oz)'] = +fromDisp(+row['Milk (oz)']).toFixed(2);   // form is in display units
  row['Category'] = canonCat(row['Category']);
  const st = parseTime(row['Start Time']), en = parseTime(row['End Time']);
  if (!row['Date']) return toast('Pick a date', true);
  const mk = measureKind({ k: catKind(row['Category']), cat: row['Category'] });
  if (mk && row['Value'] && parseMeasure(row['Value'], mk) == null) return toast(`Couldn't read “${row['Value']}” — try e.g. ${{ weight:'4.2 kg or 9 lb 4 oz', length:'54 cm or 21 in', head:'35 cm', temp:'37.6 °C or 99.7 °F', volume:'90 ml or 3 oz' }[mk]}`, true);
  if (mk && mk !== 'volume' && !row['Value']) return toast('Enter the measurement', true);
  row['Duration (min)'] = st != null && en != null ? (en > st ? en - st : en + DAY - st) : '';
  if (row['Asleep At']) { const a = parseTime(row['Asleep At']), span = row['Duration (min)'] || DAY, off = a == null || st == null ? null : (a - st + DAY) % DAY;
    if (off == null || off >= span || off > 180) return toast(L('“Asleep at” has to be between going up and the end time', '« Endormi·e à » doit être entre le début et la fin'), true); }
  if (row['Milk (oz)'] === '' && row['Category'] === 'Milk' && !row['Water (ml)']) return toast('Enter the milk amount', true);
  Object.keys(row).forEach(k => { if (row[k] == null) row[k] = ''; });
  if (catKind(row['Category']) === 'contact') { const keep = parseTags(row['Tags']).map(contactTag).filter(h => h && ['channel', 'dir', 'who'].includes(h[0])).map(h => h[1]); if (keep.length) { S.lastContactTags = keep.join(', '); saveSettings(); } }
  if (QL.op === 'update') { const ev = QL.ev; closeQuickLog(); return saveQuickOp('update', row, { rowNum: ev.sheetRow, match: ev.match, localId: ev.local ? ev.localId : null }); }
  closeQuickLog();
  if (both) { const wet = { ...row, 'Category':'Diaper - Wet', 'Tags': parseTags(row['Tags']).filter(t => !STOOL_KEYS.includes(t)).join(', ') };
    await saveQuickOp('append', wet, { batch:true }); await saveQuickOp('append', row); return toast(L('Logged a wet and a poop diaper', 'Couche pipi et couche caca notées')); }
  saveQuickOp('append', row);
}
