# Changelog — Baby Routine Dashboard

Versions follow `major.minor`. The dashboard (`index.html`) and the Apps Script (`Code.gs`) have separate version numbers; the dashboard shows both in **Settings → About & changes** and puts up a notice when your script is older than it needs.

The first time someone opens the app after an update, a **What's new** popup lists the changes since the version they last saw.

**How to release a new version:** bump `APP_VERSION` and add an entry at the top of `CHANGELOG` (both in the dashboard's constants), in English and French. Only bump `SCRIPT_VERSION` in `Code.gs` and `REQUIRED_SCRIPT` in the dashboard when the script itself changes.

---

## v1.6 — 2026-11-24 · Apps Script v1.0 (no script change)

- **New navigation.** Computer: a sidebar grouped as *Daily* (Today, Timeline, Check-ins), *Analysis* (Routine & Visits, Sleep, Feeding, Health & Growth), *Placement* (Birth Family) and *Data*. Phone: a bottom bar with Today, Timeline, a centre **＋** to log, Check-ins and **More** (every other section, plus Report, Settings and the tour). Medium screens keep top tabs, now with icons.
- **Today** is its own section: the live banner plus today's row on the 24-hour grid. **Timeline** holds the day-by-day history.
- **Filters** fold into one summary line (range, day type, search, hidden categories) that turns coloured when anything is filtered, with ✕ to reset. On a phone they open as a panel from the bottom; on a computer the category chips sit behind a 🏷 Categories button. No filters on the Today section.
- On a phone, the timeline's display options (rows/columns, sort, target overlay, legend) are behind **⚙︎ Display**.
- The end-of-day check-in reminder time is also in **Settings → Reminders** (it was only on the Check-ins tab).

## v1.5 — 2026-11-24 · Apps Script v1.0 (no script change)

- **Visit days follow the real visit time:** when an off-site visit starts 15 min to 4 h away from the template's visit time, the visit band and the car naps right before and after it slide by the same amount for scoring and the timeline overlay. Meals, the bridge nap, the cutoff and bedtimes stay put. The day panel shows the shift.
- **Bedtime range:** on a template with an optional bridge nap and two bedtimes (Late-Morning Visit Day: 19:00 without the bridge, 20:00 with it), any bedtime in between counts as on target. Skipping the bridge nap makes 19:00 the suggestion, not a penalty for a 20:00 bedtime.

## v1.4 — 2026-11-24 · Apps Script v1.0 (no script change)

- **Repeat & visit-day questions** (Family Contact tab): flags a topic the family asks again within 24 hours (the window is adjustable) and requests for photos, video or an update on a visit day, noting whether it came before, during or after the visit. “How did the visit go?” is not flagged.
- Flagged contacts show 🔁 / 🏠 in the contact log; the counts appear in the report's Family contact section.
- Optional **Mood** and **Question Type** Sheet columns are read for Family Contact rows (Mood fills the tone when Outcome / Rating is blank; Question Type fills basic / in-depth / follow-up when Tags has none).

## v1.3 — 2026-11-24 · Apps Script v1.0 (no script change)

- **Setup wizard:** choose English or Français on the first screen; features grouped by purpose (sleep & routine, feeding & health, placement & caseworker); a note on adding more children.
- **Guided tour** now covers fixing mistakes, the end-of-day check-in, family contact, cocooning, switching children, the language button, sharing with a caseworker and what's new. The adoption demo includes a week of example check-ins.
- **Duplicates clean-up:** the ⚠ panel shows each duplicate pair side by side, with buttons to delete either copy, or every suggested extra, from the Sheet. Deletes run bottom-up and check each row first, so the wrong row is never removed.
- README rewritten for GitHub; the Gemini schema is now in the repo as `docs/daily-log-schema.md`.

## v1.2 — 2026-11-24 · Apps Script v1.0 (no script change)

- **End-of-day check-in**: one form for language, emotional development, hunger & feeding, play, sleep and communication with the parents (the caseworker's weekly questions). Each area has quick-tap answers, a good / mixed / hard rating and a notes box. The form shows what the day's log already says and pre-fills today's family contacts. Saved as `Check-in - <area>` rows in the same Daily Log (one per area). Re-opening a day updates those rows.
- **Reminder** in the Today banner, plus a browser notification, from a time you choose until the day's check-in is done.
- **Check-ins tab**: which days are done (tap any day to fill it in or change it), and a running summary per area with your notes. Reports get an **Observations** section per area.
- **Communication agreement** (contacts per week, photos allowed) on the Family Contact tab, checked against the log in the tab and in reports.
- **Play** category with activity, who with and attention chips.
- Fixes: "Check-in" category names kept intact; answers like "5+ min" stored safely; the child chips and day squares now show their colours.

## v1.1 — 2026-11-24 · Apps Script v1.0 (no script change)

- **Family Contact** (adoption / placement path): log texts, calls, emails and video calls with the birth family from Quick Log (💬 Family contact), with chips for how, which way, who, what about (food, sleep, nap, teeth, photo request…), basic / in-depth / follow-up, and your response; tone in Outcome. End Time is when you replied (texts and emails) or when the call ended.
- **Family Contact tab**: contacts per day by channel, time of day, topics, kind of question and tone per week, typical reply time, photo requests, visit days vs other days, and the full contact log (press and hold to edit).
- Reports include a Family contact summary; viewer keys can leave the category out.
- Gemini schema v5: one complete document covering every column and category.

## v1.0 — 2026-11-24 · Apps Script v1.0

First numbered release. It includes everything built so far:

- **Fixing mistakes**: tap ✏️ in the day view, or press and hold (right-click on a computer) any entry in any tab, to edit or delete it. The change goes to that Sheet row and is stamped in *Edited At*; the original *Logged At* is kept. Reports count corrected entries. Corrections typed straight into the Sheet are stamped too. An edit is refused if the row changed in the Sheet since the last sync.
- **Several children**: a profile, schedule, routine score and reports for each child; a `Child` column in the Sheet; a switcher in the header with an **All** timeline; a child picker in Quick Log; viewer keys limited to one child, with other children's names removed from shared rows.
- **English / Français** for the whole app, reports included. Values written to the Sheet stay in English.
- **Sharing**: read-only viewer keys (e.g. for a caseworker). Categories are left out by the Apps Script itself, and the viewer sees a "Not included" line. **Cocooning** section for outings and guests during a settling-in period.
- **Phones**: installable (Install app / Add to Home Screen) and opens offline with the last synced data.
- **Setup**: wizard (birth, routine, or adoption / placement), guided tour, three demo families, metric or imperial units.
- **Newborns**: breastfeeding sides and timer, bottles, pumping and cluster feeds; diapers; growth on WHO percentile curves; tooth chart; temperature and vaccines.
- **Routine and reports**: routine score, calendar, before/after-visit analysis, two-week reports with saved copies and a real-time logging record.
- **Sheet**: live sync through your own Apps Script, Quick Log that writes to the Sheet, browser and phone (ntfy) reminders.
- **Version checks**: version numbers, the What's new popup, and a notice when the Apps Script needs updating.

### Before 1.0 (development builds)

| Build | What it added |
|---|---|
| b1 | Single-file dashboard, CSV import, Apps Script sync, timeline, sleep / nutrition / milestones views |
| b2 | Water, tags and outcomes; Today banner and reminders; Quick Log; printable report; ntfy add-on |
| b3 | Routine score, calendar, visit-cycle analysis, two-week caseworker reports, Logged At timestamps |
| b4 | Setup wizard, family paths, guided tour, demo families, newborn feeding, growth (WHO), teeth |
| b4.1 | Viewer keys, cocooning, French, installable app |
| b4.2 | Several children; editing and deleting entries |
