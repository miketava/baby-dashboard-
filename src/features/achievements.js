/* ════════════════════════════════════════════════════════════════════════════
   v1.35 — ACHIEVEMENTS (badges)
   Computed from the log on every sync, never counted live, so history is right from day one.
   • A tier's earned time = when the event that crossed the threshold happened (Logged At for
     On the Dot / Night Owl), not when the badge was first seen.
   • First earned times are kept in S.badges.earned (Config tab, key "badges") so deleting old rows
     never takes a badge away. Demo data and viewer keys never write anything.
   • Seen state is per device (localStorage): each caregiver gets their own celebrations.
   • Scope: H = household (all children), otherwise the child shown.
   ════════════════════════════════════════════════════════════════════════════ */
const ACH_TIERS = [
  ['Bronze', 'Bronze', '#c2783c'], ['Silver', 'Argent', '#94a3b8'], ['Gold', 'Or', '#eab308'],
  ['Platinum', 'Platine', '#38bdf8'], ['Legendary', 'Légendaire', '#a855f7'], ['Mythic', 'Mythique', '#ec4899'],
];
const achTierName = i => L(...ACH_TIERS[i].slice(0, 2));
const achTierColor = i => ACH_TIERS[i][2];
const ACH_WEEK = d => Math.floor((d + 3) / 7);          // Monday-based week number (day 0 = Thu 1970-01-01)
const achAt = e => e.t ?? e.s;                           // when an event was “done”: its end, or its start if instant
const achLogged = e => e.loggedAt != null && !e.preTracking ? e.loggedAt : null;
const achBy = e => String(e.raw?.by || '').trim();

/** Running total (sum) or running best (max) of { at, x } items → [[at, value]] steps where the value rose. */
function achProg(items, mode = 'sum'){
  const out = []; let v = 0;
  items.filter(i => i.at != null && isFinite(i.x)).sort((a, b) => a.at - b.at).forEach(i => {
    const nv = mode === 'max' ? Math.max(v, i.x) : v + i.x;
    if (nv > v || !out.length && nv > 0) { v = nv; out.push([i.at, v]); }
  });
  return out;
}
const achCount = (evs, f, at = achAt) => achProg(evs.filter(f).map(e => ({ at: at(e), x: 1 })));

