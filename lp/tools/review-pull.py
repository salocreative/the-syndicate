"""Pull everything from the Concept review sheet into the repo, so nothing gets missed when changes are applied.
Run: python3 tools/review-pull.py [--skip-name "Salo test"] [--out review] [--pack]
Writes:
  review/items.json      every row for this project, as the sheet holds it (the full record, untouched)
  review/photos/         every replacement photo, by the id in items.json
  review/CHANGES.md      the checklist to work from: final content edits and photos per page (put-backs removed),
                         where each one lives in the repo, every comment with its replies and status, section
                         approvals and sign-offs. Each line is a tick box, so the apply step can be checked off.
--pack (after sign-off) also writes review/build-pack.zip: everything the build needs in one file. The repo's source (blocks, tokens,
pages, copy, kit, image bank, tools, changelog and content list) plus this review's CHANGES.md, items.json and photos. Save it to the
sign-off's folder in Concept review handover/<project>/ with the copy doc exported from Claude Docs beside it.
Each edit is located in the source by its 'before' text. NOT FOUND means it has to be found by hand: say so, don't guess."""
import json,sys,pathlib,re,html,base64,urllib.request,urllib.parse,argparse,collections
R=pathlib.Path(__file__).resolve().parent.parent
# ---- PROJECT SETTINGS: the same endpoint, project and key as the guidelines' concept-review.html CONFIG ----
ENDPOINT='https://script.google.com/macros/s/<deployment id>/exec'
PROJECT,KEY='client','<key from the Projects tab>'
# ----------------------------------------------------------------------------------------------------------
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
try:
    import concept;PAGES={concept.FILE(k)[:-5]:v for k,v in concept.LABELS.items()}
except Exception:PAGES={'home':'Home'}

def get(**q):
    with urllib.request.urlopen(ENDPOINT+'?'+urllib.parse.urlencode({'project':PROJECT,'key':KEY,**q}),timeout=60) as r:return json.load(r)
def plain(v):return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',re.sub(r'<br\s*/?>',' ',str(v or ''))))).strip()
def squash(v):return re.sub(r'\s+',' ',v).replace(' .','.').replace(' ,',',').strip()
def page_of(it):
    s=it.get('target') or it.get('section') or ''
    return s.split(':')[0] if ':' in s else 'every page'

SOURCES=None
def locate(before,section=''):
    """Which block files hold this text (tags stripped). Shared header and footer text appears once, in its own block."""
    global SOURCES
    if SOURCES is None:
        SOURCES={}
        for f in sorted((R/'components').glob('*/*.html'))+sorted((R/'copy').glob('*.md')):
            SOURCES[str(f.relative_to(R))]=squash(plain(f.read_text()))
    b=squash(plain(before))
    if len(b)<3:return []
    hit=[f for f,t in SOURCES.items() if b in t and not f.startswith('copy/')]
    hit=hit or [f for f,t in SOURCES.items() if b in t]
    if not hit:   # the box joins several bits of markup (a number and a label, a card): every word must be in one block
        words={w.lower() for w in re.findall(r"[^\W\d_][\w'’-]{2,}",b)}
        if words:hit=[f for f,t in SOURCES.items() if all(w in t.lower() for w in words) and not f.startswith('copy/')]
    key=(section or '').split(':')[-1]
    best=[f for f in hit if key and key in f]
    return best or hit

