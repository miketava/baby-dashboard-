/* ── Nights logged in pieces (v1.41) ──
   Notes turned into rows (e.g. by Gemini) sometimes split one night into sleep 20:00–23:10, restless 23:10–23:40,
   sleep 23:40–02:05, restless 02:05–02:30, sleep 02:30–06:40. The dashboard counts that correctly, but the timeline
   shows a broken night and bedtime / wake-up logic has to stitch it. The data check offers to merge such a night into
   ONE Sleep - Night from the first piece's start to the last piece's end; the restless rows stay as they are and are
   subtracted from sleep (v1.41), so the totals don't change. Only when every gap is a logged restless stretch (± 10 min)
   or under 5 minutes, so time nobody logged is never turned into sleep. */
const SPLIT_TOL = 10;
const kidOf = e => norm(e.raw?.child || '');
function splitNights(){
  const nights = DATA.events.filter(e => isNight(e) && e.t != null && !e.ongoing).sort((a, b) => a.s - b.s);
  const awake = DATA.events.filter(e => isAwake(e) && e.t != null), used = new Set(), out = [];
  const bridged = (a, b) => {   // is the gap between two pieces fully explained by logged restless stretches?
    const g0 = a.t, g1 = b.s; if (g1 < g0 - SPLIT_TOL || g1 - g0 > 240) return null;
    if (g1 - g0 <= 5) return [];
    const ws = awake.filter(x => kidOf(x) === kidOf(a) && x.t > g0 - SPLIT_TOL && x.s < g1 + SPLIT_TOL).sort((p, q) => p.s - q.s);
    let cur = g0, list = [];
    for (const x of ws) { if (x.s > cur + SPLIT_TOL) break; if (x.t > cur) { cur = x.t; list.push(x); } }
    return cur >= g1 - SPLIT_TOL && list.length ? list : null;
  };
  for (let i = 0; i < nights.length; i++) {
    if (used.has(nights[i])) continue;
    const chain = [nights[i]], rest = [];
    for (let j = i + 1; j < nights.length; j++) {
      const last = chain[chain.length - 1], nx = nights[j]; if (kidOf(nx) !== kidOf(last)) continue;
      if (nx.s - last.t > 240) break;
      const br = bridged(last, nx); if (!br) break;
      chain.push(nx); rest.push(...br);
    }
    if (chain.length > 1) { chain.forEach(e => used.add(e)); out.push({ pieces: chain, awake: rest, s: chain[0].s, t: chain[chain.length - 1].t }); }
  }
  return out;
}
function splitNightHTML(n, i){
  const piece = e => `${fmtTime(e.s % DAY)}–${fmtTime(e.t % DAY)}`;
  return `<div class="duppair"><div><b>${esc(fmtDay(n.pieces[0].d))}</b> · ${L(`${n.pieces.length} sleep pieces`, `${n.pieces.length} morceaux de sommeil`)}: ${n.pieces.map(piece).join(', ')}
    <div class="faint">${L(`${n.awake.length} restless stretch${n.awake.length === 1 ? '' : 'es'} between them`, `${n.awake.length} période${n.awake.length === 1 ? '' : 's'} agitée${n.awake.length === 1 ? '' : 's'} entre eux`)} → ${L('one', 'une')} Sleep - Night ${fmtTime(n.s % DAY)}–${fmtTime(n.t % DAY)}</div></div>
    ${viewOnly() ? '' : `<div class="row wrap"><button class="btn sm primary" data-splitmerge="${i}">🔗 ${L('Merge into one night', 'Fusionner en une nuit')}</button></div>`}</div>`;
}
async function mergeSplitNights(which){
  const all = splitNights(), list = which === 'all' ? all : [all[+which]].filter(Boolean); if (!list.length) return;
  const why = editBlock(list[0].pieces[0]); if (why) return toast(why, true);
  if (!confirm(L(`Merge ${list.length === 1 ? 'this night' : `these ${list.length} nights`} into one Sleep - Night each? The first piece is extended to the morning; the other sleep pieces are deleted from the Sheet. Restless rows stay, and sleep totals don't change.`,
    `Fusionner ${list.length === 1 ? 'cette nuit' : `ces ${list.length} nuits`} en un seul Sleep - Night chacune ? Le premier morceau est prolongé jusqu’au matin; les autres morceaux sont supprimés de la feuille. Les lignes agitées restent et les totaux de sommeil ne changent pas.`))) return;
  closeModals();
  const dels = [];
  for (const n of list) {
    const [first, ...others] = n.pieces, col = f => (DATA.source === 'live' && DATA.map?.[f]) || FIELD_CANON[f];
    const notes = n.pieces.map(e => String(e.notes || '').trim()).filter(Boolean), tags = [...new Set(n.pieces.flatMap(e => e.tags))];
    const row = { [col('end')]: fmtTime(n.t % DAY), [col('dur')]: n.t - n.s };
    if (notes.length > 1 || (notes.length && !first.notes)) row[col('notes')] = [...new Set(notes)].join(' · ');
    if (tags.length > first.tags.length) row[col('tags')] = tags.join(', ');
    if (!first.outcome) { const o = n.pieces.find(e => e.outcome)?.outcome; if (o) row[col('outcome')] = o; }
    await saveQuickOp('update', row, { rowNum: first.sheetRow, match: first.match, localId: first.local ? first.localId : null, batch: true });
    dels.push(...others);
  }
  for (const e of dels.sort((a, b) => (b.sheetRow ?? 0) - (a.sheetRow ?? 0)))   // bottom-up, so row numbers stay valid
    await saveQuickOp('delete', {}, { rowNum: e.sheetRow, match: e.match, localId: e.local ? e.localId : null, batch: true });
  if (S.endpoint) await syncLive({ quiet: true, skipFlush: true }); else reingest();
  toast(L(`${list.length} night${list.length > 1 ? 's' : ''} merged ✓`, `${list.length} nuit${list.length > 1 ? 's' : ''} fusionnée${list.length > 1 ? 's' : ''} ✓`));
}
