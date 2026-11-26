
/* ════════════════════════════════════════════════════════════════════════════
   2. DEMO DATA — 7 past days + today, generated relative to *now* so the Today banner is live.
   Row: [dayOffset (0 = 7 days ago, 7 = today), start, end, duration, category, milkOz, notes,
         waterMl, tags, outcome, prefilled?]
   Rows that start after "now" are dropped (except pre-filled appointments); rows spanning "now"
   are kept with a blank End Time so they show as in progress — exactly like a real Quick Log.
   ════════════════════════════════════════════════════════════════════════════ */
const DEMO_ROWS = [
  // Growth history and teeth (older-baby demos; the child turns 1 on day 4's checkup)
  [-363,'','','', 'Weight','','Birth weight','', '', '', false, '3.40 kg'], [-363,'','','', 'Height','','Birth length','', '', '', false, '50.4 cm'], [-363,'','','', 'Head Circumference','','At birth','', '', '', false, '34.6 cm'],
  [-333,'','','', 'Weight','','1-month checkup','', '', '', false, '4.45 kg'], [-333,'','','', 'Height','','1-month checkup','', '', '', false, '54.6 cm'], [-333,'','','', 'Head Circumference','','1-month checkup','', '', '', false, '37.2 cm'],
  [-302,'','','', 'Weight','','2-month checkup','', '', '', false, '5.55 kg'], [-302,'','','', 'Height','','2-month checkup','', '', '', false, '58.3 cm'], [-302,'','','', 'Head Circumference','','2-month checkup','', '', '', false, '39.0 cm'],
  [-241,'','','', 'Weight','','4-month checkup','', '', '', false, '6.95 kg'], [-241,'','','', 'Height','','4-month checkup','', '', '', false, '63.6 cm'], [-241,'','','', 'Head Circumference','','4-month checkup','', '', '', false, '41.5 cm'],
  [-180,'','','', 'Weight','','6-month checkup','', '', '', false, '7.80 kg'], [-180,'','','', 'Height','','6-month checkup','', '', '', false, '67.5 cm'], [-180,'','','', 'Head Circumference','','6-month checkup','', '', '', false, '43.2 cm'],
  [-150,'','','', 'Tooth','','First tooth!','', 'lower-central-left'], [-146,'','','', 'Tooth','','','', 'lower-central-right'],
  [-89,'','','', 'Weight','','9-month checkup','', '', '', false, '8.85 kg'], [-89,'','','', 'Height','','9-month checkup','', '', '', false, '72.1 cm'], [-89,'','','', 'Head Circumference','','9-month checkup','', '', '', false, '44.9 cm'],
  [-88,'','','', 'Tooth','','','', 'upper-central-left'], [-84,'','','', 'Tooth','','','', 'upper-central-right'],
  [-58,'','','', 'Tooth','','','', 'upper-lateral-right'], [-55,'','','', 'Tooth','','','', 'upper-lateral-left'], [-31,'','','', 'Tooth','','','', 'lower-lateral-left'],
  [4,'','','', 'Weight','','12-month checkup','', '', '', false, '9.70 kg'], [4,'','','', 'Height','','12-month checkup','', '', '', false, '75.9 cm'], [4,'','','', 'Head Circumference','','12-month checkup','', '', '', false, '46.0 cm'],
  [3,'','','', 'Tooth','','First molar came through — explains the chewing','', 'lower-first-molar-left, teething'],
  // Day 0 — baseline home day
  [0,'','','', 'Milestone','','Pulled to stand at the couch','', 'motor'],
  [0,'06:55','','', 'Milk',5,'Morning bottle'],
  [0,'07:40','08:00','20','Breakfast','','Ate it all',60,'oatmeal, banana','Ate Well'],
  [0,'10:20','11:35','75','Sleep - Nap','','Crib, fell asleep fast','','','Easy'],
  [0,'11:50','12:15','25','Lunch','','',90,'pastina, peas','Ate Well'],
  [0,'12:30','','', 'Milk',3,''],
  [0,'14:50','15:55','65','Sleep - Nap','','Crib'],
  [0,'16:15','16:30','15','Snack','','',60,'crackers, cheese','Ate Well'],
  [0,'16:40','17:25','45','Outing / Excursion','','Park with grandparents','', 'grandparents, walking'],
  [0,'17:45','18:15','30','Dinner','','',60,'chicken, rice, carrots','Partial'],
  [0,'19:15','19:35','20','Bath','','Bath + lotion, very happy'],
  [0,'19:45','','', 'Milk',5.5,'Bedtime bottle'],
  [0,'20:05','06:50','', 'Sleep - Night','','Down easily, no peep','','','Easy'],
  // Day 1 — late second nap + dream feed → split night
  [1,'7:05','','', 'Milk',4.5,''],
  [1,'07:45','08:05','20','Breakfast','','',60,'eggs, toast','Ate Well'],
  [1,'08:30','','', 'Diaper - Poop','',''],
  [1,'10:30','11:20','50','Sleep - Nap','','Short nap, woke up crying','','','Fussy'],
  [1,'12:00','12:30','30','Lunch','','Picky today',60,'soup','Partial'],
  [1,'12:40','','', 'Milk',3.5,''],
  [1,'15:20','16:45','85','Sleep - Nap','','Late nap - went past cutoff'],
  [1,'16:50','','', 'Health / Incident','','Bumped head on coffee table, small red mark','', 'head-bump','Monitor'],
  [1,'17:00','17:15','15','Snack','','',30,'yogurt','Ate Well'],
  [1,'18:00','18:30','30','Dinner','','',60,'basa, sweet potato','Ate Well'],
  [1,'19:30','19:50','20','Awake / Restless','','Fussing during bedtime routine'],
  [1,'19:50','','', 'Milk',5,''],
  [1,'20:40','02:10','330','Sleep - Night','','Took 25 min to settle at bedtime','','','Fussy'],
  [1,'22:30','','', 'Milk',1.5,'Dream feed'],
  [2,'02:10','03:05','55','Awake / Restless','','Split night, babbling and standing in crib'],
  [2,'02:30','','', 'Milk',2,'Small bottle to settle'],
  [2,'03:05','07:20','255','Sleep - Night',''],
  // Day 2 — late-morning visit day with car naps (overlapping events)
  [2,'','','', 'Health / Incident','','Head bump checked — faded, no concerns','', 'head-bump','Resolved'],
  [2,'07:35','','', 'Milk',5,''],
  [2,'08:00','08:20','20','Breakfast','','First time trying raspberries',60,'pancakes, raspberries, new-food','Ate Well'],
  [2,'08:45','','', 'Diaper - Wet','',''],
  [2,'09:55','11:00','65','Car Ride','','Drive to visit'],
  [2,'10:00','10:45','45','Sleep - Car Nap','','Out within 5 min'],
  [2,'10:58','','', 'Handover','','Drop-off','', 'drop-off, agency','Calm'],
  [2,'11:00','12:30','90','Visit','','Supervised visit — played in the garden, lots of attention'],
  [2,'12:30','','', 'Handover','','Pick-up — cried when leaving','', 'pick-up, agency','Unsettled'],
  [2,'13:50','','', 'Behaviour','','Clingy all afternoon','', 'clingy','Difficult'],
  [2,'11:45','12:10','25','Lunch','','Lunch at visit','', 'sandwich','Partial'],
  [2,'12:35','13:40','65','Car Ride','','Drive home'],
  [2,'12:45','13:30','45','Sleep - Car Nap','',''],
  [2,'13:45','','', 'Milk',3,''],
  [2,'15:30','16:00','30','Outdoor Walk','','Stroller walk around the block'],
  [2,'16:05','16:25','20','Sleep - Nap','','Bridge nap in stroller'],
  [2,'17:50','18:20','30','Dinner','','Tired and cranky',60,'pasta, meatballs','Partial'],
  [2,'19:00','19:20','20','Bath','',''],
  [2,'19:30','','', 'Milk',5.5,''],
  [2,'19:55','06:45','', 'Sleep - Night','','Out like a light','','','Easy'],
  // Day 3 — day after the visit, oversleeps during the day
  [3,'06:55:00','','', 'Milk',4,''],
  [3,'07:30','07:50','20','Breakfast','','',60,'toast, raspberries','Ate Well'],
  [3,'09:50','11:25','95','Sleep - Nap','','Long first nap, still tired from yesterday'],
  [3,'12:00','12:25','25','Lunch','','',90,'pastina, carrots','Ate Well'],
  [3,'12:30','','', 'Milk',3,''],
  [3,'14:40','16:10','90','Sleep - Nap','','Had to wake him'],
  [3,'16:30','16:45','15','Snack','','',30,'apple','Ate Well'],
  [3,'17:30','','', 'Behaviour','','Tantrum before dinner','', 'tantrum','Difficult'],
  [3,'18:00','18:25','25','Dinner','','Didn\'t eat much, chewing on everything',60,'chicken, broccoli','Refused'],
  [3,'18:30','','', 'Meds','','Teething gel'],
  [3,'19:50','','', 'Milk',4.5,''],
  [3,'20:30','23:40','190','Sleep - Night','',''],
  [3,'23:40','00:35','55','Awake / Restless','','Crying, rocked back to sleep'],
  [4,'00:35','06:40','365','Sleep - Night','',''],
  // Day 4 — checkup morning, then baseline
  [4,'','','', 'Milestone','','First steps! Three wobbly steps to Dad','', 'motor'],
  [4,'06:50','','', 'Milk',5,''],
  [4,'07:30','07:50','20','Breakfast','','',60,'oatmeal, blueberries','Ate Well'],
  [4,'08:40','08:55','15','Car Ride','','To the clinic'],
  [4,'09:00','09:40','40','Medical / Appointment','','12-month checkup + vaccines. Recheck left ear in 2 weeks.','', 'checkup, vaccines, ear','Follow-up Needed'],
  [4,'09:45','10:00','15','Car Ride','','Home'],
  [4,'10:15','11:30','75','Sleep - Nap','','','','','Easy'],
  [4,'11:45','12:10','25','Lunch','','',90,'mac and cheese','Ate Well'],
  [4,'12:20','','', 'Milk',3.5,''],
  [4,'13:00','','', 'Diaper - Poop','',''],
  [4,'14:45','15:50','65','Sleep - Nap','',''],
  [4,'16:10','16:25','15','Snack','','',30,'banana','Ate Well'],
  [4,'17:40','18:10','30','Dinner','','',60,'meatballs, broccoli','Partial'],
  [4,'19:00','19:20','20','Bath','','Splashy bath'],
  [4,'19:40','','', 'Milk',5,''],
  [4,'20:00','06:55','', 'Sleep - Night','','Perfect night','','','Easy'],
  [4,'22:30','','', 'Milk',2,'Dream feed'],
  // Day 5 — early-morning visit day
  [5,'07:00','','', 'Milk',5,''],
  [5,'07:20','07:40','20','Breakfast','','',60,'cereal, banana','Ate Well'],
  [5,'08:10','08:55','45','Car Ride','','Drive to visit'],
  [5,'08:15','08:50','35','Sleep - Car Nap','',''],
  [5,'08:57','','', 'Handover','','Drop-off','', 'drop-off, agency','Calm'],
  [5,'09:00','10:30','90','Visit','','Supervised visit — played with cousins'],
  [5,'10:30','','', 'Handover','','Pick-up','', 'pick-up, agency','Calm'],
  [5,'10:35','11:30','55','Car Ride','','Drive home'],
  [5,'10:40','11:25','45','Sleep - Car Nap','',''],
  [5,'11:45','12:10','25','Lunch','','',60,'eggs, avocado','Ate Well'],
  [5,'12:15','','', 'Milk',3,''],
  [5,'14:30','15:45','75','Sleep - Nap','','Capped crib nap'],
  [5,'15:50','','', 'Health / Incident','','Mild rash on cheeks after lunch','', 'rash, mild','Monitor'],
  [5,'16:05','16:20','15','Snack','','',30,'crackers','Ate Well'],
  [5,'17:50','18:15','25','Dinner','','',60,'basa, rice','Ate Well'],
  [5,'19:45','','', 'Milk',5,''],
  [5,'20:05','00:30','265','Sleep - Night','',''],
  [5,'22:15','','', 'Milk',1.5,'Dream feed'],
  [6,'00:30','01:15','45','Awake / Restless','','Woke up, wanted milk, crying'],
  [6,'00:40','','', 'Milk',2.5,''],
  [6,'01:15','07:05','350','Sleep - Night','',''],
  // Day 6 — errands outing with a short car nap
  [6,'','','', 'Milestone','','New word: "ball"','', 'speech'],
  [6,'07:15','','', 'Milk',5,''],
  [6,'07:40','08:00','20','Breakfast','','',60,'eggs, clementines','Ate Well'],
  [6,'08:15','','', 'Behaviour','','Happy, playful morning','', 'happy, playful','Positive'],
  [6,'08:40','09:00','20','Car Ride','','To the store'],
  [6,'09:00','09:45','45','Outing / Excursion','','Grocery shopping','', 'shopping'],
  [6,'09:45','10:10','25','Car Ride','','Home'],
  [6,'09:52','10:08','16','Sleep - Car Nap','','Dozed on the way home'],
  [6,'10:30','11:25','55','Sleep - Nap','','Short after the car snooze','','','Fussy'],
  [6,'11:45','12:10','25','Lunch','','',90,'pastina, peas','Ate Well'],
  [6,'12:20','','', 'Milk',3,''],
  [6,'14:50','15:55','65','Sleep - Nap','',''],
  [6,'16:15','16:30','15','Snack','','',30,'cheese','Ate Well'],
  [6,'18:30','19:05','35','Dinner','','Late dinner — slow eater tonight',60,'basa, broccoli','Partial'],
  [6,'19:10','19:30','20','Bath','',''],
  [6,'19:50','','', 'Milk',5.5,'Bedtime bottle'],
  [6,'20:30','06:45','', 'Sleep - Night','','Took a while to settle'],
  // Day 7 — TODAY (in-home visit pre-filled for this afternoon)
  [7,'07:00','','', 'Milk',5,'Morning bottle'],
  [7,'07:35','07:55','20','Breakfast','','',60,'eggs, toast','Ate Well'],
  [7,'09:40','','', 'Diaper - Poop','',''],
  [7,'10:15','11:30','75','Sleep - Nap','','','','','Easy'],
  [7,'11:50','12:15','25','Lunch','','',90,'pastina, peas','Partial'],
  [7,'12:20','','', 'Milk',3,''],
  [7,'13:30','14:30','60','Home Visit','','Social worker home visit','', 'home-visit','', true],
  [7,'14:45','15:55','70','Sleep - Nap','',''],
  [7,'16:15','16:30','15','Snack','','',30,'clementines','Ate Well'],
  [7,'17:45','18:15','30','Dinner','','',60,'chicken, sweet potato',''],
  [7,'19:45','','', 'Milk',5.5,'Bedtime bottle'],
  [7,'20:00','06:45','', 'Sleep - Night','',''],
];
// birth-family texts for the recent week (placement demo; neutralizeRec drops them for the other demos)
[[0,'08:40','09:05','sleep, basic','Positive'], [1,'08:55','09:20','food, water, in-depth','Positive'], [2,'09:10','10:05','photo-request, basic','Neutral','photo-sent'],
 [3,'08:35','08:50','teeth, follow-up','Positive'], [4,'19:05','19:25','visit, update, in-depth','Difficult'], [5,'08:45','09:00','nap, basic','Positive'],
 [6,'08:50','09:30','food, in-depth','Positive'], [7,'08:30','08:45','update, basic','Positive']]
  .forEach(([d, s, e, t, o, r]) => DEMO_ROWS.push([d, s, e, '', 'Family Contact', '', '', '', `text, from-family, mom, ${t}, ${r || 'answered'}`, o]));
