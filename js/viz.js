/* Kalp Simülatörü: mercek görselleri.
   histo(id, lb, o)        mikroskop görünümü (SVG): solda dairesel alan, sağda etiket sütunu
   physio(canvas)          fizyoloji çizimleri (canvas): AP, Wiggers, basınç–hacim, Starling, koroner akım, otonom refleks
   mech(sc, step, lb)      ilaç mekanizması: hücre zarı ya da kaskad sahnesi, adım adım (SVG)
   micro(id, step, lb)     mikrobiyoloji patogenez sahnesi, adım adım (SVG)
   Doku renkleri boyaya göredir (H&E, Movat, EVG) ve temadan bağımsızdır; arayüz renkleri CSS değişkenlerinden gelir. */
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rng(seed){ let a=seed|0; return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}; }
const f1=n=>Math.round(n*10)/10;
const TX=(a,b)=>window.KalpI18n&&window.KalpI18n.lang==='en'?b:a; // Türkçe / İngilizce sabit metin

/* ================= HİSTOLOJİ ================= */
const HE={bg:'#fbeef3',pink:'#ef9fbb',pink2:'#e27aa0',pale:'#f7d3df',nuc:'#5a3b8f',nuc2:'#3d2470',coll:'#f3a3a0',rbc:'#d8364a',fat:'#fffafc'};
function nucleus(x,y,rx,ry,rot,c){ return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${rx}" ry="${ry}" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})" fill="${c||HE.nuc}" opacity=".9"/>`; }
function labelCol(lb,pts){ // pts: [key, x, y]; sütun x=420
  const n=pts.length, top=Math.max(26,200-n*21), out=[];
  pts.forEach(([k,x,y],i)=>{ const ly=top+i*42;
    out.push(`<path d="M${f1(x)} ${f1(y)} L${f1(Math.min(380,x+30))} ${f1(y)} L412 ${ly}" fill="none" stroke="var(--ink)" stroke-width="1.2" opacity=".55"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="var(--ink)" stroke="#fff" stroke-width="1.2"/>`);
    out.push(`<g class="hl"><rect x="414" y="${ly-13}" rx="9" width="214" height="26" fill="var(--surface)" stroke="var(--line-2)"/><text x="424" y="${ly+4.5}" font-size="12.5" font-weight="700" fill="var(--ink)">${esc(lb[k]||k)}</text></g>`);
  });
  return out.join('');
}
function scopeWrap(inner,lb,pts,extra,bg){
  return `<svg viewBox="0 0 640 400" class="vz-histo" role="img"><defs><clipPath id="hcClip"><circle cx="200" cy="200" r="186"/></clipPath>
  <radialGradient id="hcVig" cx="50%" cy="50%" r="50%"><stop offset="70%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
  <circle cx="200" cy="200" r="196" fill="#111" opacity=".9"/>
  <g clip-path="url(#hcClip)"><rect width="400" height="400" fill="${bg||HE.bg}"/>${inner}<circle cx="200" cy="200" r="186" fill="url(#hcVig)"/></g>
  <circle cx="200" cy="200" r="187" fill="none" stroke="#2a2f38" stroke-width="5"/>
  ${labelCol(lb,pts)}${extra||''}</svg>`;
}
function fiber(r,y0,thick,x0,x1,col){ // dalgalı kas lifi bandı
  let d=`M${x0} ${y0}`, d2=''; const pts=[];
  for(let x=x0;x<=x1;x+=20){ pts.push([x,y0+Math.sin(x/37+r()*0.3)*4]); }
  d='M'+pts.map(p=>p[0]+' '+f1(p[1]-thick/2)).join(' L')+' L'+pts.slice().reverse().map(p=>p[0]+' '+f1(p[1]+thick/2)).join(' L')+'Z';
  return `<path d="${d}" fill="${col}" stroke="#d46b91" stroke-width=".6" opacity=".95"/>`;
}
const H={};
H.duvar=(lb)=>{ const r=rng(3); let s='';
  s+=`<rect x="0" y="0" width="400" height="58" fill="#fff6f8"/>`; // lümen
  for(let i=0;i<14;i++) s+=`<circle cx="${30+r()*340}" cy="${10+r()*36}" r="4" fill="${HE.rbc}" opacity=".55"/>`;
  s+=`<rect x="0" y="58" width="400" height="5" fill="${HE.pink2}"/>`;
  for(let x=10;x<400;x+=34) s+=nucleus(x+r()*8,60.5,8,2,0,HE.nuc2);
  s+=`<rect x="0" y="63" width="400" height="42" fill="#f8dde6"/>`;
  for(let x=-10;x<400;x+=44){ s+=`<rect x="${x+r()*6}" y="70" width="38" height="28" rx="8" fill="#fbeff3" stroke="${HE.pink}" stroke-width="2"/>`+nucleus(x+19,84,5,4,0); }
  for(let y=112;y<258;y+=13) s+=fiber(r,y,10,-10,410,r()<.5?HE.pink:'#f2a9c2');
  for(let i=0;i<60;i++) s+=nucleus(r()*400,110+r()*148,6,2.2,(r()-.5)*14);
  s+=`<rect x="0" y="258" width="400" height="5" fill="${HE.pink2}"/>`;
  for(let x=10;x<400;x+=40) s+=nucleus(x,260.5,7,2,0,HE.nuc2);
  s+=`<rect x="0" y="263" width="400" height="58" fill="#fdf1f5"/>`;
  for(let i=0;i<30;i++){ const x=r()*400,y=268+r()*48; s+=`<circle cx="${x}" cy="${y}" r="${9+r()*6}" fill="${HE.fat}" stroke="#eab3c6" stroke-width="1.2"/>`; }
  s+=`<circle cx="250" cy="292" r="22" fill="#f3b0c6" stroke="${HE.pink2}" stroke-width="5"/><circle cx="250" cy="292" r="11" fill="#fff"/>`;
  s+=`<rect x="0" y="321" width="400" height="5" fill="${HE.pink2}" opacity=".7"/><rect x="0" y="326" width="400" height="14" fill="#fff"/>`;
  s+=`<rect x="0" y="340" width="400" height="5" fill="${HE.pink2}"/>`;
  for(let y=348;y<400;y+=7) s+=`<path d="M0 ${y} Q100 ${y-4} 200 ${y} T400 ${y}" stroke="#e48a8f" stroke-width="4" fill="none" opacity=".85"/>`;
  return scopeWrap(s,lb,[['lum',120,30],['endot',90,60],['purk',150,84],['endo',300,94],['myo',200,180],['epi',120,268],['fat',90,300],['cor',250,292],['cav',200,333],['fib',200,370]]);
};
H.miyosit=(lb)=>{ const r=rng(11); let s='';
  const rows=[70,128,186,244,302,350];
  rows.forEach((y,i)=>{ s+=fiber(r,y,40,-20,420,i%2?HE.pink:'#f2a9c2');
    for(let x=-20;x<420;x+=7) s+=`<line x1="${x}" y1="${y-17}" x2="${x}" y2="${y+17}" stroke="#d9709a" stroke-width=".8" opacity=".5"/>`;
    for(let k=0;k<3;k++){ const x=60+k*130+r()*30; s+=nucleus(x,y,11,5,0); s+=`<ellipse cx="${x+15}" cy="${y}" rx="4" ry="2.5" fill="#c99a3c" opacity=".8"/>`; } });
  // dallanma
  s+=`<path d="M150 90 C175 104 190 112 215 108 L230 128 C205 132 180 124 150 104Z" fill="${HE.pink}" stroke="#d46b91" stroke-width=".6"/>`;
  s+=`<path d="M290 206 C312 218 330 224 352 222 L360 244 C335 244 314 236 288 222Z" fill="#f2a9c2" stroke="#d46b91" stroke-width=".6"/>`;
  // interkalar diskler (basamaklı)
  const disk=(x,y)=>`<path d="M${x} ${y-19} l0 8 l6 0 l0 8 l-5 0 l0 8 l7 0 l0 14" stroke="#4a1d4f" stroke-width="2.6" fill="none"/>`;
  [[110,70],[250,128],[180,186],[320,244],[120,302],[280,350],[340,70],[60,186]].forEach(([x,y])=>s+=disk(x,y));
  // kapiller
  s+=`<ellipse cx="210" cy="157" rx="30" ry="7" fill="#fff"/><circle cx="200" cy="157" r="4.5" fill="${HE.rbc}"/><circle cx="214" cy="157" r="4.5" fill="${HE.rbc}"/>`;
  const extra=`<g transform="translate(418 290)"><rect width="214" height="104" rx="12" fill="var(--surface)" stroke="var(--line-2)"/>
    <path d="M14 14 v20 h24 v22 h24 v22 h24 v14" stroke="#4a1d4f" stroke-width="4" fill="none"/>
    <circle cx="26" cy="34" r="4.5" fill="#0e8f7e"/><circle cx="50" cy="56" r="4.5" fill="#0e8f7e"/><circle cx="74" cy="78" r="4.5" fill="#0e8f7e"/>
    <rect x="10" y="40" width="8" height="8" fill="#e5484d"/><rect x="34" y="62" width="8" height="8" fill="#e5484d"/>
    <rect x="36" y="22" width="4" height="10" fill="#f2a93b"/><rect x="60" y="44" width="4" height="10" fill="#f2a93b"/>
    <text x="100" y="30" font-size="11" font-weight="700" fill="#0e8f7e">${esc(lb.gap)}</text>
    <text x="100" y="56" font-size="11" font-weight="700" fill="#e5484d">${esc(lb.desm)}</text>
    <text x="100" y="82" font-size="11" font-weight="700" fill="#b87400">${esc(lb.fasc)}</text></g>`;
  return scopeWrap(s,lb,[['nuc',60,70],['lip',75,70],['disk',250,128],['branch',200,110],['cap',210,157]],extra);
};
H.sarkomer=(lb)=>{ // elektron mikroskobu: iki sarkomer, kasılma animasyonu
  let s=`<rect width="400" height="400" fill="#e9e6e1"/>`;
  const yA=[150,180,210,240], mid=200;
  const act=(dir)=>yA.map(y=>[y-7,y+7].map(yy=>`<line x1="${dir<0?40:360}" y1="${yy}" x2="${dir<0?170:230}" y2="${yy}" stroke="#4d4d4d" stroke-width="2.2"/>`).join('')).join('');
  s+=`<g><animateTransform attributeName="transform" type="translate" values="0 0;22 0;0 0" dur="2.4s" repeatCount="indefinite"/>${act(-1)}<rect x="34" y="120" width="10" height="150" fill="#1d1d1d"/></g>`;
  s+=`<g><animateTransform attributeName="transform" type="translate" values="0 0;-22 0;0 0" dur="2.4s" repeatCount="indefinite"/>${act(1)}<rect x="356" y="120" width="10" height="150" fill="#1d1d1d"/></g>`;
  yA.forEach(y=>{ s+=`<line x1="110" y1="${y}" x2="290" y2="${y}" stroke="#262626" stroke-width="6" stroke-linecap="round"/>`;
    for(let x=118;x<=282;x+=12) if(Math.abs(x-mid)>14) s+=`<line x1="${x}" y1="${y-3}" x2="${x+(x<mid?-5:5)}" y2="${y-8}" stroke="#262626" stroke-width="1.6"/><line x1="${x}" y1="${y+3}" x2="${x+(x<mid?-5:5)}" y2="${y+8}" stroke="#262626" stroke-width="1.6"/>`; });
  s+=`<line x1="${mid}" y1="125" x2="${mid}" y2="265" stroke="#555" stroke-width="2" stroke-dasharray="4 3"/>`;
  s+=`<path d="M44 290 Q120 300 200 290" stroke="#b5442e" stroke-width="2" fill="none" stroke-dasharray="3 3"/>`;
  s+=`<g font-size="12" font-weight="700" fill="#333"><path d="M110 105 h180" stroke="#0e8f7e" stroke-width="3"/><path d="M110 99 v12 M290 99 v12" stroke="#0e8f7e" stroke-width="3"/>
    <path d="M44 330 h66" stroke="#7b61ff" stroke-width="3"/><path d="M186 330 h28" stroke="#ef6a5b" stroke-width="3"/></g>`;
  return scopeWrap(s,lb,[['z',39,140],['i',77,330],['a',200,105],['h',200,330],['m',200,262],['act',140,157],['myo',250,180],['tit',120,292]],'','#e9e6e1');
};
H.ileti=(lb)=>{ const r=rng(21); let s='';
  s+=`<rect width="200" height="400" fill="#f6c9c2"/>`;
  for(let i=0;i<70;i++){ const x=r()*190,y=r()*400; s+=`<path d="M${x} ${y} q12 -5 24 0" stroke="#e08f7f" stroke-width="3" fill="none" opacity=".8"/>`; }
  s+=`<circle cx="100" cy="200" r="30" fill="#f5b5c6" stroke="${HE.pink2}" stroke-width="6"/><circle cx="100" cy="200" r="15" fill="#fff"/><circle cx="96" cy="198" r="4" fill="${HE.rbc}"/>`;
  for(let i=0;i<46;i++){ const a=r()*6.28, d=45+r()*90, x=100+Math.cos(a)*d*0.8, y=200+Math.sin(a)*d*1.6; if(x<5||x>195||y<5||y>395) continue;
    s+=`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="9" ry="6" fill="#fbe3ea" stroke="#e7a2b8"/>`+nucleus(x,y,3,2.4,0); }
  for(let y=30;y<400;y+=60) s+=fiber(r,y,12,170,200,'#f2a9c2');
  s+=`<line x1="200" y1="0" x2="200" y2="400" stroke="#fff" stroke-width="4"/>`;
  s+=`<rect x="200" y="0" width="200" height="26" fill="#fff6f8"/><rect x="200" y="26" width="200" height="4" fill="${HE.pink2}"/>`;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++){ const x=212+j*62,y=46+i*58; s+=`<rect x="${x}" y="${y}" width="54" height="48" rx="10" fill="#fdf6f8" stroke="${HE.pink}" stroke-width="5"/>`+nucleus(x+27,y+24,6,5,0)+`<circle cx="${x+14}" cy="${y+14}" r="3" fill="#f3d9e2"/>`; }
  for(let y=230;y<400;y+=14) s+=fiber(r,y,11,200,410,HE.pink2);
  for(let i=0;i<14;i++) s+=nucleus(210+r()*185,232+r()*160,6,2,0);
  return scopeWrap(s,lb,[['p',100,260],['art',100,200],['ct',40,60],['tr',185,90],['endo',300,27],['purk',300,120],['gly',226,60],['work',300,300]]);
};
H.kapak=(lb)=>{ const r=rng(5); let s=`<rect width="400" height="400" fill="#f4f1ea"/>`;
  const band=(off,th,col)=>{ let top=[],bot=[]; for(let x=-10;x<=410;x+=20){ const y=140+Math.sin(x/70)*18+off; top.push(x+' '+f1(y)); bot.push(x+' '+f1(y+th)); } return `<path d="M${top.join(' L')} L${bot.reverse().join(' L')}Z" fill="${col}"/>`; };
  s+=band(-8,4,'#7b2b5c'); // endotel
  s+=band(-4,22,'#2a2a2a'); // atrialis (elastin siyah)
  s+=band(18,52,'#7fc2b8'); // spongiosa
  s+=band(70,62,'#f2cf4f'); // fibrosa kollajen
  s+=band(132,4,'#7b2b5c');
  for(let i=0;i<40;i++){ const x=r()*400, y=150+Math.sin(x/70)*18+r()*120; s+=nucleus(x,y,5,1.8,(r()-.5)*20,'#222'); }
  s+=`<path d="M300 300 C320 340 330 370 335 410 L355 410 C350 370 340 335 322 296Z" fill="#f2cf4f" stroke="#c9a52a"/>`;
  s+=`<text x="20" y="60" font-size="13" font-weight="700" fill="#555">↑</text>`;
  return scopeWrap(s,lb,[['at',200,90],['end',120,128],['atr',260,150],['spo',200,190],['fib',160,240],['vic',90,230],['ve',200,330],['ch',330,370]],'','#f4f1ea');
};
H.koroner=(lb,o)=>{ const r=rng(9); let s=`<rect width="400" height="400" fill="#f6e7e4"/>`;
  for(let i=0;i<90;i++){ const a=r()*6.28,d=150+r()*60; s+=`<path d="M${f1(200+Math.cos(a)*d)} ${f1(200+Math.sin(a)*d)} q8 -6 16 0" stroke="#d65a68" stroke-width="3" fill="none" opacity=".7"/>`; }
  [[60,80],[320,90],[90,330],[330,320]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#c6463f" stroke-width="3"/>`);
  s+=`<circle cx="200" cy="200" r="138" fill="none" stroke="#222" stroke-width="3"/>`;
  s+=`<circle cx="200" cy="200" r="118" fill="#e7c97c"/>`;
  for(let i=0;i<120;i++){ const a=r()*6.28,d=80+r()*34; s+=nucleus(200+Math.cos(a)*d,200+Math.sin(a)*d,5,1.6,a*57.3+90,'#5b3c2a'); }
  let iel=''; for(let k=0;k<=72;k++){ const a=k/72*6.283, rr=80+Math.sin(k*1.7)*2.2; iel+=(k?'L':'M')+f1(200+Math.cos(a)*rr)+' '+f1(200+Math.sin(a)*rr); }
  s+=`<path d="${iel}Z" fill="#f7e8e6" stroke="#111" stroke-width="3.5"/>`;
  if(o&&o.plaque){
    s+=`<path d="M128 170 C140 120 210 102 262 128 C230 150 210 178 200 210 C178 214 150 200 128 170Z" fill="#f6efd5" stroke="#d65a68" stroke-width="5"/>`;
    s+=`<path d="M160 160 C180 138 215 128 240 136 C220 154 205 172 196 192 C180 190 166 180 160 160Z" fill="#f2df9a"/>`;
    for(let i=0;i<7;i++){ const x=170+r()*50,y=150+r()*30; s+=`<path d="M${f1(x)} ${f1(y)} l${f1(8+r()*8)} ${f1(-4+r()*8)}" stroke="#fff" stroke-width="2.5"/>`; }
    for(let i=0;i<6;i++) s+=`<circle cx="${f1(140+r()*30)}" cy="${f1(165+r()*25)}" r="6" fill="#fff8f0" stroke="#d9a0a0"/>`;
    s+=`<circle cx="226" cy="218" r="42" fill="#fff"/>`;
  } else s+=`<circle cx="200" cy="200" r="70" fill="#fff"/>`;
  s+=`<circle cx="200" cy="200" r="${o&&o.plaque?0:70}" fill="none" stroke="#7b2b5c" stroke-width="2.5"/>`;
  const pts=[['lum',o&&o.plaque?226:200,o&&o.plaque?218:200],['end',200,130],['int',200,124],['iel',280,200],['med',200,300],['eel',338,200],['adv',200,360],['vv',320,90]];
  if(o&&o.plaque) pts.push(['core',200,160],['cap',245,140],['foam',150,180]);
  return scopeWrap(s,lb,pts,'','#f6e7e4');
};
H.aschoff=(lb)=>{ const r=rng(14); let s='';
  for(let y=30;y<400;y+=36) s+=fiber(r,y,26,-20,420,y%72?HE.pink:'#f2a9c2');
  for(let i=0;i<40;i++) s+=nucleus(r()*400,20+r()*360,8,3,0);
  s+=`<ellipse cx="200" cy="205" rx="120" ry="78" fill="#f7dbe5"/>`;
  s+=`<ellipse cx="200" cy="205" rx="48" ry="30" fill="#f08cb2" opacity=".9"/>`;
  s+=`<circle cx="300" cy="170" r="14" fill="#fff" stroke="${HE.pink2}" stroke-width="4"/>`;
  for(let i=0;i<9;i++){ const a=r()*6.28, d=56+r()*30, x=200+Math.cos(a)*d*1.3, y=205+Math.sin(a)*d*.75, rot=r()*180;
    s+=`<g transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="13" ry="5" fill="#b8a1d9"/><path d="M${f1(x-10)} ${f1(y)} q3 -3 5 0 t5 0 t5 0 t5 0" stroke="${HE.nuc2}" stroke-width="2" fill="none"/></g>`; }
  s+=`<ellipse cx="140" cy="240" rx="22" ry="15" fill="#e8b9d0"/>`+[0,1,2,3].map(k=>nucleus(128+k*8,236+(k%2)*6,4,3,0,HE.nuc2)).join('');
  for(let i=0;i<30;i++){ const a=r()*6.28,d=90+r()*30; s+=`<circle cx="${f1(200+Math.cos(a)*d*1.25)}" cy="${f1(205+Math.sin(a)*d*.72)}" r="3.6" fill="${HE.nuc2}"/>`; }
  return scopeWrap(s,lb,[['fib',200,205],['ani',258,236],['giant',140,240],['lym',90,205],['ves',300,170],['myo',200,40]]);
};
H.vejetasyon=(lb)=>{ const r=rng(31); let s=`<rect width="400" height="400" fill="#fff4f7"/>`;
  s+=`<path d="M-10 300 C100 280 300 290 410 300 L410 410 L-10 410Z" fill="#f3a3a0"/>`;
  for(let i=0;i<20;i++) s+=nucleus(r()*400,310+r()*80,6,2,(r()-.5)*15,'#7a4a8f');
  s+=`<path d="M60 296 C70 200 130 120 210 110 C300 100 340 190 345 292Z" fill="#f6b9cf"/>`;
  for(let i=0;i<18;i++){ const y=130+i*9; s+=`<path d="M${f1(80+i*2)} ${y+r()*6} Q200 ${y-10} ${f1(330-i*2)} ${y+r()*6}" stroke="#e389ab" stroke-width="2" fill="none" opacity=".8"/>`; }
  for(let k=0;k<6;k++){ const cx=130+r()*150, cy=150+r()*110; for(let i=0;i<26;i++) s+=`<circle cx="${f1(cx+(r()-.5)*28)}" cy="${f1(cy+(r()-.5)*22)}" r="2.2" fill="#3c2a8f"/>`; }
  for(let i=0;i<16;i++){ const x=90+r()*230,y=140+r()*140; s+=[0,1,2].map(k=>`<circle cx="${f1(x+k*4)}" cy="${f1(y+(k%2)*3)}" r="2.8" fill="${HE.nuc}"/>`).join(''); }
  s+=`<path d="M300 120 C320 100 345 96 360 110 C350 130 325 134 300 120Z" fill="#f6b9cf"/><path d="M335 90 l28 -30 m-28 30 l10 -2 m-10 2 l2 -10" stroke="var(--no)" stroke-width="3" fill="none"/>`;
  s+=`<path d="M55 297 C65 297 72 299 80 300" stroke="#c7303f" stroke-width="4"/>`;
  return scopeWrap(s,lb,[['fib',200,140],['bac',200,200],['neu',260,250],['val',200,350],['end',66,297],['emb',330,112]]);
};

