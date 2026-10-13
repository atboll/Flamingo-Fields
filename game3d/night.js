/* Flamingo Fields 3D: the day and the night, on the 2D game's clock and its night grade.

   The golden evening stands still until the 4th flamingo joins. Then the day turns, once every 8 minutes:
   3 minutes of golden evening (the first starts 10 s before its end), a minute of dusk, 3 minutes of moonlit night, a minute of dawn.
   The sun does not move. As in the 2D game, the night is a grade laid over the finished picture: a multiply that passes through a dusty violet
   at dusk on the way to moonlit blue, a faint lift in the shadows, the moon's bluish glow round it and a pool of moonlight out on the field.
   After the grade come the things that give light, so the night does not dull them: the stars, the moon (rising out of the mountains under
   the sun, with clouds drifting over it) and the feathers' glow.

   In 3D the grade is done on the graphics card: the frame is drawn, copied, and drawn again graded. The depth of the first drawing is kept,
   so hills, mountains and kids still hide the stars and the moon behind them. In the golden evening none of this runs. */

const DAY_LEN=480, EVENING=180, DUSK=60, NIGHT_LEN=180;
let night=0, moonUp=0, dayOffset=0, nightOn=false;
function dayPhase(time){ return (((time+dayOffset)%DAY_LEN)+DAY_LEN)%DAY_LEN; }
function updateNight(time){
  if(!nightOn){ if(mates.length>=4){ nightOn=true; dayOffset=EVENING-10-time; } else dayOffset=-time; }
  const p=dayPhase(time), sm=t=>{ t=clamp(t,0,1); return t*t*(3-2*t); };
  night = p<EVENING ? 0 : p<EVENING+DUSK ? sm((p-EVENING)/DUSK) : p<EVENING+DUSK+NIGHT_LEN ? 1 : 1-sm((p-EVENING-DUSK-NIGHT_LEN)/(DAY_LEN-EVENING-DUSK-NIGHT_LEN));
  /* the moon rises out of the horizon at dusk, stands highest in the middle of the night, and sinks back by dawn */
  const mp=clamp((p-EVENING)/(DAY_LEN-EVENING),0,1); moonUp=p<EVENING?0:Math.pow(Math.sin(Math.PI*mp),0.75);
}
/* for testing: the N key jumps to the next part of the day (dusk, night, dawn, evening) */
addEventListener('keydown',e=>{ if(e.key!=='n'&&e.key!=='N') return; if(!nightOn){ nightOn=true; dayOffset=EVENING-clock; return; }
  const p=dayPhase(clock), marks=[EVENING,EVENING+DUSK,EVENING+DUSK+NIGHT_LEN,DAY_LEN], to=marks.find(m=>m>p+1)??DAY_LEN+EVENING; dayOffset+=to-p; });

/* ---------- the grade: a copy of the frame, drawn again through the 2D game's night ---------- */
const lightScene=new THREE.Scene();     /* what is drawn after the grade, tested against the frame's depth */
let fbTex=null; const _db=new THREE.Vector2(), _zero=new THREE.Vector2(0,0);
const gradeU={ tFrame:{value:null}, uN:{value:0}, uC:{value:new THREE.Vector3(1,1,1)}, uMoon:{value:new THREE.Vector2()}, uMa:{value:0},
  uHor:{value:0}, uSize:{value:new THREE.Vector2(1,1)}, uDpr:{value:1} };
