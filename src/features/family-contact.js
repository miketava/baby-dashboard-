/* ════════════════════════════════════════════════════════════════════════════
   FAMILY CONTACT (adoption / placement path) — contact with the child's birth family.
   One row per contact, Category “Family Contact”. Everything else rides in existing columns:
     Start Time = when it came in (or the call began) · End Time = when you replied (text/email) or the call ended
     Tags = channel, direction, who, topics, depth, your response   ·   Outcome / Rating = tone
   ════════════════════════════════════════════════════════════════════════════ */
const CONTACT = {
  channel:  { single:true,  items:['text', 'phone', 'email', 'video', 'in-person'],
              alias:{ sms:'text', message:'text', msg:'text', call:'phone', 'phone-call':'phone', facetime:'video', 'video-call':'video', 'in person':'in-person', 'face-to-face':'in-person' } },
  dir:      { single:true,  items:['from-family', 'to-family'], alias:{ incoming:'from-family', inbound:'from-family', outgoing:'to-family', outbound:'to-family' } },
  who:      { single:false, items:['mom', 'dad', 'grandparent', 'relative'], alias:{ 'bio-mom':'mom', 'birth-mom':'mom', mother:'mom', mum:'mom', 'bio-dad':'dad', father:'dad', grandma:'grandparent', grandpa:'grandparent', aunt:'relative', uncle:'relative', sibling:'relative' } },
  topics:   { single:false, items:['food', 'milk', 'water', 'sleep', 'nap', 'teeth', 'health', 'meds', 'diaper', 'milestone', 'photo-request', 'video-request', 'update', 'schedule', 'visit', 'clothing', 'gift', 'other'],
              alias:{ photo:'photo-request', photos:'photo-request', pictures:'photo-request', 'picture-request':'photo-request', video:'video-request', naps:'nap', eating:'food', meals:'food', bottle:'milk', teething:'teeth', sick:'health', medication:'meds', 'how-is-he':'update', 'how-is-she':'update', 'check-in':'update', checkin:'update', clothes:'clothing', present:'gift' } },
  depth:    { single:true,  items:['basic', 'in-depth', 'follow-up'], alias:{ quick:'basic', simple:'basic', detailed:'in-depth', indepth:'in-depth', followup:'follow-up' } },
  response: { single:false, items:['answered', 'photo-sent', 'video-sent', 'no-reply-needed', 'referred-to-worker', 'declined'],
              alias:{ replied:'answered', 'sent-photo':'photo-sent', 'sent-photos':'photo-sent', 'photos-sent':'photo-sent', 'sent-video':'video-sent', 'referred':'referred-to-worker', 'asked-worker':'referred-to-worker' } },
};
const CONTACT_FR = { text:'texto', phone:'téléphone', email:'courriel', video:'vidéo', 'in-person':'en personne', 'from-family':'de la famille', 'to-family':'vers la famille',
  mom:'mère', dad:'père', grandparent:'grand-parent', relative:'autre parent', food:'repas', milk:'lait', water:'eau', sleep:'sommeil', nap:'sieste', teeth:'dents', health:'santé', meds:'médicaments',
  diaper:'couches', milestone:'étapes', 'photo-request':'demande de photo', 'video-request':'demande de vidéo', update:'nouvelles', schedule:'horaire', visit:'visite', clothing:'vêtements', gift:'cadeau', other:'autre',
  basic:'simple', 'in-depth':'approfondi', 'follow-up':'suivi', answered:'répondu', 'photo-sent':'photo envoyée', 'video-sent':'vidéo envoyée', 'no-reply-needed':'pas de réponse requise', 'referred-to-worker':'renvoyé à l’intervenant', declined:'refusé' };
