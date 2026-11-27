const DEFAULT_SETTINGS = {
  title: 'Baby Routine Dashboard',
  lang: '',                      // '' = from the browser · 'en' · 'fr'
  theme: 'auto',                 // auto | light | dark
  endpoint: '', token: '',
  autoRefreshMin: 0,             // 0 = off
  cacheData: true,               // keep last loaded data on this device for offline use
  dayBoundary: 360,              // 360 = 06:00 (nights attach to the evening before), 0 = midnight
  instantMode: 'marker',         // marker | block
  instantWidth: 15,
  orientation: 'h', sortDays: 'desc',
  overlayOn: true, overlayTpl: 'auto',
  scatterX: 'day',
  showCare: false,               // Diaper / Meds on the timeline
  todayTpl: { date: null, id: 'auto' },
  dupKeep: [],                            // entries logged twice that were kept apart on purpose (v1.33)
  trendAck: {},                           // acknowledged trends: { [kid:]key: { at, v, by } } (v1.31)   // manual override for today only
  apptFor: {}, apptIgnoreCals: [], libSeen: [],   // v1.26: calendar appointments (id → child id or 'no'), ignored calendars, library templates already added
  reminders: { enabled:false, chime:true, lead:15, naps:true, meals:true, cutoff:true, dynamic:true, feedEvery:0 },
  ntfyTopic: '',
  foodWords: '',                 // extra food keywords (comma-separated)
  targets: {
    maxDaySleep: 150, settleNap: 15, settleNight: 15, milkMin: 12, milkMax: 15, waterMl: 0, waterChips: '10, 30, 60, 90, 120, 150',
    ww1: 180, ww2: 210, wwFinal: 240, underTired: 210, earlyWakeShift: 30,
    napCutoff: '16:00', bedtime: '20:00', lateDinner: '18:15',
    nightStart: '22:00', nightEnd: '06:00', splitNightMin: 30,
    bathMin: 2, bathMax: 3, earlyVisitCutoff: '09:30',
    wetMin: 0, dirtyMin: 0,          // diapers per day from your provider's guidance (0 = no target)
  },
  templates: DEFAULT_TEMPLATES.filter(t => t.id === 'baseline'),   // v1.26: visit and appointment days come from the library (features/appointments.js) when they fit
  catColors: {},
  presets: [],
  /** v4 profile: who the dashboard is for and which feature sets are switched on (set by the setup wizard). */
  profile: { onboarded:false, name:'', dob:'', sex:'', path:'', units:'imperial', feeding:'mixed', modules:{}, bandAck:'', whatsNew:'' },
  /** Routine score: weight per component (0 = ignore). Components with no data that day are skipped. */
  score: { weights: { naps:20, budget:15, cutoff:10, bedtime:15, night:20, milk:10, meals:10 }, good:80, ok:60 },
  /** Report builder: 14-day periods counted from `anchor` (ISO date; blank = first day of data). */
  share: { exclude: [], viewers: [] },
  badges: { earned: {}, hidden: {} },   // v1.35: first earned time per tier (per child id, 'H' = household) and hidden badges per child
  seenVersion: '',
  checkinAt: '19:30',             // end-of-day check-in reminder
  contactRules: { perWeek: 0, photos: true },   // birth-family communication agreement (0 = no limit set)               // last version whose “what's new” was shown
  swipeNav: true,                 // phones: swipe left / right between sections (kept on each device)
  kids: [], kid: 0, blankKid: 0, kidView: 'one',   // multiple children (see 67_kids.js); [] = single child
  meds: [],                         // medication schedule: [{ name, dose, times, from, until, note }]
  cocoon: { start: '', weeks: 12 }, // cocooning period: start = placement date (blank = first day of data)        // categories left out of analysis and reports on this device (labelled “Not included”)
  report: { anchor:'', periodDays:14, preparedBy:'', caseRef:'', childLabel:'', includeNotes:true, includeDaily:true, includeCalendar:true },
};

/**
 * v4 demo — a newborn's first four weeks (born 27 days ago at 04:10), fully fictional.
 * Feeds every 2–3 h (closer together in the evening), alternating breast sides, a partner bottle of
 * expressed milk most nights from week 2, diapers ramping up over the first week, birth-weight dip and
 * regain by ~2 weeks, cord, mild jaundice that resolves, checkups, tummy time, vitamin D drops.
 * Same row format as DEMO_ROWS plus a 12th field: Value (measurements, pumped amount).
 */
