#!/usr/bin/env python3
"""Turn the Concept review tab on and off in a guidelines site, and move it between rounds.

    python3 tools/concept-review.py on    <folder> --password WORDS [--endpoint URL] [--key KEY] [--reply-by 2026-11-06] [--signers "Name One, Name Two"]
    python3 tools/concept-review.py round <folder> --round 2 [--reply-by 2026-11-13] [--change "What changed"]...
    python3 tools/concept-review.py close <folder>
    python3 tools/concept-review.py off   <folder>

<folder> is the brand's guidelines folder (with site/ and concept-review/) or the site folder itself.

on     copies concept-review.html and concept/ into the site (keeps them if already there), writes the
       settings, and adds Concept review to the top navigation and the cover, plus the walkthrough video link.
round  starts a new review round: the round number, reply-by date and the list of what changed.
close  makes the review read only once the design is signed off (also set the project to closed in the sheet).
off    removes the tab, the concept files and the links. Do this at launch.

The password is a light screen so people who land on the guidelines don't see the concept by accident.
It isn't encryption: never put anything confidential in the concept.
"""
import argparse, json, os, re, shutil, sys

def fnv(s):
    h = 0x811c9dc5
    for c in s.encode('utf-8'):
        h ^= c; h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'

def paths(folder, src):
    folder = os.path.abspath(folder)
    site = os.path.join(folder, 'site') if os.path.isdir(os.path.join(folder, 'site')) else folder
    cands = [src] if src else [os.path.join(folder, 'concept-review'), os.path.join(os.path.dirname(site), 'concept-review'),
                               os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'concept-review')]
    src = next((c for c in cands if c and os.path.isfile(os.path.join(c, 'concept-review.html'))), None)
    return site, src

def config(page, **vals):
    t = open(page).read()
    m = re.search(r'const CONFIG = \{\n(.*?)\n\};', t, re.S)
    if not m: sys.exit(f'No CONFIG block in {page}')
    body = m.group(1)
    for k, v in vals.items():
        if v is None: continue
        line = f'  {k}: {json.dumps(v, ensure_ascii=False)}'
        if re.search(rf'^  {k}: .*?,?$', body, re.M):
            body = re.sub(rf'^  {k}: .*?(,?)$', lambda mm: line + mm.group(1), body, count=1, flags=re.M)
        else:
            body += ',\n' + line
    t = t[:m.start(1)] + body + t[m.end(1):]
    open(page, 'w').write(t)
    return t

def project(page):
    m = re.search(r"^  project: ['\"]([^'\"]+)['\"]", open(page).read(), re.M)
    return m.group(1) if m else ''

LINK = '<a href="concept-review.html" data-internal data-concept-link>Concept review</a>'
CARD = '<a href="concept-review.html" data-internal data-concept-link>Concept review</a>'
# The walkthrough video, a text link at the end of the cover's download row. It's generic (no client or dates), so every
# project uses the same one unless --video gives another. --video none leaves it out.
VIDEO = 'https://docs.google.com/videos/d/182V_MD2pHden9JS8peq3vETTI1ekSdAsILSUG91kn7c/play?usp=sharing'
HELP = ('<a class="cover-help" href="%s" target="_blank" rel="noopener" data-concept-link><span>Need help?</span><i aria-hidden="true"><svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg></i><b>Watch the concept review demo</b><span class="sr"> (opens in a new tab)</span></a>')

