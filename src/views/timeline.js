
/* ════════════════════════════════════════════════════════════════════════════
   12. VIEW 1 — 24-HOUR SPECTRUM TIMELINE
   ════════════════════════════════════════════════════════════════════════════ */
const showOnGrid = (e, hid) => !hid.has(e.cat) && !isRibbon(e) && e.k !== 'checkin' && (S.showCare || !isCare(e));
/** Segments for one calendar day: events clipped to [D 00:00, D 24:00) — this performs the midnight split. */
function daySegments(D){
  const hid = hiddenSet(), a = D*DAY, b = a + DAY, segs = [], marks = [];
  const blockW = S.instantMode === 'block' ? +S.instantWidth || 15 : 0;
  for (const e of DATA.events) {
    if (!showOnGrid(e, hid)) continue;
    if (e.t == null) {
      if (e.s >= a && e.s < b) { if (blockW) segs.push({ e, x0: e.s - a, x1: Math.min(DAY, e.s - a + blockW), instant:true }); else marks.push({ e, x: e.s - a }); }
    } else if (e.s < b && e.t > a) {
      segs.push({ e, x0: Math.max(e.s, a) - a, x1: Math.min(e.t, b) - a, cl: e.s < a, cr: e.t > b });
    }
  }
  // Sub-lane packing for overlapping events (longest first at equal start → containers stay on top lane)
  segs.sort((p,q) => p.x0 - q.x0 || (q.x1 - q.x0) - (p.x1 - p.x0));
  const laneEnds = [];
  for (const sg of segs) { let L = laneEnds.findIndex(end => end <= sg.x0); if (L < 0) { L = laneEnds.length; laneEnds.push(0); } laneEnds[L] = sg.x1; sg.lane = L; }
  // Overlap clusters: events only share width with the events they actually overlap (used in column mode)
  for (let i = 0; i < segs.length;) {
    let j = i, end = segs[i].x1, n = 0;
    while (j < segs.length && (j === i || segs[j].x0 < end)) { end = Math.max(end, segs[j].x1); n = Math.max(n, segs[j].lane + 1); j++; }
    for (let k = i; k < j; k++) segs[k].n = n;
    i = j;
  }
  return { segs, marks, lanes: Math.max(1, laneEnds.length) };
}
function overlayHTML(m, vert){
  if (!S.overlayOn || !mod('schedule')) return '';
  const tp = m.tpl; if (!tp) return '';
  return tp.items.map(it => {
    const a = parseTime(it.start), b = it.end ? parseTime(it.end) : null; if (a == null) return '';
    const col = KIND_STYLE[it.kind]?.color || '#64748b';
    const title = `${tp.name}: ${it.label} ${it.start}${it.end ? '–' + it.end : ''}${it.optional ? ' (optional)' : ''}`;
    if (it.kind === 'meal') return `<div class="ov-meal" title="${esc(title)}" style="${vert ? `top:${a/14.4}%` : `left:${a/14.4}%`}"></div>`;
    if (b != null && b > a) {
      const pos = vert ? `top:${a/14.4}%;height:${(b-a)/14.4}%;left:0;right:0` : `left:${a/14.4}%;width:${(b-a)/14.4}%;top:0;bottom:0`;
      return `<div class="ov-band" title="${esc(title)}" style="${pos};background:${col}${it.optional ? '0a' : '14'};border-color:${col}${it.optional ? '55' : '88'}${it.optional ? ';border-style:dotted' : ''}"></div>`;
    }
    const style = it.kind === 'cutoff' ? 'solid' : 'dashed';
    const pos = vert ? `top:${a/14.4}%;left:0;right:0;border-top:2px ${style} ${col}` : `left:${a/14.4}%;top:0;bottom:0;border-left:2px ${style} ${col}`;
    return `<div class="ov-line" title="${esc(title)}" style="${pos}"></div>`;
  }).join('');
}
function dayPills(m){
  let p = '';
  p += scorePill(m);
  if (m.isToday) p += '<span class="pill live">Today</span>';
  if (m.visit) p += '<span class="pill visit">Visit</span>';
  if (m.afterVisit) p += '<span class="pill after">Day after</span>';
  if (m.homeVisit) p += '<span class="pill home">Home visit</span>';
  if (m.medical) p += '<span class="pill med">Medical</span>';
  if (m.outing) p += '<span class="pill out">Outing</span>';
  if (m.guest) p += '<span class="pill out">Guests</span>';
  if (m.split) p += `<span class="pill split" title="${m.overnightAwake} min awake overnight">Split night</span>`;
  return p;
}
/** Clickable badges for static entries (milestones, health notes, anything without a Start Time). */
function ribbonHTML(m){
  const hid = hiddenSet();
  return (m.ribbon || []).filter(e => !hid.has(e.cat)).map(e => {
    const cls = e.k === 'milestone' ? 'ms' : e.k === 'incident' ? 'hi' : e.k === 'medical' ? 'md' : 'ot';
    const txt = e.notes || e.cat;
    return `<button class="rb ${cls}" data-ev="${e.id}" title="${esc(e.cat + (e.st != null ? ' · ' + fmtTime(e.st) : '') + ': ' + txt)}">${cat(e.cat).icon} ${esc(txt.length > 18 ? txt.slice(0,17) + '…' : txt)}</button>`;
  }).join('');
}
/* v1.25.1 — Compact day labels: a day's milestones, notes and check-ins stacked into one badge of icons with counts
   (tap the day for the full list). “All labels” shows each one, as before. Default: compact on phones. */
