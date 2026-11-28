/* Kalp Simülatörü: akciğer 3D görünümü (three.js).
   assets/lung.glb (BodyParts3D) içindeki loblar, trakea, bronş ağacı, pulmoner arter/venler, diyafram ve kalp.
   Hastalık görünümü fx listesiyle verilir (setFx):
     {t:'spot', p:[x,y,z], r, c:'#hex', k:'solid'|'haze'|'nod'|'ret'|'cav'|'lucent', a?}  lob yüzeyinde bölgesel dansite
     {t:'lobe', id, c, a?}           bir lobu boya (konsolidasyon, atelektazi)
     {t:'scale', side:'R'|'L'|'B', k, lobe?}  akciğeri hilus etrafında küçült/büyüt (pnömotoraks, amfizem, atelektazi)
     {t:'fluid', side, y}            seviye altına sıvı (plevral efüzyon), lateralde menisküs
     {t:'ghost', side}               küçülen akciğerin eski sınırı (plevral boşluktaki hava)
     {t:'diaph', k, dy}              diyaframı düzleştir / indir
     {t:'shift', dx}                 mediyasten kayması (tansiyon pnömotoraks)
     {t:'heart', k, c?}              kalbi büyüt / boya
     {t:'brons', c, pulse?}          bronş ağacını boya (astım, bronşit)
     {t:'pa', c}                     pulmoner arteri boya
     {t:'ball', p, r, c, bump?, a?}  kitle, pıhtı, bül, lenf nodu
   Koordinatlar: x hastanın solu (+), y yukarı, z ön; 1 birim = 40 mm. */
(function(){
'use strict';
const T=window.THREE;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const HIL={R:V(-1.55,0.55,-0.55),L:V(1.25,0.5,-0.6)};
const LOBES=['rul','rml','rll','lul','lll'], SIDE={rul:'R',rml:'R',rll:'R',lul:'L',lll:'L'};
const NOISE='float h3(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}'+
  'float vn(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);'+
  'return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}';
const KIND={solid:0,haze:1,nod:2,ret:3,cav:4,lucent:5};

function lobeMat(){
  const sp=[],sc=[]; for(let i=0;i<6;i++){ sp.push(new T.Vector4(0,-99,0,0.001)); sc.push(new T.Vector4(1,1,1,0)); }
  return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
    uniforms:{uC:{value:new T.Color(0xf0a3a9)},uR:{value:new T.Color(0xffe6ea)},uA:{value:0.32},uSel:{value:0},uDim:{value:1},
      uSP:{value:sp},uSC:{value:sc},uN:{value:0},uF:{value:new T.Vector4(0,-99,0,0)},uLob:{value:new T.Vector4(0,0,0,0)},uT:{value:0}},
    vertexShader:'varying vec3 vN;varying vec3 vV;varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mv=viewMatrix*w;vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 uC;uniform vec3 uR;uniform float uA;uniform float uSel;uniform float uDim;uniform vec4 uSP[6];uniform vec4 uSC[6];uniform int uN;uniform vec4 uF;uniform vec4 uLob;uniform float uT;'+
      'varying vec3 vN;varying vec3 vV;varying vec3 vW;'+NOISE+
      'void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 v=normalize(vV);float f=pow(1.-abs(dot(n,v)),2.);'+
      'float dif=0.68+0.32*max(dot(n,normalize(vec3(-0.3,0.7,0.65))),0.);'+
      'float mott=0.9+0.2*vn(vW*6.);'+
      'vec3 c=mix(uC*dif*mott,uR,f*0.5);float a=uA+0.45*f*(0.4+uA);'+
      'if(uLob.w>0.){c=mix(c,uLob.rgb*dif*(0.85+0.3*vn(vW*9.)),uLob.w);a=max(a,0.55+0.4*uLob.w);}'+
      'for(int i=0;i<6;i++){if(i>=uN)break;vec4 s=uSP[i];vec4 k=uSC[i];float d=distance(vW,s.xyz)/s.w;float w=1.-smoothstep(0.55,1.,d);if(w<=0.)continue;float m=w;int kk=int(k.w+0.5);'+
        'if(kk==1)m=w*0.6*(0.75+0.5*vn(vW*3.));'+
        'else if(kk==2)m=w*smoothstep(0.62,0.72,vn(vW*7.5));'+
        'else if(kk==3){float q=vn(vW*5.5);m=w*(1.-smoothstep(0.02,0.09,abs(q-0.5)))*0.95+w*0.15;}'+
        'else if(kk==4){m=w*smoothstep(0.32,0.5,d);}'+
        'else if(kk==5){c=mix(c,vec3(1.),w*0.55);a=a*(1.-0.6*w);continue;}'+
        'c=mix(c,k.rgb*dif*(0.85+0.3*vn(vW*8.)),clamp(m,0.,1.)*0.92);a=max(a,m*0.9);}'+
      'if(uF.w>0.&&vW.x*uF.x>0.){float lv=uF.y+0.55*clamp(abs(vW.x)-1.,0.,2.5)/2.5+0.04*sin(vW.z*5.+uT*1.5);if(vW.y<lv){c=mix(vec3(0.45,0.62,0.86),vec3(0.32,0.47,0.75),clamp((lv-vW.y)/1.5,0.,1.))*dif;a=0.86;}}'+
      'c=mix(c,vec3(0.06,0.56,0.49),uSel*0.35);a=max(a,uSel*0.6);'+
      'gl_FragColor=vec4(c,a*uDim);}'});
}

