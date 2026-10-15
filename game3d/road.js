/* Flamingo Fields 3D: the feather road to the moon, on the 2D game's rules. A clue, not a signpost.

   On a settled night, once the flock is complete, the field's feathers drift slowly out of their places (about 20 s) into a wide road
   that hovers over the grass and runs on toward the moon, away into the horizon: two loose lines, one down each side, the middle left empty,
   with gaps and clumps so the lines never look ruled. The nearest feathers fall into place first. It lies in a fixed place in the world,
   starting a little to one side of where the kids were when it formed. Its feathers are not collected; fly through and they scatter round the kids.
   Wander far from it and it fades, to gather again nearby. Fly along it toward the moon and it answers with a sound (path.mp3), at most every 40 s.

   Near feathers are drawn like the field's (feathers.js); far ones are points of light over the night. Game units and unmirrored coordinates, as in flock.js. */

const ROAD_STEP=130, ROAD_HALF=600, ROAD_END=70000;
let pathOn=false, pathA=0, pathPx=0, pathPz=0, pathAlign=0, hintEl=null, hintWas=false, hintT=-99;
const SUNDX=Math.sin(SUN_B), SUNDZ=Math.cos(SUN_B);   /* toward the sun and the moon, in the game's ground coordinates */
let RDX=SUNDX, RDZ=SUNDZ;                                /* the road's own way: from where it forms, straight to the crater's box */
const roadNear=[];                                       /* this frame's near road feathers, for feathers.js: {x,y,z (metres), ph, a} */

function updatePath(K,dt,time){
  const P=K.P, lx=-P.x/U, lz=P.z/U, hx=-Math.sin(P.h), hz=Math.cos(P.h);
  const lat=(lx-pathPx)*RDZ-(lz-pathPz)*RDX;
  const ok=night>0.98 && freeFly() && (pathA===0 || Math.abs(lat)<6000);     // wander far from it and it fades, to be found again nearby
  if(ok && pathA===0 && COAST.on){ const c=boxC(), dx=c[0]-lx, dz=c[1]-lz, dl=Math.hypot(dx,dz)||1; RDX=dx/dl; RDZ=dz/dl; }   // it points at the crater
  if(ok && pathA===0){ const sd=h2(Math.floor(time),31)<0.5?-1:1; pathPx=lx+RDZ*sd*700; pathPz=lz-RDX*sd*700; }
  pathA=clamp(pathA+(ok?dt/21:-dt/3),0,1);                                    // the gathering is slow
  // the road answers when the kids travel along it toward the moon
  const air=P.state==='fly'||P.state==='land', v=(air?FLY_SPEED*P.flyW+P.spd*(1-P.flyW):P.spd)/U;
  const on=pathOn=pathA>0.3 && Math.abs(lat)<ROAD_HALF+350 && v>60 && (hx*RDX+hz*RDZ)>0.92;
  pathAlign+=((on?1:0)-pathAlign)*(1-Math.exp(-dt*(on?0.9:1.6)));
  if(actx && master){
    if(!hintEl && pathA>0){ hintEl=new Audio('assets/path.mp3'); hintEl.preload='auto';
      try{ const g=actx.createGain(); g.gain.value=0.9; actx.createMediaElementSource(hintEl).connect(g); g.connect(master); }catch(e){ hintEl.volume=0.9; } }
    const hit=on && P.state==='fly';
    if(hintEl && hit && !hintWas && time-hintT>40){ hintT=time; try{ hintEl.currentTime=0; }catch(e){} const pr=hintEl.play(); if(pr&&pr.catch) pr.catch(()=>{}); }
    hintWas=hit; }
}
/* one feather of the road, j steps along it; al is how far along it the kids are */
function trailFeather(j,al,lead,time){
  const t=(j+h2(j,9)-0.5)*ROAD_STEP, ahead=t-al;
  // brightest around the kids, then dimming steadily all the way out until the lines are lost in the horizon
  let a=clamp(pathA*3,0,1)*Math.pow(clamp(1-ahead/ROAD_END,0,1),1.8)*clamp((ahead+1100)/300,0,1);
  // and thinning as it goes, so the far end never piles up into a bright streak
  if(j&1) a*=clamp((4500-ahead)/800,0,1); else if(j&2) a*=clamp((9500-ahead)/1500,0,1); else if(j&4) a*=clamp((19000-ahead)/3000,0,1); else if(j&8) a*=clamp((36000-ahead)/6000,0,1);
  if(COAST.on){ const c=boxC(), rx=pathPx+RDX*t-c[0], rz=pathPz+RDZ*t-c[1]; a*=clamp((-60/U-(rx*RDX+rz*RDZ))/1400,0,1); }   // the road runs on into the crater and ends about 60 m short of the box
  if(a<=0.01 || h2(j,31)<0.16) return null;                                                                        // gaps and clumps
  const e0=clamp(pathA*1.7-clamp(ahead/30000,0,1)*0.7,0,1), e=e0*e0*(3-2*e0);                                     // nearest feathers fall into place first
  const side=h2(j,5)<0.5?-1:1, far=(h2(j,37)-0.5)*2, wob=side*(ROAD_HALF+Math.sin(t*0.0013+side)*70)+(h2(j,17)-0.5)*200+Math.sin(time*0.6+j*1.7)*14*e+far*2200*(1-e);
  let x=pathPx+RDX*t+RDZ*wob, z=pathPz+RDZ*t-RDX*wob, h=(h2(j,23)*70)*e;
  const dx=x-lead.x, dz=z-lead.z, dy=(62+h)-(lead.y+40), d=Math.hypot(dx,dz,dy);
  if(d<150 && d>1){ const p=(1-d/150)*95/d; x+=dx*p; z+=dz*p; h=Math.max(0,h+dy*p); }                             // scatter around the kids as they pass
  return {x,z,h,ph:h2(j,3),a:a*(0.55+0.45*e)};
}

