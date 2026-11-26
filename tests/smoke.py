"""Browser checks for index.html (Playwright + Chromium). Each check passes or fails on its own.

  pip install playwright && python -m playwright install chromium
  python tests/smoke.py              # or: CHROME=/path/to/chrome python tests/smoke.py

Chart.js and PapaParse load from the CDN; set LIBDIR to a node_modules folder holding chart.js and papaparse to run offline.
"""
import asyncio, os, re, sys, json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / 'index.html').as_uri()
VERSION = re.search(r"const APP_VERSION = '([^']+)'", (ROOT / 'index.html').read_text(encoding='utf-8')).group(1)
LIBDIR = os.environ.get('LIBDIR')
PROFILES = {
  'placement': "{onboarded:true,path:'placement',units:'imperial',name:'Ava',modules:{newborn:false}}",
  'routine':   "{onboarded:true,path:'routine',units:'imperial',feeding:'solids',name:'Leo',modules:{visits:false,workerReports:false,newborn:false}}",
  'birth':     "{onboarded:true,path:'birth',units:'metric',feeding:'breast',sex:'f',name:'Mia'}",
}
PHONE, DESKTOP = (390, 844), (1400, 900)
results = []
def check(name, ok, detail=''):
  results.append((name, bool(ok), detail)); print(('  ✓ ' if ok else '  ✗ ') + name + (f'  [{detail}]' if detail and not ok else ''))

async def libs(route):
  u = route.request.url
  if LIBDIR and 'chart.js' in u: return await route.fulfill(path=os.path.join(LIBDIR, 'chart.js/dist/chart.umd.js'), content_type='application/javascript')
  if LIBDIR and 'papaparse' in u: return await route.fulfill(path=os.path.join(LIBDIR, 'papaparse/papaparse.min.js'), content_type='application/javascript')
  if LIBDIR: return await route.abort()
  await route.continue_()

async def open_page(browser, profile='placement', lang='en', vp=DESKTOP, touch=False, extra=None):
  ctx = await browser.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Toronto', has_touch=touch, is_mobile=touch)
  settings = {'seenVersion': VERSION, 'lang': lang, **(extra or {})}
  await ctx.add_init_script("if(!sessionStorage.t){sessionStorage.t=1;const s=%s;s.profile=%s;localStorage.setItem('bld.settings.v1',JSON.stringify(s));localStorage.setItem('bld.me.v1','{\"name\":\"Test\"}')}" % (json.dumps(settings), PROFILES[profile]))
  await ctx.route('**/*', lambda r: libs(r) if r.request.url.startswith('http') else r.continue_())
  pg = await ctx.new_page(); errs = []
  pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
  await pg.goto(PAGE); await pg.wait_for_timeout(900)
  return ctx, pg, errs

async def every_view(b):
  print('Every section renders without errors')
  for prof in PROFILES:
    for lang in ('en', 'fr'):
      for vp in (PHONE, DESKTOP):
        ctx, pg, errs = await open_page(b, prof, lang, vp)
        views = await pg.evaluate("NAV().map(t=>t.v)")
        for v in views: await pg.evaluate(f"setView('{v}')"); await pg.wait_for_timeout(250)
        check(f'{prof} · {lang} · {vp[0]}px · {len(views)} sections', not errs, '; '.join(errs[:3]))
        await ctx.close()

async def quick_log(b):
  print('Quick Log')
  ctx, pg, errs = await open_page(b, 'placement', 'en', PHONE)
  await pg.evaluate("openQuickLog()"); await pg.wait_for_timeout(200)
  groups = await pg.evaluate("[...document.querySelectorAll('.qlgrp h5')].map(h=>h.innerText.toLowerCase())")
  check('buttons are grouped', {'sleep', 'feeding', 'diapers'} <= set(groups), groups)
  await pg.locator('.preset', has_text=re.compile('^🍼\\s*Milk$')).click(); await pg.wait_for_timeout(150)
  await pg.locator('[data-for="Milk (oz)"] .chip').nth(2).click()
  fields = await pg.evaluate("[...document.querySelectorAll('#qlForm [name]')].map(e=>e.name)")
  check('Milk form has no Water field', 'Water (ml)' not in fields and 'Milk (oz)' in fields, fields)
  await pg.click('#qlForm button[type=submit]'); await pg.wait_for_timeout(300)
  row = await pg.evaluate("QUEUE.at(-1)?.row")
  check('milk saved with amount and Logged By', row and row['Category'] == 'Milk' and float(row['Milk (oz)']) == 4 and row.get('Logged By') == 'Test', row)
  await pg.evaluate("openQuickLog()"); await pg.locator('.preset', has_text=re.compile('Meal')).click(); await pg.wait_for_timeout(150)
  await pg.locator('.mealchips .chip').first.click(); await pg.wait_for_timeout(200)
  check('meal picker switches to Breakfast', await pg.input_value('#qlForm [name=Category]') == 'Breakfast')
  check('no page errors', not errs, errs[:3]); await ctx.close()

