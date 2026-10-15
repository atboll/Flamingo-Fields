/* Flamingo Fields 3D: the journey's end, on the 2D game's rules: the desert, the silver box with its glowing door, and the flamingos round it.

   The first time the kids fly along the feather road toward the moon, a coast point is laid far ahead along it (52000 game units, about 760 m).
   Half way there the field turns to desert (the dunes themselves are in index.html's groundAt, shared with the grass and the ground's paint).
   6250 units past the coast point stands the huge silver box, about 29 m on a side, square to the moon, with a tall narrow door in the face
   the kids come to. Its doorway is full of white light that pours out over the face, into the air and across the sand, pulsing gently.
   Its door is shut until the five rings in the fog round it are lit (rings.js). By the box the night waits. Round it, 26 flamingos are already there: standing, feeding,
   resting on one leg, and wandering slowly round on their own small errands.
   For testing (with #dev), the B key lays the journey's end just ahead of the kids. */

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
   It takes the gentler haze (SOFT_HAZE), so from far off it fades into the evening without washing out up close. */
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
        face*=mix(1.0, vNo.z>0.5 ? 1.15 : vNo.y>0.5 ? 1.05 : vNo.z<-0.5 ? 0.5 : 0.8, uNight);   /* by night the moon, behind it, lights its far face and top; the door's face falls deep into shade */
        outgoingLight*=face*(0.72+0.28*foot); }
      #include <output_fragment>`); };
/* the box, with a real opening in its face where the door is: the face toward the kids is three pieces round the doorway (left, right, above) */
const boxMesh=new THREE.Mesh(new THREE.BoxGeometry(BW,BH,BW),[silver,silver,silver,silver,silver,new THREE.MeshBasicMaterial({visible:false})]); boxMesh.position.y=BH/2; boxGroup.add(boxMesh);
{ const dw=DOOR_W*U, dh=DOOR_H*U, piece=(w,h,x,y)=>{ const g=new THREE.PlaneGeometry(w,h); g.rotateY(Math.PI); g.translate(x,y,-BW/2); const m=new THREE.Mesh(g,silver); boxMesh.add(m); };
  piece((BW-dw)/2,BH,-(BW+dw)/4,0); piece((BW-dw)/2,BH,(BW+dw)/4,0); piece(dw,BH-dh,0,dh/2); }
/* ---------- the box's shadow on the sand: from the sun by day and the moon by night, both behind it, so it falls toward the kids ----------
   The game's real shadows reach only a few metres round the kids, so this one is laid on the sand as a soft dark shape over the dunes,
   as long as the box (29 m) throws it from the light's height: about 140 m from the low sun, 70 m or more from the moon. */
const SH_NX=12, SH_NZ=36, shGeo=new THREE.BufferGeometry(), shPos=new Float32Array(SH_NX*SH_NZ*3), shCol=new Float32Array(SH_NX*SH_NZ*4), shIdx=[];
for(let j=0;j<SH_NZ-1;j++) for(let i=0;i<SH_NX-1;i++){ const a=j*SH_NX+i, b=a+SH_NX; shIdx.push(a,b,a+1, a+1,b,b+1); }
shGeo.setAttribute('position',new THREE.BufferAttribute(shPos,3)); shGeo.setAttribute('color',new THREE.BufferAttribute(shCol,4)); shGeo.setIndex(shIdx);
const boxShadow=new THREE.Mesh(shGeo,new THREE.MeshBasicMaterial({color:0xffffff, vertexColors:true, transparent:true, depthWrite:false, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-2}));
boxShadow.frustumCulled=false; boxShadow.renderOrder=1; boxGroup.add(boxShadow);
let shLen=-1;
function layShadow(len,dark){
  const m=boxGroup.matrixWorld, v=new THREE.Vector3(), base=boxGroup.position.y, BWh=BOX_HALF*U;
  if(Math.abs(len-shLen)>0.8){ shLen=len; boxGroup.updateMatrixWorld();
    for(let j=0;j<SH_NZ;j++) for(let i=0;i<SH_NX;i++){ const t=j/(SH_NZ-1), s=i/(SH_NX-1)*2-1, hw=BWh*(1+0.25*t), x=s*hw, z=-BWh-len*t, n=j*SH_NX+i;
      v.set(x,0,z).applyMatrix4(m); shPos[n*3]=x; shPos[n*3+1]=groundAt(v.x,v.z)-base+0.08; shPos[n*3+2]=z; }
    shGeo.attributes.position.needsUpdate=true; }
  for(let j=0;j<SH_NZ;j++) for(let i=0;i<SH_NX;i++){ const t=j/(SH_NZ-1), s=Math.abs(i/(SH_NX-1)*2-1), a=dark*(1-Math.pow(t,1.6))*(1-Math.pow(s,6))*(0.75+0.25*(1-t)), n=(j*SH_NX+i)*4;
    shCol[n]=0.08; shCol[n+1]=0.06; shCol[n+2]=0.13; shCol[n+3]=a; }   /* deep plum, softest at its far end and sides */
  shGeo.attributes.color.needsUpdate=true; }

