/* ---------- World: renderer, sky, clouds, ranges, the ground and grass, mist, seeds, the evening light, the camera and the controls ---------- */
/* ---------- renderer, scene, camera ---------- */
const R=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,2)); R.outputEncoding=THREE.sRGBEncoding;
R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;
$('view').appendChild(R.domElement);
const scene=new THREE.Scene();
const HAZE=[250,228,165];
/* the haze, on the 2D game's own curve: strokes fade toward the pale horizon colour from about 4.7 m out, almost fully by 136 m,
   rising steeply at first (a power of 0.6). From high up the air clears, as in the game. SOFT_HAZE things (the box) take a gentler haze so they stay in view. */
THREE.ShaderChunk.fog_fragment=`#ifdef USE_FOG
  #ifdef SOFT_HAZE
  float fogFactor=pow(clamp((vFogDepth-fogNear)/(fogFar*4.0-fogNear),0.0,1.0),0.8)*0.9;
  #else
  float fogFactor=pow(clamp((vFogDepth-fogNear)/(fogFar-fogNear),0.0,1.0),0.6)*0.96;
  #endif
  gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);
  #include <bank_fragment>
#endif`;
/* the fog bank round the box (rings.js): every fogged thing also knows where it is in the world, so the bank can lie over it */
THREE.ShaderChunk.fog_pars_vertex+=`
#ifdef USE_FOG
varying vec3 vFogW; uniform mat4 uBankVI;
#endif`;
THREE.ShaderChunk.fog_vertex+=`
#ifdef USE_FOG
vFogW=(uBankVI*vec4(mvPosition.xyz,1.0)).xyz;   /* back from the camera's view into the world (uBankVI: the camera's own matrix, rings.js) */
#endif`;
THREE.ShaderChunk.fog_pars_fragment+=`
#ifdef USE_FOG
varying vec3 vFogW; uniform vec4 uBank; uniform vec4 uBankR; uniform mat4 uBankVI;
#endif`;
THREE.ShaderChunk.bank_fragment='';   /* filled in by rings.js */
const FOG_NEAR=320*U, FOG_FAR=(320+9000)*U;
scene.fog=new THREE.Fog(rgb(HAZE).convertSRGBToLinear(),FOG_NEAR,FOG_FAR);
const cam=new THREE.PerspectiveCamera(58,1,0.25,6000);     // the game's view: focal = 0.9 × the screen's height, so 58° tall

/* the evening light: a low warm sun at the game's bearing, and a golden sky light */
const SUNDIR=new THREE.Vector3(-Math.sin(SUN_B)*Math.cos(0.025),Math.sin(0.025),Math.cos(SUN_B)*Math.cos(0.025));   // the disc sits on the horizon
const LIGHTDIR=new THREE.Vector3(-Math.sin(SUN_B)*Math.cos(0.2),Math.sin(0.2),Math.cos(SUN_B)*Math.cos(0.2));        // the light comes from a little higher, for long but useful shadows
const hemi=new THREE.HemisphereLight(0xffe6bc,0x8a6428,0.85); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffcf8e,1.15); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:80}); sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.02;
scene.add(sun,sun.target);

