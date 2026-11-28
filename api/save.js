// POST /api/save {cfg} (admin) -> stores a new version and keeps the last 9
import { json, isAuthed, versions, validCfg, put, del, KEEP_VERSIONS } from './_lib.js';

export async function POST(request) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const cfg = body && body.cfg;
  if (!validCfg(cfg)) return json({ error: 'invalid_data' }, 400);
  const text = JSON.stringify(cfg);
  if (text.length > 1_500_000) return json({ error: 'too_large' }, 413);
  try {
    // names are strictly increasing, so "newest" is always the last name in alphabetical order
    const before = await versions();
    const lastTs = before.length ? parseInt(before[before.length - 1].pathname.slice(7, 20), 10) || 0 : 0;
    const name = `data/v/${String(Math.max(Date.now(), lastTs + 1)).padStart(13, '0')}.json`;
    await put(name, text, { access: 'public', contentType: 'application/json', addRandomSuffix: false });
    const all = await versions();
    const old = all.slice(0, Math.max(0, all.length - KEEP_VERSIONS));
    if (old.length) await del(old.map((b) => b.url));
    return json({ ok: true, v: name });
  } catch (e) {
    return json({ error: 'storage_error' }, 500);
  }
}
