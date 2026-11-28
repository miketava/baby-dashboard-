/* ── Sleep music (v1.45) ──
   A playlist link (Spotify, YouTube Music, Apple Music… any https link) kept in Settings → General, shared with the
   other caregiver. Around nap and bedtime the Today box offers one tap to open it in the music app. No link, no button. */
const MUSIC_BEFORE = 30, MUSIC_AFTER = 30;
const musicHost = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /spotify/.test(h) ? 'Spotify' : /music\.youtube/.test(h) ? 'YouTube Music' : /youtu/.test(h) ? 'YouTube' : /music\.apple/.test(h) ? 'Apple Music' : /deezer/.test(h) ? 'Deezer' : h; } catch { return ''; } };
const musicOk = u => /^https:\/\/\S+$/i.test(String(u || '').trim());
/** {url, kind:'nap'|'bed'} when a nap or bedtime is within the window (or a sleep just started); else null. */
function sleepMusicNow(m, now){
  const nap = String(S.music?.nap || '').trim(), bed = String(S.music?.bed || '').trim() || nap;
  if (!musicOk(nap) && !musicOk(bed)) return null;
  const D = m.D, nowA = D * DAY + now;
  const going = DATA.events.find(e => isSleep(e) && e.ongoing && nowA - e.s <= MUSIC_AFTER);   // just went down
  if (going) { const k = isNight(going) ? 'bed' : 'nap', u = k === 'bed' ? bed : nap; return musicOk(u) ? { url: u, kind: k } : null; }
  if (DATA.events.some(e => isSleep(e) && e.ongoing)) return null;                             // asleep: nothing to start
  const items = m.tpl ? [...tplItems(m.tpl, 'nap').filter(i => !i.optional), ...tplItems(m.tpl, 'bedtime')] : [];
  for (const i of items) { const t = parseTime(i.start); if (t == null) continue;
    if (now >= t - MUSIC_BEFORE && now <= t + MUSIC_AFTER) {
      const k = i.kind === 'bedtime' ? 'bed' : 'nap', u = k === 'bed' ? bed : nap;
      // a nap already logged today at about this time means it's done
      if (k === 'nap' && DATA.events.some(e => isNap(e) && e.d === D && e.st != null && Math.abs(e.st - t) <= 90 && !e.ongoing)) continue;
      if (musicOk(u)) return { url: u, kind: k };
    } }
  return null;
}
function sleepMusicCallout(m, now){
  if (viewOnly()) return null;
  const mu = sleepMusicNow(m, now); if (!mu) return null;
  const label = mu.kind === 'bed' ? L('Play bedtime music', 'Musique du coucher') : L('Play nap music', 'Musique de la sieste');
  return { cls: 'info music', html: `<a class="btn musicbtn" href="${esc(mu.url)}" target="_blank" rel="noopener">🎵 ${label}</a> <span class="faint">${esc(musicHost(mu.url))}</span>` };
}
function sleepMusicSettingsHTML(){
  const f = (k, lab, ph) => `<label class="field">${lab}<input type="url" inputmode="url" data-set="music.${k}" value="${esc(S.music?.[k] || '')}" placeholder="${esc(ph)}" autocomplete="off"></label>`;
  const test = k => musicOk(S.music?.[k]) ? `<a class="btn sm" href="${esc(S.music[k])}" target="_blank" rel="noopener">▶ ${L('Test', 'Essayer')} (${esc(musicHost(S.music[k]))})</a>` : '';
  return `<h4>🎵 ${L('Sleep music', 'Musique pour dormir')}</h4>
    <div class="fgrid">${f('nap', L('Playlist for naps (and bedtime)', 'Liste pour les siestes (et le coucher)'), 'https://open.spotify.com/playlist/…')}${f('bed', L('Bedtime playlist (optional, if different)', 'Liste du coucher (facultatif, si différente)'), 'https://music.youtube.com/playlist?list=…')}</div>
    <div class="row wrap">${test('nap')}${test('bed')}</div>
    <p class="hint">${L('In the music app, open the playlist → Share → Copy link, and paste it here. From 30 minutes before a nap or bedtime until 30 minutes after (or just after she goes down), the Today box shows a 🎵 button that opens it in the app in one tap. No link, no button. Shared with the other caregiver’s phone.', 'Dans l’app de musique, ouvrez la liste → Partager → Copier le lien, et collez-le ici. De 30 minutes avant une sieste ou le coucher jusqu’à 30 minutes après (ou juste après qu’elle s’endort), l’encadré Aujourd’hui affiche un bouton 🎵 qui l’ouvre dans l’app en un geste. Sans lien, pas de bouton. Partagé avec le téléphone de l’autre parent.')}</p>`;
}
