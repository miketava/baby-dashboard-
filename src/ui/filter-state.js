/* ════════════════════════════════════════════════════════════════════════════
   9. FILTER STATE
   ════════════════════════════════════════════════════════════════════════════ */
const DEFAULT_FILTER = { range:'last14', from:null, to:null, dayType:'all', q:'', hidden:[] };
let F = Object.assign({ ...DEFAULT_FILTER }, lsGet(LS_FILTER, {}));
const saveFilter = () => lsSet(LS_FILTER, F);
/** Categories hidden by the filter bar. The Today section ignores them (it has no filter bar), so it always shows everything. */
let IGNORE_FILTER = false;
const hiddenSet = () => new Set(IGNORE_FILTER ? [] : F.hidden);
const qMatch = e => { if (!F.q) return true; const q = F.q.toLowerCase(); return (e.notes || '').toLowerCase().includes(q) || e.tags.some(t => t.includes(q)); };
function dataSpan(){ const ks = [...DAYS.keys()]; return ks.length ? [Math.min(...ks), Math.max(...ks)] : [todayIdx(), todayIdx()]; }
function ensureCustomRange(){ const [a,b] = dataSpan(); if (F.from == null) F.from = a; if (F.to == null) F.to = b; }
/** Resolve the date-range preset. "Last N days" is anchored on the most recent day in the data. */
function rangeBounds(){
  const [a, b] = dataSpan();
  switch (F.range) {
    case 'last7': return [b-6, b];
    case 'last14': return [b-13, b];
    case 'week': { const dow = (idxDate(b).getUTCDay() + 6) % 7; return [b-dow, b-dow+6]; }
    case 'custom': return [Math.min(F.from ?? a, F.to ?? b), Math.max(F.from ?? a, F.to ?? b)];
    default: return [a, b];
  }
}
const DAYTYPE_TEST = {
  visit: m => m.visit, home: m => !m.visit, split: m => m.split, after: m => m.afterVisit,
  homevisit: m => m.homeVisit, medical: m => m.medical, outing: m => m.outing, car: m => m.car,
};
/** Days passing the range, day-type and keyword filters (ascending). */
function visibleDays(bounds){
  const [a, b] = bounds || rangeBounds(); const out = [];
  for (const [D, m] of [...DAYS].sort((x,y) => x[0]-y[0])) {
    if (D < a || D > b) continue;
    if (F.dayType !== 'all' && DAYTYPE_TEST[F.dayType] && !DAYTYPE_TEST[F.dayType](m)) continue;
    if (F.q && !m.evs.some(qMatch)) continue;
    out.push(m);
  }
  return out;
}
/** Events on visible days that pass category + keyword filters. */
function visibleEvents(days){ const hid = hiddenSet(); const set = new Set(days.map(d => d.D)); return DATA.events.filter(e => set.has(e.d) && !hid.has(e.cat) && qMatch(e)); }
