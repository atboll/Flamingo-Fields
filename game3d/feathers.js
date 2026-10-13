/* Flamingo Fields 3D: feathers in the grass, the counter, and flight earned with feathers, all on the 2D game's rules.
   Ten feathers fill the row at the top; then a hop and Space in the air fly the kids for ten seconds, and the row drains.
   The time stands still while they fly with a wild flock. Five flamingos joined make a full flock: free flight, high and for as long as you like.
   The feather is one of the FAB flamingo's own flight feathers (assets/feather.png), coloured from its wings: pale base, pink, black tip.
   As in flock.js the rules run in the game's units and unmirrored ground coordinates. */

const NEED=10, FLY_TIME=10, FC=220, FEATHER_TOP=640, CEILING=2400, got=new Set();
let feathers=0, flightLeft=0, lastGot=-9;
const freeFly=()=>mates.length>=MATES_MAX;

/* ---------- where the feathers lie: the game's own cells, patches and trails ---------- */
function featherAt(ci,cj){
  if(got.has((ci+32768)*65536+(cj+32768))) return null;
  if(COAST.on && coastAlong((ci+0.5)*FC,(cj+0.5)*FC)>400) return null;     // none out on the sand
  if(Math.abs(ci)<1&&Math.abs(cj)<1) return null;
  // a rare great feather: about one cell in eight hundred, worth a whole flight on its own
  if(h2(ci*13+7,cj*11+3)<0.0012) return {x:(ci+0.5)*FC, z:(cj+0.5)*FC, ph:h2(ci-3,cj+8), ci, cj, big:true};
  const rich=vnoise(ci/4,cj/4,555)>0.5;                       // feathers lie in loose patches and trails
  if(h2(ci*5+3,cj*7-11)>(rich?0.21:0.05)) return null;
  return {x:(ci+0.2+0.6*h2(ci+17,cj))*FC, z:(cj+0.2+0.6*h2(ci,cj+29))*FC, ph:h2(ci-3,cj+8), ci, cj};
}

/* ---------- how they look: the feather card, its soft pink glow, and for the great feather a golden halo and turning rays ---------- */
function radialTex(stops){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
  for(const [o,col] of stops) r.addColorStop(o,col); g.fillStyle=r; g.fillRect(0,0,128,128); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
const GLOW_TEX=radialTex([[0,'rgba(255,226,232,1)'],[1,'rgba(255,226,232,0)']]);
const HALO_TEX=radialTex([[0,'rgba(255,236,170,1)'],[0.4,'rgba(255,200,190,0.4)'],[1,'rgba(255,200,190,0)']]);
const RAYS_TEX=(()=>{ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.strokeStyle='rgba(255,244,210,1)'; g.lineWidth=5; g.lineCap='round';
  g.beginPath(); for(let j=0;j<8;j++){ const an=j*Math.PI/4; g.moveTo(128+Math.cos(an)*55,128+Math.sin(an)*55); g.lineTo(128+Math.cos(an)*118,128+Math.sin(an)*118); } g.stroke();
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; })();
let FEATHER_TEX=null, featherImg=null;
const FEATHER_LEN=24*U, FEATHER_W=FEATHER_LEN*160/512;   /* a little over a third of a metre: a real flight feather */
const POOL=[], POOL_N=180;
function spriteOf(tex,order,glows){ const m=new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, fog:false}); const s=new THREE.Sprite(m); s.renderOrder=order; s.visible=false; (glows?lightScene:scene).add(s); return s; }   /* the glows are drawn after the night grade: they give light */
function loadFeathers(base){
  return new Promise((res,rej)=>{ new THREE.TextureLoader().load(base+'feather.png',t=>{ t.encoding=THREE.sRGBEncoding; t.anisotropy=4; FEATHER_TEX=t; featherImg=t.image;
    for(let i=0;i<POOL_N;i++){ const glow=spriteOf(GLOW_TEX,2), card=spriteOf(FEATHER_TEX,3), nglow=spriteOf(GLOW_TEX,4,true); card.material.alphaTest=0.05; POOL.push({glow,card,nglow}); }
    POOL.halo=spriteOf(HALO_TEX,4,true); POOL.rays=spriteOf(RAYS_TEX,4,true);
    makeHudArt(); res(); },undefined,rej); }); }

