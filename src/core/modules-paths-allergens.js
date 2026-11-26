const TEETH = [
  ['upper','second-molar','right','25–33 mo'], ['upper','first-molar','right','13–19 mo'], ['upper','canine','right','16–22 mo'], ['upper','lateral','right','9–13 mo'], ['upper','central','right','8–12 mo'],
  ['upper','central','left','8–12 mo'], ['upper','lateral','left','9–13 mo'], ['upper','canine','left','16–22 mo'], ['upper','first-molar','left','13–19 mo'], ['upper','second-molar','left','25–33 mo'],
  ['lower','second-molar','right','23–31 mo'], ['lower','first-molar','right','14–18 mo'], ['lower','canine','right','17–23 mo'], ['lower','lateral','right','10–16 mo'], ['lower','central','right','6–10 mo'],
  ['lower','central','left','6–10 mo'], ['lower','lateral','left','10–16 mo'], ['lower','canine','left','17–23 mo'], ['lower','first-molar','left','14–18 mo'], ['lower','second-molar','left','23–31 mo'],
].map(([arch, type, side, ages], i) => ({ id:`${arch}-${type}-${side}`, arch, type, side, ages, i,
  label:`${arch === 'upper' ? 'Upper' : 'Lower'} ${type.replace('-', ' ').replace('lateral','lateral incisor').replace('central','central incisor')} (${side})` }));

/* ── v4: feature modules, family paths, age bands ── */
const MODULES = [
  ['schedule',     'Schedule & routine score', 'Nap windows from templates, wake windows, nap cutoff, the daily routine score'],
  ['visits',       'Visits & handovers',       'Off-site visits, drop-off / pick-up, before-and-after-visit analysis'],
  ['workerReports','Caseworker reporting',     'Fortnight periods, “all visits to date” summary, real-time logging record'],
  ['newborn',      'Newborn feeding',          'Breastfeeding sides & timer, bottles, pumping, time since last feed'],
  ['diapers',      'Diapers & meds',           'Wet / dirty diaper counts, medication log'],
  ['growth',       'Growth',                   'Weight, length, head size with growth curves'],
  ['teeth',        'Teeth',                    'Tooth chart and teething patterns'],
  ['health',       'Health & appointments',    'Incidents, appointments, temperature, vaccines'],
  ['milestones',   'Milestones',               'Developmental milestones feed for family updates'],
  ['food',         'Food & allergens',         'Meals, acceptance, new foods and allergen groups'],
  ['hydration',    'Hydration',                'Water intake and total fluids'],
  ['checkins',     'Daily check-in',           'An end-of-day form on language, emotional development, feeding, play, sleep and family contact, summarised in reports'],
  ['familyContact','Family contact',           'Texts, calls and emails with the birth family: who, how, what about, and how you replied'],
  ['cocooning',    'Cocooning',                'Outings and guests per week during a quiet settling-in period, and how the child did on those days'],
  ['reminders',    'Reminders',                'Browser and phone reminders before naps, meals and feeds'],
  ['quicklog',     'Quick Log',                'One-tap logging that writes to the Sheet'],
];
const ALL_ON = Object.fromEntries(MODULES.map(([k]) => [k, true]));
/** How the setup wizard groups the features. */
const MOD_GROUPS = [
  ['Sleep & routine', 'Sommeil et routine', ['schedule', 'reminders', 'quicklog']],
  ['Feeding & health', 'Alimentation et santé', ['newborn', 'food', 'hydration', 'diapers', 'growth', 'teeth', 'health', 'milestones']],
  ['Placement & caseworker', 'Placement et intervenant', ['visits', 'workerReports', 'checkins', 'familyContact', 'cocooning']],
];
const PATHS = {
  birth:     { label:'Birth / newborn', icon:'👶', blurb:'Feeding, diapers, growth and sleep for a new baby. No fixed schedule needed.', demo:'newborn',
               modules:{ ...ALL_ON, schedule:false, visits:false, workerReports:false, food:false, hydration:false, cocooning:false, familyContact:false, checkins:false } },
  placement: { label:'Adoption / placement / foster', icon:'🏡', blurb:'Everything, plus visits and handovers, contact with the birth family, a daily check-in and reports for caseworkers.', demo:'placement', modules:{ ...ALL_ON, newborn:false } },
  routine:   { label:'Routine tracking (6 months +)', icon:'🗓️', blurb:'Schedules, naps, meals and outings for an older baby or toddler.', demo:'routine',
               modules:{ ...ALL_ON, visits:false, workerReports:false, newborn:false, cocooning:false, familyContact:false, checkins:false } },
};
/**
 * Suggested targets by age (typical ranges — always editable; check with your pediatrician).
 * ww = [wake→nap 1, between naps, last nap→bed] in minutes. Newborns get no fixed schedule.
 */
