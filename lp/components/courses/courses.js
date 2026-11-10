/* Courses: the aerial film plays only on screen (never with reduced motion or data saver) with a pause button;
   card photos flick through on hover, or on a tap of the photo, and load a screen and a half ahead. */
(()=>{
  const d=document,sec=d.querySelector('.sy-courses');if(!sec)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
  const save=navigator.connection&&navigator.connection.saveData;
  // Photos: start loading well before the section arrives, so no photo is blank when it's shown
  if('IntersectionObserver' in window){const pre=new IntersectionObserver(es=>{if(es[0].isIntersecting){sec.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');pre.disconnect()}},{rootMargin:'150% 0px'});pre.observe(sec)}
  // Film
  const v=sec.querySelector('[data-video]'),btn=sec.querySelector('[data-video-toggle]');
  if(v&&!reduce&&!save&&'IntersectionObserver' in window){
    let user=false,loaded=false;const lab=btn.querySelector('[data-video-label]');
    const set=on=>{btn.setAttribute('aria-pressed',on?'false':'true');lab.textContent=on?'Pause film':'Play film'};
    new IntersectionObserver(([e])=>{if(e.isIntersecting){if(!loaded){v.src=innerWidth<720?v.dataset.srcM:v.dataset.src;loaded=true;btn.hidden=false}if(!user)v.play().then(()=>set(true)).catch(()=>set(false))}else v.pause()},{threshold:.2}).observe(v);
    btn.addEventListener('click',()=>{if(v.paused){user=false;v.play();set(true)}else{user=true;v.pause();set(false)}});
  }
  // Horizontal gallery: on desktop the section holds while the row travels sideways (one transform per frame).
  // Phones and reduced motion swipe instead.
  const hz=sec.querySelector('[data-hz]');
  if(hz&&'IntersectionObserver' in window){
    const view=hz.querySelector('.sy-hz__view'),track=hz.querySelector('[data-track]'),pics=[...hz.querySelectorAll('[data-hpar]')],mq=matchMedia('(min-width: 901px)');
    let dist=0,on=false,tick=false,lw=0;
    const frame=()=>{tick=false;if(!hz.classList.contains('is-pinned'))return;const r=hz.getBoundingClientRect(),span=r.height-innerHeight;
      const p=Math.max(0,Math.min(1,-r.top/(span||1)));track.style.setProperty('--tx',(-p*dist).toFixed(1)+'px');hz.style.setProperty('--hp',p.toFixed(3));
      pics.forEach(i=>{const b=i.parentElement.getBoundingClientRect();if(b.right<0||b.left>innerWidth)return;i.style.setProperty('--hx',(((b.left+b.width/2)/innerWidth-.5)*-50).toFixed(1)+'px')})};
    const ask=()=>{if(on&&!tick){tick=true;requestAnimationFrame(frame)}};
    const setup=()=>{if(innerWidth===lw)return;lw=innerWidth;const ok=mq.matches&&!reduce;hz.classList.toggle('is-pinned',ok);
      if(!ok){hz.style.height='';track.style.removeProperty('--tx');return}
      dist=Math.max(0,track.scrollWidth-view.clientWidth);hz.style.height=(dist+innerHeight)+'px';frame()};
    new IntersectionObserver(([e])=>{on=e.isIntersecting;ask()},{rootMargin:'20% 0px'}).observe(hz);
    addEventListener('scroll',ask,{passive:true});addEventListener('resize',setup);setup();
  }
  // Card photos ease inside their frames as the page scrolls
  if(!reduce){const stacks=[...sec.querySelectorAll('.sy-card__stack')];let t2=false;
    const f2=()=>{t2=false;stacks.forEach(s=>{const b=s.parentElement.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;s.style.setProperty('--py',(((b.top+b.height/2)/innerHeight-.5)*-24).toFixed(1)+'px')})};
    addEventListener('scroll',()=>{if(!t2){t2=true;requestAnimationFrame(f2)}},{passive:true});f2()}
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
