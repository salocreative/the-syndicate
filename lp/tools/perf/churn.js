// node churn.js <base> [pages] : counts SVG redraws, class flips and running animations while idle and scrolling (finds flicker sources).
// Run it on the build before a change and after it; a jump in class changes means a timer or scroll handler firing far too often.
const { chromium } = require('playwright');
(async()=>{const base=process.argv[2];const b=await chromium.launch();
for(const pg of (process.argv[3]||'index,our-work,project,contact,careers').split(','))for(const w of [1440,2560]){
 const p=await b.newPage({viewport:{width:w,height:w>2000?1440:900}});
 await p.addInitScript(()=>{window.__m={svg:0,cls:0,style:0};new MutationObserver(ms=>ms.forEach(m=>{const t=m.target;
   if(m.type==='childList'&&(t.closest&&t.closest('svg')))__m.svg++;else if(m.attributeName==='class')__m.cls++;else if(m.attributeName==='style')__m.style++;}))
   .observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});});
 await p.goto(base+pg+'.html');await p.waitForTimeout(3500);
 await p.evaluate(()=>{__m={svg:0,cls:0,style:0};});
 await p.waitForTimeout(3000);const idle=await p.evaluate(()=>({...__m,anims:document.getAnimations().filter(a=>a.playState==='running').length}));
 await p.evaluate(()=>{__m={svg:0,cls:0,style:0};});
 for(let i=0;i<40;i++){await p.mouse.wheel(0,300);await p.waitForTimeout(50);}
 await p.waitForTimeout(500);const sc=await p.evaluate(()=>__m);
 console.log(pg.padEnd(9),w,'idle3s',JSON.stringify(idle),'scroll',JSON.stringify(sc));await p.close();}
await b.close();})();
