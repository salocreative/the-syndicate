#!/usr/bin/env python3
"""Pre-release checks for a skinned brand guidelines folder.

    python3 tools/check.py <folder> [--forbid "Name one,Name two"]

Fails (exit 1) if it finds:
- content placeholders [[...]] or template placeholders {{...}} still in place
- names passed with --forbid (other clients, old brand names) anywhere in the text files
- hex colours outside the token and accent blocks (the email signature CONFIG is allowed)
- Google Fonts links, or photos embedded in the HTML as data
- links to files in assets/ that don't exist
Warns about [TBC] markers, which are allowed but should be listed for the client.
"""
import os, re, sys

def main():
    args = sys.argv[1:]
    if not args: sys.exit(__doc__)
    root = os.path.abspath(args[0])
    forbid = []
    if '--forbid' in args: forbid = [w.strip() for w in args[args.index('--forbid') + 1].split(',') if w.strip()]
    site = os.path.join(root, 'site') if os.path.isdir(os.path.join(root, 'site')) else root
    fails, warns = [], []
    for d, _, files in os.walk(root):
        if '/.git' in d or '/tools' in d or os.path.relpath(d, root).split(os.sep)[0] == 'concept-review': continue
        for f in files:
            if not f.endswith(('.html', '.md', '.txt')) or f in ('CONTRACT.md',) or (f == 'README.md' and d == root): continue
            p = os.path.join(d, f); rel = os.path.relpath(p, root); t = open(p, encoding='utf-8').read()
            for i, line in enumerate(t.split('\n'), 1):
                for m in re.findall(r'\[\[[^\]]*\]\]', line): fails.append(f'{rel}:{i} placeholder {m[:70]}')
                for m in re.findall(r'\{\{[A-Z_]+\}\}', line): fails.append(f'{rel}:{i} unfilled {m}')
                for w in forbid:
                    if re.search(r'\b' + re.escape(w) + r'\b', line, re.I): fails.append(f'{rel}:{i} forbidden name "{w}"')
                if '[TBC]' in line: warns.append(f'{rel}:{i} [TBC]')
            if f.endswith('.html'):
                body = re.sub(r'/\*@tokens start\*/.*?/\*@tokens end\*/', '', t, flags=re.S)
                body = re.sub(r'/\*@accents start\*/.*?/\*@accents end\*/', '', body, flags=re.S)
                body = re.sub(r'<!--@accent-buttons start-->.*?<!--@accent-buttons end-->', '', body, flags=re.S)
                body = re.sub(r'<!--@palette start-->.*?<!--@palette end-->', '', body, flags=re.S)
                body = re.sub(r'const CONFIG = \{.*?\n\};', '', body, flags=re.S)
                body = re.sub(r'<script type="text/markdown".*?</script>', '', body, flags=re.S)
                for m in re.finditer(r'#[0-9A-Fa-f]{6}\b', body):
                    fails.append(f'{rel} hard-coded colour {m.group(0)} near "{body[max(0, m.start() - 40):m.start()].strip()[-40:]}"')
                if '@reference-only' in t and os.path.basename(root) != 'template': fails.append(f'{rel} still has reference-only markers; run it through tools/skin.py')
                if 'fonts.googleapis.com' in t or 'fonts.gstatic.com' in t: fails.append(f'{rel} loads Google Fonts; fonts should be self-hosted')
                if re.search(r'data:image/(webp|jpe?g|png);base64', t): fails.append(f'{rel} has a photo embedded as data; use a file in assets/website/photos/')
                for m in re.findall(r'(?:src|href)="((?:\.\./site/)?assets/[^"#?]+)"', t):
                    if "'+" in m: continue
                    q = os.path.normpath(os.path.join(d, m))
                    if not os.path.exists(q): fails.append(f'{rel} links to missing file {m}')
                for m in re.findall(r'url\(((?:\.\./site/)?assets/[^)]+)\)', t):
                    q = os.path.normpath(os.path.join(d, m.strip('"\'')))
                    if not os.path.exists(q): fails.append(f'{rel} CSS links to missing file {m}')
    print(f'{len(fails)} problems, {len(warns)} [TBC] markers')
    for x in fails[:400]: print('  FAIL', x)
    if len(fails) > 400: print(f'  ... and {len(fails) - 400} more')
    for x in warns[:60]: print('  TBC ', x)
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    main()
