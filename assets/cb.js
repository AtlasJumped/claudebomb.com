/* claudebomb.com shared helpers: copy, toast, voice typing, and sending requests and improvements
   through the HMR dock's send() (the same inbox as the HMR feedback button). */
(function () {
  'use strict';
  var d = document;
  function el(t, c, x) { var e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var toastEl = null, tt = 0;
  function toast(t) {
    if (!toastEl) { toastEl = d.getElementById('toast'); if (!toastEl) { toastEl = el('div', 'toast'); toastEl.setAttribute('role', 'status'); d.body.appendChild(toastEl); } }
    toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  }
  function copyText(t) {
    return new Promise(function (res) {
      function fb() { var ta = d.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select(); var ok = false; try { ok = d.execCommand('copy'); } catch (e) { } d.body.removeChild(ta); res(ok); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { res(true); }, fb); else fb();
    });
  }
  function copied(ok) { toast(ok ? 'Copied. Paste it into a new chat with your AI.' : 'Copy did not work. Open Read it first and copy by hand.'); }
  var FULL = null;
  function loadDash() {
    if (FULL) return Promise.resolve(FULL);
    function get(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }); }
    return Promise.all([get('/setup/claude-setup-guide.md'), get('/dashboard/claudebomb-dashboard.md')]).then(function (a) {
      FULL = a[0].replace(/\s+$/, '') + '\n\n---\n\nThe dashboard instructions follow. Read them after the setup guide above.\n\n---\n\n' + a[1]; return FULL;
    });
  }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---- voice typing into a textarea
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  var STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>';
  function mic(btn, ta, st) {
    var rec = null, want = false, interim = '';
    function say(t) { if (st) st.textContent = t; }
    function lab(on) { btn.classList.toggle('rec', on); btn.innerHTML = on ? STOP : MIC; var t = on ? 'Stop talking' : 'Talk instead of typing'; btn.setAttribute('aria-label', t); btn.title = t; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    lab(false);
    if (!SR) { btn.hidden = true; say('Voice typing does not work in this browser. Type instead, or try Chrome, Edge, or Safari.'); return; }
    function sep() { return ta.value && !/\s$/.test(ta.value) ? ' ' : ''; }
    function strip() { if (interim && ta.value.slice(-interim.length) === interim) ta.value = ta.value.slice(0, -interim.length); interim = ''; }
    function begin() {
      try {
        rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = navigator.language || 'en-US';
        rec.onresult = function (ev) { strip(); var fin = '', itm = ''; for (var i = ev.resultIndex; i < ev.results.length; i++) { var r = ev.results[i]; if (r.isFinal) fin += r[0].transcript; else itm += r[0].transcript; } if (fin.trim()) ta.value += sep() + fin.trim(); if (itm.trim()) { interim = sep() + itm.trim(); ta.value += interim; } ta.dispatchEvent(new Event('input')); };
        rec.onerror = function (ev) { var er = ev && ev.error; if (er === 'not-allowed' || er === 'service-not-allowed') { want = false; say('The microphone is blocked. Allow it in your browser, or type. Your words are saved.'); } else if (er === 'audio-capture') { want = false; say('No microphone found. You can type instead.'); } };
        rec.onend = function () { interim = ''; if (want) setTimeout(function () { if (want) begin(); }, 250); else { lab(false); if (!/blocked|found/.test(st ? st.textContent : '')) say(ta.value ? 'Stopped. Your words are saved.' : ''); } };
        rec.start(); lab(true); say('Listening. Talk as long as you like.');
      } catch (e) { want = false; lab(false); say('Voice typing could not start. You can type instead.'); }
    }
    btn.addEventListener('click', function () { if (want) { want = false; try { rec.stop(); } catch (e) { } lab(false); } else { want = true; begin(); } });
    ta.addEventListener('input', function (e) { if (e.isTrusted) interim = ''; });
    window.addEventListener('pagehide', function () { want = false; try { if (rec) rec.stop(); } catch (e) { } });
  }

  // ---- send through the HMR dock (same inbox as the feedback button)
  function dockReady() {
    return new Promise(function (res) { var n = 0; (function w() { if (window.HMRDock && window.HMRDock.send) return res(window.HMRDock); if (++n > 50) return res(null); setTimeout(w, 100); })(); });
  }
  function send(p) {
    return dockReady().then(function (dk) { if (!dk) return { ok: false, via: 'none' }; return dk.send(p); });
  }
  // "Submit with my email" (shows the email field) or "Submit anonymously"
  function submitPair(box, o) {
    var n = Math.random().toString(36).slice(2, 7);
    var emr = el('div', 'em'), lb = el('label', 'lbl', 'Your email, so we can reply and credit you'), em = el('input', 'inp');
    emr.hidden = true; lb.setAttribute('for', 'em-' + n); em.id = 'em-' + n; em.type = 'email'; em.setAttribute('autocomplete', 'email'); emr.appendChild(lb); emr.appendChild(em);
    var bs = el('div', 'btns'), b1 = el('button', 'btn', 'Submit with my email'), b2 = el('button', 'btn ghost', 'Submit anonymously'), st = el('p', 'st');
    b1.type = b2.type = 'button'; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    bs.appendChild(b1); bs.appendChild(b2); box.appendChild(emr); box.appendChild(bs); box.appendChild(st);
    function go(email) {
      var t = String(o.text() || '').trim();
      if (!t) { st.textContent = o.empty || 'Add a few words first, or tap the microphone and talk.'; return; }
      st.textContent = 'Sending...'; b1.disabled = b2.disabled = true;
      var p = { kind: o.kind, message: t, details: o.details ? o.details() : null }; if (email) p.email = email;
      send(p).then(function (r) {
        b1.disabled = b2.disabled = false;
        if (r && r.ok) { st.textContent = 'Sent. Thank you. We read every one.'; if (o.onSent) o.onSent(); }
        else if (r && r.via === 'mailto') st.textContent = 'Your email app should have opened with your message. Your text is still here.';
        else st.textContent = 'It did not send. Your text is still here. Try again in a moment.';
      });
    }
    b1.addEventListener('click', function () {
      if (emr.hidden) { emr.hidden = false; st.textContent = 'Type your email, then press Submit with my email again.'; em.focus(); return; }
      var v = em.value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { st.textContent = 'That email does not look right. Check it and try again.'; em.focus(); return; }
      go(v);
    });
    b2.addEventListener('click', function () { go(''); });
  }
  // keep a draft on this device
  function keep(ta, key) { var v = ls(key); if (v && !ta.value) ta.value = v; ta.addEventListener('input', function () { ls(key, ta.value || null); }); }

  window.CB = { el: el, toast: toast, copyText: copyText, copied: copied, loadDash: loadDash, mic: mic, send: send, submitPair: submitPair, keep: keep, ls: ls };
  // wire every [data-mic] button: data-mic="textarea id", data-st="status id"
  function wire() {
    Array.prototype.forEach.call(d.querySelectorAll('[data-mic]'), function (b) { var ta = d.getElementById(b.getAttribute('data-mic')); var st = d.getElementById(b.getAttribute('data-st')); if (ta) mic(b, ta, st); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', wire); else wire();
})();
