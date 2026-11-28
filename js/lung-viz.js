/* Kalp Simülatörü: akciğer çizimleri.
   cxr(canvas, key, o)      PA akciğer grafisi şeması (canvas): normal ve hastalığa göre bulgular, o.marks ile işaretler
   histo(id, lb)            akciğer histolojisi (SVG; solda mikroskop alanı, sağda etiket sütunu)
   embryo(id, lb)           gelişim evresi şeması (SVG)
   phono(canvas, ses, t)    solunum döngüsü ve ek seslerin zamanlaması (fonopnömogram), t: saniye
   Not: Grafi çizimi öğretici bir şemadır, gerçek bir hastanın filmi değildir. */
(function(){
'use strict';
const TX=(a,b)=>window.KalpI18n&&window.KalpI18n.lang==='en'?b:a;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rng(seed){ let a=seed|0; return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}; }
const f1=n=>Math.round(n*10)/10;

/* ================= AKCİĞER GRAFİSİ ================= */
// Temel ölçüler 400×440 birim; görüntüleyenin solu = hastanın sağı.
const CFG={
  normal:{},
  pnomoni:{},
  koah:{dia:[50,50],flat:0.35,heart:0.86,inflate:1.06,lucent:0.35,thinVes:1},
  astim:{dia:[22,22],flat:0.75,lucent:0.12},
  odem:{heart:1.38,upper:1,blunt:[1,1]},
  pe:{paBig:1},
  ptx:{med:24,ptx:'R',dia:[18,0],flat:0.7},
  efuzyon:{med:-8},
  tb:{},
  ipf:{dia:[-26,-24],inflate:0.94},
  kanser:{medW:1},
  ards:{tube:1},
  atelektazi:{med:-10,trach:-10,dia:[-18,0]}
};
function lungPath(c,side,o){ // side 'R' (görüntüleyenin solu) | 'L'
  const s=side==='R'?1:-1, X=x=>side==='R'?x:400-x, dy=(o.dia&&o.dia[side==='R'?0:1])||0, inf=o.inflate||1, fl=o.flat==null?1:o.flat;
  const cpY=(side==='R'?352:364)+dy, domeY=cpY-(side==='R'?38:30)*fl, top=64-(inf-1)*120;
  c.beginPath();
  c.moveTo(X(138),top);
  c.bezierCurveTo(X(108),top+10,X(84),110,X(66),170);
  c.bezierCurveTo(X(52),230,X(48),300,X(54),cpY);
  c.quadraticCurveTo(X(84),domeY-6,X(124),domeY);
  c.quadraticCurveTo(X(165),domeY+6,X(188),cpY-6+(side==='R'?0:-8));
  c.lineTo(X(186),250); c.lineTo(X(182),150); c.bezierCurveTo(X(176),100,X(160),top,X(138),top);
  c.closePath(); void s;
}
function vessels(c,r,hx,hy,dir,depth,len,ang,w,ox){
  if(depth<=0||w<0.3) return;
  const x2=hx+Math.cos(ang)*len, y2=hy+Math.sin(ang)*len;
  c.lineWidth=w; c.beginPath(); c.moveTo(hx+ox,hy); c.lineTo(x2+ox,y2); c.stroke();
  const n=2; for(let i=0;i<n;i++) vessels(c,r,x2,y2,dir,depth-1,len*(0.7+r()*0.2),ang+(i?1:-1)*(0.25+r()*0.35),w*0.68,ox);
}
function drawVes(c,s,cfg,W,H,d,ox,oy,sc){
  const off=document.createElement('canvas'); off.width=W*d; off.height=H*d; const o=off.getContext('2d'); o.setTransform(d*sc,0,0,d*sc,d*ox,d*oy);
  const hx=s==='R'?166:238, hy=cfg.trach?186:202, dir=s==='R'?-1:1, rr=rng(s==='R'?11:23), up=cfg.upper?1.6:1;
  o.strokeStyle=`rgba(205,210,218,${cfg.thinVes?0.5:0.75})`; o.lineCap='round'; try{ o.filter='blur(1px)'; }catch(e){}
  const fan=[[-1.15,46,6*up],[-0.75,50,5.5*up],[-0.35,46,5],[0.1,44,5],[0.5,48,6],[0.85,52,6.5],[1.2,44,5.5]];
  for(const [a,l,w] of fan){ const A=dir<0?Math.PI+a*-1*-1+0:a; const ang=dir<0?Math.PI-a:a; void A; vessels(o,rr,hx,hy,dir,cfg.thinVes?3:4,l,ang-(dir<0?0:0),w,0); }
  try{ o.filter='none'; }catch(e){}
  o.globalCompositeOperation='destination-in'; const g=o.createRadialGradient(hx,hy,10,hx,hy,cfg.thinVes?115:150); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.55,'rgba(0,0,0,.65)'); g.addColorStop(1,'rgba(0,0,0,0)'); o.fillStyle=g; o.fillRect(-50,-50,500,540);
  c.save(); c.setTransform(1,0,0,1,0,0); c.globalAlpha=0.55; c.drawImage(off,0,0); c.restore();
}
function heartPath(c,k,dx,dy){
  // sağ kenar: VCS → sağ atriyum; sol kenar: aort topuzu → pulmoner konus → sol ventrikül → apeks
  const cx=208+dx, L=x=>cx+(x-208)*k, Y=y=>150+(y-150)*(198+(dy||0))/198;
  c.beginPath();
  c.moveTo(L(186),Y(168));
  c.bezierCurveTo(L(184),Y(205),L(166),Y(232),L(166),Y(272));
  c.bezierCurveTo(L(166),Y(312),L(176),Y(338),L(200),Y(346));
  c.lineTo(L(290),Y(349));
  c.bezierCurveTo(L(318),Y(334),L(316),Y(282),L(292),Y(252));
  c.bezierCurveTo(L(276),Y(232),L(258),Y(222),L(252),Y(206));
  c.bezierCurveTo(L(250),Y(196),L(250),Y(190),L(244),Y(180));
  c.bezierCurveTo(L(252),Y(170),L(250),Y(150),L(236),Y(148));
  c.lineTo(L(226),Y(150));
  c.closePath();
}
function cxr(cv,key,o){
  o=o||{}; const cfg=Object.assign({},CFG[key]||{}), r=rng(7);
  const d=Math.min(2,window.devicePixelRatio||1), R=cv.getBoundingClientRect(); const W=Math.max(10,R.width|0), H=Math.max(10,R.height|0);
  cv.width=W*d; cv.height=H*d; const c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0);
  c.fillStyle='#050608'; c.fillRect(0,0,W,H);
  const sc=Math.min(W/400,H/440), ox=(W-400*sc)/2, oy=(H-440*sc)/2;
  c.save(); c.translate(ox,oy); c.scale(sc,sc);
  const blur=v=>{ try{ c.filter=v?`blur(${v}px)`:'none'; }catch(e){} };
  const med=cfg.med||0, hk=cfg.heart||1;
  // gövde yumuşak doku
  blur(6); c.fillStyle='#565a60'; c.beginPath(); c.moveTo(20,440); c.lineTo(28,120); c.quadraticCurveTo(30,40,110,30); c.lineTo(290,30); c.quadraticCurveTo(370,40,372,120); c.lineTo(380,440); c.closePath(); c.fill();
  blur(0);
  // akciğer alanları (hava: koyu)
  const lucent=cfg.lucent||0;
  for(const s of ['R','L']){
    c.save(); lungPath(c,s,cfg); c.clip();
    blur(5); const g=c.createRadialGradient(s==='R'?120:280,200,10,s==='R'?120:280,220,190);
    g.addColorStop(0,`rgba(${18-lucent*14},${20-lucent*14},${24-lucent*14},1)`); g.addColorStop(1,'rgba(52,55,60,1)'); c.fillStyle=g; c.fillRect(0,0,400,440); blur(0);
    // damar izleri: hilustan çevreye incelir ve dış üçte birde kaybolur
    if(cfg.ptx!==s) drawVes(c,s,cfg,W,H,d,ox,oy,sc);
    c.restore();
  }
  // pnömotoraks: çökmüş akciğer
  if(cfg.ptx){ c.save(); const hx=168, hy=200; c.translate(hx,hy); c.scale(0.58,0.62); c.translate(-hx,-hy); lungPath(c,'R',{}); c.restore();
    c.save(); c.translate(168,200); c.scale(0.58,0.62); c.translate(-168,-200); lungPath(c,'R',{}); c.restore();
    c.save(); c.translate(168,200); c.scale(0.58,0.62); c.translate(-168,-200); lungPath(c,'R',{}); c.clip(); c.setTransform(d,0,0,d,0,0); c.translate(ox,oy); c.scale(sc,sc);
    blur(4); c.fillStyle='rgba(78,80,86,1)'; c.fillRect(0,0,400,440); blur(1); c.strokeStyle='rgba(210,214,220,.42)'; c.lineCap='round'; vessels(c,rng(5),168,200,-1,5,38,-2.4,6,0); vessels(c,rng(6),168,200,-1,5,34,-3.0,6,0); vessels(c,rng(8),168,200,-1,4,30,2.6,5,0); blur(0); c.restore();
    c.save(); c.translate(168,200); c.scale(0.58,0.62); c.translate(-168,-200); lungPath(c,'R',{}); c.restore(); c.save(); c.translate(168,200); c.scale(0.58,0.62); c.translate(-168,-200); lungPath(c,'R',{}); c.lineWidth=1.6/0.6; c.strokeStyle='rgba(235,238,242,.85)'; c.stroke(); c.restore(); }
  // diyafram altı (karın) ve mide gazı
  blur(3); c.fillStyle='#c9cbcf';
  for(const s of ['R','L']){ const X=x=>s==='R'?x:400-x, dy=(cfg.dia&&cfg.dia[s==='R'?0:1])||0, fl=cfg.flat==null?1:cfg.flat, cpY=(s==='R'?352:364)+dy, domeY=cpY-(s==='R'?38:30)*fl;
    c.beginPath(); c.moveTo(X(30),440); c.lineTo(X(30),cpY+8); c.lineTo(X(54),cpY); c.quadraticCurveTo(X(84),domeY-6,X(124),domeY); c.quadraticCurveTo(X(165),domeY+6,X(200),cpY); c.lineTo(X(200),440); c.closePath(); c.fill(); }
  blur(6); c.fillStyle='rgba(30,32,36,.9)'; const gy=(364+((cfg.dia&&cfg.dia[1])||0))-30*(cfg.flat==null?1:cfg.flat)+30; c.beginPath(); c.ellipse(292,gy,26,14,0,Math.PI,0); c.lineTo(318,gy+10); c.lineTo(266,gy+10); c.closePath(); c.fill(); blur(0);
  // mediyasten, omurga, trakea
  blur(4); c.fillStyle='#c4c7cc'; c.beginPath(); c.moveTo(180+med,40); c.lineTo(222+med,40); c.lineTo(224+med+(cfg.medW?14:0),160); c.lineTo(176+med-(cfg.medW?10:0),160); c.closePath(); c.fill();
  c.fillStyle='rgba(205,208,213,.55)'; c.fillRect(186+med*0.4,40,28,400);
  // kalp
  heartPath(c,hk,med,cfg.dia?(cfg.dia[0]+cfg.dia[1])/2:0); c.fillStyle='#c9ccd1'; c.fill(); blur(0);
  const tr=(cfg.trach||0)+med*0.8;
  blur(2.5); c.fillStyle='rgba(30,32,36,.85)'; c.beginPath(); c.moveTo(194+tr*0.2,10); c.lineTo(207+tr*0.2,10); c.lineTo(206+tr,150); c.lineTo(234+med*0.6,182); c.lineTo(229+med*0.6,187); c.lineTo(201+tr,158); c.lineTo(171+med*0.5,184); c.lineTo(167+med*0.5,178); c.lineTo(195+tr,150); c.closePath(); c.fill(); blur(0);
  // hilus gölgeleri
  blur(4); c.fillStyle='rgba(170,174,180,.75)'; c.beginPath(); c.ellipse(166+med*0.5,(cfg.trach?184:200),11,22,0.2,0,7); c.fill(); c.beginPath(); c.ellipse(238+med*0.5,196,12,24,-0.2,0,7); c.fill();
  if(cfg.paBig){ c.fillStyle='rgba(205,208,214,.9)'; c.beginPath(); c.ellipse(162+med*0.5,198,16,30,0.25,0,7); c.fill(); }
  blur(0);
  // HASTALIK ÖRTÜLERİ
  const scr=(fn)=>{ c.save(); c.globalCompositeOperation='screen'; fn(); c.restore(); };
  const clipL=(s,fn)=>{ c.save(); lungPath(c,s,cfg); c.clip(); fn(); c.restore(); };
  const blob=(x,y,rx,ry,a,b)=>{ const g=c.createRadialGradient(x,y,0,x,y,Math.max(rx,ry)); g.addColorStop(0,`rgba(220,222,226,${a})`); g.addColorStop(b||0.7,`rgba(200,202,206,${a*0.8})`); g.addColorStop(1,'rgba(200,202,206,0)'); c.fillStyle=g; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.fill(); };
  if(key==='pnomoni') scr(()=>clipL('R',()=>{ blur(6); blob(105,318,80,52,0.85,0.75); blur(0);
      c.strokeStyle='rgba(10,12,14,.75)'; c.lineCap='round'; blur(1); vessels(c,rng(3),150,268,-1,4,30,2.5,5,0); vessels(c,rng(4),150,275,-1,3,30,2.8,4,0); blur(0); }));
  if(key==='odem'){ scr(()=>{ for(const s of ['R','L']) clipL(s,()=>{ blur(10); blob(s==='R'?150:250,215,70,95,0.6,0.5); blur(0); }); });
    scr(()=>{ c.strokeStyle='rgba(225,228,232,.75)'; c.lineWidth=1.3; for(const s of ['R','L']) for(let i=0;i<6;i++){ const y=300+i*8, x=s==='R'?56:344, l=14; c.beginPath(); c.moveTo(x,y); c.lineTo(x+(s==='R'?l:-l),y+1); c.stroke(); } });
    blunt(c,cfg,'R',40); blunt(c,cfg,'L',40); }
  if(key==='pe') { scr(()=>clipL('R',()=>{ blur(4); c.fillStyle='rgba(215,218,222,.85)'; c.beginPath(); c.moveTo(52,330); c.lineTo(92,300); c.quadraticCurveTo(100,322,74,350); c.closePath(); c.fill(); blur(0); }));
    c.save(); lungPath(c,'R',cfg); c.clip(); blur(8); c.fillStyle='rgba(0,0,0,.55)'; c.beginPath(); c.ellipse(96,236,40,46,0,0,7); c.fill(); blur(0); c.restore(); }
  if(key==='efuzyon'){ c.save(); c.beginPath(); c.rect(205,0,195,440); c.clip(); c.beginPath(); lungPath(c,'L',cfg); c.rect(205,372,150,70); c.clip('evenodd'); c.restore();
    c.save(); lungPath(c,'L',cfg); c.clip(); blur(3); const g=c.createLinearGradient(0,240,0,380); g.addColorStop(0,'rgba(200,203,208,.88)'); g.addColorStop(1,'rgba(214,216,220,1)'); c.fillStyle=g;
    c.beginPath(); c.moveTo(352,226); c.quadraticCurveTo(326,276,272,288); c.quadraticCurveTo(232,296,212,306); c.lineTo(212,400); c.lineTo(360,400); c.closePath(); c.fill(); blur(0); c.restore(); }
  if(key==='tb') scr(()=>{ clipL('R',()=>{ blur(3); for(let i=0;i<26;i++){ const x=80+r()*80, y=78+r()*90; c.fillStyle='rgba(215,218,222,.55)'; c.beginPath(); c.arc(x,y,2.5+r()*4,0,7); c.fill(); } blur(5); blob(118,118,44,40,0.55); blur(0); });
      clipL('L',()=>{ blur(3); for(let i=0;i<10;i++){ const x=255+r()*60, y=90+r()*70; c.fillStyle='rgba(215,218,222,.45)'; c.beginPath(); c.arc(x,y,2+r()*3,0,7); c.fill(); } blur(0); }); });
  if(key==='tb'){ blur(1.5); c.strokeStyle='rgba(235,238,242,.95)'; c.lineWidth=6; c.beginPath(); c.ellipse(118,112,20,17,0,0,7); c.stroke(); c.fillStyle='rgba(5,6,8,.9)'; c.beginPath(); c.ellipse(118,112,15,12,0,0,7); c.fill();
    c.fillStyle='rgba(240,242,245,1)'; for(const [x,y] of [[172,186],[128,250],[268,150]]){ c.beginPath(); c.arc(x,y,3.2,0,7); c.fill(); } blur(0); }
  if(key==='ipf') scr(()=>{ for(const s of ['R','L']) clipL(s,()=>{ blur(0.6); c.strokeStyle='rgba(215,218,222,.38)'; c.lineWidth=1.1;
      for(let i=0;i<120;i++){ const yy=200+r()*150, per=r(); const x=s==='R'?55+per*70:345-per*70; if(r()>((yy-200)/150)*0.9+0.15) continue; c.beginPath(); c.arc(x,yy,3+r()*3.5,0,7); c.stroke(); }
      blur(4); blob(s==='R'?80:320,320,60,50,0.3,0.6); blur(0); }); });
  if(key==='kanser'){ blur(2); c.fillStyle='rgba(222,224,228,.95)'; c.beginPath(); for(let i=0;i<=24;i++){ const a=i/24*6.283, rr=24+Math.sin(i*1.7)*3+Math.cos(i*2.9)*2; c.lineTo(150+Math.cos(a)*rr,190+Math.sin(a)*rr*1.1); } c.closePath(); c.fill();
    c.strokeStyle='rgba(222,224,228,.8)'; c.lineWidth=1.4; c.beginPath(); for(let i=0;i<14;i++){ const a=i/14*6.283; c.moveTo(286+Math.cos(a)*11,118+Math.sin(a)*11); c.lineTo(286+Math.cos(a)*(18+r()*8),118+Math.sin(a)*(18+r()*8)); } c.stroke();
    c.fillStyle='rgba(222,224,228,.95)'; c.beginPath(); c.arc(286,118,12,0,7); c.fill(); blur(0); }
  if(key==='ards') scr(()=>{ for(const s of ['R','L']) clipL(s,()=>{ blur(7); for(let i=0;i<9;i++){ const x=s==='R'?60+r()*110:230+r()*110, y=100+r()*230; blob(x,y,30+r()*25,26+r()*25,0.55,0.6); } blur(0);
      c.strokeStyle='rgba(10,12,14,.55)'; c.lineCap='round'; blur(1); vessels(c,rng(s==='R'?31:37),s==='R'?168:236,200,s==='R'?-1:1,3,40,s==='R'?2.6:0.5,4,0); blur(0); }); });
  if(cfg.tube){ c.strokeStyle='rgba(245,246,248,.95)'; c.lineWidth=3; c.beginPath(); c.moveTo(201,0); c.lineTo(201,118); c.stroke(); c.lineWidth=1.6; c.beginPath(); c.moveTo(70,58); c.quadraticCurveTo(150,70,190,92); c.lineTo(196,140); c.stroke(); }
  if(key==='atelektazi'){ scr(()=>{ blur(3); c.fillStyle='rgba(212,215,219,.9)'; c.beginPath(); c.moveTo(176,70); c.quadraticCurveTo(110,96,96,150); c.quadraticCurveTo(140,140,178,176); c.closePath(); c.fill(); blur(0); });
    c.strokeStyle='rgba(235,238,242,.8)'; c.lineWidth=1.5; c.beginPath(); c.moveTo(96,150); c.quadraticCurveTo(140,140,178,176); c.stroke(); }
  if(cfg.blunt&&key!=='odem'){ blunt(c,cfg,'R',30); blunt(c,cfg,'L',30); }
  // kemikler: kostalar, klavikulalar
  c.save(); c.globalCompositeOperation='screen'; blur(1.6);
  for(const s of [1,-1]){ const X=x=>s>0?x:400-x;
    for(let i=0;i<10;i++){ const y=58+i*27*(cfg.inflate||1); c.strokeStyle=`rgba(190,194,200,${0.2-i*0.008})`; c.lineWidth=8-i*0.25;
      c.beginPath(); c.moveTo(X(188),y); c.bezierCurveTo(X(150),y-8,X(70),y-2,X(46),y+28); c.bezierCurveTo(X(40),y+40,X(48),y+46,X(60),y+52); c.stroke();
      c.strokeStyle='rgba(190,194,200,.08)'; c.lineWidth=7; c.beginPath(); c.moveTo(X(60),y+52); c.bezierCurveTo(X(90),y+70,X(118),y+86,X(150),y+104); c.stroke(); }
    c.strokeStyle='rgba(225,228,233,.6)'; c.lineWidth=9; c.beginPath(); c.moveTo(X(186),66); c.bezierCurveTo(X(150),54,X(110),60,X(58),46); c.stroke();
    c.strokeStyle='rgba(215,218,222,.35)'; c.lineWidth=16; c.beginPath(); c.moveTo(X(36),40); c.quadraticCurveTo(X(26),90,X(36),140); c.stroke(); }
  for(let i=0;i<14;i++){ c.fillStyle='rgba(215,218,222,.14)'; c.fillRect(188+med*0.3,40+i*28,24,22); }
  blur(0); c.restore();
  // tanecik
  c.restore();
  const img=c.getImageData(0,0,cv.width,cv.height), px=img.data, rr=rng(99);
  for(let i=0;i<px.length;i+=4){ const n=(rr()-0.5)*14; px[i]+=n; px[i+1]+=n; px[i+2]+=n; }
  c.putImageData(img,0,0);
  c.setTransform(d,0,0,d,0,0);
  // R işareti ve etiketler
  c.fillStyle='rgba(240,242,245,.9)'; c.font='700 14px ui-sans-serif,system-ui'; c.fillText(TX('S','R'),ox+12*sc,oy+26*sc);
  if(o.marks){ const M=MARKS[key]||[]; c.font=`700 ${Math.max(10,Math.round(11.5*Math.min(1.25,sc)))}px "Plus Jakarta Sans",system-ui,sans-serif`;
    for(const [x,y,lx,ly,t] of M){ const X=ox+x*sc, Y=oy+y*sc, LX=ox+lx*sc, LY=oy+ly*sc; const txt=TX(t[0],t[1]);
      c.strokeStyle='#ffd60a'; c.lineWidth=1.6; c.beginPath(); c.moveTo(X,Y); c.lineTo(LX,LY); c.stroke(); c.fillStyle='#ffd60a'; c.beginPath(); c.arc(X,Y,3,0,7); c.fill();
      const w=c.measureText(txt).width+12, bx=Math.min(W-w-4,Math.max(4,LX-(LX<X?w:0))), by=LY-10;
      c.fillStyle='rgba(10,12,16,.82)'; c.beginPath(); if(c.roundRect) c.roundRect(bx,by,w,20,6); else c.rect(bx,by,w,20); c.fill(); c.fillStyle='#ffe66b'; c.fillText(txt,bx+6,by+14.5); } }
}
function blunt(c,cfg,s,h){ const X=x=>s==='R'?x:400-x, dy=(cfg.dia&&cfg.dia[s==='R'?0:1])||0, cpY=(s==='R'?352:364)+dy;
  try{ c.filter='blur(3px)'; }catch(e){} c.fillStyle='rgba(205,208,212,.92)'; c.beginPath(); c.moveTo(X(48),cpY-h); c.quadraticCurveTo(X(70),cpY-h*0.4,X(96),cpY-6); c.lineTo(X(96),cpY+6); c.lineTo(X(48),cpY+6); c.closePath(); c.fill(); try{ c.filter='none'; }catch(e){} }
