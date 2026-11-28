/* ════════════════════════════════════════════════════════════════════════════
   V7 phase 1 — Insights hub: one card per topic with a takeaway and the last 7 days vs the 7 before.
   Tapping a card opens the full section as it is today.
   ════════════════════════════════════════════════════════════════════════════ */
function wk(k, off = 0, f = d => d[k]){ const T0 = todayIdx(), ds = [...DAYS.values()].filter(d => d.D < T0 - off && d.D >= T0 - off - 7); const v = ds.map(f).filter(x => x != null && isFinite(x)); return v.length ? mean(v) : null; }
function insArrow(cur, prev, better, tol, fmt){
  if (cur == null || prev == null) return '';
  const d = cur - prev; if (Math.abs(d) < tol) return `<span class="ia">＝ ${L('same as last week', 'comme la semaine passée')}</span>`;
  const good = better === 0 ? '' : (d > 0) === (better > 0) ? ' good' : ' bad';
  return `<span class="ia${good}">${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))} ${L('vs last week', 'vs semaine passée')}</span>`;
}
function insightCards(){
  const out = [], card = (v, ic, title, big, sub, extra = '') => out.push({ v, html: `<button type="button" class="m2ins" data-goview="${v}"><span class="e">${ic}</span><span class="tx"><small>${title}</small><b>${big}</b>${sub ? `<span>${sub}</span>` : ''}${extra}</span><span class="go">›</span></button>` });
  const nav = new Set(NAV().map(t => t.v));
  // Sleep
  const s24 = wk('total24', 0, d => d.complete24 ? d.total24 : null), s24p = wk('total24', 7, d => d.complete24 ? d.total24 : null), wk1 = wk('wakings'), wk0 = wk('wakings', 7);
  card('sleep', '😴', L('Sleep', 'Sommeil'), s24 != null ? L(`${fmtDur(Math.round(s24 / 5) * 5)} a day`, `${fmtDur(Math.round(s24 / 5) * 5)} par jour`) : L('Not enough nights yet', 'Pas encore assez de nuits'),
    wk1 != null ? L(`${(Math.round(wk1 * 10) / 10).toLocaleString(LOC())} wakings a night`, `${(Math.round(wk1 * 10) / 10).toLocaleString(LOC())} réveils par nuit`) : '', insArrow(s24, s24p, 1, 15, fmtDur));
  // Feeding
  if (nav.has('nutrition')) { const mk = wk('milk'), mkp = wk('milk', 7), ac = wk('accept'), fc = mod('newborn') ? wk('feedCount') : null;
    card('nutrition', '🍼', L('Feeding', 'Alimentation'), fc != null ? L(`${Math.round(fc * 10) / 10} feeds a day`, `${Math.round(fc * 10) / 10} boires par jour`) : mk != null ? L(`${fmtOz(mk)} of milk a day`, `${fmtOz(mk)} de lait par jour`) : L('Nothing logged this week', 'Rien de noté cette semaine'),
      ac != null ? L(`${Math.round(ac * 100)}% of meals eaten well`, `${Math.round(ac * 100)} % des repas bien mangés`) : '', insArrow(mk, mkp, 0, metric() ? 30 / OZ_ML : 1, fmtOz)); }
  // Routine
  if (nav.has('patterns') && mod('schedule')) { const sc = wk('score', 0, d => d.score?.score), scp = wk('score', 7, d => d.score?.score), tr = trendAlerts().filter(x => !x.acked);
    card('patterns', '📊', mod('visits') ? L('Routine & visits', 'Routine et visites') : L('Routine', 'Routine'), sc != null ? L(`Score ${Math.round(sc)} on average`, `Score moyen ${Math.round(sc)}`) : L('No score yet', 'Pas encore de score'),
      tr.length ? `📈 ${esc(tr[0].text)}` : L('Nothing unusual to watch', 'Rien d’inhabituel à surveiller'), insArrow(sc, scp, 1, 3, v => Math.round(v))); }
  // Health & growth
  if (nav.has('health')) { const w = DATA.events.filter(e => e.mk === 'weight' && e.mv != null).sort((a, b) => a.s - b.s).pop(), dob = dobIdx(), pc = w && dob != null ? percentileOf('weight', w.d - dob, w.mv) : null;
    const vx = vaxStatus()?.find(x => !x.got && x.due >= todayIdx() - 60), wet = wk('wet'), poo = wk('poop');
    card('health', '🩺', L('Health & growth', 'Santé et croissance'), w ? `${fmtMeasure('weight', w.mv)}${pc ? ` · ${pc}` : ''}` : L('No weight logged', 'Aucun poids noté'),
      [vx ? L(`💉 ${vx.to ? '4–6 y' : vx.mo + '-month'} vaccines ${relDay(vx.due)}`, `💉 Vaccins de ${vx.to ? '4–6 ans' : vx.mo + ' mois'} ${relDay(vx.due)}`) : '', mod('diapers') && wet != null ? L(`${Math.round(wet * 10) / 10} wet · ${Math.round((poo ?? 0) * 10) / 10} dirty a day`, `${Math.round(wet * 10) / 10} pipi · ${Math.round((poo ?? 0) * 10) / 10} caca par jour`) : ''].filter(Boolean).join(' · ')); }
  // Check-ins
  if (nav.has('checkins')) { const T0 = todayIdx(); let n = 0; for (let D = T0 - 7; D < T0; D++) if (ciDone(D)) n++;
    card('checkins', '📝', L('Check-ins', 'Bilans'), L(`${n} of the last 7 days`, `${n} des 7 derniers jours`), ciDue() ? L('Today’s is due', 'Celui d’aujourd’hui est à faire') : ''); }
  // Birth family
  if (nav.has('contact')) { const n = DATA.events.filter(e => e.k === 'contact' && e.d >= todayIdx() - 7).length;
    card('contact', '💬', L('Birth family', 'Famille biologique'), L(`${n} contact${n === 1 ? '' : 's'} this week`, `${n} contact${n > 1 ? 's' : ''} cette semaine`), ''); }
  if (nav.has('awards')) { let n = 0; try { n = (ACH || computeAchievements()).list.filter(r => r.earned > 0).length; } catch {}
    card('awards', '🏆', L('Badges', 'Badges'), n ? L(`${n} earned`, `${n} obtenus`) : L('See your badges', 'Voir vos badges'), ''); }
  card('timeline', '🗓️', L('Timeline', 'Chronologie'), L('Every day on the 24-hour grid', 'Chaque journée sur la grille de 24 h'), '');
  card('data', '🗂️', L('Data', 'Données'), L('Table, export and data check', 'Tableau, export et vérification'), '');
  return out;
}
function renderInsights(){
  const box = $('#insightsBody'); if (!box) return;
  box.innerHTML = `<div class="m2insact"><button type="button" class="btn" data-insrep>📄 ${L('Report', 'Rapport')}</button><button type="button" class="btn" data-insdoc>🩺 ${L('Doctor visit', 'Visite médicale')}</button></div>
    <div class="m2inslist">${insightCards().map(c => c.html).join('')}</div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-insrep]')) openReport(); if (e.target.closest('[data-insdoc]')) { const a = nextDocAppt(); openDoctorReport(a?.id || null); } });
