/* ---------- The puzzle at the box: the fog bank, the five rings, and the door opening ----------
   When the journey's end is laid, the box stands with its door shut and dark (the fog bank round it is switched off for now: PUZZLE.fog 0).
   Out in the dunes lie five rings of pale stones, each on the flattest sand near its spot, between the dune tops. Land in a ring (or walk into it) and the nearest of your flamingos walks to its
   middle and settles there; the light runs round the ring, stone by stone, and stays, breathing. Each lit ring thins the fog a fifth.
   When the fifth is lit, the last of the fog clears, the five flamingos turn to the box, and the door's light slowly comes on.
   From then on the door is the one it always was: walk into its light and you come out on the clouds of level 2.
   Settings: PUZZLE (settings.js). The loop (game.js) calls updateRings each frame on level 1. */

/* ---------- the fog bank: a flattened dome of fog over the box, laid over everything fogged (world.js puts it in the fog shaders) ---------- */
const BANK={x:0,y:0,z:0,w:0}, BANKR={x:1,y:1,z:0,w:0}, BANKVI={elements:new Float32Array(16)};   /* plain objects (not THREE vectors or matrices), so every material shares them, not a copy */
/* the camera's place and turn, given to the shaders directly: three.js keeps cameraPosition and viewMatrix up to date only for some kinds of material */
function placeBank(){ cam.updateMatrixWorld(); BANKVI.elements.set(cam.matrixWorld.elements); }
for(const k in THREE.ShaderLib){ const u=THREE.ShaderLib[k].uniforms; if(u&&u.fogColor){ u.uBank={value:BANK}; u.uBankR={value:BANKR}; u.uBankVI={value:BANKVI}; } }
for(const g of grassAll){ Object.assign(g.material.uniforms,{uBank:{value:BANK}, uBankR:{value:BANKR}, uBankVI:{value:BANKVI}}); }
/* how much of the line from the eye to this point lies inside the dome, and so how much fog it gathers there */
THREE.ShaderChunk.bank_fragment=`
  #ifndef BANK_COLOR
  #define BANK_COLOR fogColor
  #endif
  if(uBank.w>0.0){ vec3 eye=uBankVI[3].xyz, sc=vec3(uBankR.x,uBankR.y,uBankR.x), ro=(eye-uBank.xyz)/sc, rd=(vFogW-eye)/sc;
    float a=dot(rd,rd), b=dot(ro,rd), c=dot(ro,ro)-1.0, disc=b*b-a*c;
    if(disc>0.0 && a>1e-8){ float s=sqrt(disc), t0=max(0.0,(-b-s)/a), t1=min(1.0,(-b+s)/a);
      if(t1>t0){ float len=(t1-t0)*length(vFogW-eye); if(t0<=0.0) len=max(0.0,len-12.0);   /* inside it, the nearest 12 m stay clear: the kids and what is right round them */ gl_FragColor.rgb=mix(gl_FragColor.rgb,BANK_COLOR,1.0-exp(-len*uBank.w)); } } }`;

/* the sky, the far ranges and the treelines are not fogged (they are painted straight to the screen), but the bank must lie over them too,
   or the box would stand out against them: seen through the bank they take its colour, so from outside it is a pale low dome */
