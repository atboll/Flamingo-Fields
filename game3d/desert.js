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
/* The door's light, as the 2D game draws it. Its bloom is laid in screen terms round the doorway: a tight white core, a wide soft haze
   that pales most of the box's face, and a low wide flare, none smaller than a beacon should be from far off, and thinner when the door is
   seen edge-on. Its light lies on the sand in a long fan widening outward from the threshold, brightest down its middle, gone at its sides.
   Anything standing in front of it (the kids, the flamingos) is left as a dark shape against it: they mark where they are drawn (stencil 2),
   and the light is not laid over those places. As the kids come up to the door, facing it, the light grows until it takes the whole view. */
function softTex(stops,w=128,h=128){ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'), gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.min(w,h)/2);
  for(const [o,col] of stops) gr.addColorStop(o,col); g.fillStyle=gr; g.fillRect(0,0,w,h); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
const NOT_FRONT={ stencilWrite:true, stencilRef:2, stencilFunc:THREE.NotEqualStencilFunc, stencilZPass:THREE.KeepStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp };
const bloomMat=map=>new THREE.SpriteMaterial({map, transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending, fog:false, ...NOT_FRONT});
const bloomCore=new THREE.Sprite(bloomMat(softTex([[0,'rgba(255,255,252,.85)'],[0.45,'rgba(255,253,240,.42)'],[1,'rgba(255,253,240,0)']])));
const bloomHaze=new THREE.Sprite(bloomMat(softTex([[0,'rgba(248,250,240,.26)'],[0.5,'rgba(244,248,238,.1)'],[1,'rgba(244,248,238,0)']])));
const bloomFlare=new THREE.Sprite(bloomMat(softTex([[0,'rgba(255,255,250,.3)'],[1,'rgba(255,255,250,0)']])));
for(const b of [bloomFlare,bloomHaze,bloomCore]){ b.position.set(0,DH*0.5,front-0.2); b.renderOrder=6; doorLight.add(b); }
/* the fan of light on the sand: thin bands outward from the door, each brightest down its middle and gone at its sides, each fainter than the last */
const FAN_N=44, FAN_W=17, fanGeo=new THREE.BufferGeometry(), fanPos=new Float32Array((FAN_N+1)*FAN_W*3), fanCol=new Float32Array((FAN_N+1)*FAN_W*3), fanIdx=[];
for(let i=0;i<FAN_N;i++) for(let k=0;k<FAN_W-1;k++){ const a=i*FAN_W+k, b=a+FAN_W; fanIdx.push(a,b,a+1, a+1,b,b+1); }
fanGeo.setAttribute('position',new THREE.BufferAttribute(fanPos,3)); fanGeo.setAttribute('color',new THREE.BufferAttribute(fanCol,3).setUsage(THREE.DynamicDrawUsage)); fanGeo.setIndex(fanIdx);
const fan=new THREE.Mesh(fanGeo,new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, polygonOffset:true, polygonOffsetFactor:-2, toneMapped:false}));
fan.frustumCulled=false; fan.renderOrder=5; doorLight.add(fan);
const FAN_LEN=2300*U, FAN_U=[];   /* each vertex's place along (t) and across (s) the fan */
for(let i=0;i<=FAN_N;i++) for(let k=0;k<FAN_W;k++) FAN_U.push([i/FAN_N,(k/(FAN_W-1))*2-1]);
function dropFan(near){ /* lay the fan over the sand's own shape; it reaches 40% farther as the kids come near */
  const m=new THREE.Matrix4().makeRotationY(-SUN_B), v=new THREE.Vector3(), len=FAN_LEN*(1+0.4*near);
  FAN_U.forEach(([t,s0],n)=>{ const hw=(DOOR_W*0.9+900*Math.pow(t,0.8))*U, x=s0*hw, z=front-0.05-len*t; v.set(x,0,z).applyMatrix4(m).add(doorLight.position);
    fanPos[n*3]=x; fanPos[n*3+1]=groundAt(v.x,v.z)-doorLight.position.y+0.06; fanPos[n*3+2]=z; });
  fanGeo.attributes.position.needsUpdate=true; fan.userData.near=near; }
