/* Show our thinking: draws a numbered dot on each noted element (from notes.js, window.CR_NOTES) and opens its note beside it.
   Turned on and off by the review page's "Show our thinking" button (message {cr:1,type:'thinking',on}) or, opened on its own,
   by the bar at the foot of the screen. Hover or focus a dot to open its note; "Show all notes" opens every note beside its dot.
   Phones: tap a dot and the note opens in a panel at the foot of the screen; no Show all. Esc closes. Never part of the website build. */
(()=>{
  const d=document,root=d.documentElement,NOTES=(window.CR_NOTES||[]),page=root.getAttribute('data-cr-page')||'Home';
  const mine=NOTES.filter(n=>!n.page||n.page===page);if(!mine.length)return;
  const phone=()=>innerWidth<640;
  let on=false,all=false,open=null,veil=null,layer=null,panel=null,dots=[];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const body=n=>`<b>${esc(n.title)}</b>`+(n.src?`<span class="th-src">${esc(n.src)}</span>`:'')+`<span>${esc(n.text)}</span>`;
  const pos=(el,at)=>{const r=el.getBoundingClientRect(),ix=Math.min(24,r.width/2),iy=Math.min(24,r.height/2);
    const x=at&&at.includes('r')?r.right-ix-16:r.left+ix,y=at&&at.includes('b')?r.bottom-iy-16:r.top+iy;return{x:x+scrollX,y:y+scrollY,w:r.width}};
  const place=()=>{dots.forEach(o=>{const el=d.querySelector(o.n.sel);if(!el||!el.getClientRects().length){o.dot.hidden=true;if(o.note)o.note.hidden=true;return}
    o.dot.hidden=false;const p=pos(el,o.n.at);o.dot.style.left=p.x+'px';o.dot.style.top=p.y+'px';
    if(o.note){const nw=Math.min(320,innerWidth-32);let x=p.x+20,y=p.y+16;if(x+nw>scrollX+innerWidth-16)x=Math.max(scrollX+16,p.x-nw-20);o.note.style.left=x+'px';o.note.style.top=y+'px';o.nx=x;o.ny=y}});
    // Show all: notes that would overlap are nudged down, keeping each one next to its dot
    if(all){const placed=[];dots.filter(o=>o.note&&!o.note.hidden).sort((a,b)=>a.ny-b.ny).forEach(o=>{const w=o.note.offsetWidth,h=o.note.offsetHeight;let y=o.ny;
      for(const q of placed){if(o.nx<q.x+q.w+8&&q.x<o.nx+w+8&&y<q.y+q.h+8&&q.y<y+h+8)y=q.y+q.h+8}
      o.note.style.top=y+'px';placed.push({x:o.nx,y,w,h})})}};
  const closeNote=()=>{dots.forEach(o=>{if(o.note&&!all){o.note.remove();o.note=null}o.dot.setAttribute('aria-expanded',all&&o.note?'true':'false')});if(panel){panel.remove();panel=null}open=null};
  const openNote=o=>{if(phone()){closeNote();panel=d.createElement('div');panel.className='th-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Design note '+o.i);
      panel.innerHTML=`<button type="button" class="th-x" aria-label="Close note">×</button>`+body(o.n);panel.querySelector('.th-x').onclick=()=>{closeNote();o.dot.focus()};d.body.appendChild(panel);o.dot.setAttribute('aria-expanded','true');open=o;return}
    if(!o.note){o.note=d.createElement('div');o.note.className='th-note';o.note.id='th-n'+o.i;o.note.setAttribute('role','note');o.note.innerHTML=body(o.n);layer.appendChild(o.note)}
    o.dot.setAttribute('aria-expanded','true');open=o;place()};
  const build=()=>{veil=d.createElement('div');veil.className='th-veil';layer=d.createElement('div');layer.className='th-layer';d.body.appendChild(veil);d.body.appendChild(layer);
    dots=mine.map((n,k)=>{const dot=d.createElement('button');dot.type='button';dot.className='th-dot';dot.textContent=k+1;dot.setAttribute('aria-label','Design note '+(k+1)+': '+n.title);dot.setAttribute('aria-expanded','false');
      const o={n,dot,i:k+1,note:null};
      dot.addEventListener('mouseenter',()=>{if(!phone()&&!all){closeNote();openNote(o)}});
      dot.addEventListener('mouseleave',()=>{if(!phone()&&!all)closeNote()});
      dot.addEventListener('focus',()=>{if(!phone()&&!all){closeNote();openNote(o)}});
      dot.addEventListener('blur',()=>{if(!phone()&&!all)setTimeout(()=>{if(open===o&&d.activeElement!==dot)closeNote()},0)});
      dot.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(open===o&&!all)closeNote();else{if(!all)closeNote();openNote(o)}});
      layer.appendChild(dot);return o});
    place()};
  const setAll=v=>{all=v&&!phone();if(all){dots.forEach(o=>openNote(o))}else{dots.forEach(o=>{if(o.note){o.note.remove();o.note=null}o.dot.setAttribute('aria-expanded','false')})}
    const b=d.querySelector('.th-bar [data-all]');if(b){b.setAttribute('aria-pressed',all);b.textContent=all?'Hide all notes':'Show all notes';b.hidden=phone()}};
  const set=v=>{on=v;root.classList.toggle('th-on',on);if(on){if(!layer)build();else{veil.hidden=false;layer.hidden=false;place()}}else if(layer){setAll(false);closeNote();veil.hidden=true;layer.hidden=true}
    const bar=d.querySelector('.th-bar');if(bar){bar.querySelector('[data-th]').setAttribute('aria-pressed',on);bar.querySelector('[data-th]').textContent=on?'Hide our thinking':'Show our thinking';bar.querySelector('[data-all]').hidden=!on||phone()}};
  // Opened on its own (outside the review page), a small bar at the foot switches it on
  if(window.parent===window){const bar=d.createElement('div');bar.className='th-bar';bar.innerHTML='<span>Design notes</span><button type="button" data-th aria-pressed="false">Show our thinking</button><button type="button" data-all aria-pressed="false" hidden>Show all notes</button>';
    d.body.appendChild(bar);bar.querySelector('[data-th]').onclick=()=>set(!on);bar.querySelector('[data-all]').onclick=()=>setAll(!all)}
  addEventListener('message',e=>{const m=e.data;if(!m||!m.cr)return;if(m.type==='thinking'){set(!!m.on);if('all' in m)setAll(!!m.all)}});
  d.addEventListener('keydown',e=>{if(e.key==='Escape'&&on){if(all)setAll(false);else closeNote()}});
  d.addEventListener('click',e=>{if(on&&open&&!all&&!e.target.closest('.th-dot,.th-note,.th-panel'))closeNote()});
  let t=0;const re=()=>{if(on&&!t)t=requestAnimationFrame(()=>{t=0;place()})};addEventListener('resize',re);new ResizeObserver(re).observe(d.body);
})();
