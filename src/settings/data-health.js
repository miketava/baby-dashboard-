/* ── Data health: warnings, and cleaning up duplicates ── */
const dupSide = (e, tag) => `<div class="dupside"><b>${e.local ? L('This device', 'Cet appareil') : L(`Row ${e.sheetRow ?? e.row}`, `Ligne ${e.sheetRow ?? e.row}`)}</b>${tag ? ` <span class="pill">${tag}</span>` : ''}<div class="faint">${esc(catL(e.cat))} · ${fmtDayShort(e.d)}${e.st != null ? ' ' + fmtTime(e.st) : ''}${e.t != null ? '–' + fmtTime(e.t % DAY) : ''}${e.milk != null ? ' · ' + fmtOz(e.milk) : ''}</div>${e.notes ? `<div>${esc(e.notes)}</div>` : ''}${e.tags.length ? `<div class="faint">${esc(e.tags.join(', '))}</div>` : ''}${e.outcome ? `<div class="faint">${esc(ocL(e.outcome))}</div>` : ''}${e.loggedAt ? `<div class="faint">${L('logged', 'saisie')} ${fmtDayShort(Math.floor(e.loggedAt / DAY))} ${fmtTime(e.loggedAt % DAY)}</div>` : ''}</div>`;
function renderHealthModal(){
  const w = DATA.warnings, dups = DATA.dups || [], other = w.filter(x => !x.dup);
  const can = dups.length && !editBlock(dups[0][0]), why = dups.length ? editBlock(dups[0][0]) : '';
  $('#healthBody').innerHTML = `${DATA.newCats.length ? `<p><b>New categories discovered:</b> ${DATA.newCats.map(c => `<span class="pill" style="background:${catColor(c)}22;color:${catColor(c)}">${esc(c)}</span>`).join(' ')} — added to filters, legend and charts automatically.</p>` : ''}
    ${DATA.extras.length ? `<p><b>Extra columns found:</b> ${DATA.extras.map(esc).join(', ')} — shown in the Event Log and tooltips.</p>` : ''}
    ${dups.length ? `<h4 style="margin:10px 0 4px">${L(`Duplicates (${dups.length})`, `Doublons (${dups.length})`)}</h4>
      <p class="muted" style="margin-top:0">${L('Each pair is counted once in every chart and report. Delete the extra copy to clean up the Sheet — the less complete one is suggested.', 'Chaque paire n’est comptée qu’une fois dans les graphiques et les rapports. Supprimez la copie en trop pour nettoyer la feuille — la moins complète est suggérée.')}</p>
      ${can ? `<div class="row wrap" style="margin-bottom:8px"><button class="btn primary sm" data-dupdel="all">🧹 ${L(`Delete all ${dups.length} suggested`, `Supprimer les ${dups.length} suggérés`)}</button></div>` : `<p class="scopenote">${esc(why)}</p>`}
      <div class="duplist">${dups.map(([drop, keep], i) => `<div class="duppair">${dupSide(drop, L('suggested', 'suggéré'))}${dupSide(keep, '')}
        ${can ? `<div class="row wrap"><button class="btn sm danger" data-dupdel="${i}:drop">${L('Delete', 'Supprimer')} ${drop.local ? L('this device’s copy', 'la copie de l’appareil') : L(`row ${drop.sheetRow}`, `la ligne ${drop.sheetRow}`)}</button><button class="btn sm ghost" data-dupdel="${i}:keep">${L('Delete', 'Supprimer')} ${keep.local ? L('this device’s copy', 'la copie de l’appareil') : L(`row ${keep.sheetRow}`, `la ligne ${keep.sheetRow}`)}</button></div>` : ''}</div>`).join('')}</div>` : ''}
    ${other.length ? `<h4 style="margin:12px 0 4px">${L('Other warnings', 'Autres avertissements')}</h4><p class="muted" style="margin-top:0">${other.filter(x => !x.info).length} warning(s), ${other.filter(x => x.info).length} note(s). Only rows with a missing date are skipped; everything else is kept.</p><div class="warnlist">${other.slice(0,300).map(x => `<div><b>Row ${x.row}</b>${x.info ? '<span class="faint">note · </span>' : ''}${esc(x.msg)}</div>`).join('')}</div>` : !dups.length ? '<p>All rows parsed cleanly.</p>' : ''}`;
}
/** Delete duplicate copies from the Sheet: one pair (“i:drop” / “i:keep”) or every suggested copy (“all”). Bottom rows first, so row numbers above don't move. */
async function cleanDuplicates(which){
  const dups = DATA.dups || [];
  let targets = which === 'all' ? dups.map(([d]) => d) : (() => { const [i, side] = which.split(':'); const p = dups[+i]; return p ? [side === 'keep' ? p[1] : p[0]] : []; })();
  if (!targets.length) return;
  if (!confirm(which === 'all' ? L(`Delete ${targets.length} duplicate row${targets.length > 1 ? 's' : ''} from the Sheet? The copy that is kept stays as it is.`, `Supprimer ${targets.length} ligne${targets.length > 1 ? 's' : ''} en double de la feuille? La copie conservée reste telle quelle.`)
    : L('Delete this copy from the Sheet?', 'Supprimer cette copie de la feuille?'))) return;
  targets = targets.slice().sort((a, b) => (b.sheetRow ?? -1) - (a.sheetRow ?? -1));
  closeModals();
  for (const e of targets) await saveQuickOp('delete', {}, { rowNum: e.sheetRow, match: e.match, localId: e.local ? e.localId : null, batch:true });
  if (S.endpoint) await syncLive({ quiet:true, skipFlush:true });
  toast(L(`${targets.length} duplicate${targets.length > 1 ? 's' : ''} removed`, `${targets.length} doublon${targets.length > 1 ? 's' : ''} supprimé${targets.length > 1 ? 's' : ''}`));
}
function closeModals(){ if (W?.addKid && !W.done && $('#mWizard').classList.contains('on')) { $('#mWizard').classList.remove('on'); cancelAddKid(); } $$('.modal').forEach(m => m.classList.remove('on')); if (drawerDay == null && !$('.sheet.on')) $('#scrim').classList.remove('on'); }
function openSettings(p){ if (p) setPane = p; renderSettings(); openModal('mSettings'); }
const numField = (path, label, step=1, hint='') => `<label class="field">${label}<input type="number" step="${step}" data-set="${path}" value="${esc(getPath(path))}">${hint ? `<span class="faint">${hint}</span>` : ''}</label>`;
/** Milk targets are stored in oz; shown/entered in ml for metric profiles. */
const milkField = (path, label) => `<label class="field">${label} (${MU()}/day)<input type="number" step="${metric() ? 10 : .5}" data-set="${path}" data-milk value="${esc(toDisp(getPath(path)))}"></label>`;
const timeField = (path, label, hint='') => `<label class="field">${label}<input type="time" data-set="${path}" value="${esc(getPath(path))}">${hint ? `<span class="faint">${hint}</span>` : ''}</label>`;
const chk = (path, label) => `<label class="switch"><input type="checkbox" data-set="${path}" ${getPath(path) ? 'checked' : ''}> ${label}</label>`;
function getPath(p){ return p.split('.').reduce((o,k) => o?.[k], S); }
function setPath(p, v){ const ks = p.split('.'); const last = ks.pop(); ks.reduce((o,k) => o[k], S)[last] = v; }
/** Optional Apps Script add-on: lock-screen reminders through ntfy.sh, generated from your templates. */
function ntfySnippet(){
  const topic = S.ntfyTopic || 'baby-routine-CHANGE-ME';
  const set = id => { const tp = tplById(id) || S.templates[0]; return (tp?.items || []).filter(i => (i.kind === 'nap' && !i.optional) || i.kind === 'meal' || i.kind === 'cutoff' || i.kind === 'bedtime').map(i => [i.start, i.label]); };
  const fmt = a => '[' + a.map(([h, l]) => `['${h}', ${JSON.stringify(l)}]`).join(', ') + ']';
  const lead = +S.reminders.lead || 15;
  return `// ── Optional add-on: lock-screen phone reminders via ntfy.sh (works with the dashboard closed) ──
// Paste BELOW the main script, Save, then select installReminderTrigger ▸ Run once and authorize.
const NTFY_TOPIC = '${topic}';   // long + unguessable = private
const LEAD_MIN = ${lead};                            // minutes of warning
const EARLY_VISIT_CUTOFF = '${T().earlyVisitCutoff}'; // off-site Visit at/before this → early template
const SETS = {                                       // generated from your dashboard templates
  baseline: ${fmt(set('baseline'))},
  early:    ${fmt(set('early-visit'))},
  late:     ${fmt(set('late-visit'))},
};
const mins_ = s => { const m = String(s).match(/(\\d{1,2}):(\\d{2})\\s*([AP])?/i); if (!m) return null;
  let h = +m[1]; if (m[3]) h = h % 12 + (/p/i.test(m[3]) ? 12 : 0); return h * 60 + +m[2]; };
function todaysSet_(tz, today) {           // same auto-template rule as the dashboard
  const range = sheet_().getDataRange(), raw = range.getValues(), disp = range.getDisplayValues(), h = disp[0].map(String);
  const iD = h.indexOf('Date'), iC = h.indexOf('Category'), iS = h.indexOf('Start Time');
  for (let r = raw.length - 1; r > 0; r--) {
    const d = raw[r][iD] instanceof Date ? Utilities.formatDate(raw[r][iD], tz, 'yyyy-MM-dd') : String(raw[r][iD]).slice(0, 10);
    if (d === today && String(disp[r][iC]).trim() === 'Visit') return mins_(disp[r][iS]) <= mins_(EARLY_VISIT_CUTOFF) ? SETS.early : SETS.late;
  }
  return SETS.baseline;
}
function sendReminders() {
  const tz = Session.getScriptTimeZone(), now = new Date(), cache = CacheService.getScriptCache();
  const today = Utilities.formatDate(now, tz, 'yyyy-MM-dd'), nowMin = mins_(Utilities.formatDate(now, tz, 'HH:mm'));
  todaysSet_(tz, today).forEach(([hhmm, label]) => {
    const until = mins_(hhmm) - nowMin, key = today + hhmm;
    if (until > 0 && until <= LEAD_MIN && !cache.get(key)) {   // trigger runs every 5 min
      UrlFetchApp.fetch('https://ntfy.sh/' + NTFY_TOPIC, { method: 'post', payload: label + ' at ' + hhmm + ' (in ' + until + ' min)',
        headers: { Title: 'Baby routine reminder', Tags: 'baby_bottle' } });
      cache.put(key, '1', 21600);
    }
  });
}
function installReminderTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sendReminders').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendReminders').timeBased().everyMinutes(5).create();
}`;
}
