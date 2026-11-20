(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PER = 10;
  let all = [], view = [], page = 1, busy = false;
  const photoCache = new Map();

  document.querySelectorAll('.i').forEach((n) => { n.innerHTML = ART[n.dataset.i]; n.style.width = '20px'; });
  $('#ico-bot').innerHTML = ART.bot;

  function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200); }
  async function api(url, opt = {}) {
    const r = await fetch(url, { credentials: 'same-origin', ...opt });
    if (r.status === 401) { location.href = '/admin'; throw new Error('Signed out'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }
  function openModal(html) { const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = html; $('#modal-root').appendChild(o); o.addEventListener('click', (e) => { if (e.target === o && !busy) o.remove(); }); return o; }
  const fmt = (d) => new Date(d).toLocaleString();
  const shortId = (id) => '#' + id.slice(0, 8);
  const label = (s) => `${s.verification_score}% ${s.verified_identity}`;
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

  async function load() {
    try { all = (await api('/api/admin/submissions')).submissions; } catch (e) { toast(e.message, true); all = []; }
    renderStats(); apply();
  }
  function stats(list) {
    const today = dayKey(new Date());
    return { total: list.length, human: list.filter((s) => s.verified_identity === 'Human').length, robot: list.filter((s) => s.verified_identity === 'Robot').length, today: list.filter((s) => dayKey(s.created_at) === today).length, photos: list.filter((s) => s.photo_path).length };
  }
  function renderStats() {
    const s = stats(all);
    $('#stats').innerHTML = [['Total Submissions', s.total], ['Human Count', s.human], ['Robot Count', s.robot], ["Today's Submissions", s.today], ['Photo Upload Count', s.photos]].map(([k, v]) => `<div class="glass stat"><span>${k}</span><b>${v}</b></div>`).join('');
  }
  function apply() {
    const q = $('#q').value.trim().toLowerCase(), idf = $('#idf').value, d1 = $('#d1').value, d2 = $('#d2').value, so = $('#so').value;
    view = all.filter((s) => (!q || (s.nickname || '').toLowerCase().includes(q)) && (!idf || s.verified_identity === idf) && (!d1 || dayKey(s.created_at) >= d1) && (!d2 || dayKey(s.created_at) <= d2));
    const cmp = { new: (a, b) => new Date(b.created_at) - new Date(a.created_at), old: (a, b) => new Date(a.created_at) - new Date(b.created_at), name: (a, b) => (a.nickname || '~').localeCompare(b.nickname || '~'), score: (a, b) => b.verification_score - a.verification_score, cat: (a, b) => a.final_category.localeCompare(b.final_category) };
    view.sort(cmp[so]); page = 1; renderRows();
  }
  function renderRows() {
    const pages = Math.max(1, Math.ceil(view.length / PER)); page = Math.min(page, pages);
    const slice = view.slice((page - 1) * PER, page * PER);
    $('#rows').innerHTML = slice.length ? slice.map((s) => `<tr data-id="${s.id}"><td>${esc(shortId(s.id))}</td><td>${esc(s.nickname || '—')}</td><td>${esc(s.declared_identity)}</td><td>${esc(s.verified_identity)}</td><td>${esc(label(s))}</td><td class="wrap">${esc(s.final_category)}</td><td>${esc(fmt(s.created_at))}</td><td>${s.photo_path ? `<img class="thumb" alt="" data-photo="${s.id}">` : '<span class="thumb">None</span>'}</td><td><div class="rowact"><button class="btn ghost sm" data-a="view">View</button><button class="btn blue sm" data-a="card">Card</button><button class="btn danger sm" data-a="del">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="9">No submissions match. Clear the filters or wait for the first result.</td></tr>';
    $('#pinfo').textContent = `Page ${page} of ${pages} · ${view.length} results`;
    $('#prev').disabled = page <= 1; $('#next').disabled = page >= pages;
    document.querySelectorAll('img[data-photo]').forEach(async (img) => { try { img.src = await photoUrl(img.dataset.photo); } catch { img.replaceWith(Object.assign(document.createElement('span'), { className: 'thumb', textContent: 'n/a' })); } });
  }
  async function photoUrl(id) {
    const c = photoCache.get(id); if (c && c.exp > Date.now()) return c.url;
    const { url } = await api('/api/admin/photo?id=' + encodeURIComponent(id));
    photoCache.set(id, { url, exp: Date.now() + 240000 }); return url;
  }

  // ----- details -----
  function viewSub(s) {
    const v = s.verification_answers || {}, b = s.blind_game_answers || [];
    const o = openModal(`<div class="glass modal"><h2 style="margin:0">Submission ${esc(shortId(s.id))}</h2>
      ${s.photo_path ? '<img class="detail-photo" id="dp" alt="Uploaded photo">' : ''}
      <dl class="kv"><dt>ID</dt><dd>${esc(s.id)}</dd><dt>Nickname</dt><dd>${esc(s.nickname || '—')}</dd><dt>Declared</dt><dd>${esc(s.declared_identity)}</dd><dt>Verified</dt><dd>${esc(label(s))}</dd><dt>Final category</dt><dd>${esc(s.final_category)}</dd><dt>Description</dt><dd>${esc(s.final_description)}</dd><dt>Submitted</dt><dd>${esc(fmt(s.created_at))}</dd></dl>
      <h3>Verification answers</h3>${(v.answers || []).map((a) => `<div class="qa"><b>${esc(a.q)} · ${esc(a.selected)}</b> (${esc(a.scoring)})<br>${esc(a.text)}</div>`).join('')}
      <h3>Blind game answers</h3>${b.map((a) => `<div class="qa"><b>Q${esc(a.q)}</b> ${esc(a.question)}<br>${(a.options || []).map((t, i) => `<span style="${'ABCD'[i] === a.selected ? 'color:var(--pink);font-weight:700' : ''}">${'ABCD'[i]}. ${esc(t)}</span>`).join('<br>')}<br><i>${esc(a.reaction)}</i></div>`).join('')}
      <div class="rowact" style="margin-top:14px"><button class="btn blue sm" id="mc">Download card</button><button class="btn ghost sm" id="mx">Close</button></div></div>`);
    $('#mx', o).onclick = () => o.remove(); $('#mc', o).onclick = () => downloadCard(s);
    if (s.photo_path) photoUrl(s.id).then((u) => { $('#dp', o).src = u; }).catch(() => { $('#dp', o).remove(); });
  }

  // ----- card -----
  async function downloadCard(s) {
    try {
      let photo = null;
      if (s.photo_path) { try { photo = await (await fetch(await photoUrl(s.id))).blob(); } catch { /* card still downloads without photo */ } }
      const cv = await drawCard({ nickname: s.nickname || '', declared: s.declared_identity, verified: s.verified_identity, scoreLabel: label(s), category: s.final_category, description: s.final_description }, photo);
      cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `result-card-${s.id.slice(0, 8)}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
    } catch { toast('The card could not be created.', true); }
  }

  // ----- delete (admin only; enforced again on the server) -----
  function confirmDelete(s) {
    const o = openModal(`<div class="glass modal"><h2 style="margin:0">Delete this submission?</h2>
      <dl class="kv"><dt>Nickname</dt><dd>${esc(s.nickname || '—')}</dd><dt>Submission ID</dt><dd>${esc(s.id)}</dd></dl>
      <p>This permanently removes the record${s.photo_path ? ' and its stored private photo' : ''}. It also disappears from statistics and future Excel exports. This cannot be undone.</p>
      <p class="err-msg" id="de" role="alert"></p>
      <div class="rowact"><button class="btn danger" id="yes">Delete permanently</button><button class="btn ghost" id="no">Cancel</button></div></div>`);
    $('#no', o).onclick = () => { if (!busy) o.remove(); };
    $('#yes', o).onclick = async () => {
      if (busy) return; busy = true;
      const y = $('#yes', o); y.disabled = true; $('#no', o).disabled = true; y.textContent = 'Deleting...';
      try {
        await api('/api/admin/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) });
        busy = false; document.querySelectorAll('.overlay').forEach((x) => x.remove()); toast('Submission deleted.'); await load();
      } catch (e) { busy = false; y.disabled = false; $('#no', o).disabled = false; y.textContent = 'Delete permanently'; $('#de', o).textContent = e.message + ' The record was kept.'; }
    };
  }

  // ----- Excel -----
  function loadXLSX() {
    return new Promise((res, rej) => {
      if (window.XLSX) return res();
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = () => rej(new Error('Could not load the Excel library.')); document.head.appendChild(s);
    });
  }
  async function exportXlsx() {
    const btns = [$('#xl'), $('#n-xl')]; btns.forEach((b) => { b.disabled = true; });
    const old = $('#xl').textContent; $('#xl').textContent = 'Preparing...';
    try {
      await loadXLSX();
      const list = (await api('/api/admin/submissions')).submissions; // fresh, complete data (not just the visible page)
      const rows = list.map((s) => ({
        'ID': s.id, 'Nickname': s.nickname || '', 'Declared Identity': s.declared_identity, 'Verified Identity': s.verified_identity, 'Verification Score': label(s),
        'Verification Answers': ((s.verification_answers || {}).answers || []).map((a) => `${a.q}: ${a.selected} (${a.scoring})`).join(' | '),
        'Blind Game Answers': (s.blind_game_answers || []).map((a) => `Q${a.q}: ${a.selected} - ${a.options[ 'ABCD'.indexOf(a.selected) ] || ''}`).join(' | '),
        'Final Category': s.final_category, 'Photo Reference': s.photo_path || 'None', 'Created At': s.created_at,
      }));
      const st = stats(list), dist = {}; list.forEach((s) => { dist[s.final_category] = (dist[s.final_category] || 0) + 1; });
      const aoa = [['Statistic', 'Value'], ['Total Submissions', st.total], ['Human Count', st.human], ['Robot Count', st.robot], [], ['Category Distribution', 'Count'], ...Object.entries(dist)];
      const ws1 = XLSX.utils.json_to_sheet(rows, { header: ['ID', 'Nickname', 'Declared Identity', 'Verified Identity', 'Verification Score', 'Verification Answers', 'Blind Game Answers', 'Final Category', 'Photo Reference', 'Created At'] });
      ws1['!cols'] = [38, 18, 18, 18, 18, 36, 80, 26, 44, 26].map((wch) => ({ wch }));
      const ws2 = XLSX.utils.aoa_to_sheet(aoa); ws2['!cols'] = [{ wch: 28 }, { wch: 12 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws1, 'All Submissions'); XLSX.utils.book_append_sheet(wb, ws2, 'Statistics');
      XLSX.writeFile(wb, `human_or_robot_submissions_${dayKey(new Date())}.xlsx`);
    } catch (e) { toast(e.message, true); }
    btns.forEach((b) => { b.disabled = false; }); $('#xl').textContent = old;
  }

  // ----- events -----
  ['q', 'idf', 'd1', 'd2', 'so'].forEach((id) => $('#' + id).addEventListener('input', apply));
  $('#prev').onclick = () => { page--; renderRows(); };
  $('#next').onclick = () => { page++; renderRows(); };
  $('#xl').onclick = exportXlsx; $('#n-xl').onclick = exportXlsx;
  $('#n-out').onclick = async () => { try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); } finally { location.href = '/admin'; } };
  $('#rows').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const s = all.find((x) => x.id === b.closest('tr').dataset.id); if (!s) return;
    if (b.dataset.a === 'view') viewSub(s); else if (b.dataset.a === 'card') downloadCard(s); else confirmDelete(s);
  });
  load();
})();
