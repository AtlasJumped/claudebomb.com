/* claudebomb accounts. Off until assets/cb-config.js has a Supabase URL and anon key.
   Sign in by an emailed link. Saved prompts sync to the saved_prompts table (see supabase/schema.sql). */
(function () {
  var K = window.CB_CONFIG || {}, C = window.CB, d = document;
  if (!K.supabaseUrl || !K.supabaseAnonKey || !C) return;
  var A = window.CBAccount = { user: null }, sb = null, ready = [], box = null;
  function whenReady(f) { if (sb) f(); else ready.push(f); }
  var s = d.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  s.onload = function () {
    sb = window.supabase.createClient(K.supabaseUrl, K.supabaseAnonKey);
    sb.auth.onAuthStateChange(function (ev, ses) { var u = ses && ses.user; var was = A.user; A.user = u || null; if (u && (!was || was.id !== u.id)) pull(); draw(); });
    sb.auth.getSession().then(function (r) { A.user = (r.data.session && r.data.session.user) || null; if (A.user) pull(); draw(); });
    ready.forEach(function (f) { f(); }); ready = [];
  };
  d.head.appendChild(s);
  function row(it) {
    return { key: it.key, prompt_id: it.id || null, title: it.title || null, url: it.url || null, text: it.text || '', model: C.model() || null,
             share_for_improvement: C.ls('cb-share') !== '0', credit_name: C.ls('cb-credit') || null, updated_at: it.edited || it.saved || new Date().toISOString() };
  }
  // merge the account's prompts into this device, then send the device's back
  function pull() {
    sb.from('saved_prompts').select('*').then(function (r) {
      if (r.error) return;
      var local = C.mine(), byKey = {};
      local.forEach(function (m) { byKey[m.key] = m; });
      r.data.forEach(function (x) { var m = byKey[x.key]; if (!m || (m.edited || m.saved) < x.updated_at) byKey[x.key] = { key: x.key, id: x.prompt_id, title: x.title, url: x.url, text: x.text, saved: x.created_at, edited: x.updated_at }; });
      var all = Object.keys(byKey).map(function (k) { return byKey[k]; }).sort(function (a, b) { return (b.saved || '') < (a.saved || '') ? -1 : 1; });
      C.ls('cb-my', JSON.stringify(all)); A.push(all); window.dispatchEvent(new Event('cb-my-synced'));
    });
  }
  A.push = function (list) {
    if (!A.user) return;
    whenReady(function () {
      var keys = list.map(function (m) { return m.key; });
      if (list.length) sb.from('saved_prompts').upsert(list.map(row), { onConflict: 'user_id,key' }).then(function () {});
      var q = sb.from('saved_prompts').delete().eq('user_id', A.user.id);
      if (keys.length) q = q.not('key', 'in', '(' + keys.map(function (k) { return '"' + k.replace(/"/g, '') + '"'; }).join(',') + ')');
      q.then(function () {});
    });
  };
  function draw() {
    if (!box) return; box.textContent = '';
    if (A.user) {
      box.appendChild(C.el('p', null, 'Signed in as ' + A.user.email + '. Your saved prompts follow you to any device.'));
      var lb = C.el('label', 'lbl', 'Name to credit you with (leave blank for no credit)'), nm = C.el('input', 'inp');
      nm.id = 'credit'; lb.setAttribute('for', 'credit'); nm.value = C.ls('cb-credit') || '';
      nm.addEventListener('change', function () { C.ls('cb-credit', nm.value.trim() || null); A.push(C.mine()); });
      var cl = C.el('label', 'lbl'), cbx = C.el('input'); cbx.type = 'checkbox'; cbx.checked = C.ls('cb-share') !== '0';
      cl.appendChild(cbx); cl.appendChild(d.createTextNode(' Use my saved prompts to improve shared prompts'));
      cbx.addEventListener('change', function () { C.ls('cb-share', cbx.checked ? null : '0'); A.push(C.mine()); });
      var bs = C.el('div', 'btns'), out = C.el('button', 'btn ghost', 'Sign out'); out.type = 'button';
      out.addEventListener('click', function () { sb.auth.signOut(); });
      bs.appendChild(out); [lb, nm, cl, bs].forEach(function (e) { box.appendChild(e); });
    } else {
      box.appendChild(C.el('p', null, 'Sign in to keep your prompts on every device. We email you a link: no password.'));
      var l2 = C.el('label', 'lbl', 'Your email'), em = C.el('input', 'inp'), b = C.el('button', 'btn', 'Email me a sign-in link'), st = C.el('p', 'st');
      em.id = 'acct-em'; em.type = 'email'; em.setAttribute('autocomplete', 'email'); l2.setAttribute('for', 'acct-em'); b.type = 'button'; st.setAttribute('role', 'status');
      b.addEventListener('click', function () {
        var v = em.value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { st.textContent = 'That email does not look right. Check it and try again.'; return; }
        st.textContent = 'Sending...';
        whenReady(function () { sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + '/my/' } }).then(function (r) { st.textContent = r.error ? 'It did not send. Try again in a moment.' : 'Check your email for the sign-in link.'; }); });
      });
      [l2, em, b, st].forEach(function (e) { box.appendChild(e); });
    }
  }
  A.mount = function (el) { box = el; draw(); };
})();
