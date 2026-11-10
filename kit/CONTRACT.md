# Template contract

The rules every template file follows, so one `brand.json` and `tools/skin.py` can skin the guidelines site, the reference kit and the PDF together. Read this before editing any template file.

## Folder layout

```
brand-guidelines-template/
  brand.json               The skin: name, colours, accents, fonts, contact details
  CONTRACT.md              This file
  README.md                How to start a new brand from the template
  site/                    Becomes the client's guidelines repo (GitHub Pages)
    index.html             Guidelines: cover, Brand view, Templates view
    reference-kit.html     Website reference kit (starter, basic motion)
    website-rules.md       Technical guardrails for the website build (Claude reads it)
    README.md              Repo readme for the client site
    assets/fonts/          display.woff2, body.woff2, icons.woff2
    assets/logo/           brand-*.svg (renamed to <slug>-*.svg by skin.py), sets/ zips
    assets/favicon/        favicon.svg, favicon-32.png, apple-touch-icon.png
    assets/email/          logo.png for the email signature (400 x 113)
    assets/guidelines/     brand-brand-guidelines.pdf, how-to-use-the-brand-brand-guidelines.txt
    assets/templates/      Word templates and previews (optional per brand)
    assets/website/photos/ photo-N.webp and photo-N-m.webp (phone version)
  pdf/
    guide.html             A4 PDF source, uses ../site/assets/
    render-pdf.js          Renders guide.html to site/assets/guidelines/<slug>-brand-guidelines.pdf
  concept-review/          Concept review tab, skinned with the rest but kept out of site/ until it's turned on
    concept-review.html    Password screen, accent switcher, comments, edit content, section ticks, sign-off
    concept/home.html      Starter homepage; replaced by the approved prototype at the concept stage (the website
                           repo's tools/concept.py writes every page and concept/manifest.js, the page list)
    concept/manifest.js    The page list (empty for a homepage only; tools/concept.py writes it for several pages)
    concept/review.js      Draws the pins and runs Edit content inside each concept page, keys sections by page, saves
                           edits as clean text (motion wrappers stripped), and reports to the review page
    apps-script/Code.gs    The Google Sheet back end (one sheet for every client, in the Olas Shared Drive), and the AI tone check
    voice-pack.md          The brand's voice for the AI tone check; filled per project and saved to Drive
    SETUP.md               One-time setup and the per-project steps
  tools/
    concept-review.py      on, round, close, off
    skin.py                brand.json -> skinned copy of site/ and pdf/
    check.py               Finds unfilled placeholders, other clients' names (--forbid), hard-coded colours, missing files
    preview.py             One-file clickable preview of the site
    test.js                Navigation, overflow and console checks (Playwright)
    logo-sets.py           Logo download zips and the logo suite
    pdf-photos.py          JPEG copies of the photos for the PDF
```

## Placeholders

Text placeholders, replaced by `skin.py` from `brand.json`, anywhere in any file:

| Placeholder | Example | Use |
|---|---|---|
| `{{BRAND}}` | Acme | The name as written in sentences |
| `{{WORDMARK}}` | ACME | The logo's letters, for alt text |
| `{{STRAPLINE}}` | Built to last | Logo strapline for alt text. May be empty |
| `{{SLUG}}` | acme | File names |
| `{{YEAR}}` | 2026 | The only date shown anywhere |
| `{{WEB}}` | acme.co.uk | Web address without https:// |
| `{{INK_NAME}}` | Acme black | Name of the main dark colour |
| `{{DISPLAY_FONT}}` | Space Grotesk | Heading typeface name |
| `{{BODY_FONT}}` | Inter | Body typeface name |
| `{{ICON_STYLE}}` | Sharp | Material Symbols style: Sharp, Outlined or Rounded |
| `{{ACCENT_NAME}}` | Signal | Default accent's name |

Content placeholders, filled by Claude per brand from the client's material:

- `[[...]]` holds an instruction or a sample, for example `[[Value 1]]` or `[[One line on who the brand serves]]`. Nothing ships with `[[` left in it. `tools/check.py` fails if any remain.
- `[TBC]` is allowed in a finished site for a fact the client hasn't confirmed yet.

Never put a real client's name, figure, claim, photo or logo in the template.

## Tokens

Every colour, font and radius comes from tokens. No hex values in component CSS, inline styles or SVG strokes. The one exception is the email signature, which needs literal hex values for email apps; those come from `CONFIG` at the top of the script, which `skin.py` fills.

The token block sits between these markers in every HTML file, and `skin.py` rewrites everything between them:

```
/*@tokens start*/
...
/*@tokens end*/
```

Default block (neutral, square, Inter):

```
:root{
  --n-0:#FFFFFF; --n-25:#FAFAFA; --n-50:#F3F3F4; --n-100:#E8E8E8; --n-200:#D0D1D1; --n-300:#B9BABB;
  --n-400:#A2A3A4; --n-450:#8A8C8D; --n-500:#737476; --n-600:#5C5D5F; --n-700:#454649; --n-750:#3A3C3F;
  --n-800:#2D2F32; --n-850:#2A2C2F; --n-900:#1A1C1F; --n-950:#16181B; --n-990:#0F1012;
  --n-950-rgb:22 24 27;
  --bad:#E5322D; --bad-bg:#FCEBEA; --bad-ink:#8E1E1A;
  --acc:#FFB020; --acc-ink:#986D1E; --acc-ink3:#C2881F;
  --radius:0px;
  --display:'Brand Display', Arial, Helvetica, sans-serif;
  --body:'Brand Body', Arial, Helvetica, sans-serif;
  --icons:'Brand Icons';
}
@font-face{font-family:'Brand Display';font-style:normal;font-weight:400 700;font-display:swap;src:url(assets/fonts/display.woff2) format('woff2')}
@font-face{font-family:'Brand Body';font-style:normal;font-weight:300 600;font-display:swap;src:url(assets/fonts/body.woff2) format('woff2')}
@font-face{font-family:'Brand Icons';font-style:normal;font-weight:300;font-display:block;src:url(assets/fonts/icons.woff2) format('woff2')}
```

