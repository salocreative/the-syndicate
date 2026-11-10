/* Sticky bar: on once the hero is out of view, off while the final form is on screen. Changes classes only when the state changes. */
(()=>{
  const bar=document.querySelector('[data-bar]'),hero=document.querySelector('.sy-hero'),form=document.getElementById('enquire');
  if(!bar||!hero||!('IntersectionObserver' in window))return;
  let pastHero=false,atForm=false,on=null;
  const set=()=>{const v=pastHero&&!atForm;if(v===on)return;on=v;bar.classList.toggle('is-on',v);bar.setAttribute('aria-hidden',v?'false':'true');bar.querySelectorAll('a').forEach(a=>a.tabIndex=v?0:-1);if(window.sy)sy.ask()};
  new IntersectionObserver(([e])=>{pastHero=!e.isIntersecting&&e.boundingClientRect.top<0;set()}).observe(hero);
  if(form)new IntersectionObserver(([e])=>{atForm=e.isIntersecting;set()},{threshold:.15}).observe(form);
  // Reading progress along the bar's edge, once per frame, only while the bar is showing
  // The page height is measured once per layout (shared frame, motion.js); the value goes on the progress line itself
  const sy=window.sy,line=bar.querySelector('.sy-bar__progress');if(!sy||!line)return;
  let lp=-1;const full=sy.memo(()=>document.documentElement.scrollHeight);
  sy.frame((y,vh)=>{if(!on)return null;const p=Math.round(Math.min(1,Math.max(0,y/(full()-vh)))*200)/200;if(p===lp)return null;lp=p;return()=>line.style.setProperty('--p',p)});
})();
