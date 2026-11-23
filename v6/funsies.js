/* Funsies: shared big-effects engine for the claudebomb previews (v6 to v10).
   One canvas overlay (2D, additive glow) plus GPU-friendly DOM offsets (translate, rotate, scale, opacity).
   Everything is non-destructive: all inline styles are removed when the effect settles. No reload needed.
   Effects: meteors, burn, quake, lightning, tornado, plus a sparkle trail that works with touch drag. */
(function () {
'use strict';
if (window.__funsies) return;
window.__funsies = true;

var d = document, R = Math.random, PI2 = Math.PI * 2;
var fz = d.getElementById('fz'), fzb = d.getElementById('fzbtn'), fzp = d.getElementById('fzpanel');
if (!fz || !fzp) return;

var rmq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
var SMALL = Math.min(innerWidth, innerHeight) < 700;
var Q = SMALL ? 0.62 : 1;
var MAXP = SMALL ? 520 : 1000;
var USE_T = !(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px'));

function rand(a, b) { return a + R() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function dist(ax, ay, bx, by) { var x = ax - bx, y = ay - by; return Math.sqrt(x * x + y * y); }

/* ---------- canvas ---------- */
var cv = d.createElement('canvas');
cv.id = 'fxx'; cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:61;pointer-events:none';
d.body.appendChild(cv);
var cx = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
function size() {
  DPR = Math.min(window.devicePixelRatio || 1, SMALL ? 1.75 : 2);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
size();
addEventListener('resize', function () { size(); });

function mkSprite(r, g, b, n) {
  var c = d.createElement('canvas'); c.width = c.height = n || 64;
  var x = c.getContext('2d'), h = c.width / 2, gr = x.createRadialGradient(h, h, 0, h, h, h);
  gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
  gr.addColorStop(.28, 'rgba(' + r + ',' + g + ',' + b + ',.5)');
  gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
  x.fillStyle = gr; x.fillRect(0, 0, c.width, c.width); return c;
}
var SP = {
  fire: mkSprite(255, 120, 30), hot: mkSprite(255, 215, 130), red: mkSprite(210, 45, 12),
  blue: mkSprite(150, 190, 255), white: mkSprite(255, 255, 255), smoke: mkSprite(28, 24, 24),
  dust: mkSprite(125, 108, 92), grey: mkSprite(95, 100, 110)
};
var STARC = [[255, 120, 190], [255, 220, 90], [110, 240, 200], [120, 200, 255], [190, 150, 255], [255, 255, 255]];
var STARS = STARC.map(function (c) { return mkSprite(c[0], c[1], c[2]); });
function spr(s, x, y, n, a) { if (a <= 0.003) return; cx.globalAlpha = a > 1 ? 1 : a; cx.drawImage(s, x - n / 2, y - n / 2, n, n); }

function sprH(s, x, y, w, h, a) { if (a <= 0.003) return; cx.globalAlpha = a > 1 ? 1 : a; cx.drawImage(s, x - w / 2, y - h * .72, w, h); }
function toastMsg(m) {
  var t = d.getElementById('toast'); if (!t) return;
  t.textContent = m; t.classList.add('on'); clearTimeout(toastMsg.h);
  toastMsg.h = setTimeout(function () { t.classList.remove('on'); }, 3200);
}

/* ---------- targets (cards and words) ---------- */
var CARDSEL = '.card,.mockbox,.famcard,.tvset,.compose,.btn,.tag';
var T = [], WD = [], sx = 0, sy = 0;
function mkT(el, r, isWord) {
  var cs = isWord ? null : getComputedStyle(el);
  return {
    el: el, word: isWord, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height,
    cx: r.left + r.width / 2 + scrollX, cy: r.top + r.height / 2 + scrollY,
    rad: cs ? (parseFloat(cs.borderTopLeftRadius) || 0) : 0,
    ox: 0, oy: 0, vx: 0, vy: 0, rot: 0, vr: 0, sc: 1, gx: 0, gy: 0, gr: 0, gs: 1,
    fx: 0, fy: 0, fr: 0, op: 1, col: null, k: isWord ? 95 : 36, z: isWord ? .42 : .36,
    act: false, s1: '', s2: '', s3: '', s4: '', s5: '', ph: R() * PI2,
    burnAt: 1e9, igAt: 1e9, stage: 0, p: 0, ovl: 1, owner: null, words: [], dead: false, restored: false, rd: rand(-1, 1)
  };
}
function gather() {
  sx = scrollX; sy = scrollY; T = []; WD = [];
  var vw = innerWidth, vh = innerHeight, i, el, r;
  var cl = d.querySelectorAll(CARDSEL);
  for (i = 0; i < cl.length; i++) {
    el = cl[i]; if (el.closest('.fz,.win-ov,.hdr,.toast,[hidden]')) continue;
    r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 14 || r.bottom < -10 || r.top > vh + 10 || r.right < -10 || r.left > vw + 10) continue;
    T.push(mkT(el, r, false));
  }
  var wl = d.querySelectorAll('.w');
  for (i = 0; i < wl.length; i++) {
    el = wl[i]; r = el.getBoundingClientRect();
    if (r.width < 2 || r.bottom < -10 || r.top > vh + 10 || r.right < -10 || r.left > vw + 10) continue;
    if (el.closest('.fz,.win-ov,.hdr,.toast,[hidden]')) continue;
    WD.push(mkT(el, r, true));
  }
  /* each word belongs to the smallest card that contains it */
  WD.forEach(function (w) {
    var best = null, ba = 1e12;
    T.forEach(function (c) {
      if (w.cx > c.x && w.cx < c.x + c.w && w.cy > c.y && w.cy < c.y + c.h) { var a = c.w * c.h; if (a < ba) { ba = a; best = c; } }
    });
    if (best) { w.owner = best; best.words.push(w); }
  });
}
function wake(t) { if (!t.act) { t.act = true; if (!t.word) t.el.style.willChange = 'transform, opacity'; } }
function clean(t) {
  var s = t.el.style;
  s.translate = ''; s.rotate = ''; s.scale = ''; s.transform = ''; s.opacity = ''; s.color = ''; s.willChange = '';
  t.s1 = t.s2 = t.s3 = t.s4 = t.s5 = '';
}
function apply(t) {
  var X = t.ox + t.fx, Y = t.oy + t.fy, Rr = t.rot + t.fr, S = t.sc, s = t.el.style, a, b, c;
  if (USE_T) {
    a = (X > .05 || X < -.05 || Y > .05 || Y < -.05 || Rr || S !== 1) ?
      'translate(' + X.toFixed(1) + 'px,' + Y.toFixed(1) + 'px) rotate(' + Rr.toFixed(2) + 'deg) scale(' + S.toFixed(3) + ')' : '';
    if (a !== t.s1) { t.s1 = a; s.transform = a; }
  } else {
    a = (X > .05 || X < -.05 || Y > .05 || Y < -.05) ? X.toFixed(1) + 'px ' + Y.toFixed(1) + 'px' : '';
    if (a !== t.s1) { t.s1 = a; s.translate = a; }
    b = (Rr > .02 || Rr < -.02) ? Rr.toFixed(2) + 'deg' : '';
    if (b !== t.s2) { t.s2 = b; s.rotate = b; }
    c = (S > 1.002 || S < .998) ? S.toFixed(3) : '';
    if (c !== t.s3) { t.s3 = c; s.scale = c; }
  }
  a = t.op < .996 ? t.op.toFixed(3) : '';
  if (a !== t.s4) { t.s4 = a; s.opacity = a; }
  a = t.col || '';
  if (a !== t.s5) { t.s5 = a; s.color = a; }
}
function stepTargets(dt) {
  var n = dt > .024 ? 2 : 1, h = dt / n, i, j, t, arr, rest;
  for (j = 0; j < 2; j++) {
    arr = j ? WD : T;
    for (i = 0; i < arr.length; i++) {
      t = arr[i]; if (!t.act) continue;
      for (var k = 0; k < n; k++) {
        var c = 2 * t.z * Math.sqrt(t.k);
        t.vx += (-t.k * (t.ox - t.gx) - c * t.vx) * h; t.ox += t.vx * h;
        t.vy += (-t.k * (t.oy - t.gy) - c * t.vy) * h; t.oy += t.vy * h;
        t.vr += (-t.k * (t.rot - t.gr) - c * t.vr) * h; t.rot += t.vr * h;
        t.sc += (t.gs - t.sc) * Math.min(1, 9 * h);
      }
      rest = Math.abs(t.ox - t.gx) + Math.abs(t.oy - t.gy) < .06 && Math.abs(t.vx) + Math.abs(t.vy) < .2 &&
        Math.abs(t.rot - t.gr) < .03 && Math.abs(t.vr) < .1 && Math.abs(t.sc - t.gs) < .001 &&
        !t.fx && !t.fy && !t.fr && t.op >= .996 && !t.col && t.burnAt > 1e8 && t.igAt > 1e8 && !t.hold &&
        t.gx === 0 && t.gy === 0 && t.gr === 0 && t.gs === 1;
      if (rest) { t.act = false; t.ox = t.oy = t.rot = t.vx = t.vy = t.vr = 0; t.sc = 1; clean(t); }
      else apply(t);
    }
  }
}
function allRest() {
  for (var i = 0; i < T.length; i++) if (T[i].act) return false;
  for (i = 0; i < WD.length; i++) if (WD[i].act) return false;
  return true;
}
function resetForced() {
  var i; for (i = 0; i < T.length; i++) { T[i].fx = T[i].fy = T[i].fr = 0; }
  for (i = 0; i < WD.length; i++) { WD[i].fx = WD[i].fy = WD[i].fr = 0; }
}
function hardClean() {
  T.concat(WD).forEach(function (t) { t.act = false; clean(t); });
  T = []; WD = [];
}

/* ---------- particles ---------- */
var P = [];
function add(p) { if (P.length < MAXP || p.k === 'st' || p.k === 'sp') P.push(p); }
function flame(x, y, n) { add({ k: 'fl', x: x, y: y, vx: rand(-22, 22), vy: rand(-70, -150), g: -30, life: 0, max: rand(.45, .9), s: n || rand(22, 40) }); }
function ember(x, y, v) { add({ k: 'em', x: x, y: y, vx: rand(-v, v), vy: rand(-v * 1.4, -v * .2), g: 40, life: 0, max: rand(.9, 2.4), s: rand(3, 6), ph: R() * 6 }); }
function spark(x, y, v, c) { var a = R() * PI2, s = rand(.3, 1) * v; add({ k: 'sp', x: x, y: y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - v * .25, g: 700, life: 0, max: rand(.35, .8), c: c || 0 }); }
function smoke(x, y, n) { add({ k: 'sm', x: x, y: y, vx: rand(-20, 20), vy: rand(-45, -20), g: 0, life: 0, max: rand(1.2, 2.2), s: n || rand(40, 80) }); }
function dust(x, y, vx, vy, n, a) { add({ k: 'du', x: x, y: y, vx: vx, vy: vy, g: 20, life: 0, max: rand(.9, 1.7), s: n, a: a || .25 }); }
function shard(x, y, v) { var a = R() * PI2; add({ k: 'sh', x: x, y: y, vx: Math.cos(a) * v * R(), vy: Math.sin(a) * v * R() - v * .5, g: 900, life: 0, max: rand(.8, 1.5), s: rand(4, 9), r: R() * 6, vr: rand(-9, 9) }); }
function stepP(dt) {
  var i, p, w = 0;
  for (i = 0; i < P.length; i++) {
    p = P[i]; p.life += dt; if (p.life >= p.max) continue;
    p.vy += p.g * dt;
    if (p.k === 'sp') { p.px = p.x; p.py = p.y; }
    if (p.k === 'em') p.vx += Math.sin(p.life * 7 + p.ph) * 40 * dt;
    if (p.k === 'sm' || p.k === 'du') { p.vx *= (1 - dt * .8); p.vy *= (1 - dt * .6); }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.r += p.vr * dt;
    P[w++] = p;
  }
  P.length = w;
}
/* source-over particles */
function drawPBase() {
  cx.globalCompositeOperation = 'source-over';
  for (var i = 0; i < P.length; i++) {
    var p = P[i], u = p.life / p.max;
    if (p.k === 'sm') spr(SP.smoke, p.x, p.y, p.s * (1 + u * 1.2), .28 * (1 - u) * Math.min(1, u * 8));
    else if (p.k === 'du') spr(SP.dust, p.x, p.y, p.s * (1 + u), p.a * (1 - u) * Math.min(1, u * 10));
    else if (p.k === 'st') star(p.x, p.y, p.s * (1 - u * .45), Math.min(1, (1 - u) * 1.6), p.r + p.life * 2, p.c);
    else if (p.k === 'sh') {
      cx.globalAlpha = 1 - u * u; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.fillStyle = '#1b100b'; cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66);
      cx.fillStyle = 'rgba(255,110,30,' + (.9 * (1 - u)) + ')'; cx.fillRect(-p.s / 2, -p.s / 3, p.s, 1.5); cx.restore();
    }
  }
  cx.globalAlpha = 1;
}
function star(x, y, s, a, rot, ix) {
  var c = STARC[ix], col = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  spr(STARS[ix], x, y, s * 3, a * .6);
  cx.save(); cx.translate(x, y); cx.rotate(rot); cx.beginPath();
  for (var k = 0; k < 8; k++) { var r = k % 2 ? s * .24 : s, an = k * Math.PI / 4; cx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  cx.closePath(); cx.globalAlpha = a; cx.fillStyle = col; cx.fill();
  cx.lineWidth = 1.2; cx.strokeStyle = 'rgba(30,20,40,.55)'; cx.stroke();
  cx.beginPath();
  for (k = 0; k < 8; k++) { var r2 = (k % 2 ? s * .12 : s * .5); an = k * Math.PI / 4; cx.lineTo(Math.cos(an) * r2, Math.sin(an) * r2); }
  cx.closePath(); cx.fillStyle = '#fff'; cx.fill(); cx.restore();
}
/* additive particles */
function drawPGlow() {
  cx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < P.length; i++) {
    var p = P[i], u = p.life / p.max;
    if (p.k === 'fl') {
      var s = p.s * (1 - u * .55);
      sprH(u < .55 ? SP.fire : SP.red, p.x, p.y, s * 1.1, s * 2.3, .7 * (1 - u));
      if (u < .45) sprH(SP.hot, p.x, p.y, s * .55, s * 1.2, .85 * (1 - u * 2));
    } else if (p.k === 'em') {
      spr(SP.fire, p.x, p.y, p.s * 3.2, (1 - u) * (.6 + .4 * Math.sin(p.life * 30 + p.ph)));
    } else if (p.k === 'sp') {
      var col = p.c === 1 ? 'rgba(180,210,255,' : 'rgba(255,190,90,';
      cx.globalAlpha = 1 - u; cx.strokeStyle = col + '1)'; cx.lineWidth = 1.8;
      cx.beginPath(); cx.moveTo(p.px - p.vx * .02, p.py - p.vy * .02); cx.lineTo(p.x, p.y); cx.stroke();
      spr(p.c === 1 ? SP.blue : SP.hot, p.x, p.y, 10, 1 - u);
    }
  }
  cx.globalAlpha = 1;
}

/* ---------- effect engine ---------- */
var eff = [], raf = 0, lastNow = 0, trail = { on: false, lx: null, ly: null };
function kick() { if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(frame); } }
function frame(now) {
  raf = 0;
  var dt = Math.min(.05, (now - lastNow) / 1000 || .016); lastNow = now;
  sx = scrollX; sy = scrollY;
  resetForced();
  for (var i = 0; i < eff.length; i++) { eff[i].t += dt; eff[i].update(dt); }
  eff = eff.filter(function (e) { if (e.done && e.end) e.end(); return !e.done; });
  stepTargets(dt); stepP(dt);
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cx.clearRect(0, 0, W, H);
  cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
  eff.forEach(function (e) { e.draw(0); });
  drawPBase();
  cx.globalCompositeOperation = 'lighter';
  eff.forEach(function (e) { e.draw(1); });
  drawPGlow();
  cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
  if (eff.length || P.length || !allRest()) { raf = requestAnimationFrame(frame); }
  else { cx.clearRect(0, 0, W, H); hardClean(); window.__fxBusy = false; }
}
function begin() { cancelAll(); gather(); }
function start(e) {
  window.__fxBusy = true;
  e.t = 0; e.done = false; eff.push(e); kick();
}
function cancelAll() {
  eff.forEach(function (e) { if (e.end) e.end(true); });
  eff = []; P = []; hardClean(); cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, H);
}

/* ---------- drawing helpers ---------- */
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); cx.beginPath();
  cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
}
function cardXform(c) {
  var X = c.ox + c.fx, Y = c.oy + c.fy, Rr = (c.rot + c.fr) * Math.PI / 180, ccx = c.cx - sx, ccy = c.cy - sy;
  cx.translate(ccx + X, ccy + Y); cx.rotate(Rr); cx.scale(c.sc, c.sc); cx.translate(-ccx, -ccy);
}
function blob(ox, oy, r, sd, n) {
  var pts = [];
  for (var i = 0; i < n; i++) {
    var a = i / n * PI2, k = 1 + .2 * Math.sin(3 * a + sd[0]) + .12 * Math.sin(7 * a + sd[1]) + .07 * Math.sin(13 * a + sd[2]);
    pts.push([ox + Math.cos(a) * r * k, oy + Math.sin(a) * r * k]);
  }
  return pts;
}
function polyPath(pts) { cx.beginPath(); for (var i = 0; i < pts.length; i++) cx[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]); cx.closePath(); }
function line(pts, upto) {
  cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length && i <= (upto || pts.length); i++) cx.lineTo(pts[i][0], pts[i][1]);
}

