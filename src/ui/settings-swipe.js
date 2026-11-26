
/* v1.28.1 — Phones: swipe left / right in Settings to move between its pages (Child & features → … → About), in tab
   order. The page slides, and the tab row scrolls the new page's tab into view and flashes it. Sideways-scrolling
   blocks (copied code) keep their swipe until their edge; the field being typed in, sliders and text boxes never trigger it. Same switch as the
   section swipe (Settings → General → Display). */
(function settingsSwipe(){
  const pane = document.getElementById('setPane'); if (!pane) return;
  const tabs = () => [...document.querySelectorAll('#setNav button')].filter(b => b.offsetParent !== null);
  let x0 = 0, y0 = 0, t0 = 0, dx = 0, mode = null, anim = false, scroller = null;
  function go(dir, fromDrag){
    const list = tabs(), i = list.findIndex(b => b.dataset.p === setPane), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) {   // first / last page: spring back
      pane.animate([{ transform: `translateX(${fromDrag}px)` }, { transform: `translateX(${-dir * 16}px)` }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' });
      list[i]?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 300 });
      return;
    }
    anim = true; const w = pane.offsetWidth || innerWidth;
    const a = pane.animate([{ transform: `translateX(${fromDrag}px)`, opacity: 1 }, { transform: `translateX(${-dir * w}px)`, opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = () => {
      setPane = list[j].dataset.p; renderSettings(); pane.scrollTop = 0; a.cancel();
      pane.animate([{ transform: `translateX(${dir * w * .5}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
      const tab = $(`#setNav button[data-p="${setPane}"]`);
      tab?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      tab?.animate([{ boxShadow: '0 0 0 0 var(--accent)' }, { boxShadow: '0 0 0 3px var(--accent)' }, { boxShadow: '0 0 0 0 var(--accent)' }], { duration: 600 });
      setTimeout(() => { anim = false; }, 240);
    };
  }
  pane.addEventListener('touchstart', e => {
    mode = null; scroller = null;
    // most pages are form fields, so a swipe may start on one; not on the field you're typing in, a slider or a text box
    if (S.swipeNav === false || e.touches.length !== 1 || anim || e.target === document.activeElement || e.target.closest('input[type=range], textarea, [data-noswipe]')) { mode = 'no'; return; }
    const x = e.touches[0].clientX; if (x < 18 || x > innerWidth - 18) { mode = 'no'; return; }   // the phone's own back gesture
    let el = e.target;
    while (el && el !== pane) { if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) { scroller = el; break; } el = el.parentElement; }
    x0 = x; y0 = e.touches[0].clientY; t0 = Date.now(); dx = 0;
  }, { passive: true });
  pane.addEventListener('touchmove', e => {
    if (mode === 'no' || mode === 'y') return;
    const ddx = e.touches[0].clientX - x0, ddy = e.touches[0].clientY - y0;
    if (!mode) {
      if (Math.abs(ddx) < 12 && Math.abs(ddy) < 12) return;
      mode = Math.abs(ddx) > Math.abs(ddy) * 1.5 ? 'x' : 'y'; if (mode === 'y') return;
      if (scroller) { const atStart = scroller.scrollLeft <= 1, atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
        if ((ddx > 0 && !atStart) || (ddx < 0 && !atEnd)) { mode = 'no'; return; } }
    }
    e.preventDefault(); dx = ddx;
    const list = tabs(), i = list.findIndex(b => b.dataset.p === setPane), edge = (dx > 0 && i <= 0) || (dx < 0 && i >= list.length - 1);
    pane.style.transition = 'none'; pane.style.transform = `translateX(${edge ? dx * .2 : dx}px)`; pane.style.opacity = String(1 - Math.min(.45, Math.abs(dx) / 700));
  }, { passive: false });
  const end = () => {
    if (mode !== 'x') { mode = null; return; } mode = null;
    const fast = Math.abs(dx) > 30 && Math.abs(dx) / Math.max(1, Date.now() - t0) > .5, from = dx;
    pane.style.transition = ''; pane.style.transform = ''; pane.style.opacity = '';
    if (Math.abs(dx) > 80 || fast) go(dx < 0 ? 1 : -1, from);
    else pane.animate([{ transform: `translateX(${from}px)` }, { transform: 'translateX(0)' }], { duration: 200, easing: 'ease-out' });
  };
  pane.addEventListener('touchend', end); pane.addEventListener('touchcancel', end);
})();
