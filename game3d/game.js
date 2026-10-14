/* ---------- Game: the one loop, in a fixed order, and the start ----------
   Each frame: the kids move; the level's own world (level 1: the desert and its door; level 2: the clouds); flying near whales;
   the whales; the kids drawn into place and the camera after them; on level 1 the wild flocks, the feather road and the feathers;
   your flock; the ground, grass, seeds and clouds following the kids; then the day and night, the last things placed from this
   frame's camera, the drawing, the overlays and the sound. */
let last=performance.now(), clock=0, fpsT=0, fpsN=0, slowFrames=0;
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  if(girl){ clock+=dt;
    updateFlySpeed(dt); stepKid(girl,dt,flockAssist(keyInput(),girl.P.state==='fly'));
    watchLeader(girl,boy,clock); for(let i=events.length-1;i>=0;i--) if(events[i].at<=clock){ const e=events.splice(i,1)[0]; e.f(); }
    stepKid(boy,dt,followInput(girl,boy));
    if(LEVEL===1){ updateDesert(dt,clock); updateDoor(dt,clock); } else updateClouds(dt,clock);
    updateRings(dt,clock); updateLift(dt); updateWhales(dt); updateRidges();
    for(const K of [girl,boy]){ K.mixer.update(dt); placeKid(K); bendArms(K); const cs=K.P.y<2.5; if(K.cs!==cs){ K.cs=cs; K.root.traverse(n=>{ if(n.isMesh) n.castShadow=cs; }); } }   /* high in the air the low sun would stretch their shadows into long bands across the field */
    placeCam(girl,dt,false);
    if(LEVEL===1) updateFlock(girl,dt,clock); else flock=null;   // no wild flocks, feather road or feathers on the clouds
    placeFlock(dt,clock); updateMates(girl,dt,clock); placeMates(dt);
    if(LEVEL===1){ updatePath(girl,dt,clock); pickFeathers(clock); } else { pathA=0; pathOn=false; }
    flightRules(dt); placeRoad(girl,clock); if(LEVEL===1) placeFeathers(girl,clock);
    followGround(girl.P.x,girl.P.z); moveSeeds(dt,clock); moveClouds(clock);
    rollDunes(dt); groundTime.value=clock; groundAir.value=clamp((cam.position.y-groundAt(cam.position.x,cam.position.z)-120*U)/(200*U),0,1);
    for(const gm of grassAll){ const u=gm.material.uniforms; u.uCentre.value.set(girl.P.x,girl.P.z); u.uTime.value=clock; u.uAir.value=groundAir.value;
      u.uKid0.value.set(girl.P.x,girl.P.y,girl.P.z); u.uKid1.value.set(boy.P.x,boy.P.y,boy.P.z); } }
  nightFrame(clock); devFrame(); placeWhales(); level2Frame(); placeBank(); renderFrame(); overlays(clock); drawHud(clock); updateRunSound(); if(actx){ updateFlamSound(); updateMusic(); updateFastSound(); }
  /* frame rate: shown with the ` key; on a slow device the grass thins itself */
  fpsN++; fpsT+=dt; if(fpsT>=1){ const fps=fpsN/fpsT; $('stats').textContent=fps.toFixed(0)+' fps · '+(grassAll.reduce((a,gm)=>a+gm.geometry.instanceCount,0)/1000).toFixed(0)+'k blades';
    if(fps<40) slowFrames++; else slowFrames=0; if(slowFrames>=3&&grass.geometry.instanceCount>25000){ for(const gm of grassAll) gm.geometry.instanceCount=Math.round(gm.geometry.instanceCount*0.75); slowFrames=0; }
    fpsN=0; fpsT=0; }
  requestAnimationFrame(frame);
}
function size(){ const w=innerWidth,h=innerHeight; R.setSize(w,h); cam.aspect=w/h; cam.updateProjectionMatrix(); }
addEventListener('resize',size); size();
layCrater();   /* the crater and its box are there from the start (desert.js) */
followGround(0,0);
(async()=>{
  try{ await loadKids('assets/');
    girl.P.h=0.1; boy.P.x=-1.5; boy.P.z=-1.4; boy.P.h=0.1;
    placeCam(girl,0,true); $('load').hidden=true;
    loadFlamingo('assets/').catch(err=>console.error('Could not load the flamingos',err));
    loadFeathers('assets/').catch(err=>console.error('Could not load the feather',err)); }   /* the flocks load behind the scenes; the first comes after 30 s */
  catch(err){ $('load').textContent='Could not load the kids: '+err.message; console.error(err); }
  requestAnimationFrame(frame);
})();