const CONTACT_GROUP_L = { channel:['How', 'Moyen'], dir:['Direction', 'Direction'], who:['Who', 'Qui'], topics:['About', 'Sujet'], depth:['Kind of question', 'Type de question'], response:['Your response', 'Votre réponse'] };
const ctL = t => FRL() ? (CONTACT_FR[t] || t) : t;
const RESP_CH = ['text', 'email'];
const ctMedian = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };                    // End Time = when you replied
/** Normalise a tag into one of the contact vocabularies → [group, tag] or null. */
function contactTag(t){
  const k = String(t).trim().toLowerCase().replace(/\s+/g, '-');
  for (const [g, d] of Object.entries(CONTACT)) { if (d.items.includes(k)) return [g, k]; const a = d.alias[k] || d.alias[k.replace(/-/g, ' ')]; if (a) return [g, a]; }
  return null;
}
/** Structured view of a Family Contact row. */
function contactInfo(e){
  const c = { channel:'', dir:'from-family', who:[], topics:[], depth:'', response:[], other:[] };
  const xm = e.raw?.mood, xq = e.raw?.qtype;   // optional “Mood” / “Question Type” columns
  e.tags.forEach(t => { const h = contactTag(t); if (!h) return c.other.push(t); const [g, v] = h; if (CONTACT[g].single) c[g] = v; else if (!c[g].includes(v)) c[g].push(v); });
  if (!c.channel) { const n = (e.notes || '').toLowerCase(); c.channel = /\bcall(ed)?\b|phone/.test(n) ? 'phone' : /e-?mail/.test(n) ? 'email' : /video|facetime/.test(n) ? 'video' : 'text'; c.guessed = true; }
  if (e.t != null && e.st != null) { const m = e.dur ?? null; if (RESP_CH.includes(c.channel)) c.reply = m; else c.length = m; }
  c.tone = e.outcome || (xm ? (OUTCOMES.contact.find(o => o.toLowerCase() === String(xm).trim().toLowerCase()) || ({ good:'Positive', ok:'Neutral', okay:'Neutral', bad:'Difficult', tense:'Difficult', negative:'Difficult', friendly:'Positive' }[String(xm).trim().toLowerCase()] || '')) : '');
  if (!c.depth && xq) { const h = contactTag(xq); if (h && h[0] === 'depth') c.depth = h[1]; }
  return c;
}
const contactEvents = (days) => { const set = new Set(days.map(d => d.D)); return DATA.events.filter(e => e.k === 'contact' && set.has(e.d)).map(e => ({ e, c: contactInfo(e) })); };
/** Quick Log chip groups for a contact row (tags stay plain text in the Tags field). */
function contactChipsHTML(tagsStr){
  const cur = new Set(parseTags(tagsStr).map(t => (contactTag(t) || [, t])[1]));
  return `<div class="full ctchips">${Object.entries(CONTACT).map(([g, d]) => `<div class="ctg"><span class="faint">${L(...CONTACT_GROUP_L[g])}${d.single ? '' : L(' (any)', ' (plusieurs)')}</span><div class="chips">${d.items.map(t => `<span class="chip ${cur.has(t) ? '' : 'off'}" data-tag="${t}" ${d.single ? `data-single="${g}"` : ''} style="text-decoration:none">${esc(ctL(t))}</span>`).join('')}</div></div>`).join('')}</div>`;
}
/** Tag chip click inside Quick Log: single-choice groups replace the previous choice. */
function toggleTagChip(tg){
  const inp = $('#qlForm [name=Tags]'), t = tg.dataset.tag, g = tg.dataset.single;
  let cur = inp.value.split(',').map(x => x.trim()).filter(Boolean); const on = cur.includes(t);
  if (g) { const grp = CONTACT[g]?.items || PLAY_SINGLE[g]?.() || []; cur = cur.filter(x => !grp.includes(x)); $$(`#qlForm [data-single="${g}"]`).forEach(c => c.classList.add('off')); if (!on) { cur.push(t); tg.classList.remove('off'); } }
  else if (on) { cur = cur.filter(x => x !== t); tg.classList.add('off'); } else { cur.push(t); tg.classList.remove('off'); }
  inp.value = cur.join(', ');
}

