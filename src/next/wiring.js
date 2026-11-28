/* ── V7 phase 1 wiring: Home, mini sheets, snackbar, press feedback ── */
(() => {
  const home = $('#m2home');
  if (home) { home.addEventListener('click', onHome); cardSwipe(home); }
  $('#snack')?.addEventListener('click', onSnack);
  const sh = $('#m2sheet');
  if (sh) {
    sh.addEventListener('click', e => { if (e.target.closest('[data-m2close]')) return closeMini(); onMini(e); });
    // swipe down from the handle or title to close
    const panel = sh.querySelector('.m2panel'); let y0 = null, dy = 0;
    panel.addEventListener('touchstart', e => { y0 = e.target.closest('[data-m2grab]') ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    panel.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transition = 'none'; panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
    panel.addEventListener('touchend', () => { if (y0 == null) return; panel.style.transition = ''; panel.style.transform = ''; if (dy > 80) closeMini(); y0 = null; });
  }
  // Press feedback + a tiny haptic on the big targets (CSS does the scale; this adds a class that survives fast taps)
  const PRESS = '.m2primary,.m2second,.m2tile,.m2big,.m2pill,.m2chip,.m2ins,.bbar button,#qlog .preset';
  document.addEventListener('pointerdown', e => { const b = e.target.closest(PRESS); if (!b) return; b.classList.add('pressed'); }, { passive: true });
  const up = () => $$('.pressed').forEach(b => b.classList.remove('pressed'));
  document.addEventListener('pointerup', up, { passive: true }); document.addEventListener('pointercancel', up, { passive: true });
  // Long-press ＋ in the bottom bar: Quick Log opens straight to the last thing logged on this device (V7 spec §2)
  let lp = null;
  $('#bbar')?.addEventListener('pointerdown', e => { if (!e.target.closest('[data-ql]')) return; lp = setTimeout(() => { lp = 'fired'; repeatLast(); }, 550); });
  $('#bbar')?.addEventListener('pointerup', () => { if (lp && lp !== 'fired') clearTimeout(lp); });
  $('#bbar')?.addEventListener('click', e => { if (lp === 'fired' && e.target.closest('[data-ql]')) { e.stopImmediatePropagation(); lp = null; } }, true);
})();
/** The last entry this device logged, again, as a form ready to save. */
function repeatLast(){
  if (!canLog()) return; haptic(20);
  const mine = DATA.events.filter(e => e.raw?.by ? e.raw.by === ME.name : true).filter(e => e.loggedAt != null || e.local).sort((a, b) => (a.loggedAt ?? a.s) - (b.loggedAt ?? b.s)).pop();
  if (!mine) return openQuickLog();
  openQuickLogWith({ 'Category': mine.cat, 'Milk (oz)': mine.milk ?? '', 'Water (ml)': mine.water ?? '', 'Tags': mine.tags.join(', '), 'Outcome / Rating': mine.outcome || '' });
}
