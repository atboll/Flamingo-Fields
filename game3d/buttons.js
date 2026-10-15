/* ---------- Buttons: Reset level for everyone; the test buttons (+1 flamingo, To the box, Dusk) only with the dev switch (settings.js) ---------- */
for(const b of document.querySelectorAll('#btns .dev')) b.hidden=!DEV.on;
for(const id of ['plus1','reset','tobox','skipday']) $(id).addEventListener('pointerdown',e=>e.stopPropagation());
function onButton(id,f){ $(id).addEventListener('click',e=>{ e.stopPropagation(); f(); $('view').focus(); }); }
onButton('skipday',()=>skipDayPart());
onButton('tobox',()=>goToBox());
onButton('reset',()=>resetLevel());
onButton('plus1',()=>{ startSound(); giftMate(); $('plus1').disabled=LEVEL===2||mates.length>=MATES_MAX; });

/* Reset level: level 1 from the start. The kids back where they began, no feathers, no flock, the wild flocks starting over,
   the feathers back in the grass, and the golden evening standing still again. */
function resetLevel(){
  if(!girl) return;
  leaveLevel2();
  feathers=0; flightLeft=0; got.clear(); lastGot=-9;
  mates.length=0; mateMsgT=-99; flock=null; flockN=0; nextFlock=clock+FLOCK_FIRST;
  nightOn=false; dayOffset=-clock; night=0; pathA=0; roadLaid=false; pathAlign=0; pathOn=false; clearCoast(); layCrater(); arrived=false; doorNear=0; doorIn=0; FLY_SPEED=FLY_BASE; ALT_MAX=640*U;
  if(padEl){ padEl.pause(); try{ padEl.currentTime=0; }catch(_){ } } padPlayed=false;
  events.length=0; keys.clear();
  [[girl,0,0],[boy,-1.5,-1.4]].forEach(([K,x,z])=>{ Object.assign(K.P,{x,z,y:0,vy:0,h:0.1,turn:0,bank:0,pitch:0,spd:0,alt:CRUISE,state:'ground',crouch:0,upLock:false}); });
  placeCam(girl,0,true); $('plus1').disabled=false;
}