/* (the game's fog is laid after the colours are made ready for the screen, so its colour lands on the screen as these very numbers: match them) */
const BANK_RAW='#define BANK_COLOR vec3('+scene.fog.color.toArray().map(c=>c.toFixed(4)).join(',')+')\nuniform vec4 uBank; uniform vec4 uBankR; uniform mat4 uBankVI; varying vec3 vFogW;\n';
Object.assign(skyMat.uniforms,{uBank:{value:BANK}, uBankR:{value:BANKR}, uBankVI:{value:BANKVI}});
skyMat.vertexShader=skyMat.vertexShader.replace('varying vec3 vDir; void main(){ vDir=position;','varying vec3 vDir; varying vec3 vFogW; void main(){ vDir=position; vFogW=(modelMatrix*vec4(position,1.0)).xyz;');
skyMat.fragmentShader=BANK_RAW+skyMat.fragmentShader.replace('gl_FragColor=vec4(col,1.0); }','gl_FragColor=vec4(col,1.0);\n#include <bank_fragment>\n}');
for(const m of [...rangeMeshes,...treelines]){ const prev=m.material.onBeforeCompile;
  m.material.onBeforeCompile=sh=>{ prev&&prev(sh); Object.assign(sh.uniforms,{uBank:{value:BANK}, uBankR:{value:BANKR}, uBankVI:{value:BANKVI}});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFogW;').replace('#include <project_vertex>','#include <project_vertex>\nvFogW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader=BANK_RAW+sh.fragmentShader.replace('#include <dithering_fragment>','#include <bank_fragment>\n#include <dithering_fragment>'); };
  m.material.customProgramCacheKey=()=>'bank'; }

/* ---------- the rings ---------- */
const RING_N=5, STONES=14;
/* where they lie, in metres from the box: along the way the kids come (negative: on their side of it) and across it; and whether each looks for a crest or a dip nearby */
const RING_AT=[[-120,-45],[-55,140],[105,170],[185,-75],[-30,-205]];   /* all on the crater floor */   /* each then settles on the flattest sand within about 40 m (between the dune tops) */
const stoneGeo=new THREE.DodecahedronGeometry(1,0);
const stoneMat=new THREE.MeshLambertMaterial({color:0xffffff});
const stones=new THREE.InstancedMesh(stoneGeo,stoneMat,RING_N*STONES); stones.visible=false; stones.frustumCulled=false; scene.add(stones);
stones.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(RING_N*STONES*3),3);
const STONE_PALE=new THREE.Color('#e9e2d0').convertSRGBToLinear(), STONE_LIT=new THREE.Color('#fff4d8').convertSRGBToLinear().multiplyScalar(1.35);
/* each ring's light on the sand: a disc of rings and spokes laid over the dunes, coloured on the processor, drawn with the door's light (after the night grade) */
const GA=48, GR=10, GLOW_R=7;
const glowMat=new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, toneMapped:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4});
const rings=[];
const beamGeo=new THREE.CylinderGeometry(1,1,1,40,1,true); beamGeo.translate(0,0.5,0);   /* scaled to the ring's width and the column's height */
for(let i=0;i<RING_N;i++){
  const g=new THREE.BufferGeometry(), pos=new Float32Array((GA+1)*(GR+1)*3), col=new Float32Array((GA+1)*(GR+1)*3), idx=[];
  for(let a=0;a<GA;a++) for(let r=0;r<GR;r++){ const p=a*(GR+1)+r, q=p+GR+1; idx.push(p,q,p+1, p+1,q,q+1); }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3).setUsage(THREE.DynamicDrawUsage)); g.setIndex(idx);
  const m=new THREE.Mesh(g,glowMat); m.frustumCulled=false; m.visible=false; m.renderOrder=5; lightScene.add(m);
  /* and its column of light: a round shaft as wide as the ring, straight up into the sky, brightest through its middle and soft at its sides,
     fading away at the top. Drawn with the door's light, so it is bright by night; what stands in it (marked as standing in front of the light) is left dark against it. */
  const bm=new THREE.Mesh(beamGeo,new THREE.ShaderMaterial({uniforms:{uRise:{value:0}, uA:{value:0}, uH:{value:1}}, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, ...NOT_FRONT,
    vertexShader:`varying float vY; varying float vFace; void main(){ vY=position.y; vec4 w=modelMatrix*vec4(position,1.0); vec3 n=normalize(mat3(modelMatrix)*normal), v=normalize(cameraPosition-w.xyz);
      vFace=abs(dot(normalize(n.xz),normalize(v.xz))); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uRise, uA, uH; varying float vY; varying float vFace;
      void main(){ float t=vY/uH; if(t>uRise) discard; float top=1.0-smoothstep(uRise-0.12,uRise,t)*step(uRise,0.999);
        float a=uA*pow(vFace,2.4)*(1.0-smoothstep(0.35,1.0,t))*(0.6+0.4*exp(-vY/6.0))*top;   /* bright most of the way up, fading softly toward its top, far up in the sky */ a=a/(1.0+0.35*a);   /* soft at its sides, fading higher up, never a hard white bar */   /* through its middle, fading upward, a little brighter at the foot */
        if(a<0.002) discard; gl_FragColor=vec4(vec3(1.0,0.96,0.86)*a,1.0); }`}));
  bm.frustumCulled=false; bm.visible=false; bm.renderOrder=6; lightScene.add(bm);
  rings.push({glow:m, beam:bm, rise:0, gx:0, gz:0, x:0, y:0, z:0, bird:null, light:0, lit:false, chimed:false}); }
