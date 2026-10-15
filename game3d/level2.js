/* ---------- Level 2: through the door, onto a sea of cloud ----------
   As in the 2D game: stand in the doorway, in the white, for a moment, and you step through. The desert, the box and the field are gone;
   the kids stand on cloud just past where the door was, and the door stands alone behind them, a slim silver frame shining both ways.
   The white fades as they walk away from it. The night holds until they are down on the cloud and clear of the door, then dawn comes.
   Your flock, the flamingos of the box, the feathers, the feather road, the wild flocks and the clouds of the sky stay behind. No moon.
   The floor: the 2D game's level 2, candyfloss pinks, the land a tenth lower, nothing standing on the horizon. Its cloud lumps are found
   exactly as the 2D game finds them (one per cell of a grid that coarsens with distance, in bands that belong to the camera, so they swim,
   swell and pop as you move), and drawn as real 3D lumps in flat pinks with a paler crown poking out of each.
   The #dev-level2 address starts straight on the clouds, for testing (dev.js). Reset level brings back level 1.
   Each frame the loop (game.js) calls updateDoor on level 1, updateClouds and updateLift on level 2, and level2Frame before drawing. */
(function(){
let inT=0, whiteIn=0, whiteHold=0, landed2=false, boxY=0, enteredAt=-1, sign2=false, sign1=DEV.mode!=='level2';
/* the level sign, as the 2D game shows it: LEVEL 1 when the game opens, LEVEL 2 ten seconds after stepping onto the clouds */
function showLevelSign(text){ const el=$('levelSign'); if(!el) return; const q=clamp(Math.min(innerWidth/1100,innerHeight/560),0.55,1.2);
  el.textContent=text; el.style.fontSize=Math.round(72*q)+'px'; el.style.letterSpacing=Math.round(14*q)+'px';
  /* wait for the font (at most 2.5 s), so the sign never starts while its letters are still invisible */
  let go=false; const start=()=>{ if(go) return; go=true; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); };
  try{ document.fonts.load('600 72px "Klee One"').then(start,start); }catch(e){ start(); } setTimeout(start,2500); }

/* the 2D game's level 2 colours */
const GSTOPS2=[[0,[250,234,238]],[0.1,[246,212,226]],[0.45,[234,182,210]],[1,[208,152,198]]], HAZE2=[250,232,238], DEEP2=[196,140,190];
const BLADE2=[[214,160,202],[230,184,214],[242,204,226],[250,224,236],[255,244,248]];
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

/* the bare floor between the lumps: the 2D game's pink ground, pale at the horizon and deeper under the eye, lighter on slopes facing the light */
const st=GSTOPS2.map(s=>`vec4(${(s[1][0]/255).toFixed(4)},${(s[1][1]/255).toFixed(4)},${(s[1][2]/255).toFixed(4)},${s[0].toFixed(2)})`);
function floorMat(far){ return new THREE.ShaderMaterial({ uniforms:{uNearC, uCoast, uDuneA, uDuneB, uSunXZ:{value:SUNXZ}},
  vertexShader:`uniform vec2 uNearC; varying vec3 vW;
    void main(){ vec3 p=position; ${far?'{ vec2 q=abs(position.xz-uNearC); p.y-=0.3+6.0*(1.0-smoothstep(118.0,128.0,max(q.x,q.y))); }':''}
      vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec2 uSunXZ; varying vec3 vW;
    ${LIGHT_GLSL}
    vec3 gst(float v){ vec4 a=${st[0]}, b=${st[1]}, c=${st[2]}, d=${st[3]};
      if(v<b.w) return mix(a.rgb,b.rgb,v/b.w); if(v<c.w) return mix(b.rgb,c.rgb,(v-b.w)/(c.w-b.w)); return mix(c.rgb,d.rgb,(v-c.w)/(d.w-c.w)); }
    void main(){ float d=length(vW.xz-cameraPosition.xz), v=clamp((cameraPosition.y-vW.y)/max(d,1.0)*1.64,0.0,1.0);
      float k=clamp(1.0+litAt(vW.xz,uSunXZ)*0.9*1.8,0.72,1.25);
      gl_FragColor=vec4(min(gst(v)*k,vec3(1.0)),1.0); }`}); }
const cloudNear=floorMat(false), cloudFar=floorMat(true), fieldNear=groundNear.material, fieldFar=groundFar.material;

/* the cloud lumps: the 2D game's bands of distance, in its own units, and the lumps as 3D shapes */
const BANDS=[
  {a:95,  b:520, sp:13}, {a:520, b:1100,sp:26}, {a:1100,b:2000,sp:52}, {a:2000,b:3800,sp:104},
  {a:3800,b:7600,sp:208}, {a:7600,b:15200,sp:416}, {a:15200,b:30400,sp:832}, {a:30400,b:60800,sp:1664}];
const MAXL=16000, lumpMat=new THREE.MeshBasicMaterial({fog:false});
const lumps=new THREE.InstancedMesh(new THREE.SphereGeometry(1,9,5),lumpMat,MAXL), crowns=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,4),lumpMat,MAXL);
for(const m of [lumps,crowns]){ m.frustumCulled=false; m.count=0; m.visible=false; m.setColorAt(0,new THREE.Color()); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
const _c=new THREE.Color(), _f=new THREE.Vector3(), _r=new THREE.Vector3();
function slopeLit(wx,wz){ const e=0.6, gx=(groundAt(wx+e,wz)-groundAt(wx-e,wz))/(2*e), gz=(groundAt(wx,wz+e)-groundAt(wx,wz-e))/(2*e); return -(gx*SUNXZ.x+gz*SUNXZ.y); }
function placeLumps(time){
  cam.getWorldDirection(_f); const fl=Math.hypot(_f.x,_f.z)||1, fwdX=-_f.x/fl, fwdZ=_f.z/fl, rgtX=fwdZ, rgtZ=-fwdX;   // in the 2D game's units (its x runs the other way)
  _r.setFromMatrixColumn(cam.matrixWorld,0);                                                                         // the camera's right, in the world
  const camPx=-cam.position.x/U, camPz=cam.position.z/U, tanH=cam.aspect*Math.tan(cam.fov*Math.PI/360);
  const P=girl.P, hk=Math.pow(Math.max(1,(cam.position.y-groundAt(P.x,P.z))/(90*U)),0.75);
  const A=lumps.instanceMatrix.array, AC=crowns.instanceMatrix.array; let n=0;
  for(let bi=BANDS.length-1;bi>=0;bi--){
    const b=BANDS[bi], sp=b.sp, nbin=Math.ceil((b.b-b.a)/sp);
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(const d of [b.a,b.b]) for(const sg of [-1,1]){ const cx=sg*(d*tanH+sp*4), wx=camPx+rgtX*cx+fwdX*d, wz=camPz+rgtZ*cx+fwdZ*d;
      if(wx<x0)x0=wx; if(wx>x1)x1=wx; if(wz<z0)z0=wz; if(wz>z1)z1=wz; }
    const i0=Math.floor(x0/sp)-1, i1=Math.ceil(x1/sp)+1, j0=Math.floor(z0/sp)-1, j1=Math.ceil(z1/sp)+1;
    for(let j=j0;j<=j1&&n<MAXL;j++) for(let i=i0;i<=i1&&n<MAXL;i++){
      let rx=i*sp-camPx, rz=j*sp-camPz, dz=rx*fwdX+rz*fwdZ; if(dz<b.a-sp||dz>b.b+sp) continue;
      let cx=rx*rgtX+rz*rgtZ; if(Math.abs(cx)>dz*tanH+sp*4) continue;
      const r1=h2(i,j+bi*7919), r2=h2(i+31,j-bi*131), x=(i+(r1-0.5)*0.9)*sp, z=(j+(r2-0.5)*0.9)*sp;
      rx=x-camPx; rz=z-camPz; dz=rx*fwdX+rz*fwdZ; if(dz<b.a||dz>=b.b) continue;
      const wx=-x*U, wz=z*U, rr=h2(i*7,j*3+bi*977), cap=26+rr*12+Math.max(0,dz-500)*0.06, rw=Math.min(sp*(0.55+0.5*rr),cap)*(1+0.08*Math.sin(time*0.27+rr*17));
      const wy=groundAt(wx,wz), c=clamp(Math.floor(rr*2.4+slopeLit(wx,wz)*6+0.6),0,3), bob=Math.sin(time*0.35+rr*40);
      const bn=Math.min(nbin-1,Math.floor((dz-b.a)/sp)), bz=b.a+bn*sp+sp/2, hz=Math.pow(clamp((bz/hk-320)/9000,0,1),0.6)*0.96, near=clamp((330-bz)/220,0,1)*0.55;
      const rm=rw*U, cy=wy+rm*(0.15-0.12*bob), o=n*16;
      A[o]=rm*1.35; A[o+5]=rm*0.85; A[o+10]=rm*1.35; A[o+12]=wx; A[o+13]=cy; A[o+14]=wz; A[o+15]=1;
      const tx=cam.position.x-wx, tz=cam.position.z-wz, tl=Math.hypot(tx,tz)||1;   // the crown pokes out of the lump's near face, up and to the left, as the 2D game paints it
      AC[o]=rm*0.8; AC[o+5]=rm*0.5; AC[o+10]=rm*0.8; AC[o+12]=wx+tx/tl*rm*0.75-_r.x*rm*0.3; AC[o+13]=cy+rm*0.32; AC[o+14]=wz+tz/tl*rm*0.75-_r.z*rm*0.3; AC[o+15]=1;
      for(const [m,k] of [[lumps,c],[crowns,c+1]]){ const col=near>0?mixc(BLADE2[k],DEEP2,near):mixc(BLADE2[k],HAZE2,hz); m.setColorAt(n,_c.setRGB(col[0]/255,col[1]/255,col[2]/255).convertSRGBToLinear()); }
      n++; }
  }
  lumps.count=crowns.count=n;
  for(const m of [lumps,crowns]){ m.instanceMatrix.needsUpdate=true; m.instanceColor.needsUpdate=true; }
}

/* the door on the clouds: a slim silver frame (posts and lintel 9.2 units, 30 deep, as the 2D game), the light filling it, both ways */
const P2=9.2*U, D2=30*U, col=h=>new THREE.MeshBasicMaterial({color:new THREE.Color(h).convertSRGBToLinear()});
const faceM=col('#cdd3dc'), sideM=col('#a9b0bd'), topM=col('#e8ecf2'), frameMats=[sideM,sideM,topM,sideM,faceM,faceM];
const frame=new THREE.Group(); frame.visible=false; boxGroup.add(frame);
for(const s of [-1,1]){ const m=new THREE.Mesh(new THREE.BoxGeometry(P2,DH+P2,D2),frameMats); m.position.set(s*(DW/2+P2/2),(DH+P2)/2,front); frame.add(m); }
{ const m=new THREE.Mesh(new THREE.BoxGeometry(DW+2*P2,P2,D2),frameMats); m.position.set(0,DH+P2/2,front); frame.add(m); }

/* ---------- going through, and coming back (Reset level) ---------- */
function setLevelLook(on){
  for(const g of grassAll) g.visible=!on;
  for(const m of treelines) m.visible=!on;
  for(const m of rangeMeshes) m.visible=!on;
  clouds.visible=nightClouds.visible=!on;
  groundNear.material=on?cloudNear:fieldNear; groundFar.material=on?cloudFar:fieldFar; groundNear.userData.cx=groundFar.userData.cx=NaN;
  const hz=on?HAZE2:HAZE; mistBand.material.uniforms.uC.value.set(hz[0]/255,hz[1]/255,hz[2]/255); scene.fog.color.setRGB(hz[0]/255,hz[1]/255,hz[2]/255).convertSRGBToLinear();
  lumps.visible=crowns.visible=on; if(!on) lumps.count=crowns.count=0;
  boxMesh.visible=boxShadow.visible=!on; frame.visible=on; doorGlow.visible=!on; fan.visible=!on;
  doorPane.visible=on;   // on the clouds the lone door is filled with light
  doorPane.material.side=on?THREE.DoubleSide:THREE.FrontSide; doorPane.position.z=on?front:front+DOOR.tunnel-0.3; tunnel.visible=false;
  if(on){ shore.length=0; for(const b of SB) b.o.visible=false; for(const q of POOL){ q.card.visible=q.glow.visible=q.nglow.visible=false; } if(POOL.halo) POOL.halo.visible=POOL.rays.visible=false; }
  const p1=$('plus1'); if(p1) p1.disabled=on||mates.length>=MATES_MAX;   // the 2D game's test buttons do nothing on the clouds
}
function enterLevel2(walking){
  if(!girl||!COAST.on) return;
  LEVEL=2; inT=0; whiteIn=0; whiteHold=1; kidWhite[0].uA.value=kidWhite[1].uA.value=0; allWhite.uA.value=1; /* the kids' colours come back as the white clears */ landed2=true; enteredAt=clock; sign2=false; nightOn=true; dayOffset=EVENING+DUSK+NIGHT_LEN+8-clock;   // the kids step out into the dawn; from then the day goes round as below
  G=LEVELS[2].gravity; HOP=LEVELS[2].hop;   // up here gravity is lighter: the hop goes about 5.5 m high and floats (settings.js)
  setLevelLook(true);
  mates.length=0; flock=null; pathA=0; pathAlign=0; pathOn=false; got.clear(); arrived=true;
  /* the door stands where it stood, on the cloud */
  const c=boxC(); { const dx=-(c[0]-SUNDX_G*BOX_HALF)*U, dz=(c[1]-SUNDZ_G*BOX_HALF)*U, base=groundAt(dx,dz)-8*U; boxY=boxGroup.position.y; boxGroup.position.y=doorLight.position.y=base; }
  /* the kids just past it, on the cloud, walking on toward the sun */
  for(const K of [girl,boy]){ const P=K.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=clamp(dx*SUNDZ_G-dz*SUNDX_G,-DOOR_W*0.4,DOOR_W*0.4), v=-BOX_HALF+120;
    const nx=c[0]+SUNDZ_G*u+SUNDX_G*v, nz=c[1]-SUNDX_G*u+SUNDZ_G*v;
    if(walking){ const dx2=-nx*U-P.x, dz2=nz*U-P.z; P.x+=dx2; P.z+=dz2; P.y=0; P.vy=0; if(K===girl){ cam.position.x+=dx2; cam.position.z+=dz2; } }   // walking on: same pace, same way, the camera carried with them
    else Object.assign(P,{x:-nx*U, z:nz*U, y:0, vy:0, h:-SUN_B, turn:0, bank:0, pitch:0, state:'ground'}); }
  events.length=0; doorNear=1; doorIn=0; if(!walking) placeCam(girl,0,true);
  /* the world's sounds fall away in the white and come back on the other side */
  if(actx&&master){ const t=actx.currentTime, on=soundOn?0.85:0; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value,t); master.gain.linearRampToValueAtTime(0,t+0.4); master.gain.linearRampToValueAtTime(on,t+3.5); }
}
function leaveLevel2(){ whiteIn=0; whiteHold=0; allWhite.uA.value=0; if(LEVEL!==2) return; LEVEL=1; G=LEVELS[1].gravity; HOP=LEVELS[1].hop; setLevelLook(false); boxGroup.position.y=doorLight.position.y=boxY; }

