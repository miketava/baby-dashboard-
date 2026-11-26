/* ── Settings pane: child & features ── */
function profilePaneHTML(){
  const P = S.profile, d = ageDays(), b = bandFor(d);
  return `${kidsPaneHTML()}<h4>${multiKid() ? esc(kidName(kidIdx())) : 'Child'}</h4><div class="fgrid">
      <label class="field">Name or initials<input type="text" data-set="profile.name" value="${esc(P.name)}"></label>
      <label class="field">Date of birth / due date<input type="date" data-set="profile.dob" value="${esc(P.dob)}">${d != null ? `<span class="faint">${ageLabel(d)}${b ? ' · ' + b.label : ''}</span>` : ''}</label>
      <label class="field">Sex (growth curves)<select data-set="profile.sex"><option value="">Prefer not to say</option><option value="f" ${P.sex === 'f' ? 'selected' : ''}>Girl</option><option value="m" ${P.sex === 'm' ? 'selected' : ''}>Boy</option></select></label>
      <label class="field">Units<select data-set="profile.units"><option value="imperial" ${P.units !== 'metric' ? 'selected' : ''}>oz · lb · in · °F</option><option value="metric" ${P.units === 'metric' ? 'selected' : ''}>ml · kg · cm · °C</option></select></label>
      <label class="field">Feeding<select data-set="profile.feeding">${[['breast','Breast'],['formula','Formula'],['mixed','Mixed'],['solids','Solids too']].map(([k, l]) => `<option value="${k}" ${P.feeding === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <h4>Family path</h4>
    <div class="row wrap"><select id="pPath">${Object.entries(PATHS).map(([k, p]) => `<option value="${k}" ${P.path === k ? 'selected' : ''}>${p.icon} ${p.label}</option>`).join('')}</select><button class="btn" data-act="applyPath">Use this path's feature set</button></div>
    <h4>Features</h4><div class="modlist">${MODULES.map(([k, l, dsc]) => `<label class="modrow"><input type="checkbox" data-modset="${k}" ${mod(k) ? 'checked' : ''}><span><b>${l}</b><span class="muted">${dsc}</span></span></label>`).join('')}</div>
    ${mod('cocooning') ? `<h4>Cocooning period</h4><div class="fgrid"><label class="field">Start (placement) date<input type="date" data-set="cocoon.start" value="${esc(S.cocoon.start)}"><span class="faint">blank = first day of data</span></label>${numField('cocoon.weeks', 'Length (weeks)', 1)}</div><p class="hint">Counts “Outing / Excursion” and “Guest” rows in this period. Visits, home visits and appointments are not counted.</p>` : ''}
    <h4>Help</h4><div class="row wrap"><button class="btn" data-act="wizard">Re-run setup wizard</button><button class="btn" data-act="tour">Take the guided tour</button>${b?.ww && mod('schedule') ? '<button class="btn" data-act="band">Review targets for this age</button>' : ''}</div>`;
}
function wireOnboarding(){
  $('#btnHelp').onclick = () => startTour();
  $('#notice').addEventListener('click', e => {
    const a = e.target.closest('[data-nact]')?.dataset.nact; if (!a) return;
    if (a === 'wizard') openWizard();
    if (a === 'tour') { S.profile.whatsNew = ''; saveSettings(); renderNotice(); startTour(); }
    if (a === 'dismissNew') { S.profile.whatsNew = ''; saveSettings(); renderNotice(); }
    if (a === 'script') openSettings('source');
    if (a === 'band') openBandReview();
    if (a === 'dismissBand') { S.profile.bandAck = bandFor(ageDays())?.id || ''; saveSettings(); renderNotice(); }
  });
  // wizard
  $('#wizBody').addEventListener('click', e => {
    const lg = e.target.closest('#wLang [data-lang]'); if (lg) { wizardCollect(); setLang(lg.dataset.lang); renderWizard(); return; }
    const p = e.target.closest('[data-path]'); if (p) { W.path = p.dataset.path; W.modules = { ...PATHS[W.path].modules, ...(W.feeding === 'solids' ? { food:true } : {}) }; { const d = W.dob ? parseDate(W.dob) : null, a = d == null ? null : todayIdx() - d; if (a != null && a < 120) W.modules.newborn = true; } renderWizard(); }
    const u = e.target.closest('[data-u]'); if (u) { W.units = u.dataset.u; renderWizard(); }
    const f = e.target.closest('[data-f]'); if (f) { W.feeding = f.dataset.f; if (W.feeding === 'solids') W.modules.food = true; renderWizard(); }
  });
  $('#wizBody').addEventListener('change', e => { if (e.target.id === 'wDob') { wizardCollect(); renderWizard(); } });
  $('#wizBack').onclick = () => { wizardCollect(); W.step = Math.max(0, W.step - 1); renderWizard(); };
  $('#wizNext').onclick = () => { wizardCollect(); if (W.step === wizSteps().length - 1) finishWizard(); else { W.step++; renderWizard(); } };
  $('#wizSkip').onclick = () => { if (W?.addKid) { closeModals(); return; } if (!S.profile.onboarded) { S.profile = { ...S.profile, onboarded:true, path: S.profile.path || 'routine', modules:{ ...ALL_ON, ...PATHS.routine.modules } }; saveSettings(); analyze(); renderAll(); } closeModals(); };
  // tour
  $('#tour').addEventListener('click', e => {
    if (e.target.id === 'tourNext') { TOUR.dir = 1; showTourStep(TOUR.i + 1); }
    else if (e.target.id === 'tourBack') { TOUR.dir = -1; showTourStep(TOUR.i - 1); }
    else if (e.target.id === 'tourSkip') endTour();
  });
  document.addEventListener('keydown', e => { if (!TOUR) return; if (e.key === 'Escape') { e.stopImmediatePropagation(); endTour(); } if (e.key === 'ArrowRight') { TOUR.dir = 1; showTourStep(TOUR.i + 1); } if (e.key === 'ArrowLeft') { TOUR.dir = -1; showTourStep(TOUR.i - 1); } }, true);
  addEventListener('resize', () => TOUR && positionTour());
  addEventListener('scroll', () => TOUR && positionTour(), { passive:true });
}