/* ---------- fire engine (shared by meteors and burn) ---------- */
var BD = 1.5; /* seconds for fire to cross a card */
function igniteWord(w, at) { if (at < w.igAt) w.igAt = at; }
function igniteCard(c, ox, oy, at, fire) {
  if (c.burnAt < 1e8) return;
  c.burnAt = at; c.ipx = clamp(ox, c.x, c.x + c.w); c.ipy = clamp(oy, c.y, c.y + c.h);
  var mr = 0, cs = [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h]];
  cs.forEach(function (p) { mr = Math.max(mr, dist(c.ipx, c.ipy, p[0], p[1])); });
  c.maxR = mr * 1.2 + 8; c.sd = [R() * 6, R() * 6, R() * 6];
  c.words.forEach(function (w) { igniteWord(w, at + dist(c.ipx, c.ipy, w.cx, w.cy) / c.maxR * BD + R() * .1); });
  fire.end = Math.max(fire.end, at + BD * .9 + .9);
  wake(c);
}
function fireUpdate(fire, dt) {
  var t = fire.t, i, c, w, lt;
  for (i = 0; i < T.length; i++) {
    c = T[i]; if (c.burnAt > 1e8 || c.restored) continue;
    lt = t - c.burnAt; if (lt < 0) continue; wake(c);
    c.p = Math.min(1, lt / BD);
    var cu = clamp((lt - BD * .9) / .8, 0, 1);
    if (cu > 0 && !c.crumbled) {
      c.crumbled = true;
      for (var k = 0; k < Math.round(16 * Q); k++) { shard(c.x + R() * c.w - sx, c.y + R() * c.h - sy, 160); }
      for (k = 0; k < Math.round(18 * Q); k++) ember(c.x + R() * c.w - sx, c.y + R() * c.h - sy, 60);
      for (k = 0; k < 3; k++) smoke(c.x + R() * c.w - sx, c.y + R() * c.h - sy);
    }
    c.op = 1 - ease(cu); c.ovl = c.op; c.gy = ease(cu) * 18; c.gr = c.rd * ease(cu) * 3; c.hold = true;
    if (c.p < 1 || cu < .5) {
      var R0 = c.p * c.maxR, rate = (c.w + c.h) * .5 * Q * dt * (cu > 0 ? .4 : 1), cnt = Math.floor(rate) + (R() < rate % 1 ? 1 : 0);
      for (k = 0; k < cnt; k++) {
        var a = R() * PI2, rr = R() < .55 ? R0 * rand(.9, 1.1) : R0 * R(), px = c.ipx + Math.cos(a) * rr, py = c.ipy + Math.sin(a) * rr;
        if (px > c.x && px < c.x + c.w && py > c.y && py < c.y + c.h) {
          flame(px + (c.ox + c.fx) - sx, py + (c.oy + c.fy) - sy, rand(16, 34));
          if (R() < .12) ember(px - sx, py - sy, 40);
          if (R() < .04) smoke(px - sx, py - sy - 10);
        }
      }
    }
  }
  for (i = 0; i < WD.length; i++) {
    w = WD[i]; if (w.igAt > 1e8 || w.restored) continue;
    lt = t - w.igAt; if (lt < 0) continue; wake(w); w.hold = true;
    var wx = w.cx + w.ox - sx, wy = w.cy + w.oy - sy;
    if (lt < .3) {
      if (w.stage < 1) { w.stage = 1; w.col = '#ffae45'; for (k = 0; k < 2; k++) flame(wx + rand(-w.w / 3, w.w / 3), wy, rand(12, 22)); }
    } else if (lt < .7) {
      if (w.stage < 2) { w.stage = 2; w.col = '#18100c'; flame(wx, wy - 2, rand(14, 24)); }
    } else {
      if (w.stage < 3) { w.stage = 3; w.col = '#18100c'; ember(wx, wy, 45); if (R() < .5) ember(wx, wy, 45); }
      var u = clamp((lt - .7) / .5, 0, 1);
      w.op = 1 - u; w.gy = -u * 20; w.gx = u * 8; w.gr = w.rd * u * 40; w.dead = u >= 1;
    }
  }
}
function fireRestore(fire, dt) {
  var rt = fire.t - fire.restoreAt, i, a, minY = 1e12, maxY = -1e12;
  T.concat(WD).forEach(function (e) { if (e.burnAt < 1e8 || e.igAt < 1e8) { minY = Math.min(minY, e.cy); maxY = Math.max(maxY, e.cy); } });
  var span = Math.max(1, maxY - minY), done = true;
  T.concat(WD).forEach(function (e) {
    if (e.burnAt > 1e8 && e.igAt > 1e8) return;
    var delay = (e.cy - minY) / span * .55, rp = clamp((rt - delay) / .9, 0, 1);
    if (!e.restored) {
      if (rt < delay) { done = false; return; }
      e.restored = true; e.ox = e.oy = e.rot = e.vx = e.vy = e.vr = 0; e.gx = e.gy = e.gr = 0; e.col = null; e.stage = 0; e.ovl = 0; e.hold = true; e.crumbled = false; e.p = 0;
    }
    e.op = ease(rp);
    if (rp < 1) done = false; else if (e.hold) { e.hold = false; e.burnAt = e.igAt = 1e9; e.op = 1; wake(e); }
  });
  if (rt > 0 && done) fire.done = true;
}
/* char, glow front */
function drawFireCards(layer) {
  for (var i = 0; i < T.length; i++) {
    var c = T[i]; if (c.burnAt > 1e8 || c.restored || c.p <= 0 || c.ovl <= .01) continue;
    var R0 = c.p * c.maxR, pts = blob(c.ipx - sx, c.ipy - sy, R0, c.sd, 40);
    cx.save(); cardXform(c); rrect(c.x - sx, c.y - sy, c.w, c.h, c.rad); cx.clip();
    if (layer === 0) {
      cx.globalAlpha = c.ovl; polyPath(pts); cx.fillStyle = 'rgba(14,8,5,.95)'; cx.fill();
      cx.lineWidth = 12; cx.strokeStyle = 'rgba(74,30,8,.9)'; cx.lineJoin = 'round'; cx.stroke();
    } else if (c.p < 1) {
      var fl = .75 + .25 * Math.sin(performance.now() / 55 + i * 3);
      polyPath(pts); cx.lineJoin = 'round';
      cx.globalAlpha = .22 * c.ovl; cx.lineWidth = 22; cx.strokeStyle = '#ff6a1a'; cx.stroke();
      cx.globalAlpha = .85 * fl * c.ovl; cx.lineWidth = 5; cx.strokeStyle = '#ff9a2e'; cx.stroke();
      cx.globalAlpha = .9 * fl * c.ovl; cx.lineWidth = 1.8; cx.strokeStyle = '#ffe9a8'; cx.stroke();
    }
    cx.restore();
  }
  cx.globalAlpha = 1;
}

