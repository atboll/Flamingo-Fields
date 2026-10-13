/* Flamingo Fields 3D: the journey's end, on the 2D game's rules: the desert, the silver box with its glowing door, and the flamingos round it.

   The first time the kids fly along the feather road toward the moon, a coast point is laid far ahead along it (52000 game units, about 760 m).
   Half way there the field turns to desert (the dunes themselves are in index.html's groundAt, shared with the grass and the ground's paint).
   6250 units past the coast point stands the huge silver box, about 29 m on a side, square to the moon, with a tall narrow door in the face
   the kids come to. Its doorway is full of white light that pours out over the face, into the air and across the sand, pulsing gently.
   Nobody passes through the box. By the box the night waits. Round it, 26 flamingos are already there: standing, feeding,
   resting on one leg, and wandering slowly round on their own small errands.
   For testing, the B key lays the journey's end just ahead of the kids. */

const COAST_DIST=52000, BOX_RING=2800/Math.PI, DOOR_W=255, DOOR_H=545;
function boxC(){ return [COAST.x+SUNDX_G*SHORE, COAST.z+SUNDZ_G*SHORE]; }
function boxDist(gx,gz){ const c=boxC(); return Math.hypot(gx-c[0],gz-c[1]); }
const boxGroup=new THREE.Group(); boxGroup.visible=false; scene.add(boxGroup);
const doorLight=new THREE.Group(); doorLight.visible=false; lightScene.add(doorLight);   /* the door's light is drawn after the night grade: it gives light */

/* ---------- the box: brushed silver that mirrors the sky's colours, golden by evening, moonlit blue by night ---------- */
const boxEnv=(()=>{ const c=document.createElement('canvas'); c.width=256; c.height=128; const g=c.getContext('2d'), gr=g.createLinearGradient(0,0,0,128);
  gr.addColorStop(0,'#2a8a88'); gr.addColorStop(0.3,'#4fa999'); gr.addColorStop(0.45,'#93c79e'); gr.addColorStop(0.5,'#f0d898'); gr.addColorStop(0.53,'#e2b456'); gr.addColorStop(1,'#a87a2c');
  g.fillStyle=gr; g.fillRect(0,0,256,128);
  const sx=256*(0.75-SUN_B/(2*Math.PI)), sun=g.createRadialGradient(sx,64,0,sx,64,60); sun.addColorStop(0,'rgba(255,240,180,.95)'); sun.addColorStop(1,'rgba(255,200,110,0)'); g.fillStyle=sun; g.fillRect(0,0,256,128);
  const t=new THREE.CanvasTexture(c); t.mapping=THREE.EquirectangularReflectionMapping; t.encoding=THREE.sRGBEncoding;
  const pm=new THREE.PMREMGenerator(R), rt=pm.fromEquirectangular(t); pm.dispose(); return rt.texture; })();
const brushed=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.fillStyle='#d8d8d8'; g.fillRect(0,0,256,256); const r=rng(77);
  for(let i=0;i<900;i++){ const y=r()*256, l=20+r()*120, x=r()*256, v=200+r()*55|0; g.strokeStyle=`rgba(${v},${v},${v},${0.25+r()*0.35})`; g.lineWidth=0.6+r(); g.beginPath(); g.moveTo(x,y); g.lineTo(x+l,y+(r()-0.5)*1.5); g.stroke(); }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,3); t.anisotropy=8; return t; })();
const silver=new THREE.MeshStandardMaterial({color:0x6f757e, metalness:0.62, roughness:0.4, roughnessMap:brushed, map:brushed, envMap:boxEnv, envMapIntensity:1.0});
const BW=BOX_HALF*2*U, BH=BOX_H*U;
/* so the cube reads as a solid: each face its own tone, and its foot is a little darker where it meets the sand.
   It takes the groves' gentler haze, so from far off it fades into the evening without washing out up close. */