/* the far feathers: points of light, a soft pink halo and a bright core, smaller the farther off (drawn after the night grade) */
const ROAD_MAX=700, roadPos=new Float32Array(ROAD_MAX*3), roadA=new Float32Array(ROAD_MAX), roadK=new Float32Array(ROAD_MAX);
const roadDots=(()=>{ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(roadPos,3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('a',new THREE.BufferAttribute(roadA,1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('k',new THREE.BufferAttribute(roadK,1).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.ShaderMaterial({ uniforms:{uDpr:{value:1}}, transparent:true, depthWrite:false,
    vertexShader:`attribute float a, k; uniform float uDpr; varying float vA; void main(){ vA=a; gl_PointSize=6.0*k*uDpr+1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0) discard;
      vec4 halo=vec4(1.0,170./255.,200./255.,0.26*vA), core=vec4(1.0,224./255.,234./255.,0.85*vA*(1.0-smoothstep(0.3,0.45,d)));
      gl_FragColor=vec4(mix(halo.rgb,core.rgb,core.a), max(halo.a*(1.0-smoothstep(0.7,1.0,d)),core.a)); }` });
  const p=new THREE.Points(g,m); p.frustumCulled=false; p.renderOrder=5; lightScene.add(p); g.setDrawRange(0,0); return p; })();

const _rv=new THREE.Vector3(), _rf=new THREE.Vector3();
function placeRoad(K,time){
  roadNear.length=0; let nd=0;
  if(pathA>0.01){
    const P=K.P, lead={x:-P.x/U, z:P.z/U, y:P.y/U}, al=(lead.x-pathPx)*RDX+(lead.z-pathPz)*RDZ;
    const focal=0.5*innerHeight/Math.tan(cam.fov*Math.PI/360); cam.getWorldDirection(_rf);
    for(let j=Math.floor((al-1100)/ROAD_STEP), j1=Math.floor((al+ROAD_END)/ROAD_STEP); j<=j1; j++){ const q=trailFeather(j,al,lead,time); if(!q) continue;
      const x=-q.x*U, z=q.z*U, y=groundAt(x,z)+(62+q.h)*U; _rv.set(x,y,z).sub(cam.position); const dz=_rv.dot(_rf); if(dz<60*U) continue;
      const s=focal/(dz/U);                                                       // the 2D game's scale: pixels per game unit at this depth
      if(11*s>=2.6) roadNear.push({x,y,z,ph:q.ph,a:q.a});                           // big enough to be a feather
      else if(nd<ROAD_MAX){ const k=clamp(1-(dz/U-3000)/38000,0.3,1); roadPos[nd*3]=x; roadPos[nd*3+1]=y; roadPos[nd*3+2]=z; roadA[nd]=q.a*night; roadK[nd]=k; nd++; } } }   // farther, a point of light
  blueFeathers(K,time);
  const g=roadDots.geometry; g.setDrawRange(0,nd); if(nd){ g.attributes.position.needsUpdate=g.attributes.a.needsUpdate=g.attributes.k.needsUpdate=true; } roadDots.material.uniforms.uDpr.value=R.getPixelRatio();
}

/* ---------- the blue feathers: five single ones down the middle of the road, low over the ground, so the kids must dive for them.
   Fly through one and the flight bursts ahead for a few seconds (sound.js). They come back each time the road forms. ---------- */
const BLUE_N=5, BLUE_H=75, BLUE_R=110, BURST_TIME=4, BURST=0.8;   // height over the ground and pick-up reach (game units), the burst's seconds and extra speed
const blueGot=new Set(); let blueSpr=null, burstUntil=-9;
function blueFeathers(K,time){
  if(pathA===0) blueGot.clear();
  if(!FEATHER_TEX) return;
  if(!blueSpr){ blueSpr=[]; for(let i=0;i<BLUE_N;i++){
      const card=new THREE.Sprite(new THREE.SpriteMaterial({map:FEATHER_TEX, color:'#7fb2ff', transparent:true, depthWrite:false, fog:false, alphaTest:0.05}));
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:'#8fc0ff', transparent:true, depthWrite:false, fog:false}));
      card.renderOrder=3; glow.renderOrder=4; card.visible=glow.visible=false; scene.add(card); lightScene.add(glow); blueSpr.push({card,glow}); } }
  const show=pathA>0.3 && COAST.on && LEVEL===1;
  let L=0; if(show){ const c=boxC(); L=(c[0]-pathPx)*RDX+(c[1]-pathPz)*RDZ-60/U-1500; }
  const P=K.P, kx=-P.x/U, kz=P.z/U;
  for(let i=0;i<BLUE_N;i++){ const S=blueSpr[i];
    if(!show || L<2000 || blueGot.has(i)){ S.card.visible=S.glow.visible=false; continue; }
    const t=L*(i+1)/(BLUE_N+1), gx=pathPx+RDX*t, gz=pathPz+RDZ*t, x=-gx*U, z=gz*U, y=groundAt(x,z)+(BLUE_H+Math.sin(time*2+i)*6)*U;
    if(Math.hypot(gx-kx,gz-kz)<BLUE_R && P.y/U<BLUE_H+BLUE_R){ blueGot.add(i); burstUntil=time+BURST_TIME; [7,12,16,19].forEach((n,q)=>setTimeout(()=>chime(n),q*60)); continue; }
    const a=clamp(pathA*3-1,0,1), sz=1.6;
    S.card.visible=S.glow.visible=true; S.card.position.set(x,y,z); S.glow.position.set(x,y,z);
    S.card.scale.set(FEATHER_W*sz,FEATHER_LEN*sz,1); S.card.material.rotation=-(0.6+Math.sin(time*1.6+i)*0.5); S.card.material.opacity=a;
    const gr=FEATHER_LEN*sz*3.2; S.glow.scale.set(gr,gr,1); S.glow.material.opacity=(0.55+0.3*Math.sin(time*4+i))*a; }
}
const burstNow=()=>clamp((burstUntil-clock)/1,0,1);   // 1 during the burst, easing off over its last second
