import { json, isValidAdminKey, randomId, ADMIN_KEY_TTL_MS } from '../../_lib/util.js';

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const eventId = String(body.eventId || '').trim();
  const oldKey = String(body.adminKey || '').trim();
  const raw = eventId ? await env.EVENTS.get('event:' + eventId) : null;
  if (!raw) return json({ status: 'error', code: 'invalid_event' }, 404);

  let rec;
  try { rec = JSON.parse(raw); } catch (e) { rec = null; }
  if (!isValidAdminKey(rec, oldKey)) {
    return json({ status: 'error', code: 'invalid_token' }, 403);
  }

  const now = Date.now();
  rec.adminKey = randomId();
  rec.adminKeyCreatedAt = now;
  rec.adminKeyExpiresAt = now + ADMIN_KEY_TTL_MS;
  await env.EVENTS.put('event:' + eventId, JSON.stringify(rec));
  return json({ status: 'ok', adminKey: rec.adminKey, expiresAt: rec.adminKeyExpiresAt });
}
