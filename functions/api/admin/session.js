// GET /api/admin/session -> who am I (admins only)
import { json, adminRoute } from '../../_lib/core.js';
export const onRequestGet = adminRoute(async (_ctx, auth) => json({ ok: true, email: auth.admin.email, role: auth.admin.role }));
