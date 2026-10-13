/* ---------- The white room inside the box ----------
   Bigger on the inside: through the door the kids walk into a room 100 m wide, 100 m deep and 100 m high, all of it pure white,
   with no light or shade on it, so it has no edges anywhere. The room is part of level 1: no level change, no loading.
   It is seen only through the doorway, like a window into another space, so it never sticks out of the box: from outside the
   doorway shows the room's white, and the kids walk straight in, the camera following them through the door. Once the camera is
   inside, the world outside is seen only through the doorway behind them, as it really is, by day or by night.
   The door's light is tied to where the kids are: it grows as they come up to the door, is almost white right at the threshold
   (the kids faint shapes in it), and eases away over their first steps inside. Going out is the mirror of it.
   The room stays white at night: the night grade is laid only over what is seen of the world outside.
   A soft grey shadow under each kid keeps them standing on the floor.
   The room is a clean stage for the puzzle that will one day open the way to level 2 (level2.js, waiting). */
(function(){
const ROOM=100, FLOOR=30*U;   // the room's size in metres; its floor in the box's own frame (the box stands sunk 30 units in the sand)
const H=ROOM, Z0=front, Z1=front+ROOM, X=ROOM/2, Y0=FLOOR, Y1=FLOOR+H, DX=DW/2;
let camIn=false, kidsIn=false, crossing=false, entering=false, exiting=false, prevD=-1;
window.IN_ROOM=false;

/* ---------- the box gets a real doorway: its front face is built again with the opening cut out ---------- */
{ const g=new THREE.BoxGeometry(BW,BH,BW).toNonIndexed(), pos=Array.from(g.attributes.position.array), nor=Array.from(g.attributes.normal.array), uv=Array.from(g.attributes.uv.array);
  pos.length-=18; nor.length-=18; uv.length-=12;   // drop the -z face (the last of the six)
  const z=-BW/2, yb=-BH/2, yt=BH/2, yd=-BH/2+DH, hx=BW/2;
  const add=(x0,y0,x1,y1)=>{ for(const [x,y] of [[x0,y0],[x1,y1],[x1,y0],[x0,y0],[x0,y1],[x1,y1]]){ pos.push(x,y,z); nor.push(0,0,-1); uv.push(0.5-x/BW,0.5+y/BH); } };   // wound to face -z
  add(-hx,yb,-DX,yt); add(DX,yb,hx,yt); add(-DX,yd,DX,yt);
  const ng=new THREE.BufferGeometry(); ng.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); ng.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3)); ng.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  boxMesh.geometry.dispose(); boxMesh.geometry=ng; }
doorPane.visible=false;   // the doorway is open now: what fills it is the room's own white

/* ---------- the room, built in the box's own frame (its door face looks back down the road along -z) ---------- */
const STENCIL_IN={stencilWrite:true, stencilRef:8, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp, depthFunc:THREE.LessEqualDepth};
/* seen from outside, the room is drawn only where the doorway shows (stencil 4), over whatever lies behind the box */
const STENCIL_OUT={stencilWrite:true, stencilRef:4, stencilFunc:THREE.EqualStencilFunc, stencilZPass:THREE.KeepStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp, depthFunc:THREE.AlwaysDepth};
const white=new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide, fog:false, toneMapped:false, ...STENCIL_OUT});
const roomG=new THREE.Group(); roomG.visible=false; scene.add(roomG);
function quad(x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute([x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3],3)); g.setIndex([0,1,2,0,2,3]); const m=new THREE.Mesh(g,white); roomG.add(m); return m; }
/* every face runs half a metre past its edges, under or behind its neighbours, so no hairline crack ever shows the world outside */
const e=0.5, ya=Y0-e, yb=Y1+e, xa=-X-e, xb=X+e, za=Z0-e, zb=Z1+e;
quad(xa,Y0,Z0, xb,Y0,Z0, xb,Y0,zb, xa,Y0,zb);        // floor
quad(xa,Y1,za, xa,Y1,zb, xb,Y1,zb, xb,Y1,za);        // ceiling
quad(xa,ya,Z1, xb,ya,Z1, xb,yb,Z1, xa,yb,Z1);        // back wall
quad(-X,ya,za, -X,ya,zb, -X,yb,zb, -X,yb,za);        // side walls
quad(X,ya,za, X,yb,za, X,yb,zb, X,ya,zb);
const frontWall=[quad(xa,ya,Z0, -DX,ya,Z0, -DX,yb,Z0, xa,yb,Z0), quad(DX,ya,Z0, xb,ya,Z0, xb,yb,Z0, DX,yb,Z0), quad(-DX,DH,Z0, DX,DH,Z0, DX,yb,Z0, -DX,yb,Z0)];
const sill=quad(-DX,Y0,Z0-0.45, DX,Y0,Z0-0.45, DX,Y0,Z0+e, -DX,Y0,Z0+e);   // a white sill in the doorway, out to where the world outside begins
roomG.children.forEach(m=>{ m.frustumCulled=false; m.renderOrder=51; });
/* the doorway itself, invisible: it marks where the room may show (stencil 4), behind anything standing in front of it */
const portal=new THREE.Mesh(new THREE.PlaneGeometry(DW,DH),new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false, side:THREE.DoubleSide,
  stencilWrite:true, stencilRef:4, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp}));