def main():
    a=argparse.ArgumentParser();a.add_argument('--skip-name',action='append',default=[]);a.add_argument('--out',default='review');a.add_argument('--pack',action='store_true');o=a.parse_args()
    out=R/o.out;(out/'photos').mkdir(parents=True,exist_ok=True)
    j=get()
    if not j.get('ok'):sys.exit('The sheet said: '+str(j))
    allrows=j['items'];(out/'items.json').write_text(json.dumps(allrows,indent=1,ensure_ascii=False))
    skip={n.lower() for n in o.skip_name}
    rows=sorted([i for i in allrows if str(i.get('name','')).lower() not in skip],key=lambda i:str(i.get('ts')))
    ids={i['id'] for i in rows}
    # final state of every box: the latest edit or photo, unless it was put back
    cur,hist={},collections.defaultdict(list)
    for it in rows:
        if it['type'] in('edit','image'):cur[it['target']]=it;hist[it['target']].append(it)
        elif it['type']=='revert':cur.pop(it['target'],None);hist[it['target']].append(it)
    # comments
    cs=collections.OrderedDict()
    for it in rows:
        if it['type']=='comment':cs[it['id']]={**it,'replies':[],'done':False}
        elif it['type']=='reply' and it.get('parent') in cs:cs[it['parent']]['replies'].append(it)
        elif it['type'] in('resolve','reopen') and it.get('parent') in cs:cs[it['parent']]['done']=it['type']=='resolve'
    ticks=collections.defaultdict(dict)
    for it in rows:
        if it['type'] in('tick','untick'):ticks[it['section']][it['name']]=it['type']=='tick'
    apps=[i for i in rows if i['type']=='approval']
    # photos
    got=0
    for it in cur.values():
        if it['type']=='image' and it.get('file'):
            p=out/'photos'/(it['file']+'.jpg')
            if not p.exists():
                r=get(file=it['file'])
                if r.get('ok'):p.write_bytes(base64.b64decode(r['data'].split(',',1)[1]));got+=1
    L=[f'# {PROJECT.title()} concept review: changes to apply','',
       f'Pulled from the review sheet: {len(allrows)} rows ({len(rows)} after skipping {", ".join(o.skip_name) or "none"}). Full record in items.json.','']
    if apps:L+=['## Sign-off','']+[f'- {a["name"]}{", "+a["role"] if a.get("role") else ""}, {a["ts"][:16].replace("T"," ")} UTC, round {a["round"]}: {a.get("text","")}' for a in apps]+['']
    nf=0
    byp=collections.defaultdict(list)
    for t,it in cur.items():byp[page_of(it)].append(it)
    L+=['## Content edits and photos (final state, put-backs removed)','']
    if not cur:L+=['None.','']
    for pg in list(PAGES)+['every page']:
        if pg not in byp:continue
        L+=[f'### {PAGES.get(pg,"Every page (header and footer)")}','']
        for it in byp[pg]:
            n=len(hist[it['target']])
            if it['type']=='image':
                L+=[f'- [ ] **{it["label"]}** (`{it["target"]}`): new photo from {it["name"]}, `photos/{it.get("file","")}.jpg`'+(' (changed '+str(n)+' times)' if n>1 else '')]
                continue
            where=locate(it.get('before',''),it.get('section',''));nf+=0 if where else 1
            tone=f' Tone check {it["score"]}/100, {"AI suggestion used" if it.get("choice")=="accepted" else "own words kept" if it.get("choice")=="dismissed" else "not checked"}.' if it.get('choice') else ''
            L+=[f'- [ ] **{it["label"]}** (`{it["target"]}`), {it["name"]}:'+(f' changed {n} times, last shown.' if n>1 else ''),
                f'  - Was: {plain(it.get("before",""))}',f'  - Now: {plain(it.get("text",""))}',f'  - Markup: `{it.get("text","")}`',
                f'  - In: {", ".join(where) if where else "NOT FOUND, find by hand"}.{tone}']
        L+=['']
    L+=['## Comments','']
    if not cs:L+=['None.','']
    for c in cs.values():
        L+=[f'- [ ] **{c.get("label") or c.get("section") or "Page"}**{" (mobile)" if c.get("view")=="mobile" else ""}, {c["name"]}, {c["ts"][:16].replace("T"," ")} UTC, {"resolved" if c["done"] else "OPEN"}: {c.get("text","")}']
        L+=[f'  - {r["name"]}: {r.get("text","")}' for r in c['replies']]
    L+=['','## Section approvals','']
    on={s:[n for n,v in d.items() if v] for s,d in ticks.items()}
    L+=[f'- {s}: {", ".join(n)}' for s,n in sorted(on.items()) if n] or ['None yet.']
    (out/'CHANGES.md').write_text('\n'.join(L)+'\n')
    oc=sum(1 for c in cs.values() if not c['done'])
    print(f'review: {len(rows)} rows, {len(cur)} boxes changed ({nf} not found in source), {len(cs)} comments ({oc} open), {len(apps)} sign-offs, {got} photos downloaded -> {out.relative_to(R)}/CHANGES.md')
    if o.pack:pack(out)

PACK_DIRS=('components','tokens','pages','copy','kit','assets','tools')
PACK_FILES=('README.md','CHANGELOG.md','CONTENT-LIST.md')
def pack(out):
    import zipfile
    z=out/'build-pack.zip';n=0
    imgs=[d.name for d in R.iterdir() if d.is_dir() and d.name.endswith('images')]
    with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as zf:
        for d in PACK_DIRS+tuple(imgs):
            for f in sorted((R/d).rglob('*')) if (R/d).is_dir() else []:
                if f.is_file() and '__pycache__' not in f.parts:zf.write(f,f'source/{f.relative_to(R)}');n+=1
        for f in PACK_FILES:
            if (R/f).exists():zf.write(R/f,f'source/{f}');n+=1
        for f in sorted(out.rglob('*')):
            if f.is_file() and f!=z:zf.write(f,f'review/{f.relative_to(out)}');n+=1
        zf.writestr('README.txt','Build pack: source/ is the website repo at sign-off, review/ is the client review (CHANGES.md is the checklist to apply).\nThe copy doc is exported from Claude Docs and saved beside this zip. The approved pages as the client saw them are in approved-concept.zip, made by the review sheet.\n')
    print(f'build pack: {n} files, {round(z.stat().st_size/1e6,1)} MB -> {z.relative_to(R)}')
if __name__=='__main__':main()
