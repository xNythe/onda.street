// POST /api/login {user,password} -> {token}   |   GET /api/login (Bearer token) -> {ok:true}
import { json, safeEqual, sign, isAuthed } from './_lib.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {}
  const U = process.env.ADMIN_USER, P = process.env.ADMIN_PASS;
  if (!U || !P) return json({ error: 'not_configured' }, 500);
  const ok = safeEqual(body.user ?? '', U) & safeEqual(body.password ?? '', P);
  if (!ok) { await sleep(600); return json({ error: 'invalid' }, 401); } // slows down guessing
  try {
    return json({ token: sign({ exp: Date.now() + 12 * 60 * 60 * 1000 }) });
  } catch {
    return json({ error: 'not_configured' }, 500);
  }
}

export async function GET(request) {
  return isAuthed(request) ? json({ ok: true }) : json({ error: 'unauthorized' }, 401);
}