function lightFan(A){ FAN_U.forEach(([t,s0],n)=>{ const f=Math.pow(0.5+0.5*Math.cos(Math.PI*Math.abs(s0)),1.6)*A*Math.pow(1-t,2.3); fanCol[n*3]=fanCol[n*3+1]=f; fanCol[n*3+2]=f*0.97; }); fanGeo.attributes.color.needsUpdate=true; }
/* the light taking the view: a full-screen wash round the door, over everything but what stands in front */
const washU={uC:{value:new THREE.Vector2()}, uR:{value:1}, uM:{value:0}, uSize:{value:new THREE.Vector2(1,1)}, uDpr:{value:1}};
const washScene=new THREE.Scene(); washScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:washU, transparent:true, depthTest:false, depthWrite:false, ...NOT_FRONT,
  vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform vec2 uC, uSize; uniform float uR, uM, uDpr;
    void main(){ vec2 p=vec2(gl_FragCoord.x, uSize.y*uDpr-gl_FragCoord.y)/uDpr; float t=length(p-uC)/uR;
      float a = t<0.5 ? mix(min(1.0,0.9*uM),0.5*uM*uM,t/0.5) : mix(0.5*uM*uM,0.0,clamp((t-0.5)/0.5,0.0,1.0));
      float fl=pow(clamp(uM/0.93,0.0,1.0),2.6);
      vec3 c=vec3(1.0,1.0,250.0/255.0); float A=a+fl*(1.0-a);
      gl_FragColor=vec4(c,A); }`})));
washScene.children[0].frustumCulled=false;
const washCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
/* what stands in front of the light marks itself (stencil 2): the kids and every flamingo */
const FRONT_MARK={ stencilWrite:true, stencilRef:2, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp };
function markFront(root){ root.traverse(n=>{ if(n.isMesh) for(const m of [].concat(n.material)) Object.assign(m,FRONT_MARK); }); }
let doorNear=0;
/* ---------- laying the journey's end ---------- */
let coastA=0;
const shore=[];
function makeCoast(gx,gz){
  COAST.on=true; COAST.x=gx; COAST.z=gz; uCoast.value.set(gx,gz,1,0); coastA=0;
  groundNear.userData.cx=groundFar.userData.cx=NaN;            /* the ground is laid again with its dunes */
  const c=boxC(), wx=-c[0]*U, wz=c[1]*U, base=groundAt(wx,wz)-30*U;
  for(const G of [boxGroup,doorLight]){ G.position.set(wx,base,wz); G.rotation.set(0,-SUN_B,0); G.visible=true; }
  dropFan(0);
  /* the flamingos already there, round the box */
  shore.length=0;
  for(let i=0;i<26;i++){ const lat=(h2(i,201)-0.5)*5600, cs=h2(i,205)<0.25?SHORE+8+h2(i,207)*24:SHORE-40-Math.pow(h2(i,203),2)*850, p=shorePos(lat,cs), a=h2(i,209)*6.283;
    shore.push(shoreBird(p[0],p[1],Math.sin(a),Math.cos(a),lat,cs,100+i)); }
  makeShoreBirds();
}
function clearCoast(){ COAST.on=false; uCoast.value.set(0,0,0,0); boxGroup.visible=doorLight.visible=false; shore.length=0; for(const b of SB) b.o.visible=false; groundNear.userData.cx=groundFar.userData.cx=NaN; }
/* the "To the box" button, for testing: the kids on the ground about 45 m in front of the door, facing it (the box is laid first if it is not there yet) */
function goToBox(){
  if(!girl) return;
  if(!COAST.on){ const P=girl.P, gx=-P.x/U, gz=P.z/U, d=8000-SHORE; makeCoast(gx+SUNDX_G*d, gz+SUNDZ_G*d); }
  coastA=1; const c=boxC(), d=BOX_HALF+3100, gx=c[0]-SUNDX_G*d, gz=c[1]-SUNDZ_G*d;
  [[girl,0,0],[boy,1.0,-1.3]].forEach(([K,ox,oz])=>Object.assign(K.P,{x:-gx*U+ox, z:gz*U+oz, y:0, vy:0, h:-SUN_B, turn:0, bank:0, pitch:0, spd:0, state:'ground'}));
  events.length=0; placeCam(girl,0,true);
}
/* the B key, for testing: the box about 120 m ahead, the kids already out on the sand */
addEventListener('keydown',e=>{ if((e.key!=='b'&&e.key!=='B')||!girl) return; const P=girl.P, gx=-P.x/U, gz=P.z/U, d=8000-SHORE; makeCoast(gx+SUNDX_G*d, gz+SUNDZ_G*d); coastA=1;
  P.h=-SUN_B; boy.P.h=-SUN_B; placeCam(girl,0,true); });

/* ---------- each frame ---------- */
const _dsp=new THREE.Vector3();
let arrived=false, marked=false;
/* one of your flock leaves you for the box: it comes down if it is flying, and from then on wanders, feeds and rests with the others */
function mateToShore(m){ const c=boxC(), dx=m.x-c[0], dz=m.z-c[1], al=dx*SUNDX_G+dz*SUNDZ_G, l=dx*SUNDZ_G-dz*SUNDX_G, th=Math.atan2(l,-al);
  Object.assign(m,{shore:true, homeLat:th*BOX_RING+(h2(m.id,41)-0.5)*600, homeCs:SHORE-40-Math.pow(h2(m.id,43),2)*850, wait:0, feed:0, eats:false, n:0, pace:30, rest:0, rests:h2(m.id,13)<0.7});
  const p=shorePos(m.homeLat,m.homeCs); m.tx=p[0]; m.tz=p[1]; }
function updateDesert(dt,time){
  if(!marked && FL.ready && girl){ marked=true; markFront(girl.root); markFront(boy.root); markFront(FL.birds[0].o); }
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
  /* the door: white, pulsing gently */
  const A=clamp(coastA*1.5,0,1)*(0.9+0.1*Math.sin(time*1.3));
  doorPane.material.color.setScalar(0.9+0.1*Math.sin(time*1.3));
  /* how near the kids stand in front of the door, and facing it: 0 far off, 1 right at it (the 2D game's rule) */
  { const P=girl.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=dx*SUNDZ_G-dz*SUNDX_G, v=dx*SUNDX_G+dz*SUNDZ_G, lat=Math.max(0,Math.abs(u)-DOOR_W*0.3)*1.7; let tg=0;
    if(v<-BOX_HALF && P.y/U<DOOR_H*1.6){ cam.getWorldDirection(_dsp); const fx=-_dsp.x, fz=_dsp.z, fm=Math.hypot(fx,fz)||1, facing=clamp(((fx*SUNDX_G+fz*SUNDZ_G)/fm-0.15)/0.6,0,1);
      tg=clamp(1-(Math.hypot(-v-BOX_HALF,lat)-95)/1700,0,1)*facing; }
    doorNear+=(tg-doorNear)*(1-Math.exp(-dt*6)); if(doorNear<0.002&&tg===0) doorNear=0; }
  const near=doorNear;
  /* seen edge-on the light thins; from behind the box there is none */
  const dw=doorLight.localToWorld(_dsp.set(0,DH*0.5,front)), toCam=cam.position.clone().sub(dw), nrm=new THREE.Vector3(Math.sin(SUN_B),0,-Math.cos(SUN_B)), cv=toCam.dot(nrm), dist=toCam.length(), edge=cv>0?clamp(cv/dist*3,0.25,1):0;
  const focal=0.5*innerHeight/Math.tan(cam.fov*Math.PI/360), pxPerM=focal/Math.max(1,dist), dh=DH*pxPerM;
  const R1=Math.max(10,dh*0.95)*(1+1.2*near), R2=Math.max(34,dh*3.4)*(1+1.2*near), toM=1/pxPerM;
  bloomCore.scale.set(R1*2*toM,R1*2*toM,1); bloomHaze.scale.set(R2*2*toM,R2*2*toM,1); bloomFlare.scale.set(R2*3*toM,R2*3*0.16*toM,1);
  for(const b of [bloomCore,bloomHaze,bloomFlare]){ b.material.opacity=A*edge; b.visible=edge>0; }
  if(Math.abs((fan.userData.near??-1)-near)>0.02) dropFan(near);
  lightFan(0.3*A*edge*edge*(1+1.6*near)*2);   /* the 2D game's bands each lap half over the next, so twice its strength */
  /* the light taking the view */
  { const sp=dw.clone().project(cam), W=innerWidth, H=innerHeight; washU.uC.value.set((sp.x+1)/2*W,(1-sp.y)/2*H); washU.uR.value=Math.max(W,H)*(0.25+1.1*near); washU.uM.value=near*A; washU.uSize.value.set(W,H); washU.uDpr.value=R.getPixelRatio(); }
  /* your flock, come this close, wanders off to join the flamingos of the box */
  if(near>0.3 && !arrived){ arrived=true; for(const m of mates) mateToShore(m); }
  /* the box takes the colour of the hour: a cooler, dimmer mirror by night */
  silver.envMapIntensity=0.55-0.25*night; boxNight.value=night;
  updateShore(dt); placeShore(dt);
}

/* ---------- the flamingos round the box: the 2D game's shore birds ---------- */
function shorePos(lat,cs){ const c=boxC(), th=lat/BOX_RING, r=BOX_HALF*1.42+220+clamp(SHORE+40-cs,0,1100), al=-Math.cos(th)*r, l=Math.sin(th)*r;
  return [c[0]+SUNDX_G*al+SUNDZ_G*l, c[1]+SUNDZ_G*al-SUNDX_G*l]; }
function shoreBird(x,z,hx,hz,homeLat,homeCs,id){ return {x,z,hx,hz,id,sp:0,homeLat,homeCs,tx:x,tz:z,wait:h2(id,7)*7,feed:0,eats:h2(id,11)<0.5,n:0,pace:30,rest:0,rests:h2(id,13)<0.7}; }
function updateShore(dt){ for(const b of shore) stepShore(b,dt); }
function stepShore(b,dt){
    const dx=b.tx-b.x, dz=b.tz-b.z, d=Math.hypot(dx,dz);
    if(d>6 && b.rest>0.03){ b.rest=Math.max(0,b.rest-dt*1.5); b.sp=0; }   // the tucked leg comes down before it walks on
    else if(d>6){ const v=b.pace, e=Math.min(1,dt*4); b.x+=dx/d*v*dt; b.z+=dz/d*v*dt; b.hx+=(dx/d-b.hx)*e; b.hz+=(dz/d-b.hz)*e; { const m=Math.hypot(b.hx,b.hz)||1; b.hx/=m; b.hz/=m; }
      b.sp=v; b.feed=Math.max(0,b.feed-dt*1.6); }
    else { b.sp=0; b.pace=30; b.wait-=dt; b.feed=clamp(b.feed+(b.eats?dt:-dt)*0.9,0,1); b.rest=clamp(b.rest+((b.rests&&!b.eats&&b.feed<0.05)?dt:-dt)*0.7,0,1);
      if(b.wait<=0){ const n=++b.n, p=shorePos(b.homeLat+(h2(b.id,n*3+1)-0.5)*700, clamp(b.homeCs+(h2(b.id+9,n*5+2)-0.5)*420,SHORE-950,SHORE+32)); b.tx=p[0]; b.tz=p[1]; b.wait=4+h2(b.id+3,n)*9; b.eats=h2(b.id+5,n)<0.5; b.rests=h2(b.id+7,n)<0.7; } }
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