portal.position.set(0,DH/2,Z0); portal.renderOrder=50; portal.frustumCulled=false; roomG.add(portal);
/* the kids are drawn after the room, so they stand in it (or in front of the doorway) whichever side the camera is on */
let kidsOrdered=false;
function orderKids(){ if(kidsOrdered||!girl) return; kidsOrdered=true; for(const K of [girl,boy]) K.root.traverse(n=>{ if(n.isMesh) n.renderOrder=60; }); }
/* the kids' shadows: a soft grey pool on the floor under each */
const shadowTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(120,118,128,.42)'); r.addColorStop(0.5,'rgba(120,118,128,.2)'); r.addColorStop(1,'rgba(120,118,128,0)'); g.fillStyle=r; g.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();
const shadows=[0,1].map(()=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false, fog:false, toneMapped:false,
  polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4})); m.rotation.x=-Math.PI/2; m.frustumCulled=false; m.renderOrder=55; scene.add(m); m.visible=false; return m; });

/* ---------- the box's frame: world to room and back (the box turns by -SUN_B about the vertical) ---------- */
const rot=()=>boxGroup.rotation.y;
function toLocal(x,z){ const r=rot(), dx=x-boxGroup.position.x, dz=z-boxGroup.position.z; return [dx*Math.cos(r)-dz*Math.sin(r), dx*Math.sin(r)+dz*Math.cos(r)]; }
function toWorld(lx,lz){ const r=rot(); return [boxGroup.position.x+lx*Math.cos(r)+lz*Math.sin(r), boxGroup.position.z-lx*Math.sin(r)+lz*Math.cos(r)]; }
const inRoom=(lx,lz)=>Math.abs(lx)<X && lz>Z0 && lz<Z1;
const active=()=>COAST.on && !(typeof level2On==='function' && level2On());
let doorG=0;   // the sand's height right at the doorway: the room's floor, and the box seated so its doorway sits on it
const floorY=()=>doorG;
/* a kid in the room, or stepping through the doorway, is not pushed off by the box (desert.js asks) */
window.passBox=function(K){ if(!active()) return false; const l=toLocal(K.P.x,K.P.z);
  return inRoom(l[0],l[1]) || (Math.abs(l[0])<DX-0.25 && l[1]>Z0-2.5 && K.P.y<DH-1.2); };

