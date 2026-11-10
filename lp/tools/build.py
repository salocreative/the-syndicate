"""Assemble the prototype pages from blocks. Run: python3 tools/build.py
pages/<page>.html link the block files one by one, unminified (for the repo and the WordPress hand-off).
dist/ is the optimised site: every page shares one minified stylesheet (assets/site.css) and one deferred,
minified script (assets/site.js); fonts are trimmed files; photos are responsive WebP copies with srcset and sizes
(widths from tools/img-sizes.json, see tools/measure-sizes.js); HTML comments, editing hooks and indentation are stripped.
Blocks are named "block" or "block:variant" (variant HTML is components/block/variant.html; the block's CSS and JS are shared).
Links in the blocks are site routes (/our-work, /contact ...). The build maps them to the prototype files and stops on any it doesn't know.
Needs: Pillow, tinycss2, fontTools with brotli, and esbuild and svgo on the PATH (npm i -g esbuild svgo)."""
import pathlib,re,sys,shutil,json,subprocess
R=pathlib.Path(__file__).resolve().parent.parent
# ---- PROJECT SETTINGS: change these for each client ----------------------------------------------------------------
# The block prefix in the first run was kw- (kw-js, kw-header__link, kw-hg__photo). Search and replace it with the project's own.
# Font files preloaded in the head are named in the head script below (search "preload").
HOME_BLOCKS=['site-header','sticky-bar','hero','proof','compare','includes','courses','steps','fit','categories','faq','final-cta','site-footer']
T='The Syndicate Club'
PAGES={
 'index':     dict(route='/',blocks=HOME_BLOCKS,title=f'Multi-course golf membership · {T}',desc='Play over 80 of Britain\'s finest private courses on one membership, with a private concierge to book every tee time.',robots='noindex, follow'),
 'thank-you': dict(route='/thank-you',blocks=['site-header','thanks','site-footer'],title=f'Thank you · {T}',desc='Your Membership and Course Access Guide.',robots='noindex, nofollow'),
}
# --------------------------------------------------------------------------------------------------------------------
def split(b):
    n,_,v=b.partition(':');return n,(v or n)
def assets(blocks):
    global CSS,JS
    names=list(dict.fromkeys(split(b)[0] for b in blocks))
    CSS=SHARED_CSS+[f'components/{n}/{n}.css' for n in names if (R/f'components/{n}/{n}.css').exists() and f'components/{n}/{n}.css' not in SHARED_CSS]
    JS=SHARED_JS+[f'components/{n}/{n}.js' for n in names if (R/f'components/{n}/{n}.js').exists() and f'components/{n}/{n}.js' not in SHARED_JS]
SHARED_CSS=['tokens/tokens.css','components/base/base.css','components/button/button.css','components/motion/motion.css','components/form/form.css']
SHARED_JS=['components/motion/motion.js','components/form/form.js']
assets(HOME_BLOCKS)

ROUTES={'/':'index.html','/thank-you':'thank-you.html'}
def links(html,name):
    """Map site routes to prototype files, and mark the current page in the navigation."""
    def rep(m):
        path=m.group(1);hsh='';q=''
        if '#' in path:path,hsh=path.split('#',1)
        if '?' in path:path,q=path.split('?',1);q='?'+q
        if path in ROUTES:f=ROUTES[path]
        else:raise SystemExit(f'build: unknown link {m.group(1)} in {name}')
        if f==f'{name}.html' and hsh and not q:return f'href="#{hsh}"'
        return f'href="{f}{q}'+(f'#{hsh}' if hsh else '')+'"'
    html=re.sub(r'href="(/[^"]*)"',rep,html)
    html=re.sub(r'action="(/[^"]*)"',lambda m:'action="'+ROUTES[m.group(1)]+'"' if m.group(1) in ROUTES else (_ for _ in ()).throw(SystemExit(f'build: unknown action {m.group(1)}')),html)
    if name!='index':html=html.replace('href="#enquire"','href="index.html#enquire"').replace('<a class="sy-skip" href="index.html#enquire">Skip to the enquiry form</a>','<a class="sy-skip" href="#main">Skip to the content</a>')
    return html