/* ── The catalogue ── */
const ACHIEVEMENTS = [
  { id:'scribe', ic:'✍️', h:true, n:['Scribe', 'Scribe'], d:['Every entry in the log, by anyone.', 'Chaque entrée du journal, par n’importe qui.'],
    tiers:[5, 25, 100, 500, 1000, 5000], calc: evs => achCount(evs, () => true) },
  { id:'tagteam', ic:'🤝', h:true, n:['Tag Team', 'Duo de choc'], d:['Entries signed by the second caregiver (the “Who am I” name on each phone). Counts whoever has logged less, so it grows as you share the load.', 'Entrées signées par le deuxième parent (le nom « Qui suis-je » de chaque téléphone). Compte celui qui a le moins noté : ça monte quand vous partagez la tâche.'],
    tiers:[5, 25, 100, 500], show: c => c.loggers >= 2,
    calc: evs => { const n = new Map(), out = []; let v = 0;
      evs.filter(e => achBy(e)).map(e => ({ e, at: achLogged(e) ?? e.s })).sort((a, b) => a.at - b.at).forEach(({ e, at }) => {
        const who = achBy(e).toLowerCase(); n.set(who, (n.get(who) || 0) + 1);
        const second = [...n.values()].sort((a, b) => b - a)[1] || 0; if (second > v) { v = second; out.push([at, v]); } });
      return out; } },
  { id:'ondot', ic:'⏱️', h:true, n:['On the Dot', 'Pile à l’heure'], d:['Entries logged within 10 minutes of the moment (its start or its end).', 'Entrées notées dans les 10 minutes suivant le moment (le début ou la fin).'],
    tiers:[10, 50, 250], show: c => c.hasLogged,
    calc: evs => achCount(evs, e => { const lg = achLogged(e); if (lg == null || e.st == null) return false;
      return [e.s, e.t].some(x => x != null && lg >= x - 5 && lg - x <= 10); }, achLogged) },
  { id:'habit', ic:'📆', h:true, n:['Daily Habit', 'Bonne habitude'], d:['Days in a row with at least one entry. Your best run is kept, so a missed day never takes a tier away.', 'Jours d’affilée avec au moins une entrée. Votre meilleure série est gardée : un jour manqué n’enlève jamais un palier.'],
    tiers:[3, 7, 30, 100, 365], unit:'days',
    calc: evs => { const first = new Map(); evs.forEach(e => { if (!first.has(e.d) || e.s < first.get(e.d)) first.set(e.d, e.s); });
      const ds = [...first.keys()].sort((a, b) => a - b), items = []; let run = 0, prev = null;
      ds.forEach(d => { run = prev != null && d === prev + 1 ? run + 1 : 1; prev = d; items.push({ at: first.get(d), x: run }); });
      return achProg(items, 'max'); } },
  { id:'nightowl', ic:'🦉', h:true, n:['Night Owl', 'Oiseau de nuit'], d:['Entries logged between midnight and 5 a.m. Somebody was up.', 'Entrées notées entre minuit et 5 h. Quelqu’un était debout.'],
    tiers:[10, 50, 200], show: c => c.hasLogged,
    calc: evs => achCount(evs, e => { const lg = achLogged(e); return lg != null && ((lg % DAY) + DAY) % DAY < 300; }, achLogged) },
  { id:'diapers', ic:'💂', n:['Changing of the Guard', 'Relève de la garde'], d:['Every diaper logged.', 'Chaque couche notée.'],
    tiers:[50, 250, 1000, 2500, 5000], show: () => mod('diapers'), calc: evs => achCount(evs, e => e.k === 'diaper') },
  { id:'codebrown', ic:'💩', n:['Code Brown', 'Code brun'], d:['Poop diapers. You know the ones.', 'Couches souillées. Vous savez lesquelles.'],
    tiers:[25, 100, 500], show: () => mod('diapers'), calc: evs => achCount(evs, e => e.k === 'diaper' && /poop|dirty|\bbm\b|stool|souill/i.test(e.cat)) },
  { id:'doubleduty', ic:'⚡', n:['Double Duty', 'Doublé'], d:['A fresh diaper needed again within an hour. Two rows logged at the same moment (wet + poop) count as one change.', 'Une couche à refaire moins d’une heure plus tard. Deux lignes notées au même moment (pipi + caca) comptent comme un seul change.'],
    tiers:[10, 50, 200], show: () => mod('diapers'),
    calc: evs => { const ds = evs.filter(e => e.k === 'diaper' && e.st != null).sort((a, b) => a.s - b.s), items = []; let prev = null, paired = false;
      ds.forEach(e => { if (prev && e.s - prev.s <= 2) return;                // same change logged twice
        if (prev && !paired && e.s - prev.s <= 60) { items.push({ at: e.s, x: 1 }); paired = true; } else paired = false; prev = e; });
      return achProg(items); } },
  { id:'sandman', ic:'🌙', n:['Sandman', 'Marchand de sable'], d:['Hours of sleep logged, naps and nights together.', 'Heures de sommeil notées, siestes et nuits ensemble.'],
    tiers:[100, 500, 1000, 2500, 5000], unit:'h', calc: evs => achProg(evs.filter(e => isSleep(e) && e.t != null && !e.open).map(e => ({ at: e.t, x: e.dur / 60 }))) },
  { id:'longhaul', ic:'🛌', n:['Long Haul', 'Grande nuit'], d:['The longest single stretch of night sleep, without a logged waking.', 'Le plus long bloc de sommeil de nuit, sans réveil noté.'],
    tiers:[4, 6, 8, 10, 12], unit:'h', calc: evs => achProg(evs.filter(e => isNight(e) && e.t != null && !e.open).map(e => ({ at: e.t, x: e.dur / 60 })), 'max') },
  { id:'naps', ic:'😴', n:['Nap Collector', 'Collection de siestes'], d:['Naps at home (car naps have their own badge).', 'Siestes à la maison (les siestes en auto ont leur propre badge).'],
    tiers:[50, 250, 1000], calc: evs => achCount(evs, e => isNap(e) && !/car|auto/i.test(e.cat)) },
  { id:'roadtrip', ic:'🚗', n:['Road Trip', 'En voiture'], d:['Naps in the car.', 'Siestes en auto.'],
    tiers:[5, 25, 100], calc: evs => achCount(evs, e => isNap(e) && /car|auto/i.test(e.cat)) },
  { id:'milk', ic:'🍼', n:['Milk Run', 'Tournée du lait'], d:['All the milk and bottles logged, added up.', 'Tout le lait et les biberons notés, additionnés.'],
    tiers:[10, 50, 250, 1000], unit:'L', calc: evs => achProg(evs.filter(e => e.k === 'milk' && e.milk > 0).map(e => ({ at: e.s, x: e.milk * OZ_ML / 1000 }))) },
  { id:'water', ic:'💧', n:['Hydration Station', 'Bien hydraté'], d:['All the water logged, added up.', 'Toute l’eau notée, additionnée.'],
    tiers:[1, 10, 50], unit:'L', show: () => mod('hydration'), calc: evs => achProg(evs.filter(e => e.water > 0).map(e => ({ at: e.s, x: e.water / 1000 }))) },
  { id:'nurse', ic:'🤱', n:['Left, Right, Repeat', 'Gauche, droite, encore'], d:['Breastfeeding sessions (switching sides is still one session).', 'Séances d’allaitement (changer de côté reste une seule séance).'],
    tiers:[50, 250, 1000], show: c => c.path !== 'placement' && mod('newborn'),
    calc: evs => { const fs = evs.filter(e => e.k === 'nurse' && e.st != null).sort((a, b) => a.s - b.s), items = []; let end = -1e12;
      fs.forEach(e => { if (e.s - end > 30) items.push({ at: e.s, x: 1 }); end = Math.max(end, e.t ?? e.s); }); return achProg(items); } },
  { id:'foods', ic:'🥕', n:['Adventurous Eater', 'Petit gourmet'], d:['Different foods ever tried, from the foods on meal rows.', 'Aliments différents jamais goûtés, d’après les aliments des repas.'],
    tiers:[10, 25, 50, 100, 150], show: () => mod('food'),
    calc: evs => { const seen = new Set(), items = []; evs.filter(isMeal).sort((a, b) => a.s - b.s).forEach(e => foodsOf(e).forEach(f => { if (!seen.has(f)) { seen.add(f); items.push({ at: e.s, x: 1 }); } })); return achProg(items); } },
  { id:'rainbow', ic:'🌈', n:['Rainbow Plate', 'Assiette arc-en-ciel'], d:['The most different foods in one week (Monday to Sunday). Your best week is kept.', 'Le plus d’aliments différents en une semaine (lundi à dimanche). Votre meilleure semaine est gardée.'],
    tiers:[7, 12, 18, 25, 30], show: () => mod('food'),
    calc: evs => { const wk = new Map(), items = []; evs.filter(isMeal).sort((a, b) => a.s - b.s).forEach(e => { const w = ACH_WEEK(e.d); if (!wk.has(w)) wk.set(w, new Set());
      const set = wk.get(w); foodsOf(e).forEach(f => { if (!set.has(f)) { set.add(f); items.push({ at: e.s, x: set.size }); } }); }); return achProg(items, 'max'); } },
  { id:'allergens', ic:'🥜', n:['Allergen Ace', 'As des allergènes'], d:['Common allergen groups offered so far (egg, dairy, peanut, tree nut, wheat, soy, fish, shellfish, sesame).', 'Groupes d’allergènes courants offerts jusqu’ici (œuf, lait, arachide, noix, blé, soya, poisson, crustacés, sésame).'],
    tiers:[3, 6, 9], show: () => mod('food'),
    calc: evs => { const got = new Set(), items = []; evs.filter(isMeal).sort((a, b) => a.s - b.s).forEach(e => foodsOf(e).forEach(f => ALLERGENS.forEach(([a, re]) => { if (!got.has(a) && re.test(f)) { got.add(a); items.push({ at: e.s, x: 1 }); } }))); return achProg(items); } },
  { id:'teeth', ic:'🦷', n:['Tooth Fairy', 'Fée des dents'], d:['Teeth logged as they come through.', 'Dents notées à mesure qu’elles percent.'],
    tiers:[1, 4, 8, 12, 20], show: () => mod('teeth'), calc: evs => achCount(evs, e => e.k === 'tooth') },
  { id:'firsts', ic:'⭐', n:['Firsts', 'Premières fois'], d:['Milestones logged: new skills, new words.', 'Étapes notées : nouvelles habiletés, nouveaux mots.'],
    tiers:[1, 5, 15, 30], show: () => mod('milestones'), calc: evs => achCount(evs, e => e.k === 'milestone') },
  { id:'outings', ic:'🌳', n:['Out and About', 'En vadrouille'], d:['Outings and excursions.', 'Sorties et excursions.'],
    tiers:[10, 50, 200], calc: evs => achCount(evs, e => e.k === 'outing') },
  { id:'tummy', ic:'🧸', n:['Tummy Time Titan', 'Champion du ventre'], d:['Minutes of tummy time.', 'Minutes sur le ventre.'],
    tiers:[60, 300, 1000], unit:'min', show: c => c.age == null || c.age < 274 || c.hasTummy,
    calc: evs => achProg(evs.filter(e => e.k === 'tummy' && e.t != null).map(e => ({ at: e.t, x: e.dur }))) },
];
const achById = id => ACHIEVEMENTS.find(a => a.id === id);

