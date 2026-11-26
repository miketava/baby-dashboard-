/* ── Visit cycle ── */
const CYCLE = [['before','Day before'], ['0','Visit day'], ['1','+1 day'], ['2','+2 days'], ['3','+3 days'], ['base','Baseline']];
const CYCLE_FR = { before:'Veille', '0':'Jour de visite', '1':'+1 jour', '2':'+2 jours', '3':'+3 jours', base:'Référence' };
const mL = M => L(M.label, M.fr || M.label);
const CYCLE_METRICS = [
  { k:'score',   label:'Routine score', fr:'Score de routine',      get: m => m.score?.score,                          fmt: v => Math.round(v),           better: 1, tol: 5 },
  { k:'awake',   label:'Overnight awake', fr:'Éveil la nuit',    get: m => m.nightKnown ? m.overnightAwake : null,  fmt: fmtDur,                       better:-1, tol: 10 },
  { k:'split',   label:'Split nights', fr:'Nuits fragmentées',       get: m => m.nightKnown ? (m.split ? 100 : 0) : null, fmt: v => Math.round(v) + '%',  better:-1, tol: 15 },
  { k:'daySleep',label:'Daytime sleep', fr:'Sommeil de jour',      get: m => m.napCount ? m.daySleep : null,          fmt: fmtDur,                       better: 0, tol: 20 },
  { k:'carNap',  label:'…of which in the car', fr:'…dont en auto', get: m => m.napCount ? m.carNap : null,          fmt: fmtDur,                       better: 0, tol: 15 },
  { k:'bed',     label:'Bedtime', fr:'Coucher',            get: m => m.bed,                                   fmt: fmtTime,                      better: 0, tol: 15 },
  { k:'effort',  label:'Bedtime effort', fr:'Effort au coucher',     get: m => m.effort,                                fmt: fmtDur,                       better:-1, tol: 10 },
  { k:'accept',  label:'Meal acceptance', fr:'Repas acceptés',    get: m => m.accept == null ? null : m.accept * 100, fmt: v => Math.round(v) + '%',    better: 1, tol: 10 },
  { k:'milk',    label:'Milk', fr:'Lait',               get: m => m.milk,                                  fmt: fmtOz,                        better: 0, tol: 1.5 },
  { k:'react',   label:'Difficult reactions / day', fr:'Réactions difficiles / jour', get: m => m.reactNeg,                       fmt: v => v.toFixed(1),            better:-1, tol: .4 },
];
/** Buckets a day belongs to (a day can be both "+2" and "day before" the next visit). Baseline = 3+ days after a visit. */
function cycleBuckets(m){
  const b = [];
  if (m.until === 1 && !m.visit) b.push('before');
  if (m.since === 0) b.push('0'); else if (m.since === 1) b.push('1'); else if (m.since === 2) b.push('2'); else if (m.since === 3) b.push('3');
  if (m.since == null || m.since >= 3) b.push('base');
  return b;
}
function cycleStats(days){
  const ds = days.filter(d => !d.isToday), out = {};
  for (const M of CYCLE_METRICS) {
    out[M.k] = {};
    for (const [bk] of CYCLE) { const v = ds.filter(d => cycleBuckets(d).includes(bk)).map(M.get).filter(x => x != null && isFinite(x)); out[M.k][bk] = { mean: mean(v), n: v.length }; }
  }
  return out;
}
/** worse / better / '' vs baseline, only when both cells have ≥ 2 days. */
function cmpClass(M, cell, base){ if (!M.better || cell.n < 2 || base.n < 2 || cell.mean == null || base.mean == null) return ''; const d = cell.mean - base.mean; if (Math.abs(d) <= M.tol) return ''; return d * M.better > 0 ? 'better' : 'worse'; }
/** "back to baseline by +2" style recovery text for one metric. */
function recovery(M, st){
  // "not recovered" = worse than baseline by more than the tolerance (being better counts as recovered)
  const base = st[M.k].base, dev = k => { const c = st[M.k][k]; return c.n >= 2 && base.n >= 2 && c.mean != null && (c.mean - base.mean) * M.better < -M.tol; };
  if (!dev('0') && !dev('1')) return null;
  for (const k of ['1','2','3']) { const c = st[M.k][k]; if (c.n >= 2 && !dev(k)) return L(`back within the baseline range by day +${k}`, `revenu dans la normale au jour +${k}`); }
  return st[M.k]['3'].n >= 2 ? L('still different from baseline at day +3', 'encore différent de la référence au jour +3') : L('not enough later days yet to see when it settles', 'trop tôt pour voir quand il se stabilise');
}
function cycleTableHTML(st, { report=false } = {}){
  return `<table class="${report ? '' : 'cmp cyc'}"><thead><tr><th>${report ? L('Measure', 'Mesure') : ''}</th>${CYCLE.map(([k, l]) => `<th>${L(l, CYCLE_FR[k])}</th>`).join('')}</tr></thead><tbody>${
    CYCLE_METRICS.map(M => `<tr><td class="m">${mL(M)}</td>${CYCLE.map(([k]) => { const c = st[M.k][k], cls = k === 'base' ? '' : cmpClass(M, c, st[M.k].base);
      return `<td class="${cls}">${c.mean == null ? '<span class="faint">—</span>' : `<b>${M.fmt(c.mean)}</b>`} <span class="faint n">n=${c.n}</span></td>`; }).join('')}</tr>`).join('')
  }</tbody></table>`;
}
/** Night attached to a day according to the day-boundary setting. */
const nightAfter = D => +S.dayBoundary > 0 ? DAYS.get(D) : DAYS.get(D + 1);
/** One row per off-site visit: timing, handovers, car naps, that night, next day, recovery. */
function visitRows(days){
  const set = new Set(days.map(d => d.D)), baseScore = mean([...DAYS.values()].filter(d => !d.isToday && (d.since == null || d.since >= 3)).map(d => d.score?.score));
  return [...DAYS.values()].filter(m => m.visit && set.has(m.D)).sort((a,b) => a.D - b.D).map(m => {
    const v = m.evs.filter(e => e.k === 'visit' && e.st != null).sort((a,b) => a.s - b.s)[0];
    const ho = m.handovers, pickE = ho.find(e => e.tags.includes('pick-up') || /pick/i.test(e.notes)) || (ho.length > 1 ? ho[ho.length-1] : null), dropE = ho.find(e => e.tags.includes('drop-off') || /drop/i.test(e.notes)) || (ho.length > 1 ? ho[0] : null);
    const n = nightAfter(m.D), next = DAYS.get(m.D + 1);
    let rec = null;
    if (baseScore != null) for (let k = 1; k <= 6; k++) { const d = DAYS.get(m.D + k); if (!d || d.visit || d.isToday) { rec = rec ?? (d?.visit ? 'next visit first' : null); break; } if (d.score?.score != null && d.score.score >= baseScore - 5) { rec = k; break; } }
    return { m, v, drop: dropE?.outcome || '', pick: pickE?.outcome || '', pickNote: pickE?.notes || '', tpl: m.tpl?.name || '', carNap: m.carNap,
      night: n?.nightKnown ? n.overnightAwake : null, split: n?.split, nextScore: next?.score?.score ?? null, react: m.reactNeg + (next?.reactNeg || 0), rec };
  });
}
function visitTableHTML(rows, { report=false } = {}){
  if (!rows.length) return `<p class="${report ? 'sub' : 'muted'}">${L('No off-site visits in this range.', 'Aucune visite à l’extérieur dans cette période.')}</p>`;
  const oc = o => o ? (report ? esc(ocL(o)) : ocPill(o)) : '<span class="faint">—</span>';
  return `<table class="${report ? '' : 'dt'}"><thead><tr>${(FRL() ? ['Visite','Heure','Départ','Retour','Siestes en auto','Score du jour','Éveil la nuit suivante','Score du lendemain','Réactions difficiles (jour + lendemain)','Retour à la normale'] : ['Visit','Time','Drop-off','Pick-up','Car naps','Visit-day score','That night awake','Next-day score','Difficult reactions (day + next)','Score back to baseline']).map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr ${report ? '' : `class="clickable" data-day="${r.m.D}"`}><td>${fmtDay(r.m.D)}</td><td>${r.v ? fmtTime(r.v.st) + (r.v.t != null ? '–' + fmtTime(r.v.t - r.m.D*DAY) : '') : '—'}</td><td>${oc(r.drop)}</td><td>${oc(r.pick)}</td><td>${fmtDur(r.carNap)}</td>
      <td>${r.m.score?.score ?? '—'}</td><td class="${!report && r.split ? 'b' : ''}">${r.night == null ? '—' : fmtDur(r.night)}${r.split ? L(' (split)', ' (fragmentée)') : ''}</td><td>${r.nextScore ?? '—'}</td><td>${r.react}</td>
      <td>${r.rec == null ? '—' : typeof r.rec === 'number' ? plural(r.rec, 'day', 'days', 'jour', 'jours') : r.rec === 'next visit first' ? L(r.rec, 'visite suivante avant') : r.rec}</td></tr>`).join('')
  }</tbody></table>`;
}
const pctOf = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
/** Plain, neutral, count-carrying sentences for the report and the Patterns tab. */
function findings(days){
  const F = [], ds = days.filter(d => !d.isToday), st = cycleStats(ds), visits = ds.filter(d => d.visit);
  const vl = visits.length ? ' (' + visits.map(d => fmtDayShort(d.D)).join(', ') + ')' : '';
  F.push(L(`${ds.length} full day${ds.length === 1 ? '' : 's'} logged${mod('visits') ? `, including ${visits.length} off-site visit${visits.length === 1 ? '' : 's'}${vl}` : ''}.`,
    `${plural(ds.length, 'journée complète consignée', 'journées complètes consignées', 'journée complète consignée', 'journées complètes consignées')}${mod('visits') ? `, dont ${plural(visits.length, '', '', 'visite à l’extérieur', 'visites à l’extérieur')}${vl}` : ''}.`));
  if (mod('visits')) {
  const fm = (k, b) => { const c = st[k][b]; return c.mean == null ? null : CYCLE_METRICS.find(M => M.k === k).fmt(c.mean); };
  const n = (k, b) => st[k][b].n;
  // nights
  const vn = ds.filter(d => d.visit && nightAfter(d.D)?.nightKnown).map(d => nightAfter(d.D)), bn = ds.filter(d => (d.since == null || d.since >= 3) && d.nightKnown);
  if (vn.length >= 2 && bn.length >= 2) { const a1 = fmtDur(mean(vn.map(x => x.overnightAwake))), a2 = fmtDur(mean(bn.map(x => x.overnightAwake))), s1 = vn.filter(x => x.split).length, s2 = bn.filter(x => x.split).length;
    F.push(L(`On the night after a visit, overnight wake time averaged ${a1} (${vn.length} nights; ${s1} split) compared with ${a2} on baseline nights (${bn.length} nights; ${s2} split).`,
      `La nuit suivant une visite, l’éveil nocturne a été en moyenne de ${a1} (${vn.length} nuits; ${s1} fragmentées), contre ${a2} les nuits de référence (${bn.length} nuits; ${s2} fragmentées).`)); }
  // routine score + recovery
  if (n('score','0') >= 2 && n('score','base') >= 2) {
    const rec = recovery(CYCLE_METRICS[0], st);
    F.push(L(`Routine score averaged ${fm('score','0')} on visit days${n('score','1') ? `, ${fm('score','1')} the day after` : ''}${n('score','2') ? ` and ${fm('score','2')} two days after` : ''}, compared with ${fm('score','base')} on baseline days (3+ days after a visit)${rec ? '; it was ' + rec : ''}.`,
      `Le score de routine a été en moyenne de ${fm('score','0')} les jours de visite${n('score','1') ? `, ${fm('score','1')} le lendemain` : ''}${n('score','2') ? ` et ${fm('score','2')} le surlendemain` : ''}, contre ${fm('score','base')} les jours de référence (3 jours ou plus après une visite)${rec ? '; ' + (/^trop/.test(rec) ? 'il est ' + rec : 'il est ' + rec) : ''}.`));
  }
  // meals
  if (n('accept','0') + n('accept','1') >= 2 && n('accept','base') >= 2) {
    const vis = ds.filter(d => (d.since === 0 || d.since === 1) && d.accept != null), base = ds.filter(d => (d.since == null || d.since >= 3) && d.accept != null);
    const p1 = Math.round(mean(vis.map(d => d.accept)) * 100), p2 = Math.round(mean(base.map(d => d.accept)) * 100), r1_ = sum(vis.map(d => d.refused)), r2_ = sum(base.map(d => d.refused));
    F.push(L(`Meal acceptance was ${p1}% on visit days and the day after (${vis.length} days, ${r1_} refused meals) versus ${p2}% on baseline days (${base.length} days, ${r2_} refused).`,
      `Les repas ont été acceptés à ${p1} % les jours de visite et le lendemain (${vis.length} jours, ${r1_} repas refusés), contre ${p2} % les jours de référence (${base.length} jours, ${r2_} refusés).`));
  }
  // reactions
  const grp = test => { const g = ds.filter(test); return [g.filter(d => d.reactNeg).length, g.length]; };
  const [rv, tv] = grp(d => d.since === 0), [r1, t1] = grp(d => d.since === 1), [rb, tb] = grp(d => d.since == null || d.since >= 3);
  if (tv + t1 && tb) F.push(L(`Difficult reactions (e.g. clingy, tantrum, crying) were logged on ${rv} of ${tv} visit days and ${r1} of ${t1} days after a visit, compared with ${rb} of ${tb} baseline days.`,
    `Des réactions difficiles (p. ex. besoin d’être collé, crise, pleurs) ont été notées ${rv} jours de visite sur ${tv} et ${r1} lendemains de visite sur ${t1}, contre ${rb} jours de référence sur ${tb}.`));
  // handovers
  const picks = visitRows(ds).map(r => r.pick).filter(Boolean);
  if (picks.length) { const c = x => picks.filter(p => p === x).length; F.push(L(`Child's state at pick-up (${picks.length} logged): `, `État de l’enfant au retour (${picks.length} notés) : `) + OUTCOMES.handover.map(x => `${ocL(x)} ${c(x)}`).join(', ') + '.'); }
  // car naps
  if (n('carNap','0') >= 2) F.push(L(`On visit days, daytime sleep averaged ${fm('daySleep','0')}, of which ${fm('carNap','0')} was in the car (baseline days: ${fm('daySleep','base') ?? '—'} daytime sleep).`,
    `Les jours de visite, le sommeil de jour a été en moyenne de ${fm('daySleep','0')}, dont ${fm('carNap','0')} en auto (jours de référence : ${fm('daySleep','base') ?? '—'}).`));
  } else {
    const nn = ds.filter(d => d.nightKnown), sc = ds.map(d => d.score?.score).filter(x => x != null);
    if (nn.length) { const a = fmtDur(mean(nn.map(d => d.overnightAwake))), sp = nn.filter(d => d.split).length; F.push(L(`Overnight wake time averaged ${a} across ${nn.length} nights; ${sp} were split nights.`, `L’éveil nocturne a été en moyenne de ${a} sur ${nn.length} nuits; ${sp} nuits fragmentées.`)); }
    if (sc.length) F.push(L(`Routine score averaged ${Math.round(mean(sc))} (range ${Math.min(...sc)}–${Math.max(...sc)}) over ${sc.length} days.`, `Score de routine moyen de ${Math.round(mean(sc))} (de ${Math.min(...sc)} à ${Math.max(...sc)}) sur ${sc.length} jours.`));
    const ac = ds.filter(d => d.accept != null); if (ac.length) { const p = Math.round(mean(ac.map(d => d.accept)) * 100), r = sum(ac.map(d => d.refused)); F.push(L(`Meal acceptance averaged ${p}% over ${ac.length} days (${r} refused meals).`, `Repas acceptés en moyenne à ${p} % sur ${ac.length} jours (${r} repas refusés).`)); }
    const rx = ds.filter(d => d.reactNeg); if (ds.some(d => d.reactNeg || d.reactPos)) F.push(L(`Difficult reactions were logged on ${rx.length} of ${ds.length} days.`, `Des réactions difficiles ont été notées ${rx.length} jours sur ${ds.length}.`));
  }
  F.push(L(`These are associations in a small number of days, not proof of cause; teething, illness or schedule changes can affect any single day. Each figure shows how many days it is based on.`, `Il s’agit d’associations sur un petit nombre de jours, pas d’une preuve de cause; les dents, la maladie ou un changement d’horaire peuvent influencer une journée. Chaque chiffre indique sur combien de jours il repose.`));
  return F;
}
/** How entries reached the log: real time vs transcribed later (uses Logged At / Noted At columns). */
function provenance(events){
  const ev = events.filter(e => !e.local);
  const ref = e => e.allDay ? e.d*DAY + DAY - 1 : (e.t != null && !e.ongoing ? e.t : e.s);
  const stamped = ev.filter(e => e.loggedAt != null), noted = ev.filter(e => e.notedAt != null);
  const rt = stamped.filter(e => e.loggedAt - ref(e) <= 120), sameDay = stamped.filter(e => e.loggedAt - ref(e) > 120 && e.loggedAt <= (e.d + 1) * DAY + 360);
  const fromNotes = noted.filter(e => e.loggedAt != null && e.loggedAt - e.notedAt > 120);
  return { total: ev.length, stamped: stamped.length, realtime: rt.length, sameDay: sameDay.length, later: stamped.length - rt.length - sameDay.length,
    pre: ev.filter(e => e.preTracking).length, none: ev.filter(e => e.loggedAt == null && !e.preTracking).length, noted: noted.length, fromNotes: fromNotes.length };
}

