/* Concept review agent. Keep the script tag for this file at the end of the concept page's body (concept/home.html).
   It draws the comment pins, reports where people click, and runs Edit content: the dotted outlines, live text
   editing with the tone check box under the text, and photo swaps. It talks to the review page (concept-review.html) by message, so it works on the live
   site and inside sandboxed previews. It does nothing when the page is opened on its own.
   Editable boxes: every photo, and every piece of text (headings, paragraphs, button labels, links). Add
   data-edit="name" to an element to give it a stable id between rounds, or data-noedit to leave it out.
   Several pages (2026): every concept page loads this file. Section ids carry the page ("our-work:hero"), except sections
   marked data-cr-shared (the header and footer, the same on every page). Links between concept pages work; other links don't. */
(() => {
  if (window.parent === window) return;
  const P = window.parent, d = document, de = d.documentElement;
  const PGF = location.pathname.split('/').pop() || '', PG = /\.html$/.test(PGF) ? PGF.replace(/\.html$/, '') : 'home',   /* a preview's srcdoc frame counts as home */
    PL = de.dataset.crPage || d.title;
  const keyOf = sec => sec.hasAttribute('data-cr-shared') ? sec.dataset.section : PG + ':' + sec.dataset.section;
  const labelOf = sec => { const l = sec.dataset.label || sec.dataset.section; return sec.hasAttribute('data-cr-shared') ? l : PL + ' · ' + l; };
  const pageOf = id => { const s = String(id || ''), i = s.indexOf(':'); return i < 0 ? null : s.slice(0, i); };
  const isPage = a => { const h = a.getAttribute('href') || ''; return /^[\w-]+\.html([?#].*)?$/.test(h); };
  let list = [], mode = false, editOn = false, sel = null, startHtml = '', rawHtml = '', applied = {}, showOrig = false, hovSec = null, hovBox = null, req = 0, pfT = 0, check = null;
  const boxes = new Map();
  const send = m => P.postMessage({ cr: 1, ...m }, '*');
  const st = d.createElement('style');
  st.textContent = '#cr-layer{position:absolute;left:0;top:0;width:100%;height:0;z-index:2147483000;pointer-events:none}' +
    '#cr-layer button{position:absolute;min-width:30px;height:30px;padding:0 8px;margin:-30px 0 0 0;display:grid;place-items:center;border:2px solid var(--n-0,#fff);border-radius:15px 15px 15px 3px;background:var(--n-950,#16181B);color:var(--n-0,#fff);font:600 12px/1 var(--body,system-ui);cursor:pointer;pointer-events:auto;box-shadow:0 2px 8px rgb(0 0 0 / .3)}' +
    '#cr-layer button.done{background:var(--n-400,#A2A3A4)}#cr-layer button.on{outline:3px solid var(--n-950,#16181B);outline-offset:2px}#cr-layer button.draft{background:var(--n-0,#fff);color:var(--n-950,#16181B);border-color:var(--n-950,#16181B)}' +
    'html.cr-commenting,html.cr-commenting *{cursor:crosshair!important}' +
    /* Edit content: pulsing dotted outlines on everything editable, a hover box on the section, a solid outline on the box being edited */
    'html.cr-editing #cr-layer button{display:none}' +
    'html.cr-editing [data-cr-edit]{outline:1px dashed color-mix(in srgb,currentColor 55%,transparent);outline-offset:4px;animation:cr-pulse 2.8s ease-in-out infinite;cursor:text}' +
    'html.cr-editing img[data-cr-edit]{color:#fff;outline-width:1.5px;outline-offset:-10px;cursor:pointer}' +
    'html.cr-editing [data-cr-edit]:hover{animation:none;outline:1.5px solid currentColor}' +
    'html.cr-editing .cr-sel{animation:none!important;outline:2px solid #6405FF!important;outline-offset:4px}html.cr-editing img.cr-sel{outline-offset:-10px!important;outline-width:3px!important}' +
    '[data-cr-edit][contenteditable]{caret-color:currentColor;-webkit-user-modify:read-write}' +
    '[data-cr-edit].cr-flash{outline:3px solid currentColor!important;outline-offset:6px;transition:outline-offset .3s}' +
    '@keyframes cr-pulse{50%{outline-color:color-mix(in srgb,currentColor 20%,transparent)}}' +
    '@media (prefers-reduced-motion:reduce){html.cr-editing [data-cr-edit]{animation:none}}' +
    '#cr-sec{position:absolute;z-index:2147482990;pointer-events:none;display:none;background:rgb(22 24 27 / .03);box-shadow:inset 0 0 0 1px rgb(22 24 27 / .35),inset 0 0 0 2px rgb(255 255 255 / .5)}';
  d.head.appendChild(st);
  const layer = d.createElement('div'); layer.id = 'cr-layer';
  /* The box under the text being edited: Save, Cancel and the tone check. In a shadow root so the concept's CSS can't touch it */
  const pop = d.createElement('div'); pop.id = 'cr-pop'; pop.hidden = true;
  const ps = pop.attachShadow({ mode: 'open' });
  ps.innerHTML = '<style>:host{all:initial;position:absolute;z-index:2147483001;display:block}:host([hidden]){display:none}' +
    '*{box-sizing:border-box}.p{width:min(440px,calc(100vw - 24px));padding:14px;display:grid;gap:12px;background:#fff;color:#16181B;font:400 14px/1.45 var(--body,system-ui,sans-serif);letter-spacing:0;text-align:left;text-transform:none;box-shadow:0 0 0 1px rgb(22 24 27 / .12),0 14px 40px rgb(22 24 27 / .28)}' +
    '.p.nudge{animation:nudge .3s}@keyframes nudge{30%{transform:translateX(-4px)}70%{transform:translateX(4px)}}' +
    '.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.row .t{flex:1;min-width:0;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.k{margin:0;font-size:12px;color:#5C5D5F}' +
    'button{font:500 14px/1 var(--body,system-ui,sans-serif);height:38px;padding:0 14px;border:1px solid #16181B;background:#fff;color:#16181B;cursor:pointer;border-radius:0}button:hover{background:#F3F3F4}' +
    'button.pri{background:#16181B;color:#fff}button.pri:hover{background:#2D2F32}button.red{background:#6405FF;border-color:#6405FF;color:#fff}button.red:hover{background:#4F04CC}' +
    '.p>button.link{justify-self:start}button.link{height:auto;padding:0;border:0;background:none;text-decoration:underline;text-underline-offset:3px;font-weight:400;font-size:13px}button.link:hover{background:none}' +
    'button:focus-visible{outline:2px solid #6405FF;outline-offset:2px}' +
    '.run{display:flex;align-items:center;gap:10px;font-weight:500}.spin{width:16px;height:16px;border:2px solid #CDB3FF;border-top-color:#6405FF;border-radius:50%;animation:sp .7s linear infinite}@keyframes sp{to{transform:rotate(1turn)}}' +
    '.bar{height:3px;background:#F0E8FF;overflow:hidden}.bar i{display:block;height:100%;width:40%;background:#6405FF;animation:bar 1.1s ease-in-out infinite}@keyframes bar{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}' +
    '.sc{display:flex;align-items:baseline;gap:8px}.sc b{font-size:28px;line-height:1;font-weight:600}.sc span{color:#5C5D5F}.sc em{margin-left:auto;font-style:normal;font-size:12px;font-weight:500;padding:4px 8px;background:#F3F3F4}' +
    '.meter{height:4px;background:#E8E8E8}.meter i{display:block;height:100%;background:#16181B}' +
    '.why{margin:0;color:#454649}' +
    '.sug{display:grid;gap:6px;padding:12px;border-left:3px solid #6405FF;background:#F0E8FF}.tag{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6405FF}' +
    '.sug p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;color:#16181B}' +
    '@media (prefers-reduced-motion:reduce){.spin,.bar i,.p.nudge{animation:none}}</style><div class="p" role="group" aria-label="Save your edit"></div>';
  const pbox = ps.querySelector('.p');
  const secBox = d.createElement('div'); secBox.id = 'cr-sec'; secBox.setAttribute('aria-hidden', 'true');
  const find = id => { const pg = pageOf(id); if (pg && pg !== PG) return null; const raw = pg ? String(id).slice(pg.length + 1) : id;
    try { const el = d.querySelector('[data-section="' + CSS.escape(raw) + '"]'); return el && (pg ? !el.hasAttribute('data-cr-shared') : el.hasAttribute('data-cr-shared') || !pg) ? el : null; } catch (_) { return null; } };
  const sections = () => [...d.querySelectorAll('[data-section]')].map(s => ({ id: keyOf(s), label: labelOf(s) }));
  const pos = c => { const sec = find(c.section) || d.body, r = sec.getBoundingClientRect();
    return { left: r.left + scrollX + (+c.x || 0) * r.width, top: r.top + scrollY + (+c.y || 0) * r.height }; };
  const draw = () => {
    if (!d.body) return;
    if (!layer.isConnected) d.body.appendChild(layer);
    if (!secBox.isConnected) d.body.appendChild(secBox);
    layer.innerHTML = '';
    for (const c of list) {
      const here = /:page$/.test(c.section) ? pageOf(c.section) === PG : c.section === 'page' || !!find(c.section);
      if (!c.draft && !here) continue;   /* a comment on another page */
      const p = pos(c), b = d.createElement('button');
      b.type = 'button'; b.textContent = c.n;
      b.className = (c.done ? 'done ' : '') + (c.draft ? 'draft ' : '') + (c.on ? 'on' : '');
      b.style.left = p.left + 'px'; b.style.top = p.top + 'px';
      b.setAttribute('aria-label', c.draft ? 'New comment' : 'Comment ' + c.n + ' by ' + c.name);
      if (!c.draft) b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); send({ type: 'pin', id: c.id }); });
      layer.appendChild(b);
    }
    placeSec(); placePop();
  };

  /* Find the editable boxes: photos, and the outermost elements that hold only text and inline formatting */
  const INL = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SMALL', 'SUP', 'SUB', 'BR', 'MARK', 'SPAN', 'ABBR', 'CODE', 'Q', 'TIME']);
  const SKIP = 'script,style,svg,noscript,template,iframe,video,canvas,#cr-layer,#cr-sec,[data-noedit]';
  const pure = el => { for (const c of el.children) if (!INL.has(c.tagName) || !pure(c)) return false; return true; };
  const kindOf = el => { const t = el.tagName;
    if (/^H[1-6]$/.test(t)) return 'Heading';
    if (el.closest('.btn,button,[role="button"]')) return 'Button';
    if (t === 'A' || el.closest('a')) return 'Link';
    if (t === 'LI') return 'List item';
    return 'Text'; };
  function scan() {
    boxes.clear();
    d.querySelectorAll('[data-section]').forEach(sec => {
      const sid = keyOf(sec), slabel = labelOf(sec), counts = {}, pre = sec.hasAttribute('data-cr-shared') ? '' : PG + ':';
      let ti = 0, ii = 0;
      const reg = (el, img) => {
        const kind = img ? 'Image' : kindOf(el); counts[kind] = (counts[kind] || 0) + 1;
        const id = el.dataset.edit ? pre + el.dataset.edit : (sid + '/' + (img ? 'img' + (++ii) : 't' + (++ti)));
        const b = { el, id, img, section: sid, slabel, kind, n: counts[kind] };
        if (img) { b.src = el.getAttribute('src'); b.srcset = el.getAttribute('srcset'); b.sizes = el.getAttribute('sizes');
          b.sources = el.parentElement && el.parentElement.tagName === 'PICTURE' ? [...el.parentElement.querySelectorAll('source')].map(s => [s, s.getAttribute('srcset')]) : []; }
        else { b.html = el.innerHTML; b.text = plain(clean(el.innerHTML)); }
        el.dataset.crEdit = id; boxes.set(id, b);
      };
      const walk = el => {
        for (const c of el.children) {
          if (c.matches(SKIP) || c.hasAttribute('data-section')) continue;
          if (c.tagName === 'IMG') { if (c.dataset.edit || !/\/logo\//.test(c.getAttribute('src') || '')) reg(c, true); continue; }
          if (pure(c) && c.textContent.trim()) reg(c, false); else walk(c);
        }
      };
      walk(sec);
      const totals = {}; boxes.forEach(b => { if (b.section === sid) totals[b.kind] = (totals[b.kind] || 0) + 1; });
      boxes.forEach(b => { if (b.section === sid) b.label = slabel + ' · ' + b.kind + (totals[b.kind] > 1 ? ' ' + b.n : ''); });
    });
  }

  /* Edited text keeps only simple inline formatting, whoever wrote it */
  const OK = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'SPAN', 'SMALL', 'SUP', 'SUB', 'MARK']);
  /* Motion scripts split text into words and letters. Those wrapper spans are unwrapped when an edit is saved, so the sheet gets the words.
     A span counts as a wrapper if it has data-split, or a class ending in -w, -l, -c, -char, -letter, -word(s), -glow, -type or -split
     (any prefix, - or __), or a class listed in <html data-cr-unwrap="...">. Mark new split spans with data-split. */
  const ART = /(^|[-_])(w|l|c|ch|char|chars|letter|letters|word|words|glow|type|split)$/, ARTX = new Set((de.dataset.crUnwrap || '').split(/\s+/).filter(Boolean));
  const SR = /(^|[-_])(sr|sr-only|visually-hidden|screen-reader-text)$/;
  const DROP = /^(script|style|iframe|object|embed|svg|math|template|img|video|audio|canvas|link|meta|input|textarea|select|button|form)$/i;
  function clean(html) {
    const t = d.createElement('template'); t.innerHTML = String(html == null ? '' : html);
    const walk = n => {
      for (const c of [...n.childNodes]) {
        if (c.nodeType === 3) continue;
        if (c.nodeType !== 1) { c.remove(); continue; }
        if (DROP.test(c.tagName)) { c.remove(); continue; }
        walk(c);
        if (!OK.has(c.tagName)) { if (/^(DIV|P|LI)$/.test(c.tagName) && c.previousSibling) c.before(d.createElement('br')); c.replaceWith(...c.childNodes); continue; }
        const split = c.hasAttribute('data-split'), cls = (c.getAttribute('class') || '').replace(/[^\w -]/g, '').split(/\s+/).filter(k => k && !/^is-/.test(k)).join(' ');
        /* Page scripts split text into words and letters for motion. Those wrappers aren't content: keep the words only */
        if (c.tagName === 'SPAN' && (split || !cls || cls.split(' ').every(k => ART.test(k) || ARTX.has(k)))) { c.replaceWith(...c.childNodes); continue; }
        [...c.attributes].forEach(a => c.removeAttribute(a.name));
        if (cls) c.setAttribute('class', cls);
      }
    };
    walk(t.content);
    const box = d.createElement('div'); box.appendChild(t.content);
    return box.innerHTML.replace(/&nbsp;/g, ' ').replace(/(\s*<br>\s*)+$/, '').replace(/^(\s*<br>\s*)+/, '').replace(/\s{2,}/g, ' ').trim();
  }
  function plain(html) {
    const t = d.createElement('template'); t.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, ' ');
    const all = t.content.textContent.replace(/\s+/g, ' ').trim(), sr = [...t.content.querySelectorAll('[class]')].filter(e => e.getAttribute('class').split(/\s+/).some(k => SR.test(k))).map(e => e.textContent).join(' ').replace(/\s+/g, ' ').trim();
    if (sr) { const sq = s => s.replace(/\s/g, ''); if (sq(all) === sq(sr) + sq(sr)) return sr; }
    return all;
  }

  /* Apply everyone's edits (or the original content) to the page */
  const okSrc = s => typeof s === 'string' && /^(data:image\/(jpeg|png|webp|gif);base64,|blob:|https:\/\/)/.test(s);
  function setSrc(b, src) {
    const el = b.el;
    if (src && okSrc(src)) {
      if (el.getAttribute('src') === src) return;
      el.removeAttribute('srcset'); el.removeAttribute('sizes'); b.sources.forEach(([s]) => s.removeAttribute('srcset'));
      el.removeAttribute('loading'); el.setAttribute('src', src);
    } else {
      if (b.srcset != null) el.setAttribute('srcset', b.srcset);
      if (b.sizes != null) el.setAttribute('sizes', b.sizes);
      b.sources.forEach(([s, v]) => { if (v != null) s.setAttribute('srcset', v); });
      if (el.getAttribute('src') !== b.src) el.setAttribute('src', b.src);
    }
  }
  const current = b => (!showOrig && applied[b.id]) || null;
  function applyAll() {
    boxes.forEach(b => {
      const e = current(b);
      if (b.img) { setSrc(b, e && e.src); return; }
      if (sel === b) return;
      const html = e && e.html != null ? clean(e.html) : b.html;
      if (b.el.innerHTML !== html) b.el.innerHTML = html;
    });
    requestAnimationFrame(draw);
  }

  /* Editing */
  function caretAt(el, e) {
    let r = null;
    try {
      if (e && d.caretRangeFromPoint) r = d.caretRangeFromPoint(e.clientX, e.clientY);
      else if (e && d.caretPositionFromPoint) { const p = d.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = d.createRange(); r.setStart(p.offsetNode, p.offset); } }
    } catch (_) { r = null; }
    if (!r || !el.contains(r.startContainer)) { r = d.createRange(); r.selectNodeContents(el); r.collapse(false); }
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function select(el, e) {
    const b = boxes.get(el.dataset.crEdit); if (!b) return;
    sel = b; el.classList.add('cr-sel');
    if (b.img) { const r = el.getBoundingClientRect(); send({ type: 'edit-image', id: b.id, label: b.label, section: b.section, w: Math.round(r.width), h: Math.round(r.height) }); return; }
    rawHtml = el.innerHTML; startHtml = clean(rawHtml);
    if (startHtml !== rawHtml) el.innerHTML = startHtml;   /* edit the words, not the motion wrappers */
    el.setAttribute('contenteditable', 'true'); el.spellcheck = true;
    el.focus({ preventScroll: true }); caretAt(el, e);
    popState('edit');
    send({ type: 'edit-start', id: b.id, label: b.label });
  }
  /* Headings and body copy get the tone check. Buttons, links and figures don't */
  const checkable = (b, text) => ['Heading', 'Text', 'List item'].includes(b.kind) && (text.match(/\p{L}/gu) || []).length >= 3 && (text.match(/\d/g) || []).length < (text.match(/\p{L}/gu) || []).length;
  const typed = () => { const html = clean(sel.el.innerHTML); return { html, text: plain(html), lines: html.replace(/<br>/g, '\n') }; };
  function popState(st, r) {
    if (!sel || sel.img) return;
    check = st === 'result' || st === 'none' ? { ...(check || {}), state: st, r } : st === 'check' ? check : null;
    const H = { edit: () => '<div class="row"><span class="t">' + esc(sel.label) + '</span><button type="button" data-a="cancel">Cancel</button><button type="button" class="pri" data-a="save">Save</button></div><p class="k">Type on the design. Enter adds a new line. Esc cancels.</p>',
      check: () => '<div class="run"><i class="spin" aria-hidden="true"></i>Running AI tone check</div><div class="bar" aria-hidden="true"><i></i></div><p class="k">Checking your words against the brand\'s tone of voice.</p>',
      result: () => { const same = r.suggestion.trim() === check.text.trim();
        return '<div class="sc"><b>' + r.score + '</b><span>/100</span><em>' + band(r.score) + '</em></div><div class="meter" aria-hidden="true"><i style="width:' + r.score + '%"></i></div>' +
          (r.reason ? '<p class="why">' + esc(r.reason) + '</p>' : '') +
          (same ? '<p class="k">No changes suggested. Your text fits the tone of voice.</p><div class="row"><button type="button" class="pri" data-a="dismiss">Save</button><button type="button" class="link" data-a="back">Keep editing</button></div>'
            : '<div class="sug"><span class="tag">Suggested copy · AI generated tone check</span><p>' + esc(r.suggestion) + '</p></div><div class="row"><button type="button" class="red" data-a="accept">Use suggestion</button><button type="button" data-a="dismiss">Dismiss and save mine</button></div><button type="button" class="link" data-a="back">Keep editing</button>'); },
      long: () => '<p class="k">That\'s too long to save in one box. Shorten it, or add the rest as a comment.</p><div class="row"><button type="button" class="link" data-a="back">Keep editing</button></div>',
      none: () => '<p class="k">' + esc(r && r.message || 'The tone check isn\'t available right now.') + '</p><div class="row"><button type="button" class="pri" data-a="dismiss">Save my text</button><button type="button" class="link" data-a="back">Keep editing</button></div>' };
    pbox.innerHTML = H[st](); pop.hidden = false; placePop();
    requestAnimationFrame(() => { const r = pbox.getBoundingClientRect(); if (r.bottom > innerHeight - 8) scrollBy({ top: Math.min(r.bottom - innerHeight + 16, Math.max(0, sel ? sel.el.getBoundingClientRect().top - 8 : 0)), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
    if (st === 'result' || st === 'none') { const f = pbox.querySelector('[data-a="accept"],[data-a="dismiss"]'); if (f) f.focus({ preventScroll: true }); }
  }
  const band = n => n >= 90 ? 'On brand' : n >= 70 ? 'Close' : n >= 40 ? 'Off in places' : 'Off brand';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function placePop() {
    if (pop.hidden || !sel) return;
    if (!pop.isConnected) d.body.appendChild(pop);
    const r = sel.el.getBoundingClientRect(), w = Math.min(440, innerWidth - 24);
    pop.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + scrollX + 'px';
    pop.style.top = r.bottom + scrollY + 10 + 'px';
  }
  function save() {
    if (!sel || sel.img) return;
    const t = typed();
    if (!t.text) { sel.el.innerHTML = rawHtml; release(); send({ type: 'edit-none', empty: true }); return; }
    if (t.html === clean(startHtml)) { cancel(); return; }
    if (t.html.length > 4000) { popState('long'); return; }
    if (!checkable(sel, t.text)) { finish(t.html, null); return; }
    sel.el.setAttribute('contenteditable', 'false');
    check = { id: ++req, text: t.lines, html: t.html, state: 'check' }; popState('check');
    send({ type: 'tone-check', req: check.id, id: sel.id, kind: sel.kind, label: sel.label, text: t.lines, before: sel.text });
  }
  function finish(html, tone) {
    const b = sel, before = plain(clean(startHtml));
    b.el.innerHTML = html; release();
    send({ type: 'edit-text', id: b.id, label: b.label, section: b.section, html, text: plain(html), before, tone });
  }
  function choose(a) {
    if (!sel || !check) return;
    const r = check.r || {};
    if (a === 'back') { sel.el.innerHTML = check.html; check = null; sel.el.setAttribute('contenteditable', 'true'); sel.el.focus({ preventScroll: true }); caretAt(sel.el); popState('edit'); return; }
    if (a === 'accept') finish(clean(esc(r.suggestion).replace(/\n/g, '<br>')), { typed: check.text, suggestion: r.suggestion, score: r.score, choice: 'accepted' });
    else finish(check.html, check.state === 'result' ? { typed: check.text, suggestion: r.suggestion, score: r.score, choice: 'dismissed' } : { typed: check.text, choice: 'none' });
  }
  pbox.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'save') save(); else if (a === 'cancel') cancel(); else if (a === 'back' && !check && sel) { popState('edit'); sel.el.focus({ preventScroll: true }); } else choose(a); });
  /* Hovering Use suggestion shows it on the design */
  pbox.addEventListener('mouseover', e => { if (sel && check && check.r && e.target.closest('[data-a="accept"]')) sel.el.innerHTML = clean(esc(check.r.suggestion).replace(/\n/g, '<br>')); });
  pbox.addEventListener('mouseout', e => { if (sel && check && check.r && e.target.closest('[data-a="accept"]')) sel.el.innerHTML = check.html; });
  pbox.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } });
  function release() {
    if (!sel) return;
    sel.el.classList.remove('cr-sel'); sel.el.removeAttribute('contenteditable');
    sel = null; check = null; pop.hidden = true; clearTimeout(pfT); try { getSelection().removeAllRanges(); } catch (_) {}
  }
  function cancel() {
    if (!sel) return;
    if (!sel.img) sel.el.innerHTML = rawHtml;
    release(); send({ type: 'edit-none' });
  }
  function setEditing(on) {
    if (on === editOn) return;
    if (!on) { if (sel) cancel(); hovSec = hovBox = null; }
    editOn = on; de.classList.toggle('cr-editing', on); placeSec();
  }
  function placeSec() {
    if (!editOn || !hovSec) { secBox.style.display = 'none'; return; }
    const r = hovSec.getBoundingClientRect();
    Object.assign(secBox.style, { display: 'block', left: r.left + scrollX + 'px', top: r.top + scrollY + 'px', width: r.width + 'px', height: r.height + 'px' });
  }

  addEventListener('message', e => {
    if (e.source !== P || !e.data || !e.data.cr) return;
    const m = e.data;
    if (m.type === 'hello') send({ type: 'ready', sections: sections(), page: PG, pageLabel: PL });
    else if (m.type === 'go' && m.page && m.page !== PG) location.href = m.page + '.html';
    else if (m.type === 'accent') { if (m.id) de.dataset.accent = m.id; requestAnimationFrame(draw); }
    else if (m.type === 'mode') { mode = !!m.on; de.classList.toggle('cr-commenting', mode); }
    else if (m.type === 'pins') { list = m.list || []; draw(); }
    else if (m.type === 'edit-mode') setEditing(!!m.on);
    else if (m.type === 'edits') { applied = m.list && typeof m.list === 'object' ? m.list : {}; showOrig = !!m.original; applyAll(); }
    else if (m.type === 'image-preview') { const b = boxes.get(m.id); if (b && b.img) setSrc(b, m.src || (current(b) || {}).src); }
    else if (m.type === 'tone-result') { if (sel && check && check.state === 'check' && m.req === check.id) {
      const r = m.ok && typeof m.suggestion === 'string' && m.suggestion.trim() ? { score: Math.max(0, Math.min(100, Math.round(+m.score) || 0)), suggestion: m.suggestion.trim().slice(0, 2000), reason: String(m.reason || '').slice(0, 200) } : null;
      if (r) popState('result', r); else popState('none', { message: m.message }); } }
    else if (m.type === 'edit-cancel') cancel();
    else if (m.type === 'deselect') { if (sel && sel.img) release(); }
    else if (m.type === 'scroll' && (pageOf(m.target || m.section) || PG) !== PG) {   /* on another page: go there, then scroll */
      try { sessionStorage.setItem('cr-goto', JSON.stringify(m)); } catch (_) {}
      location.href = pageOf(m.target || m.section) + '.html';
    }
    else if (m.type === 'scroll' && m.target) {
      const b = boxes.get(m.target); if (!b) return;
      b.el.scrollIntoView({ block: 'center', behavior: m.smooth ? 'smooth' : 'auto' });
      b.el.classList.add('cr-flash'); setTimeout(() => b.el.classList.remove('cr-flash'), 1400);
    }
    else if (m.type === 'scroll') {
      const sec = find(m.section); if (!sec) return;
      const behavior = m.smooth ? 'smooth' : 'auto';
      if (m.y == null) sec.scrollIntoView({ behavior });
      else scrollTo({ top: Math.max(0, pos(m).top - 140), behavior });
    }
  });
  d.addEventListener('click', e => {
    if (editOn) {
      if (e.target === pop) return;
      const t = e.target.closest('[data-cr-edit]');
      if (sel && !sel.img && t === sel.el) { e.preventDefault(); return; }
      e.preventDefault(); e.stopPropagation();
      if (sel && !sel.img) { pbox.classList.remove('nudge'); void pbox.offsetWidth; pbox.classList.add('nudge'); return; }
      if (sel) { release(); send({ type: 'edit-none' }); }
      if (t) select(t, e);
      return;
    }
    if (!mode) { const a = e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#') && !isPage(a)) e.preventDefault(); return; }
    e.preventDefault(); e.stopPropagation();
    const sec = e.target.closest('[data-section]') || d.body, r = sec.getBoundingClientRect();
    send({ type: 'click', section: sec.dataset.section ? keyOf(sec) : PG + ':page', label: sec.dataset.section ? labelOf(sec) : PL,
      x: +((e.clientX - r.left) / r.width).toFixed(4), y: +((e.clientY - r.top) / r.height).toFixed(4) });
  }, true);
  d.addEventListener('keydown', e => {
    if (sel && !sel.img) {
      if (e.target === pop) return;
      if (e.key === 'Enter') { e.preventDefault(); if (sel.el.isContentEditable && !d.execCommand('insertLineBreak')) d.execCommand('insertHTML', false, '<br>'); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      return;
    }
    if (e.key === 'Escape') { if (sel) { release(); send({ type: 'edit-none' }); return; } send({ type: 'esc' }); }
  });
  d.addEventListener('paste', e => {
    if (!sel || sel.img) return;
    e.preventDefault();
    const t = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\s*[\r\n]+\s*/g, ' ');
    if (!d.execCommand('insertText', false, t)) { const r = getSelection().getRangeAt(0); r.deleteContents(); r.insertNode(d.createTextNode(t)); r.collapse(false); }
  });
  d.addEventListener('drop', e => { if (editOn) e.preventDefault(); });
  d.addEventListener('dragover', e => { if (editOn) e.preventDefault(); });
  /* While someone types, check the words in the background, so the result is often ready when they press Save */
  d.addEventListener('input', () => {
    if (!sel || sel.img || check) return; placePop(); clearTimeout(pfT);
    pfT = setTimeout(() => { if (!sel || sel.img || check) return; const t = typed();
      if (t.text && t.html !== clean(startHtml) && checkable(sel, t.text)) send({ type: 'tone-prefetch', id: sel.id, kind: sel.kind, label: sel.label, text: t.lines, before: sel.text }); }, 700);
  });
  d.addEventListener('mouseover', e => {
    if (!editOn) return;
    const s = e.target.closest('[data-section]'), b = e.target.closest('[data-cr-edit]');
    if (s !== hovSec || b !== hovBox) { hovSec = s; hovBox = b; placeSec(); }
  });
  de.addEventListener('mouseleave', () => { if (editOn) { hovSec = hovBox = null; placeSec(); } });
  addEventListener('scroll', () => { if (editOn && hovSec) placeSec(); }, { passive: true });
  addEventListener('resize', placePop);
  const start = () => { scan(); new ResizeObserver(draw).observe(d.body); send({ type: 'ready', sections: sections(), page: PG, pageLabel: PL }); draw();
    let g = null; try { g = JSON.parse(sessionStorage.getItem('cr-goto') || 'null'); sessionStorage.removeItem('cr-goto'); } catch (_) {}
    if (g) setTimeout(() => dispatchEvent(new MessageEvent('message', { data: g, source: P })), 400); };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
  addEventListener('load', draw);
})();
