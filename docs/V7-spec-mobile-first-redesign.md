# V7 spec — Mobile-first redesign

> **Status (2026-11-28):** phase 1 built on `redesign`: test-site storage, new bottom bar (Today · Timeline · ＋ · Insights · More), Home (hero with live timer and ring, primary action, quick tiles with one-tap mini sheets, Today chips, heads-up cards), Undo / Edit snackbar, Insights hub, press feedback, springs and haptics. At night the main button is *Night waking* (then *Back asleep*), with *Up for the day* beside it, so one tap never ends the night by mistake. Long-press ＋ reopens the last thing logged. Tests: `tests/smoke.py` (redesign_home).

**Goal:** the same app underneath (every metric, template, report, sync rule and Sheet column), with a front end built for a phone held in one hand: logging in one or two taps with the thumb, big targets, clear state at a glance, and motion and feedback that make it feel like an app rather than a web page. Power-user depth (reports, timeline, analysis, settings) stays, one level further in.

**Where it's built:** the `redesign` branch of `baby-dashboard-`, published to the separate test site `baby-dashboard-next` (`miketava.github.io/baby-dashboard-next/`). `main` stays the current app and keeps getting features and fixes; `main` is merged into `redesign` regularly. If the redesign wins, `redesign` is merged into `main`.

---

## 1. Principles

1. **Thumb first.** Everything needed in the daily loop sits in the bottom 60% of the screen. Primary actions are at the bottom, never in a header.
2. **Big targets.** Interactive elements are at least **48 px** tall on phones (44 px absolute minimum for inline text links), with at least 8 px between neighbours. Text in inputs is 16 px (no iOS zoom).
3. **One tap for the common case, one more for detail.** Logging a diaper, a bottle or the start / end of a nap is a single tap with sensible defaults; details (time, notes, tags) are reachable from the confirmation, never in the way.
4. **Never lose an action.** Every one-tap log shows a confirmation with **Undo** (5 s) and **Edit**. Nothing is written to the Sheet until the undo window passes or the app goes to the background.
5. **State before data.** Home answers "what's happening, what's next, what do I do" before showing any list, chart or number.
6. **Progressive disclosure.** Three levels: *Home* (the daily loop) → *Insights* (one card per topic with one takeaway) → full sections (current charts, tables, reports, settings).
7. **Juicy but calm.** Every tap gets immediate visual feedback (press scale), confirmations animate, counters tick, sheets spring. Short (120–280 ms), never blocking input, and `prefers-reduced-motion` turns movement into fades.
8. **Same engine, same data.** No change to the Sheet schema, Apps Script or Config tab keys from the redesign itself. Anything new is additive.

## 2. Information architecture (phones)

Bottom bar, five slots, 64 px tall plus the safe-area inset:

| Slot | What |
|---|---|
| 🏠 **Home** | The daily loop (section 3) |
| 🗓️ **Timeline** | Current Timeline section (phase 3: vertical day view) |
| ＋ **Log** | Raised centre button, opens the Log sheet (section 4). Long-press: the last thing logged, again |
| 📊 **Insights** | Hub of topic cards (section 5) |
| ☰ **More** | Report, Settings, Check-ins, Birth Family, Badges, Data, tour, language |

Swipe left / right between Home · Timeline · Insights stays (existing section swipe).

Computers and tablets keep the current layout in phases 1–3 (phase 4 brings the new components to wide screens).

## 3. Home

Top to bottom:

1. **Hero card** (state at a glance)
   - Child name and avatar colour (several children: tap to switch).
   - Big state line with a live timer: *Awake 2h 10m* · *Napping 45m* · *Night sleep* · *Feeding, left side 6m* · *Out: car ride*.
   - A **progress ring** around the state icon: the current wake window toward the next nap window (or bedtime), the nap toward its planned end, the feed toward its usual length. Colour moves green → amber when the window is open → red past the cutoff.
   - **Next:** one line, e.g. *Nap 2 window opens 14:45 · in 35m*, *Bedtime 19:30*.
   - Tap the hero to expand **Details**: the current banner lines (template window, day-sleep budget, cutoff, bedtime math, reminders), the template picker and 🎵 music.
