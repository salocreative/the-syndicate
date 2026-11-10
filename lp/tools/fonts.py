"""Trim the self-hosted fonts for the built site. Set FONTS (each font file and the weight range the pages use)
and ICONS (the icon names used) for the project. The variable fonts keep their weight axis, limited to that range,
so every weight in use draws exactly as before. Run: python3 tools/fonts.py <out-dir>"""
import pathlib,sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
R=pathlib.Path(__file__).resolve().parent.parent
FONTS={'jost-latin':(400,600)}
ICONS=''   # no icon font: icons are inline SVG
def build(out):
    out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True);sizes={}
    for name,(lo,hi) in FONTS.items():
        f=TTFont(R/f'assets/fonts/{name}.woff2');f=instancer.instantiateVariableFont(f,{'wght':(lo,hi)})
        f.flavor='woff2';f.save(out/f'{name}.woff2')
    for p in sorted(out.glob('*.woff2')):sizes[p.name]=(R/f'assets/fonts/{p.name}').stat().st_size,p.stat().st_size
    return sizes
if __name__=='__main__':
    for k,(a,b) in build(sys.argv[1]).items():print(k,a,'->',b)
