function demoNewbornRows(){
  let a = 20261027; const R = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnd = (x, y) => x + R() * (y - x), B = -20;   // birth day as an offset from the demo base (today − 7)
  const rows = [], add = (abs, endAbs, c, f = {}) => { const o = B + Math.floor(abs / DAY);
    rows.push([o, abs == null ? '' : fmtTime(Math.round(abs) % DAY), endAbs == null ? '' : fmtTime(Math.round(endAbs) % DAY), '', c, f.milk ?? '', f.notes ?? '', '', f.tags ?? '', f.out ?? '', false, f.value ?? '']); };
  const allDay = (dl, c, f) => rows.push([B + dl, '', '', '', c, '', f.notes ?? '', '', f.tags ?? '', f.out ?? '', false, f.value ?? '']);
  const at = (dl, hhmm) => dl * DAY + parseTime(hhmm);
  // one-off records
  allDay(0, 'Milestone', { notes:'Born at 04:10', tags:'birth' });
  allDay(0, 'Weight', { notes:'Birth weight', value:'3.40 kg' }); allDay(0, 'Height', { notes:'Birth length', value:'50.5 cm' }); allDay(0, 'Head Circumference', { notes:'At birth', value:'34.5 cm' });
  add(at(2, '10:30'), at(2, '11:00'), 'Medical / Appointment', { notes:'Newborn check. Mild jaundice to watch, recheck in 3 days.', tags:'checkup, jaundice', out:'Follow-up Needed' });
  allDay(2, 'Weight', { notes:'At newborn check', value:'3.21 kg' });
  allDay(3, 'Health / Incident', { notes:'Slight yellow tinge to skin', tags:'jaundice', out:'Monitor' });
  allDay(4, 'Weight', { notes:'Home scale', value:'3.18 kg' });
  add(at(5, '14:00'), at(5, '14:20'), 'Medical / Appointment', { notes:'Jaundice recheck: improving', tags:'jaundice', out:'Monitor' });
  allDay(8, 'Health / Incident', { notes:'Jaundice gone', tags:'jaundice', out:'Resolved' });
  allDay(9, 'Milestone', { notes:'Umbilical cord stump fell off', tags:'care' });
  allDay(13, 'Weight', { notes:'2-week checkup', value:'3.46 kg' }); allDay(13, 'Height', { notes:'2-week checkup', value:'51.6 cm' }); allDay(13, 'Head Circumference', { notes:'2-week checkup', value:'35.3 cm' });
  add(at(13, '09:30'), at(13, '10:00'), 'Medical / Appointment', { notes:'2-week checkup: back above birth weight', tags:'checkup', out:'Resolved' });
  add(at(16, '18:10'), null, 'Temperature', { notes:'Felt warm after a bundled walk; fine on recheck', value:'37.6 °C', out:'Resolved' });
  allDay(18, 'Milestone', { notes:'Lifts head briefly during tummy time', tags:'motor' });
  allDay(20, 'Weight', { notes:'Home scale', value:'3.74 kg' });
  allDay(24, 'Milestone', { notes:'Follows faces with eyes', tags:'social' });
  allDay(27, 'Weight', { notes:'Clinic weigh-in', value:'3.96 kg' });
  // feeds, sleep and diapers, simulated feed to feed
  let t = 4*60 + 10 + 40, side = 'left', bottleDay = -1, tummyDay = {}, bathDay = 10;
  const end = (27 + 1) * DAY;
  while (t < end) {
    const dl = Math.floor(t / DAY), h = (t % DAY) / 60;
    let fEnd;
    if (dl >= 10 && h >= 21.5 && h < 23.5 && bottleDay !== dl) {           // partner bottle of expressed milk
      bottleDay = dl; fEnd = t + rnd(12, 20);
      add(t, fEnd, 'Bottle', { milk: +(rnd(2.5, 3.6)).toFixed(1), tags:'breastmilk', notes:'Partner feed, expressed milk' });
      add(t + 5, t + 25, 'Pump', { value: Math.round(rnd(80, 115)) + ' ml', notes:'Pumped while partner fed' });
    } else {
      const d1 = dl < 3 ? rnd(6, 12) : rnd(9, 18), both = R() > .18;
      add(t, t + d1, 'Breastfeed', { tags: side }); fEnd = t + d1;
      const other = side === 'left' ? 'right' : 'left';
      if (both) { const s2 = fEnd + rnd(1, 4), d2 = rnd(5, 13); add(s2, s2 + d2, 'Breastfeed', { tags: other }); fEnd = s2 + d2; }
      side = other;
    }
    // diapers around the feed
    const pWet = [.15, .3, .4, .5, .65][dl] ?? .85, pDirty = dl < 2 ? .15 : dl < 5 ? .35 : dl < 20 ? .45 : .3;
    if (R() < pWet) add(fEnd + rnd(2, 8), null, 'Diaper - Wet');
    if (R() < pDirty) add(fEnd + rnd(3, 9), null, 'Diaper - Poop', { tags: dl < 2 ? 'meconium' : dl < 5 ? 'transitional' : 'yellow' });
    if (dl >= 0 && h >= 8.5 && h < 10 && !tummyDay['vd' + dl]) { tummyDay['vd' + dl] = 1; add(fEnd + 3, null, 'Meds', { notes:'Vitamin D drops' }); }
    // interval to the next feed
    const night = h >= 22 || h < 6, cluster = dl >= 5 && h >= 17 && h < 21.5;
    const next = t + (dl < 2 ? rnd(150, 200) : cluster ? rnd(55, 85) : night ? rnd(170, 210) + dl * 3 : rnd(140, 175));
    // tummy time, bath, fussiness in the awake window
    let s0 = fEnd + rnd(8, 20);
    if (dl >= 7 && !night && !cluster && (tummyDay[dl] || 0) < 2 && R() < .5) { const d = dl < 14 ? rnd(2, 6) : rnd(4, 9); add(s0, s0 + d, 'Tummy Time'); s0 += d + rnd(5, 10); tummyDay[dl] = (tummyDay[dl] || 0) + 1; }
    if (dl === bathDay && h >= 18 && h < 21) { add(s0, s0 + 12, 'Bath', { notes: dl === 10 ? 'First full bath' : '' }); s0 += 20; bathDay += 3; }
    if (cluster && dl >= 10 && R() < .25) add(fEnd + 5, null, 'Behaviour', { notes:'Evening fussiness, cluster feeding', tags:'fussy', out:'Mixed' });
    // sleep until (just before) the next feed
    const sEnd = next - rnd(0, 10);
    if (sEnd - s0 >= 20) { const sh = (s0 % DAY) / 60; add(s0, sEnd, sh >= 21 || sh < 7 ? 'Sleep - Night' : 'Sleep - Nap'); }
    t = next;
  }
  return rows;
}
/** Same demo weeks without any visit / caseworker language — used for the routine path. */
function neutralizeRec(r){
  if (/^(handover|family contact)$/i.test(r['Category']) || /^check-?in\b/i.test(r['Category'])) return null;
  let notes = String(r['Notes'] || '');
  for (const [re, to] of [[/Supervised visit[^,;]*/i, "Grandparents' house"], [/Drive to visit/i, 'Drive to grandparents'], [/Social worker home visit/i, 'Nurse home visit'],
                          [/after the visit|after visit/i, 'after a busy outing'], [/(?<!home )\bvisit\b/ig, 'outing']]) notes = notes.replace(re, to);
  const tags = String(r['Tags'] || '').split(',').map(x => x.trim()).filter(x => x && !['agency','drop-off','pick-up','home-visit'].includes(x)).join(', ');
  return { ...r, 'Category': r['Category'] === 'Visit' ? 'Outing / Excursion' : r['Category'], 'Notes': notes, 'Tags': tags };
}

/**
 * WHO Child Growth Standards (2006), LMS parameters by age in days, 0–730 (birth to 2 years):
 * weight-for-age (kg), length-for-age (cm, recumbent), head-circumference-for-age (cm), boys & girls.
 * Source: WHO expanded daily tables, extracted from three independent open-source packages that agree
 * exactly for every day; sampled daily to 4 weeks, every 3 days to 13 weeks, weekly after
 * (linear interpolation in between: < 0.03 % difference from the daily table). Rows: [day, L, M, S].
 */
