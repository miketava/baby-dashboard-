/* ════════════════════════════════════════════════════════════════════════════
   v1.27 — Going up vs. actually asleep, and what helps her settle.
   • A nap's or night's Start Time is when the routine starts ("went up"): diaper, milk, rocking…
     Schedule targets and the routine score keep comparing that time, so the plan is preserved.
   • Sleep amounts and wake windows use when she was actually asleep:
       1. the optional "Asleep At" time on the entry, else
       2. the end of an Awake / Restless entry that overlaps the start (how long settlings are logged), else
       3. the start + a typical settling time (Settings → Targets; 15 min by default). Car naps start asleep.
   • Soothing methods are tags on sleep and Awake / Restless entries (pills in Quick Log); the Sleep tab
     compares how long it took to fall asleep, or to settle again, with each one.
   ════════════════════════════════════════════════════════════════════════════ */
const SOOTHE = () => [o3('On own', 'Seul·e'), o3('Rocking', 'Bercer'), o3('Holding', 'Dans les bras'), o3('Walking', 'Marcher'),
  o3('Lullaby', 'Berceuse'), o3('Humming', 'Fredonner'), o3('Shushing', 'Chut'), o3('White noise', 'Bruit blanc'), o3('Story', 'Histoire'),
  o3('Patting', 'Tapoter'), o3('Back rub', 'Frotter le dos'), o3('Pacifier', 'Suce'), o3('Milk', 'Lait'), o3('Lovey', 'Doudou'),
  o3('Stroller', 'Poussette'), o3('Contact', 'Peau à peau')];
const SOOTHE_KEYS = () => SOOTHE().map(x => x[0]);
const isCarNap = e => /car/i.test(e.cat);
const settleDefault = e => isCarNap(e) ? 0 : isNight(e) ? +(T().settleNight ?? 15) : +(T().settleNap ?? 15);

/** Sets e.so (asleep, absolute minutes) and e.dur (actual sleep) on every sleep entry, and e.settle (minutes, null if assumed). */
function applySleepOnset(){
  const awake = DATA.events.filter(e => isAwake(e) && e.t != null);
  for (const e of DATA.events) {
    if (!isSleep(e)) continue;
    const end = e.t; let so = null, how = 'assumed';
    const a = parseTime(e.extra?.['Asleep At'] ?? e.raw?.asleep ?? '');
    if (a != null && !e.allDay) { let abs = e.d * DAY + a; if (abs < e.s - 60) abs += DAY; if (abs >= e.s && (end == null || abs < end)) { so = abs; how = 'logged'; } }
    if (so == null && !isCarNap(e)) {   // a restless stretch logged at the start = settling
      const r = awake.filter(x => x.s >= e.s - 10 && x.s <= e.s + 30 && x.t > e.s && (end == null || x.t < end)).sort((x, y) => y.t - x.t)[0];
      if (r) { so = r.t; how = 'restless'; }
    }
    if (so == null) { const st = settleDefault(e); so = end == null || end - e.s > st + 10 ? e.s + st : e.s; }
    e.so = so; e.settleHow = how; e.settle = how === 'assumed' ? null : so - e.s;
    // v1.41: Awake / Restless entries logged INSIDE this sleep (a night waking within one long Sleep - Night) aren't sleep
    e.wakes = null; e.awakeIn = 0;
    if (end != null) {
      const iv = awake.filter(x => x.s < end && x.t > so).map(x => [Math.max(x.s, so), Math.min(x.t, end)]).sort((p, q) => p[0] - q[0]), merged = [];
      for (const [s0, s1] of iv) { const l = merged[merged.length - 1]; if (l && s0 <= l[1]) l[1] = Math.max(l[1], s1); else merged.push([s0, s1]); }
      if (merged.length) { e.wakes = merged; e.awakeIn = merged.reduce((t, [s0, s1]) => t + s1 - s0, 0); }
      e.dur = Math.max(0, end - so - e.awakeIn);
    }
  }
}

/* ── Quick Log: pills and the "asleep at" field ── */
function soothChipsHTML(tagsStr, kind){
  const cur = new Set(parseTags(tagsStr));
  return `<div class="full ctchips"><div class="ctg"><span class="faint">${kind === 'awake' ? L('What helped', 'Ce qui a aidé') : L('Helped to sleep', 'Pour l’endormir')}</span><div class="chips">${SOOTHE().map(([v, en, fr]) => `<span class="chip ${cur.has(v) ? '' : 'off'}" data-tag="${v}" style="text-decoration:none">${esc(L(en, fr))}</span>`).join('')}</div></div></div>`;
}
function asleepFieldHTML(row, startStr){
  const typ = settleDefault({ cat: row['Category'] || '', k: catKind(row['Category'] || '') });
  return `<label class="field tfield">${L('Asleep at', 'Endormi·e à')} <span class="faint">${L(`(optional · blank = about ${typ} min after going up)`, `(facultatif · vide = environ ${typ} min après le début)`)}</span><input type="time" name="Asleep At" value="${esc(row['Asleep At'] || '')}"></label>
    <div class="full tchips" data-for="Asleep At" data-from="${esc(startStr || '')}"><span class="faint">${L('after going up', 'après le début')}</span>${[5, 10, 15, 20, 30].map(m => `<button type="button" class="chip off" data-after="${m}">+${m} min</button>`).join('')}</div>`;
}

