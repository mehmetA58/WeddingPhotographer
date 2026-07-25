# Repository Guidelines

## Project Structure & Module Organization

This repository is EventPhoto, a static event photo-upload web app with a
Cloudflare Pages Functions backend (same-origin `/api/*`).

- `index.html` is the marketing landing page; `setup.html` is the setup page for event hosts.
- `upload.html` is the participant-facing upload page.
- `gallery.html` is the private gallery page.
- `slideshow.html` is the live photo wall for venue displays.
- `card.html` renders printable QR table cards.
- `css/style.css` contains the shared responsive theme and event accent colors.
- `js/` contains browser logic:
  - `setup.js`, `upload.js`, `gallery.js`, `slideshow.js`, `card.js`
  - `api.js` for same-origin `/api/list` & `/api/ping` fetch helpers
  - `i18n.js` for Turkish/English copy
  - `events.js` for supported event types
  - `qrcode.min.js` vendored QR library
- `functions/api/` is the Cloudflare Pages Functions backend:
  - `ping.js`, `upload.js`, `list.js`, `note.js`, `oauth/start.js`, `oauth/callback.js`
  - `_lib/google.js` (OAuth code flow + Drive helpers, `drive.file` scope only),
    `_lib/util.js` (image signature, filename/description, ids), `_lib/notes.js`
- `wrangler.toml` configures the Pages project + `EVENTS` KV binding;
  `.dev.vars.example` documents the required secrets (`GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `BASE_URL`).
- `docs/openapi.yaml` and `docs/swagger.html` document the `/api` contract.
- `.github/workflows/deploy.yml` remains for GitHub Pages; the backend requires Cloudflare Pages.

## Build, Test, and Development Commands

No npm build step. Serve the static site for frontend work:

```bash
python3 -m http.server 8000
```

Run the backend (Cloudflare runtime) locally with real Functions + KV:

```bash
cp .dev.vars.example .dev.vars       # fill GOOGLE_CLIENT_ID/SECRET, BASE_URL=http://localhost:8788
npx wrangler pages dev . --kv EVENTS # http://localhost:8788 (--kv needed for local KV)
```

Validate JavaScript syntax before committing:

```bash
for f in js/*.js; do node --check "$f"; done
for f in functions/api/*.js functions/api/**/*.js; do cp "$f" /tmp/c.mjs && node --check /tmp/c.mjs; done
```

Run the test suites (static server on :8000 for the Playwright ones):

```bash
node tests/check.js                 # DOM id + i18n consistency
node tests/security-smoke.test.js   # security invariants (run from repo root)
cd tests && node e2e.js             # + notetest/tasktest/verifytest/slidetest/mobiletest
```

## Coding Style & Naming Conventions

Browser code (`js/`) is ES5-compatible vanilla JS (runs on mobile browsers).
Backend code (`functions/`) is modern ES modules on the Cloudflare Workers
runtime — no Node.js APIs. Two-space indentation in HTML/CSS/JS. Prefer clear
IDs and camelCase variables, e.g. `eventTitleEl`, `currentGallery`. Keep
user-facing text in `js/i18n.js`; do not hardcode new labels in page scripts.

## Testing Guidelines

Playwright tests mock `/api/*` responses via `page.route`, so no real Google or
Cloudflare access is needed. For changes, run the syntax checks and suites above,
and manually verify:

- setup page connects via one-tap OAuth and creates upload/gallery/card links (`?e=`, `?k=`)
- event type and language are preserved in generated URLs
- upload page sends binary photos and reads the real response
- gallery/slideshow list only with the host key `k=`
- live slideshow loads photos/notes and displays the QR prompt

## Commit & Pull Request Guidelines

Use focused commits and describe user-visible behavior. Pull requests should
include a short summary, testing notes, screenshots for UI changes, and any
Cloudflare/Google configuration steps required.

## Security & Configuration Tips

Do not commit secrets. `GOOGLE_CLIENT_SECRET` and the KV namespace id are set in
Cloudflare (Pages env + KV binding), never in the repo; local values live in the
gitignored `.dev.vars`. Host refresh tokens are stored in KV — treat the project
credentials accordingly. Only the non-sensitive `drive.file` scope is used. If
changing Drive sharing behavior, document the privacy impact in `README.md`.
