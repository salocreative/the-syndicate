"""One-file preview of the Concept review for chat: the review page with the concept inside it, everything inlined.
Run after tools/concept.py:  python3 tools/preview-one.py <guidelines site> <out.html>
- Stylesheets, scripts, fonts and photos are inlined as data, so nothing is fetched (a chat preview can't see folders).
- Photos use one mid-size copy each (not the full srcset) to keep the file a few MB.
- The concept goes in the frame as srcdoc; the form's redirect writes the thank-you page into the frame instead of navigating.
Preview only: the hosted review uses the normal files."""
import base64,mimetypes,pathlib,re,sys,json
site=pathlib.Path(sys.argv[1]).resolve();out=pathlib.Path(sys.argv[2])
C=site/'concept'
def data(p,mime=None):
    p=pathlib.Path(p);m=mime or mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
    if p.suffix=='.webp':m='image/webp'
    if p.suffix=='.woff2':m='font/woff2'
    return f'data:{m};base64,'+base64.b64encode(p.read_bytes()).decode()
def pick(srcset,base):
    """One copy from a srcset: about 1200px wide, or the largest below it."""
    best=None
    for part in srcset.split(','):
        u,w=part.strip().rsplit(' ',1);w=int(w[:-1])
        if w<=1200 and (best is None or w>best[1]):best=(u,w)
    return best[0] if best else srcset.split(',')[0].strip().split(' ')[0]
def page(name):
    h=(C/name).read_text()
    # stylesheet: inline, with font and image urls as data
    def css(m):
        f=C/m.group(1);t=f.read_text()
        t=re.sub(r'url\(["\']?([^)"\']+)["\']?\)',lambda u:'url('+data((f.parent/u.group(1)).resolve())+')' if not u.group(1).startswith('data:') and (f.parent/u.group(1)).exists() else u.group(0),t)
        return '<style>'+t+'</style>'
    h=re.sub(r'<link rel="stylesheet" href="([^"]+)">',css,h)
    # scripts: inline; the form redirect writes the thank-you page into the frame
    def js(m):
        t=(C/m.group(1)).read_text()
        t=re.sub(r'location\.assign\((\w+)\.getAttribute\(["\']action["\']\)\)',r'(window.__thanks?window.__thanks():location.assign(\1.getAttribute("action")))',t)   # works on the minified build too
        return '<script type="module">'+t.replace('</script','<\\/script')+'</script>'   # inline module scripts wait for the page, like defer
    h=re.sub(r'<script src="([^"]+)" defer></script>',js,h)
    # pictures: one copy each
    h=re.sub(r'<source media="\(max-width: 719px\)" srcset="[^"]*"[^>]*>','',h)
    def img(m):
        tag=m.group(0);ss=re.search(r'srcset="([^"]+)"',tag);src=re.search(r'\ssrc="([^"]+)"',tag).group(1)
        u=pick(ss.group(1),src) if ss else src
        if u.startswith('data:') or not (C/u).exists():return tag
        tag=re.sub(r'\ssrcset="[^"]*"','',tag);tag=re.sub(r'\ssizes="[^"]*"','',tag)
        return re.sub(r'\ssrc="[^"]+"',' src="'+data(C/u)+'"',tag)
    h=re.sub(r'<img\b[^>]*>',img,h)
    h=re.sub(r'(poster|data-src|data-src-m)="([^"]+)"',lambda m:f'{m.group(1)}="'+(data(C/'site-video/aerial-loop-m.mp4') if m.group(1).startswith('data-src') else data(C/m.group(2)))+'"' if (C/m.group(2)).exists() else m.group(0),h)
    h=re.sub(r'<link rel="(icon|apple-touch-icon)"[^>]*>','',h)
    h=h.replace('if(location.protocol!=="file:")','if(false)')   # no font preload: the font is inlined
    return h
home=page('home.html');thanks=page('thank-you.html')
J=lambda s:json.dumps(s).replace('<','\\u003c')   # JSON for a script with no raw '<', so a host's <head> injection can't land inside it
inject='<script>window.__thanks=function(){var t='+J(thanks)+';document.open();document.write(t);document.close()}</script>'
home=home.replace('</head>',inject+'</head>',1)
shell=(site/'concept-review.html').read_text()
shell=re.sub(r'<img src="(assets/[^"]+)"',lambda m:'<img src="'+data(site/m.group(1))+'"' if (site/m.group(1)).exists() else m.group(0),shell)
shell=re.sub(r'url\((assets/[^)]+)\)',lambda m:'url('+data(site/m.group(1))+')' if (site/m.group(1)).exists() else m.group(0),shell)
shell=re.sub(r'<link rel="(icon|apple-touch-icon)"[^>]*>','',shell)
shell=re.sub(r'<link rel="preload"[^>]*>','',shell)
esc=home.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;').replace('>','&gt;')   # no raw tags inside the attribute either
shell=shell.replace('<iframe id="concept" title="The Syndicate Club landing page concept" src="concept/home.html"></iframe>','<iframe id="concept" title="The Syndicate Club landing page concept" srcdoc="'+esc+'"></iframe><script>window.__PV=window.__PV||{};window.__PV["home.html"]=document.getElementById("concept").getAttribute("srcdoc")</script>')
# The page picker swaps the frame's srcdoc instead of loading files; the page list is inlined
shell=shell.replace('<script src="concept/manifest.js"></script>','<script>'+(C/'manifest.js').read_text()+'</script><script>window.__PV='+J({'thank-you.html':thanks})+'</script>')
shell=shell.replace("ifr.src='concept/'+p.file","ifr.srcdoc=window.__PV[p.file]").replace("ifr.src='concept/'+lp.file","ifr.srcdoc=window.__PV[lp.file]")
out.write_text(shell)
print(out,round(out.stat().st_size/1048576,1),'MB')