def page(blocks,title,desc,name='index',robots='noindex, nofollow'):
    """The linked, unminified page in pages/ (one file per block, for the WordPress hand-off)."""
    head=['<!DOCTYPE html>','<html lang="en-GB">','<head>','<meta charset="utf-8">',
          '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
          f'<title>{title}</title>',f'<meta name="description" content="{desc}">',f'<meta name="robots" content="{robots}">','<link rel="icon" href="../assets/logo/favicon.png" type="image/png">','<link rel="apple-touch-icon" href="../assets/logo/apple-touch-icon.png">',
          '<script>document.documentElement.classList.add("sy-js")</script>']
    head+=[f'<link rel="preload" href="../assets/fonts/{f}.woff2" as="font" type="font/woff2" crossorigin>' for f in ('jost-latin',)]
    head+=[f'<link rel="stylesheet" href="../{c}">' for c in CSS]
    head+=['</head>','<body>']
    body=[]
    for b in blocks:
        n,v=split(b);html=(R/f'components/{n}/{v}.html').read_text()
        if n=='site-header':body.append(html+'<main id="main">')
        elif n=='site-footer':body.append('</main>\n'+html)
        else:body.append(html)
    if 'site-footer' not in blocks:body.append('</main>')
    body=[links('\n'.join(body),name)]
    tail=[f'<script src="../{j}" defer></script>' for j in JS]
    return '\n'.join(head+body+tail+['</body>','</html>',''])

# ---------- dist: the optimised site ----------
def all_blocks():
    """Every block used on any page, in the order it first appears (home first), so the shared files keep each page's cascade."""
    out=[]
    for P in PAGES.values():
        for b in P['blocks']:
            n=split(b)[0]
            if n not in out:out.append(n)
    return out
def esbuild(code,loader):
    r=subprocess.run(['esbuild','--minify','--loader='+loader,'--target=chrome100,safari15,firefox100','--log-level=warning'],input=code.encode(),capture_output=True)
    if r.returncode:raise SystemExit('esbuild: '+r.stderr.decode())
    return r.stdout.decode()
def minify_css(css):
    """A conservative minifier. It drops comments and spare whitespace and nothing else: every value goes out exactly
    as written. (esbuild had rewritten 5000ms as 5s inside custom properties; scripts read those as milliseconds, so the slider
    advanced every 5ms, the Design, Manage, Build rows flickered and scrolling dragged.)"""
    import tinycss2
    def val(tokens):
        out=[];prev_ws=False
        for t in tokens:
            if t.type in('whitespace','comment'):
                prev_ws=True;continue
            if prev_ws and out:out.append(' ')
            prev_ws=False;out.append(tinycss2.serialize([t]))
        return ''.join(out).strip()
    def rules(rs):
        out=[]
        for r in rs:
            if r.type=='qualified-rule':
                decl=[d for d in tinycss2.parse_declaration_list(r.content,skip_comments=True,skip_whitespace=True) if d.type=='declaration']
                body=';'.join(f'{d.name}:{val(d.value)}'+('!important' if d.important else '') for d in decl)
                out.append(val(r.prelude)+'{'+body+'}')
            elif r.type=='at-rule':
                head='@'+r.at_keyword+(' '+val(r.prelude) if val(r.prelude) else '')
                if r.content is None:out.append(head+';')
                elif r.lower_at_keyword in('media','container','supports','layer','keyframes','-webkit-keyframes'):
                    out.append(head+'{'+rules(tinycss2.parse_rule_list(r.content,skip_comments=True,skip_whitespace=True))+'}')
                else:   # @font-face and other declaration blocks
                    decl=[d for d in tinycss2.parse_declaration_list(r.content,skip_comments=True,skip_whitespace=True) if d.type=='declaration']
                    out.append(head+'{'+';'.join(f'{d.name}:{val(d.value)}' for d in decl)+'}')
        return ''.join(out)
    return rules(tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True))
def same_values(a,b):
    """Every declaration in the source reaches the minified file with the same value, in the same order."""
    import tinycss2
    def decls(css):
        res=[]
        def walk(rs):
            for r in rs:
                if r.type=='qualified-rule':
                    res.extend((d.lower_name,''.join(tinycss2.serialize(d.value).split())) for d in tinycss2.parse_declaration_list(r.content,skip_comments=True,skip_whitespace=True) if d.type=='declaration')
                elif r.type=='at-rule' and r.content is not None:
                    if r.lower_at_keyword in('media','container','supports','layer','keyframes'):walk(tinycss2.parse_rule_list(r.content,skip_comments=True,skip_whitespace=True))
                    else:res.extend((d.lower_name,''.join(tinycss2.serialize(d.value).split())) for d in tinycss2.parse_declaration_list(r.content,skip_comments=True,skip_whitespace=True) if d.type=='declaration')
        walk(tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True));return res
    da,db=decls(a),decls(b)
    if da!=db:
        bad=next(((x,y) for x,y in zip(da,db) if x!=y),None)
        raise SystemExit(f'build: the CSS minifier changed a value: {bad}')
