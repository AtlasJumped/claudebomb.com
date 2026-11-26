/* claudebomb.com welcome gateway: a dismissible pop-up on a visitor's first entry.
   Step 1, they give us context (all optional). Step 2, we tell them who we are. Then they enter the site.
   Answers are kept in this browser (localStorage 'cb-ctx-v1'). If the visitor leaves the box ticked, the
   answers (never the name) go to our team through the HMR button's feedback pipeline, with no email app.
   Shown once; reopen with the footer button or window.CBGate.open(). Esc or Skip closes it. */
(function () {
  var d = document, KEY = 'cb-ctx-v1';
  function get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function put(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }
  var Q = [
    { k: 'intent', q: 'What brings you here?', o: ['Find a prompt', 'Share a prompt', 'Improve prompts', 'Just curious'] },
    { k: 'ai', q: 'Which AI do you use most?', o: ['ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Another one', 'None yet'] },
    { k: 'level', q: 'How much have you used AI?', o: ['New to it', 'Some', 'A lot'] }
  ];
  var css = '.cbg-veil{position:fixed;inset:0;z-index:2147482000;background:rgba(21,21,21,.45);display:grid;place-items:center;padding:1rem;opacity:0;transition:opacity .2s}' +
    '.cbg-veil.on{opacity:1}' +
    '.cbg{background:var(--bg,#fff6e0);color:var(--fg,#151515);border:3px solid var(--fg,#151515);border-radius:24px;box-shadow:8px 8px 0 var(--fg,#151515);width:min(34rem,100%);max-height:calc(100dvh - 2rem);overflow:auto;padding:1.4rem 1.3rem 1.2rem;font:17px/1.5 var(--sans,ui-sans-serif,system-ui,sans-serif);transform:translateY(12px);transition:transform .22s}' +
    '.cbg-veil.on .cbg{transform:none}' +
    '.cbg h2{font-size:clamp(1.6rem,6vw,2.3rem);line-height:1;margin:0 0 .4rem;letter-spacing:-.03em;font-weight:900}' +
    '.cbg p{margin:0 0 .9rem}.cbg .mut{color:var(--mut,#3d3a33);font-size:.95rem}' +
    '.cbg fieldset{border:0;margin:0 0 .9rem;padding:0}.cbg legend,.cbg label.l{display:block;font-weight:800;margin:0 0 .35rem;padding:0}' +
    '.cbg input[type=text]{width:100%;min-height:44px;font:inherit;padding:.5rem .8rem;border:2px solid var(--fg,#151515);border-radius:12px;background:#fff;color:var(--fg,#151515)}' +
    '.cbg .chips{display:flex;flex-wrap:wrap;gap:.4rem}' +
    '.cbg .chips button{min-height:44px;padding:0 .9rem;border:2px solid var(--fg,#151515);border-radius:99px;background:#fff;font:inherit;font-weight:700;font-size:.95rem;cursor:pointer;color:var(--fg,#151515)}' +
    '.cbg .chips button[aria-pressed="true"]{background:var(--sun,#ffd23f)}' +
    '.cbg .tick{display:flex;gap:.5rem;align-items:flex-start;font-size:.95rem;margin:0 0 1rem}.cbg .tick input{width:22px;height:22px;margin-top:.15rem;flex:none}' +
    '.cbg .row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}' +
    '.cbg .go{min-height:48px;padding:0 1.3rem;border:2px solid var(--fg,#151515);border-radius:99px;background:var(--acc,#ff5a36);color:#151515;font:inherit;font-weight:900;cursor:pointer}' +
    '.cbg .skip2{min-height:48px;padding:0 1rem;border:0;background:none;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;color:var(--fg,#151515)}' +
    '.cbg ul{margin:0 0 1rem;padding-left:1.2rem}.cbg li{margin:0 0 .4rem}' +
    '@media (prefers-reduced-motion:reduce){.cbg-veil,.cbg{transition:none}}';
  var veil = null, last = null;
  function el(t, c, x) { var e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function close(how) {
    if (!veil) return;
    var v = veil; veil = null; v.classList.remove('on'); d.removeEventListener('keydown', onKey, true);
    setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); }, 220);
    var s = get() || {}; if (!s.at) { s.at = Date.now(); s.skipped = how === 'skip'; put(s); }
    if (how === 'enter') {
      if (s.intent === 'Find a prompt') { var q = d.getElementById('q'); if (q) { q.focus(); return; } }
      if (s.intent === 'Share a prompt') { var sh = d.getElementById('share'); if (sh) { sh.scrollIntoView(); return; } }
    }
    try { if (last && last.focus) last.focus(); } catch (e) { }
  }
  function onKey(e) {
    if (!veil) return;
    if (e.key === 'Escape') { e.preventDefault(); close('skip'); return; }
    if (e.key !== 'Tab') return;
    var f = veil.querySelectorAll('button,input,a[href]'); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function about(box) {
    box.innerHTML = '';
    var s = get() || {};
    var h = el('h2', '', (s.name ? 'Thanks, ' + s.name + '. ' : 'Thanks. ') + 'Here is who we are');
    h.id = 'cbg-h'; box.appendChild(h);
    var ul = el('ul');
    ['claudebomb.com is a free, open bank of long prompts for any AI, not just Claude.',
      'It is part of the HMR family of websites: free forever, with never any ads.',
      'We are a very small team. We all work full-time jobs and pay for this ourselves.'].forEach(function (t) { ul.appendChild(el('li', '', t)); });
    box.appendChild(ul);
    var p = el('p', 'mut'); p.appendChild(d.createTextNode('More about why we built it: '));
    var a1 = el('a', '', 'Why us'); a1.href = '/why/'; p.appendChild(a1); p.appendChild(d.createTextNode('. Ways to help: '));
    var a2 = el('a', '', 'Support us'); a2.href = '/donate/'; p.appendChild(a2); p.appendChild(d.createTextNode('.'));
    box.appendChild(p);
    var row = el('div', 'row'), go = el('button', 'go', 'Start exploring'); go.type = 'button';
    go.addEventListener('click', function () { close('enter'); }); row.appendChild(go); box.appendChild(row);
    go.focus();
  }
  function open() {
    if (veil) return;
    if (!d.getElementById('cbg-css')) { var st = el('style'); st.id = 'cbg-css'; st.textContent = css; d.head.appendChild(st); }
    last = d.activeElement;
    var prev = get() || {}, ans = { name: prev.name || '', intent: prev.intent || '', ai: prev.ai || '', level: prev.level || '' };
    veil = el('div', 'cbg-veil');
    var box = el('div', 'cbg'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'cbg-h');
    var h = el('h2', '', 'Welcome to claudebomb.com'); h.id = 'cbg-h'; box.appendChild(h);
    box.appendChild(el('p', '', 'Help us establish the context. Tell us a little about you, then we will tell you about us.'));
    box.appendChild(el('p', 'mut', 'Every question is optional. Skip any of them, or all of them.'));
    var nl = el('label', 'l', 'What should we call you?'); nl.htmlFor = 'cbg-name'; box.appendChild(nl);
    var ni = el('input'); ni.type = 'text'; ni.id = 'cbg-name'; ni.autocomplete = 'given-name'; ni.maxLength = 40; ni.value = ans.name;
    var nw = el('fieldset'); nw.appendChild(ni); box.appendChild(nw);
    Q.forEach(function (x) {
      var fs = el('fieldset'); fs.appendChild(el('legend', '', x.q));
      var c = el('div', 'chips'); c.setAttribute('role', 'group');
      x.o.forEach(function (o) {
        var b = el('button', '', o); b.type = 'button'; b.setAttribute('aria-pressed', ans[x.k] === o ? 'true' : 'false');
        b.addEventListener('click', function () {
          var on = ans[x.k] !== o; ans[x.k] = on ? o : '';
          [].forEach.call(c.children, function (y) { y.setAttribute('aria-pressed', on && y === b ? 'true' : 'false'); });
        });
        c.appendChild(b);
      });
      fs.appendChild(c); box.appendChild(fs);
    });
    var tk = el('label', 'tick'), cb = el('input'); cb.type = 'checkbox'; cb.checked = prev.share !== false;
    tk.appendChild(cb); tk.appendChild(d.createTextNode('Also send my answers to the claudebomb.com team, so we can build what people need. Your name is never sent, and there is no email to give.'));
    box.appendChild(tk);
    var row = el('div', 'row'), go = el('button', 'go', 'Enter claudebomb.com'), sk = el('button', 'skip2', 'Skip for now');
    go.type = sk.type = 'button';
    go.addEventListener('click', function () {
      ans.name = String(ni.value || '').trim().slice(0, 40);
      var s = { name: ans.name, intent: ans.intent, ai: ans.ai, level: ans.level, share: cb.checked, at: Date.now() };
      put(s);
      if (cb.checked && (s.intent || s.ai || s.level) && window.HMRDock && HMRDock.send) {
        try { HMRDock.send({ kind: 'welcome', noMailto: true, message: 'Welcome answers (claudebomb.com)\nWhat brings you here: ' + (s.intent || '-') + '\nAI used most: ' + (s.ai || '-') + '\nHow much AI: ' + (s.level || '-') }); } catch (e) { }
      }
      try { window.dispatchEvent(new CustomEvent('cb-context', { detail: s })); } catch (e) { }
      about(box);
    });
    sk.addEventListener('click', function () { close('skip'); });
    row.appendChild(go); row.appendChild(sk); box.appendChild(row);
    veil.appendChild(box);
    veil.addEventListener('click', function (e) { if (e.target === veil) close('skip'); });
    d.body.appendChild(veil);
    d.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { if (veil) veil.classList.add('on'); });
    setTimeout(function () { try { ni.focus({ preventScroll: true }); } catch (e) { ni.focus(); } }, 60);
  }
  function footBtn() {
    var f = d.querySelector('footer.foot .wrap'); if (!f || d.getElementById('cbg-re')) return;
    var p = el('p'), b = el('button', 'btn ghost', 'Change your welcome answers'); b.type = 'button'; b.id = 'cbg-re';
    b.addEventListener('click', open); p.appendChild(b); f.appendChild(p);
  }
  window.CBGate = { open: open, close: close, get: get };
  function boot() {
    footBtn();
    if (/[?&]nogate\b/.test(location.search)) return;
    if (!get()) setTimeout(open, 500);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