/** Display a value in the badge's unit (milk and water follow the child's units). */
function achFmt(a, v){
  if (v == null) return '—';
  if (a.unit === 'L') { if (S.profile?.units !== 'metric') return `${Math.round(v * 1000 / OZ_ML).toLocaleString(LOC())} oz`; return `${v < 10 ? (Math.floor(v * 10) / 10).toLocaleString(LOC()) : Math.floor(v).toLocaleString(LOC())} L`; }
  if (a.unit === 'h') return `${Math.floor(v).toLocaleString(LOC())} h`;
  if (a.unit === 'min') return v >= 60 ? fmtDur(Math.floor(v)) : `${Math.floor(v)} min`;
  if (a.unit === 'days') return L(`${v} day${v === 1 ? '' : 's'}`, `${v} jour${v > 1 ? 's' : ''}`);
  return Math.floor(v).toLocaleString(LOC());
}
const achFmtShort = (a, v) => a.unit === 'days' ? String(v) : achFmt(a, v);

/* ── Compute everything for the child shown + the household ── */
let ACH = null;   // { list:[{a, scope, value, tiers:[{th, at}], earned, steps}], ctx }
const achScopeId = a => a.h ? 'H' : kidCfgId(kidIdx());
function achContext(){
  const all = DATA.allEvents || DATA.events || [];
  const names = new Set(all.map(e => achBy(e).toLowerCase()).filter(Boolean));
  return { path: S.profile?.path || 'placement', age: typeof ageDays === 'function' ? ageDays() : null, loggers: names.size,
    hasLogged: all.some(e => achLogged(e) != null), hasTummy: (DATA.events || []).some(e => e.k === 'tummy') };
}
const achStore = () => { S.badges = S.badges || {}; S.badges.earned = S.badges.earned || {}; S.badges.hidden = S.badges.hidden || {}; return S.badges; };
const achPersist = () => DATA.source === 'live' || DATA.source === 'csv';
function computeAchievements(){
  const ctx = achContext(), store = achStore(), persist = achPersist() && !viewOnly();
  let changed = false;
  const list = ACHIEVEMENTS.filter(a => !a.show || a.show(ctx)).map(a => {
    const evs = a.h ? (DATA.allEvents || DATA.events) : DATA.events;
    let steps = []; try { steps = a.calc(evs || []); } catch (err) { console.warn('badge', a.id, err); }
    const value = steps.length ? steps[steps.length - 1][1] : 0, scope = achScopeId(a);
    const kept = persist ? ((store.earned[scope] = store.earned[scope] || {})[a.id] = store.earned[scope][a.id] || []) : [];
    const tiers = a.tiers.map((th, i) => {
      const hit = steps.find(s => s[1] >= th - 1e-9), at = hit ? hit[0] : null, old = kept[i] ?? null;
      const best = old != null && at != null ? Math.min(old, at) : old ?? at;
      if (persist && best != null && best !== old) { kept[i] = best; changed = true; }
      return { th, at: best };
    });
    return { a, scope, value, tiers, earned: tiers.filter(t => t.at != null).length, steps };
  });
  if (changed) { lsSet(LS_SETTINGS, S); if (typeof cfgQueuePush === 'function') cfgQueuePush(); }
  ACH = { list, ctx };
  return ACH;
}
const achHiddenSet = () => new Set(achStore().hidden[kidCfgId(kidIdx())] || []);
function achToggleHidden(id){
  const store = achStore(), k = kidCfgId(kidIdx()), set = new Set(store.hidden[k] || []);
  const hide = !set.has(id); hide ? set.add(id) : set.delete(id); store.hidden[k] = [...set];
  saveSettings(); return hide;
}

