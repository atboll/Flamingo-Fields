/* ---------- The white room inside the box ----------
   Bigger on the inside: through the door the kids stand in a room 100 m wide, 100 m deep and 100 m high, all of it pure white,
   with no light or shade on it, so it has no edges anywhere. Only the doorway behind them shows the world outside, as it really is,
   by day or by night. The room stays white at night: the night grade is laid only over what is seen through the door.
   A soft grey shadow under each kid keeps them standing on the floor. Walking back out through the doorway is the way out.
   Coming in, the light that takes the view at the door fades away to the white; going out, it fades away to the desert.
   The room is a clean stage for the puzzle that will one day open the way to level 2 (level2.js, waiting). */
(function(){
const ROOM=100, FLOOR=30*U;   // the room's size in metres; its floor in the box's own frame (the box stands sunk 30 units in the sand)
let inside=false, inT=0;
window.IN_ROOM=false;

/* the room, built in the box's own frame (its door face looks back down the road along -z) */
const white=new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide, fog:false, toneMapped:false,
  stencilWrite:true, stencilRef:3, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp});
const roomG=new THREE.Group(); roomG.visible=false; scene.add(roomG);
const H=ROOM, Z0=front, Z1=front+ROOM, X=ROOM/2, Y0=FLOOR, Y1=FLOOR+H;
function quad(x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute([x0,y0,z0,x1,y1,z1,x2,y2,z2,x3,y3,z3],3)); g.setIndex([0,1,2,0,2,3]); roomG.add(new THREE.Mesh(g,white)); }
/* every face runs half a metre past its edges, under or behind its neighbours, so no hairline crack ever shows the world outside */
const e=0.5, ya=Y0-e, yb=Y1+e, xa=-X-e, xb=X+e, za=Z0-e, zb=Z1+e;
quad(xa,Y0,Z0, xb,Y0,Z0, xb,Y0,zb, xa,Y0,zb);        // floor (stopping at the door's wall, so no white sill sticks out of the doorway)
quad(xa,Y1,za, xa,Y1,zb, xb,Y1,zb, xb,Y1,za);        // ceiling
quad(xa,ya,Z1, xb,ya,Z1, xb,yb,Z1, xa,yb,Z1);        // back wall
quad(-X,ya,za, -X,ya,zb, -X,yb,zb, -X,yb,za);        // side walls
quad(X,ya,za, X,yb,za, X,yb,zb, X,ya,zb);
const dx=DW/2;                                        // the front wall, round the doorway (the door runs from the box's foot up to DH)
quad(xa,ya,Z0, -dx,ya,Z0, -dx,yb,Z0, xa,yb,Z0);
quad(dx,ya,Z0, xb,ya,Z0, xb,yb,Z0, dx,yb,Z0);
quad(-dx,DH,Z0, dx,DH,Z0, dx,yb,Z0, -dx,yb,Z0);
quad(-dx,Y0,Z0-0.45, dx,Y0,Z0-0.45, dx,Y0,Z0+e, -dx,Y0,Z0+e);   // a white sill in the doorway, out to where the world outside begins
roomG.children.forEach(m=>{ m.frustumCulled=false; m.renderOrder=-5; });
/* the kids' shadows: a soft grey pool on the floor under each */
const shadowTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(120,118,128,.42)'); r.addColorStop(0.5,'rgba(120,118,128,.2)'); r.addColorStop(1,'rgba(120,118,128,0)'); g.fillStyle=r; g.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();
const shadows=[0,1].map(()=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false, fog:false, toneMapped:false,
  polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4})); m.rotation.x=-Math.PI/2; m.frustumCulled=false; scene.add(m); m.visible=false; return m; });

