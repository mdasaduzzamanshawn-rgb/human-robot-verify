// Shared helpers for all Pages Functions. Secrets are read only from `env` (server side).
const AT = 'hor_at';
const RT = 'hor_rt';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function checkEnv(env) {
  const missing = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY'].filter((k) => !env[k]);
  return missing.length ? json({ error: 'Server is not configured yet.' }, 500) : null;
}

export function cfg(env) {
  return { url: env.SUPABASE_URL.replace(/\/+$/, ''), secret: env.SUPABASE_SECRET_KEY, pub: env.SUPABASE_PUBLISHABLE_KEY };
}

function svc(c, extra = {}) {
  const h = { apikey: c.secret, ...extra };
  if (c.secret.startsWith('eyJ')) h.Authorization = 'Bearer ' + c.secret; // legacy JWT-style keys
  return h;
}
export const db = (env, path, init = {}) => {
  const c = cfg(env);
  return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: svc(c, init.headers) });
};
export const storage = (env, path, init = {}) => {
  const c = cfg(env);
  return fetch(`${c.url}/storage/v1/${path}`, { ...init, headers: svc(c, init.headers) });
};

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin) return origin === new URL(request.url).origin;
  return request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}

export async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ---------- cookies / sessions ----------
function readCookies(request) {
  const out = {};
  (request.headers.get('Cookie') || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const attrs = '; Path=/; HttpOnly; Secure; SameSite=Strict';
export const sessionCookies = (access, refresh, expiresIn) => [
  `${AT}=${encodeURIComponent(access)}${attrs}; Max-Age=${expiresIn || 3600}`,
  `${RT}=${encodeURIComponent(refresh)}${attrs}; Max-Age=604800`,
];
export const clearCookies = () => [`${AT}=${attrs}; Max-Age=0`, `${RT}=${attrs}; Max-Age=0`];
export const getAccessToken = (request) => readCookies(request)[AT] || '';

async function getUser(c, token) {
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.pub, Authorization: 'Bearer ' + token } });
  return r.ok ? r.json() : null;
}

export async function isAdmin(env, userId) {
  if (!isUuid(userId)) return null;
  const r = await db(env, `admin_users?select=id,email,role&user_id=eq.${userId}&limit=1`);
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

// Verifies the session with Supabase Auth and checks the user is listed in admin_users.
export async function authenticate(request, env) {
  const c = cfg(env);
  const ck = readCookies(request);
  let user = ck[AT] ? await getUser(c, ck[AT]) : null;
  let setCookies = [];
  if (!user && ck[RT]) {
    const r = await fetch(`${c.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: c.pub, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: ck[RT] }),
    });
    if (r.ok) {
      const t = await r.json();
      user = t.user || (await getUser(c, t.access_token));
      setCookies = sessionCookies(t.access_token, t.refresh_token, t.expires_in);
    }
  }
  if (!user) return { ok: false, status: 401 };
  const admin = await isAdmin(env, user.id);
  if (!admin) return { ok: false, status: 403 };
  return { ok: true, user, admin, setCookies };
}

// Wraps an admin-only handler: env check, same-origin check for writes, session + admin_users check.
export const adminRoute = (handler, { mutating = false } = {}) => async (ctx) => {
  const { request, env } = ctx;
  const miss = checkEnv(env);
  if (miss) return miss;
  if (mutating && !sameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  const auth = await authenticate(request, env);
  if (!auth.ok) return json({ error: auth.status === 401 ? 'Not signed in' : 'Not authorized' }, auth.status);
  const res = await handler(ctx, auth);
  auth.setCookies.forEach((c) => res.headers.append('Set-Cookie', c));
  return res;
};
