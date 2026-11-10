# The Syndicate Club landing page: rules and guardrails

The rules for the Google Ads landing page and thank-you page, from tokens to launch. Written November 2026 from the Corn Cobs landing page brief (v1), The Syndicate Club's live website (thesyndicateclub.co.uk, read 9 November 2026) and this reference kit. Claude reads this file and the kit before any work on the page.

## 0. How to use this file

- **Their brand, as it is.** Colours, type style, logos, photos and film come from their live site. There is nothing to choose. Don't add colours, fonts or styles.
- **Order of authority.** Their brand, then the Corn Cobs brief, then this file, then the kit. If two disagree, stop and ask Toby.
- **Pass or fail.** Every round is checked against section 10 before it goes out.
- **Gaps get flagged, not filled.**

## 1. Open items

| Item | Why it matters | Owner |
| --- | --- | --- |
| Brand guidelines or logo vectors | Only white PNG logos exist on their site | Client, via Corn Cobs |
| Royal Cinque Ports photo | Course card 6 has no photo on their site | Client |
| Top 100 claim and its source | Their homepage and FAQ disagree | Client |
| Cabot Highlands or Castle Stuart | Both names are used on their site | Client |
| Ranking claims for Liphook and West Hill | Need a basis | Client |
| Google review for the proof block | Placeholder until supplied | Client |
| Membership and Course Access Guide | Must exist before ads go live | Client |
| Hero photo course name | From their homepage, course not named | Client |
| Photo and film use | Their own site assets; confirm use on the landing page | Client |

## 2. Process guardrails

- **One source of truth.** Tokens, blocks and copy live in the repo (`lp/`).
- **Tokens before blocks.** No colour, size, space, radius, easing or duration typed into a block. `tools/check.py` fails on it.
- **Blocks map to the build.** Every section is one self-contained block, ready to become a WordPress pattern or a Wix section.
- **Desktop and phone every round.** `smoke.js` at 390, 768, 1024, 1440 and 2560.

## 3. Copy and evidence

- **The brief's copy is final.** Paste it as written. If something won't fit, raise it with Corn Cobs.
- **No invented content.** Placeholders look like placeholders and are on the content list.
- UK English. No em dashes.
- The name in copy is **The Syndicate Club** or **The Syndicate**.

## 4. Colour (theirs)

| Token | Hex | Use |
| --- | --- | --- |
| `--navy` | #2A3649 | Their main colour: headings, text, panels, buttons |
| `--navy-2` | #324158 | Their second navy: FAQ text, panels on navy |
| `--navy-deep` | #1F2837 | Navy at 75%, button hover |
| `--black` | #000000 | Their black panels, course strip |
| `--cream` | #FEFAF0 | Their warm sections |
| `--white` | #FFFFFF | Page, text on navy |

- Pairings: white on navy 12.2:1, navy on cream 11.7:1, navy on white 12.2:1. All pass AA.
- Ticks are white on navy panels and navy on light. No green: it isn't in their brand.

## 5. Type (theirs)

- **Jost**, as their site uses it. SIL Open Font License. One self-hosted variable file (about 26KB), preloaded.
- Headings in capitals, weight 600, as their site sets them. A light (300) second line where a headline splits, as on their homepage.
- A short 2px rule under section headings, drawn in on arrival.
- Body Jost 400 at 17px, leading 1.6. Eyebrows and buttons in capitals, 13px, tracked 0.16 to 0.24em.

## 6. Logo

- Their white PNGs only: stacked (ring mark over wordmark), wordmark, ring mark.
- On navy, black or a shaded photo. Never on white or cream; there is no dark version.
- Header: stacked at 64px tall (48px on phones). Sticky bar: wordmark at 28px. Ring mark 44px above headings.
- Watermark: the ring mark at 7% white, up to 640px, turning with scroll.
- Never redraw, recolour, stretch or add effects.

## 7. Photography and film

- Their own partner-course photography and their homepage aerial film. No stock.
- Hero shaded with the token gradient so white type passes contrast. Hero WebP 155KB at 2400px.
- Course cards hold three photos each and flick through on hover or tap.
- Film: a ten-second loop, 685KB desktop, 210KB phones. Loads when reached, plays only on screen, pause button, never with reduced motion or data saver.

## 8. Components

- **Buttons:** square, capitals, tracked. Navy on light, white on dark, outline for the header phone. A glint sweeps across on hover; buttons lean towards the pointer on a mouse.
- **Form card:** white, square, soft shadow. Labels above fields, errors under the field. Two steps with a progress bar.
- **Course strip:** static, on black, names fade in one after another. Never a ticker.
- **Sticky bar:** after the hero, hidden at the final form, with reading progress along its edge.

## 9. Motion

| Motion | Timing | Rule |
| --- | --- | --- |
| Hero photo settle and pointer drift | 2200ms, then follows the pointer | Mouse only for the drift |
| Headline words rise | 900ms, 70ms apart | Hidden full copy for screen readers |
| Reveals and heading rules | 900ms, 70ms stagger | Once |
| Photo wipe and settle | 900ms, then 2200ms | Parent watched |
| Icons and ticks draw in | 1400ms | pathLength 1 on every shape |
| Counter and eighty dots | 1600ms, 12ms apart | Once |
| Card flick and tilt | 1400ms a photo | On hover or tap only |
| Benefit fills navy | 700ms | On hover |
| Steps light up | Tied to scroll | Once per frame |
| Parallax and turning ring | Tied to scroll | Once per frame, on screen only |
| FAQ glides | 320ms | Works without script |
| Film | 10s loop | Pause button, on screen only |
| Reduced motion | Final state | No film, nothing moves |

- Transform, opacity, clip-path and stroke only. Nothing delays the form.

## 10. Checks every round

- `python3 tools/check.py`, `python3 tools/build.py && python3 tools/links.py`
- `node tools/smoke.js --widths 390,768,1024,1440,2560`
- `python3 tools/lighthouse.py`: performance 80+ on phones and 95+ on desktop, accessibility 95+, best practices 95+
- Largest Contentful Paint under 2.5 seconds on a phone (brief rule)
- Form tested end to end: both steps, errors, hidden fields, redirect

## 11. Build and tracking (from the brief)

- Landing page `noindex, follow`; thank-you page `noindex, nofollow`.
- Hidden fields: gclid, UTMs, landing page URL, referrer. On Wix these need Velo code or an App Market tool.
- Enhanced conversions: email and phone to the dataLayer on submit, before the redirect.
- Conversion fires on the thank-you page load only. Phone clicks are a separate conversion.
- Consent Mode v2 through one consent tool. The guide PDF is linked only from the thank-you page and the auto reply.