function create(container,opts){
  opts=opts||{};
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:!!opts.preserve});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.outputEncoding=T.sRGBEncoding; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.0;
  const scene=new T.Scene();
  const cam=new T.PerspectiveCamera(32,1,0.1,200);
  const HOME={p:V(0.2,0.9,15.5),t:V(-0.45,0.35,-0.3)};
  cam.position.copy(HOME.p);
  const ctl=new T.OrbitControls(cam,renderer.domElement); ctl.target.copy(HOME.t); ctl.enableDamping=true; ctl.dampingFactor=0.08; ctl.minDistance=4; ctl.maxDistance=30; ctl.rotateSpeed=0.8;
  scene.add(new T.HemisphereLight(0xffffff,0x9aa7b8,0.95));
  const dl=new T.DirectionalLight(0xffffff,0.85); dl.position.set(-4,8,10); scene.add(dl);
  const dl2=new T.DirectionalLight(0xffffff,0.35); dl2.position.set(6,-2,-8); scene.add(dl2);

  const root=new T.Group(); scene.add(root);
  const med=new T.Group(); root.add(med);              // mediyasten: kalp, trakea, damarlar (kayabilir)
  const piv={R:new T.Group(),L:new T.Group()}; piv.R.position.copy(HIL.R); piv.L.position.copy(HIL.L); root.add(piv.R,piv.L);
  const fxG=new T.Group(); root.add(fxG);
  const M={}, mats={}, base={};
  const opq=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:0.55,metalness:0.0},o||{}));
  let ready=false, sel=null, xray=true, breath=0, breathOn=true, fx=[], t0=performance.now(), selT=0;
  const lobeAlpha=()=>xray?0.2:0.62;

  function build(geos){
    // iç yapılar opak, önce çizilir
    mats.brons=opq(0xf1e6d2,{roughness:0.5}); mats.trakea=mats.brons;
    mats.pa=opq(0x4f78d6); mats.pv=opq(0xd9545c);
    mats.diyafram=opq(0xc98a6a,{transparent:true,opacity:0.32,depthWrite:false,side:T.DoubleSide});
    mats.kalp=opq(0xd86b66,{transparent:true,opacity:0.5,depthWrite:false});
    for(const k of ['trakea','brons','pa','pv','kalp']){ if(!geos[k]) continue; const m=new T.Mesh(geos[k],mats[k]); m.userData.id=k; m.renderOrder=k==='kalp'?8:2; med.add(m); M[k]=m; base[k]=mats[k].color.clone(); }
    if(geos.diyafram){ const m=new T.Mesh(geos.diyafram,mats.diyafram); m.userData.id='diyafram'; m.renderOrder=9; root.add(m); M.diyafram=m; base.diyafram=mats.diyafram.color.clone(); }
    for(const k of LOBES){ if(!geos[k]) continue; const s=SIDE[k], mat=lobeMat(); const m=new T.Mesh(geos[k],mat); m.position.copy(HIL[s]).multiplyScalar(-1); m.userData.id=k; m.renderOrder=10;
      const g=new T.Group(); g.add(m); piv[s].add(g); M[k]=m; mats[k]=mat; m.userData.g=g; }
    // pnömotoraksta eski akciğer sınırı
    const ghostM=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,uniforms:{uA:{value:0}},
      vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform float uA;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);gl_FragColor=vec4(0.55,0.78,0.98,(0.05+0.5*f)*uA);}'});
    M.ghost={R:new T.Group(),L:new T.Group()};
    for(const k of LOBES){ if(!geos[k]) continue; const g=new T.Mesh(geos[k],ghostM); g.renderOrder=11; M.ghost[SIDE[k]].add(g); }
    root.add(M.ghost.R,M.ghost.L); M.ghostM=ghostM;
    ready=true; applyFx(); applySel(); if(opts.onReady) opts.onReady();
  }

  // GLB'yi yükle
  new T.GLTFLoader().load(opts.url||'assets/lung.glb',g=>{
    const geos={}; g.scene.traverse(o=>{ if(o.isMesh){ const k=o.name||(o.parent&&o.parent.name); const geo=o.geometry; geo.computeVertexNormals(); geos[k]=geo; } });
    build(geos);
  },undefined,e=>{ if(opts.onError) opts.onError(e); });

  /* ---------- hastalık efektleri ---------- */
  function clearFx(){
    while(fxG.children.length){ const o=fxG.children.pop(); if(o.geometry) o.geometry.dispose(); }
    for(const k of LOBES){ const mt=mats[k]; if(!mt) continue; mt.uniforms.uN.value=0; mt.uniforms.uF.value.set(0,-99,0,0); mt.uniforms.uLob.value.set(0,0,0,0); }
    piv.R.scale.setScalar(1); piv.L.scale.setScalar(1); for(const k of LOBES) if(M[k]) M[k].userData.g.scale.setScalar(1);
    med.position.set(0,0,0); if(M.kalp){ M.kalp.scale.setScalar(1); }
    for(const k of ['brons','trakea','pa','pv','kalp','diyafram']) if(mats[k]&&base[k]) mats[k].color.copy(base[k]);
    if(mats.brons) mats.brons.emissive.setHex(0);
    if(M.diyafram){ M.diyafram.scale.set(1,1,1); M.diyafram.position.set(0,0,0); }
    if(M.ghostM) M.ghostM.uniforms.uA.value=0;
  }
  const col=c=>new T.Color(c);
  function lobePivotScale(m,k){ // tek lobu kendi hilus yönüne doğru küçült (atelektazi)
    const g=m.userData.g; g.scale.setScalar(k);
  }
  function applyFx(){
    if(!ready) return; clearFx();
    const spots={}; LOBES.forEach(k=>spots[k]=[]);
    for(const f of fx){
      if(f.t==='spot'){ const s=f.side||(f.p[0]<-0.3?'R':'L'); LOBES.filter(k=>SIDE[k]===s||f.side==='B').forEach(k=>spots[k].push(f)); }
      else if(f.t==='lobe'){ const mt=mats[f.id]; if(mt){ const c=col(f.c); mt.uniforms.uLob.value.set(c.r,c.g,c.b,f.a==null?1:f.a); } }
      else if(f.t==='scale'){ if(f.lobe){ if(M[f.lobe]) lobePivotScale(M[f.lobe],f.k); } else { (f.side==='B'?['R','L']:[f.side]).forEach(s=>{ if(Array.isArray(f.k)) piv[s].scale.set(f.k[0],f.k[1],f.k[2]); else piv[s].scale.setScalar(f.k); }); } }
      else if(f.t==='fluid'){ for(const k of LOBES) if(SIDE[k]===f.side&&mats[k]) mats[k].uniforms.uF.value.set(f.side==='R'?-1:1,f.y,0,1); }
      else if(f.t==='ghost'){ if(M.ghostM) M.ghostM.uniforms.uA.value=1; M.ghost.R.visible=f.side!=='L'; M.ghost.L.visible=f.side!=='R'; }
      else if(f.t==='diaph'){ if(M.diyafram){ M.diyafram.scale.set(1,f.k,1); M.diyafram.position.y=f.dy||0; } }
      else if(f.t==='shift'){ med.position.x=f.dx; }
      else if(f.t==='heart'){ if(M.kalp){ M.kalp.scale.setScalar(f.k||1); if(f.c) mats.kalp.color.set(f.c); } }
      else if(f.t==='brons'){ if(mats.brons){ mats.brons.color.set(f.c); mats.brons.emissive.set(f.c).multiplyScalar(0.25); } }
      else if(f.t==='pa'){ if(mats.pa) mats.pa.color.set(f.c); }
      else if(f.t==='pv'){ if(mats.pv) mats.pv.color.set(f.c); }
      else if(f.t==='ball'){
        const geo=new T.IcosahedronGeometry(f.r,f.bump?4:3);
        if(f.bump){ const p=geo.attributes.position, v=new T.Vector3(); for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); const n=1+f.bump*(Math.sin(v.x*9)*Math.sin(v.y*11)*Math.sin(v.z*7)); v.multiplyScalar(n); p.setXYZ(i,v.x,v.y,v.z); } geo.computeVertexNormals(); }
        if(f.s) geo.scale(f.s[0],f.s[1],f.s[2]);
        const m=new T.Mesh(geo,opq(f.c,f.a!=null?{transparent:true,opacity:f.a,depthWrite:false}:{})); m.position.set(f.p[0],f.p[1],f.p[2]); m.renderOrder=f.a!=null?12:3; fxG.add(m);
      }
    }
    for(const k of LOBES){ const mt=mats[k]; if(!mt) continue; const L=spots[k].slice(0,6); mt.uniforms.uN.value=L.length;
      L.forEach((s,i)=>{ const c=col(s.c||'#c0504a'); mt.uniforms.uSP.value[i].set(s.p[0],s.p[1],s.p[2],s.r); mt.uniforms.uSC.value[i].set(c.r,c.g,c.b,KIND[s.k||'solid']); }); }
  }

  /* ---------- seçim ---------- */
  function applySel(){
    if(!ready) return;
    for(const k of LOBES){ const mt=mats[k]; if(!mt) continue; mt.uniforms.uSel.value=sel===k?1:0; mt.uniforms.uA.value=lobeAlpha(); mt.uniforms.uDim.value=sel&&sel!==k&&LOBES.includes(sel)?0.55:(sel&&!LOBES.includes(sel)&&sel!=='plevra'?0.45:1); }
    for(const k of ['trakea','brons','pa','pv','diyafram','kalp']){ const mt=mats[k]; if(!mt||!base[k]) continue; mt.emissive&&mt.emissive.setHex(0); if(sel===k||(sel==='brons'&&k==='trakea')||(sel==='trakea'&&k==='brons')) mt.emissive.setHex(0x0e8f7e).multiplyScalar(0.45); }
    if(sel==='plevra') for(const k of LOBES) if(mats[k]){ mats[k].uniforms.uR.value.setHex(0x14b8a6); } else {}
    if(sel!=='plevra') for(const k of LOBES) if(mats[k]) mats[k].uniforms.uR.value.setHex(0xffe6ea);
  }
  const FOC={rul:[-2,2.2,0],rml:[-2.2,-0.3,1],rll:[-2.2,-0.9,-0.6],lul:[1.2,1.6,0.2],lll:[1.4,-0.9,-0.6],trakea:[-0.55,2.6,-0.6],brons:[-0.4,0.8,-0.5],pa:[-0.2,0.6,-0.5],pv:[-0.2,0.2,-0.6],diyafram:[-0.5,-1.6,0],kalp:[0,0,0],plevra:[-0.45,0.35,-0.3]};
  let fly=null;
  function flyTo(t,dist){ const tgt=V(...t), dir=cam.position.clone().sub(ctl.target).normalize(); fly={a:cam.position.clone(),at:ctl.target.clone(),b:tgt.clone().add(dir.multiplyScalar(dist)),bt:tgt,t:0}; }

  /* ---------- tıklama ---------- */
  const ray=new T.Raycaster(), ptr=new T.Vector2(); let down=null, hov=null;
  function hit(e){ const r=renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ptr,cam);
    const list=[...LOBES,'trakea','brons','pa','pv','diyafram'].map(k=>M[k]).filter(Boolean);
    const hs=ray.intersectObjects(list,false); if(!hs.length) return null;
    if(xray){ const inner=hs.find(h=>!LOBES.includes(h.object.userData.id)&&h.object.userData.id!=='diyafram'); if(inner) return inner.object.userData.id; }
    return hs[0].object.userData.id; }
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{ if(!down) return; const d=Math.hypot(e.clientX-down.x,e.clientY-down.y); down=null; if(d>5) return; const id=hit(e); if(opts.onPick) opts.onPick(id); });
  renderer.domElement.addEventListener('pointermove',e=>{ if(e.buttons) return; const id=hit(e); if(id!==hov){ hov=id; renderer.domElement.style.cursor=id?'pointer':''; } if(opts.onHover) opts.onHover(id,e.clientX,e.clientY); });
  renderer.domElement.addEventListener('pointerleave',()=>{ hov=null; if(opts.onHover) opts.onHover(null); });

  /* ---------- döngü ---------- */
  let W=0,H=0, running=true, raf=0;
  function size(){ const r=container.getBoundingClientRect(); const w=Math.max(1,r.width|0), h=Math.max(1,r.height|0); if(w===W&&h===H) return; W=w; H=h; renderer.setSize(w,h,false); cam.aspect=w/h; cam.fov=w/h<0.8?44:32; cam.updateProjectionMatrix(); }
  function frame(now){
    raf=requestAnimationFrame(frame); if(!running) return; size();
    const t=(now-t0)/1000;
    if(fly){ fly.t=Math.min(1,fly.t+0.025); const e=fly.t<.5?2*fly.t*fly.t:1-Math.pow(-2*fly.t+2,2)/2; cam.position.lerpVectors(fly.a,fly.b,e); ctl.target.lerpVectors(fly.at,fly.bt,e); if(fly.t>=1) fly=null; }
    ctl.update();
    // solunum: dışarıdan faz verilirse (ses ile eşleşik) onu kullan
    const ph=opts.phase?opts.phase():null;
    breath=breathOn?(ph!=null?ph:0.5-0.5*Math.cos(t*2*Math.PI/4)):0;
    const k=1+0.035*breath; root.scale.set(1+0.012*breath,k,1+0.02*breath);
    for(const kk of LOBES) if(mats[kk]) mats[kk].uniforms.uT.value=t;
    renderer.render(scene,cam);
  }
  raf=requestAnimationFrame(frame);
  const api={
    canvas:renderer.domElement,
    get ready(){ return ready; },
    setFx(list){ fx=list||[]; applyFx(); },
    select(id,doFly){ sel=id||null; applySel(); if(id&&doFly!==false&&FOC[id]) flyTo(FOC[id],id==='plevra'||id==='kalp'?15:LOBES.includes(id)?10.5:11); },
    setXray(b){ xray=!!b; applySel(); },
    setBreath(b){ breathOn=!!b; },
    home(){ fly={a:cam.position.clone(),at:ctl.target.clone(),b:HOME.p.clone(),bt:HOME.t.clone(),t:0}; },
    view(v){ const d=cam.position.distanceTo(ctl.target); const t=ctl.target.clone(); const dir=v==='lat'?V(-1,0.05,0):v==='post'?V(0,0.05,-1):V(0.02,0.05,1); fly={a:cam.position.clone(),at:t.clone(),b:t.clone().add(dir.normalize().multiplyScalar(d)),bt:t,t:0}; },
    project(p){ const v=V(p[0],p[1],p[2]).applyMatrix4(root.matrixWorld).project(cam); return {x:(v.x+1)/2*W,y:(1-v.y)/2*H,vis:v.z<1}; },
    pause(b){ running=!b; },
    resize(){ W=0; size(); }
  };
  return api;
}
window.KalpLung3D={create,HIL};
})();
