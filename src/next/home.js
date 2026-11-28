/* ════════════════════════════════════════════════════════════════════════════
   V7 phase 1 — Home (phones): hero card with live state and progress ring, the primary action, quick tiles,
   Today-at-a-glance chips and the heads-up stack. The current Today banner stays one tap away (Details), and
   Coming up, Today's plan and Today's entries follow below, so nothing is lost.
   ════════════════════════════════════════════════════════════════════════════ */
const M2_DISMISS = 'bld.m2dismiss.v1';
const M2_PHONE = matchMedia('(max-width:720px)');
M2_PHONE.addEventListener?.('change', () => renderHome());
let M2_LAST = {};   // last values shown, so only changes animate

/** Where things stand: icon, label, start (abs min), progress 0–1+ toward the next milestone, tone. */
function heroState(S0){
  const { nowA, sleepNow, outNow, lastSleepEnd, napsDone, coreNaps, cutoff, now } = S0, t = T();
  if (HERO_HOLD) return { ...HERO_HOLD, prog: 0, tone: 'ok' };
  const nurse = mod('newborn') ? DATA.events.find(e => e.ongoing && e.k === 'nurse') : null;
  if (nurse) return { kind: 'feed', icon: '🤱', label: L(`Feeding · ${sideL(sideOf(nurse)) || ''}`, `Boire · ${sideL(sideOf(nurse)) || ''}`), since: nurse.s, prog: (nowA - nurse.s) / 20, tone: 'ok' };
  const wakeNow = DATA.events.find(e => e.ongoing && isAwake(e));
  if (wakeNow) return { kind: sleepNow ? 'night' : 'awake', icon: '⚡', label: sleepNow && isNight(sleepNow) ? L('Awake in the night', 'Éveillé la nuit') : L('Restless', 'Agité'), since: wakeNow.s, prog: (nowA - wakeNow.s) / 30, tone: nowA - wakeNow.s > 30 ? 'warn' : 'ok' };
  if (sleepNow) {
    const night = isNight(sleepNow), band = !night ? coreNaps[napsDone.length] : null, len = night ? 11 * 60 : band ? band.b - band.a : 75;
    const p = (nowA - sleepNow.s) / len;
    return { kind: night ? 'night' : 'nap', icon: night ? '🌙' : '💤', label: night ? L('Night sleep', 'Sommeil de nuit') : L('Napping', 'Sieste'), since: sleepNow.s, prog: p, tone: !night && p > 1.15 ? 'warn' : 'ok' };
  }
  if (outNow) return { kind: 'out', icon: cat(outNow.cat).icon, label: catL(outNow.cat), since: outNow.s, prog: 0, tone: 'ok' };
  if (lastSleepEnd != null && nowA - lastSleepEnd < 18 * 60) {
    const left = coreNaps.length - napsDone.length, ww = mod('schedule') ? (left > 0 && now < cutoff ? (napsDone.length ? t.ww2 : t.ww1) : t.wwFinal) : null;
    const p = ww ? (nowA - lastSleepEnd) / ww : 0;
    return { kind: 'awake', icon: '☀️', label: L('Awake', 'Éveillé'), since: lastSleepEnd, prog: p, tone: p >= 1.25 ? 'bad' : p >= 1 ? 'warn' : 'ok' };
  }
  return { kind: 'idle', icon: '👋', label: L('Good morning', 'Bonjour'), since: null, prog: 0, tone: 'ok' };
}
const ringSVG = (p, tone) => { const r = 31, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, p || 0));
  return `<svg class="m2ring ${tone}" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${r}" class="bg"/><circle cx="36" cy="36" r="${r}" class="fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - f)).toFixed(1)}"/></svg>`; };