/* ---------- the sky: the game's gradient, teal overhead to pale gold at the horizon, with the sun's warm glow ---------- */
const skyMat=new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, fog:false,
  uniforms:{uSun:{value:SUNDIR}},
  vertexShader:`varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader:`varying vec3 vDir; uniform vec3 uSun;
    vec3 c(float r,float g,float b){ return vec3(r,g,b)/255.0; }
    void main(){ vec3 d=normalize(vDir); float e=asin(clamp(d.y,-1.0,1.0));      /* elevation, radians */
      float f=clamp(1.0-e/0.506,0.0,1.0);                                            /* the game's 0 (top of its screen) .. 1 (horizon) */
      vec3 col= f<0.4 ? mix(c(42.,138.,136.),c(79.,169.,153.),f/0.4) : f<0.76 ? mix(c(79.,169.,153.),c(147.,199.,158.),(f-0.4)/0.36) : mix(c(147.,199.,158.),c(240.,216.,152.),(f-0.76)/0.24);
      if(e>0.506) col=mix(c(42.,138.,136.),c(30.,112.,118.),clamp((e-0.506)/0.8,0.0,1.0));
      float az=atan(d.x,d.z), sa=atan(uSun.x,uSun.z), da=abs(mod(az-sa+3.14159265,6.2831853)-3.14159265);
      col=mix(col,c(255.,186.,112.),0.42*clamp(1.0-da/1.0,0.0,1.0)*clamp(1.0-e/0.506,0.0,1.0));   /* warm drift toward the sun side */
      float a=acos(clamp(dot(d,uSun),-1.0,1.0))/1.2;                                                  /* the sun's glow, as the game's radial gradient */
      vec4 g= a<0.1 ? mix(vec4(c(255.,240.,180.),0.95),vec4(c(255.,200.,105.),0.62),a/0.1) : a<0.4 ? mix(vec4(c(255.,200.,105.),0.62),vec4(c(255.,160.,80.),0.2),(a-0.1)/0.3) : mix(vec4(c(255.,160.,80.),0.2),vec4(c(255.,160.,80.),0.0),clamp((a-0.4)/0.6,0.0,1.0));
      col=mix(col,g.rgb,g.a*step(-0.02,e));
      col=mix(col,c(250.,228.,165.),0.8*clamp(1.0-abs(e)/0.05,0.0,1.0));                             /* the haze band on the horizon */
      if(e<0.0) col=c(250.,228.,165.);
      float s=acos(clamp(dot(d,uSun),-1.0,1.0)); col=mix(col,c(255.,248.,222.),smoothstep(0.016,0.011,s));   /* the disc */
      gl_FragColor=vec4(col,1.0); }`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(5000,48,24),skyMat); sky.renderOrder=-10; scene.add(sky);

/* ---------- clouds: painted the game's way (torn, sheared noise), standing far off round the sky ---------- */
const C_SH=[146,116,124], C_MID=[232,166,120], C_HI=[255,220,164];
function paintCloud(seed,wisp,warm){
  const SC=2, CW=640*SC, CH=240*SC, c=document.createElement('canvas'); c.width=CW; c.height=CH; const g=c.getContext('2d'); const r=rng(seed);
  const img=g.createImageData(CW,CH), px=img.data;
  const dens=(x,y)=>{ const u=(x-320)/300, v=(y-125)/(wisp?52:105); return fbm((x+(240-y)*0.8)/95, y/40, seed)-0.6+(0.5-u*u-v*v)*0.75; };
  for(let Y=0;Y<CH;Y++) for(let X=0;X<CW;X++){ const x=X/SC, y=Y/SC, d=dens(x,y); if(d+(r()-0.5)*0.06<=0) continue;
    const lit=0.45+(d-dens(x-13,y-11))*5-d*1.1+warm+(r()-0.5)*0.18, col=lit<0.42?C_SH:lit<0.74?C_MID:C_HI, i=(Y*CW+X)*4;
    px[i]=col[0]; px[i+1]=col[1]; px[i+2]=col[2]; px[i+3]=Math.round(238*Math.min(1,d*14)); }
  g.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
const cloudArt=[]; [0,0.06,0.3,-0.06].forEach((w,i)=>cloudArt.push(paintCloud(101+i*37,false,w))); [0.1,0.26,0].forEach((w,i)=>cloudArt.push(paintCloud(900+i*53,true,w)));
const clouds=new THREE.Group(); scene.add(clouds);
/* the 2D game's own clouds: the same list, sizes and heights over the horizon, and the same slow drift sideways round the sky,
   the bigger (nearer) ones drifting faster, so the sky moves with depth */
const cloudList=[]; const RC=4200;
{ const r=rng(7), TAU=Math.PI*2;
  for(let i=0;i<12;i++){ const v=0.4+r()*0.6; cloudList.push({th:(i+r()*0.7)/12*TAU, v, k:0.45+r()*0.3+v*0.45, art:i%4, drift:4+r()*5}); }
  for(let i=0;i<16;i++) cloudList.push({th:r()*TAU, v:0.1+r()*0.85, k:0.3+r()*0.45, art:4+i%3, drift:7+r()*9});
  cloudList.sort((a,b)=>a.k-b.k);
  for(const c of cloudList){ const m=new THREE.SpriteMaterial({map:cloudArt[c.art], fog:false, depthWrite:false, transparent:true, opacity:0.95});
    const s=new THREE.Sprite(m), aw=640*c.k*0.7/(620*0.9), w=RC*aw;                   /* the game draws its clouds at 0.7 of their size */          /* the game draws them 640·k·H/620 wide, its focal length is 0.9·H */
    s.scale.set(w,w*240/640,1); s.renderOrder=-9; c.sprite=s; c.ah=240*c.k*0.7/(620*0.9); clouds.add(s); } }
function moveClouds(t){ for(const c of cloudList){ const th=c.th-t*c.drift*c.k*0.0015,     /* the game's drift, in radians a second */
    el=Math.atan(0.5*(1-c.v*0.74)/0.9+0.1*c.ah);                                                /* and their heights scaled by 0.74 */                                                      /* its height: v=1 sits on the horizon, v=0 at the top of the view */
    c.sprite.position.set(-Math.sin(th)*RC*Math.cos(el), RC*Math.sin(el), Math.cos(th)*RC*Math.cos(el)); } }
moveClouds(0);

/* ---------- the far ranges: the game's three rings of blue-green hills, dipping between two peaks under the sun ---------- */
const RANGES=[
  {base:20,amp:56,col:[88,150,164], ks:[6,10,15,25],ph:[2.1,0.4,3.3,5.0],pk:0.15, r:3600},
  {base:10,amp:42,col:[58,126,126], ks:[7,11,17,29],ph:[4.4,2.8,0.9,1.3],pk:0.19, r:3300},
  {base:2, amp:30,col:[54,114,88],  ks:[9,14,19,31],ph:[1.2,5.1,2.6,3.9],pk:0.24, r:3000}];
const ranges=new THREE.Group(); scene.add(ranges);
/* Flying toward the box slides the mountains apart from the dip under the moon (seaPart 0..1, desert.js): the land is laid out again
   as it lay before it parted, pushed aside by the gap, the ranges by the bay rising taller and sharper, their flanks running down to nothing.
   The 2D game's drawMountains, round the whole ring. */
let seaPart=0, partBuilt=-1;
const RANGE_N=900, rangeMeshes=[];
for(const Rg of RANGES){
  const N=RANGE_N, pos=new Float32Array((N+1)*9), col=[], idx=[], top=rgb(mixA(Rg.col,[30,60,80],0.12)), mid=rgb(mixA(Rg.col,HAZE,0.1)), foot=rgb(mixA(Rg.col,HAZE,0.5));
  for(let i=0;i<=N;i++){ for(const C of [foot,mid,top]) col.push(C.r,C.g,C.b); if(i<N){ const a=i*3; idx.push(a,a+3,a+1, a+1,a+3,a+4, a+1,a+4,a+2, a+2,a+4,a+5); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); g.setIndex(idx);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true, fog:false, side:THREE.DoubleSide})); m.renderOrder=-8; m.frustumCulled=false; m.userData.Rg=Rg; ranges.add(m); rangeMeshes.push(m); }
/* the ranges' colours are written straight to the screen, as the game paints them, so they are kept as given (no light, no conversion) */
ranges.children.forEach(m=>{ m.material.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <encodings_fragment>',''); }; });

/* ---------- the ground: the game's hills, coloured like its field, in two pieces that follow the kids ---------- */
function strokeTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.fillStyle='#d9ae55'; g.fillRect(0,0,256,256);
  const r=rng(5); for(let i=0;i<2600;i++){ const x=r()*256, y=r()*256, l=6+r()*16, t=r(); g.strokeStyle=t<0.5?`rgba(150,100,24,${0.2+r()*0.25})`:`rgba(255,226,140,${0.25+r()*0.35})`; g.lineWidth=0.8+r()*1.4;
    g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+2,y-l*0.5,x+3+r()*3,y-l); g.stroke(); }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; return t; }
const STROKES=strokeTex();
const GOLD_DEEP=[196,148,52], GOLD=[226,184,86], GOLD_HI=[242,208,122];
/* the mist at the horizon over the sand: clear out to about 400 m, soft and pale by 2.8 km where the ground runs out */
const MIST0=400, MIST1=2800;
function makeGround(size,seg,shadows){
  const g=new THREE.PlaneGeometry(size,size,seg,seg); g.rotateX(-Math.PI/2);
  g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3),3));
  const mat=new THREE.MeshLambertMaterial({vertexColors:true, map:STROKES});
  mat.onBeforeCompile=sh=>{ sh.uniforms.uTime=groundTime; sh.uniforms.uAir=groundAir; sh.uniforms.uRoll=groundRoll; sh.uniforms.uRollW=groundRollW; sh.uniforms.uCoast=uCoast; sh.uniforms.uDuneA=uDuneA; sh.uniforms.uDuneB=uDuneB; sh.uniforms.uSandP=uSandP; sh.uniforms.uSunXZ={value:SUNXZ}; BLADE.forEach((c,i)=>sh.uniforms['uC'+i]={value:rgb(c).convertSRGBToLinear()});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWXZ;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWXZ; uniform vec4 uSandP; uniform float uTime; uniform vec2 uSunXZ; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;\n'+LIGHT_GLSL+'\nuniform float uAir; uniform vec2 uRoll; uniform float uRollW; float hash2(vec2 q){ return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453); }\nfloat vnoise2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y); }')
      .replace('#include <map_fragment>',`{ /* the ground's own paint: the same five golds by the same rule as the strokes, but in soft painted patches, not cells.
             From the air the far ground loses its hill shading (the 2D game does the same), keeps out of the darkest brown,
             and blends its patches softly where they would be smaller than a few pixels, so it never shimmers. */
          float d=length(vWXZ-cameraPosition.xz), air=uAir*smoothstep(25.0,90.0,d);
          float rr=0.62*vnoise2(vWXZ*0.9)+0.38*vnoise2(vWXZ*2.7+17.0);
          float lit=litAt(vWXZ,uSunXZ)*(1.0-air);
          float x=rr*2.2+gustAt(vWXZ,uTime)*2.9*(1.0-0.5*air)+lit*6.0+air*1.5+smoothstep(30.0,160.0,d)*0.5;   /* from the air the gust waves are gentler, and their troughs stay out of the dark golds */
          float k=clamp(1.2+x*0.55,1.0,4.0), soft=clamp(fwidth(k)*1.5,0.0,1.0), i=floor(k), f=fract(k);   /* the ground under the strokes is calm: only the lighter golds, at half the swing; the strokes carry the strong light */
          float w=smoothstep(0.5-0.5*soft-0.001,0.5+0.5*soft+0.001,f);
          vec3 tone=mix(bladeCol(i,uC0,uC1,uC2,uC3,uC4),bladeCol(min(4.0,i+1.0),uC0,uC1,uC2,uC3,uC4),soft>0.02?f:step(0.999,f));
          tone=mix(tone,uC2,0.35); vec4 st=texture2D(map,vUv); diffuseColor.rgb=tone*(0.84+0.2*st.r*(1.0-air))*0.93;
          /* the desert: sand laid in a few sheets along the line where it begins, so it comes in by contours (the 2D game's levels and strengths),
             pale far off and warmer near, every dune slope taking the light or lying in shade by how it faces the sun and the moon */
          float cs=coastAlong(vWXZ);
          if(cs>0.0){ float sa = cs>${(0.78*SAND_RAMP).toFixed(1)} ? 1.0 : cs>${(0.48*SAND_RAMP).toFixed(1)} ? 0.8 : cs>${(0.22*SAND_RAMP).toFixed(1)} ? 0.55 : 0.3;
            /* pale toward the horizon and warmer close under the eye, by where it lies on the screen (the 2D game's v), and the light and shade
               of the dune slopes carried all the way out, a little softer far off, so the ridges read as rows of waves to the mist */
            float v=clamp((cameraPosition.y-groundAt(vWXZ))/max(d,1.0)*1.64,0.0,1.0);
            vec3 sFar=vec3(252.,232.,160.)/255., sNear=vec3(240.,200.,104.)/255.; vec3 c0=mix(sFar,sNear,v);
            float rw=uRollW*smoothstep(8.0,40.0,d), L=mix(litAt(vWXZ,uSunXZ),litAt(vWXZ+uRoll,uSunXZ),rw), ck=mix(1.0,0.55,smoothstep(80.0,900.0,d)), sw=clamp(fwidth(L)*3.6*ck*1.5,0.0,0.5);
            float t0=clamp(0.5+L*uSandP.x*ck,0.0,1.0), th=t0*t0*(3.0-2.0*t0), t=mix(mix(th,t0,uSandP.y),t0,sw*2.0);   /* soft: a gradient; hard: two tones */
            /* from the shade side through gold to the lit side; warm turns the shadows from cool grey to a rich orange-rust */
            vec3 shC=c0*mix(vec3(0.56,0.52,0.64),vec3(0.80,0.50,0.32),uSandP.w), midC=c0*mix(vec3(0.80,0.76,0.80),vec3(0.97,0.80,0.58),uSandP.w), liC=min(c0*1.05,vec3(1.0));
            vec3 sand=(t<0.5?mix(shC,midC,t*2.0):mix(midC,liC,(t-0.5)*2.0))*(0.95+0.08*st.r*(1.0-smoothstep(40.0,160.0,d)));
            /* the crest line: where the ground folds over sharply, a thin bright edge */
            { float e=0.9, g0=groundAt(vWXZ), lap=groundAt(vWXZ+vec2(e,0.0))+groundAt(vWXZ-vec2(e,0.0))+groundAt(vWXZ+vec2(0.0,e))+groundAt(vWXZ-vec2(0.0,e))-4.0*g0;
              float cr=smoothstep(0.04,0.22,-lap)*(1.0-smoothstep(120.0,700.0,d))*uSandP.z; sand=mix(sand,min(c0*1.14,vec3(1.0)),cr); }
            /* fine wind ripples on the sand close by, wavering, a little stronger on the lit wind sides; gone where they would be smaller than a pixel */
            { float rp=dot(vWXZ,vec2(0.62,0.78))*7.0+2.6*sin(vWXZ.x*0.11+vWXZ.y*0.05)+1.8*sin(vWXZ.y*0.17-vWXZ.x*0.07), aa=1.0-smoothstep(0.6,1.6,fwidth(rp));
              float rip=smoothstep(0.55,1.0,sin(rp))*(1.0-smoothstep(18.0,70.0,d))*aa*(0.45+0.55*t); sand*=1.0-0.07*rip*uDuneB.z; }
            diffuseColor.rgb=mix(diffuseColor.rgb,pow(sand,vec3(2.2)),sa); sandA=sa; sandLin=pow(sand,vec3(2.2)); } }`)
      /* the sand is the 2D game's flat paint: its colours go straight to the screen (no evening light over them), with only the shadows the kids and the box throw */
      .replace('#include <output_fragment>',`if(sandA>0.0){ float shK=1.0;
          #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS>0
          { DirectionalLightShadow dls=directionalLightShadows[0]; shK=getShadow(directionalShadowMap[0],dls.shadowMapSize,dls.shadowBias,dls.shadowRadius,vDirectionalShadowCoord[0]); }
          #endif
          outgoingLight=mix(outgoingLight,sandLin*mix(0.62,1.0,shK),sandA); }
        #include <output_fragment>`)
      /* and no distance haze over it: the dunes run all the way out, and only at the horizon go soft into the mist */
      .replace('#include <fog_fragment>',`#ifdef USE_FOG
          { float fogFactor=pow(clamp((vFogDepth-fogNear)/(fogFar-fogNear),0.0,1.0),0.6)*0.96, mist=pow(smoothstep(${MIST0.toFixed(1)},${MIST1.toFixed(1)},length(vWXZ-cameraPosition.xz)),1.3)*0.94;
            gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,mix(fogFactor,mist,sandA)); }
          #include <bank_fragment>
          #endif`);
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','float sandA=0.0; vec3 sandLin=vec3(0.0);\nvoid main() {'); };
  const m=new THREE.Mesh(g,mat);
  m.receiveShadow=shadows; m.userData={size,seg,cx:NaN,cz:NaN}; scene.add(m); return m; }