/* ---------- impacts shared by meteors ---------- */
var IMP = [], SCORCH = [];
function drawImpacts(layer, e) {
  var i, m;
  if (layer === 0) {
    for (i = 0; i < SCORCH.length; i++) {
      m = SCORCH[i]; var a = clamp(1 - (e.t - e.fadeAt) / 1, 0, 1) * Math.min(1, (e.t - m.t0) * 3); if (a <= 0) continue;
      var gr = cx.createRadialGradient(m.x - sx, m.y - sy, 0, m.x - sx, m.y - sy, m.r);
      gr.addColorStop(0, 'rgba(8,5,4,' + .85 * a + ')'); gr.addColorStop(.6, 'rgba(14,9,7,' + .5 * a + ')'); gr.addColorStop(1, 'rgba(14,9,7,0)');
      cx.fillStyle = gr; cx.fillRect(m.x - sx - m.r, m.y - sy - m.r, m.r * 2, m.r * 2);
    }
  } else {
    for (i = 0; i < IMP.length; i++) {
      m = IMP[i]; var age = e.t - m.t0; if (age < 0) continue;
      var f = Math.exp(-age * 6), x = m.x - sx, y = m.y - sy;
      if (f > .02) { spr(SP.hot, x, y, m.r * 3.6 * (1 + age * 2), f); spr(SP.fire, x, y, m.r * 5, f * .8); }
      var rg = age * 560 * m.p;
      if (age < 1.2) {
        cx.globalAlpha = (1 - age / 1.2) * .4; cx.lineWidth = 2 + 6 * (1 - age / 1.2);
        cx.strokeStyle = '#ffc07a'; cx.beginPath(); cx.arc(x, y, rg, 0, PI2); cx.stroke();
        cx.globalAlpha = (1 - age / 1.2) * .3; cx.lineWidth = 1.5; cx.strokeStyle = '#fff'; cx.beginPath(); cx.arc(x, y, rg * .93, 0, PI2); cx.stroke();
      }
    }
    cx.globalAlpha = 1;
  }
}

