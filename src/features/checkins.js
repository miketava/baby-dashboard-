/* ════════════════════════════════════════════════════════════════════════════
   DAILY CHECK-IN — an end-of-day form covering the areas a caseworker asks about.
   Stored as ordinary Daily Log rows (one per area): Category “Check-in - <Area>”, Date = the day observed,
   no Start Time, Tags = answers as key=value (several values joined with +), Outcome = how the day went
   (Positive / Mixed / Difficult), Notes = the caregiver's own description. Logged At proves when it was written.
   ════════════════════════════════════════════════════════════════════════════ */
/** Option: [stored value, English, French]. Values are lowercase-hyphenated (“5+ min” → 5-plus-min); “+” is reserved as the separator. */
const o3 = (en, fr) => [en.toLowerCase().replace(/\+/g, ' plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), en, fr];
const CHECKIN = [
  { id:'language', cat:'Check-in - Language', icon:'🗣️', en:'Language', fr:'Langage',
    hint:['Does she vocalize? In what contexts? Does she understand instructions? Any progress?', 'Vocalise-t-elle? Dans quels contextes? Comprend-elle les consignes? Des progrès?'],
    q:[ { k:'vocal', one:true, en:'Vocalizing today', fr:'Vocalise aujourd’hui', o:[o3('Not much', 'Peu'), o3('Some', 'Un peu'), o3('A lot', 'Beaucoup')] },
        { k:'sounds', en:'Sounds', fr:'Sons', o:[o3('Coos', 'Gazouillis'), o3('Babbles', 'Babillage'), o3('Syllables', 'Syllabes (ba-ba)'), o3('Words', 'Mots'), o3('Imitates', 'Imite'), o3('Laughs', 'Rires')] },
        { k:'when', en:'When', fr:'Quand', o:[o3('Play', 'Jeu'), o3('Meals', 'Repas'), o3('Bath', 'Bain'), o3('Diaper change', 'Changement de couche'), o3('With an adult', 'Avec un adulte'), o3('Alone', 'Seule'), o3('When upset', 'Contrariée'), o3('On waking', 'Au réveil')] },
        { k:'understands', one:true, en:'Understands simple words / instructions', fr:'Comprend des mots / consignes simples', o:[o3('Not yet', 'Pas encore'), o3('Sometimes', 'Parfois'), o3('Often', 'Souvent')] },
        { k:'progress', one:true, en:'Something new today', fr:'Du nouveau aujourd’hui', o:[o3('Yes', 'Oui'), o3('No', 'Non')] } ] },
  { id:'emotional', cat:'Check-in - Emotional', icon:'💗', en:'Emotional', fr:'Affectif',
    hint:['How does she interact with you? Does she smile often, and when? Does she look to you when she has a need? Does she reach out her arms toward you?', 'Comment interagit-elle avec vous? Sourit-elle souvent, et quand? Se tourne-t-elle vers vous quand elle a un besoin? Vous tend-elle les bras?'],
    q:[ { k:'smiles', one:true, en:'Smiles', fr:'Sourires', o:[o3('Rarely', 'Rarement'), o3('Sometimes', 'Parfois'), o3('Often', 'Souvent')] },
        { k:'smile-when', en:'Smiles when', fr:'Sourit quand', o:[o3('Faces', 'Visages'), o3('Play', 'Jeu'), o3('Songs', 'Chansons'), o3('Peekaboo', 'Coucou'), o3('Reunion', 'Retrouvailles'), o3('Feeding', 'Repas'), o3('On waking', 'Au réveil')] },
        { k:'seeks', one:true, en:'Looks to you when she has a need', fr:'Se tourne vers vous quand elle a un besoin', o:[o3('No', 'Non'), o3('Sometimes', 'Parfois'), o3('Yes', 'Oui')] },
        { k:'reaches', one:true, en:'Reaches her arms toward you', fr:'Vous tend les bras', o:[o3('No', 'Non'), o3('Sometimes', 'Parfois'), o3('Yes', 'Oui')] },
        { k:'soothed', one:true, en:'Comforted by you when upset', fr:'Se laisse consoler par vous', o:[o3('Not really', 'Pas vraiment'), o3('Partly', 'En partie'), o3('Yes', 'Oui')] },
        { k:'others', one:true, en:'With other adults', fr:'Avec d’autres adultes', o:[o3('At ease', 'À l’aise'), o3('Wary', 'Méfiante'), o3('Upset', 'Bouleversée')] } ] },
  { id:'feeding', cat:'Check-in - Feeding', icon:'🍽️', en:'Hunger & feeding', fr:'Faim et alimentation',
    hint:['How do mealtimes go? How do you recognize when she is hungry, and when she is no longer hungry? Roughly how much does she eat?', 'Comment se passent les repas? Comment reconnaissez-vous qu’elle a faim, et qu’elle n’a plus faim? Environ combien mange-t-elle?'],
    q:[ { k:'hunger', en:'Hunger cues', fr:'Signes de faim', o:[o3('Fussing', 'S’agite'), o3('Crying', 'Pleure'), o3('Reaching for food', 'Tend la main vers la nourriture'), o3('Mouth open', 'Ouvre la bouche'), o3('Lip smacking', 'Claque des lèvres'), o3('Signing', 'Signe'), o3('At the high chair', 'Va vers la chaise haute')] },
        { k:'full', en:'Fullness cues', fr:'Signes de satiété', o:[o3('Turns away', 'Détourne la tête'), o3('Pushes away', 'Repousse'), o3('Slows down', 'Ralentit'), o3('Plays with food', 'Joue avec la nourriture'), o3('Closes mouth', 'Ferme la bouche'), o3('Throws food', 'Lance la nourriture')] },
        { k:'amount', one:true, en:'Amount eaten', fr:'Quantité mangée', o:[o3('Less than usual', 'Moins que d’habitude'), o3('Usual', 'Habituelle'), o3('More than usual', 'Plus que d’habitude')] },
        { k:'self', one:true, en:'Feeds herself', fr:'Mange seule', o:[o3('No', 'Non'), o3('Trying', 'Essaie'), o3('Yes', 'Oui')] } ] },
  { id:'play', cat:'Check-in - Play', icon:'🧸', en:'Play', fr:'Jeu',
    hint:['Can she sustain her attention on an activity? Does she flit quickly from one thing to another? What are her interests?', 'Arrive-t-elle à maintenir son attention sur une activité? Passe-t-elle vite d’une chose à l’autre? Quels sont ses intérêts?'],
    q:[ { k:'attention', one:true, en:'Longest focus on one activity', fr:'Plus longue attention sur une activité', o:[o3('Under 1 min', 'Moins de 1 min'), o3('1-5 min', '1 à 5 min'), o3('5+ min', '5 min et plus')] },
        { k:'flits', one:true, en:'Moves quickly from one thing to another', fr:'Passe vite d’une chose à l’autre', o:[o3('Often', 'Souvent'), o3('Sometimes', 'Parfois'), o3('Rarely', 'Rarement')] },
        { k:'interests', en:'Interested in', fr:'Intéressée par', o:PLAY_ACTS() },
        { k:'with', en:'Played', fr:'A joué', o:[o3('Alone', 'Seule'), o3('With an adult', 'Avec un adulte'), o3('With other kids', 'Avec d’autres enfants')] } ] },
  { id:'sleep', cat:'Check-in - Sleep', icon:'😴', en:'Sleep', fr:'Sommeil',
    hint:['How do naps go? How does she fall asleep? Does she wake up at various points? Does she need comfort from an adult?', 'Comment se passent les siestes? Comment s’endort-elle? Se réveille-t-elle à différents moments? A-t-elle besoin du réconfort d’un adulte?'],
    q:[ { k:'naps', one:true, en:'Naps went', fr:'Siestes', o:[o3('Easy', 'Faciles'), o3('Fussy', 'Agitées'), o3('Rough', 'Difficiles')] },
        { k:'falls-asleep', en:'Falls asleep', fr:'S’endort', o:[o3('On her own', 'Seule'), o3('Rocked', 'Bercée'), o3('Held', 'Dans les bras'), o3('Fed', 'En buvant'), o3('Patted', 'Tapotée'), o3('In stroller', 'En poussette'), o3('In car', 'En auto')] },
        { k:'wakings', one:true, en:'Night wakings', fr:'Réveils la nuit', o:[o3('0', '0'), o3('1', '1'), o3('2', '2'), o3('3+', '3 et plus')] },
        { k:'comfort', one:true, en:'Needed an adult to settle', fr:'A eu besoin d’un adulte pour se calmer', o:[o3('No', 'Non'), o3('Sometimes', 'Parfois'), o3('Yes', 'Oui')] } ] },
  { id:'parents', cat:'Check-in - Parents', icon:'📱', en:'Communication with parents', fr:'Communication avec les parents', mod:'familyContact',
    hint:['What questions do they ask you? Are they respectful? Do they follow the agreement on communication (e.g. once a week, no photos)?', 'Quelles questions vous posent-ils? Sont-ils respectueux? Respectent-ils l’entente sur la communication (p. ex. une fois par semaine, pas de photos)?'],
    q:[ { k:'contact', one:true, en:'Contact today', fr:'Contact aujourd’hui', o:[o3('None', 'Aucun'), o3('Yes', 'Oui')] },
        { k:'asked', en:'They asked about', fr:'Ils ont demandé', o:CONTACT.topics.items.map(t => [t, t.replace(/-/g, ' '), CONTACT_FR[t] || t]) },
        { k:'respectful', one:true, en:'Respectful', fr:'Respectueux', o:[o3('Yes', 'Oui'), o3('Mostly', 'En grande partie'), o3('No', 'Non')] },
        { k:'agreement', one:true, en:'Followed the communication agreement', fr:'Ont respecté l’entente de communication', o:[o3('Yes', 'Oui'), o3('No', 'Non'), o3('Not applicable', 'Sans objet')] },
        { k:'issue', en:'If not', fr:'Sinon', o:[o3('Too often', 'Trop souvent'), o3('Asked for photos', 'Ont demandé des photos'), o3('Outside agreed times', 'Hors des heures convenues'), o3('Tone', 'Ton'), o3('Other', 'Autre')] } ] },
  { id:'other', cat:'Check-in - Other', icon:'📝', en:'Anything else', fr:'Autre', hint:['Any other topic you consider relevant: health, milestones, visits, changes at home…', 'Tout autre sujet pertinent : santé, étapes, visites, changements à la maison…'], q:[] },
];
function PLAY_ACTS(){ return [o3('Books', 'Livres'), o3('Blocks', 'Blocs'), o3('Stacking', 'Empiler'), o3('Balls', 'Ballons'), o3('Music', 'Musique'), o3('Toys with sounds', 'Jouets sonores'), o3('Peekaboo', 'Coucou'), o3('Pretend', 'Faire semblant'), o3('Sensory', 'Sensoriel'), o3('Mirror', 'Miroir'), o3('Cars', 'Autos'), o3('Outdoors', 'Dehors'), o3('Water', 'Eau'), o3('Crawling / climbing', 'Ramper / grimper')]; }
const CI_TONE = [['Positive', 'A good day', 'Une bonne journée'], ['Mixed', 'Mixed', 'Mitigée'], ['Difficult', 'A hard day', 'Une journée difficile']];
const ciArea = cat => CHECKIN.find(a => a.cat.toLowerCase() === String(cat).toLowerCase());
const ciAreas = () => CHECKIN.filter(a => !a.mod || mod(a.mod));
/** Answers on a check-in row: { key: [values] } from “key=v1+v2” tags. */
function ciAnswers(e){ const o = {}; (e.tags || []).forEach(t => { const i = t.indexOf('='); if (i > 0) o[t.slice(0, i).trim()] = t.slice(i + 1).split('+').map(x => x.trim()).filter(Boolean); }); return o; }
const ciOptL = (q, v) => { const o = q.o.find(x => x[0] === v); return o ? L(o[1], o[2]) : v; };
const ciRows = D => DATA.events.filter(e => e.k === 'checkin' && e.d === D);
const ciDone = D => ciRows(D).length > 0;

/* ── Play logged during the day ── */
const PLAY_WITH = () => [o3('Alone', 'Seule'), o3('With an adult', 'Avec un adulte'), o3('With other kids', 'Avec d’autres enfants')];
const PLAY_FOCUS = () => [o3('Short', 'Courte'), o3('Medium', 'Moyenne'), o3('Long', 'Longue')];
function playChipsHTML(tagsStr){
  const cur = new Set(parseTags(tagsStr));
  const grp = (title, items, single) => `<div class="ctg"><span class="faint">${title}</span><div class="chips">${items.map(([v, en, fr]) => `<span class="chip ${cur.has(v) ? '' : 'off'}" data-tag="${v}" ${single ? `data-single="${single}"` : ''} style="text-decoration:none">${esc(L(en, fr))}</span>`).join('')}</div></div>`;
  return `<div class="full ctchips">${grp(L('Activity', 'Activité'), PLAY_ACTS(), '')}${grp(L('With', 'Avec'), PLAY_WITH(), '')}${grp(L('Attention', 'Attention'), PLAY_FOCUS(), 'focus')}</div>`;
}
const PLAY_SINGLE = { focus: () => PLAY_FOCUS().map(x => x[0]), stool: () => STOOL_KEYS };

/* ── The check-in form ── */
let CI = null;   // { D, ans:{ id:{ k:[...] } }, tone:{ id }, notes:{ id }, existing:{ id: ev } }
function openCheckin(D = todayIdx()){
  if (viewOnly()) return toast(L('This is a view-only connection — logging is done by the family', 'Accès en lecture seulement — la famille fait les entrées'));
  CI = { D, ans:{}, tone:{}, notes:{}, existing:{} };
  for (const e of ciRows(D)) { const a = ciArea(e.cat); if (!a) continue; CI.existing[a.id] = e; CI.ans[a.id] = ciAnswers(e); CI.tone[a.id] = e.outcome || ''; CI.notes[a.id] = e.notes || ''; }
  const pc = ciAreas().find(a => a.id === 'parents');   // prefill from today's Family Contact rows
  if (pc && !CI.existing.parents) { const cs = DATA.events.filter(e => e.k === 'contact' && e.d === D).map(contactInfo);
    CI.ans.parents = { contact:[cs.length ? 'yes' : 'none'], ...(cs.length ? { asked:[...new Set(cs.flatMap(c => c.topics))] } : {}) }; }
  renderCheckin(); openModal('mCheckin');
}
function ciContext(a, D){
  const m = DAYS.get(D); if (!m) return '';
  const meals = DATA.events.filter(e => e.d === D && e.k === 'meal'), cs = DATA.events.filter(e => e.k === 'contact' && e.d === D);
  const plays = DATA.events.filter(e => e.d === D && e.k === 'play');
  if (a.id === 'sleep') return L(`From today's log: ${m.napCount || 0} nap${m.napCount === 1 ? '' : 's'} (${fmtDur(m.daySleep || 0)})${m.overnightAwake != null ? `, last night ${fmtDur(m.overnightAwake)} awake` : ''}.`, `D’après le journal : ${m.napCount || 0} sieste${m.napCount > 1 ? 's' : ''} (${fmtDur(m.daySleep || 0)})${m.overnightAwake != null ? `, la nuit dernière ${fmtDur(m.overnightAwake)} d’éveil` : ''}.`);
  if (a.id === 'feeding' && meals.length) return L(`From today's log: ${meals.length} meal${meals.length > 1 ? 's' : ''} (${meals.map(e => (e.outcome || L('not rated', 'non évalué')).toLowerCase()).join(', ')})${m.milk ? `, ${fmtOz(m.milk)} milk` : ''}.`, `D’après le journal : ${meals.length} repas (${meals.map(e => ocL(e.outcome || '') || 'non évalué').join(', ').toLowerCase()})${m.milk ? `, ${fmtOz(m.milk)} de lait` : ''}.`);
  if (a.id === 'parents') { const lim = S.contactRules || {}; return L(`From today's log: ${cs.length} family contact${cs.length === 1 ? '' : 's'}${cs.length ? ' (' + cs.map(c => contactInfo(c).channel + (c.st != null ? ' ' + fmtTime(c.st) : '')).join(', ') + ')' : ''}.${lim.perWeek ? ` Agreement: ${lim.perWeek} per week${lim.photos === false ? ', no photos' : ''}.` : ''}`,
    `D’après le journal : ${plural(cs.length, '', '', 'contact', 'contacts')} avec la famille${cs.length ? ' (' + cs.map(c => ctL(contactInfo(c).channel) + (c.st != null ? ' ' + fmtTime(c.st) : '')).join(', ') + ')' : ''}.${lim.perWeek ? ` Entente : ${lim.perWeek} par semaine${lim.photos === false ? ', pas de photos' : ''}.` : ''}`); }
  if (a.id === 'play' && plays.length) return L(`Play logged today: `, `Jeu noté aujourd’hui : `) + plays.map(e => e.tags.filter(t => PLAY_ACTS().some(x => x[0] === t)).map(t => L(...PLAY_ACTS().find(x => x[0] === t).slice(1))).join(', ') + (e.dur ? ` (${fmtDur(e.dur)})` : '')).join(' · ');
  return '';
}
function renderCheckin(){
  const D = CI.D;
  $('#ciTitle').textContent = L('End-of-day check-in', 'Bilan de fin de journée');
  $('#ciBody').innerHTML = `<div class="row wrap" style="gap:10px;margin-bottom:6px"><label class="field" style="max-width:190px">${L('Day', 'Jour')}<input type="date" id="ciDate" value="${isoOf(D)}" max="${isoOf(todayIdx())}"></label>
      <p class="hint" style="flex:1;min-width:200px;margin:0">${L('Tap what fits and add a few words. Skip anything that doesn’t apply — only areas you fill in are saved.', 'Touchez ce qui s’applique et ajoutez quelques mots. Passez ce qui ne s’applique pas — seules les sections remplies sont enregistrées.')}${multiKid() ? ` <b>${esc(kidName(kidIdx()))}</b>` : ''}</p></div>
    ${ciAreas().map(a => { const ans = CI.ans[a.id] || {}, ctx = ciContext(a, D);
      return `<div class="ciarea" data-area="${a.id}"><h4>${a.icon} ${L(a.en, a.fr)}${CI.existing[a.id] ? ` <span class="faint" style="font-weight:500">· ${L('saved', 'enregistré')}</span>` : ''}</h4>
        <p class="hint" style="margin:2px 0 6px">${esc(L(...a.hint))}</p>${ctx ? `<p class="cictx">${esc(ctx)}</p>` : ''}
        ${a.q.map(q => `<div class="ciq"><span class="faint">${L(q.en, q.fr)}</span><div class="chips">${q.o.map(([v, en, fr]) => `<span class="chip ${(ans[q.k] || []).includes(v) ? '' : 'off'}" data-ci="${a.id}|${q.k}|${v}" ${q.one ? 'data-one="1"' : ''}>${esc(L(en, fr))}</span>`).join('')}</div></div>`).join('')}
        <div class="ciq"><span class="faint">${L('Overall', 'Dans l’ensemble')}</span><div class="chips">${CI_TONE.map(([v, en, fr]) => `<span class="chip ${CI.tone[a.id] === v ? '' : 'off'} tone-${v.toLowerCase()}" data-citone="${a.id}|${v}">${esc(L(en, fr))}</span>`).join('')}</div></div>
        <textarea rows="2" data-cinote="${a.id}" placeholder="${esc(L('In your own words…', 'Dans vos mots…'))}">${esc(CI.notes[a.id] || '')}</textarea></div>`; }).join('')}
    <div class="row sp" style="margin-top:12px"><button class="btn" data-ci-close>${L('Cancel', 'Annuler')}</button><button class="btn primary" data-ci-save>${S.endpoint ? L('Save to Sheet', 'Enregistrer dans la feuille') : L('Save on device', 'Enregistrer sur l’appareil')}</button></div>`;
}
function onCheckinClick(e){
  const c = e.target.closest('[data-ci]');
  if (c) { const [id, k, v] = c.dataset.ci.split('|'), ans = CI.ans[id] = CI.ans[id] || {}, cur = ans[k] || [];
    if (c.dataset.one) { ans[k] = cur.includes(v) ? [] : [v]; c.parentElement.querySelectorAll('.chip').forEach(x => x.classList.add('off')); if (ans[k].length) c.classList.remove('off'); }
    else { ans[k] = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]; c.classList.toggle('off', !ans[k].includes(v)); }
    return; }
  const t = e.target.closest('[data-citone]');
  if (t) { const [id, v] = t.dataset.citone.split('|'); CI.tone[id] = CI.tone[id] === v ? '' : v; t.parentElement.querySelectorAll('.chip').forEach(x => x.classList.toggle('off', x !== t || !CI.tone[id])); return; }
  if (e.target.closest('[data-ci-close]')) { CI = null; closeModals(); return; }
  if (e.target.closest('[data-ci-save]')) saveCheckin();
}
/** Save every filled-in area: update the day's existing rows, append the rest; one sync at the end. */
async function saveCheckin(){
  $$('#ciBody [data-cinote]').forEach(t => CI.notes[t.dataset.cinote] = t.value.trim());
  const D = CI.D, ops = [];
  for (const a of ciAreas()) {
    const ans = Object.entries(CI.ans[a.id] || {}).filter(([, v]) => v.length), note = CI.notes[a.id] || '', tone = CI.tone[a.id] || '', ex = CI.existing[a.id];
    if (!ans.length && !note && !tone && !ex) continue;
    const row = { 'Date': isoOf(D), 'Start Time':'', 'End Time':'', 'Duration (min)':'', 'Category': a.cat, 'Milk (oz)':'', 'Water (ml)':'', 'Value':'',
      'Tags': ans.map(([k, v]) => `${k}=${v.join('+')}`).join(', '), 'Outcome / Rating': tone, 'Notes': note };
    ops.push(ex ? ['update', row, { rowNum: ex.sheetRow, match: ex.match, localId: ex.local ? ex.localId : null }] : ['append', row, {}]);
  }
  if (!ops.length) return toast(L('Nothing filled in yet', 'Rien n’a été rempli'), true);
  if (ops.some(([op, , m]) => op === 'update' && m.rowNum == null && !m.localId) && S.endpoint) return toast(L('Update the Apps Script to change a saved check-in (Settings → About & changes)', 'Mettez à jour l’Apps Script pour modifier un bilan enregistré (Paramètres → À propos)'), true);
  CI = null; closeModals();
  for (const [op, row, meta] of ops) await saveQuickOp(op, row, { ...meta, batch:true });
  if (S.endpoint) await syncLive({ quiet:true, skipFlush:true });
  toast(L(`Check-in saved (${ops.length} area${ops.length > 1 ? 's' : ''})`, `Bilan enregistré (${ops.length} section${ops.length > 1 ? 's' : ''})`));
}
/* ── Evening prompt ── */
const ciDue = () => mod('checkins') && !viewOnly() && DATA.source !== 'demo' && nowMin() >= (parseTime(S.checkinAt || '19:30') ?? 1170) && !ciDone(todayIdx());
function checkCheckinReminder(){
  if (!ciDue()) return; const key = 'ci-' + isoOf(todayIdx()), fired = new Set(lsGet(firedKey(), []));
  if (fired.has(key)) return; fired.add(key); lsSet(firedKey(), [...fired]);
  const title = L('End-of-day check-in', 'Bilan de fin de journée'), body = L('A few taps on language, feelings, feeding, play, sleep and family contact.', 'Quelques touches : langage, affectif, alimentation, jeu, sommeil et contacts avec la famille.');
  if (S.reminders?.enabled && 'Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body, tag:key }); } catch {} }
}

/* ── Check-ins tab ── */
function ciSummary(a, rows){
  const out = [];
  for (const q of a.q) { const cnt = new Map(); rows.forEach(e => (ciAnswers(e)[q.k] || []).forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1)));
    if (!cnt.size) continue;
    out.push(`<b>${L(q.en, q.fr)}:</b> ` + [...cnt].sort((x, y) => y[1] - x[1]).map(([v, n]) => `${esc(ciOptL(q, v))}${q.one || rows.length > 1 ? ` ×${n}` : ''}`).join(', ')); }
  const tones = CI_TONE.map(([v, en, fr]) => [L(en, fr), rows.filter(e => e.outcome === v).length]).filter(([, n]) => n);
  if (tones.length) out.push(`<b>${L('Overall', 'Dans l’ensemble')}:</b> ` + tones.map(([l, n]) => `${esc(l.toLowerCase())} ×${n}`).join(', '));
  return out;
}
function renderCheckins(){
  if (!mod('checkins')) return;
  const days = visibleDays(), past = days.filter(d => !d.isToday || ciDone(d.D)), done = past.filter(d => ciDone(d.D));
  $('#ciSub').innerHTML = L(`${done.length} of ${past.length} days have a check-in · reminder at `, `${done.length} jours sur ${past.length} ont un bilan · rappel à `) + `<input type="time" id="ciAt" value="${esc(S.checkinAt || '19:30')}" style="width:auto;padding:2px 6px">`;
  $('#ciStrip').innerHTML = `<div class="cistrip">${days.map(d => { const rs = ciRows(d.D), bad = rs.filter(e => e.outcome === 'Difficult').length, good = rs.filter(e => e.outcome === 'Positive').length;
    return `<button class="cisq ${rs.length ? (bad > good ? 'bad' : good ? 'good' : 'mid') : d.isToday ? 'today' : 'none'}" data-ciday="${d.D}" title="${esc(fmtDay(d.D))}: ${rs.length ? L(`${rs.length} areas`, `${rs.length} sections`) : L('no check-in', 'aucun bilan')}"><span>${fmtDay(d.D, { weekday:'narrow' })}</span><b>${new Date(d.D * DAY * 60000).getUTCDate()}</b></button>`; }).join('')}</div>
    <p class="hint">${L('Tap a day to fill in or change its check-in. Colour = how the day went overall across areas.', 'Touchez une journée pour remplir ou modifier son bilan. Couleur = l’impression d’ensemble de la journée.')}</p>`;
  $('#ciAreas').innerHTML = ciAreas().map(a => { const rows = DATA.events.filter(e => e.cat.toLowerCase() === a.cat.toLowerCase() && days.some(d => d.D === e.d));
    const sum = ciSummary(a, rows), notes = rows.filter(e => e.notes).slice(-6).reverse();
    return `<div class="card ciacard"><div class="card-head"><div><h2>${a.icon} ${L(a.en, a.fr)}</h2><div class="sub" data-keep>${L(`${rows.length} check-in${rows.length === 1 ? '' : 's'} in range`, `${plural(rows.length, '', '', 'bilan', 'bilans')} dans la période`)}</div></div></div>
      <div class="cidots">${days.map(d => { const e = rows.find(x => x.d === d.D); return `<i class="${e ? (e.outcome || 'set').toLowerCase() : ''}" title="${esc(fmtDayShort(d.D))}${e?.outcome ? ' · ' + esc(ocL(e.outcome)) : ''}"></i>`; }).join('')}</div>
      ${sum.length ? `<ul class="find">${sum.map(s => `<li>${s}</li>`).join('')}</ul>` : `<p class="muted">${L('Nothing recorded yet.', 'Rien d’enregistré pour l’instant.')}</p>`}
      ${notes.length ? `<ul class="feed cinotes">${notes.map(e => `<li data-day="${e.d}" data-ev="${e.id}"><b>${fmtDayShort(e.d)}</b> ${esc(e.notes)}</li>`).join('')}</ul>` : ''}</div>`; }).join('');
}
/** Weekly observations for the report (range of days). */
function checkinReportHTML(days){
  if (!mod('checkins')) return '';
  const set = new Set(days.map(d => d.D)), all = DATA.events.filter(e => e.k === 'checkin' && set.has(e.d)); if (!all.length) return '';
  const nDays = new Set(all.map(e => e.d)).size;
  return `<h2>${L('Observations', 'Observations')}</h2><p class="sub">${L(`From the end-of-day check-ins: ${nDays} of ${days.length} days. Counts show how many days each answer was given; quotes are the caregiver's own notes.`, `Tirées des bilans de fin de journée : ${nDays} jours sur ${days.length}. Les chiffres indiquent le nombre de jours où chaque réponse a été donnée; les citations sont les notes du parent.`)}</p>`
    + ciAreas().map(a => { const rows = all.filter(e => e.cat.toLowerCase() === a.cat.toLowerCase()); if (!rows.length) return '';
      const sum = ciSummary(a, rows), extra = a.id === 'parents' ? contactAgreementHTML(days) : '';
      return `<h3>${a.icon} ${L(a.en, a.fr)}</h3>${sum.length ? `<ul>${sum.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}${extra}${rows.filter(e => e.notes).map(e => `<p class="sub" style="margin:2px 0"><b>${fmtDay(e.d, { month:'short', day:'numeric' })}</b> — ${esc(e.notes)}</p>`).join('')}`; }).join('');
}
/** Family-contact agreement (Settings: contacts per week, photos allowed) checked against the log. */
function contactAgreementHTML(days){
  const r = S.contactRules || {}; if (!r.perWeek && r.photos !== false) return '';
  const list = contactEvents(days).filter(x => x.c.dir === 'from-family'), weeks = [];
  for (let a = days[0].D; a <= days[days.length - 1].D; a += 7) weeks.push([a, a + 6]);
  const over = r.perWeek ? weeks.map(([a, b]) => list.filter(x => x.e.d >= a && x.e.d <= b).length).filter(n => n > r.perWeek) : [];
  const photos = list.filter(x => x.c.topics.includes('photo-request') || x.c.topics.includes('video-request')).length;
  return `<p class="sub">${L('Agreement', 'Entente')}: ${r.perWeek ? L(`${r.perWeek} contact${r.perWeek > 1 ? 's' : ''} a week`, `${r.perWeek} contact${r.perWeek > 1 ? 's' : ''} par semaine`) : ''}${r.photos === false ? L(', no photos', ', pas de photos') : ''}. ${L(`Logged from the family: ${list.length} contact${list.length === 1 ? '' : 's'}${r.perWeek ? ` (more than agreed in ${over.length} of ${weeks.length} week${weeks.length > 1 ? 's' : ''})` : ''}${r.photos === false ? `; ${photos} photo or video request${photos === 1 ? '' : 's'}` : ''}.`, `Contacts venant de la famille : ${list.length}${r.perWeek ? ` (plus que convenu dans ${over.length} semaine${over.length > 1 ? 's' : ''} sur ${weeks.length})` : ''}${r.photos === false ? `; ${photos} demande${photos > 1 ? 's' : ''} de photo ou de vidéo` : ''}.`)}</p>`;
}
