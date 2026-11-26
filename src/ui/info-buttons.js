/* ── Section descriptions behind ⓘ ──
   Subtitles that are instructions or legends (how to read a chart, what a column means) fold into an ⓘ button at the top right.
   Subtitles that carry numbers (counts, coverage, the current week) or live controls are marked data-keep and stay visible. */
const NO_FILTER_CARDS = ['#chGrowth', '#teethBox', '#medCard', '#vaxCard', '#allergyBox', '#trendCard', '#cocoonBox'];
(function infoButtons(){
  const FUNNEL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/></svg>';
  const fix = root => root.querySelectorAll?.('main .card-head').forEach(h => {
    // filter button on every section the filters apply to: not Today, and not the cards that always use their own window
    // (growth curves use every measurement, medications the last 30 days, cocooning its settling-in period…) — audited v1.25.3
    const card = h.closest('.card');
    if (!h.querySelector(':scope > .fbtn') && !h.closest('#v-today') && !(card && NO_FILTER_CARDS.some(sel => card.matches(sel) || card.querySelector(sel)))) {
      const f = document.createElement('button'); f.type = 'button'; f.className = 'fbtn'; f.innerHTML = FUNNEL + '<i></i>'; f.setAttribute('data-noi18n', '');
      f.onclick = e => { e.stopPropagation(); $('#filterbar').classList.toggle('open'); };
      h.appendChild(f); if (typeof syncFilterBtns === 'function') syncFilterBtns();
    }
    const sub = h.querySelector(':scope > div > .sub'); if (!sub || sub.hasAttribute('data-keep') || sub.classList.contains('sub-i')) return;
    sub.classList.add('sub-i');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ibtn'; b.textContent = 'i';
    b.title = L('About this section', 'À propos de cette section'); b.setAttribute('aria-label', b.title); b.setAttribute('data-noi18n', '');
    b.onclick = e => { e.stopPropagation(); h.closest('.card')?.classList.toggle('show-sub'); };
    h.appendChild(b);
  });
  fix(document);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && fix(n.parentElement || n)))).observe(document.querySelector('main') || document.body, { childList:true, subtree:true });
})();

/** Version in the header: tap for Settings → About & changes (the full changelog). */
function renderVerPill(){
  const b = $('#verPill'); if (!b) return;
  b.innerHTML = `v${esc(APP_VERSION)}`;
  b.title = L(`Dashboard v${APP_VERSION}${typeof SCRIPT_SEEN !== 'undefined' && SCRIPT_SEEN ? ` · Apps Script v${SCRIPT_SEEN}` : ''} — what’s new and the full changelog`, `Tableau de bord v${APP_VERSION}${typeof SCRIPT_SEEN !== 'undefined' && SCRIPT_SEEN ? ` · Apps Script v${SCRIPT_SEEN}` : ''} — nouveautés et historique complet`);
  b.setAttribute('aria-label', b.title);
}

/** Filter buttons: highlighted with a dot when anything is filtered; the tooltip says what. */
function syncFilterBtns(){
  const fb = $('#filterbar'), on = fb?.classList.contains('active'), sum = ($('#filterSummary')?.textContent || '').replace(/^·\s*/, '');
  $$('.fbtn').forEach(b => { b.classList.toggle('on', !!on); b.title = L('Filters', 'Filtres') + (sum ? ' · ' + sum : ''); b.setAttribute('aria-label', b.title); });
}

