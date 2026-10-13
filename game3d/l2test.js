/* ---------- Level 2 floor test: a sea of cloud, two ways side by side ----------
   Only runs when the page asks for it (window.L2TEST, or the #l2test address). The game itself is untouched otherwise.
   The floor is the 2D game's level 2: candyfloss pinks, hills a tenth lower, nothing standing on the horizon, no moon.
   The cloud lumps are found exactly as the 2D game finds them: in bands of distance from the camera, one lump per cell of
   a grid that gets coarser with distance. Because the bands belong to the camera, the lumps swim, swell and pop as you move.
   A (left patch): the lumps as real 3D shapes, flat pinks, no light, crowns poking out of them.
   B (right patch): the 2D game's own painting of them, ellipses on a flat canvas laid over the view (behind the kids, and in front of them for the nearer ones).
   The button swaps between both patches, all A and all B. */
(function(){
if(!(window.L2TEST || location.hash==='#l2test')) return;

/* the land: a tenth lower, as on the clouds of level 2 */
const _ground=groundAt; groundAt=function(x,z){ return _ground(x,z)*0.9; };
groundNear.userData.cx=NaN; groundFar.userData.cx=NaN;

/* the 2D game's level 2 colours */
const GSTOPS2=[[0,[250,234,238]],[0.1,[246,212,226]],[0.45,[234,182,210]],[1,[208,152,198]]], HAZE2=[250,232,238], DEEP2=[196,140,190];
const BLADE2=[[214,160,202],[230,184,214],[242,204,226],[250,224,236],[255,244,248]];
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const css=c=>'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';

/* nothing stands above a sea of cloud: no grass, no treelines, no ranges; the haze and the horizon mist turn pink */
for(const g of grassAll) g.visible=false;
for(const m of treelines) m.visible=false;
for(const m of rangeMeshes) m.visible=false;
mistBand.material.uniforms.uC.value.set(HAZE2[0]/255,HAZE2[1]/255,HAZE2[2]/255);
scene.fog.color.setRGB(HAZE2[0]/255,HAZE2[1]/255,HAZE2[2]/255).convertSRGBToLinear();

/* the bare floor between the lumps: the 2D game's pink ground, pale at the horizon and deeper under the eye, lighter on slopes facing the light */
const st=GSTOPS2.map(s=>`vec4(${(s[1][0]/255).toFixed(4)},${(s[1][1]/255).toFixed(4)},${(s[1][2]/255).toFixed(4)},${s[0].toFixed(2)})`);
function floorMat(far){ return new THREE.ShaderMaterial({ uniforms:{uNearC, uCoast, uSunXZ:{value:SUNXZ}},
  vertexShader:`uniform vec2 uNearC; varying vec3 vW;
    void main(){ vec3 p=position; ${far?'{ vec2 q=abs(position.xz-uNearC); p.y-=0.3+6.0*(1.0-smoothstep(118.0,128.0,max(q.x,q.y))); }':''}
      vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec2 uSunXZ; varying vec3 vW;
    ${LIGHT_GLSL}
    vec3 gst(float v){ vec4 a=${st[0]}, b=${st[1]}, c=${st[2]}, d=${st[3]};
      if(v<b.w) return mix(a.rgb,b.rgb,v/b.w); if(v<c.w) return mix(b.rgb,c.rgb,(v-b.w)/(c.w-b.w)); return mix(c.rgb,d.rgb,(v-c.w)/(d.w-c.w)); }
    void main(){ float d=length(vW.xz-cameraPosition.xz), v=clamp((cameraPosition.y-vW.y)/max(d,1.0)*1.64,0.0,1.0);
      float k=clamp(1.0+litAt(vW.xz,uSunXZ)*0.9*1.8,0.72,1.25);
      gl_FragColor=vec4(min(gst(v)*k,vec3(1.0)),1.0); }`}); }
groundNear.material=floorMat(false); groundFar.material=floorMat(true);
groundNear.renderOrder=-3; groundFar.renderOrder=-3;

/* where each way is shown: two patches side by side ahead of where the kids start (they look along +z; +x is the left of the screen) */
const PATCH={A:{x0:2,x1:30,z0:-12,z1:48}, B:{x0:-30,x1:-2,z0:-12,z1:48}};
let mode='split';   // 'split', 'A' or 'B'
const inP=(P,x,z)=>x>=P.x0&&x<=P.x1&&z>=P.z0&&z<=P.z1;
function whichWay(wx,wz){ if(mode==='A') return 1; if(mode==='B') return 2; return inP(PATCH.A,wx,wz)?1:inP(PATCH.B,wx,wz)?2:0; }

/* the 2D game's bands of distance, in its own units */
const BANDS=[
  {a:95,  b:520, sp:13}, {a:520, b:1100,sp:26}, {a:1100,b:2000,sp:52}, {a:2000,b:3800,sp:104},
  {a:3800,b:7600,sp:208}, {a:7600,b:15200,sp:416}, {a:15200,b:30400,sp:832}, {a:30400,b:60800,sp:1664}];

/* A: the lumps as 3D shapes */
const MAXA=16000;
const lumpMat=new THREE.MeshBasicMaterial({fog:false});
const baseA=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,7),lumpMat,MAXA), crownA=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,6),lumpMat,MAXA);
for(const m of [baseA,crownA]){ m.frustumCulled=false; m.count=0; m.setColorAt(0,new THREE.Color()); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
const _c=new THREE.Color();

/* B: the 2D painting, on two flat sheets over the view: lumps beyond the kids before them, nearer ones after */
function sheet(order,front){ const cv=document.createElement('canvas'), tex=new THREE.CanvasTexture(cv); tex.minFilter=THREE.LinearFilter; tex.generateMipmaps=false;
  const mat=new THREE.ShaderMaterial({ uniforms:{t:{value:tex}}, depthTest:false, depthWrite:false, transparent:front, fog:false,
    blending:front?THREE.NormalBlending:THREE.CustomBlending, blendSrc:THREE.SrcAlphaFactor, blendDst:THREE.OneMinusSrcAlphaFactor,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader:`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor=texture2D(t,vUv); }`});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat); m.frustumCulled=false; m.renderOrder=order; scene.add(m);
  return {cv, g:cv.getContext('2d'), tex, m}; }