/* ---------- each frame ---------- */
/* level 1: the door leads into the box, and the box is this new level. Stepping into the doorway, in the light, and through:
   no stop, no turn, the kids walk on out of the same door onto the clouds */
function updateDoor(dt,time){
  if(!COAST.on) return;
  /* walking in through the doorway: dark shapes into the light, and over the next few steps past its face the view goes all white,
     kids and all; only then are they through (so the change is never seen). Turning back, the white falls away again. */
  /* one white layer over the whole screen, as in the 2D game: it rises as the girl walks in through the doorway (DOOR.fade metres), and when it is full they are through */
  const want=girl.P.state!=='fly'?clamp(doorPass/DOOR.fade,0,1):0;
  whiteIn+=(want-whiteIn)*(1-Math.exp(-dt*(want>whiteIn?12:4))); if(want>=1&&whiteIn>0.97) whiteIn=1;
  allWhite.uA.value=whiteIn*whiteIn*(3-2*whiteIn);
  if(whiteIn>=1){ enterLevel2(true); return; }
  /* coming near, the door's white takes a faint pink shimmer, as if another world lies just behind it */
  const a=0.9+0.1*Math.sin(time*1.3), k=clamp((doorNear-0.3)/0.7,0,1); doorPane.material.color.setRGB(a,a*(1-0.1*k),a*(1-0.05*k)); }