/* ---------- Meteor shower ---------- */
function meteors() {
  begin(); IMP = []; SCORCH = [];
  var fire = { end: 0, restoreAt: 1e9, restoring: false, fadeAt: 1e9 }, M = [], cards = T.slice().sort(function () { return R() - .5; });
  var dir = [-.42, .91], dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]); dir = [dir[0] / dl, dir[1] / dl];
  var targets = [], nCard = Math.min(cards.length, SMALL ? 4 : 5), i;
  for (i = 0; i < nCard; i++) { var c = cards[i]; targets.push({ x: c.x + c.w * rand(.25, .75), y: c.y + c.h * rand(.2, .7), big: true }); }
  var nOpen = SMALL ? 3 : 4, vw = innerWidth, vh = innerHeight;
  for (i = 0; i < nOpen; i++) targets.push({ x: sx + rand(.1, .9) * vw, y: sy + rand(.15, .85) * vh, big: false });
  targets.sort(function () { return R() - .5; });
  var spd = 1650, last = 0;
  targets.forEach(function (tg, k) {
    var t0 = .25 + k * rand(.38, .6), L = Math.max(vh, 600) * 1.25, st = { x: tg.x - dir[0] * L, y: tg.y - dir[1] * L };
    M.push({ tg: tg, x0: st.x, y0: st.y, tHit: t0 + L / spd, t0: t0, L: L, hit: false, big: tg.big });
    last = Math.max(last, t0 + L / spd);
  });
  /* decorative streaks */
  for (i = 0; i < (SMALL ? 8 : 14); i++) {
    var ex = sx + rand(.0, 1.1) * vw, ey = sy + rand(.2, 1.1) * vh, L2 = rand(500, 900), t1 = rand(.2, last);
    M.push({ tg: { x: ex, y: ey }, x0: ex - dir[0] * L2, y0: ey - dir[1] * L2, tHit: t1 + L2 / 1900, t0: t1, L: L2, hit: false, big: false, deco: true, spd: 1900 });
  }
  var e = {
    t: 0, done: false, tail: 0,
    update: function (dt) {
      var t = e.t;
      M.forEach(function (m) {
        if (m.hit || t < m.tHit) return; m.hit = true;
        var x = m.tg.x, y = m.tg.y;
        if (m.deco) { IMP.push({ x: x, y: y, t0: t, r: 18, p: .25 }); for (var k = 0; k < 8 * Q; k++) spark(x - sx, y - sy, 260); for (k = 0; k < 4; k++) ember(x - sx, y - sy, 50); return; }
        IMP.push({ x: x, y: y, t0: t, r: m.big ? 90 : 62, p: 1 });
        SCORCH.push({ x: x, y: y, t0: t, r: m.big ? 80 : 56 });
        for (var k2 = 0; k2 < 46 * Q; k2++) spark(x - sx, y - sy, 560);
        for (k2 = 0; k2 < 18 * Q; k2++) ember(x - sx, y - sy, 120);
        for (k2 = 0; k2 < 5; k2++) smoke(x - sx + rand(-20, 20), y - sy);
        for (k2 = 0; k2 < 10 * Q; k2++) flame(x - sx + rand(-26, 26), y - sy + rand(-10, 14), rand(26, 50));
        /* shock: push everything away, jolt cards */
        var rangeS = 520;
        T.concat(WD).forEach(function (q) {
          var dd = dist(x, y, q.cx, q.cy); if (dd > rangeS) return;
          var f = Math.pow(1 - dd / rangeS, 2), ux = (q.cx - x) / (dd + 1), uy = (q.cy - y) / (dd + 1);
          var imp = q.word ? 520 : 360; q.vx += ux * imp * f; q.vy += uy * imp * f - (q.word ? 0 : 140 * f); q.vr += (R() - .5) * (q.word ? 400 : 60) * f; wake(q);
        });
        /* ignite */
        var reach = m.big ? 260 : 190;
        T.forEach(function (q) {
          var nx = clamp(x, q.x, q.x + q.w), ny = clamp(y, q.y, q.y + q.h), dd = dist(x, y, nx, ny);
          if (dd < reach) igniteCard(q, x, y, t + dd / 900, fire);
        });
        WD.forEach(function (q) {
          if (q.owner && q.owner.burnAt < 1e8) return;
          var dd = dist(x, y, q.cx, q.cy); if (dd < reach) { igniteWord(q, t + dd / 700 + R() * .08); fire.end = Math.max(fire.end, q.igAt + 1.3); wake(q); }
        });
        e.shake = t; fire.end = Math.max(fire.end, t + 1);
      });
      /* screen shake on impact */
      if (e.shake !== undefined) {
        var a = Math.exp(-(t - e.shake) * 7) * (SMALL ? 3 : 5);
        if (a > .1) T.concat(WD).forEach(function (q) { q.fx += Math.sin(t * 90 + q.ph) * a * (q.word ? .8 : 1); q.fy += Math.cos(t * 80 + q.ph) * a; wake(q); });
      }
      fire.t = t; fireUpdate(fire, dt);
      if (!fire.restoring && t > last + .05) {
        fire.restoreAt = Math.max(fire.end, last) + 1.1; fire.restoring = true; fire.fadeAt = fire.restoreAt;
      }
      if (fire.restoring && t > fire.restoreAt) { fireRestore(fire, dt); if (fire.done && t > fire.restoreAt + 1.2) e.done = true; }
    },
    draw: function (layer) {
      var t = e.t;
      if (layer === 0) { drawImpacts(0, { t: t, fadeAt: fire.fadeAt }); drawFireCards(0); return; }
      drawImpacts(1, e); drawFireCards(1);
      M.forEach(function (m) {
        if (m.hit || t < m.t0) return;
        var sp2 = m.deco ? m.spd : spd, tt = t - m.t0, hx = m.x0 + dir[0] * sp2 * tt - sx, hy = m.y0 + dir[1] * sp2 * tt - sy;
        var len = m.deco ? 180 : 340, tx = hx - dir[0] * len, ty = hy - dir[1] * len;
        var gr = cx.createLinearGradient(tx, ty, hx, hy);
        gr.addColorStop(0, 'rgba(255,110,30,0)'); gr.addColorStop(.7, 'rgba(255,170,70,.55)'); gr.addColorStop(1, 'rgba(255,245,220,1)');
        cx.lineCap = 'round'; cx.strokeStyle = gr;
        var wd = m.big ? 1 : .6;
        cx.globalAlpha = .22; cx.lineWidth = 24 * wd; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(hx, hy); cx.stroke();
        cx.globalAlpha = .55; cx.lineWidth = 9 * wd; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(hx, hy); cx.stroke();
        cx.globalAlpha = 1; cx.lineWidth = 3.4 * wd; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(hx, hy); cx.stroke();
        spr(SP.hot, hx, hy, 70 * wd, 1); spr(SP.fire, hx, hy, 130 * wd, .55);
        if (R() < .9) { add({ k: 'fl', x: hx - dir[0] * rand(0, 60), y: hy - dir[1] * rand(0, 60), vx: rand(-30, 30), vy: rand(-30, 30), g: 0, life: 0, max: rand(.25, .5), s: rand(14, 30) }); }
      });
      cx.globalAlpha = 1;
    },
    end: function (abort) { IMP = []; SCORCH = []; }
  };
  start(e);
}