def bundle(dist):
    names=all_blocks()
    css='\n'.join((R/c).read_text() for c in SHARED_CSS+[f'components/{n}/{n}.css' for n in names if (R/f'components/{n}/{n}.css').exists()])
    css=css.replace('../assets/fonts/','fonts/')
    js='\n;'.join((R/j).read_text() for j in SHARED_JS+[f'components/{n}/{n}.js' for n in names if (R/f'components/{n}/{n}.js').exists()])
    mini=minify_css(css);same_values(css,mini)
    (dist/'assets/site.css').write_text(mini);(dist/'assets/site.js').write_text(esbuild(js,'js'))
SIZES={}
RANGES=[(719,360,719),(1023,720,1023),(1439,1024,1439),(1919,1440,1919),(None,1920,2560)]   # wide screens measured at 2560 too
def _slot(page,key,cls):
    d=SIZES.get(page,{}).get(key)
    return d['w'] if d else None
def _expr(w,a,b):
    """Width across one layout range as a straight line between its edges, plus 8% for zoom and parallax."""
    wa,wb=w.get(str(a),0)*1.08,w.get(str(b),0)*1.08
    if wa<=1 and wb<=1:return None
    k=(wb-wa)/(b-a);c=wa-k*a
    if abs(c)<4:return f'{max(1,round(k*100,1)):g}vw'
    if abs(k)<0.002:return f'{max(1,round(c))}px'
    return f'calc({round(k*100,2):g}vw {"+" if c>=0 else "-"} {abs(round(c))}px)'
def sizes_for(page,slots):
    """One sizes value for every slot of a photo on a page, so the page downloads one copy of it: each layout range
    uses the widest slot at that range (max() when two slots cross)."""
    parts=[];live=[w for w in slots if w]
    for top,a,b in RANGES:
        cand=[(w,_expr(w,a,b)) for w in live];cand=[(w,e) for w,e in cand if e]
        if not cand:parts.append((top,None));continue
        wide=lambda w:(w.get(str(a),0),w.get(str(b),0))
        dom=[e for w,e in cand if all(wide(w)[0]>=wide(x)[0] and wide(w)[1]>=wide(x)[1] for x,_ in cand)]
        parts.append((top,dom[0] if dom else 'max('+', '.join(sorted({e for _,e in cand}))+')'))
    if not live:return '100vw'
    # a range where the photo isn't drawn (hidden at that size) takes the nearest range where it is, so a state change never fetches a tiny copy
    for k,(top,v) in enumerate(parts):
        if v is None:parts[k]=(top,next((x for _,x in parts[k+1:] if x),None) or next((x for _,x in reversed(parts[:k]) if x),'100vw'))
    while len(parts)>1 and parts[-2][1]==parts[-1][1]:parts.pop(-2)
    *rest,(_,last)=parts
    return ', '.join([f'(max-width: {top}px) {v}' for top,v in rest]+[last])
def responsive(html,page,table):
    imgs=list(re.finditer(r'<img\b[^>]*\bsrc="site-images/[^"]+"[^>]*>',html))
    seen={};slots={};keys=[]
    for m in imgs:
        tag=m.group(0);key='site-images/'+re.search(r'src="site-images/([^"]+)"',tag).group(1)
        seen[key]=seen.get(key,0)+1;cls=(re.search(r'class="([^"]*)"',tag) or [None,''])[1]
        slots.setdefault(key,[]).append(_slot(page,f'{key}#{seen[key]}',cls));keys.append(key)
    sz={k:sizes_for(page,v) for k,v in slots.items()}
    out=[];pos=0
    for m,key in zip(imgs,keys):
        items=table.get(key)
        if not items:raise SystemExit(f'build: no image copies for {key}')
        fallback=next((u for w,u in items if w>=1200),items[-1][1])
        srcset=', '.join(f'{u} {w}w' for w,u in items)
        tag=m.group(0).replace(f'src="{key}"',f'src="{fallback}" srcset="{srcset}" sizes="{sz[key]}"')
        if 'decoding=' not in tag:tag=tag.replace('<img ','<img decoding="async" ',1)
        out.append(html[pos:m.start()]+tag);pos=m.end()
    html=''.join(out)+html[pos:]
    # <source media="(max-width: 719px)" data-phone="site-images/..."> gets the portrait crops of that photo (images.py PHONE)
    def phone(m):
        import images
        items=table.get('phone:'+m.group(1))
        if not items:raise SystemExit(f'build: no phone crops for {m.group(1)}')
        big=items[-1][0];hi=round(big/images.PHONE_RATIO)
        return f'<source media="(max-width: 719px)" srcset="{", ".join(f"{u} {w}w" for w,u in items)}" sizes="max(100vw, 50vh)" width="{big}" height="{hi}">'
    return re.sub(r'<source media="\(max-width: 719px\)" data-phone="([^"]+)">',phone,html)
