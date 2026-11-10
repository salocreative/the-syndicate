#!/usr/bin/env python3
"""Make the JPEG photos the A4 PDF uses.

Chrome embeds WebP backgrounds in a PDF uncompressed (megabytes per photo),
but passes JPEG through as it is. So the PDF source uses JPEG copies, plus a
pre-made mono copy of each (a CSS grayscale filter would be rasterised too).

Reads  site/assets/website/photos/photo-N.webp   (not the -m phone versions)
Writes pdf/photo-N.jpg and pdf/photo-N-mono.jpg  (max 1200px wide, quality 80)

Usage: python3 tools/pdf-photos.py [template-or-repo-root]
"""
import sys, re
from pathlib import Path
from PIL import Image, ImageOps

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
src, out = root / 'site/assets/website/photos', root / 'pdf'
out.mkdir(exist_ok=True)
done = 0
for f in sorted(src.glob('photo-*.webp')):
    if not re.fullmatch(r'photo-\d+\.webp', f.name):
        continue
    im = Image.open(f).convert('RGB')
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    im.save(out / (f.stem + '.jpg'), 'JPEG', quality=80, optimize=True)
    ImageOps.grayscale(im).save(out / (f.stem + '-mono.jpg'), 'JPEG', quality=80, optimize=True)
    done += 1
print(f'{done} photos -> {out}')
if not done:
    sys.exit('No photo-N.webp files found in ' + str(src))