DEMO_ROWS.push([3,'20:30','20:45','15','Family Contact','','Short call before bedtime','', 'phone, from-family, mom, update, basic, answered','Positive']);
// a week of end-of-day check-ins (placement demo)
[
  [0, 'Emotional', 'Lots of smiles at bath time; reached up to be held after the nap', 'smiles=often, smile-when=play+songs, seeks=yes, reaches=yes, soothed=yes', 'Positive'],
  [0, 'Sleep', 'Needed rocking for the first nap, second nap went down easily', 'naps=fussy, falls-asleep=rocked+held, wakings=1, comfort=sometimes', 'Mixed'],
  [1, 'Language', 'Babbling “ba-ba” and “da” during play; turned to her name', 'vocal=a-lot, sounds=babbles+syllables, when=play+meals, understands=sometimes, progress=yes', 'Positive'],
  [1, 'Feeding', 'Ate most of lunch; turned her head away when full', 'hunger=reaching-for-food+mouth-open, full=turns-away+pushes-away, amount=usual, self=trying', 'Positive'],
  [1, 'Play', 'Stayed with the stacking cups for several minutes', 'attention=5-plus-min, flits=sometimes, interests=stacking+books, with=with-an-adult', 'Positive'],
  [2, 'Emotional', 'Clingy and quick to cry after the visit; settled once held', 'smiles=sometimes, seeks=yes, reaches=yes, soothed=partly, others=wary', 'Mixed'],
  [2, 'Sleep', 'Short car nap only; woke twice overnight and needed comfort', 'naps=rough, falls-asleep=in-car, wakings=2, comfort=yes', 'Difficult'],
  [2, 'Parents', 'Asked how the visit went and for a photo', 'contact=yes, asked=visit+photo-request, respectful=yes, agreement=no, issue=asked-for-photos', 'Mixed'],
  [3, 'Feeding', 'Less interested in dinner, more milk before bed', 'hunger=fussing, full=plays-with-food, amount=less-than-usual, self=trying', 'Mixed'],
  [3, 'Play', 'Moved quickly between toys; enjoyed peekaboo most', 'attention=1-5-min, flits=often, interests=peekaboo+toys-with-sounds, with=with-an-adult', 'Mixed'],
  [4, 'Language', 'Copied a clap and a raspberry sound', 'vocal=some, sounds=imitates+laughs, when=play, understands=sometimes', 'Positive'],
  [4, 'Emotional', 'Back to her usual self, smiling at faces', 'smiles=often, smile-when=faces+peekaboo, seeks=yes, reaches=yes, soothed=yes', 'Positive'],
  [4, 'Sleep', 'Both naps on time, fell asleep on her own once', 'naps=easy, falls-asleep=on-her-own+patted, wakings=0, comfort=no', 'Positive'],
  [5, 'Play', 'Explored books for a long stretch', 'attention=5-plus-min, flits=rarely, interests=books+mirror, with=alone+with-an-adult', 'Positive'],
  [5, 'Parents', 'Daily check-in text, polite', 'contact=yes, asked=sleep, respectful=yes, agreement=no, issue=too-often', 'Neutral'],
  [6, 'Emotional', 'Laughed a lot during songs; looked for us when a stranger came close', 'smiles=often, smile-when=songs, seeks=yes, reaches=yes, others=wary', 'Positive'],
  [6, 'Feeding', 'Good appetite, fed herself some pieces', 'hunger=at-the-high-chair+reaching-for-food, full=slows-down, amount=more-than-usual, self=yes', 'Positive'],
].forEach(([d, area, note, tags, oc]) => DEMO_ROWS.push([d, '', '', '', 'Check-in - ' + area, '', note, '', tags, oc]));

