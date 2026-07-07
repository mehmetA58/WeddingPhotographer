# Repository Guidelines

## Project Structure & Module Organization

This repository is a static event photo-upload web app with a Google Apps Script backend.

- `index.html` is the setup page for event hosts.
- `upload.html` is the participant-facing upload page.
- `gallery.html` is the private gallery page.
- `card.html` renders printable QR table cards.
- `css/style.css` contains the shared responsive theme and event accent colors.
- `js/` contains browser logic:
  - `setup.js`, `upload.js`, `gallery.js`, `card.js`
  - `i18n.js` for Turkish/English copy
  - `events.js` for supported event types
  - `qrcode.min.js` vendored QR library
- `apps-script/Code.gs` is copied into Google Apps Script for Drive storage.
- `.github/workflows/deploy.yml` publishes the static site with GitHub Pages.

## Build, Test, and Development Commands

There is no npm build step. Open `index.html` directly or serve the folder locally:

```bash
python3 -m http.server 8080
```

Validate JavaScript syntax before committing:

```bash
node --check js/setup.js
node --check js/upload.js
node --check js/gallery.js
node --check js/card.js
node --check js/i18n.js
node --check js/events.js
cp apps-script/Code.gs /tmp/code-check.js && node --check /tmp/code-check.js
```

## Coding Style & Naming Conventions

Use plain HTML, CSS, and vanilla JavaScript. Keep code ES5-compatible where practical because the app runs in mobile browsers and Apps Script. Use two-space indentation in HTML/CSS/JS. Prefer clear IDs and camelCase variables, e.g. `eventTitleEl`, `currentGallery`. Keep user-facing text in `js/i18n.js`; do not hardcode new labels in page scripts.

## Testing Guidelines

No automated test framework is configured. For changes, run the syntax checks above and manually verify:

- setup page creates upload, gallery, and card links
- event type and language are preserved in generated URLs
- upload page accepts multiple images and shows progress
- gallery loads through Apps Script JSONP
- printable QR cards render correctly

## Commit & Pull Request Guidelines

Current history uses short imperative commit messages, for example:

```text
Add event-based photo sharing concepts
Add GitHub Pages static marker
```

Use focused commits and describe user-visible behavior. Pull requests should include a short summary, testing notes, screenshots for UI changes, and any Apps Script deployment steps required.

## Security & Configuration Tips

Do not commit secrets, OAuth tokens, or private Apps Script URLs. The optional token is configured by the event host and should only be shared through generated QR/gallery links. If changing Drive sharing behavior, document the privacy impact in `README.md`.
