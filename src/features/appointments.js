/* ════════════════════════════════════════════════════════════════════════════
   v1.26 — Template library and calendar appointments.
   • Library: ready-made day templates that fit the family's path and the child's nap count (1 or 2 naps).
     Visit days (placement path only): early, late-morning, midday, afternoon. Everyone: morning / afternoon
     appointment, and a 1-nap transition day from 12 to 24 months. The ones the auto-pick needs are added
     once by themselves; the rest are in Settings → Schedule templates → From the library.
   • Appointments: Apps Script v1.4 sends timed calendar events that look like a doctor, dentist, clinic or
     vaccine appointment. The first time one shows up, the Today banner asks whether it's for the child;
     the answer is shared through the Sheet (Config tab). Accepted ones pick the appointment template,
     lined up with the real time, like visits. A whole calendar (e.g. a parent's work calendar) can be ignored.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Template library ── */
const napCountNow = () => { const n = (tplById('baseline')?.items || []).filter(i => i.kind === 'nap' && !i.optional).length; return n || 2; };
const ti = (label, kind, start, end, extra) => ({ label, kind, start, ...(end ? { end } : {}), ...(extra || {}) });
/** Each entry: who it's for, and its items for a 2-nap or a 1-nap day. Labels are written in the current language when added. */
const TEMPLATE_LIB = [
  { id:'early-visit', visits:true, auto:true, name:() => L('Early-Morning Visit Day', 'Jour de visite tôt le matin'),
    two: () => DEFAULT_TEMPLATES.find(t => t.id === 'early-visit').items.map(i => ({ ...i })),
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:20'),
      ti(L('Visit', 'Visite'), 'visit', '09:00', '10:30'), ti(L('Snack', 'Collation'), 'meal', '10:45', null, { note:L('In the car on the way home', 'Dans l’auto au retour') }),
      ti(L('Lunch', 'Dîner'), 'meal', '11:30'), ti(L('Nap', 'Sieste'), 'nap', '12:15', '14:15'), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '14:30'),
      ti(L('Snack', 'Collation'), 'meal', '15:00'), ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'late-visit', visits:true, auto:true, name:() => L('Late-Morning Visit Day', 'Jour de visite en fin d’avant-midi'),
    two: () => DEFAULT_TEMPLATES.find(t => t.id === 'late-visit').items.map(i => ({ ...i })),
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Snack', 'Collation'), 'meal', '09:30'),
      ti(L('Visit', 'Visite'), 'visit', '11:00', '12:30'), ti(L('Lunch', 'Dîner'), 'meal', '12:30', null, { note:L('In the car or right after', 'Dans l’auto ou juste après') }),
      ti(L('Car nap → crib', 'Sieste auto → lit'), 'nap', '12:45', '14:30', { note:L('Starts on the drive home; transfer to the crib if you can', 'Commence au retour; transférer au lit si possible') }),
      ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '14:45'), ti(L('Snack', 'Collation'), 'meal', '15:00'), ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'midday-visit', visits:true, auto:true, name:() => L('Midday Visit Day', 'Jour de visite le midi'),
    two: () => [ti(L('Wake', 'Réveil'), 'wake', '07:15'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:45'),
      ti(L('Nap 1', 'Sieste 1'), 'nap', '09:45', '10:45', { note:L('A little earlier and capped, to be rested for the visit', 'Un peu plus tôt et limitée, pour être reposé·e à la visite') }),
      ti(L('Lunch', 'Dîner'), 'meal', '11:00', null, { note:L('Early lunch before leaving', 'Dîner tôt avant de partir') }), ti(L('Visit', 'Visite'), 'visit', '12:00', '13:30'),
      ti(L('Car Nap', 'Sieste en auto'), 'nap', '13:40', '14:30', { note:L('On the drive home · stands in for Nap 2', 'Au retour · remplace la sieste 2') }),
      ti(L('Snack', 'Collation'), 'meal', '15:00'), ti(L('Optional Bridge Nap', 'Sieste de transition (option)'), 'nap', '16:30', '16:50', { optional:true, note:L('Only if very tired · skipping it means the 19:00 bedtime', 'Seulement si très fatigué·e · sans elle, coucher à 19 h') }),
      ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime (no bridge)', 'Coucher (sans transition)'), 'bedtime', '19:00'), ti(L('Bedtime (with bridge)', 'Coucher (avec transition)'), 'bedtime', '19:45')],
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Snack', 'Collation'), 'meal', '09:30'),
      ti(L('Lunch', 'Dîner'), 'meal', '11:00', null, { note:L('Early lunch before leaving', 'Dîner tôt avant de partir') }), ti(L('Visit', 'Visite'), 'visit', '12:00', '13:30'),
      ti(L('Car nap → crib', 'Sieste auto → lit'), 'nap', '13:40', '15:30', { note:L('Starts on the drive home; transfer to the crib if you can', 'Commence au retour; transférer au lit si possible') }),
      ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '15:45'), ti(L('Snack', 'Collation'), 'meal', '15:45'), ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'afternoon-visit', visits:true, auto:true, name:() => L('Afternoon Visit Day', 'Jour de visite l’après-midi'),
    two: () => [ti(L('Wake', 'Réveil'), 'wake', '07:15'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:45'), ti(L('Nap 1', 'Sieste 1'), 'nap', '10:00', '11:30'),
      ti(L('Lunch', 'Dîner'), 'meal', '11:45'), ti(L('Car Nap', 'Sieste en auto'), 'nap', '13:30', '14:15', { note:L('On the drive there · a shorter Nap 2', 'À l’aller · sieste 2 plus courte') }),
      ti(L('Visit', 'Visite'), 'visit', '14:30', '16:00'), ti(L('Optional Bridge Nap', 'Sieste de transition (option)'), 'nap', '16:10', '16:30', { optional:true, note:L('On the drive home, only if very tired', 'Au retour, seulement si très fatigué·e') }),
      ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime (no bridge)', 'Coucher (sans transition)'), 'bedtime', '19:00'), ti(L('Bedtime (with bridge)', 'Coucher (avec transition)'), 'bedtime', '19:45')],
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Lunch', 'Dîner'), 'meal', '11:00'),
      ti(L('Nap', 'Sieste'), 'nap', '11:45', '13:30', { note:L('Early nap, to be up before leaving', 'Sieste tôt, pour être réveillé·e avant de partir') }), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '13:45'),
      ti(L('Visit', 'Visite'), 'visit', '14:30', '16:00'), ti(L('Snack', 'Collation'), 'meal', '16:15'), ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'appt-am', auto:true, name:() => L('Morning Appointment', 'Rendez-vous le matin'),
    two: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:20'), ti(L('Appointment', 'Rendez-vous'), 'visit', '09:30', '10:15', { appt:true }),
      ti(L('Car Nap', 'Sieste en auto'), 'nap', '10:30', '11:15', { note:L('On the way home · a shorter Nap 1', 'Au retour · sieste 1 plus courte') }), ti(L('Lunch', 'Dîner'), 'meal', '11:45'),
      ti(L('Nap 2', 'Sieste 2'), 'nap', '14:15', '15:45', { note:L('Can run a little longer today', 'Peut durer un peu plus aujourd’hui') }), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '16:00'),
      ti(L('Snack', 'Collation'), 'meal', '16:00'), ti(L('Dinner', 'Souper'), 'meal', '17:45'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:45')],
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Appointment', 'Rendez-vous'), 'visit', '09:30', '10:30', { appt:true }),
      ti(L('Snack', 'Collation'), 'meal', '10:45'), ti(L('Lunch', 'Dîner'), 'meal', '11:45'), ti(L('Nap', 'Sieste'), 'nap', '12:30', '14:30'), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '15:00'),
      ti(L('Snack', 'Collation'), 'meal', '15:00'), ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'appt-midday', auto:true, name:() => L('Midday Appointment', 'Rendez-vous le midi'),
    two: () => [ti(L('Wake', 'Réveil'), 'wake', '07:15'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:45'),
      ti(L('Nap 1', 'Sieste 1'), 'nap', '09:45', '10:45', { note:L('A little earlier and capped', 'Un peu plus tôt et limitée') }),
      ti(L('Lunch', 'Dîner'), 'meal', '11:00', null, { note:L('Early lunch before leaving', 'Dîner tôt avant de partir') }), ti(L('Appointment', 'Rendez-vous'), 'visit', '12:00', '12:45', { appt:true }),
      ti(L('Car Nap', 'Sieste en auto'), 'nap', '13:00', '13:45', { note:L('On the way home · stands in for Nap 2', 'Au retour · remplace la sieste 2') }),
      ti(L('Snack', 'Collation'), 'meal', '15:00'), ti(L('Optional Bridge Nap', 'Sieste de transition (option)'), 'nap', '16:15', '16:35', { optional:true, note:L('Only if very tired · skipping it means the 19:00 bedtime', 'Seulement si très fatigué·e · sans elle, coucher à 19 h') }),
      ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime (no bridge)', 'Coucher (sans transition)'), 'bedtime', '19:00'), ti(L('Bedtime (with bridge)', 'Coucher (avec transition)'), 'bedtime', '19:45')],
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Snack', 'Collation'), 'meal', '09:30'),
      ti(L('Lunch', 'Dîner'), 'meal', '11:00', null, { note:L('Early lunch before leaving', 'Dîner tôt avant de partir') }), ti(L('Appointment', 'Rendez-vous'), 'visit', '12:00', '12:45', { appt:true }),
      ti(L('Car nap → crib', 'Sieste auto → lit'), 'nap', '13:00', '15:00', { note:L('Starts on the way home; transfer to the crib if you can', 'Commence au retour; transférer au lit si possible') }),
      ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '15:15'), ti(L('Snack', 'Collation'), 'meal', '15:15'), ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'appt-pm', auto:true, name:() => L('Afternoon Appointment', 'Rendez-vous l’après-midi'),
    two: () => [ti(L('Wake', 'Réveil'), 'wake', '07:15'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:45'),
      ti(L('Nap 1', 'Sieste 1'), 'nap', '10:30', '12:00', { note:L('A bit later and longer than usual', 'Un peu plus tard et plus longue que d’habitude') }), ti(L('Lunch', 'Dîner'), 'meal', '12:15'),
      ti(L('Snack', 'Collation'), 'meal', '14:15', null, { note:L('Pack it for the waiting room', 'À apporter pour la salle d’attente') }), ti(L('Appointment', 'Rendez-vous'), 'visit', '14:30', '15:15', { appt:true }),
      ti(L('Car Nap', 'Sieste en auto'), 'nap', '15:30', '16:15', { note:L('On the way home · stands in for Nap 2', 'Au retour · remplace la sieste 2') }), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '16:15'),
      ti(L('Dinner', 'Souper'), 'meal', '17:45'), ti(L('Bedtime', 'Coucher'), 'bedtime', '20:00')],
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Snack', 'Collation'), 'meal', '09:30'), ti(L('Lunch', 'Dîner'), 'meal', '11:30'),
      ti(L('Nap', 'Sieste'), 'nap', '12:00', '14:00', { note:L('Slightly early, to be up before leaving', 'Un peu tôt, pour être réveillé·e avant de partir') }), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '14:00'),
      ti(L('Snack', 'Collation'), 'meal', '14:15', null, { note:L('Pack it for the waiting room', 'À apporter pour la salle d’attente') }), ti(L('Appointment', 'Rendez-vous'), 'visit', '14:30', '15:15', { appt:true }),
      ti(L('Dinner', 'Souper'), 'meal', '17:30'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:30')] },
  { id:'one-nap', name:() => L('1-Nap Day (transition)', 'Journée à 1 sieste (transition)'), when: () => { const a = ageDays(); return a != null && a >= 365 && a < 730 && napCountNow() >= 2; },
    one: () => [ti(L('Wake', 'Réveil'), 'wake', '07:00'), ti(L('Breakfast', 'Déjeuner'), 'meal', '07:30'), ti(L('Snack', 'Collation'), 'meal', '09:30'), ti(L('Lunch', 'Dîner'), 'meal', '11:30'),
      ti(L('Nap', 'Sieste'), 'nap', '12:15', '14:45', { note:L('Up to 2½ h while adjusting', 'Jusqu’à 2 h 30 pendant l’adaptation') }), ti(L('Hard Nap Cutoff', 'Fin de sieste'), 'cutoff', '15:00'),
      ti(L('Snack', 'Collation'), 'meal', '15:15'), ti(L('Dinner', 'Souper'), 'meal', '17:15'), ti(L('Bedtime', 'Coucher'), 'bedtime', '19:00', { note:L('Earlier bedtime during the switch to one nap', 'Coucher plus tôt pendant le passage à une sieste') })],
    two: null },
];
/** Library entries that fit this family now (path, features, age); newborns have no schedule. */
function libFor(){
  if (!mod('schedule')) return [];
  const b = bandFor(ageDays()); if (b && b.schedule === false) return [];
  return TEMPLATE_LIB.filter(e => (!e.visits || mod('visits')) && (!e.when || e.when()));
}
function libBuild(e, n = napCountNow()){
  const items = (n <= 1 ? e.one : e.two || e.one)?.(); if (!items) return null;
  return { id: e.id, name: e.name(), targets: {}, items, lib: n <= 1 ? 1 : 2 };
}
/** Add the templates the auto-pick needs (midday / afternoon visit, appointments) once per child; a deleted one isn't re-added. */
function ensureLibTemplates(){
  S.libSeen ||= []; let added = 0; const kid = typeof kidCfgId === 'function' ? kidCfgId(kidIdx()) : 'main';
  libFor().filter(e => e.auto).forEach(e => {
    const key = `${kid}:${e.id}`; if (S.libSeen.includes(key)) return;
    if (!tplById(e.id)) { const t = libBuild(e); if (t) { S.templates.push(t); added++; } }
    S.libSeen.push(key);
  });
  return added;
}
function libPaneHTML(){
  const list = libFor(), n = napCountNow(); if (!list.length) return '';
  return `<h4>${L('From the library', 'De la bibliothèque')}</h4>
    <p class="hint" style="margin-top:0">${L(`Ready-made days for ${esc(S.profile.name || 'your child')}’s current routine (<b>${n <= 1 ? '1 nap' : '2 naps'}</b>, from your Baseline Home Day). Visit days are picked by the visit’s start time (before ${esc(T().earlyVisitCutoff || '09:30')} early, before 11:30 late morning, before 13:15 midday, later afternoon); appointments by theirs (before 11:00 morning, before 13:15 midday, later afternoon). Times slide to the real visit or appointment. Adjust anything after adding.`, `Des journées toutes faites pour la routine actuelle de ${esc(S.profile.name || 'votre enfant')} (<b>${n <= 1 ? '1 sieste' : '2 siestes'}</b>, d’après votre Journée type). Les jours de visite sont choisis selon l’heure de la visite (avant ${esc(T().earlyVisitCutoff || '09:30')} tôt, avant 11 h 30 fin d’avant-midi, avant 13 h 15 midi, plus tard après-midi); les rendez-vous selon la leur (avant 11 h matin, avant 13 h 15 midi, plus tard après-midi). Les heures glissent selon la vraie visite ou le rendez-vous. Ajustez au besoin après l’ajout.`)}</p>
    <div class="liblist">${list.map(e => { const have = tplById(e.id), t = libBuild(e, n); if (!t) return '';
      const naps = t.items.filter(i => i.kind === 'nap').map(i => `${i.start}–${i.end}${i.optional ? '?' : ''}`).join(', '), bed = t.items.filter(i => i.kind === 'bedtime').map(i => i.start).join(' / ');
      return `<div class="librow"><div><b>${esc(t.name)}</b><div class="faint" style="font-size:12px">${L('Naps', 'Siestes')} ${naps} · ${L('bed', 'coucher')} ${bed}</div></div>
        <button class="btn sm ${have ? 'ghost' : 'primary'}" data-act="libAdd" data-id="${e.id}">${have ? L('Replace', 'Remplacer') : L('＋ Add', '＋ Ajouter')}</button></div>`; }).join('')}</div>`;
}
function libAdd(id){
  const e = TEMPLATE_LIB.find(x => x.id === id), t = e && libBuild(e); if (!t) return;
  const i = S.templates.findIndex(x => x.id === id);
  if (i >= 0) { if (!confirm(L(`Replace your “${S.templates[i].name}” with the library version? Your changes to it will be lost.`, `Remplacer votre « ${S.templates[i].name} » par la version de la bibliothèque? Vos modifications seront perdues.`))) return; S.templates[i] = t; tplIdx = i; }
  else { S.templates.push(t); tplIdx = S.templates.length - 1; }
  saveSettings(); analyze(); renderAll(); renderSettings(); toast(L(`Added “${t.name}”`, `« ${t.name} » ajouté`));
}

/* ── Calendar appointments ── */
const apptList = () => (Array.isArray(DATA.base?.appts) ? DATA.base.appts : []).map(a => ({ ...a, D: parseDate(a.date), st: parseTime(a.start), en: parseTime(a.end) > parseTime(a.start) ? parseTime(a.end) : null })).filter(a => a.D != null && a.st != null);
const apptKid = () => typeof kidCfgId === 'function' ? kidCfgId(kidIdx()) : 'main';
const apptIgnored = a => (S.apptIgnoreCals || []).includes(a.calendar);
const apptMine = a => (S.apptFor || {})[a.id] === apptKid();
/** Accepted appointment on a day (the first one between 08:00 and 16:30, the hours that move naps). */
const apptOn = D => apptList().filter(a => a.D === D && apptMine(a) && a.st >= 480 && a.st <= 990).sort((x, y) => x.st - y.st)[0] || null;
const apptPending = () => apptList().filter(a => a.D >= todayIdx() && !(S.apptFor || {})[a.id] && !apptIgnored(a));
const upcomingAppts = (n = 3) => apptList().filter(a => apptMine(a) && (a.D > todayIdx() || (a.D === todayIdx() && (a.en ?? a.st) >= nowMin()))).sort((x, y) => x.D - y.D || x.st - y.st).slice(0, n);
function apptDecide(id, v){
  const a = apptList().find(x => x.id === id); if (!a) return;
  S.apptFor ||= {};
  if (v === 'ignore') { S.apptIgnoreCals = [...new Set([...(S.apptIgnoreCals || []), a.calendar])]; }
  else S.apptFor[id] = v === 'yes' ? apptKid() : 'no';
  saveSettings(); analyze(); renderAll();
  toast(v === 'yes' ? L(`Planned around it: ${a.title}`, `Journée planifiée autour : ${a.title}`) : v === 'ignore' ? L(`Events from “${a.calendar}” won’t be asked about (Settings → Schedule templates to undo)`, `Les événements de « ${a.calendar} » ne seront plus proposés (Réglages → Modèles pour annuler)`) : L('OK, left out', 'D’accord, mis de côté'));
}
function apptCallouts(){
  if (!mod('schedule')) return [];
  const who = esc(S.profile.name || L('your child', 'votre enfant'));
  return apptPending().slice(0, 2).map(a => ({ cls:'info', html: `📅 <b>${L('New on the calendar', 'Nouveau à l’agenda')}:</b> “${esc(a.title)}” · ${esc(relDay(a.D))} ${fmtTime(a.st)} <span class="faint">(${esc(a.calendar)})</span> — ${L(`for ${who}?`, `pour ${who}?`)}
    <span class="appt-btns"><button class="btn sm primary" data-appt="${esc(a.id)}" data-v="yes">✓ ${L('Yes, plan around it', 'Oui, planifier autour')}</button><button class="btn sm ghost" data-appt="${esc(a.id)}" data-v="no">✕ ${L('No', 'Non')}</button>${a.calendar ? `<button class="btn sm ghost" data-appt="${esc(a.id)}" data-v="ignore">${L('Ignore this calendar', 'Ignorer cet agenda')}</button>` : ''}</span>` }));
}
function apptPaneHTML(){
  if (!mod('schedule') || DATA.source !== 'live' || viewOnly()) return '';
  const head = `<h4>${L('Appointments from your calendar', 'Rendez-vous de votre agenda')}</h4>`;
  if (!SCRIPT_SEEN || cmpVer(SCRIPT_SEEN, '1.4') < 0) return head + `<p class="hint">${L('Update the Apps Script to v1.4 to have doctor, dentist and clinic appointments from your Google Calendar pick the appointment templates.', 'Mettez l’Apps Script à jour (v1.4) pour que les rendez-vous médicaux, dentaires et de clinique de votre agenda choisissent les modèles de rendez-vous.')}</p>`;
  const list = apptList().filter(a => a.D >= todayIdx() - 14).sort((x, y) => x.D - y.D || x.st - y.st);
  const ign = S.apptIgnoreCals || [];
  const st = a => apptIgnored(a) ? 'ign' : (S.apptFor || {})[a.id] === apptKid() ? 'yes' : (S.apptFor || {})[a.id] ? 'no' : '';
  return head + `<p class="hint" style="margin-top:0">${L(`Calendar events that look like an appointment (médecin, pédiatre, dentiste, CLSC, vaccin, rendez-vous…). Only the ones marked for ${esc(S.profile.name || 'the child')} change the day’s template.`, `Les événements de l’agenda qui ressemblent à un rendez-vous (médecin, pédiatre, dentiste, CLSC, vaccin, rendez-vous…). Seuls ceux marqués pour ${esc(S.profile.name || 'l’enfant')} changent le modèle de la journée.`)}</p>
    ${list.length ? `<table class="cmp appt-tbl"><tbody>${list.map(a => { const s = st(a); return `<tr class="${a.D < todayIdx() ? 'faint' : ''}"><td>${esc(fmtDayShort(a.D))} ${fmtTime(a.st)}</td><td><b>${esc(a.title)}</b><div class="faint" style="font-size:11.5px">${esc(a.calendar || '')}</div></td>
      <td style="white-space:nowrap">${s === 'ign' ? `<span class="faint">${L('calendar ignored', 'agenda ignoré')}</span>` : `<div class="seg"><button class="${s === 'yes' ? 'on' : ''}" data-appt="${esc(a.id)}" data-v="yes">${L(`For ${esc(S.profile.name || 'the child')}`, `Pour ${esc(S.profile.name || 'l’enfant')}`)}</button><button class="${s === 'no' ? 'on' : ''}" data-appt="${esc(a.id)}" data-v="no">${L('Not for', 'Pas pour')} ${esc(S.profile.name || L('the child', 'l’enfant'))}</button></div>`}</td></tr>`; }).join('')}</tbody></table>`
      : `<p class="faint">${L('None found in the last 2 weeks or the next 60 days.', 'Aucun trouvé dans les 2 dernières semaines ni les 60 prochains jours.')}</p>`}
    ${ign.length ? `<p style="margin-top:8px">${L('Ignored calendars:', 'Agendas ignorés :')} ${ign.map(c => `<span class="chip">${esc(c)} <button class="linkbtn" data-unignore="${esc(c)}" aria-label="${esc(L('Stop ignoring', 'Ne plus ignorer'))}">✕</button></span>`).join(' ')}</p>` : ''}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-appt]');
  if (b) { e.stopPropagation(); apptDecide(b.dataset.appt, b.dataset.v); if ($('#mSettings')?.classList.contains('on')) renderSettings(); return; }
  const u = e.target.closest?.('[data-unignore]');
  if (u) { e.stopPropagation(); S.apptIgnoreCals = (S.apptIgnoreCals || []).filter(c => c !== u.dataset.unignore); saveSettings(); analyze(); renderAll(); renderSettings(); }
}, true);
