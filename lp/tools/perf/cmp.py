from PIL import Image,ImageChops
import sys,os
a,b=sys.argv[1],sys.argv[2];os.makedirs(b+'-diff',exist_ok=True)
for f in sorted(os.listdir(a)):
    A=Image.open(f'{a}/{f}').convert('RGB');B=Image.open(f'{b}/{f}').convert('RGB')
    if A.size!=B.size:print(f,'SIZE',A.size,B.size);h=min(A.height,B.height);A=A.crop((0,0,A.width,h));B=B.crop((0,0,B.width,h))
    d=ImageChops.difference(A,B).convert('L');px=d.point(lambda v:255 if v>40 else 0)
    n=sum(1 for v in px.getdata() if v);tot=A.width*A.height
    print(f'{f:22} {100*n/tot:6.3f}% pixels differ (>40)')
    if n/tot>0.002:
        bb=px.getbbox();px.save(f'{b}-diff/{f}')
        print('   bbox',bb)
