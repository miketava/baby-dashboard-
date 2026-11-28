
/* ════════════════════════════════════════════════════════════════════════════
   v1.16 — features that read only what is already logged:
   smart Quick Log suggestions, forgotten-entry nudges, bedtime-relative routines,
   tomorrow's visit card, trend alerts, Québec vaccine schedule, allergen upkeep,
   teething vs sleep, and a plain-text day log to paste into an AI assistant.
   ════════════════════════════════════════════════════════════════════════════ */

/** “today” / “tomorrow” / “in 3 days” / “3 days ago” for a day index. */
const relDay = D => { const n = D - todayIdx(); return n === 0 ? L('today', 'aujourd’hui') : n === 1 ? L('tomorrow', 'demain') : n === -1 ? L('yesterday', 'hier') : n > 0 ? L(`in ${n} days`, `dans ${n} jours`) : L(`${-n} days ago`, `il y a ${-n} jours`); };
const medianOf = a => { const b = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
const daysBack = (n, from = todayIdx() - 1) => { const out = []; for (let d = from; d > from - n; d--) { const m = DAYS.get(d); if (m) out.push(m); } return out; };

/* ── #2 Suggested now: up to 3 Quick Log buttons from what's open, today's plan and the usual entries at this hour ── */
function smartPicks(P, now = nowMin()){
  const out = [], add = i => { if (i >= 0 && !out.includes(i) && out.length < 3) out.push(i); };
  P.forEach((p, i) => { if (p.live) add(i); });
  const D = todayIdx(), today = DATA.events.filter(e => e.d === D), score = new Map();
  for (let d = D - 14; d < D; d++) {
    const seen = new Set(); DATA.events.filter(e => e.d === d && e.st != null && e.st >= now - 30 && e.st <= now + 45).forEach(e => seen.add(e.cat));
    seen.forEach(c => score.set(c, (score.get(c) || 0) + 1));
  }
  if (mod('schedule')) (todayMetrics().tpl?.items || []).forEach(it => { const a = parseTime(it.start); if (a == null || a < now - 30 || a > now + 30) return;
    const c = it.kind === 'meal' ? mealByTime(now) : it.kind === 'nap' ? 'Sleep - Nap' : it.kind === 'bedtime' ? 'Sleep - Night' : null; if (c) score.set(c, (score.get(c) || 0) + 10); });
  const open = new Set(DATA.events.filter(e => e.ongoing).map(e => e.cat));
  [...score].filter(([c, n]) => n >= 4 && !open.has(c) && !today.some(e => e.cat === c && e.st != null && Math.abs(e.st - now) <= 90)).sort((a, b) => b[1] - a[1])
    .forEach(([c]) => { const i = P.findIndex(p => !p.live && !p.both && p.cat === c); add(i >= 0 ? i : P.findIndex(p => !p.live && !p.both && p.meal && !p.fixed && catKind(c) === 'meal')); });
  return out;
}
function smartRowHTML(P){
  const pick = smartPicks(P); if (!pick.length) return '';
  return `<div class="smartrow"><span class="faint">${L('Suggested now', 'Suggéré maintenant')}</span><div class="smartbtns">${pick.map(i => { const p = P[i];
    return `<button class="preset sm ${p.live ? 'live' : ''}" data-p="${i}"><span class="e">${p.e}</span>${esc(p.meal ? catL(mealByTime(nowMin())) : p.label)}${p.sub ? `<span class="faint" style="font-size:11px">${p.sub}</span>` : ''}</button>`; }).join('')}</div></div>`;
}

/* ── #3 Forgotten-entry nudges (banner) ── */
function nudgeCallouts(m, D){
  if (D !== todayIdx() || viewOnly() || DATA.source === 'demo') return [];
  const out = [], nowA = nowAbs(), now = nowMin();
  DATA.events.filter(e => e.ongoing).forEach(e => {
    const lim = isNight(e) ? 14 * 60 : isSleep(e) ? 4 * 60 : e.k === 'visit' || e.k === 'outing' ? 6 * 60 : 4 * 60, el = nowA - e.s;
    if (el > lim) out.push({ cls:'', html:L(`⏰ <b>${esc(catL(e.cat))}</b> has been “in progress” for ${fmtDur(el)} (since ${fmtTime(e.st)}). Forgot to end it? ＋ → End.`, `⏰ <b>${esc(catL(e.cat))}</b> est « en cours » depuis ${fmtDur(el)} (depuis ${fmtTime(e.st)}). Oublié de la terminer? ＋ → Terminer.`) });
  });
  // usual entries not logged yet: a category logged on 10+ of the last 14 days, typically by now
  const usual = new Map();
  for (let d = D - 14; d < D; d++) { const firsts = new Map(); DATA.events.filter(e => e.d === d && e.st != null && ['meal', 'nap'].includes(e.k)).forEach(e => { if (!firsts.has(e.cat) || e.st < firsts.get(e.cat)) firsts.set(e.cat, e.st); });
    firsts.forEach((st, c) => { const u = usual.get(c) || []; u.push(st); usual.set(c, u); }); }
  [...usual].filter(([c, sts]) => sts.length >= 10).forEach(([c, sts]) => {
    const typ = medianOf(sts); if (typ == null || now < typ + 90 || now > typ + 300) return;
    if (DATA.events.some(e => e.d === D && e.cat === c)) return;
    out.push({ cls:'info', html:L(`📝 No <b>${esc(catL(c))}</b> logged yet today (usually around ${fmtTime(Math.round(typ))}).`, `📝 Pas encore de <b>${esc(catL(c))}</b> aujourd’hui (d’habitude vers ${fmtTime(Math.round(typ))}).`) });
  });
  return out.slice(0, 2);
}

/* ── Bedtime-relative routines: items with beforeBed (minutes) follow that day's bedtime; Baseline's weekday routines carry over ── */
function withRoutines(tp, m){
  if (!tp) return tp;
  const base = tplById('baseline'), dow = m?.D != null ? idxDate(m.D).getUTCDay() : null;
  if (base && tp.id !== 'baseline' && !tp.items.some(i => i.beforeBed)) {
    const carry = base.items.filter(i => i.beforeBed && (dow == null || itemOnDay(i, dow)));
    if (carry.length) tp = { ...tp, items: [...tp.items, ...carry.map(i => ({ ...i, carried:true }))] };
  }
  return tp;
}
/** Start time (minutes) of a plan item, resolving “min before bedtime”. */
const planStart = (it, bedT) => it.beforeBed && bedT != null ? bedT - +it.beforeBed : parseTime(it.start);

/* ── #4 Tomorrow's visit card ── */
function visitRecovery(){
  const vis = [...DAYS.values()].filter(m => m.visit && m.D < todayIdx()), home = [...DAYS.values()].filter(m => !m.visit && m.D < todayIdx() && m.D >= todayIdx() - 30 && !DAYS.get(m.D - 1)?.visit);
  if (vis.length < 2) return null;
  const avg = (arr, k) => { const v = arr.map(k).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const next = d => DAYS.get(d.D + 1);
  return { n: vis.length,
    awakeV: avg(vis, m => m.overnightAwake), awakeH: avg(home, m => m.overnightAwake),
    effortV: avg(vis, m => m.effort), effortH: avg(home, m => m.effort),
    nextV: avg(vis, m => next(m)?.score?.score), nextH: avg(home, m => m.score?.score) };
}
function renderTomorrowCard(){
  const box = $('#tomorrowCard'); if (!box) return;
  const T1 = todayIdx() + 1, pv = plannedVisit(T1), logged = DATA.events.find(e => e.d === T1 && e.k === 'visit' && e.st != null);
  const ap = !pv && !logged ? apptOn(T1) : null;   // v1.29.1: also tomorrow's appointment or home visit
  if (!mod('schedule') || (!pv && !logged && !ap) || nowMin() < 15 * 60) { box.innerHTML = ''; return; }
  const st = logged ? logged.st : pv ? pv.st : ap.st, en = logged ? (logged.t != null ? logged.t % DAY : null) : pv ? pv.en : ap.en;
  const what = ap ? (ap.home ? `🏠 ${L('Tomorrow: home visit', 'Demain : visite à domicile')}` : `🩺 ${L('Tomorrow: appointment', 'Demain : rendez-vous')}`) : `🚗 ${L('Tomorrow: parent visit', 'Demain : visite des parents')}`;
  const stub = { D:T1, visit: !!logged, visitStart: logged ? logged.st : null, naps:[], evs:[] };
  const tp = withRoutines(templateFor(stub), stub); stub.tpl = tp;
  const bedLines = tplItems(tp, 'bedtime').map(i => parseTime(i.start)).filter(x => x != null).sort((a, b) => a - b);
  const items = tp.items.filter(i => ['wake', 'nap', 'visit'].includes(i.kind) || i.beforeBed).map(i => ({ ...i, a: planStart(i, bedLines[0]) })).filter(i => i.a != null).sort((a, b) => a.a - b.a);
  const r = ap ? null : visitRecovery(), cmp = (v, h, f) => v == null || h == null ? '' : f(v, h);
  const rec = r ? [
    cmp(r.awakeV, r.awakeH, (v, h) => L(`awake at night ${fmtDur(Math.round(v))} on average (home days ${fmtDur(Math.round(h))})`, `éveil la nuit ${fmtDur(Math.round(v))} en moyenne (jours à la maison ${fmtDur(Math.round(h))})`)),
    cmp(r.effortV, r.effortH, (v, h) => L(`bedtime took ${fmtDur(Math.round(v))} (home ${fmtDur(Math.round(h))})`, `le coucher a pris ${fmtDur(Math.round(v))} (maison ${fmtDur(Math.round(h))})`)),
    cmp(r.nextV, r.nextH, (v, h) => L(`next-day routine score ${Math.round(v)} (home ${Math.round(h)})`, `score du lendemain ${Math.round(v)} (maison ${Math.round(h)})`)),
  ].filter(Boolean) : [];
  const harder = r && ((r.awakeV ?? 0) > (r.awakeH ?? 0) + 10 || (r.effortV ?? 0) > (r.effortH ?? 0) + 10);
  box.innerHTML = `<div class="card tmrw" style="margin-top:14px"><div class="card-head"><div><h2>${what} ${fmtTime(st)}${en != null ? '–' + fmtTime(en) : ''}</h2>
    <div class="sub" data-keep>${ap ? esc(ap.title) + ' · ' : ''}${esc(tp.name)}${tp.shift ? esc(shiftNote(tp)) : ''} · ${esc(fmtDay(T1))}</div></div>${ap && !ap.home && ap.id ? `<button type="button" class="btn sm" data-docrep="${esc(ap.id)}">📄 ${L('Summary for this appointment', 'Sommaire pour ce rendez-vous')}</button>` : ''}</div>
    <div class="pl">${items.map(i => `<div class="pl-row" style="--k:${KIND_STYLE[i.kind]?.color || '#64748b'}"><div class="pl-time">${fmtTime(i.a)}${i.end && !i.beforeBed ? `<span>–${fmtTime(parseTime(i.end))}</span>` : ''}</div><div class="pl-what"><b>${esc(i.label)}</b>${i.optional ? ` <span class="faint">(${L('optional', 'facultatif')})</span>` : ''}${i.note ? `<div class="pl-note">${esc(i.note)}</div>` : ''}</div><div></div></div>`).join('')}
      ${bedLines.length ? `<div class="pl-row" style="--k:${KIND_STYLE.bedtime?.color || '#4338ca'}"><div class="pl-time">${bedLines.map(fmtTime).join(' / ')}</div><div class="pl-what"><b>${L('Bedtime', 'Coucher')}</b>${bedLines.length > 1 ? `<div class="pl-note">${L('earlier one if she skips the bridge nap', 'le plus tôt si elle saute la sieste de transition')}</div>` : ''}</div><div></div></div>` : ''}</div>
    ${rec.length ? `<p class="hint" style="margin-top:10px">${L(`After the last ${r.n} visits: `, `Après les ${r.n} dernières visites : `)}${rec.join(' · ')}.${harder ? ' ' + L('Those nights tended to be harder, so an earlier, calmer evening may help.', 'Ces nuits ont souvent été plus difficiles : une soirée plus tôt et plus calme peut aider.') : ''}</p>` : ''}</div>`;
}

/* ── #5 Trend alerts: last 3 complete days vs the 14 before ── */
function trendAlerts(){
  const D = todayIdx(), recent = [1, 2, 3].map(k => DAYS.get(D - k)).filter(Boolean), base = daysBack(14, D - 4);
  if (recent.length < 3 || base.length < 7) return [];
  const out = [], all3 = (f) => recent.every(f), bm = k => medianOf(base.map(m => m[k]));
  const avg3 = k => recent.reduce((a, m) => a + m[k], 0) / 3;
  // key + v (the recent level) let a trend be acknowledged and come back only if it gets worse (v1.31)
  const up = (k, min, rel, icon, en, fr) => { const b = bm(k); if (b == null) return; if (all3(m => m[k] != null && m[k] >= b + Math.max(min, b * rel))) out.push({ key:k, dir:1, v:avg3(k), tol:min, icon, text:L(en(b, recent.map(m => m[k])), fr(b, recent.map(m => m[k]))) }); };
  const down = (k, min, rel, icon, en, fr) => { const b = bm(k); if (b == null || b <= 0) return; if (all3(m => m[k] != null && m[k] <= b - Math.max(min, b * rel))) out.push({ key:k, dir:-1, v:avg3(k), tol:min, icon, text:L(en(b, recent.map(m => m[k])), fr(b, recent.map(m => m[k]))) }); };
  const durs = a => a.map(x => fmtDur(Math.round(x))).join(', ');
  up('overnightAwake', 15, .5, '🌙', (b, v) => `Awake at night went up three nights running (${durs(v)}; usually ${fmtDur(Math.round(b))}).`, (b, v) => `Plus d’éveil la nuit trois nuits de suite (${durs(v)}; d’habitude ${fmtDur(Math.round(b))}).`);
  up('effort', 10, .5, '🛏️', (b, v) => `Bedtime has taken longer three days running (${durs(v)}; usually ${fmtDur(Math.round(b))}).`, (b, v) => `Le coucher prend plus de temps trois jours de suite (${durs(v)}; d’habitude ${fmtDur(Math.round(b))}).`);
  up('bed', 30, 0, '🕗', (b, v) => `Bedtime has been later three days running (${v.map(x => fmtTime(x % DAY)).join(', ')}; usually ${fmtTime(Math.round(b) % DAY)}).`, (b, v) => `Coucher plus tard trois jours de suite (${v.map(x => fmtTime(x % DAY)).join(', ')}; d’habitude ${fmtTime(Math.round(b) % DAY)}).`);
  down('daySleep', 30, .2, '💤', (b, v) => `Less daytime sleep three days running (${durs(v)}; usually ${fmtDur(Math.round(b))}).`, (b, v) => `Moins de sommeil de jour trois jours de suite (${durs(v)}; d’habitude ${fmtDur(Math.round(b))}).`);
  if (mod('milk')) down('milk', 2, .25, '🍼', (b, v) => `Less milk three days running (${v.map(fmtOz).join(', ')}; usually ${fmtOz(b)}).`, (b, v) => `Moins de lait trois jours de suite (${v.map(fmtOz).join(', ')}; d’habitude ${fmtOz(b)}).`);
  const ref = recent.flatMap(m => m.evs.filter(e => isMeal(e) && e.outcome === 'Refused')).length;
  if (ref >= 3) out.push({ key:'refused', dir:1, v:ref, tol:1, icon:'🍽', text:L(`${ref} meals refused in the last three days.`, `${ref} repas refusés dans les trois derniers jours.`) });
  // nap transition: fewer naps than the plan on most of the last 7 days
  const wk = daysBack(7, D - 1), planN = tplItems(tplById('baseline'), 'nap').filter(i => !i.optional).length, age = ageDays();
  if (wk.length >= 6 && planN >= 2) { const short = wk.filter(m => m.napCount != null && m.napCount < planN).length;
    if (short >= 4) out.push({ key:'fewerNaps', dir:1, v:short, tol:1, icon:'🔀', text:L(`Fewer naps than planned on ${short} of the last ${wk.length} days${age != null && age > 330 && age < 600 ? '. Around 13–18 months many children move from two naps to one; the age-band review in Settings → Targets can suggest a one-nap day' : ''}.`,
      `Moins de siestes que prévu ${short} jours sur ${wk.length}${age != null && age > 330 && age < 600 ? '. Vers 13 à 18 mois, beaucoup d’enfants passent de deux siestes à une; la révision selon l’âge (Paramètres → Cibles) peut proposer une journée à une sieste' : ''}.`) }); }
  if (wk.length >= 6 && planN === 1) { const none = wk.filter(m => m.napCount === 0).length;
    if (none >= 3) out.push({ key:'noNap', dir:1, v:none, tol:1, icon:'🔀', text:L(`No nap on ${none} of the last ${wk.length} days.`, `Aucune sieste ${none} jours sur ${wk.length}.`) }); }
  return out.map(x => ({ ...x, acked: trendAcked(x) }));
}
/* Acknowledging a trend (“Got it”): hidden from the Today banner and folded on the Routine tab for 14 days, by then the
   two-week comparison has caught up with the new normal. It comes back sooner if it gets clearly worse than when it was
   acknowledged. Shared between caregivers (Config tab). Per child. */
const TREND_ACK_DAYS = 14;
const trendAckKey = x => (multiKid() ? (S.kids[kidIdx()]?.id || kidIdx()) + ':' : '') + x.key;
function trendAcked(x){
  const a = (S.trendAck || {})[trendAckKey(x)]; if (!a) return null;
  if (todayIdx() - parseDate(a.at) >= TREND_ACK_DAYS) return null;
  return (x.v - a.v) * x.dir > Math.max(x.tol, Math.abs(a.v) * .15) ? null : a;   // clearly worse: show it again
}
function ackTrend(key, undo){
  const x = trendAlerts().find(t => t.key === key); if (!x) return;
  S.trendAck = { ...(S.trendAck || {}) };
  for (const k in S.trendAck) if (todayIdx() - parseDate(S.trendAck[k].at) >= TREND_ACK_DAYS) delete S.trendAck[k];   // tidy old ones
  if (undo) delete S.trendAck[trendAckKey(x)]; else S.trendAck[trendAckKey(x)] = { at: isoOf(todayIdx()), v: Math.round(x.v * 10) / 10, by: ME?.name || '' };
  saveSettings(); renderAll();
  if (!undo) toast(L(`Got it: hidden for ${TREND_ACK_DAYS} days unless it gets worse`, `Compris : masqué ${TREND_ACK_DAYS} jours, sauf si ça empire`));
}
function renderTrends(){
  const box = $('#trendBox'); if (!box) return;
  const all = trendAlerts(), a = all.filter(x => !x.acked), done = all.filter(x => x.acked), ro = viewOnly();
  const ackBtn = x => ro ? '' : ` <button class="btn sm ghost" data-act="trendAck" data-k="${x.key}">✓ ${L('Got it', 'Compris')}</button>`;
  const doneHTML = done.length ? `<details class="trend-done" style="margin-top:6px"><summary class="faint">${L(`Acknowledged (${done.length})`, `Pris en compte (${done.length})`)}</summary><ul class="find" style="opacity:.7">${done.map(x => `<li>${x.icon} ${esc(x.text)} <span class="faint">· ${L(`acknowledged ${relDay(parseDate(x.acked.at))}`, `pris en compte ${relDay(parseDate(x.acked.at))}`)}${x.acked.by ? ' · ' + esc(x.acked.by) : ''}</span>${ro ? '' : ` <button class="btn sm ghost" data-act="trendUndo" data-k="${x.key}">${L('Undo', 'Annuler')}</button>`}</li>`).join('')}</ul></details>` : '';
  if (!a.length && done.length) { box.innerHTML = `<p class="muted" style="margin:2px 0">${L('Nothing new to watch.', 'Rien de nouveau à surveiller.')}</p>${doneHTML}`; return; }
  box.innerHTML = a.length ? `<ul class="find">${a.map(x => `<li>${x.icon} ${esc(x.text)}${ackBtn(x)}</li>`).join('')}</ul>${doneHTML}`
    : `<p class="muted" style="margin:2px 0">${L('Nothing unusual in the last three days compared with the two weeks before.', 'Rien d’inhabituel dans les trois derniers jours par rapport aux deux semaines précédentes.')}</p>`;
}

/* ── Immunization schedule (Québec PIQ or Ontario's routine schedule), from the date of birth + the Vaccine rows ── */
const VAX_QC = () => [
  { mo:2,  v:L('Diphtheria-pertussis-tetanus-hepatitis B-polio-Hib · pneumococcal · rotavirus', 'Diphtérie-coqueluche-tétanos-hépatite B-polio-Hib · pneumocoque · rotavirus') },
  { mo:4,  v:L('Diphtheria-pertussis-tetanus-hepatitis B-polio-Hib · pneumococcal · rotavirus', 'Diphtérie-coqueluche-tétanos-hépatite B-polio-Hib · pneumocoque · rotavirus') },
  { mo:12, v:L('Diphtheria-pertussis-tetanus-polio-Hib · pneumococcal · measles-mumps-rubella-varicella', 'Diphtérie-coqueluche-tétanos-polio-Hib · pneumocoque · rougeole-rubéole-oreillons-varicelle'), late:true },
  { mo:18, v:L('Meningococcal · measles-mumps-rubella-varicella · hepatitis A-hepatitis B', 'Méningocoque · rougeole-rubéole-oreillons-varicelle · hépatite A-hépatite B'), late:true },
  { mo:48, to:72, v:L('Diphtheria-pertussis-tetanus-polio (between 4 and 6 years)', 'Diphtérie-coqueluche-tétanos-polio (entre 4 et 6 ans)') },
];
// Ontario's routine publicly funded schedule, birth to 6 (ontario.ca, checked Nov 2026)
const VAX_ON = () => [
  { mo:2,  v:L('Diphtheria-pertussis-tetanus-polio-Hib · pneumococcal · rotavirus', 'Diphtérie-coqueluche-tétanos-polio-Hib · pneumocoque · rotavirus') },
  { mo:4,  v:L('Diphtheria-pertussis-tetanus-polio-Hib · pneumococcal · rotavirus', 'Diphtérie-coqueluche-tétanos-polio-Hib · pneumocoque · rotavirus') },
  { mo:6,  v:L('Diphtheria-pertussis-tetanus-polio-Hib', 'Diphtérie-coqueluche-tétanos-polio-Hib') },
  { mo:12, v:L('Pneumococcal · meningococcal C · measles-mumps-rubella', 'Pneumocoque · méningocoque C · rougeole-oreillons-rubéole'), late:true },
  { mo:18, v:L('Diphtheria-pertussis-tetanus-polio-Hib', 'Diphtérie-coqueluche-tétanos-polio-Hib') },
  { mo:48, to:72, v:L('Tetanus-diphtheria-pertussis-polio · measles-mumps-rubella-varicella (between 4 and 6 years)', 'Tétanos-diphtérie-coqueluche-polio · rougeole-oreillons-rubéole-varicelle (entre 4 et 6 ans)'), late:true },
];
const VAX_SCHEDULES = { qc: { table: VAX_QC, name: () => L('Québec schedule', 'calendrier du Québec'), src: () => L('From the Québec immunization program (PIQ)', 'Selon le Programme d’immunisation du Québec (PIQ)') },
                        on: { table: VAX_ON, name: () => L('Ontario schedule', 'calendrier de l’Ontario'), src: () => L('From Ontario’s routine immunization schedule', 'Selon le calendrier de vaccination systématique de l’Ontario') } };
const vaxSched = () => VAX_SCHEDULES[S.vaxSchedule || 'qc'] || null;
const addMonths = (D, mo) => { const d = idxDate(D); d.setUTCMonth(d.getUTCMonth() + mo); return parseDate(d.toISOString().slice(0, 10)); };
function vaxStatus(){
  const dob = dobIdx(), sc = vaxSched(); if (dob == null || !sc) return null;
  const shots = DATA.events.filter(e => e.k === 'vaccine').sort((a, b) => a.d - b.d), used = new Set();
  return sc.table().map((s, i, all) => {
    const due = addMonths(dob, s.mo), nextDue = all[i + 1] ? addMonths(dob, all[i + 1].mo) : Infinity;
    const got = shots.find(e => !used.has(e) && e.d >= due - 30 && e.d < nextDue - 30); if (got) used.add(got);
    return { ...s, due, got };
  });
}
/** Reactions logged in the days after a vaccine: fever (Temperature ≥ 38 °C), health notes, difficult behaviour. */
function postVaxNotes(v){
  const win = v.late ? 14 : 3, ev = DATA.events.filter(e => e.d >= v.got.d && e.d <= v.got.d + win && e.s >= v.got.s);
  const fev = ev.filter(e => e.mk === 'temp' && e.mv != null && e.mv >= 38), inc = ev.filter(e => e.k === 'incident'), beh = ev.filter(e => e.k === 'behaviour' && e.outcome === 'Difficult');
  return [fev.length ? L(`fever ${fmtTemp(Math.max(...fev.map(e => e.mv)))} (day ${fev[0].d - v.got.d})`, `fièvre ${fmtTemp(Math.max(...fev.map(e => e.mv)))} (jour ${fev[0].d - v.got.d})`) : '',
    ...inc.slice(0, 2).map(e => `${esc(e.notes || catL(e.cat))} (${L('day', 'jour')} ${e.d - v.got.d})`), beh.length ? L(`${beh.length} difficult-behaviour note${beh.length > 1 ? 's' : ''}`, `${plural(beh.length, '', '', 'note de comportement difficile', 'notes de comportement difficile')}`) : ''].filter(Boolean);
}
function renderVaccines(){
  const pm = $('#btnPastMeasure'); if (pm) { pm.textContent = L('＋ Past measurement', '＋ Mesure passée'); pm.classList.toggle('hidden', viewOnly()); }
  const box = $('#vaxBox'), card = $('#vaxCard'); if (!box) return;
  const st = vaxStatus(); card.classList.toggle('hidden', !st);
  if (!st) return;
  const T0 = todayIdx();
  const sc = vaxSched(), h2 = card.querySelector('h2'), sub = card.querySelector('.card-head .sub');
  if (h2) h2.textContent = `${L('Vaccines', 'Vaccins')} · ${sc.name().replace(/^./, c => c.toUpperCase())}`;
  if (sub) sub.textContent = `${sc.src()} ${L('and the Vaccine rows you log · change or turn off in Settings → Reminders', 'et les lignes Vaccine que vous notez · à changer ou désactiver dans Réglages → Rappels')}`;
  box.innerHTML = `<div class="tbl-wrap"><table class="dt"><thead><tr>${(FRL() ? ['Âge', 'Vaccins', 'État', 'Après'] : ['Age', 'Vaccines', 'Status', 'After']).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${st.map(s => {
    const age = s.to ? L('4–6 y', '4–6 ans') : L(`${s.mo} mo`, `${s.mo} mois`);
    const state = s.got ? `<span class="pl-did">✓ ${esc(fmtDayShort(s.got.d))}</span>` : s.due > T0 ? `<span class="faint">${L('due', 'prévu')} ${esc(fmtDayShort(s.due))}</span>` : `<b style="color:var(--warn)">${L('due since', 'prévu depuis le')} ${esc(fmtDayShort(s.due))}</b>`;
    const after = s.got ? (postVaxNotes(s).join(' · ') || `<span class="faint">${L('nothing logged', 'rien de noté')}</span>`) : '';
    const btn = !s.got && !viewOnly() ? ` <button class="btn sm" data-vaxlog="${s.mo}">✓ ${L('Log date', 'Noter la date')}</button>` : '';
    return `<tr><td>${age}</td><td>${esc(s.v)}</td><td>${state}${btn}</td><td>${after}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint">${L(`A Vaccine row on or after the due date (or up to 30 days before) counts for that visit. “After” lists fevers, health notes and difficult days logged in the 3 days after (14 days for doses with measles or varicella vaccine, whose reactions can come later). Vaccines given before you started logging (from the vaccination booklet) can be added as Vaccine rows with their real date. ${S.vaxSchedule === 'on' ? 'Book with your family doctor, nurse practitioner or local public health unit; Health811 for questions.' : 'Book through your CLSC or Québec.ca/vaccination; Info-Santé 811 for questions.'}`, `Une ligne Vaccine à la date prévue ou après (ou jusqu’à 30 jours avant) compte pour cette visite. « Après » liste les fièvres, notes de santé et journées difficiles notées dans les 3 jours suivants (14 jours pour les doses contenant le vaccin rougeole ou varicelle, dont les réactions peuvent venir plus tard). Les vaccins reçus avant le début du journal (voir le carnet de vaccination) peuvent être ajoutés comme lignes Vaccine à leur vraie date. ${S.vaxSchedule === 'on' ? 'Rendez-vous chez votre médecin de famille, une infirmière praticienne ou le bureau de santé publique local; Santé811 pour les questions.' : 'Rendez-vous au CLSC ou sur Québec.ca/vaccination; Info-Santé 811 pour les questions.'}`)}</p>`;
}
function vaxCallouts(){
  const st = vaxStatus(); if (!st || viewOnly()) return [];
  const T0 = todayIdx(), out = [];
  const next = st.filter(s => !s.got && s.due - T0 <= 14).pop(); if (next && next.due - T0 >= -60)
    out.push({ cls:'info', html: next.due >= T0 ? L(`💉 ${next.to ? '4–6 year' : next.mo + '-month'} vaccines due <b>${relDay(next.due)}</b> (${esc(fmtDay(next.due))}, ${vaxSched().name()}).`, `💉 Vaccins de ${next.to ? '4–6 ans' : next.mo + ' mois'} prévus <b>${relDay(next.due)}</b> (${esc(fmtDay(next.due))}, ${vaxSched().name()}).`)
      : L(`💉 ${next.mo}-month vaccines were due ${esc(fmtDay(next.due))}. Log a Vaccine row once they’re done.`, `💉 Les vaccins de ${next.mo} mois étaient prévus le ${esc(fmtDay(next.due))}. Ajoutez une ligne Vaccine une fois faits.`) });
  const recent = st.filter(s => s.got && T0 - s.got.d <= (s.late ? 14 : 2));
  recent.forEach(s => { const dn = T0 - s.got.d;
    out.push({ cls:'info', html: s.late && dn > 2 ? L(`💉 ${s.mo}-month vaccines ${dn} days ago: a mild fever or rash 1–2 weeks after these doses is common. Log a Temperature or Health note if you see one.`, `💉 Vaccins de ${s.mo} mois il y a ${dn} jours : une légère fièvre ou des boutons 1 à 2 semaines après ces doses sont fréquents. Notez une Température ou une note de santé si c’est le cas.`)
      : L(`💉 Post-vaccine watch (day ${dn + 1}): log any fever, unusual fussiness or redness at the injection site.`, `💉 Suivi après vaccin (jour ${dn + 1}) : notez toute fièvre, irritabilité inhabituelle ou rougeur au point d’injection.`) }); });
  return out;
}

/* ── #6 Allergen upkeep ── */
function allergenUpkeep(){
  const last = new Map(), first = new Map(), n30 = new Map(), T0 = todayIdx();
  DATA.events.filter(e => isMeal(e) || e.k === 'snack').forEach(e => foodsOf(e).forEach(f => { const a = allergenOf(f); if (!a) return;
    if (!first.has(a) || e.d < first.get(a)) first.set(a, e.d); if (!last.has(a) || e.d > last.get(a).d) last.set(a, { d:e.d, food:f }); if (e.d > T0 - 30) n30.set(a, (n30.get(a) || 0) + 1); }));
  return ALLERGENS.map(([a]) => ({ a, first:first.get(a), last:last.get(a), n30:n30.get(a) || 0 })).filter(x => x.last);
}
function renderAllergens(){
  const box = $('#allergyBox'); if (!box) return;
  const T0 = todayIdx(), rows = allergenUpkeep().sort((x, y) => x.last.d - y.last.d), notYet = ALLERGENS.map(([a]) => a).filter(a => !rows.some(r => r.a === a));
  const AFR = { Egg:'Œuf', Dairy:'Produits laitiers', Peanut:'Arachide', 'Tree nut':'Noix', Wheat:'Blé', Soy:'Soya', Fish:'Poisson', Shellfish:'Crustacés', Sesame:'Sésame' }, an = a => FRL() ? AFR[a] || a : a;
  box.innerHTML = rows.length ? `<div class="tbl-wrap"><table class="dt"><thead><tr>${(FRL() ? ['Groupe', 'Dernière fois', 'Il y a', '30 jours'] : ['Group', 'Last offered', 'Days ago', 'Last 30 days']).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => { const ago = T0 - r.last.d;
      return `<tr><td>⚠ ${esc(an(r.a))}</td><td>${esc(fmtDayShort(r.last.d))} · ${esc(r.last.food)}</td><td style="${ago > 7 ? 'color:var(--warn);font-weight:700' : ''}">${ago}</td><td>${r.n30}×</td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint">${L('Days ago in orange: more than a week. Once a common allergen is in her diet, keeping it there regularly is usually recommended; check with your pediatrician for her.', 'Jours en orange : plus d’une semaine. Une fois un allergène courant introduit, il est généralement recommandé de continuer à l’offrir régulièrement; vérifiez avec votre pédiatre.')}${notYet.length ? ' ' + L(`Not seen in the log yet: ${notYet.map(an).join(', ')}.`, `Pas encore vus dans le journal : ${notYet.map(an).join(', ')}.`) : ''}</p>`
    : `<p class="muted">${L('No common allergen groups found in the foods logged so far.', 'Aucun groupe d’allergènes courant dans les aliments notés jusqu’ici.')}</p>`;
}

/* ── #7 Teething vs sleep: 3 days before and after each new tooth ── */
function teethSleepRows(){
  const teeth = DATA.events.filter(e => e.k === 'tooth').sort((a, b) => b.d - a.d);
  const avg = (ds, k) => { const v = ds.map(d => DAYS.get(d)?.[k]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return teeth.slice(0, 8).map(t => { const pre = [t.d - 3, t.d - 2, t.d - 1, t.d], post = [t.d + 1, t.d + 2, t.d + 3].filter(d => d < todayIdx()), base = [];
    for (let d = t.d - 17; d < t.d - 3; d++) base.push(d);
    return { t, awake:[avg(base, 'overnightAwake'), avg(pre, 'overnightAwake'), post.length ? avg(post, 'overnightAwake') : null], day:[avg(base, 'daySleep'), avg(pre, 'daySleep'), post.length ? avg(post, 'daySleep') : null] }; });
}
function renderTeethSleep(){
  const box = $('#teethSleep'); if (!box) return;
  const rows = teethSleepRows().filter(r => [...r.awake, ...r.day].some(v => v != null)); if (!rows.length) { box.innerHTML = ''; return; }
  const f = v => v == null ? '—' : fmtDur(Math.round(v));
  box.innerHTML = `<h3 style="margin:14px 0 6px;font-size:14px">${L('Teething and sleep', 'Dents et sommeil')}</h3><div class="tbl-wrap"><table class="dt"><thead><tr>${(FRL() ? ['Dent', 'Éveil la nuit · avant 2 sem. → 3 j avant → 3 j après', 'Sommeil de jour · idem'] : ['Tooth', 'Awake at night · 2 weeks before → 3 days before → 3 days after', 'Day sleep · same']).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r =>
    `<tr><td>${esc(fmtDayShort(r.t.d))} · ${esc(r.t.tags.join(' ') || r.t.notes || '')}</td><td>${r.awake.map(f).join(' → ')}</td><td>${r.day.map(f).join(' → ')}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">${L('Compares the nights around each tooth you logged with the two weeks before. A rise around the tooth date suggests teething played a part.', 'Compare les nuits autour de chaque dent notée aux deux semaines précédentes. Une hausse autour de la date suggère que la poussée y était pour quelque chose.')}</p>`;
}

/* ── Copy today's entries as plain text for an AI assistant ── */
function dayLogText(D = todayIdx()){
  const m = DAYS.get(D) || todayMetrics(), name = S.profile.name || L('the child', 'l’enfant'), evs = DATA.events.filter(e => e.d === D || (e.t != null && e.d < D && e.t > D * DAY)).sort((a, b) => (a.allDay ? -1 : 0) - (b.allDay ? -1 : 0) || a.s - b.s);
  const line = e => { const tm = e.allDay ? L('all day', 'toute la journée') : e.t != null ? `${fmtTime(e.st)}–${e.ongoing ? L('ongoing', 'en cours') : fmtTime(e.t % DAY)}${e.d < D ? L(' (from the night before)', ' (depuis la veille)') : ''}` : fmtTime(e.st);
    return `- ${tm} | ${e.cat}${e.milk != null ? ' | ' + fmtOz(e.milk) : ''}${e.water != null ? ' | ' + fmtMl(e.water) : ''}${e.mv != null ? ' | ' + fmtMeasure(e.mk, e.mv) : ''}${e.tags.length ? ' | tags: ' + e.tags.join(', ') : ''}${e.outcome ? ' | ' + e.outcome : ''}${e.notes ? ' | “' + e.notes + '”' : ''}${e.raw?.by ? ' | ' + L('by', 'par') + ' ' + e.raw.by : ''}`; };
  const tp = m.tpl;
  return [L(`Write a short, warm, factual summary of ${name}'s day from this caregiver log. Use only what the log says; don't invent details. Cover sleep, feeding, mood and anything notable, in plain language. Then list anything that looks different from the plan.`,
      `Rédige un court résumé chaleureux et factuel de la journée de ${name} à partir de ce journal. N’utilise que ce que dit le journal, sans rien inventer. Parle du sommeil, de l’alimentation, de l’humeur et de tout fait marquant, simplement. Puis indique ce qui diffère du plan.`),
    '', `${L('Child', 'Enfant')}: ${name}${ageDays() != null ? ' (' + ageLabel(ageDays()) + ')' : ''}`, `${L('Date', 'Date')}: ${fmtDay(D)}`,
    tp ? `${L('Day plan', 'Plan du jour')}: ${tp.name} — ${tp.items.filter(i => parseTime(i.start) != null && i.kind !== 'cutoff').map(i => `${i.start}${i.end ? '–' + i.end : ''} ${i.label}`).join('; ')}` : '',
    '', L(`Log (${evs.length} entries):`, `Journal (${evs.length} entrées) :`), ...evs.map(line),
    '', L('Totals', 'Totaux') + `: ${L('day sleep', 'sommeil de jour')} ${fmtDur(m.daySleep || 0)}${m.milk ? ' · ' + L('milk', 'lait') + ' ' + fmtOz(m.milk) : ''}${m.water ? ' · ' + L('water', 'eau') + ' ' + fmtMl(m.water) : ''}${m.score?.score != null ? ' · ' + L('routine score', 'score de routine') + ' ' + m.score.score + '/100' : ''}`].filter(x => x !== null).join('\n');
}
async function copyDayLog(){
  const txt = dayLogText();
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ text: txt, title: L('Day log', 'Journal du jour') }); return; }
    await navigator.clipboard.writeText(txt); toast(L('Today’s log copied — paste it into your AI assistant', 'Journal du jour copié — collez-le dans votre assistant IA'));
  } catch (err) { if (err?.name === 'AbortError') return;
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(L('Today’s log copied', 'Journal du jour copié')); } finally { ta.remove(); } }
}

