(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const MAX_CLIP = 10, TAIL = 1.2, COUNT = 3;
  const CLIPS = window.REACTION_CLIPS;

  /* ---------- navigation ---------- */
  let current = 'home';
  function show(name) {
    current = name;
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + name));
    const tabs = { home: 'home', ready: 'home', send: 'home', consent: 'home', watch: 'home', card: 'home', own: 'home', community: 'community', thread: 'community', leaders: 'leaders', inbox: 'inbox', friends: 'me', me: 'me' };
    $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.go === tabs[name]));
    $('#nav').classList.toggle('hide', name === 'watch' || (name === 'own' && ownBusy));
    $('#main').scrollTop = 0;
    document.documentElement.dataset.screen = name;
    document.dispatchEvent(new CustomEvent('rxscreen', { detail: name }));
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    if (current === 'card') cleanupCard();
    show(b.dataset.go);
  });

  /* ---------- clip sources ---------- */
  function genInstance(clip) {
    return { dur: clip.dur, start() {}, stop() {}, draw(c, t, W) { clip.draw(c, Math.min(t, clip.dur), W); } };
  }
  function videoInstance(clip, withSound) {
    const v = document.createElement('video');
    v.src = clip.url; v.playsInline = true; v.muted = !withSound; v.preload = 'auto';
    return {
      dur: clip.dur,
      start() { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); }); },
      stop() { v.pause(); },
      draw(c, t, W) {
        c.fillStyle = '#000'; c.fillRect(0, 0, W, W);
        const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
        const s = Math.max(W / vw, W / vh), dw = vw * s, dh = vh * s;
        c.drawImage(v, (W - dw) / 2, (W - dh) / 2, dw, dh);
      }
    };
  }
  function instance(clip, withSound) { return clip.kind === 'video' ? videoInstance(clip, withSound) : genInstance(clip); }

  /* ---------- home ---------- */
  let chosen = null, previewRAF = 0, previewInst = null;
  function choose(clip) {
    chosen = clip;
    $('#readyName').textContent = clip.title + ' (' + clip.dur.toFixed(clip.dur % 1 ? 1 : 0) + ' s)';
    show('ready');
    cancelAnimationFrame(previewRAF);
    previewInst = instance(clip, false); previewInst.start();
    const c = $('#readyCv').getContext('2d'), t0 = performance.now();
    (function loop() {
      if (current !== 'ready') { previewInst.stop(); return; }
      const t = ((performance.now() - t0) / 1000) % (clip.dur + 0.8);
      if (t < clip.dur) previewInst.draw(c, t, 720);
      if (clip.kind === 'video' && t < 0.05) previewInst.start();
      previewRAF = requestAnimationFrame(loop);
    })();
  }

  $('#fileIn').addEventListener('change', e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const msg = $('#fileMsg'); msg.textContent = 'Reading your file on this device...';
    const url = URL.createObjectURL(f), v = document.createElement('video');
    v.preload = 'metadata'; v.src = url;
    v.onloadedmetadata = () => {
      const real = isFinite(v.duration) ? v.duration : MAX_CLIP, dur = Math.min(real, MAX_CLIP);
      msg.textContent = real > MAX_CLIP ? 'Your file is ' + Math.round(real) + ' seconds. We will play the first 10.' : '';
      choose({ id: 'file', kind: 'video', title: f.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Your clip', note: 'Your file', dur, url });
    };
    v.onerror = () => { msg.textContent = 'We could not read that file as a video. Try an MP4 or WebM, or record one here.'; };
  });

  /* ---------- recording helpers ---------- */
  function pickMime() {
    const list = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }
  async function getCam(facing, wantAudio) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser cannot use the camera here. Try Chrome, Edge, Safari, or Firefox over https.');
    const video = { facingMode: facing, width: { ideal: 720 }, height: { ideal: 720 } };
    try { return await navigator.mediaDevices.getUserMedia({ video, audio: wantAudio }); }
    catch (e) { if (wantAudio && e.name !== 'NotAllowedError') return navigator.mediaDevices.getUserMedia({ video, audio: false }); throw e; }
  }
  function camMessage(e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) return 'The camera was blocked. You can allow it in your browser settings, or choose Watch without recording.';
    if (e && e.name === 'NotFoundError') return 'We could not find a camera on this device. You can still watch without recording.';
    return (e && e.message) || 'The camera did not start. You can still watch without recording.';
  }
  function stopStream(s) { if (s) s.getTracks().forEach(t => t.stop()); }
  function recordStream(stream) {
    const mime = pickMime(), chunks = [];
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' })); });
    rec.start(250);
    return { rec, done };
  }

  /* ---------- consent and watch ---------- */
  let session = null;
  $('#btnReact').addEventListener('click', () => { $('#camErr').hidden = true; show('consent'); });
  $('#consentBack').addEventListener('click', () => show('ready'));
  $('#btnSendSoon').addEventListener('click', () => show('send'));
  $('#btnSend').addEventListener('click', openSheet);
  function openSheet() { const s = $('#sheet'); s.hidden = false; $('#sheetClose').focus(); }
  $('#sheetClose').addEventListener('click', () => { $('#sheet').hidden = true; });
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') $('#sheet').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#sheet').hidden = true; });

  $('#btnStart').addEventListener('click', async () => {
    const btn = $('#btnStart'); btn.disabled = true; $('#camErr').hidden = true;
    let stream;
    try { stream = await getCam('user', true); }
    catch (e) { const el = $('#camErr'); el.textContent = camMessage(e); el.hidden = false; btn.disabled = false; return; }
    btn.disabled = false;
    play(stream);
  });
  $('#btnWatchOnly').addEventListener('click', () => play(null));

  async function play(stream) {
    const clip = chosen, inst = instance(clip, true);
    const cv = $('#watchCv'), c = cv.getContext('2d');
    session = { stream, discarded: false, raf: 0, inst };
    show('watch');
    $('#recDot').className = 'dot' + (stream ? '' : ' off');
    $('#recText').textContent = stream ? 'Recording' : 'Watching, not recording';
    $('#recNote').textContent = stream ? 'Your camera is on. We are not showing your face. Just watch and react.' : 'Nothing is being recorded.';
    $('#btnDiscard').textContent = stream ? 'Stop and discard' : 'Back';
    $('#recTime').textContent = '';
    inst.draw(c, 0, 720);
    // countdown, camera stays unseen
    const cnt = $('#count');
    for (let n = COUNT; n > 0; n--) { cnt.textContent = n; await wait(800); if (session.discarded) return; }
    cnt.textContent = '';
    let R = null;
    if (stream) {
      try { R = recordStream(stream); } catch (e) { stopStream(stream); session.stream = null; $('#recText').textContent = 'Recording is not supported here. Watching only.'; $('#recDot').className = 'dot off'; }
    }
    inst.start();
    const t0 = performance.now(); let stopped = false;
    (function loop() {
      if (session.discarded) return;
      const t = (performance.now() - t0) / 1000;
      inst.draw(c, Math.min(t, clip.dur), 720);
      $('#recTime').textContent = stream ? Math.min(t, clip.dur + TAIL).toFixed(1) + ' s' : '';
      if (t >= clip.dur && clip.kind === 'video') inst.stop();
      if (t >= clip.dur + (R ? TAIL : 0.4) && !stopped) { stopped = true; finish(); return; }
      session.raf = requestAnimationFrame(loop);
    })();
    async function finish() {
      inst.stop();
      if (R) {
        R.rec.stop(); const blob = await R.done; stopStream(session.stream);
        if (session.discarded) return;
        showCard(blob, clip);
      } else showCard(null, clip);
    }
    session.R = R;
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  $('#btnDiscard').addEventListener('click', () => {
    if (!session) { show('ready'); return; }
    session.discarded = true; cancelAnimationFrame(session.raf);
    if (session.inst) session.inst.stop();
    if (session.R) { try { session.R.rec.stop(); } catch (e) {} }
    stopStream(session.stream); $('#count').textContent = '';
    session = null; show('ready'); choose(chosen);
  });

  /* ---------- card ---------- */
  const FEELS = ['Laughed', 'Shocked', 'Touched', 'Disgusted', 'Angry'];
  let tags = new Set();
  const tagRow = $('#tagRow');
  FEELS.forEach(f => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = f; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      tags.has(f) ? tags.delete(f) : tags.add(f); b.setAttribute('aria-pressed', tags.has(f));
      builtCard = null; $('#cardMeta').textContent = metaText();
    });
    tagRow.appendChild(b);
  });
  function metaText() { return reaction ? reaction.clip.title + (tags.size ? ' | ' + [...tags].join(', ') : '') : ''; }
  let reaction = null, cardInst = null, cardRAF = 0, builtCard = null, building = null;
  function showCard(blob, clip) {
    cleanupCard(); tags = new Set(); $$('#tagRow button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    reaction = blob ? { blob, url: URL.createObjectURL(blob), clip } : null;
    builtCard = null; building = null;
    const card = $('#card'), vid = $('#cardVid');
    card.classList.toggle('empty', !blob);
    $('#noRec').hidden = !!blob;
    ['#btnReplay', '#btnDownload', '#btnShare', '#btnDlRaw'].forEach(s => { $(s).hidden = !blob && s !== '#btnReplay'; });
    $('#btnDownload').hidden = $('#btnShare').hidden = $('#btnDlRaw').hidden = !blob;
    $('#cardMsg').textContent = '';
    $('#btnShare').hidden = !blob || !canShareFiles();
    card.dataset.bytes = blob ? blob.size : 0; card.dataset.type = blob ? blob.type : '';
    $('#tagBox').hidden = !blob; $('#cardMeta').textContent = clip.title;
    document.documentElement.dataset.reactionBytes = blob ? blob.size : 0;
    show('card');
    if (blob) { vid.src = reaction.url; vid.muted = false; }
    else { vid.removeAttribute('src'); }
    replay();
  }
  function replay() {
    cancelAnimationFrame(cardRAF);
    const clip = reaction ? reaction.clip : chosen, vid = $('#cardVid'), c = $('#cardClip').getContext('2d');
    if (cardInst) cardInst.stop();
    cardInst = instance(clip, false);
    const t0 = performance.now();
    if (reaction) {
      vid.currentTime = 0;
      const p = vid.play(); if (p && p.catch) p.catch(() => { vid.muted = true; vid.play().catch(() => {}); });
    }
    cardInst.start();
    (function loop() {
      if (current !== 'card') return;
      const t = reaction && vid.currentTime ? vid.currentTime : (performance.now() - t0) / 1000;
      cardInst.draw(c, Math.min(t, clip.dur), 540);
      cardRAF = requestAnimationFrame(loop);
    })();
  }
  $('#btnReplay').addEventListener('click', replay);
  function cleanupCard() {
    cancelAnimationFrame(cardRAF);
    if (cardInst) cardInst.stop();
    const vid = $('#cardVid'); vid.pause();
    if (reaction) { URL.revokeObjectURL(reaction.url); reaction = null; }
    builtCard = null; vid.removeAttribute('src'); vid.load();
  }
  $('#btnDelete').addEventListener('click', () => { cleanupCard(); show('ready'); choose(chosen); });
  $('#btnAgain').addEventListener('click', () => { const c = chosen; cleanupCard(); show('consent'); chosen = c; });

  function ext(blob) { return /mp4/.test(blob.type) ? 'mp4' : 'webm'; }
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'video/mp4' })], 'a.mp4', { type: 'video/mp4' })] })); } catch (e) { return false; }
  }

  // Build one side-by-side video: clip on the left, reaction on the right. Runs at real speed on this device.
  function buildCard() {
    if (builtCard) return Promise.resolve(builtCard);
    if (building) return building;
    const clip = reaction.clip, W = 1080, H = 600, S = 540;
    building = new Promise((resolve, reject) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d'), v = document.createElement('video');
      v.src = reaction.url; v.playsInline = true;
      const inst = instance(clip, false), tmp = document.createElement('canvas'); tmp.width = tmp.height = S; const tg = tmp.getContext('2d');
      const stream = cv.captureStream(30); let actx = null;
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = actx.createMediaStreamDestination(), src = actx.createMediaElementSource(v);
        src.connect(dest); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch (e) { actx = null; }
      const mime = pickMime(); let rec;
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch (e) { reject(e); return; }
      const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => { if (actx) actx.close().catch(() => {}); resolve(new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' })); };
      let ended = false;
      const draw = () => {
        const t = v.currentTime || 0;
        g.fillStyle = '#1b1033'; g.fillRect(0, 0, W, H);
        inst.draw(tg, Math.min(t, clip.dur), S); g.drawImage(tmp, 0, 0);
        const vw = v.videoWidth, vh = v.videoHeight;
        if (vw) { const s = Math.max(S / vw, S / vh), dw = vw * s, dh = vh * s; g.save(); g.translate(W, 0); g.scale(-1, 1); g.beginPath(); g.rect(0, 0, S, S); g.clip(); g.drawImage(v, (S - dw) / 2, (S - dh) / 2, dw, dh); g.restore(); }
        g.fillStyle = '#fff7e6'; g.font = '900 26px ui-sans-serif,Arial,sans-serif'; g.textBaseline = 'middle'; g.fillText('Reaction App', 24, S + 30);
        g.font = '600 20px ui-sans-serif,Arial,sans-serif'; g.fillStyle = '#cfc6e6'; g.textAlign = 'right'; g.fillText(clip.title + (tags.size ? ' | ' + [...tags].join(', ') : ''), W - 24, S + 30); g.textAlign = 'left';
      };
      const timer = setInterval(() => { if (!ended) draw(); }, 33);
      const end = () => { if (ended) return; ended = true; clearInterval(timer); draw(); setTimeout(() => { try { rec.stop(); } catch (e) {} v.pause(); inst.stop(); }, 200); };
      v.onended = end; setTimeout(end, (clip.dur + TAIL + 6) * 1000);
      rec.start(250); inst.start();
      const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(end); });
    }).then(b => { builtCard = b; building = null; return b; }, e => { building = null; throw e; });
    return building;
  }
  async function withCard(label, fn) {
    const msg = $('#cardMsg'), btns = $$('#cardBtns .btn'); btns.forEach(b => b.disabled = true);
    msg.textContent = 'Building your card. This takes about ' + Math.ceil(reaction.clip.dur + TAIL) + ' seconds.';
    try { const b = await buildCard(); document.documentElement.dataset.cardBytes = b.size; await fn(b); }
    catch (e) { msg.textContent = 'We could not build the combined card here. You can still download the reaction only.'; btns.forEach(b => b.disabled = false); return; }
    btns.forEach(b => b.disabled = false);
  }
  $('#btnDownload').addEventListener('click', () => withCard('download', b => { saveBlob(b, 'reaction-card.' + ext(b)); $('#cardMsg').textContent = 'Saved to your downloads. Nothing was uploaded.'; }));
  $('#btnDlRaw').addEventListener('click', () => { if (!reaction) return; saveBlob(reaction.blob, 'my-reaction.' + ext(reaction.blob)); $('#cardMsg').textContent = 'Saved to your downloads. Nothing was uploaded.'; });
  $('#btnShare').addEventListener('click', () => withCard('share', async b => {
    const f = new File([b], 'reaction-card.' + ext(b), { type: b.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: 'My reaction', text: 'My reaction, made with Reaction App' }); $('#cardMsg').textContent = 'Shared by your choice.'; }
      catch (e) { $('#cardMsg').textContent = e.name === 'AbortError' ? 'Share cancelled. Nothing was sent.' : 'Sharing did not work here. Use Download card.'; }
    } else $('#cardMsg').textContent = 'This browser cannot share video files. Use Download card.';
  }));

  /* ---------- record your own clip ---------- */
  let ownBusy = false, ownStream = null, ownR = null, ownTimer = 0;
  $('#btnOwn').addEventListener('click', () => { $('#ownErr').hidden = true; $('#ownStart').hidden = false; $('#ownStop').hidden = true; $('#ownVid').srcObject = null; show('own'); });
  $('#ownBack').addEventListener('click', () => { endOwn(true); show('home'); });
  function endOwn(discard) {
    clearInterval(ownTimer); ownBusy = false;
    if (discard && ownR) { try { ownR.rec.stop(); } catch (e) {} ownR = null; }
    stopStream(ownStream); ownStream = null; $('#ownVid').srcObject = null; $('#ownCount').textContent = '';
  }
  $('#ownStart').addEventListener('click', async () => {
    $('#ownErr').hidden = true;
    try { ownStream = await getCam({ ideal: 'environment' }, true); }
    catch (e) { const el = $('#ownErr'); el.textContent = camMessage(e); el.hidden = false; return; }
    const v = $('#ownVid'); v.srcObject = ownStream; v.play().catch(() => {});
    ownBusy = true; $('#nav').classList.add('hide'); $('#ownStart').hidden = true; $('#ownStop').hidden = false;
    ownR = recordStream(ownStream);
    const t0 = performance.now();
    ownTimer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      $('#ownCount').textContent = Math.max(0, Math.ceil(MAX_CLIP - t)) + '';
      if (t >= MAX_CLIP) $('#ownStop').click();
    }, 200);
    ownR.t0 = t0;
  });
  $('#ownStop').addEventListener('click', async () => {
    if (!ownR) return;
    const R = ownR, dur = Math.min(MAX_CLIP, Math.max(1, (performance.now() - R.t0) / 1000)); ownR = null;
    clearInterval(ownTimer); R.rec.stop(); const blob = await R.done; endOwn(false);
    $('#ownStart').hidden = false; $('#ownStop').hidden = true; $('#nav').classList.remove('hide');
    choose({ id: 'own', kind: 'video', title: 'Your own clip', note: 'Recorded here', dur, url: URL.createObjectURL(blob) });
  });

  /* ---------- install and service worker ---------- */
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#btnInstall').hidden = false; });
  $('#btnInstall').addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#btnInstall').hidden = true; });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) $('#iosHint').hidden = false;
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  window.RX = { show, choose, $, $$, openSheet };
  window.RX_chosen = () => chosen;
  show('home');
})();
