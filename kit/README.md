# Salo brand guidelines template (2026)

The standard for every brand Salo builds guidelines for. One structure, skinned to each brand:

- **Guidelines site** (`site/index.html`): a cover, then Brand, Templates and Reference kit pages behind one sticky top bar (a burger menu on phones). Brand covers 01 Strategy, 02 Voice, 03 Identity and 04 Website. Templates holds the email signature generator and any Word templates.
- **Reference kit** (`site/reference-kit.html`): the website's ingredients, compositions, basic motion, logo pieces and rules, with an accent switcher along the top. Starts basic; add richer motion per project.
- **Rules sheet** (`site/website-rules.md`): the technical guardrails Claude reads before any website work. Embedded in the kit and downloadable from it.
- **PDF guidelines** (`pdf/guide.html`): 21 A4 pages following the same chapters, rendered to `site/assets/guidelines/`.
- **Concept review tab** (`concept-review/`): the website concept (the homepage, or every page with a page picker) behind a light password screen, with the accent switcher, desktop and mobile views, pinned comments, live content edits (copy and photos, with an AI tone check on the copy), section ticks and sign-off, saved to a sheet and folder in the Olas Shared Drive. Off until the website's concept stage, removed at launch. See `concept-review/SETUP.md`.

First used in October 2026. Never copy a client's content between brands: the template holds placeholders only.

**Two modes** (`mode` in `brand.json`):

- **guidelines**, for a brand Salo designed: everything above, published for the client.
- **reference**, for a brand the client supplied: only the reference kit, the rules sheet and the Concept review tab. The kit opens with a Brand chapter built from what they gave us (their website, guidelines and files): sources, positioning and voice, colour (swatches from `palette`), type and web licences, logo as supplied, imagery, and the gaps. It's Salo's internal reference for the website and the brand brain, not a deliverable, and their guidelines win where the two differ. No index.html, PDF or templates. Run it locally (`python3 -m http.server`) and only share it once it's on secure hosting.

## Start a new brand

You need: the brand's name, logo files (SVG), main dark colour, accent colour or options, fonts (latin .woff2), and the brand strategy and voice material.

1. **Copy the template** from the Olas Shared Drive (`SAL-OS/toolbox/brand-guidelines-2026/template/`) into the client's working folder. The brand-guidelines-2026 skill has the full steps.
2. **Fill in `brand.json`**: name, wordmark, strapline, slug, year, web address, the dark colour and its name, accents, radius, fonts, icon style and names, which Word templates exist, and the signature address and disclaimer.
3. **Skin it:** `python3 tools/skin.py brand.json ../<slug>-guidelines`. It writes the token blocks, the accent switcher and every `{{...}}` placeholder, renames the files, embeds the rules sheet in the kit, downloads the icon subset and prints the accent and contrast table. Work in the new folder from here on.
4. **Add the brand's files** in `site/assets/`: logos as `<slug>-<version>-black.svg` and `-white.svg`, profile and favicon, `favicon/`, `email/logo.png` (400 × 113), photos as `website/photos/photo-N.webp` and `photo-N-m.webp`, Word templates and previews in `templates/`.
5. **Build the logo zips:** `python3 tools/logo-sets.py site <slug> --brand "<Brand>" --clear <x as a fraction of logo height>`.
6. **Write the content.** Claude fills every `[[...]]` from the client's material (brief, workshop, brand strategy, brand brain), in all four files. Facts the client hasn't confirmed become `[TBC]`. Nothing is invented.
7. **Render the PDF:** `python3 tools/pdf-photos.py .` then `node pdf/render-pdf.js <slug>`.
8. **Check:** `python3 tools/check.py . --forbid "<other client names>"` must pass. Then `node tools/test.js site` (Playwright) must pass.
9. **Preview:** `python3 tools/preview.py site <slug>-guidelines-preview.html` gives one clickable file to review in Claude.
10. **Publish:** `site/` is the client's repo. Push it with one zip and one Claude Code prompt, and turn on GitHub Pages.

Later, at the website's concept stage: `python3 tools/concept-review.py on . --password ...` adds the Concept review tab. `round`, `close` and `off` move it through review rounds, sign-off and launch.

## What's fixed and what's per brand

| Fixed in the template | Set per brand |
| --- | --- |
| Page structure, chapters and order | Content in every `[[...]]` |
| Top bar, side menu, burger, scrollspy, routing | Colours, accents, radius, fonts, icon style (`brand.json`) |
| Email signature generator and app guides | Signature address, disclaimer, badges (`CONFIG` in `index.html`) |
| Lazy loading, self-hosted fonts, phone photos | Logos, photos, Word templates |
| Accessibility: WCAG 2.2 AA, focus, keyboard, reduced motion | Signature device demo, if it isn't a module grid |
| Basic motion set in the kit | Any extra motion the brand needs |

## Rules for editing the template

Read `CONTRACT.md` first. In short: colours only through tokens, `[[...]]` for content, `{{...}}` for skin values, photos only as `.sec.ld .p-N` classes, no client content ever. Change the template here once and every new brand gets it. Existing brands don't update automatically.

## Tools

| Tool | Does |
| --- | --- |
| `tools/skin.py` | brand.json to a skinned copy, plus the contrast report |
| `tools/logo-sets.py` | Logo zips (SVG, PNG, PDF, with and without clear space) and the logo suite |
| `tools/pdf-photos.py` | JPEG copies of the photos for the PDF (keeps it small) |
| `pdf/render-pdf.js` | The A4 PDF, checked for fonts and shrunk with qpdf |
| `tools/check.py` | Placeholders, other clients' names, stray colours, Google Fonts, missing files |
| `tools/test.js` | Navigation, burger, overflow, fonts and console errors at 1440 and 390 |
| `tools/preview.py` | One-file clickable preview for review in Claude, with the Concept review tab if it's on |
| `tools/concept-review.py` | Turns the Concept review tab on and off, sets the password, round, reply-by date and what changed, and closes it after sign-off |

Python 3 with Pillow and Playwright, Node with Playwright, and qpdf (optional).

## Changes

- 20 October 2026: Concept review handles a multi-page prototype (page list, page picker, comments and edits keyed by page, approvals grouped by page); copy edits save clean text and are never cut short; unsent items send on reconnect with a leave warning; sheet script emails say website concept and list every section; live data test and the review-pull step in SETUP.md. From the first multi-page run.
- 20 October 2026, later: sign-off only by the project's named signers, proven by a code emailed to them; the review closes itself on sign-off; a build pack folder in the Olas Drive and a ready-to-build email. `concept-review.py on --signers`. Run `setup` again after pasting the new Code.gs (new columns: Projects signers, Items verified) and deploy a new version.
- 20 October 2026, last: the Concept review tool's own accent (badge, active tabs, progress bar, approval and edit markers) is Salo Purple #6405FF, from Salo's brand tokens. Error markers stay red.
- 20 October 2026, standards: the rules sheet makes depth and motion standard on every site (the full motion and interaction system, shown as live demos in the kit) and carries the optimisation standard (Lighthouse, Core Web Vitals and weight budgets for code, fonts and photos).
- 20 October 2026, evening: the edit panel and tone check inside the concept are Salo Purple too. `concept-review.py on` adds a "Need help? Watch the concept review demo" link to the guidelines cover (`--video` to change or leave it out).
- 20 October 2026, reference mode: `"mode": "reference"` in brand.json skins a brand the client supplied as a reference kit only, with a Brand chapter (sources, voice, palette swatches, type licences, logo as supplied, imagery, gaps), no guidelines site, PDF or templates, and the top bar pointing at the kit. `test.js` and `preview.py` handle it.
