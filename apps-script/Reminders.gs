// ══════════════════════════════════════════════════════════════════════════════════════════════
//  Optional add-on: lock-screen phone reminders through ntfy.sh (they arrive with the dashboard closed).
//  Reminders v2 — needs Code.gs v1.5 in the same Apps Script project.
//
//  Setup: ＋ → Script, name it Reminders, paste this file (next to Code.gs, not over it), Save,
//  choose installReminderTrigger in the toolbar ▸ Run once and approve. Subscribe to NTFY_TOPIC in the ntfy app.
//  ▸ Run previewReminders any time to see today's list in the log.
//
//  It reads your schedule from the Sheet's Config and Medications tabs (kept up to date by the dashboard),
//  so editing a template or a medication in the dashboard changes the reminders too: no need to re-paste.
// ══════════════════════════════════════════════════════════════════════════════════════════════
//  YOUR SETTINGS (the dashboard fills these in when you copy it from Settings → Reminders)
const NTFY_TOPIC = 'baby-routine-CHANGE-ME';   // long + unguessable = private (anyone with the name can read it)
const LEAD_MIN = 15;                           // minutes of warning before naps, meals, bedtime…
const REMIND = { naps: true, meals: true, cutoff: true, routines: true, visits: true, meds: true };
const MED_NUDGE_MIN = 60;                      // second reminder if a dose isn't checked off after this long (0 = never)
const DASHBOARD_URL = '';                      // tapping a reminder opens this (your dashboard's address), if set
// ══════════════════════════════════════════════════════════════════════════════════════════════
const REMINDERS_VERSION = '2.0';

const hm_ = m => { m = ((m % 1440) + 1440) % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); };
const mins_ = s => { const m = String(s || '').match(/(\d{1,2})[:h](\d{2})\s*([AP])?/i); if (!m) return null;
  let h = +m[1]; if (m[3]) h = h % 12 + (/p/i.test(m[3]) ? 12 : 0); return h * 60 + +m[2]; };
const slug_ = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const WD_ = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6, di: 0, lu: 1, ma: 2, me: 3, je: 4, ve: 5 };
function onDay_(item, dow) {   // template steps limited to some weekdays ("Mon, Thu, Sun" / "lun, jeu, dim")
  if (!item.days) return true;
  const set = String(item.days).toLowerCase().split(/[\s,;/]+/).map(w => w.normalize('NFD').replace(/[^a-z]/g, '').slice(0, 2)).filter(k => k in WD_).map(k => WD_[k]);
  return !set.length || set.indexOf(dow) >= 0;
}

/** Today's rows from the Daily Log, as objects. */
function todayRows_(tz, today) {
  const sh = sheet_(); if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getDisplayValues(), h = v.shift().map(String);
  const rows = v.map(r => Object.fromEntries(h.map((k, i) => [k.trim(), r[i]])));
  const norm = d => { const m = String(d).match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    const x = new Date(d); return isNaN(x) ? '' : Utilities.formatDate(x, tz, 'yyyy-MM-dd'); };
  const yest = Utilities.formatDate(new Date(new Date(today + 'T12:00:00').getTime() - 864e5), tz, 'yyyy-MM-dd');
  return rows.filter(r => { const d = norm(r.Date); r._date = d; return d === today || d === yest; });
}

