// POST /api/submit  (public). Validates, optionally stores a private photo, inserts the record.
import { json, checkEnv, sameOrigin, db, storage, sha256hex } from '../_lib/core.js';

const MAX_PHOTO = 2 * 1024 * 1024;
const CATS = {
  Human: ['The Secret Romantic', 'Professional Single', 'You are missing your ex', 'Charm Expert'],
  Robot: ['LoveBot 9000', 'You are missing your ex', 'Charm Expert', 'Romantic Machine'],
};
const ALLOWED = ['ABC', 'ABCD', 'ABCD']; // letters allowed in the 3 verification questions; B is always the human answer
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

function sniff(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { type: 'image/webp', ext: 'webp' };
  return null;
}

export async function onRequestPost({ request, env }) {
  const miss = checkEnv(env);
  if (miss) return miss;
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403);
  if (Number(request.headers.get('Content-Length') || 0) > 3 * 1024 * 1024) return json({ error: 'Request too large.' }, 413);

  let form;
  try { form = await request.formData(); } catch { return json({ error: 'Invalid request.' }, 400); }

  // Basic spam protection: honeypot, minimum time, per-IP hourly limit.
  if (str(form.get('website'), 50)) return json({ ok: true }); // silently ignore bots
  if (Number(form.get('elapsed')) < 5) return json({ error: 'Please take your time with the quiz.' }, 429);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256hex(ip + env.SUPABASE_SECRET_KEY);
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const rl = await db(env, `submissions?select=id&ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&limit=6`);
  if (rl.ok && (await rl.json()).length >= 5) return json({ error: 'Too many submissions from this network. Try again later.' }, 429);

  let d;
  try { d = JSON.parse(form.get('data') || ''); } catch { return json({ error: 'Invalid data.' }, 400); }

  const declared = d.declared === 'Human' || d.declared === 'Robot' ? d.declared : null;
  if (!declared) return json({ error: 'Invalid identity.' }, 400);

  // Verification: score is recomputed on the server from the answer letters.
  if (!Array.isArray(d.verification) || d.verification.length !== 3) return json({ error: 'Invalid verification answers.' }, 400);
  const vAnswers = [];
  for (let i = 0; i < 3; i++) {
    const a = d.verification[i] || {};
    if (typeof a.answer !== 'string' || a.answer.length !== 1 || !ALLOWED[i].includes(a.answer)) return json({ error: 'Invalid verification answers.' }, 400);
    vAnswers.push({ q: ['W2', 'W3', 'W4'][i], question: str(a.question, 300), selected: a.answer, text: str(a.text, 200), scoring: a.answer === 'B' ? 'Human' : 'Robot' });
  }
  const robotCount = vAnswers.filter((a) => a.selected !== 'B').length;
  const robotPercent = [0, 40, 75, 100][robotCount];
  const verified = robotCount >= 2 ? 'Robot' : 'Human';
  const score = verified === 'Robot' ? robotPercent : robotCount === 0 ? 100 : 60;

  // Blind game
  if (!Array.isArray(d.blind) || d.blind.length !== 3) return json({ error: 'Invalid blind game answers.' }, 400);
  const blind = d.blind.map((b, i) => {
    const options = Array.isArray(b.options) ? b.options.slice(0, 4).map((o) => str(o, 200)) : [];
    if (options.length !== 4 || typeof b.selected !== 'string' || b.selected.length !== 1 || !'ABCD'.includes(b.selected)) return null;
    return { q: i + 1, question: str(b.question, 300), options, selected: b.selected, reaction: str(b.reaction, 300) };
  });
  if (blind.includes(null)) return json({ error: 'Invalid blind game answers.' }, 400);

  const category = str(d.category, 60);
  if (!CATS[verified].includes(category)) return json({ error: 'Invalid result category.' }, 400);
  const description = str(d.description, 500);
  if (!description) return json({ error: 'Invalid result.' }, 400);
  const nickname = str(d.nickname, 30) || null;

  // Optional photo (never blocks the submission)
  let photoPath = null;
  const photo = form.get('photo');
  if (photo && typeof photo === 'object' && photo.size > 0) {
    if (photo.size > MAX_PHOTO) return json({ error: 'Photo is larger than 2 MB.' }, 400);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const kind = sniff(bytes);
    if (!kind) return json({ error: 'Photo must be JPG, PNG or WEBP.' }, 400);
    const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${kind.ext}`;
    const up = await storage(env, `object/submission-photos/${path}`, { method: 'POST', headers: { 'Content-Type': kind.type, 'x-upsert': 'false' }, body: bytes });
    if (up.ok) photoPath = path;
  }

  const row = {
    nickname, declared_identity: declared, verified_identity: verified, verification_score: score,
    verification_answers: { answers: vAnswers, robot_count: robotCount, robot_percent: robotPercent },
    blind_game_answers: blind, final_category: category, final_description: description, photo_path: photoPath, ip_hash: ipHash,
  };
  const ins = await db(env, 'submissions?select=id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) });
  if (!ins.ok) {
    if (photoPath) await storage(env, `object/submission-photos/${photoPath}`, { method: 'DELETE' });
    return json({ error: 'Could not save your result right now.' }, 500);
  }
  return json({ ok: true, photoSaved: !!photoPath });
}
