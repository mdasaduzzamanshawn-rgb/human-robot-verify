// GET /api/admin/photo?id=<uuid> -> short-lived signed URL for the private photo
import { json, db, storage, cfg, isUuid, adminRoute } from '../../_lib/core.js';

export const onRequestGet = adminRoute(async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!isUuid(id)) return json({ error: 'Invalid ID.' }, 400);
  const r = await db(env, `submissions?select=photo_path&id=eq.${id}&limit=1`);
  const rows = r.ok ? await r.json() : [];
  const path = rows[0]?.photo_path;
  if (!path) return json({ error: 'No photo.' }, 404);
  const s = await storage(env, `object/sign/submission-photos/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 }) });
  if (!s.ok) return json({ error: 'Photo not available.' }, 404);
  const { signedURL } = await s.json();
  const base = cfg(env).url;
  const url = signedURL.startsWith('http') ? signedURL : `${base}/storage/v1${signedURL.startsWith('/storage/v1') ? signedURL.slice(11) : signedURL}`;
  return json({ url });
});
