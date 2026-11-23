
const c=document.createElement('canvas');c.className='rip';c.setAttribute('aria-hidden','true');document.body.appendChild(c);
const x=c.getContext('2d');let W=0,H=0,dpr=Math.min(devicePixelRatio||1,2);
function rs(){W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}rs();addEventListener('resize',rs);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce){
  const rings=[];let lx=-999,ly=-999;
  addEventListener('pointermove',e=>{
    const dx=e.clientX-lx,dy=e.clientY-ly;
    if(Math.hypot(dx,dy)>34){lx=e.clientX;ly=e.clientY;rings.push({x:lx,y:ly,t:performance.now()})}
  });
  (function loop(now){
    x.clearRect(0,0,W,H);
    for(let i=rings.length-1;i>=0;i--){
      const g=rings[i],a=Math.max(0,(now-g.t)/900);
      if(a>=1){rings.splice(i,1);continue}
      const e=1-Math.pow(1-a,3),al=(1-a)*(1-a);
      x.lineWidth=1.4;
      x.strokeStyle='rgba(170,176,255,'+(.28*al)+')';x.beginPath();x.arc(g.x,g.y,6+e*70,0,6.283);x.stroke();
      x.strokeStyle='rgba(200,205,255,'+(.16*al)+')';x.beginPath();x.arc(g.x,g.y,2+e*42,0,6.283);x.stroke();
    }
    requestAnimationFrame(loop);
  })(performance.now());
}
