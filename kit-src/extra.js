<script>
/* Landing page demos: play once in view, Replay restarts, toggles flip state, the card flicks on hover,
   buttons lean towards the pointer, parallax and the turning ring follow scroll once per frame. The film plays on request. */
(()=>{const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
const demos=[...document.querySelectorAll('.lp-demo')];
if(RM||!('IntersectionObserver' in window))demos.forEach(d=>d.classList.add('go'));
else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('go');io.unobserve(e.target)}}),{threshold:.35});demos.forEach(d=>io.observe(d))}
document.querySelectorAll('[data-lp]').forEach(b=>b.addEventListener('click',()=>{const d=document.getElementById(b.dataset.lp);d.classList.remove('go');void d.offsetWidth;requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('go')))}));
document.querySelectorAll('[data-lp-toggle]').forEach(b=>b.addEventListener('click',()=>{const d=document.getElementById(b.dataset.lpToggle);d.classList.toggle('on')}));
document.querySelectorAll('[data-lp-flick]').forEach(c=>{const s=[...c.children];let i=0,t=null;const show=n=>{s[i].classList.remove('on');i=n;s[i].classList.add('on')};
  const next=()=>show((i+1)%s.length);c.addEventListener('click',next);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();next()}});
  if(fine&&!RM){c.addEventListener('pointerenter',()=>{next();t=setInterval(next,1400)});c.addEventListener('pointerleave',()=>{clearInterval(t);show(0)})}});
if(fine&&!RM)document.querySelectorAll('[data-lp-mag]').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*12+'px');b.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*10+'px')});
  b.addEventListener('pointerleave',()=>{b.style.setProperty('--mx','0px');b.style.setProperty('--my','0px')})});
const v=document.querySelector('[data-lp-film]'),vb=document.querySelector('[data-lp-film-btn]');
if(v&&vb)vb.addEventListener('click',()=>{if(v.paused){v.play();vb.textContent='Pause film';vb.setAttribute('aria-pressed','true')}else{v.pause();vb.textContent='Play film';vb.setAttribute('aria-pressed','false')}});
if(RM)return;
const els=[...document.querySelectorAll('[data-lp-para],[data-lp-spin]')];let on=new Set(),tick=false;
const vis=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?on.add(e.target):on.delete(e.target)));els.forEach(p=>vis.observe(p.matches('[data-lp-spin]')?p.parentElement:p));
const frame=()=>{tick=false;els.forEach(p=>{const box=p.matches('[data-lp-spin]')?p.parentElement:p;if(!on.has(box))return;const r=box.getBoundingClientRect();const c=(r.top+r.height/2-innerHeight/2)/innerHeight;
  if(p.matches('[data-lp-spin]')){const v=Math.round(c*-600)/10;if(p.dataset.v!=v){p.dataset.v=v;p.style.setProperty('--spin',v+'deg')}}
  else{const ph=p.firstElementChild;const v=Math.round(c*-30);if(ph.dataset.v!=v){ph.dataset.v=v;ph.style.setProperty('--py',v+'px')}}})};
addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(frame)}},{passive:true});})();
</script>