/** The one or two most likely next logs, from what's in progress and the time of day. */
function primaryActions(S0){
  const P = qlPresets(), all = P.map((p, i) => ({ p, i })), live = all.filter(x => x.p.live);
  window.__m2p = P;
  // a waking in progress: Back asleep first, then the night's end
  const awake = live.find(x => x.p.target && isAwake(x.p.target));
  if (awake) return [awake, ...live.filter(x => x !== awake)].slice(0, 2);
  // in the middle of the night, one tap shouldn't end the night: Night waking first, Up for the day second
  const night = live.find(x => x.p.target && isNight(x.p.target)), m = S0.now;
  if (night && (m >= 18 * 60 || m < 5 * 60)) { const w = all.find(x => x.p.cat === 'Awake / Restless' && x.p.start); if (w) return [w, night]; }
  if (live.length) return live.slice(0, 2);
  const idx = c => P.findIndex(p => p.cat === c && p.start);
  const late = S0.bedT != null && S0.now >= Math.min(S0.cutoff ?? 1e9, S0.bedT - 90);
  return (late ? ['Sleep - Night', 'Sleep - Nap'] : ['Sleep - Nap', 'Sleep - Night']).map(c => ({ p: P[idx(c)], i: idx(c) })).filter(x => x.i >= 0);
}
function actLabel(p){
  if (p.op === 'end' && p.target && isAwake(p.target)) return { ic: '😴', t: L('Back asleep', 'Rendormi'), s: `${L('awake', 'éveillé')} · ${p.sub}` };
  if (p.op === 'end' && p.target && isNight(p.target)) return { ic: '☀️', t: L('Up for the day', 'Levé pour la journée'), s: `${L('night', 'nuit')} · ${p.sub}` };
  if (p.op === 'end' && p.target && isSleep(p.target)) return { ic: '☀️', t: L('Woke up', 'Réveillé'), s: `${L('nap', 'sieste')} · ${p.sub}` };
  if (p.cat === 'Awake / Restless') return { ic: '⚡', t: L('Night waking', 'Réveil la nuit'), s: L('starts a timer', 'démarre un minuteur') };
  if (p.op === 'end') return { ic: '⏹', t: L(`End ${catL(p.cat).toLowerCase()}`, `Fin : ${catL(p.cat).toLowerCase()}`), s: p.sub };
  if (p.cat === 'Sleep - Nap') return { ic: '💤', t: L('Start nap', 'Début de sieste'), s: '' };
  if (p.cat === 'Sleep - Night') return { ic: '🌙', t: L('Bedtime', 'Coucher'), s: '' };
  return { ic: p.e, t: p.label, s: p.sub || '' };
}
async function runAction(i){
  const p = window.__m2p?.[i]; if (!p || !canLog()) return;
  if (p.op === 'end') return quickEnd(p.target);
  if (p.instant) { window.__qlp = window.__m2p; haptic(10); return pickPreset(i); }   // breastfeeding switch / end
  if (p.start) { const r = blankRow(); r['Category'] = p.cat; return quickAppend(r, actLabel(p).t); }
  window.__qlp = window.__m2p; openQuickLog(); pickPreset(i);
}

