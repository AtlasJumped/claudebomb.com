(function () {
  var els = document.querySelectorAll('.steps li,.cards li,.status>div,.road li,.ppc,.g');
  if (!('IntersectionObserver' in window)) return;
  els.forEach(function (e) { e.classList.add('reveal'); });
  var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .15 });
  els.forEach(function (e) { io.observe(e); });
})();
