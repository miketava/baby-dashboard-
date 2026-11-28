/* ── Sharing: leave categories out, and read-only viewer keys ── */
const VDEF = ['Guest', 'Outing / Excursion'];
let VDRAFT = null;
function shareCats(){
  const present = new Map(); DATA.events.forEach(e => present.set(e.cat, (present.get(e.cat) || 0) + 1));
  (DATA.excludedCounts || new Map()).forEach((n, c) => present.set(c, n));
  const names = [...new Set([...[...CATS.values()].filter(c => c.known && c.group !== 'Care').map(c => c.name), ...present.keys(), ...VDEF])];
  return names.map(n => ({ name:n, n: present.get(n) || 0, icon: CATS.get(n)?.icon || '•' }));
}
const q1 = x => "'" + String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n') + "'";   // a safe single-quoted JS string
/** A viewer key as a line for VIEWERS in scripts before v1.7 (v1.7+ gets the keys from the dashboard). */
const viewerLine = v => `  ${q1(v.key)}: { label: ${q1(v.label || 'Viewer')}, exclude: [${v.exclude.map(q1).join(', ')}]${v.from ? `, from: '${v.from}'` : ''}${v.child ? `, child: [${v.child.keys.map(q1).join(', ')}], childName: ${q1(v.child.name)}, blank: ${!!v.child.blank}` : ''} },`;
function sharingPaneHTML(){
  const cats = shareCats(), ex = new Set((S.share.exclude || []).map(exclKey));
  if (!VDRAFT) VDRAFT = { label:'Caseworker', exclude: VDEF.slice(), from:'' };
  const vw = DATA.viewer, v17 = scriptAtLeast('1.7');
  return `${vw ? `<div class="scopenote">You're connected with a <b>read-only viewer key</b>${vw.label ? ' (' + esc(vw.label) + ')' : ''}. ${vw.excluded?.length ? 'Not included in this view: ' + esc(vw.excluded.join(', ')) + '.' : 'All categories are included.'}${vw.from ? ' Entries before ' + esc(vw.from) + ' are not shared.' : ''}</div>` : ''}
    <h4>Leave out of analysis on this device</h4>
    <p class="hint" style="margin-top:0">Ticked categories are removed from every chart, finding and report <b>on this device only</b> — the Sheet is untouched. A “Not included: …” line on the dashboard and on every report names them, so nothing is silently missing.</p>
    <div class="chkgrid">${cats.map(c => `<label class="switch"><input type="checkbox" data-shareex="${esc(c.name)}" ${ex.has(exclKey(c.name)) ? 'checked' : ''}> ${c.icon} ${esc(c.name)} <span class="faint">${c.n || ''}</span></label>`).join('')}</div>
    ${vw ? '' : `<h4>Read-only viewer keys</h4>
    <p class="hint" style="margin-top:0">For someone who should see the dashboard but not edit it — a caseworker, a grandparent. A viewer key can only read. Excluded categories are filtered out <b>by your Apps Script, before anything leaves Google</b>, and the viewer sees a “Not included” line naming them. Notes on other rows are shared as written.</p>
    <div class="fgrid">
      <label class="field">Who it's for<input type="text" id="vLabel" value="${esc(VDRAFT.label)}"></label>
      <label class="field">Only entries from<input type="date" id="vFrom" value="${esc(VDRAFT.from)}"><span class="faint">optional · blank = everything</span></label></div>
    ${multiKid() ? `<label class="field" style="margin-top:6px">${L('Child', 'Enfant')}<select id="vKid">${S.kids.map((_, i) => `<option value="${i}" ${(VDRAFT.kid ?? kidIdx()) === i ? 'selected' : ''}>${esc(kidName(i))}</option>`).join('')}</select><span class="faint">${L('This key returns only this child’s rows; other children’s names are removed from shared rows.', 'Cette clé ne renvoie que les lignes de cet enfant; le nom des autres enfants est retiré des lignes partagées.')}</span></label>` : ''}
    <div class="field" style="margin-top:6px">Leave out these categories</div>
    <div class="chkgrid">${cats.map(c => `<label class="switch"><input type="checkbox" data-vex="${esc(c.name)}" ${VDRAFT.exclude.includes(c.name) ? 'checked' : ''}> ${c.icon} ${esc(c.name)}</label>`).join('')}</div>
    <div class="row wrap" style="margin-top:8px"><button class="btn primary" data-act="vCreate">Create viewer key</button></div>
    ${(S.share.viewers || []).map((v, i) => `<div class="vcard">
      <div><b>${esc(v.label || 'Viewer')}</b>${v.child ? ' · ' + esc(v.child.name) : ''} <span class="faint">· created ${esc(new Date(v.created).toLocaleDateString(LOC()))}</span></div>
      <div class="sub">Not included: ${v.exclude.length ? esc(v.exclude.join(', ')) : 'nothing'}${v.from ? ' · from ' + esc(v.from) : ''}</div>
      ${v17 ? `<p class="hint">${L('Active on your script. Send them the link to your dashboard and this viewer config file — it holds the viewer key, never your main secret.', 'Active sur votre script. Envoyez-leur le lien de votre tableau de bord et ce fichier de configuration — il contient la clé lecteur, jamais votre secret.')}</p>` : `<ol class="hint">
        <li>In Apps Script, paste this line between the braces of <span class="mono">const VIEWERS = { … }</span> at the top:<pre class="code">${esc(viewerLine(v))}</pre></li>
        <li>Save, then <b>Deploy → Manage deployments → ✏️ → Version: New version → Deploy</b> (same URL). <span class="faint">${L('Script v1.7 and later skip these steps: the key is active as soon as you create it.', 'À partir du script v1.7, ces étapes disparaissent : la clé est active dès sa création.')}</span></li>
        <li>Send them the link to your dashboard and this viewer config file — it holds the viewer key, never your main secret.</li></ol>`}
      <div class="row wrap">${v17 ? '' : `<button class="btn sm" data-act="vCopy" data-i="${i}">Copy line</button>`}<button class="btn sm primary" data-act="vExport" data-i="${i}">Export viewer config</button><button class="btn sm danger" data-act="vRemove" data-i="${i}">Remove</button></div>
    </div>`).join('')}
    <p class="hint">${v17 ? L('To revoke access, tap Remove: the key stops working immediately.', 'Pour retirer l’accès, touchez Supprimer : la clé cesse aussitôt de fonctionner.') : 'To revoke access, delete the line from <span class="mono">VIEWERS</span> and deploy a new version — the key stops working immediately.'}</p>`}`;
}
const clText = e => FRL() && e.fr ? e.fr : e.en;
/** Settings → About & changes: versions and the changelog. */
function aboutPaneHTML(){
  const sv = DATA.source !== 'live' ? L('not connected', 'non connecté') : !SCRIPT_SEEN ? L('not synced yet', 'pas encore synchronisé') : SCRIPT_SEEN === '0' ? L('older than 1.0 — please update', 'antérieur à 1.0 — à mettre à jour') : 'v' + SCRIPT_SEEN + (scriptOutdated() ? L(' — please update', ' — à mettre à jour') : ' ✓');
  return `<div class="kgrid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-bottom:10px">
      <div class="kpi"><span>${L('Dashboard', 'Tableau de bord')}</span><b>v${APP_VERSION}</b></div>
      <div class="kpi"><span>Apps Script</span><b style="font-size:15px">${esc(sv)}</b><span class="faint">${L('needs', 'requis :')} v${REQUIRED_SCRIPT}</span></div></div>
    <p class="hint" style="margin-top:0">${L('The dashboard is the index.html file you host; the Apps Script lives in your Sheet. When a release needs a new script, a notice tells you — paste the new Code.gs and deploy a new version (same URL).', 'Le tableau de bord est le fichier index.html que vous hébergez; l’Apps Script vit dans votre feuille. Quand une version exige un nouveau script, un avis vous le dit — collez le nouveau Code.gs et déployez une nouvelle version (même URL).')}</p>
    <h4>${L('Changelog', 'Historique des versions')}</h4>
    ${CHANGELOG.map(e => `<div class="vcard"><div><b>v${e.v}</b> <span class="faint">· ${esc(fmtDay(parseDate(e.date), { year:'numeric', month:'long', day:'numeric' }))}</span></div><ul class="find">${clText(e).map(x => `<li>${esc(x)}</li>`).join('')}</ul>${clGo(e)}</div>`).join('')}`;
}
function viewerConfig(v){
  storeActiveKid();
  const c = structuredClone(S);
  if (v.kidId && S.kids?.length) { const k = S.kids.find(x => x.id === v.kidId); if (k) Object.assign(c, structuredClone(k.snap)); }
  c.kids = []; c.kid = 0; c.blankKid = 0; c.kidView = 'one';
  c.token = v.key; c.share = { exclude: [], viewers: [] }; c.ntfyTopic = ''; c.autoRefreshMin = c.autoRefreshMin || 15;
  c.profile = { ...c.profile, onboarded:true, whatsNew:'', bandAck: c.profile.bandAck };
  return { app:'baby_log_dashboard', version:APP_VERSION, exported:new Date().toISOString(), viewer:true, settings:c };
}
