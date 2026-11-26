/* ── Clearable date fields ──
   Phone date pickers often have no way to empty a date once set. Every optional date field (not marked required)
   gets a small ✕ beside it that clears it and saves, like typing it blank. */
(function clearableDates(){
  const fix = el => { if (el.required || el.dataset.cx || el.closest('.dx')) return; el.dataset.cx = '1';
    const w = document.createElement('span'); w.className = 'dx'; el.replaceWith(w); w.appendChild(el);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm ghost dxb'; b.textContent = '✕'; b.setAttribute('data-noi18n', '');
    b.title = L('Clear this date', 'Effacer cette date'); b.setAttribute('aria-label', b.title);
    b.onclick = e => { e.preventDefault(); e.stopPropagation(); el.value = ''; el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true })); sync(); };
    const sync = () => w.classList.toggle('empty', !el.value); el.addEventListener('input', sync); el.addEventListener('change', sync); sync();
    w.appendChild(b); };
  const scan = root => root.querySelectorAll?.('input[type=date]').forEach(fix);
  scan(document); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.('input[type=date]') ? fix(n) : scan(n))))).observe(document.body, { childList:true, subtree:true });
})();