// İşaretler: [x, y, etiket x, etiket y, [tr, en]]
const MARKS={
  normal:[[120,318,92,380,['Sağ diyafram kubbesi','Right hemidiaphragm']],[54,350,30,410,['Kostofrenik açı (keskin)','Costophrenic angle (sharp)']],[230,290,300,404,['Kalp (KTO <0,5)','Heart (CTR <0.5)']],[200,120,250,40,['Trakea (orta hat)','Trachea (midline)']],[166,200,90,190,['Hilus','Hilum']]],
  pnomoni:[[100,320,40,250,['Homojen konsolidasyon','Homogeneous consolidation']],[150,272,250,262,['Hava bronkogramı','Air bronchogram']],[120,316,96,410,['Diyafram silinmiş (silüet)','Diaphragm lost (silhouette)']],[168,260,240,214,['Sağ kalp kenarı korunmuş','Right heart border preserved']]],
  koah:[[120,385,70,425,['Düzleşmiş, aşağıda diyafram','Flat, low diaphragm']],[230,280,300,230,['Dar, uzun kalp','Narrow, long heart']],[110,110,20,70,['Hiperlüsens, damar azalmış','Hyperlucent, sparse vessels']],[260,80,310,30,['Bül alanı','Bulla']]],
  astim:[[120,345,70,410,['Hafif hiperinflasyon','Mild hyperinflation']],[200,120,250,40,['Çoğu zaman grafi normal','Often a normal film']]],
  odem:[[150,210,40,150,['Perihiler "yarasa kanadı" ödem','Perihilar "bat-wing" oedema']],[62,305,20,250,['Kerley B çizgileri','Kerley B lines']],[260,300,320,250,['Kardiyomegali (KTO >0,5)','Cardiomegaly (CTR >0.5)']],[346,350,300,420,['Küçük efüzyon, açı kapalı','Small effusion, blunted angle']]],
  pe:[[96,236,20,190,['Westermark: oligemi','Westermark: oligaemia']],[70,325,20,410,['Hampton hörgücü (enfarkt)','Hampton hump (infarct)']],[162,198,250,150,['Genişlemiş pulmoner arter','Enlarged pulmonary artery']]],
  ptx:[[100,200,30,150,['Visseral plevra çizgisi','Visceral pleural line']],[62,250,20,320,['Damar izi yok (hava)','No lung markings (air)']],[230,300,320,250,['Mediyasten karşıya kaymış','Mediastinum shifted away']]],
  efuzyon:[[300,276,320,200,['Menisküs işareti','Meniscus sign']],[340,360,300,420,['Kostofrenik açı kapalı','Blunted costophrenic angle']]],
  tb:[[118,112,30,60,['Kavite (kalın duvar)','Cavity (thick wall)']],[110,150,30,200,['Üst zon nodüler infiltrasyon','Upper-zone nodular infiltrates']],[172,186,250,150,['Kalsifiye hiler nod','Calcified hilar node']]],
  ipf:[[80,320,30,250,['Bazal retiküler opasite','Basal reticular opacities']],[330,330,330,420,['Bal peteği','Honeycombing']],[120,300,90,410,['Hacim kaybı (yüksek diyafram)','Volume loss (high diaphragm)']]],
  kanser:[[150,190,40,150,['Sağ hiler kitle','Right hilar mass']],[286,118,320,60,['Spiküler nodül','Spiculated nodule']],[226,120,300,200,['Mediyasten genişlemiş','Widened mediastinum']]],
  ards:[[90,200,20,150,['Bilateral yamalı opasite','Bilateral patchy opacities']],[230,290,320,404,['Kalp normal boyutta','Normal heart size']],[201,110,260,60,['Endotrakeal tüp','Endotracheal tube']]],
  atelektazi:[[130,120,40,60,['Çökmüş sağ üst lob','Collapsed right upper lobe']],[140,146,40,220,['Yukarı kalkmış horizontal fissür','Elevated horizontal fissure']],[198,100,260,50,['Trakea aynı tarafa','Trachea pulled to same side']]]
};