/* ── The Family Contact tab ── */
function renderContact(){
  if (!mod('familyContact')) return;
  const days = visibleDays(), list = contactEvents(days), R = S.contactRules || {};
  $('#ctRule').innerHTML = `${L('Communication agreement', 'Entente de communication')}: <input type="number" min="0" step="1" id="ctPer" value="${+R.perWeek || 0}" style="width:58px;padding:2px 6px"> ${L('contacts a week (0 = no limit)', 'contacts par semaine (0 = sans limite)')} · <label class="switch" style="display:inline-flex"><input type="checkbox" id="ctPhotos" ${R.photos === false ? '' : 'checked'}> ${L('photos allowed', 'photos permises')}</label>`;
  $('#ctSub').textContent = L(`${list.length} contact${list.length === 1 ? '' : 's'} over ${days.length} day${days.length === 1 ? '' : 's'} · “Family Contact” rows · tap and hold an entry to edit it`, `${plural(list.length, 'contact', 'contacts', 'contact', 'contacts')} sur ${plural(days.length, '', '', 'jour', 'jours')} · lignes « Family Contact » · appui long sur une entrée pour la modifier`);
  if (!list.length) {
    $('#ctKpis').innerHTML = ''; ['chCtDay', 'chCtHour', 'chCtTopic', 'chCtKind'].forEach(id => chartEmpty(id, ''));
    $('#ctFind').innerHTML = `<div class="empty"><b>${L('No family contact logged in this range', 'Aucun contact avec la famille dans cette période')}</b>${L('Use Quick Log → 💬 Family contact, or have Gemini add “Family Contact” rows (see the schema doc).', 'Utilisez Consigner → 💬 Contact famille, ou demandez à Gemini d’ajouter des lignes « Family Contact ».')}</div>`;
    $('#ctLog').innerHTML = ''; $('#ctFlags').innerHTML = ''; return;
  }
  const by = (k) => { const m = new Map(); list.forEach(x => [].concat(x.c[k] || []).forEach(v => m.set(v, (m.get(v) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); };
  const replies = list.map(x => x.c.reply).filter(v => v != null && v >= 0), calls = list.map(x => x.c.length).filter(v => v != null && v > 0);
  const med = ctMedian;
  const inc = list.filter(x => x.c.dir === 'from-family').length, deep = list.filter(x => x.c.depth === 'in-depth').length, photos = list.filter(x => x.c.topics.includes('photo-request')).length;
  const ch = by('channel');
  $('#ctKpis').innerHTML = kpiTile(L('Contacts', 'Contacts'), list.length, L(`${(list.length / Math.max(1, days.length)).toFixed(1)} / day`, `${(list.length / Math.max(1, days.length)).toFixed(1).replace('.', ',')} / jour`))
    + kpiTile(L('From the family', 'De la famille'), inc, L(`${list.length - inc} from you`, `${list.length - inc} de vous`))
    + kpiTile(L('Main channel', 'Moyen principal'), esc(ctL(ch[0][0])), ch.map(([k, n]) => `${esc(ctL(k))} ${n}`).join(' · '))
    + kpiTile(L('Typical reply time', 'Délai de réponse typique'), replies.length ? fmtDur(med(replies)) : '—', replies.length ? L(`median of ${replies.length} texts/emails`, `médiane de ${replies.length} textos/courriels`) : L('add an End Time = when you replied', 'heure de fin = moment de la réponse'))
    + kpiTile(L('In-depth questions', 'Questions approfondies'), deep, L(`${list.filter(x => x.c.depth === 'follow-up').length} follow-ups`, `${list.filter(x => x.c.depth === 'follow-up').length} suivis`))
    + kpiTile(L('Photo requests', 'Demandes de photo'), photos, L(`${list.filter(x => x.c.response.includes('photo-sent')).length} photos sent`, `${list.filter(x => x.c.response.includes('photo-sent')).length} photos envoyées`))
    + (calls.length ? kpiTile(L('Calls', 'Appels'), calls.length, L(`median ${fmtDur(med(calls))}`, `médiane ${fmtDur(med(calls))}`)) : '');
  if (hasChart()) {
    chartBase();
    const chans = CONTACT.channel.items.filter(k => list.some(x => x.c.channel === k)), CHC = { text:'#0ea5e9', phone:'#22c55e', email:'#a855f7', video:'#f59e0b', 'in-person':'#ec4899' };
    mkChart('chCtDay', { type:'bar', data:{ labels: days.map(d => fmtDayShort(d.D)), datasets: chans.map(k => ({ label: ctL(k), data: days.map(d => list.filter(x => x.e.d === d.D && x.c.channel === k).length), backgroundColor: CHC[k], stack:'a', borderRadius:3 })) },
      options:{ scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } }, x:{ grid:{ display:false } } } } });
    const hrs = Array.from({ length:24 }, (_, h) => h), timed = list.filter(x => x.e.st != null);
    mkChart('chCtHour', { type:'bar', data:{ labels: hrs.map(h => pad(h) + ':00'), datasets:[{ label: L('Contacts', 'Contacts'), data: hrs.map(h => timed.filter(x => Math.floor(x.e.st / 60) === h).length), backgroundColor:'#0ea5e9', borderRadius:3 }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } }, x:{ grid:{ display:false }, ticks:{ maxTicksLimit:12 } } } } });
    const tp = by('topics');
    mkChart('chCtTopic', { type:'bar', data:{ labels: tp.map(([k]) => ctL(k)), datasets:[{ label: L('Contacts', 'Contacts'), data: tp.map(([, n]) => n), backgroundColor:'#6366f1', borderRadius:3 }] },
      options:{ indexAxis:'y', plugins:{ legend:{ display:false } }, scales:{ x:{ beginAtZero:true, ticks:{ precision:0 } }, y:{ grid:{ display:false } } } } });
    // kind of question and tone per week
    const weeks = []; for (let a = days[0].D; a <= days[days.length - 1].D; a += 7) weeks.push(a);
    const wk = x => weeks.findLastIndex(a => x.e.d >= a);
    const kinds = [['basic', '#94a3b8'], ['in-depth', '#6366f1'], ['follow-up', '#f59e0b']], tones = [['Positive', '#22c55e'], ['Neutral', '#94a3b8'], ['Difficult', '#ef4444']];
    mkChart('chCtKind', { type:'bar', data:{ labels: weeks.map(a => L('Wk of ', 'Sem. du ') + fmtDayShort(a)), datasets:[
      ...kinds.map(([k, col]) => ({ label: ctL(k), data: weeks.map((_, i) => list.filter(x => wk(x) === i && x.c.depth === k).length), backgroundColor: col, stack:'kind', borderRadius:3 })),
      ...tones.map(([k, col]) => ({ label: ocL(k), data: weeks.map((_, i) => list.filter(x => wk(x) === i && x.c.tone === k).length), backgroundColor: col + 'aa', stack:'tone', borderRadius:3 })) ] },
      options:{ scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } }, x:{ grid:{ display:false } } } } });
  }
  $('#ctFind').innerHTML = `<ul class="find">${contactFindings(list, days).map(f => `<li>${esc(f)}</li>`).join('')}</ul>${contactAgreementHTML(days)}`;
  const flags = renderContactFlags(list, days) || new Map();
  $('#ctLog').innerHTML = `<table class="dt"><thead><tr>${(FRL() ? ['Date', 'Heure', 'Moyen', 'Qui', 'Sujet', 'Type', 'Réponse', 'Ton', 'Notes'] : ['Date', 'Time', 'How', 'Who', 'About', 'Kind', 'Response', 'Tone', 'Notes']).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${list.slice().reverse().map(({ e, c }) =>
    `<tr class="clickable" data-day="${e.d}" data-ev="${e.id}"><td>${fmtDayShort(e.d)}${flags.get(e.id)?.repeat.length ? ' 🔁' : ''}${flags.get(e.id)?.visit.length ? ' 🏠' : ''}</td><td>${e.st != null ? fmtTime(e.st) : '—'}</td><td>${c.dir === 'to-family' ? '↗ ' : '↘ '}${esc(ctL(c.channel))}</td><td>${esc(c.who.map(ctL).join(', ') || '—')}</td><td>${esc(c.topics.map(ctL).join(', ') || '—')}</td><td>${esc(ctL(c.depth) || '—')}</td><td>${esc(c.response.map(ctL).join(', ') || '—')}${c.reply != null ? ` <span class="faint">(${fmtDur(c.reply)})</span>` : ''}</td><td>${c.tone ? ocPill(c.tone) : '—'}</td><td>${esc(e.notes || '')}</td></tr>`).join('')}</tbody></table>`;
}
function contactFindings(list, days){
  const f = [], n = list.length; if (!n) return f;
  const inc = list.filter(x => x.c.dir === 'from-family');
  f.push(L(`${n} contact${n === 1 ? '' : 's'} over ${days.length} days (${(n / days.length).toFixed(1)} a day); ${inc.length} came from the family and ${n - inc.length} from you.`,
    `${plural(n, '', '', 'contact', 'contacts')} sur ${days.length} jours (${(n / days.length).toFixed(1).replace('.', ',')} par jour); ${inc.length} venaient de la famille et ${n - inc.length} de vous.`));
  const tp = new Map(); list.forEach(x => x.c.topics.forEach(t => tp.set(t, (tp.get(t) || 0) + 1)));
  const top = [...tp].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (top.length) f.push(L('Most asked about: ', 'Sujets les plus fréquents : ') + top.map(([k, c]) => `${ctL(k)} (${c})`).join(', ') + '.');
  const deep = list.filter(x => x.c.depth === 'in-depth').length, fu = list.filter(x => x.c.depth === 'follow-up').length, basic = list.filter(x => x.c.depth === 'basic').length;
  if (deep + fu + basic) f.push(L(`Kind of question: ${basic} basic, ${deep} in-depth, ${fu} follow-up.`, `Type de question : ${basic} simples, ${deep} approfondies, ${fu} de suivi.`));
  const reps = list.map(x => x.c.reply).filter(v => v != null && v >= 0);
  if (reps.length >= 2) { const m = ctMedian(reps), within = reps.filter(v => v <= 60).length;
    f.push(L(`You replied to ${reps.length} texts/emails in ${fmtDur(m)} at the median; ${within} within an hour.`, `Vous avez répondu à ${reps.length} textos/courriels en ${fmtDur(m)} (médiane); ${within} en moins d’une heure.`)); }
  const tones = ['Positive', 'Neutral', 'Difficult'].map(k => [k, list.filter(x => x.c.tone === k).length]).filter(([, c]) => c);
  if (tones.length) f.push(L('Tone: ', 'Ton : ') + tones.map(([k, c]) => `${ocL(k).toLowerCase()} ${c}`).join(', ') + '.');
  const ref = list.filter(x => x.c.response.includes('referred-to-worker')).length;
  if (ref) f.push(L(`${ref} question${ref > 1 ? 's were' : ' was'} referred to the caseworker.`, `${ref} question${ref > 1 ? 's ont été renvoyées' : ' a été renvoyée'} à l’intervenant.`));
  if (mod('visits')) { const vd = days.filter(d => d.visit), od = days.filter(d => !d.visit), cnt = ds => list.filter(x => ds.some(d => d.D === x.e.d)).length;
    if (vd.length && od.length) f.push(L(`Contacts per day: ${(cnt(vd) / vd.length).toFixed(1)} on visit days vs ${(cnt(od) / od.length).toFixed(1)} on other days.`, `Contacts par jour : ${(cnt(vd) / vd.length).toFixed(1).replace('.', ',')} les jours de visite contre ${(cnt(od) / od.length).toFixed(1).replace('.', ',')} les autres jours.`)); }
  return f;
}
/** Report section. */
function contactReportHTML(days){
  if (!mod('familyContact')) return '';
  const hid = (DATA.excluded || []).some(c => catKind(c) === 'contact');
  if (hid) return `<h2>${L('Family contact', 'Contacts avec la famille')}</h2><p class="sub">${L('Not included in this report.', 'Non inclus dans ce rapport.')}</p>`;
  const list = contactEvents(days); if (!list.length) return '';
  const ch = new Map(); list.forEach(x => ch.set(x.c.channel, (ch.get(x.c.channel) || 0) + 1));
  return `<h2>${L(`Family contact (${list.length})`, `Contacts avec la famille (${list.length})`)}</h2><ul class="find">${contactFindings(list, days).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    <p class="sub">${L('By channel: ', 'Par moyen : ')}${[...ch].map(([k, n]) => `${esc(ctL(k))} ${n}`).join(' · ')}</p>${contactAgreementHTML(days)}<ul class="find">${contactFlagFindings(list, contactFlags(list), days).map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
}

/* ── Repeat questions and visit-day requests ──
   Repeat: a topic the family already asked about in an earlier contact within S.contactRules.repeatHours (default 24 h).
   Visit day: a request for photos / video / a general update on a day with an off-site visit (they see the child that day). */
const VISIT_SEEN = ['photo-request', 'video-request', 'update'];
const NOT_REPEAT = ['other'];
function contactFlags(list){
  const win = (+(S.contactRules?.repeatHours) || 24) * 60, inc = list.filter(x => x.c.dir === 'from-family').sort((a, b) => a.e.s - b.e.s);
  const visits = new Map();   // day → [start, end] of the off-site visit(s)
  DATA.events.filter(e => e.k === 'visit' && !e.allDay).forEach(e => { const v = visits.get(e.d) || [Infinity, -Infinity]; visits.set(e.d, [Math.min(v[0], e.s), Math.max(v[1], e.t ?? e.s + 60)]); });
  const out = new Map();
  inc.forEach((x, i) => {
    const f = { repeat:[], prev:null, visit:[], when:'' };
    for (let j = i - 1; j >= 0; j--) { const p = inc[j]; if (x.e.s - p.e.s > win) break;
      const same = x.c.topics.filter(t => !NOT_REPEAT.includes(t) && p.c.topics.includes(t) && !f.repeat.includes(t));
      if (same.length) { f.repeat.push(...same); f.prev = f.prev || p; } }
    const v = visits.get(x.e.d);
    if (v) { f.visit = x.c.topics.filter(t => VISIT_SEEN.includes(t) && !(t === 'update' && x.c.topics.includes('visit')));   // “how did the visit go?” is about the visit itself, not flagged
      if (f.visit.length && !x.e.allDay) f.when = x.e.s < v[0] ? 'before' : x.e.s <= v[1] ? 'during' : 'after'; }
    if (f.repeat.length || f.visit.length) out.set(x.e.id, f);
  });
  return out;
}
const flagWhenL = w => ({ before:L('before the visit', 'avant la visite'), during:L('during the visit', 'pendant la visite'), after:L('after the visit', 'après la visite') }[w] || '');
function contactFlagFindings(list, flags, days){
  const f = [], inc = list.filter(x => x.c.dir === 'from-family'); if (!inc.length) return f;
  const rep = [...flags.values()].filter(x => x.repeat.length), vis = [...flags.values()].filter(x => x.visit.length), h = +(S.contactRules?.repeatHours) || 24;
  const tc = new Map(); rep.forEach(x => x.repeat.forEach(t => tc.set(t, (tc.get(t) || 0) + 1)));
  f.push(L(`${rep.length} of ${inc.length} contacts from the family (${Math.round(rep.length / inc.length * 100)}%) repeated a question already asked in the previous ${h} hours${tc.size ? ': ' + [...tc].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${ctL(t)} ×${n}`).join(', ') : ''}.`,
    `${rep.length} des ${inc.length} contacts venant de la famille (${Math.round(rep.length / inc.length * 100)} %) reprenaient une question déjà posée dans les ${h} heures précédentes${tc.size ? ' : ' + [...tc].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${ctL(t)} ×${n}`).join(', ') : ''}.`));
  const vDays = days.filter(d => d.visit).length;
  if (vDays) { const ph = vis.filter(x => x.visit.some(t => t !== 'update')).length, up = vis.filter(x => x.visit.includes('update')).length, aft = vis.filter(x => x.when === 'after').length;
    f.push(L(`On the ${vDays} visit day${vDays > 1 ? 's' : ''}: ${ph} photo or video request${ph === 1 ? '' : 's'} and ${up} request${up === 1 ? '' : 's'} for an update${aft ? `, ${aft} of them after the visit` : ''}.`,
      `Pendant les ${vDays} jour${vDays > 1 ? 's' : ''} de visite : ${ph} demande${ph > 1 ? 's' : ''} de photo ou de vidéo et ${up} demande${up > 1 ? 's' : ''} de nouvelles${aft ? `, dont ${aft} après la visite` : ''}.`)); }
  return f;
}
function renderContactFlags(list, days){
  const box = $('#ctFlags'); if (!box) return;
  const flags = contactFlags(list), inc = list.filter(x => x.c.dir === 'from-family');
  if (!inc.length) { box.innerHTML = `<p class="muted">${L('No contacts from the family in this range.', 'Aucun contact venant de la famille dans cette période.')}</p>`; return flags; }
  const rep = [...flags.values()].filter(x => x.repeat.length).length, vis = [...flags.values()].filter(x => x.visit.length).length, h = +(S.contactRules?.repeatHours) || 24;
  const rows = list.filter(x => flags.has(x.e.id)).reverse();
  box.innerHTML = `<div class="row wrap faint" style="gap:8px;font-size:13px;margin:-4px 0 10px">${L('A question counts as repeated if the same topic came up in a contact within', 'Une question compte comme répétée si le même sujet est revenu dans un contact dans les')} <input type="number" min="1" step="1" id="ctRepH" value="${h}" style="width:58px;padding:2px 6px"> ${L('hours before it.', 'heures précédentes.')}</div>
    <div class="kpis">${kpiTile(L('Repeated questions', 'Questions répétées'), rep, L(`${Math.round(rep / inc.length * 100)}% of contacts from the family`, `${Math.round(rep / inc.length * 100)} % des contacts de la famille`))}${kpiTile(L('Visit-day requests', 'Demandes les jours de visite'), vis, L('photos, video or updates on a visit day', 'photos, vidéo ou nouvelles un jour de visite'))}</div>
    <ul class="find" style="margin-top:10px">${contactFlagFindings(list, flags, days).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    ${rows.length ? `<table class="dt"><thead><tr>${(FRL() ? ['Date', 'Heure', 'Pourquoi', 'Notes'] : ['Date', 'Time', 'Why it’s flagged', 'Notes']).map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.map(({ e }) => { const f = flags.get(e.id);
      return `<tr class="clickable" data-day="${e.d}" data-ev="${e.id}"><td>${fmtDayShort(e.d)}</td><td>${e.st != null ? fmtTime(e.st) : '—'}</td><td>${[
        f.repeat.length ? `🔁 ${L('asked again:', 'demandé de nouveau :')} ${esc(f.repeat.map(ctL).join(', '))}${f.prev ? ` <span class="faint">(${L('also at', 'déjà à')} ${f.prev.e.d !== e.d ? fmtDayShort(f.prev.e.d) + ' ' : ''}${f.prev.e.st != null ? fmtTime(f.prev.e.st) : ''})</span>` : ''}` : '',
        f.visit.length ? `🏠 ${L('visit day:', 'jour de visite :')} ${esc(f.visit.map(ctL).join(', '))}${f.when ? ` <span class="faint">(${flagWhenL(f.when)})</span>` : ''}` : ''].filter(Boolean).join('<br>')}</td><td>${esc(e.notes || '')}</td></tr>`; }).join('')}</tbody></table>`
      : `<p class="muted">${L('Nothing flagged in this range.', 'Rien de signalé dans cette période.')}</p>`}
    <p class="hint">${L('Visit-day requests are requests for photos, video or a general update on a day with an off-site visit. “Other” topics are never counted as repeats. Press and hold a row to edit it.', 'Les demandes les jours de visite sont des demandes de photos, de vidéo ou de nouvelles un jour où il y a une visite à l’extérieur. Le sujet « autre » n’est jamais compté comme répétition. Appui long sur une ligne pour la modifier.')}</p>`;
  return flags;
}
