
/* ════════════════════════════════════════════════════════════════════════════
   17c. v4b BABY MODULES — newborn feeding, diapers, growth (WHO), teeth, temperature
   ════════════════════════════════════════════════════════════════════════════ */
let FEEDS = [];   // feed sessions (breast sides / bottles within 10 min of each other = one feed)
const isFeedRow = e => e.k === 'nurse' || (e.k === 'milk' && (e.milk != null || /bottle/i.test(e.cat)));
const sideOf = r => r?.tags.find(t => t === 'left' || t === 'right');
function feedSessions(){
  const rows = DATA.events.filter(e => isFeedRow(e) && e.st != null).sort((a, b) => a.s - b.s), out = [];
  let cur = null;
  for (const e of rows) {
    const end = e.t ?? e.s + (e.k === 'nurse' ? 0 : 10);
    if (cur && e.s - cur.t <= 10) { cur.rows.push(e); cur.t = Math.max(cur.t, end); }
    else { cur = { s: e.s, t: end, rows: [e] }; out.push(cur); }
  }
  out.forEach((f, i) => {
    const nr = f.rows.filter(r => r.k === 'nurse');
    Object.assign(f, { i, d: Math.floor(f.s / DAY), breastMin: sum(nr.map(r => r.dur)), left: sum(nr.filter(r => sideOf(r) === 'left').map(r => r.dur)), right: sum(nr.filter(r => sideOf(r) === 'right').map(r => r.dur)),
      oz: sum(f.rows.filter(r => r.milk != null).map(r => r.milk)), type: nr.length && f.rows.length > nr.length ? 'mixed' : nr.length ? 'breast' : 'bottle',
      firstSide: sideOf(nr[0]), lastSide: sideOf(nr[nr.length - 1]), ongoing: f.rows.some(r => r.ongoing), gap: null });
    if (i) out[i - 1].gap = f.s - out[i - 1].s;   // start-to-start interval
  });
  return out;
}
const isNightMin = m => m >= 1140 || m < 420;   // 19:00–07:00
/** Per-day newborn metrics (called from analyze for every day). */
function babyDay(m){
  const fs = FEEDS.filter(f => f.d === m.D);
  m.feedCount = fs.length;
  m.breastMin = sum(fs.map(f => f.breastMin)); m.leftMin = sum(fs.map(f => f.left)); m.rightMin = sum(fs.map(f => f.right));
  m.bottleCount = fs.filter(f => f.oz > 0).length; m.bottleOz = sum(fs.map(f => f.oz));
  const pumps = m.evs.filter(e => e.k === 'pump' && e.mv != null); m.pumpOz = pumps.length ? sum(pumps.map(e => e.mv)) : null;
  const gaps = fs.filter(f => f.gap != null && !f.ongoing);
  m.gapDay = median(gaps.filter(f => !isNightMin(f.s % DAY)).map(f => f.gap));
  m.gapNight = median(gaps.filter(f => isNightMin(f.s % DAY)).map(f => f.gap));
  m.longestGap = gaps.length ? Math.max(...gaps.map(f => f.gap)) : null;
  let i = 0, c = 0; const starts = fs.map(f => f.s); m.clusterAt = [];
  while (i < starts.length) { let j = i; while (j + 1 < starts.length && starts[j + 1] - starts[i] <= 180) j++; if (j - i + 1 >= 3) { c++; m.clusterAt.push(starts[i] % DAY); i = j + 1; } else i++; }
  m.clusters = c;
  m.tummyMin = sum(m.evs.filter(e => e.k === 'tummy').map(e => e.dur));
  m.teeth = m.evs.filter(e => e.k === 'tooth').length;
}

/* ── Child age / sex (demo data supplies its own fictional child) ── */
const demoDob = () => isoOf(todayIdx() - (DATA.base?.variant === 'newborn' ? 27 : 370));
const childDob = () => S.profile.dob || (DATA.source === 'demo' ? demoDob() : '');
const childSex = () => S.profile.sex || (DATA.source === 'demo' ? 'm' : '');
const dobIdx = () => parseDate(childDob());

