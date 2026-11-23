
const pins=[...document.querySelectorAll('.pin')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(pins.length&&!reduce){
  const m={x:0,y:0},cur=pins.map(()=>({x:0,y:0}));let on=false;
  addEventListener('pointermove',e=>{m.x=e.clientX/innerWidth-.5;m.y=e.clientY/innerHeight-.5;on=true});
  (function loop(){
    pins.forEach((p,i)=>{
      const d=parseFloat(p.dataset.d)*1400,tx=m.x*d*(i%2?-1:1)*.9,ty=m.y*d*.9,c=cur[i];
      c.x+=(tx-c.x)*.07;c.y+=(ty-c.y)*.07;
      p.style.transform='translate3d('+c.x.toFixed(1)+'px,'+c.y.toFixed(1)+'px,0)';
    });
    requestAnimationFrame(loop);
  })();
}
