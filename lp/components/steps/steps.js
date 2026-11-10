/* Steps arrive in order. As the list crosses the screen the joining line draws across; each step comes in just before the
   line reaches it (number square, then title, then text), and its number fills navy when the line arrives.
   Once per frame, only on screen. Without script or with reduced motion everything shows, complete. */
(()=>{
  const el=document.querySelector('[data-steps]');if(!el)return;const items=[...el.querySelectorAll('[data-step]')];
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window)){el.style.setProperty('--fill',1);items.forEach(i=>i.classList.add('is-near','is-lit'));return}
  el.classList.add('is-live');
  let on=false,tick=false,last=-1;
  const frame=()=>{tick=false;const r=el.getBoundingClientRect(),vh=innerHeight;let f=(vh*.78-r.top)/(vh*.38);f=Math.max(0,Math.min(1,f));f=Math.round(f*100)/100;
    if(f!==last){last=f;el.style.setProperty('--fill',f);items.forEach((it,k)=>{const at=k/(items.length-1);it.classList.toggle('is-near',f>=at-.18);it.classList.toggle('is-lit',f>=at-.01)})}};
  const ask=()=>{if(on&&!tick){tick=true;requestAnimationFrame(frame)}};
  new IntersectionObserver(([e])=>{on=e.isIntersecting;ask()}).observe(el);
  addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);
})();
