/* ════════════════════════════════════════════════════════════════════════════
   19b. DOCTOR VISIT SUMMARY (v1.46, spec “V6 — pediatrician visit summary”)
   One or two printed pages for a pediatrician: digestible numbers rather than raw rows, what doctors usually ask
   about, and anything unusual since the last appointment. Uses the report machinery (print / PDF, saved copies,
   EN/FR). Never includes Private Notes, family-contact details or visit / placement details.
   ════════════════════════════════════════════════════════════════════════════ */
let docAppt = null;          // { id, title, D, st } when opened for a calendar appointment
let docSince = 'appt';       // 'appt' (since the last Medical / Appointment row) or a number of days
const DOC_MAX_DAYS = 180;
const CO = () => FRL() ? '\u00a0:' : ':';   // French puts a space before the colon
const ALLERGEN_FR = { Egg:'Œuf', Dairy:'Produits laitiers', Peanut:'Arachide', 'Tree nut':'Noix', Wheat:'Blé', Soy:'Soya', Fish:'Poisson', Shellfish:'Crustacés', Sesame:'Sésame' };

/** Most recent Medical / Appointment row before `endD` (the visit we're preparing for). */
const lastMedRow = endD => DATA.events.filter(e => e.k === 'medical' && e.d < endD).sort((a, b) => b.d - a.d || b.s - a.s)[0] || null;
/** Accepted calendar appointment (not a home visit) for the child, today or later, within `days`. */
const nextDocAppt = (days = 14) => upcomingAppts(20).find(a => !a.home && a.D - todayIdx() <= days) || null;

function docRange(){
  const T0 = todayIdx(), endD = docAppt ? Math.min(docAppt.D, T0 + 1) : T0 + 1;   // the period ends today (never in the future)
  const last = lastMedRow(endD), b = T0;
  let a, since;
  if (docSince === 'appt' && last) { a = Math.max(last.d + 1, T0 - DOC_MAX_DAYS); since = 'appt'; }
  else { const n = docSince === 'appt' ? 30 : +docSince || 30; a = T0 - n + 1; since = n; }
  if (a > b) a = b;
  const len = b - a + 1;
  return { days: daysIn(a, b), a, b, len, last, since, prevDays: daysIn(a - len, a - 1), prevA: a - len, prevB: a - 1,
    key: 'D' + (docAppt ? docAppt.id : isoOf(a)), title: L('Doctor visit', 'Visite médicale') };
}
function openDoctorReport(apptId){
  const ap = apptId ? apptList().find(a => a.id === apptId) : null;
  docAppt = ap ? { id: ap.id, title: ap.title, D: ap.D, st: ap.st } : docAppt;
  docSince = 'appt'; openReport('doctor');
}

/* ── Rounding (spec: hours to 5 min, oz to 0.5, ml to 10, per-day figures to one decimal at most) ── */
const r5 = m => m == null || !isFinite(m) ? null : Math.round(m / 5) * 5;
const dDur = m => m == null || !isFinite(m) ? '—' : fmtDur(r5(m));
const dTime = m => m == null || !isFinite(m) ? '—' : fmtTime(r5(m));
const dNum = (x, dp = 1) => x == null || !isFinite(x) ? '—' : (Math.round(x * 10 ** dp) / 10 ** dp).toLocaleString(LOC(), { maximumFractionDigits: dp });
const dOz = v => v == null || !isFinite(v) ? '—' : metric() ? Math.round(v * OZ_ML / 10) * 10 + ' ml' : dNum(Math.round(v * 2) / 2) + ' oz';
const dMl = v => v == null || !isFinite(v) ? '—' : Math.round(v / 10) * 10 + ' ml';
const medianV = a => median(a.filter(x => x != null && isFinite(x)));
const rangeV = (a, f) => { const v = a.filter(x => x != null && isFinite(x)); return v.length > 1 ? `${f(Math.min(...v))}–${f(Math.max(...v))}` : ''; };
const pctL = p => p == null ? '—' : p < .5 ? '<1' + (FRL() ? 'er' : 'st') : p > 99.5 ? '>99' + (FRL() ? 'e' : 'th') : FRL() ? Math.round(p) + (Math.round(p) === 1 ? 'er' : 'e') : ordinal(Math.round(p));

/** Total sleep in 24 h recommended for the age, minutes [lo, hi] (AASM consensus, 4 months +; NSF for younger babies). */
function sleepBandFor(ageD){
  if (ageD == null || ageD < 0) return null;
  return ageD < 122 ? [14 * 60, 17 * 60] : ageD < 365 ? [12 * 60, 16 * 60] : ageD < 1096 ? [11 * 60, 14 * 60] : ageD < 2192 ? [10 * 60, 13 * 60] : [9 * 60, 12 * 60];
}
/** “7 months 2 weeks” under a year, the usual label after. */
function docAge(ageD){
  if (ageD == null || ageD < 0) return '';
  if (ageD >= 365) return ageLabel(ageD).replace(/ old$/, '');
  if (ageD < 56) { const w = Math.floor(ageD / 7), d = ageD % 7; return L(`${w} week${w === 1 ? '' : 's'}${d ? ` ${d} day${d === 1 ? '' : 's'}` : ''}`, `${w} semaine${w > 1 ? 's' : ''}${d ? ` ${d} jour${d > 1 ? 's' : ''}` : ''}`); }
  const mo = Math.floor(ageD / 30.44), wk = Math.floor((ageD - mo * 30.44) / 7);
  return L(`${mo} month${mo === 1 ? '' : 's'}${wk ? ` ${wk} week${wk === 1 ? '' : 's'}` : ''}`, `${mo} mois${wk ? ` ${wk} semaine${wk > 1 ? 's' : ''}` : ''}`);
}

