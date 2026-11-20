// GET /api/admin/submissions -> every current record (used by the dashboard and by the Excel export)
import { json, db, adminRoute } from '../../_lib/core.js';

const COLS = 'id,nickname,declared_identity,verified_identity,verification_score,verification_answers,blind_game_answers,final_category,final_description,photo_path,created_at';

export const onRequestGet = adminRoute(async ({ env }) => {
  const r = await db(env, `submissions?select=${COLS}&order=created_at.desc&limit=5000`);
  if (!r.ok) return json({ error: 'Could not load submissions.' }, 500);
  return json({ submissions: await r.json() });
});
