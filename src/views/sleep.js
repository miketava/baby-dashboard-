
/* ════════════════════════════════════════════════════════════════════════════
   15. VIEW 2 — SLEEP DIAGNOSTICS
   ════════════════════════════════════════════════════════════════════════════ */
function kpiTile(k, v, s, cls=''){ return `<div class="kpi ${cls}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`; }
/** Headline sleep/milk averages for a set of days (shared with the printable report). */
function sleepSummary(days){
  const t = T(), c24 = days.filter(d => d.complete24), daySl = days.filter(d => d.napCount || d.wake != null), nights = days.filter(d => d.nightKnown);
  return { t, c24, avg24: mean(c24.map(d => d.total24)), avgDay: mean(daySl.map(d => d.daySleep)), avgBed: mean(days.map(d => d.bed)), avgWake: mean(days.map(d => d.wake)),
    avgMilk: mean(days.map(d => d.milk)), avgWater: mean(days.map(d => d.water)), avgNight: mean(nights.map(d => d.nightSleep)), nights, splitN: nights.filter(d => d.split).length,
    splitRate: nights.length ? nights.filter(d => d.split).length / nights.length : null, avgAwake: mean(nights.map(d => d.overnightAwake)) };
}
function renderSleep(){
  const days = visibleDays().filter(d => !d.isToday || d.bed != null), t = T();
  const k = sleepSummary(days), tb = parseTime(t.bedtime);
  $('#kpis').innerHTML = [
    kpiTile('Avg 24h sleep', fmtDur(k.avg24), k.c24.length ? `${k.c24.length} complete day${k.c24.length>1?'s':''}` : 'needs full days'),
    kpiTile('Avg daytime sleep', fmtDur(k.avgDay), k.avgDay == null ? '' : `target ≤ ${fmtDur(t.maxDaySleep)} · <b>${k.avgDay > t.maxDaySleep ? '+' + fmtDur(k.avgDay - t.maxDaySleep) + ' over' : 'on target'}</b>`, k.avgDay == null ? '' : k.avgDay > t.maxDaySleep + 20 ? 'bad' : k.avgDay > t.maxDaySleep ? 'warn' : 'good'),
    kpiTile('Avg bedtime', fmtTime(k.avgBed), k.avgBed == null ? '' : `target ${t.bedtime} · <b>${Math.abs(k.avgBed - tb) <= 15 ? 'on time' : (k.avgBed > tb ? fmtDur(k.avgBed - tb) + ' late' : fmtDur(tb - k.avgBed) + ' early')}</b>`, k.avgBed == null ? '' : Math.abs(k.avgBed - tb) <= 15 ? 'good' : Math.abs(k.avgBed - tb) <= 40 ? 'warn' : 'bad'),
    kpiTile('Avg wake-up', fmtTime(k.avgWake), `${days.filter(d => d.wake != null).length} mornings logged`),
    kpiTile('Avg daily milk', fmtOz(k.avgMilk), k.avgMilk == null ? '' : `target ${fmtOz(t.milkMin)}–${fmtOz(t.milkMax)} · <b>${k.avgMilk < t.milkMin ? 'below' : k.avgMilk > t.milkMax ? 'above' : 'in range'}</b>`, k.avgMilk == null ? '' : k.avgMilk < t.milkMin || k.avgMilk > t.milkMax ? 'warn' : 'good'),
    kpiTile('Split-night rate', k.splitRate == null ? '—' : Math.round(k.splitRate*100) + '%', k.nights.length ? `<b>${k.splitN}</b> of ${k.nights.length} nights ≥ ${t.splitNightMin}m awake (${t.nightStart}–${t.nightEnd})` : '', k.splitRate == null ? '' : k.splitRate > .3 ? 'bad' : k.splitRate > 0 ? 'warn' : 'good'),
  ].join('');

  $('#wwSub').innerHTML = L(`Typical range for each window (middle half of days) and the usual value, against your target. Bedtime windows under ${fmtDur(t.underTired)} risk an under-tired bedtime.`, `Plage habituelle de chaque période (la moitié centrale des jours) et valeur habituelle, par rapport à votre cible. Une dernière période sous ${fmtDur(t.underTired)} risque un coucher pas assez fatiguée.`);
  if (!days.length) { chartEmpty('chSleepDay', '<b>No days in range</b>'); ['#wwBox', '#dnBox', '#efBox'].forEach(s => $(s).innerHTML = emptyState()); ['#sdTake', '#wwTake', '#dnTake', '#efTake'].forEach(s => $(s).textContent = ''); $('#cmpTable').innerHTML = emptyState(); return; }
  if (hasChart()) chartBase();
  const q = (a, p) => { const v = a.filter(x => x != null).sort((x, y) => x - y); if (!v.length) return null; const i = (v.length - 1) * p, lo = Math.floor(i); return v[lo] + (v[Math.min(lo + 1, v.length - 1)] - v[lo]) * (i - lo); };
  const hb = (label, val, max, txt, col, sub = '') => `<div class="hb"><div class="hl">${label}${sub ? `<span>${sub}</span>` : ''}</div><div class="ht"><i style="width:${max ? clamp(val / max, 0, 1) * 100 : 0}%;background:${col}"></i></div><div class="hv">${txt}</div></div>`;

  // 1) Sleep per day: stacked night + naps, 7-day average line
  const sd = days.filter(d => d.nightKnown && !d.isToday);   // only days whose following night is logged, so a part-day doesn't look like a crash
  const tot = d => (d.nightKnown ? d.nightSleep || 0 : 0) + (d.daySleep || 0);
  const avg7 = sd.map((d, i) => { const w = sd.slice(Math.max(0, i - 6), i + 1).filter(x => x.nightKnown); return w.length >= 3 ? mean(w.map(tot)) / 60 : null; });
  mkChart('chSleepDay', { type:'bar', data:{ labels: sd.map(d => dayLabel(d) + (d.visit ? ' ●' : '')), datasets:[
      { label:L('Night', 'Nuit'), data: sd.map(d => d.nightKnown ? (d.nightSleep || 0) / 60 : null), backgroundColor:'#4f46e5', stack:'s', borderRadius:3 },
      { label:L('Naps', 'Siestes'), data: sd.map(d => (d.daySleep || 0) / 60), backgroundColor:'#a5b4fc', stack:'s', borderRadius:3 },
      { type:'line', label:L('7-day average', 'Moyenne 7 jours'), data: avg7, borderColor:'#f59e0b', borderWidth:2, pointRadius:0, tension:.3, spanGaps:true } ] },
    options:{ scales:{ x:{ stacked:true, grid:{ display:false } }, y:{ stacked:true, beginAtZero:true, ticks:{ callback: v => v + 'h' } } },
      plugins:{ tooltip:{ callbacks:{ label: c => `${c.dataset.label}: ${c.raw == null ? '—' : fmtDur(Math.round(c.raw * 60))}` } } }, onClick: (e, els, ch) => { const el = els[0]; if (el) openDrawer(sd[el.index].D); } } });
  { const full = sd.filter(d => d.nightKnown), a = mean(full.map(tot)), an = mean(full.map(d => d.nightSleep)), ad = mean(sd.map(d => d.daySleep));
    const last7 = full.slice(-7), prev7 = full.slice(-14, -7), dl = last7.length >= 4 && prev7.length >= 4 ? mean(last7.map(tot)) - mean(prev7.map(tot)) : null;
    $('#sdTake').textContent = a == null ? L('Log a few full nights to see daily totals.', 'Notez quelques nuits complètes pour voir les totaux.') : L(`About ${fmtDur(Math.round(a))} a day: ${fmtDur(Math.round(an))} at night + ${fmtDur(Math.round(ad))} of naps.${dl != null && Math.abs(dl) >= 20 ? ` The last 7 days are ${fmtDur(Math.round(Math.abs(dl)))} ${dl > 0 ? 'more' : 'less'} a day than the 7 before.` : ''}`,
      `Environ ${fmtDur(Math.round(a))} par jour : ${fmtDur(Math.round(an))} la nuit + ${fmtDur(Math.round(ad))} de siestes.${dl != null && Math.abs(dl) >= 20 ? ` Les 7 derniers jours : ${fmtDur(Math.round(Math.abs(dl)))} ${dl > 0 ? 'de plus' : 'de moins'} par jour que les 7 précédents.` : ''}`); }

  // 2) Wake windows: one row per window — typical range, usual value, target band
  const WW = [['ww1', L('Wake → Nap 1', 'Lever → sieste 1'), t.ww1, '#10b981'], ['ww2', L('Nap 1 → Nap 2', 'Sieste 1 → sieste 2'), t.ww2, '#3b82f6'], ['wwFinal', L('Last nap → bed', 'Dernière sieste → coucher'), t.wwFinal, '#8b5cf6']]
    .map(([k, lbl, tg, col]) => { const v = days.map(d => d[k]).filter(x => x != null); return { k, lbl, tg, col, n: v.length, lo: q(v, .25), mid: q(v, .5), hi: q(v, .75) }; }).filter(w => w.n >= 2);
  if (!WW.length) { $('#wwBox').innerHTML = `<p class="muted">${L('Not enough naps logged yet.', 'Pas encore assez de siestes notées.')}</p>`; $('#wwTake').textContent = ''; }
  else { const lo = Math.min(...WW.map(w => Math.min(w.lo, w.tg))) - 30, hi = Math.max(...WW.map(w => Math.max(w.hi, w.tg))) + 30, X = v => (v - lo) / (hi - lo) * 100;
    $('#wwBox').innerHTML = `<div class="wwr">${WW.map(w => `<div class="ww"><div class="hl">${esc(w.lbl)}<span>${L('target', 'cible')} ${fmtDur(w.tg)} · ${w.n} ${L('days', 'jours')}</span></div>
      <div class="wt"><b style="left:${X(w.tg - 15)}%;width:${X(w.tg + 15) - X(w.tg - 15)}%"></b><i style="left:${X(w.lo)}%;width:${Math.max(1, X(w.hi) - X(w.lo))}%;background:${w.col}"></i><u style="left:${X(w.mid)}%"></u></div>
      <div class="hv">${fmtDur(Math.round(w.mid))}<span>${fmtDur(Math.round(w.lo))}–${fmtDur(Math.round(w.hi))}</span></div></div>`).join('')}
      <div class="wwaxis"><span>${fmtDur(Math.max(0, Math.round(lo)))}</span><span>${L('shaded = target ± 15 min · bar = middle half of days · line = usual', 'zone ombrée = cible ± 15 min · barre = moitié centrale des jours · trait = habituel')}</span><span>${fmtDur(Math.round(hi))}</span></div></div>`;
    const off = WW.map(w => ({ ...w, d: w.mid - w.tg })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    $('#wwTake').textContent = Math.abs(off.d) <= 15 ? L('All wake windows are close to target on a typical day.', 'Toutes les périodes d’éveil sont proches de la cible un jour typique.')
      : L(`${off.lbl} usually runs ${fmtDur(Math.round(Math.abs(off.d)))} ${off.d > 0 ? 'longer' : 'shorter'} than the ${fmtDur(off.tg)} target.`, `${off.lbl} dure d’habitude ${fmtDur(Math.round(Math.abs(off.d)))} de ${off.d > 0 ? 'plus' : 'moins'} que la cible de ${fmtDur(off.tg)}.`); }

  // 3) Naps and the night after: three buckets, average time awake at night
  $$('#scatterSeg button').forEach(b => b.classList.toggle('on', b.dataset.x === S.scatterX));
  { const byDay = S.scatterX === 'day', cut = parseTime(t.napCutoff) ?? 960, mx = t.maxDaySleep;
    const pts = days.filter(d => d.nightKnown && (byDay ? d.napCount > 0 : d.lastNapEnd != null));
    const B = byDay ? [[L('Less day sleep', 'Moins de sommeil de jour'), L(`under ${fmtDur(mx - 45)}`, `moins de ${fmtDur(mx - 45)}`), d => d.daySleep < mx - 45], [L('Normal', 'Normal'), `${fmtDur(mx - 45)}–${fmtDur(mx)}`, d => d.daySleep >= mx - 45 && d.daySleep <= mx], [L('More day sleep', 'Plus de sommeil de jour'), L(`over ${fmtDur(mx)}`, `plus de ${fmtDur(mx)}`), d => d.daySleep > mx]]
      : [[L('Early last nap', 'Dernière sieste tôt'), L(`ended before ${fmtTime(cut - 45)}`, `finie avant ${fmtTime(cut - 45)}`), d => d.lastNapEnd < cut - 45], [L('On time', 'À l’heure'), `${fmtTime(cut - 45)}–${fmtTime(cut)}`, d => d.lastNapEnd >= cut - 45 && d.lastNapEnd <= cut], [L('Late last nap', 'Dernière sieste tard'), L(`ended after ${fmtTime(cut)}`, `finie après ${fmtTime(cut)}`), d => d.lastNapEnd > cut]];
    const R = B.map(([l, s, f]) => { const g = pts.filter(f); return { l, s, n: g.length, v: mean(g.map(d => d.overnightAwake)) }; }), mxv = Math.max(15, ...R.map(r => r.v || 0));
    $('#dnBox').innerHTML = R.map((r, i) => hb(esc(r.l), r.v || 0, mxv, r.n ? `${fmtDur(Math.round(r.v))}<span>${r.n} ${L('nights', 'nuits')}</span>` : '<span>—</span>', ['#60a5fa', '#6366f1', '#ec4899'][i], esc(r.s))).join('');
    const ok = R.filter(r => r.n >= 2), lo = ok.sort((a, b) => a.v - b.v)[0], hi = ok[ok.length - 1];
    $('#dnTake').textContent = ok.length < 2 ? L('Needs a few more logged nights in at least two groups.', 'Il faut quelques nuits de plus dans au moins deux groupes.')
      : hi.v - lo.v < 10 ? L('Nights look about the same whatever the naps were.', 'Les nuits se ressemblent, peu importe les siestes.')
      : L(`Nights were calmest after “${lo.l.toLowerCase()}” days (${fmtDur(Math.round(lo.v))} awake) and roughest after “${hi.l.toLowerCase()}” (${fmtDur(Math.round(hi.v))}).`, `Nuits les plus calmes après les jours « ${lo.l.toLowerCase()} » (${fmtDur(Math.round(lo.v))} d’éveil), les plus agitées après « ${hi.l.toLowerCase()} » (${fmtDur(Math.round(hi.v))}).`); }

  // 4) Easiest bedtime: buckets of final wake window around the target
  { const ef = days.filter(d => d.effort != null && d.wwFinal != null), T0 = t.wwFinal;
    if (ef.length < 2) { $('#efBox').innerHTML = `<p class="muted">${L('Not enough bedtime data yet. Needs a bedtime bottle or an Awake / Restless entry logged before Sleep - Night.', 'Pas encore assez de données de coucher. Il faut un biberon du coucher ou une entrée Éveil / agitation avant Sleep - Night.')}</p>`; $('#efTake').textContent = ''; }
    else { const B = [[`< ${fmtDur(T0 - 60)}`, d => d.wwFinal < T0 - 60], [`${fmtDur(T0 - 60)}–${fmtDur(T0 - 30)}`, d => d.wwFinal >= T0 - 60 && d.wwFinal < T0 - 30], [`${fmtDur(T0 - 30)}–${fmtDur(T0)}`, d => d.wwFinal >= T0 - 30 && d.wwFinal < T0], [`≥ ${fmtDur(T0)}`, d => d.wwFinal >= T0]];
      const R = B.map(([l, f]) => { const g = ef.filter(f); return { l, n: g.length, v: mean(g.map(d => d.effort)), woke: g.length ? g.filter(d => d.firstTry === false).length / g.length : null }; }), mxv = Math.max(10, ...R.map(r => r.v || 0));
      $('#efBox').innerHTML = R.map(r => hb(esc(r.l), r.v || 0, mxv, r.n ? `${fmtDur(Math.round(r.v))}<span>${r.n} ${L('nights', 'soirs')}${r.woke ? ` · ${Math.round(r.woke * 100)}% ${L('woke', 'réveillée')}` : ''}</span>` : '<span>—</span>', r.woke > .3 ? cssVar('--warn') : '#10b981', L('awake since last nap', 'éveillée depuis la sieste'))).join('');
      const ok = R.filter(r => r.n >= 2).sort((a, b) => a.v - b.v), best = ok[0], worst = ok[ok.length - 1];
      $('#efTake').textContent = !best ? '' : ok.length < 2 || worst.v - best.v < 5 ? L(`Bedtime takes about ${fmtDur(Math.round(mean(ef.map(d => d.effort))))} whatever the last wake window.`, `Le coucher prend environ ${fmtDur(Math.round(mean(ef.map(d => d.effort))))}, peu importe la dernière période d’éveil.`)
        : L(`Bedtime is quickest after ${best.l} awake (${fmtDur(Math.round(best.v))}) and slowest after ${worst.l} (${fmtDur(Math.round(worst.v))}).`, `Le coucher est le plus rapide après ${best.l} d’éveil (${fmtDur(Math.round(best.v))}) et le plus lent après ${worst.l} (${fmtDur(Math.round(worst.v))}).`); } }

  renderSoothe(days);   // v1.27: what helps her settle

  // Outings & travel impact (Feature D) — non-exclusive slices
  const quiet = d => !d.visit && !d.homeVisit && !d.medical && !d.outing && !d.car && !d.afterVisit;
  const slices = [
    ['Quiet home day', '#6366f1', quiet], ['Visit (off-site)', '#ec4899', d => d.visit], ['Day after visit', '#a855f7', d => d.afterVisit],
    [mod('visits') ? 'Car ride, no visit' : 'Car ride day', '#64748b', d => d.car && !d.visit], ['Outing / excursion', '#22c55e', d => d.outing], ['In-home visit', '#f59e0b', d => d.homeVisit], ['Medical / appt.', '#0284c7', d => d.medical],
  ].filter(([label]) => mod('visits') || !/visit/i.test(label) || label === 'In-home visit').map(([label, col, test]) => { const g = days.filter(test), n = g.filter(d => d.nightKnown);
    return { label, col, n: g.length, daySleep: mean(g.filter(d => d.napCount).map(d => d.daySleep)), carNap: mean(g.map(d => sum(d.naps.filter(x => /car/i.test(x.cat)).map(x => x.dur)))),
      bed: mean(g.map(d => d.bed)), awake: mean(n.map(d => d.overnightAwake)), split: n.length ? n.filter(d => d.split).length/n.length*100 : null, effort: mean(g.map(d => d.effort)) }; });
  const cols = [ ['Days', s => s.n, v => v, false], ['Daytime sleep', s => s.daySleep, fmtDur, true], ['…of which car naps', s => s.carNap, fmtDur, true], ['Bedtime', s => s.bed, fmtTime, false],
    ['Bedtime effort', s => s.effort, fmtDur, true, (v, b) => v - b >= 10 ? 1 : b - v >= 10 ? -1 : 0], ['Overnight awake', s => s.awake, fmtDur, true, (v, b) => v - b >= 15 ? 1 : b - v >= 15 ? -1 : 0], ['Split nights', s => s.split, v => Math.round(v) + '%', true, (v, b) => v - b >= 20 ? 1 : b - v >= 20 ? -1 : 0] ];
  const mx = cols.map(([, get]) => Math.max(...slices.map(get).filter(v => v != null), 1));
  $('#cmpTable').innerHTML = `<table class="cmp" style="min-width:760px"><thead><tr><th>Day type</th>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${
    slices.map(s => `<tr><td class="m"><span style="color:${s.col}">●</span> ${s.label}</td>${cols.map(([name, get, fmt, bar], j) => { const v = get(s);
      const base = cols[j][4] ? get(slices[0]) : null, diff = base != null && v != null && s !== slices[0] && s.n ? cols[j][4](v, base) : 0;
      return `<td class="${diff > 0 ? 'worse' : diff < 0 ? 'better' : ''}">${v == null || (!s.n && name !== 'Days') ? '<span class="faint">—</span>' : `<div class="val">${fmt(v)}</div>${bar ? `<div class="bar"><i style="width:${v/mx[j]*100}%;background:${s.col}"></i></div>` : ''}`}</td>`; }).join('')}</tr>`).join('')
  }</tbody></table><div class="hint">Orange = noticeably worse than a quiet home day, green = better. Compare “Car ride, no visit” and “Outing” against “Visit” to see whether disruption comes from travel in general or from supervised visits specifically. “Day after visit” = a non-visit day right after a visit day.</div>`;
}

