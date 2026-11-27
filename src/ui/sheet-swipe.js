/* v1.24.3 — Phones: swipe a bottom sheet (Quick Log, More) down to close it, like its ✕.
   From the handle or title bar it always works; inside the list only when the list is already at the top. */
(function sheetSwipe(){
  const CLOSE = { qlog: '#qlClose', moreSheet: '#moreClose' };
  document.querySelectorAll('.sheet').forEach(sh => {
    const closeBtn = () => $(CLOSE[sh.id] || 'x-none');
    let y0 = 0, x0 = 0, t0 = 0, dy = 0, drag = false, ok = false;
    sh.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || !closeBtn()) { ok = false; return; }
      const t = e.target, sc = t.closest('.body, .more-list');
      ok = !t.closest('textarea, select, input[type=range]') && (!sc || sc.scrollTop <= 0);
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = Date.now(); dy = 0; drag = false;
    }, { passive: true });
    sh.addEventListener('touchmove', e => {
      if (!ok) return;
      const y = e.touches[0].clientY, dx = Math.abs(e.touches[0].clientX - x0); dy = y - y0;
      if (!drag) {
        if (dy < -4 || dx > Math.abs(dy) + 4) { ok = false; return; }   // scrolling up or sideways: leave it alone
        if (dy > 10) { drag = true; sh.style.transition = 'none'; } else return;
      }
      e.preventDefault();
      sh.style.transform = `translate(${getComputedStyle(sh).getPropertyValue('--sx').trim() || '-50%'}, ${Math.max(0, dy - 10)}px)`;   // full-screen Quick Log on phones isn't centred with -50%
    }, { passive: false });
    const end = () => {
      if (!drag) return; drag = false; ok = false;
      const v = dy / Math.max(1, Date.now() - t0), far = dy > Math.max(110, sh.offsetHeight * .25);
      sh.style.transition = ''; sh.style.transform = '';
      if (far || (dy > 50 && v > .6)) closeBtn()?.click();
    };
    sh.addEventListener('touchend', end); sh.addEventListener('touchcancel', end);
  });
})();

