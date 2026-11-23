// Fen Smash effects: synthesized sound (off until the player taps sound on) and particles.
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};

  var A = FS.Audio = { on: false, ctx: null, master: null, noise: null, last: {} };
  A.init = function () {
    if (A.ctx) return true;
    try {
      var C = root.AudioContext || root.webkitAudioContext; if (!C) return false;
      A.ctx = new C(); A.master = A.ctx.createGain(); A.master.gain.value = 0.55; A.master.connect(A.ctx.destination);
      var len = A.ctx.sampleRate * 1.5, b = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; A.noise = b; return true;
    } catch (e) { return false; }
  };
  A.set = function (on) {
    if (on) { if (!A.init()) return false; try { if (A.ctx.state === 'suspended') A.ctx.resume(); } catch (e) {} }
    A.on = !!on; return A.on;
  };
  function gate(k, ms) { var t = performance.now(); if (A.last[k] && t - A.last[k] < ms) return false; A.last[k] = t; return true; }
  function tone(f0, f1, dur, type, vol, delay) {
    if (!A.on || !A.ctx) return; var c = A.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, ftype, f0, f1, vol, delay, q) {
    if (!A.on || !A.ctx) return; var c = A.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise; s.loop = true; f.type = ftype; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  A.fx = {
    sling: function () { tone(180, 640, 0.18, 'triangle', 0.35); noise(0.2, 'bandpass', 900, 3000, 0.25); tone(300, 90, 0.3, 'sine', 0.2, 0.05); },
    cannon: function () { noise(0.5, 'lowpass', 1200, 80, 0.9); tone(130, 38, 0.5, 'sine', 0.9); noise(0.1, 'highpass', 2000, 4000, 0.3); },
    rocket: function () { noise(0.9, 'bandpass', 500, 2400, 0.4, 0, 0.8); tone(90, 220, 0.8, 'sawtooth', 0.12); },
    drone: function () { tone(220, 260, 0.6, 'sawtooth', 0.12); tone(223, 263, 0.6, 'sawtooth', 0.12); noise(0.5, 'bandpass', 3000, 3500, 0.1, 0, 4); },
    bomb: function () { tone(900, 200, 0.5, 'sine', 0.18); },
    hit: function () { if (!gate('hit', 50)) return; noise(0.12, 'bandpass', 1800, 500, 0.5, 0, 2); tone(160, 70, 0.12, 'square', 0.18); },
    crack: function (mat) {
      if (!gate('crack', 35)) return;
      if (mat === 'steel' || mat === 'carbon') { tone(1400 + Math.random() * 600, 600, 0.25, 'triangle', 0.2); noise(0.08, 'highpass', 3000, 6000, 0.3); }
      else if (mat === 'tent') { noise(0.18, 'bandpass', 2500, 900, 0.3, 0, 1.5); }
      else { noise(0.1, 'bandpass', 1200 + Math.random() * 900, 400, 0.55, 0, 3); tone(300 + Math.random() * 120, 110, 0.08, 'square', 0.12); }
    },
    boom: function (big) { if (!gate('boom', 60)) return; noise(0.55 + big * 0.3, 'lowpass', 1500, 70, 0.8); tone(110, 32, 0.5 + big * 0.2, 'sine', 0.8); },
    thud: function () { if (!gate('thud', 70)) return; tone(110, 45, 0.12, 'sine', 0.35); noise(0.08, 'lowpass', 600, 150, 0.3); },
    splash: function () { if (!gate('splash', 80)) return; noise(0.35, 'bandpass', 1400, 4000, 0.4, 0, 0.7); noise(0.25, 'lowpass', 900, 300, 0.25, 0.05); },
    ready: function () { tone(520, 1040, 0.25, 'sine', 0.2); tone(780, 1560, 0.25, 'sine', 0.12, 0.08); },
    fire: function () { noise(1.2, 'bandpass', 400, 1600, 0.35, 0, 0.6); tone(70, 55, 1.2, 'sawtooth', 0.1); },
    roar: function () { tone(120, 70, 0.9, 'sawtooth', 0.28); tone(125, 75, 0.9, 'square', 0.1); noise(0.9, 'lowpass', 900, 200, 0.3); },
    bark: function () { if (!gate('bark', 90)) return; tone(520, 240, 0.09, 'sawtooth', 0.22); noise(0.07, 'bandpass', 1200, 800, 0.2); },
    ant: function () { if (!gate('ant', 60)) return; noise(0.025, 'highpass', 5000, 7000, 0.12); },
    buzz: function () { if (!gate('buzz', 400)) return; tone(300, 340, 0.4, 'sawtooth', 0.07); },
    meteor: function () { noise(0.7, 'bandpass', 3000, 400, 0.3, 0, 0.8); },
    win: function () { var n = [523, 659, 784, 1046]; for (var i = 0; i < n.length; i++) tone(n[i], n[i], 0.35, 'triangle', 0.25, i * 0.11); },
    fail: function () { tone(330, 150, 0.6, 'sawtooth', 0.2); tone(247, 110, 0.7, 'sawtooth', 0.2, 0.2); },
    ui: function () { tone(660, 880, 0.07, 'sine', 0.15); },
    total: function () { var n = [392, 523, 659, 784, 1046, 1318]; for (var i = 0; i < n.length; i++) tone(n[i], n[i] * 1.01, 0.4, 'triangle', 0.22, i * 0.09); noise(0.8, 'lowpass', 2000, 60, 0.5); }
  };
  A.play = function (k, a, b) { if (!A.on) return; try { var f = A.fx[k]; if (f) f(a, b); } catch (e) {} };

  // ---- particles
  var P = FS.Particles = { list: [], cap: 700 };
  P.add = function (p) { if (P.list.length < P.cap) P.list.push(p); return p; };
  P.clear = function () { P.list.length = 0; };
  P.step = function (dt, g, w) {
    var L = P.list, i, p;
    for (i = L.length - 1; i >= 0; i--) {
      p = L[i]; p.life -= dt; if (p.life <= 0) { L.splice(i, 1); continue; }
      p.vy -= (p.g == null ? 0 : p.g) * g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt;
      if (p.drag) { var k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      if ((p.kind === 'chip' || p.kind === 'piece') && p.y < 3 && w.onPlatform(p.x)) { p.y = 3; p.vy = Math.abs(p.vy) * 0.25; p.vx *= 0.7; p.vr *= 0.6; }
      if ((p.kind === 'chip' || p.kind === 'piece') && p.y < FS.WATER_Y && !w.onPlatform(p.x)) { P.splash(p.x, FS.WATER_Y, 80, 3); L.splice(i, 1); }
    }
  };
  P.fire = function (x, y, vx, vy, size, life) { P.add({ kind: 'fire', x: x, y: y, vx: vx, vy: vy, size: size, life: life, max: life, rot: 0 }); };
  P.smoke = function (x, y, size, life) { P.add({ kind: 'smoke', x: x, y: y, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 20, size: size, life: life, max: life, rot: 0 }); };
  P.spark = function (x, y, a, sp, life, col) { P.add({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.6, life: life, max: life, size: 2, col: col || '#ffd27a', rot: 0 }); };
  P.chip = function (x, y, col, sp) { var a = Math.random() * 6.283, s = sp * (0.3 + Math.random()); P.add({ kind: 'chip', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 40, g: 1, life: 1.6 + Math.random(), max: 2, size: 2 + Math.random() * 3.5, col: col, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18 }); };
  P.splash = function (x, y, sp, n) {
    var i; for (i = 0; i < n * 4; i++) P.add({ kind: 'water', x: x + (Math.random() - 0.5) * 14, y: y, vx: (Math.random() - 0.5) * 120, vy: 90 + Math.random() * Math.min(420, sp * 0.45), g: 1, life: 0.9 + Math.random() * 0.4, max: 1.2, size: 1.5 + Math.random() * 2.5, rot: 0 });
    P.add({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, life: 1.2, max: 1.2, size: 6, rot: 0 });
    if (n > 2) P.add({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, life: 1.6, max: 1.6, size: 4, rot: 0 });
  };
  P.text = function (x, y, s, col, big) { P.add({ kind: 'text', x: x, y: y, vx: 0, vy: 46, life: big ? 1.8 : 1.1, max: big ? 1.8 : 1.1, size: big ? 26 : 15, txt: s, col: col || '#fff', rot: 0 }); };
  P.boom = function (x, y, R, calm) {
    var i, n = calm ? 6 : 22;
    for (i = 0; i < n; i++) { var a = Math.random() * 6.283, s = R * (0.6 + Math.random() * 2.6); P.fire(x, y, Math.cos(a) * s, Math.sin(a) * s, R * (0.25 + Math.random() * 0.3), 0.35 + Math.random() * 0.4); }
    for (i = 0; i < (calm ? 3 : 8); i++) P.smoke(x + (Math.random() - 0.5) * R, y + (Math.random() - 0.5) * R * 0.5, R * 0.5, 1 + Math.random() * 0.8);
    for (i = 0; i < (calm ? 4 : 14); i++) P.spark(x, y, Math.random() * 6.283, 160 + Math.random() * 360, 0.5 + Math.random() * 0.5);
    P.add({ kind: 'flash', x: x, y: y, vx: 0, vy: 0, life: 0.2, max: 0.2, size: R * 1.6, rot: 0 });
    P.add({ kind: 'shock', x: x, y: y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: R, rot: 0 });
  };
})(typeof window !== 'undefined' ? window : globalThis);