/** “✓ Log date” on a vaccine row: Quick Log pre-filled with a Vaccine row (date = due date, change it to the booklet's date). */
function logVaccineFromSchedule(mo){
  const s = (vaxStatus() || []).find(x => String(x.mo) === String(mo)); if (!s) return;
  const D = Math.min(s.due, todayIdx());
  openQuickLogWith({ 'Date': isoOf(D), 'Start Time':'', 'End Time':'', 'Category':'Vaccine', 'Notes': (s.to ? L('4–6 year vaccines: ', 'Vaccins de 4–6 ans : ') : L(`${s.mo}-month vaccines: `, `Vaccins de ${s.mo} mois : `)) + s.v, 'Tags': `${s.to ? '4-6y' : s.mo + 'mo'}, qc-schedule`, 'Outcome / Rating':'Resolved' });
  toast(L('Set the date from the booklet, then Save', 'Indiquez la date du carnet, puis Enregistrer'));
}

/** “＋ Past measurement” on the Growth card: Quick Log for a Weight / Height / Head row with an editable date (e.g. from the health booklet). */
function logPastMeasurement(kind = 'Weight'){
  openQuickLogWith({ 'Date': isoOf(todayIdx()), 'Start Time':'', 'End Time':'', 'Category': kind, 'Value':'', 'Notes': L('From the health booklet', 'D’après le carnet de santé') });
  toast(L('Set the date and the measurement, then Save. Change Category to Height or Head Circumference for the other measures.', 'Indiquez la date et la mesure, puis Enregistrer. Changez la catégorie pour Height ou Head Circumference pour les autres mesures.'));
}
