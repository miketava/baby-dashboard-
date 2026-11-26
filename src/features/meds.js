
/* ════════════════════════════════════════════════════════════════════════════
   v1.21 — Medication schedule: name, dose, time(s), from / until (blank = ongoing).
   A dose counts as given when a Meds row that day names the medication (Notes or Tags).
   One tap “✓ Given” writes that row. Reminders in the banner and as a notification;
   Today’s plan shows each dose; Health shows the last 30 days.
   ════════════════════════════════════════════════════════════════════════════ */
const medSlug = n => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const medTimes = md => String(md.times || '').split(/[\s,;]+/).map(t => normTime(t) || null).filter(Boolean);
const medActive = (md, D) => { const a = md.from ? parseDate(md.from) : null, b = md.until ? parseDate(md.until) : null; return !!md.name && (a == null || D >= a) && (b == null || D <= b); };
/** Meds rows of day D that name this medication. */
const medRows = (md, D) => { const sl = medSlug(md.name); return DATA.events.filter(e => e.d === D && e.k === 'meds' && (e.tags.some(t => medSlug(t) === sl) || medSlug(e.notes || '').includes(sl))).sort((a, b) => a.s - b.s); };
/** Doses due on day D: [{ md, i, t (minutes), given (event|null) }]. Doses are matched to rows in time order. */
function medDoses(D = todayIdx()){
  const out = [];
  (S.meds || []).forEach((md, i) => { if (!medActive(md, D)) return; const rows = medRows(md, D).slice(), ts = medTimes(md).map(parseTime).sort((a, b) => a - b);
    (ts.length ? ts : [null]).forEach(t => { const given = rows.shift() || null; out.push({ md, i, t, given }); }); });
  return out.sort((a, b) => (a.t ?? 9999) - (b.t ?? 9999));
}
async function giveMed(i){
  const md = (S.meds || [])[i]; if (!md) return; if (viewOnly()) return toast(L('This is a view-only connection', 'Accès en lecture seulement'));
  const row = { 'Date': isoOf(todayIdx()), 'Start Time': fmtTime(nowMin()), 'End Time':'', 'Duration (min)':'', 'Category':'Meds', 'Milk (oz)':'', 'Notes': `${md.name}${md.dose ? ' ' + md.dose : ''}`, 'Water (ml)':'', 'Tags': medSlug(md.name), 'Outcome / Rating':'', 'Value': md.dose || '' };
  await saveQuickOp('append', row);
  toast(L(`✓ ${md.name} given at ${fmtTime(nowMin())}`, `✓ ${md.name} donné à ${fmtTime(nowMin())}`));
}
/** Banner: a dose whose time has come and isn't checked off. */
function medCallouts(D){
  if (D !== todayIdx() || viewOnly()) return [];
  const now = nowMin();
  return medDoses(D).filter(d => !d.given && (d.t == null ? now >= 18 * 60 : now >= d.t - 15)).map(d => ({ cls: d.t != null && now > d.t + 60 ? 'bad' : 'info',
    html:`💊 ${L(`<b>${esc(d.md.name)}</b>${d.md.dose ? ' ' + esc(d.md.dose) : ''} ${d.t != null ? 'at ' + fmtTime(d.t) : 'today'}: not checked off yet`, `<b>${esc(d.md.name)}</b>${d.md.dose ? ' ' + esc(d.md.dose) : ''} ${d.t != null ? 'à ' + fmtTime(d.t) : 'aujourd’hui'} : pas encore coché`)} <button class="btn sm primary" data-medgive="${d.i}" style="margin-left:6px">✓ ${L('Given', 'Donné')}</button>` }));
}
/** Notification at dose time (once per dose per day). */
function checkMedReminders(){
  if (viewOnly()) return; const D = todayIdx(), now = nowMin(), fired = new Set(lsGet(firedKey(), [])); let ch = false;
  medDoses(D).forEach(d => { if (d.given || d.t == null || now < d.t || now > d.t + 120) return; const key = `med-${isoOf(D)}-${d.i}-${d.t}`; if (fired.has(key)) return; fired.add(key); ch = true;
    const title = L(`💊 ${d.md.name}${d.md.dose ? ' ' + d.md.dose : ''}`, `💊 ${d.md.name}${d.md.dose ? ' ' + d.md.dose : ''}`), body = L(`Due at ${fmtTime(d.t)}. Tap ✓ Given in the dashboard once it’s done.`, `Prévu à ${fmtTime(d.t)}. Touchez ✓ Donné dans le tableau de bord une fois fait.`);
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body, tag:key }); } catch {} } else toast(title + ' · ' + body); });
  if (ch) lsSet(firedKey(), [...fired]);
}
/** Plan rows for Today's plan. */
function medPlanRows(){
  const now = nowMin();
  return medDoses().map(d => `<div class="pl-row${d.given ? ' past' : d.t != null && now >= d.t - 15 ? ' nxt' : ''}" style="--k:${CATS.get?.('Meds')?.color || '#9333ea'}">
    <div class="pl-time">${d.t != null ? fmtTime(d.t) : L('today', 'auj.')}</div>
    <div class="pl-what"><b>💊 ${esc(d.md.name)}</b>${d.md.dose ? ` <span class="faint">${esc(d.md.dose)}</span>` : ''}${d.md.note ? `<div class="pl-note">${esc(d.md.note)}</div>` : ''}</div>
    <div class="pl-act">${d.given ? `<span class="pl-did">✓ ${fmtTime(d.given.st ?? 0)}</span>` : viewOnly() ? '' : `<button class="btn sm primary" data-medgive="${d.i}">✓ ${L('Given', 'Donné')}</button>`}</div></div>`).join('');
}
/** Health card: last 30 days per medication. */
function renderMedsCard(){
  const box = $('#medBox'), card = $('#medCard'); if (!box) return;
  const meds = (S.meds || []).filter(m => m.name); card.classList.toggle('hidden', !meds.length && !DATA.events.some(e => e.k === 'meds'));
  if (!meds.length) { box.innerHTML = `<p class="muted">${L('No medication schedule yet. Add one in Settings → Reminders → Medications to get reminders and a daily check-off.', 'Aucun horaire de médicament. Ajoutez-en un dans Paramètres → Rappels → Médicaments pour avoir des rappels et une case à cocher chaque jour.')}</p>`; return; }
  const T0 = todayIdx();
  box.innerHTML = meds.map(md => { const i = S.meds.indexOf(md), days = [];
    for (let D = T0 - 29; D <= T0; D++) if (medActive(md, D) && (DAYS.has(D) || D === T0)) { const due = Math.max(1, medTimes(md).length), got = medRows(md, D).length; days.push({ D, due, got: Math.min(got, due) }); }
    const past = days.filter(d => d.D < T0), given = past.reduce((a, d) => a + d.got, 0), due = past.reduce((a, d) => a + d.due, 0), missed = past.filter(d => d.got < d.due);
    return `<div class="med"><div class="row sp"><b>💊 ${esc(md.name)} ${md.dose ? `<span class="faint">${esc(md.dose)}</span>` : ''}</b><span class="faint">${medTimes(md).join(', ') || L('once a day', 'une fois par jour')} · ${md.until ? L(`until ${fmtDayShort(parseDate(md.until))}`, `jusqu’au ${fmtDayShort(parseDate(md.until))}`) : L('ongoing', 'en continu')}</span></div>
      <div class="medstrip">${days.map(d => `<i class="${d.D === T0 ? (d.got >= d.due ? 'ok' : 'today') : d.got >= d.due ? 'ok' : d.got ? 'part' : 'miss'}" title="${esc(fmtDayShort(d.D))}: ${d.got}/${d.due}"></i>`).join('')}</div>
      <p class="hint" style="margin:4px 0 10px">${due ? L(`${given} of ${due} doses checked off in the last ${past.length} days logged`, `${given} doses cochées sur ${due} dans les ${past.length} derniers jours notés`) : ''}${missed.length ? ' · ' + L('not checked: ', 'non cochées : ') + missed.slice(-5).map(d => fmtDayShort(d.D)).join(', ') : ''}</p></div>`; }).join('')
    + `<p class="hint">${L('A dose counts when a Meds row that day names the medication (✓ Given writes one). Days with no log at all are left out.', 'Une dose compte quand une ligne Meds du jour nomme le médicament (✓ Donné en écrit une). Les jours sans aucune entrée sont exclus.')}</p>`;
}
/** Settings → Reminders: the medication list. */
function medSettingsHTML(){
  const meds = S.meds || [];
  return `<h4>${L('Medications', 'Médicaments')}</h4>
    <p class="hint">${L('For a regular medication: reminders at dose time, a ✓ Given button (it writes a Meds row to the Sheet) and a check-off history in Health. Leave “until” blank if it’s ongoing. With Apps Script v1.3+ this list is kept in the Sheet’s Medications tab and shared by every device.', 'Pour un médicament régulier : rappel à l’heure de la dose, bouton ✓ Donné (il écrit une ligne Meds dans la feuille) et historique dans Santé. Laissez « jusqu’au » vide si c’est en continu. Avec l’Apps Script v1.3+, cette liste est gardée dans l’onglet Medications de la feuille et partagée entre les appareils.')}</p>
    ${meds.map((md, i) => `<div class="fgrid medrow" data-mi="${i}">
      <label class="field">${L('Name', 'Nom')}<input type="text" data-md="name" value="${esc(md.name || '')}" placeholder="${esc(L('e.g. Amoxicillin', 'p. ex. Amoxicilline'))}"></label>
      <label class="field">${L('Dose', 'Dose')}<input type="text" data-md="dose" value="${esc(md.dose || '')}" placeholder="2 ml"></label>
      <label class="field">${L('Time(s)', 'Heure(s)')}<input type="text" data-md="times" value="${esc(md.times || '')}" placeholder="19:30"></label>
      <label class="field">${L('From', 'Du')}<input type="date" data-md="from" value="${esc(md.from || '')}"></label>
      <label class="field">${L('Until (blank = ongoing)', 'Jusqu’au (vide = en continu)')}<input type="date" data-md="until" value="${esc(md.until || '')}"></label>
      <label class="field">${L('Note', 'Note')}<input type="text" data-md="note" value="${esc(md.note || '')}" placeholder="${esc(L('e.g. with the evening bottle', 'p. ex. avec le biberon du soir'))}"></label>
      <div class="full row" style="gap:8px"><button class="btn sm primary" data-act="medSave" data-mi="${i}">✓ ${L('Save medication', 'Enregistrer le médicament')}</button><button class="btn sm ghost danger" data-act="medDel" data-mi="${i}">✕ ${L('Remove', 'Retirer')}</button><span class="faint medok" style="font-size:12px">${md.name && medTimes(md).length ? '✓ ' + esc(medSummary(md)) : L('Not active yet: add a name and a time', 'Pas encore actif : ajoutez un nom et une heure')}</span></div></div>`).join('')}
    <button class="btn sm" data-act="medAdd" style="margin-top:8px">＋ ${L('Add a medication', 'Ajouter un médicament')}</button>`;
}

