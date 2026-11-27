/* ════════════════════════════════════════════════════════════════════════════
   v1.35 — BADGES SECTION: grid (ring to next tier, x / y, tier pips), hidden row, graphs,
   details on tap, press and hold (or right-click) to hide.
   ════════════════════════════════════════════════════════════════════════════ */
function achCardHTML(r){
  const nx = achNext(r), a = r.a;
  return `<button type="button" class="achc${r.earned ? '' : ' none'}${nx.maxed ? ' max' : ''}" data-ach="${a.id}">
    <span class="achrw">${achRing(r)}<span class="ic">${a.ic}</span></span>
    <b class="nm">${esc(L(...a.n))}${a.h && multiKid() ? ' <span title="' + esc(L('Whole household', 'Toute la maisonnée')) + '">🏠</span>' : ''}</b>
    <span class="xy">${nx.maxed ? `${esc(achFmtShort(a, r.value))} ✓` : `${esc(achFmtShort(a, r.value))} / ${esc(achFmtShort(a, nx.next))}`}</span>
    ${achPips(r)}</button>`;
}
function renderAwards(){
  const root = $('#awardsRoot'); if (!root) return;
  if (!ACH) computeAchievements();
  const hidden = achHiddenSet(), shown = ACH.list.filter(r => !hidden.has(r.a.id)), hid = ACH.list.filter(r => hidden.has(r.a.id));
  const tiersNow = shown.reduce((s, r) => s + r.earned, 0), tiersAll = shown.reduce((s, r) => s + r.tiers.length, 0);
  const lastAt = Math.max(-Infinity, ...shown.flatMap(r => r.tiers.filter(t => t.at != null).map(t => t.at)));
  const lastR = shown.find(r => r.tiers.some(t => t.at === lastAt));
  const demo = DATA.source === 'demo';
  root.innerHTML = `<div class="card">
      <div class="card-head"><div><h2>🏆 ${L('Badges', 'Badges')}</h2><div class="sub" data-keep>${multiKid() ? esc(kidName(kidIdx())) + ' · ' : ''}${L(`${tiersNow} of ${tiersAll} tiers earned`, `${tiersNow} paliers sur ${tiersAll} obtenus`)}${lastR ? ' · ' + L('latest', 'dernier') + ` : ${esc(L(...lastR.a.n))} (${esc(achWhen(lastAt))})` : ''}</div></div>
        <span class="grow"></span>
        <button class="btn sm" id="achSound" title="${esc(L('Sounds when a badge unlocks (never at night or while asleep)', 'Sons quand un badge se débloque (jamais la nuit ni pendant le sommeil)'))}">${UI.achSound === false ? '🔇 ' + L('Sound off', 'Son coupé') : '🔊 ' + L('Sound on', 'Son activé')}</button>
        <button class="btn sm" id="achReplay">🎉 ${L('Replay', 'Rejouer')}</button></div>
      ${demo ? `<p class="callout info" style="margin:0 0 12px">${L('These are the example data’s badges. Your own start counting when your Sheet is connected, from the first entry in it.', 'Ce sont les badges des données d’exemple. Les vôtres se comptent dès que votre feuille est connectée, à partir de sa première entrée.')}</p>` : ''}
      <div class="achgrid">${shown.map(achCardHTML).join('')}</div>
      ${hid.length ? `<details class="achhid"><summary>${L(`Hidden (${hid.length})`, `Masqués (${hid.length})`)}</summary><div class="achgrid">${hid.map(achCardHTML).join('')}</div></details>` : ''}
      <p class="hint">${L('Tap a badge for details. Press and hold (right-click on a computer) to hide one you can’t or don’t want to earn. Badges come from what’s already logged and are never shared with viewer keys or reports.', 'Touchez un badge pour les détails. Appuyez longuement (clic droit sur un ordinateur) pour masquer un badge que vous ne pouvez ou ne voulez pas obtenir. Les badges viennent de ce qui est déjà noté et ne sont jamais partagés avec les clés de lecture ni dans les rapports.')}</p>
    </div>
    <div class="card" style="margin-top:14px"><div class="card-head"><div><h2>${L('When they were earned', 'Quand ils ont été obtenus')}</h2><div class="sub">${L('Dated by when it happened in the log, not when the badge showed up.', 'Datés selon le moment noté dans le journal, pas selon l’apparition du badge.')}</div></div></div>
      <div class="chartbox" style="height:${Math.max(220, 26 * shown.filter(r => r.earned).length + 70)}px"><canvas id="chAchTimeline"></canvas></div>
      <div class="chartbox" style="height:200px;margin-top:10px"><canvas id="chAchCum"></canvas></div>
      ${ACH.ctx.loggers >= 2 ? `<h3 style="font-size:14px;margin:14px 0 4px">${L('Who logged it', 'Qui a noté')}</h3><div class="chartbox" style="height:200px"><canvas id="chAchWho"></canvas></div>` : ''}
    </div>`;
  achCharts(shown);
}
function achCharts(shown){
  if (!hasChart()) return;
  const got = shown.filter(r => r.earned), pts = got.flatMap((r, y) => r.tiers.map((t, i) => t.at == null ? null : { x: t.at / DAY, y, i, r }).filter(Boolean));
  if (!pts.length) { chartEmpty('chAchTimeline', L('<b>No badges yet</b>Keep logging: the first ones come quickly.', '<b>Pas encore de badges</b>Continuez à noter : les premiers viennent vite.')); chartEmpty('chAchCum', ''); }
  else {
    const xMin = Math.floor(Math.min(...pts.map(p => p.x))) - 1, xMax = Math.max(todayIdx(), Math.ceil(Math.max(...pts.map(p => p.x)))) + 1;
    mkChart('chAchTimeline', { type: 'scatter', data: { datasets: [{ data: pts, pointRadius: 7, pointHoverRadius: 9, pointBackgroundColor: pts.map(p => achTierColor(p.i)), pointBorderColor: cssVar('--panel'), pointBorderWidth: 1.5 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw.r.a.ic} ${L(...c.raw.r.a.n)} · ${achTierName(c.raw.i)} · ${achWhen(c.raw.x * DAY)}` } } },
        scales: { x: { min: xMin, max: xMax, ticks: { callback: v => fmtDayShort(Math.round(v)), maxTicksLimit: 7 } },
          y: { min: -.6, max: got.length - .4, reverse: true, ticks: { stepSize: 1, autoSkip: false, callback: v => { const r = got[v]; return r ? `${r.a.ic} ${L(...r.a.n)}` : ''; } }, grid: { display: false } } },
        onClick: (_e, els) => { const p = els[0] && pts[els[0].index]; if (p) achDetail(p.r.a.id); } } });
    const ats = pts.map(p => p.x).sort((a, b) => a - b), cum = ats.map((x, i) => ({ x, y: i + 1 }));
    cum.push({ x: Math.max(todayIdx() + .99, ats[ats.length - 1]), y: ats.length });
    mkChart('chAchCum', { type: 'line', data: { datasets: [{ data: cum, stepped: true, borderColor: cssVar('--accent'), backgroundColor: cssVar('--accent-soft'), fill: true, pointRadius: 0, borderWidth: 2 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => achWhen(c[0].raw.x * DAY), label: c => L(`${c.raw.y} tiers earned`, `${c.raw.y} paliers obtenus`) } } },
        scales: { x: { type: 'linear', min: xMin, max: xMax, ticks: { callback: v => fmtDayShort(Math.round(v)), maxTicksLimit: 7 } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: L('Tiers earned', 'Paliers obtenus') } } } } });
  }
  if (ACH.ctx.loggers >= 2 && $('#chAchWho')) {
    const n = new Map(); (DATA.allEvents || DATA.events).forEach(e => { const w = achBy(e) || L('Not signed', 'Non signé'); n.set(w, (n.get(w) || 0) + 1); });
    const rows = [...n].sort((a, b) => b[1] - a[1]);
    mkChart('chAchWho', { type: 'doughnut', data: { labels: rows.map(r => r[0]), datasets: [{ data: rows.map(r => r[1]), backgroundColor: rows.map((_, i) => KID_COLORS[(i + 2) % KID_COLORS.length]), borderColor: cssVar('--panel') }] },
      options: { cutout: '58%', plugins: { legend: { position: 'right' } } } });
  }
}

/** Details pop-up: what counts, every tier with its date, progress over time, hide / show. */
function achDetail(id){
  if (!ACH) computeAchievements();
  const r = ACH.list.find(x => x.a.id === id); if (!r) return;
  const p = achPopEl(), box = $('.achbox', p), nx = achNext(r), a = r.a, hidden = achHiddenSet().has(id);
  clearTimeout(achPopTimer); if (achPopDone) { const d = achPopDone; achPopDone = null; d(); }
  box.className = 'achbox detail';
  box.innerHTML = `<button class="btn icon ghost achx" data-achclose aria-label="${L('Close', 'Fermer')}">✕</button>
    <div class="achbig">${achRing(r, { size: 112, cls: 'big' })}<span class="ic">${a.ic}</span></div>
    <h3>${esc(L(...a.n))}</h3>
    <p class="muted" style="margin:2px 0 8px">${esc(L(...a.d))}</p>
    ${achPips(r, { nextGlow: true })}
    <div class="achnext">${nx.maxed ? L(`All ${r.tiers.length} tiers earned · ${achFmt(a, r.value)}`, `Les ${r.tiers.length} paliers obtenus · ${achFmt(a, r.value)}`) : L(`${achFmt(a, r.value)} so far · next tier at ${achFmt(a, nx.next)}`, `${achFmt(a, r.value)} jusqu’ici · prochain palier à ${achFmt(a, nx.next)}`)}${a.h && multiKid() ? ' · ' + L('whole household', 'toute la maisonnée') : ''}</div>
    <table class="dt achtiers"><tbody>${r.tiers.map((t, i) => `<tr class="${t.at != null ? 'got' : ''}"><td><i class="achdot" style="--pc:${achTierColor(i)}"></i>${esc(achTierName(i))}</td><td>${esc(achFmt(a, t.th))}</td><td>${t.at != null ? '✓ ' + esc(achWhen(t.at)) : `<span class="faint">${L('not yet', 'pas encore')}</span>`}</td></tr>`).join('')}</tbody></table>
    ${r.steps.length > 1 ? '<div class="chartbox" style="height:150px;margin-top:10px"><canvas id="achDetail"></canvas></div>' : ''}
    <div class="row" style="justify-content:center;gap:8px;margin-top:12px"><button class="btn sm" data-achhide="${a.id}">${hidden ? L('Show this badge again', 'Réafficher ce badge') : L('Hide this badge', 'Masquer ce badge')}</button></div>`;
  p.classList.add('on');
  if (r.steps.length > 1 && hasChart()) {
    const byDay = new Map(); r.steps.forEach(([at, v]) => byDay.set(Math.floor(at / DAY), v));
    const data = [...byDay].map(([d, v]) => ({ x: d, y: v })); data.push({ x: Math.max(todayIdx(), data[data.length - 1].x), y: r.value });
    const lines = r.tiers.filter(t => t.th <= r.value * 1.6 || t.at != null).map((t, i) => ({ value: t.th, color: achTierColor(i), dash: [4, 4], width: 1 }));
    mkChart('achDetail', { type: 'line', data: { datasets: [{ data, stepped: true, borderColor: cssVar('--accent'), pointRadius: 0, borderWidth: 2 }] },
      options: { plugins: { legend: { display: false }, guides: { lines }, tooltip: { callbacks: { title: c => fmtDayShort(c[0].raw.x), label: c => achFmt(a, c.raw.y) } } },
        scales: { x: { type: 'linear', ticks: { callback: v => fmtDayShort(Math.round(v)), maxTicksLimit: 5 } }, y: { beginAtZero: true, ticks: { callback: v => achFmtShort(a, v) } } } }, plugins: [guidesPlugin] });
  }
}

/* Grid gestures: tap → details, press and hold / right-click → hide or show. Wired once. */
(function wireAwards(){
  let timer = null, start = null, fired = false;
  const card = e => e.target.closest?.('#awardsRoot [data-ach]');
  const hideToggle = id => { const h = achToggleHidden(id); navigator.vibrate?.(15); toast(h ? L('Badge hidden. Find it under “Hidden”.', 'Badge masqué. Il est sous « Masqués ».') : L('Badge shown again.', 'Badge réaffiché.')); renderAwards(); };
  document.addEventListener('pointerdown', e => { const c = card(e); fired = false; if (!c || e.pointerType === 'mouse') return;
    start = [e.clientX, e.clientY]; timer = setTimeout(() => { timer = null; fired = true; hideToggle(c.dataset.ach); }, 550); }, { passive: true });
  document.addEventListener('pointermove', e => { if (timer && start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) { clearTimeout(timer); timer = null; } }, { passive: true });
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(timer); timer = null; }, { passive: true, capture: true }));
  document.addEventListener('contextmenu', e => { const c = card(e); if (!c) return; e.preventDefault(); if (!fired) hideToggle(c.dataset.ach); fired = false; });
  document.addEventListener('click', e => {
    const c = card(e); if (c) { if (fired) { fired = false; return; } achDetail(c.dataset.ach); return; }
    if (e.target.closest('#achSound')) { UI.achSound = UI.achSound === false; saveUI(); if (UI.achSound) achSfx('small'); renderAwards(); return; }
    if (e.target.closest('#achReplay')) { achReplay(); return; }
    const h = e.target.closest('[data-achhide]'); if (h) { hideToggle(h.dataset.achhide); achDetail(h.dataset.achhide); }
  });
})();
