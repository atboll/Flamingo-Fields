/* ---------- Dev: the test modes, the build stamp, and the ground check ----------
   Nothing here runs without the dev switch (settings.js): #dev, #dev-level2, #dev-dunes or #dev-flamingo.
   devFrame is called by the loop (game.js) just before drawing. */
(function(){
let devFrameFn=()=>{};
window.devFrame=()=>devFrameFn();
if(!DEV.on) return;

/* the stamp in the bottom right corner (above the frame rate, which the ` key shows): which build this is, which mode, and whether the two grounds agree */
const tag=document.createElement('div'); tag.id='devTag';
Object.assign(tag.style,{position:'fixed',right:'max(12px,env(safe-area-inset-right))',bottom:'calc(max(12px,env(safe-area-inset-bottom)) + 30px)',zIndex:6,pointerEvents:'none',
  padding:'4px 10px',borderRadius:'999px',background:'rgba(40,28,14,.6)',color:'#fff4de',font:'11px/1.3 ui-monospace,Menlo,monospace',whiteSpace:'nowrap'});
document.body.appendChild(tag);
let groundNote='ground check: waiting';
function showTag(){ tag.textContent='dev'+(DEV.mode?' · '+DEV.mode:'')+' · '+(window.BUILD||'local files')+' · '+groundNote; }
showTag();

/* ---------- the ground check: the graphics card's ground (GROUND_GLSL) against groundAt, at 64 points round the kids ----------
   Run when the game starts (the field) and again when the desert is first laid (the dunes). Both must give the same heights;
   if someone changes one and not the other, the grass and the sand's paint would no longer sit on the ground. */
const N=64;
let checkMat=null, checkRT=null, checkScene=null, checkCam=null;
function groundCheck(where){
  if(LEVEL!==1) return;
  try{
    if(!checkMat){
      checkRT=new THREE.WebGLRenderTarget(N,1,{type:THREE.FloatType, format:THREE.RGBAFormat, minFilter:THREE.NearestFilter, magFilter:THREE.NearestFilter, depthBuffer:false});
      checkMat=new THREE.ShaderMaterial({ uniforms:{uP:{value:Array.from({length:N},()=>new THREE.Vector2())}, uCoast, uDuneA, uDuneB},
        vertexShader:'void main(){ gl_Position=vec4(position.xy,0.0,1.0); }',
        fragmentShader:`precision highp float; uniform vec2 uP[${N}];
          ${GROUND_GLSL}
          void main(){ int i=int(gl_FragCoord.x); gl_FragColor=vec4(groundAt(uP[i]),0.0,0.0,1.0); }`});
      checkScene=new THREE.Scene(); checkScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),checkMat)); checkCam=new THREE.Camera(); }
    const P=girl.P, pts=checkMat.uniforms.uP.value, r=rng(7);
    for(let i=0;i<N;i++){ const a=r()*6.283, d=20+r()*900; pts[i].set(P.x+Math.cos(a)*d, P.z+Math.sin(a)*d); }
    const prev=R.getRenderTarget(); R.setRenderTarget(checkRT); R.render(checkScene,checkCam); const out=new Float32Array(N*4); R.readRenderTargetPixels(checkRT,0,0,N,1,out); R.setRenderTarget(prev);
    let worst=0; for(let i=0;i<N;i++) worst=Math.max(worst,Math.abs(out[i*4]-groundAt(pts[i].x,pts[i].y)));
    const ok=worst<0.02;   // two centimetres: the card's arithmetic is a little coarser
    groundNote=where+' ground '+(ok?'agrees':'DIFFERS')+' ('+worst.toFixed(3)+' m)';
    (ok?console.log:console.error)('[dev] '+groundNote);
  }catch(e){ groundNote='ground check unavailable'; console.warn('[dev] ground check unavailable',e); }
  showTag(); }

window.groundCheck=groundCheck;   // (can be run again from the console)

/* ---------- the test modes ---------- */
let started=false, checkedField=false, checkedDesert=false;
const ready=()=>girl && FL.ready;
devFrameFn=()=>{
  if(girl && !checkedField){ checkedField=true; groundCheck('field'); }
  if(girl && COAST.on && LEVEL===1 && !checkedDesert){ checkedDesert=true; groundCheck('desert'); }
  if(!started && ready()){ started=true; start(); }
  if(flam) flamFrame(); };
function hideHint(){ const h=$('hint'); if(h) h.hidden=true; }