/* ── WHO LMS helpers ── */
const WHO_KEY = { weight:'wfa', length:'lhfa', head:'hcfa' };
function lmsAt(tbl, day){
  if (day < 0 || day > 730) return null;
  let lo = 0, hi = tbl.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tbl[mid][0] <= day) lo = mid; else hi = mid; }
  const a = tbl[lo], b = tbl[hi]; if (a[0] === day) return a.slice(1); if (b[0] === day) return b.slice(1);
  const f = (day - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * f);
}
const whoVal = ([L, M, S], z) => L ? M * Math.pow(1 + L * S * z, 1 / L) : M * Math.exp(S * z);
const whoZ = ([L, M, S], x) => L ? (Math.pow(x / M, L) - 1) / (L * S) : Math.log(x / M) / S;
/** Standard normal CDF (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7). */
function normCdf(z){ const t = 1 / (1 + .3275911 * Math.abs(z) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-z * z / 2); return z >= 0 ? (1 + y) / 2 : (1 - y) / 2; }
const ordinal = n => { const v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ({ 1:'st', 2:'nd', 3:'rd' }[n % 10] || 'th')); };
function percentileOf(mk, day, x){
  const sex = childSex(); if (!sex || !WHO_KEY[mk]) return null;
  const lms = lmsAt(WHO_LMS[`${WHO_KEY[mk]}-${sex === 'f' ? 'girls' : 'boys'}`], day); if (!lms) return null;
  const p = normCdf(whoZ(lms, x)) * 100;
  return p < .1 ? '<0.1st' : p > 99.9 ? '>99.9th' : ordinal(Math.round(p) || 1);
}
/** Axis value in the profile's units (kg/lb decimal, cm/in). */
const growthDisp = (mk, v) => mk === 'weight' ? (metric() ? v : v / 0.45359237) : (metric() ? v : v / 2.54);
const growthUnit = mk => mk === 'weight' ? (metric() ? 'kg' : 'lb') : (metric() ? 'cm' : 'in');

