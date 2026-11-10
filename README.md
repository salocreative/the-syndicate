# The Syndicate: landing page concept

Salo Creative's example landing page for Corn Cobs, built from Jeremy Jacobs's Google Ads brief for The Syndicate Club. Concept, round 8, 10 November 2026.

Jeremy has agreed to this repository being public.

## What's here

| Folder | What it is |
| --- | --- |
| `lp/` | The landing page source (blocks, tokens, tools) and `lp/dist/`, the built page ready to hand over. `lp/README.md` is the developer handover. |
| `kit/site/` | The concept review (`concept-review.html` plus `concept/`), the internal reference kit and rules. |
| `kit/`, `kit-src/` | Reference kit sources and the review's design notes ("Show our thinking"). |
| `preview/` | One-file preview of the concept review. Opens anywhere by double-clicking. |

## Run it

- Built page: `cd lp/dist && python3 -m http.server 8765`, then open http://localhost:8765
- Rebuild after changes: `cd lp && python3 tools/build.py`
- Checks: `python3 tools/check.py`, `python3 tools/links.py`, `node tools/smoke.js --widths 375,390,768,1024,1440,2560`, `python3 tools/lighthouse.py`
- Concept review: `cd kit/site && python3 -m http.server 8766`, then open http://localhost:8766/concept-review.html

## Before it goes anywhere public

- The concept review has a password screen, not encryption. GitHub Pages publishes publicly even from a private repo on most plans. Decide hosting with Sarah first.
- Course par and length figures are public scorecard numbers, not client-verified. See `lp/README.md`.
