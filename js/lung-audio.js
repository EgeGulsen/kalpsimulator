/* Kalp Simülatörü: akciğer seslerinin tarayıcıda üretilmesi (Web Audio). Kayıt dosyası kullanılmaz.
   Her ses solunum döngüsüne göre planlanır: inspirasyon TI sn, ekspirasyon TE sn, döngü CYC sn (lung-viz.js ile aynı).
   KalpLungAudio.play(id) · stop() · playing · elapsed() (sn) · phase() (0 = ekspirasyon sonu, 1 = inspirasyon sonu)
   Sesler öğretici yaklaşık örneklerdir; gerçek hasta kaydı değildir. Kulaklıkla dinlemek önerilir. */
(function(){
'use strict';
const CYC=4, TI=1.6, TE=2.2;
let ctx=null, master=null, noiseBuf=null, cur=null, t0=0, next=0, timer=0, nodes=[];
function init(){
  if(ctx) return true;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
  ctx=new AC();
  const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=4;
  master=ctx.createGain(); master.gain.value=0.9; master.connect(comp); comp.connect(ctx.destination);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate); const d=noiseBuf.getChannelData(0);
  let b0=0,b1=0,b2=0; for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; b0=0.99765*b0+w*0.099046; b1=0.963*b1+w*0.2965164; b2=0.57*b2+w*1.0526913; d[i]=(b0+b1+b2+w*0.1848)*0.18; } // pembe gürültü
  return true;
}
const keep=n=>{ nodes.push(n); return n; };
function noise(at,dur){ const s=keep(ctx.createBufferSource()); s.buffer=noiseBuf; s.loop=true; s.start(at,Math.random()*1.5); s.stop(at+dur+0.05); return s; }
function filt(type,f,q){ const b=keep(ctx.createBiquadFilter()); b.type=type; b.frequency.value=f; if(q!=null) b.Q.value=q; return b; }
function env(g,pts){ g.gain.setValueAtTime(0,pts[0][0]); for(const [t,v] of pts) g.gain.linearRampToValueAtTime(v,t); }
function gainN(){ const g=keep(ctx.createGain()); g.gain.value=0; return g; }

