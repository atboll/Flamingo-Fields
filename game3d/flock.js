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
const FL={ birds:[], mateBirds:[], clips:{}, ready:false };
const FLAP=0.75;   // every flamingo's wingbeat, against the model's own: a quarter slower
/* your own flock: fly a good part of a pass with a wild flock and its last bird leaves the V and stays with you */
const MATES_MAX=5, PASS_NEEDED=8, mates=[];
let mateMsgT=-99;

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
  /* their colours (COLOUR, settings.js; the same as the Flamingo Test Field's sliders) */
  { const C=COLOUR, a=new THREE.Color(C.light).convertSRGBToLinear(), b=new THREE.Color(C.deep).convertSRGBToLinear(), v=x=>x.toFixed(4), v3=c=>'vec3('+v(c.r)+','+v(c.g)+','+v(c.b)+')';
    const code='{ vec3 c=diffuseColor.rgb; float l=dot(c,vec3(0.3,0.59,0.11)); float sk='+v(C.shades/100)+'; if(sk>0.0){ float mx=max(c.r,max(c.g,c.b)), sat=(mx-min(c.r,min(c.g,c.b)))/max(mx,1e-3), t=smoothstep(0.12,0.7,sat); vec3 tgt=mix('+v3(a)+','+v3(b)+',t); float el=mix(0.62,0.30,t); c=mix(c,tgt*(l/el),sk); l=dot(c,vec3(0.3,0.59,0.11)); }'
      +' float pk='+v(C.pink/100)+'; c=l+(c-l)*(1.0+1.8*pk); c*=vec3(1.0+0.12*pk,1.0-0.40*pk,1.0+0.10*pk); l=dot(c,vec3(0.3,0.59,0.11));'
      +' c=l+(c-l)*(1.0+'+v(C.richness/100)+'); c*=vec3(1.0+0.15*'+v(C.warmth/100)+',1.0,1.0-0.15*'+v(C.warmth/100)+'); c=(c-0.45)*(1.0+0.6*'+v(C.contrast/100)+')+0.45; c*=1.0+0.5*'+v(C.brightness/100)+'; diffuseColor.rgb=clamp(c,0.0,1.0); }';
    const colour=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+code); };
    for(const m of [featherMat,bodyMat]){ const prev=m.onBeforeCompile; m.onBeforeCompile=sh=>{ colour(sh); if(prev) prev(sh); }; } }
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
    const mixer=new THREE.AnimationMixer(o), a=mixer.clipAction(fly); a.play(); a.time=(BIRD_PH[i]/6.28)*fly.duration; a.timeScale=FLAP*(0.92+((i*7)%5)*0.04);
    FL.birds.push({o,mixer}); });
  /* five more for your own flock: flying, walking or standing, crossfaded */
  for(let i=0;i<MATES_MAX;i++){ const o=THREE.SkeletonUtils.clone(proto); o.visible=false; scene.add(o); const mixer=new THREE.AnimationMixer(o), A={};
    for(const k of ['fly_A1','walk_A1','idle_A1','foraging_A1','idle_B1']){ A[k]=mixer.clipAction(FL.clips[k]); A[k].play(); if(k==='fly_A1') A[k].timeScale=FLAP; A[k].setEffectiveWeight(0); A[k].time=h2(i,k.length)*FL.clips[k].duration; }
    FL.mateBirds.push({o,mixer,A,w:{fly_A1:0,walk_A1:0,idle_A1:1,foraging_A1:0,idle_B1:0}}); }
  FL.proto=proto; FL.ready=true;   // (the prototype is kept for the #dev-flamingo page, dev.js)
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
  if(night>0.5){   // when night comes, a flock already in the air swings round toward the moon
    let a=Math.atan2(f.dx,f.dz), d=SUN_B-a; d=Math.atan2(Math.sin(d),Math.cos(d));
    if(Math.abs(d)>0.001){ a+=clamp(d,-0.16*dt,0.16*dt); f.dx=Math.sin(a); f.dz=Math.cos(a); } }
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
  if(!f.gave && f.withKids>=PASS_NEEDED && mates.length<MATES_MAX){ f.gave=true; const o=BIRDS[BIRDS.length-1];   // flown with them long enough: the last bird of the V leaves it and joins the kids
    addMate(f.x+o[0]*f.dz+o[1]*f.dx, f.z-o[0]*f.dx+o[1]*f.dz, Math.max(60,f.y-groundAt(-f.x*U,f.z*U)/U), f.dx, f.dz, time);
    mateMsgT=time; [0,5,9,12].forEach((n,q)=>setTimeout(()=>chime(n),q*110)); }
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
    if(!f || (f.gave && i===BIRDS.length-1)){ b.o.visible=false; return; }   // the bird that joined the kids has left the V
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

