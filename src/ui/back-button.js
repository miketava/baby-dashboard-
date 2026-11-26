/* ── Android / browser Back button ──
   Every overlay that opens (report, settings and other dialogs, Quick Log, More, the day panel, the phone filter panel, the tour)
   and every change of section adds a history entry, so Back closes the top overlay first, then returns to the previous
   section, and only leaves the app from the starting screen. Closing an overlay with its own ✕ removes its entry again. */
let NAV_IGNORE = 0, NAV_FROM_POP = false;
function navPushView(v){ if (NAV_FROM_POP) return; if (history.state?.o) history.replaceState({ v }, ''); else history.pushState({ v }, ''); }   // leaving via the More sheet replaces its entry
(function backButton(){
  if (!history.pushState) return;
  history.replaceState({ v: VIEW, root:true }, '');
  const OV = [
    ['#tour',      el => el.classList.contains('on'),                          () => endTour()],
    ['#report',    el => el.classList.contains('on'),                          () => closeReport()],
    ...$$('.modal').map(m => ['#' + m.id, el => el.classList.contains('on'),    () => { const c = $('#' + m.id + ' [data-close]'); if (c) c.click(); else { m.classList.remove('on'); closeModals(); } }]),
    ['#qlog',      el => el.classList.contains('on'),                          () => closeQuickLog()],
    ['#moreSheet', el => el.classList.contains('on'),                          () => closeMore()],
    ['#drawer',    el => el.classList.contains('on'),                          () => closeDrawer()],
    ['#filterbar', el => el.classList.contains('open'),   () => $('#filterbar').classList.remove('open')],
  ].filter(([sel]) => $(sel));
  const isOpen = new Map(OV.map(([sel, test]) => [sel, test($(sel))]));
  const stuck = () => $('#mWizard')?.classList.contains('on') && !S.profile?.onboarded;   // first-run setup can't be backed out of
  new MutationObserver(() => {
    OV.forEach(([sel, test]) => { const now = test($(sel)), was = isOpen.get(sel); if (now === was) return; isOpen.set(sel, now);
      if (now) history.pushState({ v: VIEW, o: sel }, '');
      else if (!NAV_FROM_POP && history.state?.o) { NAV_IGNORE++; history.back(); } });
  }).observe(document.body, { subtree:true, attributes:true, attributeFilter:['class'] });
  addEventListener('popstate', e => {
    if (NAV_IGNORE) { NAV_IGNORE--; return; }
    const top = OV.find(([sel, test]) => test($(sel)));
    NAV_FROM_POP = true;
    try {
      if (top) { if (top[0] === '#mWizard' && stuck()) { history.pushState({ v: VIEW, o: '#mWizard' }, ''); return; } top[2](); return; }
      const v = e.state?.v; if (v && v !== VIEW) setView(v, { hist:false });
    } finally { setTimeout(() => { NAV_FROM_POP = false; }, 0); }
  });
})();

