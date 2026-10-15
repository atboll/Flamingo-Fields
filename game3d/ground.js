/* ---------- Ground: units, the game's helpers, and the land (in JS and, the same, for the graphics card) ----------
   The world is in metres. The game's own units are converted with U: one game unit is U metres
   (the game's big kid is 98 units tall; the 3D girl is 1.43 m). Left and right are mirrored against the game's
   numbers, because its screen maths and three.js's are mirror images; that keeps the sun, the peaks and the wind
   on the same side as in the game. */
const $=id=>document.getElementById(id);
const U=1.43/98;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* ---------- the game's own helpers, as they are in index.html ---------- */
function h2(i,j){ let n=(Math.imul(i,374761393)+Math.imul(j,668265263))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967296; }
function rng(seed){ let s=seed>>>0; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
function vnoise(x,y,sd){ const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
  const a=h2(ix+sd,iy), b=h2(ix+1+sd,iy), c=h2(ix+sd,iy+1), d=h2(ix+1+sd,iy+1); return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy; }
function fbm(x,y,sd){ return 0.5*vnoise(x,y,sd)+0.27*vnoise(x*2.1,y*2.1,sd+71)+0.15*vnoise(x*4.3,y*4.3,sd+173)+0.08*vnoise(x*8.7,y*8.7,sd+311); }
const rgb=a=>new THREE.Color(a[0]/255,a[1]/255,a[2]/255);
const mixA=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

/* ---------- the land: the game's level 1 hills (groundFull, without the coast), in metres ---------- */
const SUN_B=0.64;                                   // the sun's bearing, as in the game
/* The journey's end (desert.js): once the feather road has been flown, a coast point is laid far ahead along it. Half way there the field
   gives way to desert, great dunes in long ridges across the way, levelling out where the silver box stands. All in game units, as the 2D game. */
const SHORE=6250, BOX_HALF=1000, BOX_H=2000, SAND_RAMP=2500, DES_A0=SHORE-(52000+SHORE)/2, SUNDX_G=Math.sin(SUN_B), SUNDZ_G=Math.cos(SUN_B);
const COAST={on:false, x:0, z:0}, uCoast={value:new THREE.Vector4(0,0,0,0)};
function shoreCurve(lat){ return 230*Math.sin(lat*0.0019+0.7)+105*Math.sin(lat*0.0051+2.1)+38*Math.sin(lat*0.0127+4.0); }
/* where the desert begins is no line: it wanders in and out by up to about 240 m in long curves, sends tongues of sand far into the field,
   and breaks up into patches of sand ahead of it and islands of grass behind it */
function edgeWander(a,lat){ const S=Math.sin, q=S(a*0.0031+2*S(lat*0.0023))*S(lat*0.0027-a*0.0011+1);
  return 9000*S(lat*0.00021+1.2)+5000*S(lat*0.00053+a*0.00008+0.4)+2500*S(lat*0.0013-a*0.0002+2)+6000*Math.pow(Math.max(0,S(lat*0.0017+0.6*S(a*0.0003))),6)
        +4000*Math.pow(Math.max(0,q),2)-3000*Math.pow(Math.max(0,-q),2); }
/* the crater (CRATER, settings.js), in game units: the sand is everything inside a slightly wandering circle half way down the outside wall;
   the ground rises from the field up the outside wall to the rim, and falls more steeply inside to the crater floor */
const CR_R=CRATER.radius/U, CR_H=CRATER.rim/U, CR_D=CRATER.depth/U, CR_WI=CRATER.inner/U, CR_WO=CRATER.outer/U, CR_SAND=CR_R+CR_WO*0.5;
const crWander=th=>1200*Math.sin(3*th+1)+700*Math.sin(7*th+2)+400*Math.sin(13*th+0.5);
/* the crater's shape, as the drawn craters have it: a flat floor with a low rise in the middle (where the box struck), the inside wall
   coming down in three soft terraces, an uneven rim, and outside it a skirt of rubble humps thinning into the field */
function craterH(d,th){ const S=Math.sin, ss=t=>t*t*(3-2*t), rim=CR_H*(1+0.45*S(3*th+1)+0.25*S(8*th+2));
  if(d<CR_R){ const t=ss(clamp((d-(CR_R-CR_WI))/CR_WI,0,1)), tt=t-0.5*S(6.2832*3*t)/(6.2832*3);   /* terraces: flat steps on the way down */
    return -CR_D+(CR_D+rim)*tt+300*Math.exp(-Math.pow(d/4100,2)); }   /* the floor, and the rise in its middle */
  const t=clamp((d-CR_R)/CR_WO,0,1), e=clamp((d-CR_R)/(CR_WO*1.6),0,1);
  return rim*(1-ss(t))+110*(1-e)*(1-e)*Math.max(0,S(d*0.011+th*7)*S(th*23+d*0.004)); }   /* the rubble humps outside */
/* how far inside the sand a point is (positive: sand), as the old coast measure was, so everything that asks still works */
function coastAlong(gx,gz){ const dx=gx-COAST.x, dz=gz-COAST.z, al=dx*SUNDX_G+dz*SUNDZ_G-SHORE, lat=dx*SUNDZ_G-dz*SUNDX_G;
  return Math.min(SHORE-700,(CR_SAND+crWander(Math.atan2(lat,al))-Math.hypot(al,lat))*0.5); }
/* the dunes: three sizes of ridge, each a sharp crest with a gentle wind side and a steeper lee side, the crests wandering, curling
   and coming and going along their length, the three running at different angles so nothing repeats. In game units, along (al) and across (lat) the way. */
/* the dunes' shape and paint come from DUNE (settings.js) */
const uDuneA={value:new THREE.Vector4()}, uDuneB={value:new THREE.Vector4()}, uSandP={value:new THREE.Vector4()};
function duneUniforms(){ uDuneA.value.set(DUNE.size,DUNE.height,DUNE.round,DUNE.curve); uDuneB.value.set(DUNE.cross,DUNE.angle,DUNE.ripple,0); uSandP.value.set(DUNE.contrast,DUNE.soft,DUNE.crest,DUNE.warm); }
duneUniforms();
function duneH(al,lat){ const S=Math.sin, P=(x,e)=>Math.pow(Math.max(0,x),e), D=DUNE, z=1/D.size, ca=Math.cos(D.angle), sa=Math.sin(D.angle);
  /* broad dunes about 130 m apart, in rows mostly facing one way: round bodies with one crisp crest edge (q is skewed, so one side is steeper),
     crests bending in long slow curves and swelling and fading along their length; a second, lower set at an angle joins them softly */
  const w1=D.curve*(1.5*S(lat*0.0003*z+0.8)+0.45*S(lat*0.0007*z+al*0.00015*z+2.4)), p1=al*0.00034*z+w1, q1=p1+0.36*S(2*p1);
  const hA=(0.62+0.38*S(lat*0.00031*z+al*0.00012*z+1.7))*P(1-Math.abs(S(q1)),D.round);
  const a2=al*ca+lat*sa, b2=lat*ca-al*sa, w2=D.curve*(1.4*S(b2*0.00035*z+2.9)+0.4*S(b2*0.0008*z-a2*0.00015*z)), p2=a2*0.0005*z+w2, q2=p2+0.32*S(2*p2);
  const hB=D.cross*(1+0.7*S(b2*0.00037*z+0.6))*P(1-Math.abs(S(q2)),D.round);
  const k=0.12, m=Math.max(hA,hB)+k*P(1-Math.abs(hA-hB)/k,2)*0.25;
  return (420*m-110)*D.height; }
function groundAt(x,z){ const gx=-x/U, gz=z/U, a=gx*0.0019+0.5, b=gz*0.0023+1.1, c=(gx*0.8+gz*0.6)*0.0041; let g=90*Math.sin(a)*Math.sin(b)+30*Math.sin(c);
  if(COAST.on){ const dx=gx-COAST.x, dz=gz-COAST.z, al=dx*SUNDX_G+dz*SUNDZ_G, lat=dx*SUNDZ_G-dz*SUNDX_G, db=Math.hypot(al-SHORE,lat), cs=coastAlong(gx,gz);
    if(cs>0){ const r=clamp(cs/4200,0,1), f0=clamp((db-BOX_HALF-900)/3200,0,1), dk=clamp((CR_R-CR_WI-db)/(CR_WI*0.3),0,1), A=r*f0*f0*(3-2*f0)*dk;   /* dunes on the crater floor, none up its walls */
      g=g*(1-0.65*r)+A*duneH(al,lat); }
    g+=craterH(db,Math.atan2(lat,al-SHORE)); }
  return g*U*LEVELS[LEVEL].land; }   // (level 2's land lies a tenth lower)
/* flying, heights are measured from a gentler ground: 30% of the real hills and dunes, 70% their average over a disc about 46 m across
   (wide enough to cancel the dune ridges). The kids, the camera and your flock all use it in the air; on foot it is the real ground. */
const AIR_REAL=0.3, AIR_R=46, AIR_PTS=[];
for(const [r,n] of [[0.4597,6],[0.8881,10]]) for(let i=0;i<n;i++){ const t=(i+(n>6?0.5:0))/n*6.2832; AIR_PTS.push([Math.cos(t)*r*AIR_R,Math.sin(t)*r*AIR_R,0.5/n]); }
function airGround(x,z){ let s=0; for(const p of AIR_PTS) s+=groundAt(x+p[0],z+p[1])*p[2]; return AIR_REAL*groundAt(x,z)+(1-AIR_REAL)*s; }
/* the same ground for the graphics card (the grass and the sand's paint). It must give what groundAt gives on level 1:
   with #dev the page checks the two agree (dev.js) and reports it in the corner. */
const GROUND_GLSL=`
uniform vec4 uCoast;   /* xy: the coast point in game units; z: 1 once it is laid */
const vec2 SUNDG=vec2(${Math.sin(SUN_B).toFixed(8)},${Math.cos(SUN_B).toFixed(8)});
float shoreCurve(float lat){ return 230.0*sin(lat*0.0019+0.7)+105.0*sin(lat*0.0051+2.1)+38.0*sin(lat*0.0127+4.0); }
float edgeWander(float a, float lat){ float q=sin(a*0.0031+2.0*sin(lat*0.0023))*sin(lat*0.0027-a*0.0011+1.0);
  return 9000.0*sin(lat*0.00021+1.2)+5000.0*sin(lat*0.00053+a*0.00008+0.4)+2500.0*sin(lat*0.0013-a*0.0002+2.0)+6000.0*pow(max(0.0,sin(lat*0.0017+0.6*sin(a*0.0003))),6.0)
        +4000.0*pow(max(0.0,q),2.0)-3000.0*pow(max(0.0,-q),2.0); }
float crWander(float th){ return 1200.0*sin(3.0*th+1.0)+700.0*sin(7.0*th+2.0)+400.0*sin(13.0*th+0.5); }
float craterH(float d, float th){ float rim=${CR_H.toFixed(1)}*(1.0+0.45*sin(3.0*th+1.0)+0.25*sin(8.0*th+2.0));
  if(d<${CR_R.toFixed(1)}){ float t=clamp((d-${(CR_R-CR_WI).toFixed(1)})/${CR_WI.toFixed(1)},0.0,1.0); t=t*t*(3.0-2.0*t); float tt=t-0.5*sin(6.2832*3.0*t)/(6.2832*3.0);
    return -${CR_D.toFixed(1)}+(${(CR_D).toFixed(1)}+rim)*tt+300.0*exp(-pow(d/4100.0,2.0)); }
  float t=clamp((d-${CR_R.toFixed(1)})/${CR_WO.toFixed(1)},0.0,1.0), e=clamp((d-${CR_R.toFixed(1)})/${(CR_WO*1.6).toFixed(1)},0.0,1.0);
  return rim*(1.0-t*t*(3.0-2.0*t))+110.0*(1.0-e)*(1.0-e)*max(0.0,sin(d*0.011+th*7.0)*sin(th*23.0+d*0.004)); }
float coastAlong(vec2 p){ vec2 d=vec2(-p.x,p.y)/${U.toFixed(8)}-uCoast.xy; float al=dot(d,SUNDG)-${SHORE.toFixed(1)}, lat=d.x*SUNDG.y-d.y*SUNDG.x;
  return uCoast.z>0.5 ? min(${(SHORE-700).toFixed(1)},(${CR_SAND.toFixed(1)}+crWander(atan(lat,al))-length(vec2(al,lat)))*0.5) : -1.0; }
uniform vec4 uDuneA; uniform vec4 uDuneB;   /* size, height, roundness, curves; cross dunes, their angle */
float duneH(float al, float lat){ float z=1.0/uDuneA.x, ca=cos(uDuneB.y), sa=sin(uDuneB.y);
  float w1=uDuneA.w*(1.5*sin(lat*0.0003*z+0.8)+0.45*sin(lat*0.0007*z+al*0.00015*z+2.4)), p1=al*0.00034*z+w1, q1=p1+0.36*sin(2.0*p1);
  float hA=(0.62+0.38*sin(lat*0.00031*z+al*0.00012*z+1.7))*pow(max(0.0,1.0-abs(sin(q1))),uDuneA.z);
  float a2=al*ca+lat*sa, b2=lat*ca-al*sa, w2=uDuneA.w*(1.4*sin(b2*0.00035*z+2.9)+0.4*sin(b2*0.0008*z-a2*0.00015*z)), p2=a2*0.0005*z+w2, q2=p2+0.32*sin(2.0*p2);
  float hB=uDuneB.x*(1.0+0.7*sin(b2*0.00037*z+0.6))*pow(max(0.0,1.0-abs(sin(q2))),uDuneA.z);
  float k=0.12, m=max(hA,hB)+k*pow(max(0.0,1.0-abs(hA-hB)/k),2.0)*0.25;
  return (420.0*m-110.0)*uDuneA.y; }
float groundAt(vec2 p){ float gx=-p.x/${U.toFixed(8)}, gz=p.y/${U.toFixed(8)};
  float a=gx*0.0019+0.5, b=gz*0.0023+1.1, c=(gx*0.8+gz*0.6)*0.0041;
  float g=90.0*sin(a)*sin(b)+30.0*sin(c);
  if(uCoast.z>0.5){ vec2 d=vec2(gx,gz)-uCoast.xy; float al=dot(d,SUNDG), lat=d.x*SUNDG.y-d.y*SUNDG.x, db=length(vec2(al-${SHORE.toFixed(1)},lat)), cs=coastAlong(p);
    if(cs>0.0){ float r=clamp(cs/4200.0,0.0,1.0), f0=clamp((db-${(BOX_HALF+900).toFixed(1)})/3200.0,0.0,1.0), dk=clamp((${(CR_R-CR_WI).toFixed(1)}-db)/${(CR_WI*0.3).toFixed(1)},0.0,1.0), A=r*f0*f0*(3.0-2.0*f0)*dk;
      g=g*(1.0-0.65*r)+A*duneH(al,lat); }
    g+=craterH(db,atan(lat,al-${SHORE.toFixed(1)})); }
  return g*${U.toFixed(8)}; }`;
