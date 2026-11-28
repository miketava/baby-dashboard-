/* ════════════════════════════════════════════════════════════════════════════
   V7 (redesign branch) — the test site's own storage.
   The test site (miketava.github.io/baby-dashboard-next/) shares an origin, and so localStorage, with the current app.
   Every `bld.*` key is read and written as `bld2.*` here, so the two apps never touch each other's settings, offline
   queue or drafts. On first launch the connection, settings, Who am I, saved reports and badge state are copied over
   so it opens already connected to the same Sheet; the offline queue and drafts are never copied (nothing is sent twice).
   Remove this file if the redesign is merged into main.
   ════════════════════════════════════════════════════════════════════════════ */
const NEXT_BUILD = true;
const NEXT_IMPORT = ['settings.v1', 'me.v1', 'reports.v3', 'filter.v1', 'ui.v2', 'achSeen.v1', 'fiddle.v1', 'cfgsync.v1', 'cache.v1'];
(() => {
  const P = 'bld.', N = 'bld2.', SP = Storage.prototype, get = SP.getItem, set = SP.setItem, rem = SP.removeItem;
  const map = k => typeof k === 'string' && k.startsWith(P) ? N + k.slice(P.length) : k;
  try {
    if (get.call(localStorage, N + 'imported') == null) {
      const got = NEXT_IMPORT.filter(k => { const v = get.call(localStorage, P + k); if (v == null) return false; set.call(localStorage, N + k, v); return true; });
      set.call(localStorage, N + 'imported', JSON.stringify({ at: new Date().toISOString(), keys: got }));
    }
  } catch {}
  SP.getItem = function (k) { return get.call(this, map(k)); };
  SP.setItem = function (k, v) { return set.call(this, map(k), v); };
  SP.removeItem = function (k) { return rem.call(this, map(k)); };
})();
