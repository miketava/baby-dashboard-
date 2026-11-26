
/* ════════════════════════════════════════════════════════════════════════════
   8. ANALYTICS — per-day metrics, midnight rollover, day-boundary attribution, live "in progress"
   ════════════════════════════════════════════════════════════════════════════ */
/** Sum of minutes of events matching `pred` that overlap [a, b). */
function overlapMin(pred, a, b){ let m = 0; for (const e of DATA.events) if (e.t != null && e.s < b && e.t > a && pred(e)) m += Math.min(b, e.t) - Math.max(a, e.s); return m; }
/** Wake-up time on day D: latest end of a (finished) night-sleep segment between 04:00 and 12:00. */
function wakeOf(D){ let w = null; for (const e of DATA.events) if (isNight(e) && !e.ongoing && e.t >= D*DAY + 240 && e.t <= D*DAY + 720) w = Math.max(w ?? 0, e.t - D*DAY); return w; }
/** Bedtime on day D: earliest night-sleep start dated D at/after 15:00. */
function bedOf(D){ let b = null; for (const e of DATA.events) if (isNight(e) && e.d === D && e.st != null && e.st >= 900) b = Math.min(b ?? 1e9, e.st); return b; }

/**
 * Rows with a start but no end for a span-type category (e.g. "Start Nap" from Quick Log) are
 * treated as IN PROGRESS until now, if they began recently. Re-evaluated on every analyze().
 */
function refreshOngoing(){
  const now = nowAbs(), latest = {};
  for (const e of DATA.events) {
    if (!e.open) continue;
    e.t = null; e.dur = 0; e.ongoing = false;
    const fam = isSleep(e) ? 'sleep' : e.k;
    const maxAge = isNight(e) ? 16*60 : isSleep(e) ? 5*60 : e.k === 'nurse' ? 90 : 8*60;
    if (e.s <= now && now - e.s <= maxAge && (!latest[fam] || latest[fam].s < e.s)) latest[fam] = e;
  }
  for (const e of Object.values(latest)) {
    // a later finished sleep means this one was simply never closed
    if (DATA.events.some(x => (isSleep(e) ? isSleep(x) : x.k === e.k) && !x.open && x.s > e.s)) continue;
    e.ongoing = true; e.t = Math.max(now, e.s + 1); e.dur = e.t - e.s;
  }
}

