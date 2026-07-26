/* =========================================================================
   google.js — Google OAuth + Drive yardımcıları (Cloudflare Pages Functions)
   - Authorization code akışı (sunucu tarafı; client secret ile)
   - Access token'ı KV'de ~55 dk önbellekler, süresi dolunca refresh eder
   - Yalnızca `drive.file` kapsamı: uygulama SADECE kendi oluşturduğu
     dosya/klasörleri görür ve yönetir (non-sensitive; Google doğrulaması yok)
   ========================================================================= */

const OAUTH_SCOPE = 'openid email https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export function redirectUri(env) {
  return String(env.BASE_URL || '').replace(/\/+$/, '') + '/api/oauth/callback';
}

/** Google onay ekranına yönlendirme URL'i. */
export function buildConsentUrl(env, state) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(env),
    response_type: 'code',
    scope: OAUTH_SCOPE,
    access_type: 'offline',      // refresh_token almak için
    prompt: 'consent',           // her seferinde refresh_token garanti
    include_granted_scopes: 'true',
    state: state
  });
  return AUTH_URL + '?' + params.toString();
}

/** authorization code → { access_token, refresh_token, expires_in, id_token } */
export async function exchangeCode(env, code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(env),
      grant_type: 'authorization_code'
    })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'token_exchange_failed');
  }
  return data;
}

/** Etkinliğin refresh token'ıyla geçerli bir access token döndürür (KV önbellekli). */
export async function getAccessToken(env, eventId, refreshToken) {
  const cacheKey = 'token:' + eventId;
  const now = Math.floor(Date.now() / 1000);

  const cachedRaw = await env.EVENTS.get(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached.accessToken && cached.exp > now + 120) return cached.accessToken;
    } catch (e) {}
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'token_refresh_failed');
  }

  const exp = now + (data.expires_in || 3600);
  // KV TTL cache süresine yakın; okuma anında exp ile ayrıca doğrularız.
  await env.EVENTS.put(cacheKey, JSON.stringify({ accessToken: data.access_token, exp }),
    { expirationTtl: Math.max(60, (data.expires_in || 3600) - 60) });
  return data.access_token;
}

/** OpenID id_token'dan e-posta okur (imza doğrulaması yok; yalnız görüntüleme amaçlı). */
export function emailFromIdToken(idToken) {
  try {
    const payload = String(idToken || '').split('.')[1];
    if (!payload) return '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).email || '';
  } catch (e) { return ''; }
}

/* =====================================================================
   Drive işlemleri
   ===================================================================== */

async function driveJson(url, accessToken, init) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: 'Bearer ' + accessToken, ...(init && init.headers) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && (data.error.message || data.error)) || ('HTTP ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function driveCreateFolder(accessToken, name) {
  return driveJson(DRIVE + '/files?fields=id,webViewLink', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder' })
  });
}

/** multipart/related ile ikili (veya metin) dosyayı klasöre yükler. */
export async function driveUploadMedia(accessToken, meta, mediaType, mediaBody) {
  const boundary = '----eventphoto' + Math.random().toString(16).slice(2);
  const pre = `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) + `\r\n--${boundary}\r\n` +
    `Content-Type: ${mediaType}\r\n\r\n`;
  const post = `\r\n--${boundary}--`;
  const body = new Blob([pre, mediaBody, post]);

  return driveJson(
    DRIVE_UPLOAD + '/files?uploadType=multipart&fields=id,name,createdTime,size',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: body
    }
  );
}

/** appProperties.uploadId eşleşen dosyayı bulur (idempotent yükleme). */
export async function driveFindByUploadId(accessToken, folderId, uploadId) {
  const q = `'${folderId}' in parents and trashed=false and ` +
    `appProperties has { key='uploadId' and value='${uploadId.replace(/'/g, '')}' }`;
  const url = DRIVE + '/files?' + new URLSearchParams({
    q: q, fields: 'files(id,name,createdTime,size)', pageSize: '1'
  });
  const data = await driveJson(url, accessToken, { method: 'GET' });
  return (data.files && data.files[0]) || null;
}

/** Klasördeki görselleri yeni→eski döndürür. */
export async function driveListImages(accessToken, folderId, max) {
  const q = `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`;
  const url = DRIVE + '/files?' + new URLSearchParams({
    q: q,
    fields: 'files(id,name,createdTime,size,description,appProperties)',
    orderBy: 'createdTime desc',
    pageSize: String(Math.max(1, Math.min(max || 500, 1000)))
  });
  const data = await driveJson(url, accessToken, { method: 'GET' });
  return data.files || [];
}

export async function driveDownloadImage(accessToken, folderId, fileId) {
  const meta = await driveJson(
    DRIVE + '/files/' + encodeURIComponent(fileId) + '?fields=id,parents,mimeType',
    accessToken,
    { method: 'GET' }
  );
  if (!meta.parents || meta.parents.indexOf(folderId) < 0 ||
      !String(meta.mimeType || '').startsWith('image/')) {
    const err = new Error('photo_not_found');
    err.status = 404;
    throw err;
  }
  const res = await fetch(DRIVE + '/files/' + encodeURIComponent(fileId) + '?alt=media', {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) {
    const err = new Error('photo_download_failed');
    err.status = res.status;
    throw err;
  }
  return { body: res.body, mimeType: meta.mimeType };
}

export async function driveRemoveAnyonePermissions(accessToken, fileId) {
  const data = await driveJson(
    DRIVE + '/files/' + encodeURIComponent(fileId) + '/permissions?fields=permissions(id,type)',
    accessToken,
    { method: 'GET' }
  );
  const publicPermissions = (data.permissions || []).filter((p) => p.type === 'anyone');
  await Promise.all(publicPermissions.map((p) => driveJson(
    DRIVE + '/files/' + encodeURIComponent(fileId) + '/permissions/' + encodeURIComponent(p.id),
    accessToken,
    { method: 'DELETE' }
  )));
}
