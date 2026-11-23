// Fen Smash physics: a small 2.5D position-based solver.
// Struts are rigid (they resist compression and stretch). Cables are tension only (they pull, never push).
// Everything breaks when its strain or accumulated damage passes a threshold set by its material.
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  var MATS = {
    tent:   { name: 'Tent', strutName: 'bamboo pole', cableName: 'rope', strut: '#e0c27a', strutDark: '#8d6a2c', cable: '#f4efe2',
              hp: 0.55, cableHp: 0.32, sb: 0.075, cb: 0.12, mass: 0.55, flam: 1.0, value: 10, w: 6, fabric: 'rgba(240,120,84,0.62)', fabric2: 'rgba(255,200,120,0.5)' },
    wood:   { name: 'Wood', strutName: 'timber', cableName: 'hemp rope', strut: '#c08a52', strutDark: '#6a4524', cable: '#e2d3a8',
              hp: 1.35, cableHp: 0.8, sb: 0.06, cb: 0.1, mass: 1.0, flam: 0.9, value: 20, w: 8, fabric: null },
    steel:  { name: 'Steel and cable', strutName: 'steel beam', cableName: 'steel cable', strut: '#b4bfcc', strutDark: '#47515e', cable: '#e6edf5',
              hp: 2.9, cableHp: 1.9, sb: 0.05, cb: 0.085, mass: 1.8, flam: 0.15, value: 35, w: 7, fabric: null },
    carbon: { name: 'Carbon', strutName: 'carbon tube', cableName: 'carbon cable', strut: '#39424f', strutDark: '#0c1016', cable: '#6ee7e0',
              hp: 4.4, cableHp: 3.2, sb: 0.045, cb: 0.075, mass: 0.8, flam: 0.05, value: 55, w: 7, fabric: 'rgba(110,231,224,0.16)', fabric2: 'rgba(110,231,224,0.3)' }
  };
  FS.MATS = MATS;

  var DAMP = 0.9988, ITER = 8, SUB = 3, WATER_Y = -34;
  FS.WATER_Y = WATER_Y;

  function World() {
    this.nodes = []; this.links = []; this.panels = []; this.platforms = []; this.proj = [];
    this.g = 900; this.gScale = 1; this.t = 0; this.grace = 0.8; this.cb = {}; this.bounds = { x0: -300, x1: 1600 };
  }
  World.prototype.node = function (x, y, inv, fixed, r) {
    var n = { x: x, y: y, px: x, py: y, inv: fixed ? 0 : inv, r: r || 5, fixed: !!fixed, dead: false, gt: 0, id: this.nodes.length };
    this.nodes.push(n); return n;
  };
  World.prototype.link = function (a, b, type, M, hs, pre) {
    var d = Math.hypot(a.x - b.x, a.y - b.y);
    var l = { a: a, b: b, type: type, rest: d * (type === 'cable' ? (pre || 0.97) : 1), len0: d, M: M, hs: hs,
      hp: (type === 'cable' ? M.cableHp : M.hp) * hs, dmg: 0, broken: false, burn: 0, heat: 0, w: type === 'cable' ? 2.4 : M.w, id: this.links.length, tension: 0 };
    this.links.push(l); return l;
  };
  World.prototype.onPlatform = function (x) {
    for (var i = 0; i < this.platforms.length; i++) { var p = this.platforms[i]; if (x > p.x0 - 2 && x < p.x1 + 2) return true; }
    return false;
  };
  World.prototype.breakLink = function (l, cause) {
    if (l.broken) return; l.broken = true;
    if (this.cb.onBreak) this.cb.onBreak(l, cause);
  };
  World.prototype.damage = function (l, amount, cause) {
    if (l.broken || amount <= 0) return;
    l.dmg += amount / l.hp;
    if (l.dmg >= 1) this.breakLink(l, cause || 'damage');
  };
  // closest point on a link to (x,y); returns {d, t, px, py}
  function segDist(l, x, y) {
    var ax = l.a.x, ay = l.a.y, bx = l.b.x, by = l.b.y, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    var t = L2 > 1e-6 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    var px = ax + dx * t, py = ay + dy * t;
    return { d: Math.hypot(x - px, y - py), t: t, px: px, py: py };
  }
  FS.segDist = segDist;

  World.prototype.impulse = function (n, dvx, dvy, h) { if (n.inv === 0 || n.dead) return; n.px -= dvx * h; n.py -= dvy * h; };

  World.prototype.explode = function (x, y, R, D, imp, kind) {
    var i, l, s, k;
    for (i = 0; i < this.links.length; i++) {
      l = this.links[i]; if (l.broken) continue;
      s = segDist(l, x, y); if (s.d > R) continue;
      k = 1 - s.d / R; this.damage(l, D * k * k * 1.25 + D * 0.1 * k, 'blast');
    }
    for (i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i]; if (n.inv === 0 || n.dead) continue;
      var dx = n.x - x, dy = n.y - y, d = Math.hypot(dx, dy); if (d > R * 1.3) continue;
      k = (1 - d / (R * 1.3)); var f = imp * k / (d || 1);
      this.impulse(n, dx * f, dy * f + imp * k * 0.3, 1 / 120);
    }
    if (this.cb.onExplode) this.cb.onExplode(x, y, R, kind);
  };

  World.prototype.step = function (dt) {
    var h = dt / SUB, s; for (s = 0; s < SUB; s++) this.sub(h); this.t += dt;
  };

  World.prototype.sub = function (h) {
    var g = this.g * this.gScale, nodes = this.nodes, links = this.links, i, n, l, it, dx, dy, d, st;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; if (n.inv === 0 || n.dead) continue;
      var vx = (n.x - n.px) * DAMP, vy = (n.y - n.py) * DAMP;
      var vm = Math.abs(vx) + Math.abs(vy); if (vm > 60 * h * 60) { var sc = 60 * h * 60 / vm; vx *= sc; vy *= sc; }
      n.px = n.x; n.py = n.y; n.x += vx; n.y += vy - g * h * h;
      if (n.gt > 0) n.gt -= h;
    }
    if (this.t > this.grace) {
      for (i = 0; i < links.length; i++) {
        l = links[i]; if (l.broken) continue;
        dx = l.b.x - l.a.x; dy = l.b.y - l.a.y; d = Math.sqrt(dx * dx + dy * dy) || 1e-6; st = (d - l.rest) / l.rest; l.tension = st;
        if (l.heat > 0) l.heat = Math.max(0, l.heat - h * 0.4);
        var cap = 1 - Math.min(0.5, l.dmg * 0.5);
        if (l.type === 'cable') { if (st > l.M.cb * l.hs0 * cap) this.breakLink(l, 'strain'); }
        else if (Math.abs(st) > l.M.sb * l.hs0 * cap) this.breakLink(l, 'strain');
      }
    }
    for (it = 0; it < ITER; it++) {
      for (i = 0; i < links.length; i++) {
        l = links[i]; if (l.broken) continue;
        if (l.a.dead || l.b.dead) { this.breakLink(l, 'sink'); continue; }
        dx = l.b.x - l.a.x; dy = l.b.y - l.a.y; d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        var diff;
        if (l.type === 'cable') { if (d <= l.rest) continue; diff = (d - l.rest) / d * 0.55; } else diff = (d - l.rest) / d;
        var wa = l.a.inv, wb = l.b.inv, ws = wa + wb; if (ws === 0) continue;
        var ka = wa / ws, kb = wb / ws;
        l.a.x += dx * diff * ka; l.a.y += dy * diff * ka; l.b.x -= dx * diff * kb; l.b.y -= dy * diff * kb;
      }
      for (i = 0; i < nodes.length; i++) { n = nodes[i]; if (n.inv === 0 || n.dead) continue; this.collideNode(n, h); }
    }
    this.stepProj(h);
  };

  World.prototype.collideNode = function (n, h) {
    var i, p;
    for (i = 0; i < this.platforms.length; i++) {
      p = this.platforms[i];
      if (n.x > p.x0 - 2 && n.x < p.x1 + 2 && n.y < n.r) {
        var v = (n.py - n.y) / h;
        if (v > 160 && n.gt <= 0) { n.gt = 0.25; if (this.cb.onGround) this.cb.onGround(n, v); }
        n.y = n.r; n.py = n.y + (n.py - n.y) * 0.0; n.px += (n.x - n.px) * 0.25; return;
      }
    }
    if (n.y < WATER_Y && !n.dead) {
      n.dead = true; if (this.cb.onSplash) this.cb.onSplash(n.x, WATER_Y, Math.abs(n.py - n.y) / h);
    }
  };

  World.prototype.stepProj = function (h) {
    var g = this.g * this.gScale, i, j, p, l, s;
    for (i = this.proj.length - 1; i >= 0; i--) {
      p = this.proj[i];
      if (p.kind === 'rocket' && p.thr > 0) { var sp0 = Math.hypot(p.vx, p.vy) || 1; p.vx += p.vx / sp0 * p.acc * h; p.vy += p.vy / sp0 * p.acc * h; p.thr -= h; }
      p.vy -= g * h * (p.gm == null ? 1 : p.gm);
      p.x += p.vx * h; p.y += p.vy * h; p.life -= h; p.rot += h * 6;
      var dead = false, sp = Math.hypot(p.vx, p.vy);
      if (p.life <= 0 || p.x < this.bounds.x0 || p.x > this.bounds.x1 || p.y > 2600) dead = true;
      if (!dead) {
        for (j = 0; j < this.links.length; j++) {
          l = this.links[j]; if (l.broken || (p.hit && p.hit[l.id])) continue;
          s = segDist(l, p.x, p.y); if (s.d > p.r + l.w * 0.5) continue;
          if (p.expl) { this.explode(p.x, p.y, p.R, p.D, p.imp, p.kind); dead = true; break; }
          if (!p.hit) p.hit = {};
          p.hit[l.id] = true; p.hits = (p.hits || 0) + 1;
          var dmg = p.m * sp * 0.001 * p.pm; this.damage(l, dmg * (l.type === 'cable' ? 1.0 : 1), 'hit');
          var mf = p.m / (p.m + 2.2) * 0.55, dvx = p.vx * mf, dvy = p.vy * mf;
          this.impulse(l.a, dvx * (1 - s.t), dvy * (1 - s.t), h); this.impulse(l.b, dvx * s.t, dvy * s.t, h);
          if (this.cb.onHit) this.cb.onHit(p, l, sp, s.px, s.py);
          p.vx *= p.slow; p.vy *= p.slow;
          if (p.hits >= p.pierce) { p.life = Math.min(p.life, 1.2); p.gm = 1; }
        }
      }
      if (!dead) {
        // ground and water
        if (p.y < p.r + 0 && this.onPlatform(p.x)) {
          if (p.expl) { this.explode(p.x, 0, p.R, p.D, p.imp, p.kind); dead = true; }
          else { p.y = p.r; p.vy = Math.abs(p.vy) * 0.3; p.vx *= 0.6; if (this.cb.onThud && sp > 150) this.cb.onThud(p, sp); if (Math.abs(p.vy) < 20 && Math.abs(p.vx) < 20) p.life = Math.min(p.life, 0.6); }
        } else if (p.y < WATER_Y && !this.onPlatform(p.x)) {
          if (this.cb.onSplash) this.cb.onSplash(p.x, WATER_Y, sp); dead = true;
        }
      }
      if (!dead && p.expl && p.kind !== 'meteor' && p.life < 0) dead = true;
      if (dead) { if (p.expl && p.life <= 0 && p.kind === 'rocket') this.explode(p.x, p.y, p.R, p.D, p.imp, p.kind); this.proj.splice(i, 1); }
    }
  };

  FS.World = World;
  FS.settled = function (w) {
    var m = 0, i, n;
    for (i = 0; i < w.nodes.length; i++) { n = w.nodes[i]; if (n.inv === 0 || n.dead) continue; m = Math.max(m, Math.hypot(n.x - n.px, n.y - n.py) * 180); }
    return m < 14;
  };

  // ---------------------------------------------------------------- builders
  function Builder(world, M, cx, hs) { this.w = world; this.M = M; this.cx = cx; this.hs = hs; this.links = []; }
  Builder.prototype.N = function (x, y) { return this.w.node(this.cx + x, y, 1 / this.M.mass, false, 5); };
  Builder.prototype.stake = function (x) { return this.w.node(this.cx + x, 3, 0, true, 3); };
  Builder.prototype.S = function (a, b) { var l = this.w.link(a, b, 'strut', this.M, this.hs); l.hs0 = this.hs; this.links.push(l); return l; };
  Builder.prototype.C = function (a, b, pre) { var l = this.w.link(a, b, 'cable', this.M, this.hs, pre); l.hs0 = this.hs; this.links.push(l); return l; };
  Builder.prototype.panel = function (nodes, links) { this.w.panels.push({ nodes: nodes, links: links }); };

  Builder.prototype.tower = function (sp) {
    var n = sp.n, W = sp.w, H = sp.h, tp = sp.taper || 0, x0 = sp.x || 0, L = [], R = [], y = 6, i;
    for (i = 0; i <= n; i++) { var wi = W * (1 - tp * i / n); L.push(this.N(x0 - wi / 2, y)); R.push(this.N(x0 + wi / 2, y)); y += H; }
    for (i = 0; i < n; i++) {
      var s1 = this.S(L[i], R[i + 1]), s2 = this.S(R[i], L[i + 1]);
      var c1 = this.C(L[i], L[i + 1], 0.975), c2 = this.C(R[i], R[i + 1], 0.975);
      var c3 = this.C(L[i], R[i], 0.955);
      this.panel([L[i], R[i], R[i + 1], L[i + 1]], [s1, s2, c1, c2, c3]);
    }
    this.C(L[n], R[n], 0.955);
    for (i = 0; i + 2 <= n; i++) { this.C(L[i], L[i + 2], 0.985); this.C(R[i], R[i + 2], 0.985); }
    var g = sp.guys == null ? 1 : sp.guys;
    for (i = 1; i <= g; i++) {
      var k = Math.max(1, Math.round(n * i / g)); var gx = (W * (1 - tp * k / n)) / 2 + 22 + 6 * k;
      var sl = this.stake(x0 - gx - 14), sr = this.stake(x0 + gx + 14);
      this.C(L[k], sl, 0.99); this.C(R[k], sr, 0.99);
    }
    return { L: L, R: R };
  };

  Builder.prototype.tents = function (sp) {
    var n = sp.n, W = sp.w, H = sp.h, b = [], a = [], i, x0 = sp.x || 0;
    for (i = 0; i <= n; i++) b.push(this.N(x0 - n * W / 2 + i * W, 6));
    for (i = 0; i < n; i++) a.push(this.N(x0 - n * W / 2 + i * W + W / 2, H));
    for (i = 0; i < n; i++) {
      var s1 = this.S(b[i], a[i]), s2 = this.S(b[i + 1], a[i]), c = this.C(b[i], b[i + 1], 0.93);
      this.panel([b[i], a[i], b[i + 1]], [s1, s2, c]);
      if (i > 0) this.C(a[i - 1], a[i], 0.97);
      var tip = this.N(x0 - n * W / 2 + i * W + W / 2, H + 34); this.S(a[i], tip); this.C(tip, b[i], 0.985); this.C(tip, b[i + 1], 0.985);
    }
    var sl = this.stake(x0 - n * W / 2 - 38), sr = this.stake(x0 + n * W / 2 + 38);
    this.C(a[0], sl, 0.99); this.C(a[n - 1], sr, 0.99);
    var sl2 = this.stake(x0 - n * W / 2 - 14), sr2 = this.stake(x0 + n * W / 2 + 14);
    this.C(b[0], sl2, 0.99); this.C(b[n], sr2, 0.99);
  };

  Builder.prototype.twin = function (sp) {
    var gap = sp.gap, i, A = this.tower({ n: sp.n, w: sp.w, h: sp.h, taper: sp.taper, x: -gap / 2, guys: 0 });
    var B = this.tower({ n: sp.n, w: sp.w, h: sp.h, taper: sp.taper, x: gap / 2, guys: 0 });
    for (i = 1; i <= sp.n; i++) this.C(A.R[i], B.L[i], 0.985);
    var wTop = sp.w * (1 - (sp.taper || 0));
    var sl = this.stake(-gap / 2 - wTop / 2 - 34), sr = this.stake(gap / 2 + wTop / 2 + 34);
    this.C(A.L[sp.n], sl, 0.99); this.C(B.R[sp.n], sr, 0.99);
    for (i = 1; i < sp.n; i++) this.C(A.R[i], B.L[i + 1], 0.99);
  };

  FS.buildStructure = function (world, spec, matKey, cx, hs) {
    var M = MATS[matKey], b = new Builder(world, M, cx, hs);
    if (spec.type === 'tents') b.tents(spec); else if (spec.type === 'twin') b.twin(spec); else b.tower(spec);
    return b.links;
  };

  if (typeof module !== 'undefined') module.exports = FS;
})(typeof window !== 'undefined' ? window : globalThis);