/* ── Seen state (this device) + celebrations ── */
const LS_ACHSEEN = 'bld.achSeen.v1';
let ACHSEEN = lsGet(LS_ACHSEEN, null) || {};
const achSaveSeen = () => lsSet(LS_ACHSEEN, ACHSEEN);
const achSeenKey = r => r.scope + ':' + r.a.id;
/** Called after every ingest: work out new tiers, then queue toasts (first time) or celebrations. */
function achAfterIngest(){
  if (!mod('badges')) { ACH = null; return; }
  computeAchievements();
  if (!achPersist() || viewOnly()) return;
  const src = DATA.source, seen = ACHSEEN[src] = ACHSEEN[src] || { init: {}, n: {} };
  const hidden = achHiddenSet(), scopes = [...new Set(ACH.list.map(r => r.scope))];
  const firstTime = scopes.filter(sc => !seen.init[sc]);
  const fresh = ACH.list.filter(r => r.earned > (seen.n[achSeenKey(r)] || 0));
  fresh.forEach(r => { seen.n[achSeenKey(r)] = r.earned; });
  scopes.forEach(sc => { seen.init[sc] = true; });
  achSaveSeen();
  const show = fresh.filter(r => !hidden.has(r.a.id));
  const catchUp = show.filter(r => firstTime.includes(r.scope)), live = show.filter(r => !firstTime.includes(r.scope));
  if (catchUp.length) achQueueCatchUp(catchUp);
  live.forEach(r => achQueueUnlock(r));
  if (VIEW === 'awards') renderAwards();
}
/** Settings / view button: forget what this device has seen and replay every unlock. */
function achReplay(){
  const src = DATA.source; if (ACHSEEN[src]) { const sc = kidCfgId(kidIdx()); delete ACHSEEN[src].init[sc]; delete ACHSEEN[src].init.H;
    Object.keys(ACHSEEN[src].n).forEach(k => { if (k.startsWith(sc + ':') || k.startsWith('H:')) delete ACHSEEN[src].n[k]; }); achSaveSeen(); }
  if (!achPersist()) { const list = (ACH || computeAchievements()).list.filter(r => r.earned && !achHiddenSet().has(r.a.id)); achQueueCatchUp(list); return; }
  achAfterIngest();
}

