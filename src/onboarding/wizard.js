/* ── Setup wizard ── */
let W = null;
const WIZ_STEPS = ['child', 'path', 'units', 'features', 'data'];
const wizSteps = () => W?.addKid ? WIZ_STEPS.slice(0, 4) : WIZ_STEPS;
function openWizard(opts = {}){
  const P = S.profile;
  W = { addKid: !!opts.addKid, prevKid: opts.prevKid, step:0, name:P.name, dob:P.dob, sex:P.sex, path:P.path || '', units:P.units || 'imperial', feeding:P.feeding || 'mixed', modules:{ ...ALL_ON, ...P.modules },
        data: DATA.source === 'demo' ? 'demo' : 'keep', tour:true, first: !P.onboarded };
  renderWizard(); openModal('mWizard');
}
function renderWizard(){
  const st = wizSteps()[W.step], last = W.step === wizSteps().length - 1;
  $('#wizSkip').textContent = W.addKid ? L('Cancel', 'Annuler') : L('Skip setup', 'Passer');
  $('#wizDots').innerHTML = wizSteps().map((_, i) => `<i class="${i === W.step ? 'on' : i < W.step ? 'done' : ''}"></i>`).join('');
  let h = '';
  if (st === 'child') h = `${W.addKid ? `<h3>${L('Add a child', 'Ajouter un enfant')}</h3><p class="muted">${L('Their own profile, targets and schedule. Your existing data stays as it is.', 'Son propre profil, ses cibles et son horaire. Vos données actuelles ne changent pas.')}</p>` : ''}<h3 ${W.addKid ? 'hidden' : ''}>Welcome 👋</h3><p class="muted">A few questions so the dashboard shows what matters for your family. Everything stays in this browser and can be changed later in Settings.</p>
    ${W.addKid ? '' : `<div class="field" style="margin-bottom:8px">Language / Langue<div class="seg" id="wLang"><button data-lang="en" class="${FRL() ? '' : 'on'}">English</button><button data-lang="fr" class="${FRL() ? 'on' : ''}">Français</button></div></div>`}
    <div class="fgrid" style="grid-template-columns:1fr 1fr">
      <label class="field">Child's name or initials<input type="text" id="wName" value="${esc(W.name)}" placeholder="e.g. Leo or L.M."></label>
      <label class="field">Date of birth <span class="faint">(or due date)</span><input type="date" id="wDob" value="${esc(W.dob)}"></label>
      <label class="field">Sex <span class="faint">(optional — used for growth curves)</span><select id="wSex"><option value="">Prefer not to say</option><option value="f" ${W.sex === 'f' ? 'selected' : ''}>Girl</option><option value="m" ${W.sex === 'm' ? 'selected' : ''}>Boy</option></select></label>
    </div>${W.dob ? `<p class="hint">${ageLabel(todayIdx() - parseDate(W.dob))}${bandFor(todayIdx() - parseDate(W.dob)) ? ' · ' + bandFor(todayIdx() - parseDate(W.dob)).label : ''}</p>` : ''}${W.addKid ? '' : `<p class="hint">${L('Tracking more than one child? Set up the first one here, then add the others in Settings → Child & features.', 'Vous suivez plus d’un enfant? Configurez le premier ici, puis ajoutez les autres dans Paramètres → Enfant et fonctions.')}</p>`}`;
  else if (st === 'path') h = `<h3>How did your little one join the family?</h3><p class="muted">This decides which features are switched on. You can change any of them on the next steps or later.</p>
    <div class="paths">${Object.entries(PATHS).map(([k, p]) => `<button class="pathcard ${W.path === k ? 'on' : ''}" data-path="${k}"><span class="pi">${p.icon}</span><b>${p.label}</b><span class="muted">${p.blurb}</span></button>`).join('')}</div>
    ${!W.path ? '<p class="hint">Pick one to continue.</p>' : ''}`;
  else if (st === 'units') h = `<h3>Units &amp; feeding</h3>
    <div class="fgrid" style="grid-template-columns:1fr 1fr">
      <div class="field">Units<div class="seg" id="wUnits"><button data-u="imperial" class="${W.units === 'imperial' ? 'on' : ''}">oz · lb · in · °F</button><button data-u="metric" class="${W.units === 'metric' ? 'on' : ''}">ml · kg · cm · °C</button></div></div>
      <div class="field">Feeding right now<div class="seg wrapseg" id="wFeed">${[['breast','Breast'],['formula','Formula'],['mixed','Mixed'],['solids','Solids too']].map(([k, l]) => `<button data-f="${k}" class="${W.feeding === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    </div><p class="hint">Milk amounts are shown in your units everywhere; a Sheet column named <span class="mono">Milk (ml)</span> is read as ml automatically.</p>`;
  else if (st === 'features') h = `<h3>Features</h3><p class="muted">Pre-selected for <b>${esc(PATHS[W.path]?.label || '')}</b>. Untick anything you don't need — hidden features keep their data and come back when re-enabled.</p>
    ${MOD_GROUPS.map(([en, fr, keys]) => `<h4 style="margin:12px 0 4px">${L(en, fr)}</h4><div class="modlist">${MODULES.filter(([k]) => keys.includes(k)).map(([k, l, d]) => `<label class="modrow"><input type="checkbox" data-m="${k}" ${W.modules[k] ? 'checked' : ''}><span><b>${l}</b><span class="muted">${d}</span></span></label>`).join('')}</div>`).join('')}`;
  else if (st === 'data') {
    const hasData = DATA.source !== 'demo' && DATA.events.length;
    const opt = (k, t, d) => `<label class="modrow"><input type="radio" name="wData" value="${k}" ${W.data === k ? 'checked' : ''}><span><b>${t}</b><span class="muted">${d}</span></span></label>`;
    h = `<h3>Your data</h3><div class="modlist">
      ${hasData ? opt('keep', 'Keep my current data', `${DATA.events.length} events from ${esc(DATA.label)}`) : ''}
      ${opt('demo', 'Explore with example data first', PATHS[W.path]?.demo === 'newborn' ? 'A fictional newborn’s first four weeks' : PATHS[W.path]?.demo === 'placement' ? 'Three fictional weeks with visits and handovers' : 'Three fictional weeks of naps, meals and outings')}
      ${opt('sheet', 'Connect a Google Sheet', 'Copy our ready-made template Sheet, then about 5 minutes with the setup guide. Live sync for all caregivers; Quick Log writes to the Sheet')}
      ${opt('csv', 'Import a CSV file', 'One-off import of a Daily Log export')}
      ${opt('empty', 'Start empty', 'Log with Quick Log on this device; connect a Sheet any time')}
    </div><label class="switch" style="margin-top:12px"><input type="checkbox" id="wTour" ${W.tour ? 'checked' : ''}> Show me a guided tour when I finish</label>`;
  }
  $('#wizBody').innerHTML = h;
  $('#wizBack').disabled = W.step === 0;
  $('#wizNext').textContent = last ? 'Finish' : 'Next';
  $('#wizNext').disabled = st === 'path' && !W.path;
}
function wizardCollect(){
  const st = WIZ_STEPS[W.step];
  if (st === 'child') { W.name = $('#wName').value.trim(); W.dob = $('#wDob').value; W.sex = $('#wSex').value; }
  if (st === 'features') $$('#wizBody [data-m]').forEach(c => W.modules[c.dataset.m] = c.checked);
  if (st === 'data') { W.data = $('#wizBody input[name=wData]:checked')?.value || 'demo'; W.tour = $('#wTour').checked; }
}
/** End of the wizard when adding another child: keep the data, apply age-based targets, show the new child. */
function finishAddKid(){
  S.profile = { ...S.profile, onboarded:true, whatsNew:'', name:W.name, dob:W.dob, sex:W.sex, path:W.path, units:W.units, feeding:W.feeding, modules:{ ...W.modules } };
  S.report.childLabel = W.name || S.report.childLabel;
  const b = bandFor(ageDays());
  if (b?.ww && mod('schedule')) applyBand(b); else if (b) S.profile.bandAck = b.id;
  if (!mod('visits')) S.templates = S.templates.filter(t => !['early-visit', 'late-visit'].includes(t.id));
  ensureLibTemplates();
  W.done = true; W = null; S.kidView = 'one'; storeActiveKid(); saveSettings(); closeModals(); reingest();
  toast(L(`${kidName(kidIdx())} added — log rows for them with “${kidName(kidIdx())}” in the Child column`, `${kidName(kidIdx())} ajouté — indiquez « ${kidName(kidIdx())} » dans la colonne Child pour ses lignes`));
}
function finishWizard(){
  if (W.addKid) return finishAddKid();
  const prevPath = S.profile.path, first = W.first;
  S.profile = { ...S.profile, onboarded:true, whatsNew:'', name:W.name, dob:W.dob, sex:W.sex, path:W.path, units:W.units, feeding:W.feeding, modules:{ ...W.modules } };
  if (W.name && (first || /^Baby Routine Dashboard$/.test(S.title))) S.title = `${W.name}'s Routine`;
  if (W.name && !S.report.childLabel) S.report.childLabel = W.name;
  const b = bandFor(ageDays());
  if (b?.ww && mod('schedule') && first && !STORED_SETTINGS) applyBand(b);     // brand-new users: start from age-appropriate targets
  else if (b) S.profile.bandAck = (first && !b.ww) || !mod('schedule') ? b.id : (S.profile.bandAck === b.id ? b.id : 'review');   // existing users get a "review suggestions" notice instead of silent changes
  if (first && !STORED_SETTINGS && !mod('visits')) S.templates = S.templates.filter(t => !['early-visit', 'late-visit'].includes(t.id));   // visit days only on the placement path
  ensureLibTemplates();
  saveSettings(); FOOD_DICT = null;
  closeModals();
  const go = W.data, tour = W.tour;
  if (go === 'demo') loadDemo(PATHS[W.path]?.demo);
  else if (go === 'empty') { lsSet(LS_CACHE, null); ingest({ headers: HEADERS, records: [] }, 'local', 'No data yet'); }
  else { analyze(); renderAll(); }
  if (go === 'csv') $('#csvInput').click();
  if (go === 'sheet') openSettings('guide');
  else if (tour) setTimeout(startTour, 250);
  if (prevPath && prevPath !== W.path) toast('Feature set updated for ' + PATHS[W.path].label);
}

