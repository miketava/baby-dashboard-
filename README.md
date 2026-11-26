# 🌙 Baby Routine Dashboard

**Version 1.30.1** · [Changelog](CHANGELOG.md) · English / Français

A private, free dashboard for a baby's or toddler's sleep, feeding, development and daily routine. Your log lives in **your own Google Sheet**. The dashboard is a single web page you can host for free, install on your phone, and share with whoever helps care for your child.

No accounts, no app store, no subscription, and nothing sent to anyone's servers but your own Google Apps Script.

> **Try it first:** open `index.html` in a browser. A short setup wizard asks about your child (or skip it). Then explore with example data (a newborn's first four weeks, an older baby's routine, or an adoption placement with visits) and take the **guided tour** with the **?** button.

---

## Who it's for

The setup wizard picks one of three starting points. Every feature can be switched on or off later in *Settings → Child & features*.

| Path | Starts with |
|---|---|
| 👶 **Birth / newborn** | Breastfeeding (side and timer), bottles, pumping, diapers, tummy time, growth on WHO curves. No fixed schedule needed. |
| 🗓️ **Routine (6 months +)** | Nap schedule and wake windows, meals and new foods, outings, routine score, growth and teeth. |
| 🏡 **Adoption / placement / foster** | Everything in Routine, plus visits and handovers, contact with the birth family, a daily check-in, cocooning, and reports for caseworkers. |

**A good fit if you** like seeing patterns, want several caregivers logging into one place, need printable summaries for a pediatrician, daycare or caseworker, or prefer to own your data.

**Probably not the right fit if** you want a polished app with zero setup. Commercial baby trackers start faster; this one trades a 10-minute setup for privacy, flexibility and deeper analysis.

Suggested targets come from your child's age and are updated as they grow; the dashboard asks before changing anything. **Adjust them with your pediatrician.** Growth percentiles use the WHO Child Growth Standards (birth to 2 years) as a reference. The dashboard shows patterns in what you log; it is not medical advice.

---

## Features

**Every day**
- **Today banner:** what's happening now (asleep or awake, and for how long; current feed and side), the next nap window based on today's actual wake-up, what's coming up, and today's totals against your targets.
- **＋ Quick Log:** one-tap buttons that write straight to the Sheet: start/end a nap, breastfeed (left, right, switch), bottle, diaper, meal, play, weight, temperature, milestone, family contact. It works offline and sends entries when you're back online.
- **Fix mistakes:** press and hold any entry in any tab (right-click on a computer) to edit or delete it. The change is stamped *Edited At*; the original *Logged At* time is kept.
- **Medications:** set a regular medication (dose, time, until when or ongoing) and get a reminder with a one-tap **✓ Given** check-off, plus a 30-day history.
- **Reminders:** browser notifications before naps, meals and feeds, plus optional lock-screen phone reminders through the free *ntfy* app.

