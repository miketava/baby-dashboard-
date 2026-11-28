
/* ════════════════════════════════════════════════════════════════════════════
   10. RENDER: header, filter bar, tabs
   ════════════════════════════════════════════════════════════════════════════ */
let VIEW = 'today';
function applyTheme(){
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
function renderHeader(){
  renderKidSeg();
  $('#appTitle').textContent = titleL(); document.title = titleL();
  const p = $('#srcPill');
  p.className = 'pill ' + (DATA.source === 'demo' ? 'demo' : DATA.source === 'live' ? 'live' : '');
  const lbl = DATA.source === 'demo' ? L('Demo Mode', 'Mode démo') : FRL() ? DATA.label.replace('Live · view only', 'En direct · lecture seule').replace('Live · Google Sheet', 'En direct · feuille Google') : DATA.label;
  const synced = DATA.source === 'demo' || !DATA.synced ? '' : new Date(DATA.synced).toLocaleTimeString(LOC(), { hour:'2-digit', minute:'2-digit' });
  const GSHEET = '<svg class="gs" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="#0f9d58" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path fill="#87ceac" d="M14 2v6h6z"/><path fill="#fff" d="M7.5 11h9v7h-9zm1.2 1.2v1.7h2.7v-1.7zm3.9 0v1.7h2.7v-1.7zm-3.9 2.9v1.7h2.7v-1.7zm3.9 0v1.7h2.7v-1.7z"/></svg>';
  p.innerHTML = (DATA.source === 'live' ? GSHEET : '<span class="dot"></span>') + `<span class="lbl">${esc(lbl)}</span>${synced ? `<span class="syncs">${esc(synced)}</span>` : ''}`;
  p.title = DATA.source === 'demo' ? 'Showing built-in sample data. Connect your Sheet in Settings or drop a CSV.' : lbl + (DATA.synced ? ' · ' + L('last synced ', 'synchronisé le ') + new Date(DATA.synced).toLocaleString(LOC(), { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '');
  const spl = $('#scriptPill'), old = scriptOutdated(); spl.classList.toggle('hidden', !old);
  if (old) { spl.innerHTML = L(`🔧 <span class="lg">Script update </span>v${REQUIRED_SCRIPT}`, `🔧 <span class="lg">Mise à jour du script </span>v${REQUIRED_SCRIPT}`); spl.title = L(`Your Apps Script is ${SCRIPT_SEEN === '0' ? 'before 1.0' : 'v' + SCRIPT_SEEN}; this dashboard needs v${REQUIRED_SCRIPT} for everything to work. Tap for how to update.`, `Votre Apps Script est ${SCRIPT_SEEN === '0' ? 'antérieur à 1.0' : 'en v' + SCRIPT_SEEN}; ce tableau de bord a besoin de la v${REQUIRED_SCRIPT}. Touchez pour savoir comment le mettre à jour.`); }
  const scp = $('#scorePill'), tm = mod('score') !== false && mod('schedule') ? DAYS.get(todayIdx()) : null, sc = tm?.score;
  scp.classList.toggle('hidden', !sc || sc.score == null);
  if (sc?.score != null) { scp.innerHTML = `${L('Today', 'Aujourd’hui')} <b>${sc.score}</b>${sc.partial ? `<span class="faint" style="font-weight:500"> ${L('so far', 'jusqu’ici')}</span>` : ''}`; scp.style.color = scoreCol(sc.score); scp.style.background = `color-mix(in srgb, ${scoreCol(sc.score)} 12%, var(--panel))`;
    scp.title = L('Today’s routine score — tap to see what’s helping and what isn’t', 'Score de routine du jour — touchez pour voir ce qui aide et ce qui nuit'); }
  const w = DATA.warnings.filter(x => !x.info).length, info = DATA.warnings.length - w, sn = viewOnly() ? 0 : splitNights().length;
  const hp = $('#healthPill'); hp.classList.toggle('hidden', !DATA.warnings.length && !DATA.newCats.length && !sn);
  hp.querySelector('span').textContent = w ? L(`${w} parse warning${w>1?'s':''}`, `${w} avertissement${w>1?'s':''}`) : sn ? L(`${sn} night${sn>1?'s':''} in pieces`, `${sn} nuit${sn>1?'s':''} en morceaux`) : DATA.newCats.length ? L(`${DATA.newCats.length} new categor${DATA.newCats.length>1?'ies':'y'}`, `${DATA.newCats.length} nouvelle${DATA.newCats.length>1?'s':''} catégorie${DATA.newCats.length>1?'s':''}`) : `${info} note${info>1?'s':''}`;
  hp.style.background = w ? '' : 'var(--accent-soft)'; hp.style.color = w ? '' : 'var(--accent)';
  $('#syncInfo').textContent = DATA.source === 'demo' ? '' : L('Last synced ', 'Synchronisé le ') + new Date(DATA.synced).toLocaleString(LOC(), { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  $('#btnRefresh').title = S.endpoint ? L('Refresh data from Google Sheet', 'Actualiser les données de la feuille Google') : L('Connect a Google Sheet in Settings first', 'Connectez d’abord une feuille Google dans les Paramètres');
  renderQueuePill();
  const sp = $('#scopePill'), ex = DATA.excluded || [];
  sp.classList.toggle('hidden', !ex.length && !viewOnly());
  sp.innerHTML = (viewOnly() ? L('👁 View only', '👁 Lecture seule') + (ex.length ? ' · ' : '') : '') + (ex.length ? L('Not included: ', 'Non inclus : ') + esc(ex.map(catL).join(', ')) : '');
  sp.title = viewOnly() ? L(`Read-only access${DATA.viewer.label ? ' (' + DATA.viewer.label + ')' : ''} set up by the family. ${ex.length ? 'Entries in these categories are not shared with this view: ' + ex.join(', ') + '.' : ''}${DATA.viewer.from ? ' Entries before ' + DATA.viewer.from + ' are not shared.' : ''}`, `Accès en lecture seule${DATA.viewer.label ? ' (' + DATA.viewer.label + ')' : ''} configuré par la famille. ${ex.length ? 'Les entrées de ces catégories ne sont pas partagées : ' + ex.map(catL).join(', ') + '.' : ''}${DATA.viewer.from ? ' Les entrées avant le ' + DATA.viewer.from + ' ne sont pas partagées.' : ''}`) : L('Left out of analysis and reports on this device (Settings → Sharing).', 'Exclu de l’analyse et des rapports sur cet appareil (Paramètres → Partage).');
}
function renderFilterBar(){
  $$('#rangeSeg button').forEach(b => b.classList.toggle('on', b.dataset.r === F.range));
  $('#customRange').classList.toggle('hidden', F.range !== 'custom');
  if (F.from != null) $('#fFrom').value = isoOf(F.from); if (F.to != null) $('#fTo').value = isoOf(F.to);
  $('#fDayType').value = F.dayType; if ($('#fSearch') !== document.activeElement) $('#fSearch').value = F.q;
  // Category chips grouped by logical group (categories present in the data)
  const hid = hiddenSet(); const present = new Set(DATA.events.map(e => e.cat));
  let html = '';
  GROUPS.forEach(g => {
    const cs = [...CATS.values()].filter(c => c.group === g.id && present.has(c.name));
    if (!cs.length) return;
    const allOff = cs.every(c => hid.has(c.name));
    html += `${html ? '<span class="chip-sep"></span>' : ''}<span class="chip grp ${allOff ? 'off' : ''}" data-grp="${g.id}" title="Toggle all ${esc(g.label)}">${esc(g.label)}</span>`;
    html += cs.map(c => `<span class="chip ${hid.has(c.name) ? 'off' : ''}" data-cat="${esc(c.name)}"><span class="sw" style="background:${catColor(c.name)}"></span>${esc(c.name)}${c.known ? '' : ' <span class="faint">new</span>'}</span>`).join('');
  });
  $('#catChips').innerHTML = html;
  $('#presetSel').innerHTML = `<option value="">★ Presets</option>` + S.presets.map((p,i) => `<option value="${i}">${esc(p.name)}</option>`).join('') + `<option value="__save">＋ Save current filters…</option>`;
  const n = visibleDays().length;
  $('#dayCount').textContent = `${n} day${n === 1 ? '' : 's'} shown`;
  const [a,b] = rangeBounds();
  const nh = F.hidden.filter(c => present.has(c)).length, active = F.range !== DEFAULT_FILTER.range || F.dayType !== 'all' || !!F.q || nh > 0;
  $('#filterSummary').textContent = `· ${fmtDayShort(a)}–${fmtDayShort(b)} · ${plural(n, 'day', 'days', 'jour', 'jours')}${F.dayType !== 'all' ? ' · ' + $('#fDayType').selectedOptions[0].text : ''}${F.q ? ' · “' + F.q + '”' : ''}${nh ? ' · ' + plural(nh, 'category hidden', 'categories hidden', 'catégorie masquée', 'catégories masquées') : ''}`;
  $('#catToggle').textContent = (nh ? L(`🏷 Categories · ${nh} hidden`, `🏷 Catégories · ${nh} masquée${nh > 1 ? 's' : ''}`) : L('🏷 Categories', '🏷 Catégories')) + (UI.catsOpen ? ' ▴' : ' ▾');
  $('#filterbar').classList.toggle('cats', !!UI.catsOpen);
  $('#filterbar').classList.toggle('active', active); $('#filterReset').classList.toggle('hidden', !active); syncFilterBtns();
}
function renderAll(){ applyModules(); renderNotice(); renderHeader(); renderFilterBar(); renderToday(); renderView(); }
function renderView(){
  hideTip();
  if (VIEW === 'today') renderTodayView();
  else if (VIEW === 'timeline') renderTimeline();
  else if (VIEW === 'sleep') renderSleep();
  else if (VIEW === 'nutrition') { renderNutrition(); renderAllergens(); }
  else if (VIEW === 'health') { renderHealth(); renderVaccines(); renderTeethSleep(); renderMedsCard(); }
  else if (VIEW === 'patterns') { renderTrends(); renderPatterns(); }
  else if (VIEW === 'contact') renderContact();
  else if (VIEW === 'checkins') renderCheckins();
  else if (VIEW === 'awards') renderAwards();
  else renderData();
  if (drawerDay != null) renderDrawer();
}