/* ── Sleep tab: what helps her settle ── */
function renderSoothe(days){
  const box = $('#soBox'); if (!box) return;
  const Ds = new Set(days.map(d => d.D)), keys = SOOTHE_KEYS(), name = k => { const x = SOOTHE().find(s => s[0] === k); return x ? L(x[1], x[2]) : k; };
  const sleeps = DATA.events.filter(e => isSleep(e) && !isCarNap(e) && Ds.has(e.d) && e.tags.some(t => keys.includes(t)));
  const fussy = DATA.events.filter(e => isAwake(e) && e.t != null && Ds.has(e.d) && e.tags.some(t => keys.includes(t)));
  if (!sleeps.length && !fussy.length) { box.innerHTML = `<p class="muted">${L('Nothing tagged yet. Tap what helped (rocking, lullaby, pacifier…) when you log a nap, bedtime or a restless stretch, and add the “asleep at” time when you know it.', 'Rien d’identifié encore. Touchez ce qui a aidé (bercer, berceuse, suce…) en notant une sieste, un coucher ou une période agitée, et ajoutez l’heure d’endormissement quand vous la savez.')}</p>`; $('#soTake').textContent = ''; return; }
  const med = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
  const baseSleep = med(DATA.events.filter(e => isSleep(e) && !isCarNap(e) && Ds.has(e.d) && e.settle != null).map(e => e.settle)), baseFuss = med(fussy.map(e => e.t - e.s));
  const rows = keys.map(k => {
    const s = sleeps.filter(e => e.tags.includes(k)), sl = s.map(e => e.settle).filter(x => x != null), f = fussy.filter(e => e.tags.includes(k));
    return { k, n: s.length + f.length, ns: s.length, nsl: sl.length, settle: med(sl), nf: f.length, fuss: med(f.map(e => e.t - e.s)) };
  }).filter(r => r.n).sort((a, b) => b.n - a.n);
  const cls = (v, base, n) => v == null || base == null || n < 2 ? '' : v <= base - 3 ? 'better' : v >= base + 3 ? 'worse' : '';
  box.innerHTML = `<table class="cmp"><thead><tr><th>${L('Method', 'Méthode')}</th><th>${L('Used', 'Utilisé')}</th><th>${L('To fall asleep', 'Pour s’endormir')}</th><th>${L('Restless until settled', 'Agitation jusqu’au calme')}</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td class="m">${esc(name(r.k))}</td><td>${r.n}</td><td class="${cls(r.settle, baseSleep, r.nsl)}">${r.settle != null ? fmtDur(r.settle) + `<span class="faint"> · ${r.nsl}</span>` : '<span class="faint">—</span>'}</td><td class="${cls(r.fuss, baseFuss, r.nf)}">${r.fuss != null ? fmtDur(r.fuss) + `<span class="faint"> · ${r.nf}</span>` : '<span class="faint">—</span>'}</td></tr>`).join('')}
    </tbody></table><div class="hint">${L(`Typical (middle) times; the small number is how many entries had a known time. Green / orange = a few minutes quicker / slower than usual (${baseSleep != null ? fmtDur(baseSleep) + ' to fall asleep' : 'no fall-asleep times yet'}${baseFuss != null ? ', ' + fmtDur(baseFuss) + ' restless' : ''}). Methods are often used together, so read this as a hint, not proof.`, `Temps typiques (médians); le petit nombre indique combien d’entrées avaient une heure connue. Vert / orange = quelques minutes plus rapide / lent que d’habitude (${baseSleep != null ? fmtDur(baseSleep) + ' pour s’endormir' : 'pas encore d’heures d’endormissement'}${baseFuss != null ? ', ' + fmtDur(baseFuss) + ' d’agitation' : ''}). Les méthodes sont souvent combinées : c’est un indice, pas une preuve.`)}</div>`;
  const ok = rows.filter(r => r.nsl >= 2 && r.settle != null).sort((a, b) => a.settle - b.settle);
  $('#soTake').textContent = ok.length >= 2 && ok[ok.length - 1].settle - ok[0].settle >= 5
    ? L(`Fastest to fall asleep with ${name(ok[0].k).toLowerCase()} (${fmtDur(ok[0].settle)}); slowest with ${name(ok[ok.length - 1].k).toLowerCase()} (${fmtDur(ok[ok.length - 1].settle)}).`, `Endormissement le plus rapide avec « ${name(ok[0].k).toLowerCase()} » (${fmtDur(ok[0].settle)}); le plus lent avec « ${name(ok[ok.length - 1].k).toLowerCase()} » (${fmtDur(ok[ok.length - 1].settle)}).`)
    : L('Needs a few more naps or bedtimes with a method and an “asleep at” time.', 'Il faut quelques siestes ou couchers de plus avec une méthode et une heure d’endormissement.');
}
