const cmpVer = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
const LS_REPORTS = 'bld.reports.v3';  // saved report snapshots + caregiver comments per period
const LS_SETTINGS = 'bld.settings.v1', LS_CACHE = 'bld.cache.v1', LS_FILTER = 'bld.filter.v1';
const LS_LOCAL = 'bld.local.v2';      // quick-log entries kept on this device (no endpoint / offline queue)
const LS_UI = 'bld.ui.v2';

/** Canonical v2 column headers (A–J). New columns H–J are optional everywhere. */
const HEADERS = ['Date','Start Time','End Time','Duration (min)','Category','Milk (oz)','Notes','Water (ml)','Tags','Outcome / Rating'];

/**
 * Curated defaults. `kind` drives analytics behaviour; unknown categories get a kind by keyword
 * (see catKind) plus a deterministic colour.
 */
const DEFAULT_CATS = {
  'Sleep - Night':        { color:'#4338ca', icon:'🌙' },
  'Sleep - Nap':          { color:'#818cf8', icon:'💤' },
  'Sleep - Car Nap':      { color:'#a78bfa', icon:'🚙' },
  'Awake / Restless':     { color:'#f43f5e', icon:'⚡' },
  'Breakfast':            { color:'#f59e0b', icon:'🥣' },
  'Lunch':                { color:'#f97316', icon:'🥪' },
  'Dinner':               { color:'#c2410c', icon:'🍽' },
  'Snack':                { color:'#eab308', icon:'🍎' },
  'Milk':                 { color:'#0ea5e9', icon:'🍼' },
  'Water':                { color:'#2dd4bf', icon:'💧' },
  'Bath':                 { color:'#14b8a6', icon:'🛁' },
  'Car Ride':             { color:'#64748b', icon:'🚗' },
  'Visit':                { color:'#ec4899', icon:'🏠' },
  // v2 additions
  'Home Visit':           { color:'#f59e0b', icon:'🏡' },
  'Outing / Excursion':   { color:'#22c55e', icon:'🛒' },
  'Guest':                { color:'#a855f7', icon:'👥' },
  'Family Contact':       { color:'#0ea5e9', icon:'💬' },
  'Play':                 { color:'#f97316', icon:'🧸' },   // play logged during the day (activity, with whom, attention)
  'Check-in - Language':  { color:'#14b8a6', icon:'🗣️' }, 'Check-in - Emotional': { color:'#14b8a6', icon:'💗' }, 'Check-in - Feeding': { color:'#14b8a6', icon:'🍽️' },
  'Check-in - Play':      { color:'#14b8a6', icon:'🧸' }, 'Check-in - Sleep':     { color:'#14b8a6', icon:'😴' }, 'Check-in - Parents': { color:'#14b8a6', icon:'📱' },
  'Check-in - Other':     { color:'#14b8a6', icon:'📝' },   // contact with the birth family (placement path)   // visitors at home (cocooning tracking)
  'Medical / Appointment':{ color:'#0284c7', icon:'🩺' },
  'Health / Incident':    { color:'#dc2626', icon:'✚' },
  'Milestone':            { color:'#eab308', icon:'⭐' },
  'Diaper - Wet':         { color:'#38bdf8', icon:'💧' },
  'Diaper - Poop':        { color:'#a16207', icon:'💩' },
  'Meds':                 { color:'#9333ea', icon:'💊' },
  // v3 additions — structured visit handovers and reactions (so they can be counted, not just read)
  'Handover':             { color:'#db2777', icon:'🤝' },
  'Behaviour':            { color:'#7c3aed', icon:'🙂' },
  // v4 additions — newborn feeding, growth, teeth, health (analytics arrive with their modules)
  'Breastfeed':           { color:'#f472b6', icon:'🤱' },
  'Bottle':               { color:'#38bdf8', icon:'🍼' },
  'Pump':                 { color:'#a5b4fc', icon:'🧴' },
  'Tummy Time':           { color:'#84cc16', icon:'🧸' },
  'Weight':               { color:'#0d9488', icon:'⚖️' },
  'Height':               { color:'#0f766e', icon:'📏' },
  'Head Circumference':   { color:'#115e59', icon:'📐' },
  'Tooth':                { color:'#e2e8f0', icon:'🦷' },
  'Temperature':          { color:'#ef4444', icon:'🌡️' },
  'Vaccine':              { color:'#0891b2', icon:'💉' },
};
const GROUPS = [
  { id:'Sleep', label:'Sleep' }, { id:'Alert', label:'Alert & Behaviour' },
  { id:'Nutrition', label:'Nutrition' }, { id:'Routine', label:'Routine' },
  { id:'Visits', label:'Visits & Outings' }, { id:'Health', label:'Health & Milestones' },
  { id:'Care', label:'Care' }, { id:'Other', label:'Other' },
];
const GROUP_ICON = { Sleep:'💤', Alert:'⚡', Nutrition:'🍴', Routine:'📍', Visits:'🚗', Health:'✚', Care:'•', Other:'•' };
const KIND_GROUP = { night:'Sleep', nap:'Sleep', awake:'Alert', milk:'Nutrition', water:'Nutrition', meal:'Nutrition',
  bath:'Routine', car:'Routine', visit:'Visits', homevisit:'Visits', outing:'Visits', guest:'Visits', contact:'Visits', play:'Routine', checkin:'Health', handover:'Visits', behaviour:'Alert',
  nurse:'Nutrition', pump:'Nutrition', tummy:'Routine', growth:'Health', tooth:'Health', temp:'Health', vaccine:'Health',
  medical:'Health', incident:'Health', milestone:'Health', diaper:'Care', meds:'Care', other:'Other' };
