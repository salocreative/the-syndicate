/* Motion: reveals, split headlines, counters, parallax, the turning watermark, hero follow, magnetic buttons, tilt.
   One scroll handler and one pointer handler, each once per frame and only for what's on screen. Reduced motion: final state. */
(()=>{
  const d=document;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
  // One shared frame for every scroll-linked effect on the page: one scroll listener, one requestAnimationFrame, all reads
  // first and all writes after. Reads come from a cached layout (offsets, so transforms and reveals don't skew them),
  // measured once and again only on resize, on load or when the page height changes, so scrolling never forces a layout.
  const geo=new WeakMap();let gen=0;
  const box=el=>{let g=geo.get(el);if(!g||g.g!==gen){let t=0,l=0,n=el;while(n){t+=n.offsetTop;l+=n.offsetLeft;n=n.offsetParent}
    g={top:t,left:l,w:el.offsetWidth,h:el.offsetHeight,g:gen};geo.set(el,g)}return g};
  const memo=f=>{let at=-1,v;return()=>{if(at!==gen){at=gen;v=f()}return v}};
  const jobs=[];let queued=false;
  const run=()=>{queued=false;const y=scrollY,vh=innerHeight,vw=innerWidth,ws=[];
    for(const j of jobs){const w=j(y,vh,vw);if(w)ws.push(w)}for(const w of ws)w()};
  const ask=()=>{if(!queued){queued=true;requestAnimationFrame(run)}};
  const renew=()=>{gen++;ask()};
  addEventListener('scroll',ask,{passive:true});addEventListener('resize',renew);addEventListener('load',renew);
  if('ResizeObserver' in window)new ResizeObserver(renew).observe(d.documentElement);
  if(d.fonts&&d.fonts.ready)d.fonts.ready.then(renew);
  window.sy={box,memo,ask,renew,frame:j=>{jobs.push(j);ask()}};
  // Split headlines into words. Each word is wrapped twice (mask and mover), marked data-split and aria-hidden,
  // with a visually hidden full copy beside them for screen readers. <b> and <span> weights are kept per word.
  d.querySelectorAll('[data-split-words]').forEach(el=>{
    if(el.querySelector('[data-split]'))return;
    const sr=d.createElement('span');sr.className='sy-sr';sr.textContent=el.textContent.trim().replace(/\s+/g,' ');
    const vis=d.createElement('span');vis.setAttribute('aria-hidden','true');vis.setAttribute('data-split','');
    let i=0;
    // Text is split into words; inline elements (<b>, <span class>) are kept as wrappers so they can still be styled
    const walk=(node,out,tag)=>{node.childNodes.forEach(n=>{
      if(n.nodeType===3){n.textContent.split(/\s+/).filter(Boolean).forEach(w=>{
        const o=d.createElement('span');o.className='sy-split__w';o.setAttribute('data-split','');
        const m=d.createElement(tag&&tag!=='span'?tag:'span');m.className='sy-split__i'+(tag==='span'?' sy-lt':'');m.setAttribute('data-split','');m.style.setProperty('--i',i++);m.textContent=w;
        o.appendChild(m);out.appendChild(o);out.appendChild(d.createTextNode(' '))})}
      else if(n.nodeType===1){const t2=n.tagName.toLowerCase(),wr=d.createElement(t2);if(n.className)wr.className=n.className;wr.setAttribute('data-split','');out.appendChild(wr);walk(n,wr,t2)}})};
    walk(el,vis);el.textContent='';el.appendChild(sr);el.appendChild(vis);
  });
  // Counters: count up once when they arrive
  const count=el=>{const to=parseFloat(el.dataset.count),ms=parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--t-count'))||1600;
    if(reduce){el.textContent=to;return}const t0=performance.now();
    const step=t=>{const k=Math.min(1,(t-t0)/ms);el.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step)};el.textContent='0';requestAnimationFrame(step)};
  const arrive=t=>{t.classList.add('is-in');if(t.dataset.count)count(t);t.querySelectorAll('[data-count]').forEach(count)};
  const items=[...d.querySelectorAll('[data-rv],[data-rv-img],[data-split-words],[data-draw],[data-count],.sy-rule,[data-dots]')];
  if(reduce||!('IntersectionObserver' in window)){items.forEach(e=>e.classList.add('is-in'));d.querySelectorAll('[data-count]').forEach(e=>e.textContent=e.dataset.count);return}
  // A clipped photo has no visible area, so its parent is watched instead and the photo gets the class
  const owner=new Map();
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const t0=e.target;
    (owner.get(t0)||[]).forEach(arrive);if(!owner.has(t0)||t0.matches('[data-rv],[data-split-words],[data-draw],[data-count],.sy-rule,[data-dots]'))arrive(t0);io.unobserve(t0)}),{rootMargin:'0px 0px -8% 0px',threshold:.12});
  items.forEach(e=>{
    if(e.closest('[data-load]')&&!e.closest('[data-load] [data-defer]')){requestAnimationFrame(()=>requestAnimationFrame(()=>arrive(e)));return}
    const w=e.hasAttribute('data-rv-img')?e.parentElement:e;
    if(w!==e){if(!owner.has(w))owner.set(w,[]);owner.get(w).push(e)}
    io.observe(w);
  });
  // Scroll-linked: parallax (--py) and the turning watermark (--spin). Only while on screen, once per frame
  // Eased photos: data-ease moves a photo inside its frame with the individual translate property, so it adds to any tilt
  const eased=[...d.querySelectorAll('[data-ease]')].map(el=>({el,k:parseFloat(el.dataset.ease||40),v:null}));
  if(eased.length)sy.frame((y,vh)=>{const out=[];eased.forEach(e=>{const b=box(e.el.parentElement),top=b.top-y;if(top+b.h<0||top>vh)return;
    const v=(((top+b.h/2)/vh-.5)*-e.k).toFixed(1);if(v!==e.v){e.v=v;out.push(e)}});
    return out.length?()=>out.forEach(e=>e.el.style.setProperty('--ey',e.v+'px')):null});
  const linked=[...d.querySelectorAll('[data-parallax],[data-spin]')].map(el=>({el,box:el.closest('section,footer')||el.parentElement,on:false,k:parseFloat(el.dataset.parallax||el.dataset.spin)||.2,spin:el.hasAttribute('data-spin'),v:null}));
  const vis=new IntersectionObserver(es=>es.forEach(e=>linked.forEach(p=>{if(p.box===e.target){p.on=e.isIntersecting;ask()}})));
  [...new Set(linked.map(p=>p.box))].forEach(b=>vis.observe(b));
  if(linked.length)sy.frame((y,vh)=>{const out=[];linked.forEach(p=>{if(!p.on)return;const b=box(p.box),c=(b.top-y+b.h/2-vh/2)/vh;
    const v=p.spin?Math.round(c*p.k*-900)/10:Math.round(c*p.k*-100);if(v!==p.v){p.v=v;out.push(p)}});
    return out.length?()=>out.forEach(p=>p.el.style.setProperty(p.spin?'--spin':'--py',p.v+(p.spin?'deg':'px'))):null});
  if(!fine)return;
  // Pointer-led, mouse only: the hero photo drifts against the pointer, buttons lean in, photos tilt
  const follow=d.querySelector('[data-follow]');let fx=0,fy=0,ft=false;
  if(follow){const box=follow.closest('section');box.addEventListener('pointermove',e=>{const r=box.getBoundingClientRect();fx=(e.clientX-r.left)/r.width-.5;fy=(e.clientY-r.top)/r.height-.5;
    if(!ft){ft=true;requestAnimationFrame(()=>{ft=false;follow.style.setProperty('--fx',(fx*-18).toFixed(1)+'px');follow.style.setProperty('--fy',(fy*-12).toFixed(1)+'px')})}});
    box.addEventListener('pointerleave',()=>{follow.style.setProperty('--fx','0px');follow.style.setProperty('--fy','0px')})}
  d.querySelectorAll('[data-magnetic]').forEach(b=>{let t=false;
    let mx=0,my=0;b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();mx=((e.clientX-r.left)/r.width-.5)*12;my=((e.clientY-r.top)/r.height-.5)*10;
      if(t)return;t=true;requestAnimationFrame(()=>{t=false;b.style.setProperty('--mx',mx.toFixed(1)+'px');b.style.setProperty('--my',my.toFixed(1)+'px')})});
    b.addEventListener('pointerleave',()=>{b.style.setProperty('--mx','0px');b.style.setProperty('--my','0px')})});
  d.querySelectorAll('[data-tilt]').forEach(c=>{const host=c.closest('[data-tilt-host]')||c;let t=false;
    let rx=0,ry=0;host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();ry=((e.clientX-r.left)/r.width-.5)*8;rx=((e.clientY-r.top)/r.height-.5)*-8;
      if(t)return;t=true;requestAnimationFrame(()=>{t=false;c.style.setProperty('--ry',ry.toFixed(2)+'deg');c.style.setProperty('--rx',rx.toFixed(2)+'deg')})});
    host.addEventListener('pointerleave',()=>{c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')})});
})();