silver.defines={SOFT_HAZE:''}; const boxNight={value:0};
silver.onBeforeCompile=sh=>{ sh.uniforms.uNight=boxNight;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vObj; varying vec3 vNo;').replace('#include <begin_vertex>','#include <begin_vertex>\nvObj=position; vNo=normal;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vObj; varying vec3 vNo; uniform float uNight;')
    .replace('#include <output_fragment>',`
      { vec3 hb=vec3(${(BW/2).toFixed(3)},${(BH/2).toFixed(3)},${(BW/2).toFixed(3)}), q=hb-abs(vObj);
        float e=q.x<0.02 ? min(q.y,q.z) : q.y<0.02 ? min(q.x,q.z) : min(q.x,q.y);          /* distance to the nearest edge of this face */
        float rim=1.0-smoothstep(0.05,0.45,e), foot=smoothstep(0.0,5.0,vObj.y+hb.y);
        /* each face its own tone, as a painter would give a cube: the face toward the sun and moon lightest, the top light, one side mid, the other darker, the door's face in shadow */
        float face = vNo.z>0.5 ? 1.2 : vNo.y>0.5 ? 1.1 : vNo.x>0.5 ? 0.86 : vNo.x<-0.5 ? 1.0 : 0.6;
        outgoingLight*=face*(0.72+0.28*foot); }
      #include <output_fragment>`); };
const boxMesh=new THREE.Mesh(new THREE.BoxGeometry(BW,BH,BW),silver); boxMesh.position.y=BH/2; boxGroup.add(boxMesh);
/* the door, on the face toward the kids: a clean opening, no frame, full of white light that pours out of the box */
const DW=DOOR_W*U, DH=DOOR_H*U, FR=0.18, FD=0.35, front=-BW/2;   /* the box's local -z face looks back down the road */
const doorPane=new THREE.Mesh(new THREE.PlaneGeometry(DW,DH),new THREE.MeshBasicMaterial({color:0xffffff, toneMapped:false, fog:false}));
doorPane.rotation.y=Math.PI; doorPane.position.set(0,DH/2,front-0.03); doorLight.add(doorPane);
/* a soft halo round the doorway, and its light lying on the sand in front */
function softTex(stops,w=128,h=128){ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'), gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.min(w,h)/2);
  for(const [o,col] of stops) gr.addColorStop(o,col); g.fillStyle=gr; g.fillRect(0,0,w,h); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
/* the glow pouring out: a bright white bloom over the face round the doorway, and a wider soft one, both fading with no edge */
const doorHalo=new THREE.Mesh(new THREE.PlaneGeometry(DW*4,DH*1.9),new THREE.MeshBasicMaterial({map:softTex([[0,'rgba(255,255,255,.95)'],[0.28,'rgba(255,255,255,.6)'],[0.55,'rgba(255,255,255,.22)'],[0.8,'rgba(255,255,255,.06)'],[1,'rgba(255,255,255,0)']]),
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false}));
doorHalo.rotation.y=Math.PI; doorHalo.position.set(0,DH*0.48,front-0.08); doorLight.add(doorHalo);
const doorBloom=new THREE.Mesh(new THREE.PlaneGeometry(DW*12,DH*3.4),new THREE.MeshBasicMaterial({map:softTex([[0,'rgba(255,255,255,.4)'],[0.3,'rgba(255,255,255,.16)'],[0.6,'rgba(255,255,255,.05)'],[1,'rgba(255,255,255,0)']]),
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false}));
doorBloom.rotation.y=Math.PI; doorBloom.position.set(0,DH*0.45,front-0.12); doorLight.add(doorBloom);
/* light in the air in front of the doorway: two crossed sheets standing out from it, brightest at the threshold, fading as they reach out */
const beamTex=(()=>{ const c=document.createElement('canvas'); c.width=128; c.height=64; const g=c.getContext('2d'), gr=g.createLinearGradient(0,0,128,0);
  gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(0.3,'rgba(255,255,255,.2)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,128,64);
  g.globalCompositeOperation='destination-in'; const v=g.createLinearGradient(0,0,0,64); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(0.25,'rgba(0,0,0,1)'); v.addColorStop(1,'rgba(0,0,0,1)'); g.fillStyle=v; g.fillRect(0,0,128,64);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; })();
const BEAM_L=9, beams=[];
for(const [w,h,ry] of [[BEAM_L,DH,Math.PI/2],[BEAM_L,DW,Math.PI/2]]){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:beamTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, side:THREE.DoubleSide}));
  beams.push(m); doorLight.add(m); }
