/* claudebomb actions: votes and open-in-AI buttons. Every vote is kept on this device; when you are logged in to your
   HMR family account it also counts in the shared totals (prompt_votes table, read through prompt_vote_counts()). */
(function () {
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function votes() { return ls('cb-votes') || {}; }
  var counts = {}, H = null;
  window.CBVotes = { all: votes, has: function (id) { return !!votes()[id]; }, counts: function () { return counts; }, count: function (id) { return counts[id] || 0; } };
  function refresh() {
    if (!H) return;
    H.rpc('prompt_vote_counts').then(function (r) {
      if (r.error || !r.data) return; var c = {}; r.data.forEach(function (x) { c[x.prompt_id] = +x.votes || 0; }); counts = c;
      document.dispatchEvent(new Event('cb-vote-counts'));
    });
  }
  // after logging in: votes made on this device join the account, and the account's votes show on this device
  function syncMine() {
    if (!H || !H.user) return refresh();
    var t = H.from('prompt_votes');
    t.select('prompt_id').then(function (r) {
      if (r.error) return refresh();
      var v = votes(), have = {}, add = [];
      r.data.forEach(function (x) { have[x.prompt_id] = 1; if (!v[x.prompt_id]) v[x.prompt_id] = Date.now(); });
      Object.keys(v).forEach(function (id) { if (!have[id] && id.length <= 120) add.push({ prompt_id: id }); });
      ls('cb-votes', v); document.dispatchEvent(new Event('cb-vote-counts'));
      if (add.length) H.from('prompt_votes').upsert(add, { onConflict: 'user_id,prompt_id', ignoreDuplicates: true }).then(refresh); else refresh();
    });
  }
  (function auth() {
    function go(h) { H = h; var last = null; h.onChange(function (u) { var id = u ? u.id : null; if (id !== last) { last = id; syncMine(); } }); }
    if (window.HMRAuth) return go(window.HMRAuth);
    var s = document.querySelector('script[data-hmr-auth]');
    if (!s) { s = document.createElement('script'); s.src = '/hmr-auth.js?v=1'; s.async = true; s.setAttribute('data-hmr-auth', ''); document.head.appendChild(s); }
    s.addEventListener('load', function () { if (window.HMRAuth) go(window.HMRAuth); });
  })();
  function share(id, on) {
    if (!H || !H.user) return false;
    var q = on ? H.from('prompt_votes').upsert({ prompt_id: id }, { onConflict: 'user_id,prompt_id', ignoreDuplicates: true }) : H.from('prompt_votes').delete().eq('prompt_id', id).eq('user_id', H.user.id);
    q.then(refresh); return true;
  }
  function toast(m) { if (window.CB && CB.toast) CB.toast(m); }
  function text() { try { return typeof window.CB_PROMPT === 'function' ? window.CB_PROMPT() : ''; } catch (e) { return ''; } }
  function copy(t) { if (window.CB && CB.copyText) return CB.copyText(t); if (navigator.clipboard) return navigator.clipboard.writeText(t); return Promise.resolve(); }
  // q: prefill pattern, or null for copy-and-open. Max: longest encoded link we try.
  var APPS = [
    { n: 'ChatGPT', q: 'https://chatgpt.com/?q=', home: 'https://chatgpt.com/', max: 8000 },
    { n: 'Claude', q: 'https://claude.ai/new?q=', home: 'https://claude.ai/new', max: 8000 },
    { n: 'Gemini', q: null, home: 'https://gemini.google.com/app' },
    { n: 'Grok', q: 'https://grok.com/?q=', home: 'https://grok.com/', max: 2000 },
    { n: 'Perplexity', q: 'https://www.perplexity.ai/search?q=', home: 'https://www.perplexity.ai/', max: 2000 },
    { n: 'Copilot', q: null, home: 'https://copilot.microsoft.com/' }
  ];
  function el(t, c, s) { var e = document.createElement(t); if (c) e.className = c; if (s) e.textContent = s; return e; }
  function mount(box) {
    var id = box.getAttribute('data-act'); if (!id) return;
    var row = el('div', 'actrow');
    var vb = el('button', 'btn ghost vote'); vb.type = 'button';
    function drawV() { var on = !!votes()[id], n = counts[id] || 0; vb.textContent = (on ? 'Voted useful' : 'Vote useful') + (n ? ' (' + n + ')' : ''); vb.setAttribute('aria-pressed', on ? 'true' : 'false'); vb.setAttribute('aria-label', (on ? 'Voted useful' : 'Vote useful') + '. ' + n + (n === 1 ? ' vote' : ' votes') + ' from people logged in.'); }
    document.addEventListener('cb-vote-counts', drawV);
    vb.addEventListener('click', function () { var v = votes(); if (v[id]) delete v[id]; else v[id] = Date.now(); ls('cb-votes', v); drawV(); document.dispatchEvent(new CustomEvent('cb-vote', { detail: { id: id, on: !!v[id] } })); var counted = share(id, !!v[id]); toast(v[id] ? (counted ? 'Vote counted. Thank you.' : 'Vote saved on this device. Log in to add it to the shared count.') : 'Vote removed.'); });
    drawV(); row.appendChild(vb);
    var lab = el('span', 'actlab', 'Open in:'); row.appendChild(lab);
    APPS.forEach(function (a) {
      var l = el('a', 'chip', a.n); l.href = a.home; l.target = '_blank'; l.rel = 'noopener';
      l.addEventListener('click', function () {
        var t = text(); if (!t) return;
        var u = a.q ? a.q + encodeURIComponent(t) : '';
        var pre = u && u.length <= a.max;
        l.href = pre ? u : a.home;
        copy(t).then(function () { toast(pre ? 'Opening ' + a.n + '. The prompt is also copied, so paste it if the box is empty.' : 'Prompt copied. Paste it into ' + a.n + '.'); });
      });
      row.appendChild(l);
    });
    box.appendChild(row);
    box.appendChild(el('p', 'mut small', 'Open in fills the AI’s box where that app allows it and always copies the prompt too. Nothing is sent until you press send there. Votes count for everyone when you are logged in.'));
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('[data-act]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
