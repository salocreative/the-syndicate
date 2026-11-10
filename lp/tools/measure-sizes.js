// Measure how wide every image-bank photo is drawn, at the edges of each layout range, and write tools/img-sizes.json.
// Photos with object-fit: cover count at the width the photo is drawn, not the width of its box.
// The build turns these into each photo's `sizes` attribute, so the browser fetches the smallest copy that stays sharp.
// Run after layout changes: python3 -m http.server 8765 (from the repo), then NODE_PATH=$(npm root -g) node tools/measure-sizes.js
const { chromium } = require('playwright');const fs=require('fs');const path=require('path');
const base=process.argv[2]||'http://localhost:8765/dist/';
const pages=['index','thank-you'];
const VPS=[360,719,720,1023,1024,1439,1440,1919,1920,2560];   // 2560 so large monitors get sharp photos
(async()=>{const b=await chromium.launch();const out={};
for(const pg of pages){const per={};
  for(const w of VPS){const m=w<720;const p=await b.newPage({viewport:{width:w,height:w>2000?1440:900},isMobile:m,hasTouch:m});
    await p.route('**/maps**',r=>r.abort());await p.goto(base+pg+'.html');await p.waitForTimeout(1200);
    const list=await p.evaluate(()=>{const seen={};return [...document.querySelectorAll('img')].map(i=>{const s=i.getAttribute('src')||'';if(!s.includes('site-images/'))return null;
      const k=s.replace(/^.*?site-images\//,'site-images/').replace(/-\d+\.webp$/,'.webp');seen[k]=(seen[k]||0)+1;
      const r=i.getBoundingClientRect(),cs=getComputedStyle(i),ar=(+i.getAttribute('width')||i.naturalWidth||1)/(+i.getAttribute('height')||i.naturalHeight||1);
      /* object-fit: cover draws the photo wider than its box when the box is taller than the photo (a full-height frame on a phone) */
      const h=i.offsetHeight||r.height;   /* layout height, so a box scaled to 0 for its reveal still counts */
      const w=cs.objectFit==='cover'&&h>0?Math.max(r.width,h*ar):r.width;
      return {k:k+'#'+seen[k],w,cls:i.className}}).filter(Boolean)});
    for(const it of list){(per[it.k]=per[it.k]||{cls:it.cls,w:{}}).w[w]=it.w;}
    await p.close();}
  out[pg]=per;}
fs.writeFileSync(path.join(__dirname,'img-sizes.json'),JSON.stringify(out,null,1));
console.log('measured',Object.values(out).reduce((a,o)=>a+Object.keys(o).length,0),'image slots');await b.close()})();