/* the box's frame: world to room and back (the box turns by -SUN_B about the vertical) */
const rot=()=>boxGroup.rotation.y;
function toLocal(x,z){ const r=rot(), dx=x-boxGroup.position.x, dz=z-boxGroup.position.z; return [dx*Math.cos(r)-dz*Math.sin(r), dx*Math.sin(r)+dz*Math.cos(r)]; }
function toWorld(lx,lz){ const r=rot(); return [boxGroup.position.x+lx*Math.cos(r)+lz*Math.sin(r), boxGroup.position.z-lx*Math.sin(r)+lz*Math.cos(r)]; }
const headingOut=()=>{ const r=rot(); return Math.atan2(-Math.sin(r),-Math.cos(r)); };   // facing along the room's -z, out of the door
const inFoot=(lx,lz)=>Math.abs(lx)<=X+0.5 && lz>=Z0-0.05 && lz<=Z1+0.5;

/* inside, the land under the room is its flat white floor */
const _ground=groundAt; groundAt=function(x,z){ if(inside){ const l=toLocal(x,z); if(inFoot(l[0],l[1])) return boxGroup.position.y+FLOOR; } return _ground(x,z); };
/* the world outside is cut away at the door's wall, so nothing of it (the sand, the dunes) shows inside the room */
const cut=new THREE.Plane(), _n=new THREE.Vector3(), _p=new THREE.Vector3();
function setCut(on){ R.localClippingEnabled=true;
  if(on){ const r=rot(); _n.set(-Math.sin(r),0,-Math.cos(r));   // outward through the door (the room's -z, in the world)
    const w=toWorld(0,Z0-0.4); _p.set(w[0],0,w[1]); cut.setFromNormalAndCoplanarPoint(_n,_p); }   // a little outside the wall, so the sand never fights the wall's foot for the same pixels
  for(const m of [groundNear.material,groundFar.material]){ m.clippingPlanes=on?[cut]:null; m.needsUpdate=true; } }
/* the night grade only over what is seen through the door: the room (and whoever stands in it) keeps its own colours */
function setGrade(on){ Object.assign(gradeMat,on?{stencilWrite:true, stencilRef:0, stencilFunc:THREE.EqualStencilFunc, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp, stencilZPass:THREE.KeepStencilOp}:{stencilWrite:false, stencilFunc:THREE.AlwaysStencilFunc}); }

function place(K,lx,lz,h){ const w=toWorld(lx,lz); Object.assign(K.P,{x:w[0], z:w[1], y:0, vy:0, h, turn:0, bank:0, pitch:0, spd:0, state:'ground'}); }
function enterRoom(){
  if(inside||!COAST.on) return; inside=true; window.IN_ROOM=true; inT=0;
  roomG.position.copy(boxGroup.position); roomG.rotation.copy(boxGroup.rotation); roomG.visible=true;
  boxMesh.visible=false; doorLight.visible=false; for(const s of shadows) s.visible=true; for(const g of grassAll) g.visible=false; seeds.visible=false;   // no grass or seeds blowing about in the room
  setCut(true); setGrade(true);
  const r=rot(), hin=Math.atan2(Math.sin(r),Math.cos(r));   // facing into the room
  for(const [K,ox] of [[girl,-0.6],[boy,0.7]]){ const l=toLocal(K.P.x,K.P.z); place(K,clamp(l[0],-DW*0.4,DW*0.4)+ox*0,Z0+9+(K===boy?-1.2:0),hin); }
  events.length=0; placeCam(girl,0,true); doorIn=0;
}
function leaveRoom(putOutside){
  if(!inside) return; inside=false; window.IN_ROOM=false;
  roomG.visible=false; boxMesh.visible=true; doorLight.visible=true; for(const s of shadows) s.visible=false; for(const g of grassAll) g.visible=true; seeds.visible=true;
  setCut(false); setGrade(false);
  if(putOutside){ const h=headingOut(); for(const K of [girl,boy]){ const l=toLocal(K.P.x,K.P.z); place(K,clamp(l[0],-DW*0.4,DW*0.4),Z0-10-(K===boy?1.2:0),h); }
    events.length=0; placeCam(girl,0,true); doorNear=1; doorIn=0; }
}
window.enterRoom=enterRoom; window.leaveRoom=leaveRoom;

