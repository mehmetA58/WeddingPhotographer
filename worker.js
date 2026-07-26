/* =========================================================================
   worker.js — Cloudflare Worker giriş noktası (static assets modeli)
   - /api/* isteklerini functions/api/* handler'larına yönlendirir
   - Diğer her şeyi statik varlık sistemine (env.ASSETS) bırakır
   Handler'lar Pages Functions imzasını korur (onRequestGet/onRequestPost
   ({ request, env })) — böylece functions/api/* ve _lib/* aynen kullanılır.
   ========================================================================= */

import * as ping from './functions/api/ping.js';
import * as oauthStart from './functions/api/oauth/start.js';
import * as oauthCallback from './functions/api/oauth/callback.js';
import * as upload from './functions/api/upload.js';
import * as list from './functions/api/list.js';
import * as note from './functions/api/note.js';
import * as photo from './functions/api/photo.js';
import * as rotateAdmin from './functions/api/admin/rotate.js';

const ROUTES = {
  'GET /api/ping': ping.onRequestGet,
  'GET /api/oauth/start': oauthStart.onRequestGet,
  'GET /api/oauth/callback': oauthCallback.onRequestGet,
  'POST /api/upload': upload.onRequestPost,
  'GET /api/list': list.onRequestGet,
  'POST /api/note': note.onRequestPost,
  'GET /api/photo': photo.onRequestGet,
  'POST /api/admin/rotate': rotateAdmin.onRequestPost
};

function secure(response) {
  const out = new Response(response.body, response);
  out.headers.set('Referrer-Policy', 'no-referrer');
  out.headers.set('X-Content-Type-Options', 'nosniff');
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const handler = ROUTES[request.method + ' ' + url.pathname];
      if (handler) return secure(await handler({ request, env, ctx }));
      return secure(new Response(
        JSON.stringify({ status: 'error', code: 'not_found', message: 'Bilinmeyen uç nokta' }),
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      ));
    }

    // Statik varlıklar (index.html, setup.html, css, js, …)
    return secure(await env.ASSETS.fetch(request));
  }
};