/* ---------- your own flock, on the 2D game's rules: two abreast behind the kids, wider and looser in the air;
   they fly when the kids fly and come down with them afterwards, landing at a run and taking off at a run ---------- */
function addMate(x,z,y,hx,hz,time){
  mates.push({x,z,y,open:y>6?1:0,vx:hx*200,vz:hz*200,vy:0,hx,hz,ph:h2(mates.length*5+2,9)*6.28,id:50+mates.length,sp:0});
}
function updateMates(K,dt,time){
  const P=K.P, lead={x:-P.x/U, z:P.z/U, y:P.y/U}, headX=-Math.sin(P.h), headZ=Math.cos(P.h);
  const air=P.state==='fly'||(P.state==='land'&&lead.y>30);   // a hop does not lift them
  mates.forEach((m,i)=>{
    if(m.shore){   // gone to the box: down out of the air, then one of the flamingos there
      if(m.y>0){ m.y=Math.max(0,m.y-Math.max(34,m.y*0.55)*dt); m.open=m.y<28?Math.max(0,m.open-dt/0.8):1; } else m.open=Math.max(0,(m.open||0)-dt/0.8);
      stepShore(m,dt); return; }
    const row=Math.floor(i/2), side=i%2?1:-1, wob=Math.sin(time*0.4+m.ph*3)*(air?25:18);
    const back=(air?112:85)+row*(air?84:52), lat=side*((air?105:58)+row*(air?77:26))+wob;
    const tx=lead.x-headX*back+headZ*lat, tz=lead.z-headZ*back-headX*lat;
    const dx=tx-m.x, dz=tz-m.z, d=Math.hypot(dx,dz), want=Math.min(m.y>3?1900:400,d*2.2), e=1-Math.exp(-dt*3.5);
    const runOut=m.landT===undefined?0:Math.max(0,1-(time-m.landT)/1.1), runUp=(m.y<2&&m.open>0.02&&m.rising)?1:0, drive=Math.max(runOut*runOut*300,runUp*320);
    m.vx+=(((d>2?dx/d*want:0)+m.hx*drive)-m.vx)*e; m.vz+=(((d>2?dz/d*want:0)+m.hz*drive)-m.vz)*e;
    m.x+=m.vx*dt; m.z+=m.vz*dt;
    const sp=m.sp=Math.hypot(m.vx,m.vz);
    if(sp>15){ const eh=1-Math.exp(-dt*5); m.hx+=(m.vx/sp-m.hx)*eh; m.hz+=(m.vz/sp-m.hz)*eh; const hm=Math.hypot(m.hx,m.hz)||1; m.hx/=hm; m.hz/=hm; }
    { const ang=Math.atan2(m.hx,m.hz); let da=ang-(m.ang===undefined?ang:m.ang); da=Math.atan2(Math.sin(da),Math.cos(da)); m.ang=ang;   // how fast it is turning, for the bank
      m.turn=(m.turn||0)+(clamp(da/Math.max(dt,0.004),-3,3)-(m.turn||0))*(1-Math.exp(-dt*3)); }
    // in the air with the kids, down in the grass otherwise; a bird left far behind flies to catch up
    const tgt=(air||d>900)?Math.max(40,(air?(P.ya??P.y)/U:120)+12+row*10):0;   // the kids' height over the gentler flying ground
    const wasUp=m.y>1.5; m.rising=tgt>0;
    m.open=clamp((m.open||0)+(tgt>0?dt/0.55:(m.y<25?-dt/0.6:0)),0,1);   /* wings start folding just before touchdown (the 2D game waited until it was down) */
    if(tgt>0 && m.y<1.5 && m.open<0.85){ m.y=0; m.vy=0; }                       // still on its run-up: no lift until the wings are nearly spread
    else { const k=tgt>0?3:7, c=tgt>0?2.8:4.6; m.vy+=((tgt-m.y)*k-m.vy*c)*dt;   /* coming down, about twice as fast as the 2D game's gentle settle */ m.y=Math.max(0,m.y+m.vy*dt); if(tgt===0&&m.y<1.5){ m.y=0; m.vy=0; } }
    if(wasUp && m.y<=1.5 && tgt===0) m.landT=time;                              // touchdown: the run-out starts here
  });
}
/* drawing them: the FAB flamingo flying when its wings are open, walking when it moves on the ground, standing otherwise */
function placeMates(dt){
  if(!FL.ready) return;
  FL.mateBirds.forEach((b,i)=>{ const m=mates[i]; if(!m){ b.o.visible=false; return; }
    const flying=m.open>0.5||m.y>6, k=1-Math.exp(-dt*4), W={fly_A1:0,walk_A1:0,idle_A1:0,foraging_A1:0,idle_B1:0};
    if(flying) W.fly_A1=1; else if(m.sp>15) W.walk_A1=1; else if(m.shore){ W.foraging_A1=m.feed||0; W.idle_B1=(m.rest||0)*(1-W.foraging_A1); W.idle_A1=Math.max(0,1-W.foraging_A1-W.idle_B1); } else W.idle_A1=1;
    for(const n in b.w){ b.w[n]+=(W[n]-b.w[n])*k; b.A[n].setEffectiveWeight(b.w[n]); }
    /* the model flies with its body low and its legs trailing below where its feet stand: while in the flying pose it is held up by half a metre,
       so it comes down onto its feet instead of into the ground, and settles as the pose turns to walking */
    /* in the air they ride the kids' gentler flying ground (about 30% of the dunes), easing back to the real ground as they come down */
    const x=-m.x*U, z=m.z*U, g=groundAt(x,z), wa=clamp(m.y/60,0,1), base=wa>0?g+(airGround(x,z)-g)*wa:g;
    b.o.visible=true; b.o.position.set(x,Math.max(base+m.y*U,g+Math.min(m.y*U,1.2))+b.w.fly_A1*0.5,z);
    /* banking into its turns, as in the 2D game: up to about 25 degrees, and only with its wings open */
    b.o.rotation.order='YXZ'; b.o.rotation.set(0,Math.atan2(-m.hx,m.hz),clamp((m.turn||0)*0.36,-0.44,0.44)*m.open);
    b.A.walk_A1.timeScale=clamp(m.sp*U/1.1,0.6,2.6);   /* a stride to suit its speed */
    /* on or near the ground it throws a shadow, as the kids do (body and legs; the feather cards would throw hard squares) */
    { const cs=m.y<170; if(b.cs!==cs){ b.cs=cs; b.o.traverse(n=>{ if(n.isMesh) n.castShadow=cs && ![].concat(n.material).some(x=>x.alphaTest>0); }); } }
    b.mixer.update(dt); });
}

/* the "+1 flamingo" button: a bird joins straight away, behind the kids (in the air if they are flying), as if earned from a flock */
function giftMate(){
  if(!girl||mates.length>=MATES_MAX) return;
  const P=girl.P, hx=-Math.sin(P.h), hz=Math.cos(P.h), air=P.state==='fly', lx=-P.x/U, lz=P.z/U;
  addMate(lx-hx*300, lz-hz*300, air?Math.max(60,P.y/U):0, hx, hz, clock);
  mateMsgT=clock; [0,5,9,12].forEach((n,q)=>setTimeout(()=>chime(n),q*110));
}