/* ================= HİSTOLOJİ ================= */
const HE={bg:'#fbeef3',pink:'#ef9fbb',pink2:'#e27aa0',pale:'#f7d3df',nuc:'#5a3b8f',nuc2:'#3d2470',rbc:'#d8364a',cart:'#b9a6d8',cart2:'#9d87c9'};
const nuc=(x,y,rx,ry,rot,col)=>`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${rx}" ry="${ry}" transform="rotate(${f1(rot||0)} ${f1(x)} ${f1(y)})" fill="${col||HE.nuc}" opacity=".9"/>`;
function labelCol(lb,pts){
  const n=pts.length, top=Math.max(26,200-n*21), out=[];
  pts.forEach(([k,x,y],i)=>{ const ly=top+i*42;
    out.push(`<path d="M${f1(x)} ${f1(y)} L${f1(Math.min(380,x+30))} ${f1(y)} L412 ${ly}" fill="none" stroke="var(--ink)" stroke-width="1.2" opacity=".55"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="var(--ink)" stroke="#fff" stroke-width="1.2"/>`);
    out.push(`<g><rect x="414" y="${ly-13}" rx="9" width="214" height="26" fill="var(--surface)" stroke="var(--line-2)"/><text x="424" y="${ly+4.5}" font-size="12.5" font-weight="700" fill="var(--ink)">${esc(lb[k]||k)}</text></g>`);
  });
  return out.join('');
}
function scope(inner,lb,pts,bg){
  return `<svg viewBox="0 0 640 400" class="vz-histo" role="img"><defs><clipPath id="lhClip"><circle cx="200" cy="200" r="186"/></clipPath>
  <radialGradient id="lhVig" cx="50%" cy="50%" r="50%"><stop offset="70%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
  <circle cx="200" cy="200" r="196" fill="#111" opacity=".9"/><g clip-path="url(#lhClip)"><rect width="400" height="400" fill="${bg||HE.bg}"/>${inner}<circle cx="200" cy="200" r="186" fill="url(#lhVig)"/></g>
  <circle cx="200" cy="200" r="187" fill="none" stroke="#2a2f38" stroke-width="5"/>${labelCol(lb,pts)}</svg>`;
}
const HI={};
HI.trakea=lb=>{ const r=rng(5); let s='';
  s+=`<rect x="0" y="0" width="400" height="44" fill="#fff8fb"/>`; // lümen
  for(let x=0;x<400;x+=3) s+=`<line x1="${x}" y1="44" x2="${x+r()*2-1}" y2="${36-r()*3}" stroke="#c46d97" stroke-width="1" opacity=".8"/>`;
  for(let x=4;x<400;x+=11){ const gob=x===158||r()<0.18; s+=gob?`<ellipse cx="${x}" cy="62" rx="5" ry="13" fill="#e9f0ff" stroke="${HE.pink2}" stroke-width="1"/>`:`<rect x="${x-4}" y="44" width="9" height="40" fill="${HE.pink}" opacity=".85"/>`; s+=nuc(x,64+r()*16,2.6,4.5,0); }
  s+=`<line x1="0" y1="86" x2="400" y2="86" stroke="#d97ca5" stroke-width="2.4"/>`;
  s+=`<rect x="0" y="88" width="400" height="60" fill="#f6d6e2"/>`; for(let i=0;i<40;i++) s+=nuc(r()*400,92+r()*52,2.5,2,0,HE.nuc2);
  for(let i=0;i<5;i++){ const x=40+i*80+r()*20, y=170; s+=`<g>${[0,1,2,3,4,5].map(k=>`<circle cx="${f1(x+Math.cos(k)*16)}" cy="${f1(y+Math.sin(k)*12)}" r="9" fill="${k%2?'#c5d6f3':'#f0b9cd'}" stroke="#b35c86" stroke-width="1"/>`).join('')}</g>`; }
  s+=`<rect x="0" y="196" width="400" height="8" fill="#e8a6c0"/>`;
  s+=`<path d="M-10 214 Q200 196 410 214 L410 330 Q200 350 -10 330Z" fill="${HE.cart}" stroke="#8a72bd" stroke-width="2"/>`;
  for(let i=0;i<55;i++){ const x=10+r()*380, y=226+r()*96; s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="#efe7fb" stroke="${HE.cart2}"/>`+nuc(x,y,2.4,2.4,0,'#3f2a7a'); }
  s+=`<rect x="0" y="340" width="400" height="60" fill="#f2c8d8"/>`;
  return scope(s,lb,[['cil',120,40],['ep',200,70],['gob',158,62],['bm',260,86],['lp',90,120],['gl',120,172],['ck',200,280],['pc',300,334]],'#fdf2f6'); };
HI.brons=lb=>{ const r=rng(9); let s='';
  s+=`<rect width="400" height="400" fill="#fbe8ef"/>`;
  // bronş (sol üst)
  s+=`<circle cx="150" cy="150" r="118" fill="#f6cbdb"/>`;
  for(let i=0;i<4;i++){ const a=i*1.6+0.4; s+=`<path d="M${f1(150+Math.cos(a)*100)} ${f1(150+Math.sin(a)*100)} A100 100 0 0 1 ${f1(150+Math.cos(a+0.9)*100)} ${f1(150+Math.sin(a+0.9)*100)}" stroke="${HE.cart}" stroke-width="18" fill="none" stroke-linecap="round"/>`; }
  s+=`<circle cx="150" cy="150" r="76" fill="none" stroke="#d66b8a" stroke-width="9" stroke-dasharray="14 6"/>`;
  let d=''; for(let i=0;i<=40;i++){ const a=i/40*6.283, rr=56+Math.sin(i*1.9)*7; d+=(i?'L':'M')+f1(150+Math.cos(a)*rr)+' '+f1(150+Math.sin(a)*rr); }
  s+=`<path d="${d}Z" fill="#fff8fb" stroke="${HE.pink2}" stroke-width="7"/>`;
  for(let i=0;i<30;i++){ const a=i/30*6.283; s+=nuc(150+Math.cos(a)*62,150+Math.sin(a)*62,2.4,4,a*57.3+90); }
  s+=`<circle cx="268" cy="96" r="22" fill="#f0c0d0" stroke="#c4527a" stroke-width="5"/><circle cx="268" cy="96" r="12" fill="${HE.rbc}" opacity=".7"/>`;
  // bronşiyol (sağ alt)
  s+=`<circle cx="285" cy="292" r="44" fill="#f4c3d4"/><circle cx="285" cy="292" r="34" fill="none" stroke="#d66b8a" stroke-width="6"/><circle cx="285" cy="292" r="26" fill="#fff8fb" stroke="${HE.pink}" stroke-width="5"/>`;
  for(let i=0;i<14;i++){ const a=i/14*6.283; s+=`<circle cx="${f1(285+Math.cos(a)*26)}" cy="${f1(292+Math.sin(a)*26)}" r="3.4" fill="#fbe2ec" stroke="${HE.pink2}" stroke-width=".8"/>`; }
  // alveoller
  for(let i=0;i<40;i++){ const x=r()*400, y=r()*400; if(Math.hypot(x-150,y-150)<135||Math.hypot(x-285,y-292)<55) continue; s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(14+r()*12)}" fill="#fff8fb" stroke="${HE.pink2}" stroke-width="2"/>`; }
  s+=`<g fill="${HE.nuc}">`; for(let i=0;i<10;i++) s+=`<circle cx="${f1(160+r()*60)}" cy="${f1(200+r()*40)}" r="2"/>`; s+='</g>';
  return scope(s,lb,[['lum',150,150],['ep',150,90],['sm',224,150],['ck',236,96],['art',268,96],['bio',285,262],['club',305,280],['alv',360,360]]); };