/** Quick tiles, following the features that are on. */
function homeTiles(){
  const nowA = nowAbs(), ago = e => e ? L(`${fmtDur(nowA - e.s)} ago`, `il y a ${fmtDur(nowA - e.s)}`) : L('not yet', 'pas encore');
  const last = f => DATA.events.filter(e => f(e) && e.st != null && e.s <= nowA).pop();
  const out = [];
  if (mod('newborn')) out.push({ id: 'feed', ic: '🤱', n: L('Feed', 'Boire'), sub: ago(FEEDS.filter(f => f.s <= nowA).pop()) });
  else out.push({ id: 'milk', ic: '🍼', n: L('Milk', 'Lait'), sub: ago(last(e => e.milk != null)) });
  if (mod('food')) out.push({ id: 'meal', ic: '🍽', n: L('Meal', 'Repas'), sub: ago(last(isMeal)) });
  if (mod('diapers')) out.push({ id: 'diaper', ic: '🧷', n: L('Diaper', 'Couche'), sub: ago(last(e => e.k === 'diaper')) });
  if (mod('hydration')) out.push({ id: 'water', ic: '💧', n: L('Water', 'Eau'), sub: ago(last(e => e.water != null)) });
  { const ds = medDoses(todayIdx()), due = ds.filter(d => !d.given);
    if (ds.length || mod('health')) out.push({ id: 'meds', ic: '💊', n: L('Meds', 'Médic.'), sub: ds.length ? (due.length ? L(`${due.length} due`, `${due.length} à donner`) : L('all given ✓', 'tout donné ✓')) : '', warn: due.some(d => d.t != null && d.t < nowMin()) }); }
  out.push({ id: 'more', ic: '＋', n: L('More…', 'Plus…'), sub: L('everything else', 'tout le reste') });
  return out;
}
/** Today at a glance: small chips with meters. */
function glanceChips(S0){
  const { m, tg } = S0, t = T(), chips = [];
  const meter = (v, max) => `<i class="mt"><b style="width:${Math.max(0, Math.min(100, max ? v / max * 100 : 0)).toFixed(0)}%"></b></i>`;
  if (mod('schedule')) chips.push({ k: 'sleep', v: fmtDur(m.daySleep || 0), l: L('day sleep', 'sommeil de jour'), m: meter(m.daySleep || 0, tg.maxDaySleep), go: 'sleep' });
  if (m.milk != null || (!mod('newborn') && S.profile.feeding !== 'breast')) chips.push({ k: 'milk', v: fmtOz(m.milk || 0), l: L('milk', 'lait'), m: meter(m.milk || 0, tg.milkMin), go: 'nutrition' });
  if (mod('newborn') && m.feedCount != null) chips.push({ k: 'feeds', v: String(m.feedCount || 0), l: L('feeds', 'boires'), go: 'nutrition' });
  if (mod('diapers')) chips.push({ k: 'diaper', v: `${m.wet || 0} · ${m.poop || 0}`, l: L('wet · dirty', 'pipi · caca'), go: 'health' });
  if (mod('hydration') && (m.water != null || t.waterMl > 0)) chips.push({ k: 'water', v: fmtMl(m.water || 0), l: L('water', 'eau'), m: t.waterMl > 0 ? meter(m.water || 0, t.waterMl) : '', go: 'nutrition' });
  const sc = m.score || (m.stub ? null : mod('schedule') ? scoreDay(m) : null);
  if (sc?.score != null) chips.push({ k: 'score', v: String(sc.score), l: L('routine', 'routine'), m: meter(sc.score, 100), go: 'patterns' });
  return chips;
}
const m2Dismissed = () => { const d = lsGet(M2_DISMISS, {}); return d.day === isoOf(todayIdx()) ? d.keys || [] : []; };
const calloutKey = c => String(hashStr(c.html.replace(/<[^>]+>/g, '').replace(/\d+\s?(h|m|min)\b/g, '').slice(0, 120)));

