/* POST /api/note?e=<eventId> — Anı Defteri notu.
   KV'ye (canlı akış) yazar + ev sahibinin Drive klasörüne Not_*.txt (kalıcı hatıra). */
import { json, descClean, idClean, sanitize, formatStamp } from './_lib/util.js';
import { getAccessToken, driveUploadMedia } from './_lib/google.js';
import { appendNote } from './_lib/notes.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const eventId = (url.searchParams.get('e') || '').trim();

  const recRaw = eventId ? await env.EVENTS.get('event:' + eventId) : null;
  if (!recRaw) return json({ status: 'error', code: 'invalid_event', message: 'Etkinlik bulunamadı' }, 404);
  const rec = JSON.parse(recRaw);

  let body = {};
  try { body = await request.json(); } catch (e) {}

  const msg = String(body.message || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!msg) return json({ status: 'error', code: 'empty_note', message: 'Boş not' }, 400);
  const guest = descClean(body.guestName, 40);
  if (!guest) return json({ status: 'error', code: 'missing_guest', message: 'Ad zorunlu' }, 400);
  const noteId = idClean(body.noteId, 80);

  const now = Date.now();
  const result = await appendNote(env, eventId, { id: noteId, g: guest, m: msg, t: now });
  if (result.duplicate) {
    return json({ status: 'ok', type: 'note', duplicate: true, noteId, savedProperties: true, savedDrive: true });
  }

  // Kalıcı hatıra: Drive'a Not_*.txt (best-effort — başarısız olsa da not KV'de kayıtlı).
  let savedDrive = false;
  let fileId = '';
  try {
    const accessToken = await getAccessToken(env, eventId, rec.refreshToken);
    const ts = formatStamp(new Date());
    const name = 'Not_' + ts + (guest ? '_' + sanitize(guest, 30) : '') + '.txt';
    const content = (guest ? guest + ':\n' : '') + msg + (noteId ? '\n\nEventPhoto NoteId: ' + noteId : '');
    const file = await driveUploadMedia(
      accessToken,
      { name: name, parents: [rec.folderId], mimeType: 'text/plain' },
      'text/plain; charset=UTF-8',
      content
    );
    savedDrive = true;
    fileId = file.id;
  } catch (e) {}

  return json({ status: 'ok', type: 'note', noteId, savedProperties: true, savedDrive, fileId });
}
