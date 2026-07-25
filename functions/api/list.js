/* GET /api/list?e=<eventId>&k=<adminKey>&notes=1 — ev sahibi galeri/sunum listesi.
   Yanıt şekli js/api.js'in beklediğiyle birebir (files[].d = "EventPhoto · Katılımcı: …"). */
import { json, buildDescription } from './_lib/util.js';
import { getAccessToken, driveListImages } from './_lib/google.js';
import { loadNotes } from './_lib/notes.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const eventId = (url.searchParams.get('e') || '').trim();
  const adminKey = (url.searchParams.get('k') || '').trim();

  const recRaw = eventId ? await env.EVENTS.get('event:' + eventId) : null;
  if (!recRaw) return json({ status: 'error', code: 'invalid_event', message: 'Etkinlik bulunamadı' }, 404);
  const rec = JSON.parse(recRaw);

  // Galeri/sunum yalnızca ev sahibinin anahtarıyla açılır (misafir QR'ı listeleyemez).
  if (!adminKey || adminKey !== rec.adminKey) {
    return json({ status: 'error', code: 'invalid_token', message: 'Geçersiz güvenlik anahtarı' }, 403);
  }

  const max = Math.max(1, Math.min(parseInt(url.searchParams.get('max'), 10) || 500, 1000));
  const wantNotes = url.searchParams.get('notes') === '1';

  try {
    const accessToken = await getAccessToken(env, eventId, rec.refreshToken);
    const driveFiles = await driveListImages(accessToken, rec.folderId, max);

    const files = driveFiles.map((f) => {
      const ap = f.appProperties || {};
      return {
        id: f.id,
        name: f.name,
        t: Date.parse(f.createdTime) || 0,
        createdAt: f.createdTime,
        size: Number(f.size) || 0,
        d: f.description || buildDescription(ap.guest, ap.task, ap.uploadId)
      };
    });

    const out = {
      status: 'ok',
      count: files.length,
      folderId: rec.folderId,
      folderUrl: rec.folderUrl || '',
      files: files
    };
    if (wantNotes) out.notes = await loadNotes(env, eventId);
    return json(out);
  } catch (err) {
    return json({ status: 'error', code: 'server_error', message: 'Liste alınamadı' }, 502);
  }
}
