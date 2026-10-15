/* Flamingo Fields 3D: the two kids.
   First built on the kids test field (since retired; their look is set with tools/kids-editor.html): their models, animations, wind in hair and skirt,
   painted faces, recolouring, the default look, and all their movement rules. Units are metres.
   The page provides: ALT_MAX (how high they may fly), scene (a THREE.Scene), keys (a Set of 'up','down','left','right'), arrowsHeld(), groundAt(x,z),
   and the globals girl, boy, rollChance. */
/* Paint the plain model in the game girl's colours: each vertex gets a colour from the bone that moves it most
   and where it sits on the body in the rest pose. */
function paintGirl(m, P){
  const g=m.geometry, pos=g.attributes.position, si=g.attributes.skinIndex.array, sw=g.attributes.skinWeight.array, N=pos.count;
  const names=m.skeleton.bones.map(b=>b.name.replace('mixamorig',''));
  const col=new Float32Array(N*3), c=new THREE.Color(), sk=new Float32Array(N), hr=new Float32Array(N), fc=new Float32Array(N);
  const C={}; for(const k in P) C[k]=new THREE.Color(P[k]).convertSRGBToLinear();
  for(let i=0;i<N;i++){
    let bi=0,bw=-1; for(let j=0;j<4;j++){ const w=sw[i*4+j]; if(w>bw){bw=w;bi=si[i*4+j];} }
    const n=names[bi], x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i), ax=Math.abs(x);
    let k='skin';
    if(n==='Head'){ const face = z>0.04 && y<0.698 && y>0.50 && ax<0.115;   /* forehead under the fringe is hair-coloured, so the fringe reads as hair */ k = face ? 'skin' : 'hair'; if(y<0.56 && ax<0.08 && z>-0.02) k='skin'; }
    else if(n==='Neck') k='skin';
    else if(n.startsWith('Spine')||n.endsWith('Shoulder')||n==='Hips') k = y>-0.03?'shirt':'bottom';
    else if(n.endsWith('Arm')&&!n.endsWith('ForeArm')) k = ax<0.24?'shirt':'skin';
    else if(n.endsWith('UpLeg')){ const t=Math.min(1,Math.max(0,(-0.156-y)/0.39)), bx=Math.sign(x)*(0.075+0.006*t), bz=0.01-0.034*t; const d=Math.hypot(x-bx,z-bz);
      k = y>-0.03?'shirt': (y<-0.415 && d<0.09) ? 'skin':'bottom'; }
    else if(n.endsWith('Leg')||n.endsWith('Foot')||n.endsWith('ToeBase')) k='skin';   /* barefoot, like the model */
    if(k==='bottom'){ let inner=false;
      if(n.endsWith('UpLeg')){ const t=Math.min(1,Math.max(0,(-0.156-y)/0.39)); inner=Math.hypot(x-Math.sign(x)*(0.075+0.006*t),z-(0.01-0.034*t))<0.085; }
      if(!inner) sk[i]=Math.pow(Math.min(1,Math.max(0,(-0.03-y)/0.38)),1.8); }   // snug at the waist, free at the hem
    if(k==='hair'){ const d=Math.hypot(x,y-0.69,z+0.01); let w=Math.pow(Math.min(1,Math.max(0,(d-0.115)/0.16)),1.3);   // tips move, the scalp stays
      if(z>0.03&&y<0.80&&ax<0.15) w*=0.35;   // the fringe over her face moves less
      hr[i]=w; }
    if(n==='Head'&&k==='skin'&&z>0) fc[i]=1;   // where her painted face may go
    c.copy(C[k]); col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col,3));
  g.setAttribute('aSkirt', new THREE.BufferAttribute(sk,1));
  g.setAttribute('aHair', new THREE.BufferAttribute(hr,1));
  g.setAttribute('aFace', new THREE.BufferAttribute(fc,1));
}

/* ---------- shared helpers ---------- */
const BOOST=1.5;   // the girl covers 1.5× the ground her run animation does, with her legs moving at the animation's own pace
function b64(s){ const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u.buffer; }
/* Mixamo moves the hips forward through a clip; take that out so the kids run on the spot and the game moves them.
   Returns how fast the clip itself travelled. */
function inPlace(clip){ const t=clip.tracks.find(k=>/Hips\.position$/.test(k.name)); if(!t) return 0;
  const v=t.values, n=t.times.length, slope=(v[(n-1)*3+2]-v[2])/(t.times[n-1]-t.times[0]||1);
  const z0=v[2], t0=t.times[0]; for(let i=0;i<n;i++){ v[i*3+2]-=z0+slope*(t.times[i]-t0); } return Math.abs(slope); }
function curveAt(C,key,t){ const T=C.t, Y=C[key]; if(t<=T[0]) return Y[0]; for(let i=1;i<T.length;i++) if(t<=T[i]){ const k=(t-T[i-1])/(T[i]-T[i-1]); return Y[i-1]+(Y[i]-Y[i-1])*k; } return Y[Y.length-1]; }
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- wind in the skirt and hair, hair tips, and the painted face ----------
   Neither skirt nor hair has bones of its own, so the graphics card moves their points every frame:
   waves rolling round the skirt hem and a flutter on the hair tips; the air they run or fly through pushing both back;
   and swing — a soft spring that lags behind when they speed up, stop, turn or land. It is not real cloth.
   Hair tips: the ends of the hair (furthest from the scalp) can take a second colour, like the orange tips in the clip.
   Face: a picture painted in the model's own measurements, laid onto the front of the head in the rest pose. */
function makeWind(head){ return {uTime:{value:0},uFlow:{value:0.55},uAmt:{value:1},uHair:{value:1},uSwing:{value:new THREE.Vector3()},uSkirtSw:{value:new THREE.Vector3()},uFlare:{value:0},
  uPh:{value:new THREE.Vector4()},uPh5:{value:0},uHead:{value:head.clone()},uTips:{value:new THREE.Color('#e8742c')},uTipsAmt:{value:0},uMouthHide:{value:0},uMouthBox:{value:new THREE.Vector4(0.012,0.553,0.072,0.019)}}; }