async def score_weights(b):
  print('Routine score weights')
  ctx, pg, errs = await open_page(b)
  await pg.evaluate("openSettings('score')"); await pg.wait_for_timeout(200)
  await pg.locator('[data-sw=night]').fill('50'); await pg.wait_for_timeout(100)
  check('total is capped at 100', await pg.evaluate("swTotal()") == 100)
  await pg.click('.sw-row[data-k=milk] [data-d="-5"]')
  check('lowering shows points left', '5' in await pg.inner_text('#swPool'))
  await ctx.close()

async def filters(b):
  print('Filter buttons')
  ctx, pg, errs = await open_page(b)
  for v in ('timeline', 'health', 'nutrition', 'patterns'): await pg.evaluate(f"setView('{v}')"); await pg.wait_for_timeout(200)
  bad = await pg.evaluate("NO_FILTER_CARDS.filter(sel=>{const c=document.querySelector(sel)?.closest('.card');return c&&c.querySelector('.card-head > .fbtn')})")
  check('own-window sections have no filter button', not bad, bad)
  check('timeline has the filter button', await pg.evaluate("!!document.querySelector('#v-timeline .card-head > .fbtn')"))
  await ctx.close()

async def tour(b):
  print('Guided tour')
  for lang, vp in (('en', PHONE), ('en', DESKTOP), ('fr', PHONE)):
    ctx, pg, errs = await open_page(b, 'placement', lang, vp)
    n = await pg.evaluate("tourSteps().length"); await pg.evaluate("startTour()"); await pg.wait_for_timeout(500); miss = []
    for i in range(n):
      await pg.evaluate(f"showTourStep({i})"); await pg.wait_for_timeout(120)
      r = await pg.evaluate(f"(()=>{{const s=TOUR.steps[{i}];const el=typeof s.el==='function'?s.el():(s.el?$(s.el):document.body);return el&&el.getBoundingClientRect().width>0?'':String(typeof s.title==='function'?s.title():s.title)}})()")
      if r: miss.append(r)
    await pg.evaluate("endTour()")
    check(f'{lang} · {vp[0]}px · all {n} steps find their target', not miss and not errs, miss + errs[:2]); await ctx.close()

async def day_panel(b):
  print('Day panel')
  ctx, pg, errs = await open_page(b)
  await pg.evaluate("openDrawer(todayIdx())"); await pg.wait_for_timeout(300)
  check('next is disabled on today', await pg.evaluate("$('#drNext').disabled"))
  await pg.click('#drPrev'); await pg.wait_for_timeout(500)
  check('‹ goes to yesterday', await pg.evaluate("drawerDay === todayIdx()-1"))
  await ctx.close()

async def swipes(b):
  print('Phone swipes')
  ctx, pg, errs = await open_page(b, 'placement', 'en', PHONE, touch=True)
  cdp = await ctx.new_cdp_session(pg)
  async def drag(x, y, dx, dy):
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    for i in range(1, 9): await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx * i / 8, 'y': y + dy * i / 8}]}); await pg.wait_for_timeout(20)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(550)
  await drag(300, 500, -220, 0); check('swipe left: Today → Timeline', await pg.evaluate("VIEW") == 'timeline')
  await pg.evaluate("setView('today')"); await pg.wait_for_timeout(200); await drag(90, 500, 220, 0)
  check('swipe right at Today stays on Today', await pg.evaluate("VIEW") == 'today')
  await pg.evaluate("openQuickLog()"); await pg.wait_for_timeout(300)
  hd = await pg.evaluate("(()=>{const r=document.querySelector('#qlog header').getBoundingClientRect();return [r.x+60,r.y+r.height/2]})()")
  await drag(hd[0], hd[1], 0, 300); check('swipe Quick Log down closes it', not await pg.evaluate("$('#qlog').classList.contains('on')"))
  check('no page errors', not errs, errs[:3]); await ctx.close()

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    for t in (every_view, quick_log, score_weights, filters, tour, day_panel, swipes): await t(b)
    await b.close()
  bad = [r for r in results if not r[1]]
  print(f'\n{len(results) - len(bad)} / {len(results)} checks passed' + (f' · FAILED: {", ".join(r[0] for r in bad)}' if bad else ''))
  sys.exit(1 if bad else 0)

asyncio.run(main())