HI.alveol=lb=>{ const r=rng(13); let s='';
  s+=`<rect width="400" height="400" fill="#f5c9d8"/>`;
  const A=[[110,110,78],[290,110,74],[110,290,74],[290,290,78],[200,200,40]];
  A.forEach(([x,y,R])=>{ s+=`<circle cx="${x}" cy="${y}" r="${R}" fill="#fffafc" stroke="${HE.pink}" stroke-width="2.5"/>`; });
  // kapillerler septumda
  for(let i=0;i<16;i++){ const x=40+r()*320, y=40+r()*320; const inA=A.some(([ax,ay,R])=>Math.hypot(x-ax,y-ay)<R-4); if(inA) continue; s+=`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="8" ry="5" fill="${HE.rbc}" opacity=".85" transform="rotate(${f1(r()*180)} ${f1(x)} ${f1(y)})"/>`; }
  // tip I (yassı çekirdek)
  for(const [x,y,R] of A.slice(0,4)) for(let k=0;k<3;k++){ const a=r()*6.283; s+=nuc(x+Math.cos(a)*(R-3),y+Math.sin(a)*(R-3),7,2.2,a*57.3+90,HE.nuc2); }
  // tip II (köşelerde, köpüklü)
  for(const [x,y] of [[200,112],[200,288],[112,200],[288,200]]){ s+=`<circle cx="${x}" cy="${y}" r="15" fill="#f9e3ee" stroke="#c75f8d" stroke-width="1.6"/>`+[0,1,2,3,4].map(k=>`<circle cx="${f1(x-7+k*3.5)}" cy="${f1(y+((k%2)?-5:5))}" r="2.6" fill="#fff" stroke="#d590b2" stroke-width=".8"/>`).join('')+nuc(x,y,4.5,4,0); }
  // makrofaj
  s+=`<circle cx="270" cy="270" r="17" fill="#e9c1a8" stroke="#a46a4a" stroke-width="1.5"/>`+nuc(266,268,6,5,0,'#5a3b8f')+`<circle cx="276" cy="276" r="2.5" fill="#6b4a2a"/><circle cx="262" cy="278" r="2" fill="#6b4a2a"/>`;
  s+=`<ellipse cx="202" cy="140" rx="8" ry="5" fill="${HE.rbc}"/>`;
  // Kohn poru
  s+=`<rect x="190" y="70" width="20" height="10" fill="#fffafc"/>`;
  // bariyer büyütme
  s+=`<g transform="translate(40 330)"><rect x="0" y="0" width="120" height="44" rx="8" fill="#fff" stroke="#7a879b" stroke-width="1.2"/><rect x="6" y="8" width="108" height="6" fill="${HE.pink}"/><rect x="6" y="15" width="108" height="3" fill="#b9a6d8"/><rect x="6" y="19" width="108" height="5" fill="#f2a3bb"/><ellipse cx="60" cy="32" rx="14" ry="7" fill="${HE.rbc}"/></g>`;
  return scope(s,lb,[['alv',110,110],['t1',176,82],['t2',200,112],['lam',196,106],['cap',202,140],['mac',270,270],['pore',200,75],['bar',100,350],['sep',200,155]]); };
