/* POST /api/upload?e=<eventId> — misafir fotoğraf yükleme.
   Gövde: ham ikili görsel (resize edilmiş blob). Meta query parametrelerinde.
   Yanıt gerçek okunur JSON — eski no-cors/JSONP doğrulama gereksinimi ortadan kalkar. */
import {
  json, isAllowedImageMime, looksLikeImage, descClean, idClean,
  buildFileName, buildDescription, MAX_UPLOAD_BYTES
} from './_lib/util.js';
import {
  getAccessToken, driveUploadMedia, driveSetAnyoneReader, driveFindByUploadId
} from './_lib/google.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const eventId = (url.searchParams.get('e') || '').trim();

  const recRaw = eventId ? await env.EVENTS.get('event:' + eventId) : null;
  if (!recRaw) return json({ status: 'error', code: 'invalid_event', message: 'Etkinlik bulunamadı' }, 404);
  const rec = JSON.parse(recRaw);

  const mime = String(url.searchParams.get('mimeType') || request.headers.get('content-type') || '')
    .split(';')[0].trim().toLowerCase();
  if (!isAllowedImageMime(mime)) {
    return json({ status: 'error', code: 'bad_type', message: 'Yalnızca görsel dosyalar kabul edilir' }, 400);
  }

  const guest = descClean(url.searchParams.get('guestName'), 40);
  if (!guest) return json({ status: 'error', code: 'missing_guest', message: 'Ad zorunlu' }, 400);

  const task = descClean(url.searchParams.get('task'), 80);
  const uploadId = idClean(url.searchParams.get('uploadId'), 80);
  const filename = url.searchParams.get('filename') || '';

  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) {
    return json({ status: 'error', code: 'empty', message: 'Dosya verisi bulunamadı' }, 400);
  }
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return json({ status: 'error', code: 'too_large', message: 'Dosya çok büyük (maks. ~40MB)' }, 413);
  }

  // İmza doğrulaması yalnız baştaki birkaç bayta bakar (base64 decode YOK → CPU ucuz).
  const head = new Uint8Array(buf.slice(0, 16));
  if (!looksLikeImage(head, mime)) {
    return json({ status: 'error', code: 'bad_image_signature', message: 'Dosya biçimi doğrulanamadı' }, 400);
  }

  try {
    const accessToken = await getAccessToken(env, eventId, rec.refreshToken);

    // İdempotentlik: aynı uploadId ikinci kez kaydedilmez (tekrar denemede kopya olmaz).
    if (uploadId) {
      const existing = await driveFindByUploadId(accessToken, rec.folderId, uploadId);
      if (existing) {
        return json({ status: 'ok', duplicate: true, uploadId, fileId: existing.id, name: existing.name });
      }
    }

    const name = buildFileName(filename, guest, mime, task);
    const meta = {
      name: name,
      parents: [rec.folderId],
      mimeType: mime,
      description: buildDescription(guest, task, uploadId),
      appProperties: {
        guest: guest.slice(0, 124),
        task: (task || '').slice(0, 124),
        uploadId: uploadId || ''
      }
    };
    const file = await driveUploadMedia(accessToken, meta, mime, buf);

    // Thumbnail'ların token'sız yüklenmesi için paylaşıma aç (başarısız olsa da yükleme geçerli).
    try { await driveSetAnyoneReader(accessToken, file.id); } catch (e) {}

    return json({ status: 'ok', uploadId, fileId: file.id, name: file.name });
  } catch (err) {
    return json({ status: 'error', code: 'server_error', message: 'Yükleme tamamlanamadı' }, 502);
  }
}
