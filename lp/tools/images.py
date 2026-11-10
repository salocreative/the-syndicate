"""Responsive copies of the image bank for the built site.
For every photo in site-images/ this writes WebP copies at standard widths (480, 800, 1200, 1600, 2000px; only those
smaller than the original) next to the original in <out>/site-images/. The original file is kept as the largest copy:
re-encoding it saved about 3%, not worth the loss. Copies are cached: a copy is only made again if the original changed.
Run on its own: python3 tools/images.py <out-dir>   (the build calls it for dist/)."""
import pathlib,sys,shutil,json
from PIL import Image
R=pathlib.Path(__file__).resolve().parent.parent
WIDTHS=(480,800,1200,1600,2000)
Q=80   # WebP quality for the resized copies (method 6, the slowest and smallest)
import re
# Photos that also get portrait crops for phones: any a block names in <source ... data-phone="site-images/..."> (for a photo that fills a phone screen)
PHONE={m for f in (R/'components').glob('*/*.html') for m in re.findall(r'data-phone="(site-images/[^"]+)"',f.read_text())}
PHONE_RATIO=0.5         # crop width to height: a little wider than a phone screen, so cover still has room
FOCAL={}                # file name -> horizontal focus, 0 left to 1 right (default the middle)

def variants(out):
    out=pathlib.Path(out)/'site-images';table={}
    for src in sorted((R/'site-images').rglob('*.webp')):
        rel=src.relative_to(R/'site-images');dst_dir=out/rel.parent;dst_dir.mkdir(parents=True,exist_ok=True)
        dst=dst_dir/rel.name
        if not dst.exists() or dst.stat().st_mtime<src.stat().st_mtime:shutil.copy2(src,dst)
        im=None;w0,h0=Image.open(src).size;items=[]
        for w in WIDTHS:
            if w>=w0-100:continue
            v=dst_dir/f'{src.stem}-{w}.webp'
            if not v.exists() or v.stat().st_mtime<src.stat().st_mtime:
                im=im or Image.open(src).convert('RGB')
                im.resize((w,round(h0*w/w0)),Image.LANCZOS).save(v,'WEBP',quality=Q,method=6)
            items.append((w,f'site-images/{rel.parent}/{v.name}'))
        items.append((w0,f'site-images/{rel}'))
        table[f'site-images/{rel}']=items
        if f'site-images/{rel}' in PHONE:   # portrait crops: the full height, and a lighter copy
            crops=[]
            for f in (1.0,0.62):
                ch=round(h0*f);cw=round(ch*PHONE_RATIO);v=dst_dir/f'{src.stem}-p{cw}.webp'
                if not v.exists() or v.stat().st_mtime<src.stat().st_mtime:
                    im=im or Image.open(src).convert('RGB')
                    full_w=round(h0*PHONE_RATIO);x=round((w0-full_w)*FOCAL.get(rel.name,.5))
                    im.crop((x,0,x+full_w,h0)).resize((cw,ch),Image.LANCZOS).save(v,'WEBP',quality=Q,method=6)
                crops.append((cw,f'site-images/{rel.parent}/{v.name}'))
            table[f'phone:site-images/{rel}']=sorted(crops)
    return table

if __name__=='__main__':
    t=variants(sys.argv[1] if len(sys.argv)>1 else R/'dist')
    print(len(t),'photos,',sum(len(v) for v in t.values()),'files')
