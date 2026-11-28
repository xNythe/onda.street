// POST /api/upload?kind=image|audio (admin, raw file as body) -> {url}
import { json, isAuthed, put } from './_lib.js';
import crypto from 'node:crypto';

const TYPES = {
  image: { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' },
  audio: { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm' },
};
// Vercel limits a request body to about 4.5 MB
const MAX = { image: 3_000_000, audio: 4_400_000 };

export async function POST(request) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  const kind = new URL(request.url).searchParams.get('kind');
  if (!TYPES[kind]) return json({ error: 'bad_kind' }, 400);
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[kind][type];
  if (!ext) return json({ error: 'bad_type' }, 415);
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) return json({ error: 'empty' }, 400);
  if (buf.length > MAX[kind]) return json({ error: 'too_large' }, 413);
  try {
    const name = `media/${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
    const blob = await put(name, buf, { access: 'public', contentType: type, addRandomSuffix: false });
    return json({ url: blob.url });
  } catch {
    return json({ error: 'storage_error' }, 500);
  }
}