const groundTime={value:0}, groundAir={value:0};
/* flying, the dunes roll: their light and shade drift toward you a little faster than the sand itself passes, the way the 2D game's
   painted strips made them swell and roll. Only in the air, only past a few metres out, and it fades away as the kids come down.
   ROLL_K: how much faster than the sand the light rolls (0 = still, 0.5 = half again). */
let ROLL_K=0;   // off: over a long flight the rolled light came from kilometres away and striped the crater with the field's waves
const groundRoll={value:new THREE.Vector2()}, groundRollW={value:0};
function rollDunes(dt){ const P=girl.P, fly=P.state==='fly'?P.flyW:0;
  groundRollW.value+=(fly-groundRollW.value)*(1-Math.exp(-dt*(fly>groundRollW.value?1.2:2.5)));
  if(fly>0.01){ const v=FLY_SPEED*ROLL_K*fly*dt; groundRoll.value.x+=Math.sin(P.h)*v; groundRoll.value.y+=Math.cos(P.h)*v; }
  else if(groundRollW.value<0.01) groundRoll.value.set(0,0); }   /* 0 on the ground, 1 well up in the air */
const groundNear=makeGround(260,260,true), groundFar=makeGround(6400,320,false);
/* the far piece is coarse, so in the valleys its flat cells would stand above the true ground; wherever the near piece lies over it,
   it is sunk well out of the way, on the graphics card, following the near piece as it moves */
