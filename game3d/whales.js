/* ---------- The whales of level 2, in 3D ----------
   The ten humpbacks of the 2D game, carried over whole: the same whale (one solid shape of rings along a bending spine, flippers,
   flukes and back fin, each whale's own markings, freckles and white dots, three with a calf), the same ten made on the mockup page,
   and the same ways: round the door in a great ring above the clouds, every so often one leaving it to pass over the doorway,
   each calling with its own voice. You cannot fly into one: an unseen cushion round it eases the kids aside.
   The shape is built each frame on the processor exactly as the 2D game builds it, then drawn as real 3D in the 2D game's colours
   (the night grade darkens them like everything else). Game units throughout; the world is in metres (x mirrored), as the rest. */
(function(){
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches?0.4:1;
let WT=0;
const D2_POST=9.2;
/* ================= the humpback whales of level 2 =================
   The whale from the mockup page (mockups/whale-3d.html), carried over whole: one solid shape built from rings along a bending spine,
   with each whale's own markings, dots, belly and tail edge worked out from its settings. Everything here is private to WHALE. */
const WHALE=(()=>{
const bg='day', NEAR=45; let ctx=null, HZ=0; const HC=[0,0,0];   // HZ, HC: how much haze lies over the whale being painted, and the colour of the sky behind it   // the game darkens the whole picture at night, so the whales are always painted in their day colours
/* ---- the whale's shape: nose at x=+1, tail stock at x=-1, y up, z out to its sides ---- */
// The same outline as the flat whale: heights above and below a straight line from jaw tip to tail stock, by s (0 nose .. 1 stock).
const PT=[[0,0.012],[0.012,0.03],[0.05,0.054],[0.11,0.08],[0.17,0.098],[0.21,0.108],[0.24,0.112],[0.32,0.13],[0.45,0.15],[0.56,0.142],[0.63,0.14],[0.7,0.112],[0.8,0.07],[0.9,0.04],[1,0.026]];
const PB=[[0,0.012],[0.012,0.05],[0.045,0.11],[0.09,0.17],[0.16,0.235],[0.26,0.288],[0.36,0.27],[0.47,0.215],[0.58,0.16],[0.7,0.105],[0.82,0.06],[0.92,0.036],[1,0.026]];
// New for the solid whale: how wide it is, seen from above. A broad rounded head, widest behind the flippers, a stock that is taller than it is wide.
const PW=[[0,0.035],[0.015,0.07],[0.05,0.112],[0.11,0.15],[0.2,0.186],[0.3,0.203],[0.42,0.194],[0.55,0.155],[0.68,0.1],[0.8,0.052],[0.9,0.025],[0.96,0.021],[1,0.03]];
function prof(T,s){ s=clamp(s,0,1); let k=1; while(k<T.length-1 && T[k][0]<s) k++; const a=T[k-1], b=T[k], p=T[Math.max(0,k-2)], n=T[Math.min(T.length-1,k+1)], u=clamp((s-a[0])/(b[0]-a[0]),0,1);
  const m0=(b[1]-p[1])/(b[0]-p[0])*(b[0]-a[0]), m1=(n[1]-a[1])/(n[0]-a[0])*(b[0]-a[0]), u2=u*u, u3=u2*u;
  return Math.max(0.003,(2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*m0+(-2*u3+3*u2)*b[1]+(u3-u2)*m1); }
const TOP=s=>prof(PT,s), BOT=s=>prof(PB,s), WID=s=>prof(PW,s);
// where the dark back ends and the pale underside begins, as a depth below the middle line (taken from the flat whale)
const mouth=s=>0.006+0.04*Math.pow(Math.sin(clamp(s/0.29,0,1)*Math.PI*0.5),1.3);
const edge=s=>{ if(s<0.258) return mouth(s); const d0=clamp((s-0.258)/0.03,0,1), d=d0*d0*(3-2*d0), low=0.096+0.018*Math.sin(s*14)*clamp((s-0.4)/0.06,0,1)+(s-0.27)*-0.03+Math.pow(clamp((s-0.5)/0.3,0,1),1.5)*0.02; return mouth(s)+(low-mouth(s))*d; };
const palBase=sv=>{ if(sv<=0.56) return edge(sv); const back=BOT(sv)*(0.6-0.3*(sv-0.6)), m=clamp((sv-0.56)/0.1,0,1); const m2=clamp((sv-0.78)/0.13,0,1), top=edge(sv)+(back-edge(sv))*m; return Math.min(top+(BOT(sv)+0.01-top)*m2*m2, BOT(sv)*0.7); };   // unlike the flat whale, a strip of white stays under the stock right to the tail

/* ---- movement: the whole body bends up and down along its length, more toward the tail ---- */
let TB=0, INIT=true;   // tail-beat clock
const spineY=s=>INIT?0:(0.012+0.2*s*s)*Math.sin(TB-s*3.3)*calm;   // laid out straight the first time, so every patch can be told which way is out
const FR=[0,0,0,0,0];   // scratch: the spine's place and its "up" at s
function frame(s){ const y=spineY(s), dy=(spineY(s+0.004)-spineY(s-0.004))/0.008, l=Math.hypot(dy,2); FR[0]=y; FR[1]=dy/l; FR[2]=2/l; }   // up = (FR[1], FR[2]), toward the nose = (FR[2], -FR[1])

/* ---- the mesh: points written fresh every frame, four-cornered patches listed once ---- */
const MV=[]; let vi=0; const QUADS=[];
function put(x,y,z){ MV[vi++]=x; MV[vi++]=y; MV[vi++]=z; return vi/3-1; }
function bent(x,yl,z){ const s=(1-x)/2; frame(s); return put(x+FR[1]*yl, FR[0]+FR[2]*yl, z); }                                   // each point follows the spine where it sits
function bentAt(sr,x,yl,z){ const xr=1-2*sr; frame(sr); return put(xr+FR[2]*(x-xr)+FR[1]*yl, FR[0]-FR[1]*(x-xr)+FR[2]*yl, z); }   // a stiff part follows the spine at its root
const DARK=0, PALE=1;
const FLIP_S=0.34, FLIP_Y=-0.06;   // the flipper's root: where the drawing has it, in the dark of the flank behind and below the eye
// the border as drawn, plus the dark dipping down round the eye into the pale
let RW=null;   // this whale's own reach of the white: {k: -1 a narrow strip .. +1 high up the flank, amp/f/ph: the waviness of its edge}
const palTop=sv=>{ let b=palBase(sv);
  if(RW){ const g=clamp((sv-0.27)/0.1,0,1), gg=g*g*(3-2*g), lowest=BOT(sv)*0.86;
    if(RW.k<0) b+=(Math.max(b,lowest)-b)*(-RW.k)*gg; else b-=b*0.88*RW.k*gg;
    b+=RW.amp*(Math.sin(sv*RW.f+RW.ph)+0.5*Math.sin(sv*RW.f*2.3+RW.ph*1.9))*gg*clamp((0.92-sv)/0.1,0,1);
    b=clamp(b,0.004,Math.max(lowest,palBase(sv)));
    const q=clamp(1-(Math.abs(sv-FLIP_S)-0.035)/0.05,0,1); b=Math.max(b,(-FLIP_Y+0.028)*q*q*(3-2*q));   // the dark always comes down far enough to carry the flipper
  }
  const e=(sv-0.281)/0.026; return e*e<1?Math.max(b,0.048+0.04*Math.sqrt(1-e*e)):b; };
function quad(a,b,c,d,kind,hint,groove,mix){   // hint: roughly which way the patch faces, so the corners get wound the right way
  const P=i=>[MV[i*3],MV[i*3+1],MV[i*3+2]], A=P(a),B=P(b),C=P(c),D=P(d);
  const ux=C[0]-A[0],uy=C[1]-A[1],uz=C[2]-A[2], vx=D[0]-B[0],vy=D[1]-B[1],vz=D[2]-B[2];
  const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
  const mx=(A[0]+B[0]+C[0]+D[0])/4, my=(A[1]+B[1]+C[1]+D[1])/4, mz=(A[2]+B[2]+C[2]+D[2])/4;   // where the patch sits on the straight whale, for the markings
  if(nx*hint[0]+ny*hint[1]+nz*hint[2]<0) QUADS.push([a,d,c,b,kind,groove||null,mix||0,mx,my,mz]); else QUADS.push([a,b,c,d,kind,groove||null,mix||0,mx,my,mz]);
}

const NR=100, K1=7, K2=7, M=2*(K1+K2);
function body(){
  const first=vi/3;
  for(let i=-1;i<=NR+1;i++){
    const s=i<0?-0.003:i>NR?1.004:Math.pow(i/NR,1.2), cap=(i<0||i>NR)?0.02:1, sc=clamp(s,0,1);
    const t=TOP(sc)*cap, b=BOT(sc)*cap, w=WID(sc)*cap, tb=Math.acos(clamp(-palTop(sc)/BOT(sc),-1,0));
    for(let j=0;j<M;j++){
      const side=j<=K1+K2?1:-1, jj=side>0?j:M-j;   // down the right side, back up the left
      const th=jj<=K1? tb*jj/K1 : tb+(Math.PI-tb)*(jj-K1)/K2, c=Math.cos(th);
      bent(1-2*s, c>0?t*c:b*c, side*w*Math.sin(th));
    }
  }
  if(!INIT) return;
  for(let i=0;i<NR+2;i++) for(let j=0;j<M;j++){
    const a=first+i*M+j, b=first+i*M+(j+1)%M, c=first+(i+1)*M+(j+1)%M, d=first+(i+1)*M+j;
    const pale=j>=K1 && j<K1+2*K2, s=Math.pow(clamp((i-0.5)/NR,0,1),1.2);
    const row=r=>r>K1 && r<K1+2*K2 && s>0.012 && s<0.68;   // throat grooves run along the lines between pale patches
    const cy=(MV[a*3+1]+MV[c*3+1])/2, cz=(MV[a*3+2]+MV[c*3+2])/2;
    const g=[]; if(row(j+1)) g.push(b,c,(j+1)%M); if(row(j)) g.push(a,d,j);   // each groove line remembers which row it is, so it can end at its own place
    quad(a,b,c,d,pale?PALE:DARK,[i===0?0.4:i>NR?-0.4:0,cy,cz],g.length?g:null); QUADS[QUADS.length-1][10]=s;
  }
}
// a thin lens-shaped blade through a row of stations, each with a leading point A, a trailing point B, an "up" n and a half thickness
function blade(st,kTop,kBot,map){   // stations may carry "rim": a pale edge strip of that share of the width, on the dark face too
  const rimmed=st[0].rim!==undefined, Mx=rimmed?6:4, first=vi/3;
  for(const q of st){ const r=rimmed?clamp(q.rim,0.001,0.3):0, US=rimmed?[0,r,0.25,0.5,0.75,1-r,1]:[0,0.25,0.5,0.75,1];
    for(let side=1;side>=-1;side-=2) for(let m=0;m<=Mx;m++){
      const u=US[m], bulge=Math.pow(Math.sin(Math.PI*u),0.7)*q.t*side;
      map(q.A[0]+(q.B[0]-q.A[0])*u+q.n[0]*bulge, q.A[1]+(q.B[1]-q.A[1])*u+q.n[1]*bulge, q.A[2]+(q.B[2]-q.A[2])*u+q.n[2]*bulge);
    } }
  if(!INIT) return;
  const row=2*(Mx+1);
  for(let k=0;k<st.length-1;k++) for(let side=0;side<2;side++) for(let m=0;m<Mx;m++){
    const o=first+k*row+side*(Mx+1)+m, n=st[k].n, sg=side?-1:1, mix=((st[k].mix||0)+(st[k+1].mix||0))/2, edge=rimmed && !side && (m===0||m===Mx-1);
    quad(o,o+1,o+row+1,o+row,side?kBot:edge?PALE:kTop,[n[0]*sg,n[1]*sg,n[2]*sg],null,(side||edge)?mix:0);
  }
}
const norm=v=>{ const l=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; };
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// The flipper's outline, traced from the reference picture: how far its front and back edges lie from a straight middle line,
// as fractions of its length, from the body (0) to the tip (1). Broadest in the upper part, narrowing in a step, the front edge
// then swinging round the end to meet the back edge, so the tip leans toward the tail.
const FF=[[0,0.07],[0.12,0.096],[0.3,0.132],[0.45,0.138],[0.6,0.128],[0.68,0.114],[0.78,0.084],[0.87,0.04],[0.94,-0.012],[0.985,-0.062],[1,-0.097]];   // the outer third of the front edge is cut away in a curve back to the tip
const FB=[[0,-0.08],[0.15,-0.106],[0.3,-0.128],[0.45,-0.126],[0.6,-0.114],[0.8,-0.102],[0.92,-0.099],[0.975,-0.1],[1,-0.094]];
function prof2(T,s){ let k=1; while(k<T.length-1 && T[k][0]<s) k++; const a=T[k-1], b=T[k], p=T[Math.max(0,k-2)], n=T[Math.min(T.length-1,k+1)], u=clamp((s-a[0])/(b[0]-a[0]),0,1);
  const m0=(b[1]-p[1])/(b[0]-p[0])*(b[0]-a[0]), m1=(n[1]-a[1])/(n[0]-a[0])*(b[0]-a[0]), u2=u*u, u3=u2*u;
  return (2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*m0+(-2*u3+3*u2)*b[1]+(u3-u2)*m1; }
function flipper(sg,t){
  const xr=1-2*FLIP_S, zr=WID(FLIP_S)*Math.sqrt(1-Math.pow(FLIP_Y/BOT(FLIP_S),2));
  let c=[xr,FLIP_Y,sg*zr*0.8]; const S=56, L=0.7, st=[], ph=t*1.25+(sg>0?0:0.9);
  for(let k=0;k<=S;k++){ const u=1-Math.pow(1-k/S,1.6), un=1-Math.pow(1-Math.min(1,(k+1)/S),1.6);   // stations crowd toward the tip so the end comes out round
    const flap=Math.sin(ph-u*1.3)*calm;                                 // a slow stroke up and down that runs out along the flipper
    const be=0.78+0.8*Math.pow(u,2.2)+0.06*Math.sin(ph*0.5)*calm, out=0.45+0.45*flap*(0.35+0.65*u);   // swept back at the picture's angle, curving further back toward the tip
    const dir=norm([-Math.sin(be),-Math.cos(be),sg*out]);
    const dx=dir[0], ch=norm([1-dx*dx,-dx*dir[1],-dx*dir[2]]); let n=cross(dir,ch); if(n[1]*0.4+n[2]*sg<0) n=[-n[0],-n[1],-n[2]];   // the dark face is the outer one
    const kn=clamp((u-0.45)/0.15,0,1)*clamp((0.98-u)/0.06,0,1);
    const fr=(prof2(FF,u)+0.007*Math.sin(u*46)*kn)*L, bk=(prof2(FB,u)+0.004*Math.sin(u*38+1)*kn)*L, wd=Math.max(0,fr-bk), rw=0.02*clamp((u-0.06)/0.16,0,1);   // small knobs only along the outer part
    const root=Math.pow(clamp(1-u/0.24,0,1),2), m=clamp((u-0.1)/0.16,0,1);
    st.push({A:[c[0]+ch[0]*(fr+rw),c[1]+ch[1]*(fr+rw),c[2]+ch[2]*(fr+rw)], B:[c[0]+ch[0]*(bk-rw),c[1]+ch[1]*(bk-rw),c[2]+ch[2]*(bk-rw)], n, rim:rw/(wd+2*rw+1e-6), t:Math.min(0.008+0.012*(1-u)+0.014*root,wd*0.22+0.0005), mix:1-m*m*(3-2*m)});
    const d=(un-u)*L; c=[c[0]+dir[0]*d,c[1]+dir[1]*d,c[2]+dir[2]*d];
  }
  blade(st,DARK,PALE,(x,y,z)=>bentAt(FLIP_S,x,y,z));
  if(CUR) for(const d of CUR.f){ if(d.sg!==sg) continue;   // white flecks lying on the flipper's dark face
    const k=clamp(Math.round(S*(1-Math.pow(1-d.u,1/1.6))),1,S-1), q=st[k], q2=st[k+1], v=d.v, bl=Math.pow(Math.sin(Math.PI*v),0.7)*q.t+0.001;
    const p=[q.A[0]+(q.B[0]-q.A[0])*v+q.n[0]*bl, q.A[1]+(q.B[1]-q.A[1])*v+q.n[1]*bl, q.A[2]+(q.B[2]-q.A[2])*v+q.n[2]*bl];
    const e1=norm([q.A[0]-q.B[0],q.A[1]-q.B[1],q.A[2]-q.B[2]]), e2=norm([q2.A[0]+q2.B[0]-q.A[0]-q.B[0],q2.A[1]+q2.B[1]-q.A[1]-q.B[1],q2.A[2]+q2.B[2]-q.A[2]-q.B[2]]);
    const at=(a,m)=>bentAt(FLIP_S,p[0]+a[0]*m,p[1]+a[1]*m,p[2]+a[2]*m);
    late.push(()=>decs.push([at(q.n,0),at(q.n,0.02),at(e1,0.02),at(e2,0.02),d.r,1,'w',0.012])); }   // placed after all the meshes, so their points keep their numbers
}
function fluke(sg){   // one half of the tail: flat, lying level, swept back to a point; it bends with the stock
  const S=28, st=[], e=CUR&&CUR.tail;   // e: this whale's own back edge
  for(let k=0;k<=S;k++){ const v=k/S, z=sg*0.38*v; let bx=-1.075-0.105*Math.pow(Math.sin(v*Math.PI/2),0.8);
    if(e){ const fade=1-Math.pow(v,5), ph=sg>0?e.ph:e.ph2;
      bx+=(e.notch*0.075*Math.pow(1-v,2.5) - e.bow*0.05*Math.sin(Math.PI*v) + e.amp*0.016*Math.sin(v*e.freq+ph)*Math.min(1,v*6) + e.amp*0.007*Math.sin(v*e.freq*2.3+ph*1.7)*Math.min(1,v*6))*fade; }   // a deeper or shallower notch, a bow in or out, and scallops
    const ax=-0.875-0.305*Math.pow(v,1.3);
    st.push({A:[ax,0,z], B:[Math.min(bx,ax-0.004),0,z], n:[0,1,0], t:0.003+0.034*Math.pow(1-v,1.6)}); }
  blade(st,DARK,PALE,bent);
}
function backFin(){
  const S=5, st=[], xL=1-2*0.632, xT=1-2*0.716;
  for(let k=0;k<=S;k++){ const v=k/S, xa=xL-0.132*Math.pow(v,0.8), xb=xT+0.036*v*v;
    st.push({A:[xa,TOP((1-xa)/2)*0.9+0.056*v,0], B:[xb,TOP((1-xb)/2)*0.9+0.056*v,0], n:[0,0,1], t:0.002+0.012*(1-v)}); }
  blade(st,DARK,DARK,bent);
}
const EYE_S=0.283; let eyes=[];
let CUR=null; const decs=[], late=[];   // the dots of the whale being built, and where they have landed this frame
function bodyDot(d){ const x=1-2*d.s, top=d.yl===undefined, h=top?(Math.cos(d.th)>0?TOP(d.s):BOT(d.s)):(d.yl>0?TOP(d.s):BOT(d.s)), w=WID(d.s);
  const yl=top?h*Math.cos(d.th):d.yl, z=w*Math.sqrt(Math.max(0,1-(yl/h)*(yl/h))), o=norm([0,yl/(h*h),z/(w*w)]), sg=d.sg;
  decs.push([bent(x,yl,sg*z),bent(x,yl+o[1]*0.02,sg*(z+o[2]*0.02)),bent(x+0.02,yl,sg*z),bent(x,yl-o[2]*0.02,sg*(z+o[1]*0.02)),d.r,d.ax||1,d.col,0.03]); }
function build(t){
  decs.length=0; late.length=0; RW=CUR?CUR.reach:null;
  vi=0; body(); flipper(1,t); flipper(-1,t); fluke(1); fluke(-1); backFin();
  const yl=-(mouth(EYE_S)+0.014), h=BOT(EYE_S), w=WID(EYE_S), z=w*Math.sqrt(1-(yl/h)*(yl/h)), o=norm([0,yl/(h*h),z/(w*w)]);
  eyes=[]; for(const sg of [1,-1]){ const p=bent(1-2*EYE_S,yl,sg*z), q=bent(1-2*EYE_S,yl+o[1]*0.03,sg*(z+o[2]*0.03)); const r=bent(1-2*EYE_S+0.02,yl,sg*z), w=bent(1-2*EYE_S,yl+0.02,sg*z); eyes.push([p,q,r,w]); }
  for(const fn of late) fn();
  if(CUR) for(const d of CUR.b) bodyDot(d);
  INIT=false;
}

const SV=[];   // points after the camera: x, y, depth
const COL={ day:[[[0x20,0x22,0x52],[0x2e,0x31,0x68],[0x44,0x49,0x90]],[[0xa9,0xc4,0xd3],[0xcf,0xe0,0xe8],[0xf7,0xfa,0xfb]]],
            night:[[[0x15,0x17,0x3c],[0x1f,0x22,0x50],[0x30,0x35,0x72]],[[0x74,0x8c,0xa8],[0x9d,0xb2,0xc8],[0xdc,0xe5,0xf1]]] };
const PURP={ day:[[0x4a,0x12,0x86],[0x7a,0x22,0xc4],[0xa8,0x4c,0xf0]], night:[[0x32,0x0e,0x62],[0x54,0x1a,0x92],[0x78,0x38,0xbc]] };   // a vivid violet
function toneT(c,l,k){ const u=clamp(l,0,1)*2, a=c[u<1?0:1], b=c[u<1?1:2], f=u<1?u:u-1; return a[k]+(b[k]-a[k])*f; }
const RGB=[0,0,0]; let TINT=[1,1,1];
// the belly's own tint: the slider runs white, cream, pink, lilac, ice blue
const TINTS=[[1,1,1],[1.1,0.985,0.83],[1.09,0.87,0.93],[0.93,0.86,1.02],[0.84,0.93,1.02]], TNAME=['white','cream','pink','lilac','ice blue'];
function tintOf(v){ const x=clamp(v,0,100)/25, i=Math.min(3,Math.floor(x)), f=x-i, a=TINTS[i], b=TINTS[i+1]; return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]; }
function dark(l,pm,lm){ const nt=bg==='night'?'night':'day', c=COL[nt][DARK], p=PURP[nt];   // the dark skin, with this whale's markings: leaning to purple by pm, lighter or darker by lm
  for(let k=0;k<3;k++){ let v=toneT(c,l,k); if(pm>0) v+=(toneT(p,l,k)-v)*pm; RGB[k]=v*(1+lm); } }
function shade(kind,l,mix,pm,lm){ let r,g,b;
  if(kind===DARK){ dark(l,pm,lm); r=RGB[0]; g=RGB[1]; b=RGB[2]; }
  else{ const c=COL[bg==='night'?'night':'day'][PALE]; r=toneT(c,l,0)*TINT[0]; g=toneT(c,l,1)*TINT[1]; b=toneT(c,l,2)*TINT[2];
    if(mix>0){ dark(l,pm,lm); r+=(RGB[0]-r)*mix; g+=(RGB[1]-g)*mix; b+=(RGB[2]-b)*mix; } }
  if(HZ>0){ const lum=0.3*r+0.59*g+0.11*b, sat=1-0.55*HZ, a=HZ*(1.15-0.5*lum/255);   // distance: a little greyer, and drifting toward the sky behind it, the darks more than the whites
    r=lum+(r-lum)*sat; g=lum+(g-lum)*sat; b=lum+(b-lum)*sat; r+=(HC[0]-r)*a; g+=(HC[1]-g)*a; b+=(HC[2]-b)*a; }
  return 'rgb('+Math.round(clamp(r,0,255))+','+Math.round(clamp(g,0,255))+','+Math.round(clamp(b,0,255))+')'; }

/* ---- each whale's own markings: soft patches worked out from where a patch of skin sits and the whale's pattern number ---- */
const hsh=(i,j,k,q)=>{ let n=Math.sin(i*127.1+j*311.7+k*74.7+q*53.3)*43758.5453; return n-Math.floor(n); };
function vn(x,y,z,q){ const i=Math.floor(x), j=Math.floor(y), k=Math.floor(z); let fx=x-i, fy=y-j, fz=z-k; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
  const L=(a,b,t)=>a+(b-a)*t;
  return L(L(L(hsh(i,j,k,q),hsh(i+1,j,k,q),fx),L(hsh(i,j+1,k,q),hsh(i+1,j+1,k,q),fx),fy),L(L(hsh(i,j,k+1,q),hsh(i+1,j,k+1,q),fx),L(hsh(i,j+1,k+1,q),hsh(i+1,j+1,k+1,q),fx),fy),fz); }
const sm=v=>{ v=clamp(v,0,1); return v*v*(3-2*v); };
function marksFor(c,out){
  const q0=c.p, S=c.s/100, U=c.u/100, h1=hsh(q0,1,0,0), h2=hsh(q0,2,0,0), h3=hsh(q0,3,0,0), h4=hsh(q0,4,0,0);
  for(let q=0;q<QUADS.length;q++){ const Q=QUADS[q], x=Q[7], y=Q[8], z=Q[9];
    const a=vn(x*2.1+7,y*3.4+3,z*3.4+5,q0), b=vn(x*5.5+1,y*7+9,z*7+2,q0+0.5), c2=vn(x*1.3+4,y*2.1+6,z*2.1+8,q0+0.25);
    let pm=sm((0.62*a+0.38*b-0.47)/0.17);                                         // blotches
    const band=Math.exp(-Math.pow((x-(0.45-1.2*h1))/(0.2+0.25*h4),2))*(0.4+0.6*h2);   // a wash across the body at a place of its own
    pm=clamp(pm*(0.6+0.4*h3)+band*sm((b+a*0.5-0.45)/0.35)*0.8,0,1)*0.85;
    const lm=(c2-0.5)*1.2-0.5*h3*sm(y/0.09)+0.35*h2*sm((b-0.55)/0.2);          // lighter and darker blue patches, and a darker saddle along the back
    out[q*3]=pm*U*Math.min(1,S*1.5); out[q*3+1]=lm*0.5*S;
    const dm=0;
    out[q*3+2]=dm; }
}
function dotsFor(c,few){ const b=[], f=[], q0=c.p, R=(i,salt)=>hsh(q0+0.37,i,salt,1.7), dz=0.5+c.ds/100*1.3; let n;
  const reach={k:(c.wr-50)/50, amp:0.004+0.02*R(1,60)*(0.3+Math.abs(c.wr-50)/70), f:14+22*R(2,60), ph:6.28*R(3,60)}; RW=reach;   // the dots below are placed against this whale's own edge of the white
  n=Math.round(c.bs/100*90*few); for(let i=0;i<n;i++){ const sv=0.03+0.84*R(i,61), tb=Math.acos(clamp(-palTop(sv)/BOT(sv),-1,0)), t=Math.pow(R(i,62),sv<0.25?1:1.9), big=R(i,63)>0.82;   // dark freckles and blotches on the white, thickest toward its edge and under the chin
    b.push({s:sv,th:tb+0.03+(Math.PI-tb-0.03)*t,sg:R(i,64)<0.5?1:-1,r:(big?0.009+0.009*R(i,65):0.0035+0.006*R(i,65)*R(i,66))*(0.75+0.25*dz),ax:big?1.4+1.2*R(i,67):1,col:'d'}); }
  n=Math.round(c.k/100*24*few); for(let i=0;i<n;i++) b.push({s:0.025+0.2*R(i,1),th:0.12+1.05*R(i,2),sg:R(i,3)<0.5?1:-1,r:0.006+0.005*R(i,4),col:'k'});
  n=Math.round(c.k/100*12*few); for(let i=0;i<n;i++){ const sv=0.03+0.18*R(i,5); b.push({s:sv,yl:-(mouth(sv)+0.02+0.035*R(i,6)),sg:R(i,7)<0.5?1:-1,r:0.005+0.004*R(i,8),col:'c'}); }
  n=Math.round(c.f/100*11*few); for(let sg=-1;sg<=1;sg+=2) for(let i=0;i<n;i++){ const sv=0.43+0.4*(i+R(i,9+sg))/n; b.push({s:sv,yl:-(palTop(sv)-0.016),sg,r:(0.006+0.005*R(i,11+sg))*(0.7+0.7*c.f/100),ax:2.3,col:'w'}); }
  n=Math.round(c.d/100*50*few); for(let i=0;i<n;i++){ const sv=0.3+0.62*R(i,13), a=R(i,14); b.push({s:sv,yl:-(palTop(sv)-0.012-0.08*a*a),sg:R(i,15)<0.5?1:-1,r:(0.003+0.006*R(i,16)*R(i,17))*dz,col:'w'}); }
  n=Math.round(c.d/100*9*few); for(let i=0;i<n;i++) b.push({s:0.74+0.21*R(i,18),th:0.25*R(i,19),sg:R(i,20)<0.5?1:-1,r:(0.004+0.004*R(i,21))*dz,col:'w'});
  n=Math.round(c.d/100*60*few); for(let sg=-1;sg<=1;sg+=2) for(let i=0;i<n;i++){ const u=0.2+0.76*Math.pow(R(i,22+sg),0.6), side=R(i,24+sg)-0.5, e=Math.abs(side)*2;
    if(R(i,26+sg)>0.25+0.75*Math.max(u*u,e*e)) continue; f.push({sg,u,v:clamp(0.5+side*0.86,0.07,0.93),r:(0.0035+0.008*R(i,28+sg)*R(i,30+sg))*dz}); }
  const T=c.t/100, tail={notch:(R(1,40)*1.6-0.5)*T, bow:(R(2,40)*2-1)*T, amp:(0.25+0.75*R(3,40))*T, freq:9+16*R(4,40), ph:6.28*R(5,40), ph2:6.28*R(6,40)};   // the back curve of the tail fin, this whale's own
  const ge=[], gs=[]; for(let r=0;r<M;r++){ const e=Math.abs(r-(K1+K2))/K2;   // e: 0 along the middle of the belly, 1 up at the edge of the white
    ge[r]=0.6-0.27*Math.pow(e,1.6)+0.05*(R(r,50)-0.5); gs[r]=0.02+0.07*e*e+0.015*R(r,51); }
  RW=null;
  return {b,f,tail,ge,gs,reach,tint:tintOf(c.bt)}; }
const order=[];
function pass(w,P){
  TB=P.tb+w.ph; CUR=w.dots; build(P.t+w.ph*2);
  const half=P.len/2, sc=w.sc*half, ox=w.o[0]*half, oy=w.o[1]*half, oz=w.o[2]*half, px=P.x, py=P.y, pz=P.z;
  const ch=Math.cos(P.head), sh=Math.sin(P.head), cr=Math.cos(P.roll), sr=Math.sin(P.roll), ct=Math.cos(P.tip), stp=Math.sin(P.tip);
  const f=focal, cx=W/2, cy=horizon;
  const n=vi/3, MK=w.mk, GE=w.dots.ge, GS=w.dots.gs; TINT=w.dots.tint;
  for(let i=0;i<n;i++){
    let x=MV[i*3]*sc+ox, y=MV[i*3+1]*sc+oy, z=MV[i*3+2]*sc+oz;
    let y1=y*cr-z*sr, z1=y*sr+z*cr;                 // bank
    let x2=x*ct-y1*stp, y2=x*stp+y1*ct;             // nose up or down
    const x3=x2*ch+z1*sh+px-camPx, z3=-x2*sh+z1*ch+pz-camPz;   // heading and place, seen from the camera
    SV[i*3]=x3*rgtX+z3*rgtZ; SV[i*3+1]=y2+py-camY; SV[i*3+2]=x3*fwdX+z3*fwdZ;
  }
  // light from above and a little from the sun's side, carried into the camera's space
  const L0=norm([SUNDX*0.35,0.9,SUNDZ*0.35]), lx=L0[0]*rgtX+L0[2]*rgtZ, ly=L0[1], lz=L0[0]*fwdX+L0[2]*fwdZ;
  order.length=0;
  for(let q=0;q<QUADS.length;q++){
    const Q=QUADS[q], a=Q[0]*3,b=Q[1]*3,c=Q[2]*3,d=Q[3]*3;
    const ux=SV[c]-SV[a],uy=SV[c+1]-SV[a+1],uz=SV[c+2]-SV[a+2], vx=SV[d]-SV[b],vy=SV[d+1]-SV[b+1],vz=SV[d+2]-SV[b+2];
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const nl=Math.hypot(nx,ny,nz); if(nl<1e-12) continue; nx/=nl; ny/=nl; nz/=nl;
    const mx=(SV[a]+SV[b]+SV[c]+SV[d])/4, my=(SV[a+1]+SV[b+1]+SV[c+1]+SV[d+1])/4, mz=(SV[a+2]+SV[b+2]+SV[c+2]+SV[d+2])/4;
    const ml=Math.hypot(mx,my,mz), face=-(nx*mx+ny*my+nz*mz)/ml; if(face<=0 || mz<NEAR || SV[a+2]<NEAR || SV[b+2]<NEAR || SV[c+2]<NEAR || SV[d+2]<NEAR) continue;   // turned away from us, or reaching behind the camera
    const lam=(nx*lx+ny*ly+nz*lz)*0.5+0.5;
    order.push([mz,q,0.72*lam+0.3*face]);
  }
  for(const d of decs){ const p=d[0]*3, o=d[1]*3; if(SV[p+2]>NEAR*2 && SV[o+2]<SV[p+2]-0.003*sc) order.push([SV[p+2]-d[7]*sc,-2,d]); }
  for(const e of eyes){ const p=e[0]*3, o=e[1]*3; if(SV[p+2]>NEAR*2 && SV[o+2]<SV[p+2]-0.004*sc) order.push([SV[p+2]-0.06*sc,-1,e]); }
  order.sort((A,B)=>B[0]-A[0]);
  const night=bg==='night', gcol=night?'#6c86a0':'#8fb1c0';
  ctx.lineJoin='round';
  for(const it of order){
    if(it[1]===-2){   // a dot lying on the skin
      const E=it[2], S=i=>{ const k=E[i]*3, z=SV[k+2]; return [cx+SV[k]*f/z, cy-SV[k+1]*f/z]; }, p=S(0), fw=S(2), up=S(3);
      ctx.save(); ctx.transform((fw[0]-p[0])/0.02,(fw[1]-p[1])/0.02,(up[0]-p[0])/0.02,(up[1]-p[1])/0.02,p[0],p[1]);
      ctx.fillStyle=E[6]==='d'?(night?'#232658':'#33377a'):E[6]==='w'?(night?'#dfe6f2':'#ffffff'):E[6]==='k'?(night?'#5b6090':'#7d83b0'):(night?'#3a3f6a':'#474c7c');
      ctx.globalAlpha=1-Math.min(0.7,HZ*2.2); ctx.beginPath(); ctx.ellipse(0,0,E[4]*E[5],E[4],0,0,6.2832); ctx.fill(); ctx.restore(); continue; }   // fine detail fades with distance
    if(it[1]<0){   // the eye, drawn lying on the skin: a dark almond with a fine pale rim, a soft paler lid round it and two creases arching over it
      const E=it[2], S=i=>{ const k=E[i]*3, z=SV[k+2]; return [cx+SV[k]*f/z, cy-SV[k+1]*f/z]; }, p=S(0), fw=S(2), up=S(3), R=0.014;   // (the three points are 0.02 apart on the whale itself, so the drawing scales with it)
      ctx.save(); ctx.transform((fw[0]-p[0])/0.02,(fw[1]-p[1])/0.02,(up[0]-p[0])/0.02,(up[1]-p[1])/0.02,p[0],p[1]);
      ctx.fillStyle=night?'#2a2f68':'#3a4088'; ctx.beginPath(); ctx.ellipse(0,R*0.25,R*2.5,R*1.75,0,0,6.2832); ctx.fill();
      ctx.lineCap='round'; ctx.strokeStyle=night?'#4a5196':'#5a63ad'; ctx.lineWidth=R*0.3;
      ctx.beginPath(); ctx.moveTo(R*2.3,R*0.5); ctx.quadraticCurveTo(R*0.3,R*2.5,-R*2.4,R*0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R*1.5,R*1.9); ctx.quadraticCurveTo(-R*0.2,R*3.2,-R*2.2,R*2.0); ctx.stroke();
      ctx.lineWidth=R*0.22; ctx.beginPath(); ctx.moveTo(-R*2.4,-R*0.2); ctx.quadraticCurveTo(-R*3.1,-R*0.9,-R*3.0,-R*1.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R*1.55,0); ctx.quadraticCurveTo(0,R*1.75,-R*1.55,0); ctx.quadraticCurveTo(0,-R*1.45,R*1.55,0); ctx.closePath();
      ctx.fillStyle=night?'#090a1a':'#0c0e22'; ctx.fill(); ctx.strokeStyle=night?'#7b86c4':'#8f9bd6'; ctx.lineWidth=R*0.2; ctx.stroke();
      ctx.fillStyle='rgba(235,240,255,0.8)'; ctx.beginPath(); ctx.arc(R*0.35,R*0.3,R*0.2,0,6.2832); ctx.fill();
      ctx.restore(); continue; }
    const Q=QUADS[it[1]], col=shade(Q[4],it[2],Math.max(Q[6],MK[it[1]*3+2]),MK[it[1]*3],MK[it[1]*3+1]); let X=[],Y=[];
    for(let k=0;k<4;k++){ const i=Q[k]*3, z=SV[i+2]; X[k]=cx+SV[i]*f/z; Y[k]=cy-SV[i+1]*f/z; }
    { const mx=(X[0]+X[1]+X[2]+X[3])/4, my=(Y[0]+Y[1]+Y[2]+Y[3])/4;   // each patch is spread a hair past its edges so no seams show between neighbours (one fill, where the mockup page used a fill and an outline)
      for(let k=0;k<4;k++){ const dx=X[k]-mx, dy=Y[k]-my, l=Math.hypot(dx,dy)||1; X[k]+=dx/l*0.55; Y[k]+=dy/l*0.55; } }
    ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(X[0],Y[0]); ctx.lineTo(X[1],Y[1]); ctx.lineTo(X[2],Y[2]); ctx.lineTo(X[3],Y[3]); ctx.closePath(); ctx.fill();
    if(Q[5]){ const G=Q[5], sq=Q[10], lw=Math.max(0.5,0.004*sc*f/it[0]); ctx.strokeStyle=gcol;   // the grooves end on a curve: longest along the middle of the belly, shorter out to the sides, thinning out at both ends
      for(let k=0;k<G.length;k+=3){ const r=G[k+2], wv=Math.min(1,(GE[r]-sq)/0.07,(sq-GS[r])/0.025); if(wv<=0) continue;
        const i1=G[k]*3, i2=G[k+1]*3, z1=SV[i1+2], z2=SV[i2+2]; ctx.lineWidth=lw*(0.35+0.65*wv); ctx.globalAlpha=Math.min(1,wv*2.5)*(1-Math.min(0.7,HZ*2.2));
        ctx.beginPath(); ctx.moveTo(cx+SV[i1]*f/z1,cy-SV[i1+1]*f/z1); ctx.lineTo(cx+SV[i2]*f/z2,cy-SV[i2+1]*f/z2); ctx.stroke(); }
      ctx.globalAlpha=1; }
  }
}
build(0);   // lay the mesh out once, straight, so every patch knows which way is out
// a whale's look, worked out once from its settings (and its calf's, a lighter relation of hers)
function look(c){ const one=(q,few)=>{ const mk=new Float32Array(QUADS.length*3); marksFor(q,mk); return {mk,dots:dotsFor(q,few)}; };
  const m=one(c,1), k=c.c?one({p:c.p+50,s:c.s*0.6,u:c.u,d:c.d*0.6,ds:c.ds,k:c.k,f:c.f*0.6,t:c.t*0.7,bs:c.bs*0.5,bt:c.bt,wr:c.wr},0.55):null;
  return {mom:{sc:1,o:[0,0,0],mk:m.mk,dots:m.dots,ph:0}, calf:k&&{sc:0.42,o:[-0.6,-0.56,0.36],mk:k.mk,dots:k.dots,ph:1.3}}; }
// draw one whale (and her calf): P = {x,y,z: where its middle is, head, roll, tip, len: its length, tb: tail-beat clock, t: time}
function draw(lk,P){ const sh=Math.sin(P.head), ch=Math.cos(P.head), half=P.len/2;
  const dep=w=>{ const x=w.o[0]*half*ch+w.o[2]*half*sh+P.x-camPx, z=-w.o[0]*half*sh+w.o[2]*half*ch+P.z-camPz; return x*fwdX+z*fwdZ; };
  const list=lk.calf?[lk.mom,lk.calf]:[lk.mom]; if(lk.calf){ lk.calf.o[1]=-0.56+0.03*Math.sin(P.t*0.7); if(dep(lk.calf)>dep(lk.mom)) list.reverse(); }
  ctx=P.ctx; HZ=P.haze||0; if(P.sky){ HC[0]=P.sky[0]; HC[1]=P.sky[1]; HC[2]=P.sky[2]; }
  ctx.save(); ctx.lineJoin='round'; for(const w of list) pass(w,P); ctx.restore(); ctx.globalAlpha=1; }
// for checking: how far the lowest point of a whale (and her calf) is above the ground just now
function clear(lk,P,gf){ let lo=1e9; const half=P.len/2, ch=Math.cos(P.head), sh=Math.sin(P.head), cr=Math.cos(P.roll), sr=Math.sin(P.roll), ct=Math.cos(P.tip), stp=Math.sin(P.tip);
  for(const w of lk.calf?[lk.mom,lk.calf]:[lk.mom]){ TB=P.tb+w.ph; CUR=w.dots; build(P.t+w.ph*2); const sc=w.sc*half;
    for(let i=0;i<vi/3;i++){ const x=MV[i*3]*sc+w.o[0]*half, y=MV[i*3+1]*sc+w.o[1]*half, z=MV[i*3+2]*sc+w.o[2]*half, y1=y*cr-z*sr, z1=y*sr+z*cr, x2=x*ct-y1*stp, y2=x*stp+y1*ct;
      const d=y2+P.y-gf(x2*ch+z1*sh+P.x,-x2*sh+z1*ch+P.z); if(d<lo) lo=d; } }
  return lo; }
/* for the 3D game: build one whale (or calf) w at pose P, leaving its points in MV (vi/3 of them), its dots in decs and its eyes in eyes */
function mesh(w,P){ TB=P.tb+w.ph; CUR=w.dots; build(P.t+w.ph*2); return vi/3; }
return {look,mesh,QUADS,MV,decs,eyes:()=>eyes,COL,PURP,tintOf};
})();
/* ---- the ten whales of the cloud field: who they are, and how they move ---- */
// Made on the mockup page and pasted in from its list: p pattern, s strength, u purple, z length in kid-heights, d white dots, ds dot size,
// k head knobs, f flank patches, t tail edge, bs belly spots, bt belly tint, wr how far the white reaches, c calf.
// sn its sounds, sp pitch, sw pause between calls in seconds, sv volume, tb tail beat.
const WHALE_CFG=[
  {p:52,s:55,u:54,z:17,d:34,ds:30,k:68,f:19,t:76,bs:81,bt:38,wr:69,c:0,sn:['s1','s4','s6','s8','s9','s10'],sp:100,sw:10,sv:100,tb:62},
  {p:29,s:76,u:79,z:21,d:70,ds:87,k:73,f:64,t:16,bs:52,bt:11,wr:88,c:1,sn:['s1','s2','s12','s6','s7','s13'],sp:95,sw:11,sv:100,tb:73},
  {p:99,s:94,u:84,z:25,d:84,ds:60,k:100,f:54,t:95,bs:100,bt:0,wr:29,c:0,sn:['b1','b2','b3','b5','b6','s11'],sp:103,sw:8,sv:100,tb:62},
  {p:76,s:60,u:48,z:8,d:34,ds:44,k:25,f:34,t:34,bs:32,bt:78,wr:40,c:0,sn:['b0','s0','s1','b5','b6','s11'],sp:135,sw:31,sv:100,tb:174},
  {p:68,s:87,u:72,z:16,d:72,ds:78,k:26,f:22,t:26,bs:71,bt:0,wr:80,c:0,sn:['s0','s9','s10','s1','s2','s11'],sp:100,sw:14,sv:100,tb:80},
  {p:45,s:33,u:62,z:23,d:100,ds:100,k:96,f:52,t:62,bs:74,bt:46,wr:41,c:1,sn:['s0','s11','s3','s13','s6','s1'],sp:80,sw:7,sv:100,tb:81},
  {p:41,s:53,u:0,z:26,d:48,ds:34,k:51,f:36,t:82,bs:99,bt:0,wr:49,c:1,sn:['s0','s1','s2','s3','s12','s5'],sp:100,sw:9,sv:100,tb:100},
  {p:59,s:47,u:93,z:62,d:68,ds:42,k:100,f:55,t:88,bs:100,bt:98,wr:94,c:0,sn:['b1','b2','b3','b4','b5','s1'],sp:94,sw:8,sv:118,tb:30},
  {p:12,s:65,u:93,z:7,d:53,ds:20,k:83,f:5,t:74,bs:43,bt:88,wr:79,c:0,sn:['s0','s10','s3','s4','s6','s8'],sp:116,sw:25,sv:100,tb:181},
  {p:53,s:81,u:34,z:14,d:78,ds:60,k:65,f:42,t:30,bs:65,bt:28,wr:51,c:0,sn:['s1','s11','s4','s6','s7','s8'],sp:100,sw:10,sv:100,tb:100}];
const KID_H=98;              // the big kid's height in the world: a whale "30 kids long" is 30 of these
const WH_GAP=3*KID_H;        // how far a whale's lowest point (flipper tips, tail and calf included) keeps above the highest cloud under it; big whales a little more
const WH_CROSS_FIRST=14, WH_CROSS_EVERY=30;

/* ---------- the 2D game's ring and its ground, in this world ---------- */
let whales=null, whCrossT=0, whCrossI=0;
const whMid=()=>{ const c=boxC(); return [c[0]-SUNDX_G*BOX_HALF, c[1]-SUNDZ_G*BOX_HALF]; };   // the middle of their ring: the doorway
const gG=(x,z)=>groundAt(-x*U,z*U)/U;   // the cloud land, in game units
function whGround(x,z,mid){ const g=gG(x,z)+40, d=Math.hypot(x-mid[0],z-mid[1]); if(d>1900) return g; const q=clamp((1900-d)/1300,0,1); return g+(DOOR_H+D2_POST+60)*q*q*(3-2*q); }   // the cloud lumps stand up to about 40 over the land
// low: how deep a whale reaches below its middle, flipper tips at the bottom of their stroke, tail and calf included, as a share of half its length.
function whalesStart(){ const mid=whMid(); whales=WHALE_CFG.map((c,i)=>{
    const len=c.z*KID_H, R=5200+len*1.25+(h2(i,811)-0.5)*900, th=i*Math.PI*2/WHALE_CFG.length*3+(h2(i,813)-0.5)*0.5;   // every third place round the ring, so big and small are mixed
    return {c, look:null, len, R, ph:h2(i,817)*6.28, v:110+len*0.045, x:mid[0]+R*Math.cos(th), z:mid[1]+R*Math.sin(th), y:null, psi:th+Math.PI/2, turn:0, tip:0, tb:h2(i,819)*6, mode:0, tx:0, tz:0, low:c.c?0.86:0.6}; });
  // voices: each whale has up to six sounds of its own (sn), a pitch (sp), a pause between calls in seconds (sw) and a volume (sv), set on the mockup page.
  // A whale saved without them gets a set to be going on with: the big calls for the big whales, slower the bigger; the singing for the small ones.
  whales.forEach((w,i)=>{ const c=w.c, big=c.z>=30, has=Array.isArray(c.sn)&&c.sn.length>0;
    w.sn=has?c.sn:(big?[0,1,2,3,4,5].map(k=>'b'+(k+i)%7):[0,1,2,3,4,5].map(k=>'s'+(i*5+k*3)%14));
    w.rate=has?c.sp/100:(big?clamp(1.12-c.z/260,0.8,1.05):clamp(1.3-c.z/60,1,1.25)); w.pause=has?c.sw:(big?18:22); w.vol=has?c.sv/100:(big?1:0.7);
    w.callT=WT+3+h2(i,823)*22; w.snd=null; w.last=null; });
  whCrossT=WT+WH_FIRST3D; whCrossI=0; }
function whalesUpdate(dt){ const mid=whMid();
  if(WT>whCrossT){ whCrossT=WT+WH_CROSS_EVERY; for(let n=0;n<whales.length;n++){ const w=whales[(whCrossI+n*3)%whales.length]; if(w.mode===0){ w.mode=1; w.callT=Math.min(w.callT,WT+1.5); whCrossI=(whCrossI+n*3+3)%whales.length; break; } } }
  for(const w of whales){
    const dx=w.x-mid[0], dz=w.z-mid[1], dist=Math.hypot(dx,dz), th=Math.atan2(dz,dx); let cx, cz;
    if(w.mode===0){ const a=th+0.32, R=w.R*(1+0.07*Math.sin(3*a+w.ph)+0.04*Math.sin(5*a+w.ph*2.1)); cx=mid[0]+R*Math.cos(a); cz=mid[1]+R*Math.sin(a); }   // round the ring: a regular path with a slow swell in and out of its own
    else if(w.mode===1){ cx=mid[0]; cz=mid[1]; if(dist<Math.max(700,w.len*0.3)){ w.mode=2; w.callT=Math.min(w.callT,WT); w.tx=mid[0]+Math.cos(w.psi)*w.R; w.tz=mid[1]+Math.sin(w.psi)*w.R; } }   // leaving the ring to pass over the doorway...
    else { cx=w.tx; cz=w.tz; if(dist>w.R*0.82) w.mode=0; }                                                                                                              // ...and straight on to the ring on the far side
    let d=Math.atan2(cz-w.z,cx-w.x)-w.psi; d=Math.atan2(Math.sin(d),Math.cos(d));
    const maxT=w.v/Math.max(1300,w.len*0.9), want=clamp(d*0.8,-maxT,maxT); w.turn+=(want-w.turn)*(1-Math.exp(-dt*1.2)); w.psi+=w.turn*dt;
    const fx=Math.cos(w.psi), fz=Math.sin(w.psi); w.x+=fx*w.v*dt; w.z+=fz*w.v*dt;
    // height: every part of it well over the highest cloud anywhere under it. It follows the land, and can never be lower than that.
    let G=-1e9; const half=w.len/2, wide=w.len*0.17;
    for(let i=-5;i<=5;i++){ const a=i*half*0.24; for(let j=-2;j<=2;j++){ const g=whGround(w.x+fx*a-fz*j*wide, w.z+fz*a+fx*j*wide, mid); if(g>G) G=g; } }
    const lean=0.62*Math.abs(Math.sin(whRoll(w)))+1.1*Math.abs(Math.sin(w.tip)), floor=G+(w.low+lean)*half+WH_GAP+w.len*0.03,   // banking and nosing up or down swing the flippers and tail lower, so they count too
          aim=floor+half*(0.012+0.012*Math.sin(WT*0.17+w.ph)), y0=w.y;
    w.y=w.y===null?aim:Math.max(floor,w.y+(aim-w.y)*(1-Math.exp(-dt*0.7)));
    const vy=y0===null?0:(w.y-y0)/Math.max(dt,1e-3); w.tip+=(clamp(vy/w.v,-0.1,0.1)-w.tip)*(1-Math.exp(-dt*1.5));
    w.tb+=dt*2.1*(w.c.tb!==undefined?w.c.tb/100:Math.sqrt(clamp(1500/w.len,0.16,1.4)));   // its own tail beat from the mockup page; one saved without it beats slower the bigger it is
  }
}
const WH_SKY=[[0,0x2a,0x8a,0x88],[0.4,0x4f,0xa9,0x99],[0.76,0x93,0xc7,0x9e],[1,0xf0,0xd8,0x98]];   // the sky's colours from the top of the picture down to the horizon (as drawSky paints them)
const whRoll=w=>clamp(w.turn*5,-0.2,0.2);
// You cannot fly into a whale. Each one carries an unseen cushion about a kid's height off its skin, shaped to the whole animal: the long body,
// both flippers, the tail flukes, and the calf if she has one. Coming near, the kids are eased aside, more firmly the nearer they get, and slide round it;
// they are never let inside. The cushion moves with the whale, so one swimming toward them moves them out of its way.
// Each part is a stretched ball: [along the whale, to its side, up] for its middle and for its three half-lengths, all as shares of the whale's length.
const WH_PARTS=[[0,0,0, 0.5,0.115,0.1],[0.16,0.2,-0.07, 0.07,0.16,0.07],[0.16,-0.2,-0.07, 0.07,0.16,0.07],[-0.47,0,0, 0.07,0.15,0.08]], WH_CALF=[-0.3,0.18,-0.28, 0.21,0.1,0.06];
function whaleNear(w,x,y,z){   // how near a point is to whale w: under 1 is inside its cushion; also the way straight out from there
  const fx=Math.cos(w.psi), fz=Math.sin(w.psi), dx=x-w.x, dz=z-w.z, a=dx*fx+dz*fz, b=-dx*fz+dz*fx, c=y-w.y, L=w.len, M=KID_H; let best=null;
  for(const e of (w.c.c?WH_PARTS.concat([WH_CALF]):WH_PARTS)){ const pa=a-e[0]*L, pb=b-e[1]*L, pc=c-e[2]*L, sa=e[3]*L+M, sb=e[4]*L+M, sc=e[5]*L+M;
    const q=Math.sqrt(pa*pa/(sa*sa)+pb*pb/(sb*sb)+pc*pc/(sc*sc)); if(best && q>=best.q) continue;
    let ga=pa/(sa*sa), gb=pb/(sb*sb), gc=pc/(sc*sc); const gl=Math.hypot(ga,gb,gc); if(gl<1e-9){ ga=0; gb=0; gc=1; } else { ga/=gl; gb/=gl; gc/=gl; }
    best={q, nx:ga*fx-gb*fz, ny:gc, nz:ga*fz+gb*fx, out:(1-q)*Math.min(sa,sb,sc)}; }
  return best; }

const WH_FIRST3D=4;   // soon after the kids come through, the first one sets off over the door

/* ---------- drawing: one mesh per whale (and calf), its triangles laid out once, its points written each frame ---------- */
const Q=WHALE.QUADS, NQ=Q.length;
const COLD=WHALE.COL.day, PU=WHALE.PURP.day;
const v3=c=>`vec3(${(c[0]/255).toFixed(4)},${(c[1]/255).toFixed(4)},${(c[2]/255).toFixed(4)})`;
const LDIR=new THREE.Vector3(-SUNDX_G*0.35,0.9,SUNDZ_G*0.35).normalize();
const skinMat=new THREE.ShaderMaterial({ side:THREE.DoubleSide, extensions:{derivatives:true},
  uniforms:{uTint:{value:new THREE.Vector3(1,1,1)}, uL:{value:LDIR}, uHz:{value:new THREE.Vector3(250/255,232/255,238/255)}, uFar:{value:1000}},
  vertexShader:`attribute vec4 aSkin; varying vec4 vSkin; varying vec3 vW;
    void main(){ vSkin=aSkin; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform vec3 uTint, uL, uHz; uniform float uFar; varying vec4 vSkin; varying vec3 vW;
    vec3 tone(vec3 a, vec3 b, vec3 c, float l){ float u=clamp(l,0.0,1.0)*2.0; return u<1.0?mix(a,b,u):mix(b,c,u-1.0); }
    void main(){ vec3 n=normalize(cross(dFdx(vW),dFdy(vW))), v=normalize(cameraPosition-vW); if(dot(n,v)<0.0) n=-n;   /* the face toward the eye is the outside */
      float lam=dot(n,uL)*0.5+0.5, face=max(dot(n,v),0.0), l=0.72*lam+0.3*face;
      vec3 dk=tone(${v3(COLD[0][0])},${v3(COLD[0][1])},${v3(COLD[0][2])},l), pu=tone(${v3(PU[0])},${v3(PU[1])},${v3(PU[2])},l);
      dk=mix(dk,pu,max(vSkin.y,0.0))*(1.0+vSkin.z);
      vec3 pl=tone(${v3(COLD[1][0])},${v3(COLD[1][1])},${v3(COLD[1][2])},l)*uTint;
      vec3 c=vSkin.x>0.5?mix(pl,dk,vSkin.w):dk;
      float hz=clamp((length(vW-cameraPosition)-uFar*0.25)/(uFar*0.9),0.0,1.0); hz=hz*hz*0.45;   /* very slight haze, growing with distance */
      gl_FragColor=vec4(mix(c,uHz,hz),1.0); }`});
/* the dots: small ellipses lying on the skin; and the eyes */
const DOTC={d:[0x33,0x37,0x7a], w:[0xff,0xff,0xff], k:[0x7d,0x83,0xb0], c:[0x47,0x4c,0x7c], e:[0x0c,0x0e,0x22]};
const dotMat=new THREE.ShaderMaterial({ side:THREE.DoubleSide, transparent:false,
  polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2,
  vertexShader:`attribute vec2 aUV; attribute vec3 aCol; varying vec2 vUV; varying vec3 vCol; void main(){ vUV=aUV; vCol=aCol; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader:`varying vec2 vUV; varying vec3 vCol; void main(){ if(dot(vUV,vUV)>1.0) discard; gl_FragColor=vec4(vCol,1.0); }`});
function makeParts(look){ const parts=[];
  for(const w of look.calf?[look.mom,look.calf]:[look.mom]){
    const pos=new Float32Array(NQ*6*3), skin=new Float32Array(NQ*6*4), g=new THREE.BufferGeometry();
    for(let q=0;q<NQ;q++){ const R=Q[q], kind=R[4], pm=w.mk[q*3], lm=w.mk[q*3+1], mix=Math.max(R[6],w.mk[q*3+2]);
      for(let k=0;k<6;k++){ const o=(q*6+k)*4; skin[o]=kind; skin[o+1]=pm; skin[o+2]=lm; skin[o+3]=mix; } }
    g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aSkin',new THREE.BufferAttribute(skin,4));
    const m=skinMat.clone(); m.uniforms.uTint.value.fromArray(w.dots.tint); m.uniforms.uL=skinMat.uniforms.uL; m.uniforms.uHz=skinMat.uniforms.uHz; m.uniforms.uFar=skinMat.uniforms.uFar;
    const mesh=new THREE.Mesh(g,m); mesh.frustumCulled=false; mesh.visible=false; scene.add(mesh);
    const DN=400, dp=new Float32Array(DN*4*3), duv=new Float32Array(DN*4*2), dc=new Float32Array(DN*4*3), di=[], dg=new THREE.BufferGeometry();
    for(let i=0;i<DN;i++){ const a=i*4; di.push(a,a+1,a+2, a,a+2,a+3); duv.set([-1,-1, 1,-1, 1,1, -1,1],i*8); }
    dg.setAttribute('position',new THREE.BufferAttribute(dp,3).setUsage(THREE.DynamicDrawUsage)); dg.setAttribute('aUV',new THREE.BufferAttribute(duv,2)); dg.setAttribute('aCol',new THREE.BufferAttribute(dc,3).setUsage(THREE.DynamicDrawUsage)); dg.setIndex(di);
    const dmesh=new THREE.Mesh(dg,dotMat); dmesh.frustumCulled=false; dmesh.visible=false; scene.add(dmesh);
    parts.push({w,mesh,pos,dmesh,dp,dc,DN}); }
  return parts; }
/* one part placed: the 2D game's own build at this pose, carried into the world (bank, nose up or down, heading, place; x mirrored) */
const MV=WHALE.MV, TP=[0,0,0];
function place(part,P){
  const w=part.w; WHALE.mesh(w,P);
  const half=P.len/2, sc=w.sc*half, ox=w.o[0]*half, oy=w.o[1]*half, oz=w.o[2]*half;
  const ch=Math.cos(P.head), sh=Math.sin(P.head), cr=Math.cos(P.roll), sr=Math.sin(P.roll), ct=Math.cos(P.tip), st=Math.sin(P.tip);
  const T=i=>{ const x=MV[i*3]*sc+ox, y=MV[i*3+1]*sc+oy, z=MV[i*3+2]*sc+oz, y1=y*cr-z*sr, z1=y*sr+z*cr, x2=x*ct-y1*st, y2=x*st+y1*ct;
    TP[0]=-(x2*ch+z1*sh+P.x)*U; TP[1]=(y2+P.y)*U; TP[2]=(-x2*sh+z1*ch+P.z)*U; return TP; };
  const pos=part.pos; let o=0;
  for(let q=0;q<NQ;q++){ const R=Q[q];
    for(const k of [0,1,2,0,2,3]){ const p=T(R[k]); pos[o++]=p[0]; pos[o++]=p[1]; pos[o++]=p[2]; } }
  part.mesh.geometry.attributes.position.needsUpdate=true;
  /* the dots and eyes: each an ellipse in the plane of its skin, lifted a hair off it */
  const dp=part.dp, dc=part.dc; let n=0; const A=[0,0,0], F=[0,0,0], Up=[0,0,0], N=[0,0,0];
  const put=(E,col,rx,ry,lift)=>{ if(n>=part.DN) return; const a=T(E[0]); A[0]=a[0];A[1]=a[1];A[2]=a[2]; const o2=T(E[1]); N[0]=o2[0]-A[0];N[1]=o2[1]-A[1];N[2]=o2[2]-A[2];
    const f=T(E[2]); F[0]=(f[0]-A[0])/0.02;F[1]=(f[1]-A[1])/0.02;F[2]=(f[2]-A[2])/0.02; const u=T(E[3]); Up[0]=(u[0]-A[0])/0.02;Up[1]=(u[1]-A[1])/0.02;Up[2]=(u[2]-A[2])/0.02;
    const nl=Math.hypot(N[0],N[1],N[2])||1, lf=lift/nl;
    for(let c=0;c<4;c++){ const sx=(c===0||c===3)?-1:1, sy=c<2?-1:1, b=(n*4+c)*3;
      dp[b]=A[0]+F[0]*sx*rx+Up[0]*sy*ry+N[0]*lf; dp[b+1]=A[1]+F[1]*sx*rx+Up[1]*sy*ry+N[1]*lf; dp[b+2]=A[2]+F[2]*sx*rx+Up[2]*sy*ry+N[2]*lf;
      dc[b]=col[0]/255; dc[b+1]=col[1]/255; dc[b+2]=col[2]/255; } n++; };
  const lift=0.004*sc*U;
  for(const E of WHALE.decs) put(E,DOTC[E[6]]||DOTC.c,E[4]*E[5],E[4],lift);
  for(const E of WHALE.eyes()) put(E,DOTC.e,0.014*1.55,0.014*1.0,lift*1.2);
  for(let i=n*4;i<part.DN*4;i++){ dp[i*3]=dp[i*3+1]=dp[i*3+2]=0; }
  part.dmesh.geometry.attributes.position.needsUpdate=true; part.dmesh.geometry.attributes.aCol.needsUpdate=true;
}
const whP=w=>({x:w.x,y:w.y,z:w.z,head:-w.psi,roll:whRoll(w),tip:w.tip,len:w.len,tb:w.tb,t:WT+w.ph*3});

/* ---------- the kids cannot fly into a whale ---------- */
function whalePush(dt){ if(!whales||!girl) return; const P=girl.P; if(P.state!=='fly') return;
  const lx=-P.x/U, lz=P.z/U, ly=(groundAt(P.x,P.z)+P.y)/U+45;
  for(const w of whales){ if(w.y===null) continue; const far=w.len*0.75+KID_H*3; if(Math.abs(lx-w.x)>far||Math.abs(lz-w.z)>far) continue;
    const n=whaleNear(w,lx,ly,lz); if(!n||n.q>=1.45) continue;
    const soft=clamp((1.45-n.q)/0.45,0,1), k=soft*soft*900*dt*U;   // the gentle part: eased aside, more firmly nearer
    let mx=n.nx*k, mz=n.nz*k, my=n.ny*k*0.9;
    if(n.q<1){ const d=(n.out+2)*U; mx+=n.nx*d; mz+=n.nz*d; my+=n.ny*d; }   // the firm part: never inside
    for(const K of [girl,boy]){ K.P.x-=mx; K.P.z+=mz; }   // (x mirrored)
    P.alt=clamp(P.alt+my,1.2,ALT_MAX); if(n.q<1) P.y=Math.max(0.4,P.y+my); } }

/* ---------- their voices ---------- */
const WH_FILE=id=>'assets/'+(id[0]==='b'?'whale_big_':'whale_sing_')+id.slice(1)+'.mp3', whBuf={};
function whaleSound(){
  if(typeof actx==='undefined'||!actx||!master||!whales||!girl) return;
  const t=actx.currentTime, P=girl.P, lx=-P.x/U, lz=P.z/U, ly=(groundAt(P.x,P.z)+P.y)/U;
  cam.getWorldDirection(_f); const rx=_f.z, rz=_f.x;   // the camera's right, in game units (x mirrored)
  for(const w of whales){
    for(const id of w.sn) if(whBuf[id]===undefined){ whBuf[id]=null; fetch(WH_FILE(id)).then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(b=>actx.decodeAudioData(b)).then(buf=>{ whBuf[id]=buf; }).catch(()=>{}); }
    if(!w.snd && WT>w.callT){ const ready=w.sn.filter(id=>whBuf[id]); if(ready.length){
      const pick=ready.length>1?ready.filter(id=>id!==w.last):ready, id=pick[Math.floor(Math.random()*pick.length)], buf=whBuf[id];
      const src=actx.createBufferSource(), g=actx.createGain(), pan=actx.createStereoPanner?actx.createStereoPanner():null, wh=w;
      src.buffer=buf; src.playbackRate.value=w.rate; g.gain.value=0; src.connect(g); if(pan){ g.connect(pan); pan.connect(master); } else g.connect(master);
      src.onended=()=>{ if(wh.snd&&wh.snd.src===src){ wh.snd=null; wh.callT=WT+wh.pause*(0.8+0.4*Math.random()); } }; src.start(); w.snd={src,g,pan}; w.last=id; w.callT=WT+1e6; } }
    if(w.snd){ const dx=w.x-lx, dz=w.z-lz, d=Math.hypot(dx,dz,w.y-w.low*w.len/2-ly), q=d/3600;
      w.snd.g.gain.setTargetAtTime(w.vol*1.7/(1+q*q),t,0.35);
      if(w.snd.pan) w.snd.pan.pan.setTargetAtTime(clamp(-(dx*rx-dz*rz)/Math.max(400,d)*1.1,-0.85,0.85),t,0.35); } } }
const _f=new THREE.Vector3();
function stopAll(){ if(!whales) return; for(const w of whales){ if(w.snd){ try{ w.snd.src.stop(); }catch(e){} w.snd=null; } for(const p of w.parts) p.mesh.visible=p.dmesh.visible=false; } }

/* ---------- each frame ---------- */
const _ud=updateDesert;
updateDesert=function(dt,time){ _ud(dt,time); WT=clock;
  const on=typeof level2On==='function'&&level2On();
  if(!on){ if(whales){ stopAll(); whales=null; } return; }
  if(!whales){ whalesStart(); for(const w of whales){ w.look=WHALE.look(w.c); w.parts=makeParts(w.look); } }
  whalesUpdate(dt); whalePush(dt); whaleSound(); };
const _rf=renderFrame;
renderFrame=function(){
  if(whales){ skinMat.uniforms.uFar.value=scene.fog.far;
    const far=scene.fog.far*1.3;
    for(const w of whales){ if(w.y===null) continue; const P=whP(w), wx=-w.x*U, wz=w.z*U, d=Math.hypot(wx-cam.position.x,wz-cam.position.z), vis=d<far+w.len*U;
      for(const p of w.parts){ p.mesh.visible=p.dmesh.visible=vis; }
      if(!vis) continue;
      w.skip=(w.skip||0)+1; if(d>400 && w.skip%2) continue;   // far off, every other frame
      if(w.look.calf) w.look.calf.o[1]=-0.56+0.03*Math.sin(P.t*0.7);
      for(const p of w.parts) place(p,P); } }
  _rf(); };
window.whales3d=()=>whales;
/* how near the girl is to the nearest whale, as a share of that whale's length (under 1.5: near enough to be lifted) */
window.whaleNearness=()=>{ if(!whales||!girl) return 99; const lx=-girl.P.x/U, lz=girl.P.z/U; let best=99;
  for(const w of whales){ if(w.y===null) continue; const d=Math.hypot(lx-w.x,lz-w.z)/w.len; if(d<best) best=d; } return best; };
})();