/**
 * Two more weeks of seeded, realistic history before the hand-written week (offsets −14…−1), with
 * visits every 3–4 days, so the Visits & Patterns view has enough cycles to show something.
 * Visit days / the day after carry more night waking, refusals and difficult reactions — the kind of
 * pattern the analysis is meant to surface. Same row format as DEMO_ROWS.
 */
function demoHistoryRows(){
  let a = 20261108; const R = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnd = (x, y) => x + R() * (y - x), pick = arr => arr[Math.floor(R() * arr.length)], tm = m => fmtTime(Math.round(m / 5) * 5);
  const V = { '-13':'late', '-10':'early', '-6':'late', '-3':'early' };
  const rows = [], add = (o, s, e, c, milk='', notes='', water='', tags='', out='') => rows.push([o, s == null ? '' : tm(s), e == null ? '' : tm(e), '', c, milk, notes, water, tags, out]);
  const wakes = {}; for (let o = -14; o <= 0; o++) wakes[o] = Math.round(rnd(405, 440));
  for (let o = -14; o <= -1; o++) {
    const visit = V[o], after = !!V[o - 1], w = wakes[o], rough = visit || after;
    add(o, w + 5, null, 'Milk', pick([4.5, 5, 5]));
    if (o === -12) add(o, 930, 975, 'Guest', '', 'Grandparents dropped by', '', 'grandparents');
    if (o === -8) add(o, 900, 925, 'Outing / Excursion', '', 'Quick pharmacy run', '', 'errand');
    if (o === -4) add(o, 945, 975, 'Guest', '', 'Neighbour brought a meal', '', 'neighbour');
    { // birth-family texts (placement demo): a morning check-in every day, a call some evenings
      const tpc = [['sleep', 'basic'], ['food', 'basic'], ['photo-request', 'basic'], ['nap', 'in-depth'], ['teeth', 'follow-up'], ['update', 'basic'], ['food, water', 'in-depth']][(o + 14) % 7];
      const r0 = w + 85 + ((o * 37) % 40 + 40) % 40;
      add(o, r0, r0 + 15 + ((o * 13) % 50 + 50) % 50, 'Family Contact', '', '', '', `text, from-family, mom, ${tpc[0]}, ${tpc[1]}, ${tpc[0].includes('photo') ? 'photo-sent' : 'answered'}`, o % 5 === 0 ? 'Difficult' : o % 3 === 0 ? 'Neutral' : 'Positive');
      if (visit) add(o, 1140, 1160, 'Family Contact', '', 'Asked how the visit went', '', 'text, from-family, mom, visit, update, in-depth, answered', 'Positive');
      if (o % 4 === 0) add(o, 1230, 1245, 'Family Contact', '', 'Short call before bedtime', '', 'phone, from-family, mom, update, basic, answered', 'Positive');
    }
    add(o, w + 35, w + 55, 'Breakfast', '', '', 60, pick(['oatmeal, banana','eggs, toast','pancakes, raspberries','yogurt, blueberries','cereal, banana']), rough ? pick(['Ate Well','Partial']) : 'Ate Well');
    if (visit === 'late') {
      add(o, 595, 660, 'Car Ride', '', 'Drive to visit'); add(o, 600, 600 + rnd(35, 50), 'Sleep - Car Nap');
      add(o, 655, null, 'Handover', '', 'Drop-off', '', 'drop-off, agency', pick(['Calm','Calm','Unsettled']));
      add(o, 660, 750, 'Visit', '', 'Supervised visit');
      add(o, 750, null, 'Handover', '', 'Pick-up', '', 'pick-up, agency', pick(['Calm','Unsettled','Unsettled','Distressed']));
      add(o, 755, 820, 'Car Ride', '', 'Drive home'); add(o, 765, 765 + rnd(35, 50), 'Sleep - Car Nap');
      if (R() < .6) add(o, 960, 980, 'Sleep - Nap', '', 'Bridge nap');
    } else if (visit === 'early') {
      add(o, 490, 535, 'Car Ride', '', 'Drive to visit'); add(o, 495, 495 + rnd(25, 35), 'Sleep - Car Nap');
      add(o, 535, null, 'Handover', '', 'Drop-off', '', 'drop-off, agency', pick(['Calm','Calm','Unsettled']));
      add(o, 540, 630, 'Visit', '', 'Supervised visit');
      add(o, 630, null, 'Handover', '', 'Pick-up', '', 'pick-up, agency', pick(['Calm','Unsettled','Distressed']));
      add(o, 635, 690, 'Car Ride', '', 'Drive home'); add(o, 640, 640 + rnd(35, 45), 'Sleep - Car Nap');
      const n2 = rnd(870, 885); add(o, n2, n2 + rnd(60, 75), 'Sleep - Nap', '', 'Capped crib nap');
    } else {
      const n1 = rnd(610, 625) - (after ? 15 : 0); add(o, n1, n1 + rnd(60, 80) + (after ? 25 : 0), 'Sleep - Nap', '', after ? 'Long nap, tired after visit day' : '', '', '', after ? pick(['Fussy','Easy']) : pick(['Easy','Easy','Fussy']));
      const n2 = rnd(880, 900) + (after && R() < .5 ? 25 : 0); add(o, n2, n2 + rnd(55, 75), 'Sleep - Nap');
    }
    add(o, rnd(705, 720), rnd(730, 740), 'Lunch', '', '', Math.round(rnd(6, 9)) * 10, pick(['pastina, peas','mac and cheese','soup','sandwich','rice, chicken']), rough ? pick(['Partial','Refused','Ate Well']) : pick(['Ate Well','Ate Well','Partial']));
    add(o, 745, null, 'Milk', pick([3, 3.5]));
    add(o, 975, 990, 'Snack', '', '', 30, pick(['crackers','banana','cheese','apple']), 'Ate Well');
    add(o, rnd(1060, 1080), 1095, 'Dinner', '', '', 60, pick(['basa, broccoli','chicken, sweet potato','meatballs, carrots','pasta, peas']), rough ? pick(['Partial','Refused','Ate Well']) : pick(['Ate Well','Partial']));
    if (visit && R() < .65) add(o, 840, null, 'Behaviour', '', 'Clingy after the visit', '', pick(['clingy','clingy, crying']), 'Difficult');
    if (after && R() < .55) add(o, rnd(600, 1000), null, 'Behaviour', '', pick(['Tantrum over small things','Upset, needed lots of holding']), '', pick(['tantrum','upset, clingy']), 'Difficult');
    if (!rough && R() < .4) add(o, rnd(560, 1000), null, 'Behaviour', '', 'Happy and playful', '', 'happy, playful', 'Positive');
    if (o % 2 === 0) add(o, 1150, 1170, 'Bath');
    add(o, 1185, null, 'Milk', pick([5, 5.5]), 'Bedtime bottle');
    const bed = 1200 + Math.round(visit ? rnd(-10, 25) : after ? rnd(0, 25) : rnd(-5, 10)), next = wakes[o + 1] + DAY;
    if (R() < (visit ? .65 : after ? .45 : .12)) {
      const wakeAt = rnd(60, 180), dur = visit ? rnd(30, 60) : rnd(15, 40);
      rows.push([o, tm(bed), tm(wakeAt), '', 'Sleep - Night', '', '', '', '', '']);
      add(o + 1, wakeAt, wakeAt + dur, 'Awake / Restless', '', pick(['Woke crying','Babbling, wouldn\'t settle','Upset, needed rocking']));
      add(o + 1, wakeAt + dur, next - DAY, 'Sleep - Night');
    } else rows.push([o, tm(bed), tm(next - DAY), '', 'Sleep - Night', '', '', '', '', bed > 1215 ? 'Fussy' : 'Easy']);
  }
  return rows;
}

