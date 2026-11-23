
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
if(!reduce&&fine){
  document.querySelectorAll('.dash .panel,.card,.role').forEach(el=>{
    el.classList.add('tilt');
    el.addEventListener('pointermove',e=>{
      const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
      el.style.transform='perspective(900px) rotateY('+(px*6).toFixed(2)+'deg) rotateX('+(-py*6).toFixed(2)+'deg) translateZ(0)';
    });
    el.addEventListener('pointerleave',()=>{el.style.transform=''});
  });
  const fl=[...document.querySelectorAll('.fl')];
  addEventListener('pointermove',e=>{
    const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;
    fl.forEach((f,i)=>{f.style.transform='translate3d('+(x*-30*(i+1)).toFixed(1)+'px,'+(y*-24*(i+1)).toFixed(1)+'px,0) rotate('+(x*(i%2?4:-4)).toFixed(2)+'deg)'});
  });
}