const medSummary = md => L(`${md.name}${md.dose ? ' ' + md.dose : ''} at ${medTimes(md).join(', ')}${md.from ? ' from ' + fmtDayShort(parseDate(md.from)) : ''}, ${md.until ? 'until ' + fmtDayShort(parseDate(md.until)) : 'ongoing'}`,
  `${md.name}${md.dose ? ' ' + md.dose : ''} à ${medTimes(md).join(', ')}${md.from ? ' dès le ' + fmtDayShort(parseDate(md.from)) : ''}, ${md.until ? 'jusqu’au ' + fmtDayShort(parseDate(md.until)) : 'en continu'}`);
/** “✓ Save medication”: check the row and confirm what was saved. */
function saveMed(i){
  const md = (S.meds || [])[i]; if (!md) return;
  $$(`#setPane [data-mi="${i}"] [data-md]`).forEach(el => { const v = el.value.trim(); if (v) md[el.dataset.md] = v; else delete md[el.dataset.md]; });
  if (!md.name) return toast(L('Add the medication’s name first', 'Ajoutez d’abord le nom du médicament'), true);
  if (!medTimes(md).length) return toast(L('Add a time, e.g. 19:30', 'Ajoutez une heure, p. ex. 19:30'), true);
  if (md.until && md.from && parseDate(md.until) < parseDate(md.from)) return toast(L('“Until” is before “From”', '« Jusqu’au » est avant « Du »'), true);
  saveSettings(); renderSettings(); renderAll();
  toast(L(`Saved: ${medSummary(md)}`, `Enregistré : ${medSummary(md)}`));
}
/** Settings window: a “✓ Saved” chip after every change (settings save as you type). */
let SAVED_T = null;
function flashSaved(){
  const c = $('#savedChip'); if (!c || !$('#mSettings')?.classList.contains('on')) return;
  c.textContent = L('✓ Saved', '✓ Enregistré'); c.classList.add('on'); clearTimeout(SAVED_T); SAVED_T = setTimeout(() => c.classList.remove('on'), 1800);
}