/* ── Nutrition: newborn feeding card ── */
function renderFeeding(days){
  if (!mod('newborn')) return;
  const full = days.filter(d => !d.isToday && d.feedCount), all = days.filter(d => d.feedCount);
  if (!all.length) { $('#feedBox').innerHTML = `<div class="empty"><b>No feeds logged yet</b>Use ＋ Quick Log → Start Left / Start Right, or log “Breastfeed” rows with a Tags value of left or right, and “Bottle” rows with an amount.</div>`; ['chFeeds','chFeedClock'].forEach(id => chartEmpty(id, '')); $('#feedHint').textContent = ''; return; }
  const gD = median(full.map(d => d.gapDay)), gN = median(full.map(d => d.gapNight)), lg = full.map(d => d.longestGap).filter(x => x != null);
  const bm = mean(full.map(d => d.breastMin)), lr = sum(full.map(d => d.leftMin)) + sum(full.map(d => d.rightMin)), leftShare = lr ? sum(full.map(d => d.leftMin)) / lr : null;
  const box = (v, k) => `<div class="stat-box"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  $('#feedSub').textContent = `${full.length} full day${full.length === 1 ? '' : 's'} in range · a “feed” groups both sides and any top-up bottle within 10 minutes`;
  $('#feedBox').innerHTML = `<div class="stat-row">
      ${box((mean(full.map(d => d.feedCount)) ?? 0).toFixed(1), 'feeds per day')}
      ${box(gD == null ? '—' : fmtDur(gD), 'typical time between feeds (day)')}
      ${box(gN == null ? '—' : fmtDur(gN), 'typical time between feeds (night)')}
      ${box(lg.length ? fmtDur(Math.max(...lg)) : '—', `longest stretch${lg.length ? ' · avg ' + fmtDur(mean(lg)) : ''}`)}
      ${bm ? box(fmtDur(bm), `breastfeeding per day${leftShare != null ? ` · L ${Math.round(leftShare * 100)}% / R ${100 - Math.round(leftShare * 100)}%` : ''}`) : ''}
      ${full.some(d => d.bottleCount) ? box(`${(mean(full.map(d => d.bottleCount)) ?? 0).toFixed(1)}`, `bottles per day · avg ${fmtOz(mean(full.filter(d => d.bottleOz).map(d => d.bottleOz)))}`) : ''}
      ${full.some(d => d.pumpOz) ? box(fmtOz(mean(full.filter(d => d.pumpOz).map(d => d.pumpOz))), 'pumped per day') : ''}
      ${full.some(d => d.tummyMin) ? box(fmtDur(mean(full.map(d => d.tummyMin))), 'tummy time per day') : ''}
    </div>`;
  if (hasChart()) chartBase();
  const labels = all.map(dayLabel);
  mkChart('chFeeds', { type:'bar', data:{ labels, datasets:[
      { label:'Breast', data: all.map(d => FEEDS.filter(f => f.d === d.D && f.type === 'breast').length), backgroundColor: catColor('Breastfeed'), stack:'f', borderRadius:3, yAxisID:'y' },
      { label:'Bottle / mixed', data: all.map(d => FEEDS.filter(f => f.d === d.D && f.type !== 'breast').length), backgroundColor:'#38bdf8', stack:'f', borderRadius:3, yAxisID:'y' },
      { type:'line', label:'Longest stretch (h)', data: all.map(d => d.longestGap == null ? null : +(d.longestGap / 60).toFixed(1)), borderColor: cssVar('--text'), pointRadius:2, borderWidth:2, tension:.3, yAxisID:'y1' } ] },
    options:{ scales:{ x:{ stacked:true, grid:{ display:false } }, y:{ stacked:true, beginAtZero:true, title:{ display:true, text:'feeds' } }, y1:{ position:'right', beginAtZero:true, grid:{ display:false }, title:{ display:true, text:'hours' } } },
      plugins:{ tooltip:{ mode:'index' } } } });
  const pts = FEEDS.filter(f => all.some(d => d.D === f.d)).map(f => ({ x: all.findIndex(d => d.D === f.d), y: f.s % DAY, f }));
  mkChart('chFeedClock', { type:'scatter', data:{ datasets:[
      { label:'Breast', data: pts.filter(p => p.f.type === 'breast'), backgroundColor: catColor('Breastfeed'), pointRadius:4 },
      { label:'Bottle / mixed', data: pts.filter(p => p.f.type !== 'breast'), backgroundColor:'#38bdf8', pointRadius:4, pointStyle:'rectRounded' } ] },
    options:{ scales:{ x:{ min:-.5, max: all.length - .5, ticks:{ stepSize:1, callback: v => Number.isInteger(v) && labels[v] ? labels[v] : '' }, grid:{ display:false } }, y:{ reverse:true, min:0, max:DAY, ticks:{ stepSize:180, callback: hhmmTick } } },
      plugins:{ tooltip:{ callbacks:{ label: c => { const f = c.raw.f; return `${fmtTime(f.s % DAY)} · ${f.type}${f.breastMin ? ' · ' + fmtDur(f.breastMin) + (f.firstSide ? ' (' + [f.firstSide, f.lastSide !== f.firstSide ? f.lastSide : ''].filter(Boolean).join(' → ') + ')' : '') : ''}${f.oz ? ' · ' + fmtOz(f.oz) : ''}`; } } } } } });
  const cl = full.filter(d => d.clusters), hrs = cl.flatMap(d => d.clusterAt);
  $('#feedHint').innerHTML = `${cl.length ? `Cluster feeding (3+ feeds within 3 hours) on <b>${cl.length} of ${full.length}</b> days${hrs.length ? `, usually starting around ${fmtTime(r15(median(hrs)))}` : ''} — common in the early weeks.` : 'No cluster feeding (3+ feeds within 3 hours) in this range.'} Each dot on the right is one feed by time of day.`;
}

/* ── Health: diapers chart (inside Care Tracking) ── */
function diaperChartHTML(days){ return days.some(d => d.wet || d.poop) ? `<div class="chartbox" style="height:230px;margin-top:10px"><canvas id="chDiapers"></canvas></div>` : ''; }
function renderDiaperChart(days){
  if (!$('#chDiapers')) return;
  if (hasChart()) chartBase();
  const t = T(), ds = days.filter(d => d.wet || d.poop);
  mkChart('chDiapers', { type:'bar', data:{ labels: ds.map(dayLabel), datasets:[
      { label:'Wet', data: ds.map(d => d.wet), backgroundColor: catColor('Diaper - Wet'), stack:'d', borderRadius:3 },
      { label:'Dirty', data: ds.map(d => d.poop), backgroundColor: catColor('Diaper - Poop'), stack:'d', borderRadius:3 } ] },
    options:{ scales:{ x:{ stacked:true, grid:{ display:false } }, y:{ stacked:true, beginAtZero:true, ticks:{ stepSize:2 } } },
      plugins:{ guides:{ lines:[ +t.wetMin ? { value:+t.wetMin, color:catColor('Diaper - Wet'), label:`Wet target ${t.wetMin}+` } : null, +t.dirtyMin ? { value:+t.dirtyMin, color:catColor('Diaper - Poop'), dash:[2,3], label:`Dirty target ${t.dirtyMin}+`, left:true } : null ].filter(Boolean) } } }, plugins:[guidesPlugin] });
}

/* ── Health: growth (WHO percentiles) ── */
function renderGrowth(){
  if (!mod('growth')) return;
  const mk = UI.growthMk || 'weight';
  $$('#growthSeg button').forEach(b => b.classList.toggle('on', b.dataset.g === mk));
  const dob = dobIdx(), sex = childSex(), tbl = WHO_LMS[`${WHO_KEY[mk]}-${sex === 'f' ? 'girls' : 'boys'}`];
  const evs = DATA.events.filter(e => e.mk === mk && e.mv != null).sort((a, b) => a.s - b.s);
  $('#growthSub').innerHTML = dob == null ? 'Add a date of birth in Settings → Child &amp; features to plot by age and compare with WHO growth curves.'
    : !sex ? 'Measurements by age. Add the child’s sex in Settings → Child &amp; features to show WHO percentile curves.'
    : `Measurements by age with WHO Child Growth Standard percentiles (3rd–97th, birth to 2 years) — a reference to discuss with your pediatrician, not a diagnosis.${DATA.source === 'demo' && !S.profile.dob ? ' <i>(Example child.)</i>' : ''}`;
  if (!evs.length) { chartEmpty('chGrowth', `<b>No ${mk === 'head' ? 'head circumference' : mk} measurements yet</b>Log a “${mk === 'weight' ? 'Weight' : mk === 'length' ? 'Height' : 'Head Circumference'}” row with the value in the Value column (e.g. ${mk === 'weight' ? '3.4 kg or 7 lb 8 oz' : '52 cm or 20.5 in'}), or use ＋ Quick Log.`); $('#growthBox').innerHTML = ''; return; }
  if (hasChart()) chartBase();
  const age = e => dob == null ? null : e.d - dob;
  const xs = evs.map(e => dob == null ? e.d : age(e));
  const xmax = dob == null ? Math.max(...xs) : clamp(Math.max(...xs) + 30, 91, 730), xmin = dob == null ? Math.min(...xs) : 0;
  const ds = [{ label: S.profile.name || 'Child', data: evs.map((e, i) => ({ x: xs[i], y: +growthDisp(mk, e.mv).toFixed(2), e })), borderColor: cssVar('--accent'), backgroundColor: cssVar('--accent'), pointRadius:5, pointHoverRadius:7, borderWidth:2.5, showLine:true, order:0 }];
  if (dob != null && sex) {
    const Z = [[-1.881, '3rd'], [-1.036, '15th'], [0, '50th'], [1.036, '85th'], [1.881, '97th']], step = xmax <= 120 ? 3 : 7;
    Z.forEach(([z, lbl]) => ds.push({ label: lbl, data: [...Array(Math.floor((xmax - xmin) / step) + 1)].map((_, i) => { const d = Math.min(730, xmin + i * step); return { x: d, y: +growthDisp(mk, whoVal(lmsAt(tbl, d), z)).toFixed(2) }; }),
      borderColor: z === 0 ? cssVar('--good') : cssVar('--faint'), borderWidth: z === 0 ? 1.5 : 1, borderDash: Math.abs(z) > 1.5 ? [4, 4] : [], pointRadius:0, showLine:true, fill:false, order:1 }));
  }
  const xTick = v => dob == null ? fmtDayShort(v) : xmax <= 120 ? (v % 7 === 0 ? v / 7 + ' wk' : '') : (Math.round(v / 30.44) + ' mo');
  mkChart('chGrowth', { type:'scatter', data:{ datasets: ds },
    options:{ scales:{ x:{ min:xmin, max:xmax, ticks:{ stepSize: dob == null ? 1 : xmax <= 120 ? 7 : 30.44, callback: xTick }, title:{ display:true, text: dob == null ? 'date' : 'age' } },
        y:{ title:{ display:true, text: growthUnit(mk) } } },
      plugins:{ legend:{ labels:{ filter: i => i.datasetIndex === 0 || ['3rd','50th','97th'].includes(i.text) } },
        tooltip:{ filter: i => i.datasetIndex === 0, callbacks:{ label: c => { const e = c.raw.e; const p = dob != null ? percentileOf(mk, age(e), e.mv) : null; return `${fmtDay(e.d)}${dob != null ? ' · ' + ageLabel(age(e)) : ''} — ${fmtMeasure(mk, e.mv)}${p ? ' · ' + p + ' percentile (WHO)' : ''}`; } } } } } });
  // table + newborn weight summary
  let summary = '';
  if (mk === 'weight' && dob != null) {
    const birth = evs.find(e => age(e) <= 1);
    if (birth) {
      const early = evs.filter(e => age(e) <= 21), low = early.reduce((a, e) => e.mv < a.mv ? e : a, birth);
      const back = evs.find(e => e.s > low.s && e.mv >= birth.mv);
      summary = `<p class="hint">Birth weight ${fmtWeight(birth.mv)}${low !== birth ? ` · lowest ${fmtWeight(low.mv)} on day ${age(low)} (${((low.mv / birth.mv - 1) * 100).toFixed(1)}%)${back ? ` · back to birth weight by day ${age(back)}` : ' · not yet back to birth weight in the logged measurements'}` : ''}.</p>`;
    }
  }
  $('#growthBox').innerHTML = summary + `<div class="tbl-wrap" style="max-height:260px;margin-top:8px"><table class="dt"><thead><tr><th>Date</th>${dob != null ? '<th>Age</th>' : ''}<th>${mk === 'head' ? 'Head' : mk[0].toUpperCase() + mk.slice(1)}</th><th>Change</th>${dob != null && sex ? '<th>WHO percentile</th>' : ''}<th>Notes</th></tr></thead><tbody>${
    evs.slice().reverse().map((e, i, arr) => { const prev = arr[i + 1], a = age(e);
      return `<tr class="clickable" data-day="${e.d}" data-ev="${e.id}"><td>${fmtDay(e.d)}</td>${dob != null ? `<td>${ageLabel(a)}</td>` : ''}<td><b>${fmtMeasure(mk, e.mv)}</b></td><td>${prev ? (e.mv >= prev.mv ? '+' : '−') + fmtMeasure(mk, Math.abs(e.mv - prev.mv)).replace(/^0 lb /, '') : ''}</td>${dob != null && sex ? `<td>${a <= 730 ? percentileOf(mk, a, e.mv) || '—' : '<span class="faint">over 2 yrs</span>'}</td>` : ''}<td class="notes">${esc(e.notes)}</td></tr>`; }).join('')
  }</tbody></table></div>`;
}

/* ── Health: teeth ── */
/** Which tooth a "Tooth" row refers to: an exact id in Tags, or words like "bottom front left" in Tags/Notes. */
function matchTooth(e, taken){
  const txt = (e.tags.join(' ') + ' ' + (e.notes || '')).toLowerCase();
  const direct = TEETH.find(t => e.tags.includes(t.id)); if (direct) return direct.id;
  const arch = /upper|top/.test(txt) ? 'upper' : /lower|bottom/.test(txt) ? 'lower' : null;
  const type = /second molar|2nd molar/.test(txt) ? 'second-molar' : /molar/.test(txt) ? 'first-molar' : /canine|eye ?tooth|cuspid/.test(txt) ? 'canine' : /lateral|side/.test(txt) ? 'lateral' : /central|front|incisor/.test(txt) ? 'central' : null;
  const side = /\bleft\b/.test(txt) ? 'left' : /\bright\b/.test(txt) ? 'right' : null;
  const cands = TEETH.filter(t => (!arch || t.arch === arch) && (!type || t.type === type) && (!side || t.side === side) && !taken.has(t.id));
  return arch || type ? cands[0]?.id || null : null;
}
function teethState(){
  const map = new Map(), taken = new Set(), unplaced = [];
  for (const e of DATA.events.filter(x => x.k === 'tooth').sort((a, b) => a.s - b.s)) { const id = matchTooth(e, taken); if (id && !taken.has(id)) { taken.add(id); map.set(id, e); } else unplaced.push(e); }
  return { map, unplaced };
}
function toothSVG(map){
  const pos = t => { const k = t.i % 10, a = Math.PI * (.93 - .86 * k / 9), up = t.arch === 'upper';
    return { x: 160 + 128 * Math.cos(a), y: up ? 118 - 92 * Math.sin(a) : 132 + 92 * Math.sin(a) }; };
  const size = t => t.type.includes('molar') ? [26, 22] : t.type === 'canine' ? [18, 21] : [15, 21];
  return `<svg class="teeth" viewBox="0 0 320 250" role="img" aria-label="Tooth chart">
    <text x="160" y="20" text-anchor="middle" class="tlab">Upper</text><text x="160" y="244" text-anchor="middle" class="tlab">Lower</text>
    <text x="14" y="128" class="tlab">R</text><text x="300" y="128" class="tlab">L</text>
    ${TEETH.map(t => { const p = pos(t), [w, h] = size(t), e = map.get(t.id);
      const tip = `${trText(t.label) && FRL() ? trText(t.label) : t.label} · ${L('usually', 'habituellement')} ${FRL() ? t.ages.replace('mo', 'mois') : t.ages}${e ? ` · ${L('came in', 'percée le')} ${fmtDay(e.d, { month:'short', day:'numeric', year:'numeric' })}${dobIdx() != null ? ' (' + ageLabel(e.d - dobIdx()) + ')' : ''}` : L(' · tap to log', ' · toucher pour noter')}`;
      return `<g class="tooth ${e ? 'in' : ''}" data-tooth="${t.id}"><title>${esc(tip)}</title><rect x="${(p.x - w / 2).toFixed(1)}" y="${(p.y - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="${t.type.includes('molar') ? 6 : 7}"/></g>`; }).join('')}
  </svg>`;
}
function renderTeeth(){
  if (!mod('teeth')) return;
  const { map, unplaced } = teethState(), dob = dobIdx();
  const list = TEETH.filter(t => map.has(t.id)).map(t => [t, map.get(t.id)]).sort((a, b) => a[1].s - b[1].s);
  { const lt = list.length ? list[list.length - 1] : null, ln = lt ? (FRL() ? (trText(lt[0].label) || lt[0].label) : lt[0].label).toLowerCase() : '';
  $('#teethSub').textContent = L(`${map.size} of 20 baby teeth${lt ? ` · latest: ${ln}, ${fmtDayShort(lt[1].d)}` : ''} · tap a tooth to log it`, `${map.size} dents de lait sur 20${lt ? ` · la plus récente : ${ln}, ${fmtDayShort(lt[1].d)}` : ''} · touchez une dent pour la noter`); }
  // teething pattern: ±3 days around each eruption vs other days
  let pattern = '';
  const erupt = list.map(([, e]) => e.d).filter(d => [...DAYS.keys()].some(D => Math.abs(D - d) <= 3));
  if (erupt.length) {
    const near = D => erupt.some(d => Math.abs(D - d) <= 3), all = [...DAYS.values()].filter(d => !d.isToday);
    const A = all.filter(d => near(d.D)), B = all.filter(d => !near(d.D)), nA = A.filter(d => d.nightKnown), nB = B.filter(d => d.nightKnown);
    const per = (g, f) => g.length ? (sum(g.map(f)) / g.length).toFixed(1) : '—';
    if (A.length >= 2 && B.length >= 2) pattern = `<p class="hint"><b>Around ${erupt.length === 1 ? 'the eruption' : `the ${erupt.length} eruptions`} logged</b> (3 days either side, ${A.length} days) compared with other days (${B.length}): night waking ${fmtDur(mean(nA.map(d => d.overnightAwake)))} vs ${fmtDur(mean(nB.map(d => d.overnightAwake)))}, refused meals ${per(A, d => d.refused)} vs ${per(B, d => d.refused)} per day, difficult reactions ${per(A, d => d.reactNeg)} vs ${per(B, d => d.reactNeg)} per day. Small samples — a hint, not proof.</p>`;
  }
  $('#teethBox').innerHTML = `<div class="teethwrap">${toothSVG(map)}<div class="teethlist">${list.length ? `<ul class="feed">${list.map(([t, e]) => `<li data-day="${e.d}" data-ev="${e.id}"><div class="ic">🦷</div><div><div class="t">${esc(t.label)}</div><div class="m">${fmtDay(e.d, { month:'short', day:'numeric', year:'numeric' })}${dob != null ? ' · ' + ageLabel(e.d - dob) : ''}${e.notes && !/^(upper|lower)/i.test(e.notes) ? ' · ' + esc(e.notes) : ''}</div></div></li>`).join('')}</ul>` : '<div class="empty" style="padding:16px">No teeth logged yet. Tap a tooth on the chart when one comes through.</div>'}
      ${unplaced.length ? `<p class="hint">${unplaced.length} “Tooth” entr${unplaced.length > 1 ? 'ies' : 'y'} couldn't be matched to a position — add e.g. “lower central left” to its Tags.</p>` : ''}</div></div>${pattern}
    <p class="hint">Typical ages vary widely; hover a tooth for its usual range. Positions are as you look at the child (their right on your left).</p>`;
}

/** Report: latest growth measurements with WHO percentiles, and the birth-weight summary. */
function growthReportHTML(upTo){
  const dob = dobIdx(), rows = [];
  for (const mk of ['weight','length','head']) {
    const ev = DATA.events.filter(e => e.mk === mk && e.mv != null && e.d <= upTo).sort((a, b) => a.s - b.s); if (!ev.length) continue;
    const last = ev[ev.length - 1], prev = ev[ev.length - 2], a = dob == null ? null : last.d - dob;
    rows.push(`<tr><td>${{ weight:'Weight', length:'Length', head:'Head circumference' }[mk]}</td><td><b>${fmtMeasure(mk, last.mv)}</b></td><td>${fmtDay(last.d, { month:'short', day:'numeric', year:'numeric' })}${a != null ? ' (' + ageLabel(a) + ')' : ''}</td><td>${prev ? `${fmtMeasure(mk, prev.mv)} on ${fmtDayShort(prev.d)}` : '—'}</td><td>${a != null && a <= 730 ? percentileOf(mk, a, last.mv) || '—' : '—'}</td></tr>`);
  }
  return rows.length ? `<table><thead><tr><th>Measure</th><th>Latest</th><th>Date</th><th>Previous</th><th>WHO percentile</th></tr></thead><tbody>${rows.join('')}</tbody></table><p class="sub">Percentiles compare with the WHO Child Growth Standards (birth to 2 years) and are a reference for discussion with the child's doctor.</p>` : '<p class="sub">No measurements logged.</p>';
}

