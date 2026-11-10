#!/usr/bin/env python3
"""Build the logo download zips from the SVGs in site/assets/logo/.

    python3 tools/logo-sets.py <site folder> <slug> [--clear 0.5] [--brand "Acme"]

Expects SVG pairs named <slug>-<version>-black.svg and <slug>-<version>-white.svg, plus
<slug>-profile-dark.svg / -light.svg and <slug>-favicon-black.svg / -white.svg.
Writes, for every version:
  assets/logo/sets/<slug>-<version>-svg.zip, -png.zip, -pdf.zip   (black and white inside)
  assets/logo/sets/<slug>-<version>-clear-space-*.zip             (not for profile or favicon)
and assets/logo/<slug>-logo-suite.zip with everything.
--clear is the clear space on each side as a fraction of the logo's height (default 0.5).
Set it to match the guidelines' x. PNGs are rendered at 4x the SVG's size with a transparent
background. Needs Python Playwright (pip install playwright).
"""
import os, re, sys, zipfile, tempfile
from playwright.sync_api import sync_playwright

def size(svg):
    m = re.search(r'viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"', svg)
    return float(m.group(1)), float(m.group(2))

def pad(svg, f):
    w, h = size(svg); p = h * f
    inner = re.sub(r'^.*?<svg[^>]*>', '', svg, count=1, flags=re.S).rsplit('</svg>', 1)[0]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-p:g} {-p:g} {w + 2 * p:g} {h + 2 * p:g}" '
            f'width="{w + 2 * p:g}" height="{h + 2 * p:g}">{inner}</svg>')

def main():
    a = sys.argv[1:]
    if len(a) < 2: sys.exit(__doc__)
    site, slug = a[0], a[1]
    clear = float(a[a.index('--clear') + 1]) if '--clear' in a else 0.5
    brand = a[a.index('--brand') + 1] if '--brand' in a else slug.title()
    L = os.path.join(site, 'assets/logo'); S = os.path.join(L, 'sets'); os.makedirs(S, exist_ok=True)
    files = sorted(f for f in os.listdir(L) if f.startswith(slug + '-') and f.endswith('.svg'))
    versions = {}
    for f in files:
        m = re.match(rf'{re.escape(slug)}-(.+)-(black|white|dark|light)\.svg$', f)
        if m: versions.setdefault(m.group(1), []).append((m.group(2), f))
    tmp = tempfile.mkdtemp(); suite = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        def render(svg, stem):
            w, h = size(svg)
            open(f'{tmp}/{stem}.svg', 'w').write(svg)
            pg2 = b.new_page(device_scale_factor=4, viewport={'width': max(1, round(w)), 'height': max(1, round(h))})
            pg2.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg", "<svg style=\'display:block;width:100vw;height:100vh\'", 1)}</body></html>')
            pg2.screenshot(path=f'{tmp}/{stem}.png', omit_background=True)
            pg2.pdf(path=f'{tmp}/{stem}.pdf', width=f'{w}px', height=f'{h}px', print_background=False, page_ranges='1')
            pg2.close()
        for v, cols in versions.items():
            nocs = v in ('profile', 'favicon')
            for cs in ([False] if nocs else [False, True]):
                stems = []
                for col, f in cols:
                    svg = open(os.path.join(L, f)).read()
                    if cs: svg = pad(svg, clear)
                    stem = f'{slug}-{v}-{col}' + ('-clear-space' if cs else '')
                    render(svg, stem); stems.append((col, stem))
                for fmt in ('svg', 'png', 'pdf'):
                    z = os.path.join(S, f'{slug}-{v}{"-clear-space" if cs else ""}-{fmt}.zip')
                    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
                        for col, stem in stems:
                            zf.write(f'{tmp}/{stem}.{fmt}', f'{stem}.{fmt}')
                            suite.append((f'{tmp}/{stem}.{fmt}', f'{brand} logo suite/{v.title()}/{col.title()}/{fmt.upper()}/{stem}.{fmt}'))
        b.close()
    with zipfile.ZipFile(os.path.join(L, f'{slug}-logo-suite.zip'), 'w', zipfile.ZIP_DEFLATED) as zf:
        for src, arc in suite: zf.write(src, arc)
    print(f'{len(versions)} versions, {len(os.listdir(S))} zips, suite of {len(suite)} files')

if __name__ == '__main__':
    main()
