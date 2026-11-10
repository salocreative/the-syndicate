# Concept review: setup

The Concept review tab puts the website concept (the homepage, or every page of the prototype) on the client's guidelines site, behind a light password screen. Reviewers switch accents, flip between desktop and mobile, pin comments on the design, try their own copy and photos in Edit content (with an AI tone check on headings and body copy), tick the sections they're happy with and sign off. Everything they do goes to one Google Sheet in the Olas Shared Drive, and every photo they upload goes to a folder next to it.

The password only stops people who land on the guidelines from seeing the concept by accident. It isn't encryption, so nothing confidential goes in the concept.

## Once for Salo (about 10 minutes)

1. In the Olas Shared Drive, open `SAL-OS/toolbox/concept-review/` and create a Google Sheet called **Salo concept reviews**.
2. In the sheet: **Extensions**, then **Apps Script**. Delete what's there, paste in `apps-script/Code.gs`, and save.
3. Choose the `setup` function and **Run**. Allow the permissions it asks for (the sheet, Google Drive for the uploaded photos, sending email, and a timed trigger). It adds the **Items** and **Projects** tabs, the **Concept review uploads** folder next to the sheet and the 15-minute update emails. Then run `testEmail` once to check mail reaches review@salo.uk.
4. **Deploy**, then **New deployment**, type **Web app**. Execute as **Me**. Who has access: **Anyone**. Deploy and copy the web app URL.
5. Paste the URL into `SAL-OS/toolbox/concept-review/README` so every project uses the same one.

If **Anyone** isn't offered, the Google Workspace admin needs to allow web apps to be shared outside the organisation.

### AI tone check (once)

6. Create an Anthropic API key for Salo's concept reviews in the Claude Console, with a monthly spend limit.
7. In Apps Script: **Project Settings**, **Script Properties**, add `ANTHROPIC_API_KEY` with the key. Anyone who can edit the sheet's script can see it, so keep editing to Salo and use this key for nothing else.
8. The model is `claude-haiku-5-5`, the fastest. To change it, add a `TONE_MODEL` script property.
9. Run `testTone` once. It checks a test heading for the first open project and logs the score, suggestion and time.

Without the key, or without a voice pack for the project, editing still works and the box under the text says the tone check isn't set up.

When you change `Code.gs` later: paste in the new version, save, run `setup` again (it updates the column headings and asks for any new permissions), then **Deploy**, **Manage deployments**, edit the existing one and pick **New version**. The URL stays the same.

## Where the data lives

Everything reviewers do is saved in the **Salo concept reviews** sheet: one row per comment, reply, section approval, resolve, content edit, photo, put-back and sign-off, with the project, round, name, section, accent and time. Nothing is kept only in the browser once the endpoint is set. Anything that can't reach the sheet waits in the reviewer's browser (through a reload, except photos), sends as soon as the connection is back, and the page warns before they leave with something unsent. A resend of the same item is refused, so nothing is doubled.

