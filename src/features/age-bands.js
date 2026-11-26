/* ── Age bands ── */
const ageDays = () => { const d = parseDate(S.profile.dob); return d == null ? null : todayIdx() - d; };
const bandFor = days => days == null || days < 0 ? null : AGE_BANDS.find(b => days < b.maxDays) || AGE_BANDS[AGE_BANDS.length - 1];
function ageLabel(days){
  if (days == null) return '';
  if (FRL()) { if (days < 0) return `prévu dans ${plural(-days, '', '', 'jour', 'jours')}`; if (days < 14) return plural(days, '', '', 'jour', 'jours'); if (days < 92) return `${Math.floor(days / 7)} semaines`; if (days < 730) return `${Math.floor(days / 30.44)} mois`; const y = Math.floor(days / 365.25), mo = Math.floor((days - y * 365.25) / 30.44); return `${y} an${y > 1 ? 's' : ''}${mo ? ' et ' + mo + ' mois' : ''}`; }
  if (days < 0) return `due in ${-days} day${days === -1 ? '' : 's'}`;
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} old`;
  if (days < 92) return `${Math.floor(days / 7)} weeks old`;
  const mo = Math.floor(days / 30.44); return mo < 24 ? `${mo} months old` : `${Math.floor(mo / 12)} year${mo >= 24 ? 's' : ''}${mo % 12 ? ' ' + (mo % 12) + ' mo' : ''} old`;
}
const r15 = m => Math.round(m / 15) * 15;
/** Suggested targets + a generated "Baseline Home Day" template for an age band (wake 07:00). */
function bandPreset(b){
  if (!b?.ww) return null;
  const wake = 420, items = [{ label:'Wake', kind:'wake', start: fmtTime(wake) }];
  let t = wake, lastCore = wake;
  b.lens.forEach((len, i) => {
    const st = r15(t + (i === 0 ? b.ww[0] : b.ww[1])), en = r15(st + len), opt = b.optLast && i === b.lens.length - 1;
    items.push({ label: opt ? 'Catnap' : `Nap ${i + 1}`, kind:'nap', start: fmtTime(st), end: fmtTime(en), ...(opt ? { optional:true } : {}) });
    t = en; if (!opt) lastCore = en;
  });
  const bed = clamp(r15(t + b.ww[2]), 1110, 1230);   // 18:30 – 20:30
  items.push({ label:'Hard Nap Cutoff', kind:'cutoff', start: fmtTime(lastCore) }, { label:'Bedtime', kind:'bedtime', start: fmtTime(bed) });
  if (S.profile.feeding === 'solids' || (ageDays() ?? 0) >= 183) {
    const keep = (tplById('baseline')?.items || []).filter(i => i.kind === 'meal');
    (keep.length ? keep : [{ label:'Breakfast', kind:'meal', start: fmtTime(wake + 30) }, { label:'Lunch', kind:'meal', start:'12:00' }, { label:'Dinner', kind:'meal', start: fmtTime(r15(bed - 150)) }]).forEach(m => items.push({ ...m }));
  }
  items.sort((x, y) => parseTime(x.start) - parseTime(y.start));
  return { targets:{ ww1:b.ww[0], ww2:b.ww[1], wwFinal:b.ww[2], underTired: b.ww[2] - 30, maxDaySleep:b.maxDay, napCutoff: fmtTime(lastCore), bedtime: fmtTime(bed) }, items };
}
function applyBand(b){
  const p = bandPreset(b); if (!p) return;
  Object.assign(S.targets, p.targets);
  let base = tplById('baseline');
  if (!base) { base = { id:'baseline', name:'Baseline Home Day', targets:{}, items:[] }; S.templates.unshift(base); }
  base.items = [...p.items, ...base.items.filter(i => ['note', 'visit'].includes(i.kind) || i.beforeBed || i.days)].sort((x, y) => (parseTime(x.start) ?? 0) - (parseTime(y.start) ?? 0)); base.targets = { ...base.targets, maxDaySleep: p.targets.maxDaySleep };
  S.profile.bandAck = b.id;
}
/** Review modal: current vs suggested targets for the child's age. */
function openBandReview(){
  const b = bandFor(ageDays()), p = bandPreset(b), t = T();
  if (!p) { toast(b ? 'Newborns don’t follow a fixed schedule — no nap targets to suggest yet' : 'Add a date of birth first (Settings → Child & features)'); return; }
  const row = (l, cur, sug) => `<tr><td>${l}</td><td>${cur}</td><td><b>${sug}</b></td></tr>`;
  const naps = items => items.filter(i => i.kind === 'nap').map(i => `${i.start}–${i.end}${i.optional ? ' (opt.)' : ''}`).join(', ') || '—';
  $('#bandBody').innerHTML = `<p>${esc(S.profile.name || L('Your child', 'Votre enfant'))} ${L('is', 'a')} <b>${ageLabel(ageDays())}</b> (${b.label}). Typical targets for this age, as a starting point to adjust with your pediatrician:</p>
    <table class="cmp"><thead><tr><th></th><th>Current</th><th>Suggested</th></tr></thead><tbody>
      ${row('Wake → first nap', fmtDur(t.ww1), fmtDur(p.targets.ww1))}${row('Between naps', fmtDur(t.ww2), fmtDur(p.targets.ww2))}${row('Last nap → bedtime', fmtDur(t.wwFinal), fmtDur(p.targets.wwFinal))}
      ${row('Max daytime sleep', fmtDur(t.maxDaySleep), fmtDur(p.targets.maxDaySleep))}${row('Nap cutoff', t.napCutoff, p.targets.napCutoff)}${row('Bedtime', t.bedtime, p.targets.bedtime)}
      ${row('Baseline nap windows', naps(tplById('baseline')?.items || []), naps(p.items))}</tbody></table>
    <p class="hint">Applying updates your targets and the <b>Baseline Home Day</b> template (visit templates are left alone). You can fine-tune everything afterwards in Settings.</p>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn" data-close>Keep mine</button><button class="btn primary" id="bandApply">Apply suggestions</button></div>`;
  $('#bandBody [data-close]').onclick = () => { S.profile.bandAck = b.id; saveSettings(); closeModals(); renderNotice(); };
  $('#bandApply').onclick = () => { applyBand(b); saveSettings(); analyze(); renderAll(); closeModals(); toast('Targets updated for ' + b.label); };
  openModal('mBand');
}