/* Queue: toasts and unlock pop-ups wait while Quick Log, a dialog or another pop-up is open. */
const ACHQ = [];
let achBusy = false, achWaitTimer = null;
const achBlocked = () => $('#qlog')?.classList.contains('on') || $('.modal.on') || $('#moreSheet')?.classList.contains('on') || typeof TOUR !== 'undefined' && TOUR;
function achPump(){
  clearTimeout(achWaitTimer);
  if (achBusy || !ACHQ.length) return;
  if (achBlocked()) { achWaitTimer = setTimeout(achPump, 1200); return; }
  const job = ACHQ.shift(); achBusy = true; job(() => { achBusy = false; setTimeout(achPump, 250); });
}
/** Catch-up: one toast per badge at its highest tier, oldest first, ~1.2 s apart, then a summary. */
function achQueueCatchUp(rows){
  const last = r => Math.max(...r.tiers.filter(t => t.at != null).map(t => t.at));
  const list = rows.filter(r => r.earned).sort((x, y) => last(x) - last(y)); if (!list.length) return;
  const state = { skip: false };
  list.forEach((r, i) => ACHQ.push(done => { if (state.skip) return done(); achToast(r, { first: i === 0, state, n: list.length, i }); setTimeout(done, 1250); }));
  const tiers = list.reduce((s, r) => s + r.earned, 0), since = Math.min(...list.map(r => r.tiers[0].at));
  ACHQ.push(done => { achSummaryToast(list.length, tiers, since); setTimeout(done, 400); });
  achPump();
}
function achQueueUnlock(r){ ACHQ.push(done => achUnlockPop(r, done)); achPump(); }

