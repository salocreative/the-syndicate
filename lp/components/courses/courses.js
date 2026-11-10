/* Courses: the aerial film plays only on screen (never with reduced motion or data saver) with a pause button;
   card photos flick through on hover, or on a tap of the photo, and load a screen and a half ahead. */
(()=>{
  const d=document,sec=d.querySelector('.sy-courses');if(!sec)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
  const save=navigator.connection&&navigator.connection.saveData;
  // Photos: start loading well before the section arrives, so no photo is blank when it's shown
  // Watching starts once the page has loaded: on a slow first visit the page is still settling before then, and the photos
  // would load with the first screen for nothing
  if('IntersectionObserver' in window){const pre=new IntersectionObserver(es=>{if(es[0].isIntersecting){sec.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');pre.disconnect()}},{rootMargin:'150% 0px'});
    const go=()=>pre.observe(sec);if(d.readyState==='complete')go();else addEventListener('load',go,{once:true})}
  // Film
  const v=sec.querySelector('[data-video]'),btn=sec.querySelector('[data-video-toggle]');
  if(v&&!reduce&&!save&&'IntersectionObserver' in window){
    let user=false,loaded=false;const lab=btn.querySelector('[data-video-label]');
    const set=on=>{btn.setAttribute('aria-pressed',on?'false':'true');lab.textContent=on?'Pause film':'Play film'};
    new IntersectionObserver(([e])=>{if(e.isIntersecting){if(!loaded){v.src=innerWidth<720?v.dataset.srcM:v.dataset.src;loaded=true;btn.hidden=false}if(!user)v.play().then(()=>set(true)).catch(()=>set(false))}else v.pause()},{threshold:.2}).observe(v);
    btn.addEventListener('click',()=>{if(v.paused){user=false;v.play();set(true)}else{user=true;v.pause();set(false)}});
  }
  // Horizontal gallery: on desktop the section holds while the row travels sideways (one transform per frame).
  // Phones and reduced motion swipe instead. Positions come from the shared frame's cached layout (motion.js), so the
  // frame only writes: the row's transform, the progress bar and each photo's drift.
  const hz=sec.querySelector('[data-hz]'),sy=window.sy;
  if(hz&&sy&&'IntersectionObserver' in window){
    const view=hz.querySelector('.sy-hz__view'),track=hz.querySelector('[data-track]'),bar=hz.querySelector('.sy-hz__bar i'),
      pics=[...hz.querySelectorAll('[data-hpar]')].map(el=>({el,v:null})),mq=matchMedia('(min-width: 901px)');
    let dist=0,on=false,lw=0,pinned=false,lx=null;
    // Each photo's centre on screen with the row at rest (the row's current transform taken back out)
    let applied=0;
    const across=sy.memo(()=>{const tr=track.getBoundingClientRect(),base=tr.left-applied;
      pics.forEach(p=>{const r=p.el.parentElement.getBoundingClientRect();p.c=base+(r.left-tr.left)+r.width/2})});
    sy.frame((y,vh,vw)=>{if(!on||!pinned)return null;const b=sy.box(hz),span=b.h-vh,p=Math.max(0,Math.min(1,(y-b.top)/(span||1)));
      const x=(-p*dist).toFixed(1);if(x===lx)return null;lx=x;across();const out=[];
      pics.forEach(q=>{const c=q.c+(+x);if(c<-vw/2||c>vw*1.5)return;const v=((c/vw-.5)*-50).toFixed(1);if(v!==q.v){q.v=v;out.push(q)}});
      return()=>{applied=+x;track.style.transform=`translate3d(${x}px,0,0)`;if(bar)bar.style.setProperty('--hp',p.toFixed(3));out.forEach(q=>q.el.style.setProperty('--hx',q.v+'px'))}});
    const setup=()=>{if(innerWidth===lw)return;lw=innerWidth;pinned=mq.matches&&!reduce;hz.classList.toggle('is-pinned',pinned);lx=null;
      if(!pinned){hz.style.height='';track.style.removeProperty('transform');applied=0;return}
      dist=Math.max(0,track.scrollWidth-view.clientWidth);hz.style.height=(dist+innerHeight)+'px';sy.renew()};
    new IntersectionObserver(([e])=>{on=e.isIntersecting;sy.ask()},{rootMargin:'20% 0px'}).observe(hz);
    addEventListener('resize',setup);setup();
  }
  // Card photos ease inside their frames as the page scrolls
  if(!reduce&&sy){const stacks=[...sec.querySelectorAll('.sy-card__stack')].map(el=>({el,v:null}));
    sy.frame((y,vh)=>{const out=[];stacks.forEach(s=>{const b=sy.box(s.el.parentElement),top=b.top-y;if(top+b.h<0||top>vh)return;
      const v=(((top+b.h/2)/vh-.5)*-24).toFixed(1);if(v!==s.v){s.v=v;out.push(s)}});
      return out.length?()=>out.forEach(s=>s.el.style.setProperty('--py',s.v+'px')):null})}
  // Card photos
  sec.querySelectorAll('[data-cycle]').forEach(card=>{
    const imgs=[...card.querySelectorAll('.sy-card__stack img')],dots=[...card.querySelectorAll('.sy-card__dots i')];if(imgs.length<2)return;
    let i=0,timer=null;const ms=parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--t-cycle'))||1400;
    const show=n=>{if(n===i)return;imgs[i].classList.remove('is-on');dots[i].classList.remove('is-on');i=n;imgs[i].classList.add('is-on');dots[i].classList.add('is-on')};
    const next=()=>show((i+1)%imgs.length);
    card.querySelector('.sy-card__next').addEventListener('click',()=>{clearInterval(timer);timer=null;next()});
    if(fine&&!reduce){card.addEventListener('pointerenter',()=>{next();timer=setInterval(next,ms)});card.addEventListener('pointerleave',()=>{clearInterval(timer);timer=null;show(0)})}
  });
})();