/* ---------- Burn the page ---------- */
function burn() {
  begin();
  var fire = { end: 0, restoreAt: 1e9, restoring: false }, vw = innerWidth, vh = innerHeight;
  var ox = sx + vw * rand(.3, .7), oy = sy + vh * rand(.45, .75), speed = 640 * (SMALL ? .8 : 1);
  T.forEach(function (c) {
    var nx = clamp(ox, c.x, c.x + c.w), ny = clamp(oy, c.y, c.y + c.h), dd = dist(ox, oy, nx, ny);
    igniteCard(c, nx + rand(-6, 6), ny + rand(-6, 6), .2 + dd / speed + R() * .12, fire);
  });
  WD.forEach(function (w) { if (!w.owner) { igniteWord(w, .2 + dist(ox, oy, w.cx, w.cy) / speed + R() * .12); fire.end = Math.max(fire.end, w.igAt + 1.3); wake(w); } });
  var e = {
    t: 0, done: false,
    update: function (dt) {
      var t = e.t;
      if (t < .8) { /* first ignition at the origin so the start reads clearly */
        if (R() < .9) flame(ox - sx + rand(-16, 16), oy - sy + rand(-6, 6), rand(26, 48));
      }
      fire.t = t; fireUpdate(fire, dt);
      if (!fire.restoring) { fire.restoreAt = fire.end + 1.1; fire.restoring = true; }
      if (t > fire.restoreAt) { fireRestore(fire, dt); if (fire.done) e.done = true; }
    },
    draw: function (layer) { drawFireCards(layer); }
  };
  start(e);
}

/* ---------- Earthquake ---------- */
function crackGen(x, y, ang, len, w, out, depth, t0) {
  var pts = [[x, y]], step = 22, n = Math.max(3, Math.floor(len / step)), a = ang, cum = [0], tot = 0;
  for (var i = 0; i < n; i++) {
    a += (R() - .5) * .55; x += Math.cos(a) * step; y += Math.sin(a) * step; tot += step;
    pts.push([x, y]); cum.push(tot);
    if (R() < .055 && depth < 2) crackGen(x, y, a + (R() < .5 ? -1 : 1) * (.5 + R() * .8), len * .5, w * .62, out, depth + 1, t0 + tot / 1500);
  }
  out.push({ pts: pts, cum: cum, w: w, t0: t0 });
}
function quake() {
  begin();
  var C = [], dur = 4.6, vw = innerWidth, vh = innerHeight, eps = [[.18, rand(.2, .8), .15], [.7, rand(.2, .8), .7], [.45, rand(.2, .8), 1.4]], jolts = [.05, .95, 1.8, 2.7], jd = 0;
  eps.forEach(function (p) {
    var x = p[0] * vw, y = p[1] * vh, base = R() * PI2, nr = SMALL ? 3 : 4;
    for (var k = 0; k < nr; k++) crackGen(x, y, base + k * PI2 / nr + rand(-.3, .3), rand(.4, .75) * Math.max(vw, vh), SMALL ? 3.2 : 5, C, 0, p[2]);
  });
  var e = {
    t: 0, done: false,
    update: function (dt) {
      var t = e.t, A = t < dur ? ease(t / .45) * (t > 3.1 ? Math.exp(-(t - 3.1) * 2.4) : 1) : 0, M = SMALL ? .7 : 1;
      while (jd < jolts.length && t > jolts[jd]) {
        jd++; T.forEach(function (c) { c.vy += rand(-1, 1) * 420 * M; c.vr += rand(-1, 1) * 38; wake(c); });
        WD.forEach(function (w) { w.vy += rand(-1, 1) * 260 * M; w.vx += rand(-1, 1) * 100; w.vr += rand(-1, 1) * 120; wake(w); });
      }
      var gx = A * (7 * Math.sin(PI2 * 3.1 * t) + 4 * Math.sin(PI2 * 7.3 * t + 1.3)) * M, gy = A * (5 * Math.sin(PI2 * 4.3 * t + .5) + 3 * Math.sin(PI2 * 9.1 * t)) * M;
      if (A > .005) {
        T.forEach(function (c) { c.fx = gx + A * M * (3.5 * Math.sin(PI2 * 17 * t + c.ph) + 2.2 * Math.sin(PI2 * 23 * t + c.ph * 2)); c.fy = gy + A * M * 3 * Math.sin(PI2 * 19 * t + c.ph * 1.7); c.fr = A * M * .6 * Math.sin(PI2 * 5 * t + c.ph); wake(c); });
        WD.forEach(function (w) { w.fx = gx + A * M * 2.6 * Math.sin(PI2 * 29 * t + w.ph); w.fy = gy + A * M * 2.4 * Math.sin(PI2 * 33 * t + w.ph * 1.3); w.fr = A * M * 1.4 * Math.sin(PI2 * 31 * t + w.ph); wake(w); });
        if (R() < A * 1.2) { var q = C[Math.floor(R() * C.length)]; if (q && t > q.t0 + .3) { var pt = q.pts[Math.floor(R() * Math.min(q.pts.length, Math.max(1, (t - q.t0) * 100)))]; dust(pt[0] + rand(-6, 6), pt[1], rand(-30, 30), rand(30, 120), rand(24, 46), .2); } }
      }
      if (t > dur + 1.7) e.done = true;
    },
    draw: function (layer) {
      var t = e.t, fade = 1 - clamp((t - dur) / 1.4, 0, 1), vg;
      if (layer === 0) {
        if (t < dur) { vg = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,10,5,' + .28 * ease(t / .6) * (t > 3.4 ? clamp((dur - t) / 1.2, 0, 1) : 1) + ')'); cx.fillStyle = vg; cx.fillRect(0, 0, W, H); }
        C.forEach(function (q) {
          var age = t - q.t0; if (age < 0 || fade <= 0) return;
          var L = Math.min(q.cum[q.cum.length - 1], age * 1500), upto = 0;
          while (upto < q.cum.length - 1 && q.cum[upto + 1] <= L) upto++;
          if (upto < 1) return; cx.lineJoin = 'round'; cx.lineCap = 'round';
          cx.globalAlpha = .25 * fade; cx.strokeStyle = '#000'; cx.lineWidth = q.w * 3.4; line(q.pts, upto); cx.stroke();
          cx.globalAlpha = .96 * fade; cx.strokeStyle = '#060403'; cx.lineWidth = q.w; line(q.pts, upto); cx.stroke();
          cx.globalAlpha = .2 * fade; cx.strokeStyle = '#ffe7c8'; cx.lineWidth = 1; cx.save(); cx.translate(-1.4, -1.4); line(q.pts, upto); cx.stroke(); cx.restore();
        });
        cx.globalAlpha = 1;
      } else {
        C.forEach(function (q) {
          var age = t - q.t0; if (age < 0 || fade <= 0) return;
          var L = Math.min(q.cum[q.cum.length - 1], age * 1500), upto = 0;
          while (upto < q.cum.length - 1 && q.cum[upto + 1] <= L) upto++;
          if (upto < 1) return;
          cx.globalAlpha = .13 * fade * (.7 + .3 * Math.sin(t * 20)); cx.strokeStyle = '#ff8a3a'; cx.lineWidth = q.w * .5; cx.lineJoin = 'round'; line(q.pts, upto); cx.stroke();
        });
        cx.globalAlpha = 1;
      }
    }
  };
  start(e);
}

