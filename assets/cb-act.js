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
  // q: prefill pattern, or null for copy-and-open. Max: longest encoded link we try. Claude first: our preferred one.
  var APPS = [
    { n: 'Claude', label: 'Claude (our preferred one)', q: 'https://claude.ai/new?q=', home: 'https://claude.ai/new', max: 8000 },
    { n: 'ChatGPT', q: 'https://chatgpt.com/?q=', home: 'https://chatgpt.com/', max: 8000 },
    { n: 'Gemini', q: null, home: 'https://gemini.google.com/app' },
    { n: 'Grok', q: 'https://grok.com/?q=', home: 'https://grok.com/', max: 2000 },
    { n: 'Perplexity', q: 'https://www.perplexity.ai/search?q=', home: 'https://www.perplexity.ai/', max: 2000 },
    { n: 'Copilot', q: null, home: 'https://copilot.microsoft.com/' }
  ];
  function el(t, c, s) { var e = document.createElement(t); if (c) e.className = c; if (s) e.textContent = s; return e; }
  // "Is it safe to copy and paste this into my computer?": a small pop-up, not a scroll
  var safeBox = null, safeLast = null;
  function safeClose() { if (!safeBox) return; var b = safeBox; safeBox = null; if (b.parentNode) b.parentNode.removeChild(b); try { if (safeLast) safeLast.focus(); } catch (e) { } }
  function safeOpen() {
    if (safeBox) return; safeLast = document.activeElement;
    var v = el('div', 'safe-veil'), box = el('div', 'safe-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'safe-h');
    var h = el('h2', '', 'Is it safe to copy and paste this into my computer?'); h.id = 'safe-h'; box.appendChild(h);
    box.appendChild(el('p', '', 'Yes. It is plain text, and there is nothing to download. Pasting it into your AI is the same as typing those words yourself, so it can do no more harm than typing text could.'));
    box.appendChild(el('p', '', 'Once it is pasted, your AI’s own security takes over. Your AI still asks you before it changes, sends, or buys anything. You can read every line before you paste it.'));
    var p = el('p'), a = el('a', '', 'Look it up yourself in a new tab');
    a.href = 'https://www.google.com/search?q=' + encodeURIComponent('Is it possible for copying and pasting into an LLM to harm my system?'); a.target = '_blank'; a.rel = 'noopener';
    p.appendChild(a); box.appendChild(p);
    var c = el('button', 'btn', 'Close'); c.type = 'button'; c.addEventListener('click', safeClose); box.appendChild(c);
    v.appendChild(box); v.addEventListener('click', function (e) { if (e.target === v) safeClose(); });
    v.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); safeClose(); } if (e.key === 'Tab') { var f = box.querySelectorAll('a[href],button'), x = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === x) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); x.focus(); } } });
    document.body.appendChild(v); safeBox = v; c.focus();
  }
  window.CBSafe = { open: safeOpen };
  function mount(box) {
    var id = box.getAttribute('data-act'); if (!id) return;
    var novote = box.hasAttribute('data-act-novote');
    var row = el('div', 'actrow');
    if (!novote) {
      var vb = el('button', 'btn ghost vote'); vb.type = 'button';
      var drawV = function () { var on = !!votes()[id], n = counts[id] || 0; vb.textContent = (on ? 'Voted useful' : 'Vote useful') + (n ? ' (' + n + ')' : ''); vb.setAttribute('aria-pressed', on ? 'true' : 'false'); vb.setAttribute('aria-label', (on ? 'Voted useful' : 'Vote useful') + '. ' + n + (n === 1 ? ' vote' : ' votes') + ' from people logged in.'); };
      document.addEventListener('cb-vote-counts', drawV);
      vb.addEventListener('click', function () { var v = votes(); if (v[id]) delete v[id]; else v[id] = Date.now(); ls('cb-votes', v); drawV(); document.dispatchEvent(new CustomEvent('cb-vote', { detail: { id: id, on: !!v[id] } })); var counted = share(id, !!v[id]); toast(v[id] ? (counted ? 'Vote counted. Thank you.' : 'Vote saved on this device. Log in to add it to the shared count.') : 'Vote removed.'); });
      drawV(); row.appendChild(vb);
    }
    var lab = el('span', 'actlab', 'Open in:'); row.appendChild(lab);
    APPS.forEach(function (a) {
      var l = el('a', 'chip' + (a.label ? ' pref' : ''), a.label || a.n); l.href = a.home; l.target = '_blank'; l.rel = 'noopener';
      l.addEventListener('click', function () {
        var t = text(); if (!t) return;
        var u = a.q ? a.q + encodeURIComponent(t) : '';
        var pre = u && u.length <= a.max;
        l.href = pre ? u : a.home;
        copy(t).then(function () { toast(pre ? 'Opening ' + a.n + '. The text is on your clipboard too. If the box is empty, just paste it.' : 'Opening ' + a.n + '. The text is already on your clipboard. Press and hold in the chat box, tap Paste, then send.'); });
      });
      row.appendChild(l);
    });
    box.appendChild(row);
    var ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), and = /Android/.test(ua);
    if ((ios || and) && !novote) {
      var gp = el('p', 'actget');
      var g = el('a', 'chip', 'I don’t have one yet: get Claude free'); g.target = '_blank'; g.rel = 'noopener';
      g.href = ios ? 'https://apps.apple.com/app/id6473753684' : 'https://play.google.com/store/apps/details?id=com.anthropic.claude';
      g.addEventListener('click', function () { var t = text(); if (t) copy(t).then(function () { toast('Opening the Claude download page. The text is already on your clipboard.'); }); });
      gp.appendChild(g);
      gp.appendChild(el('span', 'actgetn', ' As soon as you have the ability to type, copy and paste this into the assistant chat window. Pressing this button already puts it on your clipboard.'));
      box.appendChild(gp);
      box.appendChild(el('p', 'mut small', 'Installing the app may ask for your app store password or your fingerprint. That is your phone’s own security, not ours.'));
    }
    var how = el('p', 'acthow');
    how.appendChild(el('b', '', 'After you press one of these, all you do is paste. '));
    how.appendChild(document.createTextNode('By pressing one of these buttons, the text will already be on your clipboard. Your AI opens. Press and hold in the chat box and tap Paste, then press send. Some apps fill the box for you, so then you just press send.'));
    box.appendChild(how);
    var sp = el('p', 'actsafe'), sb = el('button', 'linkbtn', 'Is it safe to copy and paste this into my computer?'); sb.type = 'button'; sb.addEventListener('click', safeOpen);
    sp.appendChild(sb); box.appendChild(sp);
    box.appendChild(el('p', 'mut small', novote ? 'Nothing is sent until you press send there.' : 'Nothing is sent until you press send there. Votes count for everyone when you are logged in.'));
    if (!document.getElementById('acthow-css')) { var cs = el('style'); cs.id = 'acthow-css'; cs.textContent = '.acthow{margin:.6rem 0 .3rem;padding:.6rem .75rem;border:2px solid currentColor;border-radius:10px;font-size:.95rem;line-height:1.45}.actget{margin:.55rem 0 .2rem;font-weight:700;line-height:1.45}.actrow .chip.pref{font-weight:900;background:var(--sun,#ffd23f)}' +
      '.actsafe{margin:.4rem 0}.linkbtn{background:none;border:0;padding:.5rem 0;min-height:44px;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;color:inherit;text-align:left}' +
      '.safe-veil{position:fixed;inset:0;z-index:2147482500;background:rgba(21,21,21,.45);display:grid;place-items:center;padding:1rem}.safe-box{background:var(--bg,#fff6e0);color:var(--fg,#151515);border:3px solid var(--fg,#151515);border-radius:20px;box-shadow:6px 6px 0 var(--fg,#151515);width:min(32rem,100%);max-height:calc(100dvh - 2rem);overflow:auto;padding:1.2rem}.safe-box h2{font-size:1.35rem;line-height:1.15;margin:0 0 .6rem}.safe-box p{margin:0 0 .8rem}';
      document.head.appendChild(cs); }
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('[data-act]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
