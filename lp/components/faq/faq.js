/* FAQ accordion: animates the answer's height open and closed. Without script, or with reduced motion, it opens instantly */
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ms=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-mid'))||320;
  document.querySelectorAll('[data-accordion] details').forEach(dt=>{
    const sum=dt.querySelector('summary'),a=dt.querySelector('.sy-faq__a');let anim=null;
    sum.addEventListener('click',e=>{e.preventDefault();if(anim)anim.cancel();
      if(dt.open){const h=a.offsetHeight;anim=a.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0}],{duration:ms,easing:'cubic-bezier(.2,.7,.2,1)'});anim.onfinish=()=>{dt.open=false;anim=null}}
      else{dt.open=true;const h=a.offsetHeight;anim=a.animate([{height:'0px',opacity:0},{height:h+'px',opacity:1}],{duration:ms,easing:'cubic-bezier(.16,1,.3,1)'});anim.onfinish=()=>{anim=null}}});
  });
})();