/* level 2: the door's white, the dawn, the sign */
function updateClouds(dt,time){
  coastA=1;
  if(!sign2 && clock-enteredAt>=11.6){ sign2=true; showLevelSign('LEVEL 2'); }
  const c=boxC(), P=girl.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=dx*SUNDZ_G-dz*SUNDX_G, v=dx*SUNDX_G+dz*SUNDZ_G, lat=Math.max(0,Math.abs(u)-DOOR_W*0.3)*1.7;
  /* the white: strong on first coming through, fading as they walk away; after that only right at the door (the 2D game's rule) */
  let tg=0; if(P.y/U<DOOR_H*1.6) tg=clamp(1-(Math.hypot(v+BOX_HALF,lat)-95)/(landed2?520:650),0,1);   // the white clears over their first ten steps
  doorNear+=(tg-doorNear)*(1-Math.exp(-dt*6)); if(doorNear<0.002&&tg===0) doorNear=0;
  /* the night holds until they are down on the cloud and clear of the door; then the sun starts to rise */
  if(!landed2){ dayOffset-=dt; if(P.state==='ground' && P.y<0.02 && doorNear<0.45){ landed2=true; nightOn=true; dayOffset=EVENING+DUSK+NIGHT_LEN-clock; } }
  const A=0.9+0.1*Math.sin(time*1.3); doorPane.material.color.setScalar(A);
  /* coming out on the clouds the view is still all white for a moment, then it clears as they walk on */
  whiteHold=Math.max(0,whiteHold-dt/1.6); const hold=whiteHold>0.6?1:whiteHold/0.6, hk=hold*hold*(3-2*hold);
  const m=Math.max(Math.min(0.9,doorNear*1.2),hk);   // otherwise almost white at most at the door: the kids are faint shapes in it
  washU.uM.value=Math.max(m*A,hk); allWhite.uA.value=hk; { const W=innerWidth, H=innerHeight; washU.uR.value=Math.max(W,H)*(0.25+1.1*m); washU.uSize.value.set(W,H); washU.uDpr.value=R.getPixelRatio(); }
  { const k=Math.pow(m*A,0.8), s0=clamp((m*A-0.4)/0.6,0,1); frontU.uK.value=k*(1-hk); frontU.uFade.value=Math.max(0.8*s0*s0*(3-2*s0),hk); }
}
/* the door's light on the screen: on the clouds it shines both ways (called by placeDoorScreen, desert.js) */
const _sd=new THREE.Vector3();
function placeDoorScreen2(){
  const W=innerWidth, H=innerHeight, focal=0.5*H/Math.tan(cam.fov*Math.PI/360), dc=doorLight.localToWorld(_sd.set(0,DH*0.5,front)), dist=cam.position.distanceTo(dc), pxPerM=focal/Math.max(1,dist);
  const p=dc.clone().project(cam), cx=(p.x+1)/2*W, cy=(1-p.y)/2*H, ahead=p.z<1, A=0.9+0.1*Math.sin(clock*1.3);
  const bp=Math.max(40,DH*pxPerM*1.4), far=clamp((dist-30)/60,0,1); doorBeacon.scale.set(bp/pxPerM,bp/pxPerM,1); doorBeacon.material.opacity=A*far; doorBeacon.visible=ahead&&far>0;
  washU.uC.value.set(cx,ahead?cy:H*0.45);
}
/* just before drawing: the LEVEL 1 sign when the game opens; on the clouds the lumps placed from this frame's camera, and no moon */
function level2Frame(){
  if(sign1 && girl){ sign1=false; showLevelSign('LEVEL 1'); }
  if(LEVEL===2){ moon.visible=moonHaze.visible=moonBloom.visible=false; gradeU.uMa.value=0; placeLumps(clock); }   // no moon, and none of its glow
}