/** Kinds that represent a span of time: a row with a start but no end is "in progress" if recent. */
const DURATIONAL = new Set(['night','nap','awake','visit','homevisit','outing','guest','medical','car','bath','nurse','tummy','pump']);
/** Kinds that are pinned to the date header instead of the time grid. */
const RIBBON = new Set(['milestone','incident','growth','tooth','vaccine']);

/** Standardised Outcome / Rating values (v2 column J). */
const OUTCOMES = {
  meal:     ['Ate Well','Partial','Refused'],
  sleep:    ['Easy','Fussy','Rough'],
  incident: ['Monitor','Resolved','Follow-up Needed'],
  handover: ['Calm','Unsettled','Distressed'],       // child's state at drop-off / pick-up
  behaviour:['Positive','Mixed','Difficult'],
  contact:  ['Positive','Neutral','Difficult'],         // tone of a contact with the birth family
};
const OUTCOME_TONE = { 'Ate Well':'good', 'Easy':'good', 'Resolved':'good', 'Partial':'mid', 'Fussy':'mid', 'Monitor':'mid', 'Refused':'bad', 'Rough':'bad', 'Follow-up Needed':'bad',
  'Calm':'good', 'Unsettled':'mid', 'Distressed':'bad', 'Positive':'good', 'Mixed':'mid', 'Difficult':'bad', 'Neutral':'mid' };
/** Reaction vocabulary: tags (and a few Notes keywords) that are counted as difficult / positive reactions. */
const REACT_NEG = ['clingy','upset','upset-at-handover','tantrum','crying','inconsolable','regression','night-terror','aggressive','hitting','biting','withdrawn','not-eating','fussy','screaming','separation-anxiety'];
const REACT_POS = ['happy','settled','calm','playful','content','smiling','engaged','affectionate'];
const REACT_NEG_RE = /\b(cry|crying|cried|tantrum|clingy|upset|inconsolable|scream|screaming|meltdown|distress)/i;
const HANDOVER_TAGS = ['drop-off','pick-up','agency','parent','caregiver','on-time','late'];