/* ---------- Lightning ---------- */
function mdisp(x0, y0, x1, y1, disp, levels) {
  var pts = [[x0, y0], [x1, y1]];
  for (var l = 0; l < levels; l++) {
    var np = [pts[0]];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1, o = (R() - .5) * 2 * disp;
      np.push([mx - dy / len * o, my + dx / len * o]); np.push(b);
    }
    pts = np; disp *= .52;
  }
  return pts;
}
function mkBolt(x0, y0, x1, y1) {
  var main = mdisp(x0, y0, x1, y1, Math.abs(y1 - y0) * .16, 6), br = [], nb = 3 + Math.floor(R() * 3), i;
  for (i = 0; i < nb; i++) {
    var ix = 3 + Math.floor(R() * (main.length - 8)), p = main[ix], a = Math.atan2(y1 - y0, x1 - x0) + (R() < .5 ? -1 : 1) * rand(.35, .9), len = rand(110, 300), ex = p[0] + Math.cos(a) * len, ey = p[1] + Math.sin(a) * len;
    var b = mdisp(p[0], p[1], ex, ey, len * .14, 4); br.push(b);
    if (R() < .5) { var q = b[Math.floor(b.length / 2)], a2 = a + (R() < .5 ? -1 : 1) * rand(.4, .8); br.push(mdisp(q[0], q[1], q[0] + Math.cos(a2) * len * .5, q[1] + Math.sin(a2) * len * .5, len * .07, 3)); }
  }
  return { main: main, br: br };
}
function lightning() {
  begin();
  var S = [], SC = [], vw = innerWidth, vh = innerHeight, cards = T.filter(function (c) { return c.w * c.h > 5000; });
  if (!cards.length) cards = T.slice();
  cards.sort(function () { return R() - .5; });
  var ns = SMALL ? 4 : 5, times = [.35, 1.15, 1.85, 2.7, 3.4], i, flashMul = SMALL ? .8 : 1;
  for (i = 0; i < ns; i++) {
    var c = cards[i % Math.max(1, cards.length)], tx, ty;
    if (c && (i < cards.length)) { tx = c.x + c.w * rand(.2, .8); ty = c.y + c.h * rand(.25, .6); } else { tx = sx + vw * rand(.15, .85); ty = sy + vh * rand(.3, .8); }
    S.push({ t0: times[i], card: c, tx: tx, ty: ty, bolt: mkBolt(tx - sx + rand(-120, 120), -20, tx - sx, ty - sy), fired: false });
  }
  var e = {
    t: 0, done: false,
    update: function (dt) {
      var t = e.t;
      S.forEach(function (s) {
        if (s.fired || t < s.t0) return; s.fired = true;
        var x = s.tx, y = s.ty;
        SC.push({ x: x, y: y, t0: t, a: R() * 6, ls: [0, 1, 2, 3, 4, 5, 6].map(function () { return [R() * PI2, rand(24, 64), rand(-.5, .5)]; }) });
        for (var k = 0; k < 34 * Q; k++) spark(x - sx, y - sy, 520, 1);
        for (k = 0; k < 6; k++) ember(x - sx, y - sy, 60);
        smoke(x - sx, y - sy, 60);
        if (s.card) { s.card.vy += rand(-1, 1) * 380; s.card.vr += rand(-1, 1) * 70; wake(s.card); }
        T.forEach(function (q) { if (q === s.card) return; var dd = dist(x, y, q.cx, q.cy); if (dd < 420) { var f = 1 - dd / 420; q.vy += rand(-1, 1) * 160 * f; q.vr += rand(-1, 1) * 22 * f; wake(q); } });
        WD.forEach(function (w) {
          var dd = dist(x, y, w.cx, w.cy); if (dd > 150) return; var f = 1 - dd / 150;
          w.vy += rand(-1, 1) * 500 * f; w.vx += rand(-1, 1) * 300 * f; w.vr += rand(-1, 1) * 400 * f; w.col = '#d6e8ff'; w.flashT = t + .18 + R() * .1; w.hold = true; wake(w);
        });
      });
      WD.forEach(function (w) { if (w.flashT && t > w.flashT) { w.flashT = 0; w.col = null; w.hold = false; } });
      /* rumble after each strike */
      S.forEach(function (s) {
        if (!s.fired) return; var a = t - s.t0; if (a > 0 && a < .7) {
          var amp = Math.exp(-a * 5) * (SMALL ? 2.4 : 3.6);
          T.forEach(function (q) { q.fx += Math.sin(a * 70 + q.ph) * amp; q.fy += Math.cos(a * 60 + q.ph) * amp; wake(q); });
        }
      });
      if (t > times[ns - 1] + 4.8) e.done = true;
    },
    draw: function (layer) {
      var t = e.t;
      if (layer === 0) {
        SC.forEach(function (m) {
          var age = t - m.t0, a = age < 1.6 ? 1 : clamp(1 - (age - 1.6) / 2.4, 0, 1); if (a <= 0) return;
          var x = m.x - sx, y = m.y - sy, gr = cx.createRadialGradient(x, y, 0, x, y, 52);
          gr.addColorStop(0, 'rgba(6,4,3,' + .85 * a + ')'); gr.addColorStop(.55, 'rgba(14,9,7,' + .45 * a + ')'); gr.addColorStop(1, 'rgba(14,9,7,0)');
          cx.fillStyle = gr; cx.fillRect(x - 52, y - 52, 104, 104);
          cx.strokeStyle = 'rgba(8,5,4,' + .8 * a + ')'; cx.lineCap = 'round';
          m.ls.forEach(function (l) {
            cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y);
            var mx = x + Math.cos(l[0]) * l[1] * .55, my = y + Math.sin(l[0]) * l[1] * .55;
            cx.lineTo(mx, my); cx.lineTo(mx + Math.cos(l[0] + l[2]) * l[1] * .5, my + Math.sin(l[0] + l[2]) * l[1] * .5); cx.stroke();
          });
        });
        cx.globalAlpha = 1;
        /* darkening storm sky at the top */
        var sk = e.t < 5.5 ? Math.min(1, t / .5) * (t > times[ns - 1] + 1.2 ? clamp(1 - (t - times[ns - 1] - 1.2) / 1.2, 0, 1) : 1) : 0;
        if (sk > 0) { var g2 = cx.createLinearGradient(0, 0, 0, H * .6); g2.addColorStop(0, 'rgba(8,12,28,' + .45 * sk + ')'); g2.addColorStop(1, 'rgba(8,12,28,0)'); cx.fillStyle = g2; cx.fillRect(0, 0, W, H * .6); }
      } else {
        var flash = 0;
        S.forEach(function (s) {
          var a = t - s.t0; if (a < 0) return;
          var I = Math.max(Math.exp(-a * 9), a > .09 ? .6 * Math.exp(-(a - .09) * 12) : 0, a > .17 ? .85 * Math.exp(-(a - .17) * 9) : 0);
          if (a > .24) I = Math.max(I, 0); if (I < .03) return;
          flash = Math.max(flash, I);
          cx.lineJoin = 'round'; cx.lineCap = 'round';
          [[20, 'rgba(110,140,255,', .12], [8, 'rgba(160,195,255,', .34], [3.2, 'rgba(255,255,255,', 1]].forEach(function (pp) {
            cx.strokeStyle = pp[1] + Math.min(1, I * pp[2] * (pp[2] === 1 ? 1 : 1.4)) + ')';
            cx.lineWidth = pp[0] * (.5 + .5 * I); line(s.bolt.main); cx.stroke();
            cx.lineWidth = pp[0] * .5 * (.5 + .5 * I); s.bolt.br.forEach(function (b) { line(b); cx.stroke(); });
          });
          var x = s.tx - sx, y = s.ty - sy;
          spr(SP.blue, x, y, 240 * (.5 + I), I); spr(SP.white, x, y, 90, I);
          if (s.card) { cx.save(); cardXform(s.card); rrect(s.card.x - sx, s.card.y - sy, s.card.w, s.card.h, s.card.rad); cx.globalAlpha = .38 * I; cx.fillStyle = '#cfe0ff'; cx.fill(); cx.restore(); }
        });
        if (flash > .03) { cx.globalAlpha = .3 * flash * flashMul; cx.fillStyle = '#cfdcff'; cx.fillRect(0, 0, W, H); }
        SC.forEach(function (m) { var age = t - m.t0; if (age < .8) { spr(SP.fire, m.x - sx, m.y - sy, 70 * (1 - age / .8) + 20, .8 * (1 - age / .8)); } });
        cx.globalAlpha = 1;
      }
    }
  };
  start(e);
}

