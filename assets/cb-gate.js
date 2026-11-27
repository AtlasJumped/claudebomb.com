/* claudebomb.com welcome gateway: a dismissible pop-up on a visitor's first entry.
   Step 1, they give us context (all optional). Step 2, we tell them who we are. Then they enter the site.
   Answers are kept in this browser (localStorage 'cb-ctx-v1'). Submitting sends the answers (never the name) to the
   claudebomb.com inbox through the bottom button's feedback pipeline, with no email app. The AI they pick here is also
   the AI the copy buttons use (cb2.js 'cb-model'), so the site never asks it again.
   Shown once; reopen with the footer button or window.CBGate.open(). Esc or Skip closes it. */
(function () {
  var d = document, KEY = 'cb-ctx-v1';
  function get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function put(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  var Q = [
    { k: 'intent', q: 'What brings you here?', o: ['Just curious', 'Find a prompt', 'Share a prompt', 'Improve prompts'] },
    { k: 'ai', q: 'Which AI do you use most?', o: ['Claude', 'ChatGPT', 'Gemini', 'Grok', 'Copilot', 'Another one', 'None yet'] },
    { k: 'level', q: 'How much have you used AI?', o: ['New to it', 'Some', 'A lot'] }
  ];
  // gate answer -> copy-button model (cb2.js MODELS)
  var MODEL = { 'Claude': 'claude', 'ChatGPT': 'chatgpt', 'Gemini': 'gemini', 'Grok': 'grok', 'Copilot': 'other', 'Another one': 'other' };
  var MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  var css = '.cbg-veil{position:fixed;inset:0;z-index:2147482000;background:rgba(21,21,21,.45);display:grid;place-items:center;padding:1rem;opacity:0;transition:opacity .2s}' +
    '.cbg-veil.on{opacity:1}' +
    '.cbg{background:var(--bg,#fff6e0);color:var(--fg,#151515);border:3px solid var(--fg,#151515);border-radius:24px;box-shadow:8px 8px 0 var(--fg,#151515);width:min(34rem,100%);max-height:calc(100dvh - 2rem);overflow:auto;padding:1.4rem 1.3rem 1.2rem;font:17px/1.5 var(--sans,ui-sans-serif,system-ui,sans-serif);transform:translateY(12px);transition:transform .22s}' +
    '.cbg-veil.on .cbg{transform:none}' +
    '.cbg h2{font-size:clamp(1.6rem,6vw,2.3rem);line-height:1;margin:0 0 .4rem;letter-spacing:-.03em;font-weight:900}' +
    '.cbg p{margin:0 0 .9rem}.cbg .mut{color:var(--mut,#3d3a33);font-size:.95rem}' +
    '.cbg fieldset{border:0;margin:0 0 1rem;padding:0;min-width:0}.cbg legend,.cbg label.l{display:block;font-weight:800;margin:0 0 .15rem;padding:0}' +
    '.cbg .hint{font-size:.85rem;color:var(--mut,#3d3a33);margin:0 0 .4rem}' +
    '.cbg .namerow{display:flex;gap:.5rem;align-items:center;margin-top:.3rem}' +
    '.cbg input[type=text]{flex:1;min-width:0;min-height:48px;font:inherit;padding:.5rem .8rem;border:2px solid var(--fg,#151515);border-radius:12px;background:#fff;color:var(--fg,#151515)}' +
    '.cbg .mic{flex:none;width:48px;height:48px;border:2px solid var(--fg,#151515);border-radius:12px;background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--fg,#151515);padding:0}' +
    '.cbg .mic svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2}.cbg .mic.rec{background:var(--acc,#ff5a36)}' +
    '.cbg .opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}' +
    '.cbg .opts button{min-height:52px;padding:.45rem .7rem;border:2px solid var(--fg,#151515);border-radius:14px;background:#fff;box-shadow:3px 3px 0 var(--fg,#151515);font:inherit;font-weight:800;font-size:1rem;line-height:1.2;cursor:pointer;color:var(--fg,#151515);text-align:left;display:flex;align-items:center;gap:.5rem}' +
    '.cbg .opts button::before{content:"";flex:none;width:20px;height:20px;border:2px solid var(--fg,#151515);border-radius:50%;background:#fff}' +
    '.cbg .opts button[aria-pressed="true"]{background:var(--sun,#ffd23f)}' +
    '.cbg .opts button[aria-pressed="true"]::before{background:var(--fg,#151515);box-shadow:inset 0 0 0 3px #fff}' +
    '.cbg .opts button:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--fg,#151515)}' +
    '.cbg .col{display:flex;flex-direction:column;gap:.5rem;align-items:stretch}' +
    '.cbg .go{min-height:52px;padding:0 1.3rem;border:2px solid var(--fg,#151515);border-radius:99px;background:var(--acc,#ff5a36);color:#151515;font:inherit;font-weight:900;cursor:pointer}' +
    '.cbg .ghost2{min-height:48px;padding:0 1.1rem;border:2px solid var(--fg,#151515);border-radius:99px;background:#fff;color:var(--fg,#151515);font:inherit;font-weight:800;cursor:pointer}' +
    '.cbg .skip2{min-height:48px;padding:0 1rem;border:0;background:none;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;color:var(--fg,#151515)}' +
    '.cbg ul{margin:0 0 1rem;padding-left:1.2rem}.cbg li{margin:0 0 .45rem}' +
    '@media (max-width:22rem){.cbg .opts{grid-template-columns:1fr}}' +
    '@media (prefers-reduced-motion:reduce){.cbg-veil,.cbg{transition:none}}';
  var veil = null, last = null;
  function el(t, c, x) { var e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function close(how) {
    if (!veil) return;
    var v = veil; veil = null; v.classList.remove('on'); d.removeEventListener('keydown', onKey, true);
    setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); }, 220);
    var s = get() || {}; if (!s.at) { s.at = Date.now(); s.skipped = how === 'skip'; put(s); }
    try { if (last && last.focus) last.focus({ preventScroll: true }); } catch (e) { }
  }
  function onKey(e) {
    if (!veil) return;
    if (e.key === 'Escape') { e.preventDefault(); close('skip'); return; }
    if (e.key !== 'Tab') return;
    var f = veil.querySelectorAll('button:not([hidden]),input,a[href]'); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function about(box) {
    box.innerHTML = '';
    var s = get() || {};
    var h = el('h2', '', (s.name ? 'Thanks, ' + s.name + '. ' : 'Thanks. ') + 'Here is who we are');
    h.id = 'cbg-h'; box.appendChild(h);
    box.appendChild(el('p', '', 'We understand that many people feel AI is out of reach for them. Today, humanity is missing just one thing.'));
    var ul = el('ul');
    ['What we do have is incredibly powerful AI assistants.',
      'What we also have is curious, smart, capable, caring people who would use their time to help others, if it were easy enough to do from the comfort of their own home.',
      'What we don’t have is a simple way to introduce people who are wary of what these systems can do, today and in the future, and to break the ice.'].forEach(function (t) { ul.appendChild(el('li', '', t)); });
    box.appendChild(ul);
    box.appendChild(el('p', '', 'This is that moment.'));
    var ul2 = el('ul');
    ['claudebomb.com is a free, open bank of long prompts for any AI, not just Claude.',
      'It is part of the elevat.ing family of websites: free forever, with never any ads.',
      'Our goal is to elevate humanity, and to show everybody that a small team can make a big difference in the pursuit of truth and harmony.'].forEach(function (t) { ul2.appendChild(el('li', '', t)); });
    box.appendChild(ul2);
    var col = el('div', 'col'), go = el('button', 'go', 'Enter claudebomb.com'), why = el('button', 'ghost2', 'Why we built it');
    go.type = why.type = 'button';
    go.addEventListener('click', function () { close('enter'); });
    why.addEventListener('click', function () { close('enter'); location.href = '/why/'; });
    col.appendChild(go); col.appendChild(why); box.appendChild(col);
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
    box.appendChild(el('p', '', 'Tell us a little about you, then we will tell you about us.'));
    box.appendChild(el('p', 'mut', 'Every question is optional. Skip any of them, or all of them.'));
    var nl = el('label', 'l', 'What should we call you?'); nl.htmlFor = 'cbg-name';
    var nw = el('fieldset'); nw.appendChild(nl);
    var nr = el('div', 'namerow');
    var ni = el('input'); ni.type = 'text'; ni.id = 'cbg-name'; ni.autocomplete = 'given-name'; ni.maxLength = 40; ni.value = ans.name;
    nr.appendChild(ni);
    if (window.CB && CB.mic) { var mb = el('button', 'mic'); mb.type = 'button'; mb.innerHTML = MIC; nr.appendChild(mb); try { CB.mic(mb, ni, null); } catch (e) { mb.hidden = true; } }
    nw.appendChild(nr); box.appendChild(nw);
    Q.forEach(function (x) {
      var fs = el('fieldset'); fs.appendChild(el('legend', '', x.q)); fs.appendChild(el('p', 'hint', 'Tap one.'));
      var c = el('div', 'opts'); c.setAttribute('role', 'group');
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
    var col = el('div', 'col'), go = el('button', 'go', 'Submit'), sk = el('button', 'skip2', 'Skip for now');
    go.type = sk.type = 'button';
    function submit() {
      ans.name = String(ni.value || '').trim().slice(0, 40);
      var s = { name: ans.name, intent: ans.intent, ai: ans.ai, level: ans.level, at: Date.now() };
      put(s);
      if (MODEL[s.ai]) { lsSet('cb-model', MODEL[s.ai]); lsSet('cb-model-asked', '1'); } else if (s.ai) lsSet('cb-model-asked', '1');
      if ((s.intent || s.ai || s.level) && window.HMRDock && HMRDock.send) {
        try { HMRDock.send({ kind: 'welcome', noMailto: true, message: 'Welcome answers (claudebomb.com)\nWhat brings you here: ' + (s.intent || '-') + '\nAI used most: ' + (s.ai || '-') + '\nHow much AI: ' + (s.level || '-') }); } catch (e) { }
      }
      try { window.dispatchEvent(new CustomEvent('cb-context', { detail: s })); } catch (e) { }
      about(box);
    }
    go.addEventListener('click', submit);
    ni.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    sk.addEventListener('click', function () { close('skip'); });
    col.appendChild(go); col.appendChild(sk); box.appendChild(col);
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