/* ── Sound (Web Audio, no files) and confetti (one canvas) ── */
let ACH_AC = null;
const achQuiet = () => S.badges?.sound === false || UI.achSound === false || (typeof isNightMin === 'function' && isNightMin(nowMin())) || (DATA.events || []).some(e => isSleep(e) && e.open);
const achReduced = () => matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function achSfx(kind = 'big'){
  if (achQuiet()) return;
  try {
    ACH_AC = ACH_AC || new (window.AudioContext || window.webkitAudioContext)(); const ac = ACH_AC; if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + .02, master = ac.createGain(); master.gain.value = kind === 'big' ? .22 : .1; master.connect(ac.destination);
    const note = (f, t, len, type = 'triangle', vol = 1) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + len); o.connect(g); g.connect(master); o.start(t); o.stop(t + len + .05); };
    if (kind === 'big') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t0 + i * .085, .35)); [2093, 2637, 3136, 4186].forEach((f, i) => note(f, t0 + .38 + i * .06, .25, 'sine', .45)); }
    else { note(1318.5, t0, .18, 'sine', .8); note(1975.5, t0 + .07, .22, 'sine', .6); }
  } catch {}
}
function achConfetti({ x = innerWidth / 2, y = innerHeight * .38, n = 140, spread = 1 } = {}){
  if (achReduced()) return;
  let cv = $('#achConfetti');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'achConfetti'; document.body.appendChild(cv); }
  const dpr = devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cols = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#06b6d4'];
  const ps = Array.from({ length: n }, () => { const ang = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.3 * spread, sp = (5 + Math.random() * 8) * Math.max(.5, spread);
    return { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .35, w: 5 + Math.random() * 5, h: 7 + Math.random() * 7, c: cols[Math.random() * cols.length | 0], life: 1 }; });
  const t0 = performance.now();
  (function frame(t){
    const age = (t - t0) / 1000; ctx.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life = Math.max(0, 1 - Math.max(0, age - 1.1) / .6);
      ctx.save(); ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore(); });
    if (age < 1.75) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