/* inside, the land under the room is its flat white floor */
const _ground=groundAt; groundAt=function(x,z){ if(!roomG.visible) return _ground(x,z);
  const l=toLocal(x,z), ax=Math.abs(l[0]);
  if((kidsIn||camIn) && ax<=X+0.5 && l[1]>=Z0-0.05 && l[1]<=Z1+0.5) return doorG;
  /* the last two metres of sand before the doorway ease to the floor's height, so there is never a step at the threshold */
  if(ax<DX+2 && l[1]<Z0 && l[1]>Z0-2.5){ const g=_ground(x,z), t=clamp((l[1]-(Z0-2.5))/2.3,0,1)*clamp((DX+2-ax)/2,0,1), k=t*t*(3-2*t); return g+(doorG-g)*k; }
  return _ground(x,z); };
/* with the camera inside, the world outside is cut away at the door's wall, so none of it (the sand, the dunes) shows in the room */
const cut=new THREE.Plane(), _n=new THREE.Vector3(), _p=new THREE.Vector3();
function setCut(on){ R.localClippingEnabled=true;
  if(on){ const r=rot(); _n.set(-Math.sin(r),0,-Math.cos(r));   // outward through the door (the room's -z, in the world)
    const w=toWorld(0,Z0-0.4); _p.set(w[0],0,w[1]); cut.setFromNormalAndCoplanarPoint(_n,_p); }   // a little outside the wall, so the sand never fights the wall's foot
  for(const m of [groundNear.material,groundFar.material]){ m.clippingPlanes=on?[cut]:null; m.needsUpdate=true; } }
/* the night grade: inside, only over the world seen through the door; outside, over everything but the room seen through the doorway */
function setGrade(mode){ const k={stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp, stencilZPass:THREE.KeepStencilOp};
  Object.assign(gradeMat, mode==='in'?{stencilWrite:true, stencilRef:0, stencilFuncMask:0xff, stencilFunc:THREE.EqualStencilFunc, ...k}
                        : mode==='inKidsOut'?{stencilWrite:true, stencilRef:0, stencilFuncMask:8, stencilFunc:THREE.EqualStencilFunc, ...k}   // camera still inside, kids already out in the night: grade them, not the room
                        : mode==='out'?{stencilWrite:true, stencilRef:4, stencilFuncMask:0xff, stencilFunc:THREE.NotEqualStencilFunc, ...k}
                        : mode==='outKids'?{stencilWrite:true, stencilRef:0, stencilFuncMask:6, stencilFunc:THREE.EqualStencilFunc, ...k}   // nor the kids standing in the room's light (stencil 2), seen from outside
                        : {stencilWrite:false, stencilFunc:THREE.AlwaysStencilFunc}); }

/* the camera crossing the threshold: everything that only belongs to one side changes over */
function setCamIn(on){
  camIn=on; window.IN_ROOM=on;
  Object.assign(white,on?STENCIL_IN:STENCIL_OUT); white.needsUpdate=true; portal.visible=!on;
  for(const m of frontWall) m.visible=on; sill.visible=true;
  boxMesh.visible=!on; doorGlow.visible=!on; fan.visible=!on;
  for(const g of grassAll) g.visible=!on; seeds.visible=!on;
  setCut(on); setGrade(on?(kidsIn?'in':'inKidsOut'):(kidsIn?'outKids':'out'));
}
function show(on){ roomG.visible=on; if(!on){ kidGlowU.uA.value=0; roomSound(false); if(camIn) setCamIn(false); setGrade(null); for(const s of shadows) s.visible=false; kidsIn=false; crossing=false; entering=exiting=false; prevD=-1; } else if(!camIn) setGrade('out'); }

