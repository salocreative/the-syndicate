#!/usr/bin/env python3
"""One-file clickable preview of a skinned guidelines site, for checking inside Claude.

    python3 tools/preview.py <site folder> <output.html>

Inlines images and fonts, embeds the reference kit (and the Concept review tab, if it's on) in overlays,
and keeps every link working. The live site doesn't use this file; it's for review only, so it's much
heavier than the site. In the preview, Concept review comments save in the browser only."""
import re, base64, sys, os
R = os.path.abspath(sys.argv[1]) + '/'; OUT = sys.argv[2]
mime = {'svg': 'image/svg+xml', 'png': 'image/png', 'webp': 'image/webp', 'woff2': 'font/woff2', 'jpg': 'image/jpeg'}

def uri(path):
    if not os.path.exists(R + path): print('missing, left as a link:', path); return path
    ext = path.rsplit('.', 1)[1].lower()
    return f'data:{mime[ext]};base64,' + base64.b64encode(open(R + path, 'rb').read()).decode()

def inline(t, up=''):
    t = re.sub(r'<link rel="preload"[^>]*>\n?', '', t)
    t = re.sub(r'(src|href)="' + re.escape(up) + r'(assets/[^"]+\.(?:svg|png|webp))"', lambda m: f'{m.group(1)}="{uri(m.group(2))}"', t)
    return re.sub(r'url\(' + re.escape(up) + r'(assets/[^)]+\.(?:svg|png|webp|woff2))\)', lambda m: f'url("{uri(m.group(1))}")', t)

def b64(s): return base64.b64encode(s.encode('utf-8')).decode()

# Links inside an overlay talk to the main page instead of navigating
LINKS = '''<script>document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const h=a.getAttribute('href');
if(h.startsWith('index.html')){e.preventDefault();parent.postMessage({brandGo:h.split('#')[1]||'home'},'*');}
else if(h==='reference-kit.html'||h==='concept-review.html'){e.preventDefault();parent.postMessage({brandOpen:h},'*');}},true);</script>'''

def overlay(name, t):
    i = t.rindex('</body>'); return t[:i] + LINKS + '\n' + t[i:]

guide = os.path.exists(R + 'index.html')   # reference mode (a supplied brand) has only the kit
if guide:
    g = open(R + 'index.html').read()
    emb = "<script>window.__EMBED_IMAGES__={%s};</script>" % ','.join("'%s':'%s'" % (('logo' if f == 'logo.png' else f), uri('assets/email/' + f)) for f in sorted(os.listdir(R + 'assets/email')) if f.endswith('.png'))
    g = inline(g).replace('<script>', emb + '\n<script>', 1)
    pages = {'reference-kit.html': overlay('kit', inline(open(R + 'reference-kit.html').read()))}
else:
    g = inline(open(R + 'reference-kit.html').read()); pages = {}
if os.path.exists(R + 'concept-review.html'):
    home = inline(open(R + 'concept/home.html').read(), '../')
    if os.path.exists(R + 'concept/review.js'):
        home = home.replace('<script src="review.js" defer></script>', '<script>' + open(R + 'concept/review.js').read().replace('</script', '<\\/script') + '</script>')
    cr = inline(open(R + 'concept-review.html').read())
    # The preview holds the homepage only: drop the page list so the review runs as a single page
    cr = re.sub(r'<!-- Every concept page and its sections[^\n]*\n<script src="concept/manifest.js"></script>\n?', '', cr)
    cr = cr.replace('src="concept/home.html"', 'data-home')
    cr = cr.replace('</body>', '<script type="text/plain" id="home-src">' + b64(home) + '''</script>
<script>(()=>{const s=document.getElementById('home-src').textContent.trim(),bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
document.getElementById('concept').srcdoc=new TextDecoder().decode(u);})();</script>
</body>''', 1)
    pages['concept-review.html'] = overlay('cr', cr)

shell = '<style>.pv{position:fixed;inset:0;z-index:1000;width:100%;height:100%;border:0;background:#fff;display:none}.pv.on{display:block}</style>\n'
for n, (name, html) in enumerate(pages.items()):
    shell += f'<iframe class="pv" id="pv{n}" data-page="{name}" title="{name}"></iframe>\n<script type="text/plain" id="pv{n}-src">{b64(html)}</script>\n'
shell += '''<script>
(()=>{const fs=[...document.querySelectorAll('iframe.pv')],done=new Set();
const open=name=>{fs.forEach(f=>{const on=f.dataset.page===name;if(on&&!done.has(f.id)){const bin=atob(document.getElementById(f.id+'-src').textContent.trim());const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);f.srcdoc=new TextDecoder().decode(u);done.add(f.id);}f.classList.toggle('on',on)});document.body.style.overflow='hidden';};
const close=()=>{fs.forEach(f=>f.classList.remove('on'));document.body.style.overflow='';};
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||!fs.some(f=>f.dataset.page===a.getAttribute('href')))return;e.preventDefault();e.stopPropagation();open(a.getAttribute('href'));},true);
addEventListener('message',e=>{if(!e.data)return;if(e.data.brandOpen){if(fs.some(f=>f.dataset.page===e.data.brandOpen))open(e.data.brandOpen);else close();return}
  if(e.data.brandGo){close();const id=e.data.brandGo;try{history.pushState(null,'','#'+id)}catch(_){}if(window.brandRoute)window.brandRoute(id);else location.hash='#'+id;}});})();
</script>
'''
i = g.rindex('</body>'); g = g[:i] + shell + g[i:]
open(OUT, 'w').write(g); print(OUT, len(g) // 1024, 'KB')