const uNearC={value:new THREE.Vector2()};
{ const paint=groundFar.material.onBeforeCompile;   /* on top of the ground's own paint (this used to replace it, so past the near piece there was no sand) */
groundFar.material.onBeforeCompile=sh=>{ paint(sh); sh.uniforms.uNearC=uNearC;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 uNearC;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\n{ vec2 q=abs(position.xz-uNearC); transformed.y-=0.3+6.0*(1.0-smoothstep(118.0,128.0,max(q.x,q.y))); }'); }; }
function fillGround(m,cx,cz){
  const g=m.geometry, P=g.attributes.position, C=g.attributes.color, UV=g.attributes.uv, n=m.userData.seg+1, half=m.userData.size/2, step=m.userData.size/m.userData.seg;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i, x=cx-half+i*step, z=cz-half+j*step;
    P.setXYZ(k,x,groundAt(x,z),z); UV.setXY(k,x/7,z/7);
    const t=fbm(x*0.045,z*0.045,17), t2=fbm(x*0.006,z*0.006,41), c=t<0.5?mixA(GOLD_DEEP,GOLD,t/0.5):mixA(GOLD,GOLD_HI,(t-0.5)/0.5), cc=mixA(c,GOLD_DEEP,clamp((0.55-t2)*1.2,0,0.5));
    C.setXYZ(k,...rgb(cc).convertSRGBToLinear().toArray()); }
  /* the ground faces straight up for the light: its hills are shaded by the paint's own slope tone, as the 2D game does,
     not by the low sun, which would throw long dark bands across the far slopes */
  const N=g.attributes.normal; for(let k=0;k<N.count;k++) N.setXYZ(k,0,1,0);
  m.position.x=0; m.position.z=0; P.needsUpdate=true; C.needsUpdate=true; UV.needsUpdate=true; N.needsUpdate=true; g.computeBoundingSphere();
  m.userData.cx=cx; m.userData.cz=cz; }
function followGround(x,z){
  for(const [m,snap] of [[groundNear,20],[groundFar,200]]){ const cx=Math.round(x/snap)*snap, cz=Math.round(z/snap)*snap;
    if(cx!==m.userData.cx||cz!==m.userData.cz){ fillGround(m,cx,cz); if(m===groundNear) uNearC.value.set(cx,cz); } } }

/* ---------- the grass: golden blades in the wind, placed and bent on the graphics card ----------
   Each blade has a fixed spot in a square of ground that repeats under the kids, so the field never runs out.
   Blades bend downwind in travelling gusts, bow away from the kids as they run through, and glow when the sun is behind them. */
const BLADE=[[136,86,14],[176,120,22],[212,158,38],[238,192,66],[255,226,122]];
/* a blade is a strip of six pieces up to a point, so it bends in one smooth curve and tapers like the 2D game's painted stroke */
function bladeGeo(){ const NS=6, pos=[], idx=[];
  for(let i=0;i<NS;i++){ const t=i/NS; pos.push(-1,t,0, 1,t,0); } pos.push(0,1,0);
  for(let i=0;i<NS-1;i++){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); } const a=(NS-1)*2; idx.push(a,a+1,NS*2);
  const g=new THREE.InstancedBufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); return g; }
/* the light on the field, the 2D game's own rule: each stroke takes one of five flat golds, chosen by a little chance,
   by the gusts rolling downwind (paler where a gust passes) and by the hills (slopes facing the sun lighter, the others darker).
   The gusts are the game's formula on its own units, so they roll at the same size, speed and direction. */
const LIGHT_GLSL=`
${GROUND_GLSL}
float gustAt(vec2 p, float t){ float x=-p.x/${U.toFixed(8)}, z=p.y/${U.toFixed(8)};
  return clamp(0.5+0.36*sin(x*0.0028+z*0.0042-t*1.5+sin(z*0.0016+t*0.25)*2.2)+0.18*sin(x*0.011-z*0.007-t*2.6),0.0,1.0); }
float litAt(vec2 p, vec2 sunXZ){ float e=0.6; vec2 gr=vec2(groundAt(p+vec2(e,0.0))-groundAt(p-vec2(e,0.0)), groundAt(p+vec2(0.0,e))-groundAt(p-vec2(0.0,e)))/(2.0*e);
  return -dot(gr,sunXZ); }
float toneAt(float rr, float gust, float lit){ return clamp(floor(rr*2.2+gust*2.9+lit*6.0),0.0,4.0); }
vec3 bladeCol(float k, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4){ return k<0.5?c0: k<1.5?c1: k<2.5?c2: k<3.5?c3: c4; }`;
const SUNXZ=new THREE.Vector2(SUNDIR.x,SUNDIR.z).normalize();
/* the grass: brush strokes, as the 2D game paints it — short flat strokes, always turned to face you, all combed downwind
   together, swept harder as a gust goes over, packed so the ground hardly shows, parting round the kids */
