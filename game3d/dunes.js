/* ---------- Dunes: the far ridges on the horizon, and the Dune Test Field ----------
   The far ridges: three rings of painted dune silhouettes standing on the horizon in the desert's direction, paler the farther they are,
   like the ranges, so the desert ends in soft layered ridges in the mist. Off in the game until chosen (DUNE.ridges).
   The Dune Test Field (window.DUNETEST, or the #dunetest address): the kids out in the desert with sliders for the dunes' shape and paint,
   and a box showing the settings to copy back into the game. */
(function(){
/* ---------- the far ridges ---------- */
const RIDGES=[{r:2350,h:62,col:[226,172,104],ks:[5,9,14,23],ph:[0.4,2.2,4.1,1.3]},
              {r:2500,h:50,col:[238,196,128],ks:[6,11,17,27],ph:[3.1,0.7,2.5,5.2]},
              {r:2650,h:38,col:[246,218,160],ks:[7,12,19,31],ph:[1.8,4.4,0.2,3.6]}];
const ridgeG=new THREE.Group(); ridgeG.visible=false; ranges.add(ridgeG);
for(const Rg of RIDGES){ const N=500, pos=[], col=[], idx=[];
  for(let i=0;i<=N;i++){ const th=SUN_B+(i/N-0.5)*2.4, d=Math.abs(i/N-0.5)*2, fade=Math.pow(Math.max(0,1-d),0.6);   // an arc of about 140 degrees toward the box, sinking at its ends
    const n=0.45*Math.sin(Rg.ks[0]*th+Rg.ph[0])+0.3*Math.sin(Rg.ks[1]*th+Rg.ph[1])+0.17*Math.sin(Rg.ks[2]*th+Rg.ph[2])+0.08*Math.sin(Rg.ks[3]*th+Rg.ph[3]);
    const hh=Rg.h*(0.35+0.65*Math.pow(0.5+0.5*n,1.4))*fade, x=-Math.sin(th)*Rg.r, z=Math.cos(th)*Rg.r;
    pos.push(x,-20,z, x,hh,z); const top=Rg.col, foot=mixA(Rg.col,HAZE,0.45); col.push(foot[0]/255,foot[1]/255,foot[2]/255, top[0]/255,top[1]/255,top[2]/255);
    if(i<N){ const a=i*2; idx.push(a,a+2,a+1, a+1,a+2,a+3); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true, fog:false, side:THREE.DoubleSide})); m.renderOrder=-7; m.frustumCulled=false;
  m.material.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <encodings_fragment>',''); };   // the ranges' way: colours as given
  ridgeG.add(m); }
const _ud=updateDesert;
updateDesert=function(dt,time){ _ud(dt,time);
  /* shown out in the desert itself, rising as the kids go deeper into it */
  let on=false; if(DUNE.ridges && COAST.on && !(window.level2On&&level2On()) && !window.IN_ROOM){ const P=girl.P, cs=coastAlong(-P.x/U,P.z/U); on=cs>800; }
  ridgeG.visible=on; };

/* ---------- the Dune Test Field ---------- */
if(!(window.DUNETEST || location.hash==='#dunetest')) return;
const SL=[
  ['size','Dune size',0.4,2.5,0.05,'how far apart the dunes are'],
  ['height','Dune height',0,2.5,0.05,''],
  ['round','Sharpness',0.5,2.5,0.05,'low: round soft bodies; high: thin sharp ridges'],
  ['curve','Curves',0,2.5,0.05,'how much the crests bend'],
  ['cross','Cross dunes',0,0.8,0.02,'a second set at an angle, joining the first'],
  ['angle','Cross angle',0,1.5,0.02,''],
  ['contrast','Light contrast',0.5,5,0.05,''],
  ['soft','Softness',0,1,0.02,'0: two hard tones; 1: a smooth gradient'],
  ['crest','Crest line',0,1,0.02,'a bright edge along each crest'],
  ['warm','Warm shadows',0,1,0.02,'0: cool grey; 1: rich orange'],
  ['ripple','Ripples',0,3,0.05,''],
  ['ridges','Horizon ridges',0,1,1,'layered dune silhouettes on the horizon']];
const css=document.createElement('style'); css.textContent=`
#dunePanel{ position:fixed; left:max(12px,env(safe-area-inset-left)); bottom:max(12px,env(safe-area-inset-bottom)); z-index:6; width:min(300px,calc(100vw - 24px));
  max-height:calc(100vh - 90px); overflow:auto; padding:12px 14px; border-radius:14px; background:rgba(40,28,14,.72); color:#fff4de; font:12px/1.3 system-ui,sans-serif;
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px) }
#dunePanel h2{ margin:0 0 8px; font-size:13px; font-weight:600; display:flex; justify-content:space-between; align-items:center }
#dunePanel h2 button{ font:inherit; font-size:11px; color:#fff4de; background:rgba(255,255,255,.14); border:0; border-radius:999px; padding:3px 10px; cursor:pointer }
#dunePanel label{ display:grid; grid-template-columns:1fr auto; gap:2px 8px; margin:7px 0 }
#dunePanel label span.v{ font-variant-numeric:tabular-nums; opacity:.85 }
#dunePanel input[type=range]{ grid-column:1 / -1; width:100%; accent-color:#f0b860 }
#dunePanel small{ grid-column:1 / -1; opacity:.6 }
#dunePanel textarea{ width:100%; box-sizing:border-box; height:64px; margin-top:6px; font:11px ui-monospace,monospace; color:#3a2a12; background:#fff6e4; border:0; border-radius:8px; padding:6px }
#dunePanel.min label, #dunePanel.min textarea, #dunePanel.min .row{ display:none }
#dunePanel .row{ display:flex; gap:6px; margin-top:8px }
#dunePanel .row button{ flex:1; font:inherit; color:#3a2a12; background:#f3d9a4; border:0; border-radius:999px; padding:6px; cursor:pointer }`;
document.head.appendChild(css);
const box=document.createElement('div'); box.id='dunePanel';
box.innerHTML='<h2>Dune Test Field <button type="button" id="duneMin">Hide</button></h2>'+SL.map(([k,n,a,b,st,h])=>
  `<label>${n}<span class="v" id="dv_${k}"></span><input type="range" id="ds_${k}" min="${a}" max="${b}" step="${st}" value="${DUNE[k]}">${h?`<small>${h}</small>`:''}</label>`).join('')+
  '<div class="row"><button type="button" id="duneReset">Start values</button><button type="button" id="duneCopy">Copy settings</button></div><textarea id="duneOut" readonly aria-label="Settings to copy"></textarea>';
document.body.appendChild(box);
for(const ev of ['pointerdown','keydown','wheel','touchstart']) box.addEventListener(ev,e=>e.stopPropagation(),{passive:true});
const START=Object.assign({},DUNE), shapeKeys=['size','height','round','curve','cross','angle'];
let rebuild=null;
function out(){ $('duneOut').value='DUNE='+JSON.stringify(Object.fromEntries(SL.map(([k])=>[k,DUNE[k]]))); for(const [k] of SL) $('dv_'+k).textContent=k==='ridges'?(DUNE[k]?'on':'off'):(+DUNE[k]).toFixed(2); }
function set(k,v){ DUNE[k]=v; duneUniforms(); out();
  if(shapeKeys.includes(k)){ clearTimeout(rebuild); rebuild=setTimeout(()=>{ groundNear.userData.cx=groundFar.userData.cx=NaN; },120); } }   // the ground is laid again with the new shape
for(const [k] of SL){ const el=$('ds_'+k); el.addEventListener('input',()=>set(k,+el.value)); }
$('duneReset').addEventListener('click',()=>{ for(const [k] of SL){ $('ds_'+k).value=START[k]; set(k,START[k]); } });
$('duneCopy').addEventListener('click',()=>{ const t=$('duneOut'); try{ navigator.clipboard.writeText(t.value).catch(()=>{ t.select(); }); }catch(e){ t.select(); } $('duneCopy').textContent='Copied'; setTimeout(()=>$('duneCopy').textContent='Copy settings',1500); });
$('duneMin').addEventListener('click',()=>{ box.classList.toggle('min'); $('duneMin').textContent=box.classList.contains('min')?'Show':'Hide'; });
out();
{ const h=$('hint'); if(h) h.hidden=true; }
/* the kids out in the dunes, a full flock (so they can fly), facing the box about 300 m off */
let started=false;
const _rf=renderFrame;
renderFrame=function(){
  if(!started && girl && FL.ready){ started=true; for(let i=0;i<5;i++) giftMate(); goToBox(); arrived=true;
    const c=boxC(), d=BOX_HALF+20000, gx=c[0]-SUNDX_G*d, gz=c[1]-SUNDZ_G*d;
    [[girl,0,0],[boy,1.0,-1.3]].forEach(([K,ox,oz])=>Object.assign(K.P,{x:-gx*U+ox, z:gz*U+oz, y:0, vy:0, h:-SUN_B, state:'ground', spd:0}));
    mates.forEach(m=>{ m.x=gx; m.z=gz; m.y=0; }); placeCam(girl,0,true); }
  _rf(); };
})();
