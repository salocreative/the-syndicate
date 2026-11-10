"""Writes the two enquiry forms (hero and final) from one source, so they never drift. Run: python3 tools/gen.py"""
import pathlib
R=pathlib.Path(__file__).resolve().parent.parent
def form(p,head,intro,section):
    opt=lambda vals:''.join(f'<option>{v}</option>' for v in vals)
    ctl=lambda inner:f'<span class="sy-ctl">{inner}<i class="sy-ctl__line" aria-hidden="true"></i></span>'   # the underline that draws in on focus
    def field(cls,fid,label,inner,err=True,opt_=False):
        o=' <span class="sy-field__opt">Optional</span>' if opt_ else ''
        e=f'<span class="sy-field__err" id="{fid}-e" hidden></span>' if err else '<span class="sy-field__err" hidden></span>'
        return f'<div class="sy-field{cls}" data-field><label class="sy-field__label" for="{fid}">{label}{o}</label>{ctl(inner)}{e}</div>'
    top=(f'<div class="sy-form__top">\n    <h2 class="sy-form__head" id="{p}-head" data-edit="{p}-form-head">{head}</h2>\n    <p class="sy-form__intro" data-edit="{p}-form-intro">{intro}</p>\n  </div>') if head else ''
    return f'''<form class="sy-form{' sy-form--headed' if head else ''}" data-form action="/thank-you" novalidate aria-labelledby="{p}-head" data-edit="{p}-form">
  <div class="sy-form__seg" aria-hidden="true"><i></i><i></i></div>
  {top}
  <div class="sy-form__body">
  <p class="sy-sr" aria-live="polite" data-step-label>Step 1 of 2</p>
  <div class="sy-step" data-step-panel="1">
    <div class="sy-form__grid">
      {field('',f'{p}-first','First name',f'<input id="{p}-first" name="first_name" autocomplete="given-name" required aria-describedby="{p}-first-e">')}
      {field('',f'{p}-last','Last name',f'<input id="{p}-last" name="last_name" autocomplete="family-name" required aria-describedby="{p}-last-e">')}
      {field('',f'{p}-email','Email',f'<input id="{p}-email" name="email" type="email" autocomplete="email" required aria-describedby="{p}-email-e">')}
      {field('',f'{p}-mobile','Mobile',f'<input id="{p}-mobile" name="mobile" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="{p}-mobile-e">')}
    </div>
    <div class="sy-form__actions">
      <button class="sy-btn sy-btn--light sy-btn--block sy-form__go" type="button" data-next>Continue<svg class="sy-btn__arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
    </div>
  </div>
  <div class="sy-step" data-step-panel="2">
    <div class="sy-form__grid">
      <div class="sy-field sy-field--full" data-field><fieldset class="sy-radios" aria-describedby="{p}-hcp-e"><legend class="sy-field__label">Do you hold an official playing handicap?</legend>
        <div class="sy-radios__set"><label class="sy-radio"><input type="radio" name="handicap" value="Yes" required><span>Yes</span></label><label class="sy-radio"><input type="radio" name="handicap" value="No"><span>No</span></label><label class="sy-radio"><input type="radio" name="handicap" value="Applying for one"><span>Applying for one</span></label></div>
      </fieldset><span class="sy-field__err" id="{p}-hcp-e" hidden></span></div>
      {field('',f'{p}-rounds','Roughly how many rounds do you play a year?',f'<select id="{p}-rounds" name="rounds" required aria-describedby="{p}-rounds-e"><option value="">Choose</option>{opt(['Under 15','15 to 30','30 to 50','Over 50'])}</select>')}
      {field('',f'{p}-budget','What annual budget do you have in mind for a golf membership?',f'<select id="{p}-budget" name="budget" required aria-describedby="{p}-budget-e"><option value="">Choose</option>{opt(['Under £2,000','£2,000 to £4,000','£4,000 to £7,000','Over £7,000','Prefer to discuss'])}</select>')}
      {field('',f'{p}-where','Where are you based?',f'<input id="{p}-where" name="location" required placeholder="Postcode or nearest town" aria-describedby="{p}-where-e">')}
      {field('',f'{p}-cat','Which membership interests you?',f'<select id="{p}-cat" name="membership"><option value="">Choose</option>{opt(['Full','Country','Overseas','Corporate','Not sure yet'])}</select>',err=False,opt_=True)}
      {field(' sy-field--full',f'{p}-more','Anything else we should know?',f'<textarea id="{p}-more" name="notes" rows="2" maxlength="300"></textarea>',err=False,opt_=True)}
      <div class="sy-field sy-field--full" data-field><label class="sy-check"><input type="checkbox" name="consent" value="yes" required aria-describedby="{p}-consent-e"><span>I am happy for The Syndicate Club to contact me about membership. <a href="https://www.thesyndicateclub.co.uk/privacypolicy" target="_blank" rel="noopener">Privacy policy</a></span></label><span class="sy-field__err" id="{p}-consent-e" hidden></span></div>
    </div>
    {''.join(f'<input type="hidden" name="{h}">' for h in ['gclid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','landing_page','referrer'])}
    <div class="sy-form__actions">
      <button class="sy-btn sy-btn--light sy-btn--block sy-form__go" type="submit">Send my enquiry<svg class="sy-btn__arrow" aria-hidden="true"><use href="#i-arrow"/></svg></button>
      <button class="sy-form__back" type="button" data-back><svg class="sy-form__back-i" aria-hidden="true"><use href="#i-arrow"/></svg>Back to step 1</button>
    </div>
  </div>
  <p class="sy-form__note" data-edit="{p}-form-note">No obligation. Your details are never passed to anyone else.</p>
  </div>
</form>'''
INTRO='Two minutes to complete. You can download our Membership and Course Access Guide as soon as you submit, and we will come back to you within one working day.'
for name,p,head,intro in [('hero','hf','Request membership details',INTRO)]:
    f=R/f'components/{name}/{name}.html';t=f.read_text()
    a,b=t.split('<!--@form-->')[0],t.split('<!--@/form-->')[1]
    f.write_text(a+'<!--@form-->\n'+form(p,head,intro,name)+'\n<!--@/form-->'+b)
f=R/'components/final-cta/final-cta.html';t=f.read_text()
a,b=t.split('<!--@form-->')[0],t.split('<!--@/form-->')[1]
f.write_text(a+'<!--@form-->\n'+form('ff',None,None,'final')+'\n<!--@/form-->'+b)
print('forms written')