KEEP_HOOKS=False   # tools/concept.py sets this: the Concept review needs data-section, data-label and data-edit
def tidy(html):
    """Strip comments, editing hooks nothing reads, and indentation. Whitespace between tags becomes one newline, which renders the same."""
    html=re.sub(r'<!--(?!\[if).*?-->','',html,flags=re.S)
    if not KEEP_HOOKS:html=re.sub(r'\s(?:data-edit|data-label|data-section)="[^"]*"','',html)
    html=re.sub(r'[ \t]*\n\s*','\n',html)
    return html.strip()+'\n'
def dist_page(name,P,table):
    blocks=P['blocks']
    head=['<!DOCTYPE html>','<html lang="en-GB">','<head>','<meta charset="utf-8">',
          '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
          f'<title>{P["title"]}</title>',f'<meta name="description" content="{P["desc"]}">',f'<meta name="robots" content="{P.get("robots","noindex, nofollow")}">','<link rel="icon" href="assets/logo/favicon.png" type="image/png">','<link rel="apple-touch-icon" href="assets/logo/apple-touch-icon.png">',
          # kw-js, then font preloads. Preloads are added by script so the prototype opened from a folder (file://, where
          # preloads fail the CORS check) stays free of console errors; on a server they start as early as markup would.
          '<script>document.documentElement.classList.add("sy-js");if(location.protocol!=="file:")["jost-latin"].forEach(f=>{const l=document.createElement("link");l.rel="preload";l.as="font";l.type="font/woff2";l.crossOrigin="";l.href="assets/fonts/"+f+".woff2";document.head.appendChild(l)})</script>']
    head+=['<link rel="stylesheet" href="assets/site.css">','<script src="assets/site.js" defer></script>','</head>','<body>']
    body=[]
    for b in blocks:
        n,v=split(b);html=(R/f'components/{n}/{v}.html').read_text()
        if n=='site-header':body.append(html+'<main id="main">')
        elif n=='site-footer':body.append('</main>\n'+html)
        else:body.append(html)
    if 'site-footer' not in blocks:body.append('</main>')
    html=links('\n'.join(body),name).replace('src="../site-images/','src="site-images/').replace('"../site-video/','"site-video/').replace('"../assets/','"assets/').replace(', ../assets/',', assets/')
    html=responsive(html,name,table)
    return tidy('\n'.join(head+[html,'</body>','</html>']))
def build_dist():
    import images,fonts
    global SIZES
    SIZES=json.loads((R/'tools/img-sizes.json').read_text())
    dist=R/'dist';shutil.rmtree(dist,ignore_errors=True);(dist/'assets').mkdir(parents=True)
    cache=R/'.build-cache';table=images.variants(cache)
    shutil.copytree(cache/'site-images',dist/'site-images')
    fonts.build(dist/'assets/fonts')
    shutil.copytree(R/'site-video',dist/'site-video')   # the aerial film and its poster
    for d in ('logo',):   # asset folders copied as they are
        if (R/f'assets/{d}').exists():shutil.copytree(R/f'assets/{d}',dist/f'assets/{d}')
    bundle(dist)
    for name,P in PAGES.items():(dist/f'{name}.html').write_text(dist_page(name,P,table))

if __name__=='__main__':
    sys.path.insert(0,str(R/'tools'))
    (R/'pages').mkdir(exist_ok=True)
    for name,P in PAGES.items():
        assets(P['blocks'])
        (R/f'pages/{name}.html').write_text(page(P['blocks'],P['title'],P['desc'],name,P.get('robots','noindex, nofollow')))
    build_dist()
    print('built',len(PAGES),'pages: pages/*.html and dist/ (optimised)')