let ringsOn=false, solved=false, solvedAt=-1, bankK=0, doorOpen=1, ringLeftT=-9;

/* laid with the journey's end (desert.js): the rings in place on the dunes, the fog thick, the door shut */
function makeRings(){
  const c=boxC(), r=rng(91), M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), S=new THREE.Vector3(), T=new THREE.Vector3();
  const at=(al,l)=>[c[0]+SUNDX_G*al+SUNDZ_G*l, c[1]+SUNDZ_G*al-SUNDX_G*l];
  /* how uneven the sand is under a ring: the spread of heights over the ring and just outside it */
  const bumpy=(wx,wz)=>{ let lo=1e9, hi=-1e9; for(let k=0;k<=12;k++){ const r0=k===0?0:k<=6?PUZZLE.ringR*0.6:PUZZLE.ringR*1.4, a=k*1.047, h=groundAt(wx+Math.cos(a)*r0,wz+Math.sin(a)*r0); if(h<lo) lo=h; if(h>hi) hi=h; } return hi-lo; };
  rings.forEach((R,i)=>{ const [al,l]=RING_AT[i]; let best=at(al/U,l/U), bs=1e9;
    for(let a=-10;a<=10;a++) for(let b=-10;b<=10;b++){ const p=at((al+a*4)/U,(l+b*4)/U), s=bumpy(-p[0]*U,p[1]*U)+0.002*Math.hypot(a,b); if(s<bs){ bs=s; best=p; } }
    R.flat=bs;
    R.gx=best[0]; R.gz=best[1]; R.x=-R.gx*U; R.z=R.gz*U; R.y=groundAt(R.x,R.z); R.bird=null; R.light=0; R.lit=false; R.chimed=false;
    /* the stones: pale, rounded, each its own size, half sunk in the sand */
    for(let k=0;k<STONES;k++){ const a=(k+(r()-0.5)*0.3)/STONES*Math.PI*2, rr=PUZZLE.ringR*(0.95+r()*0.1), sx=R.x+Math.cos(a)*rr, sz=R.z+Math.sin(a)*rr, s=0.32+r()*0.2;
      Q.setFromEuler(E.set(r()*0.6,r()*6.28,r()*0.6)); M.compose(T.set(sx,groundAt(sx,sz)+s*0.15,sz),Q,S.set(s*1.25,s*0.7,s)); stones.setMatrixAt(i*STONES+k,M); stones.setColorAt(i*STONES+k,STONE_PALE); }
    /* the light's disc, over the dunes' own shape */
    const P=R.glow.geometry.attributes.position.array;
    for(let a=0;a<=GA;a++) for(let q=0;q<=GR;q++){ const th=a/GA*Math.PI*2, rq=q/GR*GLOW_R, x=R.x+Math.cos(th)*rq, z=R.z+Math.sin(th)*rq, n=(a*(GR+1)+q)*3;
      P[n]=x; P[n+1]=groundAt(x,z)+0.05; P[n+2]=z; }
    R.glow.geometry.attributes.position.needsUpdate=true; R.glow.visible=true;
    R.rise=0; R.beam.visible=false; R.beam.position.set(R.x,R.y-0.5,R.z); R.beam.scale.set(PUZZLE.ringR,PUZZLE.beamH,PUZZLE.ringR); R.beam.material.uniforms.uH.value=PUZZLE.beamH; });
  stones.instanceMatrix.needsUpdate=true; stones.instanceColor.needsUpdate=true; stones.visible=true;
  ringsOn=true; solved=false; solvedAt=-1; bankK=1; doorOpen=0;
}
/* the journey's end cleared (Reset level): no rings, no fog */
function clearRings(){ ringsOn=false; stones.visible=false; for(const R of rings){ R.glow.visible=false; R.beam.visible=false; R.rise=0; } shadeBack(); BANK.w=0; bankK=0; doorOpen=1; solved=false; }
/* solved at once (the "To the box" button and the test pages that start at the door) */
function solveRings(){ if(!ringsOn) return; solved=true; solvedAt=-99; bankK=0; doorOpen=1; arrived=true;
  for(const R of rings){ R.light=1; R.lit=true; R.chimed=true; R.rise=1; } }