/* the door, on the face toward the kids: a clean opening, no frame, full of white light that pours out of the box */
const DW=DOOR_W*U, DH=DOOR_H*U, FR=0.18, FD=0.35, front=-BW/2;   /* the box's local -z face looks back down the road */
const doorPane=new THREE.Mesh(new THREE.PlaneGeometry(DW,DH),new THREE.MeshBasicMaterial({color:0xffffff, toneMapped:false, fog:false}));
Object.assign(doorPane.material,{polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-8});
doorPane.rotation.y=Math.PI; doorPane.position.set(0,DH/2,front+DOOR.tunnel-0.3); doorLight.add(doorPane);   /* at the far end of the passage (on the clouds, level2.js puts it back in the doorway) */
/* the passage behind the doorway: walls, floor and ceiling of pure white light, drawn with the door's light, open at the door */
const tunnel=new THREE.Mesh((()=>{ const g=new THREE.BoxGeometry(DW,DH,DOOR.tunnel); g.translate(0,DH/2+0.5,front+DOOR.tunnel/2); return g;   /* its floor just above the sand */ })(),
  new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.BackSide, toneMapped:false, fog:false, transparent:true}));
tunnel.visible=false; doorLight.add(tunnel);
doorPane.material.transparent=true;   /* it fades in as the door opens (rings.js) */
/* the shut door: a dark, slightly sunk panel in the face, lost in the fog with the box until the rings are lit (rings.js) */
const doorShutMesh=new THREE.Mesh(new THREE.PlaneGeometry(DW,DH),new THREE.MeshStandardMaterial({color:0x2c2f37, metalness:0.35, roughness:0.75}));
doorShutMesh.material.defines={SOFT_HAZE:''}; doorShutMesh.rotation.y=Math.PI; doorShutMesh.position.set(0,DH/2,front-0.03); boxGroup.add(doorShutMesh);
/* The door's light, as the 2D game draws it. Its bloom is laid in screen terms round the doorway: a tight white core, a wide soft haze
   that pales most of the box's face, and a low wide flare, none smaller than a beacon should be from far off, and thinner when the door is
   seen edge-on. Its light lies on the sand in a long fan widening outward from the threshold, brightest down its middle, gone at its sides.
   Anything standing in front of it (the kids, the flamingos) is left as a dark shape against it: they mark where they are drawn (stencil 2),
   and the light is not laid over those places. As the kids come up to the door, facing it, the light grows until it takes the whole view. */
function softTex(stops,w=128,h=128){ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'), gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.min(w,h)/2);
  for(const [o,col] of stops) gr.addColorStop(o,col); g.fillStyle=gr; g.fillRect(0,0,w,h); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
const NOT_FRONT={ stencilWrite:true, stencilRef:2, stencilFuncMask:2, stencilFunc:THREE.NotEqualStencilFunc, stencilZPass:THREE.KeepStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp };
const bloomMat=map=>new THREE.SpriteMaterial({map, transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending, fog:false, ...NOT_FRONT});
/* the glow round the doorway follows its shape: brightest right at its edges, falling away over the face and the sand as a tall soft halo,
   never brighter than the doorway itself, so the door stays a crisp white rectangle with light pouring out of it */
const GLOW_W=BW*0.98, GLOW_H=BH*0.98;   /* the whole face and no more: nothing sticks out past the box's edges */
const doorGlowTex=(()=>{ const N=256, c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d'), im=g.createImageData(N,N), px=im.data;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const mx=(x+0.5)/N*GLOW_W-GLOW_W/2, my=(1-(y+0.5)/N)*GLOW_H;   /* metres across the face, and up from the sand */
    const dx=Math.max(0,Math.abs(mx)-DW/2), dy=Math.max(0,my-DH), d=Math.hypot(dx,dy*0.8), inDoor=dx===0&&dy===0;
    const a=Math.min(1,0.14*Math.exp(-d/1.0)+0.3*Math.exp(-d/5)+0.22*Math.exp(-d/14));   /* full strength right up to (and under) the doorway, so no dark rim shows round it */
    const fadeEdge=Math.min(1,(GLOW_W/2-Math.abs(mx))/(GLOW_W*0.12))*Math.min(1,(GLOW_H-my)/(GLOW_H*0.15));   /* nothing left at the plane's own edges */
    const i=(y*N+x)*4; px[i]=px[i+1]=255; px[i+2]=250; px[i+3]=Math.round(255*a); }   /* the plane is the face itself now, so no fade at its edges (that made the face look rounded) */
  g.putImageData(im,0,0); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; })();
