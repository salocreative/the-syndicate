#!/usr/bin/env python3
"""Skin the brand guidelines template for one brand.

    python3 tools/skin.py brand.json ../acme-guidelines

Two modes, set by "mode" in brand.json:
- guidelines (default): a brand Salo designed. The full guidelines site, reference kit, rules sheet, PDF and templates.
- reference: a brand the client supplied. Only the reference kit (with a Brand chapter for the supplied basics), the
  rules sheet and the Concept review tab. Salo's internal reference for the website, not a client deliverable.

Writes a skinned copy of site/ (and pdf/ in guidelines mode) into the output folder:
- the token block in every HTML file (neutral scale, accent, radius, fonts)
- the accent switcher in the reference kit
- {{BRAND}}-style placeholders everywhere
- brand- file names renamed to <slug>-
- the website rules embedded in the kit
- optional template chapters removed
- the Concept review tab (concept-review/), skinned but kept out of the site until tools/concept-review.py turns it on
- an icon font subset with only the icons listed (needs network; keeps the current font otherwise)

Then prints the accent table and a contrast report. Content placeholders [[...]] are left
for Claude to fill from the client's material; tools/check.py lists them.
"""
import json, os, re, shutil, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- colour maths ----------
def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def hexs(c): return '#%02X%02X%02X' % tuple(max(0, min(255, round(v))) for v in c)
def lum(h):
    def ch(v):
        v /= 255; return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in rgb(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + 0.05) / (lb + 0.05)
def mix(a, b, t):  # t of a, 1-t of b
    A, B = rgb(a), rgb(b); return hexs([A[i] * t + B[i] * (1 - t) for i in range(3)])
def darken_to(h, target, against='#FFFFFF'):
    if ratio(h, against) >= target: return h.upper()
    for i in range(1, 101):
        c = mix(h, '#000000', 1 - i / 100)
        if ratio(c, against) >= target: return c
    return '#000000'

# Neutral steps as % of ink mixed with white (matches the template defaults)
STEPS = {'n-25': .02, 'n-50': .05, 'n-100': .10, 'n-200': .20, 'n-300': .30, 'n-400': .40, 'n-450': .50, 'n-500': .60,
         'n-600': .70, 'n-700': .80, 'n-750': .85, 'n-800': .90, 'n-850': .925, 'n-900': .98}
def neutral(ink, overrides):
    n = {'n-0': '#FFFFFF'}
    for k, t in STEPS.items(): n[k] = mix(ink, '#FFFFFF', t)
    n['n-950'] = ink.upper(); n['n-990'] = mix(ink, '#000000', .68)
    # captions and secondary text must reach 4.5:1 on white
    for k in ('n-500', 'n-600'):
        if ratio(n[k], '#FFFFFF') < 4.5: n[k] = darken_to(n[k], 4.5)
    for k, v in (overrides or {}).items(): n[k] = v.upper()
    return n

def token_block(b, n, acc, prefix):
    order = ['n-0', 'n-25', 'n-50', 'n-100', 'n-200', 'n-300', 'n-400', 'n-450', 'n-500', 'n-600', 'n-700', 'n-750', 'n-800', 'n-850', 'n-900', 'n-950', 'n-990']
    r, g, bl = rgb(n['n-950'])
    lines = ['/*@tokens start*/', ':root{']
    row = []
    for i, k in enumerate(order):
        row.append(f'--{k}:{n[k]};')
        if len(row) == 6 or i == len(order) - 1: lines.append('  ' + ' '.join(row)); row = []
    f = b['fonts']
    lines += [f'  --n-950-rgb:{r} {g} {bl};',
              '  --bad:#E5322D; --bad-bg:#FCEBEA; --bad-ink:#8E1E1A;',
              f"  --acc:{acc['acc']}; --acc-ink:{acc['ink']}; --acc-ink3:{acc['ink3']};",
              f"  --radius:{b.get('radius', '0px')};",
              "  --display:'Brand Display', Arial, Helvetica, sans-serif;",
              "  --body:'Brand Body', Arial, Helvetica, sans-serif;",
              "  --icons:'Brand Icons';", '}',
              f"@font-face{{font-family:'Brand Display';font-style:normal;font-weight:{f['display'].get('weights', '400 700')};font-display:swap;src:url({prefix}assets/fonts/display.woff2) format('woff2')}}",
              f"@font-face{{font-family:'Brand Body';font-style:normal;font-weight:{f['body'].get('weights', '300 600')};font-display:swap;src:url({prefix}assets/fonts/body.woff2) format('woff2')}}",
              f"@font-face{{font-family:'Brand Icons';font-style:normal;font-weight:300;font-display:block;src:url({prefix}assets/fonts/icons.woff2) format('woff2')}}",
              '/*@tokens end*/']
    return '\n'.join(lines)