function start(){
  if(DEV.mode==='level2'){ goToBox(); enterLevel2(); }
  /* the kids out in the dunes, a full flock (so they can fly), facing the box about 300 m off */
  if(DEV.mode==='dunes'){ for(let i=0;i<5;i++) giftMate(); goToBox(); arrived=true;
    const c=boxC(), d=BOX_HALF+20000, gx=c[0]-SUNDX_G*d, gz=c[1]-SUNDZ_G*d;
    [[girl,0,0],[boy,1.0,-1.3]].forEach(([K,ox,oz])=>Object.assign(K.P,{x:-gx*U+ox, z:gz*U+oz, y:0, vy:0, h:-SUN_B, state:'ground', spd:0}));
    mates.forEach(m=>{ m.x=gx; m.z=gz; m.y=0; }); placeCam(girl,0,true); }
  if(DEV.mode==='flamingo') flamStart();
  /* the kids at the edge of the fog round the box, about 400 m out along the way they come, with a full flock; the door still shut */
  if(DEV.mode==='box'){ for(let i=0;i<5;i++) giftMate(); const P=girl.P, d0=8000-SHORE; makeCoast(-P.x/U+SUNDX_G*d0, P.z/U+SUNDZ_G*d0); coastA=1;
    const c=boxC(), d=BOX_HALF+26500, gx=c[0]-SUNDX_G*d, gz=c[1]-SUNDZ_G*d;
    [[girl,0,0],[boy,1.0,-1.3]].forEach(([K,ox,oz])=>Object.assign(K.P,{x:-gx*U+ox, z:gz*U+oz, y:0, vy:0, h:-SUN_B, state:'ground', spd:0}));
    mates.forEach(m=>{ m.x=gx; m.z=gz; m.y=0; }); placeCam(girl,0,true); }
}

/* ---------- #dev-flamingo: one flamingo standing a few metres in front of the kids, with a button for each of its moves ---------- */
let flam=null;
function flamStart(){
  hideHint();
  const o=THREE.SkeletonUtils.clone(FL.proto); o.visible=true; scene.add(o);
  const mixer=new THREE.AnimationMixer(o), names=Object.keys(FL.clips).sort();
  flam={o, mixer, act:null, speed:1, turn:0, t:clock};
  const css=document.createElement('style'); css.textContent=`
#flamPanel{ position:fixed; left:max(12px,env(safe-area-inset-left)); bottom:max(12px,env(safe-area-inset-bottom)); z-index:6; width:min(300px,calc(100vw - 24px));
  max-height:calc(100vh - 90px); overflow:auto; padding:12px 14px; border-radius:14px; background:rgba(40,28,14,.72); color:#fff4de; font:12px/1.3 system-ui,sans-serif;
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px) }
#flamPanel h2{ margin:0 0 8px; font-size:13px; font-weight:600 }
#flamPanel .clips{ display:flex; flex-wrap:wrap; gap:5px }
#flamPanel button{ font:inherit; font-size:11px; color:#3a2a12; background:#f3d9a4; border:0; border-radius:999px; padding:5px 9px; cursor:pointer }
#flamPanel button[aria-pressed="true"]{ background:#f0a0b4 }
#flamPanel label{ display:grid; grid-template-columns:1fr auto; gap:2px 8px; margin:8px 0 0 }
#flamPanel input[type=range]{ grid-column:1 / -1; width:100%; accent-color:#f0b860 }`;
  document.head.appendChild(css);
  const box=document.createElement('div'); box.id='flamPanel';
  box.innerHTML='<h2>Flamingo test</h2><div class="clips">'+names.map(n=>`<button type="button" data-clip="${n}" aria-pressed="false">${n}</button>`).join('')+'</div>'+
    '<label>Speed <span id="fsV">1.00</span><input type="range" id="fsS" min="0" max="2" step="0.05" value="1"></label>'+
    '<label>Turn <span id="ftV">0°</span><input type="range" id="ftS" min="-180" max="180" step="5" value="0"></label>'+
    '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fgS"> Grass (off, so the legs show)</label>';
  document.body.appendChild(box);
  for(const ev of ['pointerdown','keydown','wheel','touchstart']) box.addEventListener(ev,e=>e.stopPropagation(),{passive:true});
  const play=n=>{ if(flam.act) flam.act.fadeOut(0.25); const a=mixer.clipAction(FL.clips[n]); a.reset().fadeIn(0.25).play(); flam.act=a;
    for(const b of box.querySelectorAll('[data-clip]')) b.setAttribute('aria-pressed',String(b.dataset.clip===n)); };
  box.querySelectorAll('[data-clip]').forEach(b=>b.addEventListener('click',()=>play(b.dataset.clip)));
  $('fsS').addEventListener('input',()=>{ flam.speed=+$('fsS').value; $('fsV').textContent=flam.speed.toFixed(2); });
  $('ftS').addEventListener('input',()=>{ flam.turn=+$('ftS').value*Math.PI/180; $('ftV').textContent=$('ftS').value+'°'; });
  const grassOn=on=>{ for(const g of grassAll) g.visible=on; }; grassOn(false); $('fgS').addEventListener('change',()=>grassOn($('fgS').checked));
  play(FL.clips.idle_A1?'idle_A1':names[0]);
  /* where it stands: 4 m ahead of the girl and a little to her right, facing her */
  const P=girl.P, sx=Math.sin(P.h), cz=Math.cos(P.h); flam.x=P.x+sx*4-cz*1.4; flam.z=P.z+cz*4+sx*1.4; flam.h=P.h+Math.PI;
}
function flamFrame(){
  const dt=Math.min(0.05,Math.max(0,clock-flam.t)); flam.t=clock; flam.mixer.update(dt*flam.speed);
  flam.o.position.set(flam.x,groundAt(flam.x,flam.z),flam.z); flam.o.rotation.y=flam.h+flam.turn; }
})();
