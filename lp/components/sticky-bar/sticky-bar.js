/* Sticky bar: on once the hero is out of view, off while the final form is on screen. Changes classes only when the state changes. */
(()=>{
  const bar=document.querySelector('[data-bar]'),hero=document.querySelector('.sy-hero'),form=document.getElementById('enquire');
  if(!bar||!hero||!('IntersectionObserver' in window))return;
  let pastHero=false,atForm=false,on=null;
  const set=()=>{const v=pastHero&&!atForm;if(v===on)return;on=v;bar.classList.toggle('is-on',v);bar.setAttribute('aria-hidden',v?'false':'true');bar.querySelectorAll('a').forEach(a=>a.tabIndex=v?0:-1)};
  new IntersectionObserver(([e])=>{pastHero=!e.isIntersecting&&e.boundingClientRect.top<0;set()}).observe(hero);
  if(form)new IntersectionObserver(([e])=>{atForm=e.isIntersecting;set()},{threshold:.15}).observe(form);
  // Reading progress along the bar's edge, once per frame, only while the bar is showing
  let t=false,lp=-1;const prog=()=>{t=false;if(!on)return;const h=document.documentElement.scrollHeight-innerHeight;const p=Math.round(Math.min(1,Math.max(0,scrollY/h))*200)/200;if(p!==lp){lp=p;bar.style.setProperty('--p',p)}};
  addEventListener('scroll',()=>{if(on&&!t){t=true;requestAnimationFrame(prog)}},{passive:true});
})();
