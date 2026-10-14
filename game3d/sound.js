/* ---------- sound: the field recording, looped forever, each pass starting 4 s before the last one ends (as the 2D game does).
   It starts with the first key or tap, since browsers only play sound after the player has done something. ---------- */
const OVERLAP=4, soundBtn=$('sound'), fadeOut=new Float32Array(48).map((_,i)=>Math.cos(i/47*Math.PI/2));
let actx=null, master=null, fieldBuf=null, fieldGain=null, nextAt=0, soundOn=true, runGain=null, runSrc=null, palGain=null, palSrc=null;
try{ soundOn=localStorage.getItem('ff3dSound')!=='off'; }catch(_){ }
function showSound(){ soundBtn.textContent=soundOn?'Sound on':'Sound off'; soundBtn.setAttribute('aria-pressed',String(soundOn)); }
function scheduleField(){
  if(!fieldBuf) return;
  while(nextAt<actx.currentTime+12){
    const t=Math.max(nextAt,actx.currentTime+0.05), dur=fieldBuf.duration, src=actx.createBufferSource(), g=actx.createGain();
    src.buffer=fieldBuf; g.gain.setValueAtTime(1,t); g.gain.setValueCurveAtTime(fadeOut,t+dur-OVERLAP,OVERLAP);
    src.connect(g); g.connect(fieldGain); src.start(t); nextAt=t+dur-OVERLAP; } }
