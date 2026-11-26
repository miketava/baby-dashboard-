/* ── Edit / delete an existing entry (✏️ in the day view, press-and-hold or right-click anywhere) ── */
/** Why an entry can't be edited here, or '' when it can. */
function editBlock(ev){
  if (viewOnly()) return L('This is a view-only connection — logging is done by the family', 'Accès en lecture seulement — la famille fait les entrées');
  if (DATA.source === 'demo') return L('Example data can’t be edited — connect your Sheet to edit your own entries', 'Les données d’exemple ne peuvent pas être modifiées — connectez votre feuille pour modifier vos entrées');
  if (ev.local && ev.localId && QUEUE.some(q => q.id === ev.localId && q.op === 'append')) return '';
  if (DATA.source !== 'live' || !S.endpoint) return L('Entries from a CSV file can’t be edited here — fix them in the spreadsheet and re-import', 'Les entrées d’un fichier CSV ne peuvent pas être modifiées ici — corrigez-les dans le tableur et réimportez');
  if (ev.sheetRow == null) return L('Update the Apps Script (Settings → Data source) to edit entries from here', 'Mettez à jour l’Apps Script (Paramètres → Source de données) pour modifier les entrées d’ici');
  return '';
}
function openEdit(ev){
  if (!ev) return; const why = editBlock(ev); if (why) return toast(why, true);
  const r = ev.raw || {}, en = ev.t != null ? fmtTime(ev.t % DAY) : (r.end || '');
  QL = { op:'update', ev, row: { 'Date': isoOf(ev.d), 'Start Time': ev.allDay ? '' : fmtTime(ev.st), 'End Time': ev.t != null ? en : '', 'Duration (min)': '', 'Category': ev.cat,
    'Milk (oz)': ev.milk ?? '', 'Notes': ev.notes || '', 'Water (ml)': ev.water ?? '', 'Tags': ev.tags.join(', '), 'Outcome / Rating': ev.outcome || '', 'Value': r.value || '', ...(r.kid ? { 'Child': r.kid } : {}) } };
  hideTip(); renderQuickLog(); $('#qlog').classList.add('on'); $('#scrim').classList.add('on');
}
async function deleteEdited(){
  const ev = QL?.ev; if (!ev) return;
  if (!confirm(L(`Delete this ${ev.cat} entry (${fmtDay(ev.d)}${ev.allDay ? '' : ' ' + fmtTime(ev.st)}) from the Sheet? This can't be undone from the dashboard.`, `Supprimer cette entrée « ${catL(ev.cat)} » (${fmtDay(ev.d)}${ev.allDay ? '' : ' ' + fmtTime(ev.st)}) de la feuille? Impossible d’annuler depuis le tableau de bord.`))) return;
  closeQuickLog(); saveQuickOp('delete', {}, { rowNum: ev.sheetRow, match: ev.match, localId: ev.local ? ev.localId : null });
}
const evById = id => DATA.events.find(e => e.id === +id);
