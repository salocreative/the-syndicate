/* What membership includes: each block reads its own place on screen and sets --p from 0 (entering at the foot) to 1
   (a third of the way up). Once per frame, only while the section is on screen. Reduced motion: left at the final state. */
(()=>{
  const items=[...document.querySelectorAll('[data-inc]')];if(!items.length||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
  const sec=items[0].closest('section');let on=false;
  const sy=window.sy,st=items.map(el=>({el,v:'0'}));if(!sy)return;
  items.forEach(it=>it.style.setProperty('--p','0'));
  // Read from the shared frame's cached layout (motion.js), write only what changed
  sy.frame((y,vh)=>{if(!on)return null;const out=[];st.forEach(s=>{const t=sy.box(s.el).top-y;
    const v=(Math.round(Math.max(0,Math.min(1,(vh*.98-t)/(vh*.42)))*100)/100).toString();if(v!==s.v){s.v=v;out.push(s)}});
    return out.length?()=>out.forEach(s=>s.el.style.setProperty('--p',s.v)):null});
  new IntersectionObserver(([e])=>{on=e.isIntersecting;sy.ask()},{rootMargin:'10% 0px'}).observe(sec);on=true;
})();
