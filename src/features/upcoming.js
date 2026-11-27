/* ── Upcoming visits & appointments as a calendar strip (v1.40) ──
   One line per kind (🚗 parent visits · 🏠 home visits · 🩺 appointments): today's date, then up to the next three, each a
   small calendar page, with the gap in days between them on the arrows. Tap a page for the details below the strip. */
let UP_ITEMS = [];
const calMonth = D => new Date(isoOf(D) + 'T12:00:00').toLocaleDateString(S.lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short' }).replace('.', '');
const calPage = (D, cls, i) => `<button type="button" class="ucal ${cls}"${i != null ? ` data-up="${i}"` : ' disabled'} aria-label="${esc(fmtDay(D))}"><span class="m">${esc(calMonth(D))}</span><span class="d">${+isoOf(D).slice(8)}</span></button>`;
function upRowHTML(icon, label, list){
  const T0 = todayIdx(), ev = list.slice(0, 3); let prev = T0, html = '';
  const onToday = ev.find(e => e.D === T0);
  html += calPage(T0, `today${onToday ? ' has' : ''}`, onToday ? UP_ITEMS.push(onToday) - 1 : null);
  ev.filter(e => e !== onToday).forEach(e => { const d = e.D - prev; prev = e.D;
    html += `<span class="ugap"><small>${d ? d + L('d', 'j') : L('same', 'même')}</small>→</span>${calPage(e.D, '', UP_ITEMS.push(e) - 1)}`; });
  return `<div class="urow" title="${esc(label)}"><span class="uic" aria-label="${esc(label)}">${icon}</span>${html}${ev.length ? '' : `<span class="faint unone">${L('none in the next 60 days', 'aucune d’ici 60 jours')}</span>`}</div>`;
}
/** The strip for Today's plan; '' when the calendar isn't connected. */
function upcomingStripHTML(m){
  if (!Array.isArray(DATA.base?.planned)) return '';
  UP_ITEMS = [];
  const visits = upcomingVisits(3).filter(v => v.D !== todayIdx() || m.visit).map(v => ({ ...v, kind: 'visit' }));
  const ua = upcomingAppts(8), home = ua.filter(a => a.home).map(a => ({ ...a, kind: 'home' })), appt = ua.filter(a => !a.home).map(a => ({ ...a, kind: 'appt' }));
  const rows = [upRowHTML('🚗', L('Parent visits', 'Visites des parents'), visits)];
  if (home.length) rows.push(upRowHTML('🏠', L('Home visits', 'Visites à domicile'), home));
  if (appt.length || !home.length) rows.push(upRowHTML('🩺', L('Appointments', 'Rendez-vous'), appt));
  return `<div class="upstrip">${rows.join('')}<div class="upop" id="upPop" hidden></div></div>`;
}
function showUpcoming(i, btn){
  const e = UP_ITEMS[i], pop = $('#upPop'); if (!e || !pop) return;
  if (!pop.hidden && pop.dataset.i === String(i)) { pop.hidden = true; btn.classList.remove('sel'); return; }
  $$('.ucal.sel').forEach(b => b.classList.remove('sel')); btn.classList.add('sel');
  const kind = { visit: ['🚗', L('Parent visit', 'Visite des parents')], home: ['🏠', L('Home visit', 'Visite à domicile')], appt: ['🩺', L('Appointment', 'Rendez-vous')] }[e.kind];
  const dur = e.en != null ? e.en - e.st : null, link = e.where && /^https?:/i.test(e.where) ? e.where : null;
  const mapq = e.where && !link ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.where)}` : null;
  pop.dataset.i = i; pop.hidden = false;
  pop.innerHTML = `<div class="uph">${kind[0]} <b>${esc(e.title || kind[1])}</b></div>
    <div>📅 <b>${esc(relDay(e.D))}</b> · ${esc(fmtDay(e.D))}</div>
    <div>🕒 ${fmtTime(e.st)}${e.en != null ? '–' + fmtTime(e.en) : ''}${dur > 0 ? ` <span class="faint">(${fmtDur(dur)})</span>` : ''}</div>
    ${e.where ? `<div>📍 ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(e.where)}</a>` : `<a href="${mapq}" target="_blank" rel="noopener">${esc(e.where)}</a>`}</div>` : ''}
    ${e.desc ? `<div class="faint">${esc(e.desc)}</div>` : ''}
    <div class="faint">${e.kind === 'visit' ? L('From your calendar (only the date and times are read for visits).', 'De votre agenda (seuls la date et les heures sont lus pour les visites).') : `${L('Calendar', 'Agenda')}: ${esc(e.calendar || '—')}`}</div>`;
}
