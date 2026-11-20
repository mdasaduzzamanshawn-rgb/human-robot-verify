// POST /api/admin/logout
import { json, sameOrigin, cfg, clearCookies, getAccessToken, checkEnv } from '../../_lib/core.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  const token = getAccessToken(request);
  if (token && !checkEnv(env)) {
    const c = cfg(env);
    await fetch(`${c.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: c.pub, Authorization: 'Bearer ' + token } }).catch(() => {});
  }
  const res = json({ ok: true });
  clearCookies().forEach((ck) => res.headers.append('Set-Cookie', ck));
  return res;
}
