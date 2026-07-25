/* GET /api/oauth/callback — Google'dan dönüş.
   code→token değişir, Drive klasörü oluşturur, event kaydını KV'ye yazar,
   setup.html'e ?e=<eventId>&k=<adminKey> ile geri döner. */
import { exchangeCode, driveCreateFolder, emailFromIdToken } from '../_lib/google.js';
import { randomId, DEFAULT_FOLDER_NAME } from '../_lib/util.js';

function back(env, params) {
  const base = String(env.BASE_URL || '').replace(/\/+$/, '');
  const url = new URL(base + '/setup.html');
  Object.keys(params).forEach((k) => { if (params[k]) url.searchParams.set(k, params[k]); });
  return Response.redirect(url.toString(), 302);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');

  if (oauthErr) return back(env, { err: oauthErr });
  if (!code || !state) return back(env, { err: 'missing_code' });

  const pendingRaw = await env.EVENTS.get('pending:' + state);
  if (!pendingRaw) return back(env, { err: 'bad_state' });
  await env.EVENTS.delete('pending:' + state);

  let ctx = {};
  try { ctx = JSON.parse(pendingRaw); } catch (e) {}

  try {
    const tokens = await exchangeCode(env, code);
    if (!tokens.refresh_token) throw new Error('no_refresh_token');
    const accessToken = tokens.access_token;

    const folderName = ctx.title ? (DEFAULT_FOLDER_NAME + ' — ' + ctx.title) : DEFAULT_FOLDER_NAME;
    const folder = await driveCreateFolder(accessToken, folderName);

    const eventId = randomId();
    const adminKey = randomId();
    const record = {
      refreshToken: tokens.refresh_token,
      folderId: folder.id,
      folderUrl: folder.webViewLink || ('https://drive.google.com/drive/folders/' + folder.id),
      title: ctx.title || '',
      event: ctx.event || '',
      adminKey: adminKey,
      ownerEmail: emailFromIdToken(tokens.id_token),
      createdAt: Date.now()
    };
    await env.EVENTS.put('event:' + eventId, JSON.stringify(record));

    // Taze access token'ı önbelleğe koy: ilk yükleme/list yeniden refresh etmesin.
    const now = Math.floor(Date.now() / 1000);
    const ttl = tokens.expires_in || 3600;
    await env.EVENTS.put('token:' + eventId,
      JSON.stringify({ accessToken, exp: now + ttl }),
      { expirationTtl: Math.max(60, ttl - 60) });

    return back(env, { e: eventId, k: adminKey, title: ctx.title, event: ctx.event });
  } catch (err) {
    return back(env, { err: (err && err.message) || 'oauth_failed' });
  }
}
