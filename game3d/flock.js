/* Flamingo Fields 3D: the wild flamingo flocks of level 1, flying the 2D game's own rules.
   A flock of ten in a V crosses the sky every 45 s, the first after 30 s, heading for the two big mountains under the sun.
   Its line passes the kids somewhere inside a wide ring. It comes in fast from far off, slows to cruise as it nears,
   keeps cruising while the kids fly with it, and once left alone speeds up, climbs and goes.
   Fly close and the chimes ring. (A bird leaving the V to join the kids comes in a later step.)

   The rules run in the 2D game's units and its own (unmirrored) ground coordinates, so every number below is the game's;
   only the drawing converts to metres. The birds are the FAB American flamingo (assets/flamingo.glb). */

const FLOCK_EVERY=45, FLOCK_SPEED=230, FLOCK_FIRST=30;
const FLOCK_RING=6000, FLOCK_FIX=8000, FLOCK_GONE=19000, FLOCK_FAR=24000, FLOCK_NEAR=2700;
const BIRDS=[[0,0]]; for(let r=1;r<=5;r++){ BIRDS.push([-r*115,-r*86]); if(r<=4) BIRDS.push([r*115,-r*86]); }   // the V: [to the side, back]
let BIRD_PH=[];   // each bird's own phase, set on loading (h2 lives in the page)
let flock=null, nextFlock=FLOCK_FIRST, flockN=0;
const FL={ birds:[], clips:{}, ready:false };

/* ---------- the model ---------- */
async function loadFlamingo(base){
  /* the plain .glb when it is served; otherwise the gzipped base64 copy (artifacts can't serve .glb) */
  const get=async f=>{ try{ const r=await fetch(base+f); if(r.ok){ const a=await r.arrayBuffer(); if(new TextDecoder().decode(new Uint8Array(a,0,4))==='glTF') return a; } }catch(e){}
    const t=await (await fetch(base+f+'.gz.b64.txt')).text(); const b=atob(t.trim()), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); };
  const TL=new THREE.TextureLoader(), tex=f=>{ const t=TL.load(base+f); t.anisotropy=8; return t; };
  const T={ color:tex('flamingo_color.jpg'), normal:tex('flamingo_normal.jpg'), shape:tex('feather_shape.webp'), fnormal:tex('feather_normal.jpg') };
  T.color.encoding=THREE.sRGBEncoding;
  /* feather cards: colour from the first texture coordinates; outline (alpha), shading and bumps from the second */
  const featherMat=new THREE.MeshStandardMaterial({map:T.color, aoMap:T.shape, aoMapIntensity:0.9, normalMap:T.fnormal, roughness:0.85, side:THREE.DoubleSide, alphaTest:0.18});
  featherMat.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader
      .replace('#include <alphamap_fragment>','diffuseColor.a*=texture2D(aoMap,vUv2).a;')
      .replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replace(/vUv\b/g,'vUv2')); };
  const bodyMat=new THREE.MeshStandardMaterial({map:T.color, normalMap:T.normal, roughness:0.8});
  const eyeMat=new THREE.MeshStandardMaterial({map:T.color, roughness:0.25});
  const g=await new Promise(async(res,rej)=>{ try{ new THREE.GLTFLoader().parse(await get('flamingo.glb'),'',res,rej); }catch(e){ rej(e); } });
  const proto=g.scene; proto.scale.setScalar(0.01);                                   /* the model is in centimetres */
  const drop=[]; proto.traverse(n=>{ if(n.isMesh&&/^Plane/.test(n.name)) drop.push(n); }); drop.forEach(n=>n.parent.remove(n));   /* a stray flat sheet that came with the model */
  proto.traverse(n=>{ if(!n.isMesh) return; n.frustumCulled=false; n.castShadow=false; n.receiveShadow=false;
    if(/feather|wings/.test(n.name)||/feather/.test([].concat(n.material)[0].name)) n.material=featherMat;
    else { n.material=[].concat(n.material).map(m=>/eye/.test(m.name)?eyeMat:bodyMat); if(n.material.length===1) n.material=n.material[0]; } });
  for(const a of g.animations) FL.clips[a.name]=a;
  /* ten birds, made once and shown whenever a flock is up; each flaps a little out of step with the others */
  BIRD_PH=BIRDS.map((_,i)=>h2(i*7+1,i*3+5)*6.28);
  const fly=FL.clips.fly_A1;
  BIRDS.forEach((_,i)=>{ const o=THREE.SkeletonUtils.clone(proto); o.visible=false; scene.add(o);
    const mixer=new THREE.AnimationMixer(o), a=mixer.clipAction(fly); a.play(); a.time=(BIRD_PH[i]/6.28)*fly.duration; a.timeScale=0.92+((i*7)%5)*0.04;
    FL.birds.push({o,mixer}); });
  FL.ready=true;
}

