/* ── Quick-log writes (doPost) ── */
/** Map a canonical row to the Sheet's actual header names (as last seen), so appendRow lines up. */
function toSheetRow(row){
  const map = DATA.source === 'live' ? (DATA.map || {}) : {};
  const out = {}; for (const [f, h] of Object.entries(FIELD_CANON)) if (row[h] !== undefined) out[map[f] || h] = row[h];
  // the Sheet keeps milk in ml? convert from the internal oz value
  if (map.milk && /\bml\b|millil/i.test(map.milk) && row['Milk (oz)'] !== '' && row['Milk (oz)'] != null) out[map.milk] = Math.round(+row['Milk (oz)'] * OZ_ML);
  return out;
}
async function postOp(q){
  const body = JSON.stringify({ token: S.token, action: q.op, row: toSheetRow(q.row), blankOk: q.blankOk, childKeys: q.childKeys, rowNum: q.rowNum, match: q.match });
  let r;
  try { r = await fetch(S.endpoint.trim(), { method:'POST', body, headers:{ 'Content-Type':'text/plain;charset=utf-8' }, redirect:'follow' }); }
  catch (err) { const e = new Error(navigator.onLine === false ? 'offline' : 'unconfirmed'); e.code = e.message; throw e; }
  let j; try { j = JSON.parse(await r.text()); } catch { const e = new Error('unconfirmed'); e.code = 'unconfirmed'; throw e; }
  if (!j.ok) { const e = new Error(j.error || 'Endpoint error'); e.code = 'rejected'; throw e; }
  return j;
}
/** Retry pending entries (status 'pending'); 'local' entries stay until the user sends them. */
async function flushQueue({ quiet=false, includeLocal=false } = {}){
  if (!S.endpoint) return 0;
  const todo = QUEUE.filter(q => q.status === 'pending' || (includeLocal && q.status === 'local'));
  let sent = 0;
  for (const q of todo) {
    try { await postOp(q); QUEUE = QUEUE.filter(x => x.id !== q.id); sent++; }
    catch (err) { if (err.code === 'rejected') { q.error = err.message; if (!quiet) toast('Sheet rejected an entry: ' + err.message, true); } q.status = 'pending'; break; }
  }
  saveQueue(); renderQueuePill();
  if (sent && !quiet) toast(`Sent ${sent} queued entr${sent>1?'ies':'y'} to the Sheet`);
  return sent;
}
/** Save a quick-log op: POST to the Sheet when connected, otherwise keep it on this device. */
async function saveQuickOp(op, row, meta = {}){
  if (op === 'append') row = { ...row, 'Logged At': `${isoOf(todayIdx())} ${fmtTime(nowMin())}:00`, ...(ME.name && !row['Logged By'] ? { 'Logged By': ME.name } : {}) };
  let blankOk;
  if (multiKid() && (op === 'append' || op === 'end')) { if (op === 'append') row = { 'Child': qlKidCell(), ...row }; else { row = { ...row, 'Child': kidName(kidIdx()) }; blankOk = (S.blankKid ?? 0) === kidIdx(); } }
  // Editing an entry that is still only on this device: change the queued row itself.
  if ((op === 'update' || op === 'delete') && meta.localId) {
    const lq = QUEUE.find(x => x.id === meta.localId && x.op === 'append');
    if (lq) { if (op === 'delete') QUEUE = QUEUE.filter(x => x !== lq); else lq.row = { ...lq.row, ...row }; saveQueue(); reingest(); renderQueuePill(); toast(op === 'delete' ? L('Entry deleted', 'Entrée supprimée') : L('Entry updated', 'Entrée modifiée')); return; }
  }
  const childKeys = multiKid() && op === 'end' ? kidKeys(kidIdx()) : undefined;
  const q = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), op, row, blankOk, childKeys, rowNum: meta.rowNum, match: meta.match, status: S.endpoint ? 'pending' : 'local', created: new Date().toISOString() };
  QUEUE.push(q); saveQueue(); reingest(); renderQueuePill();
  if (!S.endpoint) { if (!meta.batch) toast('Saved on this device (no Sheet connected)'); return; }
  try {
    await postOp(q); QUEUE = QUEUE.filter(x => x.id !== q.id); saveQueue();
    if (meta.batch) return;
    toast(op === 'update' ? L('Updated in Google Sheet ✓', 'Modifié dans la feuille Google ✓') : op === 'delete' ? L('Deleted from Google Sheet ✓', 'Supprimé de la feuille Google ✓') : 'Saved to Google Sheet ✓'); await syncLive({ quiet:true, skipFlush:true });
  } catch (err) {
    if (err.code === 'unconfirmed') {
      // The POST may have landed even though the browser hid the reply: re-read and check before retrying.
      await syncLive({ quiet:true, skipFlush:true });
      if (sheetHas(q)) { QUEUE = QUEUE.filter(x => x.id !== q.id); saveQueue(); reingest(); toast('Saved to Google Sheet ✓'); }
      else toast('Could not confirm the save — kept on this device and will retry on next sync', true);
    } else if (err.code === 'rejected' && (op === 'update' || op === 'delete')) {
      // an edit the Sheet can't apply (the row moved or changed) would never succeed on retry: drop it and show the current Sheet
      QUEUE = QUEUE.filter(x => x.id !== q.id); saveQueue(); renderQueuePill();
      toast(L('Not saved: ', 'Non enregistré : ') + err.message, true); await syncLive({ quiet:true, skipFlush:true });
    } else toast(err.code === 'offline' ? 'Offline — saved on this device, will send on next sync' : 'Sheet error: ' + err.message, true);
  }
  renderQueuePill();
}
/** Does the freshly synced sheet data already contain this op? */
function sheetHas(q){
  if (q.op === 'delete') return !DATA.events.some(e => !e.local && e.sheetRow === q.rowNum && Object.entries(q.match || {}).every(([k, v]) => String(e.match?.[k] ?? '') === String(v)));
  if (q.op === 'update') { const d = parseDate(q.row['Date']), st = parseTime(q.row['Start Time']); return DATA.events.some(e => !e.local && e.cat === canonCat(q.row['Category']) && e.d === d && e.st === st && !!e.editedAt); }
  const d = parseDate(q.row['Date']), st = parseTime(q.row['Start Time']), c = canonCat(q.row['Category']);
  return DATA.events.some(e => !e.local && e.cat === c && (q.op === 'end' ? e.t != null && e.en === parseTime(q.row['End Time']) : e.d === d && e.st === st));
}
function renderQueuePill(){
  const p = $('#queuePill'); const n = QUEUE.length; p.classList.toggle('hidden', !n);
  const loc = QUEUE.filter(q => q.status === 'local').length;
  p.textContent = loc === n ? `${n} on this device` : `${n} waiting to sync`;
  p.title = loc === n ? 'Quick-log entries saved only in this browser (no Sheet connected). Send them from Settings → Data source.' : 'Quick-log entries not yet confirmed in the Google Sheet. They retry on every sync.';
}
