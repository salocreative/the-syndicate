# The Syndicate Club: Google Ads landing page

In their brand as it is on thesyndicateclub.co.uk: their navy, cream and black, Jost headings in capitals, square buttons, their ring mark, photos and film.

Built from the Corn Cobs "Google Ads Landing Page Brief v1". Concept, round 1, November 2026.

## What's in the package

- `index.html`: the landing page
- `thank-you.html`: the page the form redirects to
- `assets/site.css`, `assets/site.js`: one shared stylesheet and one deferred script
- `assets/fonts/jost-latin.woff2`: Jost, SIL Open Font License, self-hosted
- `assets/logo/`: The Syndicate's own logo files (white PNG and WebP), favicon
- `site-images/`: their course photos as WebP, with responsive copies and phone crops
- `site-video/`: their homepage aerial film, cut to a 10-second loop (685KB desktop, 210KB phones), and its poster

Open `index.html` from a web server (for example `python3 -m http.server`). It also opens from a folder, without font preloading.

## Measured on this build

- Lighthouse on a phone: performance 99, accessibility 100, best practices 100. Largest Contentful Paint 2.0s (brief: under 2.5s). Desktop performance 100.
- Hero image: 155KB WebP at 2400px (brief: under 200KB).
- Smoke test at 390, 768, 1024, 1440 and 2560px: no errors, no overflow, no layout shift.
- SEO scores low on purpose: the page is `noindex, follow` as the brief asks.

## Brief rules, and where they're met

| Rule | Done |
| --- | --- |
| No navigation; logo left, phone right | Header has the logo and a click-to-call number only |
| No links off the page except privacy and phone | Only the privacy policy and phone link out; every other link goes to `#enquire` |
| Form visible in the hero at 1440 by 900 | Yes, both steps |
| Mobile: form directly under headline and subhead | Yes (see the brief note below) |
| "multi-course golf membership" in the first screen | Eyebrow above the headline |
| No pop-ups, carousels or stock photos | None |
| Two-step form, inline errors, never block | Yes; redirects to `thank-you.html` |
| Hidden fields: gclid, UTMs, landing page, referrer | Filled from the URL by `site.js` |
| Enhanced conversions | Email and phone pushed to `dataLayer` on submit, before the redirect, never in the URL |
| Sticky bar after the hero, hidden at the final form | Desktop top bar, phone bottom bar (Call and Enquire) |
| Landing `noindex, follow`, thank-you `noindex, nofollow` | Yes |

## Not in this package (the developer or Corn Cobs)

- **Sending the form.** In this concept the form validates and redirects; it doesn't send anywhere. Wire it to Wix Forms (or WordPress) and keep the field names.
- **Wix:** hidden fields onto the contact record need Velo code or a Wix App Market tool, as the brief says. The dataLayer push also needs Velo. Confirm the route before build.
- **GTM, Google Ads conversion "Syndicate LP Enquiry", GA4 `generate_lead`, Consent Mode v2.** Add the container to both pages. Conversion fires on the thank-you page load only.
- **Automatic reply** with the guide link, and the notification email with handicap, rounds and budget at the top.
- **The guide PDF.** The thank-you page has a placeholder button. Link it only from there and the auto reply.

## Content to confirm before launch

- **Google review (section 2):** Kahwing's review, word for word from The Syndicate Club's Google Business profile (read 9 November 2026). Client to confirm they're happy to use it.
- **Royal Cinque Ports (card 6):** their site has no photo of it, so the card uses three of their other links photographs as stand-ins. Replace with the real course, or swap the card for one of the brief's alternatives.
- **Course details:** location, type, par and length on each card are public figures from scorecard sites, not client-verified. Sources: execgolf-leisure.com (Cabot Highlands), 1golf.eu (The Addington, Liphook), golfpass.com (West Hill), golfshake.com (Stoke Park, Colt/Alison blue tees), Wikipedia scorecard (Royal Cinque Ports, black tees).
- **Guide PDF link** (thank-you page).

## Brief points to confirm with Corn Cobs

1. Section 1 says the phone form goes "below the tick points"; the build rules say "directly under the headline and subhead". We followed the build rule.
2. Ticks are navy and white, not green. Green isn't in their brand.
3. Benefit block 2 is three sentences where the layout asks for one line. Kept as written.
4. "Frequently Asked Questions" is in title case; everything else is sentence case. Kept as written.
5. Times are written "9 am to 5 pm" in block 2 and "9am to 5pm" in FAQ 6. Kept as written.
6. Card 1 says "world Top 100" and card 6 "World Top 100". Kept as written.
7. The brief's open claims still stand: the Top 100 source, Cabot Highlands or Castle Stuart, and the Liphook and West Hill ranking lines.
8. The hero photo is from their homepage; the course isn't named.
9. Hero headline copy is unchanged; "on one membership" is set as the emphasis.
10. Section 5 has a sideways-scrolling gallery of their photos and film between the intro and the six cards (an addition). The cards carry location, type, par and length from public scorecard sites (longest men's tees, read 9 November 2026); the brief asks for client-verified county and yardage, so these need checking.
11. The enquiry form is a frosted glass panel with white type, not the brief's white card. Agree with Corn Cobs.
12. Sticky bar on phones: Call rings the number (click-to-call); Enquire goes to #enquire. The brief says both buttons go to #enquire; we read that as the two enquiry buttons.
