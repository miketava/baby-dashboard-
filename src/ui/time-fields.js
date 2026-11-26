/* ── Typed time fields on computers ──
   The browser's time picker is fiddly with a mouse. With a fine pointer, every <input type=time> becomes a text box that
   accepts 930, 0930, 9:30, 9h30, 2p, 2:15 pm… and turns it into 24-hour HH:MM on Enter / leaving the field.
   ↑ / ↓ move by 5 minutes (Shift: 15). Phones keep the native wheel. Other code still reads and writes HH:MM. */
function normTime(s){
  s = String(s || '').trim().toLowerCase().replace(/\s+/g, '').replace(/\.?m\.?$/, '').replace(/\./g, ':');
  if (!s) return '';
  const m = s.match(/^(\d{1,2})(?:[:h]?(\d{2}))?(a|p)?$/); if (!m) return null;
  let h = +m[1]; const mi = m[2] ? +m[2] : 0;
  if (m[3]) { if (h > 12 || h === 0) return null; if (h === 12) h = 0; if (m[3] === 'p') h += 12; }
  if (h > 23 || mi > 59) return null;
  return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
}
(function typedTimes(){
  if (!matchMedia('(pointer: fine)').matches) return;
  const fix = el => { if (el.dataset.tx) return; el.dataset.tx = '1'; const v = el.value; el.type = 'text'; el.value = v; el.classList.add('tin');
    el.setAttribute('placeholder', 'HH:MM'); el.setAttribute('autocomplete', 'off'); el.setAttribute('spellcheck', 'false'); el.maxLength = 9; el.title = L('Type e.g. 930, 14:45 or 2:15p · ↑/↓ ±5 min', 'Tapez p. ex. 930, 14:45 ou 14h15 · ↑/↓ ±5 min'); };
  const scan = root => root.querySelectorAll?.('input[type=time]').forEach(fix);
  scan(document); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.('input[type=time]') ? fix(n) : scan(n))))).observe(document.body, { childList:true, subtree:true });
  const commit = el => { const v = normTime(el.value); if (v == null) { el.classList.add('bad'); el.setCustomValidity(L('Not a time — try 930 or 14:45', 'Heure invalide — essayez 930 ou 14:45')); return false; }
    el.classList.remove('bad'); el.setCustomValidity(''); if (el.value !== v) el.value = v; return true; };
  // partial typing ("9", "93") must not reach settings handlers that save on every keystroke
  document.addEventListener('input', e => { const el = e.target; if (!el.classList?.contains('tin')) return; el.classList.remove('bad'); el.setCustomValidity('');
    if (!/^\d{2}:\d{2}$/.test(el.value)) e.stopImmediatePropagation(); }, true);
  document.addEventListener('change', e => { const el = e.target; if (!el.classList?.contains('tin')) return; if (!commit(el)) { e.stopImmediatePropagation(); return; }
    el.dispatchEvent(new Event('input', { bubbles:true })); }, true);
  document.addEventListener('submit', e => { const bad = [...e.target.querySelectorAll('.tin')].filter(el => !commit(el)); if (bad.length) { e.preventDefault(); e.stopImmediatePropagation(); bad[0].reportValidity(); } }, true);
  document.addEventListener('keydown', e => { const el = e.target; if (!el.classList?.contains('tin')) return;
    if (e.key === 'Enter' && el.form == null) { el.blur(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault();
    const cur = parseTime(normTime(el.value) || '') ?? (Math.round(nowMin() / 5) * 5), step = (e.shiftKey ? 15 : 5) * (e.key === 'ArrowUp' ? 1 : -1);
    el.value = fmtTime(((Math.round(cur / Math.abs(step)) * Math.abs(step) + step) % DAY + DAY) % DAY); el.dispatchEvent(new Event('change', { bubbles:true })); }, true);
})();