def icon_font(style, names, dest):
    fam = {'sharp': 'Sharp', 'outlined': 'Outlined', 'rounded': 'Rounded'}[style.lower()]
    url = (f'https://fonts.googleapis.com/css2?family=Material+Symbols+{fam}:opsz,wght,FILL,GRAD@20..48,300,0,0'
           f'&icon_names={",".join(sorted(set(names)))}&display=block')
    ua = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}
    css = urllib.request.urlopen(urllib.request.Request(url, headers=ua), timeout=20).read().decode()
    src = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(src, headers=ua), timeout=20).read()
    open(dest, 'wb').write(data); return len(data)

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    b = json.load(open(sys.argv[1])); out = os.path.abspath(sys.argv[2])
    slug = b['slug']
    mode = b.get('mode', 'guidelines')
    if mode not in ('guidelines', 'reference'): sys.exit('mode in brand.json must be guidelines or reference')
    ref = mode == 'reference'
    if os.path.exists(out) and os.listdir(out): sys.exit(f'{out} is not empty. Pick a new folder.')
    shutil.copytree(os.path.join(ROOT, 'site'), os.path.join(out, 'site'))
    if not ref: shutil.copytree(os.path.join(ROOT, 'pdf'), os.path.join(out, 'pdf'))
    shutil.copytree(os.path.join(ROOT, 'tools'), os.path.join(out, 'tools'))
    if os.path.isdir(os.path.join(ROOT, 'concept-review')): shutil.copytree(os.path.join(ROOT, 'concept-review'), os.path.join(out, 'concept-review'))
    for f in ('README.md', 'CONTRACT.md'):
        if os.path.exists(os.path.join(ROOT, f)): shutil.copy(os.path.join(ROOT, f), out)
    shutil.copy(sys.argv[1], os.path.join(out, 'brand.json'))
    S = os.path.join(out, 'site')
    # reference mode: no guidelines site, PDF or templates; the kit is the front page
    rm = os.path.join(S, 'README.reference.md')
    if ref:
        os.remove(os.path.join(S, 'index.html'))
        for d in ('templates', 'guidelines', 'email'): shutil.rmtree(os.path.join(S, 'assets', d), ignore_errors=True)
        os.replace(rm, os.path.join(S, 'README.md'))
    elif os.path.exists(rm): os.remove(rm)

    # colours
    n = neutral(b['ink'], b.get('neutral'))
    accs = []
    for a in b['accents']:
        acc = a['hex'].upper()
        accs.append({**a, 'acc': acc, 'ink': darken_to(acc, 4.5), 'ink3': darken_to(acc, 3.0)})
    default = next((a for a in accs if a['id'] == b.get('accent_default')), accs[0])
    final = b.get('accent_status') == 'final' or len(accs) == 1
    if final: accs = [default]

    # fonts
    for role in ('display', 'body'):
        p = b['fonts'][role].get('file')
        if p: shutil.copy(p, os.path.join(S, 'assets/fonts', role + '.woff2'))
    try:
        size = icon_font(b['icons']['style'], b['icons']['names'], os.path.join(S, 'assets/fonts/icons.woff2'))
        icon_note = f'icon font subset: {len(b["icons"]["names"])} icons, {size // 1024}KB'
    except Exception as e:
        icon_note = f'icon font NOT downloaded ({e.__class__.__name__}); kept the template font. Re-run with network, or replace assets/fonts/icons.woff2 by hand'

    # rename brand- files
    for d, _, files in os.walk(S):
        for f in files:
            if f.startswith('brand-') or 'brand-brand-' in f:
                nf = f.replace('brand-brand-', f'{slug}-brand-').replace('how-to-use-the-brand-', f'how-to-use-the-{slug}-')
                if nf.startswith('brand-') and not nf.startswith('brand-guidelines'): nf = slug + nf[5:]
                os.rename(os.path.join(d, f), os.path.join(d, nf))
    os.rename(os.path.join(S, 'website-rules.md'), os.path.join(S, f'{slug}-website-rules.md'))

    sig_muted = n['n-600']
    values = {'BRAND': b['brand'], 'WORDMARK': b['wordmark'], 'STRAPLINE': b.get('strapline', ''), 'SLUG': slug,
              'YEAR': b['year'], 'WEB': b['web'], 'INK_NAME': b['ink_name'],
              'DISPLAY_FONT': b['fonts']['display']['name'], 'BODY_FONT': b['fonts']['body']['name'],
              'ICON_STYLE': b['icons']['style'].capitalize(), 'ACCENT_NAME': default['name'],
              'SIG_INK': n['n-950'], 'SIG_MUTED': sig_muted, 'SIG_RULE': n['n-200']}

    def moded(t, f):
        """Keep or drop the reference-only blocks, and point the top bar at the kit when there's no guidelines site."""
        if ref:
            t = t.replace('<!--@reference-only start-->', '').replace('<!--@reference-only end-->', '')
            t = t.replace('href="index.html#home" aria-label="{{BRAND}} brand guidelines cover"', 'href="reference-kit.html" aria-label="{{BRAND}} reference kit"')
            t = t.replace('<a href="index.html#brand">Brand</a><a href="index.html#templates">Templates</a>', '<a href="reference-kit.html#brand-ch">Brand</a>')
            t = t.replace('<a href="index.html#brand">Back to the brand guidelines</a>', '<a href="reference-kit.html">Back to the reference kit</a>')
            t = t.replace(' The full type scale lives in the guidelines.', ' The full type scale lives in the tokens.')
            pal = b.get('palette') or []
            if f == 'reference-kit.html' and pal:
                figs = '\n'.join(f'        <figure class="fig"><span class="sw" style="--c:{c["hex"].upper()}"></span><figcaption><b>{c["name"]}</b> {c["hex"].upper()} · {c.get("use") or "[[Use]]"}</figcaption></figure>' for c in pal)
                t = re.sub(r'<!--@palette start-->.*?<!--@palette end-->', '<!--@palette start-->\n' + figs + '\n<!--@palette end-->', t, flags=re.S)
        else:
            t = re.sub(r'<!--@reference-only start-->.*?<!--@reference-only end-->', '', t, flags=re.S)
        if f == 'reference-kit.html':
            k = [-1]
            def num(m): k[0] += 1; return f'{m.group(1)}{k[0]:02d}{m.group(2)}'
            t = re.sub(r'(<div class="chapter" id="[a-z-]+"><h2><span>)\d\d(</span>)', num, t)
        return t

    def fill(t, prefix):
        t = re.sub(r'/\*@tokens start\*/.*?/\*@tokens end\*/', lambda m: token_block(b, n, default, prefix), t, flags=re.S)
        t = t.replace('brand-brand-guidelines', f'{slug}-brand-guidelines').replace('how-to-use-the-brand-', f'how-to-use-the-{slug}-')
        t = re.sub(r'(assets/[a-z/]+/)brand-', rf'\g<1>{slug}-', t)
        t = t.replace('data-logo="brand-', f'data-logo="{slug}-')
        t = t.replace("fetch('website-rules.md')", f"fetch('{slug}-website-rules.md')")
        for k, v in values.items(): t = t.replace('{{' + k + '}}', v)
        return t

    # signature details
    sig = b.get('signature', {})
    rules_md = fill(open(os.path.join(S, f'{slug}-website-rules.md')).read(), '')
    open(os.path.join(S, f'{slug}-website-rules.md'), 'w').write(rules_md)

    for d, _, files in os.walk(out):
        for f in files:
            if not f.endswith(('.html', '.md', '.txt')) or f in ('CONTRACT.md',): continue
            p = os.path.join(d, f); t = open(p).read()
            prefix = '../site/' if os.sep + 'pdf' + os.sep in p else '../' if p.endswith(os.sep + 'concept' + os.sep + f) else ''
            t = fill(moded(t, f), prefix)
            if f == 'index.html' and d == S:
                t = t.replace("address: '[[Registered or office address]]'", 'address: ' + json.dumps(sig.get('address', '')))
                t = t.replace("terms: '[[Email disclaimer, or leave empty]]'", 'terms: ' + json.dumps(sig.get('terms', '')))
                for tpl, on in b.get('templates', {}).items():
                    if not on: t = re.sub(rf'<!--@optional {tpl}-->.*?<!--@end-->', '', t, flags=re.S)
                # renumber the Templates view chapters
                a = t.index('id="view-templates"'); seg = t[a:]; k = [0]
                def num(m): k[0] += 1; return f'{m.group(1)}{k[0]:02d}{m.group(2)}'
                seg = re.sub(r'(<div class="chapter" id="[a-z-]+"><h2><span>)\d\d(</span>)', num, seg)
                t = t[:a] + seg
            if f == 'guide.html':
                tp = b.get('templates', {})
                if not tp.get('letterhead', True) and not tp.get('newsletter', True):
                    t = re.sub(r'<!--@optional pdf-templates-->.*?<!--@end-->', '', t, flags=re.S)
            if '/*@accents start*/' in t:
                css = '\n'.join(f':root[data-accent="{a["id"]}"]{{--acc:{a["acc"]};--acc-ink:{a["ink"]};--acc-ink3:{a["ink3"]}}}' for a in accs)
                t = re.sub(r'/\*@accents start\*/.*?/\*@accents end\*/', '/*@accents start*/\n' + css + '\n/*@accents end*/', t, flags=re.S)
            if '<!--@accent-buttons start-->' in t:
                btns = '\n'.join(f'    <button type="button" data-a="{a["id"]}" style="--c:{a["acc"]}" aria-pressed="{"true" if a is default or a["id"] == default["id"] else "false"}"><i></i><span>{a["name"]}</span></button>' for a in accs)
                t = re.sub(r'<!--@accent-buttons start-->.*?<!--@accent-buttons end-->', '<!--@accent-buttons start-->\n' + btns + '\n    <!--@accent-buttons end-->', t, flags=re.S)
            if f == 'reference-kit.html':
                if final: t = t.replace('<html lang="en-GB"', '<html lang="en-GB" data-accent-final', 1)
                md = rules_md.replace('</script', '<\\/script')
                t = t.replace('<!--@rules-md-->', f'<script type="text/markdown" id="website-rules">\n{md}</script>')
            open(p, 'w').write(t)

    # report
    print(f'Skinned {b["brand"]} into {out} ({"reference kit only: a supplied brand" if ref else "full guidelines"})')
    print(icon_note)
    print('\nAccents (copy into the rules sheet, section 4):')
    print('| Accent | --acc | --acc-ink (4.5:1) | --acc-ink3 (3:1) | ink on accent | white on accent |')
    for a in accs:
        ik = ratio(n['n-950'], a['acc']); wk = ratio('#FFFFFF', a['acc'])
        print(f'| {a["name"]} | {a["acc"]} | {a["ink"]} | {a["ink3"]} | {ik:.2f}:1{" FAIL" if ik < 4.5 else ""} | {wk:.2f}:1{" (not allowed)" if wk < 4.5 else ""} |')
    print('\nNeutral scale:', ', '.join(f'{k} {v}' for k, v in n.items()))
    t = ratio(n['n-500'], '#FFFFFF')
    print(f'Captions (--n-500 on white): {t:.2f}:1{" FAIL, darken ink or set n-500" if t < 4.5 else ""}')
    left = sum(open(os.path.join(d, f)).read().count('[[') for d, _, fs in os.walk(out) for f in fs if f.endswith(('.html', '.md', '.txt')) and f not in ('CONTRACT.md', 'README.md'))
    print(f'\n{left} content placeholders [[...]] to fill. Run: python3 tools/check.py {out}')

if __name__ == '__main__':
    main()