**Sections** (a sidebar on a computer; on a phone, a bottom bar with Today, Timeline, ＋ Log, Check-ins and More)
| Section | What it shows |
|---|---|
| 📅 Today | The live banner (asleep or awake, next nap window, today's totals), **today's plan** from your template with notes, what's now and next, and upcoming calendar visits; **today's entries** with ✏️ to fix any of them; and today on the 24-hour grid. |
| 🗓️ Timeline | Every day on a 24-hour colour-coded grid with your schedule targets overlaid. Click a day for the full breakdown. |
| 📊 Routine & Visits | **Trends to watch** (three-day shifts in sleep or eating, nap-transition hints), daily **routine score** (how closely the day followed *your* routine), plain-language findings, and on the placement path: before / during / after-visit analysis, visit-by-visit table, cocooning. |
| 😴 Sleep | Sleep per day, wake windows against your targets, which days lead to calmer nights, the last wake window that gives the easiest bedtime, and the effect of outings, visits and car rides. |
| 🍼 Feeding | Newborn feeds (gaps, longest stretch, left/right balance, cluster feeding), milk by time of day, fluids, foods offered and accepted, **allergen upkeep** (when each allergen group was last offered), allergen groups. |
| 🩺 Health & Growth | Milestones, appointments and health notes, temperatures, vaccines, diapers and meds, **growth** (WHO percentiles), the **Québec vaccine schedule** with post-vaccine notes, **teething vs sleep** and a **tooth chart**. |
| 📝 Check-ins | The **end-of-day check-in** (see below): which days are done and a running summary per area. |
| 💬 Birth Family | Texts, calls and emails with the birth family: per day, time of day, topics, basic / in-depth / follow-up, reply times, tone, how it compares with the communication agreement, and questions asked again or photo / update requests on visit days. |
| 🗂️ Data | One row per day and the full event log, sortable, with CSV export. |

**End-of-day check-in** (placement path; can be turned on for anyone): a short evening form covering language, emotional development, hunger and feeding, play, sleep, and communication with the birth parents. Each area has quick-tap answers for what can be counted, a good / mixed / hard rating, and your own words. The form shows what the day's log already says, and a reminder appears until it's done. It builds a reliable day-by-day record, and reports turn it into an **Observations** section.

**Reports:** printable / PDF summaries for any period, or two-week caseworker reports with an "all visits to date" option. They cover sleep, feeding, growth, teeth, family contact, observations, milestones, appointments, a day-by-day table and your comments. Save an unchangeable copy of each report you submit. Reports say how many entries were corrected and how many were logged in real time.

**Families**
- **Several children:** add children in *Settings → Child & features*. Each gets their own profile, schedule, score, reports and check-ins. Switch between them in the header; **All** stacks everyone's days on one timeline.
- **Sharing:** *Settings → Sharing & viewers* creates **read-only viewer keys** (e.g. for a caseworker). A viewer key can be limited to one child and can leave categories out. That filtering happens in your Apps Script before anything leaves Google, and the viewer sees a "Not included: …" line so nothing is silently missing.
- **English / Français:** the whole app and its reports. Browsers set to French open in French.

---

## Quick start

### 1. Just look (1 minute)
Open `index.html` in Chrome, Edge, Firefox or Safari and pick "Explore with example data".

### 2. Use a CSV (no Google account)
Make a spreadsheet with the columns below, export it as CSV and drag it onto the dashboard.

### 3. Live Google Sheet (recommended, about 10 minutes)
1. **Create the Sheet.** A Google Sheet with a tab named exactly **`Daily Log`** and these headers in row 1:
   `Date | Start Time | End Time | Duration (min) | Category | Milk (oz) | Notes | Water (ml) | Tags | Outcome / Rating | Value`
   (Metric users can name the milk column `Milk (ml)`. Missing columns like `Child`, `Logged At` or `Edited At` are added automatically when needed.)
2. **Add the script.** In the Sheet: *Extensions → Apps Script*. Delete the starter code, paste [`apps-script/Code.gs`](apps-script/Code.gs) (or *Copy script* in *Settings → Setup guide*). There's nothing to edit in it. Set the time zone under ⚙️ *Project Settings*. Save.
3. **Deploy it.** *Deploy → New deployment →* ⚙️ *Web app*. Execute as **Me**; Who has access: **Anyone** (the script rejects anything without your secret). Approve the permissions; on "Google hasn't verified this app", choose *Advanced → Go to … (unsafe)*, which is expected for your own script. Copy the **Web app URL** (ends in `/exec`).
4. **Optional: visits and appointments from your calendar.** Appointments (doctor, dentist, CLSC, vaccine… in the title) are offered once in the Today banner ("Is this for her?"); the ones you accept pick a morning, midday or afternoon appointment day. Their title and calendar name are sent to your own dashboard for that question, never to viewer keys; set `APPOINTMENTS = false` in the script to turn it off.
   **Naming tip:** what an event is depends on the part before a dash, so you can add who's coming after it. *"Visite parents et Ava - Julie"* is an off-site family visit; *"Home visit - Marie (TS)"* or *"… à domicile"* is a visit at home (your usual day, no car naps); *"Pédiatre - vaccins 18 mois"* is an appointment.
   **Visits:** If off-site visits are in your Google Calendar (your own or a shared one, like a family calendar) with "visit" or "visite" in the title, choose `checkCalendar` in the Apps Script toolbar and click ▸ **Run** once to approve calendar access. The dashboard then picks the visit-day template ahead of time. Only dates and times are read. Set `CALENDAR_ID = ''` in the script if you don't want this.
5. **Optional: timestamps.** In the Apps Script toolbar choose `markExistingRows` and click ▸ **Run** once. From then on every row records when it was entered (*Logged At*) and when it was corrected (*Edited At*).
6. **Connect.** Dashboard → ⚙️ *Settings → Data source*: paste the URL and tap **Save & sync**. Leave the secret blank: this phone creates one and stores it in the script (*Script properties*), never in the code.
7. **Add the other caregivers' phones.** *Settings → Data source → Connect another phone* gives a link. Send it **privately** (it works like a password); opening it on their phone connects it. Shared settings then come from the Sheet (see below), so later changes reach everyone.
8. **Optional: one-tap script updates.** *Settings → Setup guide*, last section: switch on the Apps Script API, paste the `appsscript.json` manifest, ▸ Run `allowOneTapUpdates`. Future script updates then install from *Settings → Data source → Update script*.

---

## Put it on your phone

Host the dashboard on **GitHub Pages** (free):

1. Create a **public** repository. That's fine: the page contains no data and no secret.
2. Upload `index.html`, `manifest.webmanifest`, `sw.js` and the icon files (`icon-192.png`, `icon-512.png`, `icon-maskable.png`, `apple-touch-icon.png`).
3. *Settings → Pages →* deploy from the `main` branch, `/ (root)`. After a minute you get `https://<you>.github.io/<repo>/`.
4. **Android:** open the link in Chrome → ⋮ → **Install app**. **iPhone:** Safari → Share → **Add to Home Screen**, then open it from the icon and import your config there (the Home Screen app keeps its own storage).

It installs like an app, opens offline with the last synced data, and picks up new versions automatically. To update, replace `index.html` in the repo.

---

## The Sheet format

One row per event. Only **Date** and **Category** are required.

| Column | Example | Notes |
|---|---|---|
| Date | `2026-11-21` | The day the event started |
| Start Time | `20:05` | 24-hour. Blank = an all-day record (milestone, check-in) |
| End Time | `06:50` | Blank = instant (bottle, diaper). Earlier than the start = ran past midnight |
| Duration (min) | `65` | Optional, calculated automatically |
| Category | `Sleep - Nap` | See below |
| Milk (oz) | `4.5` | Milk, Bottle and Pump rows |
| Notes | `Fell asleep fast` | Anything |
| Water (ml) | `90` | Optional |
| Tags | `eggs, toast` | Comma-separated: foods, moods, breastfeeding side, contact details… |
| Outcome / Rating | `Ate Well` | Meals: Ate Well / Partial / Refused · Sleep: Easy / Fussy / Rough · Health: Monitor / Resolved / Follow-up Needed · and more |
| Value | `7 lb 8 oz` | Measurements: weight, length, head, temperature |
| Child | `Ava` | Only with several children: a name, several separated by commas, or `all` |

**Categories understood out of the box:** Sleep - Night, Sleep - Nap, Sleep - Car Nap, Awake / Restless, Breastfeed, Bottle, Pump, Milk, Water, Breakfast, Lunch, Dinner, Snack, Tummy Time, Play, Bath, Car Ride, Visit, Home Visit, Outing / Excursion, Guest, Family Contact, Handover, Medical / Appointment, Health / Incident, Vaccine, Temperature, Weight, Height, Head Circumference, Tooth, Milestone, Behaviour, Diaper - Wet, Diaper - Poop, Meds, and the `Check-in - …` rows written by the check-in form.

You can invent your own (`Daycare`, `Swim class`…). New categories are picked up automatically with their own colour, and typos like `Sleep - Npa` are flagged rather than silently counted.

### Shared settings: the Config and Medications tabs (Apps Script v1.3+)

The script creates two more tabs the first time a dashboard syncs with it; you don't need to prepare them. The first device to sync copies its current settings in.

- **Config:** one row per setting (`Key`, `Value` as JSON, `Updated At`, `Updated By`). Child profiles (`child:<id>:profile`), targets, day templates, scoring, the family-contact rules, check-in time and similar. Change these from the dashboard; the JSON is there so nothing is lost.
- **Medications:** one row per medication (`Child`, `Name`, `Dose`, `Times`, `From`, `Until`, `Note`). Fine to edit by hand: several times are separated by commas, dates are `YYYY-MM-DD`, blank *Until* means ongoing.

Every device applies changes made elsewhere on its next sync and pushes its own changes a moment after you make them. Language, theme, filters, reminders and *Who am I* stay on each device. View-only keys never receive these tabs. Don't let an AI assistant write to them.

**Turning written notes into rows with an AI assistant?** The full spec of every column, category, tag and outcome, with examples, is in [docs/daily-log-schema.md](docs/daily-log-schema.md). Paste it into your assistant's instructions.

---

## Files

| File | What it is |
|---|---|
| `index.html` | The whole dashboard. Contains **no personal data**; safe to publish. |
| `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon.png` | Make it installable on phones and usable offline |
| `apps-script/Code.gs` | Google Apps Script for your Sheet: read (sync), Quick Log writes, edits and deletes, timestamps, read-only viewer keys, planned visits from Google Calendar |
| `apps-script/appsscript.json` | *Optional.* The Apps Script manifest with the permissions one-tap updates need (*Settings → Setup guide* copies it with your time zone). |
| `apps-script/Reminders.gs` | *Optional.* Lock-screen phone reminders through ntfy.sh (v2): naps, meals, bedtime routines, visits and medication doses, following the same day template as the dashboard (calendar visits and appointments included) and reading templates and medications from the Sheet's Config and Medications tabs. Copy it from *Settings → Reminders* (topic filled in), add it as a second script file named `Reminders`, run `installReminderTrigger` once, subscribe in the ntfy app. Needs `Code.gs` v1.5. |
| `README.md`, `CHANGELOG.md` | This file and the version history |

`Code.gs` holds no secret: it lives in each family's *Script properties*. **Never commit** your Web app URL, a connect link or an exported config file.

---

## Working on the code

`index.html` is **built**; don't edit it by hand. The source is in `src/`, split by concern, and `node tools/build.js` (or `./build.sh`) joins the files in the order listed in `src/BUILD_ORDER` into one self-contained page, so the app keeps working as a single file on GitHub Pages with no bundler or dependencies.

| Folder | What's in it |
|---|---|
| `src/shell/` | The page's HTML skeleton and styles |
| `src/core/` | Version, constants, default settings, settings storage, categories, utilities |
| `src/i18n/` | French translations, language switching, the in-app changelog |
| `src/data/` | Parsing Sheet rows, loading (demo, CSV, Sheet, offline queue), Quick Log writes, WHO tables |
| `src/analytics/` | Per-day metrics, templates, routine score, visit cycle, foods |
| `src/views/` | One file per section: today, timeline, sleep, nutrition, health, patterns, data |
| `src/features/` | Medications, smart suggestions, reports, family contact, check-ins, kids, growth & teeth, cocooning… |
| `src/quicklog/` | The Quick Log panel and editing entries |
| `src/ui/` | Navigation, swipes, day panel, filters, ⓘ buttons, Back button, charts |
| `src/settings/`, `src/onboarding/`, `src/boot/`, `src/sync/` | Settings panes, setup wizard and tour, event wiring and start-up, shared settings in the Sheet |
| `apps-script/Code.gs` | The Apps Script, also inlined into the page at build time (Settings shows and copies it) |

The files share one global scope and run top to bottom in `BUILD_ORDER`, so a new file goes after anything it uses at load time. The build refuses to run if a file in `src/` isn't listed, or if `Code.gs` holds a secret instead of reading it from Script Properties.

**Releasing:** bump `APP_VERSION` and add an English + French entry at the top of `src/i18n/changelog.js`, mirror it in `CHANGELOG.md`, build, test, commit. Bump `SCRIPT_VERSION` (in `Code.gs`) and `REQUIRED_SCRIPT` (in `src/core/version.js`) only when the script changes.

**Tests:**
- `node tests/apps_script.test.js`: runs `Code.gs` against an in-memory Sheet (append, end, edit, delete, Config and Medications tabs, calendar appointments, claiming, viewer keys, one-tap updates against a fake Apps Script API).
- `node tests/reminders.test.js`: runs `Reminders.gs` with `Code.gs` (which day template, routines on their nights, quiet while asleep, calendar visits and appointments, medication doses and nudges).
- `python tests/smoke.py`: opens the built page in Chromium (Playwright): every section in three family setups, English and French, phone and computer, without errors; Quick Log, score sliders, filter buttons, the whole tour, the day panel and phone swipes. Setup: `pip install playwright` then `python -m playwright install chromium`.

## Privacy

- Your log lives in **your** Google Sheet, read through **your** Apps Script and protected by your secret.
- Settings and a cached copy of the data stay in **your browser** (*Settings → Backup → Reset* clears them).
- The page loads two open-source libraries (Chart.js, PapaParse) from a public CDN; no data is sent with those requests.
- Viewer keys only ever receive the rows you allow, filtered on Google's side.

---

## Updating

- **The dashboard:** replace `index.html` in your repo. Everyone gets the new version on their next open, with a short "What's new" note.
- **The Apps Script** has its own version number and changes less often. When a release needs it, the dashboard shows a 🔧 notice. With one-tap updates on, tap *Update script* in *Settings → Data source*. Otherwise use **Copy script** in *Settings → Setup guide*, paste it over everything in `Code.gs`, then *Deploy → Manage deployments →* ✏️ *→ Version: New version → Deploy* (same URL). The secret and viewer keys aren't in the code, so nothing is lost. *Settings → About & changes* shows both versions.

## Troubleshooting

- **"Did not return JSON":** the deployment isn't set to *Anyone*, or you pasted the editor URL instead of the `/exec` one.
- **"Unauthorized: token mismatch":** this phone's secret doesn't match the script's. Open a *Connect another phone* link from a phone that works.
- **"Already connected to another phone":** someone connected first. Use their *Connect another phone* link. To start over: ▸ Run `resetConnection` in Apps Script.
- **Update script says the API is off:** switch on *Google Apps Script API* at script.google.com/home/usersettings.
- **Quick Log says "saved on this device":** no Sheet is connected or you're offline; entries are sent on the next sync.
- **"That row has changed in the Sheet":** someone edited the same entry since your last sync. Refresh and try again.
- **No notifications:** they need the page served over `https://` (GitHub Pages works). On iPhone, add it to the Home Screen first.
- **Times off by a few hours:** set the time zone in Apps Script *Project Settings* and in the Sheet (*File → Settings*).
- **A ⚠ badge in the header:** click it to see rows that couldn't be read cleanly (missing date, typos, unknown child names). **Duplicates** are listed side by side, with a button to delete the extra copy (or all suggested extras) from the Sheet.
