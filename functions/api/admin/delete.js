// POST /api/admin/delete  { id }  -> the ONLY place a submission (and its photo) can be deleted.
import { json, db, storage, isUuid, adminRoute } from '../../_lib/core.js';

export const onRequestPost = adminRoute(async ({ request, env }) => {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!isUuid(b.id)) return json({ error: 'Invalid submission ID.' }, 400);

  const get = await db(env, `submissions?select=id,photo_path&id=eq.${b.id}&limit=1`);
  if (!get.ok) return json({ error: 'Could not look up the submission.' }, 500);
  const row = (await get.json())[0];
  if (!row) return json({ error: 'Submission not found.' }, 404);

  if (row.photo_path) {
    const del = await storage(env, `object/submission-photos/${row.photo_path}`, { method: 'DELETE' });
    if (!del.ok && del.status !== 404) return json({ error: 'The photo could not be removed, so the record was kept.' }, 500);
  }
  const rm = await db(env, `submissions?id=eq.${b.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (!rm.ok) return json({ error: 'The record could not be deleted.' }, 500);
  return json({ ok: true, id: b.id });
}, { mutating: true });