function makeGrass(count,L){
  const g=bladeGeo(), off=new Float32Array(count*3), rnd=new Float32Array(count*4), r=rng(L.seed);
  for(let i=0;i<count;i++){ off[i*3]=r()*L.S; off[i*3+1]=r()*L.S; off[i*3+2]=r();
    rnd[i*4]=(0.35+r()*0.35)*L.tall; rnd[i*4+1]=(0.018+r()*0.02)*L.wide; rnd[i*4+2]=r(); rnd[i*4+3]=r(); }   /* the game's strokes: 24 to 48 units tall */
  g.setAttribute('aOff',new THREE.InstancedBufferAttribute(off,3)); g.setAttribute('aRnd',new THREE.InstancedBufferAttribute(rnd,4));
  g.instanceCount=count;
  const pal=BLADE.map(c=>rgb(c).convertSRGBToLinear());
  const mat=new THREE.ShaderMaterial({ fog:true, side:THREE.DoubleSide,
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{ uCentre:{value:new THREE.Vector2()}, uTime:{value:0}, uWind:{value:new THREE.Vector2(-1,0)},
      uKid0:{value:new THREE.Vector3(0,9,0)}, uKid1:{value:new THREE.Vector3(0,9,0)}, uSunXZ:{value:SUNXZ}, uAir:{value:0},
      uC0:{value:pal[0]}, uC1:{value:pal[1]}, uC2:{value:pal[2]}, uC3:{value:pal[3]}, uC4:{value:pal[4]}, uDeep:{value:rgb([104,62,10]).convertSRGBToLinear()} }]),
    vertexShader:`
      attribute vec3 aOff; attribute vec4 aRnd;
      uniform vec2 uCentre; uniform float uTime; uniform vec2 uWind; uniform vec3 uKid0; uniform vec3 uKid1; uniform vec2 uSunXZ; uniform float uAir;
      varying float vTone; varying float vT; varying float vNear;
      ${LIGHT_GLSL}
      #include <fog_pars_vertex>
      void main(){
        vec2 p=aOff.xy+${L.S.toFixed(1)}*floor((uCentre-aOff.xy)/${L.S.toFixed(1)}+0.5);
        float dist=length(p-uCentre), fade=(1.0-smoothstep(${(L.R*0.62).toFixed(1)},${L.R.toFixed(1)},dist))*smoothstep(${L.in0.toFixed(1)},${L.in1.toFixed(1)},dist);
        float rr=aRnd.z, gust=gustAt(p,uTime);
        float t=position.y, h=aRnd.x*(1.0-0.18*gust)*(0.35+0.65*fade)*step(0.001,fade)${L.camFade?'*smoothstep(1.2,3.5,length(p-cameraPosition.xz))':''};   /* the long grass keeps clear of the camera itself */
        { float cs=coastAlong(p); if(cs>0.0){ float gf=1.0-cs/${SAND_RAMP.toFixed(1)};   /* the desert, on the 2D game's rule */
            if(gf<=0.0) h=0.0;   /* out on the sand, no plants at all */
            else h*= fract(rr*13.37+aOff.z*7.1)>gf*gf ? 0.0 : 0.35+0.65*gf; } }
        /* turned to face you, like a stroke on paper */
        vec2 toCam=normalize(cameraPosition.xz-p+0.0001), side=vec2(toCam.y,-toCam.x);
        float w=aRnd.y*1.25*pow(1.0-t,0.75)*(1.0+0.35*t)*(0.6+0.4*fade);   /* wide at the foot, swelling a little, then tapering to a point */
        vec3 pos=vec3(p.x,groundAt(p),p.y); pos.xz+=side*position.x*w;
        /* combed downwind: the game's bend, harder in a gust, each stroke's own lean, and a flutter */
        float lean=(0.4+0.85*gust)+0.15+(fract(rr*7.31)-0.5)*0.45+sin(uTime*4.5+rr*40.0)*0.07;
        vec2 bend=uWind*lean*0.8;
        float tt=t*t; pos.xz+=bend*h*tt; pos.y+=h*t*(1.0-0.22*min(1.0,dot(bend,bend))*tt);
        float air=uAir*smoothstep(25.0,90.0,length(p-cameraPosition.xz));   /* from the air, far strokes lose their hill shading, as in the 2D game */
        vTone=toneAt(rr,gust*(1.0-0.5*air)+air*0.5,litAt(p,uSunXZ)*(1.0-air)); vT=t;
        vec4 mvPosition=modelViewMatrix*vec4(pos,1.0); gl_Position=projectionMatrix*mvPosition;
        vNear=clamp((${(330*U).toFixed(3)}+mvPosition.z)/${(220*U).toFixed(3)},0.0,1.0)*0.55;
        #include <fog_vertex>
      }`,
    fragmentShader:`
      uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4; uniform vec3 uDeep;
      varying float vTone; varying float vT; varying float vNear;
      vec3 bladeCol(float k, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4){ return k<0.5?c0: k<1.5?c1: k<2.5?c2: k<3.5?c3: c4; }
      #include <fog_pars_fragment>
      void main(){
        vec3 col=bladeCol(vTone,uC0,uC1,uC2,uC3,uC4)*(0.86+0.14*smoothstep(0.0,0.35,vT));   /* one flat gold per stroke, a touch darker at its foot */
        col=mix(col,uDeep,vNear);                                                              /* and darker close to you, as in the game */
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
      }`});
  mat.uniforms.uCoast=uCoast; mat.uniforms.uDuneA=uDuneA; mat.uniforms.uDuneB=uDuneB;   /* shared, so the desert reaches the grass */
  const mesh=new THREE.Mesh(g,mat); mesh.frustumCulled=false; scene.add(mesh); return mesh; }
const isPhone=matchMedia('(pointer: coarse)').matches;
/* three layers: long grass packed thick round the kids and the camera, the field's own strokes out to 24 m, and broad far strokes beyond.
   Blades were moved from the far layer, where they are only a gold blur in the haze, to the long grass, where you see them. */
const NEAR={S:50,R:24,in0:-1,in1:0,seed:2024,tall:1,wide:1}, MIDL={S:170,R:84,in0:15,in1:23,seed:77,tall:1.2,wide:3.2},
      LONG={S:30,R:14,in0:-1,in1:0,seed:909,tall:1.6,wide:1.25,camFade:true};
const grass=makeGrass(isPhone?55000:160000,NEAR), grassMid=makeGrass(isPhone?18000:55000,MIDL), grassLong=makeGrass(isPhone?32000:90000,LONG);
const grassAll=[grass,grassMid,grassLong];

const G_SH=[78,98,58], G_MID=[112,130,66], G_HI=[168,170,88];   // the game's three grove greens, for the painted treelines

/* and the game's own painted treelines, far off on the horizon in front of the ranges */
function paintGrove(seed){
  const GW=400, GH=140, c=document.createElement('canvas'); c.width=GW; c.height=GH; const g=c.getContext('2d'), img=g.createImageData(GW,GH), px=img.data, r=rng(seed);
  const dens=(x,y)=>{ const u=(x-100)/92, v=(70-y)/58; return fbm(x/20,y/13,seed)*0.55+(1-u*u-v*v*1.1)*0.8-0.6; };
  for(let Y=0;Y<GH;Y++) for(let X=0;X<GW;X++){ const x=X/2, y=Y/2, d=dens(x,y); if(d+(r()-0.5)*0.07<=0) continue;
    const lit=0.42+(d-dens(x+6,y-6))*4.5-d*0.5+(r()-0.5)*0.2, col=lit<0.4?G_SH:lit<0.72?G_MID:G_HI, i=(Y*GW+X)*4;
    px[i]=col[0]; px[i+1]=col[1]; px[i+2]=col[2]; px[i+3]=y>64?255*(70-y)/6:235; }
  g.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); return t; }
