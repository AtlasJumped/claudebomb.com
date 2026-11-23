/* Original clips, drawn with code. Each draw(c, t, W) paints a W by W square at time t seconds. No outside footage. */
(function () {
  const TAU = Math.PI * 2;
  function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);

  function hallway(c, t, W) {
    const k = W / 720;
    c.save(); c.scale(k, k);
    c.fillStyle = '#0d0a1a'; c.fillRect(0, 0, 720, 720);
    const creep = 1 + 0.12 * Math.min(t, 4.2) / 4.2;
    c.translate(360, 360); c.scale(creep, creep); c.translate(-360, -360);
    // perspective walls
    c.strokeStyle = '#3a2a66'; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const s = 1 - i * 0.1, o = 360 * s;
      c.strokeRect(360 - o, 360 - o, o * 2, o * 2);
    }
    for (const [x, y] of [[0, 0], [720, 0], [0, 720], [720, 720]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(360, 360); c.stroke(); }
    // door at the end
    c.fillStyle = '#1d1538'; c.fillRect(320, 320, 80, 80);
    // flickering lamp
    const fl = (Math.sin(t * 31) + Math.sin(t * 17.3)) > 1.1 && t < 4.2 ? 0.15 : 1;
    const g = c.createRadialGradient(360, 120, 5, 360, 120, 300);
    g.addColorStop(0, 'rgba(255,210,63,' + (0.55 * fl) + ')'); g.addColorStop(1, 'rgba(255,210,63,0)');
    c.fillStyle = g; c.fillRect(0, 0, 720, 720);
    c.fillStyle = fl > 0.5 ? '#ffe27a' : '#5a4a2a'; c.beginPath(); c.arc(360, 120, 16, 0, TAU); c.fill();
    c.restore();
    c.save(); c.scale(k, k);
    if (t >= 4.1 && t < 4.5) { c.fillStyle = '#000'; c.fillRect(0, 0, 720, 720); }
    if (t >= 4.5) {
      const dt = t - 4.5, sh = dt < 1 ? 14 * (1 - dt) : 3;
      c.translate((Math.random() - .5) * sh, (Math.random() - .5) * sh);
      const sc = 0.55 + 0.6 * ease(dt / 0.18);
      c.fillStyle = dt < 0.12 ? '#fff' : '#ff2e63'; c.fillRect(-20, -20, 760, 760);
      c.translate(360, 380); c.scale(sc, sc);
      c.fillStyle = '#2b0d4a'; c.beginPath(); c.ellipse(0, 0, 300, 320, 0, 0, TAU); c.fill();
      c.fillStyle = '#6a2bd9';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 280, Math.sin(a) * 300); c.lineTo(Math.cos(a + .2) * 340, Math.sin(a + .2) * 360); c.lineTo(Math.cos(a + .4) * 280, Math.sin(a + .4) * 300); c.fill(); }
      const eyes = [[-130, -120, 70], [130, -120, 70], [0, -200, 46], [-210, -10, 36], [210, -10, 36]];
      for (const [x, y, r] of eyes) {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.fillStyle = '#111'; c.beginPath(); c.arc(x + Math.sin(t * 9) * r * .25, y + r * .1, r * .42, 0, TAU); c.fill();
      }
      c.fillStyle = '#12001f'; c.beginPath(); c.ellipse(0, 150, 200, 120 + Math.sin(t * 20) * 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff';
      for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 40 - 16, 60); c.lineTo(i * 40 + 16, 60); c.lineTo(i * 40, 120); c.fill(); }
    }
    c.restore();
  }

  function pop(c, t, W) {
    const k = W / 720;
    c.save(); c.scale(k, k);
    const bgc = c.createLinearGradient(0, 0, 0, 720); bgc.addColorStop(0, '#ffe9b0'); bgc.addColorStop(1, '#ff9ec0');
    c.fillStyle = bgc; c.fillRect(0, 0, 720, 720);
    const T0 = 4.6;
    if (t < T0) {
      const u = t / T0, r = 70 + 190 * u * u * 0.6 + 80 * u, wob = Math.sin(t * (8 + 20 * u)) * 6 * u;
      c.translate(360 + wob, 400 - 20 * u);
      c.strokeStyle = '#1b1033'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, r); c.quadraticCurveTo(-20, r + 90, 10, 330 - 10); c.stroke();
      c.fillStyle = '#ff4f8b'; c.beginPath(); c.ellipse(0, 0, r * .92, r, 0, 0, TAU); c.fill();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(0, r); c.lineTo(-14, r + 18); c.lineTo(14, r + 18); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-r * .35, -r * .35, r * .12, r * .22, -.6, 0, TAU); c.fill();
      c.strokeStyle = '#1b1033'; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, r * .92, r, 0, 0, TAU); c.stroke();
    } else {
      const dt = t - T0, R = rnd(7);
      if (dt < .08) { c.fillStyle = '#fff'; c.fillRect(0, 0, 720, 720); }
      const cols = ['#ff4f8b', '#ffd23f', '#3ddc97', '#4aa8ff', '#fff', '#b46bff'];
      for (let i = 0; i < 180; i++) {
        const a = R() * TAU, sp = 120 + R() * 520, rot = R() * TAU, w = 10 + R() * 14;
        const x = 360 + Math.cos(a) * sp * dt, y = 380 + Math.sin(a) * sp * dt + 520 * dt * dt;
        c.save(); c.translate(x, y); c.rotate(rot + dt * (R() * 12));
        c.fillStyle = cols[i % cols.length]; c.fillRect(-w / 2, -w / 4, w, w / 2); c.restore();
      }
      const s = 1 + Math.sin(dt * 14) * .04;
      c.save(); c.translate(360, 360); c.scale(s, s); c.fillStyle = '#1b1033'; c.font = '900 120px ui-sans-serif,Arial,sans-serif'; c.textAlign = 'center';
      c.fillText('SURPRISE', 0, 40); c.restore();
    }
    c.restore();
  }

  function tower(c, t, W) {
    const k = W / 720;
    c.save(); c.scale(k, k);
    c.fillStyle = '#bfe9ff'; c.fillRect(0, 0, 720, 720);
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(130, 120, 90, 30, 0, 0, TAU); c.ellipse(190, 105, 60, 28, 0, 0, TAU); c.fill();
    c.fillStyle = '#3ddc97'; c.fillRect(0, 620, 720, 100);
    const cols = ['#ff4f8b', '#ffd23f', '#4aa8ff', '#b46bff', '#ff8a4c', '#3ddc97', '#ff4f8b', '#ffd23f', '#4aa8ff'];
    const T0 = 4.2, bh = 62, bw = 150, R = rnd(3);
    const amp = Math.min(t, T0) / T0;
    for (let i = 0; i < 9; i++) {
      const baseY = 620 - bh * (i + 1);
      let x = 360 + Math.sin(t * 5 + i * .6) * 4 * amp * (i + 1) * .9, y = baseY, rot = 0;
      const vx = (R() - .5) * 260, vr = (R() - .5) * 6;
      if (t > T0) {
        const dt = (t - T0) - (8 - i) * -0.0; const d = Math.max(0, dt - (8 - i) * 0.05);
        x += vx * d + (i - 4) * 40 * d; y = Math.min(620 - bh, baseY + 420 * d * d * 1.2 - 150 * d * (i / 9)); rot = vr * d;
        if (y >= 620 - bh) { y = 620 - bh; }
      }
      c.save(); c.translate(x, y + bh / 2); c.rotate(rot); c.fillStyle = cols[i]; c.strokeStyle = '#1b1033'; c.lineWidth = 5;
      c.fillRect(-bw / 2, -bh / 2, bw, bh); c.strokeRect(-bw / 2, -bh / 2, bw, bh); c.restore();
    }
    if (t > T0 && t < T0 + .4) { c.fillStyle = 'rgba(255,255,255,' + (.6 - (t - T0) * 1.5) + ')'; c.fillRect(0, 0, 720, 720); }
    c.restore();
  }

  function launch(c, t, W) {
    const k = W / 720;
    c.save(); c.scale(k, k);
    const g = c.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#120a35'); g.addColorStop(1, '#5b2a8f');
    c.fillStyle = g; c.fillRect(0, 0, 720, 720);
    const R = rnd(11); c.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) { c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); c.fillRect(R() * 720, R() * 520, 3, 3); }
    c.globalAlpha = 1; c.fillStyle = '#2a2a3a'; c.fillRect(0, 640, 720, 80);
    const T0 = 3.4; let ry = 470, sh = 0;
    if (t > T0) { const d = t - T0; ry = 470 - 60 * d * d * 1.6 - 20 * d; sh = Math.min(6, 2 + d * 2); }
    c.save(); c.translate(360 + (t > T0 ? (Math.random() - .5) * sh : 0), ry);
    if (t > T0) { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-30, 150); c.lineTo(0, 150 + 90 + Math.random() * 50); c.lineTo(30, 150); c.fill(); c.fillStyle = '#ff5a36'; c.beginPath(); c.moveTo(-18, 150); c.lineTo(0, 150 + 50 + Math.random() * 30); c.lineTo(18, 150); c.fill(); }
    c.fillStyle = '#fff'; c.strokeStyle = '#1b1033'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, -110); c.quadraticCurveTo(48, -40, 40, 150); c.lineTo(-40, 150); c.quadraticCurveTo(-48, -40, 0, -110); c.fill(); c.stroke();
    c.fillStyle = '#ff4f8b'; c.beginPath(); c.moveTo(-40, 150); c.lineTo(-80, 190); c.lineTo(-36, 110); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(40, 150); c.lineTo(80, 190); c.lineTo(36, 110); c.fill(); c.stroke();
    c.fillStyle = '#4aa8ff'; c.beginPath(); c.arc(0, -10, 20, 0, TAU); c.fill(); c.stroke();
    c.restore();
    if (t < T0) {
      const n = Math.ceil(T0 - t - 0.4);
      if (n >= 1 && n <= 3) { const f = (T0 - 0.4 - t) % 1; c.save(); c.translate(360, 250); c.scale(1 + f * .25, 1 + f * .25); c.fillStyle = '#ffd23f'; c.font = '900 220px ui-sans-serif,Arial,sans-serif'; c.textAlign = 'center'; c.fillText(String(n), 0, 70); c.restore(); }
    } else if (t > 4.6) {
      const dt = t - 4.6, cols = ['#ff4f8b', '#ffd23f', '#3ddc97', '#4aa8ff', '#fff'];
      for (let b = 0; b < 3; b++) {
        const bx = [180, 540, 360][b], by = [180, 220, 120][b], tt = dt - b * .25; if (tt < 0) continue;
        for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, sp = 220 * Math.min(tt, 1.2); c.fillStyle = cols[(i + b) % 5]; c.globalAlpha = Math.max(0, 1 - tt * .7); c.fillRect(bx + Math.cos(a) * sp, by + Math.sin(a) * sp + 40 * tt * tt, 8, 8); }
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  window.REACTION_CLIPS = [
    { id: 'hallway', title: 'Dark hallway', note: 'A quiet scare', dur: 6, thumbT: 5.0, draw: hallway },
    { id: 'pop', title: 'Big pop', note: 'A balloon, then confetti', dur: 6, thumbT: 5.2, draw: pop },
    { id: 'tower', title: 'Block tower', note: 'It wobbles, then falls', dur: 6, thumbT: 4.9, draw: tower },
    { id: 'launch', title: 'Rocket launch', note: 'Countdown, then liftoff', dur: 6, thumbT: 5.4, draw: launch }
  ];
})();
