(() => {
  'use strict';
  const { VERIFY, BLIND, scoreVerification, finalResult } = window.QUIZ;
  const stage = document.getElementById('stage');
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = {};

  function reset() {
    if (S.photoURL) URL.revokeObjectURL(S.photoURL);
    Object.assign(S, { declared: null, vLetters: [], vi: 0, vr: null, picks: [], bi: 0, nick: '', photo: null, photoURL: null, result: null, saved: false, saving: false, startedAt: Date.now() });
  }

  function toast(msg, err) {
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
  }
  function show(html) { stage.innerHTML = html; window.scrollTo(0, 0); return stage.firstElementChild; }
  const segs = (n, total) => `<div class="segs">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  const topbar = (label, n, total) => `<div class="topbar glass">${ART.heart}<span class="t">HUMAN OR <b>ROBOT?</b></span><div class="prog"><span>${label} ${n}/${total}</span>${segs(n, total)}</div></div>`;
  function openModal(html) {
    const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = html; $('#modal-root').appendChild(o);
    return { el: o, close: () => o.remove() };
  }

  // ---------- 1. Welcome ----------
  function welcome() {
    const el = show(`<section class="screen">
      <header class="brand"><h1 class="logo">HUMAN <i>OR</i> <b>ROBOT?</b></h1><p class="sub">THE BLIND EXPERIMENT</p></header>
      <div class="welcome-grid">
        <div class="mascot l">${ART.robot}</div>
        <div class="glass panel">
          <h2>BE HONEST. WHAT ARE YOU?</h2>
          <button class="choice pink" data-v="Human">${ART.user}<span><b>A. Human.</b> My parents still think I'm a good investment.</span></button>
          <button class="choice blue" data-v="Robot">${ART.bot}<span><b>B. Robot.</b> My emotional support is a charger.</span></button>
          <button class="btn blue" id="next" disabled>Next ${ART.arrow}</button>
        </div>
        <div class="mascot r">${ART.girl}</div>
      </div></section>`);
    el.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      S.declared = b.dataset.v; el.querySelectorAll('.choice').forEach((x) => x.classList.toggle('on', x === b)); $('#next', el).disabled = false;
    }));
    $('#next', el).addEventListener('click', intro);
  }

  // ---------- 2. Verification intro ----------
  function scanner(title, text, btn) {
    return `<section class="screen"><div class="glass card-wide center">
      <h2 class="neon">${title}</h2>
      <div class="intro-row"><div class="scanbox"><div class="frame">${ART.robot}<i class="beam"></i></div><p class="scan-label">SCANNING...</p><div class="bar"><i></i></div></div>
      <div class="intro-copy">${text}</div><div class="shield">${ART.shield}</div></div>${btn}</div></section>`;
  }
  function intro() {
    const el = show(scanner("WAIT! WE DON'T TRUST YOUR ANSWER.", '<p>Your identity needs to be verified.</p><p>We suspect you might be a robot pretending to be human.</p>', `<button class="btn" id="go" disabled>Continue ${ART.arrow}</button>`));
    setTimeout(() => { if (el.isConnected) $('#go', el).disabled = false; }, 2400);
    $('#go', el).addEventListener('click', () => { S.vi = 0; verifyQ(); });
  }

  // ---------- 3. Verification quiz ----------
  function verifyQ() {
    const q = VERIFY[S.vi];
    const el = show(`<section class="screen">${topbar('Verification Test', S.vi + 1, 3)}<p class="chapter">${q.title}</p>
      <div class="quiz-grid"><div class="mascot q">${q.mascot === 'fridge' ? ART.fridge : ART.robot}<span class="qmark">${q.mark}</span></div>
      <div><div class="glass qcard"><h2>${q.q}</h2></div><div class="opts">${q.options.map((o) => `<button class="opt" data-l="${o.l}"><b>${o.l}.</b> ${o.t}</button>`).join('')}</div></div></div></section>`);
    el.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      el.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
      b.classList.add('sel'); S.vLetters.push(b.dataset.l);
      setTimeout(() => { if (S.vi < 2) { S.vi++; verifyQ(); } else analyzing(); }, 500);
    }));
  }
  function analyzing() {
    show(scanner('ANALYZING YOUR ANSWERS...', '<p>Comparing your replies with our extremely scientific database.</p>', ''));
    setTimeout(verdict, 2200);
  }

  // ---------- 4. Verdict ----------
  function verdict() {
    const r = S.vr = scoreVerification(S.vLetters);
    const robot = r.verified === 'Robot';
    const label = robot ? `${r.score}% Robot` : `${r.score}% Human` + (r.robotCount ? ` · ${r.robotPct}% Robot` : '');
    const el = show(`<section class="screen"><div class="glass card-wide center">
      <h2 class="verdict">${robot ? 'ROBOT DETECTED!' : 'HUMAN CONFIRMED!'}</h2>
      ${robot ? `<p>Congratulations! You are ${r.robotPct}% Robot.</p><p>Your human disguise was terrible.</p>` : '<p>Your humanity survived our extremely questionable verification system.</p>'}
      <div class="glass scorebox">Your Verified Score: ${label}</div>
      <p class="small">These percentages are entertainment scores, not real identity detection.</p>
      <button class="btn" id="go">START BLIND GAME ${ART.arrow}</button></div></section>`);
    $('#go', el).addEventListener('click', blindIntro);
  }

  // ---------- 5. Blind game ----------
  function blindIntro() {
    const el = show(`<section class="screen"><div class="glass card-wide center">
      <div style="width:64px;color:var(--pink)">${ART.mask}</div>
      <h2 class="neon">ENOUGH NONSENSE! NOW LET'S PLAY A BLIND GAME.</h2>
      <p>You can see the questions, but you cannot see the options.</p><p>Choose wisely. You never know what you're choosing.</p>
      <button class="btn" id="go">LET'S PLAY ${ART.arrow}</button></div></section>`);
    $('#go', el).addEventListener('click', () => { S.bi = 0; blindQ(); });
  }
  const kind = () => (S.vr.verified === 'Robot' ? 'robot' : 'human');
  function blindQ() {
    const q = BLIND[kind()][S.bi];
    const el = show(`<section class="screen"><div class="topbar glass"><span style="width:34px;color:var(--pink)">${ART.mask}</span><span class="t" style="color:var(--pink)">BLIND GAME</span><div class="prog"><span>Question ${S.bi + 1}/3</span>${segs(S.bi + 1, 3)}</div></div>
      <div class="glass qcard"><h2>${q.q}</h2></div>
      <div class="tiles" id="tiles">${q.options.map((o, i) => `<button class="tile" data-i="${i}" aria-label="Option ${'ABCD'[i]}, hidden"><span class="in"><span class="face front"><span class="ltr">${'ABCD'[i]}</span>${ART.eyeOff}</span><span class="face back" aria-hidden="true"><span><b>${'ABCD'[i]}.</b> ${o.t}</span></span></span></button>`).join('')}</div>
      <p class="hint" id="hint">Choose wisely. You never know what you're choosing...</p><div id="after"></div></section>`);
    el.querySelectorAll('.tile').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.i); S.picks[S.bi] = i;
      $('#tiles', el).classList.add('rev'); b.classList.add('pick');
      el.querySelectorAll('.tile').forEach((x) => { x.disabled = true; x.setAttribute('aria-label', `Option ${'ABCD'[x.dataset.i]}: ${q.options[x.dataset.i].t}`); });
      $('#hint', el).remove();
      const last = S.bi === 2;
      $('#after', el).innerHTML = `<div class="glass react"><p><b>You chose ${'ABCD'[i]}.</b></p><p>${esc(q.options[i].react)}</p></div><div class="actions"><button class="btn" id="nq">${last ? 'Continue' : 'Next Question'} ${ART.arrow}</button></div>`;
      $('#nq', el).addEventListener('click', () => { if (last) details(); else { S.bi++; blindQ(); } });
    }));
  }

  // ---------- 6. Personal details ----------
  function details() {
    const el = show(`<section class="screen"><div class="glass card-wide center">
      <h2 class="neon">ALMOST THERE!</h2><p>Add a name and a photo for your result card, or skip straight to the result.</p>
      <div class="fields">
        <label for="nick" class="small">Name or nickname</label>
        <input id="nick" maxlength="30" autocomplete="off" placeholder="Your name or nickname" value="${esc(S.nick)}">
        <div class="photo-row"><button class="btn blue" id="up" type="button">${ART.download} Upload photo</button><button class="btn ghost" id="cam" type="button">Take selfie</button></div>
        <div id="pv"></div>
        <input id="file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
        <input id="camfile" type="file" accept="image/*" capture="user" hidden>
      </div>
      <button class="btn" id="go">See my result ${ART.arrow}</button></div></section>`);
    const preview = () => {
      $('#pv', el).innerHTML = S.photoURL ? `<div class="polaroid"><img src="${S.photoURL}" alt="Your photo preview"><button class="x" id="rm" aria-label="Remove photo">×</button></div>` : '';
      const rm = $('#rm', el); if (rm) rm.addEventListener('click', () => { URL.revokeObjectURL(S.photoURL); S.photo = null; S.photoURL = null; preview(); });
    };
    preview();
    const take = async (f) => { if (await setPhoto(f)) preview(); };
    $('#up', el).addEventListener('click', () => $('#file', el).click());
    $('#file', el).addEventListener('change', (e) => { take(e.target.files[0]); e.target.value = ''; });
    $('#camfile', el).addEventListener('change', (e) => { take(e.target.files[0]); e.target.value = ''; });
    $('#cam', el).addEventListener('click', () => openCamera(take, () => $('#camfile', el).click()));
    $('#nick', el).addEventListener('input', (e) => { S.nick = e.target.value; });
    $('#go', el).addEventListener('click', finish);
  }

  function shrink(blob) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(blob), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        let q = .85;
        const go = () => c.toBlob((b) => { if (!b) return rej(); if (b.size > 1.9 * 1048576 && q > .4) { q -= .15; return go(); } res(b); }, 'image/jpeg', q);
        go();
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(); };
      img.src = u;
    });
  }
  async function setPhoto(f) {
    if (!f) return false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast('Please choose a JPG, PNG or WEBP image.', true); return false; }
    if (f.size > 15 * 1048576) { toast('That image is too large. Choose one under 15 MB.', true); return false; }
    try {
      const b = await shrink(f); if (S.photoURL) URL.revokeObjectURL(S.photoURL);
      S.photo = b; S.photoURL = URL.createObjectURL(b); return true;
    } catch { toast('That image could not be read. Try another one.', true); return false; }
  }
  async function openCamera(take, fallback) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fallback(); return; }
    const m = openModal('<div class="glass cam"><video id="vid" autoplay playsinline muted></video><div class="row"><button class="btn" id="snap">Capture</button><button class="btn ghost" id="cc">Close</button></div></div>');
    let stream;
    const close = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); m.close(); };
    $('#cc', m.el).addEventListener('click', close);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      $('#vid', m.el).srcObject = stream;
    } catch { close(); toast('Camera access was blocked. You can upload a photo instead.', true); return; }
    $('#snap', m.el).addEventListener('click', () => {
      const v = $('#vid', m.el); if (!v.videoWidth) return;
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(v, 0, 0);
      c.toBlob((b) => { close(); if (b) take(b); }, 'image/jpeg', .9);
    });
  }

  // ---------- 7. Result ----------
  function buildResult() {
    const r = S.vr, fr = finalResult(S.vLetters, S.picks, r.verified);
    return {
      nickname: S.nick.trim(), declared: S.declared, verified: r.verified, score: r.score,
      scoreLabel: `${r.score}% ${r.verified}`, category: fr.category, description: fr.description,
    };
  }
  function payload() {
    const b = BLIND[kind()];
    return {
      nickname: S.result.nickname, declared: S.declared, category: S.result.category, description: S.result.description,
      verification: VERIFY.map((q, i) => ({ question: q.q, answer: S.vLetters[i], text: q.options.find((o) => o.l === S.vLetters[i]).t })),
      blind: b.map((q, i) => ({ question: q.q, options: q.options.map((o) => o.t), selected: 'ABCD'[S.picks[i]], reaction: q.options[S.picks[i]].react })),
    };
  }
  async function save() {
    if (S.saving || S.saved) return S.saved;
    S.saving = true;
    try {
      const fd = new FormData();
      fd.append('data', JSON.stringify(payload())); fd.append('elapsed', String(Math.round((Date.now() - S.startedAt) / 1000))); fd.append('website', '');
      if (S.photo) fd.append('photo', S.photo, 'photo.jpg');
      const r = await fetch('/api/submit', { method: 'POST', body: fd });
      S.saved = r.ok;
      if (!r.ok) { const j = await r.json().catch(() => ({})); S.saveError = j.error || ''; }
    } catch { S.saved = false; }
    S.saving = false; return S.saved;
  }
  async function finish() {
    const go = $('#go'); go.disabled = true; go.textContent = 'Preparing your result...';
    S.nick = ($('#nick') ? $('#nick').value : S.nick) || '';
    S.result = buildResult();
    await save(); // a failed save never blocks the result
    resultScreen();
  }
  async function resultScreen() {
    const R = S.result, robot = R.verified === 'Robot';
    const b = BLIND[kind()];
    const el = show(`<section class="screen center">
      <h2 class="verdict">${robot ? 'ROBOT DETECTED!' : 'HUMAN CONFIRMED!'}</h2>
      <div id="cardbox" class="small">Building your card...</div>
      ${S.saved ? '' : `<div class="note" id="note">Your result is ready, but it has not been saved yet.${S.saveError ? ' ' + esc(S.saveError) : ''} <button class="btn sm" id="retry">Try saving again</button></div>`}
      <div class="glass answers"><h3>Your blind choices</h3>${S.picks.map((p, i) => `<p><b>${i + 1}. ${'ABCD'[p]}</b> ${esc(b[i].options[p].t)}</p>`).join('')}</div>
      <div class="actions"><button class="btn" id="share">${ART.share} Share Result</button><button class="btn blue" id="dl">${ART.download} Download Card</button><button class="btn ghost" id="again">${ART.replay} Play Again</button></div></section>`);
    const cv = await window.drawCard(R, S.photo);
    if (!el.isConnected) return;
    cv.className = 'result-card'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `Result card: ${R.category}`);
    $('#cardbox', el).replaceWith(cv);
    const blob = () => new Promise((r) => cv.toBlob(r, 'image/png'));
    const file = async () => new File([await blob()], 'human-or-robot-result.png', { type: 'image/png' });
    const download = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = 'human-or-robot-result.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
    $('#dl', el).addEventListener('click', download);
    $('#share', el).addEventListener('click', async () => {
      try {
        const f = await file();
        if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Human or Robot?', text: `${R.category}: my Human or Robot? result` });
        else { await download(); toast('Card saved. Share the image from your gallery.'); }
      } catch (e) { if (e && e.name !== 'AbortError') toast('Sharing is not available here. Use Download Card instead.', true); }
    });
    $('#again', el).addEventListener('click', () => { reset(); welcome(); });
    const rt = $('#retry', el);
    if (rt) rt.addEventListener('click', async () => {
      rt.disabled = true; rt.textContent = 'Saving...';
      if (await save()) { $('#note', el).remove(); toast('Saved!'); } else { rt.disabled = false; rt.textContent = 'Try saving again'; toast('Could not save yet. Check your connection.', true); }
    });
  }

  reset(); welcome();
})();