/* the grade itself, shared by the frame and by the clouds that are drawn again over the moon, so the two match exactly (in the screen's own colour values) */
const GRADE_GLSL=`uniform float uN, uMa, uHor, uDpr; uniform vec3 uC; uniform vec2 uMoon, uSize;
  vec3 nightGrade(vec3 c){
    c*=uC;                                                              /* multiply: violet at dusk, moonlit blue at night */
    vec3 sc=1.0-(1.0-c)*(1.0-vec3(4.0,8.0,30.0)/255.0); c=mix(c,sc,uN);  /* screen rgba(4,8,30,n) */
    vec2 p=vec2(gl_FragCoord.x, uSize.y*uDpr-gl_FragCoord.y)/uDpr;      /* this pixel, in page pixels from the top left */
    /* the moon's glow round it (a canvas radial gradient with the 2D game's stops) */
    float R=max(uSize.x,uSize.y)*0.75, t=length(p-uMoon)/R;
    vec4 g = t<0.12 ? mix(vec4(150.,180.,255.,0.42*255.),vec4(110.,145.,235.,0.14*255.),t/0.12) : mix(vec4(110.,145.,235.,0.14*255.),vec4(90.,120.,220.,0.),clamp((t-0.12)/0.88,0.,1.));
    g/=255.0; c=mix(c,g.rgb,g.a*uMa);
    /* a pool of moonlight out on the field, below the moon, with no edge anywhere */
    float ry=(uSize.y-uHor)*0.62, rx=uSize.x*0.4; vec2 q=p-vec2(uMoon.x,uHor+ry); q.x*=ry/rx; t=length(q)/ry;
    float a = t<0.55 ? mix(0.2,0.11,t/0.55) : mix(0.11,0.0,clamp((t-0.55)/0.45,0.,1.));
    if(abs(q.x)<ry && abs(q.y)<ry) c=mix(c,vec3(170.,200.,255.)/255.,a*uMa);
    return c; }
`;
const gradeMat=new THREE.ShaderMaterial({ uniforms:gradeU, depthTest:false, depthWrite:false,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:'uniform sampler2D tFrame; varying vec2 vUv;\n'+GRADE_GLSL+'void main(){ gl_FragColor=vec4(nightGrade(texture2D(tFrame,vUv).rgb),1.0); }' });
const gradeScene=new THREE.Scene(), gradeCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
{ const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),gradeMat); q.frustumCulled=false; gradeScene.add(q); }

/* ---------- the moon: a smooth, pale cream disc with soft grey-brown seas (the 2D game's seas, in the same places),
   its rim fading over a few pixels, and a soft halo round it: a tight corona and a wide, faint, cool bloom ---------- */
function paintMoon(){
  const N=512, c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d'), img=g.createImageData(N,N), px=img.data;
  const seas=[[-0.36,-0.26,0.36],[0.04,-0.42,0.24],[-0.08,0.08,0.27],[0.34,-0.08,0.2],[-0.42,0.3,0.2],[0.2,0.42,0.16],[0.5,0.3,0.12]];
  const ss=(a,b,t)=>{ t=clamp((t-a)/(b-a),0,1); return t*t*(3-2*t); }, lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  const CREAM=[247,240,216], LIGHTSEA=[214,204,182], SEA=[184,173,158], rimW=3/N*2;            /* the rim fades over about three pixels of the texture */
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const u=(x+0.5)/N*2-1, v=(y+0.5)/N*2-1, d=Math.hypot(u,v), i=(y*N+x)*4; if(d>1){ px[i+3]=0; continue; }
    let m=-1; for(const q of seas) m=Math.max(m,1-Math.hypot(u-q[0],v-q[1])/q[2]);
    m+=(vnoise(u*5+9,v*5+9,31)-0.5)*0.45+(vnoise(u*11+3,v*11+3,57)-0.5)*0.15;                   /* soft, low-frequency mottling only: no grain */
    let col=lerp(CREAM,LIGHTSEA,ss(-0.12,0.18,m)); col=lerp(col,SEA,ss(0.18,0.5,m));
    const limb=1-0.1*Math.pow(d,4)-0.04*clamp(u*0.6+v*0.8,0,1)+0.05*ss(0.82,1,d);              /* a touch darker toward the edge, then a faint bright rim */
    px[i]=clamp(col[0]*limb,0,255); px[i+1]=clamp(col[1]*limb,0,255); px[i+2]=clamp(col[2]*limb,0,255);
    px[i+3]=Math.round(255*clamp((1-d)/rimW,0,1)); }
  g.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t;
}
function haloTex(stops){ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'), r=g.createRadialGradient(128,128,0,128,128,128);
  for(const [o,col] of stops) r.addColorStop(o,col); g.fillStyle=r; g.fillRect(0,0,256,256); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
/* the stars and the moon mark where they are drawn (stencil 1), so the clouds can be drawn again over just those places */
const STENCIL={ stencilWrite:true, stencilRef:1, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp };
const MOON_D=4600, MOON_R=MOON_D*Math.tan(Math.atan(30/650/0.9));     /* the 2D moon: 30 pixels across at a 650-pixel-tall view */
/* the moon's face: your pencil drawing (assets/moon.png, cut round with a soft two-pixel rim); the painted one stands in until it has loaded */
const MOON_TEX=(()=>{ const t=new THREE.TextureLoader().load('assets/moon.png',tt=>{ moon.material.map=tt; moon.material.needsUpdate=true; }); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t; })();
const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:paintMoon(), transparent:true, depthWrite:false, fog:false, alphaTest:0.02, ...STENCIL}));
moon.scale.set(MOON_R*2,MOON_R*2,1); moon.renderOrder=2; lightScene.add(moon);
/* the corona: brightest at the disc's edge, gone by 1.5 times its size, on an eased curve so it has no edge */
const CORONA=1.5, BLOOM=4;
const moonHaze=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex([[0,'rgba(232,236,252,0.42)'],[1/CORONA,'rgba(232,236,252,0.42)'],[0.78,'rgba(226,232,252,0.2)'],[0.88,'rgba(220,228,252,0.08)'],[0.95,'rgba(220,228,252,0.02)'],[1,'rgba(220,228,252,0)']]),
  transparent:true, depthWrite:false, fog:false}));
