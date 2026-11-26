/* ════════════════════════════════════════════════════════════════════════════
   14. CHART.JS HELPERS
   ════════════════════════════════════════════════════════════════════════════ */
const CH = {};
const hasChart = () => typeof window.Chart !== 'undefined';
/** Plugin: shaded bands + reference lines ({axis, value|from/to, color, dash, label, left}). */
const guidesPlugin = {
  id: 'guides',
  beforeDatasetsDraw(chart, _a, o){
    const { ctx, chartArea:A, scales } = chart;
    (o.bands || []).forEach(b => {
      const sc = scales[b.axis || 'y']; if (!sc) return;
      let p0 = sc.getPixelForValue(b.from), p1 = sc.getPixelForValue(b.to);
      ctx.save(); ctx.fillStyle = b.color;
      if ((b.axis || 'y').startsWith('y')) { p0 = clamp(p0, A.top, A.bottom); p1 = clamp(p1, A.top, A.bottom); ctx.fillRect(A.left, Math.min(p0,p1), A.right - A.left, Math.abs(p1-p0)); }
      else { p0 = clamp(p0, A.left, A.right); p1 = clamp(p1, A.left, A.right); ctx.fillRect(Math.min(p0,p1), A.top, Math.abs(p1-p0), A.bottom - A.top); }
      if (b.label) { ctx.fillStyle = b.text || cssVar('--muted'); ctx.font = '600 11px system-ui'; ctx.fillText(b.label, A.left + 6, Math.min(p0,p1) + 13); }
      ctx.restore();
    });
  },
  afterDatasetsDraw(chart, _a, o){
    const { ctx, chartArea:A, scales } = chart;
    (o.lines || []).forEach(l => {
      const ax = l.axis || 'y', sc = scales[ax]; if (!sc || l.value == null) return;
      const p = sc.getPixelForValue(l.value); const vert = ax.startsWith('x');
      if (vert ? (p < A.left || p > A.right) : (p < A.top || p > A.bottom)) return;
      ctx.save(); ctx.strokeStyle = l.color; ctx.lineWidth = l.width || 1.5; ctx.setLineDash(l.dash || [5,4]);
      ctx.beginPath(); if (vert) { ctx.moveTo(p, A.top); ctx.lineTo(p, A.bottom); } else { ctx.moveTo(A.left, p); ctx.lineTo(A.right, p); } ctx.stroke();
      if (l.label) { ctx.setLineDash([]); ctx.fillStyle = l.color; ctx.font = '600 10.5px system-ui'; const w = ctx.measureText(l.label).width;
        if (vert) ctx.fillText(l.label, Math.min(p + 4, A.right - w - 2), A.top + 11);
        else ctx.fillText(l.label, l.left ? A.left + 4 : A.right - w - 4, p - 4); }
      ctx.restore();
    });
  }
};
function chartBase(){
  Chart.defaults.color = cssVar('--muted'); Chart.defaults.borderColor = cssVar('--grid2');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.font.size = 11.5;
  Chart.defaults.plugins.tooltip.backgroundColor = cssVar('--panel'); Chart.defaults.plugins.tooltip.titleColor = cssVar('--text');
  Chart.defaults.plugins.tooltip.bodyColor = cssVar('--text'); Chart.defaults.plugins.tooltip.footerColor = cssVar('--text'); Chart.defaults.plugins.tooltip.borderColor = cssVar('--border'); Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 9; Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.boxHeight = 10; Chart.defaults.plugins.legend.labels.useBorderRadius = true; Chart.defaults.plugins.legend.labels.borderRadius = 2;
  Chart.defaults.maintainAspectRatio = false; Chart.defaults.animation.duration = 350;
}
function mkChart(id, cfg){
  if (CH[id]) { CH[id].destroy(); delete CH[id]; }
  const cv = document.getElementById(id); if (!cv) return;
  const box = cv.parentElement; box.querySelector('.empty')?.remove(); cv.style.display = '';
  if (!hasChart()) { cv.style.display = 'none'; box.insertAdjacentHTML('beforeend', '<div class="empty"><b>Charts unavailable</b>Chart.js could not load (offline?). Tables and the timeline still work.</div>'); return; }
  CH[id] = new Chart(cv, i18nChart(cfg));
}
function chartEmpty(id, msg){ if (CH[id]) { CH[id].destroy(); delete CH[id]; } const cv = document.getElementById(id); cv.style.display = 'none'; const box = cv.parentElement; box.querySelector('.empty')?.remove(); box.insertAdjacentHTML('beforeend', `<div class="empty">${msg}</div>`); }
const hhmmTick = v => fmtTime(v);
const dayLabel = d => fmtDay(d.D, { weekday:'short', day:'numeric' });

/* swipe left / right in the day panel (phones) */
(function drawerSwipe(){
  const dr = document.getElementById('drawer'); if (!dr) return;
  let x0 = 0, y0 = 0, t0 = 0, dx = 0, mode = null;
  dr.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || drAnimating) { mode = 'no'; return; }
    let el = e.target; mode = null;   // leave sideways-scrolling things (wide tables, charts) alone
    while (el && el !== dr) { if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) { mode = 'no'; break; } el = el.parentElement; }
    if (e.target.closest('input, select, textarea, canvas')) mode = 'no';
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); dx = 0;
  }, { passive: true });
  dr.addEventListener('touchmove', e => {
    if (mode === 'no' || mode === 'y') return;
    const ddx = e.touches[0].clientX - x0, ddy = e.touches[0].clientY - y0;
    if (!mode) { if (Math.abs(ddx) < 10 && Math.abs(ddy) < 10) return; mode = Math.abs(ddx) > Math.abs(ddy) * 1.2 ? 'x' : 'y'; if (mode === 'y') return; }
    e.preventDefault(); dx = ddx;
    const ed = drawerEdge(), atEnd = (dx > 0 && ed.first) || (dx < 0 && ed.last);
    const b = $('#drBody'); b.style.transition = 'none'; b.style.transform = `translateX(${atEnd ? dx * .25 : dx}px)`; b.style.opacity = String(1 - Math.min(.5, Math.abs(dx) / 600));
  }, { passive: false });
  const end = () => {
    if (mode !== 'x') { mode = null; return; } mode = null;
    const v = Math.abs(dx) / Math.max(1, Date.now() - t0), b = $('#drBody');
    if (Math.abs(dx) > 70 || (Math.abs(dx) > 30 && v > .5)) goDrawerDay(dx < 0 ? 1 : -1, { fromDrag: dx });
    else { b.style.transition = 'transform .2s ease, opacity .2s ease'; b.style.transform = ''; b.style.opacity = ''; setTimeout(() => { b.style.transition = ''; }, 220); }
  };
  dr.addEventListener('touchend', end); dr.addEventListener('touchcancel', end);
})();