/** Small arrow vs the previous equal-length period. better: 1 = higher is better, -1 = lower is better, 0 = neutral. */
function docArrow(cur, prev, better, tol, fmt){
  if (cur == null || prev == null || !isFinite(cur) || !isFinite(prev)) return '';
  const d = cur - prev, was = `${L('previous period', 'période précédente')}${CO()} ${fmt(prev)}`;
  if (Math.abs(d) < tol) return ` <span class="da" title="${esc(was)}">＝</span>`;
  const up = d > 0, cls = better === 0 ? '' : up === better > 0 ? ' good' : ' bad';
  return ` <span class="da${cls}" title="${esc(was)}">${up ? '▲' : '▼'}</span>`;
}
/** One tile: label, value (+ arrow) and the previous value underneath when there is one. */
function docTile(label, cur, prev, fmt, better = 0, tol = 0, extra = ''){
  const ar = docArrow(cur, prev, better, tol, fmt);
  return `<div><span class="sub">${label}</span><b>${cur == null || (typeof cur === 'number' && !isFinite(cur)) ? '—' : fmt(cur)}${ar}</b>${extra || prev != null && cur != null ? `<small>${extra || `${L('before', 'avant')}${CO()} ${fmt(prev)}`}</small>` : ''}</div>`;
}
const docTileText = (label, text, sub = '') => `<div><span class="sub">${label}</span><b>${text}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

/* ── Numbers per section (also run on the previous period for the arrows) ── */
function docSleep(days){
  const ds = days.filter(d => !d.isToday), k = sleepSummary(ds), nights = ds.filter(d => d.nightKnown);
  const daySl = ds.filter(d => d.napCount || d.wake != null);
  return { n: ds.length, nights: nights.length, night: k.avgNight, day: k.avgDay, tot: k.avg24, totN: k.c24.length,
    bedMed: medianV(ds.map(d => d.bed)), bedRange: rangeV(ds.map(d => d.bed), dTime), wakeMed: medianV(ds.map(d => d.wake)), wakeRange: rangeV(ds.map(d => d.wake), dTime),
    naps: daySl.length ? mean(daySl.map(d => d.napCount)) : null,
    wakings: nights.length ? mean(nights.map(d => d.wakings ?? 0)) : null, wakeLen: medianV(nights.flatMap(d => d.wakeLens || [])),
    awake: k.avgAwake, series: ds };
}
function docFeeding(days, a, b){
  const ds = days.filter(d => !d.isToday), set = new Set(days.map(d => d.D)), evs = DATA.events.filter(e => set.has(e.d));
  const milkDays = ds.filter(d => d.milk != null), feedDays = ds.filter(d => d.feedCount);
  const meals = evs.filter(isMeal).map(acceptanceOf).filter(x => x !== 'Unrated');
  const fs = FEEDS.filter(f => set.has(f.d) && !f.ongoing);
  const dataStart = dataSpan()[0], newF = foodStats(DATA.events).filter(f => f.first >= a && f.first <= b && (f.isNew || f.first > dataStart + 6));
  const allergens = allergenUpkeep(), triedNew = allergens.filter(x => x.first >= a && x.first <= b).map(x => x.a);
  const reactRx = /allerg|r[ée]action|hives|urticaire|rash|rougeur|boutons|vomi|swell|enfl|ecz[ée]ma/i;
  const reacts = evs.filter(e => (isMeal(e) || e.k === 'snack' || e.k === 'incident') && reactRx.test((e.notes || '') + ' ' + e.tags.join(' ')));
  return { milk: milkDays.length ? mean(milkDays.map(d => d.milk)) : null, milkRange: rangeV(milkDays.map(d => d.milk), dOz),
    feeds: feedDays.length ? mean(feedDays.map(d => d.feedCount)) : null,
    breast: feedDays.length ? fs.filter(f => f.type !== 'bottle' && feedDays.some(d => d.D === f.d)).length / feedDays.length : null,
    bottles: feedDays.length ? mean(feedDays.map(d => d.bottleCount)) : null,
    well: meals.filter(x => x === 'Ate Well').length, part: meals.filter(x => x === 'Partial').length, ref: meals.filter(x => x === 'Refused').length, meals: meals.length,
    newF, triedNew, allTried: allergens.length, reacts,
    water: ds.some(d => d.water != null) ? mean(ds.filter(d => d.water != null).map(d => d.water)) : null };
}
function docDiapers(days, a, b){
  const ds = days.filter(d => !d.isToday && d.evs.some(e => e.k === 'diaper')), set = new Set(days.map(d => d.D));
  const all = DATA.events.filter(e => e.k === 'diaper').sort((x, y) => x.s - y.s), inP = all.filter(e => set.has(e.d));
  const poops = all.filter(e => isPoopCat(e.cat)), pIn = poops.filter(e => set.has(e.d)), wets = inP.filter(e => isWetCat(e.cat));
  const pee = {}; wets.forEach(e => { const k = PEE_KEYS.find(x => e.tags.includes(x)); if (k) pee[k] = (pee[k] || 0) + 1; });
  const stool = {}; pIn.forEach(e => { const k = STOOL_KEYS.find(x => e.tags.includes(x)); if (k) stool[k] = (stool[k] || 0) + 1; });
  // longest stretch without a poop, in days, from the last one before the period to the end of it
  let longest = null, lFrom = null;
  const regular = ds.length >= Math.max(2, days.filter(d => !d.isToday).length * .6);   // diapers logged on most days, or a gap means nothing
  if (regular && (pIn.length || poops.length)) {
    const prevP = poops.filter(e => e.d < a).pop(), pts = [...(prevP ? [prevP.d] : []), ...[...new Set(pIn.map(e => e.d))], Math.min(b, todayIdx())];
    for (let i = 1; i < pts.length; i++) { const g = pts[i] - pts[i - 1]; if (longest == null || g > longest) { longest = g; lFrom = pts[i - 1]; } }
  }
  // 2+ hard or watery in a row (consecutive poops)
  const run = key => { let best = 0, cur = 0, at = null; pIn.forEach(e => { if (e.tags.includes(key)) { cur++; if (cur > best) { best = cur; at = e.d; } } else if (STOOL_KEYS.some(x => e.tags.includes(x))) cur = 0; }); return { n: best, at }; };
  const last7 = poops.filter(e => e.d > Math.min(b, todayIdx()) - 7 && e.d <= b);
  return { days: ds.length, wet: ds.length && wets.length ? sum(ds.map(d => d.wet)) / ds.length : null, dirty: ds.length && pIn.length ? sum(ds.map(d => d.poop)) / ds.length : null,
    pee, stool, longest, lFrom, hardRun: run('hard'), waterRun: run('watery'), any: inP.length,
    hard7: last7.filter(e => e.tags.includes('hard')).length, watery7: last7.filter(e => e.tags.includes('watery')).length, n7: last7.length };
}
function docHealth(days, a, b, last){
  const set = new Set(days.map(d => d.D)), evs = DATA.events.filter(e => set.has(e.d));
  const fev = evs.filter(e => e.mk === 'temp' && e.mv != null && e.mv >= 38).sort((x, y) => x.s - y.s);
  const notes = evs.filter(e => e.k === 'incident' || (e.k === 'medical')).sort((x, y) => x.s - y.s);
  const medsRows = evs.filter(e => e.k === 'meds'), byMed = new Map();
  medsRows.forEach(e => { const name = (e.tags.find(t => t && !/=/.test(t)) || e.notes || catL(e.cat)).trim(), k = medSlug(name).split('-').slice(0, 2).join('-') || name;
    const g = byMed.get(k) || { name, dose: e.valueRaw || '', days: new Set(), n: 0 }; g.days.add(e.d); g.n++; if (!g.dose && e.valueRaw) g.dose = e.valueRaw; byMed.set(k, g); });
  const missed = new Map(); for (let D = a; D <= Math.min(b, todayIdx() - 1); D++) medDoses(D).forEach(x => { if (!x.given) missed.set(x.md.name, (missed.get(x.md.name) || 0) + 1); });
  const vFrom = last ? last.d : a, vst = vaxStatus() || [];
  const vax = DATA.events.filter(e => e.k === 'vaccine' && e.d >= vFrom && e.d <= b).sort((x, y) => x.d - y.d).map(e => { const s = vst.find(x => x.got === e); return { e, s, after: s ? postVaxNotes(s) : [] }; });
  return { fev, feverDays: new Set(fev.map(e => e.d)).size, feverMax: fev.length ? Math.max(...fev.map(e => e.mv)) : null, notes, meds: [...byMed.values()], missed, vax };
}
function docMood(days){
  const set = new Set(days.map(d => d.D)), evs = DATA.events.filter(e => set.has(e.d));
  const beh = evs.filter(e => e.k === 'behaviour'), tags = {};
  beh.forEach(e => e.tags.filter(t => !/handover|visit|visite|parent|=/.test(t)).forEach(t => tags[t] = (tags[t] || 0) + 1));   // nothing about visits (doctor-facing)
  const emo = evs.filter(e => /^check-?in - emotional/i.test(e.cat));
  const tone = v => emo.filter(e => e.outcome === v).length;
  return { beh: beh.length, tags: Object.entries(tags).sort((x, y) => y[1] - x[1]), emo: emo.length, pos: tone('Positive'), mix: tone('Mixed'), hard: tone('Difficult'),
    behTone: ['Positive', 'Mixed', 'Difficult'].map(v => beh.filter(e => e.outcome === v).length) };
}
/** Growth: latest measurement up to `b` vs the one at (or before) the last appointment; WHO percentile; crossing 2 major lines. */
const WHO_MAJOR_Z = [-1.881, -1.036, 0, 1.036, 1.881];   // 3rd, 15th, 50th, 85th, 97th
function growthPoint(mk, e){
  const dob = dobIdx(), sex = childSex(); if (dob == null || !sex || !WHO_KEY[mk]) return null;
  const lms = lmsAt(WHO_LMS[`${WHO_KEY[mk]}-${sex === 'f' ? 'girls' : 'boys'}`], e.d - dob); if (!lms) return null;
  const z = whoZ(lms, e.mv); return { z, p: normCdf(z) * 100 };
}
function docGrowth(a, b, last){
  const ref = last ? last.d : a - 1, out = [];
  for (const mk of ['weight', 'length', 'head']) {
    const ev = DATA.events.filter(e => e.mk === mk && e.mv != null && e.d <= b).sort((x, y) => x.s - y.s); if (!ev.length) continue;
    const cur = ev[ev.length - 1], base = [...ev].reverse().find(e => e.d <= ref && e !== cur) || (ev.length > 1 && ev[0] !== cur ? ev[0] : null);
    const pc = growthPoint(mk, cur), pb = base ? growthPoint(mk, base) : null;
    const crossed = pc && pb ? WHO_MAJOR_Z.filter(z => (z > Math.min(pc.z, pb.z)) && (z < Math.max(pc.z, pb.z))).length : 0;
    out.push({ mk, cur, base, pc, pb, crossed, fresh: cur.d >= a });
  }
  return out;
}
const growthName = mk => ({ weight: L('Weight', 'Poids'), length: L('Length', 'Taille'), head: L('Head', 'Tête') }[mk]);
function growthDiff(mk, d){
  const s = d > 0 ? '+' : d < 0 ? '−' : '±', x = Math.abs(d);
  if (mk === 'weight') return metric() ? s + Math.round(x * 1000 / 10) * 10 + ' g' : (() => { const oz = Math.round(x / 0.028349523); return s + (oz >= 16 ? `${Math.floor(oz / 16)} lb ${oz % 16} oz` : `${oz} oz`); })();
  return s + (metric() ? dNum(x) + ' cm' : dNum(x / 2.54) + ' in');
}

/** Small inline chart (SVG, so it prints and survives saved copies): sleep per day, night + naps, with the age band. */
function docSleepSVG(days, band){
  const ds = days.filter(d => d.nightKnown || d.daySleep); if (ds.length < 3) return '';
  const W = 640, H = 64, max = Math.max(18 * 60, ...ds.map(d => (d.nightSleep || 0) + (d.daySleep || 0))), y = v => H - 4 - v / max * (H - 10), bw = Math.max(2, W / ds.length - 2);
  const bandR = band ? `<rect x="0" y="${y(band[1])}" width="${W}" height="${y(band[0]) - y(band[1])}" fill="#d1fae5"/>` : '';
  const bars = ds.map((d, i) => { const x = i * (W / ds.length) + 1, n = d.nightSleep || 0, s = d.daySleep || 0;
    return `<rect x="${x}" y="${y(n)}" width="${bw}" height="${H - 4 - y(n)}" fill="#6366f1"><title>${esc(fmtDayShort(d.D))}${CO()} ${dDur(n + s)}</title></rect><rect x="${x}" y="${y(n + s)}" width="${bw}" height="${y(n) - y(n + s)}" fill="#a5b4fc"/>`; }).join('');
  return `<svg class="dspark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(L('Sleep per day', 'Sommeil par jour'))}">${bandR}${bars}</svg>
    <div class="sub dleg"><i style="background:#6366f1"></i>${L('night', 'nuit')} <i style="background:#a5b4fc"></i>${L('naps', 'siestes')}${band ? ` <i style="background:#d1fae5"></i>${L('recommended for age', 'recommandé pour l’âge')}` : ''} · ${esc(fmtDayShort(ds[0].D))} → ${esc(fmtDayShort(ds[ds.length - 1].D))}</div>`;
}

const DOC_CSS = `.docr h2{font-size:14px;margin:14px 0 6px;display:flex;gap:8px;align-items:baseline}.docr h2 .hl{font-weight:400;color:#374151;font-size:12.5px}
.docr .kgrid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.docr .kgrid div{padding:6px 8px}.docr .kgrid b{font-size:15px}.docr .kgrid small{display:block;color:#6b7280;font-size:10.5px}
.docr .da{font-size:10px;color:#6b7280;vertical-align:2px}.docr .da.good{color:#059669}.docr .da.bad{color:#dc2626}
.docr .dl{margin:4px 0;font-size:12.5px}.docr .dspark{width:100%;height:56px;display:block;margin-top:6px}.docr .dleg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 3px 0 8px;vertical-align:-1px}
.docr .dq{white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin:4px 0}.docr .dlines div{border-bottom:1px solid #d1d5db;height:24px}
.docr .dnt{color:#6b7280;font-size:12px;margin-top:10px}.docr ul.sg{list-style:none;padding-left:2px}.docr ul.sg li:before{content:'☐ ';color:#6b7280}
@media print{.docr{font-size:12px}.docr h2{break-after:avoid}.docr .kgrid{break-inside:avoid}}`;

function renderDoctorReport(R){
  const O = S.report, { a, b, days, prevDays, last } = R, P = prevDays.length ? prevDays : null;
  const ageAt = dobIdx() == null ? null : (docAppt ? docAppt.D : todayIdx()) - dobIdx(), band = sleepBandFor(ageAt);
  const name = O.childLabel || S.profile.name || L('Child', 'Enfant');
  const sec = (icon, title, hl, body) => `<h2>${icon} ${title}${hl ? ` <span class="hl">${hl}</span>` : ''}</h2>${body}`;
  const notTracked = [], flags = [], out = [];
  const dshort = D => esc(fmtDay(D, { month: 'short', day: 'numeric' }));
  const noteOf = e => O.includeNotes && e.notes ? esc(e.notes) : esc(catL(e.cat) + (e.tags.filter(t => !/=/.test(t)).length ? ' — ' + e.tags.filter(t => !/=/.test(t)).join(', ') : ''));
  const prevLbl = P ? L(`the previous ${R.len} days`, `les ${R.len} jours précédents`) : '';

  /* 2 · Growth */
  const G = mod('growth') || DATA.events.some(e => e.mk === 'weight' || e.mk === 'length' || e.mk === 'head') ? docGrowth(a, b, last) : [];
  if (G.length) {
    const tiles = G.map(g => {
      const ch = g.base ? `${growthDiff(g.mk, g.cur.mv - g.base.mv)} ${L('since', 'depuis le')} ${dshort(g.base.d)}` : '';
      const pc = g.pc ? `${L('WHO', 'OMS')} ${pctL(g.pc.p)}${g.pb ? ` (${L('was', 'avant')} ${pctL(g.pb.p)})` : ''}` : '';
      if (g.crossed >= 2) flags.push(L(`${growthName(g.mk)}${CO()} from the ${pctL(g.pb.p)} to the ${pctL(g.pc.p)} percentile since ${fmtDay(g.base.d, { month: 'short', day: 'numeric' })} (crossed ${g.crossed} major lines)`, `${growthName(g.mk)} : du ${pctL(g.pb.p)} au ${pctL(g.pc.p)} percentile depuis le ${fmtDay(g.base.d, { month: 'short', day: 'numeric' })} (${g.crossed} lignes principales franchies)`));
      return `<div><span class="sub">${growthName(g.mk)} · ${dshort(g.cur.d)}${g.fresh ? '' : ` <span title="${esc(L('measured before this period', 'mesuré avant cette période'))}">*</span>`}</span><b>${fmtMeasure(g.mk, g.cur.mv)}${g.crossed >= 2 ? ' <span class="flag">⚠</span>' : ''}</b><small>${[pc, ch].filter(Boolean).join(' · ')}</small></div>`; }).join('');
    const w = G.find(g => g.mk === 'weight');
    const hl = w?.pc ? L(`weight on the ${pctL(w.pc.p)} percentile${w.pb ? (Math.abs(w.pc.p - w.pb.p) < 10 ? ', steady' : w.pc.p > w.pb.p ? ', up' : ', down') : ''}`, `poids au ${pctL(w.pc.p)} percentile${w.pb ? (Math.abs(w.pc.p - w.pb.p) < 10 ? ', stable' : w.pc.p > w.pb.p ? ', en hausse' : ', en baisse') : ''}`) : '';
    out.push(sec('📏', L('Growth', 'Croissance'), hl, `<div class="kgrid">${tiles}</div>${G.some(g => g.crossed >= 2) ? `<p class="dl flag">${L('⚠ A percentile crossing 2 major lines (3rd, 15th, 50th, 85th, 97th) since the last visit.', '⚠ Un percentile qui a franchi 2 lignes principales (3e, 15e, 50e, 85e, 97e) depuis la dernière visite.')}</p>` : ''}${G.some(g => !g.fresh) ? `<p class="sub" style="font-size:11px">* ${L('measured before this period (latest available)', 'mesuré avant cette période (dernière mesure)')}</p>` : ''}`));
  } else notTracked.push(L('Growth', 'Croissance'));

  /* 3 · Sleep */
  const s = docSleep(days), sp = P ? docSleep(P) : null;
  if (s.nights || s.naps != null) {
    let verdict = '';
    if (sp && sp.nights) { let v = 0; if (s.tot != null && sp.tot != null) v += s.tot - sp.tot >= 15 ? 1 : sp.tot - s.tot >= 15 ? -1 : 0;
      if (s.wakings != null && sp.wakings != null) v += s.wakings - sp.wakings <= -.5 ? 1 : s.wakings - sp.wakings >= .5 ? -1 : 0;
      if (s.awake != null && sp.awake != null) v += s.awake - sp.awake <= -10 ? 1 : s.awake - sp.awake >= 10 ? -1 : 0;
      verdict = v > 0 ? L(`better than ${prevLbl}`, `mieux que ${prevLbl}`) : v < 0 ? L(`worse than ${prevLbl}`, `moins bien que ${prevLbl}`) : L(`about the same as ${prevLbl}`, `semblable aux ${R.len} jours précédents`); }
    const tot = s.tot ?? (s.night != null && s.day != null ? s.night + s.day : null), inBand = band && tot != null ? (tot < band[0] ? -1 : tot > band[1] ? 1 : 0) : null;
    const bandTxt = band ? `${L('recommended', 'recommandé')} ${band[0] / 60}–${band[1] / 60} h` : '';
    const hl = [tot != null ? L(`about ${dDur(tot)} in 24 h`, `environ ${dDur(tot)} sur 24 h`) + (inBand === -1 ? L(' (below the range for age)', ' (sous la plage pour l’âge)') : inBand === 1 ? L(' (above the range for age)', ' (au-dessus de la plage pour l’âge)') : '') : '',
      s.wakings != null ? L(`${dNum(s.wakings)} waking${Math.round(s.wakings * 10) === 10 ? '' : 's'} a night`, `${dNum(s.wakings)} réveil${s.wakings >= 2 ? 's' : ''} par nuit`) : '', verdict].filter(Boolean).join(' · ');
    if (inBand === -1) flags.push(L(`Sleep: about ${dDur(tot)} in 24 h, below the ${band[0] / 60}–${band[1] / 60} h usually recommended at this age`, `Sommeil : environ ${dDur(tot)} sur 24 h, sous les ${band[0] / 60} à ${band[1] / 60} h habituellement recommandées à cet âge`));
    if (sp?.wakings != null && s.wakings != null && s.wakings - sp.wakings >= .75 && s.wakings >= 1) flags.push(L(`Night wakings up from ${dNum(sp.wakings)} to ${dNum(s.wakings)} per night`, `Réveils la nuit : de ${dNum(sp.wakings)} à ${dNum(s.wakings)} par nuit`));
    const tiles = [
      docTile(L('Night sleep', 'Sommeil de nuit'), s.night, sp?.night, dDur, 1, 15),
      docTile(L('Day sleep (naps)', 'Sommeil de jour (siestes)'), s.day, sp?.day, dDur, 0, 15),
      docTile(L('Total / 24 h', 'Total / 24 h'), tot, sp?.tot, dDur, 1, 15, bandTxt && (sp?.tot != null ? `${bandTxt} · ${L('before', 'avant')}${CO()} ${dDur(sp.tot)}` : bandTxt)),
      docTile(L('Naps per day', 'Siestes par jour'), s.naps, sp?.naps, dNum, 0, .3),
      docTileText(L('Bedtime (median)', 'Coucher (médiane)'), dTime(s.bedMed), s.bedRange && `${L('range', 'écart')} ${s.bedRange}`),
      docTileText(L('Wake-up (median)', 'Lever (médiane)'), dTime(s.wakeMed), s.wakeRange && `${L('range', 'écart')} ${s.wakeRange}`),
      docTile(L('Night wakings / night', 'Réveils / nuit'), s.wakings, sp?.wakings, dNum, -1, .3, s.wakeLen != null ? `${L('usually', 'en général')} ${dDur(s.wakeLen)}${sp?.wakings != null ? ` · ${L('before', 'avant')}${CO()} ${dNum(sp.wakings)}` : ''}` : ''),
    ].join('');
    out.push(sec('😴', L('Sleep', 'Sommeil'), hl, `<div class="kgrid">${tiles}</div>${docSleepSVG(s.series, band)}`));
  } else notTracked.push(L('Sleep', 'Sommeil'));

  /* 4 · Feeding */
  const f = docFeeding(days, a, b), fp = P ? docFeeding(P, R.prevA, R.prevB) : null;
  if (f.milk != null || f.feeds != null || f.meals || f.water != null || f.newF.length) {
    const tiles = [
      f.milk != null ? docTile(L('Milk per day', 'Lait par jour'), f.milk, fp?.milk, dOz, 0, metric() ? 30 / OZ_ML : 1, f.milkRange && `${L('range', 'écart')} ${f.milkRange}${fp?.milk != null ? ` · ${L('before', 'avant')}${CO()} ${dOz(fp.milk)}` : ''}`) : '',
      f.feeds != null ? docTile(L('Feeds per day', 'Boires par jour'), f.feeds, fp?.feeds, dNum, 0, .5) : '',
      f.feeds != null && f.breast ? docTile(L('Breastfeeds per day', 'Tétées par jour'), f.breast, fp?.breast, dNum, 0, .5) : '',
      f.feeds != null && f.bottles ? docTile(L('Bottles per day', 'Biberons par jour'), f.bottles, fp?.bottles, dNum, 0, .5) : '',
      f.meals ? docTileText(L('Meals eaten', 'Repas'), `${f.well} · ${f.part} · ${f.ref}`, L('well · partly · refused', 'bien · en partie · refusés')) : '',
      f.water != null ? docTile(L('Water per day', 'Eau par jour'), f.water, fp?.water, dMl, 0, 20) : '',
    ].join('');
    const lines = [
      f.newF.length ? `<b>${L('New foods', 'Nouveaux aliments')} (${f.newF.length}):</b> ${f.newF.slice(0, 12).map(x => esc(x.food)).join(', ')}${f.newF.length > 12 ? '…' : ''}` : '',
      f.triedNew.length || f.allTried ? `<b>${L('Allergen groups', 'Groupes d’allergènes')}${CO()}</b> ${f.triedNew.length ? L(`first tried ${f.triedNew.join(', ')}`, `premiers essais : ${f.triedNew.map(x => ALLERGEN_FR[x] || x).join(', ')}`) + ' · ' : ''}${L(`${f.allTried} of ${ALLERGENS.length} groups eaten so far`, `${f.allTried} groupes sur ${ALLERGENS.length} mangés jusqu’ici`)}` : '',
      `<b>${L('Reactions', 'Réactions')}${CO()}</b> ${f.reacts.length ? f.reacts.slice(0, 4).map(e => `${dshort(e.d)} ${noteOf(e)}`).join(' · ') : L('none logged', 'aucune notée')}`,
    ].filter(Boolean);
    if (f.reacts.length) flags.push(L(`Possible food reaction${f.reacts.length > 1 ? 's' : ''}: ${f.reacts.slice(0, 2).map(e => fmtDay(e.d, { month: 'short', day: 'numeric' })).join(', ')}`, `Réaction${f.reacts.length > 1 ? 's' : ''} alimentaire${f.reacts.length > 1 ? 's' : ''} possible${f.reacts.length > 1 ? 's' : ''} : ${f.reacts.slice(0, 2).map(e => fmtDay(e.d, { month: 'short', day: 'numeric' })).join(', ')}`));
    if (fp?.meals && f.meals >= 5 && f.ref / f.meals - fp.ref / fp.meals >= .2) flags.push(L(`Refused meals: ${f.ref} of ${f.meals} (before: ${fp.ref} of ${fp.meals})`, `Repas refusés : ${f.ref} sur ${f.meals} (avant : ${fp.ref} sur ${fp.meals})`));
    const hl = [f.milk != null ? L(`about ${dOz(f.milk)} of milk a day`, `environ ${dOz(f.milk)} de lait par jour`) : '', f.meals ? L(`${Math.round(f.well / f.meals * 100)}% of meals eaten well`, `${Math.round(f.well / f.meals * 100)} % des repas bien mangés`) : ''].filter(Boolean).join(' · ');
    out.push(sec('🍼', L('Feeding', 'Alimentation'), hl, `${tiles ? `<div class="kgrid">${tiles}</div>` : ''}${lines.map(x => `<p class="dl">${x}</p>`).join('')}`));
  } else notTracked.push(L('Feeding', 'Alimentation'));

  /* 5 · Diapers / toileting */
  const dp = docDiapers(days, a, b), dpp = P ? docDiapers(P, R.prevA, R.prevB) : null;
  if (dp.any) {
    const peeN = Object.values(dp.pee).reduce((x, y) => x + y, 0), stN = Object.values(dp.stool).reduce((x, y) => x + y, 0);
    const tiles = [
      dp.wet != null ? docTile(L('Wet diapers / day', 'Couches mouillées / jour'), dp.wet, dpp?.wet, dNum, 0, .5, peeN ? PEE().map(([k, nm]) => dp.pee[k] ? `${esc(nm.toLowerCase())} ${Math.round(dp.pee[k] / peeN * 100)}%` : '').filter(Boolean).join(' · ') : '') : '',
      dp.dirty != null ? docTile(L('Dirty diapers / day', 'Couches souillées / jour'), dp.dirty, dpp?.dirty, dNum, 0, .3) : '',
      dp.longest != null ? docTileText(L('Longest without a poop', 'Plus long sans selle'), L(`${dp.longest} day${dp.longest === 1 ? '' : 's'}`, `${dp.longest} jour${dp.longest > 1 ? 's' : ''}`), dp.lFrom != null ? `${L('from', 'à partir du')} ${dshort(dp.lFrom)}` : '') : '',
      stN ? docTileText(L('Consistency', 'Consistance'), STOOL().map(([k, nm]) => dp.stool[k] ? `${esc(nm.toLowerCase())} ${dp.stool[k]}` : '').filter(Boolean).join(' · '), L(`${stN} poops rated (BITSS)`, `${stN} selles évaluées (BITSS)`)) : '',
    ].join('');
    const runs = [dp.hardRun.n >= 2 ? L(`${dp.hardRun.n} hard poops in a row (to ${fmtDay(dp.hardRun.at, { month: 'short', day: 'numeric' })})`, `${dp.hardRun.n} selles dures de suite (jusqu’au ${fmtDay(dp.hardRun.at, { month: 'short', day: 'numeric' })})`) : '',
      dp.waterRun.n >= 2 ? L(`${dp.waterRun.n} watery poops in a row (to ${fmtDay(dp.waterRun.at, { month: 'short', day: 'numeric' })})`, `${dp.waterRun.n} selles liquides de suite (jusqu’au ${fmtDay(dp.waterRun.at, { month: 'short', day: 'numeric' })})`) : ''].filter(Boolean);
    if (dp.hard7 >= 2) flags.push(L(`Poop: hard ${dp.hard7} of the last ${dp.n7} (7 days)`, `Selles : dures ${dp.hard7} sur les ${dp.n7} dernières (7 jours)`));
    if (dp.watery7 >= 2) flags.push(L(`Poop: watery ${dp.watery7} of the last ${dp.n7} (7 days)`, `Selles : liquides ${dp.watery7} sur les ${dp.n7} dernières (7 jours)`));
    if (dp.longest >= 4) flags.push(L(`${dp.longest} days without a poop (from ${fmtDay(dp.lFrom, { month: 'short', day: 'numeric' })})`, `${dp.longest} jours sans selle (à partir du ${fmtDay(dp.lFrom, { month: 'short', day: 'numeric' })})`));
    const hl = [dp.wet != null ? L(`${dNum(dp.wet)} wet`, `${dNum(dp.wet)} mouillées`) : '', dp.dirty != null ? L(`${dNum(dp.dirty)} dirty a day`, `${dNum(dp.dirty)} souillées par jour`) : ''].filter(Boolean).join(' · ');
    if (tiles || runs.length) out.push(sec('🧷', L('Diapers / toileting', 'Couches / propreté'), hl, `${tiles ? `<div class="kgrid">${tiles}</div>` : ''}${runs.length ? `<p class="dl flag">⚠ ${runs.join(' · ')}</p>` : ''}`));
    else notTracked.push(L('Diapers', 'Couches'));
  } else notTracked.push(L('Diapers', 'Couches'));

  /* 6 · Health */
  const h = docHealth(days, a, b, last);
  if (h.fev.length || h.notes.length || h.meds.length || h.vax.length || h.missed.size) {
    const lines = [
      `<b>${L('Fever', 'Fièvre')}${CO()}</b> ${h.fev.length ? L(`${h.feverDays} day${h.feverDays > 1 ? 's' : ''}, max ${fmtTemp(h.feverMax)}`, `${h.feverDays} jour${h.feverDays > 1 ? 's' : ''}, max ${fmtTemp(h.feverMax)}`) + ` (${[...new Set(h.fev.map(e => e.d))].map(dshort).join(', ')})` : L('none ≥ 38 °C logged', 'aucune ≥ 38 °C notée')}`,
      h.notes.length ? `<b>${L('Illness &amp; health notes', 'Maladies et notes de santé')}${CO()}</b> ${h.notes.slice(0, 6).map(e => `${dshort(e.d)} ${noteOf(e)}${e.outcome ? ` <span class="${e.outcome === 'Follow-up Needed' ? 'flag' : 'sub'}">[${esc(ocL(e.outcome))}]</span>` : ''}`).join(' · ')}${h.notes.length > 6 ? ` · ${L(`+${h.notes.length - 6} more`, `+${h.notes.length - 6} autres`)}` : ''}` : '',
      h.meds.length || h.missed.size ? `<b>${L('Medications', 'Médicaments')}${CO()}</b> ${[...h.meds.map(m => `${esc(m.name)}${m.dose ? ' ' + esc(m.dose) : ''} · ${L(`${m.days.size} day${m.days.size > 1 ? 's' : ''}`, `${m.days.size} jour${m.days.size > 1 ? 's' : ''}`)}${h.missed.get(m.name) ? ` · <span class="flag">${L(`${h.missed.get(m.name)} missed`, `${h.missed.get(m.name)} oubliée${h.missed.get(m.name) > 1 ? 's' : ''}`)}</span>` : ''}`),
        ...[...h.missed].filter(([n]) => !h.meds.some(m => m.name === n)).map(([n, c]) => `${esc(n)} · <span class="flag">${L(`${c} missed`, `${c} oubliée${c > 1 ? 's' : ''}`)}</span>`)].join(' · ')}` : '',
      h.vax.length ? `<b>${L('Vaccines', 'Vaccins')}${CO()}</b> ${h.vax.map(v => `${dshort(v.e.d)} ${esc(v.s ? (v.s.to ? L('4–6 y', '4–6 ans') : L(`${v.s.mo}-month`, `${v.s.mo} mois`)) : (v.e.notes || v.e.tags.join(', ') || catL(v.e.cat)))}${v.after.length ? ` → ${v.after.join(', ')}` : ` → ${L('no reaction logged', 'aucune réaction notée')}`}`).join(' · ')}` : '',
    ].filter(Boolean);
    if (h.feverDays) flags.push(L(`Fever on ${h.feverDays} day${h.feverDays > 1 ? 's' : ''} (max ${fmtTemp(h.feverMax)})`, `Fièvre ${h.feverDays} jour${h.feverDays > 1 ? 's' : ''} (max ${fmtTemp(h.feverMax)})`));
    const missedN = [...h.missed.values()].reduce((x, y) => x + y, 0); if (missedN) flags.push(L(`${missedN} medication dose${missedN > 1 ? 's' : ''} not checked off`, `${missedN} dose${missedN > 1 ? 's' : ''} de médicament non cochée${missedN > 1 ? 's' : ''}`));
    h.notes.filter(e => e.outcome === 'Follow-up Needed').slice(0, 2).forEach(e => flags.push(L(`Follow-up: ${fmtDay(e.d, { month: 'short', day: 'numeric' })} ${e.notes && O.includeNotes ? e.notes : catL(e.cat)}`, `Suivi : ${fmtDay(e.d, { month: 'short', day: 'numeric' })} ${e.notes && O.includeNotes ? e.notes : catL(e.cat)}`)));
    const hl = [h.feverDays ? L(`fever ${h.feverDays}×`, `fièvre ${h.feverDays}×`) : L('no fever', 'pas de fièvre'), h.notes.length ? L(`${h.notes.length} health note${h.notes.length > 1 ? 's' : ''}`, `${h.notes.length} note${h.notes.length > 1 ? 's' : ''} de santé`) : '', h.vax.length ? L(`${h.vax.length} vaccine visit${h.vax.length > 1 ? 's' : ''}`, `${h.vax.length} vaccination${h.vax.length > 1 ? 's' : ''}`) : ''].filter(Boolean).join(' · ');
    out.push(sec('🩺', L('Health', 'Santé'), hl, lines.map(x => `<p class="dl">${x}</p>`).join('')));
  } else notTracked.push(L('Health', 'Santé'));

  /* 7 · Mood & behaviour */
  const m = docMood(days), mp = P ? docMood(P) : null;
  if (m.beh || m.emo) {
    const lines = [
      m.tags.length ? `<b>${L('Behaviour', 'Comportement')}${CO()}</b> ${m.tags.slice(0, 8).map(([t, c]) => `${esc(t)} ×${c}`).join(' · ')}` : m.beh ? `<b>${L('Behaviour', 'Comportement')}${CO()}</b> ${L(`${m.beh} entries`, `${m.beh} entrées`)}` : '',
      m.emo ? `<b>${L('Emotional check-ins', 'Bilans affectifs')}${CO()}</b> ${L(`good ${m.pos} · mixed ${m.mix} · hard ${m.hard}`, `bonne ${m.pos} · mitigée ${m.mix} · difficile ${m.hard}`)}${mp?.emo ? ` <span class="sub">(${L(`before: good ${mp.pos} · mixed ${mp.mix} · hard ${mp.hard}`, `avant : bonne ${mp.pos} · mitigée ${mp.mix} · difficile ${mp.hard}`)})</span>` : ''}` : '',
    ].filter(Boolean);
    const hardShare = m.emo ? m.hard / m.emo : null, hardPrev = mp?.emo ? mp.hard / mp.emo : null;
    const hl = hardShare != null ? (hardPrev != null ? (hardShare - hardPrev >= .15 ? L('more hard days than before', 'plus de journées difficiles qu’avant') : hardPrev - hardShare >= .15 ? L('fewer hard days than before', 'moins de journées difficiles qu’avant') : L('similar to before', 'semblable à avant')) : L(`${Math.round((m.pos / m.emo) * 100)}% good days`, `${Math.round((m.pos / m.emo) * 100)} % de bonnes journées`)) : '';
    out.push(sec('🙂', L('Mood &amp; behaviour', 'Humeur et comportement'), hl, lines.map(x => `<p class="dl">${x}</p>`).join('')));
  } else notTracked.push(L('Mood &amp; behaviour', 'Humeur et comportement'));

  /* 8 · Milestones & development */
  const set = new Set(days.map(d => d.D)), ms = DATA.events.filter(e => e.k === 'milestone' && set.has(e.d)).sort((x, y) => x.s - y.s);
  const ciLines = mod('checkins') ? ['language', 'play'].map(id => { const ar = CHECKIN.find(x => x.id === id), rows = DATA.events.filter(e => e.cat.toLowerCase() === ar.cat.toLowerCase() && set.has(e.d)); if (!rows.length) return '';
    const sm = ciSummary(ar, rows).filter(x => !/^<b>(Overall|Dans l’ensemble)/.test(x)).slice(0, 2); return sm.length ? `<b>${ar.icon} ${L(ar.en, ar.fr)}${CO()}</b> ${sm.join(' · ').replace(/<b>/g, '').replace(/<\/b>/g, '')}` : ''; }).filter(Boolean) : [];
  if (ms.length || ciLines.length) {
    out.push(sec('⭐', L('Milestones &amp; development', 'Étapes et développement'), ms.length ? L(`${ms.length} new`, `${ms.length} nouvelle${ms.length > 1 ? 's' : ''}`) : '',
      `${ms.length ? `<p class="dl">${ms.slice(0, 10).map(e => `${dshort(e.d)} ${esc(e.notes || catL(e.cat))}`).join(' · ')}</p>` : ''}${ciLines.map(x => `<p class="dl">${x}</p>`).join('')}`));
  } else notTracked.push(L('Milestones', 'Étapes'));

  /* 9 · Patterns worth mentioning */
  const pat = [];
  trendAlerts().forEach(x => pat.push(`${x.icon} ${esc(x.text)}${x.acked ? ` <span class="sub">(${L('expected, acknowledged', 'attendu, pris en compte')} ${esc(fmtDayShort(parseDate(x.acked.at)))})</span>` : ''}`));
  trendAlerts().filter(x => !x.acked).forEach(x => flags.push(x.text.replace(/\.$/, '')));
  teethSleepRows().filter(r => r.t.d >= a && r.t.d <= b && r.awake[0] != null && r.awake[1] != null).forEach(r => pat.push(L(`🦷 Tooth on ${fmtDay(r.t.d, { month: 'short', day: 'numeric' })}${CO()} awake at night ${dDur(r.awake[0])} usually → ${dDur(r.awake[1])} in the days before${r.awake[2] != null ? ` → ${dDur(r.awake[2])} after` : ''}.`, `🦷 Dent le ${fmtDay(r.t.d, { month: 'short', day: 'numeric' })} : éveil la nuit ${dDur(r.awake[0])} d’habitude → ${dDur(r.awake[1])} les jours avant${r.awake[2] != null ? ` → ${dDur(r.awake[2])} après` : ''}.`)));
  if (mod('visits')) {   // placement path: one neutral line, no dates, names or times
    const all = [...DAYS.values()].filter(d => d.D >= a && d.D <= b && !d.isToday && d.nightKnown), aft = all.filter(d => d.visit), oth = all.filter(d => !d.visit && !d.afterVisit);
    const wa = mean(aft.map(d => d.wakings ?? 0)), wo = mean(oth.map(d => d.wakings ?? 0)), aa = mean(aft.map(d => d.overnightAwake)), ao = mean(oth.map(d => d.overnightAwake));
    if (aft.length >= 2 && oth.length >= 3 && (wa - wo >= .5 || aa - ao >= 15)) pat.push(L(`🌙 Nights after time away from home for family visits: ${dNum(wa)} wakings and ${dDur(aa)} awake on average, vs ${dNum(wo)} and ${dDur(ao)} on other nights.`, `🌙 Nuits après une sortie pour les visites familiales : ${dNum(wa)} réveils et ${dDur(aa)} d’éveil en moyenne, contre ${dNum(wo)} et ${dDur(ao)} les autres nuits.`));
  }
  if (pat.length) out.push(sec('🔎', L('Patterns worth mentioning', 'Tendances à mentionner'), '', `<ul class="find">${pat.map(x => `<li>${x}</li>`).join('')}</ul>`));

  /* 10 · Questions for the doctor */
  const q = (REPS.comments[R.key] || '').trim(), sug = O.docSuggest !== false ? [...new Set(flags)].slice(0, 8) : [];
  out.push(sec('❓', L('Questions for the doctor', 'Questions pour le médecin'), '', `${q ? `<div class="dq">${esc(q)}</div>` : ''}${sug.length ? `<p class="sub" style="margin:6px 0 2px">${L('Worth asking about (from the log):', 'À aborder (d’après le journal) :')}</p><ul class="sg">${sug.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${q ? '' : `<div class="dlines">${'<div></div>'.repeat(sug.length ? 3 : 5)}</div>`}`));

  /* Optional appendix: the existing day-by-day table */
  if (O.docDaily) out.push(`<h2>${L('Appendix: day by day', 'Annexe : jour par jour')}</h2><table><thead><tr>${(FRL() ? ['Date', 'Lever', 'Siestes', 'Sommeil de jour', 'Coucher', 'Nuit', 'Réveils', 'Lait', 'Repas'] : ['Date', 'Wake', 'Naps', 'Day sleep', 'Bedtime', 'Night', 'Wakings', 'Milk', 'Meals']).map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${
    days.map(d => `<tr><td>${fmtDay(d.D)}</td><td>${dTime(d.wake)}</td><td>${d.napCount}</td><td>${dDur(d.daySleep)}</td><td>${dTime(d.bed)}</td><td>${d.nightKnown ? dDur(d.nightSleep) : '—'}</td><td>${d.wakings ?? '—'}</td><td>${dOz(d.milk)}</td><td>${d.accept == null ? '—' : Math.round(d.accept * 100) + '%'}</td></tr>`).join('')}</tbody></table>`);

  /* 1 · Header */
  const per = `${fmtDay(a, { month: 'long', day: 'numeric' })} – ${fmtDay(b, { month: 'long', day: 'numeric', year: 'numeric' })} (${plural(R.len, 'day', 'days', 'jour', 'jours')}${R.since === 'appt' && last ? L(`, since the appointment of ${fmtDay(last.d, { month: 'short', day: 'numeric' })}`, `, depuis le rendez-vous du ${fmtDay(last.d, { month: 'short', day: 'numeric' })}`) : ''})`;
  const by = O.preparedBy || ME?.name || '';
  const head = `<h1>${esc(name)} — ${L('Doctor visit summary', 'Sommaire pour la visite médicale')}</h1>
    <div class="sub">${[ageAt != null ? `${L('Age', 'Âge')}${CO()} <b>${esc(docAge(ageAt))}</b>` : '', `${L('Period', 'Période')}${CO()} ${esc(per)}`].filter(Boolean).join(' · ')}</div>
    <div class="sub">${[docAppt ? `${L('Appointment', 'Rendez-vous')}${CO()} <b>${esc(fmtDay(docAppt.D, { weekday: 'long', month: 'long', day: 'numeric' }))} ${fmtTime(docAppt.st)}</b> · ${esc(docAppt.title || '')}` : '', by ? `${L('Prepared by', 'Préparé par')} ${esc(by)}` : '', `${L('generated', 'produit le')} ${stampL(new Date())}`].filter(Boolean).join(' · ')}</div>
    ${scopeNoteHTML()}`;
  const foot = `${notTracked.length ? `<p class="dnt"><b>${L('Not tracked in this period', 'Non suivi dans cette période')}${CO()}</b> ${notTracked.join(' · ')}</p>` : ''}
    <p class="dnt">${L(`Averages use full days (today left out); arrows compare with the previous ${R.len} days${P ? ` (${fmtDayShort(R.prevA)}–${fmtDayShort(R.prevB)})` : ', not logged'} — green better, red worse, ＝ about the same. Night wakings count Awake / Restless entries of 5 minutes or more, from falling asleep to the morning wake-up. Sleep recommended for age: American Academy of Sleep Medicine consensus (National Sleep Foundation under 4 months). Percentiles: WHO Child Growth Standards. From the family's daily care log; not a medical assessment.`,
      `Les moyennes portent sur les journées complètes (sans aujourd’hui); les flèches comparent aux ${R.len} jours précédents${P ? ` (${fmtDayShort(R.prevA)}–${fmtDayShort(R.prevB)})` : ', non notés'} — vert mieux, rouge moins bien, ＝ à peu près pareil. Les réveils comptent les entrées Éveil / agitation de 5 minutes ou plus, de l’endormissement au lever. Sommeil recommandé pour l’âge : consensus de l’American Academy of Sleep Medicine (National Sleep Foundation avant 4 mois). Percentiles : normes de croissance de l’OMS. Tiré du journal de soins de la famille; ce n’est pas une évaluation médicale.`)}</p>`;
  $('#repBody').innerHTML = `<style>${DOC_CSS}</style><div class="docr">${head}${days.length ? out.join('') : L('<p>No data in this range.</p>', '<p>Aucune donnée dans cette période.</p>')}${foot}</div>`;
}

/** Report toolbar for the doctor type: period picker (since the last appointment or the last N days) and the appointment. */
function renderDoctorNav(R){
  const box = $('#repDocNav'); if (!box) return;
  const opts = [['appt', R.last ? L(`Since the last appointment (${fmtDayShort(R.last.d)})`, `Depuis le dernier rendez-vous (${fmtDayShort(R.last.d)})`) : L('Since the last appointment (none logged: 30 days)', 'Depuis le dernier rendez-vous (aucun noté : 30 jours)')],
    ...[14, 30, 60, 90].map(n => [String(n), L(`Last ${n} days`, `${n} derniers jours`)])];
  const cands = upcomingAppts(20).filter(x => !x.home);
  box.innerHTML = `<select id="repDocSince" title="${esc(L('Period covered', 'Période couverte'))}">${opts.map(([v, l]) => `<option value="${v}"${String(docSince) === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <select id="repDocAppt" title="${esc(L('Appointment', 'Rendez-vous'))}"><option value="">${L('No appointment named', 'Aucun rendez-vous précisé')}</option>${[...(docAppt && !cands.some(c => c.id === docAppt.id) ? [docAppt] : []), ...cands].map(x => `<option value="${esc(x.id)}"${docAppt?.id === x.id ? ' selected' : ''}>🩺 ${esc(fmtDayShort(x.D))} ${fmtTime(x.st)} · ${esc(x.title || '')}</option>`).join('')}</select>`;
}
function onDoctorNav(e){
  if (e.target.id === 'repDocSince') { docSince = e.target.value; repSnap = null; renderReport(); }
  if (e.target.id === 'repDocAppt') { const a = apptList().find(x => x.id === e.target.value); docAppt = a ? { id: a.id, title: a.title, D: a.D, st: a.st } : null; repSnap = null; renderReport(); }
}