/* each frame: the feathers within sight, floating just above the grass tips, bobbing and turning, never smaller than a few pixels */
const _v=new THREE.Vector3();
function placeFeathers(K,time){
  if(!FEATHER_TEX) return;
  const cx=-cam.position.x/U, cz=cam.position.z/U, RG=2600, ci0=Math.floor((cx-RG)/FC), ci1=Math.floor((cx+RG)/FC), cj0=Math.floor((cz-RG)/FC), cj1=Math.floor((cz+RG)/FC);
  const pxH=innerHeight, focal=0.5*pxH/Math.tan(cam.fov*Math.PI/360), ga=1-pathA;   /* while the road gathers, the field's own feathers fade away into it */
  let n=0; POOL.bigShown=false;
  if(ga>0.01) for(let cj=cj0;cj<=cj1&&n<POOL_N;cj++) for(let ci=ci0;ci<=ci1&&n<POOL_N;ci++){
    const f=featherAt(ci,cj); if(!f) continue;
    const dx=f.x-cx, dz=f.z-cz, d=Math.hypot(dx,dz); if(d>RG) continue;
    const big=f.big?1:0, x=-f.x*U, z=f.z*U, y=groundAt(x,z)+(62+big*26+Math.sin(time*2+f.ph*6)*(4+big*5))*U;
    if(drawFeather(POOL[n],x,y,z,f.ph,big,ga,RG*U,focal,time)) n++; }
  /* the feather road's near feathers (road.js): the same feathers, drawn the same way; the far ones are points of light there */
  for(const q of roadNear){ if(n>=POOL_N) break; if(drawFeather(POOL[n],q.x,q.y,q.z,q.ph,0,q.a,1e9,focal,time)) n++; }
  for(let i=n;i<POOL_N;i++){ POOL[i].card.visible=POOL[i].glow.visible=POOL[i].nglow.visible=false; }
  if(!POOL.bigShown) POOL.halo.visible=POOL.rays.visible=false;
}
/* one feather: the card, its glow, and by night its own light; false if it is behind the camera */
function drawFeather(P,x,y,z,ph,big,alpha,range,focal,time){
  _v.set(x,y,z).sub(cam.position); const along=_v.dot(cam.getWorldDirection(_w)); if(along<0.3) return false;   // behind the camera
  const dist=_v.length(), fade=clamp((range-dist)/(400*U),0,1)*alpha; if(fade<=0.01) return false;
  /* the game's size: 11 units, but never under 3.4 pixels, so a far feather stays a speck you can spot */
  const sz=Math.max(FEATHER_LEN, 3.4*2.2*dist/focal)*(1+big*1.9)/FEATHER_LEN;   // the card's length in metres over the feather's own
  const tw=0.75+0.25*Math.sin(time*5+ph*40);
  P.card.visible=P.glow.visible=true; P.card.position.set(x,y,z); P.glow.position.set(x,y,z);
  P.card.scale.set(FEATHER_W*sz,FEATHER_LEN*sz,1); P.card.material.rotation=-(0.6+Math.sin(time*1.6+ph*9)*0.5); P.card.material.opacity=fade;
  const gr=FEATHER_LEN*sz*(2.8/2.2)*2; P.glow.scale.set(gr,gr,1); P.glow.material.opacity=0.65*tw*fade;
  /* by night each gives off its own light, drawn over the night grade, as in the 2D game */
  P.nglow.visible=night>0.05&&fade>0.5; if(P.nglow.visible){ P.nglow.position.set(x,y,z); const nr=gr*(big?3.2:2.6)/2.8; P.nglow.scale.set(nr,nr,1); P.nglow.material.opacity=0.85*night*fade; P.nglow.material.color.setRGB(1,0.75,0.84); }
  if(big&&!POOL.bigShown){ POOL.bigShown=true; const R=FEATHER_LEN*sz*(5/2.2)*2; POOL.halo.visible=POOL.rays.visible=true; POOL.halo.position.set(x,y,z); POOL.rays.position.set(x,y,z);
    POOL.halo.scale.set(R,R,1); POOL.halo.material.opacity=0.55*tw*fade; const rr=FEATHER_LEN*sz*(2.6/2.2)*2.2; POOL.rays.scale.set(rr,rr,1); POOL.rays.material.rotation=-time*0.5; POOL.rays.material.opacity=0.5*tw*fade; }
  return true;
}
const _w=new THREE.Vector3();

