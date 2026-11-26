/* claudebomb actions: votes and open-in-AI buttons. Votes are kept on this device until free sign-in launches. */
(function () {
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function votes() { return ls('cb-votes') || {}; }
  window.CBVotes = { all: votes, has: function (id) { return !!votes()[id]; } };
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
    function drawV() { var on = !!votes()[id]; vb.textContent = on ? 'Voted useful' : 'Vote useful'; vb.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    vb.addEventListener('click', function () { var v = votes(); if (v[id]) delete v[id]; else v[id] = Date.now(); ls('cb-votes', v); drawV(); document.dispatchEvent(new CustomEvent('cb-vote', { detail: { id: id, on: !!v[id] } })); toast(v[id] ? 'Vote saved on this device. Shared counts start when free sign-in launches.' : 'Vote removed.'); });
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
    box.appendChild(el('p', 'mut small', 'Open in fills the AI’s box where that app allows it and always copies the prompt too. Nothing is sent until you press send there. Votes stay on this device for now.'));
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('[data-act]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