/* ================= FİZYOLOJİ (canvas) ================= */
function css(n,d){ try{ return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||d; }catch(e){ return d; } }
function physio(cv){
  const x=cv.getContext('2d'); let id=null, ctl='norm', lb={}, t=0, W=0, Hh=0, ease={};
  const C={};
  function colors(){ C.ink=css('--ink','#1b2333'); C.mute=css('--mute','#66738a'); C.line=css('--line','#e3e8f0'); C.teal=css('--teal','#0e8f7e'); C.coral=css('--coral','#ef6a5b'); C.violet=css('--violet','#7b61ff'); C.amber=css('--amber','#f2a93b'); C.paper=css('--ecg-paper','#fbfdff'); C.grid=css('--ecg-minor','#edf2f8'); C.ok=css('--ok','#12955a'); C.no=css('--no','#e5484d'); C.blue='#3b82f6'; }
  function resize(){ const r=cv.getBoundingClientRect(), d=Math.min(2,window.devicePixelRatio||1); if(!r.width) return; cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d); x.setTransform(d,0,0,d,0,0); W=r.width; Hh=r.height; colors(); }
  const txt=(s,px,py,o)=>{ o=o||{}; x.font=`${o.w||600} ${o.s||11.5}px "Plus Jakarta Sans",system-ui,sans-serif`; x.fillStyle=o.c||C.mute; x.textAlign=o.a||'left'; x.textBaseline=o.b||'alphabetic'; x.fillText(s,px,py); };
  const line=(pts,col,w,dash)=>{ x.beginPath(); pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.strokeStyle=col; x.lineWidth=w||2; x.setLineDash(dash||[]); x.stroke(); x.setLineDash([]); };
  const pill=(s,px,py,col)=>{ x.font='700 11px "Plus Jakarta Sans",system-ui,sans-serif'; const w=x.measureText(s).width+14; x.fillStyle=col; x.globalAlpha=.14; rr(px-w/2,py-10,w,20,10); x.fill(); x.globalAlpha=1; txt(s,px,py+4,{c:col,a:'center',w:700,s:11}); };
  const rr=(a,b,w,h,r)=>{ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); };
  const lerp=(k,v,s)=>{ ease[k]=ease[k]==null?v:ease[k]+(v-ease[k])*Math.min(1,s||0.08); return ease[k]; };
  const gs=(z,c,w)=>Math.exp(-((z-c)*(z-c))/(2*w*w));
  /* EKG şablonu (tek atım, s cinsinden) */
  const ecgAt=(u,qt)=>{ qt=qt||0.36; return .14*gs(u,-0.12,.022)-0.08*gs(u,-.012,.008)+1.1*gs(u,.012,.011)-.25*gs(u,.035,.01)+.3*gs(u,qt-.08,.045); };

  const D={};
  D.ap_sa=()=>{ const sl=ctl==='symp'?0.32:ctl==='vag'?0.95:0.58, mdp=ctl==='vag'?-66:-60, per=sl+0.22, win=3.2;
    const L=46,R=W-16,T=18,B=Hh-30, ym=v=>B-(v+75)/(105)*(B-T), xs=s=>L+(s/win)*(R-L);
    line([[L,ym(-40)],[R,ym(-40)]],C.mute,1,[4,4]); txt(lb.thr||TX('Eşik','Threshold'),R-4,ym(-40)-5,{a:'right'});
    [-60,-40,-20,0,20].forEach(v=>{ txt(v,L-8,ym(v)+4,{a:'right',s:10}); line([[L-4,ym(v)],[L,ym(v)]],C.mute,1); });
    txt(lb.mv||'mV',L-8,T-4,{a:'right',s:10,w:700});
    const vm=s=>{ const p=((s%per)+per)%per; if(p<sl){ const k=p/sl; return mdp+(-40-mdp)*(0.55*k+0.45*k*k); } const q=p-sl; if(q<0.06) return -40+50*Math.sin(q/0.06*Math.PI/2); const k=Math.min(1,(q-0.06)/0.16); return 10+(mdp-10)*(1-Math.pow(1-k,1.6)); };
    const t0=t-win, pts=[]; for(let i=0;i<=300;i++){ const s=t0+i/300*win; pts.push([xs(i/300*win),ym(vm(s))]); }
    line(pts,C.teal,2.4);
    const c0=Math.floor(t/per)*per-per; const px=c0-t0;
    if(px>0){ pill(lb.f4||'Faz 4',xs(px+sl*0.5),ym(-48)+26,C.violet); pill(lb.f0||'Faz 0',xs(px+sl+0.03),ym(14)-12,C.coral); pill(lb.f3||'Faz 3',xs(px+sl+0.16),ym(-20),C.blue); }
    pill((lb.hr||TX('Hız','Rate'))+' '+Math.round(60/per)+TX('/dk','/min'),L+70,T+10,C.ink);
  };
  D.ap_v=()=>{ const per=1.0, L=46,R=W-16,T=14,B=Hh*0.66, ym=v=>B-(v+100)/(135)*(B-T), xs=s=>L+s/per*(R-L);
    const up=ctl==='nab'?0.012:0.002, pk=ctl==='nab'?12:28, d3=ctl==='kb'?0.44:0.31;
    const vm=s=>{ if(s<0.05) return -90; const u=s-0.05; if(u<up) return -90+(pk+90)*(u/up); if(u<up+0.02) return pk-(pk-6)*((u-up)/0.02); if(u<d3-0.08) return 6-10*((u-up-0.02)/(d3-0.1-up)); if(u<d3+0.08){ const k=(u-d3+0.08)/0.16; return -4-86*(k*k*(3-2*k)); } return -90; };
    [-90,-60,-30,0,30].forEach(v=>{ txt(v,L-8,ym(v)+4,{a:'right',s:10}); line([[L,ym(v)],[R,ym(v)]],C.line,1); });
    txt(lb.mv||'mV',L-8,T+2,{a:'right',s:10,w:700});
    const pts=[]; for(let i=0;i<=400;i++){ const s=i/400*per; pts.push([xs(s),ym(vm(s))]); } line(pts,C.teal,2.6);
    if(ctl!=='norm'){ const p0=[]; for(let i=0;i<=400;i++){ const s=i/400*per; const u=s-0.05; let v; if(s<0.05||u>0.39) v=-90; else if(u<0.002) v=-90+118*(u/0.002); else if(u<0.022) v=28-22*((u-0.002)/0.02); else if(u<0.23) v=6-10*((u-0.022)/0.208); else { const k=(u-0.23)/0.16; v=-4-86*(k*k*(3-2*k)); } p0.push([xs(s),ym(v)]); } line(p0,C.mute,1.4,[5,4]); }
    pill('0',xs(0.06),ym(pk)-14,C.coral); pill('1',xs(0.08),ym(10)-2,C.mute); pill(lb.f2||'2',xs(0.05+(d3-0.1)/2+0.03),ym(2)-16,C.amber); pill('3',xs(0.05+d3+0.03),ym(-50),C.blue); pill('4',xs(0.75),ym(-90)-14,C.violet);
    const eb=Hh-14, ey=v=>eb-v*(Hh*0.18), qt=d3+0.06, ep=[]; for(let i=0;i<=400;i++){ const s=i/400*per; ep.push([xs(s),ey(ecgAt(s-0.055,qt))]); }
    line(ep,C.ink,1.6); txt(lb.ecg||'EKG',L-8,eb-6,{a:'right',s:10,w:700});
    line([[xs(0.045),eb+6],[xs(0.05+qt),eb+6]],C.coral,2); txt((lb.qt||'QT')+' '+Math.round(qt*1000)+' ms',xs(0.05+qt)+6,eb+10,{c:C.coral,w:700,s:11});
    const cur=(t%per); line([[xs(cur),T],[xs(cur),eb+4]],C.coral,1.2,[3,3]); x.fillStyle=C.coral; x.beginPath(); x.arc(xs(cur),ym(vm(cur)),4.5,0,7); x.fill();
    const u=cur-0.05, ina=u>0&&u<0.004+up?1:0, ica=u>0.01&&u<d3?Math.max(0,1-u/d3)*0.9+0.1:0, ik=u>0.05&&u<d3+0.1?Math.min(1,(u-0.05)/(d3-0.05))*(ctl==='kb'?0.45:1):0;
    [[lb.ina||'INa',ina,C.coral],[lb.ica||'ICa-L',ica,C.amber],[lb.ik||'IK',ik,C.blue]].forEach(([n,v,c],i)=>{ const bx=R-170, by=T+8+i*18; txt(n,bx,by+9,{s:10.5,w:700,c}); x.fillStyle=C.line; rr(bx+48,by,110,10,5); x.fill(); x.fillStyle=c; rr(bx+48,by,Math.max(4,110*v),10,5); x.fill(); });
  };
  D.wiggers=()=>{ const per=0.8, L=96,R=W-16; const rows=[[0.04,0.42],[0.47,0.66],[0.7,0.84],[0.87,0.97]];
    const Y=(r,k)=>Hh*rows[r][1]-(Hh*(rows[r][1]-rows[r][0]))*k;
    const s0=0.1, ivc=0.15, ej=0.42, ivr=0.5, ras=0.72;
    const lv=s=>{ if(s<s0) return 6+4*Math.sin(Math.PI*s/s0); if(s<ivc) return 8+72*Math.pow((s-s0)/(ivc-s0),1.4); if(s<ej){ const k=(s-ivc)/(ej-ivc); return 80+40*Math.sin(Math.PI*Math.min(1,k*1.15))*(k<0.87?1:Math.max(0,1-(k-0.87)/0.13))+(k>0.87?-40*(k-0.87)/0.13:0); } if(s<ivr){ const k=(s-ej)/(ivr-ej); return 80*(1-k)+2*k; } return 2+4*Math.max(0,(s-ras)/(per-ras)); };
    const ao=s=>{ if(s<ivc) return 80+ (0-0)*s - (s/ivc)*0; if(s<ej) return Math.max(80,lv(s)); if(s<ej+0.02) return 98-6*Math.sin(Math.PI*(s-ej)/0.02); return 98-(98-80)*((s-ej-0.02)/(per-ej-0.02+ivc)); };
    const aoP=s=>{ const v=ao(s); return s<ivc?80+ (1-s/ivc)*0 - (s/ivc)*0 : v; };
    const la=s=>{ if(s<s0) return 6+5*Math.sin(Math.PI*s/s0); if(s<ivc+0.02) return 6+2*gs(s,ivc,0.012)*1; if(s<ivr) return 5+8*((s-ivc)/(ivr-ivc)); if(s<ivr+0.08) return 13-7*((s-ivr)/0.08); return 6; };
    const vol=s=>{ if(s<s0) return 108+12*(s/s0); if(s<ivc) return 120; if(s<ej){ const k=(s-ivc)/(ej-ivc); return 120-70*(1-Math.pow(1-k,1.8)); } if(s<ivr) return 50; if(s<ivr+0.12){ const k=(s-ivr)/0.12; return 50+48*(1-Math.pow(1-k,2)); } return 98+10*((s-ivr-0.12)/(per-ivr-0.12)); };
    const xs=s=>L+s/per*(R-L);
    [[0,s0,lb.as],[s0,ivc,lb.ivc],[ivc,ej,lb.ej],[ej,ivr,lb.ivr],[ivr,per,lb.fill]].forEach(([a,b,n],i)=>{ x.fillStyle=i%2?C.line:'transparent'; x.globalAlpha=.55; x.fillRect(xs(a),4,xs(b)-xs(a),Hh-8); x.globalAlpha=1; });
    const curS=t%per, ph=[[0,s0,lb.as],[s0,ivc,lb.ivc],[ivc,ej,lb.ej],[ej,ivr,lb.ivr],[ivr,per,lb.fill]].find(p=>curS>=p[0]&&curS<p[1]);
    const P=k=>Y(0,k/130), ptsA=[],ptsL=[],ptsLA=[],ptsV=[],ptsE=[];
    for(let i=0;i<=400;i++){ const s=i/400*per, px=xs(s); ptsA.push([px,P(s<ivc?80-(s/ivc)*0:aoP(s))]); ptsL.push([px,P(lv(s))]); ptsLA.push([px,P(la(s))]); ptsV.push([px,Y(1,(vol(s)-40)/90)]); ptsE.push([px,Y(2,0.25+0.6*ecgAt(s-s0-0.005))]); }
    ptsA.forEach((p,i)=>{ const s=i/400*per; if(s>=ej) p[1]=P(ao(s)); else if(s<ivc) p[1]=P(80+(98-80)*0 - 0); });
    for(let i=0;i<=400;i++){ const s=i/400*per; if(s<ivc){ const last=98-(98-80)*((s+per-ej-0.02)/(per-ej-0.02+ivc)); ptsA[i][1]=P(Math.max(80,last)); } }
    line(ptsA,C.coral,2.2); line(ptsL,C.teal,2.4); line(ptsLA,C.violet,1.8); line(ptsV,C.amber,2.2); line(ptsE,C.ink,1.5);
    txt(lb.ao||'Aort',L-8,P(100),{a:'right',c:C.coral,w:700,s:10.5}); txt(lb.lv||'LV',L-8,P(60),{a:'right',c:C.teal,w:700,s:10.5}); txt(lb.la||'LA',L-8,P(14),{a:'right',c:C.violet,w:700,s:10.5});
    txt(lb.vol||'Hacim',L-8,Y(1,0.5),{a:'right',c:C.amber,w:700,s:10.5}); txt(lb.ecg||'EKG',L-8,Y(2,0.4),{a:'right',w:700,s:10.5}); txt(lb.snd||'Ses',L-8,Y(3,0.4),{a:'right',w:700,s:10.5});
    txt('120',L-40,P(120)+4,{a:'right',s:9}); txt((lb.edv||'EDV')+' 120',xs(ivc)+4,Y(1,(120-40)/90)-4,{s:10,c:C.amber,w:700}); txt((lb.esv||'ESV')+' 50',xs(ej)+4,Y(1,(50-40)/90)+12,{s:10,c:C.amber,w:700});
    [[s0+0.01,'S1'],[ej,'S2']].forEach(([s,n])=>{ for(let k=0;k<6;k++) line([[xs(s)+k*3,Y(3,0.1)],[xs(s)+k*3,Y(3,0.9)]],C.ink,1.4); txt(n,xs(s)+22,Y(3,0.35),{w:700,c:C.ink}); });
    [[s0+0.005,lb.mc],[ivc,lb.ao2],[ej,lb.ac],[ivr,lb.mo]].forEach(([s,n],i)=>{ line([[xs(s),12],[xs(s),Hh*0.42]],C.mute,1,[3,3]); txt(n,xs(s)+3,14+(i%2)*12,{s:9.5,w:700}); });
    line([[xs(curS),4],[xs(curS),Hh-4]],C.coral,1.4); if(ph) pill(ph[2],Math.min(R-70,Math.max(L+70,xs(curS))),Hh*0.445,C.coral);
  };
  const PV={norm:{edv:120,esv:50,edp:8,pd:80,ps:108,k:0.028},pre:{edv:148,esv:56,edp:14,pd:80,ps:110,k:0.028},aft:{edv:126,esv:72,edp:10,pd:112,ps:140,k:0.028},ino:{edv:120,esv:34,edp:8,pd:80,ps:115,k:0.028},hfr:{edv:205,esv:152,edp:22,pd:74,ps:92,k:0.016},hfp:{edv:112,esv:46,edp:24,pd:84,ps:118,k:0.06}};
  D.pv=()=>{ const L=52,R=W*0.68,T=14,B=Hh-28, xv=v=>L+(v-0)/240*(R-L), yp=p=>B-p/170*(B-T);
    const cur={}; const tg=PV[ctl]||PV.norm; for(const k in tg) cur[k]=lerp('pv'+k,tg[k],0.06);
    [0,40,80,120,160].forEach(p=>{ txt(p,L-6,yp(p)+4,{a:'right',s:10}); line([[L,yp(p)],[R,yp(p)]],C.line,1); });
    [0,60,120,180,240].forEach(v=>txt(v,xv(v),B+14,{a:'center',s:10}));
    txt(lb.p||'Basınç',L+4,T-2,{s:10,w:700}); txt(lb.v||'Hacim',R,B+26,{a:'right',s:10,w:700});
    const loop=c=>{ const a=c.edp*0+2+0.8, edpvr=v=>Math.max(0,(c.edp-1)*(Math.exp(c.k*(v-c.esv))-1)/(Math.exp(c.k*(c.edv-c.esv))-1)+1), pts=[];
      for(let v=c.esv;v<=c.edv;v+=2) pts.push([v,edpvr(v)]);
      for(let i=0;i<=10;i++) pts.push([c.edv,c.edp+(c.pd-c.edp)*i/10]);
      for(let i=0;i<=30;i++){ const k=i/30; pts.push([c.edv-(c.edv-c.esv)*k,c.pd+(c.ps+14-c.pd)*Math.sin(Math.PI*Math.min(1,k*1.05))*0.9+(c.ps-c.pd)*k*0.55]); }
      for(let i=0;i<=10;i++) pts.push([c.esv,c.ps-(c.ps-2)*i/10]);
      void a; return pts; };
    const ghost=loop(PV.norm); if(ctl!=='norm') line(ghost.map(p=>[xv(p[0]),yp(p[1])]),C.mute,1.4,[5,4]);
    const lp=loop(cur); x.beginPath(); lp.forEach((p,i)=>i?x.lineTo(xv(p[0]),yp(p[1])):x.moveTo(xv(p[0]),yp(p[1]))); x.closePath(); x.fillStyle=C.teal; x.globalAlpha=.12; x.fill(); x.globalAlpha=1; x.strokeStyle=C.teal; x.lineWidth=2.6; x.stroke();
    const v0=8, slope=(cur.ps)/(cur.esv-v0); line([[xv(v0),yp(0)],[xv(Math.min(240,v0+165/slope)),yp(Math.min(165,slope*(240-v0)))]],C.coral,1.6,[6,4]); txt(lb.espvr||'ESPVR',xv(v0+120/slope)+6,yp(120),{c:C.coral,w:700,s:10.5});
    const ed=[]; for(let v=20;v<=235;v+=4){ const p=(cur.edp-1)*(Math.exp(cur.k*(v-cur.esv))-1)/(Math.exp(cur.k*(cur.edv-cur.esv))-1)+1; if(p>165) break; ed.push([xv(v),yp(Math.max(0,p))]); } line(ed,C.violet,1.6,[6,4]); txt(lb.edpvr||'EDPVR',ed.length?ed[ed.length-1][0]-4:R,ed.length?ed[ed.length-1][1]+4:B,{a:'right',c:C.violet,w:700,s:10.5});
    const idx=Math.floor((t%0.8)/0.8*lp.length), p=lp[Math.min(lp.length-1,idx)]; x.fillStyle=C.coral; x.beginPath(); x.arc(xv(p[0]),yp(p[1]),5,0,7); x.fill();
    const sv=cur.edv-cur.esv, ef=Math.round(100*sv/cur.edv), bx=R+20;
    [[lb.sv||'Atım hacmi',Math.round(sv)+' mL',C.teal],[lb.ef||'EF',TX('%'+ef,ef+'%'),ef<41?C.no:ef<50?C.amber:C.ok],['EDV',Math.round(cur.edv)+' mL',C.mute],['ESV',Math.round(cur.esv)+' mL',C.mute],['LVEDP',Math.round(cur.edp)+' mmHg',cur.edp>18?C.no:C.mute]].forEach(([n,v,c],i)=>{ txt(n,bx,T+18+i*(Hh-40)/5,{s:11,w:600}); txt(v,bx,T+36+i*(Hh-40)/5,{s:17,w:800,c}); });
  };
  D.starling=()=>{ const L=52,R=W*0.7,T=14,B=Hh-28, xp=p=>L+p/32*(R-L), ys=s=>B-s/140*(B-T);
    const cv0=(p,m,k)=>m*(1-Math.exp(-p/k));
    const curves={norm:[100,7],symp:[135,6.5],hf:[52,11]};
    x.fillStyle=C.no; x.globalAlpha=.07; x.fillRect(xp(20),T,R-xp(20),B-T); x.globalAlpha=1; txt(lb.edema||'Ödem',xp(26),T+14,{a:'center',c:C.no,w:700,s:10.5});
    [0,40,80,120].forEach(s=>{ txt(s,L-6,ys(s)+4,{a:'right',s:10}); line([[L,ys(s)],[R,ys(s)]],C.line,1); }); [0,8,16,24,32].forEach(p=>txt(p,xp(p),B+14,{a:'center',s:10}));
    txt(lb.y||'SV',L-6,T-2,{a:'right',s:10,w:700}); txt(lb.x||'LVEDP',R,B+26,{a:'right',s:10,w:700});
    for(const k in curves){ const [m,kk]=curves[k], pts=[]; for(let p=0;p<=32;p+=0.5) pts.push([xp(p),ys(cv0(p,m,kk))]); const on=(ctl==='symp'&&k==='symp')||(ctl==='norm'&&k==='norm')||((ctl==='hf'||ctl==='diu')&&k==='hf'); line(pts,k==='symp'?C.ok:k==='hf'?C.no:C.teal,on?2.8:1.4,on?[]:[5,4]); const lp=pts[pts.length-1]; txt(lb[k]||k,lp[0]-4,lp[1]-6,{a:'right',c:k==='symp'?C.ok:k==='hf'?C.no:C.teal,w:700,s:10.5}); }
    const tgt={norm:[8,'norm'],symp:[7,'symp'],hf:[24,'hf'],diu:[15,'hf']}[ctl]||[8,'norm']; const P=lerp('stp',tgt[0],0.05), cv1=curves[tgt[1]], SV=cv0(P,cv1[0],cv1[1]), hr={norm:72,symp:110,hf:96,diu:88}[ctl]||72;
    x.fillStyle=C.coral; x.beginPath(); x.arc(xp(P),ys(SV),6,0,7); x.fill(); line([[xp(P),ys(SV)],[xp(P),B]],C.coral,1,[3,3]);
    const bx=R+20; [[lb.y||'SV',Math.round(SV)+' mL',C.teal],['HR',hr+TX('/dk','/min'),C.mute],[lb.co||TX('Debi','Output'),(SV*hr/1000).toFixed(1)+TX(' L/dk',' L/min'),SV*hr/1000<4?C.no:C.ok],['LVEDP',Math.round(P)+' mmHg',P>18?C.no:C.mute]].forEach(([n,v,c],i)=>{ txt(n,bx,T+18+i*(Hh-40)/4,{s:11}); txt(v,bx,T+36+i*(Hh-40)/4,{s:17,w:800,c}); });
  };
  D.koroner=()=>{ const per=ctl==='tachy'?60/140:0.8, sys=ctl==='tachy'?0.26:0.3, win=2.4, L=96,R=W-16; const xs=s=>L+s/win*(R-L), t0=t-win;
    const rowY=[[0.06,0.36],[0.42,0.68],[0.74,0.96]], Y=(r,k)=>Hh*rowY[r][1]-Hh*(rowY[r][1]-rowY[r][0])*k;
    const ph=s=>((s%per)+per)%per;
    const ao=s=>{ const p=ph(s); return p<sys?80+40*Math.sin(Math.PI*p/sys):80+20*Math.max(0,1-(p-sys)/(per-sys))*0.9+ (p<sys+0.03?-4:0); };
    const lca=s=>{ const p=ph(s); return p<sys?(p<0.05?-0.15:0.2+0.1*Math.sin(Math.PI*p/sys)):0.95*Math.exp(-(p-sys)/(per*0.9))+0.15; };
    const rca=s=>{ const p=ph(s); return p<sys?0.35+0.35*Math.sin(Math.PI*p/sys):0.45*Math.exp(-(p-sys)/per)+0.18; };
    for(let s=Math.floor(t0/per)*per;s<t;s+=per){ const a=Math.max(t0,s), b=Math.min(t,s+sys); if(b>a){ x.fillStyle=C.line; x.globalAlpha=.6; x.fillRect(xs(a-t0),4,xs(b-t0)-xs(a-t0),Hh-8); x.globalAlpha=1; } }
    const A=[],B1=[],C1=[]; for(let i=0;i<=360;i++){ const s=t0+i/360*win, px=xs(i/360*win); A.push([px,Y(0,(ao(s)-70)/60)]); B1.push([px,Y(1,(lca(s)+0.2)/1.3)]); C1.push([px,Y(2,(rca(s)+0.2)/1.2)]); }
    line([[L,Y(1,0.2/1.3)],[R,Y(1,0.2/1.3)]],C.mute,1,[2,3]); line([[L,Y(2,0.2/1.2)],[R,Y(2,0.2/1.2)]],C.mute,1,[2,3]);
    line(A,C.coral,2.2); line(B1,C.teal,2.4); line(C1,C.violet,2.2);
    txt(lb.ao||'Aort',L-8,Y(0,0.5),{a:'right',c:C.coral,w:700,s:10.5}); txt(lb.lca||'LCA',L-8,Y(1,0.5),{a:'right',c:C.teal,w:700,s:10.5}); txt(lb.rca||'RCA',L-8,Y(2,0.5),{a:'right',c:C.violet,w:700,s:10.5});
    pill((lb.dia||'Diyastol')+' '+TX('%'+Math.round(100*(per-sys)/per),Math.round(100*(per-sys)/per)+'%'),R-70,14,C.teal); pill((lb.sys||'Sistol'),xs(sys/2+ (Math.ceil(t0/per)*per-t0)),Hh-12,C.mute);
  };
  D.otonom=()=>{ const N={baro:[0.1,0.5],nts:[0.3,0.5],vag:[0.52,0.25],sym:[0.52,0.75],sa:[0.74,0.25],hr:[0.9,0.18],inot:[0.9,0.5],svr:[0.9,0.82]};
    const P=k=>[N[k][0]*W,N[k][1]*Hh], down=ctl!=='up';
    const E=[['baro','nts',1],['nts','vag',down?0.2:1],['nts','sym',down?1:0.2],['vag','sa',down?0.2:1],['sym','sa',down?1:0.2],['sa','hr',1],['sym','inot',down?1:0.2],['sym','svr',down?1:0.2]];
    for(const [a,b,w] of E){ const [x1,y1]=P(a),[x2,y2]=P(b); line([[x1,y1],[x2,y2]],w>0.5?C.teal:C.line,w>0.5?2.4:1.6); const k=((t*0.9+(x1/W))%1); if(w>0.5){ x.fillStyle=C.teal; x.beginPath(); x.arc(x1+(x2-x1)*k,y1+(y2-y1)*k,4,0,7); x.fill(); } }
    const nd=(k,col,arr)=>{ const [px,py]=P(k); x.font='700 11.5px "Plus Jakarta Sans",system-ui,sans-serif'; const w=Math.max(70,x.measureText(lb[k]||k).width+20); x.fillStyle=css('--surface','#fff'); rr(px-w/2,py-15,w,30,12); x.fill(); x.strokeStyle=col; x.lineWidth=2; x.stroke(); txt(lb[k]||k,px,py+4,{a:'center',c:C.ink,w:700}); if(arr) txt(arr,px+w/2+4,py+5,{c:arr==='↑'?C.ok:C.no,w:800,s:16}); };
    nd('baro',C.violet,down?'↓':'↑'); nd('nts',C.mute); nd('vag',down?C.line:C.teal,down?'↓':'↑'); nd('sym',down?C.coral:C.line,down?'↑':'↓'); nd('sa',C.amber); nd('hr',C.ink,down?'↑':'↓'); nd('inot',C.ink,down?'↑':'↓'); nd('svr',C.ink,down?'↑':'↓');
    pill((lb.bp||'KB')+(down?' ↓ → ↑':' ↑ → ↓'),W*0.1,Hh*0.18,C.violet);
  };
  return {
    set(nid,c,l){ id=nid; ctl=c||'norm'; lb=l||{}; resize(); },
    resize,
    frame(dt){ t+=dt; if(!id||!D[id]) return; if(!W||cv.width<10) resize(); if(!W) return; x.clearRect(0,0,W,Hh); D[id](); }
  };
}

