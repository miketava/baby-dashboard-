"""Badge checks (Playwright + Chromium): engine rules, retroactive dates, catch-up toasts, unlock pop-up, hide, viewer keys.

  python tests/badges.py            # LIBDIR=/path/to/node_modules to run offline, like smoke.py
"""
import asyncio, sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from smoke import open_page, check, results, PHONE, DESKTOP, async_playwright

SHOTS = os.environ.get('SHOTS')

async def engine(b):
  print('Engine')
  ctx, pg, errs = await open_page(b, 'routine')
  # Synthetic log: replace the demo with known rows, as a CSV (persisted like a live Sheet).
  rows = [
    ['2026-03-02', '07:00', '', 'Diaper - Wet', '', '', 'Test', '2026-03-02 07:03:00'],
    ['2026-03-02', '07:00', '', 'Diaper - Poop', '', '', 'Test', '2026-03-02 07:03:00'],   # same change → not a double
    ['2026-03-02', '07:40', '', 'Diaper - Wet', '', '', 'Sam', '2026-03-02 07:41:00'],     # 40 min later → Double Duty
    ['2026-03-02', '08:00', '', 'Breakfast', 'eggs, toast, new-food', '', 'Test', '2026-03-02 08:30:00'],
    ['2026-03-03', '12:00', '', 'Lunch', 'Raspberries, pastina, egg', '', 'Test', '2026-03-03 02:10:00'],   # Night Owl (logged 02:10)
    ['2026-03-04', '20:00', '06:30', 'Sleep - Night', '', '', 'Test', '2026-03-05 06:35:00'],               # 10.5 h stretch, on the dot
    ['2026-03-05', '13:00', '14:00', 'Sleep - Car Nap', '', '', 'Sam', ''],
    ['2026-03-05', '09:00', '', 'Milk', '', '5', 'Sam', ''],
  ]
  csv = 'Date,Start Time,End Time,Category,Tags,Milk (oz),Logged By,Logged At\n' + '\n'.join(','.join(f'"{c}"' for c in r) for r in rows)
  await pg.evaluate("csv => { localStorage.removeItem('bld.achSeen.v1'); ACHSEEN = {}; const p = parseCSVText(csv); ingest(p, 'csv', 't.csv'); }", csv)
  await pg.wait_for_timeout(300)
  got = await pg.evaluate("Object.fromEntries(ACH.list.map(r => [r.a.id, { v: +r.value.toFixed(3), n: r.earned, at: r.tiers.map(t => t.at == null ? null : isoOf(Math.floor(t.at/1440)) + ' ' + fmtTime(t.at % 1440)) }]))")
  check('foods count once each (eggs = egg, raspberries case-folded, new-food ignored)', got['foods']['v'] == 4, got['foods'])
  check('Rainbow Plate: best Monday–Sunday week', got['rainbow']['v'] == 4, got['rainbow'])
  check('Double Duty: wet + poop at the same moment is one change, 40 min later counts', got['doubleduty']['v'] == 1, got['doubleduty'])
  check('Long Haul: 10.5 h night → 4 tiers, dated at the wake-up', got['longhaul']['n'] == 4 and got['longhaul']['at'][3] == '2026-03-05 06:30', got['longhaul'])
  check('Night Owl counts the 02:10 entry', got['nightowl']['v'] == 1, got['nightowl'])
  check('On the Dot: within 10 min of start or end', got['ondot']['v'] == 4, got['ondot'])
  check('Tag Team: second caregiver’s entries', got['tagteam']['v'] == 3, got['tagteam'])
  check('Road Trip counts the car nap, Nap Collector does not', got['roadtrip']['v'] == 1 and got['naps']['v'] == 0)
  check('Scribe Bronze dated at the 5th entry (retroactive, not today)', got['scribe']['at'][0] == '2026-03-03 12:00', got['scribe'])
  check('Daily Habit: 4 days in a row', got['habit']['v'] == 4 and got['habit']['n'] == 1, got['habit'])
  check('Allergens: egg + wheat', got['allergens']['v'] == 2, got['allergens'])
  check('Milk shows in oz (imperial)', await pg.evaluate("achFmt(achById('milk'), ACH.list.find(r=>r.a.id==='milk').value)") == '5 oz')
  ths = await pg.evaluate("ACH.list.find(r=>r.a.id==='milk').tiers.map(t=>achFmt(achById('milk'), t.th))")
  check('milk tiers in round ounces', ths == ['350 oz', '1,700 oz', '8,500 oz', '34,000 oz'], ths)
  ids = [x for x in got]
  check('Routine path: no breastfeeding badge', 'nurse' not in ids)
  stored = await pg.evaluate("S.badges.earned")
  check('earned dates are saved (so deleting rows never takes a badge away)', 'H' in stored and stored['H'].get('scribe'), stored)
  # Delete rows → badge stays
  await pg.evaluate("csv => { const p = parseCSVText(csv.split('\\n').slice(0,3).join('\\n')); ingest(p, 'csv', 't.csv'); }", csv)
  kept = await pg.evaluate("ACH.list.find(r=>r.a.id==='scribe').earned")
  check('Scribe Bronze kept after rows are deleted', kept == 1, kept)
  # Catch-up toasts were queued on first sight
  await pg.wait_for_timeout(1500)
  check('catch-up toasts appear one after another', await pg.locator('.achtoast').count() >= 1)
  await pg.evaluate("for (let i = 0; i < 5; i++) achFiddle(); reingest()"); await pg.wait_for_timeout(200)
  f = await pg.evaluate("(r => ({ v: r.value, n: r.earned }))(ACH.list.find(r => r.a.id === 'fiddle'))")
  check('Fiddle Faddler: 5 forced refreshes → Bronze', f == {'v': 5, 'n': 1}, f)
  check('Fiddle Faddler stays on this phone (not in Config)', not await pg.evaluate("!!S.badges.earned.H?.fiddle?.length"))
  n0 = await pg.evaluate("FIDDLE.n"); await pg.reload(); await pg.wait_for_timeout(900)
  check('a page reload (pull down) counts as a forced refresh', await pg.evaluate("FIDDLE.n") == n0 + 1)
  await pg.click('#btnRefresh'); await pg.wait_for_timeout(200)
  check('the ↻ button counts too', await pg.evaluate("FIDDLE.n") == n0 + 2)
  check('no page errors', not errs, errs[:3])
  await ctx.close()

