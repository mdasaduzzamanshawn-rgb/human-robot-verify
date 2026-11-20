// Server-side gate for the dashboard page itself: visitors without an admin session are redirected to /admin.
import { checkEnv, authenticate } from '../../_lib/core.js';

export async function onRequestGet({ request, env, next }) {
  const login = () => Response.redirect(new URL('/admin', request.url).toString(), 302);
  if (checkEnv(env)) return login();
  const auth = await authenticate(request, env);
  if (!auth.ok) return login();
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  auth.setCookies.forEach((c) => out.headers.append('Set-Cookie', c));
  return out;
}
