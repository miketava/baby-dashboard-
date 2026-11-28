/* ════════════════════════════════════════════════════════════════════════════
   22. EVENT WIRING
   ════════════════════════════════════════════════════════════════════════════ */
function wire(){
  // Header
  $('#btnRefresh').onclick = () => { if (typeof achFiddle === 'function') achFiddle(); syncLive(); };
  $('#btnCsv').onclick = () => $('#csvInput').click();
  $('#csvInput').onchange = e => { loadCSVFile(e.target.files[0]); e.target.value = ''; };
  $('#btnTheme').onclick = () => { S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme(); renderAll(); };
  $('#btnSettings').onclick = () => openSettings();
  $('#btnReport').onclick = () => openReport();
  $('#btnReport2').onclick = () => openReport('period');
  $('#queuePill').onclick = () => openSettings('source');
  $('#btnLang').onclick = () => setLang(S.lang === 'fr' ? 'en' : 'fr');
  $('#scopePill').onclick = () => viewOnly() ? toast($('#scopePill').title) : openSettings('sharing');
  $('#healthPill').onclick = () => { renderHealthModal(); openModal('mHealth'); };
  $('#scriptPill').onclick = () => openSettings('source');
  $('#scorePill').onclick = () => openDrawer(todayIdx());
  $('#healthBody').addEventListener('click', e => { const b = e.target.closest('[data-dupdel]'); if (b) cleanDuplicates(b.dataset.dupdel); const m = e.target.closest('[data-splitmerge]'); if (m) mergeSplitNights(m.dataset.splitmerge); });
  document.addEventListener('click', e => {   // v1.45.1: “go” buttons (What's new, tips) and the music tip
    const g = e.target.closest?.('[data-gopane]'); if (g) { if ($('#mNew')?.classList.contains('on')) seenWhatsNew(); closeModals(); openSettings(g.dataset.gopane); }
    const mt = e.target.closest?.('[data-musictip]'); if (mt) { if (mt.dataset.musictip === 'later') S.musicTipLater = nowAbs(); else S.musicTipOff = true; saveSettings(); renderAll(); }
  });
  document.addEventListener('click', e => { const u = e.target.closest?.('.ucal[data-up]'); if (u) showUpcoming(+u.dataset.up, u); if (e.target.closest?.('[data-uptoggle]')) { S.upOpen = !S.upOpen; saveSettings(); renderTodayPlan(); } });   // v1.40 strip · v1.43 box
  document.addEventListener('click', e => {   // v1.33: entries logged twice
    const g = e.target.closest?.('[data-dblmerge],[data-dblkeep],[data-dblsee]'); if (!g) return;
    if (g.dataset.dblmerge != null) mergeDouble(+g.dataset.dblmerge); else if (g.dataset.dblkeep != null) keepBothDouble(+g.dataset.dblkeep); else { renderHealthModal(); openModal('mHealth'); }
  });
  // Today banner
  $('#todayCollapse').onclick = () => { UI.todayCollapsed = !UI.todayCollapsed; saveUI(); renderToday(); };
  $('#todayTpl').onchange = e => { S.todayTpl = { date: isoOf(todayIdx()), id: e.target.value }; saveSettings(); analyze(); renderAll(); };
  document.addEventListener('change', e => { if (e.target.matches?.('input[data-set="reminders.enabled"]')) toggleReminders(e.target.checked); });   // v1.44: the 🔔 moved from the Today header to Settings → Reminders
  // Filter bar
  $('#filterToggle').onclick = () => $('#filterbar').classList.toggle('open');
  $('#catToggle').onclick = () => { UI.catsOpen = !UI.catsOpen; saveUI(); renderFilterBar(); };
  $('#tlOpts').onclick = () => $('#tlOpts').closest('.card').classList.toggle('opts');
  $('#filterDone').onclick = () => $('#filterbar').classList.remove('open');
  $('#filterReset').onclick = () => { F = Object.assign({ ...DEFAULT_FILTER }); saveFilter(); renderAll(); toast(L('Filters reset', 'Filtres réinitialisés')); };
  document.addEventListener('click', e => { const fb = $('#filterbar'); if (fb.classList.contains('open') && !fb.contains(e.target) && !e.target.closest?.('.fbtn')) fb.classList.remove('open'); }, true);
  $('#rangeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; F.range = b.dataset.r; ensureCustomRange(); saveFilter(); renderAll(); };
  $('#fFrom').onchange = e => { const v = parseDate(e.target.value); if (v != null) { F.from = v; saveFilter(); renderAll(); } };
  $('#fTo').onchange = e => { const v = parseDate(e.target.value); if (v != null) { F.to = v; saveFilter(); renderAll(); } };
  $('#fDayType').onchange = e => { F.dayType = e.target.value; saveFilter(); renderAll(); };
  $('#fSearch').oninput = debounce(e => { F.q = e.target.value.trim(); saveFilter(); renderAll(); }, 180);
  $('#catChips').onclick = e => {
    const c = e.target.closest('.chip'); if (!c) return; const hid = hiddenSet();
    if (c.dataset.grp) { const present = new Set(DATA.events.map(x => x.cat)); const cs = [...CATS.values()].filter(x => x.group === c.dataset.grp && present.has(x.name)).map(x => x.name); const allOff = cs.every(n => hid.has(n)); cs.forEach(n => allOff ? hid.delete(n) : hid.add(n)); }
    else { const n = c.dataset.cat; hid.has(n) ? hid.delete(n) : hid.add(n); }
    F.hidden = [...hid]; saveFilter(); renderAll();
  };
  $('#presetSel').onchange = e => { const v = e.target.value; e.target.value = ''; if (v === '__save') savePreset(); else if (v !== '') applyPreset(+v); };
  // Tabs
  $('#tabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; if (b.dataset.more != null) openMore(); else setView(b.dataset.v); };
  $('#bbar').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.ql != null) openQuickLog(); else if (b.dataset.more != null) openMore(); else if (b.dataset.v) setView(b.dataset.v); };
  $('#moreList').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v) return setView(b.dataset.v); closeMore();
    const a = b.dataset.act; if (a === 'report') $('#btnReport').click(); else if (a === 'settings') $('#btnSettings').click(); else if (a === 'tour') $('#btnHelp').click(); else if (a === 'lang') $('#btnLang').click(); else if (a === 'theme') { $('#btnTheme').click(); renderNav(); } else if (a === 'csv') $('#btnCsv').click(); };
  $('#moreClose').onclick = closeMore;
  $('#verPill').onclick = () => openSettings('about');
  renderVerPill();
  $('#planList').onclick = e => { if (e.target.closest('#planPast')) { UI.planPast = !UI.planPast; saveUI(); renderTodayPlan(); } };
  $('#todayEv').onclick = e => { if (e.target.closest('#todayEvMore')) { UI.todayEvAll = !UI.todayEvAll; saveUI(); renderTodayEntries(); return; }
    const li = e.target.closest('li[data-ev]'); if (li && !e.target.closest('[data-edit]')) { const ev = evById(li.dataset.ev); if (ev) openDrawer(ev.d, ev.id); } };
  $('#btnCopyDay').onclick = () => copyDayLog();
  document.addEventListener('click', e => { const g = e.target.closest?.('[data-medgive]'); if (g) { e.stopPropagation(); giveMed(+g.dataset.medgive); } }, true);
  $('#btnPastMeasure').onclick = () => logPastMeasurement();
  $('#vaxBox').onclick = e => { const b = e.target.closest('[data-vaxlog]'); if (b) logVaccineFromSchedule(b.dataset.vaxlog); };
  document.addEventListener('click', e => { const g = e.target.closest?.('[data-goview]'); if (g) setView(g.dataset.goview); });
  document.addEventListener('click', e => { const g = e.target.closest?.('[data-act=trendAck],[data-act=trendUndo]'); if (g) ackTrend(g.dataset.k, g.dataset.act === 'trendUndo'); });   // v1.31: acknowledge a trend
  $('#btnTodayDay').onclick = () => { if (DAYS.has(todayIdx())) openDrawer(todayIdx()); };
  // Timeline toolbar
  $('#orientSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.orientation = b.dataset.o; saveSettings(); renderTimeline(); };
  $('#labSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.tlLabels = b.dataset.l; saveSettings(); renderTimeline(); };
  $('#sortSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.sortDays = b.dataset.s; saveSettings(); renderTimeline(); };
  $('#ovToggle').onchange = e => { S.overlayOn = e.target.checked; saveSettings(); renderTimeline(); renderToday(); };
  $('#ovTemplate').onchange = e => { S.overlayTpl = e.target.value; saveSettings(); analyze(); renderAll(); };
  $('#careToggle').onchange = e => { S.showCare = e.target.checked; saveSettings(); renderTimeline(); renderToday(); };
  $('#scatterSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.scatterX = b.dataset.x; saveSettings(); renderSleep(); };
  // Timeline + Today hover/click (badges, blocks, rows)
  for (const sel of ['#timeline', '#todayBody', '#todayTl']) {
    const el = $(sel);
    el.addEventListener('mousemove', e => { const x = e.target.closest('[data-ev]'); if (x && DATA.events[+x.dataset.ev]) showTip(DATA.events[+x.dataset.ev], e.clientX, e.clientY); else hideTip(); });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('click', e => { const ev = e.target.closest('[data-ev]'), row = e.target.closest('[data-day]'); if (row) { hideTip(); openDrawer(+row.dataset.day, ev ? +ev.dataset.ev : null); } });
  }
  // Nutrition
  $('#foodSearch').oninput = debounce(e => { UI.foodQ = e.target.value.trim(); saveUI(); renderNutrition(); }, 200);
  $('#newOnly').onchange = e => { UI.newOnly = e.target.checked; saveUI(); renderNutrition(); };
  $('#foodBoard').onclick = e => { const tr = e.target.closest('tr[data-food]'); if (tr) { F.q = tr.dataset.food; saveFilter(); $('#fSearch').value = F.q; renderAll(); toast('Filtered to “' + F.q + '” — clear the search box to reset'); } };
  // Milestones & health
  $('#growthSeg').onclick = e => { const b = e.target.closest('button'); if (b) { UI.growthMk = b.dataset.g; saveUI(); renderGrowth(); } };
  $('#teethBox').addEventListener('click', e => { const g = e.target.closest('[data-tooth]'); if (!g) return; e.stopPropagation();
    const ev = teethState().map.get(g.dataset.tooth);
    if (ev) { if (DAYS.has(ev.d)) openDrawer(ev.d, ev.id); else toast(`${TEETH.find(t => t.id === g.dataset.tooth).label}: ${fmtDay(ev.d, { month:'short', day:'numeric', year:'numeric' })}`); return; }
    if (!mod('quicklog')) return toast('Turn on Quick Log in Settings → Child & features to log from here');
    const t = TEETH.find(x => x.id === g.dataset.tooth); openQuickLogWith({ 'Category':'Tooth', 'Tags': t.id, 'Notes': t.label }); });
  $('#msTags').onclick = e => { const c = e.target.closest('[data-mstag]'); if (!c) return; UI.msTag = c.dataset.mstag; saveUI(); renderHealth(); };
  $('#hlSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; UI.hlFilter = b.dataset.h; saveUI(); renderHealth(); };
  $('#findCopy').onclick = async () => toast(await copyText(findings(visibleDays()).map(f => '• ' + f).join('\n')) ? 'Findings copied' : 'Copy failed');
  $('#msCopy').onclick = async () => toast(await copyText(milestonesText()) ? 'Milestones copied' : 'Copy failed — select the text manually', false);
  $('#msPrint').onclick = () => { document.body.classList.add('print-ms'); window.print(); };
  addEventListener('afterprint', () => document.body.classList.remove('print-ms', 'printing'));
  // Drill-downs (feeds, tables) → drawer
  for (const sel of ['#v-health', '#newFoods', '#calBox', '#visitBox']) $(sel).addEventListener('click', e => { if (e.target.closest('button,.chip')) return; const li = e.target.closest('[data-day]'); if (li) openDrawer(+li.dataset.day, li.dataset.ev != null ? +li.dataset.ev : null); });
  // Drawer
  $('#drClose').onclick = closeDrawer; $('#drPrev').onclick = () => goDrawerDay(-1); $('#drNext').onclick = () => goDrawerDay(1);
  $('#scrim').onclick = () => { closeModals(); closeDrawer(); closeQuickLog(); closeMore(); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#report.on')) closeReport(); else if ($('.modal.on')) closeModals(); else if ($('.sheet.on')) closeQuickLog(); else closeDrawer(); }
    if (drawerDay != null && !$('.modal.on') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) $(e.key === 'ArrowLeft' ? '#drPrev' : '#drNext').click();
  });
  $$('[data-close]').forEach(b => b.onclick = closeModals);
  // Data tables: sort + click
  $('#v-data').addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (th) { const st = th.dataset.tbl === 'roll' ? rollSort : logSort; const k = th.dataset.sort; st.dir = st.k === k ? -st.dir : (k === 'D' || k === 's' ? -1 : 1); st.k = k; renderData(); return; }
    const tr = e.target.closest('tr[data-day]'); if (tr) openDrawer(+tr.dataset.day, tr.dataset.ev != null ? +tr.dataset.ev : null);
  });
  $('#btnExport').onclick = exportCSV;
  // Quick log
  $('#fab').onclick = openQuickLog; $('#qlClose').onclick = closeQuickLog;
  $('#qlBody').addEventListener('click', e => { const tg = e.target.closest('[data-tag]'); if (tg) { toggleTagChip(tg); return; }
    const ng = e.target.closest('[data-nudge]'); if (ng) {   // nudge the field's time by ±1/5/10 min; taps add up, crossing midnight moves the date
      const fld = ng.closest('[data-for]').dataset.for, i = $(`#qlForm [name="${fld}"]`), D = $('#qlForm [name=Date]'); if (!i) return;
      let t = (parseTime(i.value) ?? nowMin()) + +ng.dataset.nudge, d = parseDate(D?.value) ?? todayIdx();
      if (t < 0) { t += DAY; d--; } else if (t >= DAY) { t -= DAY; d++; }
      i.value = fmtTime(t); if (D && fld === 'Start Time') D.value = isoOf(d); ng.closest('[data-for]').querySelectorAll('[data-ago]').forEach(b => b.classList.add('off'));
      i.dispatchEvent(new Event('change', { bubbles:true })); return; }
    const af = e.target.closest('[data-after]'); if (af) {   // asleep = going up + N min
      const box = af.closest('[data-for]'), from = parseTime(box.dataset.from || $('#qlForm [name="Start Time"]')?.value), i = $('#qlForm [name="Asleep At"]');
      if (from == null || !i) return toast(L('Set the start time first', 'Indiquez d’abord l’heure de début'), true);
      i.value = fmtTime((from + +af.dataset.after) % DAY); box.querySelectorAll('[data-after]').forEach(b => b.classList.toggle('off', b !== af)); return; }
    const ago = e.target.closest('[data-ago]'); if (ago) { const box = ago.closest('[data-for]'), fld = box.dataset.for, i = $(`#qlForm [name="${fld}"]`), D = $('#qlForm [name=Date]'); let t = nowMin() - +ago.dataset.ago, d = todayIdx(); if (t < 0) { t += DAY; d--; }
      i.value = fmtTime(t); if (D && fld === 'Start Time') D.value = isoOf(d); box.querySelectorAll('[data-ago]').forEach(b => b.classList.toggle('off', b !== ago)); i.dispatchEvent(new Event('change', { bubbles:true })); return; }
    const nb = e.target.closest('[data-now]'); if (nb) { const i = $(`#qlForm [name="${nb.dataset.now}"]`), D = $('#qlForm [name=Date]');
      i.value = fmtTime(nowMin()); if (D && nb.dataset.now === 'Start Time') D.value = isoOf(todayIdx());
      $(`#qlForm .tchips[data-for="${nb.dataset.now}"]`)?.querySelectorAll('[data-ago]').forEach(b => b.classList.toggle('off', b.dataset.ago !== '0'));
      i.dispatchEvent(new Event('change', { bubbles:true })); return; }
    const mp = e.target.closest('[data-medpick]'); if (mp) { pickMedInForm(+mp.dataset.medpick); return; }
    const sv = e.target.closest('[data-set-v]'); if (sv) { const grp = sv.closest('[data-for]'), fld = grp.dataset.for, i = $(`#qlForm [name="${fld}"]`); i.value = sv.dataset.setV; grp.querySelectorAll('[data-set-v]').forEach(b => b.classList.toggle('off', b !== sv));
      if (fld === 'Category') {   // meal type: an earlier meal logged later takes its planned time (unless the start time was changed by hand)
        const st = $('#qlForm [name="Start Time"]'), pl = plannedMealStart(sv.dataset.setV);
        if (st && QL?.op === 'append' && st.value === (QL.autoStart || '') && pl) { const pm = parseTime(pl), now = nowMin(); const v = sv.dataset.setV === mealByTime(now) || pm == null || pm >= now ? (QL.nowStart || QL.autoStart) : pl; st.value = v; QL.autoStart = v; }
        i.dispatchEvent(new Event('change', { bubbles:true }));   // re-render for the new category (title, outcome choices)
      }
      return; }
    const p = e.target.closest('[data-p]'); if (p) return pickPreset(+p.dataset.p); if (e.target.id === 'qlBack') { qlStash(); QL = null; renderQuickLog(); }
    { const dr = e.target.closest('[data-qldraft]'); if (dr) return qlDraftAct(dr.dataset.qldraft); } if (e.target.closest('#qlDelete')) deleteEdited(); });
  $('#qlBody').addEventListener('click', e => { const k = e.target.closest('[data-qlkid]'); if (k) onQlKid(+k.dataset.qlkid);
    const w = e.target.closest('[data-qlwho]'); if (!w) return;
    if (w.dataset.qlwho === 'edit') { QL_WHO_EDIT = true; renderQuickLog(); }
    else if (w.dataset.qlwho === 'save') { const n = $('#qlMeName').value.trim(); if (!n) { $('#qlMeName').focus(); return; } ME = { name: n }; saveMe(); QL_WHO_EDIT = false; renderQuickLog(); toast(L(`Entries from this device are now signed “${n}”`, `Les entrées de cet appareil sont maintenant signées « ${n} »`)); }
    else if (w.dataset.qlwho === 'later') { QL_WHO_EDIT = false; sessionStorage.setItem('bld.whoLater', '1'); renderQuickLog(); } });
  $('#kidSeg').addEventListener('click', onKidSeg);
  wireEditGestures();
  $('#ciBody').addEventListener('click', onCheckinClick);
  $('#ciBody').addEventListener('change', e => { if (e.target.id === 'ciDate') { const d = parseDate(e.target.value); if (d != null && d <= todayIdx()) { $$('#ciBody [data-cinote]').forEach(t => CI.notes[t.dataset.cinote] = t.value); openCheckin(d); } } });
  document.addEventListener('click', e => { if (e.target.closest('[data-ciopen]')) { e.preventDefault(); QLKIDS = null; openCheckin(); } const d = e.target.closest('[data-ciday]'); if (d) { QLKIDS = null; openCheckin(+d.dataset.ciday); } });
  $('#v-contact').addEventListener('change', e => { if (e.target.id === 'ctRepH') { S.contactRules = { ...(S.contactRules || {}), repeatHours: Math.max(1, +e.target.value || 24) }; saveSettings(); renderContact(); return; }
    if (e.target.id === 'ctPer' || e.target.id === 'ctPhotos') { S.contactRules = { ...(S.contactRules || {}), perWeek: Math.max(0, +$('#ctPer').value || 0), photos: $('#ctPhotos').checked }; saveSettings(); renderContact(); } });
  $('#v-checkins').addEventListener('change', e => { if (e.target.id === 'ciAt') { S.checkinAt = e.target.value || '19:30'; saveSettings(); renderToday(); } });
  $('#mNew').addEventListener('click', e => {
    const a = e.target.closest('[data-act-new],[data-seen]'); if (!a) return;
    seenWhatsNew(); closeModals();
    if (a.dataset.actNew === 'all') openSettings('about');
  });
  // “All” timeline: clicking a child's row shows that child's day
  $('#timeline').addEventListener('click', e => { const r = e.target.closest('[data-kidrow]'); if (r && +r.dataset.kidrow !== kidIdx()) { useKid(+r.dataset.kidrow, { render:false }); filterKidEvents(); analyze(); renderKidSeg(); } }, true);
  $('#qlBody').addEventListener('submit', e => { e.preventDefault(); submitQuickLog(e.target); });
  $('#qlBody').addEventListener('input', e => { if (QL && e.target.closest('#qlForm')) QL.dirty = true; });
  $('#qlBody').addEventListener('click', e => { if (QL && e.target.closest('#qlForm .chip, #qlForm [data-nudge], #qlForm [data-now]')) QL.dirty = true; }, true);
  $('#qlBody').addEventListener('change', e => { if (e.target.name === 'Category' && QL) { const fd = Object.fromEntries(new FormData($('#qlForm')).entries()); if (fd['Milk (oz)'] !== '' && fd['Milk (oz)'] != null) fd['Milk (oz)'] = fromDisp(+fd['Milk (oz)']); QL.row = { ...QL.row, ...fd }; renderQuickLog(); } });
  // Report
  $('#repSeg').onclick = e => { const b = e.target.closest('button'); if (b) { repMode = b.dataset.n; repSnap = null; renderReport(); } };
  $('#repPrev').onclick = () => { repIdx = reportRange().p.idx - 1; renderReport(); };
  $('#repNext').onclick = () => { repIdx = reportRange().p.idx + 1; renderReport(); };
  $('#repComment').oninput = debounce(e => { REPS.comments[reportRange().key] = e.target.value; saveReps(); renderReport(); }, 400);
  for (const [id, k] of [['#repCal','includeCalendar'], ['#repDaily','includeDaily'], ['#repNotes','includeNotes']]) $(id).onchange = e => { S.report[k] = e.target.checked; saveSettings(); renderReport(); };
  $('#repSnaps').onchange = e => { repSnap = e.target.value || null; renderReport(); };
  $('#repBody').addEventListener('click', e => { if (e.target.id === 'repLive') { e.preventDefault(); repSnap = null; renderReport(); } });
  $('#repSave').onclick = () => { if (repSnap) return toast('This is already a saved copy');
    const R = reportRange(); REPS.snaps.push({ id: Date.now().toString(36), label: `${R.title} · ${fmtDayShort(R.a)}–${fmtDayShort(R.b)}`, created: new Date().toISOString(), html: $('#repBody').innerHTML });
    saveReps(); renderReport(); toast('Copy saved on this device'); };
  $('#repHtml').onclick = () => { const R = reportRange(); download(`report_${repSnap ? 'saved' : R.key}_${isoOf(todayIdx())}.html`, reportStandaloneHTML(), 'text/html'); };
  $('#repClose').onclick = closeReport;
  $('#repPrint').onclick = () => { document.body.classList.add('printing'); window.print(); };
  // Settings modal
  $('#setNav').onclick = e => { const b = e.target.closest('button'); if (!b) return; setPane = b.dataset.p; renderSettings(); };
  const pane = $('#setPane');
  pane.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.sw) { setScoreWeight(el.dataset.sw, +el.value, el); return; }
    if (el.dataset.set) {
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'number' || el.dataset.num != null) v = Number(v);
      if (el.dataset.milk != null) v = +fromDisp(v).toFixed(2);
      setPath(el.dataset.set, v);
      const re = /^targets\.|dayBoundary|foodWords|^score\./.test(el.dataset.set);
      if (el.dataset.set === 'theme') { saveSettings(); applyTheme(); renderAll(); return; }
      if (el.dataset.set.startsWith('profile.')) { if (el.dataset.set === 'profile.name' && el.value && /^Baby Routine Dashboard$/.test(S.title)) S.title = el.value + "'s Routine"; saveSettings(); analyze(); renderAll(); if (el.type !== 'text') renderSettings(); return; }
      if (el.dataset.set === 'reminders.enabled') { toggleReminders(v); return; }
      if (el.dataset.set === 'ntfyTopic' || el.dataset.set.startsWith('reminders.')) { saveSettings(); const c = $('#ntfyCode'); if (c) c.textContent = ntfySnippet(); renderToday(); return; }
      if (!['endpoint','token'].includes(el.dataset.set)) settingsChanged(re); else saveSettings();
    }
    if (el.id === 'meName') { ME = { name: $('#meName').value.trim() }; saveMe(); flashSaved(); return; }
    if (el.dataset.md) { const i = +el.closest('[data-mi]').dataset.mi, md = (S.meds || [])[i]; if (md) { md[el.dataset.md] = el.value.trim(); if (!md[el.dataset.md]) delete md[el.dataset.md]; saveSettings(); renderToday(); if (VIEW === 'today') renderTodayPlan(); } return; }
    if (el.dataset.modset) { S.profile.modules = { ...ALL_ON, ...S.profile.modules, [el.dataset.modset]: el.checked }; saveSettings(); analyze(); renderAll(); return; }
    if (el.dataset.catcolor) { S.catColors[el.dataset.catcolor] = el.value; settingsChanged(false); }
    if (el.id === 'tplName') { S.templates[tplIdx].name = el.value || 'Untitled'; settingsChanged(true); }
    if (el.dataset.tt) { const tp = S.templates[tplIdx]; tp.targets ||= {}; if (el.value === '') delete tp.targets[el.dataset.tt]; else tp.targets[el.dataset.tt] = el.dataset.milk != null ? +fromDisp(+el.value).toFixed(2) : +el.value; settingsChanged(true); }
    if (el.dataset.ti) { const i = +el.closest('tr').dataset.i; const it = S.templates[tplIdx].items[i];
      if (el.dataset.ti === 'optional') it.optional = el.checked || undefined; else it[el.dataset.ti] = el.value;
      if (el.dataset.ti === 'end' && !el.value) delete it.end; if (el.dataset.ti === 'beforeBed') { if (+el.value > 0) it.beforeBed = +el.value; else delete it.beforeBed; } if ((el.dataset.ti === 'note' || el.dataset.ti === 'days') && !el.value.trim()) delete it[el.dataset.ti]; settingsChanged(true); }
  });
  pane.addEventListener('change', e => {
    const se = e.target.dataset.shareex; if (se != null) { const set = new Set(S.share.exclude || []); e.target.checked ? set.add(se) : set.delete(se); S.share.exclude = [...set]; saveSettings(); reingest(); renderSettings(); return; }
    const ve = e.target.dataset.vex; if (ve != null) { const set = new Set(VDRAFT.exclude); e.target.checked ? set.add(ve) : set.delete(ve); VDRAFT.exclude = [...set]; return; }
    if (e.target.id === 'langSel') { setLang(e.target.value); return; }
    if (e.target.dataset.kidalias != null) { S.kids[+e.target.dataset.kidalias].aliases = e.target.value.split(',').map(x => x.trim()).filter(Boolean); saveSettings(); reingest(); return; }
    if (e.target.id === 'blankKid') { S.blankKid = +e.target.value; saveSettings(); reingest(); return; }
    if (e.target.id === 'vKid') VDRAFT.kid = +e.target.value;
    if (e.target.id === 'vLabel') VDRAFT.label = e.target.value; if (e.target.id === 'vFrom') VDRAFT.from = e.target.value;
    if (e.target.id === 'tplSel') { tplIdx = +e.target.value; renderSettings(); } if (e.target.id === 'cfgFile') importConfig(e.target.files[0]); if (e.target.dataset.set === 'autoRefreshMin' || e.target.dataset.set === 'theme') { saveSettings(); setupAutoRefresh(); } if (e.target.dataset.ti === 'kind') renderSettings(); });
  pane.addEventListener('click', async e => {
    const a0 = e.target.closest('a[data-pane]'); if (a0) { e.preventDefault(); setPane = a0.dataset.pane; renderSettings(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pane) { setPane = b.dataset.pane; renderSettings(); return; }
    if (b.dataset.catreset) { delete S.catColors[b.dataset.catreset]; saveSettings(); renderSettings(); renderAll(); return; }
    if (b.dataset.presetApply != null) { applyPreset(+b.dataset.presetApply); return; }
    if (b.dataset.presetDel != null) { S.presets.splice(+b.dataset.presetDel, 1); saveSettings(); renderSettings(); renderFilterBar(); return; }
    const a = b.dataset.act; const tp = S.templates[tplIdx];
    switch (a) {
      case 'sync': saveSettings(); setupAutoRefresh(); await syncLive(); renderSettings(); break;
      case 'sendLocal': { const n = await flushQueue({ includeLocal:true }); if (n) await syncLive({ quiet:true, skipFlush:true }); renderSettings(); break; }
      case 'exportQueue': exportQueueCSV(); break;
      case 'clearQueue': if (confirm(`Discard ${QUEUE.length} quick-log entr${QUEUE.length>1?'ies':'y'} that are not in the Sheet?`)) { QUEUE = []; saveQueue(); reingest(); renderSettings(); } break;
      case 'csv': $('#csvInput').click(); break;
      case 'demo': loadDemo(); lsSet(LS_CACHE, null); renderSettings(); toast('Demo data loaded'); break;
      case 'copyScript': toast(await copyText(APPS_SCRIPT) ? L('Script copied. In Apps Script, select everything in Code.gs and paste over it.', 'Script copié. Dans Apps Script, sélectionnez tout le contenu de Code.gs et collez par-dessus.') : L('Copy failed — select it manually', 'Échec de la copie — sélectionnez-le à la main')); break;
      case 'copyManifest': toast(await copyText(manifestText()) ? L('Manifest copied: paste it over everything in appsscript.json', 'Manifeste copié : collez-le à la place de tout le contenu d’appsscript.json') : L('Copy failed — select it manually', 'Échec de la copie — sélectionnez-le à la main')); break;
      case 'connectLink': await shareConnectLink(); break;
      case 'connectPaste': pasteConnectLink($('#connectPaste')?.value); break;
      case 'updateScript': await updateScript(); break;
      case 'copyNtfy': toast(!(await copyText(ntfySnippet())) ? L('Copy failed — select it manually', 'Échec de la copie — sélectionnez-le à la main') : S.ntfyTopic ? L('Reminders add-on copied with your topic. Paste it as a second script file named Reminders.', 'Module copié avec votre sujet. Collez-le dans un deuxième fichier de script nommé Reminders.') : L('Copied. Pick a topic first, or change NTFY_TOPIC at the top before saving.', 'Copié. Choisissez d’abord un sujet, ou changez NTFY_TOPIC en haut avant d’enregistrer.')); break;
      case 'genTopic': S.ntfyTopic = 'baby-' + [...crypto.getRandomValues(new Uint8Array(9))].map(x => x.toString(36).padStart(2,'0')).join('').slice(0, 16); saveSettings(); renderSettings(); break;
      case 'testRem': chime(); if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); if ('Notification' in window && Notification.permission === 'granted') new Notification('Test reminder', { body:'Reminders are working 👍' }); else toast('🔔 Test reminder — notifications unavailable here, showing in-page'); renderSettings(); break;
      case 'tplNew': S.templates.push({ id:'tpl-' + Date.now().toString(36), name:'New template', targets:{}, items:[{ label:'Bedtime', kind:'bedtime', start:'20:00' }] }); tplIdx = S.templates.length - 1; settingsChanged(true); renderSettings(); break;
      case 'tplDup': S.templates.push({ ...structuredClone(tp), id:'tpl-' + Date.now().toString(36), name: tp.name + ' (copy)' }); tplIdx = S.templates.length - 1; settingsChanged(true); renderSettings(); break;
      case 'tplDel': if (S.templates.length > 1 && confirm(`Delete “${tp.name}”?`)) { S.templates.splice(tplIdx, 1); tplIdx = 0; if (!S.templates.some(x => x.id === S.overlayTpl)) S.overlayTpl = 'auto'; settingsChanged(true); renderSettings(); } break;
      case 'tplReset': if (confirm(L('Restore the default templates (Baseline Home Day, plus the library days that fit)? Custom templates will be removed.', 'Rétablir les modèles par défaut (Journée type, plus les journées de la bibliothèque qui conviennent)? Les modèles personnalisés seront supprimés.'))) { S.templates = structuredClone(DEFAULT_TEMPLATES.filter(t => t.id === 'baseline')); S.libSeen = (S.libSeen || []).filter(k => !k.startsWith(apptKid() + ':')); ensureLibTemplates(); tplIdx = 0; S.overlayTpl = 'auto'; settingsChanged(true); renderSettings(); } break;
      case 'medSave': saveMed(+e.target.closest('[data-act]').dataset.mi); break;
      case 'libAdd': libAdd(e.target.closest('[data-act]').dataset.id); break;
      case 'cfgPushAll': cfgPush({ all:true, quiet:false }).then(() => { if (setPane === 'source') renderSettings(); }); break;
      case 'swStep': { const b = e.target.closest('[data-act]'), k = b.dataset.k; setScoreWeight(k, (+S.score.weights[k] || 0) + +b.dataset.d); break; }
      case 'swReset': S.score.weights = { ...DEFAULT_SETTINGS.score.weights }; setScoreWeight('naps', S.score.weights.naps); break;
      case 'swClear': SCORE_PARTS.forEach(([k]) => S.score.weights[k] = 0); setScoreWeight('naps', 0); break;
      case 'medAdd': S.meds = [...(S.meds || []), { name:'', dose:'', times:'19:30', from: isoOf(todayIdx()) }]; saveSettings(); renderSettings(); break;
      case 'medDel': { const i = +e.target.closest('[data-act]').dataset.mi; if (confirm(L('Remove this medication schedule? Doses already logged stay in the Sheet.', 'Retirer cet horaire de médicament? Les doses déjà notées restent dans la feuille.'))) { S.meds.splice(i, 1); saveSettings(); renderSettings(); renderAll(); } break; }
      case 'tiAdd': tp.items.push({ label:'New target', kind:'nap', start:'12:00', end:'13:00' }); settingsChanged(true); renderSettings(); break;
      case 'tiDel': tp.items.splice(+b.closest('tr').dataset.i, 1); settingsChanged(true); renderSettings(); break;
      case 'presetSave': savePreset(); break;
      case 'applyPath': { const k = $('#pPath').value; S.profile.path = k; S.profile.modules = { ...PATHS[k].modules }; saveSettings(); analyze(); renderAll(); renderSettings(); toast('Features set for ' + PATHS[k].label); break; }
      case 'wizard': closeModals(); openWizard(); break;
      case 'kidAdd': closeModals(); addKid(); break;
      case 'about': setPane = 'about'; renderSettings(); break;
      case 'kidUse': S.kidView = 'one'; useKid(+b.dataset.i); renderSettings(); break;
      case 'kidRemove': if (confirm(L(`Remove ${kidName(+b.dataset.i)} from the dashboard? Their rows stay in the Sheet; only this child's settings are deleted.`, `Retirer ${kidName(+b.dataset.i)} du tableau de bord? Ses lignes restent dans la feuille; seuls les paramètres de cet enfant sont supprimés.`))) { removeKid(+b.dataset.i); renderSettings(); } break;
      case 'tour': closeModals(); startTour(); break;
      case 'band': closeModals(); openBandReview(); break;
      case 'clearSnaps': if (confirm('Delete all saved report copies on this device?')) { REPS.snaps = []; saveReps(); renderSettings(); } break;
      case 'cfgExport': storeActiveKid(); download('baby_dashboard_config.json', JSON.stringify({ app:'baby_log_dashboard', version:APP_VERSION, exported:new Date().toISOString(), settings:S }, null, 2), 'application/json'); break;
      case 'cfgImport': $('#cfgFile').click(); break;
      case 'vCreate': {
        if (!VDRAFT.exclude.length && !confirm('No categories are left out — this viewer will see every entry. Continue?')) break;
        const a = new Uint8Array(18); crypto.getRandomValues(a);
        const key = 'view-' + [...a].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 28);
        const vk = multiKid() ? (VDRAFT.kid ?? kidIdx()) : null;
        S.share.viewers = [...(S.share.viewers || []), { key, label: VDRAFT.label.trim() || 'Viewer', exclude: VDRAFT.exclude.slice(), from: VDRAFT.from, created: Date.now(),
          ...(vk != null ? { kidId: S.kids[vk].id, child: { name: kidName(vk), keys: kidKeys(vk), blank: (S.blankKid ?? 0) === vk } } : {}) }];
        saveSettings(); renderSettings();
        toast(await pushViewers() ? L('Viewer key created and active. Export its config file to send it.', 'Clé lecteur créée et active. Exportez son fichier de configuration pour l’envoyer.') : L('Viewer key created — add the line to your Apps Script', 'Clé lecteur créée — ajoutez la ligne à votre Apps Script')); break; }
      case 'vCopy': toast(await copyText(viewerLine(S.share.viewers[+b.dataset.i])) ? 'Line copied' : 'Copy failed — select it manually'); break;
      case 'vExport': { const v = S.share.viewers[+b.dataset.i]; download(`baby_dashboard_viewer_${(v.label || 'viewer').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, JSON.stringify(viewerConfig(v), null, 2), 'application/json'); break; }
      case 'vRemove': if (confirm(scriptAtLeast('1.7') ? L('Remove this viewer key? It stops working right away.', 'Supprimer cette clé lecteur ? Elle cesse de fonctionner tout de suite.') : 'Remove this viewer key from the list? Also delete its line from VIEWERS in Apps Script and deploy a new version to revoke access.')) { S.share.viewers.splice(+b.dataset.i, 1); saveSettings(); renderSettings(); if (await pushViewers()) toast(L('Viewer key revoked', 'Clé lecteur révoquée')); } break;
      case 'clearCache': localStorage.removeItem(LS_CACHE); toast('Cached data cleared'); break;
      case 'resetAll': if (confirm('Reset all settings to defaults on this device?')) { localStorage.removeItem(LS_SETTINGS); localStorage.removeItem(LS_FILTER); S = structuredClone(DEFAULT_SETTINGS); S.schema = 2; F = { ...DEFAULT_FILTER }; applyTheme(); analyze(); ensureCustomRange(); setupAutoRefresh(); renderAll(); renderSettings(); toast('Settings reset'); } break;
    }
  });
  // Drag & drop CSV anywhere
  let dragN = 0; const dz = $('#dropzone');
  addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { dragN++; dz.classList.add('on'); } });
  addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; dz.classList.remove('on'); } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); dragN = 0; dz.classList.remove('on'); const f = e.dataTransfer.files[0]; if (!f) return; if (/\.json$/i.test(f.name)) importConfig(f); else loadCSVFile(f); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (S.theme === 'auto') { applyTheme(); renderAll(); } });
  addEventListener('resize', debounce(() => { if (VIEW === 'timeline' && S.orientation === 'v') renderTimeline(); }, 200));
  addEventListener('online', () => { if (S.endpoint && QUEUE.some(q => q.status === 'pending')) syncLive({ quiet:true }); });
}
function setLang(l){
  S.lang = l; saveSettings(); translateStatic(); $('#btnLang').textContent = l === 'fr' ? 'EN' : 'FR';
  applyModules(); renderAll(); renderVerPill();
  if ($('#mSettings').classList.contains('on')) renderSettings();
  if ($('#report').classList.contains('on')) renderReport();
}
function importConfig(file){
  if (!file) return; const rd = new FileReader();
  rd.onload = () => { try { const j = JSON.parse(rd.result); const inc = j.settings || j; if (typeof inc !== 'object') throw new Error('Not a config file');
      S = migrateSettings(deepMerge(structuredClone(DEFAULT_SETTINGS), inc)); saveSettings(); FOOD_DICT = null; applyTheme(); analyze(); setupAutoRefresh(); renderAll(); if ($('#mSettings').classList.contains('on')) renderSettings(); toast('Config imported');
      if (S.endpoint) syncLive({ quiet:true }); } catch (err) { toast('Import failed: ' + err.message, true); } };
  rd.readAsText(file);
}

