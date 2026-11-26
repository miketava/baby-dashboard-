/* ════════════════════════════════════════════════════════════════════════════
   5. CATEGORY REGISTRY — curated defaults + adaptive discovery + behaviour "kinds"
   ════════════════════════════════════════════════════════════════════════════ */
const DEFAULT_LC = Object.fromEntries(Object.keys(DEFAULT_CATS).map(k => [k.toLowerCase(), k]));
/** Infer what a category *means* from its name, so new categories get sensible analytics. */
function catKind(n){
  const s = n.toLowerCase();
  if (/^check-?in\b/.test(s)) return 'checkin';                      // before “sleep”, “feeding”… in the area name
  if (/^play\b|^playtime|^play time/.test(s)) return 'play';
  if (/vaccin|immuni[sz]/.test(s)) return 'vaccine';
  if (/\bweight|\bheight|\blength\b|head circ|growth/.test(s)) return 'growth';
  if (/\btooth\b|teeth? (in|erupt|came)/.test(s)) return 'tooth';
  if (/temperature|\btemp\b/.test(s)) return 'temp';
  if (/pump/.test(s)) return 'pump';
  if (/breast|nurs|latch/.test(s)) return 'nurse';
  if (/tummy/.test(s)) return 'tummy';
  if (/sleep|\bnap|night/.test(s)) return /night/.test(s) ? 'night' : 'nap';
  if (/handover|hand-off|drop-?off|pick-?up|exchange/.test(s)) return 'handover';
  if (/behaviou?r|mood|reaction|emotion/.test(s)) return 'behaviour';
  if (/awake|restless|waking|cry|fuss|tantrum/.test(s)) return 'awake';
  if (/milestone|achievement|first (word|step)/.test(s)) return 'milestone';
  if (/diaper|nappy|poop|potty/.test(s)) return 'diaper';
  if (/\bmeds?\b|medicine|medication|dose|vitamin/.test(s)) return 'meds';
  if (/medical|appoint|doctor|clinic|vaccin|pediatric|check-?up|dentist|specialist|therap/.test(s)) return 'medical';
  if (/health|incident|injur|bump|rash|fever|sick|\bill\b|teeth|teething|fall/.test(s)) return 'incident';
  if (/family contact|bio[ -]?(family|mom|mum|dad|parents?)|birth (family|parents?|mom|mum)|parent contact|contact (with|from) (the )?(bio|birth|family)/.test(s)) return 'contact';
  if (/guest|visitor|company over|people over|family over|friends? over/.test(s)) return 'guest';
  if (/home ?visit|in-home/.test(s)) return 'homevisit';
  if (/visit/.test(s)) return 'visit';
  if (/outing|excursion|errand|shopping|park|walk|playground|library|grandparent|playdate/.test(s)) return 'outing';
  if (/\bcar\b|drive|ride/.test(s)) return 'car';
  if (/bath|shower/.test(s)) return 'bath';
  if (/water|hydrat|electrolyte|juice/.test(s)) return 'water';
  if (/milk|bottle|formula|nurs|breast/.test(s)) return 'milk';
  if (/breakfast|lunch|dinner|supper|snack|meal|food|eat|puree/.test(s)) return 'meal';
  return 'other';
}
let CATS = new Map();  // canonical name → {name, kind, group, icon, base, known}
/** Normalise a raw category string to a canonical name (case-insensitive match to defaults). */
function canonCat(raw){
  const clean = String(raw || '').replace(/\bcheck\s*[-–—]?\s*in\b/ig, 'Check\u2011in')   // keep “Check-in” whole while tidying “Sleep-Nap” → “Sleep - Nap”
    .replace(/\s+/g,' ').replace(/\s*[-–—]\s*/g, ' - ').replace(/\s*\/\s*/g, ' / ').replace(/\u2011/g, '-').trim();
  if (!clean) return 'Uncategorized';
  const lc = clean.toLowerCase();
  if (DEFAULT_LC[lc]) return DEFAULT_LC[lc];
  for (const [name] of CATS) if (name.toLowerCase() === lc) return name;
  return clean;
}
function registerCat(name){
  if (CATS.has(name)) return CATS.get(name);
  const def = DEFAULT_CATS[name], kind = catKind(name), group = KIND_GROUP[kind] || 'Other';
  const info = { name, kind, group, icon: def?.icon || GROUP_ICON[group], known: !!def, base: def?.color || autoColor(name) };
  CATS.set(name, info); return info;
}
const cat = name => registerCat(name);
const catColor = name => S.catColors[name] || cat(name).base;
function resetCats(){ CATS = new Map(); Object.keys(DEFAULT_CATS).forEach(registerCat); }
resetCats();
/** Closest default category name if `name` looks like a typo of it. */
function typoOf(name){
  if (DEFAULT_CATS[name]) return null; const n = norm(name); if (n.length < 4) return null;
  let best = null, bd = 9;
  for (const d of Object.keys(DEFAULT_CATS)) { const dd = lev(n, norm(d)); if (dd < bd) { bd = dd; best = d; } }
  return bd > 0 && bd <= (n.length >= 7 ? 2 : 1) ? best : null;
}
const isSleep = e => e.k === 'night' || e.k === 'nap';
const isNight = e => e.k === 'night';
const isNap = e => e.k === 'nap';
const isAwake = e => e.k === 'awake';
const isMeal = e => e.k === 'meal';
const isCare = e => e.k === 'diaper' || e.k === 'meds';
const isRibbon = e => e.allDay || RIBBON.has(e.k);

/** Normalise Outcome / Rating to the standard vocabulary (tolerates case, spacing, small typos). */
const OUT_ALL = Object.values(OUTCOMES).flat();
const OUT_ALIAS = { good:'Ate Well', ate:'Ate Well', ateall:'Ate Well', accepted:'Ate Well', some:'Partial', half:'Partial', refused:'Refused', rejected:'Refused', none:'Refused',
  easy:'Easy', fussy:'Fussy', rough:'Rough', hard:'Rough', followup:'Follow-up Needed', followupneeded:'Follow-up Needed', needsfollowup:'Follow-up Needed', watch:'Monitor', monitoring:'Monitor', resolved:'Resolved', fine:'Resolved', ok:'Resolved' };
function canonOutcome(raw){
  const s = String(raw ?? '').trim(); if (!s) return { v:'' };
  const n = norm(s);
  const exact = OUT_ALL.find(o => norm(o) === n) || OUT_ALIAS[n]; if (exact) return { v: exact };
  let best = null, bd = 9; for (const o of OUT_ALL) { const d = lev(n, norm(o)); if (d < bd) { bd = d; best = o; } }
  if (bd <= 2) return { v: best, fixed: true };
  return { v: s, unknown: true };
}
const parseTags = raw => [...new Set(String(raw ?? '').split(/[,;|#]/).map(t => t.trim().toLowerCase().replace(/\s+/g,' ')).filter(Boolean))];