def links(site, on, video=VIDEO):
    changed = []
    for f in ('index.html', 'reference-kit.html'):
        p = os.path.join(site, f)
        if not os.path.exists(p): continue
        t = open(p).read(); o = t
        t = re.sub(r'\s*<a [^>]*data-concept-link[^>]*>.*?</a>', '', t)
        if on:
            t = re.sub(r'(<nav class="pnav"[^>]*>.*?)(</nav>)', lambda m: m.group(1) + LINK + m.group(2), t, flags=re.S)
            t = re.sub(r'(<nav class="cover-cards"[^>]*>.*?)(\s*</nav>)', lambda m: m.group(1) + '\n        ' + CARD + m.group(2), t, flags=re.S)
            if video and video != 'none':
                t = re.sub(r'(<div class="cover-dl">.*?)(\s*</div>)', lambda m: m.group(1) + '\n        ' + HELP % video + m.group(2), t, count=1, flags=re.S)
        if t != o: open(p, 'w').write(t); changed.append(f)
    return changed

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['on', 'round', 'close', 'off'])
    ap.add_argument('folder')
    ap.add_argument('--password'); ap.add_argument('--endpoint'); ap.add_argument('--key')
    ap.add_argument('--reply-by'); ap.add_argument('--round', type=int)
    ap.add_argument('--change', action='append'); ap.add_argument('--src')
    ap.add_argument('--video', default=VIDEO, help='walkthrough video link for the cover (default: the generic Salo video; none to leave it out)')
    ap.add_argument('--signers', help='who can sign off, comma separated full names; their emails go in the Projects tab signers column, not here')
    a = ap.parse_args()
    site, src = paths(a.folder, a.src)
    page = os.path.join(site, 'concept-review.html')

    if a.cmd == 'on':
        if not os.path.exists(page):
            if not src: sys.exit('Concept review source not found. Pass --src <folder with concept-review.html>.')
            shutil.copy(os.path.join(src, 'concept-review.html'), page)
        if not os.path.isdir(os.path.join(site, 'concept')):
            shutil.copytree(os.path.join(src, 'concept'), os.path.join(site, 'concept'))
        if not a.password: sys.exit('Add --password. Share it with the reviewers separately from the link.')
        slug = project(page)
        config(page, endpoint=a.endpoint, key=a.key, **{'pass': fnv(f'{slug}:{a.password.strip()}')},
               replyBy=a.reply_by, round=a.round, closed=False,
               signers=[s.strip() for s in a.signers.split(',') if s.strip()] if a.signers else None)
        if not a.signers and not re.search(r'^  signers: \[\s*"', open(page).read(), re.M):
            print('No signers yet: anyone with the password can sign off, and the sign-off is marked not verified. Add --signers and the Projects tab signers column.')
        ch = links(site, True, a.video)
        print(f'Concept review on for {slug}. Links added to: {", ".join(ch) or "already there"}.')
        print('Next: write the approved prototype into site/concept/ with the website repo\'s tools/concept.py (every page, the page list and the review hooks;')
        print('it never overwrites review.js). For a homepage only, site/concept/home.html with data-section and data-label on each section is enough.')
        print(f'add a row for "{slug}" to the Projects tab of the review sheet (same key, status open), then release the guidelines.')
        print('Before the client sees it, run the live data test in concept-review/SETUP.md.')
        if re.search(r"^  endpoint: (''|\"\")", open(page).read(), re.M):
            print('No endpoint yet: comments save in this browser only (preview mode). Add --endpoint and --key before the client sees it.')
    elif a.cmd == 'round':
        if not os.path.exists(page): sys.exit('Concept review is off. Run on first.')
        config(page, round=a.round, replyBy=a.reply_by, changes=a.change or [])
        print('Round updated. Release the guidelines so reviewers see it.')
        print('Content edits are matched by data-edit, or by position in the section. If you moved or added text or photos, check the Edit content list after release.')
    elif a.cmd == 'close':
        if not os.path.exists(page): sys.exit('Concept review is off.')
        config(page, closed=True)
        print('Review closed (read only). Also set the project to closed in the review sheet, then release the guidelines.')
    elif a.cmd == 'off':
        if os.path.exists(page): os.remove(page)
        if os.path.isdir(os.path.join(site, 'concept')): shutil.rmtree(os.path.join(site, 'concept'))
        ch = links(site, False)
        print(f'Concept review removed. Links taken out of: {", ".join(ch) or "none found"}.')
        print('Set the project to archived in the review sheet (the comments stay there as the record), then release the guidelines.')
        print('The release prompt must delete concept-review.html and concept/ from the repo, because releases copy without deleting.')

if __name__ == '__main__':
    main()
