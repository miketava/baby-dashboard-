
/* ════════════════════════════════════════════════════════════════════════════
   18. VIEW 5 — RAW DATA (rollup + event log)
   ════════════════════════════════════════════════════════════════════════════ */
let rollSort = { k:'D', dir:-1 }, logSort = { k:'s', dir:-1 };
function sortBy(arr, k, dir){ return [...arr].sort((a,b) => { const x = a[k], y = b[k]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; }); }
function thHTML(cols, st, tbl){ return `<tr>${cols.map(c => `<th data-sort="${c.k}" data-tbl="${tbl}">${c.h}${st.k === c.k ? `<span class="ar">${st.dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr>`; }
const dayTypeLabel = d => [d.visit && 'Visit', d.afterVisit && 'after', d.homeVisit && 'Home visit', d.medical && 'Medical', d.outing && 'Outing'].filter(Boolean).join(', ') || '—';
function renderData(){
  const days = visibleDays(), t = T();
  let cols = [
    { k:'D', h:'Date', f: d => fmtDay(d.D, { weekday:'short', month:'short', day:'numeric' }) + (d.isToday ? ' <span class="pill live">today</span>' : '') },
    { k:'wake', h:'Wake', f: d => fmtTime(d.wake) },
    { k:'napCount', h:'Naps', f: d => d.napCount },
    { k:'daySleep', h:'Day sleep', f: d => fmtDur(d.daySleep), c: d => d.daySleep > d.targets.maxDaySleep + 20 ? 'b' : d.daySleep > d.targets.maxDaySleep ? 'w' : '' },
    { k:'lastNapEnd', h:'Last nap end', f: d => fmtTime(d.lastNapEnd), c: d => d.lateNap ? 'w' : '' },
    { k:'wwFinal', h:'Final wake window', f: d => fmtDur(d.wwFinal), c: d => d.wwFinal == null ? '' : d.wwFinal < t.underTired - 30 ? 'b' : d.wwFinal < t.underTired ? 'w' : '' },
    { k:'bed', h:'Bedtime', f: d => fmtTime(d.bed), c: d => { const o = bedOff(d, d.bed); return o == null ? '' : o > 45 ? 'b' : o > 20 ? 'w' : ''; } },
    { k:'effort', h:'Bedtime effort', f: d => d.effort == null ? '—' : fmtDur(d.effort) + (d.firstTry === false ? ' ↺' : ''), c: d => d.effort > 45 ? 'w' : '' },
    { k:'overnightAwake', h:'Overnight awake', f: d => d.nightKnown || d.overnightAwake ? fmtDur(d.overnightAwake) : '—', c: d => d.split ? 'b' : d.overnightAwake > 0 ? 'w' : '' },
    { k:'nightSleep', h:'Night sleep', f: d => d.nightKnown ? fmtDur(d.nightSleep) : '—' },
    { k:'total24', h:'24h sleep', f: d => fmtDur(d.total24) + (d.complete24 ? '' : '*') },
    { k:'milk', h:'Milk', f: d => fmtOz(d.milk), c: d => d.milk == null ? '' : d.milk < d.targets.milkMin || d.milk > d.targets.milkMax ? 'w' : 'g' },
    { k:'water', h:'Water', f: d => fmtMl(d.water) },
    { k:'bath', h:'Bath', f: d => d.bath ? 'Y' : 'N', c: d => d.bath ? 'g' : '' },
    { k:'visit', h:'Visit', f: d => d.visit ? 'Y' : d.afterVisit ? 'after' : 'N' },
    { k:'dtype', h:'Day type', f: d => dayTypeLabel(d) },
    { k:'score', h:'Routine score', f: d => d.score?.score == null ? '—' : d.score.score + (d.score.partial ? '…' : ''), c: d => d.score?.score == null ? '' : { good:'g', warn:'w', bad:'b' }[scoreTone(d.score.score)] },
    { k:'reactNeg', h:'Difficult reactions', f: d => d.reactNeg || '', c: d => d.reactNeg ? 'w' : '' },
  ];
  for (let i = cols.length - 1; i >= 0; i--) if ((cols[i].k === 'score' || cols[i].k === 'wwFinal') && !mod('schedule') || cols[i].k === 'visit' && !mod('visits') || cols[i].k === 'water' && !mod('hydration')) cols.splice(i, 1);
  $('#rollSub').innerHTML = `One row per day · click a header to sort · click a row to inspect · night columns = night ${+S.dayBoundary > 0 ? 'after' : 'before'} the date · * partial 24h · ↺ woke within 60 min of bedtime`;
  $('#rollup').innerHTML = days.length ? `<table class="dt"><thead>${thHTML(cols, rollSort, 'roll')}</thead><tbody>${
    sortBy(days.map(d => ({ D:d.D, wake:d.wake, napCount:d.napCount, daySleep:d.daySleep, lastNapEnd:d.lastNapEnd, wwFinal:d.wwFinal, bed:d.bed, effort:d.effort, overnightAwake:d.overnightAwake, nightSleep:d.nightSleep, total24:d.total24, milk:d.milk, water:d.water, bath:d.bath?1:0, visit:d.visit?1:0, dtype:dayTypeLabel(d), score:d.score?.score ?? null, reactNeg:d.reactNeg })), rollSort.k, rollSort.dir)
      .map(r => { const o = DAYS.get(r.D); return `<tr class="clickable" data-day="${r.D}">${cols.map(c => `<td class="${c.c ? c.c(o) : ''}">${c.f(o)}</td>`).join('')}</tr>`; }).join('')}</tbody></table>` : emptyState();
  // Event log
  const evs = visibleEvents(days), ex = DATA.extras || [];
  const lcols = [
    { k:'s', h:'Date', f: e => isoOf(e.d) }, { k:'st', h:'Start', f: e => e.allDay ? '<span class="faint">all day</span>' : fmtTime(e.st) },
    { k:'t', h:'End', f: e => e.ongoing ? '<span class="pill live">now</span>' : e.t == null ? '' : fmtTime(e.t - e.d*DAY) + (e.cross ? ' +1' : '') },
    { k:'dur', h:'Duration', f: e => e.t == null ? '' : fmtDur(e.dur) }, { k:'cat', h:'Category', f: e => `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${catColor(e.cat)};margin-right:5px"></span>${esc(e.cat)}${e.local ? ' <span class="pill local">device</span>' : ''}` },
    { k:'milk', h:`Milk (${MU()})`, f: e => toDisp(e.milk) ?? '' }, { k:'water', h:'Water (ml)', f: e => e.water ?? '' },
    { k:'tagsTxt', h:'Tags', f: e => e.tags.map(t => `<span class="tagchip">${esc(t)}</span>`).join(' ') }, { k:'outcome', h:'Outcome', f: e => ocPill(e.outcome) },
    { k:'notes', h:'Notes', f: e => esc(e.notes), cls:'notes' },
    ...ex.map(x => ({ k:'x:' + x, h: esc(x) + ' <span class="faint">extra</span>', f: e => esc(e.extra?.[x] ?? '') })),
  ];
  const rows = sortBy(evs.map(e => ({ ...e, tagsTxt: e.tags.join(', '), ...Object.fromEntries(ex.map(x => ['x:' + x, e.extra?.[x] ?? null])) })), logSort.k, logSort.dir);
  $('#logSub').textContent = `${rows.length} of ${DATA.events.length} events match the current filters`;
  $('#evlog').innerHTML = rows.length ? `<table class="dt"><thead>${thHTML(lcols, logSort, 'log')}</thead><tbody>${rows.map(e => `<tr class="clickable" data-day="${e.d}" data-ev="${e.id}">${lcols.map(c => `<td class="${c.cls || ''}">${c.f(e)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : emptyState();
}
function exportCSV(){
  const days = visibleDays(), evs = visibleEvents(days), ex = DATA.extras || [];
  const head = [...HEADERS, ...ex];
  const lines = [head.map(csvCell).join(',')].concat(evs.map(e => [isoOf(e.d), e.allDay ? '' : fmtTime(e.st), e.t == null || e.ongoing ? '' : fmtTime(e.t - e.d*DAY), e.t == null || e.ongoing ? '' : e.dur, e.cat, e.milk ?? '', e.notes, e.water ?? '', e.tags.join(', '), e.outcome, ...ex.map(x => e.extra?.[x] ?? '')].map(csvCell).join(',')));
  download(`daily_log_filtered_${isoOf(todayIdx())}.csv`, lines.join('\r\n'));
  toast(`Exported ${evs.length} events`);
}

