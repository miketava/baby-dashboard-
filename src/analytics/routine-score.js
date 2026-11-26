
/* ════════════════════════════════════════════════════════════════════════════
   17b. ROUTINE SCORE · CALENDAR · VISIT CYCLE · FINDINGS (v3)
   ════════════════════════════════════════════════════════════════════════════ */
const SCORE_PARTS = [
  ['naps',   'Naps on schedule'], ['budget', 'Daytime sleep in budget'], ['cutoff', 'No nap past cutoff'],
  ['bedtime','Bedtime on target'], ['night', 'Unbroken night'], ['milk', 'Milk in target range'], ['meals', 'Meals accepted'],
];
/* v1.23.1 — Score weights as a 100-point pool (like a character's skill points): sliders and −/+ that
   can't go past what's left, and a warning while points are unspent. */
const SCORE_POOL = 100, SW_STEP = 5, SW_MAX = 50;
const swTotal = () => sum(SCORE_PARTS.map(([k]) => +S.score.weights[k] || 0));
const swLabel = (k, l) => L(l, SCORE_FR[k]);
function scoreWeightsHTML(){
  const W = S.score.weights;
  return `<div class="swbox" id="swBox"><div class="sw-pool" id="swPool"></div>
    ${SCORE_PARTS.map(([k, l]) => { const v = +W[k] || 0; return `<div class="sw-row" data-k="${k}"><span class="sw-l">${esc(swLabel(k, l))}</span>
      <button class="btn sm ghost sw-b" data-act="swStep" data-k="${k}" data-d="-${SW_STEP}" aria-label="−">−</button>
      <input type="range" min="0" max="${SW_MAX}" step="${SW_STEP}" value="${Math.min(v, SW_MAX)}" data-sw="${k}" aria-label="${esc(swLabel(k, l))}">
      <button class="btn sm ghost sw-b" data-act="swStep" data-k="${k}" data-d="${SW_STEP}" aria-label="+">+</button>
      <b class="sw-v">${v}</b></div>`; }).join('')}
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm ghost" data-act="swReset">↺ ${L('Default split', 'Répartition par défaut')}</button><button class="btn sm ghost" data-act="swClear">${L('Clear all', 'Tout remettre à 0')}</button></div></div>`;
}
/** Set one weight, capped so the total never passes 100. */
function setScoreWeight(k, v, input){
  const others = swTotal() - (+S.score.weights[k] || 0);
  const cur = +S.score.weights[k] || 0;
  v = Math.max(0, v <= cur ? v : Math.min(v, SW_MAX, Math.max(cur, SCORE_POOL - others)));   // lowering is always allowed
  S.score.weights[k] = v; if (input) input.value = v;
  saveSettings(); syncScoreWeights();
  clearTimeout(setScoreWeight.t); setScoreWeight.t = setTimeout(() => { analyze(); renderAll(); }, 250);
}
function syncScoreWeights(){
  const box = $('#swBox'); if (!box) return;
  const tot = swTotal(), left = SCORE_POOL - tot;
  box.querySelectorAll('.sw-row').forEach(r => { const k = r.dataset.k, v = +S.score.weights[k] || 0;
    r.querySelector('.sw-v').textContent = v; const inp = r.querySelector('input'); if (+inp.value !== v) inp.value = Math.min(v, SW_MAX);
    r.querySelector('[data-d^="-"]').disabled = v <= 0; r.querySelector('[data-d]:not([data-d^="-"])').disabled = left <= 0 || v >= SW_MAX;
    r.classList.toggle('zero', !v); inp.style.setProperty('--p', (Math.min(v, SW_MAX) / SW_MAX * 100) + '%'); });
  const pool = $('#swPool');
  pool.className = 'sw-pool ' + (left ? 'warn' : 'ok');
  pool.innerHTML = left < 0
    ? `<b>${-left}</b> ${L(`point${left < -1 ? 's' : ''} over 100`, `point${left < -1 ? 's' : ''} de trop`)}<span>${L(`The parts add up to ${tot}. Lower some of them until the total is 100.`, `Les volets totalisent ${tot}. Baissez-en quelques-uns jusqu’à un total de 100.`)}</span>`
    : left > 0
    ? `<b>${left}</b> ${L(`point${left > 1 ? 's' : ''} left to assign`, `point${left > 1 ? 's' : ''} à répartir`)}<span>${L(`The parts add up to ${tot} of 100. Scores still work (they’re scaled to what you assigned), but each number only reads as a share of the score once all 100 are used.`, `Les volets totalisent ${tot} sur 100. Le score fonctionne quand même (il est ajusté à ce qui est attribué), mais chaque nombre ne correspond à une part du score qu’une fois les 100 points utilisés.`)}</span>`
    : `✓ ${L('All 100 points assigned', 'Les 100 points sont attribués')}<span>${L('To raise a part, lower another first.', 'Pour monter un volet, baissez-en d’abord un autre.')}</span>`;
}
const SCORE_FR = { naps:'Siestes à l’heure', budget:'Sommeil de jour dans la cible', cutoff:'Pas de sieste après l’heure limite', bedtime:'Coucher à l’heure', night:'Nuit sans réveil', milk:'Lait dans la cible', meals:'Repas acceptés' };
/**
 * Routine score (0–100): how closely the day followed YOUR routine. Each component scores 0–1 and is
 * weighted (Settings → Routine score); components without data that day are skipped, and at least
 * three are needed for a score. Today is scored only on what has already happened.
 */
