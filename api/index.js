// GET /  -> public/shell.html with the saved data, the page icon and the link-preview (share) tags filled in.
// Link previews (LINE, Facebook, X ...) are read by bots that do not run JavaScript, so these tags must be in the HTML itself.
import fs from 'node:fs';
import path from 'node:path';
import { latestCfg } from './_lib.js';

const read = (name) => {
  const tries = [path.join(process.cwd(), 'public', name), new URL('../public/' + name, import.meta.url)];
  for (const t of tries) { try { return fs.readFileSync(t, 'utf8'); } catch {} }
  throw new Error('missing ' + name);
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(request) {
  let cfg = null;
  try { const hit = await latestCfg(); cfg = hit && hit.cfg; } catch {}
  if (!cfg) cfg = JSON.parse(read('default-data.json'));

  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const origin = /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${proto}://${host}` : '';
  const abs = (u) => (/^https?:\/\//i.test(u) ? u : origin + (String(u).startsWith('/') ? '' : '/') + u);

  const s = cfg.site || {};
  const title = s.title || 'ONDA STREET';
  const desc = s.desc || 'Streetwear clothing and accessories.';
  const icon = abs(s.icon || '/assets/icon-512.png');
  const banner = abs(s.banner || '/assets/og-banner.jpg');
  const meta = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="theme-color" content="${esc(cfg.theme && cfg.theme.bg)}">`,
    `<link rel="icon" type="image/png" href="${esc(icon)}">`,
    `<link rel="apple-touch-icon" href="${esc(icon)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(title)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(origin + '/')}">`,
    `<meta property="og:image" content="${esc(banner)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(banner)}">`,
  ].join('\n');
  const data = `<script>window.__CFG__=${JSON.stringify(cfg).replace(/</g, '\\u003c')};</script>`;

  const html = read('shell.html').replace('<!--META-->', () => meta).replace('<!--DATA-->', () => data);
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=10, stale-while-revalidate=60' },
  });
}
