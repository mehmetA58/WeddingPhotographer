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

const ROUTES = {
  'GET /api/ping': ping.onRequestGet,
  'GET /api/oauth/start': oauthStart.onRequestGet,
  'GET /api/oauth/callback': oauthCallback.onRequestGet,
  'POST /api/upload': upload.onRequestPost,
  'GET /api/list': list.onRequestGet,
  'POST /api/note': note.onRequestPost
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const handler = ROUTES[request.method + ' ' + url.pathname];
      if (handler) return handler({ request, env, ctx });
      return new Response(
        JSON.stringify({ status: 'error', code: 'not_found', message: 'Bilinmeyen uç nokta' }),
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Statik varlıklar (index.html, setup.html, css, js, …)
    return env.ASSETS.fetch(request);
  }
};
