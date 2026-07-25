/* GET /api/ping — sağlık kontrolü. */
import { json } from './_lib/util.js';

export async function onRequestGet() {
  return json({ status: 'ready', service: 'eventphoto-api' });
}
