/* ── Cocooning: outings and guests during a quiet settling-in period ── */
const COCOON_K = ['outing', 'guest'];
/** Outing / guest categories left out of this view → never report them as “0”. */
const cocoonHidden = () => (DATA.excluded || []).filter(c => COCOON_K.includes(catKind(c)));
function cocoonPeriod(){
  const [f, l] = dataSpan(), a = parseDate(S.cocoon?.start) ?? f, weeks = Math.max(1, +S.cocoon?.weeks || 12);
  return { a, b: a + weeks * 7 - 1, weeks, last: Math.min(l, a + weeks * 7 - 1), explicit: !!S.cocoon?.start };
}
const COCOON_METRICS = () => CYCLE_METRICS.filter(M => ['score', 'awake', 'daySleep', 'effort', 'react'].includes(M.k) && (M.k !== 'score' || mod('schedule')));
/** Stats for days a..b (day indices, clipped to the cocooning period). */
function cocoonStats(a, b){
  const P = cocoonPeriod(), lo = Math.max(a, P.a), hi = Math.min(b, P.last);
  const days = [...DAYS.values()].filter(d => d.D >= lo && d.D <= hi).sort((x, y) => x.D - y.D);
  const evs = days.flatMap(d => d.cocoonEv), outs = evs.filter(e => e.k === 'outing'), guests = evs.filter(e => e.k === 'guest');
  const durs = evs.map(e => e.dur).filter(x => x > 0);
  const weeks = [];
  for (let w = Math.floor((lo - P.a) / 7); w <= Math.floor((hi - P.a) / 7); w++) {
    const wa = P.a + w * 7, wb = wa + 6, wd = days.filter(d => d.D >= wa && d.D <= wb), we = wd.flatMap(d => d.cocoonEv);
    weeks.push({ w: w + 1, a: wa, b: wb, days: wd.length, partial: wd.length < 7, out: we.filter(e => e.k === 'outing').length, guest: we.filter(e => e.k === 'guest').length, min: sum(we.map(e => e.dur || 0)) });
  }
  const full = days.filter(d => !d.isToday);
  const cDays = full.filter(d => d.cocoonEv.length && !d.visit);
  const quiet = full.filter(d => !d.cocoonEv.length && !d.visit && !d.homeVisit && !d.medical && (d.since == null || d.since >= 2));
  const cmp = COCOON_METRICS().map(M => { const v = g => g.map(M.get).filter(x => x != null && isFinite(x)); const A = v(cDays), B = v(quiet);
    return { M, c: { mean: mean(A), n: A.length }, q: { mean: mean(B), n: B.length } }; });
  return { P, lo, hi, days, outs, guests, avgMin: durs.length ? mean(durs) : null, home: days.filter(d => !d.cocoonEv.length).length, weeks, cDays, quiet, cmp };
}
function cocoonFindings(C){
  if (!C.days.length) return [];
  const f = [], wk = C.weeks.length, pct = Math.round(C.home / C.days.length * 100);
  f.push(L(`${C.outs.length} outing${C.outs.length === 1 ? '' : 's'} and ${C.guests.length} guest visit${C.guests.length === 1 ? '' : 's'} at home over ${C.days.length} day${C.days.length === 1 ? '' : 's'} (${wk} week${wk === 1 ? '' : 's'})${C.avgMin ? `, ${fmtDur(C.avgMin)} on average` : ''}; ${C.home} of ${C.days.length} days (${pct}%) had neither.`,
    `${plural(C.outs.length, '', '', 'sortie', 'sorties')} et ${plural(C.guests.length, '', '', 'visite d’invités', 'visites d’invités')} à la maison sur ${plural(C.days.length, '', '', 'jour', 'jours')} (${plural(wk, '', '', 'semaine', 'semaines')})${C.avgMin ? `, ${fmtDur(C.avgMin)} en moyenne` : ''}; ${C.home} jours sur ${C.days.length} (${pct} %) sans l’un ni l’autre.`));
  const done = C.weeks.filter(w => !w.partial);
  if (done.length >= 3) { const h = Math.floor(done.length / 2), A = mean(done.slice(0, h).map(w => w.out + w.guest)), B = mean(done.slice(h).map(w => w.out + w.guest));
    const wr = (x, y) => x === y ? L(`week ${x}`, `la semaine ${x}`) : L(`weeks ${x}–${y}`, `les semaines ${x} à ${y}`), w0 = done[0].w, wn = done[done.length - 1].w;
    f.push(L(`Outings + guests per full week: ${A.toFixed(1)} in ${wr(w0, done[h - 1].w)} vs ${B.toFixed(1)} in ${wr(done[h].w, wn)}.`,
      `Sorties + invités par semaine complète : ${A.toFixed(1).replace('.', ',')} pendant ${wr(w0, done[h - 1].w)} contre ${B.toFixed(1).replace('.', ',')} pendant ${wr(done[h].w, wn)}.`)); }
  const diffs = C.cmp.filter(x => x.c.n >= 2 && x.q.n >= 2 && x.c.mean != null && x.q.mean != null);
  if (diffs.length) f.push(L(`On outing/guest days (${C.cDays.length}) compared with quiet home days (${C.quiet.length}): `, `Jours avec sortie ou invités (${C.cDays.length}) comparés aux journées tranquilles (${C.quiet.length}) : `)
    + diffs.map(x => `${mL(x.M).toLowerCase()} ${x.M.fmt(x.c.mean)} ${L('vs', 'contre')} ${x.M.fmt(x.q.mean)}`).join(', ') + L('. Visit days are left out of both groups.', '. Les jours de visite sont exclus des deux groupes.'));
  else if (C.cDays.length < 2) f.push(L('Too few outing/guest days to compare with quiet home days.', 'Trop peu de jours avec sortie ou invités pour comparer avec les journées tranquilles.'));
  return f;
}
function cocoonCmpHTML(C){
  if (!C.cmp.some(x => x.c.n || x.q.n)) return '';
  return `<table class="dt"><thead><tr><th>${L('Measure', 'Mesure')}</th><th>${L('Outing / guest days', 'Jours avec sortie / invités')}</th><th>${L('Quiet home days', 'Journées tranquilles à la maison')}</th></tr></thead><tbody>${C.cmp.map(({ M, c, q }) => { const cls = cmpClass(M, c, q);
    return `<tr><td>${mL(M)}</td><td class="${cls}">${c.mean == null ? '—' : '<b>' + M.fmt(c.mean) + '</b>'} <span class="faint n">n=${c.n}</span></td><td>${q.mean == null ? '—' : '<b>' + M.fmt(q.mean) + '</b>'} <span class="faint n">n=${q.n}</span></td></tr>`; }).join('')}</tbody></table>`;
}
function cocoonWeeksHTML(C){
  return `<table class="dt"><thead><tr>${(FRL() ? ['Semaine','Dates','Sorties','Invités','Durée totale'] : ['Week','Dates','Outings','Guests','Total time']).map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${C.weeks.map(w => `<tr><td>${w.w}${w.partial ? ' <span class="faint">(' + w.days + L(' d', ' j') + ')</span>' : ''}</td><td>${fmtDayShort(w.a)} – ${fmtDayShort(w.b)}</td><td>${w.out}</td><td>${w.guest}</td><td>${w.min ? fmtDur(w.min) : '—'}</td></tr>`).join('')}</tbody></table>`;
}
function renderCocoon(){
  if (!mod('cocooning')) return;
  const hid = cocoonHidden();
  if (hid.length) { $('#cocoonSub').textContent = ''; $('#cocoonBox').innerHTML = `<p class="scopenote">${L('Outings and guests are not included in this view', 'Les sorties et les invités ne sont pas inclus dans cet affichage')} (${esc(hid.map(catL).join(', '))})${L(', so they can’t be summarised here.', '; ils ne peuvent donc pas être résumés ici.')}</p>`; chartEmpty('chCocoon', ''); $('#cocoonCmp').innerHTML = ''; return; }
  if (!DAYS.size) { $('#cocoonBox').innerHTML = emptyState(); return; }
  const C = cocoonStats(-Infinity, Infinity), P = C.P, now = Math.floor((Math.min(todayIdx(), P.b) - P.a) / 7) + 1;
  $('#cocoonSub').innerHTML = L(`${P.weeks}-week period from ${fmtDay(P.a, { month:'short', day:'numeric' })}${P.explicit ? '' : ' (first day of data — set the placement date in Settings → Child &amp; features)'} · ${todayIdx() > P.b ? 'ended ' + fmtDay(P.b, { month:'short', day:'numeric' }) : 'week ' + now + ' of ' + P.weeks} · counts “Outing / Excursion” and “Guest” rows`,
    `Période de ${P.weeks} semaines à partir du ${fmtDay(P.a, { month:'short', day:'numeric' })}${P.explicit ? '' : ' (premier jour des données — indiquez la date du placement dans Paramètres → Enfant et fonctions)'} · ${todayIdx() > P.b ? 'terminée le ' + fmtDay(P.b, { month:'short', day:'numeric' }) : 'semaine ' + now + ' sur ' + P.weeks} · compte les sorties et les invités`);
  const k = (v, l) => kpiTile(l, v, '');
  $('#cocoonBox').innerHTML = `<div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">${k(C.outs.length, L('outings', 'sorties'))}${k(C.guests.length, L('guest visits', 'visites d’invités'))}${k(C.avgMin ? fmtDur(C.avgMin) : '—', L('average length', 'durée moyenne'))}${k(C.days.length ? Math.round(C.home / C.days.length * 100) + ' %' : '—', L('days with neither', 'jours sans l’un ni l’autre'))}</div>
    <ul class="find">${cocoonFindings(C).map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
  if (hasChart()) { chartBase();
    mkChart('chCocoon', { type:'bar', data:{ labels: C.weeks.map(w => L('Wk ', 'Sem. ') + w.w), datasets:[
      { label:L('Outings', 'Sorties'), data: C.weeks.map(w => w.out), backgroundColor: catColor('Outing / Excursion'), stack:'a', borderRadius:3 },
      { label:L('Guests', 'Invités'), data: C.weeks.map(w => w.guest), backgroundColor: catColor('Guest'), stack:'a', borderRadius:3 } ] },
      options:{ scales:{ y:{ beginAtZero:true, ticks:{ precision:0 }, title:{ display:true, text:L('per week', 'par semaine') } }, x:{ grid:{ display:false } } },
        plugins:{ tooltip:{ callbacks:{ afterBody: it => { const w = C.weeks[it[0].dataIndex]; return `${fmtDayShort(w.a)} – ${fmtDayShort(w.b)} · ${w.min ? fmtDur(w.min) + L(' total', ' au total') : L('no time logged', 'aucune durée notée')}${w.partial ? ' · ' + w.days + L(' days so far', ' jours jusqu’ici') : ''}`; } } } } } }); }
  $('#cocoonCmp').innerHTML = cocoonCmpHTML(C) + `<p class="hint">${L('Quiet home days = no outing, guest, visit, home visit or appointment, and not right after a visit. Days with an off-site visit are left out of both columns so visits don’t blur the comparison. Coloured cells differ by more than a small tolerance (2+ days each) — small samples, a hint rather than proof.', 'Journées tranquilles = sans sortie, invités, visite, visite à domicile ni rendez-vous, et pas juste après une visite. Les jours de visite à l’extérieur sont exclus des deux colonnes pour ne pas brouiller la comparaison. Les cases colorées diffèrent au-delà d’une petite tolérance (2 jours ou plus chacune) — petits échantillons, un indice plutôt qu’une preuve.')}</p>`;
}
/** Report section (range a..b). */
function cocoonReportHTML(a, b){
  if (!mod('cocooning')) return '';
  const P = cocoonPeriod(); if (b < P.a || a > P.b) return '';
  const hid = cocoonHidden();
  if (hid.length) return `<h2>Cocooning</h2><p class="sub">${L('Outings and guests are not included in this report.', 'Les sorties et les invités ne sont pas inclus dans ce rapport.')}</p>`;
  const C = cocoonStats(a, b); if (!C.days.length) return '';
  const wkR = `${C.weeks[0].w}${C.weeks.length > 1 ? '–' + C.weeks[C.weeks.length - 1].w : ''}`;
  return `<h2>${L(`Cocooning (week ${wkR} of ${P.weeks}, from ${fmtDay(P.a, { month:'long', day:'numeric' })})`, `Cocooning (semaine ${wkR} sur ${P.weeks}, depuis le ${fmtDay(P.a, { month:'long', day:'numeric' })})`)}</h2>
    <ul class="find">${cocoonFindings(C).map(f => `<li>${esc(f)}</li>`).join('')}</ul>${cocoonWeeksHTML(C)}${C.cDays.length ? '<div style="height:8px"></div>' + cocoonCmpHTML(C) : ''}
    ${[...C.outs, ...C.guests].length ? `<p class="sub" style="margin-top:8px">${[...C.outs, ...C.guests].sort((x, y) => x.s - y.s).map(e => `${fmtDay(e.d, { month:'short', day:'numeric' })}${e.st != null ? ' ' + fmtTime(e.st) : ''}${e.dur ? ' (' + fmtDur(e.dur) + ')' : ''} — ${esc(catL(e.cat))}${S.report.includeNotes && e.notes ? ' : ' + esc(e.notes) : ''}`).join(' · ')}</p>` : ''}`;
}