const tlCompact = () => S.tlLabels === 'compact' || (S.tlLabels !== 'full' && innerWidth <= 720);
function ribbonStackHTML(m){
  const hid = hiddenSet(), es = (m.ribbon || []).filter(e => !hid.has(e.cat)); if (!es.length) return '';
  const by = new Map(); es.forEach(e => { const ic = cat(e.cat).icon; by.set(ic, (by.get(ic) || 0) + 1); });
  const cls = es.some(e => e.k === 'incident') ? 'hi' : es.some(e => e.k === 'milestone') ? 'ms' : es.some(e => e.k === 'medical') ? 'md' : 'ot';
  return `<span class="rb rbstack ${cls}" title="${esc(es.map(e => (e.notes || e.cat)).join(' · '))}">${[...by].map(([ic, n]) => `${ic}${n > 1 ? `<b>${n}</b>` : ''}`).join(' ')}</span>`;
}
function axisHTML(){
  const axis = Array.from({length:25}, (_,h) => `<span class="${h%2 ? 'odd' : ''}" style="left:${h/24*100}%">${h === 24 ? '24' : pad(h)}</span>`).join('');
  return `<div class="tl-head"><div></div><div class="tl-axis">${axis}</div></div>`;
}
/** One day's track (row or column). Shared by the main timeline and the Today banner. */
function dayRowHTML(m, { vert=false, today=false } = {}){
  const { segs, marks, lanes } = daySegments(m.D);
  const LH = 20, MK = 16;  // lane height, marker track height (px)
  const nS = parseTime(T().nightStart) ?? 1320, nE = parseTime(T().nightEnd) ?? 360;
  const shade = vert ? `<div class="night-shade" style="top:0;height:${nE/14.4}%;left:0;right:0"></div><div class="night-shade" style="top:${nS/14.4}%;bottom:0;left:0;right:0"></div>`
                     : `<div class="night-shade" style="left:0;width:${nE/14.4}%"></div><div class="night-shade" style="left:${nS/14.4}%;right:0"></div>`;
  const blocks = segs.map(sg => {
    const e = sg.e, col = catColor(e.cat), ink = inkFor(col);
    const late = S.overlayOn && mod('schedule') && isNap(e) && napLate(m, e);
    const cls = ['ev', sg.cl && 'cl', sg.cr && 'cr', F.q && !qMatch(e) && 'dim', F.q && qMatch(e) && 'hit', late && 'late', e.ongoing && 'ongoing', e.local && 'local'].filter(Boolean).join(' ');
    const pos = vert
      ? `top:${sg.x0/14.4}%;height:calc(${(sg.x1-sg.x0)/14.4}% - 1px);left:calc(16px + (100% - 16px) * ${sg.lane}/${sg.n});width:calc((100% - 16px)/${sg.n} - 2px)`
      : `left:${sg.x0/14.4}%;width:calc(${(sg.x1-sg.x0)/14.4}% - 1px);top:${MK + sg.lane*LH}px;height:${LH-3}px`;
    return `<div class="${cls}" data-ev="${e.id}" style="${pos};background-color:${col};color:${ink}${sg.instant ? ';opacity:.85' : ''}"><span>${cat(e.cat).icon}</span><span>${esc(e.cat.replace(/^Sleep - /,''))}${e.ongoing ? ' …' : ''}</span></div>`;
  }).join('');
  const mks = marks.map(({ e, x }) => {
    const col = catColor(e.cat), cls = ['mk', F.q && !qMatch(e) && 'dim'].filter(Boolean).join(' ');
    const pos = vert ? `top:${x/14.4}%;left:1px` : `left:${x/14.4}%;top:1px`;
    return `<div class="${cls}" data-ev="${e.id}" style="${pos};background:${col}"></div>`;
  }).join('');
  const nowL = m.D === todayIdx() ? `<div class="now-line" style="${vert ? `top:${nowMin()/14.4}%;left:0;right:0;width:auto;height:2px;bottom:auto` : `left:${nowMin()/14.4}%`}" title="Now ${fmtTime(nowMin())}"></div>` : '';
  const lab = `<div class="tl-lab"><div class="d">${fmtDay(m.D)}</div><div class="pills">${dayPills(m)}${tlCompact() ? ribbonStackHTML(m) : ribbonHTML(m)}</div></div>`;
  if (vert) return `<div class="col" data-day="${m.D}">${lab}<div class="tl-track" style="height:var(--vt)">${shade}${overlayHTML(m, true)}${blocks}${mks}${nowL}</div></div>`;
  const h = MK + lanes*LH + 2;
  return `<div class="tl-row" data-day="${m.D}">${today ? '<div class="tl-lab"></div>' : lab}<div class="tl-track" style="height:${Math.max(h, 40)}px">${shade}${overlayHTML(m, false)}${blocks}${mks}${nowL}</div></div>`;
}
function renderTimeline(){
  const days = visibleDays(); const vert = S.orientation === 'v';
  $$('#orientSeg button').forEach(b => b.classList.toggle('on', b.dataset.o === S.orientation));
  $$('#sortSeg button').forEach(b => b.classList.toggle('on', b.dataset.s === S.sortDays));
  $$('#labSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === (tlCompact() ? 'compact' : 'full')));
  $('#ovToggle').checked = S.overlayOn; $('#careToggle').checked = S.showCare;
  $('#ovTemplate').innerHTML = `<option value="auto">Auto (by day type)</option>` + S.templates.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  $('#ovTemplate').value = S.overlayTpl; $('#ovTemplate').disabled = !S.overlayOn;
  // Legend: visible categories present + overlay kinds
  const hid = hiddenSet(), present = [...new Set(DATA.events.filter(e => showOnGrid(e, hid)).map(e => e.cat))];
  const order = c => GROUPS.findIndex(g => g.id === cat(c).group);
  let lg = present.sort((a,b) => order(a)-order(b)).map(c => `<span><i style="background:${catColor(c)}"></i>${esc(c)}</span>`).join('');
  lg += `<span><i style="background:rgba(234,179,8,.25)"></i>⭐/✚ badges</span>`;
  if (S.overlayOn && mod('schedule')) lg += `<span style="margin-left:8px"><i class="ln" style="border-color:${KIND_STYLE.cutoff.color};border-top-style:solid"></i>Nap cutoff</span><span><i class="ln" style="border-color:${KIND_STYLE.bedtime.color}"></i>Bedtime</span><span><i class="ln" style="border-color:${KIND_STYLE.wake.color}"></i>Wake</span><span><i style="background:${KIND_STYLE.nap.color}22;border:1px dashed ${KIND_STYLE.nap.color}"></i>Target window</span><span>▼ Meal target</span><span><i style="box-shadow:0 0 0 2px var(--bad);background:transparent"></i>Nap past cutoff</span>`;
  lg += `<span><i style="background:repeating-linear-gradient(45deg,#818cf8 0 3px,#c7d2fe 3px 6px)"></i>In progress</span>`;
  $('#v-timeline .tl-toolbar').dataset.h = L('Display', 'Affichage');
  $('#tlOpts').title = L('Display options: layout, order, target overlay, labels, colour key', 'Options d’affichage : disposition, ordre, cibles, étiquettes, légende');
  $('#tlLegend').innerHTML = `<b class="tlk-h">${L('Colour key', 'Légende des couleurs')}</b>` + lg;
  if (multiKid() && S.kidView === 'all') return renderTimelineAll();
  if (!days.length) { $('#timeline').innerHTML = emptyState(); return; }
  const list = S.sortDays === 'desc' ? [...days].reverse() : days;
  if (vert) {
    const axis = Array.from({length:25}, (_,h) => `<span style="top:${h/24*100}%">${pad(h)}:00</span>`).join('');
    $('#timeline').innerHTML = `<div class="tl v" style="--vt:${Math.max(560, Math.min(900, innerHeight - 260))}px;--vh:74px;min-width:${Math.max(400, list.length*96 + 50)}px"><div class="tl-vaxis" style="height:var(--vt)">${axis}</div><div class="cols">${list.map(m => dayRowHTML(m, { vert:true })).join('')}</div></div>`;
  } else {
    $('#timeline').innerHTML = `<div class="tl h">${axisHTML()}${list.map(m => dayRowHTML(m)).join('')}</div>`;
  }
}
/** Score pips: one small pip per point of weight (a 20-point part has 20); partly earned pips fill partly. */
function pipsHTML(v, w){
  if (v == null) return `<div class="pips na">${'<i></i>'.repeat(Math.max(1, Math.round(w)))}</div>`;   // not scored yet
  const n = Math.max(1, Math.round(w)), earned = v * n, col = v >= .8 ? 'var(--good)' : v >= .5 ? 'var(--warn)' : 'var(--bad)';
  return `<div class="pips" title="${+(v * w).toFixed(1)} / ${w}">${Array.from({ length:n }, (_, i) => `<i><b style="width:${clamp(earned - i, 0, 1) * 100}%;background:${col}"></b></i>`).join('')}</div>`;
}
/** How a sleep entry compares with the day's plan: for a nap, the closest planned nap's start and end; for night sleep, bedtime vs target. */
function sleepVsPlan(e){
  const m = DAYS.get(e.d); if (!m?.tpl || e.st == null || !(isSleep(e))) return null;
  const fmt = (off, early, late) => Math.abs(off) <= 5 ? '' : (off > 0 ? late : early)(fmtDur(Math.abs(Math.round(off))));
  if (isNight(e)) { const r = bedRange(m); if (!r) return null; const off = e.st < r[0] ? e.st - r[0] : e.st > r[1] ? e.st - r[1] : 0;
    const s = fmt(off, x => L(`to bed ${x} early`, `couchée ${x} plus tôt`), x => L(`to bed ${x} late`, `couchée ${x} plus tard`));
    return { txt: s || L('bedtime on target', 'coucher à l’heure'), bad: Math.abs(off) > 20 }; }
  const bands = tplItems(m.tpl, 'nap').filter(b => b.end).map(b => ({ a: parseTime(b.start), b: parseTime(b.end), lbl: b.label, opt: b.optional })).filter(b => b.a != null && Math.abs(e.st - b.a) <= 120).sort((x, y) => Math.abs(e.st - x.a) - Math.abs(e.st - y.a));
  const bd = bands[0]; if (!bd) return { txt: L('not in the plan', 'hors plan'), bad: false };
  const so = e.st - bd.a, eo = e.ongoing || e.t == null ? null : (e.st + (e.dur || 0)) - bd.b;
  const parts = [fmt(so, x => L(`down ${x} early`, `endormie ${x} plus tôt`), x => L(`down ${x} late`, `endormie ${x} plus tard`)),
    eo == null ? '' : fmt(eo, x => L(`woke ${x} early`, `réveillée ${x} plus tôt`), x => L(`woke ${x} late`, `réveillée ${x} plus tard`))].filter(Boolean);
  return { txt: `${bd.lbl}${bd.opt ? ' (' + L('optional', 'facultative') + ')' : ''}: ${parts.length ? parts.join(' · ') : L('on time', 'à l’heure')}`, bad: Math.abs(so) > 20 || (eo != null && Math.abs(eo) > 20) };
}
/** One entry row (day panel and Today's entries): time, category, amounts, ✏️; press and hold / right-click to edit. */
function evLi(e, D, cont, hitId){
    const col = catColor(e.cat);
    const tm = e.allDay ? 'All day' : cont ? `00:00 – ${fmtTime(e.t - D*DAY)}` : e.t == null ? fmtTime(e.st) : `${fmtTime(e.st)} – ${e.ongoing ? 'now' : fmtTime(e.t - e.d*DAY)}`;
    const bits = [e.t != null ? fmtDur(cont ? e.t - D*DAY : e.dur) + (e.ongoing ? ' so far' : '') : e.allDay ? '' : 'instant', e.milk != null ? fmtOz(e.milk) : '', e.water != null ? fmtMl(e.water) : '',
      cont ? L(`continued from ${fmtTime(e.st)} the night before`, `suite de ${fmtTime(e.st)} la veille`) : e.cross && !e.ongoing ? L('continues past midnight', 'se poursuit après minuit') : '', e.local ? L('not in Sheet yet', 'pas encore dans la feuille') : ''].filter(Boolean).join(' · ');
    return `<li class="${e.id === hitId ? 'hit' : ''}" data-ev="${e.id}"><div class="tm">${tm}${e.raw?.by ? `<span class="by">${esc(e.raw.by)}</span>` : ''}</div><div><div class="c"><i style="background:${col}"></i>${cat(e.cat).icon} ${esc(e.cat)} ${ocPill(e.outcome)}${e.editedAt ? ` <span class="faint" title="Edited At">✎ ${L('edited', 'modifié')}</span>` : ''}${viewOnly() || DATA.source === 'demo' ? '' : `<button class="evedit" data-edit="${e.id}" title="${L('Edit or delete', 'Modifier ou supprimer')}" aria-label="${L('Edit', 'Modifier')}">✏️</button>`}</div><div class="x">${bits}</div>${(v => v ? `<div class="x vsplan ${v.bad ? 'bad' : ''}">🎯 ${esc(v.txt)}</div>` : '')(mod('schedule') && !cont ? sleepVsPlan(e) : null)}${e.tags.length ? `<div class="x">${e.tags.map(t => `<span class="tagchip">${esc(t)}</span>`).join(' ')}</div>` : ''}${e.notes ? `<div class="x" style="color:var(--text);margin-top:2px">${esc(e.notes)}</div>` : ''}${Object.entries(e.extra||{}).map(([k,v]) => `<div class="x">${esc(k)}: ${esc(v)}</div>`).join('')}</div></li>`;
  }
/** Today's plan: the template for today as a list (time · what · notes), with what actually happened next to past items. */
function planActual(it, m, used){
  const a = parseTime(it.start), b = it.end ? parseTime(it.end) : null;
  if (it.kind === 'nap' && b != null) { const n = m.naps.find(n => !used.has(n) && n.st != null && n.st < b + 45 && n.st + (n.dur || 0) > a - 45);
    if (n) { used.add(n); const so = n.st - a, eo = n.ongoing ? null : n.st + (n.dur || 0) - b, d = x => Math.abs(x) <= 5 ? '' : (x > 0 ? '+' : '−') + fmtDur(Math.abs(Math.round(x)));
      const dev = [d(so), eo == null ? '' : d(eo)]; const dv = dev.some(Boolean) ? ` <span class="faint" title="${esc(L('start / end vs plan', 'début / fin par rapport au plan'))}">(${dev.map(x => x || '✓').join(' / ')})</span>` : '';
      return n.ongoing ? L(`asleep since ${fmtTime(n.st)}`, `endormie depuis ${fmtTime(n.st)}`) + dv : `${fmtTime(n.st)}–${fmtTime((n.st + (n.dur || 0)) % DAY)}` + dv; } return null; }
  if (it.kind === 'wake') return m.wake != null ? fmtTime(m.wake) : null;
  if (it.kind === 'bedtime') return m.bed != null ? fmtTime(m.bed % DAY) : null;
  if (it.kind === 'visit') return m.visit && m.visitStart != null ? fmtTime(m.visitStart) : null;
  if (it.kind === 'meal') { const e = m.evs.find(e => isMeal(e) && !used.has(e) && e.st != null && Math.abs(e.st - a) <= 75); if (e) { used.add(e); return fmtTime(e.st); } return null; }
  return null;
}
function renderTodayPlan(){
  const card = $('#planCard'); if (!card) return;
  const m = todayMetrics(), tp = m.tpl;
  if (!mod('schedule') || !tp) { card.classList.add('hidden'); return; } card.classList.remove('hidden');
  const now = nowMin(), used = new Set(), bedT = targetBed(m);
  // two bedtime lines (bridge-nap templates): keep the one that applies today, unless it's still undecided
  let items = withRoutines(tp, m).items.map(i => ({ ...i, a: planStart(i, bedT), b: i.end && !i.beforeBed ? parseTime(i.end) : null })).filter(i => i.a != null).sort((x, y) => x.a - y.a || (x.b ?? x.a) - (y.b ?? y.a));
  const beds = items.filter(i => i.kind === 'bedtime');
  if (beds.length > 1 && bedT != null) items = items.filter(i => i.kind !== 'bedtime' || i.a === bedT);
  const isPast = i => (i.b ?? i.a) < now, isNow = i => i.b != null && i.a <= now && now <= i.b;
  const nextI = items.findIndex(i => i.a > now && !isNow(i));
  const rows = items.map((it, k) => {
    const act = planActual(it, m, used), past = isPast(it), cur = isNow(it), next = k === nextI;
    const st = cur ? `<span class="pl-tag now">${L('now', 'en cours')}</span>` : next ? `<span class="pl-tag next">${L(`in ${fmtDur(it.a - now)}`, `dans ${fmtDur(it.a - now)}`)}</span>` : '';
    const did = act ? `<span class="pl-did">✓ ${act.replace(/<(?!\/?span\b)/g, '&lt;')}</span>` : past && ['nap', 'meal', 'wake'].includes(it.kind) ? `<span class="pl-miss">${it.optional ? L('skipped', 'sautée') : L('not logged', 'non noté')}</span>` : '';
    return `<div class="pl-row${past && !cur ? ' past' : ''}${cur ? ' cur' : ''}${next ? ' nxt' : ''}" style="--k:${KIND_STYLE[it.kind]?.color || '#64748b'}">
      <div class="pl-time">${fmtTime(it.a)}${it.b != null ? `<span>–${fmtTime(it.b)}</span>` : ''}</div>
      <div class="pl-what"><b>${esc(it.label)}</b>${it.beforeBed ? ` <span class="faint">· ${L(`${it.beforeBed} min before bedtime`, `${it.beforeBed} min avant le coucher`)}</span>` : ''}${it.optional ? ` <span class="faint">(${L('optional', 'facultatif')})</span>` : ''} ${st}${it.note ? `<div class="pl-note">${esc(it.note)}</div>` : ''}</div>
      <div class="pl-act">${did}</div></div>`; });
  const nPast = items.filter((it, k) => isPast(it) && !isNow(it) && k !== nextI).length, open = !!UI.planPast;
  $('#planTitle').textContent = L('Today’s plan', 'Plan du jour');
  const pv = !m.visit ? plannedVisit(m.D) : null;
  $('#planSub').innerHTML = `${esc(tp.name)}${pv ? ` · 🗓️ ${L('visit from your calendar', 'visite de votre agenda')}` : ''}${tp.shift ? esc(shiftNote(tp)) : ''} · ${L('change it in the banner above', 'à changer dans le bandeau ci-dessus')}${beds.length > 1 ? ` · ${L('bedtime follows the bridge nap', 'le coucher suit la sieste de transition')}` : ''}`;
  $('#planList').innerHTML = (nPast ? `<button class="btn sm ghost pl-more" id="planPast">${open ? L('Hide earlier', 'Masquer le début de journée') : L(`Earlier today (${nPast}) ▸`, `Plus tôt aujourd’hui (${nPast}) ▸`)}</button>` : '')
    + `<div class="pl${open ? ' showpast' : ''}">${rows.join('')}${medPlanRows()}</div>`
    + (() => { const up = upcomingVisits(4).filter(v => v.D !== todayIdx() || m.visit); if (!Array.isArray(DATA.base?.planned)) return '';
        return `<div class="pl-up">🗓️ <b>${L('Next visits', 'Prochaines visites')}:</b> ${up.length ? up.map(v => `<b>${relDay(v.D)}</b> <span class="faint">(${esc(fmtDayShort(v.D))} ${fmtTime(v.st)}${v.en != null ? '–' + fmtTime(v.en) : ''})</span>`).join(' · ') : L('none on the calendar in the next 60 days', 'aucune à l’agenda dans les 60 prochains jours')}</div>`; })();
}
/** Today's entries: everything logged today, newest first, ready to fix. */
function renderTodayEntries(){
  const box = $('#todayEv'); if (!box) return;
  const D = todayIdx(), m = DAYS.get(D), hid = new Set();   // Today ignores the filter bar
  const carry = DATA.events.filter(e => e.t != null && e.d < D && e.t > D * DAY && !hid.has(e.cat));
  const own = (m?.evs || []).filter(e => !hid.has(e.cat)).sort((a, b) => (b.allDay ? -1 : 0) - (a.allDay ? -1 : 0) || b.s - a.s);
  const all = [...own.map(e => [e, false]), ...carry.map(e => [e, true])], open = !!UI.todayEvAll, N = 8;
  $('#todayEvSub').textContent = all.length ? L(`${all.length} entr${all.length === 1 ? 'y' : 'ies'} · newest first · ✏️ or press and hold to fix one`, `${plural(all.length, 'entrée', 'entrées', 'entrée', 'entrées')} · les plus récentes d’abord · ✏️ ou appui long pour corriger`) : '';
  box.innerHTML = all.length ? `<ul class="evlist">${(open ? all : all.slice(0, N)).map(([e, c]) => evLi(e, D, c, null)).join('')}</ul>${all.length > N ? `<button class="btn sm ghost" id="todayEvMore" style="margin-top:6px">${open ? L('Show fewer', 'Afficher moins') : L(`Show all ${all.length}`, `Tout afficher (${all.length})`)}</button>` : ''}`
    : `<p class="muted" style="margin:4px 0">${L('Nothing logged today yet.', 'Rien de noté aujourd’hui.')}</p>`;
}
/** Today tab: the live banner, today's plan, today's entries and today's row on the 24-hour grid. */
function renderTodayView(){
  IGNORE_FILTER = true;
  try { renderTodayView0(); } finally { IGNORE_FILTER = false; }
}
function renderTodayView0(){
  renderTomorrowCard(); renderTodayPlan(); renderTodayEntries();
  $('#btnCopyDay').textContent = L('📋 Copy for AI', '📋 Copier pour l’IA'); $('#btnCopyDay').title = L('Copy today’s entries as text to paste into an AI assistant', 'Copier les entrées du jour en texte pour un assistant IA');
  const m = DAYS.get(todayIdx());
  $('#todayTl').innerHTML = m ? `<div class="tl h">${axisHTML()}${dayRowHTML(m)}</div>`
    : `<p class="muted" style="margin:6px 0">${L('Nothing logged today yet. Tap ＋ to log the first thing.', 'Rien de noté aujourd’hui. Touchez ＋ pour noter la première chose.')}</p>`;
  $('#btnTodayDay').disabled = !m;
}
function emptyState(){
  return `<div class="empty"><b>No days match the current filters</b>${DATA.events.length ? 'Try widening the date range or clearing the search / day-type filter.' : 'Drop a Daily Log CSV here, connect your Google Sheet in Settings, or reload the demo data.'}</div>`;
}

/* Tooltip */
const tip = $('#tip');
const ocPill = o => o ? `<span class="oc ${OUTCOME_TONE[o] || ''}">${esc(o)}</span>` : '';
function eventHTML(e){
  const col = catColor(e.cat);
  const time = e.allDay ? 'All day' : e.t == null ? fmtTime(e.st) : `${fmtTime(e.st)} – ${e.ongoing ? 'now' : fmtTime(e.t - e.d*DAY)}${e.cross && !e.ongoing ? ' <span class="faint">(+1 day)</span>' : ''}`;
  const extras = Object.entries(e.extra || {}).map(([k,v]) => `<div><span class="faint">${esc(k)}:</span> ${esc(v)}</div>`).join('');
  return `<div class="t"><i style="background:${col}"></i>${esc(e.cat)} ${ocPill(e.outcome)}</div>
    <div>${fmtDay(e.d)} · <b>${time}</b>${e.ongoing ? ' <span class="pill live">in progress</span>' : ''}${e.local ? ' <span class="pill local">not in Sheet yet</span>' : ''}</div>
    ${e.t != null ? `<div>Duration: <b>${fmtDur(e.dur)}</b>${e.ongoing ? ' so far' : ''}</div>` : e.allDay ? '' : '<div class="faint">Instant event</div>'}
    ${e.milk != null ? `<div>Milk: <b>${fmtOz(e.milk)}</b></div>` : ''}${e.water != null ? `<div>Water: <b>${fmtMl(e.water)}</b></div>` : ''}
    ${e.tags.length ? `<div style="margin-top:3px">${e.tags.map(t => `<span class="tagchip">${esc(t)}</span>`).join(' ')}</div>` : ''}${extras}
    ${e.notes ? `<div class="n">${esc(e.notes)}</div>` : ''}`;
}
function showTip(e, x, y){
  tip.innerHTML = eventHTML(e); tip.classList.add('on');
  const r = tip.getBoundingClientRect();
  tip.style.left = clamp(x + 14, 8, innerWidth - r.width - 8) + 'px';
  tip.style.top = (y + 16 + r.height > innerHeight ? y - r.height - 12 : y + 16) + 'px';
}
function hideTip(){ tip.classList.remove('on'); }