/**
 * Schedule templates. Items with `end` → translucent bands; without → lines.
 * `optional` naps are never flagged as late; `targets` (blank = use global Targets).
 */
const DEFAULT_TEMPLATES = [
  { id:'baseline', name:'Baseline Home Day', targets:{ maxDaySleep:150, milkMin:12, milkMax:15 }, items:[
    { label:'Wake', kind:'wake', start:'07:15', note:'Water + open blinds' },
    { label:'Breakfast', kind:'meal', start:'07:45', note:'Solids' },
    { label:'Wind-down + milk', kind:'note', start:'09:55', note:'Dim room, diaper, sleep sack · 4–5 oz' },
    { label:'Nap 1', kind:'nap', start:'10:15', end:'11:30', note:'Wake at 11:30 if still asleep' },
    { label:'Lunch', kind:'meal', start:'12:00', note:'Solids' },
    { label:'Wind-down + milk', kind:'note', start:'14:25', note:'Same pre-nap cue · 4–5 oz' },
    { label:'Nap 2', kind:'nap', start:'14:45', end:'16:00' },
    { label:'Hard Nap Cutoff', kind:'cutoff', start:'16:00', note:'Hard wake-up' },
    { label:'Snack', kind:'meal', start:'16:15', note:'Solids + water' },
    { label:'Dinner', kind:'meal', start:'17:45', note:'Hearty meal' },
    { label:'Bath + bedtime routine', kind:'note', start:'19:15', beforeBed:45, days:'Mon, Thu, Sun', note:'Bath (15 min), lotion and PJs, 4–5 oz milk, brush, story, sleep sack' },
    { label:'Bedtime routine', kind:'note', start:'19:30', beforeBed:30, days:'Tue, Wed, Fri, Sat', note:'Diaper and PJs, 4–5 oz milk, quick brush, sleep sack' },
    { label:'Bedtime', kind:'bedtime', start:'20:00', note:'Down by 20:00' },
  ]},
  { id:'late-visit', name:'Late-Morning Visit Day', targets:{}, items:[
    { label:'Breakfast', kind:'meal', start:'07:45' },
    { label:'Car Nap 1', kind:'nap', start:'10:00', end:'10:45', note:'On the drive there' },
    { label:'Visit', kind:'visit', start:'11:00', end:'12:30' },
    { label:'Lunch', kind:'meal', start:'11:45' },
    { label:'Car Nap 2', kind:'nap', start:'12:45', end:'13:30', note:'On the drive home' },
    { label:'Optional Bridge Nap', kind:'nap', start:'16:00', end:'16:20', optional:true, note:'Only if very tired · skipping it means the 19:00 bedtime' },
    { label:'Dinner', kind:'meal', start:'17:45' },
    { label:'Bedtime (no bridge)', kind:'bedtime', start:'19:00' },
    { label:'Bedtime (with bridge)', kind:'bedtime', start:'20:00' },
  ]},
  { id:'early-visit', name:'Early-Morning Visit Day', targets:{}, items:[
    { label:'Wake', kind:'wake', start:'07:00' },
    { label:'Breakfast', kind:'meal', start:'07:20' },
    { label:'Car Nap 1', kind:'nap', start:'08:15', end:'08:50' },
    { label:'Visit', kind:'visit', start:'09:00', end:'10:30' },
    { label:'Car Nap 2', kind:'nap', start:'10:40', end:'11:25' },
    { label:'Lunch', kind:'meal', start:'11:45' },
    { label:'Capped Crib Nap', kind:'nap', start:'14:30', end:'15:45' },
    { label:'Snack', kind:'meal', start:'16:00' },
    { label:'Dinner', kind:'meal', start:'17:45' },
    { label:'Bedtime', kind:'bedtime', start:'20:00' },
  ]},
];
/** Poop consistency, grouped as in the Brussels Infant and Toddler Stool Scale (BITSS) for children in diapers; the type numbers follow the Bristol scale. Stored as a plain tag. */
const STOOL = () => [
  ['hard',   L('Hard', 'Dures'),     L('types 1–2 · separate lumps or lumpy', 'types 1–2 · boules ou bosselées')],
  ['formed', L('Formed', 'Moulées'), L('types 3–5 · sausage-shaped or soft blobs', 'types 3–5 · en boudin ou morceaux mous')],
  ['loose',  L('Loose', 'Molles'),   L('type 6 · mushy, ragged edges', 'type 6 · bouillie, bords irréguliers')],
  ['watery', L('Watery', 'Liquides'),L('type 7 · no solid pieces', 'type 7 · sans morceaux solides')],
];
const STOOL_KEYS = ['hard', 'formed', 'loose', 'watery'];
/** Simple drawn icons for the four groups (original shapes, not the BITSS photos). */
const STOOL_ICON = {
  hard:   '<circle cx="7" cy="12" r="3.4"/><circle cx="14.5" cy="10" r="3.1"/><circle cx="21.5" cy="12.5" r="3.3"/><circle cx="11" cy="18" r="2.6"/><circle cx="18.5" cy="17.5" r="2.7"/>',
  formed: '<path d="M4 15.5c0-3 2.4-5 5.5-5h9c3.1 0 5.5 2 5.5 5s-2.4 5-5.5 5h-9C6.4 20.5 4 18.5 4 15.5z"/><path d="M10 11.5c.6 1.6.6 6.3 0 8M16 11.5c.6 1.6.6 6.3 0 8" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.1"/>',
  loose:  '<path d="M3.5 17c1-3.6 3.6-4.2 5-6.2 1.8 1.4 2.6-.8 4.6.3 1.6-1.4 3.8-.4 4.6 1 1.8-.5 3.5.6 3.8 2.4 1.6.6 2 2.4 1 3.6-1.2 1.4-3 .6-4.4 1.4-1.6.9-3.6.2-5.2.8-1.8.6-3.6-.2-5-.6-1.6-.4-4.6-.4-4.4-2.7z"/>',
  watery: '<path d="M3 18.5c2.2-1.6 4.6-1 6.4-1.8 2-.9 4-.4 5.8-.2 2 .3 4-.8 6-.2 1.6.5 2.4 1.6 1 2.4-2 1.2-4.8.6-7 1.1-2.4.5-5 .3-7.4 0-1.8-.2-5.2.2-4.8-1.3z" opacity=".85"/><path d="M8.5 11.5c0 1.3-.9 2.1-1.8 2.1s-1.8-.8-1.8-2.1S6.7 8.6 6.7 8.6s1.8 1.6 1.8 2.9zM17.5 9.5c0 1.1-.8 1.8-1.5 1.8s-1.5-.7-1.5-1.8.9-2.6 1.5-3.4c.6.8 1.5 2.3 1.5 3.4z" opacity=".7"/>',
};
const stoolIcon = (k, sz = 26) => `<svg class="stool-ic" viewBox="0 0 28 24" width="${sz}" height="${Math.round(sz * 24 / 28)}" aria-hidden="true" fill="${{ hard:'#7c3f12', formed:'#a0522d', loose:'#b7791f', watery:'#c9a227' }[k]}">${STOOL_ICON[k]}</svg>`;
const isPoopCat = c => /poop|dirty|\bbm\b|stool|caca|selle/i.test(String(c || ''));
const KIND_STYLE = {
  wake:   { color:'#10b981', label:'Wake target' },
  nap:    { color:'#6366f1', label:'Nap window' },
  meal:   { color:'#f59e0b', label:'Meal / snack' },
  visit:  { color:'#ec4899', label:'Visit window' },
  cutoff: { color:'#ef4444', label:'Hard nap cutoff' },
  bedtime:{ color:'#8b5cf6', label:'Bedtime target' },
  note:   { color:'#64748b', label:'Marker' },
};

/** French for the fixed page text (02_body); dynamic text uses L(en, fr). */
