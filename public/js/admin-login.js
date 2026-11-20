(() => {
  const f = document.getElementById('f'), err = document.getElementById('err'), go = document.getElementById('go');
  fetch('/api/admin/session', { credentials: 'same-origin' }).then((r) => { if (r.ok) location.replace('/admin/dashboard'); }).catch(() => {});
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = ''; go.disabled = true; go.textContent = 'Signing in...';
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('pw').value }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { location.href = '/admin/dashboard'; return; }
      err.textContent = j.error || 'Sign-in failed.';
    } catch { err.textContent = 'Network problem. Try again.'; }
    go.disabled = false; go.textContent = 'Sign in';
  });
})();
