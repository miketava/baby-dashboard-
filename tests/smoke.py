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
  'birth':     "{onboarded:true,path:'birth',units:'metric',feeding:'breast',sex:'f',name:'Mia',modules:{schedule:false,visits:false,workerReports:false,food:false,hydration:false,cocooning:false,familyContact:false,checkins:false}}",   # as the setup wizard sets it
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
  await pg.locator('.preset', has_text=re.compile('^🍼\\s*Milk$')).last.click(); await pg.wait_for_timeout(150)
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

async def templates_and_appointments(b):
  print('Template library and calendar appointments')
  ctx, pg, errs = await open_page(b)
  ids = await pg.evaluate("S.templates.map(t=>t.id)")
  check('placement path gets visit and appointment days', {'early-visit', 'late-visit', 'midday-visit', 'afternoon-visit', 'appt-am', 'appt-midday', 'appt-pm'} <= set(ids), ids)
  picks = []
  for st in ('09:00', '11:00', '12:00', '14:30'):
    picks.append(await pg.evaluate(f"(DATA.base.planned=[{{date:isoOf(todayIdx()+1),start:'{st}',end:'{st}'}}], templateFor({{D:todayIdx()+1}}).id)"))
  check('visits pick early / late / midday / afternoon by start time', picks == ['early-visit', 'late-visit', 'midday-visit', 'afternoon-visit'], picks)
  await pg.evaluate("DATA.base.planned=[]; DATA.base.appts=[{id:'t1',date:isoOf(todayIdx()),start:'14:30',end:'15:15',title:'Dentiste',calendar:'Famille'},{id:'t2',date:isoOf(todayIdx()+1),start:'10:00',end:'10:30',title:'Médecin',calendar:'Parent'}]; analyze(); renderAll(); setView('today')")
  await pg.wait_for_timeout(300)
  check('new appointments are asked about in the banner', await pg.locator('[data-appt=t1][data-v=yes]').count() == 1)
  await pg.locator('[data-appt=t1][data-v=yes]').first.click(); await pg.wait_for_timeout(200)
  check('an accepted afternoon appointment picks its template', await pg.evaluate("templateFor({D:todayIdx()}).id") == 'appt-pm')
  await pg.locator('[data-appt=t2][data-v=ignore]').first.click(); await pg.wait_for_timeout(200)
  check('ignoring a calendar clears its questions', await pg.evaluate("apptPending().length") == 0)
  await pg.evaluate("DATA.base.appts=[{id:'h1',date:isoOf(todayIdx()+1),start:'14:00',end:'15:00',title:'Visite TS à domicile',calendar:'Famille',home:true}]; S.apptFor={h1:'main'}; analyze()")
  hv = await pg.evaluate("(()=>{const t=templateFor({D:todayIdx()+1}), b=tplById('baseline'); const v=t.items.find(i=>i.home); return [t.id, t.items.filter(i=>i.kind==='nap').map(i=>i.start).join()===b.items.filter(i=>i.kind==='nap').map(i=>i.start).join(), v&&v.start, v&&/Nap 2/.test(v.note)]})()")
  check('a home visit keeps the usual naps and flags the overlap', hv == ['home-visit', True, '14:00', True], hv)
  check('no page errors', not errs, errs[:3]); await ctx.close()
  for prof, want in (('routine', {'baseline', 'appt-am', 'appt-midday', 'appt-pm'}), ('birth', {'baseline'})):
    ctx, pg, errs = await open_page(b, prof)
    got = set(await pg.evaluate("S.templates.map(t=>t.id)"))
    check(f'{prof} path: no visit templates', got == want, sorted(got)); await ctx.close()

async def settling(b):
  print('Going up vs. asleep, soothing, time nudges')
  ctx, pg, errs = await open_page(b, 'placement', 'en', PHONE)
  st = await pg.evaluate("(()=>{const e=DATA.events.find(e=>e.k==='nap'&&!/car/i.test(e.cat)&&e.t!=null&&e.settleHow==='assumed');return e?[e.so-e.s, e.dur, e.t-e.s]:null})()")
  check('a nap without an asleep time settles 15 min after going up', st and st[0] == 15 and st[1] == st[2] - 15, st)
  await pg.evaluate("openQuickLogWith({Date:isoOf(todayIdx()),Category:'Sleep - Nap','Start Time':'09:57','End Time':'11:20'})"); await pg.wait_for_timeout(200)
  for n in ('10', '-1', '-1', '5'): await pg.locator(f'#qlForm [data-for="Start Time"] [data-nudge="{n}"]').click()
  check('time nudges add up (09:57 +10 −1 −1 +5 = 10:10)', await pg.input_value('#qlForm [name="Start Time"]') == '10:10')
  await pg.fill('#qlForm [name="Start Time"]', '09:57'); await pg.locator('#qlForm [data-after="15"]').click()
  check('+15 after going up fills 10:12', await pg.input_value('#qlForm [name="Asleep At"]') == '10:12')
  await pg.locator('#qlForm .ctchips [data-tag=rocking]').click(); await pg.click('#qlForm button[type=submit]'); await pg.wait_for_timeout(400)
  e = await pg.evaluate("(()=>{const e=DATA.events.filter(x=>x.local&&isSleep(x)).at(-1);return e?[e.so-e.s,e.dur,e.tags.includes('rocking')]:null})()")
  check('logged asleep time and soothing tag are used', e == [15, 68, True], e)
  check('no page errors', not errs, errs[:3]); await ctx.close()

