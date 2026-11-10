// Transfer sizes over a gzip + caching server (serve.py). cold = first visit to that page; warm = the same page after visiting home.
// Run: node warm.js <base url> <out.json>
const { chromium } = require('playwright');
const pages=['index','thank-you'];
async function visit(ctx,url,scroll,h){const p=await ctx.newPage();const c=await ctx.newCDPSession(p);await c.send('Network.enable');
 const reqs={};let bytes=0,n=0,cached=0;
 c.on('Network.responseReceived',e=>{reqs[e.requestId]={cache:e.response.fromDiskCache||e.response.fromPrefetchCache,url:e.response.url}});
 c.on('Network.requestServedFromCache',e=>{reqs[e.requestId]={cache:true}});
 c.on('Network.loadingFinished',e=>{const r=reqs[e.requestId]||{};if(r.url&&r.url.startsWith('data:'))return;if(r.cache){cached++;return;}n++;bytes+=e.encodedDataLength;});
 await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(2000);const init={n,bytes};
 if(scroll){const H=await p.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<H+2000;y+=h*.6){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(100);}await p.waitForTimeout(2000);}
 await p.close();return {init,full:{n,bytes},cached};}
(async()=>{const [,,base,out]=process.argv;const b=await chromium.launch();const res={};
for(const vp of [{n:'desktop',w:1440,h:900,m:false,d:2},{n:'mobile',w:390,h:844,m:true,d:3}]){
 const opts={viewport:{width:vp.w,height:vp.h},isMobile:vp.m,hasTouch:vp.m,deviceScaleFactor:vp.d};
 for(const pg of pages){const ctx=await b.newContext(opts);await ctx.route('**/maps/**',r=>r.continue());
   const cold=await visit(ctx,base+pg+'.html',true,vp.h);await ctx.close();
   const ctx2=await b.newContext(opts);await visit(ctx2,base+'index.html',false,vp.h);const warm=await visit(ctx2,base+pg+'.html',false,vp.h);await ctx2.close();
   res[vp.n+':'+pg]={cold,warm};
   console.log((vp.n+':'+pg).padEnd(18),'cold init',cold.init.n,'req',(cold.init.bytes/1024).toFixed(0)+'KB','full',cold.full.n,'req',(cold.full.bytes/1024).toFixed(0)+'KB','| warm init',warm.init.n,'req',(warm.init.bytes/1024).toFixed(0)+'KB');}}
require('fs').writeFileSync(out,JSON.stringify(res,null,1));await b.close();})();