beams[0].rotation.y=Math.PI/2; beams[0].position.set(0,DH/2,front-BEAM_L/2);                                   /* standing upright, out from the door */
beams[1].rotation.set(-Math.PI/2,0,Math.PI/2); beams[1].position.set(0,DH*0.35,front-BEAM_L/2);                 /* and lying flat across it, a little above the sand */
/* and real light from the doorway on the kids, the birds and the sand in front */
const doorLamp=new THREE.PointLight(0xffffff,0,34,1.6); doorLamp.position.set(0,DH*0.5,front-2.5); boxGroup.add(doorLamp);
const SPILL_L=32, SPILL_W=16;
const spill=new THREE.Mesh(new THREE.PlaneGeometry(SPILL_W,SPILL_L,12,24),new THREE.MeshBasicMaterial({map:(()=>{ const c=document.createElement('canvas'); c.width=64; c.height=128; const g=c.getContext('2d');
    const gr=g.createRadialGradient(32,128,0,32,128,128); gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(0.15,'rgba(255,255,255,.55)'); gr.addColorStop(0.45,'rgba(255,255,255,.16)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,128);
    g.globalCompositeOperation='destination-in'; const sx=g.createLinearGradient(0,0,64,0); sx.addColorStop(0,'rgba(0,0,0,0)'); sx.addColorStop(0.3,'rgba(0,0,0,1)'); sx.addColorStop(0.7,'rgba(0,0,0,1)'); sx.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=sx; g.fillRect(0,0,64,128);   /* no edge at its sides */
    const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; })(), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, polygonOffset:true, polygonOffsetFactor:-2}));
spill.geometry.rotateX(-Math.PI/2); doorLight.add(spill);   /* draped over the sand each time the box is laid (dropSpill) */

/* ---------- laying the journey's end ---------- */
let coastA=0;
const shore=[];
function makeCoast(gx,gz){
  COAST.on=true; COAST.x=gx; COAST.z=gz; uCoast.value.set(gx,gz,1,0); coastA=0;
  groundNear.userData.cx=groundFar.userData.cx=NaN;            /* the ground is laid again with its dunes */
  const c=boxC(), wx=-c[0]*U, wz=c[1]*U, base=groundAt(wx,wz)-30*U;
  for(const G of [boxGroup,doorLight]){ G.position.set(wx,base,wz); G.rotation.set(0,-SUN_B,0); G.visible=true; }
  dropSpill();
  /* the flamingos already there, round the box */
  shore.length=0;
  for(let i=0;i<26;i++){ const lat=(h2(i,201)-0.5)*5600, cs=h2(i,205)<0.25?SHORE+8+h2(i,207)*24:SHORE-40-Math.pow(h2(i,203),2)*850, p=shorePos(lat,cs), a=h2(i,209)*6.283;
    shore.push(shoreBird(p[0],p[1],Math.sin(a),Math.cos(a),lat,cs,100+i)); }
  makeShoreBirds();
}
function dropSpill(){ /* the door's light follows the sand's own shape in front of the door */
  const P=spill.geometry.attributes.position, m=new THREE.Matrix4().makeRotationY(-SUN_B), v=new THREE.Vector3();
  if(!spill.userData.base){ spill.userData.base=Float32Array.from(P.array); }
  const B=spill.userData.base;
  for(let i=0;i<P.count;i++){ const x=B[i*3], z=B[i*3+2]-SPILL_L/2+front+0.05; v.set(x,0,z).applyMatrix4(m).add(boxGroup.position);
    P.setXYZ(i,x,groundAt(v.x,v.z)-boxGroup.position.y+0.06,z); }
  P.needsUpdate=true; spill.geometry.computeBoundingSphere(); }
function clearCoast(){ COAST.on=false; uCoast.value.set(0,0,0,0); boxGroup.visible=doorLight.visible=false; shore.length=0; for(const b of SB) b.o.visible=false; groundNear.userData.cx=groundFar.userData.cx=NaN; }
/* the B key, for testing: the box about 120 m ahead, the kids already out on the sand */
addEventListener('keydown',e=>{ if((e.key!=='b'&&e.key!=='B')||!girl) return; const P=girl.P, gx=-P.x/U, gz=P.z/U, d=8000-SHORE; makeCoast(gx+SUNDX_G*d, gz+SUNDZ_G*d); coastA=1;
  P.h=-SUN_B; boy.P.h=-SUN_B; placeCam(girl,0,true); });

/* ---------- each frame ---------- */
function updateDesert(dt,time){
  /* the first flight along the road toward the moon lays the journey's end far ahead */
  if(!COAST.on && pathOn && girl.P.state==='fly'){ const P=girl.P, gx=-P.x/U, gz=P.z/U; makeCoast(gx+SUNDX_G*COAST_DIST, gz+SUNDZ_G*COAST_DIST); }
  if(!COAST.on) return;
  coastA=Math.min(1,coastA+dt/8);
  const c=boxC(), top=groundAt(-c[0]*U,c[1]*U)/U-30+BOX_H;
  /* nobody passes through the box, and the kids keep a step clear of it */
  for(const K of [girl,boy]){ const P=K.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=dx*SUNDZ_G-dz*SUNDX_G, v=dx*SUNDX_G+dz*SUNDZ_G, Rr=BOX_HALF+80;
    if(Math.abs(u)<Rr && Math.abs(v)<Rr && groundAt(P.x,P.z)/U+P.y/U<top-45){ const pu=Rr-Math.abs(u), pv=Rr-Math.abs(v); let du=0, dv=0; if(pu<pv) du=(u<0?-1:1)*pu; else dv=(v<0?-1:1)*pv;
      const nx=gx+SUNDZ_G*du+SUNDX_G*dv, nz=gz-SUNDX_G*du+SUNDZ_G*dv; P.x=-nx*U; P.z=nz*U; } }
  if(boxDist(-girl.P.x/U,girl.P.z/U)<9000 && night>0.5) dayOffset-=dt;   // by the box the night waits
  /* the door: white, pulsing gently, brighter against the night */
  const pulse=0.9+0.1*Math.sin(time*1.7);
  doorPane.material.color.setScalar(pulse); doorHalo.material.opacity=coastA*(0.75+0.25*night)*pulse; doorBloom.material.opacity=coastA*(0.55+0.45*night)*pulse; for(const b of beams) b.material.opacity=coastA*(0.45+0.55*night)*pulse; doorLamp.intensity=coastA*(1.2+1.3*night)*pulse; spill.material.opacity=coastA*(0.55+0.45*night)*pulse;
  /* the box takes the colour of the hour: a cooler, dimmer mirror by night */
  silver.envMapIntensity=0.55-0.25*night; boxNight.value=night;
  updateShore(dt); placeShore(dt);
}

/* ---------- the flamingos round the box: the 2D game's shore birds ---------- */
function shorePos(lat,cs){ const c=boxC(), th=lat/BOX_RING, r=BOX_HALF*1.42+220+clamp(SHORE+40-cs,0,1100), al=-Math.cos(th)*r, l=Math.sin(th)*r;
  return [c[0]+SUNDX_G*al+SUNDZ_G*l, c[1]+SUNDZ_G*al-SUNDX_G*l]; }
function shoreBird(x,z,hx,hz,homeLat,homeCs,id){ return {x,z,hx,hz,id,sp:0,homeLat,homeCs,tx:x,tz:z,wait:h2(id,7)*7,feed:0,eats:h2(id,11)<0.5,n:0,pace:30,rest:0,rests:h2(id,13)<0.7}; }
function updateShore(dt){
  for(const b of shore){
    const dx=b.tx-b.x, dz=b.tz-b.z, d=Math.hypot(dx,dz);
    if(d>6 && b.rest>0.03){ b.rest=Math.max(0,b.rest-dt*1.5); b.sp=0; }   // the tucked leg comes down before it walks on
    else if(d>6){ const v=b.pace, e=Math.min(1,dt*4); b.x+=dx/d*v*dt; b.z+=dz/d*v*dt; b.hx+=(dx/d-b.hx)*e; b.hz+=(dz/d-b.hz)*e; { const m=Math.hypot(b.hx,b.hz)||1; b.hx/=m; b.hz/=m; }
      b.sp=v; b.feed=Math.max(0,b.feed-dt*1.6); }
    else { b.sp=0; b.pace=30; b.wait-=dt; b.feed=clamp(b.feed+(b.eats?dt:-dt)*0.9,0,1); b.rest=clamp(b.rest+((b.rests&&!b.eats&&b.feed<0.05)?dt:-dt)*0.7,0,1);
      if(b.wait<=0){ const n=++b.n, p=shorePos(b.homeLat+(h2(b.id,n*3+1)-0.5)*700, clamp(b.homeCs+(h2(b.id+9,n*5+2)-0.5)*420,SHORE-950,SHORE+32)); b.tx=p[0]; b.tz=p[1]; b.wait=4+h2(b.id+3,n)*9; b.eats=h2(b.id+5,n)<0.5; b.rests=h2(b.id+7,n)<0.7; } }
  }
}
/* drawn with the FAB flamingo: walking when it moves, feeding with its head down, resting (preening on one spot), or standing */
const SB=[];
function makeShoreBirds(){
  if(!FL.ready||SB.length) return;
  const proto=FL.birds[0].o;
  for(let i=0;i<26;i++){ const o=THREE.SkeletonUtils.clone(proto); o.visible=false; scene.add(o); const mixer=new THREE.AnimationMixer(o), A={};
    for(const k of ['idle_A1','idle_B1','walk_A1','foraging_A1']){ A[k]=mixer.clipAction(FL.clips[k]); A[k].play(); A[k].setEffectiveWeight(0); A[k].time=h2(i,k.length*3)*FL.clips[k].duration; }
    SB.push({o,mixer,A,w:{idle_A1:1,idle_B1:0,walk_A1:0,foraging_A1:0},skip:0}); }
}
function placeShore(dt){
  if(!SB.length){ makeShoreBirds(); if(!SB.length) return; }
  const far=scene.fog.far*1.1;
  SB.forEach((b,i)=>{ const m=shore[i]; if(!m){ b.o.visible=false; return; }
    const x=-m.x*U, z=m.z*U; b.o.position.set(x,groundAt(x,z),z); const vis=b.o.position.distanceTo(cam.position)<far; b.o.visible=vis; if(!vis) return;
    b.o.rotation.set(0,Math.atan2(-m.hx,m.hz),0);
    const want={walk_A1:m.sp>0?1:0, foraging_A1:m.sp>0?0:m.feed, idle_B1:m.sp>0?0:m.rest*(1-m.feed), idle_A1:0}; want.idle_A1=Math.max(0,1-want.walk_A1-want.foraging_A1-want.idle_B1);
    const k=1-Math.exp(-dt*3); for(const n in b.w){ b.w[n]+=(want[n]-b.w[n])*k; b.A[n].setEffectiveWeight(b.w[n]); }
    b.A.walk_A1.timeScale=0.8;
    /* far off, they move a little less often: every other frame beyond 60 m */
    const dist=b.o.position.distanceTo(cam.position); b.skip+=dt; if(dist<60||(b.skip>0.06)){ b.mixer.update(b.skip); b.skip=0; } });
}
