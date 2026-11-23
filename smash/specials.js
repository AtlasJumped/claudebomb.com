// Fennsmash special powers: three dragons, a dog pack, an ant army, a drone swarm.
// Drawing happens in world units (y up). Every character is an original design for this game.
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  var R = Math.random;
  function rr(a, b) { return a + R() * (b - a); }

  function aliveLinks(w) { var o = [], i; for (i = 0; i < w.links.length; i++) if (!w.links[i].broken && !w.links[i].a.dead && !w.links[i].b.dead) o.push(w.links[i]); return o; }
  function mid(l) { return { x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 }; }
  function bbox(w) {
    var L = aliveLinks(w); if (!L.length) return null; var b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    L.forEach(function (l) { [l.a, l.b].forEach(function (n) { b.x0 = Math.min(b.x0, n.x); b.x1 = Math.max(b.x1, n.x); b.y0 = Math.min(b.y0, n.y); b.y1 = Math.max(b.y1, n.y); }); });
    return b;
  }
  function armsDown(g) { return g.mult(); }

  // ------------------------------------------------------------------ dragons (the Fenwyrm design)
  var DRAGON_COLORS = [
    { a: '#1fb5a3', b: '#0d6f7a', belly: '#f6e7b4', wing: 'rgba(90,240,214,0.55)', glow: '#9ffcf0' },
    { a: '#8d5bd6', b: '#4a2b8f', belly: '#f3d9ff', wing: 'rgba(200,150,255,0.55)', glow: '#e1c4ff' },
    { a: '#e07b2e', b: '#9c3a14', belly: '#ffe3a8', wing: 'rgba(255,190,90,0.55)', glow: '#ffe08a' }
  ];
  function Dragon(g, k, bb) {
    this.k = k; this.col = DRAGON_COLORS[k]; this.seg = []; this.n = 18; this.len = 15;
    var sy = 280 + k * 70, sx = -140 - k * 90;
    for (var i = 0; i < this.n; i++) this.seg.push({ x: sx - i * this.len, y: sy });
    this.state = 'arrive'; this.t = 0; this.burnT = 5.2 + k * 0.4; this.aim = null; this.retarget = 0; this.flap = R() * 6;
    this.hover = { x: bb.x0 - 120 - k * 14, y: bb.y1 + 40 + (k - 1) * 46 };
    this.breath = false; this.fireAcc = 0; this.vx = 0; this.vy = 0;
    this.dir = 1;
  }
  Dragon.prototype.update = function (dt, g) {
    var h = this.seg[0], w = g.world, bb = bbox(w) || { x0: 600, x1: 700, y0: 0, y1: 100 };
    this.t += dt; this.flap += dt * (this.state === 'burn' ? 6 : 9);
    var tx, ty, sp = 340;
    if (this.state === 'arrive') { tx = this.hover.x; ty = this.hover.y; if (Math.hypot(tx - h.x, ty - h.y) < 24) { this.state = 'burn'; this.t = 0; g.sfx('roar'); } }
    else if (this.state === 'burn') {
      var wob = this.t * 1.3 + this.k; tx = this.hover.x + Math.sin(wob) * 28; ty = this.hover.y + Math.cos(wob * 1.2) * 20; sp = 160;
      this.retarget -= dt;
      if (this.retarget <= 0 || !this.aim) {
        var L = aliveLinks(w); if (L.length) { var l = L[(R() * L.length) | 0], m = mid(l); this.aim = { x: m.x, y: m.y }; } this.retarget = rr(0.5, 0.9);
      }
      this.breath = true;
      if (this.t > this.burnT || !this.aim) { this.state = 'leave'; this.breath = false; }
    } else { tx = 1700; ty = 520 + this.k * 60; sp = 420; this.breath = false; if (h.x > 1500) this.done = true; }
    var dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, sp * dt);
    h.x += dx / d * st; h.y += dy / d * st + Math.sin(this.flap * 0.5) * 0.4;
    for (var i = 1; i < this.n; i++) {
      var p = this.seg[i - 1], s = this.seg[i], ddx = s.x - p.x, ddy = s.y - p.y, dd = Math.hypot(ddx, ddy) || 1;
      s.x = p.x + ddx / dd * this.len; s.y = p.y + ddy / dd * this.len + Math.sin(this.t * 4 + i * 0.5) * 0.18;
    }
    if (this.breath && this.aim) {
      var mx = h.x + 12, my = h.y - 2, ax = this.aim.x - mx, ay = this.aim.y - my, ad = Math.hypot(ax, ay) || 1;
      this.fireAcc += dt * 90;
      var rd = g.reduced ? 0.4 : 1;
      while (this.fireAcc >= 1) {
        this.fireAcc -= 1 / rd;
        var sp2 = rr(300, 420), spread = rr(-0.14, 0.14), cs = Math.cos(spread), sn = Math.sin(spread);
        var ux = (ax / ad) * cs - (ay / ad) * sn, uy = (ax / ad) * sn + (ay / ad) * cs;
        FS.Particles.fire(mx, my, ux * sp2, uy * sp2, rr(6, 12), Math.min(0.6, ad / sp2 + 0.12));
      }
      // fire lands where the dragon aims; the blaze spreads a little around it
      var mult = armsDown(g), rate = 1.25 * mult * (1 + 0.03 * g.level.index);
      var links = w.links, i2, l2, s2;
      for (i2 = 0; i2 < links.length; i2++) {
        l2 = links[i2]; if (l2.broken) continue; s2 = FS.segDist(l2, this.aim.x, this.aim.y);
        if (s2.d < 46) { var f = 1 - s2.d / 46; w.damage(l2, rate * f * dt * (l2.M.flam > 0.3 ? 1 : 0.7), 'fire'); l2.burn = 1.6; l2.heat = 1; }
      }
      if (R() < dt * 3) g.sfx('fire');
    }
  };
  Dragon.prototype.draw = function (c, g) {
    var S = this.seg, n = this.n, col = this.col, i, h = S[0];
    var ang = Math.atan2(S[0].y - S[2].y, S[0].x - S[2].x);
    // far wing, then body, then near wing
    this.wing(c, S[3], ang, 0.55, g);
    // body tube: tapered strokes
    for (i = n - 1; i >= 1; i--) {
      var t = i / n, r = 13 * (1 - t) * (1 - t * 0.3) + 3.2;
      var a = S[i], b = S[i - 1];
      c.lineCap = 'round'; c.strokeStyle = col.b; c.lineWidth = r * 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      c.strokeStyle = col.a; c.lineWidth = r * 1.45; c.beginPath(); c.moveTo(a.x, a.y + r * 0.18); c.lineTo(b.x, b.y + r * 0.18); c.stroke();
      c.strokeStyle = col.belly; c.lineWidth = r * 0.55; c.beginPath(); c.moveTo(a.x, a.y - r * 0.55); c.lineTo(b.x, b.y - r * 0.55); c.stroke();
      if (i % 2 === 0 && i < n - 2) { // dorsal fins
        var nx = (b.y - a.y), ny = -(b.x - a.x), nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        c.fillStyle = col.glow; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(a.x + nx * r * 0.9, a.y + ny * r * 0.9); c.lineTo(a.x + nx * (r + 7) - (b.x - a.x) * 0.25, a.y + ny * (r + 7) - (b.y - a.y) * 0.25); c.lineTo(b.x + nx * r * 0.9, b.y + ny * r * 0.9); c.fill(); c.globalAlpha = 1;
      }
    }
    // tail fan: a little tensioned spade
    var tl = S[n - 1], tp = S[n - 2], ta = Math.atan2(tl.y - tp.y, tl.x - tp.x);
    c.save(); c.translate(tl.x, tl.y); c.rotate(ta); c.fillStyle = col.glow; c.globalAlpha = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(14, 9); c.lineTo(22, 0); c.lineTo(14, -9); c.closePath(); c.fill(); c.globalAlpha = 1; c.restore();
    // head
    c.save(); c.translate(h.x, h.y); c.rotate(ang);
    var gr = c.createLinearGradient(0, 12, 0, -12); gr.addColorStop(0, col.belly); gr.addColorStop(0.35, col.a); gr.addColorStop(1, col.b);
    c.fillStyle = gr; c.beginPath(); c.moveTo(-8, 11); c.quadraticCurveTo(0, 15, 20, 5); c.lineTo(23, 0); c.lineTo(18, -3); c.quadraticCurveTo(6, -13, -8, -11); c.closePath(); c.fill();
    c.fillStyle = col.b; c.beginPath(); c.moveTo(-4, 10); c.lineTo(-18, 20); c.lineTo(-6, 4); c.fill(); // horn lower
    c.beginPath(); c.moveTo(-4, -9); c.lineTo(-22, -18); c.lineTo(-7, -3); c.fill(); // horn upper
    c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(6, -4, 3.2, 0, 6.3); c.fill(); c.fillStyle = '#d4411e'; c.beginPath(); c.arc(7, -4, 1.5, 0, 6.3); c.fill();
    if (this.breath) { c.fillStyle = 'rgba(255,190,80,0.9)'; c.beginPath(); c.arc(22, 0, 5 + Math.sin(this.t * 40) * 1.5, 0, 6.3); c.fill(); }
    c.restore();
    this.wing(c, S[3], ang, 1, g);
  };
  Dragon.prototype.wing = function (c, s, ang, scale, g) {
    var col = this.col, f = Math.sin(this.flap) * 0.55, base = 1.25 + f; // wing angle above the back
    var span = 70 * scale, i;
    c.save(); c.translate(s.x, s.y + 6); c.rotate(ang - Math.PI / 2 * 0 );
    c.rotate(0);
    // four finger struts radiate from the shoulder; the membrane is stretched between them (a tiny tensegrity)
    var tips = [];
    for (i = 0; i < 4; i++) { var a = base + 0.3 - i * 0.42 + Math.PI * 0.5 * 0; var L = span * (0.75 + 0.25 * (i === 1 ? 1 : 0.8)); tips.push({ x: Math.cos(a + Math.PI / 2 - 0.2) * L * 0.9 - 24 * (i * 0.25), y: Math.sin(a + Math.PI / 2 - 0.2) * L }); }
    c.fillStyle = col.wing; c.strokeStyle = col.glow; c.lineWidth = 1.2; c.globalAlpha = scale < 1 ? 0.55 : 0.9;
    c.beginPath(); c.moveTo(0, 0); for (i = 0; i < tips.length; i++) c.lineTo(tips[i].x, tips[i].y);
    for (i = tips.length - 1; i >= 0; i--) { /* scalloped trailing edge */ }
    c.closePath(); c.fill();
    c.beginPath(); for (i = 0; i < tips.length; i++) { c.moveTo(0, 0); c.lineTo(tips[i].x, tips[i].y); } c.stroke();
    c.beginPath(); for (i = 0; i < tips.length - 1; i++) { c.moveTo(tips[i].x, tips[i].y); c.quadraticCurveTo((tips[i].x + tips[i + 1].x) / 2 - 6, (tips[i].y + tips[i + 1].y) / 2 - 6, tips[i + 1].x, tips[i + 1].y); } c.stroke();
    c.globalAlpha = 1; c.restore();
  };

  // ------------------------------------------------------------------ dogs
  function Dog(g, k) {
    this.k = k; this.x = -30 - k * 46; this.y = 0; this.vx = 0; this.vy = 0; this.state = 'run'; this.face = 1; this.ph = R() * 6;
    this.col = ['#b97d4a', '#6b6f7a', '#e9d3a2', '#7a4f33', '#c9a066', '#4a4a52'][k % 6]; this.sp = rr(250, 310); this.link = null; this.bt = 0; this.life = 11; this.sz = rr(0.9, 1.15);
  }
  Dog.prototype.update = function (dt, g) {
    var w = g.world; this.ph += dt * 14; this.life -= dt; var gr = 900 * w.gScale;
    if (this.life <= 0) { this.done = true; return; }
    if (this.state === 'run') {
      this.x += this.sp * dt; this.y = 0;
      if (this.x >= g.cliffEdge - 18) { var dist = g.islandX0 + 14 - this.x, vxj = Math.max(this.sp, dist / 0.95), T = dist / vxj; this.vx = vxj; this.vy = 0.5 * gr * T; this.state = 'air'; g.sfx('bark'); }
    } else if (this.state === 'air' || this.state === 'leap') {
      this.vy -= gr * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y <= 0 && w.onPlatform(this.x)) { this.y = 0; this.vy = 0; this.state = 'seek'; this.vx = 0; }
      else if (this.y < FS.WATER_Y && !w.onPlatform(this.x)) { FS.Particles.splash(this.x, FS.WATER_Y, 220, 2); g.sfx('splash'); this.done = true; }
      else if (this.state === 'leap') { var l = this.link; if (l && !l.broken) { var s = FS.segDist(l, this.x, this.y); if (s.d < 16) { this.state = 'bite'; this.bt = 0; } } }
    } else if (this.state === 'seek') {
      var L = aliveLinks(w), best = null, bd = 1e9, i;
      if (!this.link || this.link.broken) {
        for (i = 0; i < L.length; i++) { var m = mid(L[i]), d = Math.abs(m.x - this.x) + Math.max(0, m.y - 140) * 2 + R() * 30; if (d < bd) { bd = d; best = L[i]; } }
        this.link = best; if (!best) { this.done = true; return; }
      }
      var sp = FS.segDist(this.link, this.x, 14), tx = sp.px, ty = sp.py; this.face = tx >= this.x ? 1 : -1;
      var s2 = FS.segDist(this.link, this.x, this.y + 8);
      if (s2.d < 20) { this.state = 'bite'; this.bt = 0; }
      else if (Math.abs(tx - this.x) > 18) this.x += this.face * 240 * dt;
      else if (this.y <= 0) { this.state = 'leap'; this.vx = this.face * 40; this.vy = Math.min(620, 220 + Math.max(0, ty - 10) * 4.6); g.sfx('bark'); }
    } else if (this.state === 'bite') {
      var lk = this.link; if (!lk || lk.broken) { this.state = 'air'; this.vx = this.face * 40; this.vy = 80; this.link = null; this.after = 'seek'; return; }
      var s3 = FS.segDist(lk, this.x, this.y); this.bt += dt;
      this.x += (s3.px - this.x) * Math.min(1, dt * 14); this.y += (s3.py - 8 - this.y) * Math.min(1, dt * 14);
      var rate = 1.7 * g.mult() * (1 + 0.03 * g.level.index); w.damage(lk, rate * dt, 'bite');
      var jerk = Math.sin(this.bt * 26) * 260; w.impulse(lk.a, jerk * this.face, 0, dt); w.impulse(lk.b, -jerk * this.face * 0.4, 0, dt);
      if (R() < dt * 9) { FS.Particles.chip(s3.px, s3.py, lk.M.strut, 90); g.sfx('bark'); }
    }
    if (this.state === 'air' && this.after === 'seek' && this.y <= 0) { this.state = 'seek'; this.after = null; }
  };
  Dog.prototype.draw = function (c) {
    var s = this.sz, f = this.face || 1, ph = this.ph, run = this.state === 'run' || this.state === 'seek';
    c.save(); c.translate(this.x, this.y + 11 * s); c.scale(f * s, s);
    var bob = run ? Math.sin(ph * 2) * 1.8 : 0, ang = this.state === 'air' || this.state === 'leap' ? Math.atan2(this.vy, Math.abs(this.vx) + 1) * 0.5 : 0;
    c.rotate(ang);
    function leg(x, o) { c.strokeStyle = '#2a2018'; c.lineWidth = 4; c.lineCap = 'round'; var sw = run ? Math.sin(ph + o) * 9 : 5; c.beginPath(); c.moveTo(x, bob - 2); c.lineTo(x + sw, -11); c.stroke(); }
    leg(-8, 0); leg(8, 3.1);
    c.fillStyle = this.col; c.beginPath(); c.ellipse(0, bob, 15, 8, 0, 0, 6.3); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, bob - 3, 13, 4, 0, 0, 6.3); c.fill();
    c.fillStyle = this.col; c.beginPath(); c.ellipse(15, bob + 5, 7.5, 6.2, 0, 0, 6.3); c.fill();      // head
    c.fillStyle = '#2a2018'; c.beginPath(); c.ellipse(22, bob + 3.5, 3.2, 2.4, 0, 0, 6.3); c.fill();    // snout
    c.beginPath(); c.moveTo(11, bob + 8); c.lineTo(9, bob + 17); c.lineTo(15, bob + 10); c.fill();      // ear
    c.fillStyle = '#fff'; c.beginPath(); c.arc(17, bob + 6.3, 1.6, 0, 6.3); c.fill();
    if (this.state === 'bite') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(20, bob + 2); c.lineTo(22, bob - 1); c.lineTo(24, bob + 2); c.fill(); }
    c.strokeStyle = this.col; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-14, bob + 2); c.quadraticCurveTo(-22, bob + 8 + Math.sin(ph * 1.5) * 4, -23, bob + 14); c.stroke();
    leg(-5, 3.1 + 1.5); leg(11, 1.5);
    c.restore();
  };

  // ------------------------------------------------------------------ ants
  function Ant(g, k) {
    var x0 = g.islandX0 + 8;
    this.x = x0 + R() * (g.structCx - x0 + 60); this.y = 0; this.state = 'walk'; this.link = null; this.t = 0.5; this.dir = 1; this.sp = rr(34, 60); this.ph = R() * 6; this.delay = k * 0.07; this.face = R() < 0.5 ? 1 : -1; this.life = 9.5; this.ang = 0; this.vy = 0; this.vx = 0;
  }
  Ant.prototype.update = function (dt, g) {
    var w = g.world; this.ph += dt * 18; this.life -= dt;
    if (this.delay > 0) { this.delay -= dt; return; }
    if (this.life <= 0) { this.done = true; return; }
    var i, l;
    if (this.state === 'walk') {
      var bestL = null, bd = 1e9; // head for the nearest link that reaches low enough
      for (i = 0; i < w.links.length; i++) { l = w.links[i]; if (l.broken || l.type === 'cable' && false) continue; var m = Math.min(l.a.y, l.b.y); if (m > 40) continue; var s = FS.segDist(l, this.x, 6); if (s.d < bd) { bd = s.d; bestL = l; } }
      if (!bestL) { this.done = true; return; }
      var sp = FS.segDist(bestL, this.x, 6), dx = sp.px - this.x; this.face = dx >= 0 ? 1 : -1; this.ang = 0; this.y = 0;
      if (bd < 9) { this.state = 'link'; this.link = bestL; this.t = sp.t; this.dir = Math.random() < 0.8 ? 1 : -1; }
      else this.x += this.face * this.sp * 1.4 * dt;
    } else if (this.state === 'link') {
      l = this.link; if (!l || l.broken) { this.state = 'fall'; this.vx = rr(-30, 30); this.vy = 20; return; }
      var len = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) || 1; this.t += this.dir * this.sp * dt / len;
      var rate = 0.1 * g.mult() * (1 + 0.03 * g.level.index); w.damage(l, rate * dt, 'chew');
      if (R() < dt * 1.2) g.sfx('ant');
      if (this.t > 1 || this.t < 0) {
        var node = this.t > 1 ? l.b : l.a, opts = [];
        for (i = 0; i < w.links.length; i++) { var q = w.links[i]; if (!q.broken && q !== l && (q.a === node || q.b === node)) opts.push(q); }
        if (!opts.length) { this.dir = -this.dir; this.t = Math.max(0, Math.min(1, this.t)); }
        else { opts.sort(function (a, b) { return Math.max(b.a.y, b.b.y) - Math.max(a.a.y, a.b.y); }); var nl = R() < 0.6 ? opts[0] : opts[(R() * opts.length) | 0]; this.link = nl; this.t = nl.a === node ? 0 : 1; this.dir = nl.a === node ? 1 : -1; }
      }
      l = this.link; this.x = l.a.x + (l.b.x - l.a.x) * this.t; this.y = l.a.y + (l.b.y - l.a.y) * this.t + 4; this.ang = Math.atan2((l.b.y - l.a.y) * this.dir, (l.b.x - l.a.x) * this.dir); this.face = 1;
    } else if (this.state === 'fall') {
      this.vy -= 900 * w.gScale * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.ang += dt * 8;
      if (this.y <= 0 && w.onPlatform(this.x)) { this.y = 0; this.state = 'walk'; this.ang = 0; }
      else if (this.y < FS.WATER_Y && !w.onPlatform(this.x)) this.done = true;
    }
  };
  Ant.prototype.draw = function (c) {
    if (this.delay > 0) return;
    var ph = this.ph; c.save(); c.translate(this.x, this.y + 2); c.rotate(this.ang); c.scale(this.face, 1);
    c.strokeStyle = '#2a1209'; c.lineWidth = 1; c.beginPath();
    for (var i = -1; i <= 1; i++) { var sw = Math.sin(ph + i * 2) * 2.2; c.moveTo(i * 2, 1); c.lineTo(i * 2 + sw, -4); c.moveTo(i * 2, 1); c.lineTo(i * 2 - sw, 6); }
    c.stroke();
    c.fillStyle = '#a63a14'; c.beginPath(); c.ellipse(-5.5, 1.5, 3.8, 2.8, 0, 0, 6.3); c.fill();
    c.fillStyle = '#c4501e'; c.beginPath(); c.ellipse(0, 1.5, 2.3, 1.9, 0, 0, 6.3); c.fill();
    c.fillStyle = '#7d2808'; c.beginPath(); c.ellipse(4.6, 1.8, 2.4, 2.1, 0, 0, 6.3); c.fill();
    c.restore();
  };

  // ------------------------------------------------------------------ drone swarm
  function Drone(g, k, bb) {
    this.k = k; this.x = -60 - k * 36; this.y = rr(240, 420); this.state = 'arrive'; this.ph = R() * 6; this.target = null; this.wait = 0.5 + k * 0.45; this.t = 0; this.vx = 0; this.vy = 0;
    this.home = { x: bb.x0 - 70 - (k % 3) * 28, y: bb.y1 + 30 + ((k / 3) | 0) * 38 };
  }
  Drone.prototype.update = function (dt, g) {
    var w = g.world; this.ph += dt * 40; this.t += dt;
    if (this.state === 'arrive') {
      var dx = this.home.x - this.x, dy = this.home.y - this.y, d = Math.hypot(dx, dy); var st = Math.min(d, 380 * dt); this.x += dx / d * st; this.y += dy / d * st;
      if (d < 8) { this.state = 'hover'; this.t = 0; g.sfx('buzz'); }
    } else if (this.state === 'hover') {
      this.y += Math.sin(this.t * 6 + this.k) * 0.3;
      if (this.t > this.wait) { var L = aliveLinks(w); if (!L.length) { this.done = true; return; } var l = L[(R() * L.length) | 0]; this.target = l; this.tt = 0.15 + R() * 0.75; this.state = 'dive'; g.sfx('buzz'); }
    } else if (this.state === 'dive') {
      var l2 = this.target; if (!l2 || l2.broken) { var L2 = aliveLinks(w); if (!L2.length) { this.done = true; return; } this.target = l2 = L2[(R() * L2.length) | 0]; }
      var tp = { x: l2.a.x + (l2.b.x - l2.a.x) * this.tt, y: l2.a.y + (l2.b.y - l2.a.y) * this.tt }, ddx = tp.x - this.x, ddy = tp.y - this.y, dd = Math.hypot(ddx, ddy) || 1;
      var sp = 520 * dt; this.x += ddx / dd * Math.min(dd, sp); this.y += ddy / dd * Math.min(dd, sp);
      if (dd < 14) { w.explode(tp.x, tp.y, 46, 1.7 * g.mult() * (1 + 0.03 * g.level.index), 260, 'drone'); this.done = true; }
    }
  };
  Drone.prototype.draw = function (c, g) {
    c.save(); c.translate(this.x, this.y); var tilt = this.state === 'dive' ? 0.3 : 0; c.rotate(tilt);
    if (this.state === 'dive' && this.target && !this.target.broken) { c.restore(); c.strokeStyle = 'rgba(255,90,90,0.5)'; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(this.x, this.y); var l = this.target; c.lineTo(l.a.x + (l.b.x - l.a.x) * this.tt, l.a.y + (l.b.y - l.a.y) * this.tt); c.stroke(); c.setLineDash([]); c.save(); c.translate(this.x, this.y); }
    c.fillStyle = '#2d3445'; c.fillRect(-9, -3, 18, 6); c.fillStyle = '#4d5a78'; c.fillRect(-9, 0, 18, 3);
    c.strokeStyle = '#1a1f2c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(-16, 3); c.moveTo(9, 0); c.lineTo(16, 3); c.stroke();
    var rx = [-16, 16];
    for (var i = 0; i < 2; i++) { c.fillStyle = 'rgba(170,220,255,0.5)'; c.beginPath(); c.ellipse(rx[i], 5, 10 * Math.abs(Math.cos(this.ph + i)) + 2, 1.6, 0, 0, 6.3); c.fill(); }
    c.fillStyle = this.state === 'dive' ? '#ff4a4a' : '#6cf5a6'; c.beginPath(); c.arc(0, -1, 2, 0, 6.3); c.fill();
    c.restore();
  };

  // ------------------------------------------------------------------ manager
  var Sp = FS.Specials = { list: [], kind: null, t: 0 };
  Sp.active = function () { return Sp.list.length > 0; };
  Sp.start = function (kind, g) {
    Sp.list = []; Sp.kind = kind; Sp.t = 0; var bb = bbox(g.world) || { x0: g.structCx - 80, x1: g.structCx + 80, y0: 0, y1: 160 }, i;
    if (kind === 'dragons') { for (i = 0; i < 3; i++) Sp.list.push(new Dragon(g, i, bb)); g.sfx('roar'); }
    if (kind === 'dogs') { for (i = 0; i < 6; i++) Sp.list.push(new Dog(g, i)); g.sfx('bark'); }
    if (kind === 'ants') { for (i = 0; i < 46; i++) Sp.list.push(new Ant(g, i)); }
    if (kind === 'drones') { for (i = 0; i < 9; i++) Sp.list.push(new Drone(g, i, bb)); g.sfx('buzz'); }
    Sp.total = Sp.list.length;
  };
  Sp.update = function (dt, g) {
    Sp.t += dt; var i; for (i = Sp.list.length - 1; i >= 0; i--) { Sp.list[i].update(dt, g); if (Sp.list[i].done) Sp.list.splice(i, 1); }
    if (Sp.t > 16) Sp.list.length = 0;
  };
  Sp.draw = function (c, g) { for (var i = 0; i < Sp.list.length; i++) Sp.list[i].draw(c, g); };
  Sp.stop = function () { Sp.list = []; };
})(typeof window !== 'undefined' ? window : globalThis);