/* ---------- the 2D game's flock, unchanged ---------- */
function flockLead(K){ const P=K.P; return {x:-P.x/U, z:P.z/U, y:P.y/U, fly:P.state==='fly'||P.state==='land'}; }
function spawnFlock(lead,time){
  const T=Math.floor(time), u=h2(T,13), side=h2(T,7)<0.5?-1:1;
  const off=flockN===0 ? side*300*h2(T,11) : side*FLOCK_RING*(u<0.4 ? 0.07+0.33*h2(T,11) : u<0.7 ? 0.4+0.33*h2(T,11) : 0.73+0.27*h2(T,11));
  flockN++;
  const ang=SUN_B-off/FLOCK_RING*0.32+(h2(T,17)-0.5)*0.12, dx=Math.sin(ang), dz=Math.cos(ang), px=lead.x+dz*off, pz=lead.z-dx*off;
  flock={x:px-dx*FLOCK_FAR, z:pz-dz*FLOCK_FAR, dx, dz, y:430, t:0, s:-FLOCK_FAR, joined:false, sp:560, withKids:0, off, hi:430};
}
function updateFlock(K,dt,time){
  const lead=flockLead(K);
  if(!flock){ if(time>=nextFlock){ spawnFlock(lead,time); nextFlock=time+FLOCK_EVERY; } return; }
  const f=flock; f.t+=dt;
  const dK=Math.hypot(lead.x-f.x,lead.z-f.z);
  if(f.s<-FLOCK_NEAR){
    // coming in, fast while far off and easing down to cruising speed; while still a speck it keeps its place relative to the kids
    if(f.s<-FLOCK_FIX){ const px=lead.x+f.dz*f.off, pz=lead.z-f.dx*f.off, o=(px-f.x)*f.dz-(pz-f.z)*f.dx, step=clamp(o,-320*dt,320*dt);
      f.x+=f.dz*step; f.z-=f.dx*step;
      f.s=Math.min(-FLOCK_FIX+1,-((px-f.x)*f.dx+(pz-f.z)*f.dz)); }
    const want=FLOCK_SPEED+clamp((-f.s-FLOCK_NEAR)/1500,0,1)*(560-FLOCK_SPEED)+clamp((-f.s-7000)/5000,0,1)*2200;
    f.sp+=(want-f.sp)*(1-Math.exp(-dt*2)); f.y=f.hi+Math.sin(f.t*0.5)*18;
  } else {
    // passing, and afterwards: they cruise for as long as the kids fly near them, and head off once left alone
    f.away=(f.s>FLOCK_NEAR && !(lead.fly && dK<1600)) ? Math.min(1,(f.away||0)+dt/2) : Math.max(0,(f.away||0)-dt);
    f.sp+=((FLOCK_SPEED+f.away*(1250+900*clamp((f.s-9000)/4000,0,1)))-f.sp)*(1-Math.exp(-dt*1.2));
    f.y+=((f.hi+Math.sin(f.t*0.5)*18)-f.y)*(1-Math.exp(-dt*1.5))*(1-f.away)+f.away*22*dt;
  }
  f.s+=f.sp*dt;
  f.x+=f.dx*f.sp*dt; f.z+=f.dz*f.sp*dt;
  const d=Math.hypot(lead.x-(f.x-f.dx*95), lead.z-(f.z-f.dz*95)), was=f.joined;
  if(lead.fly){ if(d<340) f.joined=true; else if(d>560) f.joined=false; } else f.joined=false;
  if(f.joined&&!was){ chime(7); chime(12); chime(16); }
  if(f.joined) f.withKids+=dt;
  // retired only once nobody could see it: shrunk to nothing in the distance, or long gone behind the camera
  { const cx=-cam.position.x/U, cz=cam.position.z/U, fx=-Math.sin(camYaw), fz=Math.cos(camYaw), rx=f.x-cx, rz=f.z-cz, fwd=rx*fx+rz*fz, side=rx*fz-rz*fx;
    const gone=fwd>FLOCK_GONE || (fwd<0 && Math.hypot(side,fwd)>9000);
    f.unseen=(f.s>FLOCK_NEAR && gone)?(f.unseen||0)+dt:0;
    if(f.unseen>2){ flock=null; nextFlock=Math.max(nextFlock,time+3); } }
}

/* ---------- drawing: each bird at its place in the V, drifting a little in it as in the game, faced along the line ---------- */
function placeFlock(dt,time){
  if(!FL.ready) return;
  const f=flock, far=scene.fog.far*1.05;   /* past the far haze a bird is only haze colour, so it isn't drawn or animated */
  FL.birds.forEach((b,i)=>{
    if(!f){ b.o.visible=false; return; }
    const o=BIRDS[i], ol=o[0]+Math.sin(time*0.23+BIRD_PH[i]*2)*13, of=o[1]+Math.sin(time*0.31+BIRD_PH[i]*5)*17,
          bx=f.x+ol*f.dz+of*f.dx, bz=f.z-ol*f.dx+of*f.dz, by=f.y+Math.sin(time*1.1+BIRD_PH[i])*7;
    b.o.position.set(-bx*U, by*U, bz*U);
    const vis=b.o.position.distanceTo(cam.position)<far; b.o.visible=vis; if(!vis) return;
    b.o.rotation.set(0,Math.atan2(-f.dx,f.dz),0);
    b.mixer.update(dt); });
}

/* the game's chime: a soft sine bell, n semitones above E5 */
function chime(n){
  if(!actx||!master) return;
  const t=actx.currentTime, o=actx.createOscillator(), g=actx.createGain();
  o.type='sine'; o.frequency.value=660*Math.pow(2,n/12);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.12,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+0.35);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+0.4);
}
