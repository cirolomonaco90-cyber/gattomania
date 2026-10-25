#!/usr/bin/env python3
"""Genera le immagini per Google Play e App Store (icona, grafica di presentazione, screenshot)
usando il gioco vero. Uso: python3 tools/make-store-assets.py
Richiede: pip install playwright && playwright install chromium"""
import json
import os
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'app' / 'src' / 'main' / 'assets'
OUT = ROOT / 'store'
OUT.mkdir(exist_ok=True)
INDEX = 'file://' + str(ASSETS / 'index.html')
CREATURES = 'file://' + str(ASSETS / 'creatures.js')

ICON_HTML = """<html><body style="margin:0;width:512px;height:512px;background:linear-gradient(160deg,#7b4dff,#b24dff 55%,#ff6fa8);display:grid;place-items:center;overflow:hidden">
<div id="m" style="width:380px;height:380px;filter:drop-shadow(0 14px 0 rgba(43,33,64,.28))"></div>
<script src="__C__"></script><script>document.getElementById('m').innerHTML=Creatures.svg(0,'happy');</script></body></html>""".replace("__C__", CREATURES)

FEATURE_HTML = """<html><body style="margin:0;width:1024px;height:500px;background:linear-gradient(160deg,#7b4dff,#b24dff 55%,#ff6fa8);position:relative;overflow:hidden;font-family:'Trebuchet MS','Arial Rounded MT Bold',system-ui,sans-serif">
<div style="position:absolute;left:60px;top:120px;color:#fff;font-weight:900;font-size:128px;line-height:.95;letter-spacing:2px;text-shadow:0 6px 0 #3b1d94,0 12px 0 rgba(43,33,64,.35);-webkit-text-stroke:3px #3b1d94;paint-order:stroke fill">Mostrilli</div>
<div style="position:absolute;left:66px;top:290px;color:#fff;font-weight:800;font-size:38px;text-shadow:0 3px 0 rgba(43,33,64,.4)">__T__</div>
<div id="r"></div>
<script src="__C__"></script>
<script>
var pos=[[600,40,150,3],[790,130,170,0],[560,250,170,6],[740,300,160,1],[880,10,130,2]];
var h='';pos.forEach(function(p){h+='<div style="position:absolute;left:'+p[0]+'px;top:'+p[1]+'px;width:'+p[2]+'px;height:'+p[2]+'px;filter:drop-shadow(0 10px 0 rgba(43,33,64,.25))">'+Creatures.svg(p[3],'happy')+'</div>';});
document.getElementById('r').innerHTML=h;
</script></body></html>"""


def init_script(day_offset_streak=5, level=13):
    state = {
        'seenTutorial': True, 'level': level, 'streak': day_offset_streak, 'hints': 3, 'sound': False,
        'stars': {('L%d' % i): 3 for i in range(1, level)},
    }
    return """(function(){
      var d=new Date(); var day=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
      var s=%s; s.lastDaily=day-1; localStorage.setItem('mostrilli_v1', JSON.stringify(s));
    })();""" % json.dumps(state)


def shots(p, locale, folder, size=(360, 640)):
    """size e' in punti CSS: x3 = pixel finali (360x640 -> 1080x1920 Play; 430x932 -> 1290x2796 App Store)."""
    out = OUT / folder
    out.mkdir(exist_ok=True)
    b = p.chromium.launch(args=['--allow-file-access-from-files'])
    ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=3, has_touch=True, locale=locale)
    ctx.add_init_script(init_script())
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))

    pg.goto(INDEX); pg.wait_for_timeout(900)
    pg.screenshot(path=str(out / '1-home.png'))

    # livello con plancia grande, a meta' risolto
    pg.evaluate("__gm.startGame('level', 12)"); pg.wait_for_timeout(700)
    sol = pg.evaluate("__gm.state().solution"); n = len(sol)
    for r in range(0, n - 3):
        pg.evaluate("(()=>{__gm.tapCell(%d,%d);__gm.tapCell(%d,%d);})()" % (r, sol[r], r, sol[r]))
    pg.evaluate("__gm.tapCell(%d,%d)" % (n - 1, (sol[n - 1] + 2) % n))
    pg.evaluate("__gm.state().elapsed = 47000")
    pg.wait_for_timeout(900)
    pg.screenshot(path=str(out / '2-gioco.png'))

    # errore: mostrilli preoccupati
    row = n - 2
    wrong = (sol[0] + 1) % n if (sol[0] + 1) % n != sol[row] else (sol[0] + 3) % n
    pg.evaluate("(()=>{__gm.tapCell(%d,%d);__gm.tapCell(%d,%d);})()" % (row, wrong, row, wrong))
    pg.evaluate("(()=>{__gm.tapCell(%d,%d);__gm.tapCell(%d,%d);})()" % (row, (wrong + 2) % n, row, (wrong + 2) % n))
    pg.wait_for_timeout(600)
    pg.screenshot(path=str(out / '3-errore.png'))

    # mostro del giorno risolto -> schermata di vittoria con coriandoli
    pg.evaluate("__gm.startGame('daily', Math.floor(Date.UTC(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())/86400000))")
    pg.wait_for_timeout(700)
    sol = pg.evaluate("__gm.state().solution"); n = len(sol)
    for r in range(n):
        pg.evaluate("(()=>{__gm.tapCell(%d,%d);__gm.tapCell(%d,%d);})()" % (r, sol[r], r, sol[r]))
        if r == 0:
            pg.evaluate("__gm.state().elapsed = 58000")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / '4-vittoria.png'))
    b.close()
    return errors


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--allow-file-access-from-files'])
        pg = b.new_page(viewport={'width': 512, 'height': 512})
        icon_file = OUT / '_icon.html'; icon_file.write_text(ICON_HTML)
        pg.goto('file://' + str(icon_file)); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / 'icona-512.png'))
        pg2 = b.new_page(viewport={'width': 1024, 'height': 500})
        feat_file = OUT / '_feature.html'
        feat_file.write_text(FEATURE_HTML.replace('__T__', 'Il puzzle dei mostriciattoli').replace('__C__', CREATURES))
        pg2.goto('file://' + str(feat_file)); pg2.wait_for_timeout(300)
        pg2.screenshot(path=str(OUT / 'grafica-1024x500.png'))
        b.close()
        icon_file.unlink(); feat_file.unlink()
        errs = shots(p, 'it-IT', 'screenshot-it') + shots(p, 'en-US', 'screenshot-en')
        # iPhone 6,9" (App Store Connect)
        errs += shots(p, 'it-IT', 'iphone-it', (430, 932)) + shots(p, 'en-US', 'iphone-en', (430, 932))
    print('Errori JS:', errs or 'nessuno')
    for f in sorted(os.listdir(OUT)):
        print(' ', f)


if __name__ == '__main__':
    main()
