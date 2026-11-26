/* ── Food extraction (Feature C) ── */
let FOOD_DICT = null;
function foodDict(){
  if (FOOD_DICT) return FOOD_DICT;
  const extra = String(S.foodWords || '').split(/[,;\n]/).map(w => w.trim().toLowerCase()).filter(Boolean);
  const all = [...FOOD_WORDS, ...FOOD_MULTI, ...extra];
  FOOD_DICT = { set: new Set(all), multi: all.filter(w => w.includes(' ')).sort((a,b) => b.length - a.length), single: [...new Set(all.filter(w => !w.includes(' ')))] };
  return FOOD_DICT;
}
const canonFood = w => { const D = foodDict().set; if (D.has(w + 's')) return w + 's'; if (D.has(w + 'es')) return w + 'es'; if (w === 'egg') return 'eggs'; return w; };
/** Foods on a meal row: Tags (minus meal-descriptor tags) + dictionary words found in Notes. */
function foodsOf(e){
  const out = new Set();
  e.tags.filter(t => !NON_FOOD_TAGS.has(t.replace(/\s+/g,'-')) && !OUT_ALL.some(o => norm(o) === norm(t))).forEach(t => out.add(canonFood(t)));
  let txt = ' ' + (e.notes || '').toLowerCase() + ' ';
  const { multi, single } = foodDict();
  for (const w of multi) if (txt.includes(w)) { out.add(w); txt = txt.split(w).join(' '); }
  for (const w of single) if (new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b').test(txt)) out.add(canonFood(w));
  return [...out];
}
/** Ate Well / Partial / Refused / Unrated from Outcome, then tags, then Notes keywords. */
function acceptanceOf(e){
  if (OUTCOMES.meal.includes(e.outcome)) return e.outcome;
  if (e.tags.includes('accepted') || e.tags.includes('ate-well')) return 'Ate Well';
  if (e.tags.includes('refused')) return 'Refused';
  if (e.tags.includes('partial')) return 'Partial';
  const n = (e.notes || '').toLowerCase();
  if (/refus|wouldn.?t eat|spat|threw (it|food)|no interest/.test(n)) return 'Refused';
  if (/picky|didn.?t eat much|a little|few bites|half|some of/.test(n)) return 'Partial';
  if (/ate (it )?all|loved|devoured|finished|cleaned (the )?plate/.test(n)) return 'Ate Well';
  return 'Unrated';
}
const isNewFood = e => e.tags.some(t => /^(new|new-?food|first)$/.test(t)) || /first time|new food|first taste/i.test(e.notes || '');

