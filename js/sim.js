/* Kalp Simülatörü: ritim zamanlayıcısı, sentetik EKG modeli ve ileti zamanlamaları.
   Görselden bağımsızdır; 3D sahne ve EKG çizimi bu modülden değer okur.
   Olaylar:
     atriyal  {t, type:'sinus'|'F'|'retro', blocked?:'avn'|'his'|'refr', avn?:[başla,süre], his?:[...]}
     ventrikül {t, rr, src, act, morph, hp(His–Purkinje kullanıldı mı), avn?:[başla,süre], idx} */
(function(){
'use strict';
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const g=(x,c,s,a)=>a*Math.exp(-((x-c)*(x-c))/(2*s*s));
const sm=(x,a,b)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const bump=(x,d)=>(x>0&&x<d)?Math.sin(Math.PI*x/d):0;
function qtOf(rr){return Math.min(0.48,Math.max(0.26,0.40*Math.sqrt(Math.min(rr,1.6))));}

/* QRS: [merkez, genişlik, mV] (QRS başlangıcına göre sn), J noktası, T: [QT'ye göre kayma, genişlik, mV] */
const MORPH={
  narrow:{q:[[.012,.008,-.07],[.04,.0105,1.15],[.066,.01,-.24]],J:.08,T:[-.09,.042,.3]},
  rbbbV1:{q:[[.02,.009,.3],[.05,.011,-.45],[.1,.016,.8]],J:.13,T:[-.06,.05,-.25]},
  lbbbV1:{q:[[.02,.01,.12],[.085,.032,-1.5]],J:.15,T:[-.05,.055,.4]},
  wpw:{q:[[.035,.025,.4],[.075,.012,.9],[.1,.012,-.2]],J:.115,T:[-.07,.05,.12]},
  vt:{q:[[.05,.032,1.3],[.12,.03,-.45]],J:.16,T:[-.03,.06,-.5],qt:.04},
  pvc:{q:[[.05,.03,1.35],[.12,.028,-.4]],J:.16,T:[-.03,.06,-.55],qt:.04},
  paced:{q:[[0,.0025,1.8],[.06,.035,-1.0],[.13,.022,.25]],J:.16,T:[-.03,.06,.45],qt:.04},
  stemiV2:{q:[[.02,.008,.18],[.05,.013,-.55]],J:.075,st:.32,T:[-.08,.065,.75]},
  stemiIII:{q:[[.012,.008,-.05],[.04,.0105,.85],[.064,.01,-.12]],J:.08,st:.28,T:[-.08,.06,.55]},
  peIII:{q:[[.016,.009,-.32],[.045,.011,.6],[.07,.01,-.15]],J:.08,T:[-.09,.045,-.25]},
  peri:{q:[[.012,.008,-.05],[.04,.0105,1.0],[.066,.01,-.18]],J:.08,st:.14,T:[-.09,.05,.35]},
  hyperk:{q:[[.014,.011,-.07],[.05,.015,1.0],[.086,.014,-.28]],J:.1,T:[-.13,.022,.95],qt:-.03},
  hypok:{q:[[.012,.008,-.07],[.04,.0105,1.1],[.066,.01,-.22]],J:.08,st:-.07,T:[-.1,.05,.07],U:[.07,.04,.2],qt:.04}
};

function createSim(COND){
  const sim={t:0,speed:1,playing:true,key:'nsr',atrial:[],vent:[],nextA:0,nextV:0,rng:mulberry(7),fl0:0,n:0,vi:0};
  sim.cond=()=>COND[sim.key];
  sim.setCondition=function(key){
    sim.key=key; sim.atrial=[]; sim.vent=[]; sim.rng=mulberry(7); sim.n=0; sim.vi=0;
    sim.nextA=sim.t+0.3; sim.nextV=sim.t+0.5; sim.fl0=sim.t;
    sim.generate(sim.t+2);
  };
  function pushV(e){e.idx=sim.vi++; sim.vent.push(e);}

  sim.generate=function(until){
    const r=COND[sim.key].r;
    if(r.atrial==='sinus'){
      while(sim.nextA<until){
        const k=sim.n++, ta=sim.nextA;
        let rr=60/r.rate*(1+(r.sv||0)*Math.sin(2*Math.PI*ta/4.2));
        const a={t:ta,type:'sinus'}; sim.atrial.push(a);
        let pr=r.pr, conduct=!r.vent && r.av!=='complete';
        if(r.av==='wenck'){const c=k%4; if(c===3){conduct=false;a.blocked='avn';a.avn=[ta+.04,.14];} else pr=[.16,.26,.32][c];}
        if(r.av==='mobitz2'&&k%3===2){conduct=false;a.blocked='his';a.avn=[ta+.04,pr-.08];a.his=[ta+pr-.04,.03];}
        if(r.av==='complete') a.blocked='avn';
        if(r.pvc==='bigeminy'&&k%2===1){conduct=false;a.blocked='refr';}
        if(conduct){
          const tv=ta+pr;
          pushV({t:tv,rr,src:'sinus',act:r.act||'normal',morph:r.morph,hp:true,avn:[ta+.04,Math.max(.04,pr-.08)]});
          if(r.pvc==='bigeminy'){pushV({t:tv+0.46,rr:0.46,src:'pvc',act:'pvc',morph:'pvc',hp:false});}
        }
        if(r.pauseEvery&&k%r.pauseEvery===r.pauseEvery-1) rr=r.pause;
        sim.nextA+=rr;
      }
    } else if(r.atrial==='flutter'){
      while(sim.nextA<until){
        const k=Math.round((sim.nextA-sim.fl0)/0.2);
        sim.atrial.push({t:sim.nextA,type:'F'});
        if(k%2===0) pushV({t:sim.nextA+0.26,rr:0.4,src:'flutter',act:'normal',morph:r.morph,hp:true,avn:[sim.nextA+0.12,0.1]});
        sim.nextA+=0.2;
      }
    }
    const V=r.vent;
    while(V&&V!=='vf'&&V!=='none'&&sim.nextV<until){
      const tv=sim.nextV; let rr;
      if(V==='af'){rr=0.34+sim.rng()*0.48; pushV({t:tv,rr,src:'af',act:'normal',morph:r.morph,hp:true,avn:[tv-.1,.06]});}
      else if(V==='escape'){rr=60/r.ventRate; pushV({t:tv,rr,src:'escape',act:'normal',morph:'narrow',hp:true});}
      else if(V==='vt'){rr=60/r.ventRate; pushV({t:tv,rr,src:'vt',act:'vt',morph:'vt',hp:false});}
      else if(V==='torsades'){rr=60/r.ventRate*(1+0.1*Math.sin(tv*5)); pushV({t:tv,rr,src:'tdp',act:'tdp',morph:'vt',hp:false});}
      else if(V==='paced'){rr=60/r.ventRate; pushV({t:tv,rr,src:'paced',act:'paced',morph:'paced',hp:false});}
      else if(V==='svt'){rr=60/r.rate; pushV({t:tv,rr,src:'svt',act:'normal',morph:'narrow',hp:true,avn:[tv-.12,.1]}); sim.atrial.push({t:tv+0.01,type:'retro'});}
      else if(V==='flutter'){break;}
      else break;
      sim.nextV+=rr;
    }
    const cut=sim.t-8; sim.atrial=sim.atrial.filter(a=>a.t>cut); sim.vent=sim.vent.filter(v=>v.t>cut);
  };
  sim.step=function(dt){ if(sim.playing) sim.t+=dt*sim.speed; sim.generate(sim.t+2); };

  /* ---- EKG ---- */
  function beat(d,e,r){
    const M=MORPH[e.morph]||MORPH.narrow; let v=0;
    for(const q of M.q) v+=g(d,q[0],q[1],q[2]);
    const qt=qtOf(e.rr)+(M.qt||0), Tc=qt+M.T[0];
    v+=g(d,Tc,M.T[1],M.T[2]);
    if(M.st) v+=M.st*sm(d,M.J-.005,M.J+.012)*(1-sm(d,Tc,Tc+.09));
    if(M.U) v+=g(d,Tc+M.U[0]+.06,M.U[1],M.U[2]);
    let amp=r.volt||1;
    if(r.alternans&&e.idx%2) amp*=1-r.alternans;
    if(e.src==='tdp'){const m=Math.sin(2*Math.PI*e.t/2.6); amp*=Math.sign(m||1)*Math.max(0.22,Math.abs(m))*1.1;}
    return v*amp;
  }
  sim.ecgAt=function(t){
    const c=COND[sim.key], r=c.r; let v=0;
    for(const a of sim.atrial){
      const d=t-a.t; if(d<-.05||d>.3) continue;
      if(a.type==='sinus') v+=g(d,.05,.021,(r.pAmp!=null?r.pAmp:.14)*(c.lead==='V1'?.6:1)*(r.volt||1));
      else if(a.type==='retro') v+=g(d,.05,.018,-.1);
      if(r.prDep&&a.type==='sinus') v+=g(d,.12,.03,-.06);
    }
    for(const e of sim.vent){ const d=t-e.t; if(d>-.05&&d<.85) v+=beat(d,e,r); }
    if(r.atrial==='af') v+=0.045*Math.sin(2*Math.PI*6.3*t)+0.03*Math.sin(2*Math.PI*8.7*t+1.7)+0.028*Math.sin(2*Math.PI*4.9*t+0.4)*Math.sin(2*Math.PI*0.6*t);
    if(r.atrial==='flutter'){ const ph=(((t-sim.fl0)/0.2)%1+1)%1; v+= ph<0.72 ? 0.08-0.27*(ph/0.72) : -0.19+0.27*((ph-0.72)/0.28); }
    if(r.vent==='vf') v+=(0.38*Math.sin(2*Math.PI*5.1*t)+0.26*Math.sin(2*Math.PI*6.9*t+1)+0.2*Math.sin(2*Math.PI*3.7*t+2)+0.1*Math.sin(2*Math.PI*9.3*t))*(0.65+0.35*Math.sin(2*Math.PI*0.31*t));
    if(r.vent==='none') v+=0.006*Math.sin(t*37)+0.004*Math.sin(t*61);
    return v+0.012*Math.sin(2*Math.PI*0.22*t);
  };

  /* ---- İleti yapısı etkinleşmeleri: [başlangıç, süre] ---- */
  const ATR={sa:[-0.01,0.035],int:[0,0.045],bach:[0.005,0.05]};
  const VEN={his:[-0.04,0.03],rbb:[-0.012,0.035],lbb:[-0.012,0.016],laf:[0.004,0.024],lpf:[0.004,0.024],purk:[0.012,0.055]};
  sim.activations=function(id){
    const c=COND[sim.key], out=[];
    if(id!=='ap'&&c.off.includes(id)) return out;
    if(ATR[id]){
      for(const a of sim.atrial){
        if(a.type==='sinus') out.push([a.t+ATR[id][0],ATR[id][1]]);
        else if(a.type==='F'&&id==='bach') out.push([a.t+0.06,0.05]);
        else if(a.type==='retro'&&id==='bach') out.push([a.t+0.02,0.05]);
      }
      return out;
    }
    if(id==='avn'){
      for(const a of sim.atrial) if(a.avn) out.push(a.avn);
      for(const e of sim.vent) if(e.avn) out.push(e.avn);
      return out;
    }
    if(id==='his') for(const a of sim.atrial) if(a.his) out.push(a.his);
    if(id==='ap'){ for(const e of sim.vent) if(e.act==='wpw') out.push([e.t-0.06,0.04]); return out; }
    if(VEN[id]){
      for(const e of sim.vent){
        if(!e.hp) continue;
        let o=VEN[id][0], d=VEN[id][1];
        if(id==='purk'&&(e.act==='lbbb'||e.act==='rbbb')) d=0.11;
        if(id==='purk'&&e.act==='slow') d=0.09;
        out.push([e.t+o,d]);
      }
    }
    return out;
  };
  sim.pulse=function(id){
    const t=sim.t; let best=null;
    for(const a of sim.activations(id)){ if(a[0]<=t && (!best||a[0]>best[0])) best=a; }
    if(!best) return {p:0,a:0};
    const x=(t-best[0])/best[1];
    if(x<1) return {p:x,a:1};
    return {p:1,a:Math.max(0,1-(t-best[0]-best[1])/0.22)};
  };
  /* Son bloklanan uyarının parlaması (0..1) */
  sim.blockFlash=function(){
    let f=0;
    for(const a of sim.atrial){ if(!a.blocked||a.blocked==='refr') continue; const s=a.t+(a.blocked==='his'?0.16:0.18), x=sim.t-s; if(x>0&&x<0.6) f=Math.max(f,1-x/0.6); }
    return f;
  };
  sim.lastVent=function(){ let e=null; for(const v of sim.vent){ if(v.t<=sim.t) e=v; } return e; };
  sim.lastAtrial=function(){ let a=null; for(const v of sim.atrial){ if(v.t<=sim.t) a=v; } return a; };

  /* ---- Kasılma ---- */
  sim.mechanics=function(){
    const t=sim.t, c=COND[sim.key], r=c.r;
    let ca=0,cv=0,sysAV=0;
    for(const a of sim.atrial){
      if(a.type==='F') ca=Math.max(ca,0.35*bump(t-a.t-0.03,0.14));
      else ca=Math.max(ca,bump(t-a.t-0.06,0.15));
    }
    for(const e of sim.vent){
      const sys=Math.min(0.36,0.32*Math.sqrt(e.rr));
      let fill=1;
      if(e.src==='af') fill=Math.min(1,0.55+(e.rr-0.34)/0.6);
      if(e.src==='pvc') fill=0.5; if(e.src==='vt') fill=0.6; if(e.src==='tdp') fill=0.35;
      if(c.fx.sac==='fluid') fill*=0.5;
      const delay=(e.act==='lbbb'||e.act==='paced'||e.act==='vt'||e.act==='pvc')?0.06:0;
      cv=Math.max(cv,fill*bump(t-e.t-0.03-delay,sys));
      const x=t-e.t; if(x>-0.01&&x<sys+0.04) sysAV=Math.max(sysAV, Math.min(1,(x+0.01)/0.03,(sys+0.04-x)/0.05));
    }
    let fib=0; if(r.atrial==='af') fib=0.45+0.35*Math.abs(Math.sin(t*23)*Math.sin(t*31+1));
    return {ca,cv,sysAV,fib,af:r.atrial==='af',vf:r.vent==='vf'||r.vent==='torsades'};
  };
  sim.heartRate=function(){
    const r=COND[sim.key].r;
    if(r.vent==='none') return 0;
    if(r.vent==='vf') return null;
    const past=sim.vent.filter(e=>e.t<=sim.t).slice(-6);
    if(past.length<2) return null;
    return Math.round(60/((past[past.length-1].t-past[0].t)/(past.length-1)));
  };
  sim.qt=qtOf; sim.MORPH=MORPH;
  return sim;
}
window.KalpSim={createSim};
})();
