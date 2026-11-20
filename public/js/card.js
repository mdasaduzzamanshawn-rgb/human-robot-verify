// Draws the shareable result card on a canvas (used by visitors and by the admin dashboard).
window.drawCard = (() => {
  const W = 1080, H = 1350;
  const FONT = '"Trebuchet MS","Segoe UI","Helvetica Neue",Arial,sans-serif';
  const BLACK = '"Arial Black","Segoe UI Black","Helvetica Neue",Impact,sans-serif';

  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function heart(c, x, y, s, color, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = color; c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-14, -4, -8, -16, 0, -8); c.bezierCurveTo(8, -16, 14, -4, 0, 6); c.fill(); c.restore(); }
  function wrap(c, text, x, y, maxW, lh, maxLines) {
    const words = text.split(' '); let line = ''; const lines = [];
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((l, i) => c.fillText(l, x, y + i * lh));
  }

  return async function drawCard(d, photo) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const isRobot = d.verified === 'Robot';

    let g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a0830'); g.addColorStop(.55, '#2a0a5e'); g.addColorStop(1, '#0b0a38');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    let r = c.createRadialGradient(100, 80, 10, 100, 80, 620); r.addColorStop(0, 'rgba(255,43,214,.45)'); r.addColorStop(1, 'rgba(255,43,214,0)'); c.fillStyle = r; c.fillRect(0, 0, W, H);
    r = c.createRadialGradient(W, 500, 10, W, 500, 600); r.addColorStop(0, 'rgba(46,197,255,.4)'); r.addColorStop(1, 'rgba(46,197,255,0)'); c.fillStyle = r; c.fillRect(0, 0, W, H);
    [[90, 250, 1.4, '#ff2bd6'], [980, 240, 1.1, '#2ec5ff'], [60, 820, 1, '#ff3d8b'], [1010, 790, 1.5, '#ff2bd6'], [540, 235, .9, '#2ec5ff'], [980, 1290, 1, '#ff3d8b'], [80, 1290, 1.2, '#2ec5ff']].forEach(([x, y, s, col]) => heart(c, x, y, s * 3, col, .8));

    c.textAlign = 'center';
    g = c.createLinearGradient(180, 0, 900, 0); g.addColorStop(0, '#ff5be0'); g.addColorStop(1, '#46d0ff');
    c.fillStyle = g; c.font = `italic 900 92px ${BLACK}`; c.shadowColor = 'rgba(255,43,214,.7)'; c.shadowBlur = 28; c.fillText('HUMAN OR ROBOT?', W / 2, 140); c.shadowBlur = 0;
    c.fillStyle = '#cfc2ff'; c.font = `700 34px ${FONT}`; c.fillText('THE BLIND EXPERIMENT', W / 2, 196);

    // Polaroid
    c.save(); c.translate(300, 530); c.rotate(-4 * Math.PI / 180);
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 36; c.shadowOffsetY = 14; c.fillStyle = '#fff'; rr(c, -220, -260, 440, 520, 14); c.fill(); c.shadowColor = 'transparent';
    c.save(); rr(c, -200, -240, 400, 400, 8); c.clip();
    let img = null;
    if (photo) { const u = photo instanceof Blob ? URL.createObjectURL(photo) : photo; img = await load(u); if (photo instanceof Blob) URL.revokeObjectURL(u); }
    if (img) { const s = Math.max(400 / img.width, 400 / img.height); const w = img.width * s, h = img.height * s; c.drawImage(img, -200 + (400 - w) / 2, -240 + (400 - h) / 2, w, h); }
    else {
      const bg = c.createLinearGradient(-200, -240, 200, 160); bg.addColorStop(0, '#ffd1f4'); bg.addColorStop(1, '#bfe6ff'); c.fillStyle = bg; c.fillRect(-200, -240, 400, 400);
      const av = await load(isRobot ? ART.robotURI : ART.humanURI); if (av) c.drawImage(av, -150, -235, 300, 375);
    }
    c.restore();
    c.fillStyle = '#2a0a5e'; c.font = `800 46px ${FONT}`; c.fillText((d.nickname || (isRobot ? 'Robot' : 'Human')).slice(0, 18), 0, 225);
    c.restore();

    // Verdict + chips
    g = c.createLinearGradient(560, 0, 1020, 0); g.addColorStop(0, '#ff5be0'); g.addColorStop(1, '#46d0ff');
    c.fillStyle = g; c.textAlign = 'left'; c.font = `italic 900 78px ${BLACK}`;
    c.fillText(isRobot ? 'ROBOT' : 'HUMAN', 560, 400); c.fillText(isRobot ? 'DETECTED!' : 'CONFIRMED!', 560, 486);
    [['Declared identity', d.declared], ['Verified identity', d.verified]].forEach(([k, v], i) => {
      const y = 540 + i * 78; c.fillStyle = 'rgba(120,70,255,.45)'; rr(c, 560, y, 450, 62, 31); c.fill(); c.strokeStyle = 'rgba(207,194,255,.6)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#fff'; c.font = `700 28px ${FONT}`; c.fillText(`${k}: ${v}`, 586, y + 41);
    });

    // Panel
    c.fillStyle = 'rgba(30,16,100,.7)'; rr(c, 70, 840, 940, 415, 30); c.fill(); c.strokeStyle = 'rgba(173,150,255,.55)'; c.lineWidth = 3; c.stroke();
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = `800 44px ${FONT}`; c.fillText(`Verified Score: ${d.scoreLabel}`, W / 2, 915);
    c.fillStyle = '#cfc2ff'; c.font = `700 30px ${FONT}`; c.fillText('Final Category', W / 2, 980);
    heart(c, 150, 1050, 4, '#ff2bd6'); heart(c, 930, 1050, 4, '#ff2bd6');
    c.fillStyle = '#ff5be0'; c.shadowColor = 'rgba(255,43,214,.8)'; c.shadowBlur = 18; c.font = `italic 900 54px ${BLACK}`; c.fillText(d.category, W / 2, 1062); c.shadowBlur = 0;
    c.fillStyle = '#e9e2ff'; c.font = `500 31px ${FONT}`; wrap(c, d.description || '', W / 2, 1130, 840, 44, 3);
    c.fillStyle = 'rgba(207,194,255,.8)'; c.font = `500 25px ${FONT}`; c.fillText('Just for fun. Not a real identity test.', W / 2, 1305);
    return cv;
  };
})();
