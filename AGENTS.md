# Repository Guidelines

## Project Structure & Module Organization

This repository is EventPhoto, a static event photo-upload web app with a
Cloudflare Worker backend (static assets + same-origin `/api/*` router).

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
  - `hero3d.js` the landing hero's three.js scroll scene — the one ES module on
    the site, injected by `landing.js` when WebGL is available, the device has
    more than 1GB of memory and reduced motion is off; otherwise the static hero
    stays. It runs on mobile too: the scene reads `camera.aspect` and switches to
    a narrow-viewport composition (single text column, lower card band, centred
    focus card)
  - `vendor/three.module.min.js` + `vendor/three.core.min.js` vendored three.js
- `worker.js` is the Worker entry point: routes `/api/*` to the handlers below and
  serves everything else via the static-assets binding (`env.ASSETS`).
- `functions/api/` holds the backend handlers (Pages-Functions signature
  `onRequestGet/onRequestPost({ request, env })`, called by `worker.js`):
  - `ping.js`, `upload.js`, `list.js`, `note.js`, `oauth/start.js`, `oauth/callback.js`
  - `_lib/google.js` (OAuth code flow + Drive helpers, `drive.file` scope only),
    `_lib/util.js` (image signature, filename/description, ids), `_lib/notes.js`
- `wrangler.jsonc` configures the Worker (`main`, `assets`, `EVENTS` KV binding);
  `.assetsignore` keeps backend source out of the served assets; `.dev.vars.example`
  documents the required secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BASE_URL`).
- `docs/openapi.yaml` and `docs/swagger.html` document the `/api` contract.

## Build, Test, and Development Commands

No npm build step. Serve the static site for frontend work:

```bash
python3 -m http.server 8000
```

Run the backend (Cloudflare runtime) locally with real Functions + KV:

```bash
cp .dev.vars.example .dev.vars       # fill GOOGLE_CLIENT_ID/SECRET, BASE_URL=http://localhost:8788
npx wrangler dev --port 8788         # http://localhost:8788 (KV + assets from wrangler.jsonc)
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
The sole exception is `js/hero3d.js`, an ES module loaded behind a capability
check — keep the modern syntax there, and keep `landing.js` free of `import()`
so old engines can still parse it.
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

### Mandatory security gate

Security behavior is a hard project invariant. Do not merge or deploy a change
unless `node tests/security-smoke.test.js` passes. Any exception requires an
explicit security review and an accompanying test update.

- Drive files must remain private. Never reintroduce `anyone` permissions;
  gallery/slideshow images must be served through the authenticated `/api/photo`
  proxy, which verifies both the admin key and the event folder parent.
- Admin keys must be expiring and rotatable. New endpoints must use the shared
  admin-key validator; never add a permanent bearer token or bypass rotation.
- Values originating in URL parameters, request bodies, Drive metadata, notes,
  or guest input must not be inserted into `innerHTML` without explicit HTML
  escaping. Prefer `textContent` and DOM APIs.
- Preserve `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`
  on Worker responses.

Do not commit secrets. `GOOGLE_CLIENT_SECRET` and the KV namespace id are set in
Cloudflare (Pages env + KV binding), never in the repo; local values live in the
gitignored `.dev.vars`. Host refresh tokens are stored in KV — treat the project
credentials accordingly. Only the non-sensitive `drive.file` scope is used. If
changing Drive sharing behavior, document the privacy impact in `README.md`.