2. **Primary action button** (full width, 64 px, thumb zone): the most likely next log, from state.
   - Awake → **Start nap** (or **Bedtime** after the cutoff).
   - Napping / night → **Woke up** (ends the sleep now; Edit lets you adjust the end time, asleep time and soothing).
   - Feeding (breast) → **Switch to right** with a secondary **End feed**.
   - Labels follow the Quick Log rules that exist today (smart picks, in-progress entries).
3. **Quick tiles** (2 × 3 grid, ≥ 72 px squares, icon + label + small "last" text, e.g. *Milk · 2h ago*): Milk, Meal (or Breastfeed for newborns), Diaper, Water, Meds, More… Each is one tap:
   - **Diaper** opens a mini sheet with three big buttons (💧 Wet · 💩 Poop · 💧💩 Both) and the consistency / how-wet pills (optional) → saved on tap.
   - **Milk** opens amount chips (the existing 2 / 3 / 4 / 5 oz or 60 / 90 / 120 / 150 ml) → saved on tap.
   - **Meal** opens Breakfast / Lunch / Snack / Dinner (time-of-day preselected) and Ate well / Partly / Refused → saved on tap.
   - **Meds** lists scheduled medications with ✓ Given.
   - **More…** opens the full Log sheet.
   - Tiles follow the enabled features and the family path.
4. **Today at a glance:** horizontally scrollable chips with small meters: day sleep vs budget, milk vs target, diapers, water, routine score so far. Tap → the matching Insights card.
5. **Heads-up stack:** today's callouts (appointments, meds due, new calendar events, trends, logged-twice, vaccines, check-in due) as cards, one action button each, swipe sideways to dismiss for today.
6. **Coming up** (existing box) and **Today's plan** (existing list, restyled with larger rows).
7. **Today's entries** (existing list, 56 px rows; swipe left on a row for Edit / Delete; press-and-hold still works).

## 4. Log sheet

- A bottom sheet that opens to 85% height with a spring; drag handle, swipe down to close (keeps drafts, as today).
- **Suggested now** row first (existing smart picks), as large pills.
- **Tiles grid**, 3 columns, ≥ 88 px tiles, grouped with the existing headings (Sleep, Feeding, Diapers, Health & growth, Activities, Visits & family, Other). In-progress items (End nap, End feed) pinned on top in accent colour.
- One-tap tiles (diaper, milk amount, wet + poop, water amount, drop-off / pick-up, bath start) save immediately with the **Undo / Edit** snackbar. Tiles that need input (milestone, weight, temperature, incident, custom) open the existing form, restyled: one field per row, 56 px controls, time nudges as big segmented buttons, sticky Save at the bottom.
- **Timers:** starting a nap, bedtime, feed, outing or bath makes it an in-progress entry (as today); Home's hero shows its live timer and the primary button ends it.

## 5. Insights

A scrolling list of topic cards, each with a one-line takeaway in bold, one or two numbers with a ▲ ▼ vs last week, and a tiny sparkline:

- 😴 Sleep (night, naps, wakings) · 🍼 Feeding (milk, meals) · 🧷 Diapers · 📊 Routine (score, trends to watch) · 🩺 Health & growth (percentiles, meds, vaccines) · 📝 Check-ins · 💬 Birth family (placement path) · 🏆 Badges.

Tapping a card opens the current full section (charts and tables as they are today; restyled in phase 2). The Doctor visit summary and the caseworker report are one tap from the top of Insights.

## 6. Motion and feedback

| Moment | Effect | Duration |
|---|---|---|
| Any tap on a button / tile | Scale to 0.96 and back, ripple tint | 120 ms |
| Saved log | Tile flashes a ✓, hero / counters tick to the new value, snackbar slides up | 220 ms |
| Undo | Snackbar collapses, counter ticks back | 180 ms |
| Sheets (Log, mini sheets, More) | Spring up from the bottom (overshoot ≤ 4%), scrim fades | 280 ms |
| Section change | Existing slide, kept | 220 ms |
| State change (asleep / awake) | Hero cross-fades colour and icon; ring animates | 400 ms |
| Badge earned | Existing confetti and sound | — |

