/* v1.25 — Phones: swipe left / right on the page to move between sections, in menu order (Today → Timeline → … → Data).
   The page follows the finger and slides; a label at the top names the section and where it sits (e.g. “😴 Sleep · 5 / 9”).
   Settings → General → Display can turn it off (S.swipeNav, kept on each device). */
(function navSwipe(){
  const main = document.querySelector('main'); if (!main) return;
  let pill = null;
  const navPill = (t, i, n, hint) => {
    if (!pill) { pill = document.createElement('div'); pill.id = 'navPill'; pill.setAttribute('data-noi18n', ''); document.body.appendChild(pill); }
    pill.innerHTML = `${hint === 'prev' ? '‹ ' : ''}<span>${t.ic}</span> <b>${esc(t.n)}</b>${hint === 'next' ? ' ›' : ''}<span class="np-dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>`;
    pill.classList.add('on'); clearTimeout(navPill.t);
    if (!hint) navPill.t = setTimeout(() => pill.classList.remove('on'), 1300);
  };
  const hidePill = () => { if (pill) pill.classList.remove('on'); };
  const busy = () => $('.modal.on, .sheet.on, .drawer.on, .filterbar.open') || TOUR || document.body.classList.contains('printing');
  let x0 = 0, y0 = 0, t0 = 0, dx = 0, mode = null, anim = false, scroller = null;
  main.addEventListener('touchstart', e => {
    mode = null; scroller = null;
    if (S.swipeNav === false || innerWidth > 720 || e.touches.length !== 1 || anim || busy()) { mode = 'no'; return; }
    const x = e.touches[0].clientX; if (x < 18 || x > innerWidth - 18) { mode = 'no'; return; }   // leave the phone’s own edge-back gesture alone
    let el = e.target;   // sideways-scrolling things (the timeline grid, wide tables) keep the swipe until they reach their edge
    while (el && el !== main) { if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) { scroller = el; break; } el = el.parentElement; }
    if (e.target.closest('input, select, textarea, [data-noswipe]')) mode = 'no';
    x0 = x; y0 = e.touches[0].clientY; t0 = Date.now(); dx = 0;
  }, { passive: true });
  main.addEventListener('touchmove', e => {
    if (mode === 'no' || mode === 'y') return;
    const ddx = e.touches[0].clientX - x0, ddy = e.touches[0].clientY - y0;
    if (!mode) { if (Math.abs(ddx) < 12 && Math.abs(ddy) < 12) return; mode = Math.abs(ddx) > Math.abs(ddy) * 1.5 ? 'x' : 'y'; if (mode === 'y') return;
      if (scroller) { const atStart = scroller.scrollLeft <= 1, atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
        if ((ddx > 0 && !atStart) || (ddx < 0 && !atEnd)) { mode = 'no'; return; } } }
    e.preventDefault(); dx = ddx;
    const tabs = NAV(), i = tabs.findIndex(t => t.v === VIEW), j = i + (dx < 0 ? 1 : -1), edge = j < 0 || j >= tabs.length;
    const v = $('.view.on'); if (v) { v.style.transition = 'none'; v.style.transform = `translateX(${edge ? dx * .2 : dx}px)`; v.style.opacity = String(1 - Math.min(.45, Math.abs(dx) / 700)); }
    if (!edge && Math.abs(dx) > 40) navPill(tabs[j], j, tabs.length, dx < 0 ? 'next' : 'prev'); else hidePill();
  }, { passive: false });
  const end = () => {
    if (mode !== 'x') { mode = null; return; } mode = null;
    const tabs = NAV(), i = tabs.findIndex(t => t.v === VIEW), dir = dx < 0 ? 1 : -1, j = i + dir, v = $('.view.on');
    const fast = Math.abs(dx) > 30 && Math.abs(dx) / Math.max(1, Date.now() - t0) > .5;
    const back = () => { if (!v) return; v.style.transition = 'transform .2s ease, opacity .2s ease'; v.style.transform = ''; v.style.opacity = ''; setTimeout(() => { v.style.transition = ''; }, 220); };
    if (!(Math.abs(dx) > 90 || fast)) { back(); hidePill(); return; }
    if (j < 0 || j >= tabs.length) { back(); navPill(tabs[i], i, tabs.length); return; }   // first / last section: spring back and show where you are
    anim = true; const w = innerWidth;
    const a = v.animate([{ transform: `translateX(${v.style.transform.match(/-?[\d.]+/)?.[0] || 0}px)`, opacity: v.style.opacity || 1 }, { transform: `translateX(${-dir * w}px)`, opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = () => {
      v.style.transition = ''; v.style.transform = ''; v.style.opacity = ''; a.cancel();
      setView(tabs[j].v);
      const nv = $('.view.on'); nv?.animate([{ transform: `translateX(${dir * w * .5}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      navPill(tabs[j], j, tabs.length); setTimeout(() => { anim = false; }, 250);
    };
  };
  main.addEventListener('touchend', end); main.addEventListener('touchcancel', end);
})();
