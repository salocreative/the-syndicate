/* Course names: the line drifts a few pixels sideways with scroll, never enough to leave the screen (at most the gap
   between the line and the edge, capped at 24px). Desktop only; once per frame, only on screen. */
(()=>{
  const el=document.querySelector('[data-drift]');if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
  const sy=window.sy;if(!sy)return;let on=false,last=null;
  // The room to drift is measured once per layout (shared frame, motion.js); each frame only reads the cached position
  const room=sy.memo(()=>{const rg=document.createRange();rg.selectNodeContents(el);const tw=rg.getBoundingClientRect().width,pad=parseFloat(getComputedStyle(el).paddingLeft)||0;
    return Math.min(24,Math.max(0,(el.clientWidth-pad*2-tw)/2+pad*.5))});
  sy.frame((y,vh,vw)=>{if(!on)return null;if(vw<1024){if(last===null)return null;last=null;return()=>el.style.removeProperty('--sx')}
    const b=sy.box(el.parentElement),c=(b.top-y+b.h/2)/vh-.5,v=(Math.max(-1,Math.min(1,c*2))*-room()).toFixed(1);
    if(v===last)return null;last=v;return()=>el.style.setProperty('--sx',v+'px')});
  new IntersectionObserver(([e])=>{on=e.isIntersecting;sy.ask()}).observe(el);
})();