/* ================= FARMAKOLOJİ: hücre düzeyi sahne ================= */
const AG={ado:1,nit:1}; // agonist ya da etkinleştirici
function mech(sc,step,lb,id){
  lb=lb||{};
  if(sc.t==='zin') return chain(sc,step,lb);
  const ag=!!AG[id], blk=step>=1&&!ag, on=step>=1;
  const tg=sc.tgt; let s=`<svg viewBox="0 0 640 320" class="vz-mech" role="img">`;
  s+=`<rect x="0" y="0" width="640" height="128" fill="var(--teal-soft)" opacity=".45"/><text x="14" y="22" font-size="12" font-weight="800" fill="var(--mute)" letter-spacing=".08em">${esc((lb.out||TX('HÜCRE DIŞI','EXTRACELLULAR')).toUpperCase())}</text>`;
  s+=`<text x="14" y="312" font-size="12" font-weight="800" fill="var(--mute)" letter-spacing=".08em">${esc((lb.inn||TX('HÜCRE İÇİ','INTRACELLULAR')).toUpperCase())}</text>`;
  for(let xh=4;xh<640;xh+=12){ if(xh>262&&xh<378) continue; s+=`<circle cx="${xh}" cy="132" r="5" fill="#e9a36b"/><circle cx="${xh}" cy="168" r="5" fill="#e9a36b"/><line x1="${xh-1.5}" y1="137" x2="${xh-1.5}" y2="163" stroke="#d9b48e" stroke-width="1.4"/><line x1="${xh+1.5}" y1="137" x2="${xh+1.5}" y2="163" stroke="#d9b48e" stroke-width="1.4"/>`; }
  const cx=320;
  if(tg==='gpcr'){ for(let i=0;i<7;i++){ const xx=cx-52+i*17; s+=`<rect x="${xx}" y="120" width="13" height="60" rx="6" fill="${on?'var(--violet)':'#8f7ae6'}" opacity=".85"/>`; } s+=`<path d="M${cx-52} 120 q8 -16 17 0 M${cx-18} 120 q8 -16 17 0 M${cx+16} 120 q8 -16 17 0 M${cx-35} 180 q8 16 17 0 M${cx-1} 180 q8 16 17 0" stroke="#7b61ff" stroke-width="3" fill="none"/>`; }
  if(tg==='ch'||tg==='cot'||tg==='pump'){ const col=tg==='pump'?'#c7792f':tg==='cot'?'#3b82f6':'#0e8f7e'; s+=`<rect x="${cx-56}" y="112" width="44" height="76" rx="14" fill="${col}" opacity=".9"/><rect x="${cx+12}" y="112" width="44" height="76" rx="14" fill="${col}" opacity=".9"/>`; if(blk) s+=`<rect x="${cx-12}" y="122" width="24" height="56" fill="${col}" opacity=".5"/>`; }
  if(tg==='enz') s+=`<rect x="${cx-60}" y="200" width="120" height="34" rx="16" fill="var(--violet)" opacity="${on?1:.55}"/><text x="${cx}" y="221" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">sGC</text>`;
  s+=`<text x="${cx}" y="${tg==='enz'?252:100}" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${esc(sc.tl)}</text>`;
  // iyon akışı
  const out=sc.flow==='out', n=blk?2:(ag&&id==='ado'?9:6), dur=blk?3.6:1.5;
  if(tg!=='gpcr'&&tg!=='enz'||id==='ado'||id==='atr'||id==='bb'){
    const ix=tg==='gpcr'?cx+110:cx; if(tg==='gpcr') s+=`<rect x="${ix-22}" y="116" width="16" height="68" rx="7" fill="#0e8f7e" opacity=".85"/><rect x="${ix+6}" y="116" width="16" height="68" rx="7" fill="#0e8f7e" opacity=".85"/>`;
    for(let i=0;i<n;i++){ const y0=out?250:40, y1=out?40:250, d=(i*dur/n).toFixed(2);
      s+=`<circle r="6" cx="${ix}" cy="${y0}" fill="${sc.ion.startsWith('K')?'#7b61ff':sc.ion.startsWith('Na')?'#f2a93b':'#ef6a5b'}"><animate attributeName="cy" values="${y0};${y1}" dur="${dur}s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="${dur}s" begin="${d}s" repeatCount="indefinite"/></circle>`; }
    s+=`<text x="${ix+30}" y="${out?70:236}" font-size="16" font-weight="800" fill="var(--ink)">${esc(sc.ion)}${blk?' ↓':ag&&step>=2?' ↑':''}</text>`;
  }
  if(sc.lig&&!on) s+=`<g><circle cx="${cx-6}" cy="70" r="12" fill="#ef6a5b"/><text x="${cx-6}" y="74" font-size="9" font-weight="800" text-anchor="middle" fill="#fff">${esc(sc.lig)}</text><animateTransform attributeName="transform" type="translate" values="0 -20;0 26;0 26" dur="1.8s" repeatCount="indefinite"/></g>`;
  if(sc.lig&&on) s+=`<g opacity=".55"><circle cx="${cx-110}" cy="60" r="12" fill="#ef6a5b"/><text x="${cx-110}" y="64" font-size="9" font-weight="800" text-anchor="middle" fill="#fff">${esc(sc.lig)}</text><path d="M${cx-96} 58 l24 0" stroke="var(--no)" stroke-width="3"/><path d="M${cx-82} 50 l10 16 m0 -16 l-10 16" stroke="var(--no)" stroke-width="3"/></g>`;
  if(on){ const my=tg==='enz'?185:tg==='gpcr'?102:120; s+=`<g class="vz-drug"><rect x="${cx-58}" y="${my-36}" width="116" height="30" rx="15" fill="var(--coral)"/><text x="${cx}" y="${my-16}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">${esc(sc.mol)}</text>${step===1?`<animateTransform attributeName="transform" type="translate" values="0 -60;0 0" dur=".9s" fill="freeze"/>`:''}</g>`; }
  // hücre içi kaskad
  const cas=sc.cas||[], cw=Math.min(132,560/cas.length), x0=(640-cw*cas.length)/2;
  cas.forEach((c,i)=>{ const bx=x0+i*cw+4, by=262, act=step>=2, col=act?(ag?'var(--ok)':'var(--no)'):'var(--line-2)';
    if(tg==='enz'&&i===0) return;
    s+=`<rect x="${bx}" y="${by-20}" width="${cw-14}" height="34" rx="11" fill="var(--surface)" stroke="${col}" stroke-width="${act?2:1.2}"/><text x="${bx+(cw-14)/2}" y="${by+1}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${esc(c)}${act&&!/[↑↓]/.test(c)?(ag?' ↑':' ↓'):''}</text>`;
    if(i<cas.length-1) s+=`<path d="M${bx+cw-12} ${by-3} l10 0" stroke="var(--mute)" stroke-width="2" marker-end="url(#ar)"/>`; });
  if(step>=3) s+=`<rect x="90" y="188" width="460" height="34" rx="17" fill="var(--ok-soft)" stroke="var(--ok)"/><text x="320" y="211" text-anchor="middle" font-size="14" font-weight="800" fill="var(--ok)">${esc(sc.eff)}</text>`;
  s+=`<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="var(--mute)"/></marker></defs></svg>`;
  return s;
}
function chain(sc,step,lb){
  const N=sc.nodes, n=N.length, W=640, bw=Math.min(112,(W-20)/n-14), gap=(W-20-bw*n)/(n-1), y=sc.side?96:140;
  const blk=sc.blk||{}, act=sc.act||{}, firstBlk=Math.min(...Object.keys(blk).map(Number).concat([99]));
  let s=`<svg viewBox="0 0 640 ${sc.side?300:300}" class="vz-mech" role="img"><defs><marker id="ar2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="var(--mute)"/></marker></defs>`;
  N.forEach((nm,i)=>{ const bx=10+i*(bw+gap), down=step>=2&&i>firstBlk&&firstBlk<99, last=i===n-1;
    const col=last&&step>=3?(Object.keys(act).length?'var(--ok)':'var(--ok)'):down?'var(--line-2)':'var(--teal)';
    s+=`<g opacity="${down&&!last?.45:1}"><rect x="${bx}" y="${y-34}" width="${bw}" height="68" rx="14" fill="var(--surface)" stroke="${col}" stroke-width="2"/>`;
    const words=String(nm).split(' '); let lines=[''], k=0; words.forEach(w=>{ if((lines[k]+' '+w).trim().length>13&&lines[k]) { lines.push(w); k++; } else lines[k]=(lines[k]+' '+w).trim(); });
    lines.slice(0,3).forEach((ln,j)=>s+=`<text x="${bx+bw/2}" y="${y-((lines.length-1)*8)+j*16+4}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${esc(ln)}</text>`);
    s+=`</g>`;
    if(i<n-1){ const ax=bx+bw+2, ex=bx+bw+gap-2; s+=`<path d="M${ax} ${y} L${ex} ${y}" stroke="var(--mute)" stroke-width="2.2" marker-end="url(#ar2)"/>`;
      const e=(sc.enz||{})[i]; if(e) s+=`<text x="${(ax+ex)/2}" y="${y-38}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--violet)">${esc(e)}</text>`;
      if(blk[i]!=null&&step>=1){ s+=`<g><circle cx="${(ax+ex)/2}" cy="${y}" r="13" fill="var(--no)"/><path d="M${(ax+ex)/2-5} ${y-5} l10 10 m0 -10 l-10 10" stroke="#fff" stroke-width="3"/><text x="${(ax+ex)/2}" y="${y+56}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--no)">${esc(blk[i])}</text>${step===1?'<animate attributeName="opacity" values="0;1" dur=".6s" fill="freeze"/>':''}</g>`; }
      if(act[i]!=null&&step>=1){ s+=`<g><circle cx="${(ax+ex)/2}" cy="${y}" r="13" fill="var(--ok)"/><path d="M${(ax+ex)/2-6} ${y} h12 M${(ax+ex)/2} ${y-6} v12" stroke="#fff" stroke-width="3"/><text x="${(ax+ex)/2}" y="${y+56}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ok)">${esc(act[i])}</text></g>`; } } });
  if(sc.side){ const sy=228, d=sc.side; s+=`<rect x="40" y="${sy-22}" width="150" height="44" rx="12" fill="var(--surface)" stroke="var(--teal)" stroke-width="2"/><text x="115" y="${sy+4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink)">${esc(d.n)}</text>
    <path d="M192 ${sy} L300 ${sy}" stroke="var(--mute)" stroke-width="2.2" marker-end="url(#ar2)"/><text x="246" y="${sy-10}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--violet)">${esc(d.e)}</text>
    <rect x="304" y="${sy-22}" width="100" height="44" rx="12" fill="var(--surface)" stroke="var(--line-2)"/><text x="354" y="${sy+4}" text-anchor="middle" font-size="10.5" fill="var(--mute)">${esc(lb.inactive||'Etkisiz')}</text>
    <text x="430" y="${sy+4}" font-size="11" font-weight="800" fill="${step>=2?'var(--ok)':'var(--mute)'}">${esc(d.r)}${step>=2?' ↑':''}</text>`;
    if(step>=1) s+=`<circle cx="246" cy="${sy}" r="12" fill="var(--no)"/><path d="M241 ${sy-5} l10 10 m0 -10 l-10 10" stroke="#fff" stroke-width="3"/><text x="246" y="${sy+36}" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--no)">${esc(d.b)}</text>`; }
  if(step>=3){ const last=10+(n-1)*(bw+gap); s+=`<rect x="${last-6}" y="${y-36}" width="${bw+12}" height="72" rx="17" fill="none" stroke="var(--ok)" stroke-width="2.5" stroke-dasharray="6 4"><animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite"/></rect>`; }
  return s+`</svg>`;
}

