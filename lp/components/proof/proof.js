/* Course names: the line drifts a few pixels sideways with scroll, never enough to leave the screen (at most the gap
   between the line and the edge, capped at 24px). Desktop only; once per frame, only on screen. */
(()=>{
  const el=document.querySelector('[data-drift]');if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
  let on=false,tick=false;
  const frame=()=>{tick=false;if(innerWidth<1024){el.style.removeProperty('--sx');return}
    const r=el.parentElement.getBoundingClientRect(),c=(r.top+r.height/2)/innerHeight-.5;
    const rg=document.createRange();rg.selectNodeContents(el);const tw=rg.getBoundingClientRect().width,pad=parseFloat(getComputedStyle(el).paddingLeft)||0;
    const room=Math.min(24,Math.max(0,(el.clientWidth-pad*2-tw)/2+pad*.5));
    el.style.setProperty('--sx',(Math.max(-1,Math.min(1,c*2))*-room).toFixed(1)+'px')};
  const ask=()=>{if(on&&!tick){tick=true;requestAnimationFrame(frame)}};
  new IntersectionObserver(([e])=>{on=e.isIntersecting;ask()}).observe(el);addEventListener('scroll',ask,{passive:true});addEventListener('resize',ask);
})();