async def connect(b):
  print('Connecting: claim, another phone, viewer keys, script update (script v1.7)')
  EP = 'https://script.google.com/macros/s/TESTDEPLOY/exec'
  st = {'secret': None, 'viewers': {}, 'posts': []}
  async def fake(route):
    req = route.request
    if req.method == 'POST':
      body = json.loads(req.post_data or '{}'); st['posts'].append(body.get('action')); a = body.get('action')
      if a == 'claim':
        if st['secret']: r = {'ok': False, 'claimed': True, 'error': 'already'}
        else: st['secret'] = body['secret']; st['viewers'] = body.get('viewers') or {}; r = {'ok': True}
      elif body.get('token') != st['secret']: r = {'ok': False, 'error': 'Unauthorized: token mismatch'}
      elif a == 'viewers': st['viewers'] = body.get('viewers') or {}; r = {'ok': True}
      elif a == 'selfUpdate': r = {'ok': 'function doGet(' in body['files']['Code'] and 'sendReminders' in body['files'].get('Reminders', ''), 'version': '1.7'}
      else: r = {'ok': True}
    else:
      tok = re.search(r'[?&]token=([^&]*)', req.url); tok = tok.group(1) if tok else ''
      cb = re.search(r'[?&]callback=([^&]*)', req.url)
      if not st['secret']: r = {'ok': False, 'unclaimed': True, 'scriptVersion': '1.8'}
      elif tok != st['secret']: r = {'ok': False, 'error': 'Unauthorized: token mismatch'}
      else: r = {'ok': True, 'headers': ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Category', 'Milk (oz)', 'Notes'], 'rows': [], 'scriptVersion': '1.8', 'selfUpdate': True, 'config': {}, 'meds': None}
      if cb: return await route.fulfill(body=f'{cb.group(1)}({json.dumps(r)})', content_type='application/javascript')
    await route.fulfill(body=json.dumps(r), content_type='application/json', headers={'Access-Control-Allow-Origin': '*'})
  ctx, pg, errs = await open_page(b, 'placement', 'en', PHONE)
  await pg.route('https://script.google.com/**', fake)
  await pg.evaluate(f"S.endpoint={json.dumps(EP)}; S.token=''; saveSettings()")
  ok = await pg.evaluate("syncLive({quiet:true})")
  tok = await pg.evaluate("S.token")
  check('a new script is claimed with a generated secret', ok and st['secret'] == tok and len(tok) >= 16, [ok, st['posts']])
  check('then the dashboard syncs live', await pg.evaluate("DATA.source") == 'live')
  await pg.evaluate("openSettings('source')"); await pg.wait_for_timeout(200)
  check('Data source shows “Connect another phone”', await pg.locator('[data-act=connectLink]').count() == 1)
  link = await pg.evaluate("connectLink()")
  ctx2 = await b.new_context(viewport={'width': PHONE[0], 'height': PHONE[1]})
  await ctx2.add_init_script("if(!sessionStorage.t){sessionStorage.t=1;localStorage.setItem('bld.settings.v1',JSON.stringify({seenVersion:%s,lang:'en',profile:%s}))}" % (json.dumps(VERSION), PROFILES['placement']))
  await ctx2.route('**/*', lambda r: libs(r) if r.request.url.startswith('http') and 'script.google' not in r.request.url else r.continue_())
  await ctx2.route('https://script.google.com/**', fake)
  pg2 = await ctx2.new_page(); await pg2.goto(PAGE + link[link.index('#'):]); await pg2.wait_for_timeout(1200)
  got = await pg2.evaluate("[S.endpoint, S.token, location.hash, DATA.source]")
  check('the connect link sets up another phone and leaves the address bar', got == [EP, tok, '', 'live'], got)
  await pg2.evaluate("S.endpoint=''; S.token=''; saveSettings(); openSettings('source')"); await pg2.wait_for_timeout(200)
  await pg2.fill('#connectPaste', 'Here you go: ' + link); await pg2.locator('[data-act=connectPaste]').click(); await pg2.wait_for_timeout(800)
  got = await pg2.evaluate("[S.endpoint, S.token, DATA.source]")
  check('a pasted connect link (iPhone Home Screen app) connects too', got == [EP, tok, 'live'], got); await ctx2.close()
  await pg.evaluate("openSettings('sharing')"); await pg.wait_for_timeout(200)
  await pg.locator('[data-act=vCreate]').click(); await pg.wait_for_timeout(400)
  key = await pg.evaluate("S.share.viewers.at(-1).key")
  check('a new viewer key is pushed to the script', key in st['viewers'] and st['viewers'][key]['exclude'], st['viewers'])
  check('no “paste this line” steps on script v1.7', await pg.locator('[data-act=vCopy]').count() == 0)
  pg.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
  await pg.locator('[data-act=vRemove]').last.click(); await pg.wait_for_timeout(400)
  check('removing it revokes it on the script', key not in st['viewers'])
  pg.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
  await pg.evaluate("updateScript()"); await pg.wait_for_timeout(300)
  check('Update script sends the code and reminders this dashboard carries', 'selfUpdate' in st['posts'])
  check('the copied script holds no secret', await pg.evaluate("!/const SECRET\\s*=\\s*'/.test(APPS_SCRIPT) && APPS_MANIFEST.includes('script.deployments')"))
  check('no page errors', not [e for e in errs if 'Failed to load resource' not in e], errs[:3]); await ctx.close()

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    for t in (every_view, quick_log, score_weights, filters, tour, day_panel, swipes, templates_and_appointments, settling, connect): await t(b)
    await b.close()
  bad = [r for r in results if not r[1]]
  print(f'\n{len(results) - len(bad)} / {len(results)} checks passed' + (f' · FAILED: {", ".join(r[0] for r in bad)}' if bad else ''))
  sys.exit(1 if bad else 0)

if __name__ == '__main__': asyncio.run(main())
