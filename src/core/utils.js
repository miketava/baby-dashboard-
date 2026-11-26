
/* ════════════════════════════════════════════════════════════════════════════
   3. UTILITIES
   ════════════════════════════════════════════════════════════════════════════ */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const DAY = 1440;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const mean = a => { const v = a.filter(x => x != null && isFinite(x)); return v.length ? v.reduce((s,x)=>s+x,0)/v.length : null; };
const sum = a => a.reduce((s,x)=>s+(x||0),0);
const median = a => { const v = a.filter(x => x != null && isFinite(x)).sort((x,y) => x-y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m-1]+v[m])/2; };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Levenshtein distance (for category / outcome typo detection). */
function lev(a, b){ if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m || n; let prev = Array.from({length:n+1}, (_,j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); prev = cur; } return prev[n]; }

/** Minutes since midnight → "HH:MM" (wraps past 24h). */
function fmtTime(m){ if (m == null || !isFinite(m)) return '—'; m = Math.round(m); const w = ((m % DAY) + DAY) % DAY; return pad(Math.floor(w/60)) + ':' + pad(w%60); }
/** Minutes → "2h 15m". */
function fmtDur(m){ if (m == null || !isFinite(m)) return '—'; m = Math.round(m); const sgn = m < 0 ? '−' : ''; m = Math.abs(m); const h = Math.floor(m/60), mm = m%60;
  if (FRL()) return sgn + (h ? h + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') : '') : mm + ' min');
  return sgn + (h ? h+'h' + (mm ? ' '+mm+'m' : '') : mm+'m'); }
