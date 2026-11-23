/* Library, Send, Community, Leaderboards, Thread. Community, Leaderboard and Thread are design previews: no users, no counts. */
(function () {
  'use strict';
  const { show, choose, $, $$ } = window.RX, CLIPS = window.REACTION_CLIPS;
  const NA = 'n/a';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  /* ---------- library ---------- */
  const TABS = ['All', 'Top rated', 'Favorites', 'Most reactions', 'Most laughed', 'Most disgusted', 'Most angry', 'Shocked', 'Touched'];
  let tab = 'All';
  const tabsEl = $('#libTabs');
  TABS.forEach(t => {
    const b = el('button', null, t); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', t === tab);
    b.addEventListener('click', () => { tab = t; $$('#libTabs button').forEach(x => x.setAttribute('aria-selected', x === b)); renderLib(); });
    tabsEl.appendChild(b);
  });
  function stat(label) { const s = el('span', 'stat'); s.append(label + ' '); s.appendChild(el('i', 'na', NA)); return s; }
  function renderLib() {
    const ul = $('#clipList'), favs = store.get('rx-fav'); ul.textContent = '';
    let items = CLIPS;
    const note = $('#libNote');
    if (tab === 'Favorites') { items = CLIPS.filter(c => favs.includes(c.id)); note.textContent = items.length ? 'Your saved clips, kept on this device.' : 'No favorites yet. Open a clip and tap Save to favorites.'; }
    else if (tab === 'All') note.textContent = '';
    else note.textContent = tab + ' needs real reaction data from many people, so it is not ranked yet. Clips are shown in their normal order.';
    items.forEach(clip => {
      const li = el('li');
      const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Choose ' + clip.title);
      const cv = el('canvas'); cv.width = cv.height = 360; clip.draw(cv.getContext('2d'), clip.thumbT, 360);
      b.append(cv, el('b', null, clip.title), el('span', null, clip.note + ', ' + clip.dur + ' s'));
      const st = el('div', 'stats'); st.append(stat('Thumbs up'), stat('Reactions')); b.appendChild(st);
      b.addEventListener('click', () => open(clip)); li.appendChild(b);
      if (favs.includes(clip.id)) li.appendChild(el('span', 'favmark', 'Saved'));
      ul.appendChild(li);
    });
    // placeholders to show how a large library will feel
    if (tab === 'All') for (let i = 0; i < 4; i++) { const li = el('li'); const d = el('div', 'ph'); d.append(el('div', 'phsq'), el('b', null, 'Example clip'), el('span', null, 'Real clips will fill this space')); li.appendChild(d); ul.appendChild(li); }
  }
  function open(clip) { choose(clip); }
  document.addEventListener('rxscreen', e => { if (e.detail === 'ready') syncFlags(); });
  function syncFlags() {
    const c = window.RX_chosen(); if (!c) return;
    const liked = store.get('rx-like').includes(c.id), fav = store.get('rx-fav').includes(c.id);
    $('#btnLike').setAttribute('aria-pressed', liked); $('#btnLike').textContent = liked ? 'Thumbs up saved' : 'Thumbs up';
    $('#btnFav').setAttribute('aria-pressed', fav); $('#btnFav').textContent = fav ? 'In favorites' : 'Save to favorites';
  }
  function toggle(key, btnId) {
    const c = window.RX_chosen(); if (!c) return; if (c.kind === 'video') { $('#fileMsg').textContent = ''; return; }
    const a = store.get(key), i = a.indexOf(c.id); i < 0 ? a.push(c.id) : a.splice(i, 1); store.set(key, a); syncFlags(); renderLib();
  }
  $('#btnLike').addEventListener('click', () => toggle('rx-like'));
  $('#btnFav').addEventListener('click', () => toggle('rx-fav'));
  renderLib();

  /* ---------- send ---------- */
  const recips = [];
  function renderRecips() {
    const ul = $('#recips'); ul.textContent = '';
    recips.forEach((r, i) => {
      const li = el('li'); li.appendChild(el('span', null, r));
      const x = el('button', null, 'Remove'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + r); x.addEventListener('click', () => { recips.splice(i, 1); renderRecips(); });
      li.appendChild(x); ul.appendChild(li);
    });
    $('#recipEmpty').hidden = recips.length > 0;
  }
  function addRecip(v) { v = (v || '').trim().slice(0, 80); if (v && !recips.includes(v)) { recips.push(v); renderRecips(); } }
  $$('#sendTabs button').forEach(b => b.addEventListener('click', () => {
    $$('#sendTabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    $$('.sp').forEach(p => p.hidden = p.dataset.p !== b.dataset.p);
  }));
  $('#recipAdd').addEventListener('click', () => { addRecip($('#recipIn').value); $('#recipIn').value = ''; $('#recipIn').focus(); });
  $('#recipIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#recipAdd').click(); } });
  const hasPicker = 'contacts' in navigator && 'ContactsManager' in window;
  if (!hasPicker) { $('#btnContacts').disabled = true; $('#contactsMsg').textContent = 'This browser has no contact picker. Use Name or number, or Share link.'; }
  $('#btnContacts').addEventListener('click', async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      picked.forEach(c => addRecip((c.name && c.name[0] || '') + (c.tel && c.tel[0] ? ' ' + c.tel[0] : '')));
      $('#contactsMsg').textContent = picked.length ? 'Added ' + picked.length + '. They stay on this screen only.' : 'No one picked.';
    } catch (e) { $('#contactsMsg').textContent = 'The contact picker did not open. Try Name or number.'; }
  });
  const LINK = location.origin + location.pathname.replace(/[^/]*$/, '');
  $('#btnShareLink').addEventListener('click', async () => {
    const m = $('#linkMsg');
    if (navigator.share) { try { await navigator.share({ title: 'Reaction App', text: 'Try Reaction App with me', url: LINK }); m.textContent = 'Shared by your choice.'; } catch (e) { m.textContent = 'Share cancelled. Nothing was sent.'; } }
    else m.textContent = 'This browser cannot open a share sheet. Use Copy link.';
  });
  $('#btnCopyLink').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(LINK); $('#linkMsg').textContent = 'Link copied.'; } catch (e) { $('#linkMsg').textContent = 'Copy did not work here. The link is ' + LINK; }
  });
  $('#btnSendGo').addEventListener('click', () => window.RX.openSheet());

  /* ---------- community (preview) ---------- */
  const FEELS = ['All feelings', 'Laughed', 'Shocked', 'Touched', 'Disgusted', 'Angry'];
  function chips(host, list, on, cb) {
    list.forEach(t => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-selected', t === on); b.addEventListener('click', () => { [...host.querySelectorAll('button')].forEach(x => x.setAttribute('aria-selected', x === b)); cb(t); }); host.appendChild(b); });
  }
  const wall = $('#wall'); let feelFilter = 'All feelings';
  function post(clip, i, forThread) {
    const li = el('li', 'post');
    const pair = el('div', 'pair');
    const l = el('div', 'pane'); const cv = el('canvas'); cv.width = cv.height = 360; clip.draw(cv.getContext('2d'), clip.thumbT, 360); l.append(cv, el('span', 'tag', 'Clip'));
    const r = el('div', 'pane ghostpane'); r.append(el('div', 'faceph'), el('span', 'tag', 'Reaction'), el('small', null, 'A public reaction plays here'));
    pair.append(l, r);
    const meta = el('div', 'pmeta'); meta.append(el('b', null, 'Example'), el('span', 'stat', 'watched '), el('span', 'stat', 'reactions '));
    meta.children[1].appendChild(el('i', 'na', NA)); meta.children[2].appendChild(el('i', 'na', NA));
    const tg = el('div', 'ptags'); [FEELS[1 + (i % 5)], FEELS[1 + ((i + 2) % 5)]].forEach(t => tg.appendChild(el('span', 'tg', t)));
    const act = el('div', 'pact');
    const up = el('button', 'btn small ghost', 'Thumbs up  '); up.type = 'button'; up.disabled = true; up.appendChild(el('i', 'na', NA));
    act.appendChild(up);
    if (!forThread) { const t = el('button', 'btn small primary', 'Open thread'); t.type = 'button'; t.addEventListener('click', () => openThread(clip, i)); act.appendChild(t); }
    li.append(pair, meta, tg, act); return li;
  }
  function renderWall() {
    wall.textContent = '';
    CLIPS.forEach((c, i) => wall.appendChild(post(c, i)));
    if (feelFilter !== 'All feelings') { const n = el('li', 'fine'); n.textContent = 'Filtering by ' + feelFilter + ' needs real tags from real people. Tags on these examples are placeholders.'; wall.prepend(n); }
  }
  chips($('#commTabs'), FEELS, feelFilter, t => { feelFilter = t; renderWall(); });
  renderWall();

  /* ---------- thread (preview) ---------- */
  function openThread(clip, i) {
    const root = $('#threadRoot'); root.textContent = ''; root.appendChild((() => { const u = el('ul'); u.appendChild(post(clip, i, true)); return u; })());
    const th = $('#thread'); th.textContent = '';
    const reply = (depth, label) => {
      const li = el('li', 'reply d' + depth), pn = el('div', 'rp'), d = el('div');
      const sub = el('span', 'fine', label + ', thumbs up '); sub.appendChild(el('i', 'na', NA));
      d.append(el('b', null, 'Example'), sub); pn.append(el('div', 'faceph sm'), d); li.appendChild(pn); return li;
    };
    const a = reply(0, 'Reaction to the clip'), b = reply(1, 'Reaction to the reaction'), c = reply(2, 'Reaction to that one'), d = reply(0, 'Another reaction to the clip');
    [a, b, c, d].forEach(x => th.appendChild(x));
    show('thread');
  }

  /* ---------- leaderboards (preview) ---------- */
  const BOARDS = ['Most watched reactions', 'Most reacted-to clips', 'Top laughed', 'Top shocked', 'Top touched', 'Top disgusted', 'Top angry'];
  let board = BOARDS[0];
  function renderLead() {
    const per = ($('input[name=per]:checked') || {}).value || 'this week';
    $('#leadTitle').textContent = board + ', ' + per;
    const ol = $('#rank'); ol.textContent = '';
    for (let i = 4; i <= 8; i++) { const li = el('li'); li.append(el('span', 'rk', String(i)), el('div', 'faceph sm'), el('b', null, 'Example'), el('i', 'na', NA)); ol.appendChild(li); }
  }
  chips($('#leadTabs'), BOARDS, board, t => { board = t; renderLead(); });
  $$('input[name=per]').forEach(i => i.addEventListener('change', renderLead));
  renderLead();
})();