HI.plevra=lb=>{ const r=rng(17); let s='';
  s+=`<rect width="400" height="400" fill="#fbe8ef"/>`;
  for(let i=0;i<26;i++){ const x=r()*400, y=r()*150; s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(14+r()*10)}" fill="#fffafc" stroke="${HE.pink2}" stroke-width="2"/>`; }
  s+=`<rect x="0" y="150" width="400" height="22" fill="#f2bfd2"/>`; for(let x=0;x<400;x+=9) s+=`<path d="M${x} ${158+r()*8} q4 -3 8 0" stroke="#5a5a7a" stroke-width="1.4" fill="none"/>`;
  s+=`<rect x="0" y="172" width="400" height="8" fill="#ef9fbb"/>`; for(let x=6;x<400;x+=22) s+=nuc(x,176,8,2,0,HE.nuc2);
  s+=`<rect x="0" y="180" width="400" height="24" fill="#fff"/>`;
  s+=`<rect x="0" y="204" width="400" height="8" fill="#ef9fbb"/>`; for(let x=14;x<400;x+=22) s+=nuc(x,208,8,2,0,HE.nuc2);
  s+=`<rect x="0" y="212" width="400" height="40" fill="#f3c9d9"/>`; s+=`<path d="M120 212 q12 18 24 0" fill="#fff" stroke="#c46d97" stroke-width="1.5"/>`;
  for(let i=0;i<14;i++){ const x=r()*400, y=262+r()*40; s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(10+r()*6)}" fill="#fffdf8" stroke="#eab3c6" stroke-width="1"/>`; }
  for(let y=310;y<400;y+=12) s+=`<path d="M-10 ${y} Q200 ${y-6} 410 ${y}" stroke="#e48a8f" stroke-width="7" fill="none" opacity=".85"/>`;
  return scope(s,lb,[['alv',200,60],['el',220,162],['mes',200,176],['sp',300,192],['lym',132,216],['ct',260,232],['fat',200,282],['mus',200,340]]); };

