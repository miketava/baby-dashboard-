/* ── Connecting to the Apps Script (v1.30, script v1.7) ──
   The secret and the viewer keys live in the script's Script Properties, not in its code. The first dashboard to reach
   a freshly deployed script “claims” it: it sends a secret (this device's, or a new random one) and the viewer keys.
   Other phones join with a “connect” link. The Sharing screen keeps the viewer keys on the script up to date.
   One-tap updates: if the family switched them on in the Apps Script editor, “Update script” sends the code this
   dashboard carries (APPS_SCRIPT, REMINDERS_GS) and the script replaces itself and redeploys the same URL. */
let SCRIPT_CAN_UPDATE = false;
const SECRET_MIN_LEN = 16;
const newSecret = () => [...crypto.getRandomValues(new Uint8Array(24))].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 32);
const scriptAtLeast = v => DATA.source === 'live' && !!SCRIPT_SEEN && cmpVer(SCRIPT_SEEN, v) >= 0;
/** Viewer keys in the shape the script filters with. */
function viewersForScript(){
  return Object.fromEntries((S.share?.viewers || []).map(v => [v.key, { label: v.label || 'Viewer', exclude: v.exclude || [],
    ...(v.from ? { from: v.from } : {}), ...(v.child ? { child: v.child.keys, childName: v.child.name, blank: !!v.child.blank } : {}) }]));
}
async function scriptPost(body){
  const r = await fetch(S.endpoint.trim(), { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
  return JSON.parse(await r.text());
}
/** First connection to a new script: set the secret (keeping this device's if it's long enough) and the viewer keys. */
async function claimScript(){
  const fresh = !S.token || S.token.length < SECRET_MIN_LEN, secret = fresh ? newSecret() : S.token;
  const j = await scriptPost({ action: 'claim', secret, viewers: viewersForScript() });
  if (!j.ok) throw new Error(j.claimed
    ? L('This script is already connected to another phone. On that phone: Settings → Data source → “Connect another phone”, and open the link here.', 'Ce script est déjà relié à un autre téléphone. Sur celui-ci : Réglages → Source de données → « Relier un autre téléphone », puis ouvrez le lien ici.')
    : (j.error || 'Could not connect'));
  S.token = secret; saveSettings();
  return true;
}
/** Send the current viewer keys to the script: creating or removing one takes effect at once. */
async function pushViewers({ quiet = false } = {}){
  if (!S.endpoint || !S.token || viewOnly() || !scriptAtLeast('1.7')) return false;
  try { const j = await scriptPost({ action: 'viewers', token: S.token, viewers: viewersForScript() }); if (!j.ok) throw new Error(j.error); return true; }
  catch (err) { if (!quiet) toast(L('Couldn’t update the viewer keys on the script: ', 'Impossible de mettre à jour les clés lecteur sur le script : ') + err.message, true); return false; }
}

/* “Connect another phone”: a link carrying the script URL and the secret, read once on open and removed from the address bar. */
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const connectLink = () => location.origin + location.pathname + '#connect=' + b64u(JSON.stringify({ u: S.endpoint.trim(), t: S.token }));
function readConnectLink(){
  const m = location.hash.match(/^#connect=([\w-]+)/); if (!m) return false;
  history.replaceState(null, '', location.pathname + location.search);   // don't leave the secret in the address bar or history
  let c; try { c = JSON.parse(unb64u(m[1])); } catch (err) { toast(L('That connect link is damaged', 'Ce lien de connexion est abîmé'), true); return false; }
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(c.u || '') || !c.t) { toast(L('That connect link is damaged', 'Ce lien de connexion est abîmé'), true); return false; }
  if (S.endpoint && (S.endpoint.trim() !== c.u || S.token !== c.t) && !confirm(L('Connect this phone to the Sheet in this link? It replaces the Sheet this phone is connected to now.', 'Relier ce téléphone à la feuille de ce lien ? Elle remplace celle à laquelle il est relié maintenant.'))) return false;
  S.endpoint = c.u; S.token = c.t; saveSettings();
  toast(L('Connected to your family’s Sheet', 'Relié à la feuille de la famille'));
  return true;
}
async function shareConnectLink(){
  const url = connectLink(), text = L('Open this on your phone to connect the baby dashboard. It works like a password: send it only to the other caregiver.', 'Ouvrez ceci sur votre téléphone pour relier le tableau de bord. C’est comme un mot de passe : ne l’envoyez qu’à l’autre parent.');
  if (navigator.share) { try { await navigator.share({ title: L('Baby dashboard', 'Tableau de bord bébé'), text, url }); return; } catch (err) { if (err.name === 'AbortError') return; } }
  toast(await copyText(url) ? L('Link copied: send it privately', 'Lien copié : envoyez-le en privé') : L('Copy failed', 'Échec de la copie'), !navigator.clipboard);
}

/* One-tap script updates (only if switched on in the Apps Script editor: ▸ Run allowOneTapUpdates). */
const manifestText = () => APPS_MANIFEST.replace(/"timeZone": "[^"]*"/, `"timeZone": "${Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'}"`);
async function updateScript(){
  if (!confirm(L(`Update your Apps Script to v${REQUIRED_SCRIPT} now? It replaces the script's code with the version this dashboard carries and redeploys the same URL. Your settings (secret, viewer keys, reminder topic) are kept.`,
    `Mettre l’Apps Script à jour (v${REQUIRED_SCRIPT}) maintenant ? Le code du script est remplacé par la version de ce tableau de bord et redéployé à la même adresse. Vos réglages (secret, clés lecteur, sujet des rappels) sont conservés.`))) return;
  toast(L('Updating the script…', 'Mise à jour du script…'));
  try {
    const j = await scriptPost({ action: 'selfUpdate', token: S.token, files: { Code: APPS_SCRIPT, Reminders: REMINDERS_GS } });
    if (!j.ok) throw new Error(j.error || 'Update failed');
    toast(L(`Script updated to v${j.version}`, `Script mis à jour : v${j.version}`));
    setTimeout(() => syncLive({ quiet: true }), 1500);
  } catch (err) { toast(L('Script update failed: ', 'Échec de la mise à jour : ') + err.message, true); }
}
/** Data source pane: connection status, “connect another phone”, script version and update. */
function connectPaneHTML(){
  if (!S.endpoint || viewOnly()) return '';
  const live = DATA.source === 'live', v17 = scriptAtLeast('1.7');
  return `<h4>${L('Other phones', 'Autres téléphones')}</h4>
    <p class="hint" style="margin-top:0">${L('Send this link to the other caregiver; opening it on their phone connects it to the same Sheet. It works like a password, so send it privately (a text, not a group chat).', 'Envoyez ce lien à l’autre parent ; en l’ouvrant sur son téléphone, celui-ci se relie à la même feuille. C’est comme un mot de passe : envoyez-le en privé (un texto, pas un groupe).')}</p>
    <div class="row wrap"><button class="btn" data-act="connectLink" ${S.token ? '' : 'disabled'}>🔗 ${L('Connect another phone', 'Relier un autre téléphone')}</button></div>
    ${live ? `<h4>${L('Apps Script', 'Apps Script')}</h4>
    <p style="margin-top:0">v${esc(SCRIPT_SEEN === '0' ? '<1.0' : SCRIPT_SEEN)}${scriptOutdated() ? ` · <b>${L(`v${REQUIRED_SCRIPT} available`, `v${REQUIRED_SCRIPT} disponible`)}</b>` : ` · ${L('up to date', 'à jour')}`}</p>
    ${scriptOutdated() && SCRIPT_CAN_UPDATE ? `<div class="row wrap"><button class="btn primary" data-act="updateScript">🔧 ${L('Update script', 'Mettre le script à jour')}</button></div>` : ''}
    ${scriptOutdated() && !SCRIPT_CAN_UPDATE ? `<p class="hint">${L('To update: Setup guide → Copy script, paste it over everything in Code.gs, then Deploy → Manage deployments → ✏️ → Version: New version → Deploy. Or switch on one-tap updates (Setup guide, last section) and do it from here next time.', 'Pour mettre à jour : Guide → Copier le script, collez-le à la place de tout le contenu de Code.gs, puis Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer. Ou activez les mises à jour en un geste (Guide, dernière section) pour le faire d’ici la prochaine fois.')}</p>` : ''}
    ${v17 && !scriptOutdated() ? `<p class="hint">${SCRIPT_CAN_UPDATE ? L('One-tap updates are on: future script updates install from here.', 'Mises à jour en un geste activées : les prochaines mises à jour du script s’installent d’ici.') : L('One-tap updates are off (optional: Setup guide, last section).', 'Mises à jour en un geste désactivées (facultatif : Guide, dernière section).')}</p>` : ''}` : ''}`;
}
