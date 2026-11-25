// ── Optional add-on: lock-screen phone reminders via ntfy.sh (works with the dashboard closed) ──
// Add this as a SECOND script file (＋ → Script, name it Reminders) in the same Apps Script project as Code.gs.
// Then: set NTFY_TOPIC, Save, choose installReminderTrigger in the toolbar ▸ Run once, and authorize.
// Tip: the dashboard's Settings → Reminders generates this file from YOUR templates — use that copy if you've edited them.
const NTFY_TOPIC = 'baby-routine-CHANGE-ME';   // long + unguessable = private
const LEAD_MIN = 15;                            // minutes of warning
const EARLY_VISIT_CUTOFF = '09:30'; // off-site Visit at/before this → early template
const SETS = {                                       // generated from your dashboard templates
  baseline: [['07:45', "Breakfast"], ['10:15', "Nap 1"], ['12:00', "Lunch"], ['14:45', "Nap 2"], ['16:00', "Hard Nap Cutoff"], ['16:15', "Snack"], ['17:45', "Dinner"], ['20:00', "Bedtime"]],
  early:    [['07:20', "Breakfast"], ['08:15', "Car Nap 1"], ['10:40', "Car Nap 2"], ['11:45', "Lunch"], ['14:30', "Capped Crib Nap"], ['16:00', "Snack"], ['17:45', "Dinner"], ['20:00', "Bedtime"]],
  late:     [['07:45', "Breakfast"], ['10:00', "Car Nap 1"], ['11:45', "Lunch"], ['12:45', "Car Nap 2"], ['17:45', "Dinner"], ['19:00', "Bedtime (no bridge)"], ['20:00', "Bedtime (with bridge)"]],
};
const mins_ = s => { const m = String(s).match(/(\d{1,2}):(\d{2})\s*([AP])?/i); if (!m) return null;
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
}
