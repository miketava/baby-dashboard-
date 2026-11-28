# Changelog — Baby Routine Dashboard

Versions follow `major.minor.patch`: a new minor number adds features, a patch number (e.g. 1.20.1) is a fix or tweak. The dashboard (`index.html`) and the Apps Script (`Code.gs`) have separate version numbers; the dashboard shows both in **Settings → About & changes** and puts up a notice when your script is older than it needs.

The first time someone opens the app after an update, a **What's new** popup lists the changes since the version they last saw.

**How to release a new version:** bump `APP_VERSION` and add an entry at the top of `CHANGELOG` (both in the dashboard's constants), in English and French. Only bump `SCRIPT_VERSION` in `Code.gs` and `REQUIRED_SCRIPT` in the dashboard when the script itself changes.

---

## v1.45.0 — 2026-11-28 · Apps Script v1.9 (no script change)

- **🎵 Sleep music.** *Settings → General → Sleep music*: a playlist link for naps (and bedtime), and optionally a different one for bedtime. Any https link works; Spotify, YouTube Music, YouTube, Apple Music and Deezer links are recognised by name. **▶ Test** opens it. Shared with the other caregiver's phone (Config tab).
  - **On Today:** from 30 minutes before a planned nap or bedtime (today's template, so it follows early wake-ups and visit days) until 30 minutes after, a **🎵 Play nap music** / **🎵 Play bedtime music** button sits at the top of the Today box; it also shows for 30 minutes after a nap or night is started in Quick Log. One tap opens the playlist in the music app.
  - Hidden while she's asleep (past those first 30 minutes), once that nap has been logged, for viewer keys, and whenever no link is set.

## v1.44.2 — 2026-11-28 · Apps Script v1.9 (no script change)

- **Quick Log time buttons everywhere.** The −10 · −5 · −1 · +1 · +5 · +10 row was only shown under *End time* on new entries of "duration" categories (sleep, visits, outings, bath…) and under *Start time* on new entries. It's now under every Start and End time: meals, play, handovers, family contact and the rest, and when editing an existing entry.
- **Settings on phones:** one setting per line at full width (no more two cramped columns cutting off drop-downs like *Day boundary*), 16 px text in boxes, bigger switches whose knob no longer overlaps long labels, and longer explanations inside a setting (e.g. under *Language*) folded behind ⓘ like the others.

## v1.44.1 — 2026-11-28 · Apps Script v1.9 (no script change)

- **Today box header on phones:** row 1 is the title and a labelled **Show ▾ / Hide ▴** button (was a small ▸ / ▾ at the far right); row 2 the template picker across the full width at a readable size; row 3, when the box is collapsed, the current status in full, wrapping instead of being cut off.
- **Today's plan subtitle as chips:** ✨/📌 the template · 🗓️ calendar visit · 🩺/🏠 appointment and time · ⏰ "woke 06:33 · Nap 1 −27m" (or the visit shift) · 🌙 bridge-nap bedtime. The "change it in the banner above" text is now the template chip's tooltip.

## v1.44.0 — 2026-11-28 · Apps Script v1.9 (no script change)

- **Coming up** is now its own card between the Today box and *Today's plan* (it was inside the plan card).
- **Today box header:** the template picker takes the full width, so long names no longer get cut off. The automatic choice shows as **✨ Name** and a template you picked for today as **📌 Name**; the tooltip says which ("Picked automatically for today…" / "Chosen by you for today…"). The 🔔 browser-reminder switch is gone from the header: it's *Settings → Reminders → Enable tab reminders* (same setting, still asks for notification permission).
- **Settings:** *General* is the first tab and where Settings opens. Explanations longer than a line or two are folded behind a small **ⓘ** under their setting (tap to show / hide); short hints stay visible.

## v1.43.1 — 2026-11-28 · Apps Script v1.9 (no script change)

- *Coming up*: the calendar pages sit on a fixed grid (icon · today · then three gap + date columns), so dates line up across the rows instead of each row spacing itself. The empty rounded box under the rows was the tap-for-details panel showing while hidden (a style overrode `hidden`); it now stays out of sight until a date is tapped.

## v1.43.0 — 2026-11-28 · Apps Script v1.9 (no script change)

- **"Coming up" box** at the top of Today's plan, between the template name and the schedule, instead of the calendar strip at the bottom of the schedule.
  - **Closed** (default): 📅 Coming up · 🚗 · 🏠 · 🩺, each with a small count of what's ahead in the next 60 days (blue when one is today or tomorrow; faded at 0), and how soon the next one is ("tomorrow", "in 3 days"). The 🏠 icon appears only when a home visit is coming; 🚗 on the placement path or when visits are on the calendar.
  - **Tap** to open the calendar pages from v1.40 (today → next 3 per kind with the day gaps; tap a page for details). Open / closed is remembered on this device.

## v1.42.1 — 2026-11-27 · Apps Script v1.9 (no script change)

- *Settings → General → Private notes*: when the switch is greyed out, the note now shows the Apps Script version the dashboard actually receives from the web app (e.g. "reports v1.7") and what to do: tap Refresh after redeploying, or, if it still shows the old number, deploy a **new version** of the existing web app deployment (editing `Code.gs` alone doesn't change what the web app runs).

## v1.42.0 — 2026-11-27 · Apps Script v1.9 (no script change)

- **Family contact on the Timeline as linked dots.** A *Family Contact* row with an End Time (a text at 14:00 answered at 18:00) used to be drawn as a 4-hour block, crowding the day's real routine into narrower lanes. It's now drawn in the narrow marker strip (left edge in columns, top edge in rows): a filled 💬 dot when the message came in, a hollow dot when you replied or the call ended, and a thin line joining them. It takes no lane. Tap or hover either dot for the time, the reply time, the wait and the notes. Across midnight, each day shows its part of the line. Contacts without an End Time stay a single dot.

## v1.41.0 — 2026-11-27 · Apps Script v1.9 (no script change)

- **Wakings inside the night block on the Timeline.** An *Awake / Restless* entry that sits entirely inside a sleep entry is drawn **inside** that block (inset, striped) rather than pushed onto a lane of its own, so a night reads as one block from bedtime to morning with its wakings visible. Tap it or hover for the time and length. Restless stretches that start before or end after the sleep (e.g. settling before going up) are drawn as before.
- **Fix: restless time inside a sleep counted as sleep.** With one *Sleep - Night* from bedtime to morning and the wakings logged as *Awake / Restless* rows inside it (how Quick Log logs a night), night sleep, total 24 h sleep, "sleep in the last 24 h" and each entry's asleep time counted the wakings as sleep. They now subtract them. Past nights logged that way may show a little less sleep than before; that's the correction.
- **Data check → Nights logged in pieces.** Nights split into several *Sleep - Night* rows with the restless stretches in the gaps (typically from notes turned into rows) are listed, with **🔗 Merge into one night** each and **Merge all**. Merging extends the first piece to the morning (notes and tags of all pieces kept, the first rating or the first one given), deletes the other sleep pieces from the Sheet (bottom-up), and leaves the restless rows in place. Only nights whose every gap is a logged restless stretch (± 10 min) or under 5 minutes are offered, so unlogged time is never turned into sleep. The ⚠ pill in the header says "n nights in pieces" when there are some.
  - These split nights were also short by 15 minutes per extra piece: each piece got the "typical settling time" taken off as if she'd gone down again. A merged night doesn't.
- Gemini instructions **v8**: one *Sleep - Night* row per night with the wakings as *Awake / Restless* rows inside it, with a wrong / right example.

## v1.40.1 — 2026-11-27 · Apps Script v1.9 (no behaviour change)

- **One-tap update "insufficient authentication scopes".** A web app runs the code *and the manifest* of the version it was deployed with. If the `appsscript.json` manifest was pasted after the running version was deployed, that version doesn't have permission to edit itself yet, even though running `allowOneTapUpdates` in the editor (which uses the latest code) approved it. The dashboard now explains this and opens the Setup guide: do that one update by hand (*Copy script* → paste → *Deploy → Manage deployments → ✏️ → New version*), after which *Update script* works. The guide's one-tap section now says the hand-made deployment is required, and the script's own error message (v1.9) says the same.

## v1.40.0 — 2026-11-27 · **Apps Script v1.9** (update it; includes v1.8)

- **Upcoming visits and appointments as calendar pages.** The three text lines under Today's plan are now one row per kind, 🚗 parent visits, 🏠 home visits, 🩺 appointments: today's date (grey; blue when something is on today), then up to the **next 3**, each a little calendar page (month band + day), with the **gap in days** on the arrow between pages (from the previous one). One line each on a phone. The home-visit row only shows when there is one; the appointment row shows when there are any or when there are no home visits.
  - **Tap a page** for the details below the strip: title, *in 4 days · Tue, Dec 1*, the time and how long, **where** (a link to Google Maps, or the meeting link), the event's description, and its calendar. Tap again to close. Parent visits show the date and times only (their titles are never read).
- **One entry for a wet + poop change.** *Wet + poop* in Quick Log now writes a single **`Diaper - Wet + Poop`** row (it used to write two rows with the same notes). It counts as one wet and one dirty diaper everywhere: per-day counts, targets, the diaper chart, days since last poop, consistency, reports. Older pairs of rows still count as before.
- **How wet:** *Light / Medium / Heavy* pills (stored as the tags `light pee`, `medium pee`, `heavy pee`) on `Diaper - Wet` and `Diaper - Wet + Poop`, next to the poop consistency on combined changes. *Health → Care tracking* shows the mix for the range. Picking one replaces the previous choice (same for consistency, which used to add up in the Tags box).
- **Apps Script v1.9:** appointments and home visits also carry the event's location and description (trimmed), for the tap-for-details view. Family key only; viewer keys get no calendar data at all. Includes v1.8 (private notes for viewers). **To update:** *Copy script* → paste over `Code.gs` → *Manage deployments → ✏️ → New version*, or *Update script* with one-tap updates.
- Gemini instructions **v7** (`docs/daily-log-schema.md`): `Diaper - Wet + Poop` as one row, the pee tags, and never writing to *Private Notes*.

## v1.39.1 — 2026-11-27 · **Apps Script v1.8** (update it)

- **Fix:** v1.38 shipped Apps Script v1.8 but the dashboard still asked for v1.7, so *Data source* said the script was up to date, no 🔧 notice or *Update script* button appeared, and the *Private notes* switch stayed greyed out with no way forward. It now asks for v1.8. The build refuses to run if the two numbers ever disagree again.
- The greyed-out *Private notes* note links to *Data source → Apps Script*.

## v1.39.0 — 2026-11-27 · Apps Script v1.8 (no script change)

- **Phones: full-screen Quick Log with thumb-sized controls.**
  - Quick Log fills the screen (no gap at the top); the title bar has a 44 px ✕.
  - Pills and chips (tags, meal, amounts, soothing, play…) 42 px tall instead of 23; the −10 … +10 time row spreads across the width as six equal buttons; **Now** buttons 48 px.
  - Text boxes, times, dates and drop-downs 48 px tall with **16 px text**, which also stops iPhone Safari zooming in when you tap a field. Notes boxes are taller.
  - **← Back / Save** are pinned to the bottom of the screen (Save takes the rest of the width), so saving never needs a scroll.
  - Main-screen buttons slightly taller with bigger icons; same three-across groups.
  - Swipe down from the top bar or ✕ still closes it (anything typed is kept as a draft, v1.37.2). Computers and tablets are unchanged.

## v1.38.0 — 2026-11-27 · **Apps Script v1.8** (needed for private notes)

- **🔒 Private notes** (*Settings → General → Private notes*, off by default, shared between your devices). Quick Log gets a second, dashed notes box: **Private notes · only for the family, never in reports or shared**.
  - Saved in their own **Private Notes** column (added to the Sheet the first time one is saved). Shown with a 🔒, in grey italics, under the entry in Today's entries and the day panel.
  - **Never reshared:** not in reports (printed, PDF or saved copies), the CSV export, *Copy for AI*, or anything a viewer key receives. The Apps Script removes every column whose name starts with *Private* / *Privé* before sending rows to a viewer key, so a caseworker's dashboard never gets them.
  - Merging an entry logged twice keeps both private notes too (with who wrote each).
  - Anyone with edit access to the Google Sheet itself can still see the column.
- **Apps Script v1.8:** the private-column filter for viewer keys. Until a connected script is v1.8, the switch is greyed out with a note, so private notes can't be written where a viewer might get them. **To update:** *Settings → Setup guide → Copy script* → paste over everything in `Code.gs` → *Deploy → Manage deployments → ✏️ → New version* (or *Update script* in *Data source* if one-tap updates are on).

## v1.37.2 — 2026-11-27 · Apps Script v1.7 (no script change)

- **Quick Log keeps unsaved typing.** Closing a form with something typed and not saved (phone Back, ✕, swipe down, or ← Back to the list) keeps it as a draft, with a short "Not saved: reopen Quick Log to restore it" note. Reopening Quick Log shows it at the top (category, time and the start of the notes) with **↩ Restore** (back in the form, exactly as left, including edits of an existing entry) or **Discard**. Saving clears it. Kept on this device for 6 hours; a form you only opened and closed leaves nothing behind.
- **Quick Log:** the *−10 · −5 · −1 · +1 · +5 · +10* row under each time no longer has its own *now* chip, which did the same as the **Now** button right beside the field.

## v1.37.1 — 2026-11-27 · Apps Script v1.7 (no script change)

- **Phones: toasts out of the way.** Short messages ("Saved to Google Sheet ✓", "Merged into one entry ✓"…) now sit above the bottom bar instead of over the ＋ Log button, and they no longer catch taps: a tap on one goes to whatever is underneath. Their text can't be selected either, so a quick tap no longer starts Chrome's tap-to-search / Google Lens on "Google Sheet".

## v1.37.0 — 2026-11-27 · Apps Script v1.7 (no script change)

- **Early wake-ups move the morning.** When the night ends 20+ minutes before the template's *Wake* time, the morning's meals and routine steps and **Nap 1** move earlier by the same amount, capped at **30 minutes** (*Settings → Targets → Wake windows → Early wake-up: move Nap 1 by up to*; 0 keeps template times).
  - Capped rather than following the wake window all the way: holding close to the schedule avoids reinforcing early wakings. **Nap 2, the cutoff and bedtime stay put**, so the day eases back to the template.
  - Today's plan shows the moved times and says why ("woke at 06:15: morning and Nap 1 moved 30m earlier"), as do the day panel and the timeline overlay. The routine score judges Nap 1 against the moved time, so a sensible earlier nap isn't marked late or early.
  - Uses the logged end of the night (the *End night* in Quick Log). Not on visit or appointment days, where the visit sets the naps.
  - The Today banner's wake-window hint ("Nap 1 window opens at …") is unchanged and still counts the full wake window from the real wake-up.
## v1.36.0 — 2026-11-26 · Apps Script v1.7 (no script change)

- **🦣 Fiddle Faddler** (a nod to the Mammoth Club): counts refreshes forced on this phone, from the header's ↻ button or a page reload (pulling down in Chrome, F5 on a computer; detected with the Navigation Timing `reload` type). Auto-refresh timers, the sync on opening and syncs after saving don't count. Tiers 5 / 25 / 100 / 250 / 500. Starts at 0 (nothing to count backwards) and is **device-only**: kept in this browser (`bld.fiddle.v1`), never written to the Config tab, so each phone has its own.

## v1.35.1 — 2026-11-26 · Apps Script v1.7 (no script change)

- **Badges in ounces:** Milk Run and Hydration Station tiers are round numbers for imperial units: 350 / 1,700 / 8,500 / 34,000 oz for milk and 35 / 350 / 1,700 oz for water (nearest 50 under 1,000, 100 under 10,000, then 1,000). Metric stays 10 / 50 / 250 / 1,000 L.
- Fix: the summary toast at the end of the badge catch-up had a see-through background (its gradient used the semi-transparent accent colour on its own).

## v1.35.0 — 2026-11-26 · Apps Script v1.7 (no script change)

- **🏆 Badges** (*More → Badges*, new *Badges & achievements* feature, on by default). 22 tiered badges computed from the log: Scribe, Tag Team, On the Dot, Daily Habit, Night Owl, Changing of the Guard, Code Brown, Double Duty (another diaper within 60 min; wet + poop at the same moment is one change), Sandman, Long Haul, Nap Collector, Road Trip, Milk Run, Hydration Station, Left Right Repeat, Adventurous Eater (different foods ever), Rainbow Plate (most different foods in one Monday–Sunday week), Allergen Ace (allergen groups offered: 3 / 6 / 9), Tooth Fairy, Firsts, Out and About, Tummy Time Titan. Spec: `V5 spec — achievements & badges`.
- **Grid:** a ring to the next tier around each icon, `x / y`, and tier pips (Bronze → Silver → Gold → Platinum → Legendary → Mythic). Tap for every tier with its date and a progress chart. **Press and hold** (right-click on a computer) to hide a badge; hidden ones fold under *Hidden (n)*. Two charts show when tiers were earned and the running total; with two caregivers signing entries, a third shows who logged what.
- **Retroactive and dated by the log.** A tier's date is when the event that crossed the threshold happened (*Logged At* for On the Dot and Night Owl), not when the badge appeared. First earned dates are saved in the Config tab (`badges`), so deleting old rows never takes a badge away. Demo data and viewer keys never save anything.
- **Celebrations, per phone.** The first time a phone sees a child's badges they come as a string of toasts, oldest first, one per badge at its highest tier, ~1.2 s apart, with *Skip all* and a summary at the end. After that a new tier gets confetti, a short Web Audio sound (no files) and a pop-up where the ring fills and the next tier's pip lights up. They wait while Quick Log or a dialog is open. No sound 19:00–07:00 or while the child is logged as asleep; 🔊 toggles sound on this phone; *Replay* shows them again. `prefers-reduced-motion` skips confetti and animation.
- **Follows your setup:** no breastfeeding badge on the adoption path, Tummy Time only under 9 months (or once some is logged), diaper / food / water / teeth / milestone badges only with those features on. Household badges (Scribe, Tag Team, On the Dot, Daily Habit, Night Owl) count every child.
- Tests: `tests/badges.py` (30 checks). `tests/smoke.py` can now be imported.

## v1.34.0 — 2026-11-26 · Apps Script v1.7 (no script change)

- **Vaccine schedule: Québec or Ontario.** *Settings → Reminders → Vaccine schedule* has Québec (PIQ), **Ontario** (routine publicly funded schedule: 2, 4, 6, 12 and 18 months, then 4–6 years) or Off. The setup wizard asks on the Units step ("Elsewhere / don't track vaccines" turns it off). The Health card, the banner reminders, the booking hint and the tour name the schedule in use. Existing setups stay on Québec.
- **"Do this on a computer"** in the Setup guide (steps 1–4) and the wizard's *Connect a Google Sheet* option: the Apps Script editor is close to unusable on a phone. Estimate now ~10 minutes.
- **iPhone connecting.** A Home Screen app on iPhone doesn't share storage with Safari, so tapping a *Connect another phone* link only connected Safari. *Settings → Data source* now has **Got a connect link?**: paste the link there (shown open on a phone that isn't connected yet). The guide's phone step explains Android vs iPhone.

## v1.33.0 — 2026-11-26 · Apps Script v1.7 (no script change)

- **No entry with something new in it is hidden.** The duplicate check used to keep the "richer" of two near-identical rows (same category, starts within 10 minutes) and count the other once, so a second caregiver's detailed note could disappear from the dashboard (it stayed in the Sheet). Now:
  - A copy is hidden only if it **adds nothing**: its notes are empty or already in the other's, its tags are a subset, and its rating, amounts, value and end time add nothing.
  - Otherwise both are kept and shown, flagged as **logged twice**. Two instant entries with different notes (e.g. two dinners, no end time) are flagged too; they used to be ignored. Two different medications at the same time are not.
- **Merge them:** a 🔀 note in the Today banner (entries from today and yesterday) → **Compare & merge**, also in the ⚠ data check under *Logged twice*. **Merge into one** updates the first entry: both notes, each prefixed with who wrote it when the *Logged By* names differ, tags combined, an empty rating / end time / amounts / value / asleep time filled from the other (a different rating is added to the notes), *Logged By* listing both; then the second row is deleted. **Keep both** stops flagging that pair (shared with the other caregiver).
- **An edit that can't be saved** (the row changed in the Sheet meanwhile) now reopens what you typed in Quick Log as a new entry, ready to save and merge, instead of being dropped.
- Fix: a *Logged By* column is never mistaken for *Logged At* in a Sheet that doesn't have *Logged At* yet.

## v1.32.0 — 2026-11-26 · Apps Script v1.7 (no script change)

- **Template Sheet.** *Settings → Setup guide* starts with **📄 Copy the template Sheet**, Google's "Make a copy" page for a blank Sheet with the *Daily Log* tab and headers ready. The copy lands in the person's own Drive, private to them. Step 2 then pastes the latest script over whatever `Code.gs` holds.
- The setup wizard's *Connect a Google Sheet* option mentions the template (and still opens the guide on Finish).

## v1.31.0 — 2026-11-26 · Apps Script v1.7 (no script change)

- **Acknowledge a trend.** *Trends to watch* (Today banner and Routine tab) gets **✓ Got it** for a trend you've seen and expect, e.g. less day sleep because of a new routine.
  - It leaves the Today banner (the next unacknowledged trend shows instead, if any) and folds under *Acknowledged* on the Routine tab, with when and by whom, and **Undo**.
  - It stays hidden for 14 days: by then the two-week comparison has caught up with the new normal, so an expected change stops being flagged on its own.
  - It comes back sooner if it gets clearly worse than when it was acknowledged (15% or the trend's own threshold, e.g. 30 more minutes less day sleep).
  - Kept in the Sheet's Config tab, so acknowledging on one phone clears it on the other. Per child.

## v1.30.1 — 2026-11-26 · Apps Script v1.7 (no script change)

- **Today's plan keeps the last 45 minutes in view.** Items that ended (or, without an end, started) up to 45 minutes ago stay in the list, slightly dimmed, instead of folding under *Earlier today*. One that isn't logged yet shows "due 20m ago" instead of "not logged", so running a few minutes behind on a nap or meal doesn't hide it. Older items still fold away.

## v1.30.0 — 2026-11-26 · **Apps Script v1.7** (update it)

- **No secret in the script any more.** The secret and the viewer keys live in the script's *Script properties* (⚙ Project Settings), not in its code, so setting up is: paste the script, deploy, paste its URL into *Settings → Data source*.
  - The first dashboard to connect to a new script **claims** it: it sends a secret (its existing one if it has one, or a new random one) and the viewer keys. A script that's already claimed refuses another claim.
  - Upgrading from v1.6: paste v1.7 over everything and deploy a new version. On the next sync the dashboard sees an unclaimed script and stores the secret it already uses, so other phones keep working. (A secret shorter than 16 characters is replaced by a new one; reconnect the other phones with the link below.)
  - `resetConnection` (▸ Run in the editor) disconnects everything so a dashboard can claim the script again.
- **Connect another phone** (*Settings → Data source*): a link holding the script URL and the secret. Opening it connects that phone and removes the secret from the address bar. Send it privately.
- **Viewer keys** take effect as soon as they're created in *Settings → Sharing*, and stop as soon as they're removed. No lines to paste, no redeploy.
- **One-tap script updates (optional).** Turned on only from the Apps Script editor (▸ Run `allowOneTapUpdates`), plus the Apps Script API switched on and the `appsscript.json` manifest from the Setup guide. Then *Update script* in *Settings → Data source* replaces `Code.gs` (and `Reminders`, keeping its settings block) with the versions this dashboard carries and redeploys the same URL. Each update sends a note to your ntfy topic, if reminders are set up. `stopOneTapUpdates` turns it off.
- New file: `apps-script/appsscript.json` (the manifest, with the permissions one-tap updates need). Only needed for one-tap updates.
- **To update:** Settings → Setup guide → *Copy script* → paste over everything in `Code.gs` → *Manage deployments → ✏️ → New version*. Reminders don't need re-pasting.

## v1.29.1 — 2026-11-26 · Apps Script v1.6 (no script change)

- **Upcoming visits by type** in Today's plan: 🚗 **Parent visits** (away, from the calendar), 🏠 **Home visits** and 🩺 **Appointments** (the ones marked for the child), each on its own line, up to three each.
- **Tomorrow card** (shown from 15:00 the day before): now also before a home visit or an appointment, titled "Tomorrow: home visit 14:00–15:00" / "Tomorrow: appointment", with the event's title and that day's plan. Before a parent visit it still adds how the nights after past visits went.

## v1.29.0 — 2026-11-26 · **Apps Script v1.6** · **Reminders v2.1** (update both)

- **Visits at home** (e.g. the social worker coming over) are no longer counted as time away with car naps.
  - Calendar events titled **"Home visit …"**, **"… à domicile"** or **"… à la maison"** come through like appointments: the Today banner asks once whether they're for the child (🏠), and Settings → Schedule templates lists them as *at home*.
  - Accepted ones use a **Home Visit Day**: the Baseline Home Day as it is, plus the visit at its real time. No car naps, nothing moved. Built from the current Baseline each time, so it never goes stale. If the visit overlaps a nap, its block says so ("overlaps Nap 2 (14:45–16:00): nap before or after the visit").
  - Off-site visits with the family keep titles like "Visite parents et …" and the visit days as before.
- **Calendar titles:** what an event is depends on the part **before a dash**: "Home visit - Marie (TS)", "Visite parents et Ava - Julie" or "Home visit - Dr Martin" can carry who's coming or a note without changing the plan. If that part says nothing ("Ava - pédiatre"), the whole title is used. Full titles are shown only to you, never in reports or to viewer keys.
- Lock-screen reminders (Reminders v2.1) follow home visits the same way ("Home visit at 14:00"), with naps unchanged.
- **To update:** Settings → Setup guide → *Copy script* → paste over `Code.gs` → *Manage deployments → ✏️ → New version*. If you use ntfy reminders: Settings → Reminders → *Copy add-on* → paste over the `Reminders` file and save (no need to run anything).

## v1.28.1 — 2026-11-26 · Apps Script v1.5 (no script change)

- **Swipe between Settings pages** (phones): left for the next tab, right for the previous one (Child & features → Data source → … → About & changes). The page slides out and in, and the tab row scrolls the new page's tab into view and flashes it; the first and last pages spring back. Sideways-scrolling code blocks keep their swipe until their edge, and form fields never trigger it. Uses the same switch as the section swipe (*Settings → General → Display*).

## v1.28.0 — 2026-11-26 · Apps Script v1.5 · **Reminders v2** (re-paste the Reminders file)

- **Lock-screen reminders (ntfy) rebuilt.** The add-on now reads your templates and medications from the Sheet's Config and Medications tabs, so editing them in the dashboard changes the reminders with no re-pasting. It follows the same day as the dashboard:
  - Visit days from a logged visit or your calendar (early, late morning, midday, afternoon), and accepted calendar appointments (morning, midday, afternoon), lined up with the real time.
  - Your "today's template" override, weekday-only steps and bedtime routines on their nights (bath night follows bedtime).
  - **Medications:** a high-priority reminder at each dose time, and a second one after an hour if the dose isn't logged (Meds row naming it). Nothing once it's given.
  - **Quiet while she's asleep:** no nap or bedtime reminder while a sleep is in progress, or once she already went down early.
  - Tapping a reminder opens the dashboard. Each child's name prefixes the title when there are several.
  - ▸ Run `previewReminders` in Apps Script to see today's list; `installReminderTrigger` now sends a test message.
- **Settings → Reminders → Copy add-on** fills in your topic, warning time and which reminders are on. Paste it as a second script file named `Reminders` (replacing the old one), then ▸ Run `installReminderTrigger` once. Needs `Code.gs` v1.5.
- Tests: `tests/reminders.test.js` (8 checks).

## v1.27.1 — 2026-11-26 · Apps Script v1.5 (layout only, no behaviour change)

- **Easier script updates.** In `Code.gs`, `SECRET` and `VIEWERS` are now at the very top, above a line marking where updates start: keep those, replace the rest.
- Even simpler: **Copy script** (*Settings → Setup guide*) now fills in your secret (your connection token) and the viewer keys created in *Settings → Sharing*. In Apps Script: select all, paste, *Deploy → Manage deployments → ✏️ → New version*. The toast says what was included; viewer lines added to the script by hand aren't.
- Viewer keys are now shared between your devices through the Sheet (Config tab), so the copied script has them whichever device you copy from.
- Secrets and labels with apostrophes or backslashes are quoted correctly in the copied script and the viewer lines.

## v1.27.0 — 2026-11-26 · **Apps Script v1.5** (update needed to save soothing tags and the asleep time when ending a nap)

- **Going up vs. asleep.** A nap's or bedtime's Start Time stays the start of the routine (diaper, milk, rocking), so schedule targets and the routine score are unchanged: going up at 9:57 still counts as an on-time nap.
  - Sleep amounts (day sleep, night sleep, 24 h) and wake windows now use when she was **actually asleep**:
    1. the new optional **Asleep At** time (Quick Log: a field with *+5 / +10 / +15 / +20 / +30 min after going up*, also when ending a nap), else
    2. the end of an **Awake / Restless** entry overlapping the start (how long settlings are logged), else
    3. a **typical settling time**, 15 min by default, set separately for naps and bedtime in *Settings → Targets → Falling asleep*. Car naps start asleep.
  - Entries show e.g. "1h 8m asleep · 10:12 (15m to settle)", with "~" when the time is assumed. Bedtime effort ("Easiest bedtime") uses the real asleep time when it's known.
  - The Sheet gets an `Asleep At` column the first time one is saved.
- **What helped to sleep:** pills on naps, bedtimes and Awake / Restless entries, also when ending a nap: on own, rocking, holding, walking, lullaby, humming, shushing, white noise, story, patting, back rub, pacifier, milk, lovey, stroller, contact. Stored as tags.
  - **Sleep tab → What Helps Her Settle:** for each method, the typical time to fall asleep (only from known asleep times) and how long restless stretches lasted, green / orange when a few minutes quicker / slower than usual.
- **Time buttons** in Quick Log are now **now · −10 · −5 · −1 · +1 · +5 · +10** min. Each nudges whatever time is in the field, so taps add up (crossing midnight moves the date).
- "Pretend" play reads **Pretend / imaginary** (same tag).
- An "asleep at" time outside going-up → end is refused with a message.
- **Apps Script v1.5:** ending a nap can also add tags (merged with the row's) and the asleep time. Paste the new `Code.gs`, keep your `SECRET` and `VIEWERS`, then *Deploy → Manage deployments → ✏️ → New version*. (If you haven't deployed v1.4 yet, this one includes it.)
- Gemini instructions v6: `Asleep At` column, Start Time = going up for sleep, soothing tags, `puzzle`.

## v1.26.0 — 2026-11-26 · **Apps Script v1.4** (update needed for calendar appointments)

- **Template library** (*Settings → Schedule templates*, at the top): ready-made days that fit the family and the child's current nap count (built for 1 or 2 naps, from the Baseline Home Day).
  - *Placement path:* **Midday Visit** (12:00–13:30) and **Afternoon Visit** days join the early and late-morning ones. Visits now pick among the four by start time: up to 09:30 early, up to 11:30 late morning, up to 13:15 midday, then afternoon. Times still slide to the real visit.
  - *Everyone with a schedule:* **Morning**, **Midday** and **Afternoon Appointment** days, and a **1-nap transition day** offered from 12 to 24 months while the baseline still has two naps.
  - The days the automatic choice needs are added once by themselves (a deleted one isn't re-added); *Add* / *Replace* for the rest. Birth and routine families no longer start with the visit templates; newborns get none.
- **Appointments from your calendar** (Apps Script v1.4): timed events whose title looks like an appointment (médecin, pédiatre, dentiste, CLSC, clinique, vaccin, rendez-vous, rdv, physio, optométriste…) from the calendars the script reads.
  - The first time one appears, the **Today banner** asks *for Ava?* with ✓ Yes, plan around it · ✕ No · **Ignore this calendar** (e.g. a parent's work calendar). Answers are kept in the Sheet's Config tab, so they're asked once for the whole family.
  - An accepted one between 08:00 and 16:30 picks the morning (before 11:00), midday (to 13:15) or afternoon appointment day, with the naps around it moved to the real time. Today's plan names it (🩺) and lists upcoming ones.
  - *Settings → Schedule templates → Appointments from your calendar*: the last 2 weeks and next 60 days, each marked for the child or not, and the ignored calendars (✕ to stop ignoring).
  - Privacy: for these events only, the script sends the title and calendar name to the family's key (needed for the question), never to viewer keys. `APPOINTMENTS = false` turns it off. Visits still send only dates and times.
- "Visite médicale" and similar titles now count as appointments, not as family visits.
- **To update the script:** paste the new `Code.gs` (keep your `SECRET` and `VIEWERS`), then *Deploy → Manage deployments → ✏️ → New version*. No new permissions.

## v1.25.4 — 2026-11-26 · Apps Script v1.3 (no script change)

- **Puzzle** added to the play activities (Quick Log → Play, and the Play area of the daily check-in). Stored as the tag `puzzle`.

### Repository · 2026-11-26

- The source is now in the repo: `src/` (70 files by concern, joined by `node tools/build.js` in the order of `src/BUILD_ORDER`), with `apps-script/Code.gs` as the single copy of the script, inlined at build time. The built `index.html` was checked byte-for-byte against the previous build.
- Tests: `tests/apps_script.test.js` (the script against an in-memory Sheet) and `tests/smoke.py` (30 browser checks).
- Removed five unused functions left behind by earlier changes (no visible change).

## v1.25.3 — 2026-11-26 · Apps Script v1.3 (no script change)

- **Filter button only where filters apply.** An audit changed each filter (range, day type, search, categories) and checked which sections changed. The funnel is removed from the seven that never do, because they always use their own window: Growth (every measurement, for the WHO curves), Teeth, Medications (last 30 days), Vaccines (the Québec schedule), Allergen upkeep, Trends to watch (last days vs the two weeks before) and Cocooning (the settling-in period). Every other section keeps it.

## v1.25.2 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Guided tour updated** (37 steps, phone and computer, English and French):
  - *Quick Log:* groups, the 🍼 Milk amounts and 🍽 Meal picker, forms showing only the fields that fit, the first-name prompt, and swipe down to close.
  - *Sections:* swipe left / right on the page to move between sections (and where to turn it off).
  - *New step, Display options:* what the timeline's display button changes vs. the filter, including compact / all labels and the colour key.
  - *Badges:* explains the compact stacked badge.
  - *Calendar & routine score:* ‹ › or a swipe moves between days in the day panel.
  - *New step, Medications* (when one is set up).
  - *Make it yours:* score sliders (100 points) and settings kept in the Sheet's Config and Medications tabs.

## v1.25.1 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Compact day labels on the Timeline** (default on phones): a day's milestones, notes, measurements and check-ins are stacked into one badge of icons (with a count when there are several of a kind), e.g. "⚖️ 📏 ⭐ 💗"; hover or long-press for the text, tap the day for the full list. **All labels** shows each one as before (default on computers). Switch in the timeline's display options.
- **Phones: clearer Display options.** The timeline's *⚙︎ Display* button is now a round sliders icon beside the filter and ⓘ. It opens a boxed **Display** panel (rows / columns, order, target overlay, diapers & meds, labels) with a separate, labelled **Colour key** under it, so it no longer looks like the filter's category list. The filter (funnel) still chooses *which* days and categories are shown; Display only changes *how* they're drawn.

## v1.25.0 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Swipe between sections** (phones): swipe left / right on the page to go to the next / previous section in menu order: Today → Timeline → Check-ins → Routine → Sleep → Feeding → Health → Birth Family → Data (sections you've turned off are skipped).
  - The page follows your finger and slides out, and the new section slides in. A dark label at the top shows where you're going while you drag ("Sleep ›"), then names the section with a row of dots for its position. The bottom bar highlights it as well.
  - Stops at Today and at Data (the page springs back and the label shows where you are).
  - Sideways-scrolling things keep their swipe until they reach their edge: on the Timeline grid, swiping left scrolls the grid first; once it's at the end, the next swipe moves on. Form fields never trigger it, and swipes starting at the very edge of the screen are left to the phone's own back gesture.
  - On by default; turn it off in *Settings → General → Display*. Kept on each device.

## v1.24.4 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Swipe between days in the day panel** (the score breakdown and day details), on phones: swipe left for the next day, right for the previous one. The page follows your finger, slides out, and the new day slides in from the other side, so the change is obvious. It stops at today and at the first day logged, with a small bounce and a short note.
- The **‹ ›** buttons and the ← → keys now always go to the previous / next calendar day (they used to follow the Timeline's sort order), with the same slide, and grey out at either end.

## v1.24.3 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Swipe down to close** (phones): drag Quick Log or the More panel down and let go to close it, like ✕; a quick flick works too. From the handle or title bar it always works; inside the list, only when the list is scrolled to the top (otherwise the drag scrolls the list). A short drag springs back. Taps on buttons are unaffected.

## v1.24.2 — 2026-11-25 · Apps Script v1.3 (no script change)

- **One 🍽 Meal button** in Quick Log instead of a button named for the time of day plus a separate Snack. The form opens with **Breakfast / Lunch / Snack / Dinner** at the top, the one for the time of day already picked; the Sheet still gets that category.
- **Logging earlier meals later:** picking Breakfast or Lunch in the evening sets the start time to that meal's planned time today (from today's template). Picking the meal for the current time brings back "now". A start time you changed by hand is never touched.
- Fix: a quick-amount button (milk, water, meal) only greys out the other buttons in its own row.

## v1.24.1 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Quick Log shows only the fields that fit:** Milk for milk and bottles, Water for water and meals, Outcome / Rating only where there are ratings (meals, sleep, handovers, health, mood, family contact). Pump, meds, weight, length and temperature keep their own value field. Tags (with the category's suggested chips) and Notes are always there. A field that already has a value always shows, so editing never hides data. Custom entries keep everything.
- **Phones:** one field per line in Quick Log; Date, Start time and End time each get their own line, with the now / −5 / −15 / −30 min / −1 h buttons right under them.

## v1.24.0 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Quick Log groups:** the buttons sit under small headings with a divider: Sleep, Feeding, Diapers, Health & growth, Activities, Visits & family, Other. Anything in progress (End night, End nap, breastfeeding switch / end) stays first in its group, highlighted. *Suggested now* is unchanged at the top.
- **Drop-off and Pick-up icons:** 👋 Drop-off (saying goodbye), 🤗 Pick-up (welcome back), instead of the same 🤝 on both. The Handover category keeps 🤝 elsewhere.

## v1.23.6 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Phones:** dragging inside Quick Log (including in the gaps between buttons), a dialog, the day panel or the filter panel no longer scrolls the page behind it.
- **One 🍼 Milk button** in Quick Log instead of four (+2 / +3 / +4 / +5 oz). The amounts are quick chips under the Milk field: 2 / 3 / 4 / 5 oz, or 60 / 90 / 120 / 150 ml in metric. Bottle entries get the same chips.

## v1.23.5 — 2026-11-25 · Apps Script v1.3 (no script change)

- *Who am I* is just a first name: the role picker is removed from Quick Log and *Settings → General* (the role was never written to entries; *Logged By* has always been the name only).

## v1.23.4 — 2026-11-25 · Apps Script v1.3 (no script change)

- On the adoption / placement path, the *Who am I* roles read **Foster dad**, **Foster mom** and **Foster parent** (Papa / Maman / Parent d'accueil), so they can't be mixed up with the birth parents ("mom" / "dad" in Family Contact). Other paths keep Father / Mother / Parent. Only the name goes into the Sheet's *Logged By* column.

## v1.23.3 — 2026-11-25 · Apps Script v1.3 (no script change)

- The ⓘ and filter buttons stay pinned in the top-right corner of each section when the ⓘ text is open, instead of dropping below it.

## v1.23.2 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Who am I in Quick Log:** until a name is set on a device, Quick Log opens with "Who's logging on this device?" (first name and role). *Not now* hides it for the session. Once set, the bottom of Quick Log shows "Logging as Mike · Father" with a *change* link. It's still in *Settings → General → On this device* too.

## v1.23.1 — 2026-11-25 · Apps Script v1.3 (no script change)

- **Routine score weights as a 100-point pool** (*Settings → Routine score*): each part has a slider with − / +, and a counter shows the points left. Once all 100 are used, a part can only go up after another goes down. While points are unspent, a warning says how many (scores still work in the meantime, scaled to what's assigned). **Default split** and **Clear all** buttons.
- The "how each part is scored" notes now describe the graded nap timing (full within 20 min, none at 75 min) and cutoff (full up to 10 min past, none at 60 min).

## v1.23.0 — 2026-11-25 · Apps Script v1.3 (update needed)

- **Shared settings in the Sheet.** Child profiles, targets, day templates, scoring, family-contact rules, check-in time and medications now live in two tabs, **Config** and **Medications**, so every caregiver's device stays in step without re-exporting the config.
  - Nothing to prepare: the script creates both tabs. The first device that syncs after the update copies its current settings into them.
  - **Medications** is one readable row per medication and can be edited right in the Sheet; the dashboards pick up the change on their next sync.
  - Changes made on a device are pushed about a second later; changes made elsewhere are applied on the next sync, with a short notice.
  - Kept per device: language, theme, filters, reminders, connection and *Who am I*. View-only keys never receive these tabs.
  - *Settings → Data source* shows the status and a **Push this device's settings to the Sheet** button (to make one device's settings the reference).
- **Apps Script v1.3:** returns the Config and Medications tabs to the family's key and accepts `config` and `meds` writes. Paste the new `Code.gs`, keep your `SECRET`, then *Deploy → Manage deployments → ✏️ → New version*. No new permissions.

## v1.22.1 — 2026-11-25 · Apps Script v1.2 (no script change)

- Upcoming items lead with how far away they are: *Next visits* in Today's plan ("in 6 days (Dec 1 11:00–12:30)"), "Coming up" appointments in the banner ("tomorrow (Thu, Nov 26 09:30)") and the vaccine reminder.

## v1.22.0 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Sleep tab redone** (same data, easier to read; each card opens with a one-line takeaway in bold):
  - **Sleep per day:** night sleep and naps stacked per day, with a 7-day average line. Only days whose night is logged are shown.
  - **Wake windows:** one row per window. The bar is her usual range (middle half of days), the dark line the typical value, and the green shading your target ± 15 min.
  - **Naps and the night after** (replaces the scatter plot): average time awake at night after days with less / normal / more day sleep, or after an early / on-time / late last nap.
  - **Easiest bedtime** (replaces the scatter plot): minutes to fall asleep by final wake window (around your target), and how often she woke within an hour.
  - **Outings & travel:** cells noticeably worse than a quiet home day are orange, better ones green.
- **Logged by:** *Settings → General → On this device → Who am I* (first name and role). It stays on each device and isn't exported with the config. Entries added from that device get a `Logged By` column in the Sheet (added automatically), and the name shows small under each entry's time. It's also included in Copy for AI.

## v1.21.5 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Sleep vs plan on each entry:** naps say which planned nap they matched and how far off they were ("Nap 1: down 17m late · woke 23m early"); night sleep says "to bed 25m late" or "bedtime on target". Shown in Today's entries and the day panel; anything over 20 minutes is in orange. Today's plan adds the same as start / end minutes, e.g. "✓ 10:32–11:07 (+17m / −23m)". Within 5 minutes counts as on time.

## v1.21.4 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Graded nap cutoff:** “No nap past cutoff” keeps full points up to 10 minutes past the cutoff, then slides to none at an hour past (15 min over = 9 of 10, 30 min = 6, 45 min = 3), instead of 0 for any overrun. The detail says how far past it ran. The bridge nap is still exempt.

## v1.21.3 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Tighter header.** Phones: the title, Refresh, Settings and the version share the top row; the pills sit in one row below. A live Sheet shows as a Google Sheets icon with the last sync time (full label and date on long-press), the "Last synced" line is gone, and the script pill reads just "🔧 v1.2". Computers: the buttons stay on the title row.

## v1.21.2 — 2026-11-25 · Apps Script v1.2 (no script change)

- Score breakdown: one small pip per point (a 20-point part shows 20, a 10-point part 10; 100 in all) instead of one pip per 5 points.

## v1.21.1 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Clear a date:** every optional date field (a medication's *until*, the placement date, a viewer key's start date, report anchor…) has a ✕ to empty it, because phone date pickers often can't.
- **Save confirmation:** Settings shows "✓ Saved" after each change (they save as you type). Each medication has **✓ Save medication**, which checks it (name, a valid time, *until* not before *from*) and confirms, e.g. "Saved: Septra 2 ml at 19:30 from Nov 25, ongoing". The row also shows whether it's active.
- **Quick Log → Meds:** buttons for your scheduled medications and any logged in the last 60 days; one tap fills Notes (name and dose), Tags (the name) and a new **Dose** field, so the dose checks off the schedule.

## v1.21.0 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Medication schedule** (*Settings → Reminders → Medications*): name, dose, time(s), from, until (blank = ongoing) and a note, per child.
  - At dose time: a notification and a 💊 line in the Today banner with **✓ Given**; it turns red if still not checked off an hour later.
  - Today's plan lists each dose with ✓ Given, or the time it was given.
  - ✓ Given writes a `Meds` row: Notes "Amoxicillin 2 ml", Tags `amoxicillin`, Value `2 ml`. A Meds row typed in the Sheet or added by Gemini counts too if it names the medication.
  - Health → **Medications**: a 30-day strip (green given, red not checked, dashed today) and the dates not checked off. Counting starts from the *From* date.
  - The list is saved on the device; export the config to give it to other caregivers.

## v1.20.3 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Score pips:** the routine score breakdown (tap the score in the header, or any day) shows each part as pips, one pip per 5 points, 20 in all, with partly earned pips partly filled and parts not scored yet as dashed outlines. Points show as earned / possible (e.g. 8.3 / 10) instead of percentages.
- **Graded nap timing:** “Naps on schedule” gives full credit within 20 minutes of the planned start, then slides to none at 75 minutes off (a missed nap scores 0), instead of all-or-nothing at 45 minutes. The detail names the nap and how late or early it was.

## v1.20.2 — 2026-11-25 · Apps Script v1.2 (no script change)

- Quick Log: the water amount accepts 5 ml steps (it only allowed multiples of 10).

## v1.20.1 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Filter button:** filters open from a funnel button next to ⓘ on every section they apply to (all but Today), as a panel (from the bottom on phones). The funnel turns blue with a dot when something is filtered, and its tooltip says what (range, day type, hidden categories). The filter line at the top of the page is gone. Back or tapping outside closes the panel.

## v1.20 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Today ignores category filters:** the Today section has no filter bar, so it no longer applies the categories hidden on other sections. Today's entries and today's grid always show everything; Timeline and the analysis tabs still follow the filter line at the top.
- **Quick Log forms open at the top** instead of keeping the scroll position of the previous form or the button list.

## v1.19 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Leaner header:** only Refresh and Settings remain as buttons. Report, the guided tour, English / Français, dark mode and *Import CSV* (only when no Sheet is connected) are under **More** (bottom bar on phones, last item of the sidebar or tabs on a computer). Language and theme are also in *Settings → Display*.
- **Today's routine score in the header** (e.g. "Today 82 so far"), coloured like the calendar; tap it for the breakdown in the day panel.
- **Script update notice → pill:** an outdated Apps Script now shows as a small 🔧 pill beside the other warnings (tap for how to update) instead of a banner across the page.

## v1.18 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Snack button:** Quick Log always has 🍎 Snack; the 🍽 meal button still names the meal for the time of day (breakfast before 10:30, lunch until 14:30, snack until 17:00, then dinner). The meal form has Breakfast / Lunch / Snack / Dinner buttons to switch.

## v1.17 — 2026-11-25 · Apps Script v1.2 (no script change)

- **Vaccines from the booklet:** each not-yet-logged row of the Québec schedule has **✓ Log date**, which opens a Vaccine entry pre-filled with that visit's vaccines; set the date from the vaccination booklet and save.
- **Past measurements:** **＋ Past measurement** on the Growth card opens a Weight entry with an editable date (switch Category to Height or Head Circumference for the others), so the WHO curves can include measurements from before you started logging.

## v1.16 — 2026-11-25 · Apps Script v1.2 (no script change)

All of these read only what you already log (or your calendar); nothing new to record.

- **Suggested now** (Quick Log): the 2–3 entries you usually log at this hour or that today's plan expects, plus anything in progress.
- **Nudges** (Today banner): a nap, night or outing still "in progress" after hours; a meal or nap you log most days that isn't there yet by its usual time.
- **Bedtime routines follow bedtime:** a template step can be set in *minutes before bedtime*. The stock bath (45 min) and non-bath (30 min) routines now do this, and Baseline's weekday routines also apply on visit days, so a 19:00 visit-day bedtime moves bath night to 18:15.
- **Tomorrow card** (Today, from 15:00): when tomorrow has a calendar or logged visit, the template it will use, car naps, routines and bedtime(s), and how nights after past visits compared with home days.
- **Trends to watch** (Routine tab, and one line in the banner): three days running of more night waking, longer bedtime, later bedtime, less day sleep, less milk, or 3+ refused meals; fewer naps than planned on most of the last week (nap-transition hint). Age bands now include 12–18 months, 18–24 months (one nap), 2–3 years and 3 years +; your notes and routines are kept when you apply a band.
- **Vaccines · Québec schedule** (Health): 2, 4, 12, 18 months and 4–6 years from the date of birth, matched to your Vaccine rows. Banner reminder two weeks ahead; post-vaccine watch for 2 days (and a note about late reactions 1–2 weeks after the 12- and 18-month doses). Fevers (≥ 38 °C), health notes and difficult days logged afterwards are listed. *Settings → Reminders* to turn off.
- **Allergen upkeep** (Feeding): for each common allergen group already eaten, the last time it was offered and how often in 30 days; over a week shows in orange.
- **Teething and sleep** (Health → Teeth): night waking and day sleep for the two weeks before, the 3 days before and the 3 days after each tooth.
- **📋 Copy for AI** (Today's entries): the day's log as plain text with a short prompt, ready to paste into an AI assistant (share sheet on phones).
- **Guided tour** updated for everything since v1.6 (34 steps).

## v1.15 — 2026-11-25 · **Apps Script v1.2** (update needed)

- **Visits from shared calendars:** the script now reads every calendar ticked in your Google Calendar, including shared ones like a family calendar, instead of only your main one. A visit that's in two calendars counts once. To limit it, set `CALENDARS` to a list of names or IDs, e.g. `['primary', 'Famille']`.
- `checkCalendar` (▸ Run in the editor) now logs which calendars it read and, for each visit found, its title and calendar. That's visible only to you in the editor and never sent to the dashboard.
  - **To update:** paste the new `Code.gs` (keep your `SECRET` and `VIEWERS`), run `checkCalendar` once, then *Deploy → Manage deployments → ✏️ → New version → Deploy*. Same URL.

## v1.14 — 2026-11-25 · Apps Script v1.1 (no script change)

- **Today's entries:** the Today section lists everything logged today (newest first, 8 shown with *Show all*), each with ✏️ to fix or delete it right away; press and hold works too. Tap a row to open it in the day panel.

## v1.13 — 2026-11-25 · Apps Script v1.1 (no script change)

- **Version in the top right corner:** tap it for Settings → About & changes (what's new and the full changelog). Hover or long-press shows the dashboard and Apps Script versions.
- **Now button beside every time field** in Quick Log, for start and end times, on new entries and on edits (e.g. filling in when play or a nap actually finished).

## v1.12 — 2026-11-25 · Apps Script v1.1 (no script change)

- **ⓘ for section instructions:** how-to-read lines and legends under section titles (chart keys, column meanings, “tap a row to…”) fold into an ⓘ button at the top right of each card. Lines that carry numbers stay visible: check-in coverage and per-area counts, the cocooning week, teeth count, contacts in range, events matching the filters, bath target, and Today's plan.

## v1.11 — 2026-11-25 · Apps Script v1.1 (no script change)

- **End time buttons:** *now · −5 · −15 · −30 min · −1 h* under End time when ending a nap or feed, and on new entries that have a duration (naps, feeds, play, visits, family contact reply time).

## v1.10 — 2026-11-25 · Apps Script v1.1 (no script change)

- **Back button** (Android installed app and browsers): closes whatever is open on top first (report, Settings and other dialogs, Quick Log, More, the day panel, the phone filter panel, the tour), then returns to the previous section. It only leaves the app from the screen you started on. Closing something with its own ✕ keeps the history tidy, so you never need an extra Back press.

## v1.9 — 2026-11-25 · Apps Script v1.1 (no script change)

- **Poop consistency:** `Diaper - Poop` entries get Hard / Formed / Loose / Watery chips with small drawn icons, the four groups of the Brussels Infant and Toddler Stool Scale (BITSS, Bristol types 1–2 / 3–5 / 6 / 7). Stored as a tag (`hard`, `formed`, `loose`, `watery`). Health → Care tracking shows the mix for the range and notes 2+ hard or watery poops in the last 7 days.
- **Wet + poop** opens a short form (time, consistency, notes) and saves both rows; the consistency goes on the poop row only.
- **Quick Log times:** *now · −5 · −15 · −30 min · −1 h* buttons under Start time.
- **Water amounts:** 10 / 30 / 60 / 90 / 120 / 150 ml buttons, editable in *Settings → Targets*.
- **Time fields on a computer** are plain text boxes: type `930`, `14:45`, `2:15p` or `9h30`; ↑ / ↓ move by 5 minutes (Shift: 15). Phones keep the native picker.

## v1.8 — 2026-11-25 · Apps Script v1.1 (no script change)

- **Quick Log → 💧💩 Wet + poop:** one tap logs both diapers (a `Diaper - Wet` and a `Diaper - Poop` row at the same time), so wet and poop counts both stay right.

## v1.7 — 2026-11-25 · **Apps Script v1.1** (update needed for calendar visits)

- **Today's plan:** the Today section lists today's template as a schedule (time · what · notes), highlights what's happening now and what's next with a countdown, and shows the logged time next to what's done. Earlier items fold away. With a bridge-nap template, only the bedtime that applies today is shown.
- **Template notes and weekdays:** each target can carry notes and be limited to some days (`Mon, Thu, Sun`), e.g. bath-night vs non-bath routines. Stock *Baseline Home Day* gains the wind-down + milk steps and both bedtime routines (added to existing setups without touching anything you changed).
- **Visits from Google Calendar (Apps Script v1.1):** timed events with "visit" / "visite" in the title (not "home visit" or "cancelled") pick the early or late visit-day template before the visit is logged, line up the car naps with the real time, appear in the Today banner, and are listed as *Next visits* in Today's plan. Only dates and times leave Google; titles never do, and viewer keys get nothing from the calendar. Set `CALENDAR_ID = ''` to turn it off.
  - **To update:** paste the new `Code.gs` (keep your `SECRET` and `VIEWERS`), choose `checkCalendar` in the toolbar and click ▸ **Run** once to approve calendar access (it logs the visits it found), then *Deploy → Manage deployments → ✏️ → New version → Deploy*. Same URL.

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
