import asyncio, base64, json, os, sys
NOBAKE=os.environ.get('NOBAKE')=='1'; NOMERGE=os.environ.get('NOMERGE')=='1'
from playwright.async_api import async_playwright
KEEP=['idle_A1','idle_A2','idle_B1','walk_start_A','walk_A1','walk_end_A','fly_start_A','fly_A1','fly_A2','fly_A3','fly_end_A','foraging_start_A','foraging_A1','foraging_end_A']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(); await pg.goto("http://localhost:8793/")
        for f in ['three.min.js','fflate.min.js','NURBSUtils.js','NURBSCurve.js','FBXLoader.js','GLTFExporter.js','GLTFLoader.js','BufferGeometryUtils.js']: await pg.add_script_tag(url='http://localhost:8793/fbx/'+f)
        res=await pg.evaluate("""(async([KEEP,NOBAKE,NOMERGE])=>{
          const buf=await (await fetch('/flam/american%20flamingo.fbx')).arrayBuffer(); const o=new THREE.FBXLoader().parse(buf,'/flam/'); const log=[];
          o.children.filter(c=>c.name==='Plane').forEach(c=>o.remove(c));
          /* plain named materials: the page puts the textures back */
          o.traverse(n=>{ if(n.isMesh){ const mats=[].concat(n.material).map(m=>new THREE.MeshStandardMaterial({name:m.name})); n.material=mats.length>1?mats:mats[0];
            const before=n.geometry.attributes.position.count; const g=NOMERGE?n.geometry:THREE.BufferGeometryUtils.mergeVertices(n.geometry,1e-4); n.geometry=g; log.push(n.name+': '+before+' -> '+g.attributes.position.count+' points'); } });
          const clips=[]; let before=0, after=0;
          const srcs=KEEP.map(name=>{ const c=o.animations.find(a=>a.name.endsWith('|'+name)); if(!c) log.push('missing '+name); return c; }).filter(Boolean);
          /* a track is needed only if its bone moves in some kept animation, or holds different poses in different ones.
             Bones that hold one fixed pose throughout have that pose set into the bone itself, and lose their tracks. */
          const isStill=t=>{ const k=t.values.length/t.times.length, eps=/position$/.test(t.name)?0.01:2e-3; for(let i=k;i<t.values.length;i++) if(Math.abs(t.values[i]-t.values[i%k])>eps) return false; return true; };   /* the model is in cm: under 0.1 mm, or a tiny turn, counts as still */
          const info={}; for(const c of srcs) for(const t of c.tracks){ const k=t.values.length/t.times.length, v0=Array.from(t.values.slice(0,k)), I=info[t.name]||(info[t.name]={moves:false,v:v0,same:true});
            if(!isStill(t)) I.moves=true; else if(v0.some((x,i)=>Math.abs(x-I.v[i])>(/position$/.test(t.name)?0.01:2e-3))) I.same=false; }
          let baked=0; if(NOBAKE) for(const k in info) info[k].moves=true; for(const [name,I] of Object.entries(info)){ if(I.moves||!I.same) continue; const [bone,prop]=[name.slice(0,name.lastIndexOf('.')),name.slice(name.lastIndexOf('.')+1)];
            let ok=true, found=0; const eps=prop==='position'?0.01:2e-3; o.traverse(n=>{ if(n.name===bone&&n[prop]&&n[prop].toArray){ found++; const a=n[prop].toArray(); let d=0; for(let q=0;q<I.v.length;q++) d=Math.max(d,Math.abs(a[q]-I.v[q])); if(prop==='quaternion'){ let d2=0; for(let q=0;q<4;q++) d2=Math.max(d2,Math.abs(a[q]+I.v[q])); d=Math.min(d,d2); } if(d>eps) ok=false; } });
            if(!ok||found===0){ I.moves=true; continue; } baked++; }
          log.push('fixed tracks already at rest, dropped: '+baked+' of '+Object.keys(info).length);
          for(let ci=0;ci<srcs.length;ci++){ const src=srcs[ci], name=KEEP.filter(n=>o.animations.find(a=>a.name.endsWith('|'+n)))[ci];
            const c=src.clone(); c.name=name; const fly=/^fly/.test(name);
            c.tracks=c.tracks.filter(t=>{ const I=info[t.name]; return I.moves||!I.same; }).map(t=>{ const n=t.times.length, k=t.values.length/n; before+=t.values.length;
              let idx; if(isStill(t)) idx=[0]; else { idx=[]; const step=fly?2:3; for(let i=0;i<n;i++) if(i%step===0||i===n-1) idx.push(i); }
              const T=new Float32Array(idx.length), V=new Float32Array(idx.length*k); idx.forEach((i,j)=>{ T[j]=t.times[i]; for(let q=0;q<k;q++) V[j*k+q]=t.values[i*k+q]; });
              after+=V.length; const C=t.constructor; return new C(t.name,T,V); });
            clips.push(c); }
          log.push('animation numbers: '+before+' -> '+after);
          const glb=await new Promise((res,rej)=>new THREE.GLTFExporter().parse(o,res,rej,{binary:true,animations:clips}));
          const u8=new Uint8Array(glb); let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
          /* check it reads back */
          const g=await new Promise((res,rej)=>new THREE.GLTFLoader().parse(glb,'',res,rej)); let meshes=0,verts=0; g.scene.traverse(n=>{ if(n.isMesh){ meshes++; verts+=n.geometry.attributes.position.count; } });
          log.push('read back: '+meshes+' meshes, '+verts+' vertices, '+g.animations.length+' animations: '+g.animations.map(a=>a.name+' '+a.duration.toFixed(2)+'s').join(', '));
          return {b64:btoa(s), log}; })""", [KEEP,NOBAKE,NOMERGE])
        open(sys.argv[1],'wb').write(base64.b64decode(res['b64'])); print('\n'.join(res['log']))
        await b.close()
asyncio.run(main())
