/* GET /api/oauth/start — Google onay ekranına yönlendirir.
   Etkinlik başlığı/türü kısa ömürlü `pending:<state>` kaydında taşınır (CSRF + bağlam). */
import { buildConsentUrl } from '../_lib/google.js';
import { randomId } from '../_lib/util.js';

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.BASE_URL) {
    return new Response(
      'Sunucu yapılandırması eksik: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / BASE_URL secret\'larını Cloudflare\'de ayarlayın.',
      { status: 500 }
    );
  }
  const url = new URL(request.url);
  const state = randomId();
  const ctx = {
    title: (url.searchParams.get('title') || '').slice(0, 80),
    event: (url.searchParams.get('event') || '').slice(0, 40)
  };
  await env.EVENTS.put('pending:' + state, JSON.stringify(ctx), { expirationTtl: 600 });
  return Response.redirect(buildConsentUrl(env, state), 302);
}
