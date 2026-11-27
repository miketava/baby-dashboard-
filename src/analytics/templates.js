/* ── Templates ── */
const tplById = id => S.templates.find(x => x.id === id);
/** Auto-pick a template from a day's rows (v2 rule: off-site Visit ≤ 09:30 → early, later → late; else baseline). */
const hhmm = x => { x = ((x % DAY) + DAY) % DAY; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
/** Visits on the family's Google Calendar (date, start, end only), sent by Apps Script v1.1+. */
function plannedVisit(D){
  const p = DATA.base?.planned; if (!Array.isArray(p) || D == null) return null;
  const d = isoOf(D), v = p.filter(x => x.date === d).map(x => ({ st: parseTime(x.start), en: parseTime(x.end) })).filter(x => x.st != null).sort((a, b) => a.st - b.st);
  return v[0] || null;
}
const upcomingVisits = (n = 3) => (Array.isArray(DATA.base?.planned) ? DATA.base.planned : []).map(x => ({ D: parseDate(x.date), st: parseTime(x.start), en: parseTime(x.end) }))
  .filter(x => x.D != null && x.st != null && (x.D > todayIdx() || (x.D === todayIdx() && (x.en ?? x.st) >= nowMin()))).sort((a, b) => a.D - b.D || a.st - b.st).slice(0, n);
/** Visit start for template choice: the logged visit, else the one on the calendar. */
const visitAt = m => m?.visit && m.visitStart != null ? m.visitStart : plannedVisit(m?.D)?.st ?? null;
function autoTemplate(m){
  const vs = visitAt(m), base = tplById('baseline') || S.templates[0];
  if (vs != null) {   // v1.26: early ≤ cutoff (09:30) · late morning ≤ 11:30 · midday ≤ 13:15 · afternoon after
    const cut = parseTime(T().earlyVisitCutoff) ?? 570, late = tplById('late-visit');
    return (vs <= cut ? tplById('early-visit') : vs <= 690 ? late : vs <= 795 ? tplById('midday-visit') || late : tplById('afternoon-visit') || late) || base;
  }
  const ap = typeof apptOn === 'function' && m?.D != null ? apptOn(m.D) : null;   // an accepted calendar appointment
  if (ap?.home) return homeVisitTpl(base, ap) || base;   // a visit at home: the usual day, plus the visit
  if (ap) return (ap.st < 660 ? tplById('appt-am') : ap.st <= 795 ? tplById('appt-midday') || tplById('appt-pm') : tplById('appt-pm')) || base;   // before 11:00 · until 13:15 · later
  return base;
}
function templateFor(m){ return alignToWake(alignToVisit(forWeekday(templateFor0(m), m), m), m); }
/** Template items can be limited to some weekdays (“Mon, Thu, Sun” / “lun, jeu, dim”), e.g. bath-night routines or a weekly home visit. */
const WD = { su:0, mo:1, tu:2, we:3, th:4, fr:5, sa:6, di:0, lu:1, ma:2, me:3, je:4, ve:5 };
const parseDays = s => { const out = new Set(); String(s || '').toLowerCase().split(/[\s,;/]+/).forEach(w => { const k = w.normalize('NFD').replace(/[^a-z]/g, '').slice(0, 2); if (k in WD) out.add(WD[k]); }); return out; };
const itemOnDay = (i, dow) => { if (!i.days) return true; const d = parseDays(i.days); return !d.size || d.has(dow); };
function forWeekday(tp, m){
  if (!tp || m?.D == null || !tp.items.some(i => i.days)) return tp;
  const dow = idxDate(m.D).getUTCDay();
  return { ...tp, items: tp.items.filter(i => itemOnDay(i, dow)) };
}
function templateFor0(m){
  if (m && m.D === todayIdx() && S.todayTpl?.date === isoOf(m.D) && S.todayTpl.id !== 'auto' && tplById(S.todayTpl.id)) return tplById(S.todayTpl.id);
  if (S.overlayTpl !== 'auto' && tplById(S.overlayTpl)) return tplById(S.overlayTpl);
  return autoTemplate(m);
}
/** Visit-day templates assume a visit time. When the real visit starts at another time (15 min – 4 h off), slide the visit band
    and the naps right before / after it (the car naps) by the same amount, so they're judged against the visit that actually happened.
    Meals, the bridge nap, the cutoff and bedtimes stay where they are. */
function alignToVisit(tp, m){
  const ap = visitAt(m) == null && m?.D != null && typeof apptOn === 'function' ? apptOn(m.D) : null;   // appointment days slide the same way
  const at = visitAt(m) ?? ap?.st, pv = m?.visit ? null : (plannedVisit(m?.D) || ap);
  if (!tp || at == null) return tp;
  const v = tp.items.find(i => i.kind === 'visit' && !!i.appt === !!ap && parseTime(i.start) != null && parseTime(i.end) != null); if (!v) return tp;
  const vs = parseTime(v.start), ve = parseTime(v.end), off = at - vs;
  if (Math.abs(off) < 15 || Math.abs(off) > 240) return pv?.en != null ? { ...tp, items: tp.items.map(i => i === v ? { ...i, end: hhmm(pv.en) } : i) } : tp;
  const hh = x => { x = ((x % DAY) + DAY) % DAY; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
  const near = i => { const a = parseTime(i.start), b = parseTime(i.end); return i.kind === 'visit' || (i.kind === 'nap' && !i.optional && b != null && ((b <= vs && vs - b <= 45) || (a >= ve && a - ve <= 45))); };
  return { ...tp, shift: off, anchor: ap ? 'appt' : 'visit', items: tp.items.map(i => i.end && near(i) ? { ...i, start: hh(parseTime(i.start) + off), end: i === v && pv?.en != null ? hh(pv.en) : hh(parseTime(i.end) + off), shifted: true } : i) };
}
/** Early wake-up (v1.35): woke 20+ min before the template's Wake → the morning up to the end of Nap 1 moves earlier by the
    lead, capped (Targets → “Early wake-up: move Nap 1 by up to”, default 30 min). Holding close to the schedule instead of
    following the wake window all the way avoids reinforcing early wakings; Nap 2, the cutoff and bedtime stay put, so the
    day eases back. Not on visit / appointment days (the visit sets those naps). Plan and routine score both use it. */
const EARLY_WAKE_MIN = 20;
function alignToWake(tp, m){
  if (!tp || tp.shift || m?.wake == null || !mod('schedule')) return tp;
  const w = tplItems(tp, 'wake')[0], cap = +(tplTargets(tp).earlyWakeShift ?? 30); if (!w || !(cap > 0)) return tp;
  const lead = parseTime(w.start) - m.wake; if (lead < EARLY_WAKE_MIN) return tp;
  const nap1 = tplItems(tp, 'nap').filter(i => !i.optional && i.end).sort((a, b) => parseTime(a.start) - parseTime(b.start))[0]; if (!nap1) return tp;
  const off = Math.min(lead, cap), from = parseTime(w.start), to = parseTime(nap1.end);
  const hh = x => { x = ((x % DAY) + DAY) % DAY; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
  const moves = i => i.kind !== 'wake' && !i.beforeBed && !i.optional && ['nap', 'meal', 'note'].includes(i.kind) && parseTime(i.start) > from && parseTime(i.start) < to;
  return { ...tp, wakeShift: off, wokeAt: m.wake, items: tp.items.map(i => i.kind === 'wake' ? { ...i, start: hh(m.wake), woke: true }
    : moves(i) ? { ...i, start: hh(parseTime(i.start) - off), end: i.end ? hh(parseTime(i.end) - off) : i.end, shifted: true } : i) };
}
const wakeNote = tp => !tp?.wakeShift ? '' : L(` (woke at ${fmtTime(tp.wokeAt)}: morning and Nap 1 moved ${fmtDur(tp.wakeShift)} earlier)`, ` (réveil à ${fmtTime(tp.wokeAt)} : matinée et sieste 1 avancées de ${fmtDur(tp.wakeShift)})`);
const shiftNote = tp => tp?.wakeShift ? wakeNote(tp) : !tp?.shift ? '' : tp.anchor === 'appt' ? L(` (naps around it moved ${tp.shift > 0 ? '+' : '−'}${fmtDur(Math.abs(tp.shift))} to match the appointment)`, ` (siestes autour décalées de ${tp.shift > 0 ? '+' : '−'}${fmtDur(Math.abs(tp.shift))} selon le rendez-vous)`) : L(` (visit-day naps moved ${tp.shift > 0 ? '+' : '−'}${fmtDur(Math.abs(tp.shift))} to match the visit)`, ` (siestes du jour de visite décalées de ${tp.shift > 0 ? '+' : '−'}${fmtDur(Math.abs(tp.shift))} selon la visite)`);
/** Global targets with any per-template overrides (blank template values fall back to global). */
function tplTargets(tp){ const o = { ...T() }; for (const [k, v] of Object.entries(tp?.targets || {})) if (v !== '' && v != null && isFinite(v)) o[k] = +v; return o; }
const tplItems = (tp, kind) => (tp?.items || []).filter(i => i.kind === kind && parseTime(i.start) != null);
function cutoffFor(m){ const c = tplItems(m.tpl, 'cutoff')[0]; return c ? parseTime(c.start) : parseTime(T().napCutoff) ?? 960; }
/** A nap inside an optional template band (e.g. the bridge nap) is never "late". */
function inOptionalBand(m, n){ return tplItems(m.tpl, 'nap').some(b => b.optional && b.end && n.st >= parseTime(b.start) - 20 && (n.t - m.D*DAY) <= parseTime(b.end) + 20); }
function napLate(m, n){ return n.d === m.D && n.st != null && (n.t - m.D*DAY) > cutoffFor(m) && !inOptionalBand(m, n); }
/** Acceptable bedtime range. With several bedtime lines and an optional (bridge) nap, anywhere from the earliest to the latest
    line is on target: skipping the bridge nap makes the earlier bedtime the suggestion, not a requirement. */
function bedRange(m){
  const tb = targetBed(m); if (tb == null) return null;
  const bs = tplItems(m?.tpl, 'bedtime').map(i => parseTime(i.start));
  return bs.length > 1 && tplItems(m.tpl, 'nap').some(b => b.optional && b.end) ? [Math.min(...bs), Math.max(...bs), tb] : [tb, tb, tb];
}
const bedOff = (m, bed) => { const r = bedRange(m); return r == null || bed == null ? null : bed < r[0] ? bed - r[0] : bed > r[1] ? bed - r[1] : 0; };
/** Target bedtime. With several bedtime lines + an optional nap: later bedtime only if that nap happened. */
function targetBed(m){
  const bs = tplItems(m?.tpl, 'bedtime').map(i => parseTime(i.start));
  if (!bs.length) return parseTime(T().bedtime);
  if (bs.length > 1) {
    const opt = tplItems(m.tpl, 'nap').filter(b => b.optional && b.end);
    if (opt.length) return m.naps.some(n => inOptionalBand(m, n)) ? Math.max(...bs) : Math.min(...bs);
  }
  return Math.max(...bs);
}