function analyze(){
  refreshOngoing();
  FEEDS = feedSessions();
  DAYS = new Map();
  const byDay = new Map(), today = todayIdx();
  DATA.events.forEach(e => { if (!byDay.has(e.d)) byDay.set(e.d, []); byDay.get(e.d).push(e); });
  // Today always gets a row once anything touches it (e.g. last night's sleep ending this morning).
  if (!byDay.has(today) && DATA.events.some(e => e.t != null && e.t > today*DAY && e.s < (today+1)*DAY)) byDay.set(today, []);
  // Dates in the future (pre-filled appointments) and dates holding only measurements / teeth / vaccines
  // (e.g. a growth history entered later) are not "logged days".
  for (const [D, evs] of [...byDay]) if (D > today || (D !== today && evs.length && evs.every(e => ['growth','tooth','vaccine'].includes(e.k)))) byDay.delete(D);
  const B = +S.dayBoundary, t = T();
  const nS = parseTime(t.nightStart) ?? 1320, nE = parseTime(t.nightEnd) ?? 360;
  for (const D of [...byDay.keys()].sort((a,b) => a-b)) {
    const evs = byDay.get(D);
    const naps = evs.filter(e => isNap(e) && e.t != null).sort((a,b) => a.s - b.s);
    const wake = wakeOf(D), bed = bedOf(D);
    const lastNapEnd = naps.length ? Math.max(...naps.map(n => n.t)) - D*DAY : null;
    // The "night" attached to day D: the following night (boundary 06:00) or the preceding one (boundary 00:00).
    const A = B > 0 ? D : D - 1;
    const overnightAwake = overlapMin(isAwake, A*DAY + nS, (A+1)*DAY + nE);
    const nightSleep = overlapMin(isNight, A*DAY + 720, (A+1)*DAY + 720);
    const total24 = overlapMin(isSleep, D*DAY + B, (D+1)*DAY + B);
    const complete24 = wake != null && bed != null && (B > 0 ? wakeOf(D+1) != null : overlapMin(isNight, D*DAY - 1, D*DAY) > 0);
    // Milk: per-feed occasion (relative to the day's naps) + hourly distribution
    const milkEv = evs.filter(e => e.milk != null);
    const n1 = naps[0]?.st ?? 600, n2 = naps[1]?.st ?? 870;
    const win = { Morning:0, 'Nap 1':0, 'Nap 2':0, Bedtime:0, Overnight:0, Untimed:0 };
    const hours = Array(24).fill(0);
    milkEv.forEach(e => {
      if (e.st == null) { win.Untimed += e.milk; return; }
      hours[Math.floor(e.st/60)] += e.milk;
      const w = (e.st >= 1320 || e.st < 300) ? 'Overnight' : e.st >= 1020 ? 'Bedtime' : e.st < n1 - 45 ? 'Morning' : e.st < n2 - 45 ? 'Nap 1' : 'Nap 2';
      win[w] += e.milk;
    });
    const waterEv = evs.filter(e => e.water != null);
    const kinds = k => evs.filter(e => e.k === k);
    const visits = kinds('visit').filter(e => e.st != null);
    // Bedtime effort: from routine start (bedtime bottle / restless within 90–120 min before) to asleep
    let effort = null, firstTry = null;
    if (bed != null) {
      const cands = [
        ...evs.filter(e => e.milk != null && e.st != null && e.st >= bed - 90 && e.st < bed).map(e => e.st),
        ...evs.filter(e => isAwake(e) && e.st != null && e.st >= bed - 120 && e.st < bed).map(e => e.st),
      ];
      if (cands.length) effort = bed - Math.min(...cands);
      const bAbs = D*DAY + bed;
      firstTry = !DATA.events.some(e => isAwake(e) && e.s > bAbs && e.s <= bAbs + 60);
    }
    // Late-evening / overnight feed (21:00–00:30, not during a wake-up) → wake-up between 00:30 and 03:00?
    const lateFeed = DATA.events.some(e => e.milk != null && e.st != null && e.s >= A*DAY + 1260 && e.s < (A+1)*DAY + 30 && !DATA.events.some(w => isAwake(w) && w.t != null && e.s >= w.s && e.s <= w.t));
    const earlyWake = DATA.events.some(e => isAwake(e) && e.s >= (A+1)*DAY + 30 && e.s <= (A+1)*DAY + 180);
    const nightDiapers = DATA.events.filter(e => e.k === 'diaper' && e.st != null && e.s >= A*DAY + nS && e.s < (A+1)*DAY + nE).length;
    const dinner = evs.filter(e => isMeal(e) && /dinner|supper/i.test(e.cat) && e.st != null).sort((a,b) => a.st - b.st)[0];
    DAYS.set(D, {
      D, evs, naps, wake, bed, lastNapEnd,
      napCount: naps.length, daySleep: sum(naps.map(n => n.dur)),
      ww1: wake != null && naps[0] ? naps[0].s - D*DAY - wake : null,
      ww2: naps.length >= 2 ? naps[1].s - naps[0].t : null,
      wwFinal: bed != null && lastNapEnd != null ? bed - lastNapEnd : null,
      overnightAwake, nightSleep, nightKnown: nightSleep > 0, total24, complete24,
      milk: milkEv.length ? sum(milkEv.map(e => e.milk)) : null, milkWin: win, milkHours: hours,
      water: waterEv.length ? sum(waterEv.map(e => e.water)) : null,
      bath: evs.some(e => e.k === 'bath'),
      visit: visits.length > 0, visitStart: visits.length ? Math.min(...visits.map(v => v.st)) : null,
      homeVisit: kinds('homevisit').length > 0, medical: kinds('medical').length > 0, outing: kinds('outing').length > 0,
      guest: kinds('guest').length > 0, cocoonEv: evs.filter(e => COCOON_K.includes(e.k)),
      car: evs.some(e => e.k === 'car' || /car/i.test(e.cat)),
      ribbon: evs.filter(isRibbon),
      effort, firstTry, lateFeed, earlyWake, nightDiapers,
      poop: evs.filter(e => e.k === 'diaper' && /poop|dirty|bm|stool/i.test(e.cat)).length,
      wet: evs.filter(e => e.k === 'diaper' && /wet|pee/i.test(e.cat)).length,
      meds: kinds('meds'),
      dinnerStart: dinner?.st ?? null,
      // v3: reactions, handovers, meal acceptance, car naps
      reactNeg: evs.filter(e => e.reactNeg).length, reactPos: evs.filter(e => e.reactPos).length,
      handovers: kinds('handover').sort((a,b) => a.s - b.s),
      carNap: sum(naps.filter(n => /car/i.test(n.cat)).map(n => n.dur)),
      accept: (() => { const r = evs.filter(isMeal).map(acceptanceOf).filter(x => x !== 'Unrated'); return r.length ? mean(r.map(x => x === 'Ate Well' ? 1 : x === 'Partial' ? .5 : 0)) : null; })(),
      refused: evs.filter(e => isMeal(e) && acceptanceOf(e) === 'Refused').length,
      incidents: evs.filter(e => e.k === 'incident').length, milestones: evs.filter(e => e.k === 'milestone').length,
    });
  }
  for (const [D, m] of DAYS) {
    for (const k of ['ww1','ww2','wwFinal']) if (!(m[k] > 0)) m[k] = null;
    m.afterVisit = !m.visit && !!DAYS.get(D-1)?.visit;
    m.split = m.overnightAwake >= t.splitNightMin;
    m.type = m.visit ? 'visit' : m.afterVisit ? 'after' : 'home';
    m.tpl = templateFor(m);
    m.targets = tplTargets(m.tpl);
    m.lateNap = m.naps.some(n => napLate(m, n));
    m.isToday = D === today;
  }
  // v3: position in the visit cycle (days since the last off-site visit / until the next one)
  const vds = [...DAYS.values()].filter(m => m.visit).map(m => m.D).sort((a,b) => a-b);
  for (const [D, m] of DAYS) {
    const prev = vds.filter(v => v <= D).pop(), next = vds.find(v => v > D);
    m.since = prev == null ? null : D - prev; m.until = next == null ? null : next - D;
    m.score = mod('schedule') ? scoreDay(m) : null;
    babyDay(m);
  }
}