/** The day template for one child, picked the same way as the dashboard. */
function planFor_(cfg, kid, rows, today, nowMin, dow) {
  const get = k => cfg[k] && cfg[k].value;
  const tpls = get('child:' + kid.id + ':templates') || [], targets = get('child:' + kid.id + ':targets') || {};
  const byId = id => tpls.filter(t => t.id === id)[0];
  if (!tpls.length) return null;
  const mine = r => kid.match(r.Child);
  // a visit logged today, else one on the calendar; else an appointment marked for this child
  const vRow = rows.filter(r => r._date === today && mine(r) && /visit|visite/i.test(r.Category) && !/home|domicile/i.test(r.Category) && mins_(r['Start Time']) != null)
    .sort((a, b) => mins_(a['Start Time']) - mins_(b['Start Time']))[0];
  let anchor = vRow ? { st: mins_(vRow['Start Time']), en: mins_(vRow['End Time']), logged: true } : null;
  if (!anchor && typeof plannedVisits_ === 'function') { try { const p = plannedVisits_().filter(x => x.date === today)[0]; if (p) anchor = { st: mins_(p.start), en: mins_(p.end) }; } catch (err) {} }
  let appt = null;
  if (!anchor && typeof appointments_ === 'function') {
    try { const forKid = get('apptFor') || {};
      appt = appointments_().filter(a => a.date === today && forKid[a.id] === kid.id).map(a => ({ st: mins_(a.start), en: mins_(a.end), title: a.title }))
        .filter(a => a.st >= 480 && a.st <= 990).sort((a, b) => a.st - b.st)[0] || null; } catch (err) {}
  }
  let tp = null;
  const ov = get('todayTpl');
  if (ov && ov.date === today && ov.id && ov.id !== 'auto') tp = byId(ov.id);
  if (!tp && anchor) {
    const cut = mins_(targets.earlyVisitCutoff) || 570, late = byId('late-visit'), vs = anchor.st;
    tp = vs <= cut ? byId('early-visit') : vs <= 690 ? late : vs <= 795 ? (byId('midday-visit') || late) : (byId('afternoon-visit') || late);
  }
  if (!tp && appt) tp = appt.st < 660 ? byId('appt-am') : appt.st <= 795 ? (byId('appt-midday') || byId('appt-pm')) : byId('appt-pm');
  tp = tp || byId('baseline') || tpls[0];
  let items = tp.items.filter(i => onDay_(i, dow)).map(i => Object.assign({}, i));
  // line the visit / appointment and the naps right around it up with the real time (15 min – 4 h off)
  const a = anchor || appt, band = a && items.filter(i => i.kind === 'visit' && !!i.appt === !!appt && mins_(i.start) != null && mins_(i.end) != null)[0];
  if (band) {
    const vs = mins_(band.start), ve = mins_(band.end), off = a.st - vs;
    if (Math.abs(off) >= 15 && Math.abs(off) <= 240) items = items.map(i => { const s = mins_(i.start), e = mins_(i.end);
      const near = i === band || (i.kind === 'nap' && !i.optional && e != null && ((e <= vs && vs - e <= 45) || (s >= ve && s - ve <= 45)));
      return near ? Object.assign(i, { start: hm_(s + off), end: e != null ? hm_(e + off) : i.end }) : i; });
  }
  // bedtime routines follow bedtime; the Baseline's routines also apply on other days
  const base = byId('baseline');
  if (base && tp !== base && !items.some(i => i.beforeBed)) base.items.filter(i => i.beforeBed && onDay_(i, dow)).forEach(i => items.push(Object.assign({}, i)));
  const beds = items.filter(i => i.kind === 'bedtime' && mins_(i.start) != null).map(i => mins_(i.start)).sort((x, y) => x - y);
  items.forEach(i => { if (i.beforeBed && beds.length) i.start = hm_(beds[0] - +i.beforeBed); });
  return { tp: tp, items: items, anchor: a, appt: !!appt };
}

