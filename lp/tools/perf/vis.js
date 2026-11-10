// node vis.js <base> <outdir>  (reduced-motion full-page screenshots for visual comparison; then python3 cmp.py <before> <after>)
const { chromium } = require('playwright');
const pages=['index','thank-you'];
(async()=>{const [,,base,out]=process.argv;require('fs').mkdirSync(out,{recursive:true});const b=await chromium.launch();
for(const [n,w,h,m] of [['d',1440,900,false],['m',390,844,true]])for(const pg of pages){
 const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:m,hasTouch:m,reducedMotion:'reduce'});const p=await ctx.newPage();
 await p.route('**/maps**',r=>r.abort());   // keep the Google map out of the comparison
 await p.goto(base+pg+'.html');await p.waitForTimeout(800);
 const H=await p.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<H;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60);}
 await p.evaluate(()=>{scrollTo(0,0);document.querySelectorAll('.xx-cookie').forEach(c=>c.remove());});
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete),null,{timeout:15000}).catch(()=>{});
 await p.waitForTimeout(800);await p.screenshot({path:`${out}/${pg}-${n}.png`,fullPage:true});await ctx.close();}
await b.close()})();
