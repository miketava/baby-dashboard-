/* ── Measurements (Value column): weight, length, head, temperature, volume ── */
/** What a row measures, from its category. */
function measureKind(e){
  if (e.k === 'growth') return /head/i.test(e.cat) ? 'head' : /height|length/i.test(e.cat) ? 'length' : /weight/i.test(e.cat) ? 'weight' : null;
  if (e.k === 'temp') return 'temp';
  if (e.k === 'pump') return 'volume';
  return null;
}
/**
 * Parse "3.4 kg", "3400 g", "7 lb 8 oz", "7.5 lb", "52 cm", "20.5 in", "37.6 °C", "99.7 F", "90 ml", "3 oz".
 * Bare numbers use the profile's units. Returns a standard value: kg, cm, °C, or oz (volume); null if unreadable.
 */
function parseMeasure(raw, mk){
  const s = String(raw ?? '').trim().toLowerCase().replace(',', '.'); if (!s) return null;
  const num = x => parseFloat(x), met = metric();
  let m;
  if (mk === 'weight') {
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:lb|lbs|#)\s*(?:(\d+(?:\.\d+)?)\s*oz)?$/))) return num(m[1]) * 0.45359237 + (m[2] ? num(m[2]) * 0.028349523 : 0);
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(kg|kgs|kilo\w*|g|grams?|oz)?$/))) { const v = num(m[1]), u = m[2] || '';
      if (/^kg|^kilo/.test(u)) return v; if (/^g/.test(u)) return v / 1000; if (u === 'oz') return v * 0.028349523;
      return met ? (v > 60 ? v / 1000 : v) : v * 0.45359237; }
  }
  if (mk === 'length' || mk === 'head') {
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(cm|mm|in|inch\w*|"|”)?$/))) { const v = num(m[1]), u = m[2] || '';
      if (u === 'cm') return v; if (u === 'mm') return v / 10; if (u) return v * 2.54; return met ? v : v * 2.54; }
  }
  if (mk === 'temp') {
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*°?\s*(c|f)?$/))) { const v = num(m[1]), u = m[2]; return u === 'f' || (!u && v > 45) ? (v - 32) * 5 / 9 : v; }
  }
  if (mk === 'volume') {
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(ml|oz|fl ?oz)?$/))) { const v = num(m[1]), u = m[2] || ''; return u === 'ml' ? v / OZ_ML : u ? v : met ? v / OZ_ML : v; }
  }
  return null;
}
/** Display helpers for measurements in the profile's units. */
const fmtWeight = kg => kg == null ? '—' : metric() ? (kg < 10 ? kg.toFixed(2) : kg.toFixed(1)) + ' kg' : (() => { const oz = Math.round(kg / 0.028349523); return `${Math.floor(oz / 16)} lb ${oz % 16} oz`; })();
const fmtLen = cm => cm == null ? '—' : metric() ? cm.toFixed(1) + ' cm' : (cm / 2.54).toFixed(1) + ' in';
const fmtTemp = c => c == null ? '—' : metric() ? c.toFixed(1) + ' °C' : (c * 9 / 5 + 32).toFixed(1) + ' °F';
const fmtMeasure = (mk, v) => mk === 'weight' ? fmtWeight(v) : mk === 'temp' ? fmtTemp(v) : mk === 'volume' ? fmtOz(v) : fmtLen(v);

/** Parse "2026-11-21", "11/21/2026", "2026/11/21", "Nov 21, 2026" → integer day index (days since epoch). */
function parseDate(str){
  if (str == null) return null;
  const s = String(str).trim(); if (!s) return null;
  let y, mo, d, m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) { y=+m[1]; mo=+m[2]; d=+m[3]; }
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) { mo=+m[1]; d=+m[2]; y=+m[3]; if (mo > 12) [mo, d] = [d, mo]; }
  else { const t = new Date(s); if (isNaN(t)) return null; y=t.getFullYear(); mo=t.getMonth()+1; d=t.getDate(); }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2200) return null;
  return Math.round(Date.UTC(y, mo-1, d) / 864e5);
}
const idxDate = i => new Date(i * 864e5);
const isoOf = i => idxDate(i).toISOString().slice(0,10);
const fmtDay = (i, opts={weekday:'short', month:'short', day:'numeric'}) => idxDate(i).toLocaleDateString(LOC(), {...opts, timeZone:'UTC'});
const fmtDayShort = i => idxDate(i).toLocaleDateString(LOC(), {month:'short', day:'numeric', timeZone:'UTC'});
/** Local wall-clock helpers (the device's time zone). */
const todayIdx = () => { const n = new Date(); return Math.round(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())/864e5); };
const nowMin = () => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); };
const nowAbs = () => todayIdx()*DAY + nowMin();

/** Deterministic string hash → distinct hue (golden-angle spacing). */
function hashStr(s){ let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hslHex(h, s, l){ s/=100; l/=100; const k = n => (n + h/30) % 12, a = s*Math.min(l, 1-l);
  const f = n => Math.round(255*(l - a*Math.max(-1, Math.min(k(n)-3, 9-k(n), 1)))).toString(16).padStart(2,'0'); return '#'+f(0)+f(8)+f(4); }
function autoColor(name){ const h = (hashStr(name.toLowerCase()) % 997) * 137.508 % 360; return hslHex(h, 62, 52); }
/** Pick readable text color for a background. */
function inkFor(hex){ const c = hex.replace('#',''); if (c.length < 6) return '#fff';
  const [r,g,b] = [0,2,4].map(i => parseInt(c.substr(i,2),16)/255).map(v => v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return (0.2126*r + 0.7152*g + 0.0722*b) > 0.42 ? '#111827' : '#ffffff'; }
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function toast(msg, err=false){ const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 3200); }
function download(name, text, type='text/csv'){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const csvCell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
async function copyText(text){ try { await navigator.clipboard.writeText(text); return true; } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); return ok; } }

