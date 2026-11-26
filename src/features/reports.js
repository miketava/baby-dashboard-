/* ════════════════════════════════════════════════════════════════════════════
   19. REPORT BUILDER — fortnightly social-worker reports, "all visits to date" summary, saved copies
   ════════════════════════════════════════════════════════════════════════════ */
let repMode = 'period', repIdx = null, repSnap = null;
let REPS = Object.assign({ comments:{}, snaps:[] }, lsGet(LS_REPORTS, {}));
const saveReps = () => { if (!lsSet(LS_REPORTS, REPS)) toast('Storage is full — download older saved copies and delete them', true); };
function periodBounds(idx){
  const [first, last] = dataSpan(), len = +S.report.periodDays || 14, anchor = parseDate(S.report.anchor) ?? first;
  const latest = Math.max(0, Math.floor((last - anchor) / len));
  const k = idx == null ? latest : clamp(idx, 0, latest);
  return { a: anchor + k*len, b: anchor + k*len + len - 1, idx: k, latest, len };
}
function reportRange(){
  if (repMode === 'filters') { const days = visibleDays(); return { days, a: days[0]?.D, b: days[days.length-1]?.D, key:'F', title:L('Current dashboard filters', 'Filtres actuels du tableau de bord') }; }
  if (repMode === 'visits') { const v = [...DAYS.values()].filter(d => d.visit).map(d => d.D), [f, l] = dataSpan(); const a = v.length ? Math.max(f, Math.min(...v) - 1) : f;
    return { days: daysIn(a, l), a, b: l, key:'V', title:L('All visits to date', 'Toutes les visites à ce jour') }; }
  const p = periodBounds(repIdx), prev = p.idx > 0 ? periodBounds(p.idx - 1) : null;
  return { days: daysIn(p.a, p.b), a: p.a, b: p.b, key:'P' + isoOf(p.a), title:L(`Reporting period ${p.idx + 1}`, `Période ${p.idx + 1}`), p, prevDays: prev ? daysIn(prev.a, prev.b) : null };
}
const daysIn = (a, b) => [...DAYS.values()].filter(d => d.D >= a && d.D <= b).sort((x,y) => x.D - y.D);
function openReport(mode){ if (mode) repMode = mode; repSnap = null; renderReport(); $('#report').classList.add('on'); document.body.style.overflow = 'hidden'; }
function closeReport(){ $('#report').classList.remove('on'); document.body.style.overflow = ''; }
/** Headline numbers for a set of days (used for the period-vs-previous comparison). */
function periodMetrics(days){
  const ds = days.filter(d => !d.isToday), n = ds.filter(d => d.nightKnown), k = sleepSummary(ds);
  return [
    [L('Routine score (avg)', 'Score de routine (moy.)'), mean(ds.map(d => d.score?.score)), v => Math.round(v), 1],
    [L('Daytime sleep', 'Sommeil de jour'), k.avgDay, fmtDur, 0], [L('Night sleep', 'Sommeil de nuit'), k.avgNight, fmtDur, 1], [L('Overnight awake', 'Éveil la nuit'), k.avgAwake, fmtDur, -1],
    [L('Split nights', 'Nuits fragmentées'), n.length ? n.filter(d => d.split).length / n.length * 100 : null, v => Math.round(v) + '%', -1],
    [L('Bedtime', 'Coucher'), k.avgBed, fmtTime, 0], [L('Milk / day', 'Lait / jour'), k.avgMilk, fmtOz, 0],
    [L('Meal acceptance', 'Repas acceptés'), mean(ds.map(d => d.accept)) == null ? null : mean(ds.map(d => d.accept)) * 100, v => Math.round(v) + '%', 1],
    [L('Days with difficult reactions', 'Jours avec réactions difficiles'), ds.length ? ds.filter(d => d.reactNeg).length / ds.length * 100 : null, v => Math.round(v) + '%', -1],
    [L('Off-site visits', 'Visites à l’extérieur'), ds.filter(d => d.visit).length, v => v, 0],
  ];
}
function renderReport(){
  $$('#repSeg button').forEach(b => b.classList.toggle('on', b.dataset.n === repMode));
  const R = reportRange(), O = S.report;
  $('#repNav').classList.toggle('hidden', repMode !== 'period');
  if (R.p) { $('#repPeriod').textContent = `${fmtDayShort(R.a)} – ${fmtDayShort(R.b)} (${R.p.idx + 1} of ${R.p.latest + 1})`; $('#repPrev').disabled = R.p.idx === 0; $('#repNext').disabled = R.p.idx === R.p.latest; }
  $('#repSnaps').innerHTML = `<option value="">${REPS.snaps.length ? `Saved copies (${REPS.snaps.length})…` : 'No saved copies'}</option>` + REPS.snaps.slice().reverse().map(x => `<option value="${x.id}">${esc(x.label)} · saved ${new Date(x.created).toLocaleDateString(LOC())}</option>`).join('');
  $('#repCal').checked = O.includeCalendar; $('#repDaily').checked = O.includeDaily; $('#repNotes').checked = O.includeNotes;
  if (document.activeElement !== $('#repComment')) $('#repComment').value = REPS.comments[R.key] || '';
  $('#repOpts').classList.toggle('hidden', !!repSnap);
  if (repSnap) { const x = REPS.snaps.find(y => y.id === repSnap); $('#repBody').innerHTML = `<div class="snapnote">Saved copy from ${new Date(x.created).toLocaleString(LOC())} — unchanged since it was saved. <a href="#" id="repLive">Back to live report</a></div>` + x.html; return; }
  const days = R.days; if (!days.length) { $('#repBody').innerHTML = L('<p>No data in this range.</p>', '<p>Aucune donnée dans cette période.</p>'); return; }
  const ds = days.filter(d => !d.isToday), t = T(), k = sleepSummary(ds);
  const evs = DATA.events.filter(e => days.some(d => d.D === e.d));
  const note = e => O.includeNotes ? esc(e.notes || catL(e.cat)) : esc(catL(e.cat) + (e.tags.length ? ' — ' + e.tags.join(', ') : ''));
  const li = e => `<li><b>${fmtDay(e.d, { month:'short', day:'numeric' })}${e.st != null ? ' ' + fmtTime(e.st) : ''}</b> — ${note(e)}${e.outcome ? ` <span class="${e.outcome === 'Follow-up Needed' ? 'flag' : ''}">[${esc(ocL(e.outcome))}]</span>` : ''}${O.includeNotes && e.tags.length ? ' <span class="sub">(' + esc(e.tags.join(', ')) + ')</span>' : ''}</li>`;
  const kg = (label, v) => `<div><span class="sub">${label}</span><b>${v}</b></div>`;
  const sec = (title, body) => `<h2>${title}</h2>${body}`;
  const ms = evs.filter(e => e.k === 'milestone'), med = evs.filter(e => e.k === 'medical'), inc = evs.filter(e => e.k === 'incident'), meds = evs.filter(e => e.k === 'meds');
  const foods = foodStats(evs).sort((a,b) => b.n - a.n), refused = foods.filter(f => f.acc.Refused).map(f => f.food);
  const dataStart = dataSpan()[0], newF = foodStats(DATA.events).filter(f => f.first >= R.a && f.first <= R.b && (f.isNew || f.first > dataStart + 6));
  // reactions: tag counts
  const rTags = {}; evs.filter(e => e.reactNeg || e.reactPos).forEach(e => e.tags.filter(x => REACT_NEG.includes(x) || REACT_POS.includes(x)).forEach(x => rTags[x] = (rTags[x] || 0) + 1));
  const rList = Object.entries(rTags).sort((a,b) => b[1] - a[1]);
  // comparison with previous period
  let cmp = '';
  if (R.prevDays?.length) {
    const A = periodMetrics(ds), Bm = periodMetrics(R.prevDays);
    cmp = sec(L('Compared with the previous period', 'Comparaison avec la période précédente'), `<table><thead><tr><th>${L('Measure', 'Mesure')}</th><th>${L('This period', 'Cette période')}</th><th>${L('Previous', 'Précédente')} (${fmtDayShort(R.prevDays[0].D)}–${fmtDayShort(R.prevDays[R.prevDays.length-1].D)})</th><th>${L('Change', 'Écart')}</th></tr></thead><tbody>${
      A.map(([l, v, f, better], i) => { const pv = Bm[i][1]; const d = v != null && pv != null ? v - pv : null;
        const ch = d == null ? '—' : Math.abs(d) < 1e-9 ? L('no change', 'aucun changement') : (d > 0 ? '▲ ' : '▼ ') + (f === fmtTime || f === fmtDur ? fmtDur(Math.abs(d)) : f === fmtOz ? fmtOz(Math.abs(d)) : l.includes('%') || f(1).toString().includes('%') ? Math.round(Math.abs(d)) + L(' pts', ' points') : Math.round(Math.abs(d) * 10) / 10);
        return `<tr><td>${l}</td><td>${v == null ? '—' : f(v)}</td><td>${pv == null ? '—' : f(pv)}</td><td>${ch}</td></tr>`; }).join('')}</tbody></table>`);
  }
  const pv = provenance(evs), st = cycleStats(days);
  const W = S.score.weights, wTxt = SCORE_PARTS.filter(([x]) => +W[x]).map(([x, l]) => `${L(l, SCORE_FR[x]).toLowerCase()} (${W[x]})`).join(', ');
  const visits = visitRows(days);
  const comment = (REPS.comments[R.key] || '').trim();
  $('#repBody').innerHTML = `
    <h1>${esc(O.childLabel || titleL())} — ${L('Routine &amp; Wellbeing Summary', 'Sommaire de la routine et du bien-être')}</h1>
    <div class="sub">${R.title}: ${fmtDay(R.a, { month:'long', day:'numeric', year:'numeric' })} – ${fmtDay(R.b, { month:'long', day:'numeric', year:'numeric' })} · ${ds.length} ${L('full days', 'jours complets')}${O.caseRef ? L(' · Ref: ', ' · Dossier : ') + esc(O.caseRef) : ''}${O.preparedBy ? L(' · Prepared by ', ' · Préparé par ') + esc(O.preparedBy) : ''} · ${L('generated', 'produit le')} ${stampL(new Date())}</div>
    ${scopeNoteHTML()}
    ${sec(L('Summary', 'Résumé'), `<ul class="find">${findings(days).map(f => `<li>${esc(f)}</li>`).join('')}</ul>`)}
    ${O.includeCalendar ? sec(L('Calendar', 'Calendrier'), calendarHTML(R.a, Math.min(R.b, dataSpan()[1]), { clickable:false, all:true }) + `<p class="sub">${L('Ring = routine score (0–100). 😴 naps on schedule · 🌙 unbroken night · 🍽 ate well · 😊 positive mood · ⭐ milestone · ⏰ late nap · ⚡ split night · 🚫 refused meal · 😣 difficult reaction · ✚ health note · 🏠 visit · 🏡 home visit · 🩺 medical.', 'Anneau = score de routine (0–100). 😴 siestes à l’heure · 🌙 nuit sans réveil · 🍽 a bien mangé · 😊 bonne humeur · ⭐ étape · ⏰ sieste tardive · ⚡ nuit fragmentée · 🚫 repas refusé · 😣 réaction difficile · ✚ note de santé · 🏠 visite · 🏡 visite à domicile · 🩺 médical.')}${mod('cocooning') ? L(' · 👥 guests · 🛒 outing', ' · 👥 invités · 🛒 sortie') : ''}</p>`) : ''}
    ${cocoonReportHTML(R.a, R.b)}
    ${contactReportHTML(ds)}
    ${checkinReportHTML(ds)}
    ${mod('visits') ? sec(L(`Visits (${visits.length})`, `Visites (${visits.length})`), visitTableHTML(visits, { report:true })) : ''}
    ${!mod('visits') ? '' : sec(L('Before, during and after visits', 'Avant, pendant et après les visites'), cycleTableHTML(st, { report:true }) + `<p class="sub">${L('Average per day; n = number of days. Baseline = days 3 or more after a visit. With visits close together a day can count as both "+2" and "Day before".', 'Moyenne par jour; n = nombre de jours. Référence = 3 jours ou plus après une visite. Quand les visites sont rapprochées, une journée peut compter à la fois comme « +2 » et « Veille ».')}</p>`)}
    ${cmp}
    ${sec(L('Sleep', 'Sommeil'), `<div class="kgrid">${kg(L('Avg total sleep / 24h', 'Sommeil total moyen / 24 h'), fmtDur(k.avg24))}${kg(L('Avg night sleep', 'Sommeil de nuit moyen'), fmtDur(k.avgNight))}${kg(L('Avg daytime sleep', 'Sommeil de jour moyen'), fmtDur(k.avgDay))}${kg(L('Avg naps / day', 'Siestes / jour'), (mean(ds.map(d => d.napCount)) ?? 0).toFixed(1))}
      ${kg(L('Avg wake-up', 'Lever moyen'), fmtTime(k.avgWake))}${kg(L('Avg bedtime', 'Coucher moyen'), fmtTime(k.avgBed))}${kg(L('Avg overnight awake', 'Éveil nocturne moyen'), fmtDur(k.avgAwake))}${kg(L('Split nights (≥' + t.splitNightMin + 'm)', 'Nuits fragmentées (≥ ' + t.splitNightMin + ' min)'), k.nights.length ? `${k.splitN} ${L('of', 'sur')} ${k.nights.length}` : '—')}</div>`)}
    ${sec(L('Feeding', 'Alimentation'), `<div class="kgrid">${kg(L('Avg milk / day', 'Lait moyen / jour'), fmtOz(k.avgMilk))}${kg(L('Milk target', 'Cible de lait'), `${fmtOz(t.milkMin)}–${fmtOz(t.milkMax)}`)}${kg(L('Meal acceptance', 'Repas acceptés'), mean(ds.map(d => d.accept)) == null ? '—' : Math.round(mean(ds.map(d => d.accept)) * 100) + '%')}${kg(L('Avg water / day', 'Eau moyenne / jour'), k.avgWater == null ? L('not logged', 'non consignée') : fmtMl(k.avgWater))}</div>
      <p>${foods.length ? `<b>${L('Most frequent foods:', 'Aliments les plus fréquents :')}</b> ${foods.slice(0, 10).map(f => esc(f.food) + ' (' + f.n + ')').join(', ')}.` : ''} ${refused.length ? `<b>${L('Refused at least once:', 'Refusés au moins une fois :')}</b> ${refused.map(esc).join(', ')}.` : ''} ${newF.length ? `<b>${L('New foods introduced:', 'Nouveaux aliments introduits :')}</b> ${newF.map(f => esc(f.food) + (allergenOf(f.food) ? ' [' + allergenOf(f.food) + ']' : '')).join(', ')}.` : ''}</p>`)}
    ${mod('newborn') && ds.some(d => d.feedCount) ? sec(L('Newborn feeding &amp; diapers', 'Boires et couches'), `<div class="kgrid">${kg(L('Feeds / day', 'Boires / jour'), (mean(ds.filter(d => d.feedCount).map(d => d.feedCount)) ?? 0).toFixed(1))}${kg(L('Typical gap (day)', 'Intervalle typique (jour)'), fmtDur(median(ds.map(d => d.gapDay))))}${kg(L('Typical gap (night)', 'Intervalle typique (nuit)'), fmtDur(median(ds.map(d => d.gapNight))))}${kg(L('Longest stretch', 'Plus long intervalle'), fmtDur(Math.max(0, ...ds.map(d => d.longestGap || 0))))}
      ${kg(L('Breastfeeding / day', 'Allaitement / jour'), fmtDur(mean(ds.filter(d => d.feedCount).map(d => d.breastMin))))}${kg(L('Bottles / day', 'Biberons / jour'), (mean(ds.filter(d => d.feedCount).map(d => d.bottleCount)) ?? 0).toFixed(1))}${kg(L('Wet diapers / day', 'Couches mouillées / jour'), ds.some(d => d.wet) ? (sum(ds.map(d => d.wet)) / ds.length).toFixed(1) : '—')}${kg(L('Dirty diapers / day', 'Couches souillées / jour'), ds.some(d => d.poop) ? (sum(ds.map(d => d.poop)) / ds.length).toFixed(1) : '—')}</div>`) : ''}
    ${mod('growth') ? sec(L('Growth', 'Croissance'), growthReportHTML(R.b)) : ''}
    ${mod('teeth') && evs.some(e => e.k === 'tooth') ? sec(L('Teeth', 'Dents'), `<ul>${evs.filter(e => e.k === 'tooth').map(li).join('')}</ul><p class="sub">${L(`${teethState().map.size} of 20 baby teeth logged in total.`, `${teethState().map.size} dents de lait sur 20 notées au total.`)}</p>`) : ''}
    ${sec(L('Mood &amp; reactions', 'Humeur et réactions'), rList.length ? `<p>${rList.map(([x, c]) => `${esc(x)} × ${c}`).join(' · ')}</p><p class="sub">${L(`Counted from Behaviour / Handover / wake-up entries (tags, outcomes and reaction words in notes). Difficult reactions were logged on ${ds.filter(d => d.reactNeg).length} of ${ds.length} days.`, `Compté à partir des entrées de comportement, de transition et de réveil (étiquettes, résultats et mots de réaction dans les notes). Des réactions difficiles ont été notées ${ds.filter(d => d.reactNeg).length} jours sur ${ds.length}.`)}</p>` : L('<p class="sub">No reactions logged in this period.</p>', '<p class="sub">Aucune réaction notée dans cette période.</p>'))}
    ${sec(L('Milestones', 'Étapes du développement'), ms.length ? `<ul>${ms.map(li).join('')}</ul>` : NONE())}
    ${sec(L('Medical appointments', 'Rendez-vous médicaux'), med.length ? `<ul>${med.map(li).join('')}</ul>` : NONE())}
    ${sec(L('Health notes &amp; incidents', 'Notes de santé et incidents'), inc.length ? `<ul>${inc.map(li).join('')}</ul>` : NONE())}
    ${meds.length ? sec(L('Medications given', 'Médicaments donnés'), `<ul>${meds.map(li).join('')}</ul>`) : ''}
    ${O.includeDaily ? sec(L('Day by day', 'Jour par jour'), `<table><thead><tr>${(FRL() ? ['Date','Score','Lever','Siestes','Sommeil de jour','Coucher','Éveil la nuit','Lait','Repas','Événements'] : ['Date','Score','Wake','Naps','Day sleep','Bedtime','Night awake','Milk','Meals','Events']).map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>
      ${days.map(d => `<tr><td>${fmtDay(d.D)}</td><td>${d.score?.score ?? '—'}${d.score?.partial ? '…' : ''}</td><td>${fmtTime(d.wake)}</td><td>${d.napCount}</td><td>${fmtDur(d.daySleep)}</td><td>${fmtTime(d.bed)}</td><td>${d.nightKnown ? fmtDur(d.overnightAwake) : '—'}</td><td>${fmtOz(d.milk)}</td><td>${d.accept == null ? '—' : Math.round(d.accept*100) + '%'}</td><td>${[d.visit && L('visit', 'visite'), d.homeVisit && L('home visit', 'visite à domicile'), d.medical && L('appointment', 'rendez-vous'), d.outing && L('outing', 'sortie'), d.guest && L('guests', 'invités'), d.reactNeg && plural(d.reactNeg, 'difficult reaction', 'difficult reactions', 'réaction difficile', 'réactions difficiles'), d.incidents && L('health note', 'note de santé'), d.milestones && L('milestone', 'étape')].filter(Boolean).join(', ')}</td></tr>`).join('')}
    </tbody></table>`) : ''}
    ${comment ? sec(L("Caregiver's comments", 'Commentaires du parent'), `<p style="white-space:pre-wrap">${esc(comment)}</p>`) : ''}
    ${sec(L('How these figures are produced', 'Comment ces chiffres sont produits'), methodsHTML(evs, pv, wTxt, t))}`;
}
/** “How these figures are produced” (both languages). */
function methodsHTML(evs, pv, wTxt, t){
  const src = esc(DATA.source === 'demo' ? L('demo data', 'données de démonstration') : DATA.label);
  if (!FRL()) return `<ul>
      <li><b>Source:</b> ${src}, ${evs.length} entries for these dates. Each entry is one row of the family's daily care log.</li>
      ${!mod('workerReports') ? '' : `<li><b>When entries were recorded:</b> ${pv.stamped ? `${pv.realtime} of ${pv.stamped} timestamped entries (${pctOf(pv.realtime, pv.stamped)}) were logged within 2 hours of the event, ${pv.sameDay} later the same day, ${pv.later} afterwards.` : 'entries in this period carry no Logged At timestamp.'}${pv.noted ? ` ${pv.noted} entries carry the time of the original handwritten/phone note (Noted At)${pv.fromNotes ? `, of which ${pv.fromNotes} were transcribed into the log later` : ''}.` : ''}${pv.pre ? ` ${pv.pre} ${pv.pre === 1 ? 'entry was' : 'entries were'} made before timestamps were switched on.` : ''}${pv.none ? ` ${pv.none} ${pv.none === 1 ? 'entry has' : 'entries have'} no timestamp.` : ''}${evs.some(e => e.editedAt) ? ` ${evs.filter(e => e.editedAt).length} ${evs.filter(e => e.editedAt).length === 1 ? 'entry was' : 'entries were'} corrected after first being logged (recorded in Edited At).` : ''}</li>`}
      ${!mod('schedule') ? '' : `<li><b>Routine score:</b> 0–100 per day measuring how closely the day followed the family's own defined routine — weighted ${wTxt}. Components with no data that day are left out; at least three are required.</li>`}
      <li><b>Nights</b> are attributed to the evening before (a 2 a.m. waking belongs to the previous day). A <b>split night</b> is ≥ ${t.splitNightMin} minutes awake between ${t.nightStart} and ${t.nightEnd}.${mod('visits') ? ' <b>Visits</b> are off-site supervised visits; in-home visits and appointments are listed separately.' : ''}</li>
      ${(DATA.excluded || []).length ? `<li><b>Not included:</b> ${DATA.excluded.map(c => '“' + esc(c) + '”').join(', ')} — left out of every figure in this report.</li>` : ''}
      <li><b>Limits:</b> figures describe patterns in a small number of days and do not establish cause. Teething, illness, travel and schedule changes affect individual days.</li></ul>`;
  return `<ul>
      <li><b>Source :</b> ${src}, ${evs.length} entrées pour ces dates. Chaque entrée est une ligne du journal de soins quotidien de la famille.</li>
      ${!mod('workerReports') ? '' : `<li><b>Moment de la saisie :</b> ${pv.stamped ? `${pv.realtime} des ${pv.stamped} entrées horodatées (${pctOf(pv.realtime, pv.stamped)}) ont été saisies moins de 2 heures après l’événement, ${pv.sameDay} plus tard le même jour, ${pv.later} par la suite.` : 'les entrées de cette période ne portent pas d’horodatage.'}${pv.noted ? ` ${pv.noted} entrées portent l’heure de la note originale (papier ou téléphone)${pv.fromNotes ? `, dont ${pv.fromNotes} retranscrites plus tard dans le journal` : ''}.` : ''}${pv.pre ? ` ${pv.pre} ${pv.pre === 1 ? 'entrée a été faite' : 'entrées ont été faites'} avant l’activation de l’horodatage.` : ''}${pv.none ? ` ${pv.none} ${pv.none === 1 ? 'entrée n’a' : 'entrées n’ont'} pas d’horodatage.` : ''}${evs.some(e => e.editedAt) ? ` ${evs.filter(e => e.editedAt).length} ${evs.filter(e => e.editedAt).length === 1 ? 'entrée a été corrigée' : 'entrées ont été corrigées'} après la saisie initiale (consigné dans Edited At).` : ''}</li>`}
      ${!mod('schedule') ? '' : `<li><b>Score de routine :</b> de 0 à 100 par jour, il mesure à quel point la journée a suivi la routine définie par la famille elle-même — pondération : ${wTxt}. Les éléments sans données ce jour-là sont exclus; il en faut au moins trois.</li>`}
      <li><b>Les nuits</b> sont rattachées à la soirée précédente (un réveil à 2 h appartient à la veille). Une <b>nuit fragmentée</b> compte ${t.splitNightMin} minutes d’éveil ou plus entre ${t.nightStart} et ${t.nightEnd}.${mod('visits') ? ' Les <b>visites</b> sont les visites supervisées à l’extérieur; les visites à domicile et les rendez-vous sont présentés à part.' : ''}</li>
      ${(DATA.excluded || []).length ? `<li><b>Non inclus :</b> ${DATA.excluded.map(c => '« ' + esc(catL(c)) + ' »').join(', ')} — exclus de tous les chiffres de ce rapport.</li>` : ''}
      <li><b>Limites :</b> ces chiffres décrivent des tendances sur un petit nombre de jours et n’établissent pas de lien de cause. Les dents, la maladie, les déplacements et les changements d’horaire influencent certaines journées.</li></ul>`;
}
const NONE = () => L('<p class="sub">None logged in this period.</p>', '<p class="sub">Aucune entrée dans cette période.</p>');
function reportStandaloneHTML(){
  const css = `body{font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;max-width:860px;margin:24px auto;padding:0 20px}h1{font-size:22px;margin:0 0 2px}h2{font-size:15px;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #e5e7eb}.sub{color:#6b7280}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e5e7eb}th{background:#f3f4f6}.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kgrid div{border:1px solid #e5e7eb;border-radius:8px;padding:8px}.kgrid b{display:block;font-size:17px}.flag{color:#b91c1c;font-weight:700}.cal-h,.cal-g{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.cal-h span{font-size:11px;font-weight:700;color:#6b7280;text-align:center}.cc{border:1px solid #e5e7eb;border-radius:10px;padding:6px;min-height:78px;display:flex;flex-direction:column;gap:3px}.cc.off{opacity:.4;border-style:dashed}.cc.v{border-top:4px solid #ec4899}.cd{font-size:12px;font-weight:700}.vtag{font-size:9.5px;background:#fce7f3;color:#db2777;padding:0 5px;border-radius:99px}.cr,.ci{display:flex;justify-content:center;flex-wrap:wrap;gap:2px}.di{font-size:12px;padding:2px;border-radius:5px}.di.g{background:#d1fae5}.di.b{background:#fee2e2}.di.n{background:#f3f4f6}.faint,.n{color:#9ca3af;font-size:11px}.snapnote{display:none}.scopenote{background:#eef2ff;padding:8px 12px;border-radius:8px;margin:10px 0}:root{--good:#059669;--warn:#d97706;--bad:#dc2626;--grid2:#e5e7eb;--text:#111827;--faint:#9ca3af}`;
  return `<!DOCTYPE html><html lang="${FRL() ? 'fr' : 'en'}"><head><meta charset="utf-8"><title>${esc($('#repBody h1')?.textContent || 'Report')}</title><style>${css}</style></head><body>${$('#repBody').innerHTML}</body></html>`;
}