const doorGlow=new THREE.Mesh(new THREE.PlaneGeometry(GLOW_W,GLOW_H),new THREE.MeshBasicMaterial({map:doorGlowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, ...NOT_FRONT}));
doorGlow.material.polygonOffset=true; doorGlow.material.polygonOffsetFactor=-2; doorGlow.material.polygonOffsetUnits=-8;   /* drawn clear of the face, so from far off the two never flicker in patches */
doorGlow.rotation.y=Math.PI; doorGlow.position.set(0,GLOW_H/2,front-0.3); doorGlow.renderOrder=6; doorLight.add(doorGlow);
/* from far off the doorway is only a few pixels: a soft beacon that never shrinks below about 40 pixels keeps it steady, and gives way to the door's own glow as you come near */
const doorBeacon=new THREE.Sprite(bloomMat(softTex([[0,'rgba(255,255,252,.7)'],[0.25,'rgba(255,253,244,.25)'],[0.6,'rgba(255,253,244,.06)'],[1,'rgba(255,253,244,0)']])));
doorBeacon.position.set(0,DH*0.5,front-0.2); doorBeacon.renderOrder=6; doorLight.add(doorBeacon);
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
/* and what stands in front, as in the 2D game: nearer the door they lose their colours and stand dark against the light,
   then, right up at it, fade into the white until they are only faint shapes. Two passes over just those places (stencil 2). */
const ONLY_FRONT={ stencilWrite:true, stencilRef:2, stencilFuncMask:2, stencilFunc:THREE.EqualStencilFunc, stencilZPass:THREE.KeepStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp };
const frontU={uK:{value:0}, uFade:{value:0}};
const frontDark=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:frontU, transparent:true, depthTest:false, depthWrite:false, ...ONLY_FRONT,
  vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform float uK; void main(){ gl_FragColor=vec4(vec3(33.0,29.0,47.0)/255.0, 0.8*uK); }`}));
const frontFade=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:Object.assign({},washU,frontU), transparent:true, depthTest:false, depthWrite:false, ...ONLY_FRONT,
  vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform vec2 uC, uSize; uniform float uR, uM, uDpr, uFade;
    void main(){ vec2 p=vec2(gl_FragCoord.x, uSize.y*uDpr-gl_FragCoord.y)/uDpr; float t=length(p-uC)/uR;
      float a = t<0.5 ? mix(min(1.0,0.9*uM),0.5*uM*uM,t/0.5) : mix(0.5*uM*uM,0.0,clamp((t-0.5)/0.5,0.0,1.0));
      float W=a+pow(clamp(uM/0.93,0.0,1.0),2.6)*(1.0-a);              /* how white the light round them is here */
      gl_FragColor=vec4(1.0,1.0,250.0/255.0, W*uFade); }`}));
