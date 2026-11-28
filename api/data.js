// GET /api/data  -> the data the shop shows (public)
import { json, latestCfg } from './_lib.js';

export async function GET() {
  try {
    const hit = await latestCfg();
    return json(hit ? { cfg: hit.cfg, v: hit.v } : { cfg: null }, 200, {
      'cache-control': 'public, s-maxage=5, stale-while-revalidate=30',
    });
  } catch (e) {
    return json({ error: 'server_error' }, 500);
  }
}