/* one of your flock settles in a ring: it walks to the middle and stands there, resting, for good */
function sendToRing(R,m){ R.bird=m; m.ring=rings.indexOf(R);
  Object.assign(m,{shore:true, tx:R.gx, tz:R.gz, pace:55, wait:1e9, feed:0, eats:false, rests:true, rest:0, n:0}); ringLeftT=clock; }
function freeMate(){ const P=girl.P, lx=-P.x/U, lz=P.z/U; let best=null, bd=1e9;
  for(const m of mates){ if(m.ring!==undefined) continue; const d=Math.hypot(m.x-lx,m.z-lz); if(d<bd){ bd=d; best=m; } } return best; }

/* ---------- each frame (level 1) ---------- */
function updateRings(dt,time){
  /* on the clouds of level 2 none of it is there (Reset level lays it all again) */
  const here=ringsOn&&LEVEL===1; stones.visible=here; for(const R of rings){ R.glow.visible=here; if(!here) R.beam.visible=false; }
  if(!here){ BANK.w=0; return; }
  const P=girl.P;
  /* a kid down on the sand inside an empty ring leaves a flamingo there */
  if(!solved && (P.state==='ground'||P.state==='touch') && P.y<0.3)
    for(const R of rings){ if(R.bird) continue; if(Math.hypot(P.x-R.x,P.z-R.z)<PUZZLE.ringR+0.6){ const m=freeMate(); if(m) sendToRing(R,m); } }
  /* once its flamingo stands in the middle, the ring brightens all at once, then its column of light rises */
  let lit=0;
  rings.forEach((R,i)=>{ const m=R.bird;
    if(m && !R.lit && m.y<=0.01 && Math.hypot(m.x-R.gx,m.z-R.gz)<25) R.lit=true;
    if(R.lit){ R.light=Math.min(1,R.light+dt/PUZZLE.lightTime); if(R.light>=1){ if(R.rise===0) roadSound(); R.rise=Math.min(1,R.rise+dt/PUZZLE.beamTime); }   // the beam starts: the feather road's sound (road.js) if(!R.chimed){ R.chimed=true; chime([0,3,5,7,12][Math.min(4,rings.filter(q=>q.chimed).length-1)]); } }
    if(R.light>=1) lit++; });
  /* five: the fog lifts, the flamingos turn to the box, and the door's light comes on */
  if(!solved && lit===RING_N){ solved=true; solvedAt=time; arrived=true; [12,16,19].forEach((n,q)=>setTimeout(()=>chime(n),400+q*160));
    const c=boxC(); for(const R of rings){ const m=R.bird; if(!m) continue; const dx=c[0]-m.x, dz=c[1]-m.z, d=Math.hypot(dx,dz)||1; m.hx=dx/d; m.hz=dz/d; m.rest=0; m.rests=false; } }
  const want=solved?0:1-0.2*lit; bankK+=(want-bankK)*(1-Math.exp(-dt*(solved?0.7:1.2))); if(bankK<0.002) bankK=0;
  if(solved && solvedAt>-99 && time-solvedAt>2.5) doorOpen=Math.min(1,doorOpen+dt/4);
  /* the bank: centred on the box, on the sand */
  const bp=boxGroup.position; BANK.x=bp.x; BANK.y=bp.y; BANK.z=bp.z; BANK.w=PUZZLE.fog*bankK; BANKR.x=PUZZLE.fogR; BANKR.y=PUZZLE.fogH;
  /* the stones and their light */
  rings.forEach((R,i)=>{ const on=ease(R.light); for(let k=0;k<STONES;k++) stones.setColorAt(i*STONES+k,_sc2.copy(STONE_PALE).lerp(STONE_LIT,on)); });
  stones.instanceColor.needsUpdate=true;
  rings.forEach((R,i)=>{ paintGlow(R,i,time);
    /* the column: rising, bright, breathing very slightly; brighter by night */
    const u=R.beam.material.uniforms, rs=ease(R.rise); R.beam.visible=rs>0.001; u.uRise.value=rs; u.uA.value=(PUZZLE.beamDay+(PUZZLE.beamNight-PUZZLE.beamDay)*night)*(0.94+0.06*Math.sin(time*1.4+i*1.7)); });
  /* what stands in a column goes dark against it: the ring's flamingo, and the kids while they are in it */
  rings.forEach(R=>{ if(R.bird) shadeBird(R.bird,ease(R.rise)); });
  for(const K of [girl,boy]){ let k=0; for(const R of rings){ if(R.rise<=0) continue; const d=Math.hypot(K.P.x-R.x,K.P.z-R.z); k=Math.max(k,ease(R.rise)*clamp((PUZZLE.ringR+0.8-d)/1.6,0,1)); } shadeKid(K,k); } }
const ease=t=>t*t*(3-2*t);
/* turning a figure dark: its colours pulled down toward a deep plum. A ring's flamingo gets its own copies of the flock's shared materials
   (keeping their shader changes); the kids' materials are their own already, so they are darkened in place. All put back on Reset level. */
const SIL=new THREE.Color('#2a2234').convertSRGBToLinear(), shaded=[];
function shadeRoot(o,k,copy){
  if(!o.userData.sil){ o.userData.sil=[]; o.traverse(n=>{ if(!n.isMesh) return; const orig=n.material;
      const mats=[].concat(orig).map(m=>{ const c=copy?m.clone():m; if(copy){ c.onBeforeCompile=m.onBeforeCompile; c.customProgramCacheKey=m.customProgramCacheKey; }
        if(!c.userData.sil0) c.userData.sil0={c:c.color?c.color.clone():null, e:c.emissive?c.emissive.clone():null, env:c.envMapIntensity}; return c; });
      o.userData.sil.push({n,orig}); if(copy) n.material=Array.isArray(orig)?mats:mats[0]; }); shaded.push(o); }
  if(Math.abs((o.userData.k??-1)-k)<0.004) return; o.userData.k=k;
  for(const {n} of o.userData.sil) for(const m of [].concat(n.material)){ const z=m.userData.sil0; if(!z) continue;
    if(z.c) m.color.copy(z.c).lerp(SIL,k); if(z.e) m.emissive.copy(z.e).multiplyScalar(1-k); if(z.env!==undefined) m.envMapIntensity=z.env*(1-k*0.9); } }
function shadeBird(m,k){ const i=mates.indexOf(m), b=FL.mateBirds[i]; if(b) shadeRoot(b.o,k,true); }
function shadeKid(K,k){ if(k<=0.001&&!K.root.userData.sil) return; shadeRoot(K.root,k,false); }
/* everything back to its own materials */
function shadeBack(){ for(const o of shaded){ for(const {n,orig} of o.userData.sil){ for(const m of [].concat(n.material)){ const z=m.userData.sil0; if(!z) continue; if(z.c) m.color.copy(z.c); if(z.e) m.emissive.copy(z.e); if(z.env!==undefined) m.envMapIntensity=z.env; } n.material=orig; }
  delete o.userData.sil; delete o.userData.k; } shaded.length=0; }
const _sc2=new THREE.Color();
function paintGlow(R,i,time){
  const C=R.glow.geometry.attributes.color.array, rr=PUZZLE.ringR, breathe=0.82+0.18*Math.sin(time*1.4+i*1.7), faint=(0.07+0.02*night)*(1-R.light);   /* unlit, a ring is only a faint pale circle, easiest seen from above or by night */
  const sweep=ease(R.light);   /* the whole ring at once */
  for(let a=0;a<=GA;a++){
    for(let q=0;q<=GR;q++){ const d=q/GR*GLOW_R, band=Math.exp(-Math.pow((d-rr)/0.45,2))+0.35*Math.exp(-Math.pow((d-rr)/1.7,2))+(d<rr?0.14:0), edge=1-clamp((d-GLOW_R*0.8)/(GLOW_R*0.2),0,1);
      const f=(sweep*breathe*0.8+faint)*band*edge, n=(a*(GR+1)+q)*3; C[n]=f; C[n+1]=f*0.92; C[n+2]=f*0.74; } }
  R.glow.geometry.attributes.color.needsUpdate=true; }

/* the little flamingo at the top fades from pink to grey as one stays behind in a ring (drawHud, feathers.js) */
const ringFree=()=>mates.filter(m=>m.ring===undefined).length;

/* for testing (with #dev): the F key fills the next ring, with the flamingo already standing in it */
addEventListener('keydown',e=>{ if((e.key!=='f'&&e.key!=='F')||!DEV.on||!ringsOn||solved||LEVEL!==1) return; const R=rings.find(q=>!q.bird), m=freeMate(); if(!R||!m) return;
  sendToRing(R,m); m.x=R.gx; m.z=R.gz; m.y=0; m.open=0; });

Object.assign(window,{makeRings, clearRings, solveRings, updateRings, ringFree, placeBank});
