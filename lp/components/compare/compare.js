/* One against eighty: when the chart is well on screen the bars draw and the count runs to 80, once. Reduced motion: final. */
(()=>{
  const el=document.querySelector('[data-vs]');if(!el)return;const n=el.querySelector('[data-vs-count]');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window)){el.classList.add('is-on');return}
  n.textContent='0';
  new IntersectionObserver((es,o)=>{if(!es[0].isIntersecting)return;o.disconnect();el.classList.add('is-on');
    const ms=parseFloat(getComputedStyle(el).getPropertyValue('--t-vs'))||1800,t0=performance.now()+200;
    const step=t=>{const k=Math.max(0,Math.min(1,(t-t0)/ms));n.textContent=Math.round(80*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)},{threshold:.5}).observe(el);
})();