/* ── Pieces of UI shared by the grid, toasts and pop-ups ── */
const ACH_R = 26, ACH_C = 2 * Math.PI * ACH_R;
/** Progress toward the next tier: { frac, cur, next, maxed }. */
function achNext(r){
  const i = r.earned, maxed = i >= r.tiers.length, prev = i ? r.tiers[i - 1].th : 0;
  if (maxed) return { frac: 1, next: null, maxed, i };
  const next = r.tiers[i].th; return { frac: clamp((r.value - prev) / (next - prev), 0, 1), next, maxed, i };
}
const achRingColor = r => r.earned ? achTierColor(r.earned - 1) : 'var(--faint)';
function achRing(r, { frac, size = 64, cls = '' } = {}){
  const nx = achNext(r), f = frac ?? nx.frac, col = nx.maxed ? achTierColor(r.tiers.length - 1) : r.earned ? achTierColor(r.earned) : achTierColor(0);
  return `<svg class="achring ${cls}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="32" cy="32" r="${ACH_R}" class="trk"/><circle cx="32" cy="32" r="${ACH_R}" class="bar" style="stroke:${col};stroke-dasharray:${ACH_C.toFixed(2)};stroke-dashoffset:${(ACH_C * (1 - f)).toFixed(2)}"/></svg>`;
}
const achPips = (r, { pop = -1, nextGlow = false } = {}) => `<span class="achpips">${r.tiers.map((t, i) =>
  `<i class="${t.at != null && i !== pop ? 'on' : ''}${i === pop ? ' pop' : ''}${nextGlow && i === r.earned ? ' nx' : ''}" style="--pc:${achTierColor(i)}" title="${esc(achTierName(i))} · ${esc(achFmtShort(r.a, t.th))}"></i>`).join('')}</span>`;
const achWhen = at => at == null ? '' : fmtDay(Math.floor(at / DAY), { month: 'short', day: 'numeric', year: 'numeric' });

function achToast(r, { first, state, n, i }){
  let box = $('#achToasts'); if (!box) { box = document.createElement('div'); box.id = 'achToasts'; document.body.appendChild(box); }
  const t = document.createElement('button'); t.className = 'achtoast'; t.type = 'button';
  const top = r.earned - 1;
  t.innerHTML = `<span class="ic" style="--tc:${achTierColor(top)}">${r.a.ic}</span><span class="tx"><b>${esc(L(...r.a.n))}</b><span>${esc(achTierName(top))} · ${esc(achFmtShort(r.a, r.tiers[top].th))} · ${esc(achWhen(r.tiers[top].at))}</span>${achPips({ ...r, tiers: r.tiers.map(x => ({ ...x, at: null })) })}</span>${first && n > 1 ? `<span class="skip" role="button" tabindex="0">${L('Skip all', 'Tout passer')}</span>` : `<span class="cnt">${i + 1}/${n}</span>`}`;
  box.appendChild(t);
  const pips = $$('.achpips i', t); pips.forEach((p, k) => { if (k <= top) setTimeout(() => { p.classList.add('on', 'pop'); }, 220 + k * 140); });
  const rc = t.getBoundingClientRect(); achConfetti({ x: rc.left + 30, y: rc.top + rc.height / 2, n: 36, spread: .55 }); achSfx('small');
  t.addEventListener('click', e => { if (e.target.closest('.skip')) { state.skip = true; $$('.achtoast', box).forEach(x => x.remove()); return; } t.remove(); achDetail(r.a.id); });
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3400);
}
function achSummaryToast(nb, nt, since){
  let box = $('#achToasts'); if (!box) return;
  const t = document.createElement('button'); t.className = 'achtoast sum'; t.type = 'button';
  t.innerHTML = `<span class="ic">🏆</span><span class="tx"><b>${L(`${nb} badge${nb > 1 ? 's' : ''} · ${nt} tier${nt > 1 ? 's' : ''} earned`, `${nb} badge${nb > 1 ? 's' : ''} · ${nt} palier${nt > 1 ? 's' : ''} obtenus`)}</b><span>${L('since', 'depuis le')} ${esc(achWhen(since))} · ${L('tap to see them all', 'touchez pour tout voir')}</span></span>`;
  box.appendChild(t); achConfetti({ n: 90 });
  t.addEventListener('click', () => { t.remove(); setView('awards'); });
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 5000);
}

