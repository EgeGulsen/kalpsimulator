/* Kalp Simülatörü: arayüz, mod geçişi, etiketler ve EKG çizimi. */
(function(){
'use strict';
const {KIND,S,GROUPS,COND,CATS,SOURCES,LESSONS,FAQ,MCQ,ECG_POOL}=window.KALP;
const E12=window.KalpECG12;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KCOL={kas:'#ff6b72',ileti:'#ffd60a',sinir:'#ffd60a',kapak:'#e9ddc6',damar:'#7fa2ee',zar:'#e8d27a'};
const ART={lmca:1,lad:1,diag:1,ladrv:1,lcx:1,om:1,rca:1,conus:1,am:1,pda:1,rpl:1,aroot:1,aasc:1,arch:1,adesc:1,aorta:1,rspv:1,ripv:1,lspv:1,lipv:1,pvn:1};
const dotCol=id=>{const k=S[id].k; if(k==='damar') return ART[id]?'#e2525b':'#6f86d6'; return KCOL[k]||'#888';};

const sim=window.KalpSim.createSim(COND);
let lastView=false, mode='anatomi', selected=null, condKey='nsr', heart=null, query='', cardOpen=true;
let lesson='nedir', lead='II', variant='normal', faqQ='';
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>window.matchMedia('(max-width:980px)').matches;

/* ---------- 3D sahne ---------- */
const stage=$('stage'), tip=$('tip'), loading=$('loading'), xray=$('t-xray'), tLabels=$('t-labels');
try{
  heart=window.KalpHeart.create(stage,{
    modelUrl:['assets/heart.glb','assets/heart.b64.txt'],
    onPick:id=>{ if(mode==='sina'&&quizPick(id)) return; if(id) openCard(); select(id); },
    onHover:(id,x,y)=>{
      if(!id||quizHidesNames()){tip.hidden=true;return;}
      const r=stage.getBoundingClientRect();
      tip.textContent=S[id]?S[id].n:id; tip.hidden=false; tip.style.left=(x-r.left)+'px'; tip.style.top=(y-r.top)+'px';
    },
    onReady:()=>{loading.hidden=true; if(partsOpen){heart.setFocus(focusMode); renderParts();} if(mode==='ogren'){applyLearn3D();} else if(mode==='sina'){applyQ3D();} else heart.setMode(mode,mode==='durumlar'?COND[condKey]:null,condKey); heart.setXray(xray.checked); heart.select(selected); insets(); if(mode==='durumlar'&&(COND[condKey].fx||{}).infarct==='rca'){heart.viewFrom('inferior'); lastView=true;}},
    onError:()=>{loading.innerHTML='3D model yüklenemedi. Dosyayı doğrudan açtıysan bir yerel sunucu ile aç<br>(ör. <code>python3 -m http.server</code>).';}
  });
  stage.insertBefore(heart.canvas,stage.firstChild);
}catch(err){
  loading.textContent='3D görünüm bu tarayıcıda açılamadı (WebGL gerekli).';
  console.error(err);
}
/* Kalbi panellerin arasındaki boş alanın ortasına yerleştir */
function insets(){
  if(!heart||!heart.setInsets) return;
  if(narrow()){heart.setInsets(0,0,0,0); return;}
  const W=innerWidth, nav=$('nav').getBoundingClientRect(), card=$('card');
  const left=Math.max(nav.right,$('parts').getBoundingClientRect().right), right=card.classList.contains('hide')?0:W-card.getBoundingClientRect().left;
  const top=mode==='durumlar'?$('monitor').getBoundingClientRect().bottom-40:mode==='ogren'?$('ecg12').getBoundingClientRect().bottom-40:60;
  heart.setInsets(top,left,right,70);
}
window.addEventListener('resize',()=>{insets(); sizeCanvas();});

/* ---------- Sol liste ---------- */
const nav=$('nav');
function navAnatomy(){
  const q=query.trim().toLocaleLowerCase('tr');
  const hit=id=>!q||(S[id].n+' '+(S[id].l||'')).toLocaleLowerCase('tr').includes(q);
  let html=`<input class="search" id="search" type="search" placeholder="Yapı ara: ör. diyagonal, koroner sinüs" value="${esc(query)}" aria-label="Yapı ara">`;
  let any=false;
  for(const [g,ids] of GROUPS){
    const vis=ids.filter(hit); if(!vis.length) continue; any=true;
    html+=`<div class="grp-h">${esc(g)}<span>${vis.length}</span></div>`;
    html+=vis.map(id=>`<button class="item${S[id].p?' sub':''}" type="button" data-id="${id}" aria-current="${id===selected}"><i class="k" style="background:${dotCol(id)}"></i>${esc(S[id].n)}</button>`).join('');
  }
  if(!any) html+=`<p class="grp-h">Sonuç yok</p>`;
  return html;
}
let navOpen=false;
function navConds(){
  const c=COND[condKey];
  return `<button class="navtog" type="button" data-navtog aria-expanded="${navOpen}"><span><small>Senaryo seç · ${Object.keys(COND).length} durum</small>${esc(c.n)}</span><i aria-hidden="true">▾</i></button><div class="navbody">`+CATS.map(([k,nm])=>`<div class="grp-h">${esc(nm)}</div>`+Object.entries(COND).filter(([,c])=>c.cat===k).map(([key,c])=>`<button class="item cond" type="button" data-cond="${key}" aria-current="${key===condKey}">${esc(c.n)}</button>`).join('')).join('')+`</div>`;
}
function renderNav(){
  const ae=document.activeElement&&document.activeElement.id==='search', pos=ae?$('search').selectionStart:0;
  nav.innerHTML= mode==='anatomi'?navAnatomy():mode==='ogren'?navLearn():mode==='sina'?navQuiz():navConds();
  if(ae){const s=$('search'); s.focus(); s.setSelectionRange(pos,pos);}
}
nav.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value; renderNav();}});
nav.addEventListener('click',e=>{
  if(e.target.closest('[data-navtog]')){ navOpen=!navOpen; nav.classList.toggle('open',navOpen); renderNav(); return; }
  const qt=e.target.closest('[data-qtype]'); if(qt){ setQType(qt.dataset.qtype); return; }
  if(e.target.closest('[data-qreset]')){ quiz.score={}; quiz.streak=0; saveScore(); renderNav(); render(); return; }
  const b=e.target.closest('[data-id],[data-cond],[data-lesson]'); if(!b) return;
  if(b.dataset.lesson){openCard(); setLesson(b.dataset.lesson); return;}
  if(b.dataset.id){openCard(); select(b.dataset.id);}
  else {openCard(); setCond(b.dataset.cond); if(narrow()){ navOpen=false; nav.classList.remove('open'); renderNav(); monitor.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'}); }}
});

/* ---------- Sağ kart ---------- */
const card=$('card');
function kindHTML(k){return `<span class="kind"><b style="background:${KCOL[k]||'#888'}"></b>${KIND[k]||''}</span>`;}
const closeBtn=`<button class="x" id="cardX" type="button" aria-label="Kartı kapat">×</button>`;
function anatomyHTML(){
  if(!selected) return `${closeBtn}<div><div class="eyebrow">Anatomi</div><h2>Kalbi keşfet</h2></div>
    <p>Gerçek ölçülerden alınmış bir insan kalbi. Sürükleyerek çevir, kaydırarak yakınlaştır. Kasa, bir damara ya da dalına dokun: adı tıkladığın noktada görünür, ayrıntısı burada açılır.</p>
    <p><b>İsimler</b> düğmesi görünen tüm yapıları etiketler. <b>İçini göster</b> kası saydamlaştırır ve ileti sistemini ortaya çıkarır.</p>
    <div class="legend"><span><i class="sw" style="background:var(--cond)"></i>İleti sistemi</span><span><i class="sw" style="background:repeating-linear-gradient(90deg,var(--cond) 0 5px,transparent 5px 9px)"></i>Otonom sinir</span><span><i class="sw" style="background:#d8414a"></i>Arter</span><span><i class="sw" style="background:#5a5fb4"></i>Ven</span></div>
    <div class="disc">Toplam ${Object.keys(S).length} yapı. Soldaki listeden ya da arama kutusundan da seçebilirsin.</div>`;
  const s=S[selected], par=s.p&&S[s.p];
  const kids=Object.keys(S).filter(k=>S[k].p===selected);
  const sibs=par?Object.keys(S).filter(k=>S[k].p===s.p&&k!==selected):[];
  let more='';
  if(s.f) more+=`<div><dt>Görevi</dt><dd>${esc(s.f)}</dd></div>`;
  if(s.b) more+=`<div><dt>Kanlanma</dt><dd>${esc(s.b)}</dd></div>`;
  if(s.c) more+=`<div><dt>Klinik önemi</dt><dd>${esc(s.c)}</dd></div>`;
  const chip=id=>`<button type="button" data-id="${id}">${esc(S[id].n)}</button>`;
  return `${closeBtn}
    ${par?`<div class="crumb"><button type="button" data-id="${s.p}">${esc(par.n)}</button><span>›</span></div>`:''}
    <div>${kindHTML(s.k)}<h2>${esc(s.n)}</h2><div class="latin">${esc(s.l||'')}</div></div>
    <p>${esc(s.d)}</p>
    ${more?`<dl class="facts">${more}</dl>`:''}
    ${s.note?`<div class="note">${esc(s.note)}</div>`:''}
    ${kids.length?`<div><div class="eyebrow" style="margin-bottom:6px">Dalları ve bölümleri</div><div class="chips">${kids.map(chip).join('')}</div></div>`:''}
    ${sibs.length?`<div><div class="eyebrow" style="margin-bottom:6px">Komşu dallar</div><div class="chips">${sibs.map(chip).join('')}</div></div>`:''}`;
}
function stateOf(id){
  const c=COND[condKey], k=S[id].k, fx=c.fx||{};
  if(k==='ileti'){
    if(fx.block===id) return ['blk','Bu durumda bloklu'];
    if(fx.blockFlash===id) return ['blk','Bazı uyarıları geçirmiyor'];
    if(id==='ap') return fx.ap?['on','Bu durumda çalışıyor']:['off','Bu kişide yok'];
    return c.off.includes(id)?['off','Bu durumda çalışmıyor']:['on','Bu durumda çalışıyor'];
  }
  if(k==='sinir') return c.nerveOn.includes(id)?['on','Bu durumda baskın']:['off','Bu durumda baskın değil'];
  return null;
}
function condHTML(){
  const c=COND[condKey], fx=c.fx||{};
  let sel='';
  if(selected&&S[selected]){const st=stateOf(selected); sel=`<div class="selmini"><b>${esc(S[selected].n)}</b>${st?`<span class="${st[0]}">● ${st[1]}</span>`:''}<span style="color:var(--muted)">${esc(S[selected].d)}</span></div>`;}
  const leg=[`<span><i class="sw" style="background:#ffd84a"></i>Uyarı dalgası</span>`,`<span><i class="sw" style="background:#d8202f"></i>Kasılan kas</span>`,`<span><i class="sw" style="background:var(--cond)"></i>Çalışan yol</span>`,`<span><i class="sw" style="background:var(--cond-dim)"></i>Çalışmayan yol</span>`];
  if(fx.af) leg.push(`<span><i class="sw" style="background:var(--af)"></i>Titreşen atriyum</span>`);
  if(fx.infarct) leg.push(`<span><i class="sw" style="background:#86607a"></i>Kansız kalan kas</span>`);
  if(fx.scar) leg.push(`<span><i class="sw" style="background:#6a5b54"></i>Eski skar</span>`);
  if(fx.block||fx.blockFlash) leg.push(`<span><i class="sw" style="background:var(--block)"></i>Blok</span>`);
  const read=c.read?`<dl class="read">${Object.entries(c.read).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:'';
  return `${closeBtn}<div><div class="eyebrow">${esc(c.tag)}</div><h2>${esc(c.n)}</h2></div>
    <div class="beats"><span class="beat"><i id="bA"></i>Atriyumlar</span><span class="beat"><i id="bV"></i>Ventriküller</span></div>
    <p>${esc(c.sum)}</p>
    ${read}
    <div class="legend">${leg.join('')}</div>
    <details open><summary>Neden olur?</summary><ul class="key">${(c.why||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
    <details><summary>Nasıl olur? (mekanizma)</summary><p class="long">${esc(c.how||'')}</p></details>
    <details><summary>EKG’de ne görülür?</summary><ul class="key">${c.ecg.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
    <details><summary>Kaslar ve ileti yolları</summary><dl class="facts">
      <div><dt>Kaslar</dt><dd>${esc(c.mus)}</dd></div>
      <div><dt>İleti yolları ve sinirler</dt><dd>${esc(c.ner)}</dd></div>
    </dl></details>
    ${c.cli?`<details><summary>Klinikte</summary><p class="long">${esc(c.cli)}</p></details>`:''}
    ${c.note?`<div class="note">${esc(c.note)}</div>`:''}
    ${sel}
    <div class="disc">Tıbbi tavsiye değildir. Tedavi bilgileri genel çerçevedir.</div>`;
}
let bA=null,bV=null;
function render(){
  card.innerHTML = mode==='anatomi'?anatomyHTML():mode==='ogren'?learnHTML():mode==='sina'?quizHTML():condHTML();
  bA=$('bA'); bV=$('bV');
  card.classList.toggle('hide',!cardOpen);
  queueMicrotask(()=>renderParts());
}
card.addEventListener('click',e=>{
  if(e.target.id==='cardX'){cardOpen=false; card.classList.add('hide'); insets(); return;}
  if(mode==='sina'){ const qa=e.target.closest('[data-qa]'); if(qa){ quizAnswer(+qa.dataset.qa); return; }
    if(e.target.closest('[data-qnext]')){ newQ(); return; }
    if(e.target.closest('[data-qgive]')){ quizReveal(); return; } }
  const lk=e.target.closest('[data-lead]'); if(lk){ setLead(lk.dataset.lead); return; }
  const ls=e.target.closest('[data-lesson]'); if(ls){ setLesson(ls.dataset.lesson); card.scrollTop=0; return; }
  const b=e.target.closest('[data-id]'); if(b) select(b.dataset.id);
});
card.addEventListener('input',e=>{ if(e.target.id==='faqq'){ faqQ=e.target.value; const q=faqQ.trim().toLocaleLowerCase('tr'); card.querySelectorAll('.faq details').forEach(d=>{d.hidden=!!q&&!d.textContent.toLocaleLowerCase('tr').includes(q);}); } });
function openCard(){ if(!cardOpen){cardOpen=true; card.classList.remove('hide'); insets();} }
function select(id){
  if(id&&!S[id]) id=null;
  selected=id; heart&&heart.select(id); render(); renderNav();
  if(id&&narrow()&&mode==='anatomi') card.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});
}


/* ---------- Öğren ---------- */
function navLearn(){
  return `<div class="grp-h">Dersler</div>`+LESSONS.map((l,i)=>`<button class="item" type="button" data-lesson="${l.id}" aria-current="${l.id===lesson}"><small style="margin:0;min-width:18px">${i+1}</small>${esc(l.t)}</button>`).join('')+
    `<div class="grp-h">Soru–cevap</div><button class="item" type="button" data-lesson="sss" aria-current="${lesson==='sss'}"><small style="margin:0;min-width:18px">?</small>Sık sorulan sorular (${FAQ.length})</button>`;
}
function learnHTML(){
  if(lesson==='sss') return `${closeBtn}<div><div class="eyebrow">Soru–cevap</div><h2>Sık sorulan sorular</h2></div>
    <input class="search" id="faqq" type="search" placeholder="Soru ara: ör. troponin, şok, QT" value="${esc(faqQ)}" aria-label="Soru ara">
    <div class="faq">${FAQ.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    <div class="disc">Tıbbi tavsiye değildir. Kendi sağlığınla ilgili sorular için bir hekime danış.</div>`;
  const i=LESSONS.findIndex(l=>l.id===lesson), l=LESSONS[i], prev=LESSONS[i-1], next=LESSONS[i+1];
  return `${closeBtn}<div><div class="eyebrow">Ders ${i+1} / ${LESSONS.length}</div><h2>${esc(l.t)}</h2></div>
    <div class="lesson">${l.body}</div>
    <div class="pager">${prev?`<button class="btn" type="button" data-lesson="${prev.id}">← ${esc(prev.t)}</button>`:'<span></span>'}${next?`<button class="btn" type="button" data-lesson="${next.id}">${esc(next.t)} →</button>`:`<button class="btn" type="button" data-lesson="sss">Sık sorulan sorular →</button>`}</div>
    <div class="disc">Değerler erişkinler için genel kabul gören aralıklardır. EKG eğrileri bu sitedeki basitleştirilmiş vektör modelinden üretilir.</div>`;
}
function setLesson(id){
  lesson=id; const l=LESSONS.find(x=>x.id===id);
  if(l){ setVariant(l.variant||'normal'); if(l.lead) setLead(l.lead,true); }
  if(history.replaceState&&mode==='ogren') history.replaceState(null,'','#ogren/'+id);
  render(); renderNav();
}
const e12=$('ecg12'), c12=$('ecg12c'), x12=c12.getContext('2d');
function setLead(id,quiet){
  if(!E12.LEADS[id]) return; lead=id; heart&&heart.setLeadSel(id);
  const L=E12.LEADS[id]; $('e12sel').textContent=id==='II'||id==='III'||id==='I'?'D'+id:id;
  $('e12info').textContent=`${L.wall} · ${L.plane} düzlem ${L.angle} · ${L.where}`;
  $('e12info').title=`${L.where} Baktığı bölge: ${L.wall}. İlgili arter: ${L.art}.`;
}
function setVariant(v){
  variant=v; $('e12var').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v));
}
$('e12var').innerHTML=Object.entries(E12.VARIANTS).map(([k,v])=>`<button class="mbtn" type="button" data-v="${k}" aria-pressed="${k==='normal'}">${esc(v.n)}</button>`).join('');
$('e12var').addEventListener('click',e=>{const b=e.target.closest('[data-v]'); if(b) setVariant(b.dataset.v);});
$('btnEye').addEventListener('click',()=>heart&&heart.lookFrom(E12.LEADS[lead].dir));
c12.addEventListener('click',e=>{
  const r=c12.getBoundingClientRect(), col=Math.floor((e.clientX-r.left)/r.width*4), row=Math.floor((e.clientY-r.top)/r.height*3);
  const id=E12.GRID[Math.min(2,Math.max(0,row))][Math.min(3,Math.max(0,col))]; setLead(id);
});
function applyLearn3D(){
  if(!heart) return;
  heart.setMode('durumlar',COND.nsr,'nsr'); heart.setXray(xray.checked);
  heart.setLearn(true,E12.LEADS); heart.setLeadSel(lead);
}
/* Belirli bir anda (τ) kalp vektörü: o ana kadarki son P ve QRS olayına göre */
function vecAt(tau){
  let a=null,e=null;
  for(const x of sim.atrial){ if(x.t<=tau+0.04) a=x; else break; }
  for(const x of sim.vent){ if(x.t<=tau+0.04) e=x; else break; }
  return E12.vectorAt(a?tau-a.t:null,e?tau-e.t:null,e?sim.qt(e.rr):0.38,variant);
}
/* Kararlı EKG izi: örnekler mutlak zamana sabitlenmiş bir ızgaradan alınır (her karede aynı anlar) ve her piksel
   sütununda en alçak/en yüksek değer korunur. Böylece dar R tepesi kayarken boyu ve yeri titremez. */
const DT=0.002;
function traceCols(t0,pps,W){
  const k0=Math.floor(t0*pps), cols=[];
  for(let i=0;i<=W+1;i++){
    const a=(k0+i)/pps, b=(k0+i+1)/pps, x=i-(t0*pps-k0);
    const ts=[]; for(let j=Math.ceil(a/DT);j*DT<b;j++) ts.push(j*DT);
    if(!ts.length) ts.push(Math.round(a/DT)*DT);
    cols.push({x,ts});
  }
  return cols;
}
function strokeCols(c,cols,val,yOf,ox){
  let first=true;
  for(const col of cols){
    let lo=Infinity,hi=-Infinity,il=0,ih=0;
    col.ts.forEach((t,j)=>{const v=val(t); if(v<lo){lo=v;il=j;} if(v>hi){hi=v;ih=j;}});
    const pts=lo===hi?[lo]:(il<ih?[lo,hi]:[hi,lo]);
    for(const v of pts){const X=ox+col.x, Y=yOf(v); if(first){c.moveTo(X,Y);first=false;} else c.lineTo(X,Y);}
  }
}
function size12(){const r=c12.getBoundingClientRect(), d=Math.min(2,window.devicePixelRatio||1); if(!r.width)return; c12.width=Math.round(r.width*d); c12.height=Math.round(r.height*d); x12.setTransform(d,0,0,d,0,0);}
window.addEventListener('resize',size12);
function draw12(){
  const W=c12.clientWidth, H=c12.clientHeight; if(!W) return;
  const cw=W/4, rh=H/3, win=Math.max(1.6,Math.min(2.6,cw/95)), pps=cw/win, ppmv=Math.min(pps*0.4,rh*0.36), t1=sim.t, t0=t1-win;
  x12.fillStyle='#050b0a'; x12.fillRect(0,0,W,H);
  // ızgara
  x12.lineWidth=1;
  for(let k=Math.ceil(t0/0.2);k*0.2<=t1;k++){ for(let c=0;c<4;c++){const x=c*cw+(k*0.2-t0)*pps; x12.strokeStyle=GRID2; x12.beginPath(); x12.moveTo(x+.5,0); x12.lineTo(x+.5,H); x12.stroke();} }
  for(let r=0;r<3;r++){ const base=r*rh+rh*0.6; for(let k=-3;k<=2;k++){const y=base-k*ppmv*0.5; if(y<r*rh||y>(r+1)*rh) continue; x12.strokeStyle=GRID; x12.beginPath(); x12.moveTo(0,y+.5); x12.lineTo(W,y+.5); x12.stroke();} }
  // vektörleri bir kez hesapla, 12 derivasyona izdüşür
  const cols=traceCols(t0,pps,Math.ceil(cw)), vmap=new Map();
  for(const col of cols) for(const t of col.ts) if(!vmap.has(t)) vmap.set(t,vecAt(t));
  x12.font='600 12px "IBM Plex Mono", monospace';
  for(let r=0;r<3;r++) for(let c=0;c<4;c++){
    const id=E12.GRID[r][c], ox=c*cw, base=r*rh+rh*0.6, sel=id===lead;
    if(sel){x12.fillStyle='#ffd60a14'; x12.fillRect(ox,r*rh,cw,rh); x12.strokeStyle='#ffd60a99'; x12.lineWidth=1.5; x12.strokeRect(ox+1,r*rh+1,cw-2,rh-2);}
    x12.save(); x12.beginPath(); x12.rect(ox,r*rh,cw,rh); x12.clip();
    x12.strokeStyle=sel?'#ffe680':ECG; x12.lineWidth=sel?2:1.6; x12.lineJoin='round'; x12.beginPath();
    strokeCols(x12,cols,t=>E12.leadValue(id,vmap.get(t),variant),v=>base-v*ppmv,ox);
    x12.stroke(); x12.restore();
    x12.fillStyle=sel?'#ffd60a':'#9fe8c4'; x12.fillText(id==='I'||id==='II'||id==='III'?'D'+id:id,ox+7,r*rh+16);
    if(c>0){x12.strokeStyle='#4df0a133'; x12.lineWidth=1; x12.beginPath(); x12.moveTo(ox+.5,r*rh); x12.lineTo(ox+.5,(r+1)*rh); x12.stroke();}
  }
  x12.strokeStyle='#4df0a133'; for(let r=1;r<3;r++){x12.beginPath(); x12.moveTo(0,r*rh+.5); x12.lineTo(W,r*rh+.5); x12.stroke();}
}

/* ---------- Etiketler ---------- */
const labLayer=$('labels'), pool=new Map();
labLayer.addEventListener('click',e=>{const d=e.target.closest('[data-lead]'); if(d){setLead(d.dataset.lead); return;} const l=e.target.closest('[data-id]'); if(l){openCard(); select(l.dataset.id);}});
function drawLabels(){
  if(!heart||!heart.ready){return;}
  const {list,pin}=heart.labels(), show=tLabels.checked&&!quizHidesNames(), used=new Set(), boxes=[];
  const place=(key,id,x,y,cls)=>{
    if(!S[id]) return;
    let el=pool.get(key); if(!el){el=document.createElement('div'); el.className='lab'; labLayer.appendChild(el); pool.set(key,el);}
    if(el.dataset.id!==id){el.dataset.id=id; el.textContent=S[id].n;}
    el.className='lab '+cls; el.style.transform=`translate(${x}px,${y}px) translate(-50%,calc(-100% - ${cls.includes('pin')?16:12}px))`;
    used.add(key);
  };
  const fits=(x,y,w)=>{const r={l:x-w/2,r:x+w/2,t:y-34,b:y-10}; if(boxes.some(b=>!(r.r<b.l||r.l>b.r||r.b<b.t||r.t>b.b))) return false; boxes.push(r); return true;};
  if(pin&&S[pin.id]){ fits(pin.x,pin.y,S[pin.id].n.length*7.4+24); place('pin',pin.id,pin.x,pin.y,'pin'); }
  else if(selected){ const a=list.find(l=>l.id===selected); if(a){ fits(a.x,a.y,S[selected].n.length*7.4+24); place('pin',selected,a.x,a.y,'pin'); } }
  const topLim=monitor.classList.contains('show')&&!narrow()?monitor.getBoundingClientRect().bottom+30:0;
  if(show){
    list.filter(a=>a.y>topLim).slice().sort((a,b)=>a.depth-b.depth).forEach(a=>{
      if(!S[a.id]||a.id===selected) return;
      const w=S[a.id].n.length*6.4+16; if(!fits(a.x,a.y,w)) return;
      const k=S[a.id].k; place('a:'+a.id,a.id,a.x,a.y,(a.dim?'dim ':'')+(k==='ileti'||k==='sinir'?'c':''));
    });
  }
  if(mode==='ogren'&&heart.leadsScreen){
    for(const e of heart.leadsScreen()){
      const key='e:'+e.id; let el=pool.get(key); if(!el){el=document.createElement('div'); labLayer.appendChild(el); pool.set(key,el); el.dataset.lead=e.id; el.textContent=E12.LEADS[e.id]&&(e.id.length<4&&e.id[0]==='I'?'D'+e.id:e.id);}
      el.className='lab e'+(e.limb?'':' p')+(e.id===lead?' sel':''); el.style.transform=`translate(${e.x}px,${e.y}px) translate(-50%,calc(-100% - 12px))`; used.add(key);
    }
  }
  for(const [k,el] of pool) if(!used.has(k)){ el.remove(); pool.delete(k); }
}

/* ---------- Kontroller ---------- */
xray.addEventListener('change',()=>heart&&heart.setXray(xray.checked));
[['t-cond','cond'],['t-nerves','nerves'],['t-vessels','vessels']].forEach(([id,k])=>{const cb=$(id); cb.addEventListener('change',()=>heart&&heart.setLayer(k,cb.checked));});
$('btnReset').addEventListener('click',()=>heart&&heart.resetView());

/* ---------- Parçaları incele: listeden seç, yalnız göster / parlat, diğerlerini gizle veya saydamlaştır ---------- */
const partsEl=$('parts'), btnParts=$('btnParts');
const PKIND=[['kas','Odacıklar ve kas'],['kapak','Kapaklar'],['damar','Damarlar'],['ileti','İleti sistemi'],['sinir','Otonom sinirler']];
const PORDER=GROUPS.flatMap(g=>g[1]);
let partsOpen=false, focusMode='glow', othersOp=1;
function pname(id){ return S[id]?S[id].n:id; }
function renderParts(){
  if(!partsOpen) return;
  const list=heart&&heart.ready?heart.parts():[];
  const top=heart&&heart.ready&&selected?heart.topOf(selected):null;
  let h=`<div class="ph"><b>Parçaları incele</b><button class="x2" type="button" data-pclose aria-label="Kapat">×</button></div>
  <div class="ctl"><small>Bir parçaya tıklayınca:</small>
    <div class="pseg" role="group" aria-label="Seçilen parça">${[['glow','Parlasın'],['iso','Yalnız o kalsın'],['none','Normal']].map(([k,t])=>`<button type="button" data-fmode="${k}" aria-pressed="${focusMode===k}">${t}</button>`).join('')}</div>
    <label class="oth" aria-disabled="${!top||focusMode!=='glow'}">Diğerleri<input type="range" id="othOp" min="0" max="1" step="0.05" value="${othersOp}" ${!top||focusMode!=='glow'?'disabled':''} aria-label="Seçili parça dışındaki dokuların görünürlüğü"></label>
  </div>`;
  if(!list.length) h+=`<p class="grp-h">3D model yükleniyor…</p>`;
  for(const [k,t] of PKIND){
    const ids=list.filter(p=>p.kind===k).map(p=>p.id).sort((a,b)=>(PORDER.indexOf(a)+999*(PORDER.indexOf(a)<0))-(PORDER.indexOf(b)+999*(PORDER.indexOf(b)<0)));
    if(!ids.length) continue;
    h+=`<div class="grp-h">${esc(t)}<span>${ids.length}</span></div>`;
    for(const id of ids){ const ps=heart.getPart(id);
      h+=`<div class="prow${id===top?' on':''}${ps.vis?'':' off'}" data-pid="${id}"><button class="eye" type="button" data-peye aria-pressed="${ps.vis}" title="${ps.vis?'Gizle':'Göster'}" aria-label="${esc(pname(id))}: ${ps.vis?'gizle':'göster'}">${ps.vis?'●':'○'}</button><button class="nm" type="button" data-pname title="${esc(pname(id))}">${esc(pname(id))}</button><input type="range" min="0.1" max="1" step="0.05" value="${ps.op}" data-pop aria-label="${esc(pname(id))} saydamlığı" ${ps.vis?'':'disabled'}></div>`;
    }
  }
  h+=`<button class="rs" type="button" data-preset>Tümünü göster</button>`;
  const st=partsEl.scrollTop; partsEl.innerHTML=h; partsEl.scrollTop=st;
}
function setPartsOpen(b){
  partsOpen=b; partsEl.hidden=!b; document.body.classList.toggle('parts-open',b); btnParts.setAttribute('aria-pressed',b);
  heart&&heart.setFocus(b?focusMode:'none');
  renderParts(); insets();
}
btnParts.addEventListener('click',()=>setPartsOpen(!partsOpen));
partsEl.addEventListener('click',e=>{
  if(e.target.closest('[data-pclose]')){ setPartsOpen(false); return; }
  const fm=e.target.closest('[data-fmode]'); if(fm){ focusMode=fm.dataset.fmode; heart&&heart.setFocus(focusMode); renderParts(); return; }
  if(e.target.closest('[data-preset]')){ othersOp=1; heart&&heart.resetParts(); renderParts(); return; }
  const row=e.target.closest('[data-pid]'); if(!row||!heart) return; const id=row.dataset.pid;
  if(e.target.closest('[data-peye]')){ heart.setPart(id,{vis:!heart.getPart(id).vis}); renderParts(); return; }
  if(e.target.closest('[data-pname]')){ const top=selected&&heart.topOf(selected); if(top===id){ select(null); } else { if(mode==='anatomi') openCard(); select(id); } }
});
partsEl.addEventListener('input',e=>{
  if(!heart) return;
  if(e.target.id==='othOp'){ othersOp=+e.target.value; heart.setOthers(othersOp); return; }
  const row=e.target.closest('[data-pid]'); if(row&&e.target.matches('[data-pop]')) heart.setPart(row.dataset.pid,{op:+e.target.value});
});
const monitor=$('monitor');
function setCond(k){
  const changed=k!==condKey; condKey=k;
  const fx=COND[k].fx||{}, outside=!!(fx.infarct||fx.sac||fx.rvDilate||fx.clot||fx.dead);
  void outside;
  sim.setCondition(k); heart&&heart.setMode('durumlar',COND[k],k); heart&&heart.setXray(xray.checked);
  if(heart){ if(fx.infarct==='rca') heart.viewFrom('inferior'); else if(lastView) heart.resetView(); lastView=fx.infarct==='rca'; }
  $('lead').textContent=COND[k].lead||'DII'; $('monName').textContent=COND[k].n;
  // EKG üstten iner; senaryo değişince tarama ışığıyla yenilenir
  if(!monitor.classList.contains('show')){ requestAnimationFrame(()=>{monitor.classList.add('show'); setTimeout(()=>{sizeCanvas(); insets();},650);}); }
  else if(changed){ monitor.classList.remove('swap'); void monitor.offsetWidth; monitor.classList.add('swap'); }
  if(history.replaceState) history.replaceState(null,'','#durumlar/'+k);
  render(); renderNav();
}
const btnPlay=$('btnPlay');
btnPlay.addEventListener('click',()=>{sim.playing=!sim.playing; btnPlay.textContent=sim.playing?'Duraklat':'Oynat';});
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{sim.speed=+b.dataset.speed; document.querySelectorAll('[data-speed]').forEach(x=>x.setAttribute('aria-pressed',x===b));}));

function setMode(m){
  const prev=mode; mode=m; document.body.classList.remove('qtext'); document.body.dataset.mode=m;
  ['anatomi','durumlar','ogren','sina'].forEach(k=>{const a=$('tab-'+k); if(k===m)a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');});
  const live=m==='durumlar', learnM=m==='ogren';
  document.body.classList.toggle('live',live||learnM);
  heart&&heart.setLearn(learnM,E12.LEADS);
  if(!learnM) e12.classList.remove('show');
  if(learnM){
    monitor.classList.remove('show','swap'); if(lastView&&heart){heart.resetView(); lastView=false;}
    selected=null; if(prev!=='ogren'||!sim.vent.length){ sim.setCondition('nsr'); xray.checked=true; } applyLearn3D();
    requestAnimationFrame(()=>{e12.classList.add('show'); setTimeout(()=>{size12(); insets();},650);});
    setLesson(lesson);
  } else if(m==='sina'){
    e12.classList.remove('show'); if(lastView&&heart){heart.resetView(); lastView=false;}
    selected=null; if(!quiz.cur) newQ(); else { applyQ3D(); render(); renderNav(); }
  } else if(live){
    if(selected&&!['ileti','sinir'].includes(S[selected].k)) selected=null;
    if(reduce&&sim.playing){sim.playing=false; btnPlay.textContent='Oynat';}
    if(prev!=='durumlar') xray.checked=false; // senaryolar kalbin dışıyla açılır
    setCond(condKey);
  } else {
    monitor.classList.remove('show','swap');
    if(lastView&&heart){heart.resetView(); lastView=false;}
    heart&&heart.setMode('anatomi');
    render(); renderNav();
  }
  heart&&heart.select(selected); insets();
}
function fromHash(){
  const h=location.hash.replace('#','').split('/');
  if(h[0]==='durumlar'){ if(h[1]&&COND[h[1]]) condKey=h[1]; setMode('durumlar'); }
  else if(h[0]==='sina'){ if(h[1]&&['karisik','ecg','bul','bilgi'].includes(h[1])&&h[1]!==quiz.type){quiz.type=h[1]; quiz.cur=null;} setMode('sina'); }
  else if(h[0]==='ogren'){ if(h[1]&&(h[1]==='sss'||LESSONS.some(l=>l.id===h[1]))) lesson=h[1]; setMode('ogren'); }
  else setMode('anatomi');
}
window.addEventListener('hashchange',fromHash);


/* ---------- Sına: EKG'den tanı, kalpte bul ve tıkla, EKG bilgisi ---------- */
const QT={karisik:'Karışık',ecg:'EKG’den tanı koy',bul:'Kalpte bul ve tıkla',bilgi:'EKG bilgisi'};
const QDESC={karisik:'Üç türden rastgele sorular',ecg:'Kayan EKG’ye bakıp durumu seç',bul:'Adı verilen yapıyı 3D kalpte tıkla',bilgi:MCQ.length+' çoktan seçmeli soru'};
const quiz={type:'karisik',cur:null,score:{},streak:0,best:0,recent:[]};
try{ const sv=JSON.parse(localStorage.getItem('kalp.sina')||'null'); if(sv){quiz.score=sv.score||{}; quiz.best=sv.best||0;} }catch(e){}
function saveScore(){ try{ localStorage.setItem('kalp.sina',JSON.stringify({score:quiz.score,best:quiz.best})); }catch(e){} }
const shuffle=a=>{a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;};
const INNER={ias:1,ivs:1,pap:1,mod:1};
function needsXray(id){ let k=id; while(k){ if(INNER[k]) return true; k=S[k]&&S[k].p; } const kd=S[id]&&S[id].k; return kd==='ileti'||kd==='sinir'||kd==='kapak'; }
function fresh(list,key){ const f=list.filter(x=>!quiz.recent.includes(key+':'+x)); return f.length?f:list; }
function newQ(){
  let t=quiz.type;
  if(t==='karisik') t=shuffle(heart&&heart.ready?['ecg','bul','bilgi']:['ecg','bilgi'])[0];
  if(t==='bul'&&!(heart&&heart.ready)) t='bilgi';
  let q;
  if(t==='ecg'){
    const key=shuffle(fresh(ECG_POOL,'ecg'))[0], cat=COND[key].cat;
    const same=shuffle(ECG_POOL.filter(k=>k!==key&&COND[k].cat===cat)), other=shuffle(ECG_POOL.filter(k=>k!==key&&COND[k].cat!==cat));
    const opts=shuffle([key,...same.slice(0,2),...other].slice(0,4));
    q={t,key,opts,ans:opts.indexOf(key),id:'ecg:'+key};
  } else if(t==='bul'){
    const ids=heart.pickIds().filter(id=>S[id]);
    const target=shuffle(fresh(ids,'bul'))[0];
    q={t,target,tries:0,clicks:[],id:'bul:'+target};
  } else {
    const i=shuffle(fresh(MCQ.map((_,i)=>i),'bilgi'))[0], m=MCQ[i];
    const opts=shuffle([m.a,...m.w]); q={t,i,opts,ans:opts.indexOf(m.a),id:'bilgi:'+i};
  }
  quiz.recent.push(q.id); if(quiz.recent.length>8) quiz.recent.shift();
  quiz.cur=q; selected=null; heart&&heart.select(null); if(quiz.moved&&heart){ heart.resetView(); quiz.moved=false; }
  applyQ3D(); render(); renderNav(); card.scrollTop=0;
}
function applyQ3D(){
  const q=quiz.cur; if(!q) return;
  document.body.classList.toggle('qtext',q.t==='bilgi');
  if(q.t==='ecg'){
    sim.setCondition(q.key); $('monName').textContent=q.done?COND[q.key].n:'Bu ritim ne?'; $('lead').textContent=COND[q.key].lead||'DII'; $('hrv').textContent='--';
    if(!monitor.classList.contains('show')) requestAnimationFrame(()=>{monitor.classList.add('show'); setTimeout(()=>{sizeCanvas(); insets();},650);});
    else { monitor.classList.remove('swap'); void monitor.offsetWidth; monitor.classList.add('swap'); }
  } else monitor.classList.remove('show','swap');
  if(!heart||!heart.ready){ insets(); return; }
  if(q.t==='ecg'&&q.done){ const fx=COND[q.key].fx||{}; heart.setMode('durumlar',COND[q.key],q.key); heart.setXray(!(fx.infarct||fx.sac||fx.rvDilate||fx.clot||fx.dead)); }
  else { heart.setMode('anatomi'); heart.setXray(q.t==='bul'?needsXray(q.target):xray.checked); if(q.t==='bul') xray.checked=needsXray(q.target); }
  heart.select(q.t==='bul'&&q.done?q.target:null); if(q.t==='bul'&&q.done&&!q.ok){ heart.reveal(q.target); quiz.moved=true; } insets();
}
function quizHidesNames(){ return mode==='sina'&&quiz.cur&&quiz.cur.t==='bul'&&!quiz.cur.done; }
function addScore(t,ok){ const s=quiz.score[t]||(quiz.score[t]=[0,0]); s[1]++; if(ok){s[0]++; quiz.streak++; quiz.best=Math.max(quiz.best,quiz.streak);} else quiz.streak=0; saveScore(); }
function quizAnswer(k){
  const q=quiz.cur; if(!q||q.done||q.t==='bul') return;
  q.done=true; q.picked=k; q.ok=k===q.ans; addScore(q.t,q.ok);
  if(q.t==='ecg'){ $('monName').textContent=COND[q.key].n; applyQ3D(); }
  render(); renderNav();
}
function isPart(id,target){ while(id){ if(id===target) return true; id=S[id]&&S[id].p; } return false; }
function quizPick(id){
  const q=quiz.cur; if(!q||q.t!=='bul'||q.done) return false;
  if(!id) return true;
  if(isPart(id,q.target)){ q.done=true; q.ok=true; addScore('bul',true); }
  else { q.tries++; q.clicks.push(id); if(q.tries>=3){ q.done=true; q.ok=false; addScore('bul',false); } }
  if(q.done) applyQ3D();
  openCard(); render(); renderNav(); return true;
}
function quizReveal(){ const q=quiz.cur; if(!q||q.done||q.t!=='bul') return; q.done=true; q.ok=false; addScore('bul',false); applyQ3D(); render(); renderNav(); }
function setQType(t){ quiz.type=t; if(history.replaceState) history.replaceState(null,'','#sina/'+t); newQ(); openCard(); if(narrow()) card.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'}); }
function scoreTxt(t){ const s=quiz.score[t]; return s&&s[1]?`${s[0]}/${s[1]}`:''; }
function navQuiz(){
  const tot=Object.values(quiz.score).reduce((a,s)=>[a[0]+s[0],a[1]+s[1]],[0,0]);
  return `<div class="grp-h">Soru türü</div>`+Object.keys(QT).map(k=>`<button class="item qitem" type="button" data-qtype="${k}" aria-current="${k===quiz.type}"><span>${esc(QT[k])}<em>${esc(QDESC[k])}</em></span>${k!=='karisik'&&scoreTxt(k)?`<small>${scoreTxt(k)}</small>`:''}</button>`).join('')+
    `<div class="grp-h">Skor</div><div class="qstats"><div><b>${tot[1]?Math.round(100*tot[0]/tot[1]):0}%</b><span>doğru (${tot[0]}/${tot[1]})</span></div><div><b>${quiz.streak}</b><span>seri</span></div><div><b>${quiz.best}</b><span>en iyi seri</span></div></div>
    ${tot[1]?`<button class="item" type="button" data-qreset style="color:var(--muted)">Skoru sıfırla</button>`:''}`;
}
function optsHTML(q,label){
  return `<div class="qopts">${q.opts.map((o,i)=>{const cls=!q.done?'':i===q.ans?' ok':i===q.picked?' no':' dim';
    return `<button type="button" class="qopt${cls}" data-qa="${i}" ${q.done?'disabled':''}><kbd>${i+1}</kbd><span>${esc(label(o))}</span></button>`;}).join('')}</div>`;
}
function verdict(q){ return `<div class="qres ${q.ok?'ok':'no'}">${q.ok?'Doğru':'Yanlış'}${q.ok&&quiz.streak>1?` · ${quiz.streak} soru üst üste`:''}</div>`; }
const nextBtn=`<button class="btn qnext" type="button" data-qnext>Sonraki soru <kbd>Enter</kbd></button>`;
function quizHTML(){
  const q=quiz.cur; if(!q) return `${closeBtn}<p>Soru hazırlanıyor…</p>`;
  const head=`${closeBtn}<div><div class="eyebrow">Sına · ${esc(QT[q.t])}</div>`;
  if(q.t==='ecg'){
    const c=COND[q.key];
    let h=`${head}<h2>Bu EKG hangi duruma ait?</h2></div><p>Üstteki kayan şeride bak: hız, düzen, P dalgaları, PR, QRS genişliği ve ST–T. Derivasyon: <b>${esc(c.lead||'DII')}</b>.</p>${optsHTML(q,k=>COND[k].n)}`;
    if(q.done){
      const read=c.read?`<dl class="read">${Object.entries(c.read).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:'';
      h+=`${verdict(q)}<div><div class="eyebrow" style="margin-bottom:6px">${esc(c.n)}: EKG’de ne görülür?</div>${read}<ul class="key">${c.ecg.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <p class="qlink"><a href="#durumlar/${q.key}">Bu durumu Durumlar’da ayrıntılı aç →</a></p>${nextBtn}`;
    }
    return h;
  }
  if(q.t==='bul'){
    const s=S[q.target], par=s.p&&S[s.p];
    let h=`${head}<h2>${esc(s.n)}</h2><div class="latin">${esc(s.l||'')}</div></div>
      <p>Bu yapıyı 3D kalpte bul ve üzerine tıkla. Kalbi sürükleyerek çevirebilirsin.${needsXray(q.target)?' İçeride olduğu için <b>İçini göster</b> açıldı.':''}${par?` İpucu: ${esc(par.n)} içinde bir bölüm.`:''}</p>`;
    if(q.clicks.length&&!q.done) h+=`<div class="qres no">Tıkladığın: ${esc(S[q.clicks[q.clicks.length-1]]?S[q.clicks[q.clicks.length-1]].n:'?')}. Bu değil, ${3-q.tries} hakkın kaldı.</div>`;
    if(!q.done) h+=`<button class="btn qgive" type="button" data-qgive>Göster</button>`;
    else h+=`${verdict(q)}${!q.ok?'<p>Doğru yer kalpte turuncu ile işaretlendi ve kalp o tarafa çevrildi.</p>':''}<p>${esc(s.d)}</p>${s.c?`<dl class="facts"><div><dt>Klinik önemi</dt><dd>${esc(s.c)}</dd></div></dl>`:''}${nextBtn}`;
    return h;
  }
  const m=MCQ[q.i];
  let h=`${head}<h2 class="qq">${esc(m.q)}</h2></div>${optsHTML(q,o=>o)}`;
  if(q.done) h+=`${verdict(q)}<p>${esc(m.e)}</p>${m.l?`<p class="qlink"><a href="#ogren/${m.l}">İlgili dersi aç →</a></p>`:''}${nextBtn}`;
  return h;
}
document.addEventListener('keydown',e=>{
  if(mode!=='sina'||!quiz.cur||e.target.closest('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey) return;
  const q=quiz.cur;
  if(/^[1-4]$/.test(e.key)&&q.t!=='bul'&&!q.done&&+e.key<=q.opts.length){ quizAnswer(+e.key-1); e.preventDefault(); }
  else if(e.key==='Enter'&&q.done&&!e.target.closest('button,a')){ newQ(); e.preventDefault(); }
});

/* Hakkında */
$('srcList').innerHTML=(SOURCES||[]).map(([t,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
$('btnAbout').addEventListener('click',()=>{const d=$('about'); d.showModal?d.showModal():d.setAttribute('open','');});

/* ---------- EKG ---------- */
const cv=$('ecg'), ctx=cv.getContext('2d');
const css=getComputedStyle(document.documentElement), cssv=n=>css.getPropertyValue(n).trim();
const ECG=cssv('--ecg'), GRID=cssv('--grid'), GRID2=cssv('--grid-strong'), MUTED=cssv('--muted');
function sizeCanvas(){const r=cv.getBoundingClientRect(), d=Math.min(2,window.devicePixelRatio||1); if(!r.width||!r.height)return; cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d); ctx.setTransform(d,0,0,d,0,0);}
function drawECG(){
  const W=cv.clientWidth, H=cv.clientHeight; if(!W) return;
  const win=Math.max(W<560?3:5,W/(1.1*H)), pps=W/win, ppmv=pps*0.4, base=H*0.6, t0=sim.t-win;
  ctx.fillStyle='#050b0a'; ctx.fillRect(0,0,W,H); ctx.lineWidth=1;
  for(let k=Math.ceil(t0/0.04);k*0.04<=sim.t;k++){const x=(k*0.04-t0)*pps; ctx.strokeStyle=k%5===0?GRID2:GRID; ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,H); ctx.stroke();}
  const step=ppmv*0.1;
  for(let k=-Math.floor(base/step);k*step<=H-base;k++){const y=base+k*step; ctx.strokeStyle=k%5===0?GRID2:GRID; ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(W,y+0.5); ctx.stroke();}
  ctx.strokeStyle=ECG; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.shadowColor=ECG; ctx.shadowBlur=6; ctx.beginPath();
  strokeCols(ctx,traceCols(t0,pps,Math.ceil(W)),t=>sim.ecgAt(t),v=>base-v*ppmv,0);
  ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle=ECG; ctx.beginPath(); ctx.arc(W-2,base-sim.ecgAt(sim.t)*ppmv,3,0,7); ctx.fill();
  const qz=mode==='sina', c=COND[qz?quiz.cur.key:condKey], r=c.r, X=t=>(t-t0)*pps;
  if(qz&&!quiz.cur.done) return; // soruda ipucu yazıları gizli
  ctx.font='11px "IBM Plex Mono", monospace'; ctx.fillStyle=MUTED; ctx.textAlign='center';
  const lab=(txt,x,y)=>{if(x>14&&x<W-14) ctx.fillText(txt,x,y);};
  const done=sim.vent.filter(e=>e.t+0.6<sim.t&&e.t>t0+0.1), e=done[done.length-1];
  if(e&&r.vent!=='torsades'){
    const M=sim.MORPH[e.morph]||sim.MORPH.narrow, wide=M.J>0.1;
    let pk=0,pv=0; for(let d=0;d<M.J;d+=0.004){const v=sim.ecgAt(e.t+d); if(Math.abs(v)>Math.abs(pv)){pv=v;pk=d;}}
    lab(wide?'QRS (geniş)':'QRS',X(e.t+pk),pv>0?base-pv*ppmv-6:base-pv*ppmv+14);
    const tc=e.t+sim.qt(e.rr)+(M.qt||0)+M.T[0]; const tv=sim.ecgAt(tc);
    lab('T',X(tc),tv>=0?base-tv*ppmv-6:base-tv*ppmv+14);
  }
  if(r.atrial==='sinus'&&(r.pAmp==null||r.pAmp>0.06)) sim.atrial.filter(a=>a.type==='sinus'&&a.t>t0&&a.t+0.12<sim.t).forEach(a=>{const v=sim.ecgAt(a.t+0.05); lab('P',X(a.t+0.05),base-Math.max(v,0.05)*ppmv-6);});
  const mid=(txt)=>lab(txt,W*0.5,H-10);
  if(r.atrial==='af') mid('f dalgaları: düzensiz taban çizgisi');
  if(r.atrial==='flutter') mid('F dalgaları (testere dişi)');
  if(r.vent==='vf') mid('Kaotik dalgalanma, QRS yok');
  if(r.vent==='none') mid('Düz çizgi');
  if(r.vent==='torsades') mid('Genliği dönerek değişen geniş QRS’ler');
}


/* ---------- Döngü ---------- */
let last=0, hrTick=0;
const RED=[255,75,85], AF=[255,154,60], OFF=[58,35,40];
const mix=(a,b,k)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*k)).join(',')})`;
function loop(ts){
  requestAnimationFrame(loop);
  const dt=last?Math.min(0.05,(ts-last)/1000):0; last=ts;
  if(mode==='durumlar'){
    sim.step(dt);
    if(cv.width<10) sizeCanvas();
    drawECG();
    const m=sim.mechanics();
    if(bA) bA.style.background = m.af?mix(OFF,AF,m.fib):mix(OFF,RED,m.ca);
    if(bV) bV.style.background = mix(OFF,RED,m.vf&&COND[condKey].r.vent==='vf'?0.3+0.3*Math.random():m.cv);
    if(ts-hrTick>500){hrTick=ts; const hr=sim.heartRate(), v=COND[condKey].r.vent; $('hrv').textContent= v==='vf'?'—':hr==null?'--':hr;}
  }
  if(mode==='sina'&&quiz.cur&&quiz.cur.t==='ecg'){
    sim.step(dt); if(cv.width<10) sizeCanvas(); drawECG();
    if(ts-hrTick>500){hrTick=ts; const hr=sim.heartRate(), v=COND[quiz.cur.key].r.vent; $('hrv').textContent= v==='vf'?'—':hr==null?'--':hr;}
  }
  if(mode==='ogren'){
    sim.step(dt); if(c12.width<10) size12(); draw12();
    heart&&heart.setVector(vecAt(sim.t));
  }
  heart&&heart.frame(mode==='durumlar'||mode==='ogren'||(mode==='sina'&&quiz.cur&&quiz.cur.t==='ecg'&&quiz.cur.done)?sim:null);
  drawLabels();
}
window.__kalp={sim,get heart(){return heart;}};
fromHash();
requestAnimationFrame(loop);
})();