/* ================= EMBRİYOLOJİ ================= */
function emb(inner,lb,pts,bg){
  return `<svg viewBox="0 0 640 400" class="vz-histo" role="img"><rect x="4" y="4" width="392" height="392" rx="22" fill="${bg||'var(--card-2)'}" stroke="var(--line)"/>${inner}${labelCol(lb,pts)}</svg>`;
}
const EN={};
const ENDO='#f2b13b', MESO='#e88fa6', TUBE='#7bc3b8';
EN.tomurcuk=lb=>{ let s='';
  s+=`<path d="M170 30 L170 370 M230 30 L230 370" stroke="${ENDO}" stroke-width="0"/>`;
  s+=`<rect x="150" y="30" width="60" height="340" rx="30" fill="#f7d79a" stroke="${ENDO}" stroke-width="4"/>`; // foregut
  s+=`<path d="M150 130 C 120 160 112 200 118 240 C 122 262 150 262 156 240 L160 170Z" fill="#f9e0b0" stroke="${ENDO}" stroke-width="4"/>`; // ventral divertikül (görüntüde sol = ventral)
  s+=`<ellipse cx="108" cy="262" rx="26" ry="20" fill="#f9e0b0" stroke="${ENDO}" stroke-width="4"/><ellipse cx="160" cy="268" rx="22" ry="18" fill="#f9e0b0" stroke="${ENDO}" stroke-width="4"/>`;
  s+=`<path d="M152 168 L176 150" stroke="#c4553a" stroke-width="5" stroke-linecap="round"/><path d="M150 205 L178 190" stroke="#c4553a" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 5"/>`;
  s+=`<ellipse cx="134" cy="250" rx="80" ry="60" fill="${MESO}" opacity=".18"/>`;
  s+=`<text x="200" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="var(--mute)">${TX('dorsal →','dorsal →')}</text>`;
  return emb(s,lb,[['fg',196,60],['div',130,170],['tes',165,158],['oes',196,240],['tr',128,210],['bud',108,262],['mes',70,300]]); };
