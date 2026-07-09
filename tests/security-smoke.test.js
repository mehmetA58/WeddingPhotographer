const assert = require('assert');
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const code = read('apps-script/Code.gs');
const setup = read('js/setup.js');
const upload = read('js/upload.js');
const api = read('js/api.js');
const swagger = read('docs/swagger.html');
const openapi = read('docs/openapi.yaml');

assert(code.includes('setupAuthError_'), 'Apps Script setup must require setup authorization');
assert(code.includes("key !== 'EVENTPHOTO_SETUP_KEY_PLACEHOLDER'"), 'default setup placeholder must be rejected');
assert(setup.includes('setupKey='), 'automatic setup URL must include setupKey');
assert(setup.includes('injectSetupKey'), 'automatic deploy must inject a setup key into Code.gs');

assert(code.includes('looksLikeImage_'), 'backend must verify image signatures');
assert(code.includes("code: 'missing_guest'"), 'backend must reject missing guestName');

assert(upload.includes('uploadId: makeClientId'), 'frontend uploads must include uploadId');
assert(upload.includes('verifyUploadedItems'), 'frontend must verify opaque uploads');
assert(upload.includes('checkUploadList(queue, true)'), 'frontend verification must retry with a refreshed list');
assert(api.includes('uploadId'), 'API metadata parser must expose uploadId');
assert(api.includes('refresh=1'), 'API list helper must support refresh=1');

assert(upload.includes('noteId: makeClientId'), 'frontend notes must include noteId');
assert(!upload.includes("searchParams.set('message'"), 'note message must not be sent in a GET URL');
assert(code.includes("code: 'method_not_allowed'"), 'GET action=note must not create state');
assert(!code.includes('return reply_(saveNoteData_(p)'), 'GET action=note must not save notes');

assert(!swagger.includes('unpkg.com'), 'Swagger/docs page must not load unpinned CDN scripts');
assert(openapi.includes('setupKey'), 'OpenAPI must document setupKey');
assert(openapi.includes('uploadId'), 'OpenAPI must document uploadId');
assert(openapi.includes('noteId'), 'OpenAPI must document noteId');

console.log('security smoke ok');
