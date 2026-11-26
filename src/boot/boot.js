/* ════════════════════════════════════════════════════════════════════════════
   23. BOOT + live clock (Today banner, in-progress events, reminders)
   ════════════════════════════════════════════════════════════════════════════ */
(function boot(){
  applyTheme(); wire(); wireOnboarding(); fixKidIds(); translateStatic(); i18nWatch();
  if (S.profile.onboarded && ensureLibTemplates()) lsSet(LS_SETTINGS, S);   // v1.26: midday / afternoon visit and appointment templates, once $('#btnLang').textContent = S.lang === 'fr' ? 'EN' : 'FR';
  // Installable app: only when hosted (GitHub Pages etc.) next to sw.js; silently skipped when opened as a file.
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  const cache = S.cacheData ? lsGet(LS_CACHE, null) : null;
  if (cache && (cache.records?.length || cache.source === 'local')) ingest({ headers: cache.headers, records: cache.records, planned: cache.planned || null, appts: cache.appts || null }, cache.source, cache.label, { synced: cache.synced, viewer: cache.viewer || null });
  else loadDemo();
  if (S.endpoint) syncLive({ quiet:true });
  setupAutoRefresh();
  if (!S.profile.onboarded) setTimeout(openWizard, 300);   // first run: set up the profile before anything else
  else setTimeout(maybeShowWhatsNew, 700);                   // first open after an update
  let lastDay = todayIdx();
  setInterval(() => {
    const dayChanged = todayIdx() !== lastDay; lastDay = todayIdx();
    if (dayChanged && DATA.source === 'demo') loadDemo();
    else if (dayChanged || DATA.events.some(e => e.open)) { analyze(); if (VIEW === 'timeline' || VIEW === 'today' || dayChanged) renderView(); }
    else if (VIEW === 'today') renderTodayPlan();
    renderToday(); checkReminders(); checkCheckinReminder(); checkMedReminders();
  }, 30000);
  checkReminders();
})();
