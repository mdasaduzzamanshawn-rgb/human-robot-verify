// POST /api/admin/login  { email, password }
import { json, checkEnv, sameOrigin, cfg, isAdmin, sessionCookies } from '../../_lib/core.js';

export async function onRequestPost({ request, env }) {
  const miss = checkEnv(env);
  if (miss) return miss;
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const email = typeof b.email === 'string' ? b.email.trim().slice(0, 200) : '';
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  if (!email || !password) return json({ error: 'Enter your email and password.' }, 400);

  const c = cfg(env);
  const r = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: c.pub, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const fail = () => json({ error: 'Sign-in failed. Check your details or your access rights.' }, 401);
  if (!r.ok) return fail();
  const t = await r.json();
  if (!(await isAdmin(env, t.user?.id))) return fail(); // valid Supabase user but not an administrator

  const res = json({ ok: true });
  sessionCookies(t.access_token, t.refresh_token, t.expires_in).forEach((ck) => res.headers.append('Set-Cookie', ck));
  return res;
}
