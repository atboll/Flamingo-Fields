/* ---------- Level 2: through the door, onto a sea of cloud ----------
   As in the 2D game: stand in the doorway, in the white, for a moment, and you step through. The desert, the box and the field are gone;
   the kids stand on cloud just past where the door was, and the door stands alone behind them, a slim silver frame shining both ways.
   The white fades as they walk away from it. The night holds until they are down on the cloud and clear of the door, then dawn comes.
   Your flock, the flamingos of the box, the feathers, the feather road, the wild flocks and the clouds of the sky stay behind. No moon.
   The floor: the 2D game's level 2, candyfloss pinks, the land a tenth lower, nothing standing on the horizon. Its cloud lumps are found
   exactly as the 2D game finds them (one per cell of a grid that coarsens with distance, in bands that belong to the camera, so they swim,
   swell and pop as you move), and drawn as real 3D lumps in flat pinks with a paler crown poking out of each.
   The page's #l2test address (or window.L2TEST) starts straight on the clouds, for testing. Reset level brings back level 1. */
(function(){
let LEVEL=1, inT=0, landed2=false, boxY=0, enteredAt=-1, sign2=false, sign1=!(window.L2TEST||location.hash==='#l2test');
/* the level sign, as the 2D game shows it: LEVEL 1 when the game opens, LEVEL 2 ten seconds after stepping onto the clouds */
function showLevelSign(text){ const el=$('levelSign'); if(!el) return; const q=clamp(Math.min(innerWidth/1100,innerHeight/560),0.55,1.2);
  el.textContent=text; el.style.fontSize=Math.round(72*q)+'px'; el.style.letterSpacing=Math.round(14*q)+'px';
  /* wait for the font (at most 2.5 s), so the sign never starts while its letters are still invisible */
  let go=false; const start=()=>{ if(go) return; go=true; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); };
  try{ document.fonts.load('600 72px "Klee One"').then(start,start); }catch(e){ start(); } setTimeout(start,2500); }
window.level2On=()=>LEVEL===2;

/* the land: a tenth lower on the clouds */
const _ground=groundAt; groundAt=function(x,z){ return LEVEL===2?_ground(x,z)*0.9:_ground(x,z); };

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
  boxMesh.visible=!on; frame.visible=on; doorGlow.visible=!on; fan.visible=!on;
  doorPane.visible=on;   // on the clouds the lone door is filled with light; on level 1 the doorway is open onto the white room (room.js)
  doorPane.material.side=on?THREE.DoubleSide:THREE.FrontSide; doorPane.position.z=on?front:front-0.2;
  if(on){ shore.length=0; for(const b of SB) b.o.visible=false; for(const q of POOL){ q.card.visible=q.glow.visible=q.nglow.visible=false; } if(POOL.halo) POOL.halo.visible=POOL.rays.visible=false; }
  const p1=$('plus1'); if(p1) p1.disabled=on||mates.length>=MATES_MAX;   // the 2D game's test buttons do nothing on the clouds
}
function enterLevel2(){
  if(!girl||!COAST.on) return;
  LEVEL=2; inT=0; landed2=false; enteredAt=clock; sign2=false;
  setLevelLook(true);
  mates.length=0; flock=null; pathA=0; pathAlign=0; pathOn=false; got.clear(); arrived=true; rayU.uA.value=0;
  /* the door stands where it stood, on the cloud */
  const c=boxC(); { const dx=-(c[0]-SUNDX_G*BOX_HALF)*U, dz=(c[1]-SUNDZ_G*BOX_HALF)*U, base=groundAt(dx,dz)-8*U; boxY=boxGroup.position.y; boxGroup.position.y=doorLight.position.y=base; }
  /* the kids just past it, on the cloud, walking on toward the sun */
  for(const K of [girl,boy]){ const P=K.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=clamp(dx*SUNDZ_G-dz*SUNDX_G,-DOOR_W*0.4,DOOR_W*0.4), v=-BOX_HALF+120;
    const nx=c[0]+SUNDZ_G*u+SUNDX_G*v, nz=c[1]-SUNDX_G*u+SUNDZ_G*v; Object.assign(P,{x:-nx*U, z:nz*U, y:0, vy:0, h:-SUN_B, turn:0, bank:0, pitch:0, state:'ground'}); }
  events.length=0; doorNear=1; doorIn=0; placeCam(girl,0,true);
}
function leaveLevel2(){ if(LEVEL!==2) return; LEVEL=1; setLevelLook(false); boxGroup.position.y=doorLight.position.y=boxY; }
window.enterLevel2=enterLevel2; window.leaveLevel2=leaveLevel2;