moonHaze.scale.set(MOON_R*2*CORONA,MOON_R*2*CORONA,1); moonHaze.renderOrder=4;   /* drawn after the clouds that cross the disc, so its glow lies evenly over cloud and sky */ lightScene.add(moonHaze);
/* the bloom: wide, faint and cool, falling away smoothly */
const moonBloom=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex([[0,'rgba(180,200,255,0.2)'],[0.25,'rgba(175,196,255,0.16)'],[0.45,'rgba(170,192,255,0.08)'],[0.65,'rgba(165,188,255,0.03)'],[0.85,'rgba(160,185,255,0.008)'],[1,'rgba(160,185,255,0)']]),
  transparent:true, depthWrite:false, fog:false}));
moonBloom.scale.set(MOON_R*2*BLOOM,MOON_R*2*BLOOM,1); moonBloom.renderOrder=0; lightScene.add(moonBloom);

/* ---------- the stars: the 2D game's 340, at the same bearings and heights over the horizon, twinkling ---------- */
const STAR_D=4700;
const stars=(()=>{ const pos=[], size=[], ph=[];
  for(let i=0;i<340;i++){ const th=h2(i,1)*6.283, v=h2(i,2), r=0.7+1.5*h2(i,3)*h2(i,3), el=Math.atan(0.5*(0.98-0.93*v*v)/0.9);
    pos.push(-Math.sin(th)*Math.cos(el)*STAR_D, Math.sin(el)*STAR_D, Math.cos(th)*Math.cos(el)*STAR_D); size.push(r*0.75); ph.push(i); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('size',new THREE.Float32BufferAttribute(size,1)); g.setAttribute('ph',new THREE.Float32BufferAttribute(ph,1));
  const m=new THREE.ShaderMaterial({ uniforms:{uA:{value:0},uT:{value:0},uDpr:{value:1}}, transparent:true, depthWrite:false, ...STENCIL,
    vertexShader:`attribute float size, ph; uniform float uT, uDpr; varying float vA; void main(){ vA=0.7+0.3*sin(uT*2.0+ph); gl_PointSize=size*2.0*uDpr+1.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform float uA; varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; float a=clamp((1.0-d)*1.6,0.0,1.0)*0.75*vA*uA; if(a<0.01) discard; gl_FragColor=vec4(215.0/255.0,228.0/255.0,1.0,a); }` });
  const p=new THREE.Points(g,m); p.frustumCulled=false; p.renderOrder=0; lightScene.add(p); return p; })();

/* ---------- clouds again, in night colours, over just the stars and the moon: they pass in front of both ---------- */
const nightClouds=new THREE.Group(); lightScene.add(nightClouds);
for(const c of cloudList){ const m=c.sprite.material.clone(); Object.assign(m,{stencilWrite:true, stencilRef:1, stencilFunc:THREE.EqualStencilFunc, depthTest:false});
  m.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,gradeU); sh.fragmentShader=GRADE_GLSL+sh.fragmentShader.replace('#include <encodings_fragment>','#include <encodings_fragment>\n gl_FragColor.rgb=nightGrade(gl_FragColor.rgb);'); };
  const s=new THREE.Sprite(m); s.scale.copy(c.sprite.scale); s.renderOrder=3; c.night=s; nightClouds.add(s); }