/* ---------- Tornado ---------- */
function tornado() {
  begin();
  var dir = R() < .5 ? 1 : -1, dur = 7.6, vw = innerWidth, vh = innerHeight, yB = vh * .94, yT = -vh * .08;
  var Rtop = SMALL ? Math.min(vw * .27, 112) : clamp(vw * .13, 90, 215), swirlN = 16, deb = [], i;
  var Nd = Math.round(95 * Q);
  function rad(u) { return 8 + (Rtop - 8) * Math.pow(u, 1.7); }
  function axisX(u, t, cxm) { return cxm + Math.sin(t * 1.7 + u * 3.3) * (10 + u * 46) + dir * -u * 34 + Math.sin(t * .6) * 30 * u; }
  function mkDeb(u0) { return { u: u0, a: R() * PI2, w: rand(5, 9), rr: rand(.7, 1.5), s: rand(3, 8), type: Math.floor(R() * 3), r: R() * 6, vu: rand(.1, .2), c: R() < .5 ? '#2c241e' : R() < .5 ? '#6b5b49' : '#d9d2c3' }; }
  for (i = 0; i < Nd; i++) deb.push(mkDeb(R()));
  var e = {
    t: 0, done: false, cxm: 0, on: 1, last: 0,
    pos: function (t) { var f = clamp((t - .3) / (dur - 1.6), 0, 1), s = dir > 0 ? -.14 * vw : 1.14 * vw, en = dir > 0 ? 1.14 * vw : -.14 * vw; return s + (en - s) * f + Math.sin(t * .9) * vw * .02; },
    update: function (dt) {
      var t = e.t; e.cxm = e.pos(t);
      e.on = clamp(t / 1.0, 0, 1) * clamp((dur - t) / 1.0, 0, 1);
      var cxm = e.cxm, k, d1;
      /* dust at the foot */
      if (e.on > .3) for (k = 0; k < Math.ceil(2 * Q); k++) { dust(axisX(0, t, cxm) + rand(-30, 30), yB + rand(-6, 6), rand(-60, 60) + dir * 140, rand(-60, -20), rand(40, 90), .22 * e.on); }
      /* debris */
      deb.forEach(function (p) { p.a += p.w * dt * (1.3 - p.u * .5); p.u += p.vu * dt; p.r += dt * 6; if (p.u > 1.04) { p.u = .02; p.a = R() * PI2; } });
      /* cards */
      T.forEach(function (c) {
        var ax = axisX(clamp((yB - (c.cy - sy)) / (yB - yT), 0, 1), t, cxm), ccx = c.cx - sx, rr = rad(clamp((yB - (c.cy - sy)) / (yB - yT), 0, 1));
        var hw = c.w / 2 + rr * 1.3, dx = ax - ccx, s = (1 - clamp(Math.abs(dx) / hw, 0, 1)) * e.on; s = ease(s);
        c.hold = s > .01; c.k = 24; c.z = .34;
        c.gy = -s * (40 + 70 * (1 - clamp(c.w / 700, 0, .8))); c.gx = dx * .1 * s; c.gr = clamp(-dx / hw, -1, 1) * 26 * s + Math.sin(t * 8 + c.ph) * 5 * s; c.gs = 1 - .06 * s; if (s > .01 || c.act) wake(c);
      });
      /* words: caught, spun around the axis, released */
      WD.forEach(function (w) {
        var wx = w.cx - sx, wy = w.cy - sy, u = clamp((yB - wy) / (yB - yT), 0, 1), ax = axisX(u, t, cxm), rc = Math.max(rad(u) * 1.05, 70), dx = wx - ax;
        if (!w.cap) { if (e.on > .35 && Math.abs(dx) < rc && wy < yB + 20 && R() < .75) { w.cap = 1; w.ct = 0; w.a = Math.atan2(R() - .5, dx) + R() * 2; w.rr = clamp(Math.abs(dx) * .5 + rad(u) * .45, 16, rc); w.sp = rand(6, 11); w.life = rand(.9, 1.9); w.maxL = rand(160, 330); w.k = 60; w.z = .62; w.hold = true; wake(w); } }
        else if (w.cap === 1) {
          w.ct += dt; w.a += w.sp * dt; var lift = Math.min(w.maxL, w.ct * 300), lf = Math.min(1, w.ct / .35);
          w.gx = (ax + Math.cos(w.a) * w.rr - wx) * lf; w.gy = (-lift + Math.sin(w.a) * w.rr * .22) * lf - (1 - lf) * 0; w.gr += 560 * dt * (R() < .5 ? 1 : 1); w.gs = .85 + .35 * Math.sin(w.a) * .5 + .15;
          w.vx += 0; wake(w);
          if (w.ct > w.life || e.on < .25) {
            w.cap = 2; w.k = 85; w.z = .42; w.hold = false; w.vx += dir * 260; w.vy -= 80; w.gr = 0; w.rot = ((w.rot + 180) % 360 + 360) % 360 - 180; w.gx = w.gy = 0; w.gs = 1;
          }
        }
      });
      if (t > dur + 1.2) e.done = true;
    },
    draw: function (layer) {
      var t = e.t, cxm = e.cxm, on = e.on, N = 36, j, p, u, x, y, rr;
      if (on <= .01 && layer === 0) return;
      function dpos(p) { var u = p.u, rr = rad(clamp(u, 0, 1)) * p.rr, ax = axisX(clamp(u, 0, 1), t, cxm); return [ax + Math.cos(p.a) * rr, yB - u * (yB - yT) + Math.sin(p.a) * rr * .2, Math.sin(p.a)]; }
      function drawDeb(front) {
        deb.forEach(function (p) {
          var q = dpos(p); if ((q[2] > 0) !== front) return; var sc = (.8 + .35 * q[2]) * p.s * on;
          cx.globalAlpha = .9 * on; cx.fillStyle = p.c; cx.save(); cx.translate(q[0], q[1]); cx.rotate(p.r + p.a);
          if (p.type === 0) cx.fillRect(-sc, -sc * .35, sc * 2, sc * .7); else if (p.type === 1) { cx.beginPath(); cx.moveTo(-sc, 0); cx.lineTo(0, -sc * .8); cx.lineTo(sc, 0); cx.lineTo(0, sc * .5); cx.closePath(); cx.fill(); } else { cx.beginPath(); cx.arc(0, 0, sc * .6, 0, PI2); cx.fill(); }
          cx.restore();
        });
        cx.globalAlpha = 1;
      }
      if (layer === 0) {
        /* storm cloud above */
        var cl = cx.createRadialGradient(cxm, -20, 20, cxm, -20, Rtop * 3.2); cl.addColorStop(0, 'rgba(40,44,54,' + .75 * on + ')'); cl.addColorStop(1, 'rgba(40,44,54,0)');
        cx.fillStyle = cl; cx.fillRect(cxm - Rtop * 3.4, 0, Rtop * 6.8, Rtop * 3.4);
        drawDeb(false);
        /* funnel body */
        var L = [], Rg = [];
        for (j = 0; j <= N; j++) { u = j / N; y = yB - u * (yB - yT); x = axisX(u, t, cxm); rr = rad(u); L.push([x - rr, y]); Rg.push([x + rr, y]); }
        cx.beginPath(); cx.moveTo(L[0][0], L[0][1]); for (j = 1; j <= N; j++) cx.lineTo(L[j][0], L[j][1]); for (j = N; j >= 0; j--) cx.lineTo(Rg[j][0], Rg[j][1]); cx.closePath();
        var fg = cx.createLinearGradient(0, yB, 0, yT); fg.addColorStop(0, 'rgba(70,64,58,' + .62 * on + ')'); fg.addColorStop(.5, 'rgba(78,84,96,' + .46 * on + ')'); fg.addColorStop(1, 'rgba(110,116,128,' + .3 * on + ')');
        cx.fillStyle = fg; cx.fill();
        /* inner shading: dark core */
        for (j = 0; j < N; j += 1) { u = (j + .5) / N; var a0 = axisX(u, t, cxm), r0 = rad(u) * .55; cx.globalAlpha = .16 * on; cx.fillStyle = '#10131a'; cx.fillRect(a0 - r0, yB - (u + .5 / N) * (yB - yT), r0 * 2, (yB - yT) / N + 1); }
        cx.globalAlpha = 1;
        drawDeb(true);
      } else {
        /* swirl streaks (additive) */
        cx.lineCap = 'round';
        for (var b = 0; b < swirlN; b++) {
          var ph = b / swirlN * PI2 + t * 7;
          for (j = 0; j < N; j++) {
            var u0 = j / N, u1 = (j + 1) / N, p0 = ph - u0 * 6, p1 = ph - u1 * 6, f = Math.cos(p0);
            if (f <= 0) continue;
            var x0 = axisX(u0, t, cxm) + Math.sin(p0) * rad(u0), x1 = axisX(u1, t, cxm) + Math.sin(p1) * rad(u1);
            cx.globalAlpha = .26 * f * on; cx.strokeStyle = '#e8edf6'; cx.lineWidth = 1 + 2.4 * u0 + 1;
            cx.beginPath(); cx.moveTo(x0, yB - u0 * (yB - yT)); cx.lineTo(x1, yB - u1 * (yB - yT)); cx.stroke();
          }
        }
        cx.globalAlpha = 1;
        spr(SP.dust, axisX(0, t, cxm), yB, Rtop * 2.4, .35 * on);
      }
    }
  };
  start(e);
}

