/* ── Tab reminders (Notification API + chime) ── */
let audioCtx = null;
function chime(){
  if (!S.reminders.chime) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    [[660, 0], [880, .18]].forEach(([f, d]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0+d); g.gain.linearRampToValueAtTime(.12, t0+d+.02); g.gain.exponentialRampToValueAtTime(.0001, t0+d+.6);
      o.connect(g).connect(audioCtx.destination); o.start(t0+d); o.stop(t0+d+.65); });
  } catch {}
}
/** Upcoming reminder targets for today: template naps, meals, cutoff, plus the live "nap window opens" time. */
function reminderItems(){
  const S0 = todayState(), r = S.reminders, out = [];
  for (const i of S0.items) {
    if (i.kind === 'nap' && r.naps && !i.optional) out.push({ key:'nap'+i.start, at:i.a, title:`${i.label} at ${i.start}`, body:`Start winding down — ${i.label} window ${i.start}–${i.end || ''}` });
    if (i.kind === 'meal' && r.meals) out.push({ key:'meal'+i.start, at:i.a, title:`${i.label} at ${i.start}`, body:`${i.label} is coming up` });
    if (i.kind === 'cutoff' && r.cutoff) out.push({ key:'cut'+i.start, at:i.a, title:`Nap cutoff at ${i.start}`, body:'Wake from any nap by the hard cutoff' });
    if (i.kind === 'bedtime' && r.naps) out.push({ key:'bed'+i.start, at:i.a, title:`${i.label} at ${i.start}`, body:'Start the bedtime routine' });
  }
  if (mod('newborn') && +r.feedEvery > 0) { const last = FEEDS.filter(f => f.s <= S0.nowA).pop();
    if (last) { const at = last.s + +r.feedEvery - S0.D * DAY; if (at > 0 && at < DAY) out.push({ key:'feed' + last.s, at, title:`Feed due around ${fmtTime(at)}`, body:`${fmtDur(+r.feedEvery)} after the last feed started (${fmtTime(last.s % DAY)})` }); } }
  if (r.dynamic && S0.next) out.push({ key:'dyn'+S0.next.at, at:S0.next.at, title:`${S0.next.label} at ${fmtTime(S0.next.at)}`, body:'Based on today’s actual wake window' });
  return out.sort((a,b) => a.at - b.at);
}
const firedKey = () => 'bld.fired.' + isoOf(todayIdx());
function nextReminder(){ const now = nowMin(), fired = new Set(lsGet(firedKey(), [])); return reminderItems().find(i => i.at - S.reminders.lead > now - 1 && !fired.has(i.key)) || null; }
function remPermissionNote(){
  if (!('Notification' in window)) return ' · this browser has no system notifications, so alerts show in-page';
  if (Notification.permission === 'denied') return ' · notifications are blocked for this page, so alerts show in-page';
  if (!window.isSecureContext) return ' · open over https (e.g. GitHub Pages) for system notifications';
  return '';
}
function checkReminders(){
  if (!S.reminders.enabled || !mod('reminders')) return;
  const now = nowMin(), lead = +S.reminders.lead || 15, fired = new Set(lsGet(firedKey(), []));
  for (const i of reminderItems()) {
    if (fired.has(i.key) || now < i.at - lead || now >= i.at) continue;
    fired.add(i.key); lsSet(firedKey(), [...fired]);
    const body = `${i.body} (in ${fmtDur(i.at - now)})`;
    chime();
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(i.title, { body, tag:i.key }); } catch { toast('🔔 ' + i.title + ' — ' + body); } }
    else toast('🔔 ' + i.title + ' — ' + body);
  }
}
async function toggleReminders(on){
  S.reminders.enabled = on; saveSettings();
  if (on && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
  if (on) { chime(); toast('Reminders on — ' + (('Notification' in window && Notification.permission === 'granted') ? 'system notifications enabled' : 'alerts will show in this tab')); }
  renderToday();
}