/* ---------- picking them up: run through one (within about 0.7 m), low down; both kids can ---------- */
function pickFeathers(time){
  for(const K of [girl,boy]){ const P=K.P, kx=-P.x/U, kz=P.z/U;
    if(P.y/U>=55 || feathers>=NEED || pathA>=0.05) continue;   // none to pick up once the road has gathered them
    const ci=Math.floor(kx/FC), cj=Math.floor(kz/FC);
    for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const f=featherAt(ci+a,cj+b);
      if(f && Math.hypot(f.x-kx,f.z-kz)<(f.big?64:46) && feathers<NEED){ got.add((f.ci+32768)*65536+(f.cj+32768)); lastGot=time;
        if(f.big){ feathers=NEED; [0,4,7,12,16].forEach((n,q)=>setTimeout(()=>chime(n),q*70)); } else { feathers++; chime(feathers); } } } }
}

/* ---------- flight, earned: kids.js asks before the second Space takes the girl up ---------- */
let flyStart=-9;
function mayFly(K){
  if(K!==girl) return true;
  if(freeFly()){ flyStart=clock; return true; }
  if(feathers>=NEED){ feathers=0; flightLeft=FLY_TIME; flyStart=clock; chime(12); chime(19); return true; }
  return false;
}
function flightRules(dt){
  const P=girl.P, top=(freeFly()?CEILING:FEATHER_TOP)*U;
  ALT_MAX=top; if(P.alt>top) P.alt=Math.max(top,P.alt-330*U*dt);   // the sky closes over feathers alone
  if(P.state==='fly' && !freeFly()){
    if(!(flock&&flock.joined)) flightLeft-=dt;                     // with the flock, the clock stops
    if(flightLeft<=0){ flightLeft=0; jumpKid(girl); } }              // time's up: down they come
  else if(P.state!=='fly') flightLeft=0;
}
/* with a wild flock and hands off the arrows, the kids settle into the gap behind its leader and keep its height */
function flockAssist(In,air){
  if(!air||!flock||!flock.joined) return In;
  const P=girl.P, gx=-P.x/U, gz=P.z/U, gh=groundAt(P.x,P.z)/U;
  In.alt=clamp(flock.y-gh-25,120,720)*U;
  if(!keys.has('left')&&!keys.has('right')){ const vx=flock.dx*flock.sp+(flock.x-flock.dx*95-gx)*1.2, vz=flock.dz*flock.sp+(flock.z-flock.dz*95-gz)*1.2;
    In.heading=Math.atan2(-vx,vz); In.airSpeed=Math.hypot(vx,vz)*U; }
  return In;
}

