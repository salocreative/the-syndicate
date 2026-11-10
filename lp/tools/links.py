"""Link check for the prototype. Run after the build: python3 tools/links.py
Every href in dist/*.html must point at a page that exists, every #anchor at an id on that page,
every image src and srcset candidate, stylesheet, script and preload at a file, every url() in the shared
stylesheet at a file, and every page must be reachable from index.html."""
import pathlib,re,sys,html
R=pathlib.Path(__file__).resolve().parent.parent/'dist'
pages={p.name:p.read_text() for p in R.glob('*.html') if not p.name.startswith('home-')}
ids={n:set(re.findall(r'\sid="([^"]+)"',t)) for n,t in pages.items()}
bad=[];edges={n:set() for n in pages}
for n,t in pages.items():
    for h in re.findall(r'<a\b[^>]*?\shref="([^"]+)"',t):
        h=html.unescape(h)
        if re.match(r'(https?:|mailto:|tel:)',h):continue
        f,_,a=h.partition('#');f=f.split('?')[0] or n
        if f not in pages:bad.append(f'{n}: link to missing page {h}');continue
        edges[n].add(f)
        if a and a not in ids[f]:bad.append(f'{n}: missing anchor {h}')
    files=re.findall(r'<img[^>]+?\ssrc="([^"]+)"',t)+re.findall(r'<(?:link|script)[^>]+?(?:href|src)="([^"]+)"',t)
    for ss in re.findall(r'srcset="([^"]+)"',t):files+=[c.strip().split()[0] for c in ss.split(',') if c.strip()]
    for s in files:
        if s.startswith(('data:','http')) or s.endswith('.html'):continue
        if not (R/s.split('?')[0]).exists():bad.append(f'{n}: missing file {s}')
css=(R/'assets/site.css').read_text() if (R/'assets/site.css').exists() else ''
for u in re.findall(r'url\(([^)]+)\)',css):
    u=u.strip('\'"')
    if u.startswith(('data:','#')) or '(' in u:continue
    if not (R/'assets'/u).exists():bad.append(f'site.css: missing file {u}')
seen={'index.html'};todo=['index.html']
while todo:
    for m in edges[todo.pop()]:
        if m not in seen:seen.add(m);todo.append(m)
for n in pages:
    # the thank-you page is reached by the form's redirect, not a link
    if n not in seen and n not in ('404.html','thank-you.html'):bad.append(f'{n}: not reachable from the home page')
for b in bad:print(b)
print('links:', 'pass' if not bad else f'{len(bad)} problems', f'({len(pages)} pages)')
sys.exit(1 if bad else 0)