function wavesStep(W,dt){ const f=W.uFlow.value, p=W.uPh.value; W.uTime.value+=dt; p.x+=dt*(3.2+5*f); p.y+=dt*(6.5+7*f); p.z+=dt*(7+6*f); p.w+=dt*(2.4+6*f); W.uPh5.value+=dt*(5+8*f); }
function addWind(mat,W,key,face){
  mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,W);
    let frag='uniform vec3 uTips;\nuniform float uTipsAmt;\nvarying float vTip;\n';
    let add=`\n        diffuseColor.rgb=mix(diffuseColor.rgb,uTips,smoothstep(0.35,1.0,vTip)*uTipsAmt);`;
    if(face){ sh.uniforms.uFaceTex={value:face.tex}; sh.uniforms.uFaceBox={value:face.box};
      frag+='uniform sampler2D uFaceTex;\nvarying vec2 vFaceUV;\nvarying float vFace;\n';
      add=`\n        if(vFace>0.01 && vFaceUV.x>0.0 && vFaceUV.x<1.0 && vFaceUV.y>0.0 && vFaceUV.y<1.0){ vec4 fp=texture2D(uFaceTex,vFaceUV); diffuseColor.rgb=mix(diffuseColor.rgb,fp.rgb,fp.a*clamp(vFace*1.5,0.0,1.0)); }`+add; }
    sh.fragmentShader=frag+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>'+add);
    sh.vertexShader='attribute float aSkirt;\nattribute float aHair;\nattribute float aFace;\nuniform float uMouthHide;\nuniform vec4 uMouthBox;\nuniform float uTime,uFlow,uAmt,uHair,uPh5;\nuniform vec3 uSwing,uHead,uSkirtSw;\nuniform float uFlare;\nuniform vec4 uPh;\nuniform vec4 uFaceBox;\nvarying vec2 vFaceUV;\nvarying float vFace;\nvarying float vTip;\n'+sh.vertexShader
      .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      /* her own smile is carved into the face; when another mouth is painted, the groove's shading is smoothed away */
      if(uMouthHide>0.5 && aFace>0.0){ vec2 q=(position.xy-uMouthBox.xy)/uMouthBox.zw; float mw=1.0-smoothstep(0.55,1.0,length(q));
        if(mw>0.0) objectNormal=normalize(mix(objectNormal,normalize(vec3((position.x-uMouthBox.x)*4.0,0.12,1.0)),mw)); }`)
      .replace('#include <skinning_vertex>',`
      vTip=aHair;
      vFace=aFace; vFaceUV=(position.xy-uFaceBox.xy)/(uFaceBox.zw-uFaceBox.xy);
      float sw=aSkirt*uAmt, hw=aHair*uHair; vec3 bp=position; float f=uFlow, ang=atan(bp.x,bp.z), ph=ang*2.0+bp.y*9.0;
      float gust=0.65+0.35*sin(uTime*0.9)*sin(uTime*2.3+1.0);
      if(sw>0.0){
        float wave=sin(uPh.x+ph)*(0.024+0.040*f)
                  +sin(uPh.y-ang*4.0-bp.y*15.0)*(0.008+0.014*f)
                  +sin(uTime*1.1+bp.x*3.0)*0.022*gust;
        vec2 rad=normalize(bp.xz+vec2(0.0,-0.01)+vec2(1e-4));
        float billow=1.0-0.65*clamp((f-0.55)/0.45,0.0,1.0);
        transformed.xz+=rad*sw*wave*billow; transformed.y+=sw*abs(wave)*0.5*billow; }
      if(hw>0.0){
        vec3 hp=bp-uHead; vec3 hn=normalize(hp+vec3(1e-4));
        float hph=hp.x*9.0+hp.y*7.0+hp.z*8.0;
        float fl=sin(uPh.w+hph)*(0.010+0.020*f)+sin(uPh5-hph*1.7)*0.006*(0.3+f);
        transformed+=hw*(hn*fl+vec3(sin(uTime*1.3+hph)*0.010*gust,0.0,0.0)); }
      #include <skinning_vertex>
      if(sw>0.0){
        transformed.z-=sw*((0.014+0.055*f*f)*gust*(1.0+0.6*f) + 0.022*f*f*(0.5+0.5*sin(uPh.z+ph)));
        transformed+=sw*uSwing; }
      /* the dress as fabric: the hem lags behind her moves on its own slow spring, and flares out when she turns (CLOTH, settings.js) */
      if(aSkirt>0.0){ vec2 rd=normalize(bp.xz+vec2(1e-4)); transformed.xz+=rd*aSkirt*uFlare; transformed+=aSkirt*uSkirtSw; }
      if(hw>0.0){
        transformed.z-=hw*(0.008+0.07*f*f)*gust;
        transformed+=hw*uSwing*0.7; }`);
  };
  mat.customProgramCacheKey=()=>'kidwind5-'+key+(face?'f':''); return mat;
}
/* the swing spring: driven by how the kid accelerates, seen from their own body (forward, sideways, up) */
function swingStep(K,dt){
  if(dt<=0) return; const P=K.P, S=K.SW;
  const py=P.wy??P.y;   // world height, so the hair and clothes feel the real climb, not the ground passing underneath
  if(!S.init){ S.px=P.x; S.py=py; S.pz=P.z; S.init=true; }
  const vx=(P.x-S.px)/dt, vy=(py-S.py)/dt, vz=(P.z-S.pz)/dt; S.px=P.x; S.py=py; S.pz=P.z;
  const ax=(vx-S.ox)/dt, ay=(vy-S.oy)/dt, az=(vz-S.oz)/dt; S.ox=vx; S.oy=vy; S.oz=vz;
  const c=Math.cos(P.h), s=Math.sin(P.h), lim=v=>Math.max(-0.11,Math.min(0.11,v));
  const tx=lim(-(ax*c-az*s)*0.006), ty=lim(-ay*0.004), tz=lim(-(ax*s+az*c)*0.006);
  const w=7, z=0.32, k=w*w, d=2*z*w;
  for(const [p,v,t] of [['x','vx',tx],['y','vy',ty],['z','vz',tz]]){ S[v]+=(-k*(S[p]-t)-d*S[v])*dt; S[p]+=S[v]*dt; }
  K.W.uSwing.value.set(S.x,S.y,S.z);
  /* the dress: its own slower, looser spring, so the hem trails, overshoots and settles like fabric; and a flare when she turns */
  if(K.W.uAmt.value>0){ const D=K.SK||(K.SK={x:0,y:0,z:0,vx:0,vy:0,vz:0,f:0,vf:0,h:P.h}), L=CLOTH.reach, lm=v=>Math.max(-L,Math.min(L,v));
    const ux=lm(-(ax*c-az*s)*CLOTH.lag), uy=lm(-ay*CLOTH.lift), uz=lm(-(ax*s+az*c)*CLOTH.lag);
    let dh=P.h-D.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); D.h=P.h; const yaw=Math.abs(dh/dt);
    const uf=Math.min(L*0.6,yaw*CLOTH.flare), w2=CLOTH.spring, k2=w2*w2, d2=2*CLOTH.damp*w2;
    for(const [p,v,t] of [['x','vx',ux],['y','vy',uy],['z','vz',uz],['f','vf',uf]]){ D[v]+=(-k2*(D[p]-t)-d2*D[v])*dt; D[p]+=D[v]*dt; }
    K.W.uSkirtSw.value.set(D.x,D.y,D.z); K.W.uFlare.value=Math.max(0,D.f); }
}

/* The boy's hair: dark texels on the points his head bone carries, away from his face; tips move most. */
let BOY_SKIN='rgb(245,218,198)', BOY_SKIN0=null, BOY_PIX=null;
function boyHair(mesh,img){
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const g=c.getContext('2d'); g.drawImage(img,0,0);
  const px=g.getImageData(0,0,c.width,c.height).data, W=c.width, H=c.height;
  const geo=mesh.geometry, pos=geo.attributes.position, uv=geo.attributes.uv, si=geo.attributes.skinIndex.array, sw=geo.attributes.skinWeight.array, N=pos.count;
  const head=mesh.skeleton.bones.findIndex(b=>/Head$/.test(b.name));
  const onHead=new Uint8Array(N); let cx=0,cy=0,cz=0,n=0;
  for(let i=0;i<N;i++){ let bi=0,bw=-1; for(let j=0;j<4;j++){ const w=sw[i*4+j]; if(w>bw){bw=w;bi=si[i*4+j];} } if(bi===head){ onHead[i]=1; cx+=pos.getX(i); cy+=pos.getY(i); cz+=pos.getZ(i); n++; } }
  const C=new THREE.Vector3(cx/n,cy/n,cz/n);
  const hr=new Float32Array(N), sk=new Float32Array(N);
  for(let i=0;i<N;i++){ if(!onHead[i]) continue;
    const u=uv.getX(i), v=uv.getY(i), X=Math.min(W-1,Math.max(0,Math.floor(u*W))), Y=Math.min(H-1,Math.max(0,Math.floor((1-v)*H))), o=(Y*W+X)*4;
    const lum=(0.3*px[o]+0.59*px[o+1]+0.11*px[o+2])/255;
    const rx=pos.getX(i)-C.x, ry=pos.getY(i)-C.y, rz=pos.getZ(i)-C.z;
    const d=Math.hypot(rx,ry,rz);
    if(lum>0.22&&d<0.135) continue;                          // the dark hair, plus lighter strands standing out from his head
    if(rz>0.03&&ry<0.05&&Math.abs(rx)<0.12) continue;          // not his eyes or brows
    let w=Math.pow(Math.min(1,Math.max(0,(d-0.10)/0.15)),1.3);
    if(rz>0.03&&ry<0.12) w*=0.35;                            // the fringe moves less
    hr[i]=w; }
  const fc=new Float32Array(N); for(let i=0;i<N;i++) if(onHead[i]&&hr[i]===0&&pos.getZ(i)-C.z>0) fc[i]=1;   // where his painted face may go
  /* his own skin colour, read from his texture on the cheek beside his mouth, to paint over what is replaced */
  let best=-1,bd=1e9; for(let i=0;i<N;i++){ if(!fc[i]) continue; const d=Math.hypot(pos.getX(i)-0.06,pos.getY(i)-0.50); if(d<bd&&pos.getZ(i)>C.z+0.05){bd=d;best=i;} }
  if(best>=0){ const u=uv.getX(best), v=uv.getY(best), X=Math.floor(u*W), Y=Math.floor((1-v)*H), o=(Y*W+X)*4; BOY_SKIN=`rgb(${px[o]},${px[o+1]},${px[o+2]})`; }
  geo.setAttribute('aFace',new THREE.BufferAttribute(fc,1));
  geo.setAttribute('aHair',new THREE.BufferAttribute(hr,1)); geo.setAttribute('aSkirt',new THREE.BufferAttribute(sk,1));
  return C;
}

/* ---------- the boy's clothes: recoloured on his texture ----------
   His red shirt and khaki shorts are found by colour on his texture; a new colour keeps the texture's light and shade. */
const BOYTEX={};
function boyTexSetup(img){
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const g=c.getContext('2d'); g.drawImage(img,0,0);
  const id=g.getImageData(0,0,c.width,c.height), d=id.data, N=d.length/4, cls=new Uint8Array(N), lum=new Float32Array(N);
  let s1=0,n1=0,s2=0,n2=0,s3=0,n3=0;
  for(let i=0;i<N;i++){ const r=d[i*4],gg=d[i*4+1],b=d[i*4+2], mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), v=mx/255, sat=mx?(mx-mn)/mx:0, L=(0.3*r+0.59*gg+0.11*b)/255; lum[i]=L;
    let h=0; if(mx>mn){ if(mx===r) h=((gg-b)/(mx-mn))%6; else if(mx===gg) h=(b-r)/(mx-mn)+2; else h=(r-gg)/(mx-mn)+4; h*=60; if(h<0) h+=360; }
    if(r>140&&sat>0.42&&(h<14||h>340)){ cls[i]=1; s1+=L; n1++; }                        // the red shirt
    else if(h>=22&&h<=48&&sat>0.16&&sat<0.45&&v>0.42&&v<0.86){ cls[i]=2; s2+=L; n2++; }   // the khaki shorts
    else if((r-250)**2+(gg-208)**2+(b-192)**2<48*48){ cls[i]=3; s3+=L; n3++; }              // his skin, a light peach
  }
  Object.assign(BOYTEX,{canvas:c,g,orig:new Uint8ClampedArray(d),id,cls,lum,mean:[0,s1/Math.max(1,n1),s2/Math.max(1,n2),s3/Math.max(1,n3)]});
}
/* his own cheeks are drawn in the same red as his shirt, so colour alone can't tell them apart:
   every part of the texture that lands on his head is kept out of the shirt */
function boyHeadMask(mesh){
  const T=BOYTEX, W=T.canvas.width, H=T.canvas.height, c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  const geo=mesh.geometry, uv=geo.attributes.uv, si=geo.attributes.skinIndex.array, sw=geo.attributes.skinWeight.array, N=uv.count;
  const head=mesh.skeleton.bones.findIndex(b=>/Head$/.test(b.name)), onHead=new Uint8Array(N);
  for(let i=0;i<N;i++){ let bi=0,bw=-1; for(let j=0;j<4;j++){ const w=sw[i*4+j]; if(w>bw){bw=w;bi=si[i*4+j];} } onHead[i]=bi===head?1:0; }
  const idx=geo.index?geo.index.array:null, nt=(idx?idx.length:N)/3;
  g.fillStyle='#fff';
  for(let t=0;t<nt;t++){ const a=idx?idx[t*3]:t*3, b=idx?idx[t*3+1]:t*3+1, d=idx?idx[t*3+2]:t*3+2; if(!(onHead[a]&&onHead[b]&&onHead[d])) continue;
    g.beginPath(); for(const v of [a,b,d]) g.lineTo(uv.getX(v)*W,(1-uv.getY(v))*H); g.closePath(); g.fill(); }
  const m=g.getImageData(0,0,W,H).data; let n=0; for(let i=0;i<T.cls.length;i++) if(T.cls[i]===1&&m[i*4]>128){ T.cls[i]=0; n++; }
  return n; }
/* his shorts and legs, found by the model rather than by colour alone: every little piece of texture on his hips and legs is looked at,
   and if it is mostly khaki, all of it is shorts (the lighter, almost skin-coloured bits and the seams too), so the shorts recolour evenly;
   if it is mostly skin, any red that has bled in from the shirt is painted over with his skin */
function boyLegFix(mesh){
  const T=BOYTEX, W=T.canvas.width, H=T.canvas.height, d=T.orig, cls=T.cls, lum=T.lum;
  const geo=mesh.geometry, uv=geo.attributes.uv, si=geo.attributes.skinIndex.array, sw=geo.attributes.skinWeight.array, N=uv.count, bones=mesh.skeleton.bones;
  const legB=new Set(bones.map((b,i)=>/(Hips|Spine|UpLeg|Leg)$/.test(b.name)?i:-1).filter(i=>i>=0)), thighB=new Set(bones.map((b,i)=>/(UpLeg|Leg)$/.test(b.name)?i:-1).filter(i=>i>=0)), onLeg=new Uint8Array(N), onThigh=new Uint8Array(N);
  for(let i=0;i<N;i++){ let bi=0,bw=-1; for(let j=0;j<4;j++){ const w=sw[i*4+j]; if(w>bw){bw=w;bi=si[i*4+j];} } onLeg[i]=legB.has(bi)?1:0; onThigh[i]=thighB.has(bi)?1:0; }
  const idx=geo.index?geo.index.array:null, nt=(idx?idx.length:N)/3, px=[];
  let skR=0,skG=0,skB=0,skN=0; for(let i=0;i<cls.length;i++) if(cls[i]===3){ skR+=d[i*4]; skG+=d[i*4+1]; skB+=d[i*4+2]; skN++; }
  const sk=[skR/skN,skG/skN,skB/skN], m2=T.mean[2];
  for(let t=0;t<nt;t++){ const a=idx?idx[t*3]:t*3, b=idx?idx[t*3+1]:t*3+1, c=idx?idx[t*3+2]:t*3+2; if(!(onLeg[a]&&onLeg[b]&&onLeg[c])) continue;
    const ax=uv.getX(a)*W, ay=(1-uv.getY(a))*H, bx=uv.getX(b)*W, by=(1-uv.getY(b))*H, cx=uv.getX(c)*W, cy=(1-uv.getY(c))*H;
    const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))), x1=Math.min(W-1,Math.ceil(Math.max(ax,bx,cx))), y0=Math.max(0,Math.floor(Math.min(ay,by,cy))), y1=Math.min(H-1,Math.ceil(Math.max(ay,by,cy)));
    const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy); if(Math.abs(den)<1e-6) continue; px.length=0; let kh=0,skn=0,all=0;
    const ex=(x,y,px1,py1,px2,py2)=>{ const L=Math.hypot(px2-px1,py2-py1)||1; return ((px2-px1)*(y-py1)-(py2-py1)*(x-px1))/L*Math.sign(den); };   /* signed distance inside each edge, in pixels */
    for(let y=Math.max(0,y0-1);y<=Math.min(H-1,y1+1);y++) for(let x=Math.max(0,x0-1);x<=Math.min(W-1,x1+1);x++){ const X=x+0.5,Y=y+0.5, m=-1.2;
      if(ex(X,Y,ax,ay,bx,by)<m||ex(X,Y,bx,by,cx,cy)<m||ex(X,Y,cx,cy,ax,ay)<m) continue; const i=y*W+x; px.push(i); all++; if(cls[i]===2) kh++; else if(cls[i]===3) skn++; }
    if(!all) continue;
    if(kh>=all*0.5){ for(const i of px){ const v=Math.max(d[i*4],d[i*4+1],d[i*4+2])/255; if(cls[i]!==2&&v>0.22){ cls[i]=2; lum[i]=Math.min(lum[i],m2*1.12); } } }
    else if(skn>=all*0.5||(onThigh[a]&&onThigh[b]&&onThigh[c])){ for(const i of px) if(cls[i]===1){ d[i*4]=sk[0]; d[i*4+1]=sk[1]; d[i*4+2]=sk[2]; cls[i]=3; lum[i]=T.mean[3]; } } }
  const out=T.id.data; for(let i=0;i<d.length;i++) out[i]=d[i]; T.g.putImageData(T.id,0,0); }
function boyRecolour(shirt,shorts,skin){
  const T=BOYTEX, d=T.id.data, o=T.orig, cols=[null,shirt?new THREE.Color(shirt):null,shorts?new THREE.Color(shorts):null,skin?new THREE.Color(skin):null];
  /* the patches painted over his own mouth and eyes take the new skin too, at the same light as his own */
  if(BOY_SKIN0==null) BOY_SKIN0=BOY_SKIN;
  if(cols[3]){ const m=BOY_SKIN0.match(/\d+/g).map(Number), f=(0.3*m[0]+0.59*m[1]+0.11*m[2])/255/T.mean[3], C=cols[3];
    BOY_SKIN=`rgb(${Math.min(255,Math.round(C.r*255*f))},${Math.min(255,Math.round(C.g*255*f))},${Math.min(255,Math.round(C.b*255*f))})`; }
  else BOY_SKIN=BOY_SKIN0;
  for(let i=0;i<T.cls.length;i++){ const k=T.cls[i], C=cols[k];
    if(!C){ d[i*4]=o[i*4]; d[i*4+1]=o[i*4+1]; d[i*4+2]=o[i*4+2]; continue; }
    const f=T.lum[i]/T.mean[k]; d[i*4]=Math.min(255,C.r*255*f); d[i*4+1]=Math.min(255,C.g*255*f); d[i*4+2]=Math.min(255,C.b*255*f); }
  T.g.putImageData(T.id,0,0); boyTex.image=T.canvas; boyTex.needsUpdate=true;
}

/* ---------- the girl's clothes, skin and hair: recoloured on her texture ----------
   Her texture is a patchwork of pieces, each painted one flat colour: near-black hair, pink skin, a cream shirt, a khaki skirt.
   Each pixel is sorted to the nearest of those four colours (or left alone if it is near none), and a new colour keeps the
   texture's light and shade. */
const GIRLTEX={};
const GIRL_REF=[null,[44,36,34],[242,204,192],[244,239,228],[140,126,104]];   // 1 hair, 2 skin, 3 shirt, 4 skirt
function girlTexSetup(img,mesh){
  paintGirl(mesh,{hair:'#1f1b1e',skin:'#eeb98c',shirt:'#dcd5c2',bottom:'#3b4547',shoe:'#eeb98c'});   // her wind and face areas
  const W=img.width, H=img.height, c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.drawImage(img,0,0);
  const id=g.getImageData(0,0,W,H), d=id.data, N=W*H, cls=new Uint8Array(N), lum=new Float32Array(N), sum=[0,0,0,0,0], cnt=[0,0,0,0,0], avg=[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
  for(let i=0;i<N;i++){ const r=d[i*4],gg=d[i*4+1],b=d[i*4+2], L=(0.3*r+0.59*gg+0.11*b)/255; lum[i]=L;
    let best=0,bd=75*75; for(let k=1;k<=4;k++){ const R=GIRL_REF[k], dd=(r-R[0])**2+(gg-R[1])**2+(b-R[2])**2; if(dd<bd){bd=dd;best=k;} }
    cls[i]=best; if(best){ sum[best]+=L; cnt[best]++; avg[best][0]+=r; avg[best][1]+=gg; avg[best][2]+=b; } }
  const own=avg.map((a,k)=>cnt[k]?'#'+new THREE.Color(a[0]/cnt[k]/255,a[1]/cnt[k]/255,a[2]/cnt[k]/255).getHexString():'#888888');
  Object.assign(GIRLTEX,{canvas:c,g,id,orig:new Uint8ClampedArray(d),cls,lum,mean:sum.map((v,k)=>v/Math.max(1,cnt[k])),own});
}
function girlRecolour(hair,skin,shirt,skirt){
  const T=GIRLTEX, d=T.id.data, o=T.orig, cols=[null,hair,skin,shirt,skirt].map(h=>h?new THREE.Color(h):null);
  for(let i=0;i<T.cls.length;i++){ const k=T.cls[i], C=cols[k];
    if(!C){ d[i*4]=o[i*4]; d[i*4+1]=o[i*4+1]; d[i*4+2]=o[i*4+2]; continue; }
    const f=T.lum[i]/T.mean[k]; d[i*4]=Math.min(255,C.r*255*f); d[i*4+1]=Math.min(255,C.g*255*f); d[i*4+2]=Math.min(255,C.b*255*f); }
  T.g.putImageData(T.id,0,0); girlTex.needsUpdate=true;
}
/* a colour read off a kid's texture at a point of the face (metres, rest pose), to paint over what a painted feature replaces */
function skinAt(mesh,img,x,y){ const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const g=c.getContext('2d'); g.drawImage(img,0,0);
  const pos=mesh.geometry.attributes.position, uv=mesh.geometry.attributes.uv; let best=-1,bd=1e9;
  for(let i=0;i<pos.count;i++){ if(pos.getZ(i)<0.05) continue; const d=Math.hypot(pos.getX(i)-x,pos.getY(i)-y); if(d<bd){bd=d;best=i;} }
  if(best<0) return 'rgb(240,210,190)'; const p=g.getImageData(Math.floor(uv.getX(best)*c.width),Math.floor((1-uv.getY(best))*c.height),1,1).data; return `rgb(${p[0]},${p[1]},${p[2]})`; }
let GIRL_SKIN='rgb(240,210,190)';
/* the average skin colour around a feature, from a few points just outside it */
function skinMix(mesh,img,pts){ let r=0,g=0,b=0; for(const [x,y] of pts){ const m=skinAt(mesh,img,x,y).match(/\d+/g).map(Number); r+=m[0]; g+=m[1]; b+=m[2]; } const n=pts.length; return `rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`; }

/* ---------- painted faces, after the original clip ----------
   Ghibli-style: big dark eyes with white highlights and a strong upper lid, short raised brows, a tiny nose,
   soft pink cheeks and an open, happy mouth. Each face is painted on a small canvas in the model's own measurements
   (metres, rest pose, seen from the front) and laid onto the front of the head. */
function makeFace(spec){
  const S=512, c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  const [x0,y0,x1,y1]=spec.box, X=x=>(x-x0)/(x1-x0)*S, Y=y=>(y1-y)/(y1-y0)*S, L=d=>d/(x1-x0)*S;
  const t2=document.createElement('canvas'); t2.width=t2.height=S; const g2=t2.getContext('2d');
  const tex=new THREE.CanvasTexture(t2); tex.encoding=THREE.sRGBEncoding; tex.flipY=false; tex.anisotropy=4;
  const F={X,Y,L,g};
  const draw=p=>{ g.clearRect(0,0,S,S); g.lineCap='round'; g.lineJoin='round'; spec.draw(F,p);
    // the canvas is drawn top-down; flip so that up on the canvas is up on the face
    g2.setTransform(1,0,0,1,0,0); g2.clearRect(0,0,S,S); g2.translate(0,S); g2.scale(1,-1); g2.drawImage(c,0,0); tex.needsUpdate=true; };
  return {tex, box:new THREE.Vector4(x0,y0,x1,y1), canvas:c, draw};
}
const shade=(hex,k)=>{ const c=new THREE.Color(hex); if(k<1) c.multiplyScalar(k); else c.lerp(new THREE.Color('#ffffff'),Math.min(0.6,(k-1))); return '#'+c.getHexString(); };
function cheek(F,x,y,rx,ry,col,a){ if(a<=0.001) return; const {X,Y,L,g}=F, C=new THREE.Color(col), rgb=`${Math.round(C.r*255)},${Math.round(C.g*255)},${Math.round(C.b*255)}`;
  const r=g.createRadialGradient(X(x),Y(y),0,X(x),Y(y),L(rx)); r.addColorStop(0,`rgba(${rgb},${a})`); r.addColorStop(1,`rgba(${rgb},0)`);
  g.save(); g.translate(X(x),Y(y)); g.scale(1,ry/rx); g.translate(-X(x),-Y(y)); g.fillStyle=r; g.beginPath(); g.arc(X(x),Y(y),L(rx),0,7); g.fill(); g.restore(); }
function eye(F,x,y,w,h,side,o){ const {X,Y,L,g}=F, cx=X(x), cy=Y(y), rw=L(w)/2, rh=L(h)/2;
  g.fillStyle='#fbf7f0'; g.beginPath(); g.ellipse(cx,cy,rw,rh,0,0,7); g.fill();                       // white of the eye
  const iw=rw*0.8, ih=rh*0.98, gr=g.createLinearGradient(0,cy-ih,0,cy+ih); gr.addColorStop(0,shade(o.iris,0.6)); gr.addColorStop(0.65,o.iris); gr.addColorStop(1,shade(o.iris,1.45));
  g.save(); g.beginPath(); g.ellipse(cx,cy,rw,rh,0,0,7); g.clip();
  g.fillStyle=gr; g.beginPath(); g.ellipse(cx+side*rw*0.05,cy+rh*0.06,iw,ih,0,0,7); g.fill();          // iris, lighter at the bottom
  g.fillStyle='#0d0b10'; g.beginPath(); g.ellipse(cx+side*rw*0.05,cy+rh*0.08,iw*0.5,ih*0.55,0,0,7); g.fill();
  g.restore();
  const s=o.shine; if(s>0.01){ g.fillStyle='#ffffff'; g.beginPath(); g.ellipse(cx+side*rw*0.32,cy-rh*0.36,rw*0.26*s,rh*0.22*s,0,0,7); g.fill();   // highlights
    g.beginPath(); g.arc(cx-side*rw*0.22,cy+rh*0.42,rw*0.11*s,0,7); g.fill(); }
  g.strokeStyle='#1c1416'; g.lineWidth=L(o.lid); g.beginPath();                                       // the strong upper lid
  g.moveTo(cx-side*rw*1.08,cy-rh*0.15); g.quadraticCurveTo(cx,cy-rh*1.45,cx+side*rw*1.12,cy-rh*0.35); g.lineTo(cx+side*rw*1.32,cy-rh*0.62); g.stroke();
  g.strokeStyle='rgba(90,50,45,0.55)'; g.lineWidth=L(o.lid*0.35); g.beginPath(); g.moveTo(cx-side*rw*0.55,cy+rh*1.02); g.quadraticCurveTo(cx,cy+rh*1.18,cx+side*rw*0.6,cy+rh*0.98); g.stroke();
}
/* tilt > 0 raises the inner ends (worried), < 0 lowers them (determined, cheeky) */
function brow(F,x,y,w,side,lw,tilt){ const {X,Y,L,g}=F, t=tilt*w*0.35; g.strokeStyle='#241a1a'; g.lineWidth=L(lw); g.beginPath();
  g.moveTo(X(x-side*w*0.5),Y(y-w*0.05+t)); g.quadraticCurveTo(X(x),Y(y+w*0.16),X(x+side*w*0.5),Y(y-w*0.1-t)); g.stroke(); }
function mouth(F,type,x,y,w,h){ const {X,Y,L,g}=F, cx=X(x), cy=Y(y), rw=L(w)/2, rh=L(h);
  const inside=path=>{ g.save(); g.beginPath(); path(); g.closePath(); g.fillStyle='#5a2220'; g.fill(); g.clip(); g.fillStyle='#d9786d'; g.beginPath(); g.ellipse(cx,cy+rh*1.0,rw*0.62,rh*0.5,0,0,7); g.fill(); g.restore(); };
  g.strokeStyle='rgba(70,30,28,0.85)'; g.lineWidth=L(0.0018);
  if(type==='shout'){ inside(()=>{ g.moveTo(cx-rw,cy); g.quadraticCurveTo(cx,cy-rh*0.18,cx+rw,cy); g.quadraticCurveTo(cx+rw*0.9,cy+rh*1.1,cx,cy+rh*1.05); g.quadraticCurveTo(cx-rw*0.9,cy+rh*1.1,cx-rw,cy); });
    g.beginPath(); g.moveTo(cx-rw,cy); g.quadraticCurveTo(cx,cy-rh*0.18,cx+rw,cy); g.stroke(); }
  else if(type==='grin'){ inside(()=>{ g.moveTo(cx-rw*1.15,cy-rh*0.1); g.quadraticCurveTo(cx,cy+rh*0.15,cx+rw*1.15,cy-rh*0.1); g.quadraticCurveTo(cx+rw*0.8,cy+rh*0.95,cx,cy+rh*0.95); g.quadraticCurveTo(cx-rw*0.8,cy+rh*0.95,cx-rw*1.15,cy-rh*0.1); });
    g.save(); g.beginPath(); g.moveTo(cx-rw*1.1,cy-rh*0.08); g.quadraticCurveTo(cx,cy+rh*0.17,cx+rw*1.1,cy-rh*0.08); g.lineTo(cx+rw*0.9,cy+rh*0.25); g.quadraticCurveTo(cx,cy+rh*0.42,cx-rw*0.9,cy+rh*0.25); g.closePath(); g.fillStyle='#fbf7f0'; g.fill(); g.restore(); }
  else if(type==='o'){ inside(()=>{ g.ellipse(cx,cy+rh*0.5,rw*0.63,rh*0.85,0,0,7); }); }
  else if(type==='smile'){ g.lineWidth=L(0.0026); g.beginPath(); g.moveTo(cx-rw,cy); g.quadraticCurveTo(cx,cy+rh*0.85,cx+rw,cy); g.stroke(); }
  else { g.lineWidth=L(0.0024); g.beginPath(); g.moveTo(cx-rw*0.55,cy+rh*0.2); g.quadraticCurveTo(cx,cy+rh*0.32,cx+rw*0.55,cy+rh*0.2); g.stroke(); }   // closed
}
function freckles(F,cx,y,spread,n){ const {X,Y,L,g}=F; let s=11; const r=()=>((s=(s*16807)%2147483647)/2147483647); g.fillStyle='rgba(150,85,60,0.55)';
  for(let i=0;i<n;i++){ const side=i%2?1:-1, x=cx+side*(spread*0.25+r()*spread*0.75), yy=y+(r()-0.5)*spread*0.45; g.beginPath(); g.arc(X(x),Y(yy),L(0.0016+r()*0.0012),0,7); g.fill(); } }
function skinPatch(F,x,y,rx,ry,col){ const {X,Y,L,g}=F, r=g.createRadialGradient(X(x),Y(y),0,X(x),Y(y),L(rx));
  r.addColorStop(0,col); r.addColorStop(0.78,col); r.addColorStop(1,col.replace('rgb','rgba').replace(')',',0)'));
  g.save(); g.translate(X(x),Y(y)); g.scale(1,ry/rx); g.translate(-X(x),-Y(y)); g.fillStyle=r; g.beginPath(); g.arc(X(x),Y(y),L(rx),0,7); g.fill(); g.restore(); }
/* where each face's features sit on the model (metres, rest pose) */
const GIRL_FACE={box:[-0.13,0.50,0.15,0.75], draw:(F,p)=>{
  const cx=0.01, gap=0.066*p.eyeGap, ey=0.650+p.eyeY*0.03, s=p.eyeSize;   // her face is centred a centimetre to one side
  if(p.mouth!=='own') skinPatch(F,0.012,0.553,0.072,0.019,GIRL_SKIN);           // paint over her own smile, which runs from about -0.05 to +0.07
  if(p.eyes==='painted'){ for(const sd of [-1,1]) skinPatch(F,cx+sd*0.066,0.662,0.06,0.056,GIRL_SKIN);   // and over her own eyes and brows
    const o={iris:p.iris,shine:p.shine,lid:0.0055*p.lid};
    eye(F,cx-gap,ey,0.050*s,0.048*s,-1,o); eye(F,cx+gap,ey,0.050*s,0.048*s,1,o);
    const by=0.688+p.browY*0.02+(s-1)*0.02; brow(F,cx-gap,by,0.045,-1,0.0032*p.browW,p.browTilt); brow(F,cx+gap,by,0.045,1,0.0032*p.browW,p.browTilt); }
  cheek(F,cx-0.078,0.597,0.026,0.015,p.cheek,p.cheekAmt); cheek(F,cx+0.078,0.597,0.026,0.015,p.cheek,p.cheekAmt);
  if(p.freckles>0) freckles(F,cx,0.603,0.07,Math.round(p.freckles*22));
  if(p.mouth!=='own') mouth(F,p.mouth,cx,0.556+p.mouthY*0.02,0.044*p.mouthSize,0.024*p.mouthSize); }};
const BOY_FACE={box:[-0.15,0.40,0.15,0.70], draw:(F,p)=>{
  if(p.mouth!=='own') skinPatch(F,0,0.485,0.085,0.021,BOY_SKIN);                 // paint over his own smile, which runs from about -0.07 to +0.07
  if(p.eyes==='painted'){ for(const sd of [-1,1]) skinPatch(F,sd*0.087,0.603,0.064,0.058,BOY_SKIN);   // and over his own eyes and brows
    const gap=0.087*p.eyeGap, ey=0.585+p.eyeY*0.03, s=p.eyeSize, o={iris:p.iris,shine:p.shine,lid:0.0055*p.lid};
    eye(F,-gap,ey,0.058*s,0.054*s,-1,o); eye(F,gap,ey,0.058*s,0.054*s,1,o);
    const by=0.632+p.browY*0.02+(s-1)*0.022; brow(F,-gap,by,0.055,-1,0.0034*p.browW,p.browTilt); brow(F,gap,by,0.055,1,0.0034*p.browW,p.browTilt); }
  cheek(F,-0.095,0.535,0.028,0.016,p.cheek,p.cheekAmt); cheek(F,0.095,0.535,0.028,0.016,p.cheek,p.cheekAmt);
  if(p.freckles>0) freckles(F,0,0.54,0.08,Math.round(p.freckles*22));
  if(p.mouth!=='own') mouth(F,p.mouth,0.0,0.488+p.mouthY*0.02,0.05*p.mouthSize,0.022*p.mouthSize); }};

/* ---------- the looks: everything the editor sets, as one plain object ---------- */
/* the kids' default look: "Look 1", deployed from the editor on 12 October 2026 */
const DEFAULT_LOOK={ v:2,
  girl:{height:1, head:0.98, skin:'#f8ba91', hair:'', tips:'#e8742c', tipsAmt:0.47, shirt:'', skirt:'', skirtWind:0.4, hairWind:1.45,
        face:{eyes:'own', eyeSize:1.27, eyeGap:1, eyeY:0, iris:'#2b3047', shine:1, lid:1, browY:0.36, browTilt:0.38, browW:2.2, mouth:'own', mouthSize:1.5, mouthY:-0.16, cheek:'#ee8076', cheekAmt:1, freckles:0.7}},
  boy:{height:0.79, head:1.05, tips:'#978559', tipsAmt:0.04, skin:'#eebcaa', shirt:'#62370e', shorts:'#2c2f44', hairWind:0.65,
        face:{eyes:'own', eyeSize:1.31, eyeGap:1, eyeY:0, iris:'#2a2220', shine:1, lid:1, browY:0, browTilt:0, browW:1, mouth:'own', mouthSize:1.5, mouthY:0.58, cheek:'#bf7269', cheekAmt:0.52, freckles:1}}};
/* fill anything a saved look lacks from the defaults, so older saves keep working */
function fullLook(L){ const o=clone(DEFAULT_LOOK); if(!L) return o;
  if(!L.v&&L.girl){ L=clone(L); for(const k of ['skin','hair','shirt','skirt']) delete L.girl[k]; if(L.girl.face){ delete L.girl.face.eyes; delete L.girl.face.mouth; } }   // looks saved before she had her own texture
  for(const k of ['girl','boy']) if(L[k]){ for(const [a,v] of Object.entries(L[k])) if(a!=='face') o[k][a]=v; if(L[k].face) Object.assign(o[k].face,L[k].face); } return o; }
let lastGirlCols='', lastBoyCols='';
function applyLook(look){
  const L=fullLook(look);
  { const G=L.girl, K=girl; K.look=G;
    const cols=JSON.stringify([G.skin,G.hair,G.shirt,G.skirt]);
    if(cols!==lastGirlCols){ lastGirlCols=cols; girlRecolour(G.hair,G.skin,G.shirt,G.skirt); }
    setScale(K,G.height); setHead(K,G.head); K.W.uAmt.value=G.skirtWind; K.W.uHair.value=G.hairWind;
    K.W.uTips.value.set(G.tips).convertSRGBToLinear(); K.W.uTipsAmt.value=G.tipsAmt; K.W.uMouthHide.value=G.face.mouth==='own'?0:1; K.face.draw(G.face); }
  { const B=L.boy, K=boy; K.look=B;
    const cols=JSON.stringify([B.shirt,B.shorts,B.skin||'']); if(cols!==lastBoyCols){ lastBoyCols=cols; boyRecolour(B.shirt,B.shorts,B.skin); }
    setScale(K,B.height); setHead(K,B.head); K.W.uHair.value=B.hairWind;
    K.W.uTips.value.set(B.tips).convertSRGBToLinear(); K.W.uTipsAmt.value=B.tipsAmt; K.W.uMouthHide.value=B.face.mouth==='own'?0:1; K.face.draw(B.face); }
}
/* height scales the whole kid from the feet; the head bone scales the head and hair, which the animations leave alone */
function setScale(K,s){ K.scale=s; K.root.scale.setScalar(s); }
function setHead(K,h){ const b=K.mesh.skeleton.bones.find(x=>/Head$/.test(x.name)); if(b) b.scale.setScalar(h); }

/* For his stop and turn: the turning and the travel are taken out of the hips at load, and kept as curves the game follows.
   (He is turned and moved by the game, so he never snaps back when the animation ends.) */
function takeYaw(c){ const hq=c.tracks.find(t=>/Hips\.quaternion$/.test(t.name)), q=new THREE.Quaternion(), q0i=new THREE.Quaternion().fromArray(hq.values,0).invert(), d=new THREE.Quaternion(), Y=[], T=[], up=new THREE.Vector3(0,1,0);
  for(let i=0;i<hq.times.length;i++){ q.fromArray(hq.values,i*4); d.copy(q).multiply(q0i); Y.push(2*Math.atan2(d.y,d.w)); T.push(hq.times[i]); }
  for(let i=1;i<Y.length;i++){ while(Y[i]-Y[i-1]>Math.PI) Y[i]-=2*Math.PI; while(Y[i]-Y[i-1]<-Math.PI) Y[i]+=2*Math.PI; }
  /* The hips also sway with every stride, so steering the kid by them makes the turn swing back and forth.
     The kid is steered by one smooth sweep instead, timed to when the clip really pivots, ending where the clip ends up;
     the body keeps the clip's own movement on top, and once round, its extra sway is calmed to that of the ordinary run. */
  const n=Y.length, tail=Math.max(1,Math.round(n*0.2)); let F=0; for(let i=n-tail;i<n;i++) F+=Y[i]; F/=tail;
  const at=f=>{ for(let i=0;i<n;i++) if(Math.abs(Y[i])>=Math.abs(F)*f) return T[i]; return T[n-1]; };
  const t0=Math.max(T[0],at(0.1)-0.15), t1=Math.max(t0+0.2,at(0.9)+0.1);
  const S=T.map(t=>{ const u=Math.max(0,Math.min(1,(t-t0)/(t1-t0))); return F*u*u*(3-2*u); });
  for(let i=0;i<n;i++){ const k=T[i]<=t1?0:0.6*Math.min(1,(T[i]-t1)/0.2), rem=Y[i]-(Y[i]-S[i])*k;
    q.fromArray(hq.values,i*4); const r=new THREE.Quaternion().setFromAxisAngle(up,-rem); r.multiply(q); r.toArray(hq.values,i*4); }
  return {t:T, yaw:S}; }
function takeTravel(c){ const hp=c.tracks.find(t=>/Hips\.position$/.test(t.name)), T=[],Z=[], z0=hp.values[2], x0=hp.values[0];
  for(let i=0;i<hp.times.length;i++){ T.push(hp.times[i]); Z.push(hp.values[i*3+2]-z0); hp.values[i*3+2]=z0; hp.values[i*3]=x0; } return {t:T,z:Z}; }
/* the same move to the other side: left and right bones swapped and reflected across the body's middle */
function mirrorClip(c,name){ const m=c.clone(); m.name=name; m.uuid=THREE.MathUtils.generateUUID();
  for(const t of m.tracks){ let [bone,prop]=t.name.split('.'); if(/Left/.test(bone)) bone=bone.replace('Left','Right'); else if(/Right/.test(bone)) bone=bone.replace('Right','Left'); t.name=bone+'.'+prop;
    const v=t.values; if(prop==='quaternion') for(let i=0;i<v.length;i+=4){ v[i+1]=-v[i+1]; v[i+2]=-v[i+2]; } else if(prop==='position') for(let i=0;i<v.length;i+=3) v[i]=-v[i]; }
  return m; }
/* ---------- a kid: body, animations, state ---------- */
/* gravity G, the hop HOP, CRUISE and FLY_BASE are in settings.js */
let FLY_SPEED=FLY_BASE;   // the page raises it for full-flock flight (the 2D game flies 800 units a second then, against 430)
function makeKid(name,cfg){
  const o=new THREE.FBXLoader().parse(cfg.fbx,''); let mesh;
  o.traverse(n=>{ if(n.isSkinnedMesh){ mesh=n; n.castShadow=true; n.frustumCulled=false; } });
  const K={name,cfg,mesh,scale:1,P:{x:0,z:0,y:0,vy:0,h:0,turn:0,bank:0,alt:CRUISE,state:'ground',spd:0,flyW:0,jumpW:0,landW:0,rollW:0,crouch:0,rollT:0,upLock:false,standT:-4,bored:false,boredW:0},
    SW:{x:0,y:0,z:0,vx:0,vy:0,vz:0,px:0,py:0,pz:0,ox:0,oy:0,oz:0,init:false}};
  K.W=makeWind(cfg.paint(mesh));
  K.face=makeFace(cfg.face);
  K.gameMat=addWind(cfg.material(),K.W,name+'g',K.face); K.plainMat=addWind(new THREE.MeshLambertMaterial({color:'#e9e4da'}),K.W,name+'p'); mesh.material=K.gameMat;
  const BONES=new Set(); o.traverse(n=>{ if(n.isBone) BONES.add(n.name); });
  const clip=j=>{ const c=THREE.AnimationClip.parse(j); c.tracks=c.tracks.filter(t=>BONES.has(t.name.split('.')[0])); return c; };   // only bones this body has (some files come from a rig with fingers)
  const run=clip(cfg.run), fly=clip(cfg.fly), idle=clip(cfg.idle), jmp=clip(cfg.jump), lnd=clip(cfg.land);
  K.animRun=inPlace(run)||5; inPlace(fly); inPlace(idle);
  K.RUN_SPEED=K.animRun*BOOST;
  K.root=new THREE.Group(); K.root.add(o); scene.add(K.root);
  K.mixer=new THREE.AnimationMixer(o);
  const A=K.A={run:K.mixer.clipAction(run),fly:K.mixer.clipAction(fly),idle:K.mixer.clipAction(idle),jump:K.mixer.clipAction(jmp),land:K.mixer.clipAction(lnd)};
  if(cfg.roll){ A.roll=K.mixer.clipAction(clip(cfg.roll)); }
  if(cfg.bored){ const b=clip(cfg.bored); inPlace(b); A.bored=K.mixer.clipAction(b); }
  if(cfg.rjump){ A.rjump=K.mixer.clipAction(clip(cfg.rjump)); }
  if(cfg.stop){ const sc=clip(cfg.stop); takeYaw(sc); cfg.stopZ=takeTravel(sc); A.stop=K.mixer.clipAction(sc); }
  if(cfg.turn){ const tc=clip(cfg.turn); cfg.turnYaw=takeYaw(tc); takeTravel(tc); const tl=mirrorClip(tc,'turnL'); cfg.turnLYaw={t:cfg.turnYaw.t,yaw:cfg.turnYaw.yaw.map(y=>-y)};
    A.turn=K.mixer.clipAction(tc); A.turnL=K.mixer.clipAction(tl); }
  K.spA=null;
  K.jumpA=A.jump;
  if(cfg.mouthBox) K.W.uMouthBox.value.set(...cfg.mouthBox);
  for(const k of ['jump','rjump','land','roll','bored','stop','turn','turnL']) if(A[k]){ A[k].setLoop(THREE.LoopOnce); A[k].clampWhenFinished=true; }
  for(const a of Object.values(A)){ a.play(); a.setEffectiveWeight(0); }
  A.idle.setEffectiveWeight(1);
  return K;
}

/* ---------- the rules: stand, run, jump, take off, fly, land (and, for the boy, sometimes trip and roll) ---------- */
function jumpKid(K){
  const P=K.P, c=K.cfg;
  if(P.state==='ground'){
    const run=P.spd/K.RUN_SPEED;
    if(run>0.5&&K.A.rjump){ K.jumpA=K.A.rjump; K.jumpA.reset(); K.jumpA.play(); P.crouch=0.02; P.state='crouch'; }   // running: his own running leap, straight off the stride
    else { const from=run>0.5?c.jumpFromRun:0;   // standing still: the whole crouch; running: only a dip
      K.jumpA=K.A.jump; K.jumpA.reset(); K.jumpA.time=from; K.jumpA.play(); P.crouch=c.jumpPush-from; } P.state='crouch'; }
  else if(P.state==='hop'){ if(typeof mayFly!=='function'||mayFly(K)) takeOff(K); }   // the second press takes her (or him) up, if the page allows it (10 feathers, or a full flock)
  else if(P.state==='fly'){ P.state='land'; K.A.land.reset(); K.A.land.play(); K.A.land.paused=true; K.A.land.time=c.landFrom; }
}
function takeOff(K){ const P=K.P; P.state='fly'; P.alt=Math.max(CRUISE,P.y+2); P.vy=Math.max(P.vy,3); P.upLock=keys.has('up'); }
const UPRIGHT_H=1.1;
function stepKid(K,dt,In){
  const P=K.P, A=K.A, c=K.cfg, ease=r=>1-Math.exp(-dt*r);
  const air=P.state==='fly'||P.state==='land';
  if(P.state==='turn'){ P.turn=0; P.h=P.turnH0+curveAt(P.turnCurve,'yaw',K.spA.time)*P.turnScale; }   // turning round to run: the animation's own turn, fitted to the angle needed
  else if(P.state==='roll'||P.state==='stop'){ P.turn*=1-ease(6); }
  else if(In.heading!=null){ let d=In.heading-P.h; d=Math.atan2(Math.sin(d),Math.cos(d)); const mx=air?1.6:5.5; P.turn+=(Math.max(-mx,Math.min(mx,d*(air?4:6)))-P.turn)*ease(8); }
  else P.turn+=((In.steer||0)*(air?1.3:2.2)-P.turn)*ease(6);
  P.h+=P.turn*dt;
  const flying=P.state==='fly'||(P.state==='land'&&P.y>UPRIGHT_H*K.scale);
  P.flyW+=((flying?1:0)-P.flyW)*ease(flying?4.5:5);
  const landing=(P.state==='land'&&!flying)||P.state==='touch';
  P.landW+=((landing?1:0)-P.landW)*ease(landing?10:6);
  const jumping=P.state==='crouch'||P.state==='hop';
  P.jumpW+=((jumping?1:0)-P.jumpW)*ease(jumping?14:6);
  const rolling=P.state==='roll'||P.state==='stop'||P.state==='turn';   // one of his whole-body moves: roll, stop or turn
  P.rollW+=((rolling?1:0)-P.rollW)*ease(rolling?9:4);
  /* ↓ on the ground: turn round and run the other way (skid to a stop first if running) */
  /* told to go back the way they came while running: skid to a stop first; the turn-and-run below then takes them round */
  if(In.steered&&P.state==='ground'&&A.stop&&P.spd>0.6*K.RUN_SPEED&&In.heading!=null&&In.speed>1){ let d=In.heading-P.h; d=Math.atan2(Math.sin(d),Math.cos(d));
    if(Math.abs(d)>2.5){ startStop(K,0); P.backReq=true; } }
  if(P.state==='ground'&&A.stop&&P.spd>0.55*K.RUN_SPEED&&In.speed<0.3) startStop(K,0);   // running and told to stop: he brakes and skids to a stand
  if(P.state==='ground'&&A.turn&&P.spd<1&&(In.face??In.heading)!=null&&In.speed>1){ let d=(In.face??In.heading)-P.h; d=Math.atan2(Math.sin(d),Math.cos(d));
    if(Math.abs(d)>1.35){ const right=d<0, cv=right?c.turnYaw:c.turnLYaw; P.state='turn'; P.turnH0=P.h; P.turnCurve=cv; P.turnScale=d/cv.yaw[cv.yaw.length-1];
      setSp(K,right?A.turn:A.turnL); } }   // far round to either side: he turns and sets off (the left turn is the right one mirrored)
  if(P.state==='ground'||P.state==='touch'){ let want=In.speed;
    if(In.heading!=null&&P.state==='ground'){ let d=In.heading-P.h; d=Math.atan2(Math.sin(d),Math.cos(d)); if(Math.abs(d)>1.6) want*=0.25; }   /* facing well away: swing round at a jog first, then speed up */ P.spd+=(want-P.spd)*ease(want>P.spd?3:2.5); }
  let speed;
  if(P.state==='roll'){ const t=A.roll.time; speed=Math.max(0,(curveAt(c.rollZ,'z',t+0.05)-curveAt(c.rollZ,'z',Math.max(0,t-0.05)))/0.1)*BOOST*K.scale; P.spd=speed; }
  else if(P.state==='stop'){ const t=A.stop.time, v=Math.max(0,(curveAt(c.stopZ,'z',t+0.04)-curveAt(c.stopZ,'z',Math.max(0,t-0.04)))/0.08)*BOOST*K.scale;
    speed=P.stopEntry+(v-P.stopEntry)*Math.min(1,(t-P.stopFrom)/0.15); P.spd=speed; }   // from his running speed into the skid's own slide
  else if(P.state==='turn'){ const t=K.spA.time, d=K.spA.getClip().duration; speed=In.speed*Math.max(0,Math.min(1,(t-(d-0.6))/0.6)); P.spd=speed; }
  else speed=P.spd*(1-P.flyW)+(In.airSpeed??FLY_SPEED)*P.flyW;
  const g0=groundAt(P.x,P.z);
  P.x+=Math.sin(P.h)*speed*dt; P.z+=Math.cos(P.h)*speed*dt;
  /* in the air the height is kept over a gentler ground (the page's airGround: about 30% of the dunes), worked in world height so the
     kid does not bob with every ridge; P.y stays the height over the real ground underneath, for everything else */
  const g1=groundAt(P.x,P.z), gA=typeof airGround==='function'?airGround(P.x,P.z):g1;
  P.gref=g1+(gA-g1)*P.flyW;
  if(P.state==='crouch'){ P.crouch-=dt; if(P.crouch<=0){ P.state='hop'; P.vy=HOP*Math.sqrt(K.scale); } }   // a smaller kid hops lower
  else if(P.state==='hop'){ P.vy-=G*dt; P.y+=P.vy*dt; if(P.y<=0){ P.y=0; P.vy=0; P.state='ground'; } }
  else if(P.state==='fly'){
    if(In.alt!=null) P.alt=In.alt;
    else { if(!In.climb) P.upLock=false;   // ↑ held from the run does not count; let go once, then ↑ climbs
      if(In.climb&&!P.upLock) P.alt=Math.min(ALT_MAX,P.alt+4*dt); if(In.sink) P.alt=Math.max(1.2,P.alt-4*dt); }
    const la=speed*0.6, gAh=Math.max(g1,groundAt(P.x+Math.sin(P.h)*la,P.z+Math.cos(P.h)*la));   // looking a little ahead, so a crest is risen over in time
    const wy=g0+P.y, tg=Math.max(P.gref+P.alt, gAh+Math.min(P.alt,1.6));   // never closer than 1.6 m over a crest
    const want=(tg-wy)*2.2; P.vy+=(want-P.vy)*ease(3); P.y=Math.max(0.4,wy+P.vy*dt-g1); }
  else if(P.state==='land'){ const wy=g0+P.y; P.vy+=(-Math.max(2.6,P.y*0.55)-P.vy)*ease(3); P.y=wy+P.vy*dt-g1;
    A.land.paused=true; A.land.time=c.landFrom;                          // legs reaching down
    if(P.y<=0.05){ P.y=0; P.vy=0;
      if(A.roll && Math.random()<rollChance){ P.state='roll'; setSp(K,A.roll); P.spd=K.RUN_SPEED; }   // sometimes he trips and rolls
      else if(A.stop&&In.speed<0.3) startStop(K,0.08,K.RUN_SPEED*0.8);   // not running on: he lands straight into the skid and stops
      else { P.state='touch'; P.spd=K.RUN_SPEED; A.land.paused=false; } } }
  else if(P.state==='touch'){ if(A.land.time>=c.landTo) P.state='ground'; }
  else if(P.state==='roll'){ if(A.roll.time>=c.rollEnd){ P.state='ground'; P.spd=Math.max(P.spd,K.RUN_SPEED*0.6); } }
  else if(P.state==='stop'){ const t=A.stop.time, d=A.stop.getClip().duration; if(t>=d-0.05){ P.state='ground'; P.spd=0; P.standT=0; P.backReq=false; } else if(In.speed>0.5&&t>0.35&&!P.backReq){ P.state='ground'; } }
  else if(P.state==='turn'){ if(K.spA.time>=K.spA.getClip().duration-0.05){ P.state='ground'; } }
  P.wy=g1+P.y; P.ya=Math.max(0,P.wy-P.gref);   // world height, and height over the flying ground (the camera and the flock use it)
  const r=Math.min(1,P.spd/K.RUN_SPEED);
  P.bank+=((air?-P.turn*0.35:-P.turn*0.06*r)-P.bank)*ease(5);
  /* flying, they tilt a little with the climb: chest up rising, head dipping sinking, at most about 12 degrees, and upright again for the landing */
  const upr=P.state==='land'?Math.max(0,Math.min(1,(P.y-UPRIGHT_H*K.scale)/1.5)):1;   /* coming down to land: upright again before the feet touch */
  P.pitch=(P.pitch||0)+(-Math.max(-1,Math.min(1,P.vy/3))*0.21*P.flyW*upr-(P.pitch||0))*ease(P.state==='land'?6:3);
  const fw=P.flyW, ow=rolling?1-fw:P.rollW*(1-fw), lw=landing?1-fw-ow:P.landW*Math.max(0,1-fw-ow), jw=P.jumpW*Math.max(0,1-fw-ow-lw), g=Math.max(0,1-fw-ow-lw-jw);
  A.fly.setEffectiveWeight(fw); K.spX=Math.max(0,(K.spX||0)-dt/0.2); for(const k of ['roll','stop','turn','turnL']) if(A[k]) A[k].setEffectiveWeight(K.spA===A[k]?ow*(1-K.spX):K.spPrev===A[k]?ow*K.spX:0); A.land.setEffectiveWeight(lw); A.jump.setEffectiveWeight(K.jumpA===A.jump?jw:0); if(A.rjump) A.rjump.setEffectiveWeight(K.jumpA===A.rjump?jw:0);
  /* standing still a while, he gets bored: the bored animation plays once, then he is back to standing */
  if(A.bored){ const still=P.state==='ground'&&P.spd<0.2;
    if(!still){ P.standT=Math.min(P.standT,0); if(P.bored){ P.bored=false; } }
    else { P.standT+=dt; if(!P.bored&&P.standT>7){ P.bored=true; A.bored.reset(); A.bored.play(); }
      if(P.bored&&A.bored.time>=A.bored.getClip().duration-0.7){ P.bored=false; P.standT=-4-Math.random()*6; } }
    P.boredW+=((P.bored?1:0)-P.boredW)*ease(P.bored?3:2.5); }
  const bw=P.boredW||0;
  A.run.setEffectiveWeight(g*r); A.idle.setEffectiveWeight(g*(1-r)*(1-bw)); if(A.bored) A.bored.setEffectiveWeight(g*(1-r)*bw);
  A.run.timeScale=c.runPace(P.spd,K);
  const gf=jumping?0.65:rolling?0.3:0.15+0.4*r; K.W.uFlow.value=gf+(1-gf)*fw;
  swingStep(K,dt); wavesStep(K.W,dt);
}
/* starting one whole-body move: if another was still showing, it fades out over a fifth of a second instead of snapping */
function setSp(K,a){ if(K.spA&&K.spA!==a&&K.P.rollW>0.05){ K.spPrev=K.spA; K.spX=1; } else K.spX=0; K.spA=a; a.reset(); a.play(); }
function startStop(K,from,entry){ const P=K.P, A=K.A; P.state='stop'; setSp(K,A.stop); A.stop.time=from; P.stopFrom=from; P.stopEntry=entry??P.spd; }
const _pv=new THREE.Vector3();
/* flying, the arms swing a little at the shoulders with the climb: up when rising, down when sinking.
   It rides on the same smooth value as the body's tilt, and turns each upper arm round the kid's own left-right line. */
const ARM_MAX=35*Math.PI/180, ARM_SIGN=-1, _q1=new THREE.Quaternion(), _q2=new THREE.Quaternion(), _ax=new THREE.Vector3();
function bendArms(K){ const P=K.P, a=Math.max(-1,Math.min(1,-(P.pitch||0)/0.21))*ARM_MAX*ARM_SIGN; if(Math.abs(a)<0.002) return;
  if(!K.arms) K.arms=K.mesh.skeleton.bones.filter(b=>/(Left|Right)Arm$/.test(b.name));
  K.root.updateMatrixWorld(true); _ax.set(1,0,0).applyQuaternion(K.root.getWorldQuaternion(_q1)).normalize();
  for(const b of K.arms){ b.parent.getWorldQuaternion(_q1); const R=_q2.setFromAxisAngle(_ax,a);
    const inv=_q1.clone().invert(); b.quaternion.premultiply(_q1).premultiply(R).premultiply(inv); }
  K.root.updateMatrixWorld(true); }
function placeKid(K){ const P=K.P, pt=P.pitch||0, hip=0.9*K.scale;
  K.root.rotation.set(0,P.h,0); K.root.rotateX(pt); K.root.rotateZ(P.bank);
  /* the tilt turns round the hips, not the feet: the root is moved so the hips stay put */
  const dy=hip*(1-Math.cos(pt)), dz=-hip*Math.sin(pt);   /* where the hips would go, in the kid's own frame, undone */
  _pv.set(Math.sin(P.h)*dz, dy, Math.cos(P.h)*dz);
  K.root.position.set(P.x+_pv.x,groundAt(P.x,P.z)+P.y+_pv.y,P.z+_pv.z); }

/* ---------- the boy follows the girl, as in the game ---------- */
const FOLLOW={ground:{right:1.5,back:1.4},air:{right:2.3,back:2.5,below:0.5}};
const events=[];
function watchLeader(L,F,now){
  const s=L.P.state, was=L.lastState; L.lastState=s; if(s===was) return;
  if(s==='crouch') events.push({at:now+0.16,f:()=>{ if(F.P.state==='ground') jumpKid(F); }});
  if(s==='fly') events.push({at:now+0.25,f:()=>{ if(F.P.state==='hop'||F.P.state==='crouch') takeOff(F); else if(F.P.state==='ground'||F.P.state==='touch'){ F.P.vy=4; takeOff(F); } }});
  if(s==='land') events.push({at:now+0.25,f:()=>{ if(F.P.state==='fly') jumpKid(F); }});
}
function followInput(L,F){
  const lp=L.P, fp=F.P, inAir=lp.state==='fly'||lp.state==='land'||fp.state==='fly';
  const slot=inAir?FOLLOW.air:FOLLOW.ground, fx=Math.sin(lp.h), fz=Math.cos(lp.h), rx=-fz, rz=fx;
  const k=0.4+0.6*F.scale;
  /* never on top of her: inside a small core he is slid gently out of her way (this also covers him coasting in after a landing) */
  { const ax=fp.x-lp.x, az=fp.z-lp.z, d=Math.hypot(ax,az)||1e-3, core=(inAir?1.5:1.05)*k;
    if(d<core&&Math.abs(lp.y-fp.y)<1.2){ const m=(core-d)*0.22; fp.x+=ax/d*m; fp.z+=az/d*m; } }
  const tx=lp.x+rx*slot.right*k-fx*slot.back*k, tz=lp.z+rz*slot.right*k-fz*slot.back*k;
  const lspd=(lp.state==='fly'||lp.state==='land')?FLY_SPEED*lp.flyW+lp.spd*(1-lp.flyW):lp.spd;
  let vx=fx*lspd+(tx-fp.x)*1.8, vz=fz*lspd+(tz-fp.z)*1.8;
  /* a soft bubble of space round her: closer than this, he stops heading into her and is eased out and round her */
  { const ax=fp.x-lp.x, az=fp.z-lp.z, d=Math.hypot(ax,az)||1e-3, B=(inAir?1.9:1.3)*k;
    if(d<B){ const ux=ax/d, uz=az/d, w=(B-d)/B, into=-(vx*ux+vz*uz);
      if(into>0){ vx+=ux*into*Math.min(1,w*2.5); vz+=uz*into*Math.min(1,w*2.5); }   /* take away the part of his way that goes toward her */
      vx+=ux*w*6; vz+=uz*w*6; } }                                                 /* and nudge him out sideways */
  const v=Math.hypot(vx,vz);
  const In={climb:false,sink:false};
  /* when you let go of ↑ she stops, and so does he (unless he is far off): he waits where he is, facing her way */
  const near=Math.hypot(lp.x-fp.x,lp.z-fp.z)<4.5, sheStops=!arrowsHeld()&&(lp.state==='ground'||lp.state==='touch');
  if(sheStops&&near&&fp.state!=='fly'){ In.heading=fp.h; In.speed=0; In.airSpeed=FLY_SPEED; In.alt=Math.max(1.2,lp.alt-(slot.below||0)); return In; }
  In.face=lp.h;   // the way she is going, for his turn-and-run
  if(v>0.7){ In.heading=Math.atan2(vx,vz); In.speed=Math.min(v,F.RUN_SPEED*1.35); }
  else { In.heading=lp.h; In.speed=0; }
  In.airSpeed=Math.max(FLY_SPEED*0.6,Math.min(FLY_SPEED*1.3,v));
  In.alt=Math.max(1.2,lp.alt-(slot.below||0));
  return In;
}

async function loadKids(base){
  const get=async f=>{ const r=await fetch(base+f); if(!r.ok) throw new Error(f+' '+r.status); return r; };
  /* a model comes as its .fbx file, or, where .fbx files can't be served, as the same file written out as base64 text */
  const fbx=async n=>{ const r=await fetch(base+n); if(r.ok) return r.arrayBuffer(); return b64((await (await get(n+'.b64.txt')).text()).trim()); };
  const [gF,bF,gC,bC]=await Promise.all([fbx('girl.fbx'),fbx('boy.fbx'),get('girl-clips.json').then(r=>r.json()),get('boy-clips.json').then(r=>r.json())]);
  const G_FBX=gF, B_FBX=bF, G_CLIPS=gC, B_CLIPS=bC;
  const img=new Image(); img.src=base+'boy.jpg'; await img.decode();
  const gimg=new Image(); gimg.src=base+'girl.jpg'; await gimg.decode();
  boyTexSetup(img);
  boyTex=new THREE.CanvasTexture(BOYTEX.canvas); boyTex.encoding=THREE.sRGBEncoding; boyTex.flipY=true;
  girl=makeKid('girl',{fbx:G_FBX, run:G_CLIPS.run, fly:G_CLIPS.fly, idle:G_CLIPS.idle, jump:G_CLIPS.jump, land:G_CLIPS.land, rjump:G_CLIPS.rjump, stop:G_CLIPS.stop,
    paint:m=>{ girlTexSetup(gimg,m); GIRL_SKIN=skinMix(m,gimg,[[0.012,0.535],[0.012,0.572],[-0.035,0.57],[0.06,0.57],[-0.03,0.535],[0.055,0.535]]); girlTex=new THREE.CanvasTexture(GIRLTEX.canvas); girlTex.encoding=THREE.sRGBEncoding; girlTex.flipY=true; return new THREE.Vector3(0,0.69,-0.01); },
    material:()=>new THREE.MeshLambertMaterial({map:girlTex}), face:GIRL_FACE,
    jumpPush:G_CLIPS.jumpInfo.push, jumpFromRun:0.3, landFrom:0.30, landTo:0.95,
    runPace:(spd,K)=>(0.55+0.45*Math.min(1,spd/K.RUN_SPEED))/K.scale});
  boy=makeKid('boy',{fbx:B_FBX, run:B_CLIPS.run, fly:B_CLIPS.fly, idle:B_CLIPS.idle, jump:B_CLIPS.jump, land:B_CLIPS.land, roll:B_CLIPS.roll, rollZ:B_CLIPS.rollZ, rollEnd:2.0,
    paint:m=>{ const c=boyHair(m,img); boyHeadMask(m); boyLegFix(m); BOY_SKIN=skinMix(m,img,[[0,0.462],[0,0.508],[-0.05,0.508],[0.05,0.508],[-0.095,0.47],[0.095,0.47]]); return c; },
    material:()=>new THREE.MeshLambertMaterial({map:boyTex}), face:BOY_FACE, bored:B_CLIPS.bored, rjump:B_CLIPS.rjump, stop:B_CLIPS.stop, mouthBox:[0,0.485,0.085,0.022],
    jumpPush:B_CLIPS.jumpInfo.push, jumpFromRun:0.27, landFrom:0.33, landTo:0.95,
    runPace:(spd,K)=>Math.max(0.55,Math.min(1.9,spd/(K.animRun*K.scale)))});
  boy.RUN_SPEED=girl.RUN_SPEED;   // he keeps up with her
  boy.W.uAmt.value=0;
  boy.P.x=-1.0; boy.P.z=-0.9;
  girl.lastState='ground';
  applyLook(null);
}
