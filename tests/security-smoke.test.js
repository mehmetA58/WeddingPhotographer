/* Güvenlik dumanı testi — depo kökünden çalıştırın: node tests/security-smoke.test.js
   Cloudflare Pages Functions mimarisinin güvenlik değişmezlerini doğrular. */
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

const read = (p) => fs.readFileSync(p, 'utf8');

const upBackend = read('functions/api/upload.js');
const listBackend = read('functions/api/list.js');
const photoBackend = read('functions/api/photo.js');
const rotateBackend = read('functions/api/admin/rotate.js');
const util = read('functions/api/_lib/util.js');
const callback = read('functions/api/oauth/callback.js');
const google = read('functions/api/_lib/google.js');
const worker = read('worker.js');
const setup = read('js/setup.js');
const upload = read('js/upload.js');
const api = read('js/api.js');
const swagger = read('docs/swagger.html');
const openapi = read('docs/openapi.yaml');
const gitignore = read('.gitignore');

/* --- Backend: giriş doğrulama --- */
assert(upBackend.includes('looksLikeImage'), 'backend must verify image signatures');
assert(upBackend.includes("code: 'missing_guest'"), 'backend must reject missing guestName');

/* --- Backend: galeri gizliliği ayrı ev-sahibi anahtarıyla korunur --- */
assert(listBackend.includes('rec.adminKey'), 'list must validate the host admin key');
assert(listBackend.includes("code: 'invalid_token'"), 'list must reject a wrong admin key');
assert(photoBackend.includes('isValidAdminKey'), 'photo proxy must validate the admin key');
assert(photoBackend.includes('driveDownloadImage'), 'photos must be served through the private proxy');
assert(photoBackend.includes('folderId'), 'photo proxy must verify the event folder');
assert(rotateBackend.includes('ADMIN_KEY_TTL_MS'), 'admin key rotation must preserve expiry');
assert(util.includes('ADMIN_KEY_TTL_MS'), 'admin key expiry must be defined centrally');
assert(callback.includes('adminKeyExpiresAt'), 'new events must receive an expiring admin key');
assert(!google.includes('driveSetAnyoneReader'), 'Drive files must never be made public');
assert(!upBackend.includes('driveSetAnyoneReader'), 'uploads must not grant public Drive access');
assert(api.includes('/api/photo'), 'frontend thumbnails must use the private photo proxy');
assert(setup.includes('escapeHtml(oauthErr)'), 'OAuth error query values must be HTML-escaped');
assert(worker.includes("Referrer-Policy', 'no-referrer"), 'Worker must prevent referrer leakage');
assert(worker.includes("X-Content-Type-Options', 'nosniff"), 'Worker must set nosniff');

/* --- OAuth kapsamı yalnızca drive.file (non-sensitive) — göç garantisi --- */
assert(google.includes('drive.file'), 'OAuth must use the drive.file scope');
assert(!google.includes('script.projects'), 'OAuth must NOT request the script.projects scope');
assert(!google.includes('script.deployments'), 'OAuth must NOT request Apps Script deployment scopes');

/* --- Frontend: Apps Script kalıntısı yok --- */
assert(!setup.includes('script.projects'), 'setup must not reference Apps Script scopes');
assert(!setup.includes('accounts.google.com/gsi'), 'setup must not load the GIS client');

/* --- Frontend: idempotent yükleme + not kimlikleri --- */
assert(upload.includes("makeClientId('u')"), 'frontend uploads must include an uploadId');
assert(upload.includes("makeClientId('n')"), 'frontend notes must include a noteId');

/* --- Frontend: ikili yükleme, gerçek yanıt (no-cors/base64 kaldırıldı) --- */
assert(upload.includes('body: prepared.blob'), 'frontend must send the raw image blob');
assert(!upload.includes("mode: 'no-cors'"), 'frontend must not use no-cors mode');
assert(!upload.includes('prepared.base64'), 'frontend must not base64-encode uploads');
assert(!upload.includes("searchParams.set('message'"), 'note message must not be sent in a GET URL');
assert(api.includes('/api/list'), 'API helper must call the same-origin /api/list endpoint');

/* --- Secret'lar depoya sızmıyor --- */
assert(gitignore.includes('.dev.vars'), '.dev.vars must be gitignored');
assert(execSync('git ls-files .dev.vars').toString().trim() === '', '.dev.vars must not be tracked by git (only .dev.vars.example)');

/* --- API dokümanı güncel --- */
assert(!swagger.includes('unpkg.com'), 'Swagger/docs page must not load unpinned CDN scripts');
assert(openapi.includes('uploadId'), 'OpenAPI must document uploadId');
assert(openapi.includes('noteId'), 'OpenAPI must document noteId');
assert(!openapi.includes('setupKey'), 'OpenAPI must not reference the removed setupKey');

console.log('security smoke ok');