/* ---------- each frame, after the kids have moved ---------- */
const _ud=updateDesert;
updateDesert=function(dt,time){
  _ud(dt,time);
  if(!active()){ if(roomG.visible) show(false); return; }
  orderKids();
  if(!roomG.visible){ /* seat the box (and its light) so the doorway's foot is the sand at the threshold, then the room in it */
    const w=toWorld(0,Z0-0.6); doorG=_ground(w[0],w[1]); boxGroup.position.y=doorLight.position.y=doorG-FLOOR; if(typeof dropFan==='function') dropFan(0);
    roomG.position.copy(boxGroup.position); roomG.rotation.copy(boxGroup.rotation); show(true); }
  /* the kids: the room's walls hold them; the doorway is the way in and out */
  let anyIn=false;
  for(const K of [girl,boy]){ const P=K.P, l=toLocal(P.x,P.z); if(!inRoom(l[0],l[1])) continue; anyIn=true;
    const atDoor=Math.abs(l[0])<DX-0.3 && P.y<DH-1.2;
    let lx=clamp(l[0],-X+0.6,X-0.6), lz=Math.min(l[1],Z1-0.6); if(!atDoor) lz=Math.max(lz,Z0+0.6);
    if(lx!==l[0]||lz!==l[1]){ const w=toWorld(lx,lz); P.x=w[0]; P.z=w[1]; }
    if(P.y>H-6){ P.y=H-6; P.vy=Math.min(0,P.vy); } if(P.alt>H-6) P.alt=H-6; }
  if(anyIn!==kidsIn) setGrade(camIn?(anyIn?'in':'inKidsOut'):(anyIn?'outKids':'out'));
  kidsIn=anyIn;
  roomSound(anyIn);
  /* the door's light, from where the girl is: almost white at the threshold, easing off a few metres either side of it */
  { const P=girl.P, l=toLocal(P.x,P.z), d=l[1]-Z0, al=Math.abs(l[0])<DX+1 && P.y<DH;
    /* which way they are going: the white is only for coming in; going out they simply walk back into the world */
    if(prevD<=0&&d>0){ entering=true; exiting=false; } else if(prevD>0&&d<=0){ exiting=true; entering=false; } prevD=d;
    const s=clamp(1-Math.abs(d)/5,0,1), vPos=(al&&(d<=0||entering))?0.9*s*s*(3-2*s):0;
    /* and from where the camera is: it stays near-white while the camera itself passes the doorway, a few steps behind the kids */
    const lc=toLocal(cam.position.x,cam.position.z), dc=lc[1]-Z0, sc=clamp(1-Math.abs(dc)/3,0,1), vCam=(entering&&Math.abs(lc[0])<DX+1)?0.9*sc*sc*(3-2*sc):0;
    crossing=entering&&Math.abs(dc)<3; if(entering&&dc>3) entering=false; if(exiting&&d<-6) exiting=false;
    /* between the girl passing the doorway and the camera passing it after her, the light holds: one long white, not two */
    const across=entering && al && Math.abs(d)<12 && d>0&&dc<0, vHold=across?0.9:0;
    const vDoor=(d<0&&!exiting)?Math.min(washU.uM.value,0.9):0, v=exiting?0:Math.max(vPos,vCam,vDoor,vHold);
    /* walking out, the kids carry the room's light on them for their first few steps, fading as they leave the door behind */
    { const t=exiting?clamp(-d/6,0,1):1; kidGlowU.uA.value=exiting?0.6*(1-t*t*(3-2*t)):0; }
    washU.uM.value=v;
    const s0=clamp((v-0.4)/0.6,0,1); frontU.uK.value=Math.pow(v,0.8); frontU.uFade.value=0.8*s0*s0*(3-2*s0); }   // the kids dark, then faint in it, never quite gone
  /* inside: the box's flamingos stay outside, and the kids have their soft shadows */
  if(camIn){ for(const b of SB) b.o.visible=false; if(FL.mateBirds) for(const b of FL.mateBirds) b.o.visible=false; }
  [girl,boy].forEach((K,i)=>{ const s=shadows[i], P=K.P, l=toLocal(P.x,P.z), on=inRoom(l[0],l[1]); s.visible=on; if(!on) return;
    const k=clamp(1-P.y/8,0,1); s.position.set(P.x,floorY()+0.01,P.z); const sz=1.3+P.y*0.25; s.scale.set(sz,sz,1); s.material.opacity=k; });
};
/* the sound: in the room the kids' footsteps are all there is. Everything else (the wind, the flamingos, the music, the chimes)
   goes through the page's master volume, so the footsteps are given their own way out, and the master fades away inside
   (over about a second and a half) and back as they step out. The footsteps themselves are unchanged. */