for(const [m,o] of [[frontDark,1],[frontFade,2]]){ m.frustumCulled=false; m.renderOrder=o; washScene.add(m); }
/* each kid fading into the white as they walk in (the girl is marked with the bit worth 4, the boy with the bit worth 8) */
const kidWhite=[4,8].map((bit,i)=>{ const u={uA:{value:0}}; const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:u, transparent:true, depthTest:false, depthWrite:false,
    stencilWrite:true, stencilRef:bit, stencilFuncMask:bit, stencilFunc:THREE.EqualStencilFunc, stencilZPass:THREE.KeepStencilOp, stencilFail:THREE.KeepStencilOp, stencilZFail:THREE.KeepStencilOp,
    vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`, fragmentShader:`uniform float uA; void main(){ gl_FragColor=vec4(1.0,1.0,250.0/255.0,uA); }`}));
  m.frustumCulled=false; m.renderOrder=3+i; washScene.add(m); return u; });
/* and at the very crossing, white over everything, flamingos and all (level2.js sets it) */
const allWhite={uA:{value:0}};
{ const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:allWhite, transparent:true, depthTest:false, depthWrite:false,
    vertexShader:`void main(){ gl_Position=vec4(position.xy,0.0,1.0); }`, fragmentShader:`uniform float uA; void main(){ gl_FragColor=vec4(1.0,1.0,250.0/255.0,uA); }`}));
  m.frustumCulled=false; m.renderOrder=10; washScene.add(m); }
const washCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
/* what stands in front of the light marks itself (stencil 2): the kids and every flamingo */
const FRONT_MARK={ stencilWrite:true, stencilRef:2, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp };
/* the bit worth 2 means 'stands in front of the light'; the kids also set the bit worth 4 (so they write 6) */
function markFront(root,ref){ root.traverse(n=>{ if(n.isMesh) for(const m of [].concat(n.material)) Object.assign(m,FRONT_MARK,ref?{stencilRef:ref}:{}); }); }
let doorNear=0, doorIn=0, doorPass=0;   /* doorPass: how far (m) the girl has walked in past the door's face */
/* ---------- laying the journey's end ---------- */
let coastA=0;
const shore=[];
function makeCoast(gx,gz){
  shLen=-1; COAST.on=true; COAST.x=gx; COAST.z=gz; uCoast.value.set(gx,gz,1,0); coastA=0;
  groundNear.userData.cx=groundFar.userData.cx=NaN;            /* the ground is laid again with its dunes */
  const c=boxC(), wx=-c[0]*U, wz=c[1]*U, base=groundAt(wx,wz)-30*U;
  for(const G of [boxGroup,doorLight]){ G.position.set(wx,base,wz); G.rotation.set(0,-SUN_B,0); G.visible=true; }
  dropFan(0);
  /* the flamingos already there, round the box */
  makeRings();   /* the fog, the five rings, and the door shut (rings.js) */
  shore.length=0;
  for(let i=0;i<26;i++){ const lat=(h2(i,201)-0.5)*5600, cs=h2(i,205)<0.25?SHORE+8+h2(i,207)*24:SHORE-40-Math.pow(h2(i,203),2)*850, p=shorePos(lat,cs), a=h2(i,209)*6.283;
    shore.push(shoreBird(p[0],p[1],Math.sin(a),Math.cos(a),lat,cs,100+i)); }
  makeShoreBirds();
}
/* the crater is there from the start: its box CRATER.dist from where the kids begin, toward the moon (settings.js) */
function layCrater(){ const d=CRATER.dist/U-SHORE; makeCoast(SUNDX_G*d, SUNDZ_G*d); }
function clearCoast(){ clearRings(); seaPart=0; partRanges(0); washU.uM.value=0; COAST.on=false; uCoast.value.set(0,0,0,0); boxGroup.visible=doorLight.visible=false; shore.length=0; for(const b of SB) b.o.visible=false; groundNear.userData.cx=groundFar.userData.cx=NaN; }
/* the "To the box" button, for testing: the kids on the ground about 45 m in front of the door, facing it (the box is laid first if it is not there yet),
   with the rings already lit and the door open */
function goToBox(){
  if(!girl) return;
  leaveLevel2();   // it starts from level 1
  if(!COAST.on){ const P=girl.P, gx=-P.x/U, gz=P.z/U, d=8000-SHORE; makeCoast(gx+SUNDX_G*d, gz+SUNDZ_G*d); }
  solveRings(); coastA=1; const c=boxC(), d=BOX_HALF+3100, gx=c[0]-SUNDX_G*d, gz=c[1]-SUNDZ_G*d;
  [[girl,0,0],[boy,1.0,-1.3]].forEach(([K,ox,oz])=>Object.assign(K.P,{x:-gx*U+ox, z:gz*U+oz, y:0, vy:0, h:-SUN_B, turn:0, bank:0, pitch:0, spd:0, state:'ground'}));
  events.length=0; placeCam(girl,0,true);
}
/* the B key, for testing (with the dev switch, on level 1): the box about 120 m ahead, the kids already out on the sand */
addEventListener('keydown',e=>{ if((e.key!=='b'&&e.key!=='B')||!girl||!DEV.on||LEVEL!==1) return; const P=girl.P, gx=-P.x/U, gz=P.z/U, d=8000-SHORE; makeCoast(gx+SUNDX_G*d, gz+SUNDZ_G*d); coastA=1;
  P.h=-SUN_B; boy.P.h=-SUN_B; placeCam(girl,0,true); });

/* ---------- each frame ---------- */
const _dsp=new THREE.Vector3();
let arrived=false, marked=false;
/* one of your flock leaves you for the box: it comes down if it is flying, and from then on wanders, feeds and rests with the others */
function mateToShore(m){ const c=boxC(), dx=m.x-c[0], dz=m.z-c[1], al=dx*SUNDX_G+dz*SUNDZ_G, l=dx*SUNDZ_G-dz*SUNDX_G, th=Math.atan2(l,-al);
  Object.assign(m,{shore:true, homeLat:th*BOX_RING+(h2(m.id,41)-0.5)*600, homeCs:SHORE-40-Math.pow(h2(m.id,43),2)*850, wait:0, feed:0, eats:false, n:0, pace:30, rest:0, rests:h2(m.id,13)<0.7});
  const p=shorePos(m.homeLat,m.homeCs); m.tx=p[0]; m.tz=p[1]; }
function updateDesert(dt,time){
  if(!marked && FL.ready && girl){ marked=true; markFront(girl.root,6); markFront(boy.root,10); markFront(FL.birds[0].o); }
  /* the first flight along the road toward the moon lays the journey's end far ahead */
  if(!COAST.on && pathOn && girl.P.state==='fly'){ const P=girl.P, gx=-P.x/U, gz=P.z/U; makeCoast(gx+SUNDX_G*COAST_DIST, gz+SUNDZ_G*COAST_DIST); }
  if(!COAST.on) return;
  coastA=Math.min(1,coastA+dt/8);
  /* however the kids come to the box, the mountains have finished parting by the time they near it (the 2D game's rule) */
  { const P=girl.P, al=(-P.x/U-COAST.x)*SUNDX_G+(P.z/U-COAST.z)*SUNDZ_G; seaPart=Math.max(seaPart,clamp(1+(al+2200)/(COAST_DIST-2200),0,1)); partRanges(seaPart); }
  const c=boxC(), top=groundAt(-c[0]*U,c[1]*U)/U-30+BOX_H;
  /* nobody passes through the box, and the kids keep a step clear of it; but once the door is open they can walk in through it,
     along a short passage of light as wide as the doorway */
  doorPass=0; kidWhite[0].uA.value=kidWhite[1].uA.value=0;
  for(const K of [girl,boy]){ const P=K.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], v=dx*SUNDX_G+dz*SUNDZ_G, Rr=BOX_HALF+80; let u=dx*SUNDZ_G-dz*SUNDX_G;
    const passage=doorOpen>0.95 && Math.abs(u)<DOOR_W*0.5 && v<-BOX_HALF+DOOR.tunnel/U && P.y/U<DOOR_H;
    if(passage){ if(v>-BOX_HALF-80){ const cu=clamp(u,-DOOR_W*0.38,DOOR_W*0.38); if(cu!==u){ const du=cu-u; P.x=-(gx+SUNDZ_G*du)*U; P.z=(gz-SUNDX_G*du)*U; u=cu; } }   // inside, kept between the doorway's sides
      const pass=Math.max(0,(v+BOX_HALF)*U); if(K===girl) doorPass=pass; if(v>-BOX_HALF+DOOR.tunnel/U-60){ const dv=-BOX_HALF+DOOR.tunnel/U-60-v; P.x=-(gx+SUNDX_G*dv)*U; P.z=(gz+SUNDZ_G*dv)*U; } continue; }   // fading into the white; the passage's end holds them
    if(Math.abs(u)<Rr && Math.abs(v)<Rr && groundAt(P.x,P.z)/U+P.y/U<top-45){ const pu=Rr-Math.abs(u), pv=Rr-Math.abs(v); let du=0, dv=0; if(pu<pv) du=(u<0?-1:1)*pu; else dv=(v<0?-1:1)*pv;
      const nx=gx+SUNDZ_G*du+SUNDX_G*dv, nz=gz-SUNDX_G*du+SUNDZ_G*dv; P.x=-nx*U; P.z=nz*U; } }
  if(boxDist(-girl.P.x/U,girl.P.z/U)<9000 && night>0.5) dayOffset-=dt;   // by the box the night waits
  /* the door: white, pulsing gently */
  const A=clamp(coastA*1.5,0,1)*(0.9+0.1*Math.sin(time*1.3))*doorOpen;   // shut until the rings are lit (rings.js)
  doorPane.material.color.setScalar(0.9+0.1*Math.sin(time*1.3)); doorPane.material.opacity=doorOpen; doorPane.visible=false;   /* on level 1 the passage itself is the white (the panel is the lone door's on the clouds) */ doorShutMesh.visible=doorOpen<0.999;
  tunnel.visible=doorOpen>0.001; tunnel.material.opacity=doorOpen; tunnel.material.color.setScalar(0.92+0.08*Math.sin(time*1.3));
  /* how near the kids stand in front of the door, and facing it: 0 far off, 1 right at it (the 2D game's rule) */
  { const P=girl.P, gx=-P.x/U, gz=P.z/U, dx=gx-c[0], dz=gz-c[1], u=dx*SUNDZ_G-dz*SUNDX_G, v=dx*SUNDX_G+dz*SUNDZ_G, lat=Math.max(0,Math.abs(u)-DOOR_W*0.3)*1.7; let tg=0;
    if(v<-BOX_HALF+DOOR.tunnel/U && P.y/U<DOOR_H*1.6){ /* (in the passage too) */ cam.getWorldDirection(_dsp); const fx=-_dsp.x, fz=_dsp.z, fm=Math.hypot(fx,fz)||1, facing=clamp(((fx*SUNDX_G+fz*SUNDZ_G)/fm-0.15)/0.6,0,1);
      tg=clamp(1-(Math.hypot(Math.max(0,-v-BOX_HALF),lat)-95)/1700,0,1)*facing*doorOpen; }
    doorNear+=(tg-doorNear)*(1-Math.exp(-dt*6)); if(doorNear<0.002&&tg===0) doorNear=0;
    /* in the doorway itself: right at the face, between its sides */
    const at=(doorOpen>0.95 && v<-BOX_HALF && -v-BOX_HALF<170 && Math.abs(u)<DOOR_W*0.55 && P.y/U<DOOR_H)?1:0; doorIn+=(at-doorIn)*(1-Math.exp(-dt*(at?2.5:4))); }
  const near=doorNear;
  /* seen edge-on the light thins; from behind the box there is none */
  const dw=doorLight.localToWorld(_dsp.set(0,DH*0.5,front)), toCam=cam.position.clone().sub(dw), nrm=new THREE.Vector3(Math.sin(SUN_B),0,-Math.cos(SUN_B)), cv=toCam.dot(nrm), dist=toCam.length(), edge=cv>0?clamp(cv/dist*3,0.25,1):0;
  const focal=0.5*innerHeight/Math.tan(cam.fov*Math.PI/360), pxPerM=focal/Math.max(1,dist), dh=DH*pxPerM;
  doorGlow.material.opacity=A*edge*(0.6+0.4*night)*(1+0.6*near); doorGlow.visible=edge>0;
  if(Math.abs((fan.userData.near??-1)-near)>0.02) dropFan(near);
  lightFan(0.3*A*edge*edge*(1+1.6*near)*4);   /* the 2D game's bands each lap half over the next, so twice its strength */
  /* the light taking the view */
  { const sp=dw.clone().project(cam), W=innerWidth, H=innerHeight; washU.uC.value.set((sp.x+1)/2*W,(1-sp.y)/2*H); washU.uR.value=Math.max(W,H)*(0.25+1.1*near); washU.uM.value=Math.min(near*A,0.6)+0.15*doorIn;   /* bright at the door, never white: it turns white only as the kids walk in past its face (level2.js) */ washU.uSize.value.set(W,H); washU.uDpr.value=R.getPixelRatio(); }
  /* the beacon and where the white is centred are set just before drawing (placeDoorScreen), from this frame's camera */
  { const k=Math.pow(near*A,0.8); frontU.uK.value=k; frontU.uFade.value=0; }   /* dark against the light, silhouettes right up to and into the doorway */
  /* your flock, come this close, wanders off to join the flamingos of the box */
  if(near>0.3 && !arrived){ arrived=true; for(const m of mates) if(m.ring===undefined) mateToShore(m); }   // (those standing in the rings stay there)
  /* its shadow: from the low sun by day, from the moon by night (how high the moon stands, as night.js has it) */
  { const q=46/650, el=Math.max(0.12,Math.atan(((0.5*0.64+q)*moonUp-q)/0.9)), lenM=Math.min(160,BH/Math.tan(el)), lenS=BH/Math.tan(0.2);
    layShadow(lenS+(lenM-lenS)*night, 0.5*(1-night)+0.6*night*clamp(moonUp*3,0,1)); }
  /* the box takes the colour of the hour: a cooler, dimmer mirror by night */
  silver.envMapIntensity=0.55-0.25*night; boxNight.value=night;
  landWildFlock(time); updateShore(dt); placeShore(dt);
}

/* ---------- the flamingos round the box: the 2D game's shore birds ---------- */
function shorePos(lat,cs){ const c=boxC(), th=lat/BOX_RING, r=BOX_HALF*1.42+220+clamp(SHORE+40-cs,0,1100), al=-Math.cos(th)*r, l=Math.sin(th)*r;
  return [c[0]+SUNDX_G*al+SUNDZ_G*l, c[1]+SUNDZ_G*al-SUNDX_G*l]; }
function shoreBird(x,z,hx,hz,homeLat,homeCs,id,y,gv){ return {x,z,hx,hz,id,sp:0,homeLat,homeCs,tx:x,tz:z,wait:h2(id,7)*7,feed:0,eats:h2(id,11)<0.5,n:0,pace:30,rest:0,rests:h2(id,13)<0.7,y:y||0,open:(y||0)>6?1:0,gv:gv||0}; }
/* a bird still in the air (a wild flock landing) glides on and down, its wings folding just before it touches, then it is one of them */
function updateShore(dt){ for(const b of shore){
  if(b.y>0||b.gv>1){ const e=1-Math.exp(-dt*0.7); b.gv-=b.gv*e; b.x+=b.hx*b.gv*dt; b.z+=b.hz*b.gv*dt; b.sp=b.gv;
    b.y=Math.max(0,b.y-Math.max(30,b.y*0.5)*dt); b.open=b.y<28?Math.max(0,b.open-dt/0.8):1;
    if(b.y===0&&b.gv<=1){ b.gv=0; const p=shorePos(b.homeLat,b.homeCs); b.tx=p[0]; b.tz=p[1]; b.pace=60; b.wait=2+h2(b.id,17)*3; } continue; }   // down: they walk on up to the box, to their own spot round it
  stepShore(b,dt); } }
const boxLat=(gx,gz)=>{ const c=boxC(), dx=gx-c[0], dz=gz-c[1], al=dx*SUNDX_G+dz*SUNDZ_G, l=dx*SUNDZ_G-dz*SUNDX_G; return Math.atan2(l,-al)*BOX_RING; };
/* the 2D game's rule: a wild flock that comes in over the last stretch to the box lands there, and stays (up to SHORE_MAX birds) */
const SHORE_MAX=40;
function landWildFlock(time){
  const f=flock; if(!f||!COAST.on||!FL.ready) return;
  const al=(f.x-COAST.x)*SUNDX_G+(f.z-COAST.z)*SUNDZ_G; if(al<=SHORE-6500 || al>SHORE-BOX_HALF-900 || boxDist(f.x,f.z)>=4000) return;   // still out in front of the box, within about 60 m of it
  const n=BIRDS.length-(f.gave?1:0);
  for(let i=0;i<n && shore.length<SHORE_MAX;i++){ const o=BIRDS[i], ol=o[0]+Math.sin(time*0.23+BIRD_PH[i]*2)*13, of=o[1]+Math.sin(time*0.31+BIRD_PH[i]*5)*17;
    const bx=f.x+ol*f.dz+of*f.dx, bz=f.z-ol*f.dx+of*f.dz, id=400+shore.length, y=Math.max(60,f.y-groundAt(-bx*U,bz*U)/U);
    const b=shoreBird(bx,bz,f.dx,f.dz,boxLat(bx,bz)+(h2(id,3)-0.5)*500,SHORE-70-h2(id,5)*520,id,y,Math.max(420,f.sp)*(0.85+0.3*h2(id,9)));
    shore.push(b); const sb=SB[shore.length-1]; if(sb) sb.w={idle_A1:0,idle_B1:0,walk_A1:0,foraging_A1:0,fly_A1:1}; }   // already in the flying pose, so nothing jumps
  flock=null; nextFlock=time+50; }
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
  for(let i=0;i<SHORE_MAX;i++){ const o=THREE.SkeletonUtils.clone(proto); o.visible=false; scene.add(o); const mixer=new THREE.AnimationMixer(o), A={};
    for(const k of ['idle_A1','idle_B1','walk_A1','foraging_A1','fly_A1']){ A[k]=mixer.clipAction(FL.clips[k]); A[k].play(); A[k].setEffectiveWeight(0); A[k].time=h2(i,k.length*3)*FL.clips[k].duration; }
    A.fly_A1.timeScale=FLAP; SB.push({o,mixer,A,w:{idle_A1:1,idle_B1:0,walk_A1:0,foraging_A1:0,fly_A1:0},skip:0}); }
}
function placeShore(dt){
  if(!SB.length){ makeShoreBirds(); if(!SB.length) return; }
  const far=scene.fog.far*1.1;
  SB.forEach((b,i)=>{ const m=shore[i]; if(!m){ b.o.visible=false; return; }
    const x=-m.x*U, z=m.z*U; b.o.position.set(x,groundAt(x,z)+(m.y||0)*U+b.w.fly_A1*0.5,z); const vis=b.o.position.distanceTo(cam.position)<far; b.o.visible=vis; if(!vis) return;   /* in the flying pose the model hangs low: held up half a metre, as your flock */
    b.o.rotation.set(0,Math.atan2(-m.hx,m.hz),0);
    const fly=(m.open||0)>0.5||(m.y||0)>6;
    const want=fly?{walk_A1:0,foraging_A1:0,idle_B1:0,idle_A1:0,fly_A1:1}:{walk_A1:m.sp>0?1:0, foraging_A1:m.sp>0?0:m.feed, idle_B1:m.sp>0?0:m.rest*(1-m.feed), idle_A1:0, fly_A1:0}; if(!fly) want.idle_A1=Math.max(0,1-want.walk_A1-want.foraging_A1-want.idle_B1);
    const k=1-Math.exp(-dt*3); for(const n in b.w){ b.w[n]+=(want[n]-b.w[n])*k; b.A[n].setEffectiveWeight(b.w[n]); }
    b.A.walk_A1.timeScale=m.sp>40?clamp(m.sp*U/1.1,0.8,2.6):0.8;   // landing at a run, a longer stride
    /* far off, they move a little less often: every other frame beyond 60 m */
    const dist=b.o.position.distanceTo(cam.position); b.skip+=dt; if(dist<60||(b.skip>0.06)){ b.mixer.update(b.skip); b.skip=0; } });
}

/* ---------- the door's light on the screen, worked out after the camera has moved this frame (called just before drawing) ---------- */
const _sc=new THREE.Vector3(), _sd=new THREE.Vector3(), _sq=new THREE.Vector3();
function placeDoorScreen(){
  if(LEVEL===2) return placeDoorScreen2();   // the lone door on the clouds (level2.js)
  if(!COAST.on||!doorLight.visible) return;
  const W=innerWidth, H=innerHeight, q=H/650, focal=0.5*H/Math.tan(cam.fov*Math.PI/360);
  const dc=doorLight.localToWorld(_sd.set(0,DH*0.5,front)), toCam=_sc.copy(cam.position).sub(dc), nrm=new THREE.Vector3(Math.sin(SUN_B),0,-Math.cos(SUN_B));
  const cv=toCam.dot(nrm), dist=toCam.length(), edge=cv>0?clamp(cv/dist*3,0.25,1):0, pxPerM=focal/Math.max(1,dist), dh=DH*pxPerM, dwPx=DW*pxPerM;
  const A=clamp(coastA*1.5,0,1)*(0.9+0.1*Math.sin(clock*1.3))*doorOpen;
  const c=_sq.copy(dc).project(cam), cx=(c.x+1)/2*W, cy=(1-c.y)/2*H, ahead=c.z<1;
  /* the ground in front of the door: walk out from the camera toward the door's foot and keep the highest point any ground reaches on the screen */
  let clip=1e5; { const foot=doorLight.localToWorld(new THREE.Vector3(0,0.3,front)); for(let i=1;i<48;i++){ const t=Math.pow(i/48,1.6)*0.985, x=cam.position.x+(foot.x-cam.position.x)*t, z=cam.position.z+(foot.z-cam.position.z)*t;
      const v=_sq.set(x,groundAt(x,z),z).project(cam); if(v.z<1){ const y=(1-v.y)/2*H; if(y<clip) clip=y; } } }
  const shows=ahead&&edge>0;
  /* the far beacon: steady from far off, hidden when the ground in front covers the door */
  { const bp=Math.max(40,dh*1.4), far=clamp((dist-70)/90,0,1); doorBeacon.scale.set(bp/pxPerM,bp/pxPerM,1); doorBeacon.material.opacity=A*edge*far*(cy<clip?1:0); doorBeacon.visible=shows&&far>0&&cy<clip; }
  /* the white taking the view, centred on the door as it is on the screen now */
  washU.uC.value.set(cx,cy); washU.uSize.value.set(W,H); washU.uDpr.value=R.getPixelRatio();
}
