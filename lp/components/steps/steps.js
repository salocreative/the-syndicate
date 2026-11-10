/* Steps arrive in order. As the list crosses the screen the joining line draws across; each step comes in just before the
   line reaches it (number square, then title, then text), and its number fills navy when the line arrives.
   Once per frame, only on screen. Without script or with reduced motion everything shows, complete. */
(()=>{
  const el=document.querySelector('[data-steps]');if(!el)return;const items=[...el.querySelectorAll('[data-step]')];
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window)){el.style.setProperty('--fill',1);items.forEach(i=>i.classList.add('is-near','is-lit'));return}
  el.classList.add('is-live');
  const sy=window.sy;if(!sy){el.style.setProperty('--fill',1);items.forEach(i=>i.classList.add('is-near','is-lit'));return}
  let on=false,last=-1;
  // Position from the shared frame's cached layout (motion.js); writes only when the fill changes
  sy.frame((y,vh)=>{if(!on)return null;const t=sy.box(el).top-y;let f=(vh*.78-t)/(vh*.38);f=Math.round(Math.max(0,Math.min(1,f))*100)/100;
    if(f===last)return null;last=f;
    return()=>{el.style.setProperty('--fill',f);items.forEach((it,k)=>{const at=k/(items.length-1);it.classList.toggle('is-near',f>=at-.18);it.classList.toggle('is-lit',f>=at-.01)})}});
  new IntersectionObserver(([e])=>{on=e.isIntersecting;sy.ask()}).observe(el);
})();
