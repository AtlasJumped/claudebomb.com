
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
const host=document.getElementById('hero');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(host){
  const cv=document.createElement('canvas');cv.className='stage';cv.setAttribute('aria-hidden','true');host.prepend(cv);
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  r.setPixelRatio(Math.min(devicePixelRatio,2));
  const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,100);cam.position.z=16;
  sc.add(new THREE.HemisphereLight(0xffffff,0x111111,1.1));
  const dl=new THREE.DirectionalLight(0xffffff,2.2);dl.position.set(4,6,8);sc.add(dl);
  const N=innerWidth<700?60:120;
  const geo=new THREE.BoxGeometry(1,1,1);
  const mat=new THREE.MeshStandardMaterial({color:0xc4c4c4,roughness:.45,metalness:.1});
  const mesh=new THREE.InstancedMesh(geo,mat,N);sc.add(mesh);
  const B=[],dm=new THREE.Object3D();
  function seed(){
    const h=2*Math.tan(20*Math.PI/180)*cam.position.z,w=h*cam.aspect;
    B.length=0;
    for(let i=0;i<N;i++){
      const s=.22+Math.random()*.45;
      B.push({hx:(Math.random()-.5)*w*1.05,hy:(Math.random()-.5)*h*1.05,hz:(Math.random()-.5)*3,x:0,y:0,z:0,vx:0,vy:0,vz:0,rx:Math.random()*6,ry:Math.random()*6,rz:Math.random()*6,wx:0,wy:0,s:s});
      const b=B[i];b.x=b.hx;b.y=b.hy;b.z=b.hz;
    }
  }
  function size(){const w=host.clientWidth,h=host.clientHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();seed();draw()}
  const m={x:9999,y:9999};
  addEventListener('pointermove',e=>{const rc=host.getBoundingClientRect();const nx=(e.clientX-rc.left)/rc.width*2-1,ny=-((e.clientY-rc.top)/rc.height*2-1);const h=2*Math.tan(20*Math.PI/180)*cam.position.z,w=h*cam.aspect;m.x=nx*w/2;m.y=ny*h/2});
  const R=2.6;
  function draw(){
    for(let i=0;i<N;i++){const b=B[i];dm.position.set(b.x,b.y,b.z);dm.rotation.set(b.rx,b.ry,b.rz);dm.scale.setScalar(b.s);dm.updateMatrix();mesh.setMatrixAt(i,dm.matrix)}
    mesh.instanceMatrix.needsUpdate=true;r.render(sc,cam);
  }
  function step(){
    for(const b of B){
      const dx=b.x-m.x,dy=b.y-m.y,d=Math.hypot(dx,dy);
      if(d<R){const f=(1-d/R)*.12;b.vx+=dx/(d||1)*f;b.vy+=dy/(d||1)*f;b.vz+=f*.6;b.wx+=f*.5;b.wy+=f*.4}
      b.vx+=(b.hx-b.x)*.012;b.vy+=(b.hy-b.y)*.012;b.vz+=(b.hz-b.z)*.012;
      b.vx*=.9;b.vy*=.9;b.vz*=.9;b.wx*=.94;b.wy*=.94;
      b.x+=b.vx;b.y+=b.vy;b.z+=b.vz;b.rx+=b.wx+.0012;b.ry+=b.wy+.0016;
    }
    draw();
  }
  let vis=true;new IntersectionObserver(es=>{vis=es[0].isIntersecting}).observe(host);
  size();addEventListener('resize',size);
  if(!reduce){(function loop(){if(vis&&!document.hidden)step();requestAnimationFrame(loop)})()}
}
