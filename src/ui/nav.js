
/* ════════════════════════════════════════════════════════════════════════════
   20b. v4 ONBOARDING — feature modules, age bands, setup wizard, notices, guided tour
   ════════════════════════════════════════════════════════════════════════════ */

/** Show/hide everything tagged data-mod="…" and adjust labels for the current feature set. */
function applyModules(){
  $$('[data-mod]').forEach(el => { const on = el.dataset.mod.split(' ').every(mod); if (el.tagName === 'OPTION') { el.hidden = !on; el.disabled = !on; } else el.classList.toggle('hidden', !on); });
  renderNav();
  const opt = $(`#fDayType option[value="${F.dayType}"]`); if (opt?.hidden) { F.dayType = 'all'; saveFilter(); }
  if (!mod('quicklog')) $('#qlog').classList.remove('on');
  document.body.classList.toggle('viewonly', viewOnly());
}
/* ── Navigation: one list of sections, drawn as a sidebar (wide screens), icon tabs (medium) or a bottom bar + More sheet (phones) ── */
const TAB_GROUPS = { daily:['Daily', 'Au quotidien'], analysis:['Analysis', 'Analyses'], placement:['Placement', 'Placement'], data:['Data', 'Données'] };
const NAV = () => [
  { v:'today',     ic:'📅', g:'daily',     n:L('Today', 'Aujourd’hui') },
  { v:'timeline',  ic:'🗓️', g:'daily',     n:L('Timeline', 'Chronologie') },
  { v:'checkins',  ic:'📝', g:'daily',     n:L('Check-ins', 'Bilans'), mod:'checkins' },
  { v:'patterns',  ic:'📊', g:'analysis',  n: mod('visits') ? L('Routine & Visits', 'Routine et visites') : L('Routine', 'Routine') },
  { v:'sleep',     ic:'😴', g:'analysis',  n:L('Sleep', 'Sommeil') },
  { v:'nutrition', ic:'🍼', g:'analysis',  n:L('Feeding', 'Alimentation') },
  { v:'health',    ic:'🩺', g:'analysis',  n:L('Health & Growth', 'Santé et croissance') },
  { v:'contact',   ic:'💬', g:'placement', n:L('Birth Family', 'Famille biologique'), mod:'familyContact' },
  { v:'data',      ic:'🗂️', g:'data',      n:L('Data', 'Données') },
].filter(t => !t.mod || mod(t.mod));
/** Phone bar: Today · Timeline · ＋ · (Check-ins, or Routine) · More */
const BBAR_4 = () => NAV().some(t => t.v === 'checkins') ? 'checkins' : 'patterns';
function renderNav(){
  const tabs = NAV(), grp = g => L(...TAB_GROUPS[g]); let last = '', h = '';
  tabs.forEach(t => { if (t.g !== last) { h += `<div class="tgrp">${esc(grp(t.g))}</div>`; last = t.g; }
    h += `<button class="tab${t.v === VIEW ? ' on' : ''}" data-v="${t.v}"${t.v === 'patterns' ? ' id="tabPatterns"' : ''}><span class="ti" aria-hidden="true">${t.ic}</span><span class="tn">${esc(t.n)}</span></button>`; });
  h += `<div class="tgrp">${esc(L('More', 'Plus'))}</div><button class="tab" data-more><span class="ti" aria-hidden="true">☰</span><span class="tn">${esc(L('More: report, tour, language…', 'Plus : rapport, visite, langue…'))}</span></button>`;
  $('#tabs').innerHTML = h; document.body.dataset.view = VIEW;
  const one = v => { const t = tabs.find(x => x.v === v); return t ? `<button data-v="${t.v}" class="${t.v === VIEW ? 'on' : ''}"><span class="ti" aria-hidden="true">${t.ic}</span>${esc(t.n)}</button>` : ''; };
  const four = BBAR_4(), inBar = ['today', 'timeline', four], moreOn = !inBar.includes(VIEW);
  $('#bbar').innerHTML = one('today') + one('timeline')
    + (mod('quicklog') ? `<button class="bplus" data-ql title="${esc(L('Log something', 'Noter quelque chose'))}"><i aria-hidden="true">＋</i>${esc(L('Log', 'Noter'))}</button>` : '<span></span>')
    + one(four) + `<button data-more class="${moreOn ? 'on' : ''}"><span class="ti" aria-hidden="true">${moreOn ? (tabs.find(x => x.v === VIEW)?.ic || '☰') : '☰'}</span>${esc(moreOn ? (tabs.find(x => x.v === VIEW)?.n || L('More', 'Plus')) : L('More', 'Plus'))}</button>`;
  last = ''; let m = '';
  tabs.forEach(t => { if (t.g !== last) { m += `<div class="mgrp">${esc(grp(t.g))}</div>`; last = t.g; }
    m += `<button data-v="${t.v}" class="${t.v === VIEW ? 'on' : ''}"><span class="ti" aria-hidden="true">${t.ic}</span>${esc(t.n)}</button>`; });
  m += `<div class="mgrp">${esc(L('More', 'Plus'))}</div><button data-act="report"><span class="ti">📄</span>${esc(L('Report', 'Rapport'))}</button><button data-act="settings"><span class="ti">⚙️</span>${esc(L('Settings', 'Paramètres'))}</button><button data-act="tour"><span class="ti">❔</span>${esc(L('Guided tour', 'Visite guidée'))}</button><button data-act="lang"><span class="ti">🌐</span>${FRL() ? 'English' : 'Français'}</button><button data-act="theme"><span class="ti">${document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'}</span>${esc(document.documentElement.dataset.theme === 'dark' ? L('Light mode', 'Mode clair') : L('Dark mode', 'Mode sombre'))}</button>${S.endpoint ? '' : `<button data-act="csv"><span class="ti">📥</span>${esc(L('Import CSV', 'Importer un CSV'))}</button>`}`;
  $('#moreList').innerHTML = m; $('#moreTitle').textContent = L('All sections', 'Toutes les sections');
}
function openMore(){ hideTip(); $('#moreSheet').classList.add('on'); $('#scrim').classList.add('on'); }
function closeMore(){ $('#moreSheet').classList.remove('on'); if (!$('.modal.on') && !$('.sheet.on') && drawerDay == null) $('#scrim').classList.remove('on'); }
function setView(v, opt = {}){
  if (!NAV().some(t => t.v === v)) v = 'today';
  if (opt.hist !== false && !TOUR && v !== VIEW && typeof navPushView === 'function') navPushView(v);
  if (v !== 'timeline' && S.kidView === 'all') { S.kidView = 'one'; renderKidSeg(); }
  VIEW = v; document.body.dataset.view = v; $('#filterbar').classList.remove('open'); closeMore();
  renderNav(); $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v)); renderView();
  if (innerWidth <= 720) scrollTo({ top: 0 });
}