In `pdf/guide.html` the font URLs start `../site/assets/`. `skin.py` handles the prefix.

What the tokens mean:

- `--n-950` is the brand's main dark colour ("{{INK_NAME}}"). `--n-0` is white. The scale runs light to dark in between; `--n-900` and `--n-990` are the dark-mode surfaces.
- Use `rgb(var(--n-950-rgb) / .5)` for the dark colour with transparency. White with transparency stays `rgba(255,255,255,a)`.
- `--acc` is the accent fill. `--acc-ink` is the accent darkened to 4.5:1 on white (small text, icons on white). `--acc-ink3` is 3:1 on white (large text, focus rings, UI). Text on the accent is always `--n-950`.
- `--bad*` is for the "don't" crosses and error states only.
- `--radius` applies to buttons, cards, tiles, inputs and images. `0px` keeps everything square.

## Accents (reference kit only)

The kit's accent switcher is generated by `skin.py` from `brand.json` `accents`:

- CSS between `/*@accents start*/` and `/*@accents end*/`: one `:root[data-accent="<id>"]{--acc:..;--acc-ink:..;--acc-ink3:..}` per accent.
- Buttons between `<!--@accent-buttons start-->` and `<!--@accent-buttons end-->`: `<button type="button" data-a="<id>" style="--c:<acc>" aria-pressed="..."><i></i><span><name></span></button>`.
- The kit's script reads the buttons from the page, stores the choice in localStorage under `<slug>-accent`, and fires a `brand:accent` event. No accent list is hard-coded in script.
- With one accent, or `accent_status` set to `final`, `skin.py` adds `data-accent-final` to `<html>` and the bar hides.

## Photos

Photo backgrounds are classes, applied per section once it's near the screen:

```
.sec.ld .p-1.p-1{background-image:url(assets/website/photos/photo-1.webp)}
@media (max-width:760px){.sec.ld .p-1.p-1{background-image:url(assets/website/photos/photo-1-m.webp)}}
```

The lazy-load script adds `.ld` to each `.sec` within 900px of the screen. Every photo element must sit inside a `.sec`.

## Page structure

Both pages share the top bar: `<section class="hero topnav">` (guidelines) or `<header class="band topnav">` (kit), primary logo left, then the Brand, Templates and Reference kit buttons (`.pnav`), full height, no gaps, sticky on desktop, burger menu under 900px that hides on scroll down and returns on scroll up. Same CSS and script in both files.

Guidelines chapters, in order (Brand view): 01 Strategy (values, audience, positioning), 02 Voice (tone, key messages, writing style, example headlines), 03 Identity (logo, clear space and size, logo don'ts, colour, typography, icons), 04 Website (signature device, accent and highlights, buttons, image treatments, motion, website rules, link to the kit). Templates view: email signature, then optional letterhead and newsletter.

The PDF follows the same chapters, one to three pages each, with Templates last.

## House style for every file

UK English. No em dashes. Sentence case. Short sentences. Square corners unless `--radius` says otherwise. WCAG 2.2 AA. `prefers-reduced-motion` shows the final state.

## Concept review pages

`site/concept/home.html` (copied in by `tools/concept-review.py on`) must:

- mark every section with `data-section="short-id"` and `data-label="Name in the review panel"`
- keep the token block and the `/*@accents*/` block, so the accent switcher works
- use `../assets/` for every asset
- keep the gate script at the end of `<head>`, so opening it directly goes to the password screen
- end with `<script src="review.js" defer></script>`, which draws the comment pins, runs Edit content and talks to the review page by message
- carry `<meta name="robots" content="noindex, nofollow">`

Edit content makes every photo and every piece of text in a section editable (logos excepted). Headings and body copy go through the AI tone check before they save, against the project's voice pack (`concept-review/voice-pack.md`, saved to Drive per project). Edits are matched to the element by id: `data-edit="short-name"` if the element has one, otherwise its position in the section. Give the main headings, buttons and photos a `data-edit` before round 2 if the layout is changing, so earlier edits stay on the right element. `data-noedit` leaves an element out.

The password is a light screen, not encryption. Nothing confidential goes in the concept. The review settings live in `CONFIG` at the top of `concept-review.html`; the tool writes them.

## Reference mode markers

- `<!--@reference-only start-->` and `<!--@reference-only end-->` wrap anything that only belongs in reference mode (the kit's Brand chapter and its side menu group). `skin.py` keeps the content and drops the markers in reference mode, and drops the whole block in guidelines mode.
- `<!--@palette start-->` and `<!--@palette end-->` wrap the Brand chapter's swatches. `skin.py` writes them from `palette` in `brand.json`; `check.py` allows hex inside them.
- Chapter numbers in the kit are renumbered by `skin.py`, so keep them in order but don't worry about gaps.
- Links to `index.html` in the kit and the Concept review page must use the exact strings `skin.py` rewrites (the top bar logo, the Brand and Templates links, and "Back to the brand guidelines"), or reference mode will point at a page that isn't there. `test.js` fails if it does.