const back=sheet(-2,false), front=sheet(999,true);

/* the HUD: what is where, and the button */
{ const h=$('hint'); if(h){ h.hidden=false; h.innerHTML='<b>Level 2 floor test</b> · left patch <b>A</b>: 3D cloud lumps · right patch <b>B</b>: the 2D game\'s painter'; } }
for(const id of ['reset','tobox']){ const b=$(id); if(b) b.hidden=true; }
const old=$('plus1'), btn=old.cloneNode(false); btn.textContent='A | B'; btn.title='Switch: both patches, all A, all B'; btn.disabled=false; old.replaceWith(btn);
const NAMES={split:'A | B', A:'All A', B:'All B'};
btn.addEventListener('pointerdown',e=>e.stopPropagation());
btn.addEventListener('click',e=>{ e.stopPropagation(); mode=mode==='split'?'A':mode==='A'?'B':'split'; btn.textContent=NAMES[mode]; $('view').focus(); });
/* level 2 is always night in the 2D game; the day button still works */
nightOn=true; dayOffset+=300-dayPhase(clock);

/* each frame, the lumps found the 2D game's way and drawn both ways */
const _v=new THREE.Vector3(), _f=new THREE.Vector3(), _r=new THREE.Vector3();
function slopeLit(wx,wz){ const e=0.6, gx=(groundAt(wx+e,wz)-groundAt(wx-e,wz))/(2*e), gz=(groundAt(wx,wz+e)-groundAt(wx,wz-e))/(2*e); return -(gx*SUNXZ.x+gz*SUNXZ.y); }
function cloudFloor(time){
  const W=innerWidth, H=innerHeight;
  for(const s of [back,front]){ if(s.cv.width!==W||s.cv.height!==H){ s.cv.width=W; s.cv.height=H; s.tex.dispose(); } s.g.clearRect(0,0,W,H); }
  cam.getWorldDirection(_f); const fl=Math.hypot(_f.x,_f.z)||1, fwdX=-_f.x/fl, fwdZ=_f.z/fl, rgtX=fwdZ, rgtZ=-fwdX;   // in the 2D game's units (its x runs the other way)
  _r.setFromMatrixColumn(cam.matrixWorld,0);                                                                         // the camera's right, in the world
  const camPx=-cam.position.x/U, camPz=cam.position.z/U, tanH=cam.aspect*Math.tan(cam.fov*Math.PI/360), ppmK=(H/2)/Math.tan(cam.fov*Math.PI/360);
  const P=girl.P, hk=Math.pow(Math.max(1,(cam.position.y-groundAt(P.x,P.z))/(90*U)),0.75);
  const kdz=(-P.x/U-camPx)*fwdX+(P.z/U-camPz)*fwdZ;                                                                   // how far ahead the kids stand
  const A=baseA.instanceMatrix.array, AC=crownA.instanceMatrix.array; let na=0;
  for(let bi=BANDS.length-1;bi>=0;bi--){
    const b=BANDS[bi], sp=b.sp, nbin=Math.ceil((b.b-b.a)/sp), bins=new Array(nbin).fill(null);
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(const d of [b.a,b.b]) for(const sg of [-1,1]){ const cx=sg*(d*tanH+sp*4), wx=camPx+rgtX*cx+fwdX*d, wz=camPz+rgtZ*cx+fwdZ*d;
      if(wx<x0)x0=wx; if(wx>x1)x1=wx; if(wz<z0)z0=wz; if(wz>z1)z1=wz; }
    const i0=Math.floor(x0/sp)-1, i1=Math.ceil(x1/sp)+1, j0=Math.floor(z0/sp)-1, j1=Math.ceil(z1/sp)+1;
    for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){
      let rx=i*sp-camPx, rz=j*sp-camPz, dz=rx*fwdX+rz*fwdZ; if(dz<b.a-sp||dz>b.b+sp) continue;
      let cx=rx*rgtX+rz*rgtZ; if(Math.abs(cx)>dz*tanH+sp*4) continue;
      const r1=h2(i,j+bi*7919), r2=h2(i+31,j-bi*131), x=(i+(r1-0.5)*0.9)*sp, z=(j+(r2-0.5)*0.9)*sp;
      rx=x-camPx; rz=z-camPz; dz=rx*fwdX+rz*fwdZ; if(dz<b.a||dz>=b.b) continue;
      const wx=-x*U, wz=z*U, way=whichWay(wx,wz); if(!way) continue;
      const rr=h2(i*7,j*3+bi*977), cap=26+rr*12+Math.max(0,dz-500)*0.06, rw=Math.min(sp*(0.55+0.5*rr),cap)*(1+0.08*Math.sin(time*0.27+rr*17));
      const wy=groundAt(wx,wz), lit=slopeLit(wx,wz), c=clamp(Math.floor(rr*2.4+lit*6+0.6),0,3), bob=Math.sin(time*0.35+rr*40);
      const bn=Math.min(nbin-1,Math.floor((dz-b.a)/sp)), bz=b.a+bn*sp+sp/2;
      const hz=Math.pow(clamp((bz/hk-320)/9000,0,1),0.6)*0.96, near=clamp((330-bz)/220,0,1)*0.55;
      if(way===1){ if(na>=MAXA) continue;
        const rm=rw*U, cy=wy+rm*(0.15-0.12*bob), o=na*16;
        A[o]=rm*1.35; A[o+5]=rm*0.85; A[o+10]=rm*1.35; A[o+12]=wx; A[o+13]=cy; A[o+14]=wz; A[o+15]=1;
        const tx=cam.position.x-wx, tz=cam.position.z-wz, tl=Math.hypot(tx,tz)||1;   // the crown pokes out of the lump's near face, up and to the left, as the 2D game paints it
        AC[o]=rm*0.8; AC[o+5]=rm*0.5; AC[o+10]=rm*0.8; AC[o+12]=wx+tx/tl*rm*0.75-_r.x*rm*0.3; AC[o+13]=cy+rm*0.32; AC[o+14]=wz+tz/tl*rm*0.75-_r.z*rm*0.3; AC[o+15]=1;
        for(const [m,k] of [[baseA,c],[crownA,c+1]]){ const col=near>0?mixc(BLADE2[k],DEEP2,near):mixc(BLADE2[k],HAZE2,hz); m.setColorAt(na,_c.setRGB(col[0]/255,col[1]/255,col[2]/255).convertSRGBToLinear()); }
        na++; continue; }
      /* B: onto the sheet, the 2D game's two ellipses */
      _v.set(wx,wy,wz).applyMatrix4(cam.matrixWorldInverse); const vz=-_v.z; if(vz<0.05) continue;
      _v.applyMatrix4(cam.projectionMatrix); const bx=(_v.x+1)/2*W, by=(1-_v.y)/2*H, r=rw*U*ppmK/vz;
      const ccy=by-r*0.15+bob*r*0.12;
      const paths=bins[bn]||(bins[bn]={p:[new Path2D(),new Path2D(),new Path2D(),new Path2D(),new Path2D()], dz:bz, hz, near});
      let p=paths.p[c]; p.moveTo(bx+r*1.35,ccy); p.ellipse(bx,ccy,r*1.35,r*0.85,0,0,6.2832);
      p=paths.p[c+1]; const hx=bx-r*0.3, hy=ccy-r*0.32; p.moveTo(hx+r*0.8,hy); p.ellipse(hx,hy,r*0.8,r*0.5,0,0,6.2832);
    }
    /* painted far to near, each strip's five pinks in turn, as the 2D game does */
    for(let bn=nbin-1;bn>=0;bn--){ const B=bins[bn]; if(!B) continue; const g=(b.a+bn*sp+sp)>kdz?back.g:front.g;
      for(let k=0;k<5;k++){ g.fillStyle=css(B.near>0?mixc(BLADE2[k],DEEP2,B.near):mixc(BLADE2[k],HAZE2,B.hz)); g.fill(B.p[k]); } }
  }
  baseA.count=crownA.count=na;
  for(const m of [baseA,crownA]){ m.instanceMatrix.needsUpdate=true; if(m.instanceColor) m.instanceColor.needsUpdate=true; }
  back.tex.needsUpdate=true; front.tex.needsUpdate=true;
}

/* hooked in just before each frame is drawn, after the camera has moved */
const draw=renderFrame;
renderFrame=function(){
  moon.visible=moonHaze.visible=moonBloom.visible=false;   // no moon over the clouds of level 2
  cloudFloor(clock);
  draw();
};
})();