/* Temel solunum sesi: veziküler (alçak geçiren) ya da bronşiyal (bant geçiren, iki faz, arada boşluk) */
function breath(T,kind,k){
  k=k==null?1:k;
  const src=noise(T,CYC), g=gainN();
  if(kind==='bro'){
    const hp=filt('highpass',350,0.7), bp=filt('bandpass',950,0.9), lp=filt('lowpass',2200,0.7);
    src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g);
    env(g,[[T,0],[T+0.12,0.95*k],[T+TI-0.3,0.95*k],[T+TI-0.12,0],[T+TI+0.22,0],[T+TI+0.4,1.05*k],[T+TI+TE-0.35,0.95*k],[T+TI+TE-0.1,0]]);
  } else {
    const lp=filt('lowpass',420,0.6), lp2=filt('lowpass',600,0.5), hp=filt('highpass',90,0.7);
    src.connect(hp); hp.connect(lp); lp.connect(lp2); lp2.connect(g);
    env(g,[[T,0],[T+0.35,1.1*k],[T+TI-0.15,1.25*k],[T+TI+0.05,0.55*k],[T+TI+0.7,0.0],[T+CYC,0]]);
  }
  g.connect(master);
}
/* Süreksiz ses (ral): kısa sönümlü titreşim */
function click(at,coarse){
  const o=keep(ctx.createOscillator()), g=gainN(), n=noise(at,0.05), ng=gainN(), bp=filt('bandpass',coarse?260:900,coarse?2:1.2);
  o.type='sine'; o.frequency.setValueAtTime(coarse?180+Math.random()*120:650+Math.random()*500,at);
  const dur=coarse?0.022:0.006, A=coarse?0.55:0.5;
  g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(A,at+0.0008); g.gain.exponentialRampToValueAtTime(0.001,at+dur);
  ng.gain.setValueAtTime(0,at); ng.gain.linearRampToValueAtTime(A*1.6,at+0.0006); ng.gain.exponentialRampToValueAtTime(0.001,at+dur*0.9);
  o.connect(g); g.connect(master); n.connect(bp); bp.connect(ng); ng.connect(master); o.start(at); o.stop(at+dur+0.02);
}
/* Sürekli müzikal ses (wheezing, ronküs, stridor) */
function tone(a,b,freqs,type,vol,lp){
  for(const f of freqs){ const o=keep(ctx.createOscillator()), g=gainN(), v=keep(ctx.createOscillator()), vg=gainN();
    o.type=type||'sine'; o.frequency.setValueAtTime(f,a); o.frequency.linearRampToValueAtTime(f*(0.94+Math.random()*0.04),b);
    v.frequency.value=5+Math.random()*4; vg.gain.value=f*0.012; v.connect(vg); vg.connect(o.frequency);
    let out=g; if(lp){ const l=filt('lowpass',lp,1); g.connect(l); out=l; }
    env(g,[[a,0],[a+0.12,vol],[b-0.15,vol*0.9],[b,0]]); o.connect(g); out.connect(master); o.start(a); o.stop(b+0.05); v.start(a); v.stop(b+0.05); }
}
function rub(a,b){ // gıcırdama: düzensiz kısa sürtünme patlamaları
  let t=a; while(t<b){ const d=0.018+Math.random()*0.03, n=noise(t,d), bp=filt('bandpass',180+Math.random()*220,1.6), g=gainN();
    n.connect(bp); bp.connect(g); g.connect(master); const A=0.9+Math.random()*0.9; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(A,t+0.004); g.gain.linearRampToValueAtTime(0,t+d); t+=d+0.008+Math.random()*0.03; }
}
const late=()=>TI*(0.45+0.55*Math.pow(Math.random(),0.5));
const SCHED={
  vez:T=>breath(T,'vez'),
  bro:T=>breath(T,'bro'),
  yok:T=>breath(T,'vez',0.14),
  ince:T=>{ breath(T,'vez',0.8); for(let i=0;i<14;i++) click(T+late(),false); },
  kaba:T=>{ breath(T,'vez',0.8); for(let i=0;i<7;i++) click(T+0.05+Math.random()*TI*0.5,true); for(let i=0;i<5;i++) click(T+TI+0.1+Math.random()*1.1,true); },
  wheeze:T=>{ breath(T,'vez',0.6); tone(T+TI+0.08,T+TI+TE-0.1,[430,575,720],'triangle',0.09); },
  ronkus:T=>{ breath(T,'vez',0.7); tone(T+0.2,T+TI-0.05,[135,182],'sawtooth',0.07,420); tone(T+TI+0.1,T+TI+TE-0.2,[128,170],'sawtooth',0.08,420); },
  stridor:T=>{ breath(T,'vez',0.4); tone(T+0.05,T+TI-0.02,[980,1320],'sawtooth',0.05,2600); const n=noise(T,TI), bp=filt('bandpass',1150,4), g=gainN(); n.connect(bp); bp.connect(g); g.connect(master); env(g,[[T,0],[T+0.1,0.8],[T+TI-0.1,0.8],[T+TI,0]]); },
  frot:T=>{ breath(T,'vez',0.7); rub(T+TI-0.6,T+TI-0.02); rub(T+TI+0.05,T+TI+0.7); }
};
function pump(){
  if(!cur||!ctx) return;
  while(next<ctx.currentTime+1.2){ SCHED[cur](next); next+=CYC; }
  if(nodes.length>600) nodes=nodes.slice(-300);
}
const API={
  supported:()=>!!(window.AudioContext||window.webkitAudioContext),
  play(id){
    if(!SCHED[id]||!init()) return false;
    API.stop(true); if(ctx.state==='suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0.9,ctx.currentTime);
    cur=id; t0=ctx.currentTime+0.06; next=t0; pump(); timer=setInterval(pump,250); return true;
  },
  stop(quiet){
    clearInterval(timer); timer=0; const was=cur; cur=null;
    if(ctx){ const now=ctx.currentTime; for(const n of nodes){ try{ if(n.stop) n.stop(now+0.02); }catch(e){} try{ n.disconnect(); }catch(e){} } }
    nodes=[]; void quiet; return was;
  },
  get playing(){ return cur; },
  elapsed(){ return cur&&ctx?Math.max(0,ctx.currentTime-t0):null; },
  phase(){ const e=API.elapsed(); if(e==null) return null; const p=e%CYC; return p<TI?0.5-0.5*Math.cos(p/TI*Math.PI):p<TI+TE?0.5+0.5*Math.cos((p-TI)/TE*Math.PI):0; },
  CYC,TI,TE
};
window.KalpLungAudio=API;
})();
