
const tour=document.getElementById('tour'),chase=document.getElementById('chase');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let timer=null,last=null,cx=innerWidth/2,cy=innerHeight/2,tx=cx,ty=cy,raf=0;
const slides=[...document.querySelectorAll('.slide')];let si=0;
function show(i){slides.forEach((s,j)=>s.classList.toggle('on',j===i))}
function loop(){cx+=(tx-cx)*.2;cy+=(ty-cy)*.2;chase.style.transform='translate3d('+cx+'px,'+cy+'px,0)';raf=requestAnimationFrame(loop)}
function open(){
  last=document.activeElement;tour.classList.add('open');chase.classList.add('on');tour.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  si=0;show(0);timer=setInterval(()=>{si=(si+1)%slides.length;show(si)},reduce?6000:3200);
  if(!reduce)loop();chase.focus({preventScroll:true});
}
function close(){
  tour.classList.remove('open');chase.classList.remove('on');tour.setAttribute('aria-hidden','true');document.body.style.overflow='';
  clearInterval(timer);cancelAnimationFrame(raf);if(last)last.focus();
}
if(tour&&chase){
  document.querySelectorAll('[data-open-tour]').forEach(b=>b.addEventListener('click',open));
  addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY});
  tour.addEventListener('click',close);chase.addEventListener('click',close);
  addEventListener('keydown',e=>{if(e.key==='Escape'&&tour.classList.contains('open'))close()});
}