/** Everything due now for every child: [{ key, title, text, priority, tags }]. */
function dueReminders_(at, all) {
  const tz = Session.getScriptTimeZone(), now = at || new Date();
  const today = Utilities.formatDate(now, tz, 'yyyy-MM-dd'), nowMin = mins_(Utilities.formatDate(now, tz, 'HH:mm'));
  const dow = new Date(today + 'T12:00:00Z').getUTCDay();
  const cfg = typeof readConfig_ === 'function' ? readConfig_() : {};
  const rows = todayRows_(tz, today), out = [];
  const kidsCfg = (cfg.kids && cfg.kids.value) || [], blank = (cfg.blankKid && cfg.blankKid.value) || 0;
  const kids = kidsCfg.length ? kidsCfg.map((k, i) => { const p = (cfg['child:' + k.id + ':profile'] || {}).value || {}, keys = [String(p.name || '').toLowerCase()].concat((k.aliases || []).map(x => String(x).toLowerCase())).filter(String);
      return { id: k.id, name: p.name || '', keys: keys, match: c => kidMatch_(c, keys, i === blank) }; })
    : [{ id: 'main', name: ((cfg['child:main:profile'] || {}).value || {}).name || '', keys: [], match: () => true }];
  const who = k => kids.length > 1 && k.name ? k.name + ' · ' : '';
  kids.forEach(kid => {
    const plan = planFor_(cfg, kid, rows, today, nowMin, dow);
    if (plan) {
      // a sleep in progress (started, no end) mutes nap and bedtime reminders
      const asleep = rows.some(r => kid.match(r.Child) && /^sleep/i.test(r.Category) && !String(r['End Time']).trim() && String(r['Start Time']).trim());
      plan.items.forEach(i => {
        const t = mins_(i.start); if (t == null) return;
        const k = i.kind, sleepy = k === 'nap' || k === 'bedtime' || (k === 'note' && i.beforeBed);
        const on = (k === 'nap' && !i.optional && REMIND.naps) || (k === 'bedtime' && REMIND.naps) || (k === 'meal' && REMIND.meals) || (k === 'cutoff' && REMIND.cutoff)
          || (k === 'note' && REMIND.routines) || (k === 'visit' && REMIND.visits);
        if (!on) return;
        const until = t - nowMin;
        if (!all && !(until > 0 && until <= LEAD_MIN)) return;
        if (!all && sleepy && asleep) return;
        // a nap or bedtime already started early doesn't need a reminder
        if (!all && (k === 'nap' || k === 'bedtime') && rows.some(r => r._date === today && kid.match(r.Child) && /^sleep/i.test(r.Category) && mins_(r['Start Time']) != null && mins_(r['Start Time']) >= t - 60)) return;
        out.push({ key: today + '|' + kid.id + '|' + i.start + '|' + i.label, at: t, title: who(kid) + (plan.tp.name || 'Routine'),
          text: i.label + ' at ' + i.start + (all ? '' : ' (in ' + until + ' min)') + (i.note ? ' · ' + i.note : ''), priority: 'default', tags: k === 'meal' ? 'fork_and_knife' : k === 'visit' ? 'car' : 'baby_bottle' });
      });
    }
    if (REMIND.meds && typeof readMeds_ === 'function') {
      (readMeds_() || []).forEach(m => {
        const name = String(m.Name || '').trim(); if (!name) return;
        if (kids.length > 1 && !kid.match(m.Child)) return;
        if ((m.From && m.From > today) || (m.Until && m.Until < today)) return;
        const s = slug_(name);
        String(m.Times || '').split(/[,;]+/).map(x => mins_(x)).filter(x => x != null).forEach(t => {
          const given = rows.some(r => r._date === today && kid.match(r.Child) && /^meds?$/i.test(String(r.Category).trim())
            && (slug_(r.Tags).indexOf(s) >= 0 || slug_(r.Notes).indexOf(s) >= 0) && (mins_(r['Start Time']) == null || mins_(r['Start Time']) >= t - 120));
          const dose = name + (m.Dose ? ' ' + m.Dose : '');
          if (all) { out.push({ key: today + '|med|' + s + '|' + t, at: t, title: who(kid) + 'Medication', text: '💊 ' + dose + ' at ' + hm_(t) + (given ? ' (given)' : ''), priority: 'high', tags: 'pill' }); return; }
          if (given) return;
          if (nowMin >= t && nowMin < t + 10) out.push({ key: today + '|med|' + s + '|' + t, title: who(kid) + 'Medication', text: '💊 ' + dose + ' now (' + hm_(t) + '). Check it off in the dashboard.', priority: 'high', tags: 'pill' });
          if (MED_NUDGE_MIN > 0 && nowMin >= t + MED_NUDGE_MIN && nowMin < t + MED_NUDGE_MIN + 10) out.push({ key: today + '|med2|' + s + '|' + t, title: who(kid) + 'Medication', text: '💊 ' + dose + ' (' + hm_(t) + ') isn’t checked off yet.', priority: 'high', tags: 'pill,warning' });
        });
      });
    }
  });
  return out.sort((a, b) => (a.at || 0) - (b.at || 0));
}

/** Runs every 5 minutes (installReminderTrigger). */
function sendReminders(e, at) {
  const cache = CacheService.getScriptCache();
  dueReminders_(at).forEach(r => {
    if (cache.get(r.key)) return;
    const headers = { Title: r.title, Tags: r.tags, Priority: r.priority };
    if (DASHBOARD_URL) headers.Click = DASHBOARD_URL;
    UrlFetchApp.fetch('https://ntfy.sh/' + NTFY_TOPIC, { method: 'post', payload: r.text, headers: headers, muteHttpExceptions: true });
    cache.put(r.key, '1', 21600);
  });
}
/** ▸ Run to see today's reminders in the log (nothing is sent). */
function previewReminders() {
  const list = dueReminders_(null, true);
  Logger.log(list.length ? list.map(r => r.title + ' — ' + r.text).join('\n') : 'Nothing found. Open the dashboard once (connected to this Sheet) so the Config tab has your templates.');
}
/** ▸ Run once: sends a test to your topic, then checks for reminders every 5 minutes. */
function installReminderTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sendReminders').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendReminders').timeBased().everyMinutes(5).create();
  UrlFetchApp.fetch('https://ntfy.sh/' + NTFY_TOPIC, { method: 'post', payload: 'Reminders are on. You’ll get naps, meals, bedtime and medications here.', headers: { Title: 'Baby routine', Tags: 'white_check_mark' }, muteHttpExceptions: true });
}
