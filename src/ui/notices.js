/* ── “What's new” popup: once, on the first open after an update ── */
const unseenChanges = () => CHANGELOG.filter(e => !S.seenVersion ? e.v === APP_VERSION : cmpVer(e.v, S.seenVersion) > 0);
function maybeShowWhatsNew(){
  if (S.seenVersion === APP_VERSION || !S.profile.onboarded || $('.modal.on') || TOUR) return;
  const list = unseenChanges(); if (!list.length) { S.seenVersion = APP_VERSION; saveSettings(); return; }
  $('#newTitle').textContent = L(`What's new in v${APP_VERSION}`, `Nouveautés de la v${APP_VERSION}`);
  $('#newBody').innerHTML = list.map(e => `<div${list.length > 1 ? ' class="vcard"' : ''}>${list.length > 1 ? `<b>v${e.v}</b> <span class="faint">· ${esc(fmtDay(parseDate(e.date), { month:'long', day:'numeric' }))}</span>` : ''}<ul class="find">${clText(e).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')
    + `${scriptOutdated() ? `<p class="scopenote">🔧 ${L('This version needs an updated Apps Script — see the notice at the top of the page.', 'Cette version exige un Apps Script à jour — voir l’avis en haut de la page.')}</p>` : ''}
    <div class="row sp" style="margin-top:12px"><button class="btn" data-act-new="all">${L('Full changelog', 'Historique complet')}</button><button class="btn primary" data-act-new="ok">${L('Got it', 'Compris')}</button></div>`;
  openModal('mNew');
}
function seenWhatsNew(){ S.seenVersion = APP_VERSION; saveSettings(); }
/* ── Notices (what's new, age band changes) ── */
function renderNotice(){
  const n = $('#notice'), b = bandFor(ageDays());
  let h = '';
  if (S.profile.whatsNew === '4.0') h = `<span>✨ <b>New:</b> tell the dashboard about your child and switch features on or off, plus a guided tour of everything.</span>
      <button class="btn sm primary" data-nact="wizard">Set up profile</button><button class="btn sm" data-nact="tour">Take the tour</button><button class="btn sm ghost" data-nact="dismissNew">✕</button>`;
  else if (false && scriptOutdated()) h = `<span>🔧 ${L(`Your Apps Script is older than this dashboard (script ${SCRIPT_SEEN === '0' ? 'before 1.0' : 'v' + SCRIPT_SEEN}, needs v${REQUIRED_SCRIPT}). Some features (editing entries, per-child Quick Log) won't work until you update it.`, `Votre Apps Script est plus ancien que le tableau de bord (script ${SCRIPT_SEEN === '0' ? 'antérieur à 1.0' : 'v' + SCRIPT_SEEN}, requis : v${REQUIRED_SCRIPT}). Certaines fonctions (modifier des entrées, saisie par enfant) ne marchent pas avant la mise à jour.`)}</span>
      <button class="btn sm primary" data-nact="script">${L('How to update', 'Comment mettre à jour')}</button>`;
  else if (b && mod('schedule') && b.ww && S.profile.bandAck && S.profile.bandAck !== b.id) h = `<span>🎂 ${esc(S.profile.name || 'Your child')} is now <b>${ageLabel(ageDays())}</b> (${b.label}). Nap targets for this age may differ from yours.</span>
      <button class="btn sm primary" data-nact="band">Review suggestions</button><button class="btn sm ghost" data-nact="dismissBand">Not now</button>`;
  n.innerHTML = h; n.classList.toggle('hidden', !h);
}

