/* ════════════════════════════════════════════════════════════════════════════
   16. VIEW 3 — NUTRITION & HYDRATION (Feature Sets B + C)
   ════════════════════════════════════════════════════════════════════════════ */
const ACC = [['Ate Well','#10b981'], ['Partial','#f59e0b'], ['Refused','#ef4444'], ['Unrated','#94a3b8']];
/** All meal rows → per-food stats {food, n, acc{}, first, last, meals:Set, isNew, events[]} */
function foodStats(events){
  const map = new Map();
  for (const e of events) {
    if (!isMeal(e)) continue;
    const acc = acceptanceOf(e), isNew = isNewFood(e);
    for (const f of foodsOf(e)) {
      if (!map.has(f)) map.set(f, { food:f, n:0, acc:{ 'Ate Well':0, Partial:0, Refused:0, Unrated:0 }, first:e.d, last:e.d, meals:new Set(), isNew:false, events:[] });
      const s = map.get(f); s.n++; s.acc[acc]++; s.first = Math.min(s.first, e.d); s.last = Math.max(s.last, e.d); s.meals.add(e.cat); s.events.push(e); if (isNew) s.isNew = true;
    }
  }
  return [...map.values()];
}
function renderNutrition(){
  const days = visibleDays(), t = T(), hid = hiddenSet();
  renderFeeding(days);
  $('#milkSub').textContent = `Ounces per day by feeding occasion (relative to that day's naps) · line = 7-day rolling average · band = ${t.milkMin}–${t.milkMax} oz target`;
  if (!days.length) { ['chMilk','chMilkHour','chFluids','chMeals'].forEach(id => chartEmpty(id, '<b>No days in range</b>')); ['#bathBox','#lateBox','#foodBoard','#newFoods'].forEach(s => $(s).innerHTML = emptyState()); return; }
  if (hasChart()) chartBase();
  const labels = days.map(dayLabel);
  const milkHidden = [...CATS.values()].filter(c => c.kind === 'milk').every(c => hid.has(c.name)) && [...CATS.values()].some(c => c.kind === 'milk');
  if (milkHidden) { chartEmpty('chMilk', '<b>Milk is hidden</b>Turn the Milk category back on in the filter bar.'); chartEmpty('chMilkHour', '<b>Milk is hidden</b>'); }
  else {
    const wc = { Morning:'#bae6fd', 'Nap 1':'#7dd3fc', 'Nap 2':'#38bdf8', Bedtime:'#0284c7', Overnight:'#1e3a8a', Untimed:'#94a3b8' };
    const wins = Object.keys(wc).filter(w => w !== 'Untimed' || days.some(d => d.milkWin.Untimed));
    const roll = days.map(d => mean([...Array(7)].map((_, i) => DAYS.get(d.D - i)?.milk)));
    mkChart('chMilk', { type:'bar', data:{ labels, datasets: [
        ...wins.map(w => ({ label: w === 'Nap 1' ? 'Around Nap 1' : w === 'Nap 2' ? 'Around Nap 2' : w, data: days.map(d => d.milk == null ? null : toDisp(d.milkWin[w]) || null), backgroundColor: wc[w], stack:'m', borderRadius:3, order:2 })),
        { type:'line', label:'7-day avg', data: roll.map(v => v == null ? null : toDisp(v)), borderColor: cssVar('--text'), backgroundColor: cssVar('--text'), borderWidth:2, pointRadius:2, tension:.3, order:1 } ] },
      options:{ scales:{ x:{ stacked:true, grid:{ display:false } }, y:{ stacked:true, beginAtZero:true, suggestedMax: toDisp(t.milkMax + 3), title:{ display:true, text:MU() } } },
        plugins:{ tooltip:{ mode:'index', callbacks:{ footer: items => 'Total: ' + fmtOz(fromDisp(sum(items.filter(i => i.dataset.stack).map(i => i.raw)))) } },
          guides:{ bands:[{ from:toDisp(t.milkMin), to:toDisp(t.milkMax), color: document.documentElement.dataset.theme === 'dark' ? 'rgba(52,211,153,.10)' : 'rgba(16,185,129,.10)', label:`Target ${fmtOz(t.milkMin)}–${fmtOz(t.milkMax)}`, text:cssVar('--good') }] } } },
      plugins:[guidesPlugin] });
    const md = days.filter(d => d.milk != null);
    const hrs = [...Array(24)].map((_, h) => md.length ? sum(md.map(d => d.milkHours[h])) / md.length : 0);
    mkChart('chMilkHour', { type:'bar', data:{ labels: [...Array(24)].map((_, h) => pad(h)), datasets:[{ label:'Avg ' + MU(), data: hrs.map(v => metric() ? Math.round(v * OZ_ML) : +v.toFixed(2)), backgroundColor: [...Array(24)].map((_, h) => h >= 22 || h < 5 ? '#1e3a8a' : h >= 17 ? '#0284c7' : '#38bdf8'), borderRadius:3 }] },
      options:{ plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ title: c => `${c[0].label}:00–${c[0].label}:59`, label: c => `${c.raw} ${MU()} per day on average` } } }, scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, title:{ display:true, text:MU() + ' / day' } } } } });
  }
  // Total fluids
  const hasWater = days.some(d => d.water != null);
  mkChart('chFluids', { type:'bar', data:{ labels, datasets:[
      { label:'Milk (ml)', data: days.map(d => d.milk == null ? null : Math.round(d.milk * OZ_ML)), backgroundColor:'#38bdf8', stack:'f', borderRadius:3 },
      ...(hasWater ? [{ label:'Water (ml)', data: days.map(d => d.water), backgroundColor:'#2dd4bf', stack:'f', borderRadius:3 }] : []) ] },
    options:{ scales:{ x:{ stacked:true, grid:{ display:false } }, y:{ stacked:true, beginAtZero:true, title:{ display:true, text:'ml' } } },
      plugins:{ tooltip:{ mode:'index', callbacks:{ footer: items => 'Total fluids: ' + fmtMl(sum(items.map(i => i.raw))) } }, guides:{ lines: t.waterMl > 0 ? [] : [] },
        subtitle:{ display:!hasWater, text:'No Water (ml) values logged yet — add column H to the sheet to track hydration', color:cssVar('--faint'), padding:{ bottom:6 } } } }, plugins:[guidesPlugin] });

  // Late / overnight milk → 00:30–03:00 wake-ups
  $('#lateSub').textContent = 'Feeds 21:00–00:30 (not during a wake-up) vs. a wake-up starting 00:30–03:00 the same night';
  const nights = days.filter(d => d.nightKnown);
  const withF = nights.filter(d => d.lateFeed), without = nights.filter(d => !d.lateFeed);
  const pct = a => a.length ? Math.round(a.filter(d => d.earlyWake).length / a.length * 100) + '%' : '—';
  const diap = days.some(d => d.nightDiapers);
  $('#lateBox').innerHTML = nights.length ? `<div class="stat-row">
      <div class="stat-box"><div class="v">${pct(withF)}</div><div class="k">nights <b>with</b> a late feed had a 00:30–03:00 wake-up (${withF.filter(d => d.earlyWake).length}/${withF.length})</div></div>
      <div class="stat-box"><div class="v">${pct(without)}</div><div class="k">nights <b>without</b> one did (${without.filter(d => d.earlyWake).length}/${without.length})</div></div>
      ${diap ? `<div class="stat-box"><div class="v">${(mean(nights.map(d => d.nightDiapers)) || 0).toFixed(1)}</div><div class="k">overnight diaper changes per night</div></div>` : ''}
    </div><div class="hint">${withF.length && without.length ? (parseInt(pct(withF)) > parseInt(pct(without)) + 15 ? 'Late feeds are followed by early-night wake-ups more often in this range.' : parseInt(pct(withF)) + 15 < parseInt(pct(without)) ? 'Late feeds seem to go with fewer early-night wake-ups in this range.' : 'No clear difference yet.') : 'Need nights both with and without late feeds to compare.'} Small samples are noisy.</div>` : emptyState();

  // Bath cadence
  const lastData = dataSpan()[1];
  const allBathDays = [...DAYS.values()].filter(d => d.bath).map(d => d.D).sort((a,b) => a-b);
  const lastBath = allBathDays.filter(D => D <= lastData).pop();
  const since = lastBath == null ? null : Math.min(todayIdx(), lastData + 1) - lastBath;
  const inRange = days.filter(d => d.bath).map(d => d.D);
  const avgGap = mean(inRange.slice(1).map((D,i) => D - inRange[i]));
  $('#bathSub').textContent = `Target: every ${t.bathMin}–${t.bathMax} nights`;
  const status = since == null ? '' : since > t.bathMax ? `<span class="pill split">Bath overdue</span>` : since >= t.bathMin ? `<span class="pill warn" style="cursor:default">Bath due tonight</span>` : `<span class="pill live">On track</span>`;
  $('#bathBox').innerHTML = `<div class="bigstat">
      <div><div class="v">${since == null ? '—' : since}</div><div class="k">night${since === 1 ? '' : 's'} since last bath ${status}</div></div>
      <div><div class="v">${avgGap == null ? '—' : avgGap.toFixed(1)}</div><div class="k">avg nights between baths</div></div>
      <div><div class="v">${inRange.length}</div><div class="k">baths in range</div></div></div>
    <div class="bath-grid">${days.map(d => `<div class="${d.bath ? 'y' : ''}" title="${fmtDay(d.D)}${d.bath ? ' — bath' : ''}"><span>${idxDate(d.D).getUTCDate()}</span>${d.bath ? '🛁' : ''}</div>`).join('')}</div>
    <div class="hint">${lastBath != null ? L('Last bath: ', 'Dernier bain : ') + fmtDay(lastBath) + '. ' : ''}${avgGap != null ? (avgGap < t.bathMin ? L('Bathing more often than target.', 'Bains plus fréquents que la cible.') : avgGap > t.bathMax ? L('Bathing less often than target.', 'Bains moins fréquents que la cible.') : L('Cadence is within target.', 'La fréquence respecte la cible.')) : ''}</div>`;

  // Food frequency & acceptance board
  const evs = visibleEvents(days);
  const stats = foodStats(evs).sort((a,b) => b.n - a.n || a.food.localeCompare(b.food));
  const fq = (UI.foodQ || '').toLowerCase(); $('#foodSearch').value = UI.foodQ || '';
  const shown = stats.filter(s => !fq || s.food.includes(fq)).slice(0, 40);
  $('#foodBoard').innerHTML = shown.length ? `<div class="tbl-wrap" style="max-height:420px"><table class="dt"><thead><tr><th>Food</th><th>Offered</th><th style="min-width:160px">Acceptance</th><th>Ate well</th><th>Partial</th><th>Refused</th><th>Meals</th><th>Last seen</th></tr></thead><tbody>${
    shown.map(s => { const rated = s.n - s.acc.Unrated; const score = rated ? Math.round((s.acc['Ate Well'] + .5*s.acc.Partial) / rated * 100) : null;
      return `<tr data-food="${esc(s.food)}"><td><b>${esc(s.food)}</b>${s.isNew ? ' <span class="pill out">new</span>' : ''}${allergenOf(s.food) ? ` <span class="faint" title="${allergenOf(s.food)} allergen group">⚠</span>` : ''}</td><td>${s.n}</td>
        <td><div class="sbar" title="${ACC.map(([k]) => k + ': ' + s.acc[k]).join(' · ')}">${ACC.map(([k, c]) => s.acc[k] ? `<i style="width:${s.acc[k]/s.n*100}%;background:${c}"></i>` : '').join('')}</div><span class="faint" style="font-size:11px">${score == null ? 'unrated' : score + '% accepted'}</span></td>
        <td class="${s.acc['Ate Well'] ? 'g' : ''}">${s.acc['Ate Well']}</td><td>${s.acc.Partial}</td><td class="${s.acc.Refused ? 'b' : ''}">${s.acc.Refused}</td><td class="faint">${[...s.meals].join(', ')}</td><td>${fmtDayShort(s.last)}</td></tr>`; }).join('')
  }</tbody></table></div><div class="hint">${stats.length} foods in range · ${ACC.map(([k,c]) => `<span style="color:${c}">■</span> ${k}`).join(' ')} · Tip: list foods in the Tags column (e.g. “eggs, raspberries”) for the most accurate board; extra keywords can be added in Settings → Foods.</div>` : `<div class="empty"><b>No foods found</b>Add foods to the Tags column of meal rows (e.g. “eggs, toast”) or mention them in Notes.</div>`;

  // Meal timing stability (strip plot + late-dinner highlight)
  const lateDin = parseTime(t.lateDinner) ?? 1095;
  $('#mealSub').textContent = `Start time of each meal across days · dinners after ${t.lateDinner} in red`;
  const mealCats = [...new Set(DATA.events.filter(isMeal).map(e => e.cat))].filter(c => !hid.has(c));
  const ord = ['Breakfast','Lunch','Snack','Dinner']; mealCats.sort((a,b) => (ord.indexOf(a)+1 || 9) - (ord.indexOf(b)+1 || 9));
  if (!mealCats.length) { chartEmpty('chMeals', '<b>No meals in range</b>'); $('#mealHint').textContent = ''; }
  else {
    mkChart('chMeals', { type:'scatter', data:{ datasets: mealCats.map(c => { const pts = days.flatMap((d,i) => d.evs.filter(e => e.cat === c && e.st != null && qMatch(e)).map(e => ({ x:i, y:e.st, e })));
        return { label:c, data: pts, backgroundColor: pts.map(p => /dinner|supper/i.test(c) && p.y > lateDin ? cssVar('--bad') : catColor(c)), pointRadius:6, pointHoverRadius:8, pointStyle:'rectRounded' }; }) },
      options:{ scales:{ x:{ min:-0.5, max: days.length - 0.5, ticks:{ stepSize:1, callback: v => Number.isInteger(v) && labels[v] ? labels[v] : '' }, grid:{ display:false } },
          y:{ reverse:true, suggestedMin: 360, suggestedMax: 1200, ticks:{ stepSize:120, callback: hhmmTick } } },
        plugins:{ tooltip:{ callbacks:{ label: c => `${c.dataset.label} ${fmtTime(c.raw.y)} — ${fmtDay(days[c.raw.x].D)}${c.raw.e.notes ? ' · ' + c.raw.e.notes : ''}` } },
          guides:{ lines:[{ value: lateDin, color: cssVar('--bad'), dash:[4,3], label:'Late dinner > ' + t.lateDinner }] } } }, plugins:[guidesPlugin] });
    const spread = mealCats.map(c => { const v = days.flatMap(d => d.evs.filter(e => e.cat === c && e.st != null).map(e => e.st)); if (v.length < 2) return null;
      return `<b>${esc(c)}</b> median ${fmtTime(median(v))}, spread ${fmtDur(Math.max(...v) - Math.min(...v))}`; }).filter(Boolean).join(' · ');
    const late = days.filter(d => d.dinnerStart != null && d.dinnerStart > lateDin && d.bed != null), onTime = days.filter(d => d.dinnerStart != null && d.dinnerStart <= lateDin && d.bed != null);
    $('#mealHint').innerHTML = spread + (late.length && onTime.length ? `<br>Late-dinner days: bedtime averaged <b>${fmtTime(mean(late.map(d => d.bed)))}</b> vs ${fmtTime(mean(onTime.map(d => d.bed)))} otherwise (${late.length} late dinner${late.length>1?'s':''}).` : late.length ? `<br>${late.length} late dinner${late.length>1?'s':''} in range.` : '');
  }

  // New foods & allergen log (all-time first appearance)
  $('#newOnly').checked = !!UI.newOnly;
  const all = foodStats(DATA.events).filter(s => !UI.newOnly || s.isNew).sort((a,b) => b.first - a.first || a.food.localeCompare(b.food));
  $('#newFoods').innerHTML = all.length ? `<table class="dt"><thead><tr><th>First seen</th><th>Food</th><th>Times</th><th>Reaction</th><th>Allergen group</th></tr></thead><tbody>${
    all.map(s => { const first = s.events.sort((a,b) => a.s - b.s)[0]; const al = allergenOf(s.food);
      return `<tr class="clickable" data-day="${first.d}" data-ev="${first.id}"><td>${fmtDayShort(s.first)}</td><td><b>${esc(s.food)}</b>${s.isNew ? ' <span class="pill out">new</span>' : ''}</td><td>${s.n}</td><td>${ocPill(acceptanceOf(first) === 'Unrated' ? '' : acceptanceOf(first))}</td><td class="${al ? 'w' : ''}">${al ? '⚠ ' + al : ''}</td></tr>`; }).join('')
  }</tbody></table>` : `<div class="empty">${UI.newOnly ? 'No foods tagged “new-food” yet.' : 'No foods logged yet.'}</div>`;
}
const allergenOf = food => (ALLERGENS.find(([, re]) => re.test(food)) || [])[0] || '';