const AGE_BANDS = [
  { id:'nb', label:'Newborn (0–6 weeks)', maxDays:42, schedule:false },
  { id:'b1', label:'6 weeks – 4 months', maxDays:122, ww:[75, 90, 105],  lens:[50, 50, 50, 40, 30], optLast:true, maxDay:270 },
  { id:'b2', label:'4 – 6 months',       maxDays:183, ww:[105, 120, 135], lens:[60, 75, 45], maxDay:210 },
  { id:'b3', label:'6 – 12 months',      maxDays:365, ww:[150, 180, 210], lens:[75, 75], maxDay:165 },
  { id:'b4', label:'12 – 18 months',     maxDays:548, ww:[180, 210, 240], lens:[70, 70], maxDay:150 },
  { id:'b4b', label:'18 – 24 months',    maxDays:730, ww:[330, 330, 300], lens:[120], maxDay:150 },
  { id:'b5', label:'2 – 3 years',        maxDays:1095, ww:[345, 345, 330], lens:[105], maxDay:135 },
  { id:'b6', label:'3 years +',          maxDays:1e9, ww:[360, 360, 360], lens:[75], maxDay:90 },
];

/** Built-in food dictionary for keyword extraction from meal Notes (extend in Settings → Foods). */
const FOOD_WORDS = ('apple applesauce avocado bagel banana beans beef berries blueberries bread broccoli butter cantaloupe carrots cauliflower cereal cheerios cheese chicken chickpeas clementines clementine congee corn couscous crackers cucumber dumplings edamame eggs egg fish grapes hummus kiwi lentils mango meatballs melon muffin oatmeal oats omelette orange pancakes pasta pastina peaches pears peas pizza plum pork porridge potato quinoa raisins raspberries rice salmon sandwich soup spaghetti spinach squash strawberries tofu toast tomato tortilla tuna turkey waffles watermelon yogurt zucchini basa cod tilapia shrimp noodles ramen puffs smoothie lamb sausage ham burger tacos quesadilla chili').split(' ');
const FOOD_MULTI = ['french toast','green beans','mac and cheese','peanut butter','sweet potato','rice cake','hot dog','beef stew'];
/** Tags that describe the meal rather than a food. */
const NON_FOOD_TAGS = new Set(['new','new-food','newfood','first','accepted','refused','partial','ate-well','atewell','messy','finger-food','self-fed','spoon-fed','grandparents','shopping','walking','mild','home','daycare','restaurant','picky','hungry','tired']);
/** Common allergen groups for the New Foods log. */
const ALLERGENS = [
  ['Egg', /\begg/], ['Dairy', /cheese|yogurt|milk|butter|cream|mac and cheese/], ['Peanut', /peanut/], ['Tree nut', /almond|cashew|walnut|pecan|hazelnut|pistachio|tree ?nut/],
  ['Wheat', /bread|toast|pasta|pastina|crackers|bagel|muffin|pancake|waffle|cereal|couscous|noodle|spaghetti|tortilla|pizza|cheerios|dumpling/], ['Soy', /\bsoy|tofu|edamame/],
  ['Fish', /fish|salmon|tuna|cod|basa|tilapia/], ['Shellfish', /shrimp|crab|lobster|prawn/], ['Sesame', /sesame|tahini|hummus/],
];

/* ════════════════════════════════════════════════════════════════════════════
   APPS SCRIPT — read (doGet) + Quick Log append (doPost). Shown in Settings → Setup guide.
   ════════════════════════════════════════════════════════════════════════════ */
