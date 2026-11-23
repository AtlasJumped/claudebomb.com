// Fen Smash: level-based tensegrity demolition game (working title; other names floated: Smash Room, Tensegrity Tango).
// Plain JavaScript. Physics in sim.js, levels in levels.js, sound and particles in fx.js, special powers in specials.js.
(function () {
  'use strict';
  var FS = window.FS, TITLE = 'Fen Smash';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('c'), ctx = cv.getContext('2d', { alpha: false });
  var P = FS.Particles, A = FS.Audio, SP = FS.Specials;
  var qs = new URLSearchParams(location.search);
  var DEBUG_UNLOCK = qs.has('unlock');

  // ---------------------------------------------------------------- saved progress
  var SAVE_KEY = 'fensmash.v1';
  var save = { stars: {}, best: {}, maxLevel: 0, meter: 0.4, fun: { g: 1, meteors: false, slow: false, reduce: null }, seenHelp: false, seenHint: false, last: 0 };
  function loadSave() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object') { for (var k in s) save[k] = s[k]; save.fun = Object.assign({ g: 1, meteors: false, slow: false, reduce: null }, s.fun || {}); } } catch (e) {} }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  loadSave();
  var reduced = save.fun.reduce == null ? !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) : !!save.fun.reduce;
  document.body.classList.toggle('rm', reduced);

  // ---------------------------------------------------------------- state
  var W = 0, H = 0, pr = 1, s = 1, gy = 0, viewW = 900, portrait = false, layoutKey = '';
  var cliffEdge = 170, islandX0 = 600, structCx = 760, launcher = { x: 80, y: 0 };
  var world = null, level = null, levelIdx = 0, mode = 'title', phase = 'aim', paused = false, modal = null;
  var shotsLeft = 3, shotsUsed = 0, score = 0, shownScore = 0, broken = 0, totalLinks = 1, pct = 0, goalMet = false;
  var weapon = 'sling', aim = { angle: 0.8, power: 0.7, tx: 700, ty: 200 }, dragging = null, precision = false;
  var meter = save.meter, strikes = [], settleT = 0, endT = 0, shake = 0, combo = 0, comboT = 0, t0 = 0, simT = 0, anyFun = false;
  var spawnMeteorT = 1, resultShown = false, totalFired = false, flashT = 0;
  var quality = 2, emaDt = 1 / 60, slowFrames = 0, fastFrames = 0, fpsFrames = 0, fpsT = 0, fps = 60;
  var bg = null, installEvt = null;

  var G = { world: null, level: null, cliffEdge: 0, islandX0: 0, structCx: 0, reduced: reduced,
    mult: function () { var k = SP.kind && FS.SPECIALS[SP.kind]; return k ? (k.mult[level.mat] || 1) : 1; },
    sfx: function (k, a, b) { A.play(k, a, b); } };

  function say(t) { $('live').textContent = ''; setTimeout(function () { $('live').textContent = t; }, 30); }
  var toastT = 0;
  function toast(t) { var e = $('toast'); e.textContent = t; e.hidden = false; toastT = 2.4; say(t); }

  // ---------------------------------------------------------------- layout
  function layout(force) {
    W = window.innerWidth; H = window.innerHeight; portrait = H > W * 1.05;
    var dprCap = quality >= 2 ? 2 : quality === 1 ? 1.5 : 1;
    pr = Math.min(window.devicePixelRatio || 1, dprCap);
    cv.width = Math.round(W * pr); cv.height = Math.round(H * pr);
    var minW = portrait ? 580 : 900, groundFrac = portrait ? 0.66 : 0.74, minH = portrait ? 520 : 400;
    s = Math.min(W / minW, (H * groundFrac) / minH); gy = H * groundFrac; viewW = W / s;
    cliffEdge = portrait ? 150 : 170; structCx = viewW - 170; islandX0 = structCx - 150;
    launcher.x = portrait ? 66 : 84;
    G.cliffEdge = cliffEdge; G.islandX0 = islandX0; G.structCx = structCx;
    var key = (portrait ? 'p' : 'l') + Math.round(viewW / 40);
    if (layoutKey && key !== layoutKey && world && !force && mode === 'play' && shotsUsed === 0 && !SP.active()) { layoutKey = key; startLevel(levelIdx, true); }
    else if (layoutKey && key !== layoutKey && mode === 'play' && !force) { layoutKey = key; startLevel(levelIdx, true); toast('Layout changed, level restarted'); }
    layoutKey = key; makeBg();
  }
  function makeBg() {
    var r = mulberry(7), layers = [], i, k;
    for (k = 0; k < 3; k++) { var a = []; for (i = 0; i < 5; i++) a.push({ f: 0.004 + r() * 0.012 + k * 0.004, ph: r() * 6.3, am: 30 + r() * 40 + (2 - k) * 14 }); layers.push(a); }
    var stars = []; for (i = 0; i < 90; i++) stars.push({ x: r(), y: r() * 0.55, z: r() });
    var clouds = []; for (i = 0; i < 7; i++) clouds.push({ x: r() * 1.4, y: 0.06 + r() * 0.3, sc: 0.6 + r() * 0.9, sp: 3 + r() * 6 });
    var tufts = []; for (i = 0; i < 40; i++) tufts.push({ x: r(), sc: 0.6 + r() * 0.8 });
    bg = { layers: layers, stars: stars, clouds: clouds, tufts: tufts };
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------------------------------------------------------------- level control
  function unlockedWeapons() { var o = []; for (var k in FS.WEAPONS) if (DEBUG_UNLOCK || levelIdx >= FS.WEAPONS[k].unlock) o.push(k); return o; }
  function canPlay(i) { return DEBUG_UNLOCK || i <= save.maxLevel; }
  function funOn() { return save.fun.g !== 1 || save.fun.meteors || save.fun.slow; }

  function startLevel(i, quiet) {
    levelIdx = Math.max(0, Math.min(FS.LEVELS.length - 1, i)); level = FS.LEVELS[levelIdx]; G.level = level; save.last = levelIdx;
    world = new FS.World(); G.world = world; world.platforms = [{ x0: -500, x1: cliffEdge }, { x0: islandX0, x1: viewW + 500 }]; world.bounds = { x0: -400, x1: viewW + 600 };
    world.gScale = save.fun.g; P.clear(); SP.stop(); strikes = [];
    world.cb.onBreak = onBreak; world.cb.onHit = onHit; world.cb.onExplode = onExplode; world.cb.onSplash = onSplash; world.cb.onGround = onGround; world.cb.onThud = function () { A.play('thud'); };
    FS.buildStructure(world, level.spec, level.mat, structCx, level.hs);
    totalLinks = world.links.length; broken = 0; pct = 0; score = 0; shownScore = 0; shotsLeft = 3; shotsUsed = 0; goalMet = false; combo = 0; settleT = 0; endT = 0; resultShown = false; totalFired = false;
    phase = 'aim'; anyFun = funOn(); spawnMeteorT = 1.5; world.t = 0;
    var ws = unlockedWeapons(); if (ws.indexOf(weapon) < 0) weapon = ws[0]; if (levelIdx === 0) weapon = 'sling';
    setWeapon(weapon, true); buildWeaponBar(); defaultAim(); closeModals(); updateHud(true);
    $('lvlTitle').textContent = 'Level ' + (levelIdx + 1) + ': ' + level.name; $('dgoal').style.left = level.goal + '%';
    if (!quiet) say('Level ' + (levelIdx + 1) + ', ' + level.name + '. Destroy ' + level.goal + ' percent in three shots.');
    $('hint').hidden = true;
    if (!save.seenHint && levelIdx === 0) { $('hint').textContent = 'Drag back anywhere to aim, then let go to fire.'; $('hint').hidden = false; }
  }
  function defaultAim() {
    aim.angle = 0.75; aim.power = 0.72; aim.tx = structCx; aim.ty = 150; syncSliders();
  }

  // ---------------------------------------------------------------- world callbacks
  function onBreak(l, cause) {
    broken++;
    var m = (l.a.x + l.b.x) / 2, my = (l.a.y + l.b.y) / 2, M = l.M, i;
    var pts = Math.round(M.value * (l.type === 'cable' ? 0.5 : 1) * (cause === 'sink' ? 0.3 : 1) * (1 + Math.min(2, combo * 0.12)));
    combo++; comboT = 0.7; score += pts; addMeter(pts);
    if (cause !== 'sink') {
      var n = reduced ? 2 : 4; for (i = 0; i < n; i++) P.chip(m, my, l.type === 'cable' ? M.cable : (i % 2 ? M.strut : M.strutDark), 160);
      if (!reduced && l.M.key !== 'x') for (i = 0; i < 2; i++) P.spark(m, my, Math.random() * 6.3, 120 + Math.random() * 160, 0.4, '#fff3c0');
      var L = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y), ang = Math.atan2(l.b.y - l.a.y, l.b.x - l.a.x);
      var halves = l.type === 'cable' ? 1 : 2;
      for (i = 0; i < halves; i++) {
        var n1 = i === 0 ? l.a : l.b, cx = halves === 1 ? m : (i === 0 ? (l.a.x + m) / 2 : (l.b.x + m) / 2), cy = halves === 1 ? my : (i === 0 ? (l.a.y + my) / 2 : (l.b.y + my) / 2);
        P.add({ kind: 'piece', x: cx, y: cy, vx: (n1.x - n1.px) * 180 + (Math.random() - 0.5) * 90, vy: (n1.y - n1.py) * 180 + Math.random() * 70, g: 1, life: 2.4, max: 2.4, len: halves === 1 ? L : L / 2, ang: ang, vr: (Math.random() - 0.5) * 8, w: l.w, col: l.type === 'cable' ? M.cable : M.strut, dark: M.strutDark, rot: 0, cable: l.type === 'cable' });
      }
      if (pts >= 8 && combo < 14 || combo % 4 === 0) P.text(m, my + 8, '+' + pts, '#fff6c8', false);
      A.play('crack', M.key || level.mat);
    }
    updateStatus();
  }
  function onHit(p, l, sp, x, y) { A.play('hit'); if (!reduced) for (var i = 0; i < 4; i++) P.spark(x, y, Math.random() * 6.3, 100 + Math.random() * 220, 0.35); shake = Math.min(8, shake + sp / 220); }
  function onExplode(x, y, R, kind) {
    P.boom(x, y, R * 0.55, reduced); A.play('boom', R > 60 ? 1 : 0); shake = Math.min(14, shake + R / 9); flashT = reduced ? 0 : Math.min(0.25, flashT + 0.12);
    if (!world.onPlatform(x) && y < 20) { P.splash(x, FS.WATER_Y, 300, 4); }
  }
  function onSplash(x, y, sp) { P.splash(x, y, sp, sp > 300 ? 4 : 2); A.play('splash'); }
  function onGround(n, v) { if (v > 260) { for (var i = 0; i < 3; i++) P.smoke(n.x, 4, 6, 0.8); A.play('thud'); } }

  function addMeter(pts) {
    var cap = 560 + 36 * levelIdx, was = meter >= 1; meter = Math.min(1, meter + pts / cap);
    if (!was && meter >= 1) { A.play('ready'); toast('Special power ready'); }
  }

  // ---------------------------------------------------------------- weapons and firing
  function setWeapon(k, quiet) {
    weapon = k; var bs = document.querySelectorAll('.wpn'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].dataset.w === k ? 'true' : 'false');
    $('pA').textContent = k === 'drone' ? 'Target' : 'Angle'; $('lP').hidden = k === 'drone'; syncSliders();
    if (!quiet) { A.play('ui'); say(FS.WEAPONS[k].name + ' selected'); }
  }
  var ICONS = {
    sling: '<svg viewBox="0 0 32 32"><path d="M16 29V16M16 16L7 5M16 16l9-11" stroke="#d9a35e" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M7 5q9 7 18 0" stroke="#fff" stroke-width="1.6" fill="none"/><circle cx="16" cy="10" r="3.4" fill="#9fb0d6"/></svg>',
    cannon: '<svg viewBox="0 0 32 32"><path d="M6 20l17-9 4 7-17 9z" fill="#9fb0d6"/><circle cx="11" cy="25" r="4.4" fill="#d9a35e"/><circle cx="26" cy="10" r="2.4" fill="#ffb547"/></svg>',
    rocket: '<svg viewBox="0 0 32 32"><path d="M8 24L24 8c2 5 0 10-4 14z" fill="#e7efff"/><path d="M8 24l-3 3M11 21l-3 5M11 27l-1 3" stroke="#ff9d4a" stroke-width="2.4" stroke-linecap="round"/><circle cx="19" cy="13" r="2.2" fill="#4fe3c1"/></svg>',
    drone: '<svg viewBox="0 0 32 32"><rect x="11" y="13" width="10" height="6" rx="2" fill="#9fb0d6"/><path d="M3 11h10M19 11h10" stroke="#4fe3c1" stroke-width="2.6" stroke-linecap="round"/><path d="M16 20v8" stroke="#ff6b5c" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  function buildWeaponBar() {
    var h = '', ws = unlockedWeapons();
    for (var k in FS.WEAPONS) {
      var u = ws.indexOf(k) >= 0, nm = FS.WEAPONS[k].name;
      h += '<button class="wpn" data-w="' + k + '" aria-pressed="false" ' + (u ? '' : 'disabled') + ' aria-label="' + nm + (u ? '' : ', unlocks at level ' + (FS.WEAPONS[k].unlock + 1)) + '">' + ICONS[k] + '<span>' + (u ? (k === 'drone' ? 'Drone' : nm) : 'Lv ' + (FS.WEAPONS[k].unlock + 1)) + '</span></button>';
    }
    $('wpns').innerHTML = h;
    var bs = document.querySelectorAll('.wpn'); for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { if (!busy()) setWeapon(this.dataset.w); };
    setWeapon(weapon, true);
  }
  function vmax(k) { var w = FS.WEAPONS[k], need = 1.22 * Math.sqrt(Math.max(200, structCx - launcher.x) * 900); return Math.max(w.speed, need); }
  function muzzle(k) {
    var a = aim.angle;
    if (k === 'sling') return { x: launcher.x, y: 52 };
    if (k === 'cannon') return { x: launcher.x + 6 + Math.cos(a) * 40, y: 30 + Math.sin(a) * 40 };
    return { x: launcher.x + Math.cos(a) * 34, y: 40 + Math.sin(a) * 34 };
  }
  function launchSpeed() { return vmax(weapon) * (0.28 + 0.72 * aim.power); }
  function makeProj(k) {
    var W_ = FS.WEAPONS[k], mz = muzzle(k), sp = launchSpeed(), pm = level.pm, o = { x: mz.x, y: mz.y, vx: Math.cos(aim.angle) * sp, vy: Math.sin(aim.angle) * sp, r: W_.r, m: W_.m, kind: k === 'sling' ? 'stone' : k === 'cannon' ? 'ball' : 'rocket', pm: pm, life: 7, rot: 0, hits: 0, pierce: W_.pierce || 1, slow: W_.slow || 0.5 };
    if (k === 'rocket') { o.expl = true; o.R = W_.R * (1 + 0.04 * levelIdx); o.D = W_.D * pm; o.imp = W_.imp; o.thr = W_.thr; o.acc = W_.acc; o.gm = 0.55; }
    return o;
  }
  function busy() { return world.proj.length > 0 || strikes.length > 0 || SP.active() || phase !== 'aim'; }
  function canFire() { return mode === 'play' && !paused && !modal && phase === 'aim' && shotsLeft > 0 && world.proj.length === 0 && strikes.length === 0 && !SP.active(); }
  function fire() {
    if (!canFire()) return false;
    if (!A.on) {} A.play(weapon === 'sling' ? 'sling' : weapon === 'cannon' ? 'cannon' : weapon === 'rocket' ? 'rocket' : 'drone');
    shotsLeft--; shotsUsed++; combo = 0;
    if (weapon === 'drone') {
      var top = 330; for (var i = 0; i < 3; i++) strikes.push({ x: -60 - i * 46, y: top - i * 14, off: (i - 1) * 40, dropped: false, tx: aim.tx });
    } else {
      world.proj.push(makeProj(weapon)); var mz = muzzle(weapon);
      for (var j = 0; j < 8; j++) P.smoke(mz.x, mz.y, 7, 0.8);
      if (weapon === 'cannon') { shake = Math.min(14, shake + 6); P.boom(mz.x, mz.y, 14, true); }
    }
    save.seenHint = true; $('hint').hidden = true; phase = 'flight'; settleT = 0; fireRecoil = 1; updateHud(); say('Fired. ' + shotsLeft + ' shots left.');
    return true;
  }
  var fireRecoil = 0;

  function spawnMeteor() {
    var x = structCx + (Math.random() - 0.5) * 360 + 140, y = 620;
    world.proj.push({ x: x, y: y, vx: -220 - Math.random() * 160, vy: -480 - Math.random() * 160, r: 12, m: 3, kind: 'meteor', expl: true, R: 50, D: 1.9 * level.pm, imp: 300, pm: level.pm, life: 5, rot: 0, gm: 0.2, pierce: 1, slow: 1, meteor: true });
    A.play('meteor');
  }

  // ---------------------------------------------------------------- aiming input
  var ptr = null;
  function toWorld(px, py) { return { x: px / s, y: (gy - py) / s }; }
  cv.addEventListener('pointerdown', function (e) {
    if (mode !== 'play' || paused || modal) return; if (!A.on) {} e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
    if (weapon === 'drone') { var w = toWorld(e.clientX, e.clientY - 56); aim.tx = Math.max(islandX0 - 40, Math.min(viewW - 10, w.x)); aim.ty = Math.max(20, w.y); }
    dragging = true;
  });
  cv.addEventListener('pointermove', function (e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (weapon === 'drone') { var w = toWorld(e.clientX, e.clientY - 56); aim.tx = Math.max(islandX0 - 40, Math.min(viewW - 10, w.x)); aim.ty = Math.max(20, w.y); ptr.moved = true; syncSliders(); return; }
    var dx = (ptr.sx - e.clientX) / s, dy = (e.clientY - ptr.sy) / s, len = Math.hypot(dx, dy);
    if (len > 4) ptr.moved = true;
    if (len > 8) { aim.angle = Math.max(0.03, Math.min(1.48, Math.atan2(dy, Math.max(dx, 0.001)))); aim.power = Math.max(0.05, Math.min(1, len / 150)); syncSliders(); }
    ptr.len = len;
  });
  function release(e) {
    if (!ptr || (e && e.pointerId !== ptr.id)) return; var p = ptr; ptr = null; dragging = false;
    if (!p.moved) return;
    if (weapon !== 'drone' && (p.len || 0) < 16) return;
    if (!precision) fire();
  }
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', function () { ptr = null; dragging = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function syncSliders() {
    if (weapon === 'drone') { $('rA').min = Math.round(islandX0 - 40); $('rA').max = Math.round(viewW - 10); $('rA').value = Math.round(aim.tx); $('oA').textContent = Math.round(aim.tx); }
    else { $('rA').min = 3; $('rA').max = 85; $('rA').value = Math.round(aim.angle * 57.2958); $('oA').textContent = Math.round(aim.angle * 57.2958) + '°'; }
    $('rP').value = Math.round(aim.power * 100); $('oP').textContent = Math.round(aim.power * 100) + '%';
  }
  $('rA').oninput = function () { if (weapon === 'drone') aim.tx = +this.value; else aim.angle = this.value / 57.2958; syncSliders(); };
  $('rP').oninput = function () { aim.power = this.value / 100; syncSliders(); };
  $('bFire').onclick = function () { fire(); };
  $('bPrec').onclick = function () { precision = !precision; this.setAttribute('aria-pressed', precision); $('prec').hidden = !precision; syncSliders(); say(precision ? 'Precision aim on. Use the sliders and the Fire button.' : 'Precision aim off.'); };

  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    var k = e.key;
    if (k === 'Escape') { if (modal) { closeModals(); if (mode === 'play') paused = false; } else if (mode === 'play') openPause(); return; }
    if (mode !== 'play' || modal) { return; }
    var sh = e.shiftKey ? 5 : 1;
    if (k === 'ArrowUp') { if (weapon === 'drone') aim.tx += 6 * sh; else aim.angle = Math.min(1.48, aim.angle + sh / 57.3); syncSliders(); e.preventDefault(); }
    else if (k === 'ArrowDown') { if (weapon === 'drone') aim.tx -= 6 * sh; else aim.angle = Math.max(0.03, aim.angle - sh / 57.3); syncSliders(); e.preventDefault(); }
    else if (k === 'ArrowRight') { aim.power = Math.min(1, aim.power + 0.02 * sh); syncSliders(); e.preventDefault(); }
    else if (k === 'ArrowLeft') { aim.power = Math.max(0.05, aim.power - 0.02 * sh); syncSliders(); e.preventDefault(); }
    else if (k === ' ' || k === 'Enter') { if (document.activeElement && document.activeElement.tagName === 'BUTTON') return; fire(); e.preventDefault(); }
    else if (k >= '1' && k <= '4') { var ws = unlockedWeapons(), kk = Object.keys(FS.WEAPONS)[+k - 1]; if (ws.indexOf(kk) >= 0 && !busy()) setWeapon(kk); }
    else if (k === 's' || k === 'S') openPicker();
    else if (k === 'r' || k === 'R') startLevel(levelIdx);
    else if (k === 'm' || k === 'M') toggleSound();
  });

  // ---------------------------------------------------------------- special powers
  function openPicker() {
    if (meter < 1 || SP.active() || mode !== 'play' || phase === 'done') { if (meter < 1) toast('Fill the meter with points first'); return; }
    var h = '', keys = Object.keys(FS.SPECIALS), i;
    for (i = 0; i < keys.length; i++) {
      var d = FS.SPECIALS[keys[i]], eff = Math.round(Math.min(1, (d.mult[level.mat] || 1) / 3.2) * 100);
      h += '<button class="pk" data-k="' + keys[i] + '" aria-label="' + d.name + '. ' + d.blurb + '. ' + eff + ' percent effective against ' + FS.MATS[level.mat].name + '"><b>' + d.name + '</b><span>' + d.blurb + '. ' + d.best + '.</span><div class="eff" title="Effect against ' + FS.MATS[level.mat].name + '"><i style="width:' + eff + '%"></i></div></button>';
    }
    $('pkGrid').innerHTML = h; var bs = $('pkGrid').querySelectorAll('.pk'); for (i = 0; i < bs.length; i++) bs[i].onclick = function () { startSpecial(this.dataset.k); };
    openModal('picker', bs[0]);
  }
  function startSpecial(k) {
    closeModals(); paused = false; meter = 0; SP.start(k, G); phase = phase === 'aim' ? 'flight' : phase; settleT = 0; toast(FS.SPECIALS[k].name + '!'); updateHud();
    if (k === 'dragons') A.play('roar');
  }
  $('bSpec').onclick = openPicker; $('bPkCancel').onclick = function () { closeModals(); paused = false; };

  // ---------------------------------------------------------------- end of level
  function judge() {
    if (resultShown) return; resultShown = true; phase = 'done';
    var total = pct >= 97, win = pct >= level.goal, bonusShots = win ? shotsLeft * 400 : 0, bonusTotal = total ? 2500 : 0, finalScore = score + bonusShots + bonusTotal;
    var stars = win ? (total ? 3 : (shotsLeft >= 1 || pct >= 88 ? 2 : 1)) : 0;
    if (anyFun && stars > 1) stars = 1;
    if (win) {
      if (!anyFun) { save.stars[levelIdx] = Math.max(save.stars[levelIdx] || 0, stars); save.best[levelIdx] = Math.max(save.best[levelIdx] || 0, finalScore); }
      save.maxLevel = Math.max(save.maxLevel, Math.min(FS.LEVELS.length - 1, levelIdx + 1)); A.play(total ? 'total' : 'win');
    } else A.play('fail');
    save.meter = meter; persist();
    $('rsTitle').textContent = total ? 'Total destruction' : win ? 'Level cleared' : 'Not this time';
    var st = ''; for (var i = 0; i < 3; i++) st += '<span class="' + (i < stars ? '' : 'off') + '">★</span>'; $('stars').innerHTML = win ? st : '';
    $('rsMsg').textContent = win ? (total ? 'Nothing left standing. Bonus awarded.' : 'You reached the goal of ' + level.goal + ' percent.') : 'You reached ' + pct + ' percent and needed ' + level.goal + '. Retry as often as you like.' + (levelIdx < 4 && !win ? ' Aim for the poles and the guy lines.' : '');
    $('rsStats').innerHTML = '<dt>Destroyed</dt><dd>' + pct + '%</dd><dt>Points</dt><dd>' + score + '</dd>' + (win ? '<dt>Shots left bonus</dt><dd>+' + bonusShots + '</dd>' : '') + (total ? '<dt>Total destruction</dt><dd>+2500</dd>' : '') + '<dt>Final score</dt><dd>' + finalScore + '</dd>' + (anyFun ? '<dt>Fun option on</dt><dd>stars capped</dd>' : '');
    $('bNext').hidden = !(win && levelIdx < FS.LEVELS.length - 1);
    setTimeout(function () { if (mode === 'play' && phase === 'done') { openModal('result', win && !$('bNext').hidden ? $('bNext') : $('bRetry')); say($('rsTitle').textContent + '. ' + $('rsMsg').textContent); } }, 450);
  }

  // ---------------------------------------------------------------- UI plumbing
  var lastFocus = null;
  function openModal(id, focusEl) {
    closeModals(true); lastFocus = document.activeElement; modal = id; $(id).hidden = false; paused = (mode === 'play');
    var el = focusEl || $(id).querySelector('button'); if (el) try { el.focus(); } catch (e) {}
  }
  function closeModals(keep) {
    ['how', 'fun', 'picker', 'result', 'pause'].forEach(function (id) { $(id).hidden = true; });
    if (!keep) { modal = null; if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { try { lastFocus.focus(); } catch (e) {} } }
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !modal) return; var m = $(modal), f = m.querySelectorAll('button:not([disabled]),input,[tabindex]'); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
  function show(m) {
    mode = m; $('title').hidden = m !== 'title'; $('levels').hidden = m !== 'levels'; $('hud').hidden = m !== 'play'; $('bar').hidden = m !== 'play';
    if (m !== 'play') { $('prec').hidden = true; $('hint').hidden = true; $('toast').hidden = true; }
    else $('prec').hidden = !precision;
  }
  function openPause() { if (mode !== 'play') return; openModal('pause', $('bResume')); }
  function toggleSound() {
    var on = A.on ? A.set(false) : A.set(true); on = A.on;
    $('bSnd').setAttribute('aria-pressed', on); $('bSnd').setAttribute('aria-label', on ? 'Sound is on. Turn sound off' : 'Sound is off. Turn sound on'); $('bSnd2').setAttribute('aria-pressed', on); $('bSnd2').textContent = 'Sound: ' + (on ? 'on' : 'off');
    if (on) { A.play('ui'); } say(on ? 'Sound on' : 'Sound off');
  }
  function buildLevelGrid() {
    var h = '';
    FS.WORLDS.forEach(function (w, wi) {
      h += '<div class="wd"><h3>' + w.name + '</h3><p>' + w.blurb + '</p><div class="lg">';
      for (var j = 0; j < 4; j++) {
        var i = wi * 4 + j, ok = canPlay(i), st = save.stars[i] || 0, sx = ''; for (var q = 0; q < 3; q++) sx += q < st ? '★' : '☆';
        h += '<button class="lv" data-i="' + i + '" ' + (ok ? '' : 'disabled') + ' aria-label="Level ' + (i + 1) + ', ' + FS.LEVELS[i].name + (ok ? ', ' + st + ' stars' : ', locked') + '">' + (i + 1) + '<small>' + FS.LEVELS[i].name + '</small><span class="st" aria-hidden="true">' + (ok ? sx : '⚿') + '</span></button>';
      }
      h += '</div></div>';
    });
    $('lvGrid').innerHTML = h; var bs = $('lvGrid').querySelectorAll('.lv'); for (var i2 = 0; i2 < bs.length; i2++) bs[i2].onclick = function () { play(+this.dataset.i); };
  }
  function play(i) { closeModals(); show('play'); startLevel(i); persist(); }
  function toTitle() { closeModals(); show('title'); paused = false; startLevel(save.last || 0, true); $('bPlay').textContent = (save.maxLevel > 0 || Object.keys(save.stars).length) ? 'Continue' : 'Play'; try { $('bPlay').focus(); } catch (e) {} }
  function toLevels() { closeModals(); buildLevelGrid(); show('levels'); try { $('lvGrid').querySelector('.lv:not([disabled])').focus(); } catch (e) {} }

  $('bPlay').onclick = function () { A.play('ui'); play(Math.min(save.maxLevel, FS.LEVELS.length - 1)); if (!save.seenHelp) { save.seenHelp = true; persist(); } };
  $('bLevels').onclick = toLevels; $('bLvBack').onclick = toTitle;
  $('bHow').onclick = function () { openModal('how'); mode === 'title' && ($('how').hidden = false); }; $('bHowOk').onclick = function () { closeModals(); paused = false; };
  $('bFun').onclick = function () { openModal('fun'); }; $('bFun2').onclick = function () { openModal('fun'); }; $('bFunOk').onclick = function () { closeModals(); paused = false; if (mode === 'play' && funOn() !== anyFun) { startLevel(levelIdx, true); } };
  $('bSnd').onclick = toggleSound; $('bSnd2').onclick = toggleSound;
  $('bMenu').onclick = openPause; $('bResume').onclick = function () { closeModals(); paused = false; };
  $('bPsRetry').onclick = function () { closeModals(); paused = false; startLevel(levelIdx); }; $('bPsLevels').onclick = toLevels; $('bPsTitle').onclick = toTitle;
  $('bRetry').onclick = function () { closeModals(); paused = false; startLevel(levelIdx); };
  $('bNext').onclick = function () { closeModals(); paused = false; startLevel(levelIdx + 1); };
  $('bRsLevels').onclick = toLevels;
  $('bDone').onclick = function () { if (!busy() || phase === 'aim') { endT = 0; shotsLeft = 0; updateHud(); } };
  function syncFunUi() {
    var bs = $('gSeg').querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', Math.abs(+bs[i].dataset.g - save.fun.g) < 0.001);
    $('fMet').checked = save.fun.meteors; $('fSlow').checked = save.fun.slow; $('fRed').checked = reduced;
  }
  $('gSeg').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; save.fun.g = +b.dataset.g; if (world) world.gScale = save.fun.g; syncFunUi(); persist(); A.play('ui'); say('Gravity set to ' + b.textContent); };
  $('fMet').onchange = function () { save.fun.meteors = this.checked; persist(); };
  $('fSlow').onchange = function () { save.fun.slow = this.checked; persist(); };
  $('fRed').onchange = function () { reduced = this.checked; G.reduced = reduced; save.fun.reduce = reduced; document.body.classList.toggle('rm', reduced); persist(); };
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; $('bInstall').hidden = false; });
  $('bInstall').onclick = function () { if (installEvt) { installEvt.prompt(); installEvt = null; $('bInstall').hidden = true; } };
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone) $('iosTip').hidden = false;
  window.addEventListener('appinstalled', function () { $('bInstall').hidden = true; });

  function updateStatus() {
    pct = Math.min(100, Math.round(broken / totalLinks * 100)); var was = goalMet; goalMet = pct >= level.goal;
    if (goalMet && !was) { toast('Goal reached! Keep going for more points'); }
  }
  function updateHud(force) {
    $('score').textContent = Math.round(shownScore); var d = $('dbar'); d.classList.toggle('met', goalMet); $('dfill').style.width = pct + '%'; $('dpct').textContent = pct + '%'; d.setAttribute('aria-valuenow', pct);
    var sh = ''; for (var i = 0; i < 3; i++) sh += '<i class="' + (i < shotsUsed ? 'used' : '') + '"></i>'; if ($('shots').dataset.n !== sh) { $('shots').innerHTML = sh; $('shots').dataset.n = sh; }
    $('shots').setAttribute('aria-label', shotsLeft + ' shots left');
    var sp = $('bSpec'), ready = meter >= 1 && !SP.active(); sp.disabled = !ready; sp.classList.toggle('ready', ready);
    $('specArc').style.strokeDasharray = Math.round(meter * 100) + ' 100'; $('specTxt').textContent = meter >= 1 ? 'READY' : Math.round(meter * 100) + '%';
    sp.setAttribute('aria-label', ready ? 'Special power ready. Choose a power' : 'Special power meter ' + Math.round(meter * 100) + ' percent');
    $('bDone').hidden = !(goalMet && shotsLeft > 0 && phase === 'aim');
    document.querySelectorAll('.wpn').forEach(function (b) { if (!b.disabled) b.style.opacity = busy() ? 0.6 : 1; });
  }

  // ---------------------------------------------------------------- update
  function step(dt) {
    simT += dt; var gdt = dt;
    world.gScale = save.fun.g;
    world.step(dt); SP.update(dt, G);
    P.step(dt, world.g * world.gScale, world);
    // strikes (drone airstrike)
    for (var i = strikes.length - 1; i >= 0; i--) {
      var st = strikes[i]; st.x += 520 * dt;
      if (!st.dropped && st.x >= st.tx + st.off) { st.dropped = true; world.proj.push({ x: st.x, y: st.y - 8, vx: 180, vy: -120, r: 8, m: 2, kind: 'bomb', expl: true, R: FS.WEAPONS.drone.R * (1 + 0.04 * levelIdx), D: FS.WEAPONS.drone.D * level.pm, imp: FS.WEAPONS.drone.imp, pm: level.pm, life: 6, rot: 0, gm: 1, pierce: 1, slow: 1 }); A.play('bomb'); }
      if (st.x > viewW + 120) strikes.splice(i, 1);
    }
    // trails and burning
    for (i = 0; i < world.proj.length; i++) {
      var p = world.proj[i];
      if (p.kind === 'rocket' || p.kind === 'meteor') { if (!reduced || Math.random() < 0.5) { P.fire(p.x - p.vx * 0.01, p.y - p.vy * 0.01, -p.vx * 0.1 + (Math.random() - 0.5) * 40, -p.vy * 0.1 + (Math.random() - 0.5) * 40, p.kind === 'meteor' ? 12 : 6, 0.35); } if (Math.random() < 0.5) P.smoke(p.x, p.y, p.kind === 'meteor' ? 10 : 5, 0.9); }
      else if (p.kind === 'ball' && Math.random() < 0.4) P.smoke(p.x, p.y, 3.5, 0.5);
    }
    for (i = 0; i < world.links.length; i++) {
      var l = world.links[i]; if (l.broken) continue;
      if (l.burn > 0) { l.burn -= dt; if (Math.random() < dt * 14 && P.list.length < P.cap * 0.8) P.fire(l.a.x + (l.b.x - l.a.x) * Math.random(), l.a.y + (l.b.y - l.a.y) * Math.random(), (Math.random() - 0.5) * 20, 40 + Math.random() * 50, 5, 0.5); if (l.M.flam > 0.3) world.damage(l, 0.22 * dt * l.M.flam * 1.5, 'fire'); }
    }
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (save.fun.meteors && mode === 'play') { spawnMeteorT -= dt; if (spawnMeteorT <= 0) { spawnMeteor(); spawnMeteorT = reduced ? 1.6 : 0.5 + Math.random() * 0.7; } }
    if (mode !== 'play') return;
    // level flow
    if (phase === 'flight' && world.proj.length === 0 && strikes.length === 0 && !SP.active()) {
      if (FS.settled(world)) settleT += dt; else settleT += dt * 0.25;
      if (settleT > 1.1) { phase = 'aim'; settleT = 0; }
    }
    if (phase === 'aim' && shotsLeft === 0 && !SP.active() && world.proj.length === 0 && strikes.length === 0) { endT += dt; if (endT > 0.9 && (FS.settled(world) || endT > 4)) judge(); }
    else if (phase === 'flight' && shotsLeft === 0) { /* wait */ }
    if (pct >= 97 && !resultShown && !SP.active() && world.proj.length === 0 && strikes.length === 0) { endT += dt; if (endT > 1.4) judge(); }
    if (shotsLeft === 0 && phase === 'flight' && world.proj.length === 0 && strikes.length === 0 && !SP.active() && settleT > 1) { phase = 'aim'; }
  }

  // ---------------------------------------------------------------- rendering helpers
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function mix(h1, h2, t) { var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16), r = (a >> 16) + ((b >> 16) - (a >> 16)) * t, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')'; }
  function setWorldT(c, ox, oy) { c.setTransform(pr * s, 0, 0, -pr * s, ox || 0, pr * gy + (oy || 0)); }
  function setScreenT(c) { c.setTransform(pr, 0, 0, pr, 0, 0); }

  function drawBackground(c, t) {
    var wd = FS.WORLDS[level ? level.world : 0], gW = W, i, k;
    setScreenT(c);
    var g = c.createLinearGradient(0, 0, 0, gy + 40 * s); g.addColorStop(0, wd.sky[0]); g.addColorStop(0.55, wd.sky[1]); g.addColorStop(1, wd.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    var night = level && level.world >= 2;
    if (night) { for (i = 0; i < bg.stars.length; i++) { var st = bg.stars[i], tw = 0.5 + 0.5 * Math.sin(t * (1 + st.z * 2) + i); c.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.6 * tw * (level.world === 3 ? 1 : 0.5)) + ')'; c.fillRect(st.x * W, st.y * gy, 1.6 + st.z, 1.6 + st.z); } }
    // sun or moon with glow
    var sx = W * (portrait ? 0.3 : 0.62), sy = gy * 0.36, rad = Math.min(W, H) * 0.075;
    var gl = c.createRadialGradient(sx, sy, rad * 0.4, sx, sy, rad * 5); gl.addColorStop(0, rgba(wd.sun, 0.55)); gl.addColorStop(1, rgba(wd.sun, 0)); c.fillStyle = gl; c.fillRect(sx - rad * 5, sy - rad * 5, rad * 10, rad * 10);
    c.fillStyle = wd.sun; c.beginPath(); c.arc(sx, sy, rad, 0, 6.3); c.fill();
    if (level && level.world === 3) { // aurora ribbons
      for (k = 0; k < 3; k++) { c.beginPath(); c.moveTo(0, gy * 0.5); for (i = 0; i <= 20; i++) c.lineTo(W * i / 20, gy * (0.28 + 0.07 * k) + Math.sin(i * 0.7 + t * 0.4 + k) * 22); for (i = 20; i >= 0; i--) c.lineTo(W * i / 20, gy * (0.4 + 0.07 * k) + Math.sin(i * 0.5 + t * 0.3 + k * 2) * 30); c.closePath(); c.fillStyle = 'rgba(' + (k === 1 ? '150,120,255' : '90,255,200') + ',0.09)'; c.fill(); }
    }
    // clouds
    for (i = 0; i < bg.clouds.length; i++) {
      var cl = bg.clouds[i], x = ((cl.x * W + t * cl.sp * (reduced ? 0.2 : 1)) % (W + 240)) - 120, y = cl.y * gy, sc = cl.sc * Math.min(1, s * 1.2 + 0.3);
      c.fillStyle = night ? 'rgba(160,180,230,0.12)' : 'rgba(255,255,255,0.55)';
      for (k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + (k - 2) * 26 * sc, y + Math.sin(k * 2) * 6 * sc, 30 * sc, 14 * sc, 0, 0, 6.3); c.fill(); }
    }
    // hills in three layers, each lighter with distance
    var wy = gy + (-FS.WATER_Y) * s;
    for (k = 0; k < 3; k++) {
      var base = gy - (36 + k * 44) * s * 0.55; c.beginPath(); c.moveTo(0, wy + 4);
      for (i = 0; i <= 40; i++) { var xx = W * i / 40, h = 0; for (var q = 0; q < 5; q++) { var ly = bg.layers[k][q]; h += Math.sin(xx / s * ly.f + ly.ph + k * 3) * ly.am * 0.5; } c.lineTo(xx, base - Math.abs(h) * s * 0.6 - (2 - k) * 10 * s * 0.4); }
      c.lineTo(W, wy + 4); c.closePath();
      c.fillStyle = mix(wd.hill[k], wd.sky[2], 0.12 + (2 - k) * 0.0); c.globalAlpha = 1; c.fill();
      var hz = c.createLinearGradient(0, base - 90 * s, 0, base + 10); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, rgba(wd.sky[2], 0.35 - k * 0.08)); c.fillStyle = hz; c.fill();
    }
  }

  function drawWater(c, t) {
    var x0 = cliffEdge * s - 30, x1 = islandX0 * s + 30, wy = gy + (-FS.WATER_Y) * s, i, k;
    setScreenT(c);
    var wd = FS.WORLDS[level.world], g = c.createLinearGradient(0, wy, 0, H); g.addColorStop(0, mix('#3bb5c9', wd.sky[2], level.world >= 2 ? 0.35 : 0)); g.addColorStop(0.4, '#17708f'); g.addColorStop(1, '#0a2a4a');
    c.fillStyle = g; c.fillRect(0, wy, W, H - wy);
    if (quality >= 2) {
      // mirror what is above the waterline, broken into shimmering strips
      var gx0 = Math.max(0, Math.floor(x0 + 20)), gw = Math.min(W, Math.ceil(x1 - 20)) - gx0, rh = Math.min(140 * s, H - wy - 2), step = 4;
      if (gw > 4) {
        c.save(); c.beginPath(); c.rect(gx0, wy, gw, H - wy); c.clip(); c.globalAlpha = 0.34;
        for (i = 0; i < rh; i += step) {
          var srcY = wy - i - step, off = Math.sin(t * 2.2 + i * 0.22) * (1.5 + i * 0.05) * (reduced ? 0.3 : 1);
          if (srcY < 0) break; c.drawImage(cv, gx0 * pr, srcY * pr, gw * pr, step * pr, gx0 + off, wy + i, gw, step);
        }
        c.restore();
      }
    }
    // depth tint, waves, sparkle
    c.globalAlpha = 1; var dg = c.createLinearGradient(0, wy, 0, H); dg.addColorStop(0, 'rgba(10,40,70,0)'); dg.addColorStop(1, 'rgba(5,20,45,0.55)'); c.fillStyle = dg; c.fillRect(x0 - 40, wy, x1 - x0 + 80, H - wy);
    c.save(); c.beginPath(); c.rect(x0 - 40, wy - 10, x1 - x0 + 80, H - wy + 10); c.clip();
    for (k = 0; k < 5; k++) {
      var yy = wy + 3 + k * (H - wy) / 7 + (k * 3); c.beginPath(); c.lineWidth = 1.6 + k * 0.4; c.strokeStyle = 'rgba(210,245,255,' + (0.5 - k * 0.08) + ')';
      for (i = 0; i <= 30; i++) { var xx = x0 - 40 + (x1 - x0 + 80) * i / 30, yv = yy + Math.sin(i * 0.9 + t * (1.3 + k * 0.2) + k * 1.7) * (2.5 + k * 1.3) * (reduced ? 0.4 : 1) * Math.min(1, s * 1.2); if (i === 0) c.moveTo(xx, yv); else c.lineTo(xx, yv); }
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.85)'; for (i = 0; i < 26; i++) { var px = x0 + ((i * 97.3 + t * 8) % Math.max(10, x1 - x0)), py = wy + 6 + ((i * 53.7) % Math.max(20, (H - wy) * 0.7)), tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.9); c.globalAlpha = tw * 0.7; c.fillRect(px, py, 2, 2); }
    c.globalAlpha = 1; c.restore();
  }

  function drawPlatforms(c, t) {
    var wd = FS.WORLDS[level.world], plat = [{ a: -60 / s, b: cliffEdge, left: true }, { a: islandX0, b: viewW + 80, left: false }], i, k;
    var rock0 = ['#7b6a63', '#6a6a78', '#58607a', '#2b3a4d'][level.world], rock1 = ['#4a3f4c', '#3f4458', '#2c3248', '#101a28'][level.world], grass = ['#97c46a', '#6fbf6a', '#5aa67e', '#2f8f86'][level.world], grassD = ['#5f8f3d', '#3d8a45', '#357a5a', '#1f6a68'][level.world];
    plat.forEach(function (p) {
      var xa = p.a * s, xb = p.b * s, topY = gy, bot = H + 10, dx = 12 * s, dy = 15 * s;
      // front rock face
      var g = c.createLinearGradient(0, topY, 0, bot); g.addColorStop(0, rock0); g.addColorStop(1, rock1);
      c.fillStyle = g; c.beginPath();
      if (p.left) { c.moveTo(xa, topY); c.lineTo(xb, topY); c.lineTo(xb - 4 * s, topY + 60 * s); c.lineTo(xb - 18 * s, topY + 140 * s); c.lineTo(xb - 10 * s, bot); c.lineTo(xa, bot); }
      else { c.moveTo(xa, topY); c.lineTo(xb, topY); c.lineTo(xb, bot); c.lineTo(xa + 4 * s, bot); c.lineTo(xa + 20 * s, topY + 140 * s); c.lineTo(xa + 5 * s, topY + 60 * s); }
      c.closePath(); c.fill();
      c.save(); c.clip();
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1.5; for (k = 1; k < 9; k++) { c.beginPath(); var yy = topY + k * 26 * s; c.moveTo(xa - 10, yy); for (i = 0; i <= 12; i++) c.lineTo(xa + (xb - xa) * i / 12, yy + Math.sin(i * 2.3 + k * 1.7) * 4 * s); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.08)'; for (k = 0; k < 6; k++) c.fillRect(xa + (xb - xa) * ((k * 0.19 + 0.05) % 1), topY, 3 * s, 80 * s * (0.4 + (k % 3) * 0.3));
      // wet band at the waterline
      var wl = gy + (-FS.WATER_Y) * s; c.fillStyle = 'rgba(20,70,110,0.5)'; c.fillRect(xa - 5, wl, xb - xa + 10, H - wl);
      c.restore();
      // grass top face (parallelogram, gives depth)
      c.fillStyle = grass; c.beginPath(); c.moveTo(xa, topY); c.lineTo(xb, topY); c.lineTo(xb + dx, topY - dy); c.lineTo(xa + dx, topY - dy); c.closePath(); c.fill();
      var tg = c.createLinearGradient(0, topY - dy, 0, topY); tg.addColorStop(0, 'rgba(255,255,255,0.18)'); tg.addColorStop(1, 'rgba(0,0,0,0.12)'); c.fillStyle = tg; c.fill();
      c.fillStyle = grassD; c.fillRect(xa, topY - 1.5, xb - xa, 5 * s);
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(xa, topY); c.lineTo(xb, topY); c.stroke();
      // tufts
      c.strokeStyle = grassD; c.lineWidth = 1.4; for (i = 0; i < bg.tufts.length; i++) { var tf = bg.tufts[i], x = xa + (xb - xa) * tf.x; if (x < -5 || x > W + 5) continue; var yy2 = topY - dy * (0.15 + (i % 5) * 0.16); c.beginPath(); c.moveTo(x, yy2); c.lineTo(x - 3 * s * tf.sc, yy2 - 7 * s * tf.sc); c.moveTo(x, yy2); c.lineTo(x + 3 * s * tf.sc, yy2 - 8 * s * tf.sc); c.stroke(); }
      // foam where rock meets water
      c.fillStyle = 'rgba(255,255,255,0.7)'; var fx = p.left ? xb - 20 * s : xa + 12 * s; for (i = 0; i < 7; i++) { c.beginPath(); c.ellipse(fx + Math.sin(t * 1.5 + i) * 4 + (p.left ? 8 : -8) * Math.sin(i), gy + (-FS.WATER_Y) * s + 4 + i * 1.5, 6 * s + 3, 2, 0, 0, 6.3); c.fill(); }
    });
    // shadow under the structure
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse((structCx + 10) * s, gy - 6 * s, 120 * s, 9 * s, 0, 0, 6.3); c.fill();
  }

  function drawStructure(c, t) {
    var L = world.links, i, l, M, n, wd = 1, dz = { x: 7, y: 5 };
    var used = {};
    setWorldT(c, shakeX, shakeY);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // back plane: thin dark copies give the sense of depth
    if (quality >= 1) {
      c.globalAlpha = 0.5;
      for (i = 0; i < L.length; i++) { l = L[i]; if (l.broken) continue; c.strokeStyle = l.type === 'cable' ? 'rgba(20,20,30,0.55)' : rgba(l.M.strutDark, 0.9); c.lineWidth = l.type === 'cable' ? 1.4 : l.w * 0.8; c.beginPath(); c.moveTo(l.a.x + dz.x, l.a.y + dz.y); c.lineTo(l.b.x + dz.x, l.b.y + dz.y); c.stroke(); }
      c.globalAlpha = 0.28; c.strokeStyle = '#000'; c.lineWidth = 1;
      for (i = 0; i < L.length; i++) { l = L[i]; if (l.broken || l.type === 'cable') continue; c.beginPath(); c.moveTo(l.a.x, l.a.y); c.lineTo(l.a.x + dz.x, l.a.y + dz.y); c.moveTo(l.b.x, l.b.y); c.lineTo(l.b.x + dz.x, l.b.y + dz.y); c.stroke(); }
      c.globalAlpha = 1;
    }
    // fabric and films between the struts
    for (i = 0; i < world.panels.length; i++) {
      var pn = world.panels[i], ok = true, j; for (j = 0; j < pn.links.length; j++) if (pn.links[j].broken) ok = false; if (!ok) continue;
      M = pn.links[0].M; if (!M.fabric) continue;
      var f = c.createLinearGradient(pn.nodes[0].x, pn.nodes[0].y, pn.nodes[2].x, pn.nodes[2].y); f.addColorStop(0, M.fabric); f.addColorStop(1, M.fabric2);
      c.fillStyle = f; c.beginPath(); c.moveTo(pn.nodes[0].x + dz.x * 0.5, pn.nodes[0].y + dz.y * 0.5); for (j = 1; j < pn.nodes.length; j++) c.lineTo(pn.nodes[j].x + dz.x * 0.5, pn.nodes[j].y + dz.y * 0.5); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1; c.stroke();
    }
    // front links
    for (i = 0; i < L.length; i++) {
      l = L[i]; if (l.broken) continue; M = l.M; used[l.a.id] = true; used[l.b.id] = true;
      var ax = l.a.x, ay = l.a.y, bx = l.b.x, by = l.b.y, hot = l.heat > 0 || l.burn > 0;
      if (l.type === 'cable') {
        var d = Math.hypot(bx - ax, by - ay), slack = l.rest - d, tens = Math.max(0, l.tension / (M.cb * l.hs0));
        c.strokeStyle = tens > 0.55 ? mix(M.cable, '#ff6b5c', Math.min(1, (tens - 0.55) * 2.2)) : M.cable; c.lineWidth = 2 + (level.world >= 2 ? 0.4 : 0);
        c.beginPath(); c.moveTo(ax, ay);
        if (slack > 0.5) { var sg = Math.sqrt(slack * (d + slack)) * 0.7; c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - sg, bx, by); } else c.lineTo(bx, by);
        c.stroke();
        if (level.world === 3) { c.strokeStyle = 'rgba(110,231,224,0.35)'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
        if (hot) { c.strokeStyle = 'rgba(255,140,50,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
      } else {
        var w = l.w, dmgC = Math.min(1, l.dmg * 1.1), base = dmgC > 0 ? mix(M.strut, '#3a2a22', dmgC * 0.55) : M.strut;
        c.strokeStyle = M.strutDark; c.lineWidth = w + 2.2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        c.strokeStyle = base; c.lineWidth = w; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        var nx = by - ay, ny = -(bx - ax), nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; var off = w * 0.22; // light from upper left
        var up = ny < 0 ? -1 : 1;
        c.strokeStyle = level.world === 3 ? 'rgba(110,231,224,0.7)' : 'rgba(255,255,255,0.55)'; c.lineWidth = Math.max(1.2, w * 0.22); c.beginPath(); c.moveTo(ax + nx * off * up, ay + ny * off * up); c.lineTo(bx + nx * off * up, by + ny * off * up); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = Math.max(1, w * 0.2); c.beginPath(); c.moveTo(ax - nx * off * up, ay - ny * off * up); c.lineTo(bx - nx * off * up, by - ny * off * up); c.stroke();
        if (level.world === 0 || level.world === 1) { // bamboo rings or plank joins
          var dl = Math.hypot(bx - ax, by - ay), cnt = Math.max(1, Math.floor(dl / 22)); c.strokeStyle = 'rgba(70,40,10,0.45)'; c.lineWidth = 1.2; c.beginPath();
          for (var q = 1; q <= cnt; q++) { var tt = q / (cnt + 1), px = ax + (bx - ax) * tt, py = ay + (by - ay) * tt; c.moveTo(px - nx * w * 0.5, py - ny * w * 0.5); c.lineTo(px + nx * w * 0.5, py + ny * w * 0.5); } c.stroke();
        } else if (level.world === 2) { c.fillStyle = '#e8eef5'; var dl2 = Math.hypot(bx - ax, by - ay), c2 = Math.max(1, Math.floor(dl2 / 20)); for (var q2 = 1; q2 <= c2; q2++) { var t2 = q2 / (c2 + 1); c.beginPath(); c.arc(ax + (bx - ax) * t2, ay + (by - ay) * t2, 1.2, 0, 6.3); c.fill(); } }
        if (hot) { c.strokeStyle = 'rgba(255,120,40,' + (0.45 + 0.3 * Math.sin(t * 20 + i)) + ')'; c.lineWidth = w + 3; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
        if (l.dmg > 0.35) { c.strokeStyle = 'rgba(20,10,5,0.7)'; c.lineWidth = 1; c.beginPath(); var mx = (ax + bx) / 2, my = (ay + by) / 2; c.moveTo(mx - nx * w * 0.5, my - ny * w * 0.5); c.lineTo(mx + nx * 2, my + ny * 2 + 2); c.lineTo(mx + nx * w * 0.5 + 2, my + ny * w * 0.5); c.stroke(); }
      }
    }
    // joints
    for (i = 0; i < world.nodes.length; i++) {
      n = world.nodes[i]; if (!used[n.id] || n.dead) continue;
      if (n.fixed) { c.fillStyle = '#4a3a30'; c.beginPath(); c.arc(n.x, n.y, 4.2, 0, 6.3); c.fill(); c.fillStyle = '#b79a7a'; c.beginPath(); c.arc(n.x - 1, n.y + 1, 2, 0, 6.3); c.fill(); continue; }
      var g = c.createRadialGradient(n.x - 1.5, n.y + 1.5, 0.5, n.x, n.y, 5.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, FS.MATS[level.mat].cable); g.addColorStop(1, FS.MATS[level.mat].strutDark);
      c.fillStyle = g; c.beginPath(); c.arc(n.x, n.y, 5, 0, 6.3); c.fill();
    }
  }

  var shakeX = 0, shakeY = 0;

  function drawLauncher(c, t) {
    setWorldT(c, shakeX, shakeY);
    var lx = launcher.x, a = aim.angle, rc = fireRecoil * 6;
    // stone ledge
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(lx + 6, 3, 38, 6, 0, 0, 6.3); c.fill();
    if (weapon === 'sling') {
      c.lineCap = 'round'; var hx = lx, pull = dragging && ptr && ptr.moved ? aim.power * 26 : 0, px = hx - Math.cos(a) * pull, py = 52 - Math.sin(a) * pull;
      c.strokeStyle = '#5a3b1d'; c.lineWidth = 9; c.beginPath(); c.moveTo(hx, 2); c.lineTo(hx, 30); c.moveTo(hx, 30); c.lineTo(hx - 15, 62); c.moveTo(hx, 30); c.lineTo(hx + 15, 62); c.stroke();
      c.strokeStyle = '#c28a4a'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx, 2); c.lineTo(hx, 30); c.moveTo(hx, 30); c.lineTo(hx - 15, 62); c.moveTo(hx, 30); c.lineTo(hx + 15, 62); c.stroke();
      c.strokeStyle = '#e9d9b0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx - 15, 62); c.lineTo(px, py); c.lineTo(hx + 15, 62); c.stroke();
      if (canFire() || dragging) { c.fillStyle = '#5b6a85'; c.beginPath(); c.arc(px, py, 7, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(px - 2, py + 2, 2.4, 0, 6.3); c.fill(); }
    } else if (weapon === 'cannon') {
      c.save(); c.translate(lx + 6, 30); c.rotate(a - rc * 0.01);
      var g = c.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, '#9aa7ba'); g.addColorStop(0.5, '#55607a'); g.addColorStop(1, '#232a3d');
      c.fillStyle = g; c.beginPath(); c.moveTo(-18 - rc, -11); c.lineTo(40 - rc, -8); c.lineTo(42 - rc, -11); c.lineTo(42 - rc, 11); c.lineTo(40 - rc, 8); c.lineTo(-18 - rc, 12); c.closePath(); c.fill();
      c.fillStyle = '#c9a24a'; c.fillRect(8 - rc, -11, 4, 22); c.fillRect(30 - rc, -10, 3, 20); c.restore();
      c.fillStyle = '#6b4a28'; c.beginPath(); c.arc(lx - 6, 14, 14, 0, 6.3); c.fill(); c.fillStyle = '#c28a4a'; c.beginPath(); c.arc(lx - 6, 14, 10, 0, 6.3); c.fill(); c.fillStyle = '#3b2a18'; c.beginPath(); c.arc(lx - 6, 14, 3, 0, 6.3); c.fill();
      c.strokeStyle = '#3b2a18'; c.lineWidth = 3; c.beginPath(); c.moveTo(lx - 6, 14); c.lineTo(lx + 6, 30); c.stroke();
    } else if (weapon === 'rocket') {
      c.strokeStyle = '#2b3347'; c.lineWidth = 4; c.beginPath(); c.moveTo(lx, 34); c.lineTo(lx - 16, 0); c.moveTo(lx, 34); c.lineTo(lx + 16, 0); c.stroke();
      c.save(); c.translate(lx, 40); c.rotate(a);
      var g2 = c.createLinearGradient(0, -10, 0, 10); g2.addColorStop(0, '#d7dfef'); g2.addColorStop(0.5, '#7685a3'); g2.addColorStop(1, '#2b3347');
      c.fillStyle = g2; c.fillRect(-22 - rc, -9, 52, 18); c.fillStyle = '#ff6b5c'; c.fillRect(24, -9, 6, 18); c.fillStyle = '#12182a'; c.beginPath(); c.arc(30, 0, 8, -1.57, 1.57); c.fill();
      if (canFire()) { c.fillStyle = '#4fe3c1'; c.beginPath(); c.arc(-6, -9, 2.4, 0, 6.3); c.fill(); }
      c.restore();
    } else { // drone strike controller: a launch pad with a docked drone
      c.fillStyle = '#39445f'; c.fillRect(lx - 26, 0, 52, 8); c.fillStyle = '#4fe3c1'; c.fillRect(lx - 26, 7, 52, 1.5);
      c.fillStyle = '#9fb0d6'; c.fillRect(lx - 10, 12 + Math.sin(t * 3) * 1.5, 20, 8); c.strokeStyle = '#4fe3c1'; c.lineWidth = 3; c.beginPath(); c.moveTo(lx - 24, 24 + Math.sin(t * 3) * 1.5); c.lineTo(lx - 6, 24 + Math.sin(t * 3) * 1.5); c.moveTo(lx + 6, 24 + Math.sin(t * 3) * 1.5); c.lineTo(lx + 24, 24 + Math.sin(t * 3) * 1.5); c.stroke();
    }
    fireRecoil = Math.max(0, fireRecoil - 0.06);
  }

  function previewPath() {
    var pts = [], k = weapon, W_ = FS.WEAPONS[k]; if (k === 'drone') return pts;
    var mz = muzzle(k), sp = launchSpeed(), x = mz.x, y = mz.y, vx = Math.cos(aim.angle) * sp, vy = Math.sin(aim.angle) * sp, g = world.g * world.gScale, dt = 0.025, thr = k === 'rocket' ? W_.thr : 0, gm = k === 'rocket' ? 0.55 : 1, hit = null, maxT = k === 'sling' ? 1.15 : 2.6, r = W_.r;
    for (var t = 0; t < maxT; t += dt) {
      if (thr > 0) { var spd = Math.hypot(vx, vy) || 1; vx += vx / spd * W_.acc * dt; vy += vy / spd * W_.acc * dt; thr -= dt; }
      vy -= g * gm * dt; x += vx * dt; y += vy * dt; pts.push({ x: x, y: y, t: t });
      if (y < r && world.onPlatform(x)) { hit = { x: x, y: 0 }; break; } if (y < FS.WATER_Y) break;
      for (var i = 0; i < world.links.length; i++) { var l = world.links[i]; if (l.broken) continue; var s2 = FS.segDist(l, x, y); if (s2.d < r + l.w * 0.5) { hit = { x: x, y: y }; break; } }
      if (hit) break;
    }
    pts.hit = hit; return pts;
  }

  function drawAim(c, t) {
    if (mode !== 'play' || !canFire()) return; setWorldT(c, shakeX, shakeY);
    if (weapon === 'drone') {
      var x = aim.tx, y = Math.max(aim.ty, 30), pulse = 1 + Math.sin(t * 6) * 0.06;
      c.strokeStyle = 'rgba(255,107,92,0.95)'; c.lineWidth = 2.2; c.setLineDash([6, 5]); c.beginPath(); c.arc(x, y, 30 * pulse, 0, 6.3); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(x - 42, y); c.lineTo(x - 14, y); c.moveTo(x + 14, y); c.lineTo(x + 42, y); c.moveTo(x, y - 42); c.lineTo(x, y - 14); c.moveTo(x, y + 14); c.lineTo(x, y + 42); c.stroke();
      c.strokeStyle = 'rgba(255,107,92,0.45)'; c.lineWidth = 1.5; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(x, y); c.lineTo(x, 0); c.stroke(); c.setLineDash([]);
      for (var o = -1; o <= 1; o++) { c.fillStyle = 'rgba(255,107,92,0.6)'; c.beginPath(); c.arc(x + o * 40, 4, 4, 0, 6.3); c.fill(); }
      return;
    }
    var pts = previewPath(), i; for (i = 0; i < pts.length; i += 2) { var p = pts[i], a = 1 - i / pts.length * 0.8; c.fillStyle = 'rgba(255,255,255,' + (0.9 * a) + ')'; c.beginPath(); c.arc(p.x, p.y, 2.4 + a * 1.2, 0, 6.3); c.fill(); c.fillStyle = 'rgba(79,227,193,' + (0.35 * a) + ')'; c.beginPath(); c.arc(p.x, p.y, 5, 0, 6.3); c.fill(); }
    if (pts.hit) { c.strokeStyle = 'rgba(255,181,71,0.95)'; c.lineWidth = 2; c.beginPath(); c.arc(pts.hit.x, pts.hit.y, 12 + Math.sin(t * 8) * 1.5, 0, 6.3); c.stroke(); c.beginPath(); c.moveTo(pts.hit.x - 7, pts.hit.y); c.lineTo(pts.hit.x + 7, pts.hit.y); c.moveTo(pts.hit.x, pts.hit.y - 7); c.lineTo(pts.hit.x, pts.hit.y + 7); c.stroke(); }
    // power and angle readout next to the launcher
    setScreenT(c); c.font = '700 ' + Math.max(12, 13) + 'px ui-sans-serif,system-ui,sans-serif'; c.fillStyle = 'rgba(255,255,255,0.9)'; c.textAlign = 'left';
    var sxx = (launcher.x + 24) * s, syy = gy - 78 * s; c.fillText(Math.round(aim.angle * 57.2958) + '°  ' + Math.round(aim.power * 100) + '%', sxx, syy);
  }

  function drawProj(c, t) {
    setWorldT(c, shakeX, shakeY); var i, p;
    for (i = 0; i < world.proj.length; i++) {
      p = world.proj[i]; c.save(); c.translate(p.x, p.y);
      if (p.kind === 'stone' || p.kind === 'ball') {
        var gr = c.createRadialGradient(-p.r * 0.35, p.r * 0.35, 1, 0, 0, p.r); if (p.kind === 'stone') { gr.addColorStop(0, '#e6edf8'); gr.addColorStop(1, '#4a5a78'); } else { gr.addColorStop(0, '#8d97ab'); gr.addColorStop(0.5, '#2b3244'); gr.addColorStop(1, '#0c1018'); }
        c.fillStyle = gr; c.beginPath(); c.arc(0, 0, p.r, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, p.r * 0.7, 0.4 + p.rot, 1.6 + p.rot); c.stroke();
      } else if (p.kind === 'rocket') {
        c.rotate(Math.atan2(p.vy, p.vx)); var g2 = c.createLinearGradient(0, -6, 0, 6); g2.addColorStop(0, '#fff'); g2.addColorStop(1, '#8d9ab8'); c.fillStyle = g2; c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(8, -7, -10, -6); c.lineTo(-10, 6); c.quadraticCurveTo(8, 7, 14, 0); c.fill();
        c.fillStyle = '#ff6b5c'; c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(10, -4, 6, -5.5); c.lineTo(6, 5.5); c.quadraticCurveTo(10, 4, 14, 0); c.fill(); c.fillStyle = '#4fe3c1'; c.beginPath(); c.moveTo(-10, -6); c.lineTo(-17, -11); c.lineTo(-4, -6); c.fill(); c.beginPath(); c.moveTo(-10, 6); c.lineTo(-17, 11); c.lineTo(-4, 6); c.fill();
      } else if (p.kind === 'bomb') {
        c.rotate(Math.atan2(p.vy, p.vx)); c.fillStyle = '#313a52'; c.beginPath(); c.ellipse(0, 0, 11, 6, 0, 0, 6.3); c.fill(); c.fillStyle = '#ff6b5c'; c.fillRect(4, -6, 3, 12); c.fillStyle = '#9fb0d6'; c.beginPath(); c.moveTo(-9, -3); c.lineTo(-15, -8); c.lineTo(-12, 0); c.lineTo(-15, 8); c.lineTo(-9, 3); c.fill();
      } else { // meteor
        c.rotate(p.rot); var gm = c.createRadialGradient(-3, 3, 1, 0, 0, p.r); gm.addColorStop(0, '#ffe3a0'); gm.addColorStop(0.5, '#a5532a'); gm.addColorStop(1, '#3a1a10'); c.fillStyle = gm; c.beginPath(); for (var k = 0; k < 9; k++) { var aa = k / 9 * 6.283, rr = p.r * (0.82 + 0.25 * Math.sin(k * 2.7)); c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); c.fill();
      }
      c.restore();
    }
    // drone strike aircraft
    for (i = 0; i < strikes.length; i++) {
      var st = strikes[i]; c.save(); c.translate(st.x, st.y); c.fillStyle = '#2d3445'; c.fillRect(-12, -3, 24, 7); c.fillStyle = '#9fb0d6'; c.fillRect(-12, 1, 24, 3); c.strokeStyle = '#4fe3c1'; c.lineWidth = 3; c.beginPath(); c.moveTo(-22, 6); c.lineTo(-4, 6); c.moveTo(4, 6); c.lineTo(22, 6); c.stroke();
      c.fillStyle = 'rgba(170,220,255,0.5)'; c.beginPath(); c.ellipse(-14, 7, 10 * Math.abs(Math.cos(t * 40 + i)) + 2, 1.5, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(14, 7, 10 * Math.abs(Math.cos(t * 40 + i + 1)) + 2, 1.5, 0, 0, 6.3); c.fill(); c.fillStyle = st.dropped ? '#6cf5a6' : '#ff6b5c'; c.beginPath(); c.arc(0, 0, 2, 0, 6.3); c.fill(); c.restore();
    }
  }

  function drawParticles(c, t) {
    setWorldT(c, shakeX, shakeY); var L = P.list, i, p, a;
    c.globalCompositeOperation = 'lighter';
    for (i = 0; i < L.length; i++) {
      p = L[i]; a = p.life / p.max;
      if (p.kind === 'fire') { var r = p.size * (0.5 + a * 0.7), gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); gr.addColorStop(0, 'rgba(255,240,170,' + (0.9 * a) + ')'); gr.addColorStop(0.45, 'rgba(255,140,40,' + (0.55 * a) + ')'); gr.addColorStop(1, 'rgba(200,40,10,0)'); c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, r, 0, 6.3); c.fill(); }
      else if (p.kind === 'spark') { c.strokeStyle = p.col; c.globalAlpha = a; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke(); c.globalAlpha = 1; }
      else if (p.kind === 'flash') { var fg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size); fg.addColorStop(0, 'rgba(255,255,230,' + a + ')'); fg.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = fg; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.3); c.fill(); }
    }
    c.globalCompositeOperation = 'source-over';
    for (i = 0; i < L.length; i++) {
      p = L[i]; a = p.life / p.max;
      if (p.kind === 'smoke') { c.fillStyle = 'rgba(70,70,80,' + (0.38 * a) + ')'; c.beginPath(); c.arc(p.x, p.y, p.size * (1.8 - a), 0, 6.3); c.fill(); }
      else if (p.kind === 'chip') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.globalAlpha = Math.min(1, a * 2); c.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); c.restore(); c.globalAlpha = 1; }
      else if (p.kind === 'piece') { c.save(); c.translate(p.x, p.y); p.ang += (p.vr || 0) * 0.016; c.rotate(p.ang); c.globalAlpha = Math.min(1, a * 2.5); c.lineCap = 'round'; c.strokeStyle = p.cable ? p.col : p.dark; c.lineWidth = p.cable ? 2 : p.w + 2; c.beginPath(); c.moveTo(-p.len / 2, 0); c.lineTo(p.len / 2, 0); c.stroke(); if (!p.cable) { c.strokeStyle = p.col; c.lineWidth = p.w; c.stroke(); } c.restore(); c.globalAlpha = 1; }
      else if (p.kind === 'water') { c.fillStyle = 'rgba(220,245,255,' + (0.85 * a) + ')'; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.3); c.fill(); }
      else if (p.kind === 'ring') { var rr = (1 - a) * 70 + p.size; c.strokeStyle = 'rgba(230,250,255,' + (0.8 * a) + ')'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(p.x, p.y, rr, rr * 0.22, 0, 0, 6.3); c.stroke(); }
      else if (p.kind === 'shock') { c.strokeStyle = 'rgba(255,255,255,' + (0.5 * a) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, p.size * (1 + (1 - a) * 2.4), 0, 6.3); c.stroke(); }
    }
    // score popups in screen space
    setScreenT(c); c.textAlign = 'center'; c.lineJoin = 'round';
    for (i = 0; i < L.length; i++) { p = L[i]; if (p.kind !== 'text') continue; a = Math.min(1, p.life / p.max * 1.5); c.globalAlpha = a; c.font = '800 ' + p.size + 'px ui-sans-serif,system-ui,sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(20,20,40,0.8)'; c.strokeText(p.txt, p.x * s + shakeX / pr, gy - p.y * s); c.fillStyle = p.col; c.fillText(p.txt, p.x * s + shakeX / pr, gy - p.y * s); c.globalAlpha = 1; }
  }

  function render(t) {
    shakeX = 0; shakeY = 0; if (shake > 0.1 && !reduced) { shakeX = (Math.random() - 0.5) * shake * pr; shakeY = (Math.random() - 0.5) * shake * pr; }
    drawBackground(ctx, t); drawWater(ctx, t); drawPlatforms(ctx, t);
    drawLauncher(ctx, t); drawStructure(ctx, t); drawProj(ctx, t);
    setWorldT(ctx, shakeX, shakeY); SP.draw(ctx, G);
    drawAim(ctx, t);
    drawParticles(ctx, t);
    if (flashT > 0) { setScreenT(ctx); ctx.fillStyle = 'rgba(255,240,210,' + flashT * 0.8 + ')'; ctx.fillRect(0, 0, W, H); }
    if (qs.has('fps')) { setScreenT(ctx); ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.fillText(Math.round(fps) + ' fps q' + quality + ' p' + P.list.length, 8, H - 6); }
  }

  // ---------------------------------------------------------------- main loop and governor
  var last = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts; var raw = Math.min(0.1, (ts - last) / 1000); last = ts; if (raw <= 0) return;
    emaDt += (raw - emaDt) * 0.08; fpsFrames++; fpsT += raw; if (fpsT >= 0.5) { fps = fpsFrames / fpsT; fpsFrames = 0; fpsT = 0; window.__fps = fps; }
    // quality governor: shed effects when the device cannot hold 50 fps, restore slowly when it can
    if (emaDt > 0.021) { slowFrames++; fastFrames = 0; } else if (emaDt < 0.0135) { fastFrames++; slowFrames = Math.max(0, slowFrames - 1); } else { slowFrames = Math.max(0, slowFrames - 1); }
    if (slowFrames > 70 && quality > 0) { setQuality(quality - 1); slowFrames = 0; }
    else if (fastFrames > 900 && quality < 2) { setQuality(quality + 1); fastFrames = 0; }
    var ts2 = save.fun.slow ? 0.4 : 1, dt = raw * ts2;
    if (!paused && !modal || mode === 'title' || mode === 'levels') {
      acc += dt; var n = 0; while (acc >= 1 / 60 && n < 3) { step(1 / 60); acc -= 1 / 60; n++; } if (acc > 0.1) acc = 0;
    }
    if (toastT > 0) { toastT -= raw; if (toastT <= 0) $('toast').hidden = true; }
    shake *= 0.9; flashT = Math.max(0, flashT - raw);
    shownScore += (score - shownScore) * Math.min(1, raw * 8); if (Math.abs(score - shownScore) < 1) shownScore = score;
    if (mode === 'play') { updateHud(); }
    render(performance.now() / 1000);
  }
  function setQuality(q) {
    quality = q; P.cap = q === 2 ? 700 : q === 1 ? 380 : 200; if (reduced) P.cap = Math.min(P.cap, 260);
    var old = pr; layout(true);
    if (window.__fpsLog) window.__fpsLog.push('quality ' + q);
  }

  // ---------------------------------------------------------------- init
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && mode === 'play' && !modal && phase !== 'done') openPause(); last = 0; });
  if (reduced) P.cap = 260;
  layout(true); syncFunUi(); startLevel(Math.min(save.last || 0, FS.LEVELS.length - 1), true); show('title');
  $('bPlay').textContent = (save.maxLevel > 0 || Object.keys(save.stars).length) ? 'Continue' : 'Play';
  try { if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  requestAnimationFrame(frame);
  window.FenSmash = { preview: function () { var p = previewPath(); return p.hit; }, structCx: function () { return structCx; }, startLevel: startLevel, play: play, fire: fire, setWeapon: setWeapon, get world() { return world; }, get state() { return { mode: mode, phase: phase, shotsLeft: shotsLeft, score: score, pct: pct, meter: meter, quality: quality, fps: fps, particles: P.list.length, level: levelIdx, goalMet: goalMet }; }, set meter(v) { meter = v; }, aim: aim, openPicker: openPicker, startSpecial: startSpecial };
})();