/* ── Health: temperature ── */
function renderTemps(days){
  const set = new Set(days.map(d => d.D)), ev = DATA.events.filter(e => e.mk === 'temp' && e.mv != null && (set.has(e.d) || !days.length)).sort((a, b) => a.s - b.s);
  if (!mod('health') || !ev.length) { $('#tempBox').innerHTML = ''; return; }
  $('#tempBox').innerHTML = `<h4 style="margin:14px 0 6px;font-size:13px;color:var(--muted)">🌡️ Temperature readings</h4><div class="chartbox" style="height:200px"><canvas id="chTemp"></canvas></div>`;
  if (hasChart()) chartBase();
  mkChart('chTemp', { type:'line', data:{ labels: ev.map(e => fmtDayShort(e.d) + ' ' + fmtTime(e.st)), datasets:[{ label:'Temperature', data: ev.map(e => +(metric() ? e.mv : e.mv * 9 / 5 + 32).toFixed(1)), borderColor:'#ef4444', backgroundColor:'#ef4444', pointRadius:4, tension:.2 }] },
    options:{ plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: c => fmtTemp(ev[c.dataIndex].mv) + (ev[c.dataIndex].notes ? ' · ' + ev[c.dataIndex].notes : '') } } }, scales:{ y:{ title:{ display:true, text: metric() ? '°C' : '°F' } }, x:{ grid:{ display:false } } } } });
}
