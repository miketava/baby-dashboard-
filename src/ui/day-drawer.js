/* ════════════════════════════════════════════════════════════════════════════
   13. DAY DRAWER (click-to-inspect)
   ════════════════════════════════════════════════════════════════════════════ */
let drawerDay = null, drawerEv = null;
function openDrawer(D, evId=null){ drawerDay = D; drawerEv = evId; renderDrawer(); $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); }
function closeDrawer(){ drawerDay = null; $('#drawer').classList.remove('on'); if (!$('.modal.on') && !$('.sheet.on')) $('#scrim').classList.remove('on'); }
function renderDrawer(){ setTimeout(syncDrawerArrows, 0);
  const m = DAYS.get(drawerDay); if (!m) return closeDrawer();
  $('#drTitle').textContent = fmtDay(m.D, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  $('#drPills').innerHTML = dayPills(m) + `<span class="pill" title="Template used for targets">${esc((m.tpl?.name || '') + shiftNote(m.tpl))}</span>`;
  const tb = targetBed(m), bo = bedOff(m, m.bed);
  const tot = [
    ['Wake-up', fmtTime(m.wake)], ['Bedtime', m.bed != null ? fmtTime(m.bed) + (bo != null && bo > 30 ? ' ⚠' : '') : '—'],
    ['Naps', `${m.napCount} · ${fmtDur(m.daySleep)}`], ['Last nap end', fmtTime(m.lastNapEnd)],
    ['Final wake window', fmtDur(m.wwFinal)], ['Overnight awake', fmtDur(m.overnightAwake) + (m.wakings ? ' · ' + plural(m.wakings, 'waking', 'wakings', 'réveil', 'réveils') : '')],
    ['Night sleep', fmtDur(m.nightSleep)], ['24h sleep', fmtDur(m.total24) + (m.complete24 ? '' : '*')],
    ['Milk', fmtOz(m.milk)], ['Water', fmtMl(m.water)],
    ['Bedtime effort', m.effort != null ? fmtDur(m.effort) + (m.firstTry === false ? ' · woke' : '') : '—'], ['Bath', m.bath ? 'Yes 🛁' : L('No', 'Non')],
  ];
  const hid = hiddenSet();
  const carry = DATA.events.filter(e => e.t != null && e.d < m.D && e.t > m.D*DAY && !hid.has(e.cat));
  const own = m.evs.filter(e => !hid.has(e.cat)).sort((a,b) => (a.allDay ? -1 : 0) - (b.allDay ? -1 : 0) || a.s - b.s);
  const li = (e, cont) => evLi(e, m.D, cont, drawerEv);
  const sc = m.score, W = S.score.weights;
  const partsHTML = sc ? `<div class="row sp" style="margin-bottom:6px"><b>Routine score</b><span style="font-size:20px;font-weight:750;color:${scoreCol(sc.score)}">${sc.score ?? '—'}${sc.score != null ? '<span class="faint" style="font-size:12px"> / 100' + (sc.partial ? ' ' + L('so far', 'jusqu’ici') : '') + '</span>' : ''}</span></div>
    <div class="parts">${SCORE_PARTS.map(([k, l]) => { const p = sc.parts[k]; return `<div class="pr"><div>${l} <span class="faint">· ${esc(p.detail)}${+W[k] ? '' : ' · weight 0'}</span>${!+W[k] ? '' : pipsHTML(p.v, +W[k])}</div><div style="text-align:right;font-weight:650;white-space:nowrap">${p.v == null ? '<span class="faint">n/a</span>' : `${+(p.v * W[k]).toFixed(1)}<span class="faint" style="font-weight:500"> / ${W[k]}</span>`}</div></div>`; }).join('')}</div>
    ${sc.score == null ? '<div class="hint" style="margin:-8px 0 12px">Needs at least 3 scored components.</div>' : ''}<div class="row wrap" style="gap:4px;margin-bottom:12px">${iconsHTML(m, 12)}</div>` : '';
  $('#drBody').innerHTML = partsHTML + `<div class="totals">${tot.map(([k,v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
    <div class="hint" style="margin:-6px 0 12px">Night metrics refer to the night ${+S.dayBoundary > 0 ? 'after' : 'before'} this day (day boundary ${fmtTime(+S.dayBoundary)}).${m.complete24 ? '' : ' *24h sleep is partial — missing the adjoining night.'}</div>
    <ul class="evlist">${carry.map(e => li(e, true)).join('')}${own.map(e => li(e, false)).join('')}</ul>`;
  const hit = $('#drBody li.hit'); if (hit) hit.scrollIntoView({ block:'center' });
}
/* v1.24.4 — Day panel: previous / next day in calendar order (first logged day … today), with a slide animation.
   ‹ › buttons, ← → keys and, on phones, swiping left (next day) or right (previous day). */
const drawerDays = () => [...DAYS.keys()].filter(d => d <= todayIdx()).sort((a, b) => a - b);
function drawerEdge(){ const ds = drawerDays(), i = ds.indexOf(drawerDay); return { ds, i, first: i <= 0, last: i < 0 || i >= ds.length - 1 }; }
function syncDrawerArrows(){ const e = drawerEdge(); $('#drPrev').disabled = e.first; $('#drNext').disabled = e.last; }
let drAnimating = false;
function goDrawerDay(dir, { fromDrag = 0 } = {}){
  const body = $('#drBody'), head = $('#drawer header .grow'), e = drawerEdge();
  if (e.i < 0 || drAnimating) return;
  const reset = () => { body.style.transition = ''; body.style.transform = ''; body.style.opacity = ''; };
  if ((dir < 0 && e.first) || (dir > 0 && e.last)) {   // at the first day / today: a small bounce instead
    reset(); body.animate([{ transform: `translateX(${fromDrag}px)` }, { transform: `translateX(${-dir * 18}px)` }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' });
    toast(dir > 0 ? L('That’s today — no later day yet', 'C’est aujourd’hui — pas de jour suivant') : L('That’s the first day logged', 'C’est le premier jour noté')); return;
  }
  drAnimating = true;
  const w = body.offsetWidth || 360, out = dir > 0 ? -w : w;
  const a1 = [body, head].map(el => el.animate([{ transform: `translateX(${el === body ? fromDrag : 0}px)`, opacity: 1 }, { transform: `translateX(${out * (el === body ? 1 : .35)}px)`, opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'forwards' }));
  a1[0].onfinish = () => {
    reset(); drawerEv = null; drawerDay = e.ds[e.i + dir]; renderDrawer(); body.scrollTop = 0;
    a1.forEach(a => a.cancel());
    [body, head].forEach(el => el.animate([{ transform: `translateX(${-out * (el === body ? .6 : .35)}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    setTimeout(() => { drAnimating = false; }, 230);
  };
}

