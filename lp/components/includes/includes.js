/* What membership includes: each block reads its own place on screen and sets --p from 0 (entering at the foot) to 1
   (a third of the way up). Once per frame, only while the section is on screen. Reduced motion: left at the final state. */
(()=>{
  const items=[...document.querySelectorAll('[data-inc]')];if(!items.length||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
  const sec=items[0].closest('section');let on=false,tick=false;
  const frame=()=>{tick=false;const vh=innerHeight;items.forEach(it=>{const t=it.getBoundingClientRect().top;
    const p=Math.max(0,Math.min(1,(vh*.98-t)/(vh*.42)));const v=(Math.round(p*100)/100).toString();if(it.dataset.p!==v){it.dataset.p=v;it.style.setProperty('--p',v)}})};
  const ask=()=>{if(on&&!tick){tick=true;requestAnimationFrame(frame)}};
  items.forEach(it=>it.style.setProperty('--p','0'));
  new IntersectionObserver(([e])=>{on=e.isIntersecting;ask()},{rootMargin:'10% 0px'}).observe(sec);
  addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);on=true;frame();
})();