function scoreDay(m){
  const W = S.score.weights, t = T(), D = m.D, today = m.isToday, now = nowMin(), parts = {};
  const set = (k, v, detail) => { parts[k] = { v: v == null ? null : clamp(v, 0, 1), detail }; };
  const cutoff = cutoffFor(m);
  // naps on schedule: each core template nap window has a nap that overlaps it and starts within 45 min
  const bands = tplItems(m.tpl, 'nap').filter(b => !b.optional && b.end).map(b => [parseTime(b.start), parseTime(b.end), b.label]).filter(([, b]) => !today || b <= now);
  // graded: full credit within 20 min of the planned start, sliding to none at 75 min off; a missed nap scores 0
  if (bands.length) { const used = new Set(), offs = [];
    const credit = bands.map(([a, b, lbl]) => {
      const n = m.naps.filter(n => n.st != null && !used.has(n) && Math.abs(n.st - a) <= 120).sort((x, y) => Math.abs(x.st - a) - Math.abs(y.st - a))[0];
      if (!n) { offs.push(L(`${lbl} missed`, `${lbl} manquée`)); return 0; }
      used.add(n); const off = n.st - a, c = clamp(1 - (Math.abs(off) - 20) / 55, 0, 1);
      if (Math.abs(off) > 20) offs.push(L(`${lbl} ${fmtDur(Math.abs(off))} ${off > 0 ? 'late' : 'early'}`, `${lbl} ${off > 0 ? 'en retard de' : 'en avance de'} ${fmtDur(Math.abs(off))}`));
      return c; });
    const v = credit.reduce((x, y) => x + y, 0) / bands.length;
    set('naps', v, offs.length ? offs.join(' · ') : L(`${bands.length} of ${bands.length} on time (within 20 min)`, `${bands.length} sur ${bands.length} à l’heure (à 20 min près)`)); } else set('naps', null, 'no nap windows yet');
  const max = m.targets.maxDaySleep, ds = m.daySleep;
  if ((m.napCount || m.wake != null) && !(today && now < cutoff)) set('budget', ds <= max ? (ds >= max * .5 ? 1 : ds / (max * .5)) : 1 - (ds - max) / 60, `${fmtDur(ds)} of ${fmtDur(max)} max`);
  else set('budget', null, today ? 'still accumulating' : 'no naps logged');
  // graded: up to 10 min past the cutoff costs nothing, then it slides to none at 60 min past
  if (m.napCount) { const over = Math.max(0, ...m.naps.filter(n => napLate(m, n)).map(n => (n.t - D*DAY) - cutoff));
    set('cutoff', clamp(1 - (over - 10) / 50, 0, 1), over > 0 ? L(`a nap ran ${fmtDur(Math.round(over))} past the ${fmtTime(cutoff)} cutoff`, `une sieste a dépassé de ${fmtDur(Math.round(over))} l’heure limite de ${fmtTime(cutoff)}`) : L('all naps ended by the cutoff', 'toutes les siestes finies avant l’heure limite')); }
  else set('cutoff', null, 'no naps');
  const br = bedRange(m);
  if (m.bed != null && br) { const diff = Math.abs(bedOff(m, m.bed)); set('bedtime', diff <= 20 ? 1 : 1 - (diff - 20) / 40, br[0] === br[1] ? `${fmtTime(m.bed)} vs ${fmtTime(br[2])} target` : `${fmtTime(m.bed)} vs ${fmtTime(br[0])}–${fmtTime(br[1])} target`); } else set('bedtime', null, 'no bedtime logged');
  if (m.nightKnown && !today) { const aw = m.overnightAwake, sp = t.splitNightMin;
    set('night', aw <= 10 ? 1 : aw <= sp ? 1 - .6 * (aw - 10) / Math.max(1, sp - 10) : .4 * (1 - (aw - sp) / 20), aw ? `${fmtDur(aw)} awake overnight` : 'no wake-ups'); }
  else set('night', null, 'night not logged yet');
  if (m.milk != null && !(today && now < 1200)) { const lo = m.targets.milkMin, hi = m.targets.milkMax, v = m.milk;
    set('milk', v >= lo && v <= hi ? 1 : 1 - (v < lo ? lo - v : v - hi) / 3, `${fmtOz(v)} (${L("target", "cible")} ${fmtOz(lo)}–${fmtOz(hi)})`); } else set('milk', null, today ? L('day not finished', 'journée en cours') : L('no milk logged', 'aucun lait noté'));
  set('meals', m.accept, m.accept == null ? 'no rated meals' : `${Math.round(m.accept * 100)}% acceptance`);
  const used = SCORE_PARTS.filter(([k]) => parts[k].v != null && (+W[k] || 0) > 0);
  const tw = sum(used.map(([k]) => +W[k]));
  const score = used.length >= 3 && tw > 0 ? Math.round(100 * sum(used.map(([k]) => +W[k] * parts[k].v)) / tw) : null;
  return { score, parts, partial: today, used: used.length };
}
const scoreTone = v => v == null ? '' : v >= S.score.good ? 'good' : v >= S.score.ok ? 'warn' : 'bad';
const scoreCol = v => v == null ? 'var(--faint)' : `var(--${scoreTone(v)})`;
const scorePill = m => m.score?.score == null ? '' : `<span class="pill sc ${scoreTone(m.score.score)}" title="${L('Routine score', 'Score de routine')}${m.score.partial ? L(' (so far today)', ' (jusqu’ici aujourd’hui)') : ''}">${m.score.score}${m.score.partial ? '…' : ''}</span>`;
function scoreRing(v, size=34, partial=false){
  const r = size/2 - 3, c = 2*Math.PI*r, f = v == null ? 0 : v/100;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Routine score ${v ?? 'n/a'}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--grid2)" stroke-width="3.5"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${scoreCol(v)}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c*f} ${c}" transform="rotate(-90 ${size/2} ${size/2})"${partial ? ' stroke-opacity=".55"' : ''}/>
    <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="${size*.33}" font-weight="700" fill="var(--text)">${v ?? '–'}</text></svg>`;
}
/** Good (g) / bad (b) / neutral (n) day icons for the calendar and report. */
function dayIcons(m){
  const I = [], p = m.score?.parts || {};
  if (m.visit) I.push(['🏠','n',L('Off-site visit', 'Visite à l’extérieur') + (m.visitStart != null ? ' ' + fmtTime(m.visitStart) : '')]);
  if (m.homeVisit) I.push(['🏡','n',L('In-home visit', 'Visite à domicile')]);
  if (m.guest && mod('cocooning')) I.push(['👥','n',L('Guests at home', 'Invités à la maison')]);
  if (m.outing && mod('cocooning')) I.push(['🛒','n',L('Outing', 'Sortie')]);
  if (m.medical) I.push(['🩺','n',L('Medical appointment', 'Rendez-vous médical')]);
  if (p.naps?.v === 1) I.push(['😴','g',L('Naps on schedule', 'Siestes à l’heure')]);
  if (m.lateNap) I.push(['⏰','b',L('Nap past cutoff', 'Sieste après l’heure limite')]);
  if (m.nightKnown && m.overnightAwake <= 10 && !m.isToday) I.push(['🌙','g',L('Unbroken night', 'Nuit sans réveil')]);
  if (m.split) I.push(['⚡','b',L(`Split night (${fmtDur(m.overnightAwake)} awake)`, `Nuit fragmentée (${fmtDur(m.overnightAwake)} d’éveil)`)]);
  if (m.accept != null && m.accept >= .8) I.push(['🍽','g',L('Meals accepted', 'Repas acceptés')]);
  if (m.refused) I.push(['🚫','b',L(`${m.refused} meal${m.refused > 1 ? 's' : ''} refused`, `${m.refused} repas refusé${m.refused > 1 ? 's' : ''}`)]);
  if (m.reactNeg) I.push(['😣','b',plural(m.reactNeg, 'difficult reaction', 'difficult reactions', 'réaction difficile', 'réactions difficiles')]);
  else if (m.reactPos) I.push(['😊','g',L('Positive mood noted', 'Bonne humeur notée')]);
  if (m.incidents) I.push(['✚','b',L('Health note / incident', 'Note de santé / incident')]);
  if (m.milestones) I.push(['⭐','g',L('Milestone', 'Étape')]);
  if (m.teeth) I.push(['🦷','n',L('New tooth', 'Nouvelle dent')]);
  return I;
}
const iconsHTML = (m, max=6) => dayIcons(m).slice(0, max).map(([i, tone, t]) => `<span class="di ${tone}" title="${esc(t)}">${i}</span>`).join('');

/** Compact month-style calendar (Mon–Sun rows) for a day range. */
function calendarHTML(a, b, { clickable=true, all=false } = {}){
  const dow = D => (idxDate(D).getUTCDay() + 6) % 7, start = a - dow(a), end = b + (6 - dow(b));
  const vis = new Set((all ? daysIn(a, b) : visibleDays([a, b])).map(d => d.D)), today = todayIdx();
  let h = `<div class="cal"><div class="cal-h">${(FRL() ? ['lun','mar','mer','jeu','ven','sam','dim'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map(x => `<span>${x}</span>`).join('')}</div><div class="cal-g">`;
  for (let D = start; D <= end; D++) {
    const m = DAYS.get(D), inR = D >= a && D <= b && vis.has(D), dt = idxDate(D);
    const lbl = (dt.getUTCDate() === 1 || D === start) ? fmtDayShort(D) : dt.getUTCDate();
    if (!m || !inR) { h += `<div class="cc off"><div class="cd">${lbl}</div></div>`; continue; }
    h += `<div class="cc ${m.visit ? 'v' : ''} ${D === today ? 'today' : ''}" ${clickable ? `data-day="${D}"` : ''} title="${esc(fmtDay(D))}${m.score?.score != null ? ' · ' + L('routine score', 'score de routine') + ' ' + m.score.score : ''}">
      <div class="cd">${lbl}${m.visit ? ' <b class="vtag">' + L('Visit', 'Visite') + '</b>' : m.since === 1 ? ' <span class="faint">+1</span>' : ''}</div>
      ${mod('schedule') ? `<div class="cr">${scoreRing(m.score?.score ?? null, 34, m.score?.partial)}</div>` : ''}<div class="ci">${iconsHTML(m)}</div></div>`;
  }
  return h + `</div></div>`;
}
const CAL_LEGEND_EN = `<div class="tl-legend" style="margin-top:8px"><span>Ring = routine score (<b style="color:var(--good)">≥ good</b> / <b style="color:var(--warn)">ok</b> / <b style="color:var(--bad)">low</b>)</span><span><i style="background:#ec4899"></i>Visit day</span>
  <span>😴 naps on schedule</span><span>🌙 unbroken night</span><span>🍽 ate well</span><span>😊 positive mood</span><span>⭐ milestone</span>
  <span>⏰ late nap</span><span>⚡ split night</span><span>🚫 refused meal</span><span>😣 difficult reaction</span><span>✚ health note</span><span>🏡 home visit · 🩺 medical</span></div>`;
const CAL_LEGEND_FR = `<div class="tl-legend" style="margin-top:8px"><span>Anneau = score de routine (<b style="color:var(--good)">bon</b> / <b style="color:var(--warn)">moyen</b> / <b style="color:var(--bad)">bas</b>)</span><span><i style="background:#ec4899"></i>Jour de visite</span>
  <span>😴 siestes à l’heure</span><span>🌙 nuit sans réveil</span><span>🍽 a bien mangé</span><span>😊 bonne humeur</span><span>⭐ étape</span>
  <span>⏰ sieste tardive</span><span>⚡ nuit fragmentée</span><span>🚫 repas refusé</span><span>😣 réaction difficile</span><span>✚ note de santé</span><span>🏡 visite à domicile · 🩺 médical</span></div>`;

