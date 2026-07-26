import { idClean, isValidAdminKey } from './_lib/util.js';
import { getAccessToken, driveDownloadImage } from './_lib/google.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const eventId = (url.searchParams.get('e') || '').trim();
  const adminKey = (url.searchParams.get('k') || '').trim();
  const fileId = idClean(url.searchParams.get('id'), 200);
  const recRaw = eventId ? await env.EVENTS.get('event:' + eventId) : null;
  if (!recRaw) return new Response('Not found', { status: 404 });

  let rec;
  try { rec = JSON.parse(recRaw); } catch (e) { rec = null; }
  if (!isValidAdminKey(rec, adminKey) || !fileId) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const accessToken = await getAccessToken(env, eventId, rec.refreshToken);
    const image = await driveDownloadImage(accessToken, rec.folderId, fileId);
    return new Response(image.body, {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    return new Response(err && err.status === 404 ? 'Not found' : 'Photo unavailable', {
      status: err && err.status === 404 ? 404 : 502
    });
  }
}
