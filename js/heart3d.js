/* Kalp Simülatörü: gerçek anatomik kalp modeli (BodyParts3D'den türetilmiş GLB) üzerinde
   uyarı yayılımı, kasılma, ileti sistemi ve duruma özel 3D efektler.
   Model eksenleri: +x hastanın solu (izleyicinin sağı), +y yukarı, +z ön.
   İleti sistemi ve sinirlerin modeldeki yeri yaklaşık (şematik) olarak hesaplanır. */
(function(){
'use strict';
const T=window.THREE;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const VA=a=>V(a[0],a[1],a[2]);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

const MUSCLE=['ra','la','ias','rv','lv','ivs','pap'];
const ATRIAL={ra:1,la:1,ias:1};
const VENT_GROUP=['rv','lv','ivs','pap','tri','mit','rca','lad','lcx','cv'];
const ATR_GROUP=['ra','la','ias'];
const KIND_OF={ra:'kas',la:'kas',ias:'kas',rv:'kas',lv:'kas',ivs:'kas',pap:'kas',tri:'kapak',mit:'kapak',pulv:'kapak',aorta:'damar',pt:'damar',pvn:'damar',svc:'damar',ivc:'damar',rca:'damar',lad:'damar',lcx:'damar',cv:'damar'};
const BASE_HEX={ra:0x7a2730,la:0x76262e,ias:0x652026,rv:0x641a21,lv:0x5f171e,ivs:0x58161c,pap:0x6a1e26};
const VESSEL_HEX={aorta:0xb8323d,pt:0x3c5aa8,pvn:0xb03a46,svc:0x3a56a0,ivc:0x3a56a0,rca:0xd8414a,lad:0xd8414a,lcx:0xd8414a,cv:0x5a5fb4,tri:0xe6d8c0,mit:0xe6d8c0,pulv:0xe6d8c0};

async function fetchModel(url){
  const r=await fetch(url); if(!r.ok) throw new Error('Model indirilemedi ('+r.status+')');
  if(/\.txt$/.test(url)){ // base64 kopya (yalnızca .glb sunulamayan ortamlar için)
    const bin=atob((await r.text()).trim()), u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    return u.buffer;
  }
  return r.arrayBuffer();
}
async function loadGLB(urls){
  let buf=null, err=null;
  for(const u of [].concat(urls)){ try{ buf=await fetchModel(u); break; }catch(e){ err=e; } }
  if(!buf) throw err||new Error('Model bulunamadı');
  return new Promise((res,rej)=>new T.GLTFLoader().parse(buf,'',res,rej));
}

function create(el,opts){
  opts=opts||{};
  if(T.ColorManagement) T.ColorManagement.legacyMode=false;
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:!!opts.preserve});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=0.95;
  el.appendChild(renderer.domElement);
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(30,1,0.1,100);
  const HOME={pos:V(1.6,1.0,10.8),target:V(0.05,0.3,0)};
  camera.position.copy(HOME.pos);
  const controls=new T.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=0.08; controls.target.copy(HOME.target);
  controls.minDistance=3.5; controls.maxDistance=18; controls.rotateSpeed=0.8;

  scene.add(new T.HemisphereLight(0xffeeea,0x22161a,0.95));
  const key=new T.DirectionalLight(0xfff1e8,1.9); key.position.set(3,5,7); scene.add(key);
  const rim=new T.DirectionalLight(0x9db8ff,1.1); rim.position.set(-6,2,-6); scene.add(rim);
  const fill=new T.DirectionalLight(0xffc7b8,0.5); fill.position.set(-4,-3,4); scene.add(fill);
  // kamerayla dönen hafif ışık: hangi açıdan bakılırsa bakılsın model aydınlık kalır
  const head=new T.DirectionalLight(0xffffff,0.4); camera.add(head); head.position.set(0,0,1); scene.add(camera);

  const H=new T.Group(); scene.add(H);           // tüm kalp (tamponad salınımı)
  const AG=new T.Group(), VG=new T.Group(), SG=new T.Group();
  AG.matrixAutoUpdate=false; VG.matrixAutoUpdate=false;
  H.add(AG,VG,SG);

  const state={mode:'anatomi',xray:false,selected:null,off:[],nerveOn:[],key:'nsr',cond:null,fx:{},layers:{vessels:true,cond:true,nerves:true},parts:{},focus:'none',others:1};
  const api={canvas:renderer.domElement,ready:false};
  let R=null; // modele bağlı her şey burada

  /* ---------- Tıklama / üzerine gelme ---------- */
  const ray=new T.Raycaster(), ndc=new T.Vector2();
  function pickAt(cx,cy){
    if(!R) return null;
    const r=renderer.domElement.getBoundingClientRect();
    ndc.set(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc,camera);
    const vis=R.pickables.filter(o=>{let p=o; while(p){if(!p.visible)return false; p=p.parent;} return true;});
    const hits=ray.intersectObjects(vis,false);
    if(!hits.length) return null;
    let h=hits[0];
    if(state.xray){const pri=hits.find(x=>{const k=x.object.userData.kind; return k==='ileti'||k==='sinir';}); if(pri) h=pri;}
    return {id:subId(h.object,h.face&&h.face.a),obj:h.object,local:h.object.worldToLocal(h.point.clone())};
  }
  function subId(obj,vi){
    const id=obj.userData.id, rg=R&&R.regions[id];
    if(rg&&vi!=null) return rg.names[rg.reg[vi]]||id;
    return id;
  }
  let down=null, hoverReq=null, pin=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){ const pk=pickAt(e.clientX,e.clientY); pin=pk; opts.onPick&&opts.onPick(pk?pk.id:null); }
    down=null;
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||e.buttons){opts.onHover&&opts.onHover(null); return;}
    hoverReq={x:e.clientX,y:e.clientY};
  });
  renderer.domElement.addEventListener('pointerleave',()=>{hoverReq=null; opts.onHover&&opts.onHover(null);});

  const inset={t:0,l:0,r:0,b:0};
  function resize(){
    const w=el.clientWidth, h=el.clientHeight; if(!w||!h) return;
    renderer.setSize(w,h,false); camera.aspect=w/h;
    const fw=Math.max(200,w-inset.l-inset.r), fh=Math.max(200,h-inset.t-inset.b);
    camera.fov = fw/fh<0.9 ? 44 : 30;
    // boş alanın ortasını görüntünün merkezine kaydır
    const dx=(inset.l-inset.r)/2, dy=(inset.t-inset.b)/2;
    if(dx||dy) camera.setViewOffset(w,h,-dx,-dy,w,h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  if(window.ResizeObserver) new ResizeObserver(resize).observe(el); else window.addEventListener('resize',resize);
  resize();

  loadGLB(opts.modelUrl||'assets/heart.glb').then(g=>{
    R=build(g);
    api.ready=true; applyStatic();
    if(state.pendingLearn){ buildLearn(state.pendingLearn); LG.visible=true; state.pendingLearn=null; }
    opts.onReady&&opts.onReady();
  }).catch(err=>{console.error(err); opts.onError&&opts.onError(err);});

  /* =====================================================================
     Model kurulumu
     ===================================================================== */
  function build(gltf){
    const lm=(gltf.scene.userData&&gltf.scene.userData.landmarks)||{};
    const L={}; for(const k in lm) L[k]=VA(lm[k]);
    gltf.scene.updateMatrixWorld(true);
    const geos={};
    gltf.scene.traverse(o=>{
      if(!o.isMesh) return;
      const name=KIND_OF[o.name]?o.name:(o.parent&&o.parent.name);
      const g=o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      if(!g.attributes.normal) g.computeVertexNormals();
      geos[name]=g;
    });

    const byId={}, pickables=[], meshes={};
    function reg(id,mesh,pick,kind){
      (byId[id]||(byId[id]={meshes:[],kind})).meshes.push(mesh);
      mesh.userData.id=id; mesh.userData.kind=kind;
      const pk=pick||mesh; pk.userData.id=id; pk.userData.kind=kind; pickables.push(pk);
    }

    /* --- Kaslar: köşe renkli fiziksel malzeme --- */
    const muscles=[];
    const tmpC=new T.Color();
    for(const id of MUSCLE){
      const geo=geos[id]; if(!geo) continue;
      const n=geo.attributes.position.count;
      const col=new Float32Array(n*3), base=new Float32Array(n*3);
      const p=geo.attributes.position.array;
      tmpC.setHex(BASE_HEX[id]);
      for(let i=0;i<n;i++){
        const x=p[3*i],y=p[3*i+1],z=p[3*i+2];
        // ince doku: hafif renk dalgalanması (kas lifleri ve yağ dokusu izlenimi)
        const v=0.9+0.07*Math.sin(x*9.1+y*4.3)*Math.sin(y*7.7-z*5.9)+0.05*Math.sin(z*13.1+x*6.7+y*2.1);
        base[3*i]=tmpC.r*v; base[3*i+1]=tmpC.g*v; base[3*i+2]=tmpC.b*v*0.97;
      }
      col.set(base);
      geo.setAttribute('color',new T.BufferAttribute(col,3));
      const mat=new T.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,roughness:0.52,metalness:0,clearcoat:0.35,clearcoatRoughness:0.4,sheen:0.25,sheenColor:new T.Color(0xff6060),sheenRoughness:0.55,side:T.DoubleSide});
      const mesh=new T.Mesh(geo,mat);
      (ATRIAL[id]?AG:VG).add(mesh); reg(id,mesh,null,'kas'); meshes[id]=mesh;
      muscles.push({id,mesh,geo,n,pos:p,col,base,cur:new Float32Array(base),atr:!!ATRIAL[id],maps:{},inf:new Float32Array(n),scar:new Float32Array(n),h:new Float32Array(n)});
    }
    /* --- Damarlar ve kapaklar --- */
    const vessels=[], valves=[];
    for(const id in VESSEL_HEX){
      const geo=geos[id]; if(!geo) continue;
      const isValve=KIND_OF[id]==='kapak';
      const nv=geo.attributes.position.count, vb=new Float32Array(nv*3); tmpC.setHex(VESSEL_HEX[id]);
      for(let i=0;i<nv;i++){vb[3*i]=tmpC.r;vb[3*i+1]=tmpC.g;vb[3*i+2]=tmpC.b;}
      geo.setAttribute('color',new T.BufferAttribute(new Float32Array(vb),3));
      const mat=isValve?new T.MeshStandardMaterial({vertexColors:true,color:0xffffff,roughness:0.65,side:T.DoubleSide})
        :new T.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,roughness:0.38,clearcoat:0.6,clearcoatRoughness:0.3,side:T.DoubleSide});
      const mesh=new T.Mesh(geo,mat); mesh.userData.vbase=vb;
      (VENT_GROUP.includes(id)?VG:SG).add(mesh); reg(id,mesh,null,KIND_OF[id]); meshes[id]=mesh;
      (isValve?valves:vessels).push(mesh);
    }
    H.updateMatrixWorld(true);

    /* --- Yer işaretleri ve eksenler --- */
    const centroid=(id)=>{const p=geos[id].attributes.position.array,c=V(0,0,0);let k=0;for(let i=0;i<p.length;i+=3){c.x+=p[i];c.y+=p[i+1];c.z+=p[i+2];k++;}return c.multiplyScalar(1/k);};
    const base=L.base||V(0,-0.3,-0.1), apex=L.apex||V(1.2,-0.94,0.95);
    const triC=L.tri||centroid('tri'), mitC=L.mit||centroid('mit');
    const n=apex.clone().sub(base); const axLen=n.length(); n.normalize();          // tabandan tepeye
    const rvC=centroid('rv'), lvC=centroid('lv'), ivsC=centroid('ivs');
    const m=lvC.clone().sub(rvC); m.addScaledVector(n,-m.dot(n)).normalize();      // sağdan sola (septuma dik)
    const ant=V(0,0,1); ant.addScaledVector(n,-ant.dot(n)).addScaledVector(m,-ant.dot(m)).normalize();
    function nearest(ids,p,filter){
      let best=null,bd=1e9;
      for(const id of ids){const a=geos[id].attributes.position.array; for(let i=0;i<a.length;i+=3){if(filter&&!filter(a[i],a[i+1],a[i+2]))continue; const d=(a[i]-p.x)**2+(a[i+1]-p.y)**2+(a[i+2]-p.z)**2; if(d<bd){bd=d;best=V(a[i],a[i+1],a[i+2]);}}}
      return best||p.clone();
    }
    const rc=new T.Raycaster();
    const castMeshes=ids=>ids.map(i=>meshes[i]).filter(Boolean);
    function cast(origin,dir,ids,minD,maxD){
      rc.set(origin,dir.clone().normalize()); rc.near=minD||0; rc.far=maxD||10;
      const h=rc.intersectObjects(castMeshes(ids),false)[0]; return h?h.point.clone():null;
    }
    function epi(p,off,ids){ // dış yüzeye izdüşüm
      const c=V(0.25,-0.2,0.1), d=p.clone().sub(c).normalize();
      const h=cast(c.clone().addScaledVector(d,6),d.clone().negate(),ids||['lv','rv','ra','la','ivs']);
      return h?h.addScaledVector(d,off||0.04):p.clone();
    }
    const perp=(a)=>{const u=Math.abs(a.y)<0.9?V(0,1,0):V(1,0,0); u.addScaledVector(a,-u.dot(a)).normalize(); return [u,V().crossVectors(a,u).normalize()];};
    const [nu,nw]=perp(n);

    // Ventrikül yüksekliği (0 taban, 1 tepe)
    for(const M of muscles){ for(let i=0;i<M.n;i++){ const x=M.pos[3*i]-base.x,y=M.pos[3*i+1]-base.y,z=M.pos[3*i+2]-base.z; M.h[i]=clamp((x*n.x+y*n.y+z*n.z)/axLen,0,1); } }

    /* İleti sistemi noktaları */
    const SA=nearest(['ra'],L.svc_low?L.svc_low.clone().add(V(0.05,-0.12,0.25)):V(-0.9,1.0,0));
    const raC=centroid('ra'), laC=centroid('la');
    SA.addScaledVector(SA.clone().sub(raC).normalize(),0.03);
    const AVN=nearest(['ias','ivs'],triC.clone().lerp(mitC,0.32).addScaledVector(n,-0.05)).addScaledVector(m,-0.05);
    const lvTop=mitC.clone().lerp(apex,0.12), lvBot=apex.clone().addScaledVector(n,-0.28);
    const lvAx=s=>lvTop.clone().lerp(lvBot,s);
    const rvApex=nearest(['rv'],apex.clone().addScaledVector(m,-0.9).addScaledVector(n,-0.15));
    const rvTop=triC.clone().lerp(rvApex,0.12), rvBot=rvApex.clone().lerp(triC,0.2);
    const rvAx=s=>rvTop.clone().lerp(rvBot,s);
    const LVW=['lv','ivs'], RVW=['rv','ivs'];
    function endo(c,dir,ids,inset){const h=cast(c,dir,ids,0.04,1.3); return h?h.addScaledVector(dir.clone().normalize(),-(inset||0.035)):null;}
    const LBE=endo(lvAx(0.18),m.clone().negate(),LVW)||lvAx(0.18).addScaledVector(m,-0.3);
    const HE=AVN.clone().lerp(LBE,0.55).addScaledVector(n,0.06);
    const rbbPts=[HE];
    [0.25,0.5,0.72].forEach(s=>{const p=endo(rvAx(s),m,RVW); if(p) rbbPts.push(p);});
    const modStart=rbbPts[rbbPts.length-1];
    const modEnd=endo(modStart.clone().addScaledVector(m,-0.06),m.clone().negate(),['rv'])||modStart.clone().addScaledVector(m,-0.5);
    const dirLAF=ant.clone().multiplyScalar(0.9).addScaledVector(m,0.5).normalize();
    const dirLPF=ant.clone().multiplyScalar(-0.9).addScaledVector(m,0.5).normalize();
    const LAFe=endo(lvAx(0.6),dirLAF,LVW)||lvAx(0.6).addScaledVector(dirLAF,0.4);
    const LPFe=endo(lvAx(0.65),dirLPF,LVW)||lvAx(0.65).addScaledVector(dirLPF,0.4);
    const rvSept=endo(rvAx(0.45),m,RVW)||ivsC.clone().addScaledVector(m,-0.2);
    const lvSept=endo(lvAx(0.45),m.clone().negate(),LVW)||ivsC.clone().addScaledVector(m,0.2);
    const rvApexEndo=endo(rvAx(0.85),rvApex.clone().sub(rvAx(0.85)).normalize(),['rv','ivs'])||rvApex.clone();
    // Aksesuar yol (WPW): sol lateral mitral halka
    const mitLat=mitC.clone().addScaledVector(m,0.55);
    const apL=nearest(['la'],mitLat.clone().addScaledVector(n,-0.15)), apV=nearest(['lv'],mitLat.clone().addScaledVector(n,0.18));
    // Odaklar
    const pvcFocus=nearest(['rv'],(L.pulv||triC).clone().addScaledVector(n,0.35));

    /* --- Alt bölgeler: tıklanan noktanın adı (dallar, aurikulalar, arkus...) --- */
    const feat=(x,y,z)=>{const dx=x-base.x,dy=y-base.y,dz=z-base.z,ix=x-ivsC.x,iy=y-ivsC.y,iz=z-ivsC.z; return [(dx*n.x+dy*n.y+dz*n.z)/axLen, ix*m.x+iy*m.y+iz*m.z, ix*ant.x+iy*ant.y+iz*ant.z];};
    function components(geo){ // bağlı parçalar (union-find)
      const cnt=geo.attributes.position.count, par=new Int32Array(cnt); for(let i=0;i<cnt;i++) par[i]=i;
      const f=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a];}return a;};
      const idx=geo.index?geo.index.array:null, nt=idx?idx.length:cnt;
      for(let i=0;i<nt;i+=3){const a=f(idx?idx[i]:i),b=f(idx?idx[i+1]:i+1),c=f(idx?idx[i+2]:i+2); par[b]=a; par[f(c)]=a;}
      const root=new Int32Array(cnt); for(let i=0;i<cnt;i++) root[i]=f(i); return root;
    }
    const pulvP=L.pulv||triC;
    const RULE={
      rca:(x,y,z,h,ds,a)=>h<0.06?'rca':(a>0.5&&h<0.4)?'conus':(a<-0.75&&ds>-0.6&&ds<0.3)?'pda':(ds>=0.3&&a<-0.6)?'rpl':'am',
      lad:(x,y,z,h,ds,a)=>{ if(h<-0.03) return 'lmca'; const g=Math.max(-0.35,0.25-0.75*h); return Math.abs(ds-g)<0.2?'lad':ds>g?'diag':'ladrv'; },
      lcx:(x,y,z,h)=>h<0.15?'lcx':'om',
      cv:(x,y,z,h,ds,a)=>(h<0.1&&a<-0.4&&ds>-0.45)?'cs':ds<-0.35?'scv':(Math.abs(ds)<0.4&&a<-0.55)?'mcv':(ds>0.3&&a<-0.45)?'lpv':(a>-0.1&&(Math.abs(ds)<0.35||h<0.15))?'gcv':'lmv',
      ra:(x,y,z)=>(z>0.55&&y>0.15)?'raa':'ra',
      la:(x,y,z)=>(x>0.45&&z>-0.15)?'laa':'la',
      rv:(x,y,z)=>Math.hypot(x-pulvP.x,y-pulvP.y,z-pulvP.z)<0.6?'rvot':'rv',
      lv:(x,y,z,h)=>h>0.86?'apex':'lv',
      aorta:(x,y,z)=>y>=1.62?'arch':z<-0.85?'adesc':y<0.75?'aroot':'aasc',
      pt:(x)=>x<-0.3?'rpa':x>0.42?'lpa':'pt'
    };
    const regions={}; // meshId -> {names:[], reg:Uint8Array}
    function setRegions(id,fn){
      const geo=geos[id]; if(!geo) return; const a=geo.attributes.position.array, cnt=a.length/3, names=[], reg=new Uint8Array(cnt);
      for(let i=0;i<cnt;i++){const x=a[3*i],y=a[3*i+1],z=a[3*i+2]; const [h,ds,an]=feat(x,y,z); const nm=fn(x,y,z,h,ds,an,i); let k=names.indexOf(nm); if(k<0){k=names.length;names.push(nm);} reg[i]=k;}
      regions[id]={names,reg};
    }
    for(const id in RULE) setRegions(id,RULE[id]);
    { // pulmoner venler: 4 ana parça, sağ/sol ve üst/alt
      const geo=geos.pvn; if(geo){ const a=geo.attributes.position.array, root=components(geo), st={};
        for(let i=0;i<root.length;i++){const r=root[i]; (st[r]||(st[r]={n:0,x:0,y:0,z:0})); st[r].n++; st[r].x+=a[3*i]; st[r].y+=a[3*i+1]; st[r].z+=a[3*i+2];}
        const big=Object.entries(st).filter(([,v])=>v.n>=40).map(([r,v])=>({r:+r,x:v.x/v.n,y:v.y/v.n,z:v.z/v.n}));
        ['r','l'].forEach(sd=>{const g=big.filter(b=>sd==='r'?b.x<0:b.x>=0).sort((p,q)=>q.y-p.y); g.forEach((b,i)=>b.nm=(sd==='r'?'r':'l')+(i===0?'spv':'ipv'));});
        const byR={}; big.forEach(b=>byR[b.r]=b);
        setRegions('pvn',(x,y,z,h,ds,an,i)=>{const b=byR[root[i]]; if(b) return b.nm; let best=big[0],bd=1e9; for(const c of big){const d=(c.x-x)**2+(c.y-y)**2+(c.z-z)**2; if(d<bd){bd=d;best=c;}} return best.nm;});
      }
    }
    // Her alt bölge için etiket noktası
    const anchors=[];
    const hc=V(0.2,0.1,0);
    for(const id in regions){
      const {names,reg}=regions[id], a=geos[id].attributes.position.array;
      names.forEach((nm,k)=>{
        let c=V(0,0,0),cnt=0; for(let i=0;i<reg.length;i++) if(reg[i]===k){c.x+=a[3*i];c.y+=a[3*i+1];c.z+=a[3*i+2];cnt++;}
        if(cnt<20) return; c.multiplyScalar(1/cnt);
        // yüzeyde, merkezden en dışarıda kalan bölge noktalarına yakın olanı seç
        let best=null,bs=-1e9; for(let i=0;i<reg.length;i++){ if(reg[i]!==k) continue; const p=V(a[3*i],a[3*i+1],a[3*i+2]); const sc=-p.distanceTo(c)*2+p.distanceTo(hc)*0.6; if(sc>bs){bs=sc;best=p;} }
        anchors.push({id:nm,obj:meshes[id],p:best,out:best.clone().sub(hc).normalize(),inner:false});
      });
    }
    ['svc','ivc','tri','mit','pulv','ias','ivs','pap'].forEach(id=>{ if(!geos[id]) return; const c=centroid(id); const p=nearest([id],c.clone().addScaledVector(c.clone().sub(hc).normalize(),2)); anchors.push({id,obj:meshes[id],p,out:p.clone().sub(hc).normalize(),inner:['tri','mit','ias','ivs','pap'].includes(id)}); });

    /* --- Koroner alanları --- */
    const corSamples=[];
    ['rca','lad','lcx'].forEach((id,ti)=>{const a=geos[id].attributes.position.array, step=Math.max(1,Math.floor(a.length/3/500)); for(let i=0;i<a.length/3;i+=step) corSamples.push([a[3*i],a[3*i+1],a[3*i+2],ti]);});
    for(const M of muscles){
      if(M.atr) continue;
      M.terr=new Int8Array(M.n); M.tdist=new Float32Array(M.n);
      for(let i=0;i<M.n;i++){
        const x=M.pos[3*i],y=M.pos[3*i+1],z=M.pos[3*i+2]; let bd=1e9,bt=0;
        for(const s of corSamples){const d=(s[0]-x)**2+(s[1]-y)**2+(s[2]-z)**2; if(d<bd){bd=d;bt=s[3];}}
        M.terr[i]=bt; M.tdist[i]=Math.sqrt(bd);
      }
    }
    // VT: sirkumfleks alanında eski skar, odak skar kenarında
    let scarC=V(0,0,0),sk=0;
    for(const M of muscles){ if(M.atr||M.id==='pap') continue; for(let i=0;i<M.n;i++){ if(M.terr[i]===2&&M.h[i]>0.32&&M.h[i]<0.78){ const s=sstep(0.55,0.25,M.tdist[i]); M.scar[i]=s; if(s>0.5){scarC.x+=M.pos[3*i];scarC.y+=M.pos[3*i+1];scarC.z+=M.pos[3*i+2];sk++;} } } }
    if(sk) scarC.multiplyScalar(1/sk);
    const vtFocus=nearest(['lv'],scarC.clone().addScaledVector(n,-0.25));
    // Tıkanma noktaları (enfarktüs)
    const proxOf=id=>{const a=geos[id].attributes.position.array; let best=null,bh=1e9; const tgt=id==='lad'?L.aorta_root||base:base; for(let i=0;i<a.length;i+=3){const p=V(a[i],a[i+1],a[i+2]); const h=p.clone().sub(base).dot(n); const d=p.distanceTo(tgt); const sc=id==='lad'?d+(h<0.15?2:0):h+(p.distanceTo(tgt)>1.4?3:0); if(sc<bh){bh=sc;best=p;}} return best;};
    const occl={lad:nearest(['lad'],lvTop.clone().addScaledVector(ant,1.0).addScaledVector(n,0.45)),rca:nearest(['rca'],triC.clone().addScaledVector(ant,0.9).addScaledVector(m,-0.6).addScaledVector(n,0.2))};
    void proxOf;

    /* --- Aktivasyon haritaları (saniye, olay başlangıcından itibaren) --- */
    function distMap(M,pt,scale,off){const o=new Float32Array(M.n); for(let i=0;i<M.n;i++){const dx=M.pos[3*i]-pt.x,dy=M.pos[3*i+1]-pt.y,dz=M.pos[3*i+2]-pt.z; o[i]=(off||0)+Math.sqrt(dx*dx+dy*dy+dz*dz)*scale;} return o;}
    const ventM=muscles.filter(M=>!M.atr), atrM=muscles.filter(M=>M.atr);
    function maxDist(list,pt){let d=0; for(const M of list) for(let i=0;i<M.n;i++){d=Math.max(d,Math.hypot(M.pos[3*i]-pt.x,M.pos[3*i+1]-pt.y,M.pos[3*i+2]-pt.z));} return d;}
    const normalT=(M,i)=>{const h=M.h[i]; let t=0.012+0.048*Math.pow(1-h,1.15); if(M.id==='ivs') t-=0.01; if(M.id==='pap') t=0.018; if(M.id==='lv'&&h<0.25) t+=0.012; return Math.max(0,t);};
    const focusScale={};
    function mapFor(M,key){
      if(M.maps[key]) return M.maps[key];
      let o;
      if(M.atr){
        if(key==='retro'){const k=0.075/(focusScale.retro||(focusScale.retro=maxDist(atrM,AVN))); o=distMap(M,AVN,k);}
        else {const k=0.09/(focusScale.sa||(focusScale.sa=maxDist(atrM,SA))); o=distMap(M,SA,k);}
        return (M.maps[key]=o);
      }
      o=new Float32Array(M.n);
      if(key==='normal'||key==='slow'){ for(let i=0;i<M.n;i++) o[i]=normalT(M,i)*(key==='slow'?1.7:1); }
      else if(key==='lbbb'){
        const k=0.12/(focusScale.lb||(focusScale.lb=maxDist(ventM.filter(x=>x.id!=='rv'),rvSept)));
        for(let i=0;i<M.n;i++){ if(M.id==='rv') o[i]=normalT(M,i); else o[i]=0.022+Math.hypot(M.pos[3*i]-rvSept.x,M.pos[3*i+1]-rvSept.y,M.pos[3*i+2]-rvSept.z)*k; }
      } else if(key==='rbbb'){
        const k=0.1/(focusScale.rb||(focusScale.rb=maxDist(ventM.filter(x=>x.id==='rv'),lvSept)));
        for(let i=0;i<M.n;i++){ if(M.id==='rv') o[i]=0.035+Math.hypot(M.pos[3*i]-lvSept.x,M.pos[3*i+1]-lvSept.y,M.pos[3*i+2]-lvSept.z)*k; else o[i]=normalT(M,i); }
      } else if(key==='wpw'){
        const k=0.13/(focusScale.ap||(focusScale.ap=maxDist(ventM,apV)));
        for(let i=0;i<M.n;i++){ o[i]=Math.min(normalT(M,i)+0.05,Math.hypot(M.pos[3*i]-apV.x,M.pos[3*i+1]-apV.y,M.pos[3*i+2]-apV.z)*k); }
      } else {
        const pt=key==='vt'?vtFocus:key==='paced'?rvApexEndo:key==='tdp1'?LAFe:key==='tdp2'?LPFe:pvcFocus;
        const sk2='f_'+key, k=0.14/(focusScale[sk2]||(focusScale[sk2]=maxDist(ventM,pt)));
        o=distMap(M,pt,k);
      }
      return (M.maps[key]=o);
    }

    /* --- Malzemeler (ileti, sinir) --- */
    const condMat=()=>new T.MeshStandardMaterial({color:0xffd60a,emissive:0xffb400,emissiveIntensity:0.6,roughness:0.35});
    const pulseMat=()=>new T.MeshBasicMaterial({color:0xffc800,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false});
    const hitMat=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:0});
    const condItems=[], nerveMeshes=[];
    const CG=new T.Group(), CV=new T.Group(); AG.add(CG); VG.add(CV);
    function condTube(id,pts,r,parent){
      const c=new T.CatmullRomCurve3(pts.map(p=>p.clone()));
      const seg=Math.max(16,Math.round(c.getLength()*48));
      const mesh=new T.Mesh(new T.TubeGeometry(c,seg,r,10,false),condMat()); mesh.renderOrder=2; parent.add(mesh);
      const pm=new T.Mesh(new T.TubeGeometry(c,seg,r*(id==='purk'?1.6:2.1),10,false),pulseMat()); pm.visible=false; pm.renderOrder=3; parent.add(pm);
      const hit=new T.Mesh(new T.TubeGeometry(c,Math.max(8,seg>>1),Math.max(r*3,0.09),6,false),hitMat); parent.add(hit);
      reg(id,mesh,hit,'ileti'); condItems.push({id,mesh,pulse:pm,seg,rad:10,type:'tube',gain:id==='purk'?0.55:1}); return c;
    }
    function condNode(id,pos,s,parent){
      const mesh=new T.Mesh(new T.SphereGeometry(1,24,16),condMat()); mesh.position.copy(pos); mesh.scale.setScalar(s); mesh.renderOrder=2; parent.add(mesh);
      const pm=new T.Mesh(new T.SphereGeometry(1,24,16),pulseMat()); pm.position.copy(pos); pm.visible=false; pm.renderOrder=3; parent.add(pm);
      const hit=new T.Mesh(new T.SphereGeometry(Math.max(0.2,s*2),12,8),hitMat); hit.position.copy(pos); parent.add(hit);
      reg(id,mesh,hit,'ileti'); condItems.push({id,mesh,pulse:pm,base:s,type:'node'});
    }
    const onRA=(p,k)=>{const q=nearest(['ra','ias'],p); return q.addScaledVector(raC.clone().sub(q).normalize(),k==null?0.05:k);};
    condNode('sa',SA,0.075,CG);
    condNode('avn',AVN,0.07,CG);
    const raAnt=onRA(SA.clone().lerp(AVN,0.5).addScaledVector(ant,0.35));
    const raMid=onRA(SA.clone().lerp(AVN,0.5));
    const raPost=onRA(SA.clone().lerp(AVN,0.5).addScaledVector(ant,-0.4));
    condTube('int',[SA,raAnt,AVN],0.026,CG);
    condTube('int',[SA,raMid,AVN],0.026,CG);
    condTube('int',[SA,raPost,AVN],0.026,CG);
    const iasTop=nearest(['ias'],SA.clone().lerp(laC,0.5).addScaledVector(V(0,1,0),0.5));
    const laTip=nearest(['la'],laC.clone().addScaledVector(m,0.9).addScaledVector(ant,0.4).addScaledVector(V(0,1,0),0.2));
    condTube('bach',[SA,iasTop.clone().addScaledVector(V(0,1,0),0.02),laC.clone().lerp(laTip,0.6).addScaledVector(V(0,1,0),0.25),laTip],0.032,CG);
    condTube('his',[AVN,AVN.clone().lerp(HE,0.5).addScaledVector(n,-0.03),HE],0.038,CV);
    condTube('rbb',rbbPts,0.028,CV);
    condTube('rbb',[modStart,modStart.clone().lerp(modEnd,0.5).addScaledVector(n,0.05),modEnd],0.026,CV);
    condTube('lbb',[HE,HE.clone().lerp(LBE,0.5),LBE],0.044,CV);
    condTube('laf',[LBE,LBE.clone().lerp(LAFe,0.5).addScaledVector(dirLAF,0.08),LAFe],0.03,CV);
    condTube('lpf',[LBE,LBE.clone().lerp(LPFe,0.5).addScaledVector(dirLPF,0.08),LPFe],0.032,CV);
    // Purkinje ağı: endokard altında meridyenler + küçük dallar
    function purk(ax,ids,angles,ss){
      angles.forEach(deg=>{
        const th=deg*Math.PI/180;
        const pts=[];
        ss.forEach(s=>{const c=ax(s); const [u,w]=perp(n); const d=u.clone().multiplyScalar(Math.cos(th)).addScaledVector(w,Math.sin(th)); const p=endo(c,d,ids,0.03); if(p) pts.push(p);});
        if(pts.length<2) return;
        const c=condTube('purk',pts,0.013,CV);
        [0.35,0.7].forEach(u=>{
          const p=c.getPoint(u), td=c.getTangent(u), side=V().crossVectors(td,n).normalize();
          [1,-1].forEach(sg=>condTube('purk',[p,p.clone().addScaledVector(side,0.13*sg).addScaledVector(td,0.06)],0.01,CV));
        });
      });
    }
    purk(lvAx,LVW,[0,45,90,135,180,225,270,315],[0.3,0.48,0.66,0.84,0.97]);
    purk(rvAx,RVW,[0,60,120,180,240,300],[0.35,0.6,0.85]);
    // Aksesuar yol
    const apItem=condTube('ap',[apL,apL.clone().lerp(apV,0.5).addScaledVector(m,0.07),apV],0.036,CG);
    void apItem;
    const apMeshes=byId.ap.meshes;

    /* --- Otonom sinirler (kesikli) --- */
    const nerveMat={vagus:condMat(),symp:condMat()};
    function nerve(id,pts,proj){
      let p=pts.map(q=>q.clone()); if(proj) p=p.map(q=>epi(q,0.06));
      const c=new T.CatmullRomCurve3(p), N=Math.max(10,Math.round(c.getLength()*9));
      for(let i=0;i<N;i+=2){
        const a=c.getPoint(i/N), b=c.getPoint(Math.min(1,(i+1)/N));
        const mesh=new T.Mesh(new T.TubeGeometry(new T.LineCurve3(a,b),2,0.022,8,false),nerveMat[id]); mesh.renderOrder=2; SG.add(mesh); nerveMeshes.push(mesh);
        (byId[id]||(byId[id]={meshes:[],kind:'sinir'})).meshes.push(mesh); mesh.userData.id=id;
      }
      const hit=new T.Mesh(new T.TubeGeometry(c,Math.round(N/2),0.09,6,false),hitMat); SG.add(hit); hit.userData.id=id; hit.userData.kind='sinir'; pickables.push(hit);
    }
    const PLX=V(0.15,1.95,-0.75), vagTop=V(-2.0,2.9,-0.4), symTop=V(2.1,2.9,-0.4);
    nerve('vagus',[vagTop,V(-1.6,2.5,-0.6),V(-0.9,2.1,-0.8),PLX]);
    nerve('vagus',[V(-0.9,2.1,-0.8),V(-1.25,1.5,-0.5),SA]);
    nerve('vagus',[PLX,V(-0.3,1.2,-0.9),AVN.clone().lerp(PLX,0.35).addScaledVector(ant,-0.3),AVN]);
    nerve('symp',[symTop,V(1.6,2.5,-0.6),V(0.9,2.1,-0.8),PLX]);
    nerve('symp',[PLX,V(-0.6,1.75,-0.75),SA]);
    nerve('symp',[V(0.9,2.1,-0.8),V(0.4,1.2,-0.95),AVN.clone().lerp(PLX,0.45).addScaledVector(ant,-0.4),AVN]);
    nerve('symp',[lvTop.clone().addScaledVector(ant,1).addScaledVector(m,0.6),lvAx(0.4).addScaledVector(ant,1).addScaledVector(m,0.8),lvAx(0.75).addScaledVector(ant,0.8).addScaledVector(m,0.8),apex],true);
    nerve('symp',[lvTop.clone().addScaledVector(ant,1.2),lvAx(0.45).addScaledVector(ant,1.2).addScaledVector(m,-0.2),lvAx(0.85).addScaledVector(ant,1)],true);
    const gang=(id,p)=>{const mesh=new T.Mesh(new T.SphereGeometry(0.085,16,12),nerveMat[id]); mesh.position.copy(p); SG.add(mesh); byId[id].meshes.push(mesh); mesh.userData.id=id; mesh.userData.kind='sinir'; pickables.push(mesh); nerveMeshes.push(mesh);};
    gang('vagus',vagTop); gang('symp',symTop);

    /* --- Duruma özel efektler --- */
    const FX={};
    const glow=(hex,op)=>new T.MeshBasicMaterial({color:hex,transparent:true,opacity:op==null?1:op,blending:T.AdditiveBlending,depthWrite:false});
    const xMat=new T.MeshBasicMaterial({color:0xff4d4d,depthTest:false,transparent:true});
    function blockX(pos,parent){
      const g=new T.Group(); g.position.copy(pos);
      [0.785,-0.785].forEach(a=>{const b=new T.Mesh(new T.BoxGeometry(0.4,0.07,0.02),xMat); b.rotation.z=a; b.renderOrder=6; g.add(b);});
      g.visible=false; parent.add(g); return g;
    }
    FX.x={avn:blockX(AVN,CG),his:blockX(AVN.clone().lerp(HE,0.6),CV),rbb:blockX(rbbPts[0].clone().lerp(rbbPts[1]||rbbPts[0],0.6),CV),lbb:blockX(HE.clone().lerp(LBE,0.45),CV)};
    // Flutter: triküspit halkası çevresinde dönen devre
    const triPts=geos.tri.attributes.position.array; let triR=0,tk=0;
    for(let i=0;i<triPts.length;i+=3){const d=V(triPts[i],triPts[i+1],triPts[i+2]).sub(triC); d.addScaledVector(n,-d.dot(n)); triR+=d.length(); tk++;}
    triR=triR/tk*1.15;
    const flC=triC.clone().addScaledVector(n,-0.12);
    const ringPt=a=>flC.clone().addScaledVector(nu,triR*Math.cos(a)).addScaledVector(nw,triR*Math.sin(a));
    const ringCurve=new T.CatmullRomCurve3(Array.from({length:48},(_,i)=>ringPt(i/48*Math.PI*2)),true);
    FX.flLoop=new T.Mesh(new T.TubeGeometry(ringCurve,96,0.03,8,true),condMat()); FX.flLoop.renderOrder=2; CG.add(FX.flLoop);
    FX.flDots=Array.from({length:7},(_,i)=>{const s=new T.Mesh(new T.SphereGeometry(0.09-i*0.009,12,8),glow(0xfff08a,1-i*0.13)); s.renderOrder=4; CG.add(s); return s;});
    // AVNRT: AV düğüm çevresinde küçük devre
    FX.svtDots=Array.from({length:5},(_,i)=>{const s=new T.Mesh(new T.SphereGeometry(0.06-i*0.008,12,8),glow(0xfff08a,1-i*0.17)); s.renderOrder=4; CG.add(s); return s;});
    const [su,sw]=perp(m);
    // AF: pulmoner ven ağızlarında ektopik kıvılcımlar
    const pvPts=[]; {const a=geos.pvn.attributes.position.array; const cand=[]; for(let i=0;i<a.length;i+=3){const p=V(a[i],a[i+1],a[i+2]); cand.push([p.distanceTo(laC),p]);} cand.sort((x,y)=>x[0]-y[0]); for(const [,p] of cand){ if(pvPts.every(q=>q.distanceTo(p)>0.45)) pvPts.push(p); if(pvPts.length>=4) break; }}
    FX.pvSparks=pvPts.map(p=>{const s=new T.Mesh(new T.SphereGeometry(0.07,12,8),glow(0xffc21a)); s.position.copy(p); s.renderOrder=4; CG.add(s); return s;});
    // Ektopik odak işaretleri
    function focusMarker(p,parent){const g=new T.Group(); g.position.copy(p); const core=new T.Mesh(new T.SphereGeometry(0.07,16,12),glow(0xfff2a0)); const halo=new T.Mesh(new T.SphereGeometry(0.16,16,12),glow(0xffb000,0.5)); g.add(core,halo); g.renderOrder=5; parent.add(g); g.visible=false; return {g,core,halo};}
    FX.pvc=focusMarker(pvcFocus,CV); FX.vt=focusMarker(vtFocus,CV);
    // Kalp pili kablosu (SVC → sağ atriyum → triküspit → sağ ventrikül tepesi)
    const svcTop=nearest(['svc'],V(-0.95,2.3,-0.15));
    const leadCurve=new T.CatmullRomCurve3([svcTop.clone().add(V(0,0.4,0)),svcTop,L.svc_low||raC,raC.clone().lerp(triC,0.5),triC,rvAx(0.5),rvApexEndo]);
    FX.lead=new T.Group();
    FX.lead.add(new T.Mesh(new T.TubeGeometry(leadCurve,160,0.028,10,false),new T.MeshStandardMaterial({color:0xcfd6dc,metalness:0.8,roughness:0.3})));
    FX.leadTip=new T.Mesh(new T.SphereGeometry(0.06,16,12),glow(0xffffff)); FX.leadTip.position.copy(rvApexEndo); FX.lead.add(FX.leadTip);
    FX.lead.visible=false; SG.add(FX.lead);
    // Enfarktüs tıkanma noktaları
    FX.occl={};
    for(const k in occl){const g=new T.Group(); g.position.copy(occl[k]); const clot=new T.Mesh(new T.SphereGeometry(0.075,16,12),new T.MeshStandardMaterial({color:0x220508,roughness:0.9})); const ring=new T.Mesh(new T.TorusGeometry(0.15,0.014,8,40),glow(0xff4d4d)); g.add(clot,ring); g.visible=false; VG.add(g); FX.occl[k]={g,ring};}
    // Perikard kesesi (tamponad, perikardit)
    {
      const all=muscles, ax=[n,nu,nw], lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
      for(const M of all) for(let i=0;i<M.n;i+=2){const d=V(M.pos[3*i],M.pos[3*i+1],M.pos[3*i+2]); ax.forEach((a,j)=>{const v=d.dot(a); lo[j]=Math.min(lo[j],v); hi[j]=Math.max(hi[j],v);});}
      const rad=ax.map((a,j)=>(hi[j]-lo[j])/2), c=V(0,0,0); ax.forEach((a,j)=>c.addScaledVector(a,(hi[j]+lo[j])/2));
      const geo=new T.SphereGeometry(1,64,40);
      const basis=new T.Matrix4().makeBasis(nu,n,nw);  // y ekseni = kalp ekseni
      const mk=(hex,op,s)=>{const mesh=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:hex,transparent:true,opacity:op,roughness:0.25,clearcoat:0.8,side:T.DoubleSide,depthWrite:false})); mesh.matrixAutoUpdate=false; mesh.matrix.copy(new T.Matrix4().makeTranslation(c.x,c.y,c.z).multiply(basis).multiply(new T.Matrix4().makeScale(rad[1]*s,rad[0]*s,rad[2]*s))); mesh.renderOrder=7; mesh.visible=false; H.add(mesh); return mesh;};
      FX.sacFluid=mk(0xf2d77a,0.16,1.0); FX.sacOuter=mk(0xd9c7b0,0.1,1.06);
      FX.sacInfl=mk(0xff5a3c,0.16,0.98);
      [FX.sacFluid,FX.sacOuter,FX.sacInfl].forEach(s=>reg('peri',s,null,'zar'));
    }
    // Pulmoner emboli pıhtıları
    FX.clots=[];
    {const a=geos.pt.attributes.position.array; let lo=null,hi=null; for(let i=0;i<a.length;i+=3){if(a[i+1]<1.05)continue; if(!lo||a[i]<lo.x) lo=V(a[i],a[i+1],a[i+2]); if(!hi||a[i]>hi.x) hi=V(a[i],a[i+1],a[i+2]);}
      [lo,hi].forEach(e=>{ if(!e) return; let c=V(0,0,0),k=0; for(let i=0;i<a.length;i+=3){const p=V(a[i],a[i+1],a[i+2]); if(p.distanceTo(e)<0.32){c.add(p);k++;}} c.multiplyScalar(1/k); const s=new T.Mesh(new T.SphereGeometry(0.1,20,14),new T.MeshStandardMaterial({color:0x5a0d14,roughness:0.85,depthTest:false})); s.position.copy(c.lerp(e,-0.05)); s.renderOrder=6; s.visible=false; SG.add(s); FX.clots.push(s);});
    }

    // Kasılma için pivotlar
    const atrPivot=raC.clone().lerp(laC,0.5);
    [['sa',SA,CG],['avn',AVN,CG],['int',raMid,CG],['bach',laC.clone().lerp(laTip,0.6).addScaledVector(V(0,1,0),0.25),CG],['his',AVN.clone().lerp(HE,0.6),CV],['rbb',rbbPts[Math.min(2,rbbPts.length-1)],CV],['lbb',HE.clone().lerp(LBE,0.6),CV],['laf',LAFe,CV],['lpf',LPFe,CV],['purk',endo(lvAx(0.9),nu,LVW)||lvAx(0.9),CV]]
      .forEach(([id,p,obj])=>anchors.push({id,obj,p:p.clone(),out:p.clone().sub(hc).normalize(),inner:true,cond:true}));
    anchors.push({id:'vagus',obj:SG,p:vagTop.clone(),out:V(0,1,0),inner:false,nerve:true},{id:'symp',obj:SG,p:symTop.clone(),out:V(0,1,0),inner:false,nerve:true});
    return {regions,anchors,meshes,byId,pickables,muscles,vessels,valves,condItems,nerveMeshes,nerveMat,FX,mapFor,apMeshes,
      L:{base,apex,n,m,ant,nu,nw,triC,mitC,SA,AVN,HE,LBE,flC,triR,atrPivot,ivsC,su,sw}};
  }

  /* =====================================================================
     Görünüm durumu
     ===================================================================== */
  const COL_ON=new T.Color(0xffd60a), EM_ON=new T.Color(0xffb400), COL_OFF=new T.Color(0x3a3008), EM_OFF=new T.Color(0x000000);
  function styleCond(mat,on){mat.color.copy(on?COL_ON:COL_OFF); mat.emissive.copy(on?EM_ON:EM_OFF);}
  function applyStatic(){
    if(!R) return;
    const live=state.mode==='durumlar', fx=live?state.fx:{};
    R.condItems.forEach(ci=>{
      styleCond(ci.mesh.material,!live||!state.off.includes(ci.id));
      ci.mesh.visible=state.layers.cond&&(ci.id!=='ap'||!!fx.ap);
      if(ci.id==='ap'){ci.mesh.visible=!!fx.ap&&state.layers.cond;}
    });
    R.pickables.forEach(p=>{if(p.userData.id==='ap') p.visible=!!fx.ap;});
    ['vagus','symp'].forEach(id=>styleCond(R.nerveMat[id],!live||state.nerveOn.includes(id)));
    const F=R.FX;
    for(const k in F.x) F.x[k].visible=live&&(fx.block===k||fx.blockFlash===k);
    F.flLoop.visible=!!fx.flutter; F.flDots.forEach(d=>d.visible=!!fx.flutter);
    F.svtDots.forEach(d=>d.visible=!!fx.svt);
    F.pvSparks.forEach(d=>d.visible=!!fx.af);
    F.pvc.g.visible=live&&state.key==='pvc'; F.vt.g.visible=live&&state.key==='vt';
    F.lead.visible=!!fx.lead;
    for(const k in F.occl) F.occl[k].g.visible=fx.infarct===k;
    F.sacFluid.visible=F.sacOuter.visible=fx.sac==='fluid'; F.sacInfl.visible=fx.sac==='inflamed';
    F.clots.forEach(c=>c.visible=!!fx.clot);
    // PE: sağ ventrikül genişlemesi (septumdan dışa doğru)
    const rv=R.meshes.rv;
    if(fx.rvDilate){const s=1.07, c=R.L.ivsC; rv.scale.setScalar(s); rv.position.copy(c).multiplyScalar(1-s);} else {rv.scale.setScalar(1); rv.position.set(0,0,0);}
    // Enfarktüs ve skar maskeleri
    R.muscles.forEach(M=>{
      M.inf.fill(0);
      if(M.atr) return;
      if(fx.infarct){
        const tt=fx.infarct==='lad'?1:0;
        for(let i=0;i<M.n;i++){
          if(M.terr[i]!==tt) continue;
          const h=M.h[i];
          const hk=fx.infarct==='lad'?sstep(0.12,0.3,h):sstep(0.05,0.2,h)*(M.id==='rv'?0.8:1);
          M.inf[i]=hk*sstep(0.75,0.35,M.tdist[i]);
        }
      }
      M.useScar=!!fx.scar;
    });
    // X-ray
    const x=state.xray, mo=live?0.62:0.3, vo=0.25;
    R.muscles.forEach(({mesh})=>{const m=mesh.material; m.transparent=x; m.opacity=x?mo:1; m.depthWrite=!x; m.side=x?T.FrontSide:T.DoubleSide; m.needsUpdate=true;});
    R.vessels.forEach(mesh=>{const m=mesh.material; m.transparent=x; m.opacity=x?vo:1; m.depthWrite=!x; m.side=x?T.FrontSide:T.DoubleSide; m.needsUpdate=true;});
    R.valves.forEach(mesh=>{const m=mesh.material; m.transparent=x; m.opacity=x?0.12:1; m.depthWrite=!x; m.needsUpdate=true;});
    R.vessels.forEach(mesh=>mesh.visible=state.layers.vessels);
    R.nerveMeshes.forEach(mm=>mm.visible=state.layers.nerves);
    applyParts();
    highlight();
  }
  /* ---------- Parça inceleme: her parçanın görünürlüğü/şeffaflığı, seçilene odak (yalnız / parlat) ---------- */
  function topOf(id){ // alt yapı adı → modeldeki parça
    if(!id||!R) return null; if(R.byId[id]) return id;
    for(const k in R.regions) if(R.regions[k].names.includes(id)) return k;
    return null;
  }
  function partState(id){ return state.parts[id]||{vis:true,op:1}; }
  function applyParts(){
    const top=topOf(state.selected), f=top?state.focus:'none';
    for(const id in R.byId){
      if(id==='ap') continue;
      const ps=partState(id), me=id===top;
      const show=f==='iso'?me:ps.vis;
      const op=ps.op*(f!=='none'&&!me?state.others:1);
      const seen=new Set(), kind=R.byId[id].kind;
      for(const mesh of R.byId[id].meshes){
        const baseVis=(kind==='kas'||kind==='kapak')?true:mesh.visible; // diğerlerinin görünürlüğünü katmanlar belirler
        mesh.visible=baseVis&&show&&op>0.02;
        const m=mesh.material; if(seen.has(m)) continue; seen.add(m);
        const o=m.userData.orig||(m.userData.orig={t:m.transparent,o:m.opacity,d:m.depthWrite});
        if(kind==='ileti'||kind==='sinir'){ m.transparent=o.t; m.opacity=o.o; m.depthWrite=o.d; }
        if(op<0.999&&mesh.visible){
          const base=m.transparent?m.opacity:1;
          m.transparent=true; m.opacity=base*op; m.depthWrite=false; m.needsUpdate=true;
        }
      }
    }
    // tıklama hedefleri gizli parçaları seçmesin
    R.pickables.forEach(pk=>{const id=pk.userData.id; if(!id||id==='ap'||pk.material.colorWrite!==false) return;
      const ps=partState(id), k=pk.userData.kind, layer=k==='sinir'?state.layers.nerves:k==='ileti'?state.layers.cond:true;
      pk.visible=layer&&(f==='iso'?id===top:ps.vis);});
    glowReset();
    frameIso();
  }
  let isoFramed=null;
  function frameIso(){ // "yalnız o kalsın": kamerayı seçilen parçaya yaklaştır
    const top=topOf(state.selected);
    if(state.focus!=='iso'||!top){ if(isoFramed){ camera.position.copy(HOME.pos); controls.target.copy(HOME.target); controls.update(); isoFramed=null; } return; }
    if(isoFramed===top) return; isoFramed=top;
    const box=new T.Box3(); R.byId[top].meshes.forEach(m=>box.expandByObject(m));
    const c=box.getCenter(V(0,0,0)), r=Math.max(0.35,box.getSize(V(0,0,0)).length()*0.5);
    const dir=camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(c); camera.position.copy(c).addScaledVector(dir,Math.max(2.2,r*3.4)); controls.update();
  }
  const GLOW=new T.Color(0xff8a2a); let glowMats=[];
  function glowReset(){ glowMats.forEach(([m,c,i])=>{m.emissive.copy(c); m.emissiveIntensity=i;}); glowMats=[]; }
  function glowFrame(t){
    const top=topOf(state.selected);
    if(state.focus!=='glow'||!top||!R.byId[top]){ if(glowMats.length) glowReset(); return; }
    const k=R.byId[top].kind; if(k==='ileti'||k==='sinir') return; // zaten parlak
    if(!glowMats.length){ const seen=new Set(); R.byId[top].meshes.forEach(ms=>{const m=ms.material; if(!m.emissive||seen.has(m)) return; seen.add(m); glowMats.push([m,m.emissive.clone(),m.emissiveIntensity]);}); }
    const a=0.28+0.2*(0.5+0.5*Math.sin(t*3.2));
    glowMats.forEach(([m])=>{m.emissive.copy(GLOW); m.emissiveIntensity=a;});
  }
  const HL=new T.Color(0x5a3a2a), BLACK=new T.Color(0);
  const C_HL=new T.Color(0xffb347);
  function matchFn(meshId){ // seçili alt yapıya ait köşeler
    const sel=state.selected; if(!sel) return null;
    if(meshId===sel) return ()=>true;
    const rg=R.regions[meshId]; if(!rg) return null;
    const k=rg.names.indexOf(sel); if(k<0) return null;
    return i=>rg.reg[i]===k;
  }
  function tintArr(col,count,fn,amt){
    for(let i=0;i<count;i++){ if(!fn(i)) continue; const j=3*i; col[j]+=(C_HL.r-col[j])*amt; col[j+1]+=(C_HL.g-col[j+1])*amt; col[j+2]+=(C_HL.b-col[j+2])*amt; }
  }
  function tintMuscles(){
    for(const M of R.muscles){ const fn=matchFn(M.id); if(!fn) continue; tintArr(M.col,M.n,fn,0.33); M.geo.attributes.color.needsUpdate=true; }
  }
  function highlight(){
    if(!R) return;
    const sel=state.selected;
    R.vessels.concat(R.valves).forEach(mesh=>{
      const at=mesh.geometry.attributes.color; at.array.set(mesh.userData.vbase);
      const fn=matchFn(mesh.userData.id); if(fn) tintArr(at.array,at.count,fn,0.55);
      at.needsUpdate=true;
    });
    if(state.mode!=='durumlar'){ for(const M of R.muscles){ M.col.set(M.base); M.geo.attributes.color.needsUpdate=true; M.painted=false; } tintMuscles(); }
    R.condItems.forEach(ci=>{ci.mesh.material.emissiveIntensity=(sel===ci.id)?1.7:0.6;});
    ['vagus','symp'].forEach(id=>R.nerveMat[id].emissiveIntensity=sel===id?1.7:0.6);
  }


  /* ---------- Öğren modu: 12 derivasyonun elektrotları ve kalp vektörü ---------- */
  const LG=new T.Group(); LG.visible=false; scene.add(LG);
  let learn=null; // {center, els:{id:{mesh,pos,dir}}, arrow, ray}
  function centerOf(){ const c=V(0,0,0); let k=0; for(const M of R.muscles){ for(let i=0;i<M.n;i+=7){c.x+=M.pos[3*i];c.y+=M.pos[3*i+1];c.z+=M.pos[3*i+2];k++;} } return c.multiplyScalar(1/k); }
  function buildLearn(leads){
    if(!R||learn) return;
    const center=centerOf(), els={};
    for(const id in leads){
      const d=VA(leads[id].dir).normalize(), limb=Math.abs(leads[id].dir[2])<1e-6;
      const hd=limb?d:V(d.x,0,d.z).normalize(); const pos=center.clone().addScaledVector(hd,limb?3.3:2.45);
      const mesh=new T.Mesh(new T.SphereGeometry(0.085,20,14),new T.MeshStandardMaterial({color:limb?0x7fd3ff:0xff9de0,emissive:limb?0x1a4a66:0x5a1a48,roughness:0.4}));
      mesh.position.copy(pos); LG.add(mesh); els[id]={mesh,pos,dir:pos.clone().sub(center).normalize(),limb};
    }
    const rayMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5,depthWrite:false});
    const ray=new T.Mesh(new T.CylinderGeometry(0.012,0.012,1,8,1,true),rayMat); LG.add(ray);
    const eye=new T.Mesh(new T.ConeGeometry(0.16,0.42,24,1,true),new T.MeshBasicMaterial({color:0xffd60a,transparent:true,opacity:0.3,side:T.DoubleSide,depthWrite:false})); LG.add(eye);
    const arrow=new T.ArrowHelper(V(1,0,0),center,1,0xffd60a,0.28,0.16);
    arrow.line.material.linewidth=2; arrow.renderOrder=9; arrow.traverse(o=>{if(o.material){o.material.depthTest=false;o.material.transparent=true;}}); LG.add(arrow);
    const shaft=new T.Mesh(new T.CylinderGeometry(0.035,0.035,1,10),new T.MeshBasicMaterial({color:0xffd60a,depthTest:false,transparent:true})); shaft.renderOrder=9; LG.add(shaft);
    learn={center,els,ray,eye,arrow,shaft,sel:null};
  }
  const UP=V(0,1,0);
  function learnSel(id){
    if(!learn) return; learn.sel=id;
    for(const k in learn.els){ const e=learn.els[k], on=k===id; e.mesh.scale.setScalar(on?1.5:1); e.mesh.material.emissiveIntensity=on?2.2:1; }
    const e=learn.els[id]; learn.ray.visible=learn.eye.visible=!!e; if(!e) return;
    const len=e.pos.distanceTo(learn.center);
    learn.ray.scale.set(1,len,1); learn.ray.position.copy(learn.center).lerp(e.pos,0.5); learn.ray.quaternion.setFromUnitVectors(UP,e.dir);
    learn.eye.position.copy(e.pos).addScaledVector(e.dir,-0.3); learn.eye.quaternion.setFromUnitVectors(UP,e.dir); // koni elektrottan kalbe bakar
  }
  function learnVector(v){
    if(!learn) return; const L=Math.hypot(v[0],v[1],v[2]);
    const on=L>0.04; learn.arrow.visible=learn.shaft.visible=on; if(!on) return;
    const d=V(v[0]/L,v[1]/L,v[2]/L), len=0.45+1.3*Math.min(1.6,L);
    learn.arrow.setDirection(d); learn.arrow.setLength(len,0.3,0.18); learn.arrow.position.copy(learn.center);
    learn.shaft.scale.set(1,len-0.28,1); learn.shaft.position.copy(learn.center).addScaledVector(d,(len-0.28)/2); learn.shaft.quaternion.setFromUnitVectors(UP,d);
  }

  /* Etiketler: ekrandaki konumları (uygulama HTML olarak çizer) */
  const _v=new T.Vector3(), _o=new T.Vector3(), _c=new T.Vector3();
  function toScreen(obj,local){
    _v.copy(local).applyMatrix4(obj.matrixWorld); const depth=_v.distanceTo(camera.position);
    _v.project(camera); const r=renderer.domElement;
    return {x:(_v.x*0.5+0.5)*r.clientWidth,y:(-_v.y*0.5+0.5)*r.clientHeight,depth,on:_v.z<1};
  }
  function labels(){
    if(!R) return {list:[],pin:null};
    const list=[];
    for(const a of R.anchors){
      let p=a.obj; let vis=true; while(p){ if(!p.visible){vis=false;break;} p=p.parent; }
      if(!vis) continue;
      if(a.cond&&(!state.xray||!state.layers.cond)) continue;
      if(a.inner&&!a.cond&&!state.xray) continue;
      if(a.nerve&&!state.layers.nerves) continue;
      _c.copy(a.p).applyMatrix4(a.obj.matrixWorld); _o.copy(camera.position).sub(_c).normalize();
      const facing=a.inner||a.nerve?1:a.out.dot(_o);
      if(facing<-0.05&&!state.xray) continue;
      const sc=toScreen(a.obj,a.p); if(!sc.on) continue;
      list.push({id:a.id,x:sc.x,y:sc.y,depth:sc.depth,dim:facing<-0.05});
    }
    let pn=null; if(pin&&pin.obj){ const sc=toScreen(pin.obj,pin.local); pn={id:pin.id,x:sc.x,y:sc.y}; }
    return {list,pin:pn};
  }

  /* =====================================================================
     Her kare: köşe renkleri (uyarı dalgası), kasılma, efektler
     ===================================================================== */
  const C_WAVE=new T.Color(0xffd84a), C_ACT=new T.Color(0xd8202f), C_AF=new T.Color(0xff9a2a), C_INF=new T.Color(0x86607a), C_SCAR=new T.Color(0xcdb6a8), C_DEAD=new T.Color(0x3c2226);
  function lastTwo(arr,t,pred){let a=null,b=null; for(const e of arr){ if(e.t>t) break; if(pred&&!pred(e)) continue; a=b; b=e; } return [b,a];}
  function chaosAt(x,y,z,t,s){
    return Math.sin(5.3*x+3.1*y-2.7*z+9.1*t*s)*Math.sin(-2.9*x+4.7*y+3.9*z+11.7*t*s+1.3)+0.6*Math.sin(6.1*z-3.3*x+2.2*y+13.3*t*s+2.2);
  }
  function paint(sim){
    const t=sim.t, r=sim.cond().r, fx=state.fx;
    const aEv=lastTwo(sim.atrial,t,e=>e.type==='sinus'||e.type==='retro');
    const vEv=lastTwo(sim.vent,t);
    const vAF=r.atrial==='af', vF=r.atrial==='flutter', vVF=r.vent==='vf', chaos=fx.chaos||0, dead=!!fx.dead;
    const caF=vF?sim.mechanics().ca:0;
    for(const M of R.muscles){
      const {n,pos,base,col}=M; let mapA=null,mapB=null,eA=vEv[0],eB=vEv[1],qtA=0,qtB=0;
      if(M.atr){
        eA=aEv[0]; eB=aEv[1];
        if(eA) mapA=R.mapFor(M,eA.type==='retro'?'retro':'sinus');
        if(eB) mapB=R.mapFor(M,eB.type==='retro'?'retro':'sinus');
        qtA=qtB=0.13;
      } else {
        const key=e=>e.act==='tdp'?(['vt','tdp1','tdp2'][e.idx%3]):(e.act||'normal');
        if(eA){mapA=R.mapFor(M,key(eA)); qtA=sim.qt(eA.rr)*(eA.act==='vt'||eA.act==='pvc'||eA.act==='tdp'?0.9:1);}
        if(eB){mapB=R.mapFor(M,key(eB)); qtB=sim.qt(eB.rr);}
      }
      const flutterRA=M.atr&&vF, afA=M.atr&&vAF, vfV=!M.atr&&(vVF||chaos>0);
      const fl=flutterRA?(((t-sim.fl0)/0.2)%1+1)%1:0;
      for(let i=0;i<n;i++){
        const i3=3*i; let br=base[i3],bg=base[i3+1],bb=base[i3+2];
        let k=0,w=0;
        if(dead){br=br*0.55+C_DEAD.r*0.45; bg=bg*0.55+C_DEAD.g*0.45; bb=bb*0.55+C_DEAD.b*0.45;}
        const x=pos[i3],y=pos[i3+1],z=pos[i3+2];
        if(afA){
          const c=chaosAt(x,y,z,t,1.6);
          w=sstep(0.7,1.2,c)*0.95; k=0.25+0.25*sstep(0.2,0.9,c);
        } else if(flutterRA){
          const d=x-R.L.flC.x,dy=y-R.L.flC.y,dz=z-R.L.flC.z;
          const ang=Math.atan2(d*R.L.nw.x+dy*R.L.nw.y+dz*R.L.nw.z,d*R.L.nu.x+dy*R.L.nu.y+dz*R.L.nu.z)/(2*Math.PI);
          const ph=((fl-ang)%1+1)%1;
          w=ph<0.1?1-ph/0.1:0; k=ph<0.45?0.7*(1-ph/0.45):0;
        } else if(mapA||mapB){
          let ev=eA,map=mapA,qt=qtA, d=eA?t-eA.t-mapA[i]:-1;
          if(d<0&&eB){ev=eB;map=mapB;qt=qtB;d=t-eB.t-mapB[i];}
          if(d>=0){
            w=d<0.028?1-d/0.028:0;
            k=d<qt-0.09?1:d<qt?(qt-d)/0.09:0;
            k*=0.55;
          }
          void ev; void map;
        }
        if(M.atr&&vF&&M.id!=='ra') k=Math.max(k,0.5*caF);
        if(vfV){
          const c=chaosAt(x,y,z,t,vVF?2.2:1.4);
          const s=vVF?1:chaos;
          w=Math.max(w,s*sstep(0.75,1.25,c)*0.95); k=Math.max(k,s*(0.2+0.3*sstep(0.1,0.9,c)));
        }
        if(!M.atr){
          const inf=M.inf[i];
          if(inf>0){const mt=inf*(0.8+0.2*Math.sin(x*23+y*17)*Math.sin(z*19-x*11)); br+=(C_INF.r-br)*mt; bg+=(C_INF.g-bg)*mt; bb+=(C_INF.b-bb)*mt; k*=1-inf*0.9; w*=1-inf;}
          if(M.useScar){const s=M.scar[i]; if(s>0){const ss=s*0.7; br+=(C_SCAR.r*0.5-br)*ss; bg+=(C_SCAR.g*0.5-bg)*ss; bb+=(C_SCAR.b*0.5-bb)*ss; k*=1-s*0.8; w*=1-s*0.6;}}
        }
        const ac=afA?C_AF:C_ACT;
        br+=(ac.r-br)*k; bg+=(ac.g-bg)*k; bb+=(ac.b-bb)*k;
        br+=(C_WAVE.r-br)*w; bg+=(C_WAVE.g-bg)*w; bb+=(C_WAVE.b-bb)*w;
        col[i3]=br; col[i3+1]=bg; col[i3+2]=bb;
      }
      M.geo.attributes.color.needsUpdate=true;
      M.painted=true;
    }
  }
  function resetPaint(){
    let ch=false;
    for(const M of R.muscles){ if(!M.painted) continue; M.col.set(M.base); M.geo.attributes.color.needsUpdate=true; M.painted=false; ch=true; }
    if(ch) tintMuscles();
  }
  const tmpM=new T.Matrix4(), tmpM2=new T.Matrix4();
  function ventMatrix(c){ // tabana göre boyuna kısalma + çapta daralma
    const L=R.L, sl=1-0.07*c, sr=1-0.075*c, n=L.n;
    const e=[
      sr+(sl-sr)*n.x*n.x,(sl-sr)*n.x*n.y,(sl-sr)*n.x*n.z,
      (sl-sr)*n.y*n.x,sr+(sl-sr)*n.y*n.y,(sl-sr)*n.y*n.z,
      (sl-sr)*n.z*n.x,(sl-sr)*n.z*n.y,sr+(sl-sr)*n.z*n.z];
    tmpM.set(e[0],e[1],e[2],0,e[3],e[4],e[5],0,e[6],e[7],e[8],0,0,0,0,1);
    const P=L.base;
    tmpM2.makeTranslation(P.x,P.y,P.z).multiply(tmpM).multiply(new T.Matrix4().makeTranslation(-P.x,-P.y,-P.z));
    VG.matrix.copy(tmpM2); VG.matrixWorldNeedsUpdate=true;
  }
  function atrMatrix(sx,sy,sz){
    const P=R.L.atrPivot;
    AG.matrix.makeTranslation(P.x,P.y,P.z).multiply(new T.Matrix4().makeScale(sx,sy,sz)).multiply(new T.Matrix4().makeTranslation(-P.x,-P.y,-P.z)); AG.matrixWorldNeedsUpdate=true;
  }

  function frame(sim){
    controls.update();
    if(hoverReq&&opts.onHover){const h=hoverReq; hoverReq=null; const pk=pickAt(h.x,h.y); opts.onHover(pk?pk.id:null,h.x,h.y);}
    if(!R){renderer.render(scene,camera); return;}
    const live=state.mode==='durumlar'&&sim;
    const F=R.FX, fx=state.fx;
    if(live){
      const m=sim.mechanics(), t=sim.t;
      let qx=0,qy=0,qz=0;
      if(m.af){qx=0.008*(Math.sin(t*41)+Math.sin(t*67+1.3));qy=0.008*(Math.sin(t*53+0.7)+Math.sin(t*79+2.1));qz=0.008*Math.sin(t*61+0.3);}
      atrMatrix(1-0.05*m.ca+qx,1-0.05*m.ca+qy,1-0.05*m.ca+qz);
      let cv=m.cv;
      if(m.vf&&sim.cond().r.vent==='vf') cv=0.12+0.05*Math.sin(t*37)*Math.sin(t*23+1);
      if(fx.dead) cv=0;
      ventMatrix(cv);
      // Tamponad: kalp sıvı içinde sallanır (elektriksel alternans)
      if(fx.swing){const e=sim.lastVent(); const sgn=e&&e.idx%2?-1:1; const a=0.07*sgn*Math.min(1,(e?Math.min(1,(t-e.t)/0.25):0)); H.rotation.set(0,0,0); H.rotateOnAxis(R.L.n,a*0.6); H.position.copy(R.L.m).multiplyScalar(a*0.9);} else {H.rotation.set(0,0,0); H.position.set(0,0,0);}
      paint(sim); tintMuscles();
      // ileti sistemi nabızları
      const cache={};
      R.condItems.forEach(ci=>{
        if(!ci.mesh.visible){ci.pulse.visible=false; return;}
        const q=cache[ci.id]||(cache[ci.id]=sim.pulse(ci.id));
        ci.pulse.visible=q.a>0.01;
        if(!ci.pulse.visible) return;
        ci.pulse.material.opacity=q.a*(ci.gain||1);
        if(ci.type==='tube') ci.pulse.geometry.setDrawRange(0,Math.max(1,Math.round(q.p*ci.seg))*ci.rad*6);
        else ci.pulse.scale.setScalar(ci.base*(1.4+1.0*q.a));
      });
      ['vagus','symp'].forEach(id=>{const on=state.nerveOn.includes(id); R.nerveMat[id].emissiveIntensity=state.selected===id?1.7:on?0.55+0.45*Math.sin(t*7):0.35;});
      // efektler
      if(fx.flutter){const th=2*Math.PI*((t-sim.fl0)/0.2); F.flDots.forEach((d,i)=>{const a=-(th-i*0.25); d.position.copy(R.L.flC).addScaledVector(R.L.nu,R.L.triR*Math.cos(a)).addScaledVector(R.L.nw,R.L.triR*Math.sin(a));});}
      if(fx.svt){const e=sim.lastVent(); const per=e?e.rr:0.33; const th=2*Math.PI*((t%per)/per); F.svtDots.forEach((d,i)=>{const a=th-i*0.35; d.position.copy(R.L.AVN).addScaledVector(R.L.su,0.16*Math.cos(a)).addScaledVector(R.L.sw,0.16*Math.sin(a));});}
      if(fx.af){F.pvSparks.forEach((s,i)=>{const v=Math.sin(t*(17+i*5)+i*2.1)*Math.sin(t*(11+i*3)); s.material.opacity=v>0.4?1:0.12; s.scale.setScalar(v>0.4?1.4:0.8);});}
      const lv=sim.lastVent();
      [['pvc','pvc'],['vt','vt']].forEach(([k,src])=>{const mk=F[k]; if(!mk.g.visible) return; const fresh=lv&&lv.src===src?Math.max(0,1-(t-lv.t)/0.25):0; mk.halo.scale.setScalar(1+2*fresh); mk.halo.material.opacity=0.25+0.6*fresh; mk.core.material.opacity=0.5+0.5*fresh;});
      if(fx.lead){const fresh=lv&&lv.src==='paced'?Math.max(0,1-(t-lv.t)/0.12):0; F.leadTip.scale.setScalar(1+2.5*fresh); F.leadTip.material.opacity=0.35+0.65*fresh;}
      for(const k in F.occl){ if(F.occl[k].g.visible){ const s=1+0.25*Math.sin(t*6); F.occl[k].ring.scale.setScalar(s); F.occl[k].ring.quaternion.copy(camera.quaternion); } }
      if(fx.sac==='inflamed') F.sacInfl.material.opacity=0.13+0.07*(0.5+0.5*Math.sin(t*3));
      // blok işaretleri
      if(fx.blockFlash){const f=sim.blockFlash(); const xm=F.x[fx.blockFlash]; xm.visible=f>0.02; xm.scale.setScalar(0.6+0.6*f);}
      for(const k in F.x){const xm=F.x[k]; if(xm.visible){ xm.quaternion.copy(camera.quaternion).premultiply(xm.parent.getWorldQuaternion(new T.Quaternion()).invert()); }}
    } else {
      atrMatrix(1,1,1); ventMatrix(0); H.rotation.set(0,0,0); H.position.set(0,0,0);
      resetPaint();
      R.condItems.forEach(ci=>ci.pulse.visible=false);
    }
    glowFrame(performance.now()/1000);
    renderer.render(scene,camera);
  }

  Object.assign(api,{
    frame,resize,
    setMode(mode,cond,key){state.mode=mode; if(cond){state.cond=cond; state.off=cond.off||[]; state.nerveOn=cond.nerveOn||[]; state.key=key; state.fx=cond.fx||{};} if(mode!=='durumlar') state.fx={}; applyStatic();},
    setXray(b){state.xray=b; applyStatic();},
    setLayer(k,b){state.layers[k]=b; applyStatic();},
    select(id){state.selected=id; if(!id) pin=null; else if(pin&&pin.id!==id) pin=null; if(state.focus!=='none') applyStatic(); else highlight();},
    parts(){ if(!R) return []; return Object.keys(R.byId).filter(id=>id!=='ap').map(id=>({id,kind:R.byId[id].kind})); },
    getPart(id){ return Object.assign({},partState(id)); },
    setPart(id,o){ state.parts[id]=Object.assign(partState(id),o); applyStatic(); },
    resetParts(){ state.parts={}; state.others=1; applyStatic(); },
    setFocus(mode){ state.focus=mode||'none'; applyStatic(); },
    setOthers(v){ state.others=v; applyStatic(); },
    topOf,
    reveal(id){ // bir yapıyı göster: kamerayı ona çevir ve adını iğnele
      if(!R) return; const a=R.anchors.find(x=>x.id===id); if(!a) return;
      if(!a.inner&&!a.cond){ const d=camera.position.distanceTo(controls.target); controls.target.copy(HOME.target); camera.position.copy(HOME.target).addScaledVector(a.out,d); controls.update(); }
      pin={id,obj:a.obj,local:a.p.clone()};
    },
    pickIds(){ if(!R) return []; const set=new Set(Object.keys(R.byId)); for(const k in R.regions) R.regions[k].names.forEach(n=>set.add(n)); set.delete('ap'); return [...set]; },
    labels,
    setLearn(on,leads){ if(on&&R) buildLearn(leads); LG.visible=!!on&&!!learn; if(on&&!R) state.pendingLearn=leads; },
    setLeadSel(id){ learnSel(id); },
    setVector(v){ learnVector(v); },
    lookFrom(dir){ if(!learn) return; const d=VA(dir).normalize(); camera.position.copy(learn.center).addScaledVector(d,11); controls.target.copy(learn.center); controls.update(); },
    leadsScreen(){ if(!learn||!LG.visible) return []; const out=[]; for(const id in learn.els){ const e=learn.els[id]; _v.copy(e.pos).project(camera); const r=renderer.domElement; out.push({id,x:(_v.x*0.5+0.5)*r.clientWidth,y:(-_v.y*0.5+0.5)*r.clientHeight,limb:e.limb}); } return out; },
    setInsets(t,l,r,b){inset.t=t;inset.l=l;inset.r=r;inset.b=b;resize();},
    resetView(){isoFramed=null; camera.position.copy(HOME.pos); controls.target.copy(HOME.target); controls.update();},
    viewFrom(name){ // hazır açılar
      const P={inferior:V(1.2,-7.2,5.6)}[name]; if(!P) return;
      camera.position.copy(P); controls.target.copy(HOME.target); controls.update();
    }
  });
  return api;
}
window.KalpHeart={create};
})();
