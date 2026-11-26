/* ── Language: English / French ── */
const FRL = () => { try { return S.lang === 'fr'; } catch { return false; } };
const L = (en, fr) => FRL() ? fr : en;
const LOC = () => FRL() ? 'fr-CA' : undefined;
const titleL = () => !S.title || S.title === 'Baby Routine Dashboard' ? L('Baby Routine Dashboard', 'Tableau de bord de la routine de bébé') : S.title;
const stampL = d => d.toLocaleString(LOC(), { dateStyle:'long', timeStyle:'short' });
const sideL = x => !FRL() ? (x || '') : ({ left:'gauche', right:'droit', both:'les deux' }[x] || x || '');
const catL = c => FRL() && CAT_FR[c] ? CAT_FR[c] : c;
const OC_FR = { Neutral:'Neutre', 'Ate Well':'A bien mangé', Partial:'Partiel', Refused:'Refusé', Easy:'Facile', Fussy:'Agité', Rough:'Difficile', Monitor:'À surveiller', Resolved:'Réglé', 'Follow-up Needed':'Suivi requis', Calm:'Calme', Unsettled:'Perturbé', Distressed:'En détresse', Positive:'Positif', Mixed:'Mitigé', Difficult:'Difficile' };
const ocL = o => FRL() && OC_FR[o] ? OC_FR[o] : o;
const plural = (n, en1, enN, fr1, frN) => n + ' ' + (FRL() ? (n > 1 ? frN : fr1) : (n === 1 ? en1 : enN));
/** Pattern rules for French text that carries numbers (applied when no exact dictionary match). */
const FR_AGE = s => s.replace(/(\d+) days? old/, (_, n) => n + (n == 1 || n == 0 ? ' jour' : ' jours')).replace(/(\d+) weeks? old/, (_, n) => n + (n == 1 ? ' semaine' : ' semaines')).replace(/(\d+) months? old/, (_, n) => n + ' mois').replace(/(\d+) years? old/, (_, n) => n + (n == 1 ? ' an' : ' ans'));
const FR_RX = [
  [/^\((\d+) – (\d+) months\)\. Typical targets for this age, as a starting point to adjust with your pediatrician:$/, '($1 – $2 mois). Cibles typiques pour cet âge, comme point de départ à ajuster avec votre pédiatre :'],
  [/^\+(\S+ (?:ml|oz)) Milk$/, '+$1 lait'],
  [/^\. (\d+) distinct foods? detected so far\.$/, '. $1 aliments différents détectés jusqu’ici.'],
  [/^(\d+ (?:day|week|month|year)s? old)$/, m => FR_AGE(m)],
  [/^(\d+ (?:day|week|month|year)s? old) · (\d+) – (\d+) months$/, (m, a, b, c) => FR_AGE(a) + ` · ${b} – ${c} mois`],
  [/^(\d+) notes?$/, (m, n) => n + (n > 1 ? ' notes' : ' note')],
  [/^(\d+) of 20 baby teeth · tap a tooth to log it$/, '$1 dents de lait sur 20 · touchez une dent pour la noter'],
  [/^(\d+) on this device$/, '$1 sur cet appareil'],
  [/^(\d+) saved reports? on this device\.$/, (m, n) => `${n} rapport${n > 1 ? 's enregistrés' : ' enregistré'} sur cet appareil.`],
  [/^(\d+) wet · (\d+) dirty$/, '$1 mouillée(s) · $2 souillée(s)'],
  [/^(\d+)% accepted$/, '$1 % accepté'],
  [/^(\d+) of (\d+) events match the current filters$/, '$1 événements sur $2 correspondent aux filtres'],
  [/^(\d+) complete days?$/, '$1 jours complets'],
  [/^(\d+) mornings? logged$/, '$1 matins notés'],
  [/^(\S+) – now$/, '$1 – maintenant'],
  [/^(\d+) full days in range · a “feed” groups both sides and any top-up bottle within 10 minutes$/, '$1 journées complètes · un « boire » regroupe les deux côtés et tout biberon d’appoint dans les 10 minutes'],
  [/^(\d+) days shown$/, '$1 jours affichés'],
  [/^(\d+) foods in range ·$/, '$1 aliments dans la période ·'],
  [/^(.+) awake overnight$/, '$1 d’éveil la nuit'],
  [/^Ate Well: (\d+) · Partial: (\d+) · Refused: (\d+) · Unrated: (\d+)$/, 'Bien mangé : $1 · Partiel : $2 · Refusé : $3 · Non évalué : $4'],
  [/^Birth weight (.+?) · lowest (.+?) on day (\d+) \((.+?)\)(?: · back to birth weight by day (\d+))?(.*)$/, (m, a, b, c, d, e, rest) => `Poids de naissance ${a} · minimum ${b} au jour ${c} (${d.replace('.', ',')})${e ? ` · poids de naissance repris au jour ${e}` : ''}${rest.replace(' · not back to birth weight yet', ' · poids de naissance pas encore repris')}`],
  [/^Birth weight (.+)\.$/, 'Poids de naissance $1.'],
  [/^Built-in demo data · (\d+) events · (\d+) days$/, 'Données de démonstration · $1 événements · $2 jours'],
  [/^Diaper notes in range: (.+)$/, 'Notes de couches dans la période : $1'],
  [/^Everything is stored only in this browser \(localStorage\)\. Clearing site data removes it\. Dashboard v(\S+)\.$/, 'Tout est gardé seulement dans ce navigateur (localStorage). Effacer les données du site les supprime. Tableau de bord v$1.'],
  [/^Feeds (\S+) \(not during a wake-up\) vs\. a wake-up starting (\S+) the same night$/, 'Boires $1 (hors réveil) et réveil commençant $2 la même nuit'],
  [/^Follow-up needed \((\d+)\)$/, 'Suivi requis ($1)'],
  [/^(Upper|Lower) (.+?) \((left|right)\) · usually (\S+) mo · tap to log$/, (m, ul, t, lr, r) => `${FR_TOOTH(ul, t, lr)} · habituellement ${r} mois · toucher pour noter`],
  [/^(Upper|Lower) (.+?) \((left|right)\)$/, (m, ul, t, lr) => FR_TOOTH(ul, t, lr)],
  [/^Next bath in (\d+) nights? · (\d+) since last$/, (m, a, b) => `Prochain bain dans ${a} nuit${a > 1 ? 's' : ''} · ${b} depuis le dernier`],
  [/^Night metrics refer to the night after this day \(day boundary (\S+)\)\. \*24h sleep is partial — missing the adjoining night\.$/, 'Les mesures de nuit portent sur la nuit qui suit cette journée (changement de journée à $1). *Le sommeil sur 24 h est partiel — il manque la nuit adjacente.'],
  [/^Now (\S+)$/, 'Maintenant $1'],
  [/^Ounces per day by feeding occasion \(relative to that day's naps\) · line = 7-day rolling average · band = (.+) target$/, 'Lait par jour selon le moment (par rapport aux siestes du jour) · ligne = moyenne mobile sur 7 jours · bande = cible de $1'],
  [/^(?:Millilitres|ml) per day by feeding occasion.*band = (.+) target$/, 'Lait par jour selon le moment (par rapport aux siestes du jour) · ligne = moyenne mobile sur 7 jours · bande = cible de $1'],
  [/^Routine score (\d+)$/, 'Score de routine $1'],
  [/^Start time of each meal across days · dinners after (\S+) in red$/, 'Heure de début de chaque repas · soupers après $1 en rouge'],
  [/^Target: every (\d+)–(\d+) nights$/, 'Cible : toutes les $1 à $2 nuits'],
  [/^With a (\S+) boundary, a (\S+) or (\S+) wake-up is attributed to the night that started the previous evening, so each row reads “day → the night after it”\. The timeline grid always splits midnight-crossing events at 24:00 regardless\.$/, 'Avec un changement de journée à $1, un réveil à $2 ou $3 est rattaché à la nuit commencée la veille au soir : chaque ligne se lit « journée → la nuit qui suit ». La grille coupe toujours les événements qui passent minuit à 24:00.'],
  [/^a late feed had a (\S+) wake-up \((\d+)\/(\d+)\)$/, 'un boire tardif a été suivi d’un réveil $1 ($2/$3)'],
  [/^one did \((\d+)\/(\d+)\)$/, 'c’est arrivé ($1/$2)'],
  [/^bottles per day · avg (.+)$/, 'biberons par jour · moy. $1'],
  [/^breastfeeding per day · L (\d+)% \/ R (\d+)%$/, 'allaitement par jour · G $1 % / D $2 %'],
  [/^days, usually starting around (\S+) — common in the early weeks\. Each dot on the right is one feed by time of day\.$/, 'jours, commençant souvent vers $1 — fréquent les premières semaines. Chaque point à droite est un boire selon l’heure.'],
  [/^default (.+)$/, 'par défaut $1'],
  [/^due in (\d+) days?$/, (m, n) => `prévu dans ${n} jour${n > 1 ? 's' : ''}`],
  [/^global: (\d+)$/, 'global : $1'],
  [/^instant · (.+)$/, 'ponctuel · $1'],
  [/^mode, an off-site Visit starting by (\S+) uses$/, ', une visite à l’extérieur commençant avant $1 utilise'],
  [/^of (\d+) nights ≥ (\S+) awake \((\S+)\)$/, 'des $1 nuits avec ≥ $2 d’éveil ($3)'],
  [/^target (.+) ·$/, 'cible $1 ·'],
  [/^vs (\S+) otherwise \((\d+) late dinners?\)\.$/, (m, a, n) => `contre ${a} sinon (${n} souper${n > 1 ? 's' : ''} tardif${n > 1 ? 's' : ''}).`],
  [/^· (\d+) of (\d+) nap windows? hit$/, '· $1 plages de sieste sur $2 respectées'],
  [/^· (.+) \(target (.+)\)$/, '· $1 (cible $2)'],
  [/^· (\d+) nights? since last$/, '· $1 nuits depuis le dernier'],
  [/^· (\S+) vs (\S+) target$/, '· $1 contre $2 visé'],
  [/^· (\d+)% acceptance$/, '· $1 % d’acceptation'],
  [/^— full at ≤ (\d+) min awake, (\d+)% at the split-night threshold \((\d+) min\), 0 at (\d+) min beyond it\.$/, '— tous les points à ≤ $1 min d’éveil, $2 % au seuil de nuit fragmentée ($3 min), 0 à $4 min au-delà.'],
  [/^— full inside the target range, 0 at (.+) outside it\.$/, '— tous les points dans la cible, 0 à $1 en dehors.'],
  [/^— full within (\d+) min of the template bedtime, 0 at (\d+) min off\.$/, '— tous les points à moins de $1 min du coucher du modèle, 0 à $2 min d’écart.'],
  [/^— share of the template's \(non-optional\) nap windows with a nap that overlaps the window and starts within (\d+) min of it\.$/, '— part des plages de sieste du modèle (non facultatives) avec une sieste qui chevauche la plage et commence à moins de $1 min.'],
  [/^Correlation r = (\S+) \((weak|moderate|strong)(?:, (positive|negative))?\)\. (.*?) ?Based on (\d+) days — small samples are noisy\.$/, (m, r, st, sg, mid, n) => `Corrélation r = ${r.replace('.', ',')} (${{ weak:'faible', moderate:'modérée', strong:'forte' }[st]}${sg ? ', ' + (sg === 'positive' ? 'positive' : 'négative') : ''}). ${trText(mid) ?? mid} Basé sur ${n} jours — les petits échantillons sont peu fiables.`],
  [/^Around (.+)$/, 'Autour de $1'],
  [/^(.+) \((\d+) of (\d+)\)$/, '$1 ($2 sur $3)'],
  [/^(\d+) of (\d+)$/, '$1 sur $2'],
  [/^(.+) · last (.+)$/, '$1 · dernière entrée : $2'],
  [/^(?:(\d+) )?days since last poop \((.+)\)$/, (m, n, d) => `${n ? n + ' ' : ''}jours depuis les dernières selles (${d})`],
  [/^· (.+?) of (.+) max$/, '· $1 sur $2 max'],
  [/^· (\d+) days · (.+)$/, '· $1 jours · $2'],
  [/^Go to$/, 'Aller à'],
  [/^Today · (.+)$/, 'Aujourd’hui · $1'],
  [/^(\d+) days · (.+)$/, '$1 jours · $2'],
  [/^(\d+) days?$/, (m, n) => n + (n > 1 ? ' jours' : ' jour')],
  [/^Auto: (.+)$/, 'Auto : $1'],
  [/^Every (\d+) min$/, 'Toutes les $1 min'],
  [/^Right now · (.+)$/, 'En ce moment · $1'],
  [/^Edit “(.+)”$/, 'Modifier « $1 »'],
  [/^No clear relationship in this range\.$/, 'Pas de relation claire dans cette période.'],
  [/^([^·]+) · (\d\d:\d\d): (.*)$/, (m, c, t, rest) => CAT_FR[c.trim()] ? `${CAT_FR[c.trim()]} · ${t} : ${rest}` : m],
  [/^Planned: (.+)$/, (m, r) => 'Prévu : ' + r],
  [/^(\d+) (?:feeds?) in the last 24 h · (\d+) today$/, '$1 boires dans les dernières 24 h · $2 aujourd’hui'],
  [/^(\S+) (.+)$/, (m, e, rest) => /^\p{Extended_Pictographic}/u.test(e) && (CAT_FR[rest] || FRD()[rest]) ? `${e} ${CAT_FR[rest] || FRD()[rest]}` : m],
];
const FR_TOOTH = (ul, t, lr) => { const nm = { 'central incisor':'Incisive centrale', 'lateral incisor':'Incisive latérale', 'canine':'Canine', 'first molar':'Première molaire', 'second molar':'Deuxième molaire' }[t] || t;
  return `${nm} ${ul === 'Upper' ? 'supérieure' : 'inférieure'} (${lr === 'left' ? 'gauche' : 'droite'})`; };
let FRD_ = null;
const FRD = () => FRD_ || (FRD_ = { ...FR_DYN, ...FR_STATIC, ...CAT_FR, ...OC_FR });
/** French for one English UI string, or null when unknown. */
function trText(t){
  const d = FRD()[t]; if (d != null) return d;
  for (const [re, rep] of FR_RX) { if (re.test(t)) { const out = t.replace(re, rep); if (out !== t) return out; } }
  return null;
}
const I18N_ORIG = new WeakMap(), I18N_ATTRS = ['title', 'placeholder', 'aria-label'];
/** Swap page text between English and French: fixed page text, and text rendered by the app (dictionary + patterns). */
function translateStatic(root = document.body){
  const fr = FRL(); if (!root) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement?.closest('script,style,textarea,pre,.mono,[data-noi18n]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n; (n = tw.nextNode());) {
    const raw = n.nodeValue, cur = raw.trim().replace(/\s+/g, ' '); if (!cur || !/[A-Za-z]/.test(cur)) continue;
    let o = I18N_ORIG.get(n);
    if (o != null && cur !== o.en && cur !== o.fr) o = null;                      // the app re-rendered this node
    if (o == null) { if (!fr) continue; const f = trText(cur); if (f == null || f === cur) continue; o = { en: cur, fr: f }; I18N_ORIG.set(n, o); }
    const want = fr ? o.fr : o.en; if (cur !== want) n.nodeValue = raw.replace(raw.trim(), want);
  }
  [root, ...root.querySelectorAll('[title],[placeholder],[aria-label]')].forEach(el => el.getAttribute && I18N_ATTRS.forEach(a => {
    const v = el.getAttribute(a); if (!v) return; const k = 'i18n' + a.replace(/-./, x => x[1].toUpperCase()).replace(/^./, x => x.toUpperCase());
    let o = el.dataset[k] ? JSON.parse(el.dataset[k]) : null;
    if (o && v !== o.en && v !== o.fr) o = null;
    if (!o) { if (!fr) return; const f = trText(v.replace(/\s+/g, ' ').trim()); if (f == null) return; o = { en: v, fr: f }; el.dataset[k] = JSON.stringify(o); }
    el.setAttribute(a, fr ? o.fr : o.en);
  }));
  document.documentElement.lang = fr ? 'fr' : 'en';
}
/** Translate whatever the app adds to the page, before it is painted (French only). */
let I18N_MO = null, I18N_Q = new Set(), I18N_P = false;
function i18nWatch(){
  if (I18N_MO) return;
  I18N_MO = new MutationObserver(ms => {
    if (!FRL()) return;
    for (const m of ms) m.addedNodes.forEach(n => I18N_Q.add(n.nodeType === 1 ? n : n.parentElement));
    if (I18N_P) return; I18N_P = true;
    queueMicrotask(() => { I18N_P = false; const q = [...I18N_Q]; I18N_Q.clear(); q.forEach(el => el?.isConnected && translateStatic(el)); });
  });
  I18N_MO.observe(document.body, { childList:true, subtree:true });
}
/** French labels inside a Chart.js config (datasets, axis titles, category labels). */
function i18nChart(cfg){
  if (!FRL()) return cfg;
  const tr = x => typeof x === 'string' ? (trText(x) ?? x) : x;
  cfg.data?.datasets?.forEach(d => d.label = tr(d.label));
  if (Array.isArray(cfg.data?.labels)) cfg.data.labels = cfg.data.labels.map(tr);
  Object.values(cfg.options?.scales || {}).forEach(s => { if (s.title?.text) s.title.text = tr(s.title.text); });
  return cfg;
}
/** Translate after the app renders something (no-op in English). */
const i18n = root => { if (FRL()) translateStatic(typeof root === 'string' ? document.querySelector(root) : root || document.body); };
/** Milk is stored in oz internally; shown in ml when the profile uses metric units. */
const metric = () => S?.profile?.units === 'metric';
const MU = () => metric() ? 'ml' : 'oz';
const toDisp = oz => oz == null ? null : metric() ? Math.round(oz * OZ_ML) : Math.round(oz * 10) / 10;
const fromDisp = v => metric() ? v / OZ_ML : v;
const fmtOz = v => v == null || !isFinite(v) ? '—' : metric() ? Math.round(v * OZ_ML / 5) * 5 + ' ml' : (Math.round(v*10)/10) + ' oz';
const fmtMl = v => v == null || !isFinite(v) ? '—' : Math.round(v) + ' ml';
const OZ_ML = 29.5735;

/** Parse "7:05", "07:05", "07:05:00", "7:05 PM", "24:00" → minutes since midnight, or null. */
function parseTime(str){
  if (str == null) return null;
  const s = String(str).trim(); if (!s) return null;
  const m = s.match(/^(\d{1,2})[:.h](\d{2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?$/i);
  if (!m) return null;
  let h = +m[1]; const mi = +m[2];
  if (m[4]) { const pm = m[4].toLowerCase() === 'p'; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
  if (mi > 59 || h > 24 || (h === 24 && mi > 0)) return null;
  return h*60 + mi;
}
/** Parse a date + time stamp ("11/23/2026 14:05:12", "2026-11-23 2:05 PM", ISO) → absolute minutes, or null. */
function parseDateTime(str){
  const s = String(str ?? '').trim(); if (!s) return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/); if (iso) { const dt = new Date(s); if (!isNaN(dt)) return Math.round(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())/864e5)*DAY + dt.getHours()*60 + dt.getMinutes(); }
  const m = s.match(/^(\S+?)[,\s]+(\d{1,2}[:.]\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)$/i); if (!m) return null;
  const d = parseDate(m[1]), t = parseTime(m[2]); return d == null || t == null ? null : d*DAY + t;
}