/* ---------- each frame ---------- */
const _mp=new THREE.Vector3(), _hp=new THREE.Vector3(), _f=new THREE.Vector3();
function nightFrame(time){
  updateNight(time);
  const n=night, W=innerWidth, H=innerHeight;
  lightCv.style.opacity=String(1-n); flareCv.style.opacity=String(1-n);     /* the warm evening light and the sun's flare go with the day */
  const lit=n>0.005;
  moon.visible=moonHaze.visible=moonBloom.visible=stars.visible=nightClouds.visible=lit;
  if(!lit) return;
  /* the moon, at the sun's bearing, from 4.5 degrees under the horizon to about 20 over it (the 2D game's path) */
  const q=46/650, el=Math.atan(((0.5*0.64+q)*moonUp-q)/0.9), dir=new THREE.Vector3(-Math.sin(SUN_B)*Math.cos(el),Math.sin(el),Math.cos(SUN_B)*Math.cos(el));
  moon.position.copy(cam.position).addScaledVector(dir,MOON_D); moonHaze.position.copy(cam.position).addScaledVector(dir,MOON_D*1.001); moonBloom.position.copy(cam.position).addScaledVector(dir,MOON_D*1.002);
  const mo=clamp(n*1.6,0,1); moon.material.opacity=mo; moonHaze.material.opacity=mo; moonBloom.material.opacity=mo;
  stars.position.copy(cam.position); stars.material.uniforms.uA.value=clamp((n-0.45)/0.55,0,1); stars.material.uniforms.uT.value=time; stars.material.uniforms.uDpr.value=R.getPixelRatio();
  /* the night clouds follow the clouds; how much they cover the moon follows its glow */
  nightClouds.position.copy(clouds.position);
  const c = n<0.5 ? mixA([255,255,255],[168,128,166],n*2) : mixA([168,128,166],[44,74,158],(n-0.5)*2);
  const ma=clamp((n-0.3)/0.7,0,1)*clamp(moonUp*5,0.25,1);
  for(const cl of cloudList){ cl.night.position.copy(cl.sprite.position); }
  /* where the moon is on the screen, and the horizon, for its glow and its pool of light */
  const focal=H/2/Math.tan(cam.fov*Math.PI/360); cam.getWorldDirection(_f); const fy=Math.atan2(_f.x,_f.z); let d=Math.atan2(dir.x,dir.z)-fy; d=Math.atan2(Math.sin(d),Math.cos(d));
  _hp.copy(cam.position).addScaledVector(_f.setY(0).normalize(),1000).project(cam); const hor=(1-_hp.y)/2*H;
  let mx; if(Math.abs(d)<1.4){ _mp.copy(cam.position).addScaledVector(dir,MOON_D).project(cam); mx=clamp((_mp.x+1)/2*W,-400,W+400); } else mx=d>0?-400:W+400;
  const my=hor-focal*Math.tan(el);
  gradeU.uN.value=n; gradeU.uC.value.set(c[0]/255,c[1]/255,c[2]/255); gradeU.uMoon.value.set(mx,my); gradeU.uMa.value=ma; gradeU.uHor.value=hor; gradeU.uSize.value.set(W,H); gradeU.uDpr.value=R.getPixelRatio();
}
/* drawing the frame: the scene; at night its copy graded over it; then the lights, tested against the scene's depth */
function renderFrame(){
  R.render(scene,cam);
  R.autoClear=false;
  if(night>0.005){
    R.getDrawingBufferSize(_db);
    if(!fbTex||fbTex.image.width!==_db.x||fbTex.image.height!==_db.y){ if(fbTex) fbTex.dispose(); fbTex=new THREE.FramebufferTexture(_db.x,_db.y,THREE.RGBAFormat); gradeU.tFrame.value=fbTex; }
    R.copyFramebufferToTexture(_zero,fbTex); R.render(gradeScene,gradeCam); }
  R.render(lightScene,cam);
  R.autoClear=true;
}
