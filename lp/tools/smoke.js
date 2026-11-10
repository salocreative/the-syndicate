// Smoke test: the build checks that need a browser, in one command. Run it after every build, before a round goes out.
//   NODE_PATH=$(npm root -g) node tools/smoke.js [dist] [--widths 390,768,1024,1440,2560] [--pages index,contact] [--update]
// Serves the folder itself (default dist/). Exits 1 if anything fails. Writes tools/smoke-report.json.
// Settings for the project go in tools/smoke.config.json: wrap (the centred container), slide (a carousel slide, timed),
// preload (sections whose photos must load early), cookie (notice to remove), button (button class), hiddenOk (text that is meant to stay hidden
// until hover, such as team bios), churn (class changes a second allowed while scrolling).
// --update saves each page's height as the new baseline (tools/smoke-baseline.json). Do that once a round is approved.
//
// Per page, per width (touch screen below 1100px, phone below 500px):
//   console     no script errors, no failed requests (the map embed is skipped)
//   overflow    no sideways scroll, and no heading, text or button past the screen edge unless it sits in a carousel
//   centring    every container (wrap) is centred (left gap = right gap), so wide screens don't drift off-centre
//   images      every photo that comes into view has loaded within 500ms; drawn width against file width
//   preload     carousels, hover photos and pinned sections (the preload selector) have every photo loaded before they arrive
//   churn       class changes per second while scrolling stay low (a timer firing every few ms shows up here first)
//   timers      the spotlight changes slide no faster than once a second
//   values      (once) every custom property in the shipped CSS reads exactly as in the source, so 5000ms never becomes 5s
//   shift       layout shift under 0.1
//   height      page height within 3% of the baseline (broken CSS makes pages balloon or shrink)
//   frames      long frames (over 50ms) while wheel-scrolling, reported for comparison between rounds (warning only)
// Once, at 1440px with reduced motion on: no text left hidden.
const { chromium } = require('playwright');const fs=require('fs');const path=require('path');const http=require('http');
const args=process.argv.slice(2);const opt=(k,d)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1];};
const pos=args.filter((a,i)=>!a.startsWith('--')&&!['--widths','--pages'].includes(args[i-1]));
const root=path.resolve(pos[0]||path.join(__dirname,'..','dist'));
const WIDTHS=opt('widths','390,768,1024,1440,2560').split(',').map(Number);
const PAGES=(opt('pages',null)||fs.readdirSync(root).filter(f=>f.endsWith('.html')).map(f=>f.slice(0,-5)).join(',')).split(',');
const CFGF=path.join(__dirname,'smoke.config.json');const CFG={wrap:'.wrap',slide:'[data-slide]',preload:'[data-preload]',cookie:'[data-cookie]',button:'.btn',hiddenOk:[],churn:60,...(fs.existsSync(CFGF)?JSON.parse(fs.readFileSync(CFGF,'utf8')):{})};
const BASE=path.join(__dirname,'smoke-baseline.json');const baseline=fs.existsSync(BASE)?JSON.parse(fs.readFileSync(BASE,'utf8')):{};
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}
  r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});

const IN_PAGE=SLIDE=>{window.__smoke={cls:0,cls0:0,shift:0,spot:[]};
  new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)__smoke.shift+=e.value;})).observe({type:'layout-shift',buffered:true});
  new MutationObserver(ms=>ms.forEach(m=>{__smoke.cls++;const t=m.target;if(t.classList&&t.matches&&t.matches(SLIDE)&&t.classList.contains('is-on'))__smoke.spot.push(performance.now());}))
    .observe(document,{subtree:true,attributes:true,attributeFilter:['class']});};

const clipped=el=>{for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const o=getComputedStyle(a).overflowX;if(o!=='visible')return true;}return false;};

