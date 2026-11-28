
/* ════════════════════════════════════════════════════════════════════════════
   21. SETTINGS MODAL
   ════════════════════════════════════════════════════════════════════════════ */
let setPane = 'general', tplIdx = 0;
function openModal(id){ $('#' + id).classList.add('on'); $('#scrim').classList.add('on'); }
/** Press-and-hold (touch) or right-click (mouse) on any entry, in any tab, opens it for editing. */
function wireEditGestures(){
  let timer = null, start = null, fired = false;
  const target = e => e.target.closest?.('[data-ev]');
  const cancel = () => { clearTimeout(timer); timer = null; };
  document.addEventListener('pointerdown', e => {
    const t = target(e); fired = false; if (!t || e.pointerType === 'mouse') return;
    start = [e.clientX, e.clientY];
    timer = setTimeout(() => { timer = null; fired = true; navigator.vibrate?.(15); openEdit(evById(t.dataset.ev)); }, 550);
  }, { passive:true });
  document.addEventListener('pointermove', e => { if (timer && start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) cancel(); }, { passive:true });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev => document.addEventListener(ev, cancel, { passive:true, capture:true }));
  document.addEventListener('click', e => { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } }, true);   // no click after a long press
  document.addEventListener('click', e => { const b = e.target.closest?.('[data-edit]'); if (b) { e.stopPropagation(); e.preventDefault(); openEdit(evById(b.dataset.edit)); } }, true);
  document.addEventListener('contextmenu', e => { const t = target(e); if (!t) return; e.preventDefault(); if (!fired) openEdit(evById(t.dataset.ev)); fired = false; });
}