function startSound(){
  if(actx){ if(actx.state==='suspended'&&!document.hidden) actx.resume(); return; }
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  actx=new AC(); master=actx.createGain(); master.gain.value=soundOn?0.85:0; master.connect(actx.destination);
  fieldGain=actx.createGain(); fieldGain.gain.value=0; fieldGain.connect(master);
  fetch('assets/field01.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(b=>actx.decodeAudioData(b))
    .then(buf=>{ fieldBuf=buf; scheduleField(); setInterval(scheduleField,2000); fieldGain.gain.setTargetAtTime(1,actx.currentTime,0.8); })   /* it fades in */
    .catch(()=>{ soundBtn.textContent='Sound unavailable'; soundBtn.disabled=true; });
  /* footsteps, as the 2D game: the big kid's steps looped, heard only while running on the ground; the small kid has the same
     steps 10% faster, started part-way in so the two don't land together */
  fetch('assets/run_big.wav').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(b=>actx.decodeAudioData(b))
    .then(buf=>{ runGain=actx.createGain(); runGain.gain.value=0; runGain.connect(master);
      runSrc=actx.createBufferSource(); runSrc.buffer=buf; runSrc.loop=true; runSrc.connect(runGain); runSrc.start();
      palGain=actx.createGain(); palGain.gain.value=0; palGain.connect(master);
      palSrc=actx.createBufferSource(); palSrc.buffer=buf; palSrc.loop=true; palSrc.playbackRate.value=1.1; palSrc.connect(palGain); palSrc.start(0,1.29); })
    .catch(()=>{});
  /* the wild flock's calls (the 2D game's flamingos.mp3), placed left or right to where the flock is */
  fetch('assets/flamingos.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(b=>actx.decodeAudioData(b))
    .then(buf=>{ flamBuf=buf; flamGain=actx.createGain(); flamGain.gain.value=0; flamPan=actx.createStereoPanner?actx.createStereoPanner():null;
      if(flamPan){ flamGain.connect(flamPan); flamPan.connect(master); } else flamGain.connect(master); })
    .catch(()=>{}); }
/* Music: the 2D game's pad.mp3 plays once, from the moment the flock is complete. It is streamed, and only fetched once the flock is one short. */
let padEl=null, padPlayed=false;
function updateMusic(){
  if(!actx||!master||padPlayed) return;
  if(!padEl && mates.length>=MATES_MAX-1){ padEl=new Audio('assets/pad.mp3'); padEl.preload='auto';
    try{ const g=actx.createGain(); g.gain.value=0.7; actx.createMediaElementSource(padEl).connect(g); g.connect(master); }catch(e){ padEl.volume=0.7; } }
  if(padEl && freeFly()){ padPlayed=true; const p=padEl.play(); if(p&&p.catch) p.catch(()=>{}); }
}
/* Fast flight: with a full flock the kids fly at the 2D game's full-flock speed (800 against 430, so about 1.9 times), picking it up over a few seconds.
   The 2D game's fast.mp3 wind is fetched once the flock is one short, looped with a 3 s overlap, and swells only at speed. */
const FAST_OVERLAP=3, fastIn=new Float32Array(48).map((_,i)=>Math.sin(i/47*Math.PI/2));
let fastBuf=null, fastGain=null, fastNext=-1, fastLoading=false;
const FLY_TOP=FLY_BASE*(1+0.5*(800/430-1));   /* full-flock speed: half the 2D game's extra (about 18.5 m/s against 13), which was too hectic in 3D */
function updateFlySpeed(dt){
  const want=(girl.P.state==='fly'&&freeFly())?FLY_TOP:FLY_BASE;
  FLY_SPEED+=(want-FLY_SPEED)*(1-Math.exp(-dt*(want>FLY_SPEED?0.6:1.5)));
}
function updateFastSound(){
  if(!actx||!master||!girl) return;
  if(!fastBuf){
    if(!fastLoading && mates.length>=MATES_MAX-1){ fastLoading=true;
      fetch('assets/fast.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(b=>actx.decodeAudioData(b))
        .then(buf=>{ fastGain=actx.createGain(); fastGain.gain.value=0; fastGain.connect(master); fastBuf=buf; }).catch(()=>{}); }
    return; }
  const t=actx.currentTime, dur=fastBuf.duration;
  if(fastNext<t-0.1) fastNext=t+0.02;
  while(fastNext<t+6){ const src=actx.createBufferSource(), g=actx.createGain(); src.buffer=fastBuf;
    g.gain.setValueCurveAtTime(fastIn,fastNext,FAST_OVERLAP); g.gain.setValueCurveAtTime(fadeOut,fastNext+dur-FAST_OVERLAP,FAST_OVERLAP);
    src.connect(g); g.connect(fastGain); src.start(fastNext); fastNext+=dur-FAST_OVERLAP; }
  /* it swells as the kids pick up speed beyond normal flying pace and dies away as they slow (the 2D rule, in its own units) */
  const v=(FLY_SPEED-FLY_BASE)/(FLY_TOP-FLY_BASE)*girl.P.flyW, on=(LEVEL===1&&girl.P.state==='fly'&&freeFly())?clamp((v-0.06)/0.94,0,1):0, lvl=on*1.8;   /* no wind on level 2 */   /* the wind still reaches full at the (lower) top speed */
  fastGain.gain.setTargetAtTime(lvl,t,lvl>0?0.25:LEVEL===2?0.3:0.5);
}
/* the flock's calls: the clip loops with a short overlap while a flock is in the sky, louder the nearer it is (the 2D game's rule).
   In 3D they also come from its side, so you can turn toward them by ear. */
let flamBuf=null, flamGain=null, flamPan=null, flamNext=0;
function updateFlamSound(){
  if(!flamGain||!girl) return;
  const t=actx.currentTime;
  if(!flock){ flamGain.gain.setTargetAtTime(0,t,0.4); return; }
  if(flamNext<t-0.1) flamNext=t+0.02;
  while(flamNext<t+1.5){
    const src=actx.createBufferSource(), g=actx.createGain(), dur=flamBuf.duration;
    src.buffer=flamBuf; g.gain.setValueAtTime(1,flamNext); g.gain.setValueCurveAtTime(fadeOut,flamNext+dur-1.5,1.5);
    src.connect(g); g.connect(flamGain); src.start(flamNext); flamNext+=dur-1.5; }
  const lx=-girl.P.x/U, lz=girl.P.z/U, d=Math.hypot(lx-flock.x,lz-flock.z), coming=flock.s<FLOCK_NEAR?1:0;
  const lv=clamp(1.15-d/3000,coming*(0.03+0.11*clamp((9000-d)/5000,0,1)),1)*0.9;
  flamGain.gain.setTargetAtTime(lv,t,0.3);
  if(flamPan){ /* (rx,rz) is the camera's left */ const rx=Math.cos(camYaw), rz=-Math.sin(camYaw), dx=-flock.x*U-cam.position.x, dz=flock.z*U-cam.position.z, m=Math.hypot(dx,dz)||1;
    flamPan.pan.setTargetAtTime(clamp(-(dx*rx+dz*rz)/m*0.85,-0.85,0.85),t,0.25); } }
function stepsFor(K){ const P=K.P; return (P.state==='ground'||P.state==='touch')&&P.y<0.02 ? clamp((P.spd/K.RUN_SPEED-0.25)/0.5,0,1) : 0; }
/* footsteps on the field; on level 2's clouds there are none, and no wind: the field recording falls silent up there and comes back on level 1 */
function updateRunSound(){ if(!actx||!girl) return; const t=actx.currentTime, l2=LEVEL===2;
  if(fieldGain&&fieldBuf) fieldGain.gain.setTargetAtTime(l2?0:1,t,l2?0.3:0.8);
  if(!runGain) return; const on=l2?0:stepsFor(girl), pon=l2?0:stepsFor(boy);
  runGain.gain.setTargetAtTime(on*0.9,t,l2?0.03:on>0?0.05:0.09); runSrc.playbackRate.setTargetAtTime(1+0.28*on,t,0.15);
  palGain.gain.setTargetAtTime(pon*0.75,t,l2?0.03:pon>0?0.05:0.09); palSrc.playbackRate.setTargetAtTime(1.1*(1+0.28*pon),t,0.15); }
soundBtn.addEventListener('click',e=>{ e.stopPropagation(); startSound(); soundOn=!soundOn; showSound(); try{ localStorage.setItem('ff3dSound',soundOn?'on':'off'); }catch(_){ }
  if(master) master.gain.setTargetAtTime(soundOn?0.85:0,actx.currentTime,0.15); });
soundBtn.addEventListener('pointerdown',e=>e.stopPropagation());
addEventListener('keydown',()=>startSound()); addEventListener('pointerdown',()=>startSound());
document.addEventListener('visibilitychange',()=>{ if(!actx) return; if(document.hidden) actx.suspend(); else actx.resume(); });
showSound();
