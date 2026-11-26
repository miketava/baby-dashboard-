/* ════════════════════════════════════════════════════════════════════════════
   17. VIEW 4 — MILESTONES & HEALTH (Feature Set D)
   ════════════════════════════════════════════════════════════════════════════ */
const msEvents = days => visibleEvents(days).filter(e => e.k === 'milestone');
const hlEvents = days => visibleEvents(days).filter(e => e.k === 'medical' || e.k === 'incident');
const HL_TEST = { all: () => true, follow: e => e.outcome === 'Follow-up Needed', monitor: e => e.outcome === 'Monitor', resolved: e => e.outcome === 'Resolved' };
function feedLi(e){
  const col = catColor(e.cat);
  return `<li data-day="${e.d}" data-ev="${e.id}"><div class="ic" style="background:${col}22;color:${col}">${cat(e.cat).icon}</div><div>
    <div class="t">${esc(e.notes || e.cat)}</div>
    <div class="m">${fmtDay(e.d, { weekday:'short', month:'short', day:'numeric', year:'numeric' })}${e.st != null ? ' · ' + fmtTime(e.st) + (e.t != null ? '–' + fmtTime(e.t - e.d*DAY) : '') : ''} · ${esc(e.cat)} ${ocPill(e.outcome)} ${e.tags.map(t => `<span class="tagchip">${esc(t)}</span>`).join(' ')}</div></div></li>`;
}
function renderHealth(){
  const days = visibleDays();
  // Milestones feed with tag filter
  const ms = msEvents(days).sort((a,b) => b.s - a.s);
  const tags = [...new Set(ms.flatMap(e => e.tags))].sort();
  if (UI.msTag && !tags.includes(UI.msTag)) UI.msTag = '';
  $('#msTags').innerHTML = tags.length ? [`<span class="chip ${UI.msTag ? 'off' : ''}" data-mstag="">All</span>`, ...tags.map(t => `<span class="chip ${UI.msTag === t ? '' : 'off'}" data-mstag="${esc(t)}">${esc(t)}</span>`)].join('') : '';
  const msShown = ms.filter(e => !UI.msTag || e.tags.includes(UI.msTag));
  $('#msFeed').innerHTML = msShown.length ? msShown.map(feedLi).join('') : `<div class="empty"><b>No milestones in range</b>Log them with Category “Milestone” (Start Time can be blank) or via ＋ Quick Log.</div>`;
  // Health / appointments / incidents
  $$('#hlSeg button').forEach(b => b.classList.toggle('on', b.dataset.h === UI.hlFilter));
  const hl = hlEvents(days).sort((a,b) => b.s - a.s);
  const fu = hl.filter(HL_TEST.follow).length;
  $$('#hlSeg button')[1].textContent = `Follow-up needed${fu ? ' (' + fu + ')' : ''}`;
  const hlShown = hl.filter(HL_TEST[UI.hlFilter] || HL_TEST.all);
  $('#hlFeed').innerHTML = hlShown.length ? hlShown.map(feedLi).join('') : `<div class="empty">${UI.hlFilter === 'all' ? '<b>No medical or health entries in range</b>Use “Medical / Appointment” or “Health / Incident” categories.' : 'Nothing with this status in range.'}</div>`;
  renderGrowth(); renderTeeth(); renderTemps(days);
  // Care tracking
  const poops = DATA.events.filter(e => e.k === 'diaper' && /poop|dirty|bm|stool/i.test(e.cat));
  const hasCare = DATA.events.some(isCare);
  if (!hasCare) { $('#careBox').innerHTML = `<div class="empty">No Diaper or Meds rows yet — log “Diaper - Wet”, “Diaper - Poop” or “Meds” to track them here.</div>`; return; }
  const lastPoop = poops.length ? poops[poops.length-1] : null;
  const meds = visibleEvents(days).filter(e => e.k === 'meds').sort((a,b) => b.s - a.s);
  $('#careBox').innerHTML = `<div class="stat-row">
      <div class="stat-box"><div class="v">${lastPoop ? todayIdx() - lastPoop.d : '—'}</div><div class="k">days since last poop${lastPoop ? ' (' + fmtDayShort(lastPoop.d) + ')' : ''}</div></div>
      <div class="stat-box"><div class="v">${days.length ? (sum(days.map(d => d.poop)) / days.length).toFixed(1) : '—'}</div><div class="k">poops / day (range)</div></div>
      <div class="stat-box"><div class="v">${days.length ? (sum(days.map(d => d.wet)) / days.length).toFixed(1) : '—'}</div><div class="k">wet diapers / day logged</div></div>
      <div class="stat-box"><div class="v">${meds.length}</div><div class="k">meds entries in range</div></div></div>
    ${meds.length ? `<ul class="feed" style="margin-top:8px">${Object.values(meds.reduce((g, e) => { const k = norm(e.notes || e.cat); (g[k] ||= []).push(e); return g; }, {})).slice(0, 15).map(g => g.length === 1 ? feedLi(g[0])
      : `<li data-day="${g[0].d}" data-ev="${g[0].id}"><div class="ic" style="background:${catColor(g[0].cat)}22">${cat(g[0].cat).icon}</div><div><div class="t">${esc(g[0].notes || g[0].cat)} <span class="pill">× ${g.length}</span></div><div class="m">${fmtDayShort(g[g.length-1].d)} – ${fmtDayShort(g[0].d)} · last ${fmtDay(g[0].d)}${g[0].st != null ? ' ' + fmtTime(g[0].st) : ''}</div></div></li>`).join('')}</ul>` : ''}
    ${(() => { const inR = poops.filter(e => days.some(d => d.D === e.d)), c = {}; inR.forEach(e => { const k = STOOL_KEYS.find(x => e.tags.includes(x)); if (k) c[k] = (c[k] || 0) + 1; });
      const n = Object.values(c).reduce((a, b) => a + b, 0); if (!n) return inR.length ? `<p class="hint">${L('Tip: tag poops Hard / Formed / Loose / Watery in Quick Log to track consistency here.', 'Astuce : indiquez Dures / Moulées / Molles / Liquides dans l’ajout rapide pour suivre la consistance ici.')}</p>` : '';
      const wk = poops.filter(e => e.d > todayIdx() - 7), hard7 = wk.filter(e => e.tags.includes('hard')).length, wat7 = wk.filter(e => e.tags.includes('watery')).length;
      return `<div class="stool-bar">${STOOL().map(([k, nm, d]) => c[k] ? `<span class="st-${k}" style="flex:${c[k]}" title="${esc(d)}">${stoolIcon(k, 18).replace('fill=', 'data-f=')} ${esc(nm)} ${c[k]}</span>` : '').join('')}</div>
        <p class="hint">${L(`Consistency of ${n} of ${inR.length} poops in range (BITSS groups).`, `Consistance de ${n} des ${inR.length} selles de la période (groupes BITSS).`)}${hard7 >= 2 ? ' ' + L(`${hard7} hard in the last 7 days.`, `${hard7} dures dans les 7 derniers jours.`) : ''}${wat7 >= 2 ? ' ' + L(`${wat7} watery in the last 7 days.`, `${wat7} liquides dans les 7 derniers jours.`) : ''}${hard7 >= 2 || wat7 >= 2 ? ' ' + L('Worth mentioning to your pediatrician if it continues.', 'À mentionner au pédiatre si ça continue.') : ''}</p>`; })()}
    ${diaperChartHTML(days)}${(() => { const tags = {}; DATA.events.filter(e => e.k === 'diaper' && days.some(d => d.D === e.d)).forEach(e => e.tags.forEach(x => tags[x] = (tags[x] || 0) + 1)); const l = Object.entries(tags).sort((a, b) => b[1] - a[1]); return l.length ? `<p class="hint">Diaper notes in range: ${l.map(([k, c]) => esc(k) + ' × ' + c).join(' · ')}</p>` : ''; })()}
    <div class="hint">Turn on <b>Diaper &amp; meds</b> in the timeline toolbar to overlay these events on the 24-hour grid.</div>`;
  renderDiaperChart(days);
}
function milestonesText(){
  const ms = msEvents(visibleDays()).filter(e => !UI.msTag || e.tags.includes(UI.msTag)).sort((a,b) => a.s - b.s);
  return `${S.title || 'Baby'} — Milestones\n` + ms.map(e => `• ${fmtDay(e.d, { month:'short', day:'numeric', year:'numeric' })} — ${e.notes || e.cat}${e.tags.length ? ' (' + e.tags.join(', ') + ')' : ''}`).join('\n');
}
