/* claudebomb accounts: the shared HMR family account (/hmr-auth.js). Logging in, creating an account and resetting a
   password happen in the HMR dashboard's Log in view (every HMR site). This file syncs saved prompts to the
   saved_prompts table (supabase/schema.sql) and draws the account box on /my/. */
(function () {
  var K = window.CB_CONFIG || {}, C = window.CB, d = document;
  if (!K.auth || !C) return;
  var A = window.CBAccount = { user: null }, box = null, H = null;
  function auth(cb) {
    if (window.HMRAuth) return cb(window.HMRAuth);
    var s = d.querySelector('script[data-hmr-auth]');
    if (!s) { s = d.createElement('script'); s.src = K.auth; s.async = true; s.setAttribute('data-hmr-auth', ''); d.head.appendChild(s); }
    s.addEventListener('load', function () { if (window.HMRAuth) cb(window.HMRAuth); });
  }
  auth(function (h) {
    H = h;
    h.onChange(function (u) { var was = A.user; A.user = u || null; if (u && (!was || was.id !== u.id)) pull(); draw(); });
  });
  function db() { return H && H.from('saved_prompts'); }
  function row(it) {
    return { key: it.key, prompt_id: it.id || null, title: it.title || null, url: it.url || null, text: it.text || '', model: C.model() || null,
             share_for_improvement: C.ls('cb-share') !== '0', credit_name: C.ls('cb-credit') || null, updated_at: it.edited || it.saved || new Date().toISOString() };
  }
  // merge the account's prompts into this device, then send the device's back
  function pull() {
    db().select('*').then(function (r) {
      if (r.error) return;
      var local = C.mine(), byKey = {};
      local.forEach(function (m) { byKey[m.key] = m; });
      r.data.forEach(function (x) { var m = byKey[x.key]; if (!m || (m.edited || m.saved) < x.updated_at) byKey[x.key] = { key: x.key, id: x.prompt_id, title: x.title, url: x.url, text: x.text, saved: x.created_at, edited: x.updated_at }; });
      var all = Object.keys(byKey).map(function (k) { return byKey[k]; }).sort(function (a, b) { return (b.saved || '') < (a.saved || '') ? -1 : 1; });
      C.ls('cb-my', JSON.stringify(all)); A.push(all); window.dispatchEvent(new Event('cb-my-synced'));
    });
  }
  A.push = function (list) {
    if (!A.user || !H) return;
    var keys = list.map(function (m) { return m.key; });
    if (list.length) db().upsert(list.map(row), { onConflict: 'user_id,key' }).then(function () {});
    var q = db().delete().eq('user_id', A.user.id);
    if (keys.length) q = q.not('key', 'in', '(' + keys.map(function (k) { return '"' + k.replace(/"/g, '') + '"'; }).join(',') + ')');
    q.then(function () {});
  };
  function openLogin() { if (window.HMRDock && window.HMRDock.openDash) window.HMRDock.openDash('login'); else location.hash = 'login'; }
  function draw() {
    if (!box) return; box.textContent = '';
    if (A.user) {
      box.appendChild(C.el('p', null, 'Logged in as ' + A.user.email + '. Your saved prompts follow you to any device where you log in.'));
      box.appendChild(C.el('p', 'mut', 'claudebomb.com is part of the HMR family of websites. The same account works on every HMR family site. All of them are free, with no ads.'));
      var lb = C.el('label', 'lbl', 'Name to credit you with (leave blank for no credit)'), nm = C.el('input', 'inp');
      nm.id = 'credit'; lb.setAttribute('for', 'credit'); nm.value = C.ls('cb-credit') || '';
      nm.addEventListener('change', function () { C.ls('cb-credit', nm.value.trim() || null); A.push(C.mine()); });
      var cl = C.el('label', 'lbl'), cbx = C.el('input'); cbx.type = 'checkbox'; cbx.checked = C.ls('cb-share') !== '0';
      cl.appendChild(cbx); cl.appendChild(d.createTextNode(' Use my saved prompts to improve shared prompts'));
      cbx.addEventListener('change', function () { C.ls('cb-share', cbx.checked ? null : '0'); A.push(C.mine()); });
      var bs = C.el('div', 'btns'), out = C.el('button', 'btn ghost', 'Log out'); out.type = 'button';
      out.addEventListener('click', function () { H.signOut(); });
      bs.appendChild(out); [lb, nm, cl, bs].forEach(function (e) { box.appendChild(e); });
    } else {
      box.appendChild(C.el('p', null, 'Log in to keep your prompts on every device and add your votes to the shared counts. Until then, what you save stays in this browser on this device, and nobody else can see it.'));
      var b2 = C.el('div', 'btns'), b = C.el('button', 'btn', 'Log in or create a free account'); b.type = 'button';
      b.addEventListener('click', openLogin); b2.appendChild(b); box.appendChild(b2);
    }
  }
  A.mount = function (el) { box = el; draw(); };
})();
