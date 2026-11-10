/* Enquiry form: two steps, inline validation, hidden tracking fields, enhanced conversions, redirect to the thank-you page.
   Concept build: nothing is sent anywhere. On Wix, the hidden fields and the dataLayer push are a Velo job (see the build notes). */
(()=>{
  const d=document;
  const params=new URLSearchParams(location.search);
  const TRACK=['gclid','utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  const msg={required:'Please fill this in.',email:'Please enter a valid email address.',tel:'Please enter a valid phone number.',consent:'Please tick to let the membership team contact you.'};
  const check=f=>{
    const el=f.querySelector('input,select,textarea');if(!el)return true;
    let err='';
    if(el.type==='checkbox'){if(el.required&&!el.checked)err=msg.consent}
    else if(el.type==='radio'){const any=f.querySelector('input:checked');if(el.required&&!any)err=msg.required}
    else{const v=el.value.trim();
      if(el.required&&!v)err=msg.required;
      else if(v&&el.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))err=msg.email;
      else if(v&&el.type==='tel'&&!/^\+?[\d\s()-]{7,20}$/.test(v))err=msg.tel;}
    const out=f.querySelector('.sy-field__err');
    if(err){f.setAttribute('data-invalid','');out.textContent=err;out.hidden=false;f.querySelectorAll('input,select,textarea').forEach(i=>i.setAttribute('aria-invalid','true'))}
    else{f.removeAttribute('data-invalid');out.textContent='';out.hidden=true;f.querySelectorAll('input,select,textarea').forEach(i=>i.removeAttribute('aria-invalid'))}
    return !err;
  };
  const validate=panel=>{let first=null;panel.querySelectorAll('[data-field]').forEach(f=>{if(!check(f)&&!first)first=f});if(first)first.querySelector('input,select,textarea').focus();return !first};
  d.querySelectorAll('[data-form]').forEach(form=>{
    form.setAttribute('data-step','1');
    TRACK.forEach(k=>{const i=form.querySelector(`[name="${k}"]`);if(i)i.value=params.get(k)||''});
    const lp=form.querySelector('[name="landing_page"]');if(lp)lp.value=location.href.split('#')[0];
    const ref=form.querySelector('[name="referrer"]');if(ref)ref.value=d.referrer;
    form.querySelectorAll('[data-field]').forEach(f=>['input','change'].forEach(ev=>f.addEventListener(ev,()=>{if(f.hasAttribute('data-invalid'))check(f)})));  // errors clear as people type, so nothing moves under a tap on Continue
    const p1=form.querySelector('[data-step-panel="1"]'),p2=form.querySelector('[data-step-panel="2"]'),labels=form.querySelectorAll('[data-step-label]');
    const go=n=>{form.classList.toggle('was-2',n===1);form.setAttribute('data-step',String(n));labels.forEach(l=>l.textContent=`Step ${n} of 2`);(n===2?p2:p1).querySelector('input,select,textarea').focus({preventScroll:true})};
    // Hero on desktop: its slot keeps the height of step 1, so when step 2 opens the card grows downwards and the
    // headline beside it stays exactly where it is
    const slot=form.closest('.sy-hero__form');
    const hold=()=>{if(!slot)return;slot.style.height='';if(innerWidth<981)return;const now=form.getAttribute('data-step');
      form.setAttribute('data-step','1');slot.style.height=form.offsetHeight+'px';form.setAttribute('data-step',now)};
    hold();addEventListener('resize',hold);if(d.fonts)d.fonts.ready.then(hold);
    form.querySelector('[data-next]').addEventListener('click',()=>{if(validate(p1))go(2)});
    form.querySelector('[data-back]').addEventListener('click',()=>go(1));
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(form.getAttribute('data-step')==='1'){if(validate(p1))go(2);return}
      if(!validate(p2))return;
      const v=n=>(form.querySelector(`[name="${n}"]`)||{}).value||'';
      // Enhanced conversions for leads: email and phone go to the dataLayer before the redirect, never in the URL
      (window.dataLayer=window.dataLayer||[]).push({event:'syndicate_lp_enquiry',enhanced_conversion_data:{email:v('email'),phone_number:v('mobile')}});
      const btn=form.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='Sending';
      setTimeout(()=>location.assign(form.getAttribute('action')),300);
    });
  });
})();