function tree(x,y,a,len,depth,w,col,out){ if(depth<=0) return; const x2=x+Math.cos(a)*len, y2=y+Math.sin(a)*len; out.push(`<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"/>`); tree(x2,y2,a-0.42,len*0.74,depth-1,w*0.72,col,out); tree(x2,y2,a+0.42,len*0.74,depth-1,w*0.72,col,out); if(depth===1) out.push(`<circle cx="${f1(x2)}" cy="${f1(y2)}" r="${f1(w*1.3)}" fill="#f9e0b0" stroke="${ENDO}" stroke-width="1.5"/>`); }
EN.psodo=lb=>{ let s=`<ellipse cx="200" cy="215" rx="170" ry="150" fill="${MESO}" opacity=".22"/>`; const o=[]; o.push(`<line x1="200" y1="30" x2="200" y2="110" stroke="${ENDO}" stroke-width="14" stroke-linecap="round"/>`); tree(200,110,Math.PI*0.75,62,6,11,ENDO,o); tree(200,110,Math.PI*0.25,62,6,11,ENDO,o); s+=o.join('');
  s+=`<path d="M40 372 Q200 330 360 372" stroke="#c98a6a" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  return emb(s,lb,[['tb',300,250],['ep',200,70],['mes',60,180],['dia',200,352],['ppm',330,360]]); };
EN.kanal=lb=>{ const r=rng(4); let s=`<rect x="20" y="20" width="360" height="360" rx="20" fill="${MESO}" opacity=".2"/>`;
  s+=`<path d="M200 20 L200 120" stroke="${ENDO}" stroke-width="22" stroke-linecap="round"/>`;
  for(const a of [-0.8,-0.25,0.25,0.8]){ const x=200+Math.sin(a)*150, y=120+Math.cos(a)*150; s+=`<line x1="200" y1="120" x2="${f1(x)}" y2="${f1(y)}" stroke="${ENDO}" stroke-width="14" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="24" fill="#f9e0b0" stroke="${ENDO}" stroke-width="3"/>`;
    for(let k=0;k<6;k++){ const b=k/6*6.283; s+=`<circle cx="${f1(x+Math.cos(b)*30)}" cy="${f1(y+Math.sin(b)*30)}" r="4" fill="#d8364a" opacity=".8"/>`; } }
  for(let i=0;i<30;i++) s+=`<path d="M${f1(30+r()*340)} ${f1(30+r()*340)} q10 ${f1((r()-.5)*20)} 20 0" stroke="#d8364a" stroke-width="2" fill="none" opacity=".45"/>`;
  return emb(s,lb,[['rb',200,100],['ad',257,213],['cap',230,250],['t1',318,232],['t2',140,260]]); };
EN.sakkul=lb=>{ let s=`<rect x="20" y="20" width="360" height="360" rx="20" fill="${MESO}" opacity=".16"/>`;
  s+=`<path d="M200 20 L200 100" stroke="${ENDO}" stroke-width="18" stroke-linecap="round"/>`;
  const C=[[120,170],[200,150],[280,170],[100,260],[180,250],[260,255],[320,250],[150,330],[240,335]];
  for(const [x,y] of C){ s+=`<circle cx="${x}" cy="${y}" r="38" fill="#e9f2ff" stroke="${ENDO}" stroke-width="3"/>`; }
  for(const [x,y] of C) for(let k=0;k<8;k++){ const b=k/8*6.283; s+=`<circle cx="${f1(x+Math.cos(b)*41)}" cy="${f1(y+Math.sin(b)*41)}" r="3.2" fill="#d8364a"/>`; }
  for(const [x,y] of C.slice(0,5)) s+=`<circle cx="${x+26}" cy="${y-26}" r="7" fill="#f9e3ee" stroke="#c75f8d" stroke-width="1.5"/><circle cx="${x+24}" cy="${y-28}" r="1.8" fill="#fff"/>`;
  return emb(s,lb,[['sac',200,150],['t2',226,124],['t1',162,170],['cap',241,150],['fl',180,250]]); };
EN.alveoler=lb=>{ let s=`<rect x="20" y="20" width="360" height="360" rx="20" fill="${MESO}" opacity=".12"/>`;
  const C=[[120,140],[280,140],[120,280],[280,280]];
  for(const [x,y] of C){ s+=`<circle cx="${x}" cy="${y}" r="70" fill="#e9f2ff" stroke="${ENDO}" stroke-width="3"/>`;
    for(let k=0;k<5;k++){ const b=k/5*6.283+0.3; s+=`<line x1="${f1(x+Math.cos(b)*70)}" y1="${f1(y+Math.sin(b)*70)}" x2="${f1(x+Math.cos(b)*34)}" y2="${f1(y+Math.sin(b)*34)}" stroke="${ENDO}" stroke-width="5" stroke-linecap="round"/><circle cx="${f1(x+Math.cos(b)*34)}" cy="${f1(y+Math.sin(b)*34)}" r="4.5" fill="#7b61ff"/>`; } }
  for(const [x,y] of C) for(let k=0;k<12;k++){ const b=k/12*6.283; s+=`<circle cx="${f1(x+Math.cos(b)*73)}" cy="${f1(y+Math.sin(b)*73)}" r="2.6" fill="#d8364a"/>`; }
  return emb(s,lb,[['sac',120,72],['sep',148,112],['el',154,111],['alv',300,300],['cap',193,140]]); };

/* ================= FONOPNÖMOGRAM ================= */
const CYC=4, TI=1.6, TE=2.2; // saniye: döngü, inspirasyon, ekspirasyon
function phono(cv,ses,t,col){
  const d=Math.min(2,window.devicePixelRatio||1), R=cv.getBoundingClientRect(), W=Math.max(10,R.width|0), H=Math.max(10,R.height|0);
  if(cv.width!==W*d||cv.height!==H*d){ cv.width=W*d; cv.height=H*d; }
  const c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); c.clearRect(0,0,W,H);
  col=col||{ink:'#1b2333',mute:'#66738a',teal:'#0e8f7e',line:'#e3e8f0',amber:'#f2a93b',coral:'#ef6a5b',violet:'#7b61ff'};
  const pad=10, top=22, bot=H-20, mid=(top+bot)/2, span=2*CYC, X=s=>pad+(s/span)*(W-2*pad);
  // fazlar
  for(let k=0;k<2;k++){ c.fillStyle='rgba(14,143,126,.08)'; c.fillRect(X(k*CYC),top,X(k*CYC+TI)-X(k*CYC),bot-top); c.fillStyle='rgba(123,97,255,.06)'; c.fillRect(X(k*CYC+TI),top,X(k*CYC+TI+TE)-X(k*CYC+TI),bot-top);
    c.fillStyle=col.mute; c.font='700 10.5px "Plus Jakarta Sans",system-ui'; c.fillText(TX('İnspirasyon','Inspiration'),X(k*CYC)+4,top-6); c.fillText(TX('Ekspirasyon','Expiration'),X(k*CYC+TI)+4,top-6); }
  // akım eğrisi
  c.strokeStyle=col.line; c.lineWidth=1; c.beginPath(); c.moveTo(pad,mid); c.lineTo(W-pad,mid); c.stroke();
  const flow=s=>{ const p=s%CYC; if(p<TI) return Math.sin(p/TI*Math.PI); if(p<TI+TE) return -0.75*Math.sin((p-TI)/TE*Math.PI); return 0; };
  const amp=(bot-top)*0.42;
  c.strokeStyle=col.teal; c.lineWidth=2.2; c.beginPath(); for(let i=0;i<=300;i++){ const s=i/300*span; const y=mid-flow(s)*amp; i?c.lineTo(X(s),y):c.moveTo(X(s),y); } c.stroke();
  // ek sesler
  const ev=EVENTS[ses]||[], rr=rng(3);
  for(let k=0;k<2;k++) for(const e of ev){ const a=k*CYC+e.a, b=k*CYC+e.b;
    if(e.k==='click'){ const n=e.n||8; for(let i=0;i<n;i++){ const s=a+(b-a)*Math.pow(rr(),e.late?0.45:1.6); const x=X(s); c.strokeStyle=e.coarse?col.coral:col.amber; c.lineWidth=e.coarse?2.4:1.6; c.beginPath(); c.moveTo(x,mid-amp*(e.coarse?0.95:0.75)); c.lineTo(x,mid+amp*(e.coarse?0.95:0.75)); c.stroke(); } }
    else if(e.k==='tone'){ c.strokeStyle=e.low?col.coral:col.violet; c.lineWidth=1.6; c.beginPath(); for(let i=0;i<=120;i++){ const s=a+(b-a)*i/120, env=Math.sin(i/120*Math.PI); const y=mid+Math.sin(i*(e.low?0.9:2.6))*amp*0.55*env; i?c.lineTo(X(s),y):c.moveTo(X(s),y); } c.stroke(); }
    else if(e.k==='rub'){ c.strokeStyle=col.coral; c.lineWidth=2; c.beginPath(); for(let i=0;i<=40;i++){ const s=a+(b-a)*i/40; const y=mid+((i%2)?1:-1)*amp*(0.4+rr()*0.5); i?c.lineTo(X(s),y):c.moveTo(X(s),y); } c.stroke(); }
    else if(e.k==='band'){ c.fillStyle=e.c==='bro'?'rgba(242,169,59,.28)':'rgba(102,115,138,.12)'; c.fillRect(X(a),mid-amp*(e.h||0.5),X(b)-X(a),2*amp*(e.h||0.5)); } }
  // oynatma imleci
  if(t!=null){ const s=t%span; c.strokeStyle=col.ink; c.lineWidth=1.5; c.beginPath(); c.moveTo(X(s),top-2); c.lineTo(X(s),bot+2); c.stroke(); }
  c.fillStyle=col.mute; c.font='600 10px "Plus Jakarta Sans",system-ui'; c.fillText(TX('Akım','Flow'),pad,bot+14); c.textAlign='right'; c.fillText(TX('8 sn · 2 solunum döngüsü','8 s · 2 breath cycles'),W-pad,bot+14); c.textAlign='left';
}
const EVENTS={
  vez:[{k:'band',a:0,b:TI,h:0.35},{k:'band',a:TI,b:TI+0.6,h:0.2}],
  bro:[{k:'band',a:0.05,b:TI-0.15,h:0.6,c:'bro'},{k:'band',a:TI+0.25,b:TI+TE,h:0.65,c:'bro'}],
  ince:[{k:'band',a:0,b:TI,h:0.3},{k:'click',a:TI*0.45,b:TI,n:14,late:1}],
  kaba:[{k:'band',a:0,b:TI,h:0.3},{k:'click',a:0.05,b:TI*0.5,n:7,coarse:1},{k:'click',a:TI+0.1,b:TI+1.2,n:5,coarse:1}],
  wheeze:[{k:'band',a:0,b:TI,h:0.25},{k:'tone',a:TI+0.1,b:TI+TE-0.1}],
  ronkus:[{k:'band',a:0,b:TI,h:0.3},{k:'tone',a:0.2,b:TI-0.1,low:1},{k:'tone',a:TI+0.1,b:TI+TE-0.2,low:1}],
  stridor:[{k:'tone',a:0.05,b:TI-0.05},{k:'band',a:TI,b:TI+0.8,h:0.2}],
  frot:[{k:'band',a:0,b:TI,h:0.3},{k:'rub',a:TI-0.6,b:TI},{k:'rub',a:TI+0.05,b:TI+0.7}],
  yok:[{k:'band',a:0,b:TI,h:0.08}]
};

window.LungViz={cxr,histo:(id,lb)=>HI[id]?HI[id](lb||{}):'',embryo:(id,lb)=>EN[id]?EN[id](lb||{}):'',phono,CYC,TI,TE,MARKS};
})();