let stepBus=null, muted=null;
function roomSound(inside){
  if(typeof actx==='undefined'||!actx||!master||!runGain) return;
  if(!stepBus){ stepBus=actx.createGain(); stepBus.gain.value=master.gain.value; stepBus.connect(actx.destination);
    for(const g of [runGain,palGain]) if(g){ g.disconnect(); g.connect(stepBus); } }
  const t=actx.currentTime, on=soundOn?0.85:0;
  stepBus.gain.setTargetAtTime(on,t,0.15);
  const want=inside?0:on, key=want+'|'+soundOn; if(key!==muted){ muted=key; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(want,t,0.5); }   // (the Sound button sets the master too; this puts it right again)
}
/* the camera: through the doorway it must pass the opening itself, and inside it stays within the room */
const _pc=placeCam;
placeCam=function(K,dt,snap){ _pc(K,dt,snap);
  if(!roomG.visible) return;
  const l=toLocal(cam.position.x,cam.position.z), gl=toLocal(girl.P.x,girl.P.z), girlIn=inRoom(gl[0],gl[1]);
  let lx=l[0], lz=l[1], y=cam.position.y; const fy=floorY();
  /* near the door's wall, while the girl is on the other side of it, the camera keeps to the opening */
  const across=(girlIn && lz<Z0+1.5) || (!girlIn && lz>Z0-1.5 && inRoom(l[0],l[1]));
  if(across && lz>Z0-3 && lz<Z0+3 && Math.abs(gl[0])<DX+2){ lx=clamp(lx,-(DX-0.5),DX-0.5); y=Math.min(y,boxGroup.position.y+DH-0.6); }
  const nowIn=inRoom(lx,lz);
  if(nowIn){ lx=clamp(lx,-X+0.8,X-0.8); lz=Math.min(lz,Z1-0.8); y=clamp(y,fy+0.4,fy+H-1); }
  if(lx!==l[0]||lz!==l[1]){ const w=toWorld(lx,lz); cam.position.x=w[0]; cam.position.z=w[1]; }
  cam.position.y=y;
  if(nowIn!==camIn) setCamIn(nowIn);
};
/* the mates of the box stay out of the room after they are placed */
const _pm=placeMates; placeMates=function(dt){ _pm(dt); if(camIn&&FL.mateBirds) for(const b of FL.mateBirds) b.o.visible=false; };
/* drawing: inside, no evening light, flare or ray, and the white centred on the view */
const _pds=placeDoorScreen;
placeDoorScreen=function(){ _pds(); if(camIn||crossing){ const W=innerWidth, Hh=innerHeight; washU.uC.value.set(W/2,Hh*0.45); washU.uR.value=Math.max(W,Hh)*1.35; washU.uSize.value.set(W,Hh); washU.uDpr.value=R.getPixelRatio(); } };
/* the light on the kids alone (stencil 6: only they write it), laid over the finished frame */
const kidGlowU={uA:{value:0}}, kidGlowScene=new THREE.Scene();
{ const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:kidGlowU, transparent:true, depthTest:false, depthWrite:false,
    stencilWrite:true, stencilRef:6, stencilFuncMask:6, stencilFunc:THREE.EqualStencilFunc, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp, stencilZPass:THREE.KeepStencilOp,
    vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`, fragmentShader:`uniform float uA; void main(){ gl_FragColor=vec4(1.0,1.0,250.0/255.0,uA); }`}));
  m.frustumCulled=false; kidGlowScene.add(m); }
const _rf=renderFrame;
renderFrame=function(){
  if(camIn){ lightCv.style.opacity='0'; flareCv.style.opacity='0'; rayU.uA.value=0; }
  _rf();
  if(kidGlowU.uA.value>0.003){ R.autoClear=false; R.render(kidGlowScene,washCam); R.autoClear=true; }
};
/* Reset level and To the box start outside */
const _rl=resetLevel; resetLevel=function(){ show(false); return _rl(); };
const _gb=goToBox; goToBox=function(){ show(false); return _gb(); };
})();