- **Haptics:** a short vibration (10 ms) on saves, 20 ms on undo and on long-press, where the browser supports it (Android Chrome; iPhones don't allow it for web apps). A setting turns it off.
- `prefers-reduced-motion`: no scale, spring or tick; fades only.
- Everything animates with `transform` and `opacity` only (60 fps on mid-range phones).

## 7. Touch and layout rules (checked by a test)

- Tap targets ≥ 48 × 48 px on phones for buttons, chips, tiles, selects and tabs (44 px for inline links). The smoke test measures every visible interactive element on Home and the Log sheet at 390 × 844.
- Body text ≥ 15 px, secondary ≥ 13 px; numbers in the hero ≥ 28 px.
- Bottom bar and sticky actions respect `env(safe-area-inset-bottom)`.
- No horizontal scrolling on Home except the chip rows that are meant to scroll.
- Dark mode and the current colour tokens kept.

## 8. Feature parity

Nothing is removed; every feature has a home. P = phase it moves into the new design (until then it is reached through More or Insights, unchanged).

| Feature | New place | P |
|---|---|---|
| Today banner (state, windows, cutoff, bedtime, budget) | Hero + Details, Today chips | 1 |
| Quick Log (all categories, smart picks, drafts, who am I, child picker) | Log sheet + quick tiles | 1 |
| One-tap breastfeeding, End nap / night | Primary action button | 1 |
| Callouts (appointments, meds, trends, vaccines, doubles, check-in, music tip) | Heads-up stack | 1 |
| Coming up, Today's plan, Today's entries | Home, below the fold | 1 (restyle 2) |
| Template picker, 🎵 music | Hero → Details | 1 |
| Sleep / Feeding / Health / Routine / Check-ins / Birth family / Badges sections | Insights cards → current sections | 1 hub, 2 restyle |
| Timeline (rows / columns, filters, display) | Timeline tab; vertical day view | 3 |
| Day panel (score, entries, swipe days) | Unchanged, larger rows | 2 |
| Reports (period, visits, filters, doctor visit), saved copies | More → Report; Insights header | 4 |
| Settings (all panes), setup wizard, tour, connect, sharing, data check | More; restyled | 4 |
| Badges and celebrations | Insights → Badges; celebrations unchanged | — |
| Reminders, private notes, multi-child, EN/FR, offline, viewer keys | Unchanged | — |

## 9. Phases

1. **Phase 1 (first build):** storage namespace for the test site, new bottom bar, Home (hero, primary action, quick tiles, Today chips, heads-up stack), one-tap logging with Undo, Log sheet tiles, Insights hub, motion and haptics, tap-target test. Phones only.
2. **Phase 2:** Insights cards with takeaways and sparklines; restyle Sleep, Feeding, Health, Routine, Check-ins with larger controls; day panel; swipe actions on entries.
3. **Phase 3:** Timeline: vertical "day as a list of blocks" view for phones, pinch / tap to expand; filters as a sheet.
4. **Phase 4:** Settings, wizard and reports flows; tablet / desktop with the new components; decide on merging into `main`.

## 10. Test site and data contract

- **Same Sheet, same script.** The test site connects to the same Apps Script and Sheet as the current app.
- **Its own storage.** On the test site, the app's local keys are namespaced (`bld2.*` instead of `bld.*`; same origin, `miketava.github.io`). On first launch it copies the current app's **connection, settings, Who am I, saved reports and badge state** so it opens connected. It never copies the **offline queue** or a **draft** (they belong to the app that made them, so nothing is sent twice).
- **Config tab:** both apps read and write it. The redesign may add keys but must not rename, drop or reinterpret any. New per-device UI preferences stay local.
- **Apps Script:** any change needed by the redesign must be backward compatible with `main` (same `REQUIRED_SCRIPT` rules).
- **Installable separately:** "Baby Next" name, own icon label and offline cache, so it can sit next to the current app on the Home Screen.

## 11. Tests

- `tests/smoke.py` keeps passing on the branch (all current checks).
- New: phase 1 renders on the three demo families × EN / FR at 390 px with no errors; one-tap diaper / milk save after the undo window and Undo cancels; tap-target audit on Home and the Log sheet; reduced-motion has no transforms; storage import copies the connection and not the queue.
