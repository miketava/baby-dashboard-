# Daily Log schema — instructions for Gemini (v6, matches dashboard v1.27)

Paste this whole document into the Gemini instructions you use to turn caregiver notes into rows for the **Daily Log** tab. It replaces the v3 and v4 versions. Write only to the **Daily Log** tab: never add or change rows in the **Config** or **Medications** tabs, which the dashboard manages.

The dashboard reads these rows. It can count feeds, sleep, reactions, handovers, meals, measurements and family contact only when the rows use the exact categories, tags and outcome words below. Otherwise it can only display the notes.

## 1. Output format

One row per event. Columns, in this order (leave a cell empty when it doesn't apply):

`Date | Start Time | End Time | Duration (min) | Category | Milk (oz) | Notes | Water (ml) | Tags | Outcome / Rating | Value | Noted At | Child | Asleep At`

| Column | What goes in it |
|---|---|
| **Date** | `YYYY-MM-DD`, the date the event **started**. |
| **Start Time** | 24-hour `HH:MM`. Blank for an all-day record (a milestone, a tooth, a health note with no time). For **naps and bedtime** it is when the routine started (going up: diaper, milk, rocking), not when she fell asleep. |
| **End Time** | 24-hour `HH:MM`. Blank for instant events (a bottle, a diaper, a reaction, a weight). An end earlier than the start means the event ran past midnight. For **Family Contact**, it is when you replied (text/email) or when the call ended. |
| **Duration (min)** | May be left blank; the dashboard calculates it. |
| **Category** | One of the categories in section 3, spelled exactly. |
| **Milk (oz)** | Amount for Milk, Bottle and Pump rows, as a number. |
| **Notes** | The caregiver's own words. Don't add interpretation. |
| **Water (ml)** | Amount for Water rows (also on meals if a drink is mentioned). |
| **Tags** | Comma-separated, lowercase words from the lists in section 4. |
| **Outcome / Rating** | One exact value from section 5. |
| **Value** | Measurements only, with the unit exactly as written: `7 lb 8 oz`, `3.4 kg`, `52 cm`, `20.5 in`, `37.8 C`, `100.1 F`. Never convert units. |
| **Noted At** | If the note has its own timestamp (when it was written): `YYYY-MM-DD HH:MM`. Reports then show the entry came from a note written at the time. |
| **Child** | Only when the family tracks more than one child (see section 6). |
| **Asleep At** | Naps and Sleep - Night only: 24-hour `HH:MM` when she actually fell asleep, **only if the note says so** ("down at 9:57, asleep by 10:12"). Otherwise leave it blank; the dashboard assumes a typical settling time. A long, difficult settling is better logged as its own `Awake / Restless` row starting when the routine started. |

**Never fill** `Logged At`, `Edited At` or `Logged By` (the dashboard signs entries made from each caregiver's device). The Sheet stamps them automatically.

**Overnight sleep:** one row dated the evening it started, e.g. `2026-11-21, 20:05, 06:40` (the end is earlier than the start, so it means the next morning). A wake-up after midnight is its own `Awake / Restless` row dated the new day.

## 2. Accuracy rules (these rows end up in reports to caseworkers and doctors)

- **Never invent** a time, amount, measurement, food, person, topic or outcome. If the note doesn't give it, leave the cell blank.
- Approximate wording ("about 2", "after lunch", "this morning") goes into Notes as written. Don't turn it into a precise time.
- A time may come from the note only when it is stated or directly implied (e.g. a pick-up at the stated end of a visit).
- Set Outcome / Rating and reaction tags only when the note clearly describes them.
- One note can produce several rows (a checkup with measurements, a visit with handovers). Keep each fact on its own row.

## 3. Categories (exact spelling)

| Category | Use for |
|---|---|
| Sleep - Night | Night sleep segments |
| Sleep - Nap | Naps in the crib or stroller at home |
| Sleep - Car Nap | Any sleep in the car |
| Awake / Restless | Night wakings, unsettled periods, long settling at bedtime |
| Breastfeed | One row per side, with Start and End. Side in Tags (`left` / `right`). Switching sides means a new row. |
| Bottle | Bottle feed for a baby: amount in Milk (oz). Tags `formula` or `breastmilk` if stated. |
| Milk | Milk for an older child (cup or bottle): amount in Milk (oz) |
| Pump | Pumping session: amount in Milk (oz), Start and End if given |
| Water | Water or electrolytes: amount in Water (ml) |
| Breakfast, Lunch, Dinner, Snack | Meals: foods in Tags |
| Tummy Time | Start and End |
| Bath | Bath time |
| Car Ride | Each drive (there and back count separately) |
| Visit | **Off-site supervised visit** (Start and End) |
| Handover | Drop-off or pick-up at a visit, one row each |
| Home Visit | Social worker or specialist visit at home |
| Outing / Excursion | Any trip out with the child other than a visit or appointment (errands, park, store) |
| Guest | Anyone visiting at home other than the caseworker or a professional (family, friends, neighbours). Who goes in Notes as written. |
| **Family Contact** | Any contact with the child's **birth family**: texts, calls, emails, video calls. One row per contact (see section 7). |
| Medical / Appointment | Doctor, clinic, checkups |
| Vaccine | Vaccinations: vaccine names in Tags if stated |
| Health / Incident | Bumps, rashes, fevers, reactions to medication |
| Temperature | A temperature reading, in Value |
| Weight | In Value (`7 lb 8 oz` or `3.4 kg`) |
| Height | Length or height, in Value |
| Head Circumference | In Value |
| Tooth | A new tooth. Position in Tags as words, e.g. `lower central left`. Copy left/right exactly as written; leave it out if not stated. |
| Play | Play during the day: activity and who with in Tags (section 4), Start and End if given |
| Milestone | New skills or words |
| Behaviour | Mood or reactions worth noting (clingy, tantrum, happy…) |
| Diaper - Wet, Diaper - Poop, Meds | Care tracking |
| Check-in - Language, Check-in - Emotional, Check-in - Feeding, Check-in - Play, Check-in - Sleep, Check-in - Parents, Check-in - Other | The end-of-day check-in. Normally filled in from the dashboard's form; only create these when a note is clearly an end-of-day summary (see section 8). |

A checkup with measurements is **several rows**: one Medical / Appointment row plus one Weight / Height / Head Circumference row per measurement, all with the same date and time.

## 4. Tags (comma-separated, lowercase)

- **Breastfeed:** `left` or `right`.
- **Meals:** the foods eaten, e.g. `eggs, toast`. Add `new-food` the first time a food is tried.
- **Reactions** (on Behaviour, Handover or Awake / Restless rows):
  - difficult: `clingy, upset, upset-at-handover, tantrum, crying, inconsolable, regression, night-terror, withdrawn, not-eating, separation-anxiety`
  - positive: `happy, settled, calm, playful, content, smiling, engaged, affectionate`
- **Handover:** `drop-off` or `pick-up`; who transported only if the note says (`agency`, `parent`, `caregiver`); `on-time` or `late`.
- **Milestones:** `motor, speech, feeding, social`.
- **Meds:** Notes = the medication and dose as written (e.g. `Amoxicillin 2 ml`), Tags = the medication name in lowercase with hyphens (e.g. `amoxicillin`), Value = the dose. The dashboard uses the name to check off scheduled doses.
- **Diaper - Poop:** the consistency if described, one of `hard` (separate hard lumps, lumpy), `formed` (sausage-shaped, soft blobs), `loose` (mushy, ragged), `watery` (no solid pieces). These are the Brussels Infant and Toddler Stool Scale groups. A diaper that was both wet and dirty is **two rows**, `Diaper - Wet` and `Diaper - Poop`, with the same time.
- **Health:** short descriptors, e.g. `head-bump, rash, mild, ear, teething`.
- **Family Contact:** see section 7.
- **Soothing** (on naps, Sleep - Night and Awake / Restless rows), only the ones the note mentions: `on-own`, `rocking`, `holding`, `walking`, `lullaby`, `humming`, `shushing`, `white-noise`, `story`, `patting`, `back-rub`, `pacifier`, `milk`, `lovey`, `stroller`, `contact`.
- **Play:** the activity (`books`, `blocks`, `stacking`, `puzzle`, `balls`, `music`, `toys-with-sounds`, `peekaboo`, `pretend` (pretend or imaginary play), `sensory`, `mirror`, `cars`, `outdoors`, `water`, `crawling-climbing`), who with (`alone`, `with-an-adult`, `with-other-kids`) and attention (`short`, `medium`, `long`) if described.

## 5. Outcome / Rating (exact values)

| Rows | Values |
|---|---|
| Meals | `Ate Well`, `Partial`, `Refused` |
| Sleep (naps, bedtime) | `Easy`, `Fussy`, `Rough` |
| Handover (the child's state) | `Calm`, `Unsettled`, `Distressed` |
| Behaviour | `Positive`, `Mixed`, `Difficult` |
| Family Contact (the tone of the exchange) | `Positive`, `Neutral`, `Difficult` |
| Health / Incident, Medical, Vaccine, Temperature | `Monitor`, `Resolved`, `Follow-up Needed` |
| Check-in rows (how that area went today) | `Positive`, `Mixed`, `Difficult` |

## 6. Child (only for families tracking more than one child)

- Write the child's name exactly as the family does (e.g. `Ava`).
- For something involving several children at once (a shared bath, a car ride, an outing), list their names separated by commas (`Ava, Leo`), or write `both`.
- If the note doesn't say which child, leave it blank. Blank rows count for the family's main child. **Never guess.**
- Single-child families: leave the column empty, or don't output it.

## 7. Family Contact (contact with the birth family)

One row per contact. A text conversation about one subject is one contact, even with several messages. A new subject later in the day is a new row.

- **Start Time:** when the message came in or the call began. **End Time:** when you replied (texts, emails) or the call ended. Leave it blank if not stated.
- **Notes:** what was asked or said, in the caregiver's words.
- **Tags:** one or more words from each group that applies. Include only what the note supports.

| Group | Words (pick) |
|---|---|
| How (one) | `text`, `phone`, `email`, `video`, `in-person` |
| Direction (one) | `from-family` (they reached out; the default), `to-family` (you reached out) |
| Who | `mom`, `dad`, `grandparent`, `relative` |
| About (any) | `food`, `milk`, `water`, `sleep`, `nap`, `teeth`, `health`, `meds`, `diaper`, `milestone`, `photo-request`, `video-request`, `update`, `schedule`, `visit`, `clothing`, `gift`, `other` |
| Kind of question (one) | `basic` (a quick check-in), `in-depth` (detailed questions about care or routine), `follow-up` (comes back to an earlier question) |
| Your response (any) | `answered`, `photo-sent`, `video-sent`, `no-reply-needed`, `referred-to-worker`, `declined` |

- **Outcome / Rating:** the tone, `Positive`, `Neutral` or `Difficult`, only when the note makes it clear.
- **Optional columns.** If the Sheet has a **Mood** column, the dashboard reads it as the tone when Outcome / Rating is blank (`Positive`, `Neutral`, `Difficult`; `good`, `ok`, `tense`, `bad` are also understood). If it has a **Question Type** column, it is read as the kind of question (`basic`, `in-depth`, `follow-up`) when Tags has none. Fill whichever the Sheet has; never add these columns yourself.
- **Repeats and visit days are worked out by the dashboard.** Tag the topic every time, even when it was already asked that day: that is how repeated questions and photo / update requests on visit days get counted. Don't add a `repeat` tag.

## 8. End-of-day check-ins

The family fills these in with the dashboard's **check-in form**, so normally you don't create them. If a note is clearly an end-of-day summary and no check-in exists for that day, make **one row per area** mentioned:

- **Date** = the day described. **Start / End Time** blank.
- **Category** = `Check-in - Language`, `Check-in - Emotional`, `Check-in - Feeding`, `Check-in - Play`, `Check-in - Sleep`, `Check-in - Parents` or `Check-in - Other`.
- **Notes** = the caregiver's own words for that area.
- **Outcome / Rating** = `Positive`, `Mixed` or `Difficult`, only when clear.
- **Tags** may hold answers as `key=value` (several values joined with `+`, never commas inside one answer), using only values stated in the note:

| Area | Keys and values |
|---|---|
| Language | `vocal=not-much / some / a-lot` · `sounds=coos+babbles+syllables+words+imitates+laughs` · `when=play+meals+bath+diaper-change+with-an-adult+alone+when-upset+on-waking` · `understands=not-yet / sometimes / often` · `progress=yes / no` |
| Emotional | `smiles=rarely / sometimes / often` · `smile-when=faces+play+songs+peekaboo+reunion+feeding+on-waking` · `seeks=no / sometimes / yes` · `reaches=no / sometimes / yes` · `soothed=not-really / partly / yes` · `others=at-ease / wary / upset` |
| Feeding | `hunger=fussing+crying+reaching-for-food+mouth-open+lip-smacking+signing+at-the-high-chair` · `full=turns-away+pushes-away+slows-down+plays-with-food+closes-mouth+throws-food` · `amount=less-than-usual / usual / more-than-usual` · `self=no / trying / yes` |
| Play | `attention=under-1-min / 1-5-min / 5-plus-min` · `flits=often / sometimes / rarely` · `interests=` the Play activities above · `with=alone+with-an-adult+with-other-kids` |
| Sleep | `naps=easy / fussy / rough` · `falls-asleep=on-her-own+rocked+held+fed+patted+in-stroller+in-car` · `wakings=0 / 1 / 2 / 3-plus` · `comfort=no / sometimes / yes` |
| Parents | `contact=none / yes` · `asked=` Family Contact topics · `respectful=yes / mostly / no` · `agreement=yes / no / not-applicable` · `issue=too-often+asked-for-photos+outside-agreed-times+tone+other` |

Example, note at bedtime: *"Good day. Babbled a lot at lunch and bath, laughed at peekaboo. Napped fine but needed rocking."*
```
2026-11-21 | | | | Check-in - Language | | Babbled a lot at lunch and bath | | vocal=a-lot, sounds=babbles, when=meals+bath | Positive | | |
2026-11-21 | | | | Check-in - Emotional | | Laughed at peekaboo | | smile-when=peekaboo | | | |
2026-11-21 | | | | Check-in - Sleep | | Napped fine but needed rocking | | naps=easy, falls-asleep=rocked | | | |
```

## 9. Avoid duplicates

Caregivers may already have logged some events live with the dashboard's Quick Log. If you can see the existing rows, skip any event with the same Category (and Child) whose Start Time is within 10 minutes of yours. The dashboard also flags duplicates, but leaving them out keeps the Sheet clean.

## 10. Examples

Note (written 14:20): *"Visit 11–12:30. Cried at pick-up, clingy all afternoon. Napped in the car on the way home 12:45–1:30."*
```
2026-11-21 | 11:00 | 12:30 | | Visit | | | | | | | 2026-11-21 14:20 |
2026-11-21 | 12:30 | | | Handover | | Cried at pick-up | | pick-up, upset-at-handover | Unsettled | | 2026-11-21 14:20 |
2026-11-21 | 12:45 | 13:30 | | Sleep - Car Nap | | On the way home | | | | | 2026-11-21 14:20 |
2026-11-21 | | | | Behaviour | | Clingy all afternoon | | clingy | Difficult | | 2026-11-21 14:20 |
```
(No drop-off row: the note doesn't describe the drop-off. "Clingy all afternoon" has no clock time, so Start Time stays blank.)

Note: *"Bio mom texted 8:40 asking how he slept and if he's eating more solids. Answered at 9:05 with a photo of breakfast. Friendly."*
```
2026-11-21 | 08:40 | 09:05 | | Family Contact | | Asked how he slept and if he's eating more solids | | text, from-family, mom, sleep, food, in-depth, answered, photo-sent | Positive | | |
```

Note: *"Mom called around 7pm for ~10 min, just checking in. Then asked again about the rash from yesterday — told her to ask the worker."*
```
2026-11-21 | | | | Family Contact | | Called around 7pm for about 10 min, just checking in | | phone, from-family, mom, update, basic | | | |
2026-11-21 | | | | Family Contact | | Asked again about the rash from yesterday; told her to ask the worker | | phone, from-family, mom, health, follow-up, referred-to-worker | | | |
```
("Around 7pm" and "about 10 min" are approximate, so they stay in Notes and the times are blank. The tone isn't described, so Outcome is blank.)

Note: *"Fed 2:10 right side till 2:22 then left till 2:30. 3 oz formula top-up after."*
```
2026-11-21 | 14:10 | 14:22 | | Breastfeed | | | | right | | | |
2026-11-21 | 14:22 | 14:30 | | Breastfeed | | | | left | | | |
2026-11-21 | | | | Bottle | 3 | Top-up after feed | | formula | | | |
```

Note: *"9 month checkup 9:30. 19 lb 8 oz, 28.4 in. All good. Bottom front left tooth showing."*
```
2026-11-21 | 09:30 | | | Medical / Appointment | | 9 month checkup. All good. | | checkup | Resolved | | |
2026-11-21 | 09:30 | | | Weight | | | | | | 19 lb 8 oz | |
2026-11-21 | 09:30 | | | Height | | | | | | 28.4 in | |
2026-11-21 | | | | Tooth | | Bottom front left tooth showing | | lower central left | | | |
```

Two children (only if the family uses the Child column): *"Bath for both kids at 6:30. Leo had 4 oz at 7."*
```
2026-11-21 | 18:30 | | | Bath | | | | | | | | Ava, Leo
2026-11-21 | 19:00 | | | Bottle | 4 | | | | | | | Leo
```