function renderHome(){
  const box = $('#m2home'); if (!box) return;
  const td = $('#today'); if (td && box.contains(td)) box.after(td);   // the old banner lives under the hero only while Details is open
  if (!M2_PHONE.matches) { if (box.innerHTML) box.innerHTML = ''; document.body.classList.remove('m2details'); return; }   // phones only (phase 1)
  const S0 = todayState(), h = heroState(S0), ro = viewOnly(), nowA = S0.nowA;
  const timer = h.since != null ? fmtDur(nowA - h.since) : '';
  const acts = ro ? [] : primaryActions(S0), a0 = acts[0], a1 = acts[1];
  const tiles = ro ? [] : homeTiles(), chips = glanceChips(S0);
  const gone = m2Dismissed(), cards = S0.callouts.filter(c => !gone.includes(calloutKey(c)));
  const changed = k => { const v = JSON.stringify(k[1]); const ch = M2_LAST[k[0]] !== undefined && M2_LAST[k[0]] !== v; M2_LAST[k[0]] = v; return ch; };
  const stateCh = changed(['state', h.kind]);
  box.innerHTML = `
    <div class="m2hero ${h.kind} ${h.tone}${stateCh ? ' flip' : ''}" data-m2details role="button" aria-expanded="${!!UI.m2details}">
      <div class="m2ic">${ringSVG(h.prog, h.tone)}<span>${h.icon}</span></div>
      <div class="m2st">
        <div class="m2who">${multiKid() ? `<b style="color:${kidColor(kidIdx())}">${esc(kidName(kidIdx()))}</b> · ` : esc(S.profile.name || '') + (S.profile.name ? ' · ' : '')}${esc(fmtDay(S0.D, { weekday: 'short', month: 'short', day: 'numeric' }))}</div>
        <div class="m2state"><span>${esc(h.label)}</span>${timer ? ` <b class="m2t">${timer}</b>` : ''}</div>
        <div class="m2next">${h.since != null ? `${L('since', 'depuis')} ${fmtTime(h.since % DAY)}` : L('Log the first thing today to start the day', 'Notez la première chose pour commencer la journée')}${S0.peek ? ` · <b>${esc(S0.peek)}</b>` : ''}</div>
      </div>
      <span class="m2chev" aria-label="${esc(L('Details', 'Détails'))}">${UI.m2details ? '▴' : '▾'}</span>
    </div>
    ${a0 ? (() => { const x = actLabel(a0.p), y = a1 && actLabel(a1.p);
      return `<div class="m2acts"><button type="button" class="m2primary" data-m2act="${a0.i}"><span class="e">${x.ic}</span><span><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ''}</span></button>${y ? `<button type="button" class="m2second" data-m2act="${a1.i}"><span class="e">${y.ic}</span><b>${esc(y.t)}</b></button>` : ''}</div>`; })() : ''}
    ${tiles.length ? `<div class="m2tiles">${tiles.map(t => `<button type="button" class="m2tile${t.warn ? ' warn' : ''}" data-tile="${t.id}"><span class="e">${t.ic}</span><b>${esc(t.n)}</b><small>${esc(t.sub)}</small><i class="ok" aria-hidden="true">✓</i></button>`).join('')}</div>` : ''}
    ${chips.length ? `<div class="m2chips">${chips.map(c => `<button type="button" class="m2chip${changed(['c' + c.k, c.v]) ? ' tick' : ''}" data-goview="${c.go}"><b>${esc(c.v)}</b><small>${esc(c.l)}</small>${c.m || ''}</button>`).join('')}</div>` : ''}
    ${cards.length ? `<div class="m2cards" data-noswipe>${cards.map(c => `<div class="m2card callout ${c.cls}" data-ck="${calloutKey(c)}"><div class="m2cbody">${c.html}</div><button type="button" class="m2x" data-m2dismiss aria-label="${esc(L('Dismiss for today', 'Masquer pour aujourd’hui'))}">✕</button></div>`).join('')}</div>` : ''}`;
  document.body.classList.toggle('m2details', !!UI.m2details);
  if (UI.m2details && td) box.querySelector('.m2hero')?.after(td);
}
function dismissCard(card){
  const key = card.dataset.ck, d = lsGet(M2_DISMISS, {}), day = isoOf(todayIdx());
  lsSet(M2_DISMISS, { day, keys: [...(d.day === day ? d.keys || [] : []), key] });
  haptic(5);
  if (reduceMotion()) return renderHome();
  card.classList.add('gone'); setTimeout(renderHome, 220);
}
function onHome(e){
  const a = e.target.closest('[data-m2act]'); if (a) { e.stopPropagation(); return runAction(+a.dataset.m2act); }
  const t = e.target.closest('[data-tile]'); if (t) { const id = t.dataset.tile; if (id === 'more') { if (canLog()) openQuickLog(); return; } return openMini(id); }
  const x = e.target.closest('[data-m2dismiss]'); if (x) return dismissCard(x.closest('.m2card'));
  if (e.target.closest('[data-m2details]')) { UI.m2details = !UI.m2details; saveUI(); haptic(5); renderHome(); }
}
/** Swipe a heads-up card sideways to dismiss it for today. */
function cardSwipe(root){
  let c = null, x0 = 0, y0 = 0, dx = 0, on = false;
  root.addEventListener('touchstart', e => { c = e.target.closest('.m2card'); if (!c || e.target.closest('button,a')) { c = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; on = false; }, { passive: true });
  root.addEventListener('touchmove', e => { if (!c) return; dx = e.touches[0].clientX - x0; const dy = e.touches[0].clientY - y0;
    if (!on && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) on = true;
    if (on) { e.stopPropagation(); c.style.transform = `translateX(${dx}px)`; c.style.opacity = String(1 - Math.min(.7, Math.abs(dx) / 300)); } }, { passive: true });
  root.addEventListener('touchend', e => { if (!c) return; if (on) e.stopPropagation(); if (on && Math.abs(dx) > 90) dismissCard(c); else { c.style.transform = ''; c.style.opacity = ''; } c = null; });
}

/* Hook into the existing Today rendering (renderToday runs on every change and every 30 s). */
{ const base = renderToday; renderToday = function(){ base(); renderHome(); }; }
