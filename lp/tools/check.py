"""Rules checks for blocks. Run: python3 tools/check.py
Flags hex colours, rgb() and raw px, ms or s values typed into component CSS (they belong in tokens.css),
em dashes and placeholder text in copy, and border-radius. Also checks every stylesheet's braces balance (one missing }
once silently switched off every later rule on touch screens)."""
import pathlib,re,sys
# ---- PROJECT SETTINGS ----
WORDMARK=''   # the logo-only spelling to flag in copy, for example an all-caps name
BANNED=['solutions','turnkey','world-class','seamless','leverage','unlock','transformative','robust','holistic','cutting-edge','passionate about']   # plus the brand's own words to avoid
R=pathlib.Path(__file__).resolve().parent.parent
bad=[]
for f in sorted((R/'components').rglob('*.css')):
    src=re.sub(r'/\*.*?\*/',lambda m:'\n'*m.group(0).count('\n'),f.read_text(),flags=re.S)
    for n,line in enumerate(src.splitlines(),1):
        code=re.sub(r'@(media|container)[^{]*','',line)   # breakpoints can't be custom properties
        code=re.sub(r'url\("data:[^"]*"\)','url(data)',code)          # mask shapes are geometry, not tokens
        code=re.sub(r'(?:-webkit-)?mask-image:[^;]*;?','',code)       # fade masks use black stops only
        if re.search(r'#[0-9a-fA-F]{3,8}\b',code):bad.append((f.name,n,'hex colour'))
        if re.search(r'rgba?\(',code):bad.append((f.name,n,'rgb colour'))
        for m in re.finditer(r'(?<![\w-])(\d*\.?\d+)(px|ms|s)\b',code):
            v=float(m.group(1))
            if v==0:continue
            if m.group(2)=='px' and v in (1,):continue                 # hairline offsets for the 1441 × 841 grid file
            bad.append((f.name,n,f'raw {m.group(0)}'))
        if 'border-radius' in code and 'var(--radius)' not in code:bad.append((f.name,n,'radius'))
for f in [R/'tokens/tokens.css']+sorted((R/'components').rglob('*.css')):
    t=re.sub(r'/\*.*?\*/','',f.read_text(),flags=re.S);t=re.sub(r'"[^"]*"|\'[^\']*\'|url\([^)]*\)','',t);depth=0
    for ch in t:
        depth+=(ch=='{')-(ch=='}')
        if depth<0:break
    if depth:bad.append((f.name,0,'unbalanced braces'))
for f in sorted((R/'components').rglob('*.html')):
    t=f.read_text()
    if '—' in t:bad.append((f.name,0,'em dash'))
    txt=re.sub(r'<[^>]+>','',t)
    if WORDMARK and WORDMARK in txt:bad.append((f.name,0,f'word: {WORDMARK}'))
    for w in BANNED:
        if w in txt.lower():bad.append((f.name,0,f'word: {w}'))
for b in bad:print(*b)
print('checks:', 'pass' if not bad else f'{len(bad)} to look at')
sys.exit(1 if bad else 0)
