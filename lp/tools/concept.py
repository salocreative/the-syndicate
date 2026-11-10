"""The prototype for the Concept review tab on the guidelines site (website stage 4).
Run after the build: python3 tools/concept.py <guidelines site folder>/concept
Writes every page into that folder (the homepage as home.html), with the shared assets and photos beside them, and keeps
data-section, data-label and data-edit, which the review reads. Each page gets the password gate at the end of <head> and
review.js at the end of <body>; review.js itself lives in the guidelines repo and is never overwritten here.
Also writes manifest.js: every page and its sections, so the review can list them all and sign-off covers the whole site.
The header and footer are the same on every page, so they're one section each (data-cr-shared)."""
import json,pathlib,re,shutil,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import build,images
R=build.R
# ---- PROJECT SETTINGS ----
SLUG='syndicate'   # the brand's slug, the same as project in the guidelines' concept-review.html CONFIG
LABELS={'index':'Home','thank-you':'Thank you'}   # page name in build.PAGES -> label reviewers see
REVIEW=('index',)   # pages listed for approval. One screen: the thank-you page is built, reached through the form, and not listed
# --------------------------
SHARED={'header','footer'}
FILE=lambda name:'home.html' if name=='index' else f'{name}.html'
GATE=('<script>/* Concept gate: opened on its own, a concept page sends people to the password screen first */'
      f"(()=>{{try{{if(window.parent===window&&localStorage.getItem('{SLUG}-cr')!=='1')location.replace('../concept-review.html')}}catch(_){{}}}})();</script>")
def main(out):
    out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
    build.KEEP_HOOKS=True
    build.SIZES=json.loads((R/'tools/img-sizes.json').read_text())
    table=images.variants(R/'.build-cache')
    for d in ('assets','site-images','site-video'):
        if (out/d).exists():shutil.rmtree(out/d)
        shutil.copytree(R/'dist'/d,out/d)
    pages=[]
    for name,P in build.PAGES.items():
        h=build.dist_page(name,P,table)
        h=re.sub(r'href="index\.html(?=[#?"])','href="home.html',h)
        h=h.replace('<html lang="en-GB"',f'<html lang="en-GB" data-cr-page="{LABELS.get(name,name)}"',1)
        for sid in SHARED:h=re.sub(rf'(<[^>]*\sdata-section="{sid}")',r'\1 data-cr-shared',h)
        h=h.replace('</head>',GATE+'\n<link rel="stylesheet" href="thinking.css">\n</head>',1).replace('</body>','<script src="notes.js" defer></script>\n<script src="thinking.js" defer></script>\n<script src="review.js" defer></script>\n</body>',1)
        (out/FILE(name)).write_text(h)
        secs=[];seen=set()
        for m in re.finditer(r'<[^>]*\sdata-section="([^"]+)"[^>]*>',h):
            tag=m.group(0);sid=m.group(1);lab=(re.search(r'data-label="([^"]*)"',tag) or [0,sid])[1]
            shared='data-cr-shared' in tag;key=sid if shared else f'{FILE(name)[:-5]}:{sid}'
            if key in seen:continue
            seen.add(key);secs.append({'id':key,'label':lab if shared or len(REVIEW)==1 else f'{LABELS.get(name,name)} · {lab}','shared':shared})
        if name in REVIEW:pages.append({'file':FILE(name),'key':FILE(name)[:-5],'label':LABELS.get(name,name),'sections':secs})
    for f in ('thinking.css','thinking.js','notes.js'):shutil.copy(R.parent/'kit-src'/f,out/f)   # Show our thinking, review only
    (out/'manifest.js').write_text('/* Written by the website repo\'s tools/concept.py: the concept pages and their sections, in site order */\nwindow.CR_PAGES='+json.dumps(pages,ensure_ascii=False,indent=1)+';\n')
    n=sum(len(p['sections']) for p in pages)-sum(sum(1 for s in p['sections'] if s['shared']) for p in pages[1:])
    print(f'concept: {len(pages)} pages, {n} sections to review, written to {out}')
    if not (out/'review.js').exists():print('note: review.js is not in that folder yet. It comes from the guidelines repo (concept-review tab).')
if __name__=='__main__':
    if len(sys.argv)<2:sys.exit('usage: python3 tools/concept.py <guidelines site>/concept')
    main(sys.argv[1])