/** Full-screen pop-up: celebration (an unlock) or details (tapped from the grid / a toast). */
function achPopEl(){
  let p = $('#achPop');
  if (!p) { p = document.createElement('div'); p.id = 'achPop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('data-noi18n', '');
    p.innerHTML = '<div class="achbox"></div>'; document.body.appendChild(p);
    p.addEventListener('click', e => { if (e.target === p || e.target.closest('[data-achclose]')) achClosePop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && p.classList.contains('on')) achClosePop(); }); }
  return p;
}
let achPopDone = null, achPopTimer = null;
function achClosePop(){ const p = $('#achPop'); if (!p) return; p.classList.remove('on'); clearTimeout(achPopTimer); if (CH.achDetail) { CH.achDetail.destroy(); delete CH.achDetail; } const d = achPopDone; achPopDone = null; d?.(); }
function achUnlockPop(r, done){
  const p = achPopEl(), box = $('.achbox', p), k = r.earned - 1, nx = achNext(r), reduced = achReduced();
  box.className = 'achbox unlock';
  box.innerHTML = `<div class="achbig">${achRing(r, { frac: reduced ? 1 : .15, size: 148, cls: 'big' })}<span class="ic">${r.a.ic}</span></div>
    <div class="achkick">${L('Badge unlocked!', 'Badge débloqué!')}</div>
    <h3>${esc(L(...r.a.n))}</h3>
    <div class="achtier" style="--tc:${achTierColor(k)}">${esc(achTierName(k))} · ${esc(achFmtShort(r.a, r.tiers[k].th))}</div>
    ${achPips(r, { pop: k })}
    <div class="achnext">${nx.maxed ? L('Every tier earned. Legend.', 'Tous les paliers obtenus. Légendaire.') : L(`Next: ${achFmtShort(r.a, nx.next)} · now ${achFmtShort(r.a, r.value)}`, `Prochain : ${achFmtShort(r.a, nx.next)} · actuellement ${achFmtShort(r.a, r.value)}`)}</div>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="btn" data-achclose>${L('Nice!', 'Super!')}</button></div>`;
  p.classList.add('on'); achPopDone = done;
  const bar = $('.achring .bar', box), pip = $$('.achpips i', box)[k];
  const setF = f => { bar.style.strokeDashoffset = (ACH_C * (1 - f)).toFixed(2); };
  if (reduced) { pip?.classList.add('on'); achSfx('big'); }
  else {
    requestAnimationFrame(() => requestAnimationFrame(() => setF(1)));                   // ring fills to the tier
    setTimeout(() => { pip?.classList.add('on'); achConfetti(); achSfx('big'); }, 950);  // tier pip pops
    setTimeout(() => { if (nx.maxed) return; bar.style.transition = 'none'; setF(0); bar.getBoundingClientRect(); bar.style.transition = '';
      bar.style.stroke = achTierColor(Math.min(r.earned, r.tiers.length - 1)); setF(nx.frac); $$('.achpips i', box)[r.earned]?.classList.add('nx'); }, 1900);
  }
  achPopTimer = setTimeout(achClosePop, 6500);
  box.addEventListener('pointerdown', () => clearTimeout(achPopTimer), { once: true });
}