/* ---------- the clouds' own feel ---------- */
/* flying: only near a whale, carried in its wake. The second hop lifts the kids only within about one and a half of a whale's
   lengths of it (mayFly, feathers.js); drifting away from the whales (beyond twice that) they glide gently back down onto the cloud. */
let hintEl=null;
function liftHint(on){ if(!hintEl){ if(!on) return; hintEl=document.createElement('div'); hintEl.setAttribute('aria-live','polite');
    Object.assign(hintEl.style,{position:'fixed',left:'50%',bottom:'calc(max(18px,env(safe-area-inset-bottom)) + 8px)',transform:'translateX(-50%)',zIndex:5,pointerEvents:'none',
      padding:'7px 14px',borderRadius:'999px',background:'rgba(60,40,70,.45)',color:'#fff6f0',font:'600 14px/1.2 "Klee One","Trebuchet MS",sans-serif',letterSpacing:'.04em',transition:'opacity .8s',opacity:0});
    hintEl.textContent='A whale is near: jump twice to fly'; document.body.appendChild(hintEl); }
  hintEl.style.opacity=on?'1':'0'; }
function updateLift(dt){
  if(LEVEL!==2){ liftHint(false); return; }
  const near=whaleNearness(), P=girl.P;
  liftHint(P.state!=='fly' && P.state!=='land' && near<1.5);
  if(P.state==='fly' && near>2){ P.alt=Math.max(0.5,P.alt-3.5*dt); if(P.alt<=1.5 && P.y<2.2) jumpKid(girl); }   // out of the whales' wake: down onto the cloud
}
Object.assign(window,{enterLevel2, leaveLevel2, updateDoor, updateClouds, updateLift, placeDoorScreen2, level2Frame});
})();