/* each frame, after the kids have moved */
const _ud=updateDesert;
updateDesert=function(dt,time){
  _ud(dt,time);
  if(typeof level2On==='function' && level2On()) return;
  if(!inside){
    /* in the doorway, in the white, for half a second: inside */
    if(COAST.on && doorIn>0.97 && doorNear>0.9){ inT+=dt; if(inT>0.5) enterRoom(); } else inT=0;
    return; }
  /* inside: the walls hold; the doorway is the way out */
  for(const K of [girl,boy]){ const P=K.P, l=toLocal(P.x,P.z); let lx=clamp(l[0],-X+0.6,X-0.6), lz=Math.min(l[1],Z1-0.6);
    const atDoor=Math.abs(l[0])<DW/2-0.3 && P.y<DH-1.2;
    if(K===girl && atDoor && l[1]<Z0+0.4){ leaveRoom(true); return; }
    lz=Math.max(lz,Z0+(atDoor&&K===girl?0.2:0.6));
    if(lx!==l[0]||lz!==l[1]){ const w=toWorld(lx,lz); P.x=w[0]; P.z=w[1]; }
    if(P.y>H-6){ P.y=H-6; P.vy=Math.min(0,P.vy); } if(P.alt>H-6) P.alt=H-6; }
  for(const b of SB) b.o.visible=false;   // the box's flamingos stay outside
  if(FL.mateBirds) for(const b of FL.mateBirds) b.o.visible=false;
  /* the soft shadows */
  [girl,boy].forEach((K,i)=>{ const s=shadows[i], P=K.P, k=clamp(1-P.y/8,0,1); s.position.set(P.x,boxGroup.position.y+FLOOR+0.01,P.z); const sz=1.3+P.y*0.25; s.scale.set(sz,sz,1); s.material.opacity=k*0.45; });   // only the faintest pool: in this much light there is hardly a shadow
};
/* the camera stays inside the room */
const _pc=placeCam;
placeCam=function(K,dt,snap){ _pc(K,dt,snap); if(!inside) return;
  const l=toLocal(cam.position.x,cam.position.z), lx=clamp(l[0],-X+0.8,X-0.8), lz=clamp(l[1],Z0+0.8,Z1-0.8);
  if(lx!==l[0]||lz!==l[1]){ const w=toWorld(lx,lz); cam.position.x=w[0]; cam.position.z=w[1]; }
  const fy=boxGroup.position.y+FLOOR; cam.position.y=clamp(cam.position.y,fy+0.4,fy+H-1); };
/* the mates of the box stay out of the room after they are placed */
const _pm=placeMates; placeMates=function(dt){ _pm(dt); if(inside&&FL.mateBirds) for(const b of FL.mateBirds) b.o.visible=false; };
/* drawing: no evening light, flare, ray or door light over the room */
/* the kids in the room: faint pale shades of themselves, as in the doorway, with the light bleeding into their edges.
   Their shape is drawn alone into a small picture and blurred; the blur is then cut back hard, so arms, hair and hems thin out
   and glow away at the rim while the body holds. Their own colours are painted out first (stencil 2, where they stand). */