/** Quick Log → Meds: one button per scheduled medication, plus medications logged in the last 60 days. Tapping one fills Notes, Tags and Value. */
function medPickList(){
  const seen = new Map();
  (S.meds || []).filter(m => m.name).forEach(m => seen.set(medSlug(m.name), { name:m.name, dose:m.dose || '', sched:true }));
  DATA.events.filter(e => e.k === 'meds' && e.d > todayIdx() - 60).sort((a, b) => b.s - a.s).forEach(e => {
    const tag = e.tags.find(t => !['meds', 'med'].includes(t)); const name = tag ? tag.replace(/-/g, ' ') : (e.notes || '').replace(/\s+\d.*$/, '').trim();
    const k = medSlug(name); if (!k || seen.has(k)) return; seen.set(k, { name: name.replace(/^./, c => c.toUpperCase()), dose: e.raw?.value || '', sched:false }); });
  return [...seen.values()].slice(0, 8);
}
function medPickHTML(row){
  const list = medPickList(); if (!list.length) return '';
  const cur = medSlug((row['Tags'] || '').split(',')[0]);
  return `<div class="full tchips" data-for="Notes"><span class="faint">${L('Medication', 'Médicament')}</span>${list.map((m, i) => `<button type="button" class="chip ${medSlug(m.name) === cur ? '' : 'off'}" data-medpick="${i}">${m.sched ? '💊 ' : ''}${esc(m.name)}${m.dose ? ` <span class="faint">${esc(m.dose)}</span>` : ''}</button>`).join('')}</div>`;
}
function pickMedInForm(i){
  const m = medPickList()[i], f = $('#qlForm'); if (!m || !f) return;
  const set = (n, v) => { const el = f.querySelector(`[name="${n}"]`); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles:true })); } };
  set('Notes', `${m.name}${m.dose ? ' ' + m.dose : ''}`); set('Tags', medSlug(m.name)); if (m.dose) set('Value', m.dose);
  f.querySelectorAll('[data-medpick]').forEach(b => b.classList.toggle('off', +b.dataset.medpick !== i));
}
