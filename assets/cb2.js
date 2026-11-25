/* claudebomb.com: which AI you use, ranked search, and My prompts (saved on this device;
   synced to an account once accounts are switched on in assets/cb-config.js). */
(function () {
  'use strict';
  var d = document, C = window.CB || {};
  function el(t, c, x) { var e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------- which AI do you use ----------
  var MODELS = [['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['gemini', 'Gemini'], ['grok', 'Grok'], ['other', 'Another AI']];
  function modelName(k) { for (var i = 0; i < MODELS.length; i++) if (MODELS[i][0] === k) return MODELS[i][1]; return ''; }
  function model() { return ls('cb-model') || ''; }
  var subs = [];
  function onModel(f) { subs.push(f); f(model()); }
  function setModel(k) { ls('cb-model', k || null); if (k) ls('cb-model-asked', '1'); subs.forEach(function (f) { f(model()); }); paintChip(); }
  function paintChip() {
    var c = d.getElementById('aichip'); if (!c) return;
    var m = model(); c.textContent = m ? 'Your AI: ' + modelName(m) : 'Which AI do you use?';
  }
  function picker(force) {
    var old = d.getElementById('aipick'); if (old) { old.remove(); if (!force) return; }
    var bar = el('div', 'aipick'); bar.id = 'aipick'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Which AI do you use?');
    var w = el('div', 'wrap');
    w.appendChild(el('p', 'q', 'Which AI do you use? We will copy prompts for it. Optional, and saved only on this device.'));
    var bs = el('div', 'chips');
    MODELS.forEach(function (m) { var b = el('button', 'chip' + (model() === m[0] ? ' on' : ''), m[1]); b.type = 'button'; b.addEventListener('click', function () { setModel(m[0]); bar.remove(); C.toast && C.toast('Got it. Copy buttons now say ' + m[1] + '.'); }); bs.appendChild(b); });
    var sk = el('button', 'chip ghost', 'Skip'); sk.type = 'button'; sk.addEventListener('click', function () { ls('cb-model-asked', '1'); bar.remove(); }); bs.appendChild(sk);
    w.appendChild(bs); bar.appendChild(w);
    var h = d.querySelector('.hdr'); if (h && h.parentNode) h.parentNode.insertBefore(bar, h.nextSibling); else d.body.insertBefore(bar, d.body.firstChild);
  }
  function wireModel() {
    var c = d.getElementById('aichip'); if (c) c.addEventListener('click', function () { picker(true); });
    paintChip();
    if (!model() && !ls('cb-model-asked')) picker(true);
  }

  // ---------- ranked search ----------
  var STOP = {}; 'a an and are as at be by can for from how i in into is it its me my of on or our so that the this to was what when which who will with you your act want need help make prompt prompts'.split(' ').forEach(function (w) { STOP[w] = 1; });
  var SYN = {
    resume: ['cv', 'job', 'cover', 'interview'], cv: ['resume'], job: ['career', 'resume', 'interview', 'hiring'], email: ['mail', 'letter', 'message', 'reply'],
    letter: ['email', 'mail'], essay: ['writing', 'article'], write: ['writing', 'writer', 'draft'], writing: ['write', 'writer'], code: ['coding', 'programming', 'developer', 'software'],
    coding: ['code', 'programming'], python: ['code', 'programming'], money: ['budget', 'finance', 'financial', 'bill'], budget: ['money', 'finance'], bill: ['invoice', 'paperwork', 'contract'],
    contract: ['legal', 'paperwork', 'agreement'], legal: ['lawyer', 'contract'], health: ['doctor', 'medical', 'fitness'], fitness: ['workout', 'exercise', 'gym'], food: ['recipe', 'meal', 'cooking', 'diet'],
    recipe: ['cooking', 'meal', 'food'], travel: ['trip', 'itinerary', 'vacation'], trip: ['travel', 'itinerary'], learn: ['teach', 'tutor', 'study', 'lesson'], teach: ['tutor', 'learn', 'teacher'],
    study: ['learn', 'exam', 'tutor'], kids: ['children', 'child', 'parent'], children: ['kids', 'child'], parent: ['senior', 'family', 'mom', 'dad'], grandparent: ['family', 'senior', 'story'],
    meeting: ['notes', 'agenda', 'minutes'], notes: ['meeting', 'summary', 'summarize'], summary: ['summarize', 'summarise'], summarize: ['summary', 'summarise'], scam: ['fraud', 'phishing', 'safe'],
    video: ['film', 'movie', 'scene', 'animation', 'clip'], image: ['picture', 'photo', 'art', 'illustration'], picture: ['image', 'photo'], story: ['fiction', 'novel', 'tale'],
    decide: ['decision', 'choice'], decision: ['decide', 'choice'], plan: ['planner', 'schedule', 'planning'], website: ['site', 'web', 'html'], marketing: ['seo', 'ads', 'social', 'copywriting'],
    social: ['instagram', 'twitter', 'tiktok', 'linkedin', 'post'], dashboard: ['personal', 'organize', 'todo'], research: ['study', 'sources', 'analysis']
  };
  function toks(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(function (w) { return w && !STOP[w]; }); }
  function stem(w) { return w.length > 4 ? w.replace(/(ing|ers|er|es|s|ed|ly)$/, '') : w; }
  // index rows: {url, title, src, excerpt, kw, dev}
  function prep(rows) {
    var df = {}, N = rows.length, docs = rows.map(function (r) {
      var t = {}, b = {}; toks(r.title).forEach(function (w) { t[stem(w)] = 1; });
      toks(r.excerpt + ' ' + (r.kw || '') + ' ' + (r.cat || '')).forEach(function (w) { b[stem(w)] = (b[stem(w)] || 0) + 1; });
      var all = {}; for (var k in t) all[k] = 1; for (k in b) all[k] = 1; for (k in all) df[k] = (df[k] || 0) + 1;
      return { r: r, t: t, b: b, lt: (r.title || '').toLowerCase() };
    });
    return { docs: docs, df: df, N: N };
  }
  function search(ix, q) {
    var raw = toks(q); if (!raw.length) return [];
    var terms = raw.map(stem), extra = [];
    raw.forEach(function (w) { (SYN[w] || SYN[stem(w)] || []).forEach(function (s) { extra.push(stem(s)); }); });
    var ql = q.trim().toLowerCase(), out = [];
    ix.docs.forEach(function (doc) {
      var s = 0, hit = 0;
      terms.forEach(function (w) {
        var idf = Math.log(1 + ix.N / (1 + (ix.df[w] || 0))), m = 0;
        if (doc.t[w]) m += 3; if (doc.b[w]) m += 1 + Math.min(doc.b[w], 3) * 0.3;
        if (!m && w.length > 3) { for (var k in doc.t) if (k.indexOf(w) === 0) { m += 1.5; break; } }
        if (m) { hit++; s += idf * m; }
      });
      extra.forEach(function (w) { var idf = Math.log(1 + ix.N / (1 + (ix.df[w] || 0))); if (doc.t[w]) s += idf * 1.2; else if (doc.b[w]) s += idf * 0.4; });
      if (!s) return;
      s *= (0.4 + 0.6 * hit / terms.length);
      if (doc.lt === ql) s *= 3; else if (doc.lt.indexOf(ql) >= 0) s *= 1.8;
      if (doc.r.src === 'cb') s *= 1.3;
      out.push({ s: s, r: doc.r });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out;
  }
  // how many to show first: one clear winner, else a short pick of up to 3
  function shortPick(res) { if (!res.length) return 0; if (res.length === 1 || res[0].s > 2.2 * res[1].s) return 1; return Math.min(3, res.length); }

  // ---------- My prompts (this device; account sync when switched on) ----------
  function mine() { try { return JSON.parse(ls('cb-my') || '[]'); } catch (e) { return []; } }
  function saveMine(list) { ls('cb-my', JSON.stringify(list)); if (window.CBAccount && window.CBAccount.push) window.CBAccount.push(list); }
  function save(item) {
    var list = mine(), now = new Date().toISOString();
    item.saved = now; item.key = item.key || (item.id || 'p') + '-' + Date.now().toString(36);
    list.unshift(item); saveMine(list); return item;
  }

  C.model = model; C.modelName = modelName; C.onModel = onModel; C.setModel = setModel; C.picker = picker;
  C.prep = prep; C.search = search; C.shortPick = shortPick; C.mine = mine; C.saveMine = saveMine; C.save = save; C.MODELS = MODELS;
  window.CB = C;
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', wireModel); else wireModel();
})();

/* Customizer: boxes that tailor any prompt (its own fields, plus changes, context, tone), each with a mic. */
(function () {
  'use strict';
  var d = document, C = window.CB;
  var BASE = [
    { k: 'changes', label: 'What do you want to change?', ph: 'Talk or type. For example: make it shorter, ask fewer questions, focus on my small business.' },
    { k: 'context', label: 'Extra context', ph: 'Who it is for, your situation, anything the AI should know. Paste notes here too.' },
    { k: 'tone', label: 'Tone', ph: 'For example: warm and simple, or blunt and expert.' }
  ];
  var n = 0;
  C.custom = function (box, o) {
    var fields = (o.fields || []).concat(BASE), subs = [], tas = {};
    fields.forEach(function (f) {
      var id = 'cz' + (++n), sid = id + 's', w = C.el('div', 'cz');
      var lb = C.el('label', 'lbl', f.label); lb.setAttribute('for', id);
      var ta = C.el('textarea', 'ta cz-ta'); ta.id = id; ta.placeholder = f.ph || ''; ta.rows = f.k === 'characters' || f.k === 'story' || f.k === 'context' ? 4 : 2;
      var mr = C.el('div', 'microw'), mb = C.el('button', 'mic'), st = C.el('p', 'st'); mb.type = 'button'; st.id = sid; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
      mr.appendChild(mb); mr.appendChild(st);
      w.appendChild(lb); if (f.guard) w.appendChild(C.el('p', 'mut sm', 'Added with it: "' + f.guard + '"')); w.appendChild(ta); w.appendChild(mr); box.appendChild(w);
      C.keep(ta, 'cb-cz-' + o.id + '-' + f.k); C.mic(mb, ta, st);
      ta.addEventListener('input', function () { subs.forEach(function (s) { s(); }); });
      tas[f.k] = { f: f, ta: ta };
    });
    function text() {
      var parts = [];
      fields.forEach(function (f) { var v = tas[f.k].ta.value.trim(); if (!v) return; parts.push(f.label.replace(/\?$/, '') + ':\n' + v + (f.guard ? '\n(' + f.guard + ')' : '')); });
      if (!parts.length) return '';
      return '\n\n---\n\nMy details for this prompt. Use them, and they win over anything above where they differ:\n\n' + parts.join('\n\n') + '\n';
    }
    function count() { var c = 0; fields.forEach(function (f) { if (tas[f.k].ta.value.trim()) c++; }); return c; }
    function clear() { fields.forEach(function (f) { tas[f.k].ta.value = ''; C.ls('cb-cz-' + o.id + '-' + f.k, null); }); subs.forEach(function (s) { s(); }); }
    return { text: text, count: count, clear: clear, on: function (f) { subs.push(f); } };
  };
  // label every [data-copym] button "Copy for <your AI>"
  C.relabel = function () {
    var m = C.model(), nm = C.modelName(m);
    Array.prototype.forEach.call(d.querySelectorAll('[data-copym]'), function (b) { b.textContent = nm && m !== 'other' ? 'Copy for ' + nm : 'Copy prompt'; });
  };
  C.onModel(C.relabel);
})();