// values: every custom property in the shipped CSS must read exactly as written in the source (a minifier once turned 5000ms into 5s)
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.css')?[path.join(d,e.name)]:[]);
const props=t=>{const m={};t=t.replace(/\/\*[\s\S]*?\*\//g,'');for(const x of t.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g))(m[x[1]]=m[x[1]]||new Set()).add(x[2].trim().replace(/\s+/g,' '));return m;};
const valueCheck=()=>{const repo=path.join(__dirname,'..');const src={};for(const d of ['tokens','components'])if(fs.existsSync(path.join(repo,d)))for(const f of walk(path.join(repo,d)))
    for(const [k,v] of Object.entries(props(fs.readFileSync(f,'utf8'))))v.forEach(x=>(src[k]=src[k]||new Set()).add(x));
  const bad=[];for(const f of walk(root))for(const [k,v] of Object.entries(props(fs.readFileSync(f,'utf8'))))v.forEach(x=>{if(src[k]&&!src[k].has(x)&&![...src[k]].some(y=>y.replace(/\s/g,'').replace(/'/g,'"')===x.replace(/\s/g,'').replace(/'/g,'"')))bad.push(`${k}:${x}`);});
  return [...new Set(bad)];};
(async()=>{await new Promise(r=>server.listen(0,r));const url=`http://localhost:${server.address().port}/`;
const b=await chromium.launch();const report=[];const heights={};let fails=0;
const out=(pg,w,check,ok,detail,warn)=>{report.push({page:pg,width:w,check,ok,detail});if(!ok&&!warn)fails++;
  if(!ok)console.log(`${warn?'WARN':'FAIL'}  ${pg} @${w}  ${check}: ${detail}`);};
{const bad=valueCheck();out('all css','-','values',!bad.length,bad.length+' changed: '+bad.slice(0,6).join(', '));}
for(const pg of PAGES)for(const w of WIDTHS){
  const touch=w<1100,phone=w<500,vh=w>2000?1440:phone?844:touch?1024:900;
  const ctx=await b.newContext({viewport:{width:w,height:vh},isMobile:phone,hasTouch:touch});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  p.on('requestfailed',r=>{if(!/maps|google/.test(r.url()))errs.push('failed '+r.url().replace(url,''));});
  await p.route(/google\.com\/maps|maps\.google/,r=>r.abort());await p.addInitScript(IN_PAGE,CFG.slide);
  await p.goto(url+pg+'.html',{waitUntil:'load'});await p.waitForTimeout(1500);
  await p.evaluate(sel=>document.querySelectorAll(sel).forEach(c=>c.remove()),CFG.cookie);
  // preload: stop just before each [data-preload] section or spotlight and check its photos are already there
  const pre=await p.evaluate(async sel=>{const bad=[];const secs=[...document.querySelectorAll(sel)];
    for(const s of secs){const top=s.getBoundingClientRect().top+scrollY;scrollTo(0,Math.max(0,top-innerHeight*1.05));await new Promise(r=>setTimeout(r,900));
      const all=[...s.querySelectorAll('img')].filter(i=>i.getAttribute('src')||i.srcset),miss=all.filter(i=>!(i.complete&&i.naturalWidth));if(miss.length)bad.push(`${s.dataset.section||s.className.split(' ').pop()}: ${miss.length} of ${all.length}`);}
    scrollTo(0,0);return bad;},CFG.preload);
  out(pg,w,'preload',!pre.length,pre.join('; '));
  // scroll through: photos in view, churn, frames
  await p.evaluate(()=>{__smoke.cls0=__smoke.cls;});const t0=Date.now();
  const late=await p.evaluate(async()=>{const late=new Set(),soft=[],big=[];const H=document.documentElement.scrollHeight;
    for(let y=0;y<=H;y+=Math.round(innerHeight*.6)){scrollTo(0,y);await new Promise(r=>setTimeout(r,500));
      document.querySelectorAll('img[src],img[srcset]').forEach(i=>{const r=i.getBoundingClientRect();if(r.width<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
        const cs=getComputedStyle(i);if(cs.visibility==='hidden')return;
        if(!(i.complete&&i.naturalWidth))late.add((i.currentSrc||i.src).split('/').pop());
        else if(i.srcset&&r.height>1){const ar=(+i.getAttribute('width')||1)/(+i.getAttribute('height')||1),dw=cs.objectFit==='cover'?Math.max(r.width,r.height*ar):r.width,need=dw*devicePixelRatio;
          /* naturalWidth is scaled by the srcset density, so read the file's own width from its srcset entry */
          const cur=decodeURI(i.currentSrc.split('/').pop()),hit=i.srcset.split(',').map(x=>x.trim().split(/\s+/)).find(([u])=>decodeURI(u.split('/').pop())===cur),fw=hit&&hit[1]?parseInt(hit[1]):+i.getAttribute('width');
          if(fw<need*.8)soft.push(cur+' ('+fw+'px file, drawn '+Math.round(need)+'px)');}});}
    return {late:[...late],soft:[...new Set(soft)]};});
  const churn=Math.round((await p.evaluate(()=>__smoke.cls-__smoke.cls0))/((Date.now()-t0)/1000));
  out(pg,w,'images',!late.late.length,late.late.length+' not loaded in view: '+late.late.slice(0,5).join(', '));
  out(pg,w,'images-sharp',!late.soft.length,'drawn wider than file: '+late.soft.slice(0,5).join(', '),true);
  out(pg,w,'churn',churn<CFG.churn,churn+' class changes a second while scrolling');
  // frames while wheel-scrolling (desktop only; touch emulation has no wheel)
  if(!touch){await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(300);
    await p.evaluate(()=>{window.__fr=[];let l=performance.now();const f=t=>{__fr.push(t-l);l=t;if(__fr.length<2000)requestAnimationFrame(f);};requestAnimationFrame(f);});
    for(let i=0;i<40;i++){await p.mouse.wheel(0,250);await p.waitForTimeout(40);}
    const long=await p.evaluate(()=>__fr.filter(x=>x>50).length);out(pg,w,'frames',long<=10,long+' frames over 50ms',true);}
  // layout checks at rest, at the top of each section
  const lay=await p.evaluate(([clippedSrc,WRAP,BTN])=>{const clipped=eval(clippedSrc);const cw=document.documentElement.clientWidth;const off=[],drift=[];
    const sw=document.documentElement.scrollWidth;
    document.querySelectorAll('h1,h2,h3,h4,p,li,button,'+BTN).forEach(el=>{const r=el.getBoundingClientRect();if(r.width<1||!el.textContent.trim())return;
      const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;
      if((r.left<-1||r.right>cw+1)&&!clipped(el))off.push(el.tagName+' "'+el.textContent.trim().slice(0,30)+'" at '+Math.round(r.left)+' to '+Math.round(r.right));});
    document.querySelectorAll(WRAP).forEach(el=>{const r=el.getBoundingClientRect();if(r.width<1||clipped(el))return;
      const L=r.left,R=cw-r.right;if(Math.abs(L-R)>2)drift.push((el.className.split(' ')[1]||el.parentElement.className.split(' ').pop())+` L${Math.round(L)} R${Math.round(R)}`);});
    return {sw,cw,off:[...new Set(off)],drift:[...new Set(drift)],h:document.documentElement.scrollHeight,
      shift:__smoke.shift,spot:__smoke.spot};},[clipped.toString(),CFG.wrap,CFG.button]);
  out(pg,w,'overflow',lay.sw<=lay.cw+1&&!lay.off.length,(lay.sw>lay.cw+1?`page scrolls sideways (${lay.sw} > ${lay.cw}); `:'')+lay.off.slice(0,4).join('; '));
  out(pg,w,'centring',!lay.drift.length,lay.drift.slice(0,4).join('; '));
  out(pg,w,'shift',lay.shift<.1,'layout shift '+lay.shift.toFixed(3));
  const gaps=lay.spot.slice(1).map((t,i)=>t-lay.spot[i]);out(pg,w,'timers',!gaps.some(g=>g<1000),'spotlight changed slide after '+Math.round(Math.min(...gaps))+'ms');
  heights[`${pg}@${w}`]=lay.h;const was=baseline[`${pg}@${w}`];
  out(pg,w,'height',!was||Math.abs(lay.h-was)/was<.03,`page height ${lay.h}px, baseline ${was}px`);
  out(pg,w,'console',!errs.length,errs.slice(0,4).join('; '));
  await ctx.close();process.stdout.write('.');}
// reduced motion: nothing left hidden
for(const pg of PAGES){const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const p=await ctx.newPage();
  await p.route(/google\.com\/maps|maps\.google/,r=>r.abort());await p.goto(url+pg+'.html');await p.waitForTimeout(800);
  const hid=await p.evaluate(async([ok,BTN,CK])=>{const bad=new Set();const H=document.documentElement.scrollHeight;
    for(let y=0;y<=H;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));
      document.querySelectorAll('h1,h2,h3,p,'+BTN).forEach(el=>{const r=el.getBoundingClientRect();if(r.width<1||r.bottom<0||r.top>innerHeight||!el.textContent.trim()||el.closest('[aria-hidden="true"],'+CK+(ok.length?','+ok.join(','):'')))return;
        let o=1;for(let a=el;a;a=a.parentElement)o*=parseFloat(getComputedStyle(a).opacity);if(o<.1)bad.add(el.textContent.trim().slice(0,30));});}
    return [...bad];},[CFG.hiddenOk,CFG.button,CFG.cookie]);
  out(pg,1440,'reduced-motion',!hid.length,'hidden: '+hid.slice(0,4).join('; '));await ctx.close();}
await b.close();server.close();
fs.writeFileSync(path.join(__dirname,'smoke-report.json'),JSON.stringify(report,null,1));
if(args.includes('--update')){fs.writeFileSync(BASE,JSON.stringify({...baseline,...heights},null,1));console.log('\nbaseline heights saved');}
const warns=report.filter(r=>!r.ok).length-fails;
console.log(`\nsmoke: ${PAGES.length} pages x ${WIDTHS.length} widths, ${report.length} checks, ${fails} failed, ${warns} warnings`);process.exit(fails?1:0);})();