const KID_LAYER=5; let kidsLayered=false;
const maskMat=new THREE.MeshBasicMaterial({color:0xffffff, fog:false});
const rtA=new THREE.WebGLRenderTarget(4,4,{depthBuffer:true}), rtB=new THREE.WebGLRenderTarget(4,4,{depthBuffer:false});
const blurU={t:{value:null}, uDir:{value:new THREE.Vector2()}};
const blurScene=new THREE.Scene(); blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:blurU, depthTest:false, depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
    void main(){ float w[5]; w[0]=0.227; w[1]=0.195; w[2]=0.122; w[3]=0.054; w[4]=0.016; float m=texture2D(t,vUv).r*w[0];
      for(int i=1;i<5;i++){ m+=texture2D(t,vUv+uDir*float(i)).r*w[i]; m+=texture2D(t,vUv-uDir*float(i)).r*w[i]; }
      gl_FragColor=vec4(m,m,m,1.0); }`})));
const ghostU={t:{value:rtA.texture}};
const ghostScene=new THREE.Scene();
ghostScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true, depthTest:false, depthWrite:false,   // their colours painted out, where they stand
  stencilWrite:true, stencilRef:2, stencilFunc:THREE.EqualStencilFunc, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp, stencilZPass:THREE.KeepStencilOp,
  vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`, fragmentShader:`void main(){ gl_FragColor=vec4(1.0); }`})));
ghostScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:ghostU, transparent:true, depthTest:false, depthWrite:false,   // and their faint shade, cut back at the rim
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform sampler2D t; varying vec2 vUv;
    void main(){ float m=texture2D(t,vUv).r, a=smoothstep(0.34,0.82,m);
      gl_FragColor=vec4(vec3(206.0,200.0,214.0)/255.0, a*0.95); }`})));
ghostScene.children.forEach((m,i)=>{ m.frustumCulled=false; m.renderOrder=i; });
const _cc=new THREE.Color(), _gp=new THREE.Vector3(), _gq=new THREE.Vector3();
function drawGhosts(){
  if(!kidsLayered){ kidsLayered=true; for(const K of [girl,boy]) K.root.traverse(n=>{ if(n.isMesh) n.layers.enable(KID_LAYER); }); }
  const db=R.getDrawingBufferSize(new THREE.Vector2()), w=Math.max(4,db.x>>1), h=Math.max(4,db.y>>1);
  if(rtA.width!==w||rtA.height!==h){ rtA.setSize(w,h); rtB.setSize(w,h); }
  const mask=cam.layers.mask, ca=R.getClearAlpha(); R.getClearColor(_cc);
  /* their shape alone */
  const su=R.shadowMap.autoUpdate; R.shadowMap.autoUpdate=false;   // the sun's shadows were drawn already this frame
  cam.layers.set(KID_LAYER); scene.overrideMaterial=maskMat; R.setRenderTarget(rtA); R.setClearColor(0x000000,1); R.clear(); R.render(scene,cam);
  scene.overrideMaterial=null; cam.layers.mask=mask; R.shadowMap.autoUpdate=su;
  /* blurred, across then down: the glow scales with how big the kids stand on the screen (a twenty-fifth of their height),
     so a far-off or high-flying kid thins at the rim like a near one instead of melting away */
  const P=girl.P, gy=groundAt(P.x,P.z)+P.y, f=_gp.set(P.x,gy,P.z).project(cam).y, hd=_gq.set(P.x,gy+1.2,P.z).project(cam).y, kidPx=Math.abs(hd-f)/2*h;
  const rad=clamp(kidPx/25,0.6,(db.y/2)/160)/4;
  blurU.t.value=rtA.texture; blurU.uDir.value.set(rad/w,0); R.setRenderTarget(rtB); R.render(blurScene,washCam);
  blurU.t.value=rtB.texture; blurU.uDir.value.set(0,rad/h); R.setRenderTarget(rtA); R.render(blurScene,washCam);
  R.setRenderTarget(null); R.setClearColor(_cc,ca);
  /* over the finished frame */
  R.autoClear=false; R.render(ghostScene,washCam); R.autoClear=true;
}
const _rf=renderFrame;
renderFrame=function(){
  if(inside){ lightCv.style.opacity='0'; flareCv.style.opacity='0'; rayU.uA.value=0; }
  _rf();
  if(inside&&girl) drawGhosts();
};
/* Reset level and To the box start outside */
const _rl=resetLevel; resetLevel=function(){ leaveRoom(false); return _rl(); };
const _gb=goToBox; goToBox=function(){ leaveRoom(false); return _gb(); };
})();
