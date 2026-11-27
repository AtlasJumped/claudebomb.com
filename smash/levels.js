// Fennsmash levels: 4 materials, 4 levels each. Power of every weapon and strength of every structure rise with the level number.
(function (root) {
  'use strict';
  var FS = root.FS = root.FS || {};
  FS.WORLDS = [
    { key: 'tent', name: 'Tents', blurb: 'Bamboo poles, rope, and canvas', sky: ['#ffd1a1', '#f4a09a', '#8f7fc2'], hill: ['#6c6aa6', '#55528f', '#3f3c78'], sun: '#fff0c8' },
    { key: 'wood', name: 'Timber', blurb: 'Heavy logs and hemp rope', sky: ['#9fdcff', '#c5ecff', '#f1fbff'], hill: ['#5a9d8a', '#3f8272', '#2c6558'], sun: '#fffbe0' },
    { key: 'steel', name: 'Steel and cable', blurb: 'Beams and braided cable', sky: ['#2b3a67', '#6b5b95', '#f19c79'], hill: ['#3b3f6e', '#2b2e57', '#1f2142'], sun: '#ffd9a8' },
    { key: 'carbon', name: 'Carbon', blurb: 'Carbon tubes and tension films', sky: ['#050b1d', '#0b2440', '#124a5a'], hill: ['#14344a', '#0d2536', '#081a28'], sun: '#bff6f2' }
  ];
  var L = [
    // world 1: tents (already multi-bay from level 1)
    { name: 'First Dome', spec: { type: 'dome', m: 5, R: 92, t: 34 }, goal: 50 },
    { name: 'Camp Row', spec: { type: 'tents', n: 3, w: 78, h: 82 }, goal: 55 },
    { name: 'Ridge Tower', spec: { type: 'tower', n: 3, w: 78, h: 58, guys: 2 }, goal: 55 },
    { name: 'Big Top', spec: { type: 'tower', n: 3, w: 130, h: 52, cols: 2, taper: 0.15, guys: 2 }, goal: 60 },
    // world 2: wood
    { name: 'Timber Mast', spec: { type: 'tower', n: 4, w: 78, h: 52, guys: 2 }, goal: 55 },
    { name: 'Log Gate', spec: { type: 'twin', n: 3, w: 60, h: 54, gap: 118 }, goal: 60 },
    { name: 'Timber Dome', spec: { type: 'dome', m: 6, R: 108, t: 38 }, goal: 60 },
    { name: 'Palisade', spec: { type: 'tower', n: 4, w: 140, h: 48, cols: 2, taper: 0.25, guys: 2 }, goal: 62 },
    // world 3: steel and cable
    { name: 'Steel Mast', spec: { type: 'tower', n: 5, w: 80, h: 48, guys: 1 }, goal: 60 },
    { name: 'Cable Gate', spec: { type: 'twin', n: 4, w: 58, h: 48, gap: 124 }, goal: 62 },
    { name: 'Geodesic', spec: { type: 'dome', m: 8, R: 118, t: 38 }, goal: 65 },
    { name: 'Crane Frame', spec: { type: 'tower', n: 5, w: 140, h: 46, cols: 2, taper: 0.15, guys: 1 }, goal: 65 },
    // world 4: carbon
    { name: 'Carbon Needle', spec: { type: 'tower', n: 6, w: 70, h: 46, taper: 0.2, guys: 1 }, goal: 65 },
    { name: 'Weave Gate', spec: { type: 'twin', n: 5, w: 56, h: 46, gap: 126, taper: 0.15 }, goal: 66 },
    { name: 'Carbon Dome', spec: { type: 'dome', m: 10, R: 122, t: 40 }, goal: 68 },
    { name: 'Citadel', spec: { type: 'twin', n: 4, w: 84, h: 48, cols: 2, gap: 156, taper: 0.2 }, goal: 70 }
  ];
  L.forEach(function (l, i) {
    l.world = Math.floor(i / 4); l.mat = FS.WORLDS[l.world].key; l.index = i;
    l.hs = 1 + 0.06 * (i % 4) + 0.1 * l.world;        // structures get stronger
    l.pm = 1 + 0.13 * i;                               // weapons get stronger
  });
  FS.LEVELS = L;
  // weapons unlock by level
  FS.WEAPONS = {
    sling:  { name: 'Slingshot', unlock: 0, speed: 880, m: 1.0, r: 7, pierce: 2, slow: 0.55 },
    cannon: { name: 'Cannon', unlock: 0, speed: 980, m: 2.6, r: 10, pierce: 2, slow: 0.72 }, // middle tier: about two shots; the cannonball does not explode and should not clear a level in one shot
    rocket: { name: 'Rocket', unlock: 0, speed: 520, m: 2, r: 8, acc: 950, thr: 0.55, R: 78, D: 3.3, imp: 520 },
    hammer: { name: 'Thunder hammer', unlock: 0, speed: 840, m: 3, r: 12, R: 190, D: 1.7, chain: 7, bolts: 5 },
    drone:  { name: 'Drone strike', unlock: 0, bombs: 3, R: 58, D: 2.3, imp: 380 }
  };
  FS.SPECIALS = {
    dragons: { name: 'Three dragons', blurb: 'Fire from the sky', best: 'Best against tents and wood', mult: { tent: 3.2, wood: 2.6, steel: 1.0, carbon: 0.6 } },
    dogs:    { name: 'Dog pack', blurb: 'Bite and rip', best: 'Best against tents and wood', mult: { tent: 3, wood: 2.2, steel: 0.9, carbon: 0.55 } },
    ants:    { name: 'Ant army', blurb: 'Climb and chew', best: 'Slow but steady', mult: { tent: 2.6, wood: 2.1, steel: 0.7, carbon: 0.4 } },
    drones:  { name: 'Drone swarm', blurb: 'Dive and blast', best: 'Good against every material', mult: { tent: 1.8, wood: 1.7, steel: 1.5, carbon: 1.3 } }
  };
})(typeof window !== 'undefined' ? window : globalThis);
