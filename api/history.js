// GET /api/history (admin) -> list of previous versions   |   GET /api/history?id=<pathname> -> that version's data
import { json, isAuthed, versions } from './_lib.js';

export async function GET(request) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  try {
    const all = await versions();
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const hit = all.find((b) => b.pathname === id);
      if (!hit) return json({ error: 'not_found' }, 404);
      const r = await fetch(hit.url);
      return r.ok ? json({ cfg: await r.json() }) : json({ error: 'read_failed' }, 502);
    }
    const previous = all.slice(0, -1).reverse(); // newest first, without the live one
    return json({ items: previous.map((b) => ({ id: b.pathname, at: b.uploadedAt })) });
  } catch {
    return json({ error: 'server_error' }, 500);
  }
}
