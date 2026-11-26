/* ── Visits & Patterns tab ── */
function renderPatterns(){
  const days = visibleDays(), [a, b] = rangeBounds();
  $('#calBox').innerHTML = DAYS.size ? calendarHTML(Math.max(a, dataSpan()[0]), Math.min(b, dataSpan()[1])) + L(CAL_LEGEND_EN, CAL_LEGEND_FR) : emptyState();
  $('#calSub').textContent = !mod('schedule') ? L('Each day at a glance: tap a day for the full breakdown.', 'Chaque journée en un coup d’œil : touchez une journée pour le détail.') : L(`Routine score = how closely each day followed your routine (naps, day-sleep budget, cutoff, bedtime, night, milk, meals). Weights in Settings → Routine score. Tap a day for its breakdown.`, `Score de routine = à quel point la journée a suivi votre routine (siestes, sommeil de jour, heure limite, coucher, nuit, lait, repas). Touchez une journée pour le détail.`);
  if (!days.length) { renderCocoon(); chartEmpty('chScore', L('<b>No days in range</b>', '<b>Aucune journée dans la période</b>')); ['#findBox','#cycleBox','#visitBox'].forEach(s => $(s).innerHTML = emptyState()); return; }
  if (hasChart()) chartBase();
  const sd = days.filter(d => d.score?.score != null);
  if (!mod('schedule')) chartEmpty('chScore', '');
  mkChart('chScore', { type:'bar', data:{ labels: sd.map(d => dayLabel(d) + (d.visit ? ' ●' : '')), datasets:[
      { label:L('Routine score', 'Score de routine'), data: sd.map(d => d.score.score), backgroundColor: sd.map(d => cssVar('--' + scoreTone(d.score.score))), borderRadius:4 },
      { type:'line', label:L('7-day avg', 'Moy. 7 jours'), data: sd.map(d => mean([...Array(7)].map((_, i) => DAYS.get(d.D - i)?.score?.score))), borderColor: cssVar('--text'), borderWidth:2, pointRadius:0, tension:.3 } ] },
    options:{ scales:{ y:{ min:0, max:100 }, x:{ grid:{ display:false } } }, plugins:{ legend:{ display:false },
      tooltip:{ callbacks:{ afterLabel: c => c.datasetIndex ? '' : SCORE_PARTS.map(([k, l]) => { const p = sd[c.dataIndex].score.parts[k]; return p.v == null ? null : `${l}: ${Math.round(p.v*100)}%`; }).filter(Boolean).join('\n') } },
      guides:{ lines:[{ value:S.score.good, color:cssVar('--good'), dash:[3,3], label:'good' }, { value:S.score.ok, color:cssVar('--warn'), dash:[3,3], label:'ok' }] } },
      onClick: (_e, els) => { if (els[0]) openDrawer(sd[els[0].index].D); } }, plugins:[guidesPlugin] });
  $('#findBox').innerHTML = `<ul class="find">${findings(days).map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
  renderCocoon();
  if (!mod('visits')) return;
  const st = cycleStats(days);
  const recs = CYCLE_METRICS.filter(M => M.better).map(M => [M, recovery(M, st)]).filter(([, r]) => r);
  $('#cycleBox').innerHTML = cycleTableHTML(st) + `<div class="hint">${L('Each cell = average (n = days). <span class="cyc-k worse">red</span> / <span class="cyc-k better">green</span> = differs from baseline by more than a small tolerance, shown only when both have 2+ days. “Day before” and “+2/+3” can overlap when visits are close together. Baseline = days 3+ after a visit (or with no recent visit).', 'Chaque case = moyenne (n = jours). <span class="cyc-k worse">rouge</span> / <span class="cyc-k better">vert</span> = écart avec la référence au-delà d’une petite tolérance, seulement quand chaque case a 2 jours ou plus. « Veille » et « +2/+3 » peuvent se chevaucher quand les visites sont rapprochées. Référence = 3 jours ou plus après une visite.')}${recs.length ? '<br>' + recs.map(([M, r]) => `<b>${mL(M)}</b>: ${r}`).join(' · ') : ''}</div>`;
  $('#visitBox').innerHTML = visitTableHTML(visitRows(days)) + `<div class="hint">${L('“Score back to baseline” = days until the routine score returned to within 5 points of the baseline average', '« Retour à la normale » = nombre de jours avant que le score revienne à 5 points de la moyenne de référence')} (${Math.round(mean([...DAYS.values()].filter(d => !d.isToday && (d.since == null || d.since >= 3)).map(d => d.score?.score)) || 0)}), ${L('counting only days before the next visit.', 'en comptant seulement les jours avant la visite suivante.')}</div>`;
}

