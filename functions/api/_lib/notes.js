/* notes.js — Anı Defteri notlarının KV depolaması.
   Canlı akış (galeri/sunum) buradan okur; ayrıca note.js Drive'a .txt yazar. */
import { NOTE_LIST_LIMIT, MAX_NOTE_ITEMS } from './util.js';

export async function loadNotes(env, eventId) {
  const raw = await env.EVENTS.get('notes:' + eventId);
  if (!raw) return [];
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(arr)) return [];
  arr.sort((a, b) => (b.t || 0) - (a.t || 0));
  return arr.slice(0, NOTE_LIST_LIMIT);
}

/** Notu ekler; aynı noteId varsa yinelenmez. { duplicate } döner. */
export async function appendNote(env, eventId, note) {
  const raw = await env.EVENTS.get('notes:' + eventId);
  let arr = [];
  if (raw) { try { arr = JSON.parse(raw); } catch (e) { arr = []; } }
  if (!Array.isArray(arr)) arr = [];

  if (note.id) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].id === note.id) return { duplicate: true };
    }
  }
  arr.unshift(note);
  arr.sort((a, b) => (b.t || 0) - (a.t || 0));
  arr = arr.slice(0, MAX_NOTE_ITEMS);
  await env.EVENTS.put('notes:' + eventId, JSON.stringify(arr));
  return { duplicate: false };
}
