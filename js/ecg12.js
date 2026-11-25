/* Kalp Simülatörü: 12 derivasyonlu öğretici EKG modeli.
   Kalbin elektriksel etkinliği her an tek bir 3B vektörle (dipol) temsil edilir. Her derivasyon bu vektörün kendi
   yönüne düşen izdüşümünü (iç çarpım) çizer: vektör elektroda doğru bakıyorsa çizgi yukarı, uzağa bakıyorsa aşağı.
   Eksenler: +x hastanın solu, +y yukarı, +z ön (3D modelle aynı). Değerler yaklaşık ve eğitim amaçlıdır. */
(function(){
'use strict';
const g=(x,c,s)=>Math.exp(-((x-c)*(x-c))/(2*s*s));
const nrm=v=>{const l=Math.hypot(v[0],v[1],v[2]);return [v[0]/l,v[1]/l,v[2]/l];};
const sc=(s,v)=>{v=nrm(v);return [v[0]*s,v[1]*s,v[2]*s];};
const D=Math.PI/180;

/* Derivasyonlar: yön (pozitif kutbun baktığı yer), yerleşim, baktığı duvar, ilgili arter */
const fr=a=>[Math.cos(a*D),-Math.sin(a*D),0];         // frontal düzlem: 0° = hastanın solu, +90° = aşağı
const pc=a=>{const v=nrm([Math.cos(a*D),-0.2,Math.sin(a*D)]);return v.map(x=>x*1.5);}; // yatay düzlem: 0° = sol, 90° = ön
const LEADS={
  I:  {dir:fr(0),   plane:'Frontal', angle:'0°',   wall:'Yüksek yan duvar',  art:'Sirkumfleks (LCx), diyagonal', where:'Sağ kol (−) → sol kol (+). Einthoven üçgeninin üst kenarı.'},
  II: {dir:fr(60),  plane:'Frontal', angle:'+60°', wall:'Alt duvar',         art:'Çoğunlukla RCA',            where:'Sağ kol (−) → sol bacak (+). Normal kalp ekseniyle neredeyse aynı yöne baktığı için P ve QRS en net bu derivasyonda görülür; ritim şeridi olarak kullanılır.'},
  III:{dir:fr(120), plane:'Frontal', angle:'+120°',wall:'Alt duvar',         art:'Çoğunlukla RCA',            where:'Sol kol (−) → sol bacak (+).'},
  aVR:{dir:fr(-150),plane:'Frontal', angle:'−150°',wall:'Sağ omuzdan kalbin içine (kaviteye) bakar', art:'Sol ana koroner / yaygın iskemide ipucu verir', where:'Sağ koldaki elektrot pozitif, diğer iki uzvun ortalaması negatif kutup (güçlendirilmiş tek kutuplu derivasyon).'},
  aVL:{dir:fr(-30), plane:'Frontal', angle:'−30°', wall:'Yüksek yan duvar',  art:'Sirkumfleks (LCx), diyagonal', where:'Sol koldaki elektrot pozitif (güçlendirilmiş derivasyon).'},
  aVF:{dir:fr(90),  plane:'Frontal', angle:'+90°', wall:'Alt duvar',         art:'Çoğunlukla RCA',            where:'Sol bacaktaki elektrot pozitif; tam aşağıdan bakar (güçlendirilmiş derivasyon).'},
  V1: {dir:pc(115), plane:'Yatay',   angle:'115°', wall:'Septum ve sağ ventrikül', art:'LAD (septal dallar)', where:'4. kaburga aralığı, sternumun hemen sağı.'},
  V2: {dir:pc(92),  plane:'Yatay',   angle:'92°',  wall:'Septum',            art:'LAD (septal dallar)',      where:'4. kaburga aralığı, sternumun hemen solu.'},
  V3: {dir:pc(72),  plane:'Yatay',   angle:'72°',  wall:'Ön duvar',          art:'LAD',                       where:'V2 ile V4’ün tam ortası.'},
  V4: {dir:pc(52),  plane:'Yatay',   angle:'52°',  wall:'Ön duvar (tepe)',   art:'LAD',                       where:'5. kaburga aralığı, köprücük kemiğinin orta hattı.'},
  V5: {dir:pc(28),  plane:'Yatay',   angle:'28°',  wall:'Alt yan duvar',     art:'LCx, LAD’nin diyagonal dalları', where:'V4 hizasında, ön koltuk altı çizgisi.'},
  V6: {dir:pc(3),   plane:'Yatay',   angle:'3°',   wall:'Alt yan duvar',     art:'LCx',                       where:'V4 hizasında, orta koltuk altı çizgisi.'}
};
const ORDER=['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
const GRID=[['I','aVR','V1','V4'],['II','aVL','V2','V5'],['III','aVF','V3','V6']];

/* Vektör bileşenleri: [merkez (sn), genişlik, vektör] */
const VARIANTS={
  normal:{n:'Normal',
    P:[[.035,.018,sc(.13,[.3,-.8,.45])],[.07,.018,sc(.11,[.8,-.45,-.45])]],
    Q:[[.012,.007,sc(.25,[-.4,-.1,.6])],[.034,.009,sc(1.0,[.55,-.75,.45])],[.05,.009,sc(1.15,[.55,-.45,-.75])],[.07,.009,sc(.35,[-.2,.5,-.5])]],
    T:sc(.36,[.55,-.6,.3])},
  oldant:{n:'Eski ön duvar MI',
    P:null,
    Q:[[.012,.007,sc(.04,[-.4,-.1,.6])],[.034,.01,sc(.3,[.75,-.6,-.1])],[.052,.01,sc(1.2,[.55,-.45,-.8])],[.072,.009,sc(.35,[-.2,.5,-.5])]],
    T:sc(.25,[.6,-.5,-.55])},
  armswap:{n:'Kol elektrotları ters takılmış',P:null,Q:null,T:null,swap:true}
};
VARIANTS.oldant.P=VARIANTS.normal.P; VARIANTS.armswap.P=VARIANTS.normal.P; VARIANTS.armswap.Q=VARIANTS.normal.Q; VARIANTS.armswap.T=VARIANTS.normal.T;

function addC(o,list,d){ if(!list) return; for(const [c,w,v] of list){const a=g(d,c,w); o[0]+=v[0]*a;o[1]+=v[1]*a;o[2]+=v[2]*a;} }
/* dP: P başlangıcından beri geçen süre, dQ: QRS başlangıcından beri, qt: o atımın QT’si */
function vectorAt(dP,dQ,qt,variant){
  const V=VARIANTS[variant]||VARIANTS.normal, o=[0,0,0];
  if(dP!=null&&dP>-0.05&&dP<0.2) addC(o,V.P,dP);
  if(dQ!=null&&dQ>-0.05&&dQ<0.8){
    addC(o,V.Q,dQ);
    const a=g(dQ,qt-0.085,0.045); o[0]+=V.T[0]*a;o[1]+=V.T[1]*a;o[2]+=V.T[2]*a;
  }
  return o;
}
/* Kol elektrotları yer değiştirince: I ters döner, II↔III ve aVR↔aVL yer değiştirir, aVF değişmez */
const SWAP={I:['I',-1],II:['III',1],III:['II',1],aVR:['aVL',1],aVL:['aVR',1]};
function leadValue(lead,vec,variant){
  let k=lead,s=1;
  if(variant==='armswap'&&SWAP[lead]){k=SWAP[lead][0];s=SWAP[lead][1];}
  const d=LEADS[k].dir; return s*(vec[0]*d[0]+vec[1]*d[1]+vec[2]*d[2]);
}
window.KalpECG12={LEADS,ORDER,GRID,VARIANTS,vectorAt,leadValue};
})();
