/* "We just like the name" button: a 2-second comic-book explosion of claudebomb.com catchphrases.
   Any element with [data-boom] starts it. Honors prefers-reduced-motion. */
(function () {
  var d = document;
  var P = ['It’s the claudebomb.com!', 'POW!', 'They’re the claudebomb.com too!', 'WHAM!', 'Have you seen the claudebomb.com?', 'KA-BOOM!', 'Go to claudebomb.com!', 'ZAP!', 'claudebomb.com takes over the internet!', 'BAM!'];
  var LAST = 'claudebomb.com saves humanity!';
  var COL = ['#ff5a36', '#ffd23f', '#b8f0e6', '#d9ccff', '#ffc2b0', '#ffe9a8'];
  var css = '.boom{position:fixed;inset:0;z-index:2147483000;overflow:hidden;pointer-events:none;background:rgba(21,21,21,.18)}' +
    '.boom .b{position:absolute;display:grid;place-items:center;text-align:center;font:900 clamp(1.3rem,5vw,3.4rem)/1 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:-.03em;color:#151515;' +
    'padding:1.6em 1.4em;clip-path:polygon(50% 0,61% 22%,85% 8%,78% 33%,100% 40%,80% 55%,96% 78%,70% 72%,62% 100%,48% 78%,30% 98%,28% 72%,2% 80%,18% 56%,0 36%,24% 32%,14% 6%,40% 22%);' +
    'transform:translate(-50%,-50%) scale(.2) rotate(-12deg);animation:boomIn .32s cubic-bezier(.2,1.6,.4,1) forwards;max-width:min(30rem,90vw)}' +
    '.boom .b span{display:block;-webkit-text-stroke:1px #151515;text-shadow:3px 3px 0 #fff}' +
    '.boom .last{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:900 clamp(1.8rem,7vw,5rem)/1.05 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;color:#151515;background:#ffd23f;border:4px solid #151515;border-radius:24px;padding:.5em .7em;box-shadow:8px 8px 0 #151515;width:min(42rem,92vw);animation:boomLast 1.1s ease-out forwards}' +
    '@keyframes boomIn{to{transform:translate(-50%,-50%) scale(1) rotate(var(--r,0deg))}}' +
    '@keyframes boomLast{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.08)}}' +
    '@media (prefers-reduced-motion:reduce){.boom .b{animation:none;transform:translate(-50%,-50%)}.boom .last{animation:boomFade 1.6s linear forwards}}' +
    '@keyframes boomFade{0%,70%{opacity:1}100%{opacity:0}}';
  var st = d.createElement('style'); st.textContent = css; d.head.appendChild(st);
  var busy = 0;
  function run() {
    if (busy) return; busy = 1;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var o = d.createElement('div'); o.className = 'boom'; o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite');
    d.body.appendChild(o);
    function end() { if (o.parentNode) o.parentNode.removeChild(o); busy = 0; }
    function last() {
      o.innerHTML = ''; var l = d.createElement('div'); l.className = 'last'; l.textContent = LAST; o.appendChild(l);
      setTimeout(end, reduce ? 1700 : 1150);
    }
    if (reduce) { last(); return; }
    var i = 0, n = P.length, step = 2000 / (n + 1);
    var t = setInterval(function () {
      if (i >= n) { clearInterval(t); last(); return; }
      var b = d.createElement('div'); b.className = 'b';
      b.style.left = (12 + Math.random() * 76) + '%'; b.style.top = (14 + Math.random() * 72) + '%';
      b.style.background = COL[i % COL.length]; b.style.setProperty('--r', (Math.random() * 24 - 12).toFixed(1) + 'deg');
      var s = d.createElement('span'); s.textContent = P[i]; b.appendChild(s); o.appendChild(b); i++;
    }, step);
  }
  d.addEventListener('click', function (e) { var el = e.target.closest && e.target.closest('[data-boom]'); if (el) { e.preventDefault(); run(); } });
  window.CBBoom = run;
})();
