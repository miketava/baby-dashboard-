/* ════════════════════════════════════════════════════════════════════════════
   11. TODAY / RIGHT NOW — live companion banner (Feature Set A)
   ════════════════════════════════════════════════════════════════════════════ */
/** Today's metrics, or an empty stand-in when nothing is logged yet. */
function todayMetrics(){
  const D = todayIdx();
  if (DAYS.has(D)) return DAYS.get(D);
  const m = { D, evs:[], naps:[], wake:null, bed:null, lastNapEnd:null, napCount:0, daySleep:0, milk:null, water:null, visit:false, visitStart:null, homeVisit:false, medical:false, ribbon:[], meds:[], isToday:true, stub:true };
  m.tpl = templateFor(m); m.targets = tplTargets(m.tpl); return m;
}
/** Everything the banner (and reminders) need, computed for the current minute. */
function todayState(){
  const m = todayMetrics(), D = m.D, now = nowMin(), nowA = D*DAY + now, tp = m.tpl, tg = m.targets, t = T();
  const items = (mod('schedule') ? tp?.items || [] : []).map(i => ({ ...i, a: parseTime(i.start), b: i.end ? parseTime(i.end) : null })).filter(i => i.a != null).sort((x,y) => x.a - y.a);
  const napBands = items.filter(i => i.kind === 'nap' && i.b != null);
  const coreNaps = napBands.filter(i => !i.optional);
  const ongoing = DATA.events.filter(e => e.ongoing);
  const sleepNow = ongoing.find(isSleep);
  const outNow = ongoing.find(e => ['visit','homevisit','outing','medical','car'].includes(e.k));
  const finishedSleeps = DATA.events.filter(e => isSleep(e) && !e.ongoing && e.t != null && e.t <= nowA);
  const lastSleepEnd = finishedSleeps.length ? Math.max(...finishedSleeps.map(e => e.t)) : null;
  const napsDone = m.naps.filter(n => !n.ongoing && n.t <= nowA);
  const cutoff = cutoffFor(m), bedT = targetBed(m);
  const S0 = { m, D, now, nowA, tp, tg, items, napBands, coreNaps, ongoing, sleepNow, outNow, lastSleepEnd, napsDone, cutoff, bedT, lines:[], callouts:[], next:null, headline:'', peek:'' };
  const line = (ic, html) => S0.lines.push({ ic, html });

  // 1) Headline: what is happening right now
  const nurseNow = mod('newborn') ? ongoing.find(e => e.k === 'nurse') : null;
  if (nurseNow) S0.headline = L(`🤱 Feeding · ${sideOf(nurseNow) || ''} side · <span class="timer">${fmtDur(nowA - nurseNow.s)}</span> (since ${fmtTime(nurseNow.st)})`, `🤱 Boire en cours · côté ${sideL(sideOf(nurseNow))} · <span class="timer">${fmtDur(nowA - nurseNow.s)}</span> (depuis ${fmtTime(nurseNow.st)})`);
  if (mod('newborn')) {
    const done = FEEDS.filter(f => f.s <= nowA && !f.ongoing), last = done[done.length - 1];
    if (last && !nurseNow) { const sides = last.firstSide ? (last.lastSide && last.lastSide !== last.firstSide ? `${sideL(last.firstSide)} → ${sideL(last.lastSide)}` : sideL(last.firstSide)) : '';
      line('🤱', L(`Last feed started <b class="timer">${fmtDur(nowA - last.s)}</b> ago at ${fmtTime(last.s % DAY)}`, `Dernier boire commencé il y a <b class="timer">${fmtDur(nowA - last.s)}</b>, à ${fmtTime(last.s % DAY)}`) + `${sides ? ` · ${sides}` : ''}${last.breastMin ? ` · ${fmtDur(last.breastMin)}` : ''}${last.oz ? ` · ${fmtOz(last.oz)}` : ''}`);
      S0.peek = L(`last feed ${fmtDur(nowA - last.s)} ago`, `dernier boire il y a ${fmtDur(nowA - last.s)}`); }
    const f24 = FEEDS.filter(f => f.s > nowA - DAY && f.s <= nowA).length;
    if (f24) line('📊', L(`${f24} feed${f24 > 1 ? 's' : ''} in the last 24 h${m.feedCount != null ? ` · ${m.feedCount} today` : ''}`, `${plural(f24, '', '', 'boire', 'boires')} dans les dernières 24 h${m.feedCount != null ? ` · ${m.feedCount} aujourd’hui` : ''}`));
  }
  if (sleepNow) {
    const since = fmtTime(sleepNow.st), dur = fmtDur(nowA - sleepNow.s);
    if (nurseNow) line(isNight(sleepNow) ? '🌙' : '💤', L(`${isNight(sleepNow) ? 'Night sleep' : 'Nap'} logged as still going since ${since} — end it in Quick Log if the baby is up`, `${isNight(sleepNow) ? 'Sommeil de nuit' : 'Sieste'} toujours en cours depuis ${since} — terminez-la dans la saisie rapide si bébé est réveillé`));
    else if (isNight(sleepNow)) { S0.headline = L(`🌙 Night sleep · ${dur} since ${since}`, `🌙 Sommeil de nuit · ${dur} depuis ${since}`); }
    else if (!mod('schedule')) { S0.headline = L(`💤 Sleeping · <span class="timer">${dur}</span> so far (since ${since})`, `💤 Dort · <span class="timer">${dur}</span> jusqu’ici (depuis ${since})`); }
    else {
      const idx = napsDone.length + 1, band = coreNaps[idx-1];
      S0.headline = L(`💤 Napping · <span class="timer">${dur}</span> so far (Nap ${idx}, since ${since})`, `💤 Sieste · <span class="timer">${dur}</span> jusqu’ici (sieste ${idx}, depuis ${since})`);
      const used = m.daySleep, left = tg.maxDaySleep - used;
      if (band) line('🎯', `${L('Template window', 'Plage du modèle')} ${esc(band.label)} ${band.start}–${band.end}${nowA - D*DAY > band.b ? L(' — <b style="color:var(--warn)">running past the window</b>', ' — <b style="color:var(--warn)">dépasse la plage</b>') : ''}`);
      line('⏱', L(`Day sleep so far <b>${fmtDur(used)}</b> of ${fmtDur(tg.maxDaySleep)} — ${left > 0 ? `wake by <b>${fmtTime(Math.min(now + left, cutoff))}</b> to stay in budget` : '<b style="color:var(--bad)">budget used up — consider waking</b>'}`, `Sommeil de jour jusqu’ici <b>${fmtDur(used)}</b> sur ${fmtDur(tg.maxDaySleep)} — ${left > 0 ? `réveiller avant <b>${fmtTime(Math.min(now + left, cutoff))}</b> pour rester dans la cible` : '<b style="color:var(--bad)">cible atteinte — envisagez de réveiller</b>'}`));
      if (now < cutoff) line('⛔', L(`Hard nap cutoff ${fmtTime(cutoff)} (in ${fmtDur(cutoff - now)})`, `Heure limite de sieste ${fmtTime(cutoff)} (dans ${fmtDur(cutoff - now)})`));
    }
  } else if (outNow) {
    S0.headline = `${cat(outNow.cat).icon} ${esc(catL(outNow.cat))} ${L('in progress · since', 'en cours · depuis')} ${fmtTime(outNow.st)} (${fmtDur(nowA - outNow.s)})`;
  }
  if (!sleepNow) {
    const awakeFor = lastSleepEnd != null ? nowA - lastSleepEnd : null;
    const sinceLbl = lastSleepEnd == null ? '' : napsDone.length ? L(`Nap ${napsDone.length} ended`, `la fin de la sieste ${napsDone.length}`) : L('wake-up', 'le lever');
    if (!S0.headline) S0.headline = awakeFor != null && awakeFor < 18*60 ? L(`☀️ Awake for <span class="timer">${fmtDur(awakeFor)}</span> · since ${sinceLbl} at ${fmtTime(lastSleepEnd - D*DAY)}`, `☀️ Éveillé depuis <span class="timer">${fmtDur(awakeFor)}</span> · depuis ${sinceLbl} à ${fmtTime(lastSleepEnd - D*DAY)}`) : L(`☀️ No sleep logged recently`, `☀️ Aucun sommeil noté récemment`);
    else if (awakeFor != null && awakeFor < 18*60) line('☀️', L(`Awake <span class="timer">${fmtDur(awakeFor)}</span> since ${sinceLbl} at ${fmtTime(lastSleepEnd - D*DAY)}`, `Éveillé <span class="timer">${fmtDur(awakeFor)}</span> depuis ${sinceLbl} à ${fmtTime(lastSleepEnd - D*DAY)}`));
    if (lastSleepEnd != null && awakeFor < 18*60) {
      const remainingCore = coreNaps.length - napsDone.length;
      if (!mod('schedule')) { /* no fixed schedule (e.g. newborn): no nap windows / cutoff / bedtime targets */ }
      else if (remainingCore > 0 && now < cutoff) {
        const idx = napsDone.length + 1, ww = idx === 1 ? t.ww1 : t.ww2, band = coreNaps[idx-1];
        const opens = lastSleepEnd - D*DAY + ww;
        const tplTxt = band ? ` · ${L('template', 'modèle')} ${band.start}–${band.end}` : '';
        if (opens > now) { line('😴', L(`Optimal <b>Nap ${idx}</b> window opens in <b>${fmtDur(opens - now)}</b> at <b>${fmtTime(Math.min(opens, cutoff))}</b> (${fmtDur(ww)} wake window)`, `La plage idéale pour la <b>sieste ${idx}</b> s’ouvre dans <b>${fmtDur(opens - now)}</b>, à <b>${fmtTime(Math.min(opens, cutoff))}</b> (période d’éveil de ${fmtDur(ww)})`) + tplTxt); S0.next = { at: Math.min(opens, cutoff), label:L(`Nap ${idx} window opens`, `Plage de la sieste ${idx}`) }; }
        else line('😴', L(`<b>Nap ${idx}</b> window is open now (since ${fmtTime(opens)})`, `La plage de la <b>sieste ${idx}</b> est ouverte (depuis ${fmtTime(opens)})`) + tplTxt);
        line('⛔', `${L('Hard nap cutoff', 'Heure limite de sieste')} ${fmtTime(cutoff)}${cutoff > now ? ` (${L('in', 'dans')} ${fmtDur(cutoff - now)})` : ''}`);
        S0.peek = opens > now ? L(`Nap ${idx} window opens ${fmtTime(opens)}`, `Sieste ${idx} : plage à ${fmtTime(opens)}`) : L(`Nap ${idx} window open`, `Sieste ${idx} : plage ouverte`);
      } else {
        const lastEnd = m.lastNapEnd ?? (lastSleepEnd - D*DAY);
        const dyn = lastEnd + t.wwFinal;
        const opt = napBands.find(b => b.optional && now < b.b);
        if (opt && now >= cutoff - 30) line('🌉', `${L('Optional', 'Facultatif :')} ${esc(opt.label)} ${opt.start}–${opt.end} ${L('if very tired (bedtime then', 'si très fatigué (coucher alors à')} ${fmtTime(Math.max(...tplItems(tp,'bedtime').map(i => parseTime(i.start))))})`);
        if (bedT != null) {
          line('🛏', L(`Bedtime target <b>${fmtTime(bedT)}</b>${bedT > now ? ` (in ${fmtDur(bedT - now)})` : ''} · ${fmtDur(t.wwFinal)} after last nap → ${fmtTime(dyn)}`, `Coucher visé <b>${fmtTime(bedT)}</b>${bedT > now ? ` (dans ${fmtDur(bedT - now)})` : ''} · ${fmtDur(t.wwFinal)} après la dernière sieste → ${fmtTime(dyn)}`));
          if (m.lastNapEnd != null && bedT - m.lastNapEnd < t.underTired) S0.callouts.push({ cls:'', html:L(`⚠ Only ${fmtDur(bedT - m.lastNapEnd)} between the last nap (${fmtTime(m.lastNapEnd)}) and the ${fmtTime(bedT)} bedtime — under-tired risk (target ≥ ${fmtDur(t.underTired)}). Consider ${fmtTime(m.lastNapEnd + t.underTired)} or later.`, `⚠ Seulement ${fmtDur(bedT - m.lastNapEnd)} entre la dernière sieste (${fmtTime(m.lastNapEnd)}) et le coucher de ${fmtTime(bedT)} — risque de manque de fatigue (cible ≥ ${fmtDur(t.underTired)}). Envisagez ${fmtTime(m.lastNapEnd + t.underTired)} ou plus tard.`) });
          S0.peek = L(`Bedtime ${fmtTime(bedT)}`, `Coucher ${fmtTime(bedT)}`);
        }
      }
    }
  }
  // 2) Template match: where should we be according to the schedule?
  const inBand = items.find(i => i.b != null && now >= i.a && now < i.b && i.kind !== 'meal');
  if (inBand) {
    if (inBand.kind === 'nap' && !sleepNow) line('🕒', L(`It is ${fmtTime(now)} — should be winding down or asleep for <b>${esc(inBand.label)}</b> (target ${inBand.start}–${inBand.end})${inBand.optional ? ' · optional' : ''}`, `Il est ${fmtTime(now)} — devrait se calmer ou dormir pour <b>${esc(inBand.label)}</b> (cible ${inBand.start}–${inBand.end})${inBand.optional ? ' · facultatif' : ''}`));
    else if (inBand.kind === 'nap') line('✅', `${L('On track with', 'Dans les temps pour')} <b>${esc(inBand.label)}</b> (${inBand.start}–${inBand.end})`);
    else line('🕒', `${L('Scheduled now:', 'Prévu maintenant :')} <b>${esc(inBand.label)}</b> (${inBand.start}–${inBand.end})`);
  }
  // 3) Upcoming cue (next template item within 60 min) + pre-filled rows later today
  const up = items.find(i => i.a > now && i.a - now <= 60 && i.kind !== 'wake');
  if (up) line('⏰', L(`<b>${esc(up.label)}</b> is coming up in ${fmtDur(up.a - now)} (target ${up.start})`, `<b>${esc(up.label)}</b> dans ${fmtDur(up.a - now)} (cible ${up.start})`));
  const later = m.evs.filter(e => e.st != null && e.st > now && !e.ongoing && !isRibbon(e)).sort((a,b) => a.st - b.st).slice(0, 3);
  if (later.length) line('📅', L('Planned: ', 'Prévu : ') + later.map(e => `${cat(e.cat).icon} ${esc(catL(e.cat))} ${fmtTime(e.st)}${e.t ? '–' + fmtTime(e.t - D*DAY) : ''}`).join(' · '));
  // 4) Callouts: appointments / in-home visits vs nap windows; visit auto-template
  m.evs.filter(e => (e.k === 'homevisit' || e.k === 'medical') && e.st != null).forEach(e => {
    const a = e.st, b = e.t != null ? e.t - D*DAY : e.st + 60;
    const hit = napBands.filter(n => a < n.b && b > n.a);
    S0.callouts.push({ cls: hit.length ? '' : 'info', html: `${cat(e.cat).icon} <b>${esc(catL(e.cat))}</b> ${fmtTime(a)}–${fmtTime(b)}${e.notes ? ' · ' + esc(e.notes) : ''} — ${hit.length ? `<b>${L('overlaps', 'chevauche')} ${hit.map(h => esc(h.label) + ' (' + h.start + '–' + h.end + ')').join(', ')}</b>${L('; plan to shift that nap', '; prévoyez de déplacer cette sieste')}` : L('does not overlap a nap window', 'ne chevauche pas une plage de sieste')}` });
  });
  const pv = !m.visit ? plannedVisit(D) : null;
  if (mod('schedule') && pv && (S.todayTpl?.date !== isoOf(D) || S.todayTpl.id === 'auto')) S0.callouts.push({ cls:'info', html:L(`🗓️ Visit on your calendar ${fmtTime(pv.st)}${pv.en != null ? '–' + fmtTime(pv.en) : ''} → using <b>${esc(tp.name)}</b>`, `🗓️ Visite à l’agenda ${fmtTime(pv.st)}${pv.en != null ? '–' + fmtTime(pv.en) : ''} → modèle <b>${esc(tp.name)}</b>`) });
  if (mod('schedule') && m.visit && (S.todayTpl?.date !== isoOf(D) || S.todayTpl.id === 'auto')) S0.callouts.push({ cls:'info', html:L(`🏠 Off-site visit at ${fmtTime(m.visitStart)} → using <b>${esc(tp.name)}</b> (visits ≤ ${t.earlyVisitCutoff} use the early template)`, `🏠 Visite à l’extérieur à ${fmtTime(m.visitStart)} → modèle <b>${esc(tp.name)}</b> (les visites avant ${t.earlyVisitCutoff} utilisent le modèle matinal)`) });
  // upcoming appointments / vaccines in the next 7 days (pre-filled rows)
  DATA.events.filter(e => (e.k === 'medical' || e.k === 'vaccine') && e.s > nowA && e.s <= nowA + 7*DAY && !(e.d === D)).slice(0, 3)
    .forEach(e => S0.callouts.push({ cls:'info', html:`📅 ${L('Coming up:', 'À venir :')} ${cat(e.cat).icon} <b>${esc(e.notes || catL(e.cat))}</b> · <b>${relDay(e.d)}</b> (${fmtDay(e.d)}${e.st != null ? ' ' + fmtTime(e.st) : ''})` }));
  if (m.ribbon?.some(e => e.k === 'incident' && e.outcome === 'Follow-up Needed')) S0.callouts.push({ cls:'bad', html:L('✚ A health note today is marked <b>Follow-up Needed</b>.', '✚ Une note de santé d’aujourd’hui est marquée <b>Suivi requis</b>.') });
  medCallouts(D).forEach(c => S0.callouts.push(c));
  apptCallouts().forEach(c => S0.callouts.push(c));
  nudgeCallouts(m, D).forEach(c => S0.callouts.push(c));
  vaxCallouts().forEach(c => S0.callouts.push(c));
  { const tr = D === todayIdx() && !viewOnly() ? trendAlerts().filter(x => !x.acked) : []; if (tr.length) S0.callouts.push({ cls:'info', html:`📈 ${L(`${tr.length} trend${tr.length > 1 ? 's' : ''} to watch`, `${plural(tr.length, '', '', 'tendance à surveiller', 'tendances à surveiller')}`)}: ${esc(tr[0].text)} <button class="btn sm" data-act="trendAck" data-k="${tr[0].key}" style="margin-left:6px">✓ ${L('Got it', 'Compris')}</button><button class="btn sm" data-goview="patterns" style="margin-left:6px">${L('See', 'Voir')}</button>` }); }
  if (ciDue()) S0.callouts.push({ cls:'info', html:`📝 ${L('Time for today’s check-in', 'C’est l’heure du bilan du jour')} <button class="btn sm primary" data-ciopen style="margin-left:6px">${L('Start', 'Commencer')}</button>` });
  if (!S0.peek) S0.peek = S0.lines[0]?.html.replace(/<[^>]+>/g,'') || '';
  return S0;
}
/** Budget strip: day sleep, milk, water, bath night, diaper, last feed. */
function budgetHTML(S0){
  const { m, tg, nowA } = S0, t = T();
  const meter = (val, max, band) => `<div class="meter">${band ? `<b style="left:${band[0]/band[2]*100}%;width:${(band[1]-band[0])/band[2]*100}%"></b>` : ''}<i style="width:${clamp(val/(band ? band[2] : max)*100, 0, 100)}%;${val > max ? 'background:var(--bad)' : ''}"></i></div>`;
  const out = [];
  const ds = m.daySleep || 0;
  if (mod('schedule')) out.push(`<div class="bpill"><div class="row"><span class="k">💤 ${L('Daytime sleep', 'Sommeil de jour')}</span><span class="v">${fmtDur(ds)} / ${fmtDur(tg.maxDaySleep)} max</span></div>${meter(ds, tg.maxDaySleep)}</div>`);
  else { const s24 = overlapMin(isSleep, nowA - DAY, nowA); out.push(`<div class="bpill"><div class="row"><span class="k">💤 ${L('Sleep in the last 24 h', 'Sommeil des dernières 24 h')}</span><span class="v">${fmtDur(s24)}</span></div></div>`); }
  const milk = m.milk || 0, mx = tg.milkMax * 1.25;
  if (m.milk != null || S.profile.feeding !== 'breast') out.push(`<div class="bpill"><div class="row"><span class="k">🍼 ${L('Milk so far', 'Lait jusqu’ici')}</span><span class="v">${fmtOz(milk)} / ${fmtOz(tg.milkMin)}–${fmtOz(tg.milkMax)}</span></div>${meter(milk, tg.milkMax, [tg.milkMin, tg.milkMax, mx])}</div>`);
  if (mod('hydration') && (m.water != null || t.waterMl > 0)) out.push(`<div class="bpill"><div class="row"><span class="k">💧 ${L('Water so far', 'Eau jusqu’ici')}</span><span class="v">${fmtMl(m.water || 0)}${t.waterMl > 0 ? ' / ' + t.waterMl + ' ml' : ''}</span></div>${t.waterMl > 0 ? meter(m.water || 0, t.waterMl) : ''}</div>`);
  // bath night
  const baths = [...DAYS.values()].filter(d => d.bath && d.D <= m.D).map(d => d.D);
  const lastBath = baths.length ? Math.max(...baths) : null;
  let bathTxt = L('No bath logged yet', 'Aucun bain noté');
  if (m.bath) bathTxt = L('Bath done today ✓', 'Bain donné aujourd’hui ✓');
  else if (lastBath != null) { const since = m.D - lastBath, nx = t.bathMin - since; bathTxt = since >= t.bathMax ? L(`<b style="color:var(--bad)">Bath overdue</b> · ${since} nights since last`, `<b style="color:var(--bad)">Bain en retard</b> · ${since} nuits depuis le dernier`) : since >= t.bathMin ? L(`<b>Bath night tonight</b> · ${since} nights since last`, `<b>Soir de bain</b> · ${since} nuits depuis le dernier`) : L(`Next bath in ${nx} night${nx > 1 ? 's' : ''} · ${since} since last`, `Prochain bain dans ${plural(nx, '', '', 'nuit', 'nuits')} · ${since} depuis le dernier`); }
  out.push(`<div class="bpill"><div class="row"><span class="k">🛁 ${L('Bath', 'Bain')}</span><span class="v" style="font-weight:600">${bathTxt}</span></div></div>`);
  const lastMilk = DATA.events.filter(e => (e.milk != null || e.k === 'milk') && e.st != null && e.s <= nowA).pop();
  const poops = DATA.events.filter(e => e.k === 'diaper' && /poop|dirty|bm|stool/i.test(e.cat) && e.s <= nowA);
  const bits = [];
  if (lastMilk) bits.push(`${cat(lastMilk.cat).icon} ${L('last feed', 'dernier boire il y a')} ${fmtDur(nowA - lastMilk.s)}${L(' ago', '')} (${lastMilk.milk != null ? fmtOz(lastMilk.milk) : [lastMilk.tags.join(', '), lastMilk.t != null ? fmtDur(lastMilk.dur) : ''].filter(Boolean).join(' · ') || esc(lastMilk.cat)})`);
  if (mod('diapers') && (m.wet || m.poop || +t.wetMin || +t.dirtyMin)) out.splice(1, 0, `<div class="bpill"><div class="row"><span class="k">🧷 ${L('Diapers today', 'Couches aujourd’hui')}</span><span class="v">${m.wet || 0} ${L('wet', 'mouillées')}${+t.wetMin ? ' / ' + t.wetMin + '+' : ''} · ${m.poop || 0} ${L('dirty', 'souillées')}${+t.dirtyMin ? ' / ' + t.dirtyMin + '+' : ''}</span></div></div>`);
  const lastDiaper = mod('diapers') ? DATA.events.filter(e => e.k === 'diaper' && e.st != null && e.s <= nowA).pop() : null;
  if (lastDiaper) bits.push(`${cat(lastDiaper.cat).icon} ${L('last diaper', 'dernière couche il y a')} ${fmtDur(nowA - lastDiaper.s)}${L(' ago', '')}`);
  if (poops.length) { const dd = m.D - poops[poops.length-1].d; bits.push(`💩 ${dd === 0 ? L('poop today', 'selles aujourd’hui') : L(dd + ' day' + (dd > 1 ? 's' : '') + ' since last poop', plural(dd, '', '', 'jour', 'jours') + ' depuis les dernières selles')}`); }
  const sc = m.score || (m.stub ? null : scoreDay(m));
  if (sc?.score != null) out.push(`<div class="bpill"><div class="row"><span class="k">⭐ ${L('Routine score so far', 'Score de routine jusqu’ici')}</span><span class="v" style="color:${scoreCol(sc.score)}">${sc.score} / 100</span></div><div class="meter"><i style="width:${sc.score}%;background:${scoreCol(sc.score)}"></i></div></div>`);
  if (bits.length) out.push(`<div class="bpill" style="font-size:12.5px;color:var(--muted)">${bits.join(' · ')}</div>`);
  return out.join('');
}
function renderToday(){
  const box = $('#today'); box.classList.toggle('collapsed', !!UI.todayCollapsed);
  $('#todayCollapse').textContent = UI.todayCollapsed ? '▸' : '▾';
  const S0 = todayState(), D = S0.D;
  $('#todayTitle').textContent = `Today · ${fmtDay(D)} · ${fmtTime(S0.now)}`;
  const isOverride = S.todayTpl?.date === isoOf(D) && S.todayTpl.id !== 'auto';
  $('#todayTpl').innerHTML = `<option value="auto">Auto: ${esc(autoTemplate(S0.m.stub ? null : S0.m)?.name || '')}</option>` + S.templates.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  $('#todayTpl').value = isOverride ? S.todayTpl.id : 'auto';
  $('#remToggle').checked = !!S.reminders.enabled;
  $('#todayPeek').innerHTML = S0.headline.replace(/<[^>]+>/g,'') + (S0.peek ? ' · ' + esc(S0.peek) : '');
  if (UI.todayCollapsed) return;
  const rem = S.reminders.enabled ? nextReminder() : null;
  const status = `<div class="status">
      <div class="now">${multiKid() ? `<b style="color:${kidColor(kidIdx())}">${esc(kidName(kidIdx()))}</b> · ` : ''}${L('Right now', 'En ce moment')}${mod('schedule') ? ' · ' + esc(S0.tp?.name || '') : ''}</div>
      <div class="big">${S0.headline}</div>
      ${S0.lines.map(l => `<div class="line"><span class="ic">${l.ic}</span><span>${l.html}</span></div>`).join('')}
      ${S0.callouts.map(c => `<div class="callout ${c.cls}">${c.html}</div>`).join('')}
      ${S.reminders.enabled ? `<div class="hint">🔔 ${rem ? `Next reminder at ${fmtTime(rem.at - S.reminders.lead)}: <b>${esc(rem.title)}</b>` : 'No more reminders today'}${remPermissionNote()}</div>` : ''}
      ${S0.m.stub || !S0.m.evs.length ? '<div class="hint">Nothing logged today yet — use <b>＋ Quick Log</b> to start the day.</div>' : ''}
    </div>`;
  const tl = `<div class="today-tl"><div class="tl-scroll" id="todayScroll"><div class="tl h">${axisHTML()}${dayRowHTML(S0.m, { today:true })}</div></div></div>`;
  $('#todayBody').innerHTML = status + `<div class="budget">${budgetHTML(S0)}</div>` + tl;
  // keep "now" in view on narrow screens
  const sc = $('#todayScroll'); if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = clamp(sc.scrollWidth * S0.now / DAY - sc.clientWidth / 2, 0, sc.scrollWidth);
}