async def placement_and_ui(b):
  print('Paths, view, pop-ups')
  ctx, pg, errs = await open_page(b, 'placement', 'en', PHONE, touch=True)
  ids = await pg.evaluate("computeAchievements().list.map(r=>r.a.id)")
  check('Adoption path: no breastfeeding badge', 'nurse' not in ids)
  await pg.evaluate("setView('awards')"); await pg.wait_for_timeout(500)
  n = await pg.locator('#awardsRoot .achc').count()
  check('badges grid renders', n >= 15, n)
  check('demo data shows a note and never toasts', await pg.locator('#awardsRoot .callout').count() == 1 and await pg.locator('.achtoast').count() == 0)
  if SHOTS: await pg.screenshot(path=f'{SHOTS}/grid-phone.png', full_page=False)
  await pg.locator('#awardsRoot .achc').first.click(); await pg.wait_for_timeout(400)
  check('tap opens the details pop-up', await pg.locator('#achPop.on .achtiers tr').count() >= 3)
  if SHOTS: await pg.screenshot(path=f'{SHOTS}/detail-phone.png')
  await pg.locator('#achPop [data-achclose]').first.click(); await pg.wait_for_timeout(300)
  # Press and hold → hidden
  first = await pg.locator('#awardsRoot .achgrid .achc').first.get_attribute('data-ach')
  box = await pg.locator(f'#awardsRoot [data-ach={first}]').bounding_box()
  await pg.mouse.move(box['x'] + 20, box['y'] + 20)
  await pg.dispatch_event(f'#awardsRoot [data-ach={first}]', 'pointerdown', {'pointerType': 'touch', 'clientX': box['x'] + 20, 'clientY': box['y'] + 20})
  await pg.wait_for_timeout(700)
  await pg.dispatch_event('body', 'pointerup', {'pointerType': 'touch'})
  check('press and hold hides a badge', await pg.locator('.achhid [data-ach=%s]' % first).count() == 1)
  check('pop-up stays closed after a long press', not await pg.locator('#achPop.on').count())
  # Unlock celebration
  await pg.evaluate("achQueueUnlock(ACH.list.find(r => r.earned >= 2))"); await pg.wait_for_timeout(1300)
  check('unlock pop-up shows the ring, tier and pips', await pg.locator('#achPop.on .achbox.unlock .achpips i.on').count() >= 2)
  if SHOTS: await pg.screenshot(path=f'{SHOTS}/unlock-phone.png')
  await pg.wait_for_timeout(1200)
  if SHOTS: await pg.screenshot(path=f'{SHOTS}/unlock-phone-2.png')
  await pg.evaluate("achClosePop()")
  # Catch-up toasts
  await pg.evaluate("achQueueCatchUp(ACH.list.filter(r=>r.earned).slice(0,3))"); await pg.wait_for_timeout(700)
  if SHOTS: await pg.screenshot(path=f'{SHOTS}/toast-phone.png')
  check('catch-up toast with Skip all', await pg.locator('.achtoast .skip').count() == 1)
  await pg.wait_for_selector('.achtoast.sum', timeout=8000)
  bg = await pg.evaluate("getComputedStyle(document.querySelector('.achtoast.sum')).backgroundColor")
  check('summary toast is opaque', bg in ('rgb(255, 255, 255)',), bg)
  await pg.wait_for_timeout(600)
  if SHOTS: await pg.screenshot(path=f'{SHOTS}/summary-phone.png')
  check('no page errors', not errs, errs[:3])
  await ctx.close()
  for lang in ('fr',):
    ctx, pg, errs = await open_page(b, 'birth', lang, DESKTOP)
    await pg.evaluate("setView('awards')"); await pg.wait_for_timeout(600)
    ids = await pg.evaluate("ACH.list.map(r=>r.a.id)")
    check('Newborn path: breastfeeding and tummy time badges, no food badges', 'nurse' in ids and 'tummy' in ids and 'foods' not in ids, ids)
    check('French labels', 'Badges' in await pg.inner_text('#awardsRoot h2') and 'paliers' in await pg.inner_text('#awardsRoot .sub'))
    if SHOTS: await pg.screenshot(path=f'{SHOTS}/grid-desktop-fr.png', full_page=True)
    check('no page errors (fr, desktop)', not errs, errs[:3])
    await ctx.close()

async def viewer(b):
  print('Viewer keys')
  ctx, pg, errs = await open_page(b, 'placement')
  await pg.evaluate("DATA.viewer = { excluded: [] }; applyModules()")
  check('viewer keys: no Badges section and no badge module', not await pg.evaluate("NAV().some(t=>t.v==='awards') || mod('badges')"))
  await ctx.close()

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
    for t in (engine, placement_and_ui, viewer): await t(b)
    await b.close()
  bad = [r for r in results if not r[1]]
  print(f'\n{len(results) - len(bad)}/{len(results)} passed'); sys.exit(1 if bad else 0)

if __name__ == '__main__': asyncio.run(main())
