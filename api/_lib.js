// Shared helpers for the API routes (files starting with "_" are not exposed as routes).
import crypto from 'node:crypto';
import { list, put, del } from '@vercel/blob';

export { put, del };

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();
export const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is missing or too short');
  return s;
}

// Signed session token: base64url(payload).signature
export function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verify(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    if (!safeEqual(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function isAuthed(request) {
  const h = request.headers.get('authorization') || '';
  return verify(h.startsWith('Bearer ') ? h.slice(7) : '');
}

// Every saved version of the site data is its own immutable file: data/v/<13-digit ms timestamp>.json
export async function versions() {
  const all = [];
  let cursor;
  do {
    const r = await list({ prefix: 'data/v/', cursor });
    all.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return all.sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
}

export const KEEP_VERSIONS = 9; // latest + 8 previous (used for undo)

// Minimal check so a broken request can never wipe the shop.
export function validCfg(c) {
  const isStr = (x) => typeof x === 'string';
  return (
    c && typeof c === 'object' &&
    c.theme && isStr(c.theme.bg) && isStr(c.theme.ink) &&
    c.site && typeof c.site === 'object' &&
    c.music && typeof c.music === 'object' &&
    Array.isArray(c.categories) && c.categories.every((x) => x && isStr(x.slug) && isStr(x.label)) &&
    Array.isArray(c.products) && c.products.every((p) => p && isStr(p.id) && isStr(p.cat) && isStr(p.name) && Array.isArray(p.imgs) && Array.isArray(p.options))
  );
}

// The newest saved data, or null when nothing has been saved yet.
export async function latestCfg() {
  const v = await versions();
  if (!v.length) return null;
  const latest = v[v.length - 1];
  const r = await fetch(latest.url);
  if (!r.ok) throw new Error('read_failed');
  return { cfg: await r.json(), v: latest.pathname };
}
