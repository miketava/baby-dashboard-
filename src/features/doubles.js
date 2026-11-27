/* ── Double entries (v1.33) ──
   Two caregivers logging the same thing a few minutes apart (“Dinner 17:45”, each with their own notes) used to be
   treated as a duplicate and one copy was hidden. Now a copy is hidden only when it adds nothing; otherwise both are
   kept and offered here to merge (notes joined with who wrote them, tags combined, empty fields filled) or keep apart. */
const dblSig = e => [isoOf(e.d), e.cat, e.st ?? '', norm(e.notes).slice(0, 40)].join('|');
const dblKey = ([x, y]) => [dblSig(x), dblSig(y)].sort().join(' + ');
/** [[later, first, 'double', index in DATA.dups]] still to decide. */
const doubles = () => (DATA.dups || []).map((p, i) => [...p, i]).filter(p => p[2] === 'double' && !(S.dupKeep || []).includes(dblKey(p)));
const byOf = e => String(e.raw?.by || '').trim();
const colOf = f => (DATA.source === 'live' && DATA.map?.[f]) || FIELD_CANON[f];
function mergedRow(first, later){
  const row = {}, a = first, b = later, ba = byOf(a), bb = byOf(b), named = ba && bb && ba !== bb;
  const na = String(a.notes || '').trim(), nb = String(b.notes || '').trim();
  if (nb && !norm(na).includes(norm(nb))) row[colOf('notes')] = named ? (na ? `${ba}: ${na}\n${bb}: ${nb}` : `${bb}: ${nb}`) : (na ? `${na}\n${nb}` : nb);
  const pa = a.priv || '', pb = b.priv || '';
  if (pb && !norm(pa).includes(norm(pb))) row[colOf('priv')] = named ? (pa ? `${ba}: ${pa}\n${bb}: ${pb}` : `${bb}: ${pb}`) : (pa ? `${pa}\n${pb}` : pb);
  const tags = [...a.tags, ...b.tags.filter(t => !a.tags.includes(t))];
  if (tags.length > a.tags.length) row[colOf('tags')] = tags.join(', ');
  if (b.outcome && !a.outcome) row[colOf('outcome')] = b.outcome;
  else if (b.outcome && b.outcome !== a.outcome) row[colOf('notes')] = (row[colOf('notes')] ?? na) + `\n(${bb || L('other entry', 'autre entrée')}: ${b.outcome})`;
  for (const f of ['end', 'milk', 'water', 'value', 'asleep']) { const va = String(a.raw?.[f] ?? '').trim(), vb = String(b.raw?.[f] ?? '').trim(); if (!va && vb) row[colOf(f)] = vb; }
  if (row[colOf('end')] && a.st != null && b.t != null) row[colOf('dur')] = b.t - a.s;
  if (named) row[colOf('by')] = `${ba}, ${bb}`;
  return row;
}
async function mergeDouble(i){
  const p = (DATA.dups || [])[i]; if (!p || p[2] !== 'double') return;
  const [later, first] = p, why = editBlock(first) || editBlock(later); if (why) return toast(why, true);
  const row = mergedRow(first, later);
  if (!confirm(L(`Merge the two ${catL(first.cat)} entries into one? The first one keeps everything from both${Object.keys(row).length ? '' : ' (the second adds nothing new)'} and the second is deleted from the Sheet.`,
    `Fusionner les deux entrées ${catL(first.cat)} ? La première garde tout le contenu des deux${Object.keys(row).length ? '' : ' (la seconde n’ajoute rien)'} et la seconde est supprimée de la feuille.`))) return;
  closeModals();
  if (Object.keys(row).length) await saveQuickOp('update', row, { rowNum: first.sheetRow, match: first.match, localId: first.local ? first.localId : null, batch: true });
  await saveQuickOp('delete', {}, { rowNum: later.sheetRow, match: later.match, localId: later.local ? later.localId : null, batch: true });
  if (S.endpoint) await syncLive({ quiet: true, skipFlush: true }); else reingest();
  toast(L('Merged into one entry ✓', 'Fusionnées en une entrée ✓'));
}
function keepBothDouble(i){
  const p = (DATA.dups || [])[i]; if (!p) return;
  S.dupKeep = [...(S.dupKeep || []), dblKey(p)].slice(-200); saveSettings(); renderAll();
  if ($('#mHealth')?.classList.contains('on')) renderHealthModal();
  toast(L('Kept as two entries', 'Gardées comme deux entrées'));
}
const dblSide = e => `<div class="dupside"><b>${e.st != null ? fmtTime(e.st) : ''}${e.t != null ? '–' + fmtTime(e.t % DAY) : ''}</b>${byOf(e) ? ` · ${esc(byOf(e))}` : ''}${e.local ? ` <span class="pill">${L('this device', 'cet appareil')}</span>` : ''}
  <div>${e.notes ? esc(e.notes) : `<span class="faint">${L('no notes', 'sans notes')}</span>`}</div>${e.tags.length ? `<div class="faint">${e.tags.map(esc).join(', ')}</div>` : ''}${e.outcome ? `<div class="faint">${esc(e.outcome)}</div>` : ''}</div>`;
function doublePairHTML(p, i){
  const ro = viewOnly();
  return `<div class="duppair">${dblSide(p[1])}${dblSide(p[0])}${ro ? '' : `<div class="row wrap"><button class="btn sm primary" data-dblmerge="${i}">🔀 ${L('Merge into one', 'Fusionner')}</button><button class="btn sm ghost" data-dblkeep="${i}">${L('Keep both', 'Garder les deux')}</button></div>`}</div>`;
}
/** Today banner: entries of the last 2 days logged twice. */
function doubleCallouts(){
  if (viewOnly()) return [];
  return doubles().filter(p => p[0].d >= todayIdx() - 1).slice(0, 2).map(p => ({ cls: 'info', html:
    `🔀 ${L(`<b>${esc(catL(p[1].cat))}</b> was logged twice${byOf(p[0]) && byOf(p[1]) && byOf(p[0]) !== byOf(p[1]) ? ` (${esc(byOf(p[1]))} and ${esc(byOf(p[0]))})` : ''}, ${relDay(p[1].d)} ${p[1].st != null ? fmtTime(p[1].st) : ''}: both are kept.`,
      `<b>${esc(catL(p[1].cat))}</b> a été noté deux fois${byOf(p[0]) && byOf(p[1]) && byOf(p[0]) !== byOf(p[1]) ? ` (${esc(byOf(p[1]))} et ${esc(byOf(p[0]))})` : ''}, ${relDay(p[1].d)} ${p[1].st != null ? fmtTime(p[1].st) : ''} : les deux sont gardées.`)}
     <button class="btn sm" data-dblsee="${p[3]}" style="margin-left:6px">${L('Compare & merge', 'Comparer et fusionner')}</button>` }));
}