- **Pages**: on a multi-page concept, `section` and `target` start with the page (`contact:enquiry`, `contact:enquiry/t3`) and `label` names it ("Contact · Enquiry · Heading"). The header and footer are shared across pages and have no page prefix.
- **Content edits**: the `target` column says which box was changed, `label` names it (for example "Hero · Heading"), `text` holds the new words and `before` the words it replaced. Both are clean text: the review strips the word and letter spans that motion scripts add, keeping inline highlights. Anything over 4,000 characters is stopped with a message, never cut. A `revert` row means someone put the original back. Nothing is overwritten, so the sheet is the full history.
- **Photos**: each replaced photo is saved twice in `Concept review uploads/<project>/` next to the sheet: the cropped version shown on the design (`file` column) and the photo exactly as uploaded (`original` column). File names carry the project, round, box, person and time.
- **Tone checks**: for a heading or body copy edit, `typed` holds what the reviewer typed, `suggestion` the AI suggestion, `score` the tone score out of 100 and `choice` what they did: `accepted` (used the suggestion), `dismissed` (kept their own words) or `none` (the check wasn't available). `text` is always what went on the design. Buttons, links and figures save without a check.
- The review page shows the latest edit for each box to everyone. "Show the original content" in the panel switches back to the concept as designed. Claude reads the sheet through the Google Drive connector, so you can ask, for example, "summarise the open concept comments for <brand>".

## Sign-off

- Only the people in the project's `signers` column can sign off. They pick their name, tick every section, type their name to sign, then press **Email me a sign-off code**. The sheet emails a 6-digit code to their address on file (it lasts 15 minutes; 5 codes an hour and 5 tries per code at most). The sign-off goes through only with the right code, and the `verified` column records the address it went to.
- The moment it's signed, the review closes itself (status closed, read only) and review@salo.uk gets the sign-off email.
- About a minute later, review@salo.uk gets **ready to build**, with a link to the build pack in `Concept review handover/<project>/<date> signed off by <name>/`: `approved-concept.zip` (the approved pages, stylesheet, scripts, fonts and a copy of each photo, from the live site), `CHANGES.md` (every content edit and photo to apply, page by page, and every comment with its status), `review-rows.csv` (every row, including what reviewers typed and the AI suggestions), `client-photos/` and `sign-off.txt`. CHANGES.md and sign-off.txt are attached too. If the pack email doesn't come, the 15-minute update run builds it.
- Then, in the website repo, `python3 tools/review-pull.py --pack` makes `review/build-pack.zip` (the repo's source plus the review). Save it into the same handover folder with the copy doc exported from Claude Docs. That folder is everything the build needs.
- A project with no signers still accepts a sign-off, but the emails say it's not verified. Don't build from one without checking with the client.

## Emails

- Every sign-off emails **review@salo.uk** straight away: who signed, whether it was verified by code, their role, the round, the accent chosen, the sections approved, the open comments and links to the review and the sheet. The build pack email follows (see Sign-off).
- Content edits in the summary show the tone score and whether the reviewer used the AI suggestion or kept their own words, with the other version alongside.
- Every sign-off email also lists the content edits on the design at the time, so you know whether it was approved with the client's own copy or photos.
- New comments, replies, section approvals, resolves, content edits and replaced photos (with Drive links) go to review@salo.uk in one summary every 15 minutes, only when something has happened.
- The `notify` column adds more addresses for a project. Emails send from the Google account that deployed the script.
- review@salo.uk has to exist first (a Google group or shared inbox). To change the address, edit `REVIEW_EMAIL` at the top of `Code.gs` and deploy a new version.

## For each client review

1. Add a row to the **Projects** tab: `project` (the brand's slug), `key` (any long random words), `status` open, `notify` (extra people to email, if any; review@salo.uk always gets everything), `brand` (the client's name), `signers` (who can sign off, as `Name <email>`, comma separated). Claude finds the signers from the project's emails and plan (who the client named as approving the work) and the designer confirms them before they go in. Only these people can sign off.
2. Write the voice pack: in a Cowork session for the brand, ask Claude to fill `concept-review/voice-pack.md` from the brand brain and the guidelines' Voice section, then save it as `Concept review voice/<project>.md` in `SAL-OS/toolbox/concept-review/`. The tone check reads it (changes reach the check within 10 minutes).
3. Turn the tab on:
   `python3 tools/concept-review.py on <folder> --password "two or three words" --endpoint <web app URL> --key <key> --reply-by 2026-11-06 --signers "Name One, Name Two"`
   The page holds the signers' names only. Their email addresses stay in the sheet.
4. Put the approved prototype in `site/concept/`. From the website repo (website starter kit): `python3 tools/concept.py <site>/concept` writes every page (the homepage as `home.html`), their assets and photos, `manifest.js` (the page list the review reads) and the review hooks: page-prefixed sections, a shared header and footer, the gate script and `review.js`, which it never overwrites. Set its labels for the project first. For a homepage only, `site/concept/home.html` by hand is enough: keep `data-section` and `data-label` on every section, the accent block, `../assets/` paths, the gate script at the end of `<head>` and `<script src="review.js" defer></script>` at the end of `<body>`. Either way, add `data-edit="short-name"` to the main headings, buttons and photos if the layout may change between rounds (edits follow that name; without it they follow position), and mark the spans any motion script adds to split text with `data-split`.
5. Run `tools/check.py` and `tools/test.js`, then release the guidelines with one zip and one Claude Code prompt.
6. **Live data test** before the client sees it, as "Salo test", with "Please ignore" in every comment: a comment on a page section, on the shared header and on a second page; a reply and a resolve; two section ticks and an untick; a content edit on a heading with a word or letter animation (check the sheet's `text` is clean words, not spans), with the tone check answering; a photo (cropped and original both in the uploads folder); a comment sent with the connection off, through a page reload, that sends when it's back. Read the rows back from the sheet. Don't sign off live, so the client never sees a test approval, but check the code email: add a Salo name to the signers (sheet and `--signers`), ask for a code on the live page, check it arrives, then take the name out. Then delete every "Salo test" row, and any resolve or put-back rows that point at them.
7. Email the reviewers the guidelines link and the password, with the reply-by date. Send the password separately.

## How the tone check works

- A reviewer edits a heading or body copy and presses **Save** in the box under their text (Enter adds a new line, Esc cancels, clicking elsewhere doesn't save).
- The page asks the script, the script sends their text, the box name and the voice pack to Claude, and the box shows a score out of 100 and a suggested version in the brand's voice. It keeps their meaning, facts, sentence structure and roughly their length, and never adds claims.
- They choose **Use suggestion** or **Dismiss and save mine**, or **Keep editing**. Hovering Use suggestion shows it on the design first.
- The check starts in the background when they pause typing, so the result is usually ready when they press Save. The same text in the same box is checked once and remembered for 6 hours.
- Limits: 800 characters per check and 300 checks an hour per project.

## Each round

- Pull the round into the website repo: `python3 tools/review-pull.py --skip-name "Salo test"` writes `review/items.json` (every row), `review/photos/` and `review/CHANGES.md`, the checklist to apply: the final content of every changed box per page (put-backs removed) with the file it lives in, every comment with its replies and status, approvals and sign-offs. Work through it line by line. Comments are design notes: agree each with the designer before changing anything. A box marked NOT FOUND is found by hand from its label.
- Rebuild the concept with `tools/concept.py` (or copy the updated homepage into `site/concept/home.html`), then:
  `python3 tools/concept-review.py round <folder> --round 2 --reply-by 2026-11-13 --change "Shorter headline" --change "New project photos"`
- Resolve the comments you've dealt with, and reply where you haven't.
- Copy or photos the client wants to keep go into the copy doc and the build. Their edits stay on the design until someone puts the original back, so check the Edit content list still lines up after a layout change.
- Release the guidelines again.

## After sign-off

- Pull the final state with `tools/review-pull.py` and apply every line of `CHANGES.md` to the build before WordPress starts. The sign-off email lists every section approved and the content edits on the design.
- The sheet closes the project itself when it's signed. Run `tools/concept-review.py close <folder>` too and release, so the page itself is read only. The tab stays up as the record while the WordPress build starts.

## At launch

- `python3 tools/concept-review.py off <folder>` removes the tab, the concept files and the links.
- The release prompt must also delete `concept-review.html` and `concept/` from the repo, because releases copy without deleting.
- Set the project's `status` to **archived**. The comments and sign-offs stay in the sheet as the record.