/* ---------- each frame ---------- */
const _ud=updateDesert;
updateDesert=function(dt,time){
  if(LEVEL!==2){ _ud(dt,time);
    /* (the door now leads into the white room, room.js; level 2 waits for its puzzle) */
    return; }
  coastA=1;
  if(!sign2 && clock-enteredAt>=10){ sign2=true; showLevelSign('LEVEL 2'); }
  const c=boxC(), P=girl.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=dx*SUNDZ_G-dz*SUNDX_G, v=dx*SUNDX_G+dz*SUNDZ_G, lat=Math.max(0,Math.abs(u)-DOOR_W*0.3)*1.7;
  /* the white: strong on first coming through, fading as they walk away; after that only right at the door (the 2D game's rule) */
  let tg=0; if(P.y/U<DOOR_H*1.6) tg=clamp(1-(Math.hypot(v+BOX_HALF,lat)-95)/(landed2?520:1700),0,1);
  doorNear+=(tg-doorNear)*(1-Math.exp(-dt*6)); if(doorNear<0.002&&tg===0) doorNear=0;
  /* the night holds until they are down on the cloud and clear of the door; then the sun starts to rise */
  if(!landed2){ dayOffset-=dt; if(P.state==='ground' && P.y<0.02 && doorNear<0.45){ landed2=true; nightOn=true; dayOffset=EVENING+DUSK+NIGHT_LEN-clock; } }
  const A=0.9+0.1*Math.sin(time*1.3); doorPane.material.color.setScalar(A);
  const m=Math.min(1,doorNear*1.2);   // on the clouds the light takes the view a fifth more strongly
  washU.uM.value=m*A; { const W=innerWidth, H=innerHeight; washU.uR.value=Math.max(W,H)*(0.25+1.1*m); washU.uSize.value.set(W,H); washU.uDpr.value=R.getPixelRatio(); }
  { const k=Math.pow(m*A,0.8), s0=clamp((m*A-0.4)/0.6,0,1); frontU.uK.value=k; frontU.uFade.value=0.8*s0*s0*(3-2*s0); }
};
/* the door's light on the screen: on the clouds it shines both ways, and there is no ray */
const _pds=placeDoorScreen, _sd=new THREE.Vector3();
placeDoorScreen=function(){
  if(LEVEL!==2) return _pds();
  const W=innerWidth, H=innerHeight, focal=0.5*H/Math.tan(cam.fov*Math.PI/360), dc=doorLight.localToWorld(_sd.set(0,DH*0.5,front)), dist=cam.position.distanceTo(dc), pxPerM=focal/Math.max(1,dist);
  const p=dc.clone().project(cam), cx=(p.x+1)/2*W, cy=(1-p.y)/2*H, ahead=p.z<1, A=0.9+0.1*Math.sin(clock*1.3);
  const bp=Math.max(40,DH*pxPerM*1.4), far=clamp((dist-30)/60,0,1); doorBeacon.scale.set(bp/pxPerM,bp/pxPerM,1); doorBeacon.material.opacity=A*far; doorBeacon.visible=ahead&&far>0;
  rayU.uA.value=0; washU.uC.value.set(cx,ahead?cy:H*0.45);
};
/* no wild flocks, feathers or feather road on the clouds */
const _uf=updateFlock; updateFlock=function(K,dt,time){ if(LEVEL===2){ flock=null; return; } return _uf(K,dt,time); };
const _pf=placeFeathers; placeFeathers=function(K,time){ if(LEVEL===2) return; return _pf(K,time); };
const _pk=pickFeathers; pickFeathers=function(time){ if(LEVEL===2) return; return _pk(time); };
const _up=updatePath; updatePath=function(K,dt,time){ if(LEVEL===2){ pathA=0; pathOn=false; return; } return _up(K,dt,time); };
/* Reset level and To the box start from level 1 */
const _rl=resetLevel; resetLevel=function(){ leaveLevel2(); return _rl(); };
const _gb=goToBox; goToBox=function(){ leaveLevel2(); return _gb(); };
/* drawing: the lumps placed from this frame's camera, and no moon over the clouds */
const _rf=renderFrame; let testStart=!!(window.L2TEST||location.hash==='#l2test');
renderFrame=function(){
  if(sign1 && girl){ sign1=false; showLevelSign('LEVEL 1'); }
  if(testStart && girl && FL.ready){ testStart=false; goToBox(); enterLevel2(); }
  if(LEVEL===2){ moon.visible=moonHaze.visible=moonBloom.visible=false; gradeU.uMa.value=0; placeLumps(clock); }   // no moon, and none of its glow
  _rf();
};
})();