/* ---------- gentle versions (prefers-reduced-motion) ---------- */
function gentle(kind) {
  cancelAll();
  var tint = { meteors: [255, 120, 40], burn: [255, 100, 30], quake: [90, 70, 50], lightning: [150, 180, 255], tornado: [120, 130, 145] }[kind] || [200, 200, 200];
  var crackSet = null;
  if (kind === 'quake') { crackSet = []; for (var k = 0; k < 3; k++) crackGen(rand(.2, .8) * W, rand(.2, .8) * H, R() * PI2, W * .5, 3.4, crackSet, 0, 0); }
  var e = {
    t: 0, done: false,
    update: function () { if (e.t > 2.6) e.done = true; },
    draw: function (layer) {
      var a = Math.sin(clamp(e.t / 2.6, 0, 1) * Math.PI);
      if (layer === 0) {
        var g = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .2, W / 2, H / 2, Math.max(W, H) * .75);
        g.addColorStop(0, 'rgba(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ',0)'); g.addColorStop(1, 'rgba(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ',' + .26 * a + ')');
        cx.fillStyle = g; cx.fillRect(0, 0, W, H);
        if (crackSet) crackSet.forEach(function (q) { cx.globalAlpha = .8 * a; cx.strokeStyle = '#060403'; cx.lineWidth = q.w; cx.lineJoin = 'round'; line(q.pts); cx.stroke(); }); cx.globalAlpha = 1;
      }
    }
  };
  start(e);
  toastMsg('Reduced motion is on, so this is the gentle version.');
}

/* ---------- sparkle trail ---------- */
function trailStar(x, y, touch) {
  var rm = rmq.matches;
  add({ k: 'st', x: x, y: y, vx: rm ? 0 : rand(-26, 26), vy: rm ? 0 : rand(-46, -6), g: rm ? 0 : 50, life: 0, max: rm ? .55 : rand(.8, 1.35), s: (touch ? rand(16, 30) : rand(14, 26)) * (rm ? .7 : 1), c: Math.floor(R() * 6), r: R() * 3 });
}
function trailMove(x, y, touch) {
  if (!trail.on) return;
  if (trail.lx !== null) {
    var dd = dist(x, y, trail.lx, trail.ly), step = touch ? 9 : 13, n = Math.min(40, Math.floor(dd / step));
    for (var i = 1; i <= n; i++) trailStar(trail.lx + (x - trail.lx) * i / n + rand(-5, 5), trail.ly + (y - trail.ly) * i / n + rand(-5, 5), touch);
    if (n === 0 && dd > 3) trailStar(x, y, touch);
    if (n > 0) { trail.lx = x; trail.ly = y; }
  } else { trailStar(x, y, touch); trail.lx = x; trail.ly = y; }
  kick();
}
d.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; trailMove(e.clientX, e.clientY, false); }, { passive: true });
d.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (!t || !trail.on) return; trail.lx = null; trailMove(t.clientX, t.clientY, true); }, { passive: true });
d.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) trailMove(t.clientX, t.clientY, true); }, { passive: true });
d.addEventListener('touchend', function () { trail.lx = null; }, { passive: true });
d.addEventListener('touchcancel', function () { trail.lx = null; }, { passive: true });
function setTrail(on, btn) {
  trail.on = on; trail.lx = null;
  if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (on) {
    /* a little spiral so you see it working right away */
    var cxm = W / 2, cym = H * .45;
    for (var i = 0; i < 26; i++) (function (i) { setTimeout(function () { var a = i * .5, r = 10 + i * 4; trailStar(cxm + Math.cos(a) * r, cym + Math.sin(a) * r * .8, SMALL); kick(); }, i * 22); })(i);
    toastMsg(SMALL ? 'Sparkle trail on. Drag your finger across the page.' : 'Sparkle trail on. Move your mouse.');
  }
}

/* ---------- menu wiring ---------- */
function closeMenu() { fzp.hidden = true; if (fzb) fzb.setAttribute('aria-expanded', 'false'); }
var OWN = { meteors: meteors, burn: burn, quake: quake, lightning: lightning, tornado: tornado };
fzp.addEventListener('click', function (e) {
  var b = e.target.closest('[data-fx]'), a = e.target.closest('a.fzlink');
  if (a) { closeMenu(); return; }
  if (!b) return; var k = b.getAttribute('data-fx');
  if (OWN[k]) {
    e.stopPropagation(); closeMenu();
    if (rmq.matches) gentle(k); else OWN[k]();
  } else if (k === 'spark') {
    e.stopPropagation(); closeMenu(); setTrail(!trail.on, b);
  } else if (k === 'reset') {
    trail.on = false; cancelAll(); window.__fxBusy = false; closeMenu();
  } else closeMenu();
}, true);
window.Funsies = { run: function (k) { if (OWN[k]) (rmq.matches ? gentle : OWN[k])(k); }, trail: setTrail, busy: function () { return !!window.__fxBusy; } };
})();