/* ================= MİKROBİYOLOJİ: patogenez sahnesi ================= */
function micro(id,step,lb){
  lb=lb||{}; const r=rng(7+step); const on=k=>step>=k; let s=`<svg viewBox="0 0 640 300" class="vz-mech" role="img">`;
  const lab=(t,x,y,c,a)=>`<text x="${x}" y="${y}" font-size="11.5" font-weight="800" fill="${c||'var(--ink)'}" text-anchor="${a||'start'}">${esc(t)}</text>`;
  if(id==='endo'){
    s+=`<rect width="640" height="300" fill="#fdf3f5"/><path d="M0 0 H640 V120 C460 130 360 150 300 170 C240 150 120 120 0 120Z" fill="#f8e1e6"/>`+lab(lb.la||'LA',20,30,'#a3475c')+lab(lb.lv||'LV',20,284,'#a3475c');
    s+=`<path d="M120 150 C200 150 260 170 300 200 L304 214 C258 186 200 168 118 166Z" fill="#f3b8c4" stroke="#d07a8e"/><path d="M520 150 C440 150 380 170 340 200 L336 214 C382 186 440 168 522 166Z" fill="#f3b8c4" stroke="#d07a8e"/>`+lab(lb.val||'Mitral',120,145,'#a3475c');
    s+=`<g opacity="${on(0)?1:0}">`+[0,1,2].map(k=>`<path d="M320 ${280-k*8} C322 240 318 220 320 ${150-k*10}" stroke="#ef6a5b" stroke-width="3" fill="none" stroke-dasharray="8 8"><animate attributeName="stroke-dashoffset" values="32;0" dur=".8s" repeatCount="indefinite"/></path>`).join('')+lab(lb.jet||'Jet',332,250,'#c43c2e')+`<circle cx="292" cy="196" r="9" fill="none" stroke="var(--no)" stroke-width="3"/>`+lab(lb.end||'Endotel hasarı',150,214,'var(--no)')+`</g>`;
    s+=`<g opacity="${on(0)?1:0}"><path d="M280 190 C286 176 298 176 304 192Z" fill="#f2d6a2" stroke="#c9a34f"/></g>`;
    if(on(1)){ for(let i=0;i<14;i++){ const x=40+r()*560,y=40+r()*220; s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="#5b3cc4"><animate attributeName="cx" values="${f1(x)};${f1(290+r()*12)}" dur="${(2+r()*2).toFixed(1)}s" fill="freeze"/><animate attributeName="cy" values="${f1(y)};${f1(184+r()*8)}" dur="${(2+r()*2).toFixed(1)}s" fill="freeze"/></circle>`; } s+=lab(lb.bac||'Bakteriler',430,60,'#5b3cc4'); }
    if(on(2)){ s+=`<path d="M266 192 C262 150 290 126 312 140 C334 130 350 160 334 196Z" fill="#f2d6a2" stroke="#c9a34f" stroke-width="2"><animateTransform attributeName="transform" type="scale" values="0.6;1" dur="1s" fill="freeze" additive="sum"/></path>`;
      for(let i=0;i<30;i++) s+=`<circle cx="${f1(280+r()*44)}" cy="${f1(146+r()*44)}" r="2.6" fill="#5b3cc4"/>`; s+=`<path d="M262 190 C258 146 290 118 316 134 C342 124 360 160 340 200" fill="none" stroke="#7b61ff" stroke-width="2" stroke-dasharray="4 3"/>`+lab(lb.bio||'Biyofilm',360,130,'#7b61ff')+lab(lb.plt||'Trombosit + fibrin',360,150,'#a07a2a'); }
    if(on(3)){ [[420,70],[500,40],[560,110]].forEach(([x,y],i)=>s+=`<path d="M318 130 Q${(318+x)/2} ${y-40} ${x} ${y}" stroke="var(--no)" stroke-width="2" fill="none" stroke-dasharray="5 4"/><circle cx="${x}" cy="${y}" r="7" fill="#f2d6a2" stroke="#c9a34f"><animate attributeName="r" values="3;7" dur=".8s" begin="${i*0.3}s" fill="freeze"/></circle>`); s+=lab(lb.emb||'Septik emboli',470,140,'var(--no)')+`<circle cx="230" cy="166" r="6" fill="#fdf3f5" stroke="var(--no)" stroke-width="2"/>`; }
  }
  if(id==='miyo'){
    s+=`<rect width="640" height="300" fill="#fdf3f5"/>`;
    for(let i=0;i<4;i++){ const x=40+i*150; s+=`<rect x="${x}" y="120" width="136" height="92" rx="20" fill="${on(3)&&i===1?'#d9cfd4':'#f2a9c2'}" stroke="#d46b91"/><ellipse cx="${x+68}" cy="166" rx="16" ry="8" fill="#5a3b8f" opacity="${on(1)&&i===2?0.3:0.9}"/>`; for(let k=0;k<5;k++) s+=`<rect x="${x+14+k*24}" y="116" width="8" height="8" rx="2" fill="#0e8f7e"/>`; }
    s+=lab(lb.myo||'Kardiyomiyosit',40,238,'#a3475c')+lab(lb.car||'CAR',54,108,'#0e8f7e');
    const vir=(x,y)=>`<polygon points="${x},${y-9} ${x+8},${y-4} ${x+8},${y+5} ${x},${y+10} ${x-8},${y+5} ${x-8},${y-4}" fill="#ef6a5b" stroke="#b8392b"/>`;
    for(let i=0;i<7;i++){ const x=60+r()*520; s+=`<g>${vir(x,40+r()*30)}<animateTransform attributeName="transform" type="translate" values="0 0;0 ${on(0)?70:20}" dur="1.6s" fill="freeze"/></g>`; } s+=lab(lb.vir||'Virüs',560,40,'#b8392b');
    if(on(1)){ for(let i=0;i<6;i++){ const x=80+r()*480,y=250+r()*30; s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="12" fill="#6ea8ff" stroke="#2b66c4"><animate attributeName="cy" values="${f1(y+30)};${f1(y-14)}" dur="1.4s" fill="freeze"/></circle>`; } s+=lab(lb.tc||'T lenfositi',480,290,'#2b66c4')+`<path d="M340 130 l40 70 M380 130 l-40 70" stroke="var(--no)" stroke-width="3" opacity=".7"/>`+lab(lb.nec||'Nekroz',350,108,'var(--no)'); }
    if(on(2)){ for(let i=0;i<8;i++){ const x=60+r()*520,y=60+r()*40; s+=`<path d="M${f1(x)} ${f1(y)} l0 12 m0 -12 l-6 -8 m6 8 l6 -8" stroke="#7b61ff" stroke-width="2.4" fill="none"/>`; } }
    if(on(3)){ for(let i=0;i<10;i++){ const x=190+r()*130,y=130+r()*70; s+=`<path d="M${f1(x)} ${f1(y)} q10 -6 22 0" stroke="#8a8a8a" stroke-width="3" fill="none"/>`; } s+=lab(lb.fib||'Fibrozis',196,108,'#666')+`<ellipse cx="580" cy="250" rx="40" ry="34" fill="none" stroke="#ef6a5b" stroke-width="5"/>`+lab(lb.dcm||'DCM',580,296,'#b8392b','middle'); }
  }
  if(id==='arf'){
    s+=`<rect width="640" height="300" fill="#fdf3f5"/><path d="M20 60 C60 40 120 40 160 70 L160 230 C120 260 60 260 20 240Z" fill="#f6c6cf" stroke="#d07a8e"/>`;
    for(let k=0;k<3;k++){ for(let i=0;i<6;i++) s+=`<circle cx="${50+i*14}" cy="${100+k*40}" r="6.5" fill="#3c8f4f" stroke="#1f6232"/>`; } s+=lab(lb.strep||'A grubu streptokok',24,280,'#1f6232');
    if(on(0)) for(let i=0;i<6;i++) s+=`<path d="M${50+i*14} ${93} l0 -8" stroke="#ef6a5b" stroke-width="3"/>`; if(on(0)) s+=lab(lb.m||'M proteini',100,76,'#c43c2e');
    if(on(1)){ for(let i=0;i<9;i++){ const x=220+r()*150,y=60+r()*180; s+=`<g><path d="M${f1(x)} ${f1(y)} l0 14 m0 -14 l-7 -9 m7 9 l7 -9" stroke="#7b61ff" stroke-width="3" fill="none"/><animateTransform attributeName="transform" type="translate" values="-60 0;0 0" dur="1.2s" fill="freeze"/></g>`; } s+=lab(lb.ab||'Antikor',230,40,'#7b61ff'); }
    s+=`<path d="M430 80 C500 70 560 100 600 150 L590 160 C550 115 500 92 432 96Z" fill="${on(3)?'#e3cfa1':'#f3b8c4'}" stroke="#d07a8e"/><path d="M430 230 C500 240 560 210 600 160 L590 150 C550 195 500 215 432 214Z" fill="${on(3)?'#e3cfa1':'#f3b8c4'}" stroke="#d07a8e"/>`+lab(lb.val||'Mitral kapak',440,64,'#a3475c');
    if(on(2)){ for(let i=0;i<6;i++){ const x=470+i*22,y=96+i*8; s+=`<path d="M${x} ${y} l0 12 m0 -12 l-6 -8 m6 8 l6 -8" stroke="#7b61ff" stroke-width="3" fill="none"/>`; } s+=`<circle cx="520" cy="190" r="12" fill="#6ea8ff" stroke="#2b66c4"/>`+lab(lb.tc||'T hücresi',536,194,'#2b66c4')+`<circle cx="470" cy="250" r="14" fill="#f08cb2"/>`+lab(lb.asc||'Aschoff',490,256,'#a3475c'); }
    if(on(3)){ s+=`<path d="M560 120 C580 140 580 170 560 190" stroke="#8a6a2a" stroke-width="6" fill="none"/>`+lab(lb.fus||'Füzyon',500,290,'#8a6a2a')+`<ellipse cx="610" cy="40" rx="20" ry="7" fill="none" stroke="#8a6a2a" stroke-width="3"/>`+lab(lb.ms||'MS',610,22,'#8a6a2a','middle'); }
  }
  if(id==='peri'){
    const cav=on(2)?60:on(1)?22:10, th=on(3)?26:8;
    s+=`<rect width="640" height="300" fill="#fdf3f5"/><rect x="0" y="${250-th}" width="640" height="${50+th}" fill="${on(3)?'#cdbfa8':'#f3a3a0'}"/>`+lab(lb.par||'Parietal',14,262,'#7a3b3b');
    s+=`<rect x="0" y="${250-th-cav}" width="640" height="${cav}" fill="${on(2)?'#cfe6f7':'#fff'}"/>`+(on(2)?lab(lb.eff||'Efüzyon',300,250-th-cav/2+4,'#2b66c4'):'');
    s+=`<rect x="0" y="${200-th-cav}" width="640" height="${50}" fill="#f2a9c2"/>`+lab(lb.vis||'Visseral',14,200-th-cav+30,'#7a1f43');
    s+=`<rect x="0" y="0" width="640" height="${200-th-cav}" fill="#ef9fbb"/>`+lab(lb.myo||'Miyokard',14,30,'#7a1f43');
    if(on(0)) for(let i=0;i<8;i++){ const x=40+r()*560; s+=`<polygon points="${x},${180-th-cav} ${x+7},${185-th-cav} ${x},${190-th-cav} ${x-7},${185-th-cav}" fill="#ef6a5b"/>`; }
    if(on(0)) s+=lab(lb.vir||'Virüs',560,170-th-cav,'#b8392b');
    if(on(1)){ for(let x=0;x<640;x+=14) s+=`<path d="M${x} ${250-th-cav} q4 ${-cav*0.6} 8 0" stroke="#e8c35c" stroke-width="3" fill="none"/>`; s+=lab(lb.exu||'Fibrinöz eksüda',380,240-th-cav,'#8a6a2a')+`<path d="M200 ${244-th-cav} h60 m-60 0 l8 -5 m-8 5 l8 5 M260 ${244-th-cav} l-8 -5 m8 5 l-8 5" stroke="var(--no)" stroke-width="2"/>`+lab(lb.rub||'Frotman',190,236-th-cav,'var(--no)'); }
    if(on(3)) for(let i=0;i<14;i++) s+=`<circle cx="${f1(r()*640)}" cy="${f1(256-th+r()*th)}" r="3" fill="#fff"/>`;
    if(on(3)) s+=lab(lb.con||'Konstriksiyon',400,290,'#5b4a2a');
  }
  return s+`</svg>`;
}

window.KalpViz={histo:(id,lb,o)=>H[id]?H[id](lb||{},o||{}):'',physio,mech,micro,has:id=>!!H[id]};
})();