/* ---------- the counter, at the top: ten feathers, and below them five flamingos for your flock ---------- */
const hudCv=document.createElement('canvas'); hudCv.className='fx'; hudCv.setAttribute('aria-hidden','true'); document.body.appendChild(hudCv);
const hudG=hudCv.getContext('2d'); let featherOn=null, featherOff=null;
function makeHudArt(){
  const w=featherImg.width, h=featherImg.height, mk=(f)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); f(g); return c; };
  featherOn=featherImg;
  featherOff=mk(g=>{ g.drawImage(featherImg,0,0); g.globalCompositeOperation='source-in'; g.fillStyle='rgba(58,42,18,.3)'; g.fillRect(0,0,w,h); });
}
function flamingoIcon(ctx,u,body,leg,bill){   // the 2D game's small standing flamingo
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.strokeStyle=leg; ctx.lineWidth=u*0.1; ctx.beginPath(); ctx.moveTo(u*0.02,u*0.3); ctx.lineTo(u*0.02,u*1.9); ctx.lineTo(u*0.24,u*1.9);
  ctx.moveTo(-u*0.08,u*0.3); ctx.lineTo(-u*0.52,u*0.78); ctx.lineTo(u*0.3,u*1.02); ctx.lineTo(u*0.34,u*1.22); ctx.stroke();
  ctx.strokeStyle=body; ctx.lineWidth=u*0.17; ctx.beginPath(); ctx.moveTo(u*0.42,-u*0.1); ctx.bezierCurveTo(u*1.12,-u*0.5,-u*0.12,-u*1.25,u*0.4,-u*2.0); ctx.stroke();
  ctx.fillStyle=bill; ctx.beginPath(); ctx.moveTo(-u*0.42,-u*0.16); ctx.lineTo(-u*1.12,u*0.2); ctx.lineTo(-u*0.4,u*0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle=body; ctx.beginPath(); ctx.ellipse(0,0,u*0.62,u*0.4,-0.14,0,7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-u*0.45,-u*0.22); ctx.lineTo(-u*0.92,u*0.02); ctx.lineTo(-u*0.4,u*0.2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(u*0.43,-u*2.04,u*0.165,0,7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(u*0.52,-u*2.17); ctx.lineTo(u*0.88,-u*2.02); ctx.lineTo(u*0.6,-u*1.9); ctx.closePath(); ctx.fill();
  ctx.fillStyle=bill; ctx.beginPath(); ctx.moveTo(u*0.9,-u*2.03); ctx.lineTo(u*0.88,-u*1.6); ctx.lineTo(u*0.66,-u*1.92); ctx.closePath(); ctx.fill();
}
function drawHud(time){
  const dpr=Math.min(devicePixelRatio,2), W=innerWidth, H=innerHeight;
  if(hudCv.width!==Math.round(W*dpr)||hudCv.height!==Math.round(H*dpr)){ hudCv.width=Math.round(W*dpr); hudCv.height=Math.round(H*dpr); }
  const ctx=hudG; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H); if(!featherOn||!girl) return;
  const q=clamp(Math.min(W/1100,H/560),0.62,1.15), gap=24*q, y=W<500?62:Math.max(22,28*q), x0=W/2-(NEED-1)*gap/2;   // tucked against the top edge, smaller on a phone
  const flying=girl.P.state==='fly', free=freeFly(), have=free?NEED:flying?Math.ceil(flightLeft/FLY_TIME*NEED):feathers, ready=!flying&&(feathers>=NEED||free), lit=ready||flying;
  const fh=24*q, fw=fh*featherOn.width/featherOn.height;
  for(let i=0;i<NEED;i++){
    const on=i<have; let sc=1;
    if(on&&i===have-1&&!flying) sc+=0.6*Math.max(0,1-(time-lastGot)*3);
    if(ready) sc*=1+0.1*Math.sin(time*6+i*0.6);
    ctx.save(); ctx.translate(x0+i*gap,y); ctx.rotate(0.5); ctx.scale(sc,sc);
    if(on){ ctx.shadowColor='rgba(255,170,190,.95)'; ctx.shadowBlur=lit?12:3; }
    ctx.drawImage(on?featherOn:featherOff,-fw/2,-fh/2,fw,fh); ctx.restore();
  }
  // your flock: grey flamingos turn pink as birds join; the next one fills from the feet up while the kids fly with the wild flock
  { const u=10*q, gp=34*q, fy=y+46*q, fx0=W/2-(MATES_MAX-1)*gp/2, n=mates.length, since=time-mateMsgT;
    const prog=(flock&&!flock.gave&&!free)?clamp(flock.withKids/PASS_NEEDED,0,1):0, earning=!!(flock&&flock.joined&&!flock.gave&&!free);
    const nudge=!!(flock&&flock.s<FLOCK_NEAR&&!flock.gave&&!free&&!flying&&feathers>=NEED);   // a flock is passing and the kids could go up to it
    for(let i=0;i<MATES_MAX;i++){
      const cx=fx0+i*gp; let sc=1, glow=0;
      if(i===n-1 && since<1) sc+=0.7*(1-since);
      if(free && since<4){ glow=1; sc*=1+0.08*Math.sin(time*7+i*0.8); }
      if(i===n && earning) sc*=1+0.12*Math.sin(time*9);
      if(i===n && nudge && !earning) sc*=1+0.1*Math.sin(time*3);
      ctx.save(); ctx.translate(cx,fy); ctx.scale(sc,sc);
      if(i<n){ if(glow){ ctx.shadowColor='rgba(255,170,190,.95)'; ctx.shadowBlur=12; } flamingoIcon(ctx,u,'#f8a6b9','#e98da0','#3a2a30'); }
      else {
        flamingoIcon(ctx,u,'rgba(70,62,58,.42)','rgba(70,62,58,.42)','rgba(40,34,32,.5)');
        if(i===n && prog>0){ ctx.save(); ctx.beginPath(); ctx.rect(-u*1.4,u*1.98-prog*u*4.3,u*2.8,prog*u*4.3+2); ctx.clip();
          ctx.shadowColor='rgba(255,170,190,.9)'; ctx.shadowBlur=earning?8:0; flamingoIcon(ctx,u,'#f8a6b9','#e98da0','#3a2a30'); ctx.restore(); }
        else if(i===n && nudge){ ctx.globalAlpha=0.35+0.35*Math.sin(time*3); flamingoIcon(ctx,u,'#f8a6b9','#e98da0','#3a2a30'); }
      }
      ctx.restore(); } }
  if(time-mateMsgT<5){
    ctx.save(); ctx.globalAlpha=clamp((5-(time-mateMsgT))/1.2,0,1); ctx.font='600 '+Math.round(17*q)+'px system-ui,-apple-system,"Segoe UI",sans-serif'; ctx.textAlign='center';
    ctx.shadowColor='rgba(60,40,10,.7)'; ctx.shadowBlur=6; ctx.fillStyle='#ffe3ea'; ctx.fillText(freeFly()?'Your flock is complete. Fly whenever you like':'A flamingo has joined you',W/2,y+118*q); ctx.restore(); }
  flockArrow(ctx,W,H,time);
}
/* a wild flock out of view and still coming: a small pink arrow at the edge of the screen on its side, as in the 2D game.
   In 3D the flock can also be behind the camera; the arrow then points to the side it is nearer. */
const _fp=new THREE.Vector3();
function flockArrow(ctx,W,H,time){
  if(!flock || flock.s>=FLOCK_NEAR) return;
  _fp.set(-flock.x*U, flock.y*U, flock.z*U).project(cam);
  const behind=_fp.z>1, inView=!behind && Math.abs(_fp.x)<=1 && Math.abs(_fp.y)<=1; if(inView) return;
  /* which side: (rx,rz) is the camera's left, so this is right even when the flock is behind */
  const rx=Math.cos(camYaw), rz=-Math.sin(camYaw), dx=-flock.x*U-cam.position.x, dz=flock.z*U-cam.position.z, sd=(dx*rx+dz*rz)>0?-1:1;
  const ax=sd>0?W-22:22, ay=H*0.3, pu=1+0.15*Math.sin(time*6);
  ctx.save(); ctx.translate(ax,ay); ctx.scale(sd*pu,pu); ctx.fillStyle='#f6a3b6'; ctx.shadowColor='rgba(120,40,60,.6)'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(-7,-10); ctx.lineTo(-2,0); ctx.lineTo(-7,10); ctx.closePath(); ctx.fill(); ctx.restore();
}