const treelines=[];
{ const art=[11,23,37,51].map(paintGrove), r=rng(31), RG=2850;
  for(let i=0;i<11;i++){ const th=(i+r()*0.8)/11*Math.PI*2, k=0.55+r()*0.95, w=RG*200*k/585, h=RG*56*k/585;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:art[i%4], transparent:true, opacity:0.92, fog:false, depthWrite:false}));
    m.material.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <encodings_fragment>',''); };
    m.userData={th,h,RG}; m.renderOrder=-7; ranges.add(m); treelines.push(m); } }
/* the mist on the horizon: a soft band of the haze colour all the way round, thickest where the land meets the sky and gone a little above,
   so the far dunes, the treelines and the feet of the ranges melt into it with no hard line (the 2D game's horizon). The ground in front
   hides it, and the sand's own mist reaches the same colour where the ground runs out, so the two meet without a seam. */
const MIST_R=2700, MIST_LO=-260, MIST_HI=150;
const mistBand=new THREE.Mesh(new THREE.CylinderGeometry(MIST_R,MIST_R,MIST_HI-MIST_LO,128,1,true),new THREE.ShaderMaterial({
  uniforms:{uC:{value:new THREE.Vector3(...HAZE.map(c=>c/255))}}, transparent:true, depthWrite:false, fog:false, side:THREE.BackSide,
  vertexShader:`varying float vY; void main(){ vY=position.y+${((MIST_HI+MIST_LO)/2).toFixed(1)}; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader:`uniform vec3 uC; varying float vY;
    void main(){ float up=smoothstep(${MIST_HI.toFixed(1)},-6.0,vY), a=0.82*up*up*(3.0-2.0*up);   /* fading out above, full at the horizon and below it */
      gl_FragColor=vec4(uC,a); }`}));
mistBand.position.y=(MIST_HI+MIST_LO)/2; mistBand.renderOrder=-6; mistBand.frustumCulled=false; ranges.add(mistBand);
function fromMoon(th){ const d=th-SUN_B; return Math.atan2(Math.sin(d),Math.cos(d)); }
function partRanges(sea){
  if(Math.abs(sea-partBuilt)<0.003) return; partBuilt=sea;
  const grow=sea*sea*(3-2*sea), gap=0.5*grow;
  for(const m of rangeMeshes){ const Rg=m.userData.Rg, P=m.geometry.attributes.position.array, N=RANGE_N;
    for(let i=0;i<=N;i++){ const th=i/N*Math.PI*2, d=fromMoon(th), ad=Math.abs(d), src=ad<=gap?0:(ad-gap)*Math.PI/(Math.PI-gap), t0=SUN_B+(d<0?-src:src);   // the land as it lay before it parted
      const n=0.45*Math.sin(Rg.ks[0]*t0+Rg.ph[0])+0.3*Math.sin(Rg.ks[1]*t0+Rg.ph[1])+0.17*Math.sin(Rg.ks[2]*t0+Rg.ph[2])+0.08*Math.sin(Rg.ks[3]*t0+Rg.ph[3]);
      const w=Math.exp(-(src/0.36)*(src/0.36)), pe=(src-Rg.pk)/0.08, des=0.2+1.0*Math.exp(-pe*pe); let v=Math.pow(0.5+0.5*n,1.6); v+=(des-v)*w;
      if(grow>0){ const wg=Math.exp(-(src/0.75)*(src/0.75)); v=v*(1+1.25*grow*wg)+grow*wg*0.16*(Math.abs(Math.sin(src*43+Rg.pk*31))+0.6*Math.abs(Math.sin(src*97+Rg.pk*7))-0.7); }   // the ranges by the bay rise taller and sharper
      const edge=clamp((ad-gap)/0.06+(1-Math.min(1,gap/0.05)),0,1), es=edge*edge*(3-2*edge);                                                                           // the flanks run down to nothing
      const ang=(Rg.base+Rg.amp*v*1.3)*es/585, hTop=Rg.r*Math.tan(ang), sx=-Math.sin(th)*Rg.r, sz=Math.cos(th)*Rg.r, b=-Rg.r*0.012, o=i*9;
      P[o]=sx; P[o+1]=b; P[o+2]=sz; P[o+3]=sx; P[o+4]=b+(hTop-b)*0.4; P[o+5]=sz; P[o+6]=sx; P[o+7]=Math.max(b,hTop); P[o+8]=sz; }
    m.geometry.attributes.position.needsUpdate=true; }
  /* the treelines slide apart with the mountains */
  for(const m of treelines){ const {th,h,RG}=m.userData, d=fromMoon(th), t=SUN_B+(d<0?-1:1)*(Math.abs(d)*(Math.PI-gap)/Math.PI+gap);
    m.position.set(-Math.sin(t)*RG, h/2-RG*0.012, Math.cos(t)*RG); m.rotation.set(0,Math.atan2(Math.sin(t),-Math.cos(t)),0); }   /* facing the middle of the ring */
}
partRanges(0);

/* ---------- drifting seeds: little lit tufts carried on the wind past the kids ---------- */
const SEEDS=isPhone?70:160, seedBox=24;
const seedGeo=new THREE.BufferGeometry(), seedPos=new Float32Array(SEEDS*3), seedInfo=[];
{ const r=rng(99); for(let i=0;i<SEEDS;i++){ seedInfo.push({x:r()*seedBox,y:0.3+r()*3.5,z:r()*seedBox,sp:0.7+r()*1.6,ph:r()*6.28}); } }
seedGeo.setAttribute('position',new THREE.BufferAttribute(seedPos,3));
const seedTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');   /* the game's seeds: little white streaks, tilted */
  g.translate(32,32); g.rotate(-0.25); g.fillStyle='rgba(255,246,214,1)'; g.beginPath(); g.ellipse(0,0,26,6.5,0,0,7); g.fill(); return new THREE.CanvasTexture(c); })();
const seeds=new THREE.Points(seedGeo,new THREE.PointsMaterial({map:seedTex, size:0.16, transparent:true, opacity:0.7, depthWrite:false, color:0xffffff}));
seeds.frustumCulled=false; scene.add(seeds);
function moveSeeds(dt,t){ const w=grass.material.uniforms.uWind.value, cx=cam.position.x, cz=cam.position.z;
  for(let i=0;i<SEEDS;i++){ const p=seedInfo[i]; p.x+=w.x*p.sp*dt; p.z+=w.y*p.sp*dt;
    const x=cx+((p.x-cx)%seedBox+seedBox*1.5)%seedBox-seedBox/2, z=cz+((p.z-cz)%seedBox+seedBox*1.5)%seedBox-seedBox/2;
    seedPos[i*3]=x; seedPos[i*3+1]=groundAt(x,z)+p.y+Math.sin(t*1.3+p.ph)*0.25; seedPos[i*3+2]=z; }
  seedGeo.attributes.position.needsUpdate=true; }

/* ---------- the evening light, paper grain and lens flare: the game's own, laid over the 3D picture ----------
   The light is a warm glow round the sun, mixed in soft-light; the grain is the game's noise tile in overlay;
   the flare's ghosts sit on the line from the sun through the girl, as in the game, so it swings across the
   frame as she moves and is strongest when she runs in front of the sun. */
const lightCv=$('light'), lightG=lightCv.getContext('2d'), flareCv=$('flare'), flareG=flareCv.getContext('2d');
{ const c=document.createElement('canvas'); c.width=c.height=220; const g=c.getContext('2d'), d=g.createImageData(220,220), r=rng(5);
  for(let i=0;i<d.data.length;i+=4){ const v=128+(r()-0.5)*150; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } g.putImageData(d,0,0);
  $('grain').style.backgroundImage=`url(${c.toDataURL()})`; }
const GHOSTS=[[0.45,26,'190,240,140',.17],[0.8,14,'110,230,170',.16],[1.0,58,'210,240,150',.1],[1.35,22,'150,235,150',.14],[1.7,90,'120,220,170',.08],[2.1,38,'220,245,170',.09]];
const _sp=new THREE.Vector3(), _fw=new THREE.Vector3();
function overlays(t){
  const W=innerWidth, H=innerHeight; if(lightCv.width!==W||lightCv.height!==H){ lightCv.width=flareCv.width=W; lightCv.height=flareCv.height=H; }
  const focal=H/2/Math.tan(cam.fov*Math.PI/360);
  cam.getWorldDirection(_fw); const fy=Math.atan2(_fw.x,_fw.z), sy=Math.atan2(SUNDIR.x,SUNDIR.z); let d=sy-fy; d=Math.atan2(Math.sin(d),Math.cos(d));
  let sunX, horizonY;
  _sp.copy(cam.position).addScaledVector(new THREE.Vector3(SUNDIR.x,0,SUNDIR.z).normalize(),1000).project(cam);
  if(Math.abs(d)<1.4&&_sp.z<1){ sunX=(_sp.x+1)/2*W; horizonY=(1-_sp.y)/2*H; }
  else { sunX=(d>0?-1:1)*(W+2000)+(d>0?0:W); _sp.copy(cam.position).addScaledVector(_fw.setY(0).normalize(),1000).project(cam); horizonY=(1-_sp.y)/2*H; }
  const off=sunX<0?-sunX:sunX>W?sunX-W:0, sunI=clamp(1-off/350,0,1);
  /* the warm light */
  const lx=clamp(sunX,-200,W+200), LR=Math.max(W,H)*1.05, l=lightG.createRadialGradient(lx,horizonY,0,lx,horizonY,LR);
  l.addColorStop(0,'rgba(255,206,110,.85)'); l.addColorStop(0.45,'rgba(255,176,90,.3)'); l.addColorStop(1,'rgba(30,84,108,.5)');
  lightG.clearRect(0,0,W,H); lightG.fillStyle=l; lightG.fillRect(0,0,W,H);
  /* the flare */
  flareG.clearRect(0,0,W,H); if(sunI<=0.01||!girl) return;
  _sp.set(girl.P.x,groundAt(girl.P.x,girl.P.z)+girl.P.y+0.65,girl.P.z).project(cam); const kx=(_sp.x+1)/2*W, ky=(1-_sp.y)/2*H;
  const q=H/650, sY=horizonY-4*q, near=clamp(1-Math.abs(sunX-kx)/(W*0.55),0,1), f=1.7*sunI*(0.4+0.6*near*near)*(0.93+0.07*Math.sin(t*2.3));
  flareG.save(); flareG.translate(sunX,sY); flareG.scale(1,0.06);
  const st=flareG.createRadialGradient(0,0,0,0,0,460*q); st.addColorStop(0,'rgba(228,250,190,'+0.5*f+')'); st.addColorStop(1,'rgba(190,240,150,0)');
  flareG.fillStyle=st; flareG.beginPath(); flareG.arc(0,0,460*q,0,7); flareG.fill(); flareG.restore();
  const hl=flareG.createRadialGradient(sunX,sY,95*q,sunX,sY,215*q); hl.addColorStop(0,'rgba(170,235,150,0)'); hl.addColorStop(0.5,'rgba(170,235,150,'+0.09*f+')'); hl.addColorStop(1,'rgba(170,235,150,0)');
  flareG.fillStyle=hl; flareG.beginPath(); flareG.arc(sunX,sY,215*q,0,7); flareG.fill();
  const dx=kx-sunX, dy=ky-sY;
  for(const gh of GHOSTS){ const x=sunX+dx*gh[0], y=sY+dy*gh[0], Rr=gh[1]*q*1.8, a=gh[3]*f, gr=flareG.createRadialGradient(x,y,0,x,y,Rr);
    gr.addColorStop(0,'rgba('+gh[2]+','+a+')'); gr.addColorStop(0.4,'rgba('+gh[2]+','+a*0.5+')'); gr.addColorStop(1,'rgba('+gh[2]+',0)'); flareG.fillStyle=gr; flareG.beginPath(); flareG.arc(x,y,Rr,0,7); flareG.fill(); } }

/* ---------- the kids ---------- */
let girl, boy, rollChance=0.35;
let ALT_MAX=640*U;                                 // how high they may fly: feathers alone reach 640 game units; a full flock lifts it to 2400 (feathers.js)
const keys=new Set();
function arrowsHeld(){ return keys.has('up')||keys.has('down')||keys.has('left')||keys.has('right'); }

/* ---------- the camera: the game's own — behind and a little above, turning slowly after the kids,
   pulling back and rising when they fly, and looking level at the horizon on the ground ---------- */
const CAM_H=90*U, CAM_BACK=440*U;
let camYaw=0, backYaw=null, focX=0, focZ=0, lift=0, camTop=0, camY=CAM_H, lastX=0, lastZ=0, velX=0, velZ=0;
let camFly=0;
function placeCam(K,dt,snap){
  const P=K.P, moving=(P.spd>0.6*K.RUN_SPEED&&P.state!=='stop')||P.state==='fly'||P.state==='land';
  if(snap){ camYaw=P.h; focX=P.x; focZ=P.z; lastX=P.x; lastZ=P.z; velX=velZ=0; }
  else if(dt>0){ const k=1-Math.exp(-dt*8); velX+=((P.x-lastX)/dt-velX)*k; velZ+=((P.z-lastZ)/dt-velZ)*k; lastX=P.x; lastZ=P.z; }   /* their real speed, running or flying */
  if(!snap&&moving){ let d=P.h-camYaw; d=Math.atan2(Math.sin(d),Math.cos(d)); camYaw+=d*(1-Math.exp(-dt*1.5)); }
  const ce=snap?1:1-Math.exp(-dt*3.2);
  focX+=(P.x+velX*0.12-focX)*ce; focZ+=(P.z+velZ*0.12-focZ)*ce;
  /* in the air the camera rides the same gentler ground as the kids, and keeps their real height above it (so it stays with them, not the dunes) */
  const air=P.state==='fly'||P.state==='land', g0F=groundAt(focX,focZ), gF=P.flyW>0.001?g0F+(airGround(focX,focZ)-g0F)*P.flyW:g0F;
  const hy=P.wy!=null&&P.flyW>0.001?Math.max(0,P.y+(groundAt(P.x,P.z)-gF)*P.flyW):Math.max(0,P.y);
  lift+=(clamp(hy/(240*U),0,2.7)-lift)*(snap?1:1-Math.exp(-dt*2.5));
  const back=CAM_BACK+Math.min(lift,1.4)*170*U+(air?1:0)*P.flyW*110*U;
  /* near the top of the sky they may reach: a little higher, tipped further down, a wider view (CAMTOP, settings.js) */
  const topWant=(air&&LEVEL===1&&ALT_MAX>0)?clamp((hy/ALT_MAX-CAMTOP.start)/(1-CAMTOP.start),0,1):0;
  camTop+=(topWant-camTop)*(snap?1:1-Math.exp(-dt/1.5)); const tk=camTop*camTop*(3-2*camTop);
  const flockK=clamp((ALT_MAX/U-FEATHER_TOP)/(CEILING-FEATHER_TOP),0,1), raise=tk*(CAMTOP.raiseFeather+(CAMTOP.raiseFlock-CAMTOP.raiseFeather)*flockK);
  const flyWant=(air&&LEVEL===1&&!freeFly())?P.flyW:0; camFly+=(flyWant-camFly)*(snap?1:1-Math.exp(-dt*1.2)); const fk=camFly*camFly*(3-2*camFly);   /* flying on feathers: higher, looking down (CAMFLY) */
  const fov=58+tk*CAMTOP.wider; if(Math.abs(cam.fov-fov)>0.01){ cam.fov=fov; cam.updateProjectionMatrix(); }
  const fx=Math.sin(camYaw), fz=Math.cos(camYaw), px=focX-fx*back, pz=focZ-fz*back;
  /* the ground behind the camera is only a floor (it never pushes the camera up over a dune it is already well above) */
  const gt=Math.max(gF+CAM_H+(hy-Math.min(hy*0.15,95*U))*Math.min(1,lift*1.6)+raise+fk*CAMFLY.raise, groundAt(px,pz)-15*U+CAM_H);
  camY+=(gt-camY)*(snap?1:1-Math.exp(-dt*4));
  cam.position.set(px,camY,pz);
  const pitch=-Math.atan(0.1*Math.min(lift,1.7)/0.9)-tk*CAMTOP.tilt*Math.PI/180-fk*CAMFLY.tilt*Math.PI/180;   // in the air the horizon rises, so the view tips down a little (more near the top)
  cam.lookAt(px+fx*Math.cos(pitch),camY+Math.sin(pitch),pz+fz*Math.cos(pitch));
  /* the sky, clouds and ranges stay at the horizon; the sun's shadow box follows the kids */
  { const hk=Math.pow(Math.max(1,(camY-gF)/CAM_H),0.75); scene.fog.near=FOG_NEAR*hk; scene.fog.far=FOG_FAR*hk; }
  sky.position.copy(cam.position); clouds.position.set(cam.position.x,cam.position.y-30,cam.position.z); ranges.position.set(cam.position.x,cam.position.y-CAM_H,cam.position.z);
  sun.target.position.set(P.x,groundAt(P.x,P.z),P.z); sun.position.copy(sun.target.position).addScaledVector(LIGHTDIR,40);
}

/* ---------- input: the arrows are read against where the camera looks, as in the game ---------- */
function keyInput(){ const L=girl, P=L.P, air=P.state==='fly'||P.state==='land';
  let ix=(keys.has('right')?1:0)-(keys.has('left')?1:0), iz=(keys.has('up')?1:0)-(keys.has('down')?1:0);
  const In={speed:0, climb:keys.has('jump'), sink:keys.has('down'), steered:true, keys:true};
  if(air){ if(keys.has('up')) In.airSpeed=FLY_SPEED*FLYKEYS.faster; iz=0; }   // in the air ↑/W flies a little faster; ←/→ turn
  const back=!air&&iz<0&&ix===0; if(back&&backYaw==null) backYaw=camYaw; if(!back) backYaw=null;
  if(ix||iz){ const y=back?backYaw:camYaw, fx=Math.sin(y), fz=Math.cos(y), wx=fx*iz-fz*ix, wz=fz*iz+fx*ix;
    In.heading=Math.atan2(wx,wz); In.speed=L.RUN_SPEED; }
  return In; }
let moved=false;
function nudge(){ if(!moved){ moved=true; setTimeout(()=>$('hint').classList.add('gone'),9000); } }
const KEYMAP={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down'};
addEventListener('keydown',e=>{ const k=e.key.toLowerCase(); if(KEYMAP[k]||k===' ') e.preventDefault();
  if(k===' '){ keys.add('jump'); if(!e.repeat&&girl&&girl.P.state!=='fly'&&girl.P.state!=='land') jumpKid(girl); } if(KEYMAP[k]){ keys.add(KEYMAP[k]); nudge(); }
  if(k==='`') $('stats').hidden=!$('stats').hidden; });
addEventListener('keyup',e=>{ const k=e.key===' '?'jump':KEYMAP[e.key.toLowerCase()]; if(k) keys.delete(k); });
addEventListener('blur',()=>keys.clear());
/* on a phone: drag to run (sideways to steer, up to run on, down to come back), tap to hop */
let drag=null; const view=$('view');
view.addEventListener('pointerdown',e=>{ view.focus(); try{ view.setPointerCapture(e.pointerId); }catch(_){ } drag={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),far:0}; });
view.addEventListener('pointermove',e=>{ if(!drag||e.pointerId!==drag.id) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.far=Math.max(drag.far,Math.hypot(dx,dy));
  keys.delete('left'); keys.delete('right'); keys.delete('up'); keys.delete('down');
  if(dx<-14) keys.add('left'); else if(dx>14) keys.add('right'); if(dy<-14) keys.add('up'); else if(dy>40) keys.add('down'); if(drag.far>14) nudge(); });
function endDrag(e){ if(!drag||e.pointerId!==drag.id) return; if(drag.far<10&&performance.now()-drag.t<260&&girl) jumpKid(girl); for(const k of ['left','right','up','down']) keys.delete(k); drag=null; }
view.addEventListener('pointerup',endDrag); view.addEventListener('pointercancel',endDrag);
