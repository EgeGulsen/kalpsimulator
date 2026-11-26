/* Kalp Simülatörü: arayüz, mod geçişi, etiketler ve EKG çizimi. */
(function(){
'use strict';
const {KIND,S,GROUPS,COND,CATS,SOURCES,LESSONS,FAQ,MCQ,ECG_POOL,CASES,LEVELS}=window.KALP;
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
    onReady:()=>{loading.hidden=true; if(partsOpen){heart.setFocus(focusMode); renderParts();} heart.setTorso(torsoWanted()); if(mode==='ogren'){applyLearn3D();} else if(mode==='sina'){applyQ3D();} else if(mode==='vaka'){applyV3D();} else heart.setMode(mode,mode==='durumlar'?COND[condKey]:null,condKey); heart.setXray(xray.checked); heart.select(selected); insets(); if(mode==='durumlar'&&(COND[condKey].fx||{}).infarct==='rca'){heart.viewFrom('inferior'); lastView=true;}},
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
  const top=mode==='durumlar'||(mode==='vaka'&&monitor.classList.contains('show'))?$('monitor').getBoundingClientRect().bottom-40:mode==='ogren'?$('ecg12').getBoundingClientRect().bottom-40:60;
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
  return `<button class="navtog" type="button" data-navtog aria-expanded="${navOpen}"><span><small>Senaryo seç · ${Object.keys(COND).length} durum</small>${esc(c.n)}</span><i aria-hidden="true">▾</i></button><div class="navbody">`+CATS.map(([k,nm])=>`<div class="grp-h">${esc(nm)}</div>`+Object.entries(COND).filter(([,c])=>c.cat===k).map(([key,c])=>`<button class="item cond" type="button" data-cond="${key}" aria-current="${key===condKey}">${esc(c.n)}${CASES.some(x=>x.cond===key)?'<span class="vtag" title="Bu durum için hasta vakası var">Vaka</span>':''}</button>`).join('')).join('')+`</div>`;
}
function renderNav(){
  const ae=document.activeElement&&document.activeElement.id==='search', pos=ae?$('search').selectionStart:0;
  nav.innerHTML= mode==='anatomi'?navAnatomy():mode==='ogren'?navLearn():mode==='sina'?navQuiz():mode==='vaka'?navVaka():navConds();
  if(ae){const s=$('search'); s.focus(); s.setSelectionRange(pos,pos);}
}
nav.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value; renderNav();}});
nav.addEventListener('click',e=>{
  if(e.target.closest('[data-navtog]')){ navOpen=!navOpen; nav.classList.toggle('open',navOpen); renderNav(); return; }
  const vl=e.target.closest('[data-vlv]'); if(vl){ setVLevel(+vl.dataset.vlv); return; }
  const vc=e.target.closest('[data-vcase]'); if(vc){ openCard(); startCase(vc.dataset.vcase); return; }
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
  if(!selected) return `${closeBtn}<div><div class="eyebrow">Anatomi</div><h2>Kalp anatomisi</h2></div>
    <p>Model, gerçek bir insan kalbinin BodyParts3D taramasından üretildi. Odacıklar, kapaklar, koroner arter dalları, kardiyak venler, ileti sistemi ve otonom sinirler ayrı ayrı seçilebilir. Her yapının Latince adı, kanlanması ve klinik önemi burada açılır.</p>
    <p>Sürükleyerek çevir, kaydırarak yakınlaştır, bir yapıya tıklayarak seç. <b>İçini göster</b> miyokardı saydamlaştırıp ileti sistemini ortaya çıkarır; <b>Parçalar</b> tek tek gizleme ve izole etme sağlar.</p>
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
    if(id==='ap') return fx.ap?['on','Bu durumda çalışıyor']:['off','Normal kalpte bulunmaz (yalnız preeksitasyonda)'];
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
  if(fx.infarct) leg.push(`<span><i class="sw" style="background:#86607a"></i>İskemik miyokard</span>`);
  if(fx.scar) leg.push(`<span><i class="sw" style="background:#6a5b54"></i>Skar (eski infarkt)</span>`);
  if(fx.block||fx.blockFlash) leg.push(`<span><i class="sw" style="background:var(--block)"></i>Blok</span>`);
  const read=c.read?`<dl class="read">${Object.entries(c.read).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:'';
  const cs=CASES.find(x=>x.cond===condKey);
  const go=cs?`<button class="vgo" type="button" data-gocase="${cs.id}"><span><small>Vaka</small><b>Bu durumu bir hasta üzerinde yönet</b></span><i aria-hidden="true">→</i></button>`:'';
  return `${closeBtn}<div><div class="eyebrow">${esc(c.tag)}</div><h2>${esc(c.n)}</h2></div>
    ${go}
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
  card.innerHTML = mode==='anatomi'?anatomyHTML():mode==='ogren'?learnHTML():mode==='sina'?quizHTML():mode==='vaka'?vakaHTML():condHTML();
  bA=$('bA'); bV=$('bV');
  card.classList.toggle('hide',!cardOpen);
  queueMicrotask(()=>renderParts());
}
card.addEventListener('click',e=>{
  if(e.target.id==='cardX'){cardOpen=false; card.classList.add('hide'); insets(); return;}
  const gc=e.target.closest('[data-gocase]'); if(gc){ location.hash='#vaka/'+gc.dataset.gocase; return; }
  if(mode==='vaka'){ const va=e.target.closest('[data-va]'); if(va){ vkAnswer(+va.dataset.va); return; }
    const vl=e.target.closest('[data-vlv]'); if(vl){ setVLevel(+vl.dataset.vlv); return; }
    if(e.target.closest('[data-vstart]')){ startCase(e.target.closest('[data-vstart]').dataset.vstart||null); return; }
    if(e.target.closest('[data-vnext]')){ vkNext(); return; }
    if(e.target.closest('[data-vhint]')){ vkHint(); return; }
    if(e.target.closest('[data-vmenu]')){ vk.id=null; vkStop(); applyV3D(); render(); renderNav(); return; } }
  if(mode==='sina'){ const qa=e.target.closest('[data-qa]'); if(qa){ quizAnswer(+qa.dataset.qa); return; }
    if(e.target.closest('[data-qnext]')){ newQ(); return; }
    if(e.target.closest('[data-qgive]')){ quizReveal(); return; } }
  const lk=e.target.closest('[data-lead]'); if(lk){ setLead(lk.dataset.lead); return; }
  const ls=e.target.closest('[data-lesson]'); if(ls){ setLesson(ls.dataset.lesson); card.scrollTop=0; return; }
  const b=e.target.closest('[data-id]'); if(b) select(b.dataset.id);
});
card.addEventListener('input',e=>{ if(e.target.id==='faqq'){ faqQ=e.target.value; const q=faqQ.trim().toLocaleLowerCase('tr'); card.querySelectorAll('.faq details').forEach(d=>{d.hidden=!!q&&!d.textContent.toLocaleLowerCase('tr').includes(q);}); card.querySelectorAll('.faqg').forEach(g=>{g.hidden=!g.querySelector('details:not([hidden])');}); } });
function openCard(){ if(!cardOpen){cardOpen=true; card.classList.remove('hide'); insets();} }
function select(id){
  if(id&&!S[id]) id=null;
  selected=id; heart&&heart.select(id); render(); renderNav();
  if(id&&narrow()&&mode==='anatomi') card.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});
}


/* ---------- Öğren ---------- */
function navLearn(){
  return `<div class="grp-h">Dersler</div>`+LESSONS.map((l,i)=>`<button class="item" type="button" data-lesson="${l.id}" aria-current="${l.id===lesson}"><small style="margin:0;min-width:18px">${i+1}</small>${esc(l.t)}</button>`).join('')+
    `<div class="grp-h">Soru–cevap</div><button class="item" type="button" data-lesson="sss" aria-current="${lesson==='sss'}"><small style="margin:0;min-width:18px">?</small>Klinik soru–cevap (${FAQ.length})</button>`;
}
function learnHTML(){
  if(lesson==='sss'){ const groups=[...new Set(FAQ.map(f=>f[0]))];
    return `${closeBtn}<div><div class="eyebrow">Soru–cevap · ${FAQ.length} soru</div><h2>Klinik soru–cevap</h2></div>
    <p>Staj ve sınavlarda sık sorulan, kavram ve yönetim odaklı sorular. Değerler güncel ESC, ERC ve AHA kılavuzlarından özetlenmiştir.</p>
    <input class="search" id="faqq" type="search" placeholder="Ara: ör. Sgarbossa, QTc, hiperkalemi" value="${esc(faqQ)}" aria-label="Soru ara">
    <div class="faq">${groups.map(g=>`<div class="faqg"><div class="eyebrow">${esc(g)}</div>${FAQ.filter(f=>f[0]===g).map(([,q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`).join('')}</div>
    <div class="disc">Eğitim amaçlıdır. Doz ve algoritmalar kurum protokollerine ve güncel kılavuzlara göre doğrulanmalıdır.</div>`; }
  const i=LESSONS.findIndex(l=>l.id===lesson), l=LESSONS[i], prev=LESSONS[i-1], next=LESSONS[i+1];
  return `${closeBtn}<div><div class="eyebrow">Ders ${i+1} / ${LESSONS.length}</div><h2>${esc(l.t)}</h2></div>
    <div class="lesson">${l.body}</div>
    <div class="pager">${prev?`<button class="btn" type="button" data-lesson="${prev.id}">← ${esc(prev.t)}</button>`:'<span></span>'}${next?`<button class="btn" type="button" data-lesson="${next.id}">${esc(next.t)} →</button>`:`<button class="btn" type="button" data-lesson="sss">Klinik soru–cevap →</button>`}</div>
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
  x12.fillStyle=PAPER; x12.fillRect(0,0,W,H);
  // EKG kâğıdı ızgarası: 1 mm = 0,04 sn / 0,1 mV, 5 mm = 0,2 sn / 0,5 mV
  x12.lineWidth=1; const mm=0.04*pps, minor=mm>=3;
  for(let c=0;c<4;c++){ const k0=Math.ceil(t0/0.04); for(let k=k0;k*0.04<=t1;k++){ if(!minor&&k%5) continue; const x=Math.round(c*cw+(k*0.04-t0)*pps)+.5; x12.strokeStyle=k%5===0?GRID2:GRID; x12.beginPath(); x12.moveTo(x,0); x12.lineTo(x,H); x12.stroke(); } }
  for(let r=0;r<3;r++){ const base=r*rh+rh*0.6, st=ppmv*0.1; for(let k=-Math.floor(rh*0.6/st);k*st<=rh*0.4;k++){ if(!(st>=3)&&k%5) continue; const y=Math.round(base+k*st)+.5; if(y<r*rh||y>(r+1)*rh) continue; x12.strokeStyle=k%5===0?GRID2:GRID; x12.beginPath(); x12.moveTo(0,y); x12.lineTo(W,y); x12.stroke(); } }
  // vektörleri bir kez hesapla, 12 derivasyona izdüşür
  const cols=traceCols(t0,pps,Math.ceil(cw)), vmap=new Map();
  for(const col of cols) for(const t of col.ts) if(!vmap.has(t)) vmap.set(t,vecAt(t));
  x12.font='600 12px "JetBrains Mono", monospace';
  for(let r=0;r<3;r++) for(let c=0;c<4;c++){
    const id=E12.GRID[r][c], ox=c*cw, base=r*rh+rh*0.6, sel=id===lead;
    if(sel){x12.fillStyle='#b01f2d0d'; x12.fillRect(ox,r*rh,cw,rh); x12.strokeStyle='#b01f2d'; x12.lineWidth=1.5; x12.strokeRect(ox+1,r*rh+1,cw-2,rh-2);}
    x12.save(); x12.beginPath(); x12.rect(ox,r*rh,cw,rh); x12.clip();
    x12.strokeStyle=sel?'#b01f2d':ECG; x12.lineWidth=sel?1.9:1.4; x12.lineJoin='round'; x12.beginPath();
    strokeCols(x12,cols,t=>E12.leadValue(id,vmap.get(t),variant),v=>base-v*ppmv,ox);
    x12.stroke(); x12.restore();
    x12.fillStyle=sel?'#b01f2d':ECG; x12.fillText(id==='I'||id==='II'||id==='III'?'D'+id:id,ox+7,r*rh+16);
    if(c>0){x12.strokeStyle=MUTED; x12.lineWidth=1; x12.beginPath(); x12.moveTo(ox+.5,r*rh); x12.lineTo(ox+.5,(r+1)*rh); x12.stroke();}
  }
  x12.strokeStyle=GRID2; for(let r=1;r<3;r++){x12.beginPath(); x12.moveTo(0,r*rh+.5); x12.lineTo(W,r*rh+.5); x12.stroke();}
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
  ['anatomi','durumlar','ogren','sina','vaka'].forEach(k=>{const a=$('tab-'+k); if(k===m)a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');});
  const live=m==='durumlar', learnM=m==='ogren';
  document.body.classList.toggle('live',live||learnM);
  heart&&heart.setLearn(learnM,E12.LEADS);
  if(!learnM) e12.classList.remove('show');
  if(learnM){
    monitor.classList.remove('show','swap'); if(lastView&&heart){heart.resetView(); lastView=false;}
    selected=null; if(prev!=='ogren'||!sim.vent.length){ sim.setCondition('nsr'); xray.checked=true; } applyLearn3D();
    requestAnimationFrame(()=>{e12.classList.add('show'); setTimeout(()=>{size12(); insets();},650);});
    setLesson(lesson);
  } else if(m==='vaka'){
    e12.classList.remove('show'); if(lastView&&heart){heart.resetView(); lastView=false;}
    selected=null; xray.checked=false; heart&&heart.setXray(false); applyV3D(); render(); renderNav();
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
  if(m!=='vaka') vkStop();
  heart&&heart.ready&&heart.setTorso(torsoWanted());
  heart&&heart.select(selected); insets();
}
function fromHash(){
  const h=location.hash.replace('#','').split('/');
  if(h[0]==='durumlar'){ if(h[1]&&COND[h[1]]) condKey=h[1]; setMode('durumlar'); }
  else if(h[0]==='vaka'){ setMode('vaka'); if(h[1]&&CASES.some(c=>c.id===h[1])&&h[1]!==vk.id) startCase(h[1]); }
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


/* ---------- Gövde (yalnız senaryolarda ve vakalarda) ---------- */
const tTorso=$('t-torso');
function torsoWanted(){ return (mode==='durumlar'||mode==='vaka')&&tTorso.checked; }
tTorso.addEventListener('change',()=>heart&&heart.setTorso(torsoWanted()));
function ecgKey(){ return mode==='sina'&&quiz.cur?quiz.cur.key:mode==='vaka'&&vk.id?vk.cur:condKey; }
function ecgLabels(){
  if(mode==='sina') return quiz.cur&&quiz.cur.done?'all':'none';
  if(mode==='vaka') return !vk.id?'none':vk.dx?'all':vk.lv===1?'basic':'none';
  return 'all';
}

/* ---------- Vaka: hasta, tanı ve tedavi adımları, seviye, ipucu, animasyonlu tedavi ---------- */
const vk={lv:2,id:null,cur:'nsr',steps:[],res:[],si:0,dx:false,busy:false,flags:new Set(),hintLeft:1,fin:false,best:{}};
try{ const sv=JSON.parse(localStorage.getItem('kalp.vaka')||'null'); if(sv){ vk.lv=sv.lv||2; vk.best=sv.best||{}; } }catch(e){}
function vkSave(){ try{ localStorage.setItem('kalp.vaka',JSON.stringify({lv:vk.lv,best:vk.best})); }catch(e){} }
const LVN=l=>(LEVELS.find(x=>x.id===l)||{}).n||'';
const caseOf=id=>CASES.find(c=>c.id===id);
const HINT_COST={1:0,2:2,3:3};
function setVLevel(l){ vk.lv=l; vkSave(); if(vk.id&&!vk.fin) startCase(vk.id); else { render(); renderNav(); } }
function condForCase(){ const c=COND[vk.cur]; if(vk.dx||vk.lv===1||vk.cur!==caseOf(vk.id).cond) return c; return Object.assign({},c,{fx:{}}); }
function applyV3D(){
  if(mode!=='vaka') return;
  if(!vk.id){ monitor.classList.remove('show','swap'); sim.setCondition('nsr'); if(heart&&heart.ready){ heart.setMode('durumlar',COND.nsr,'nsr'); heart.setXray(false); } insets(); return; }
  sim.setCondition(vk.cur); $('lead').textContent=COND[vk.cur].lead||'DII'; $('monName').textContent=vk.dx?COND[vk.cur].n:'Monitör';
  if(!monitor.classList.contains('show')) requestAnimationFrame(()=>{monitor.classList.add('show'); setTimeout(()=>{sizeCanvas(); insets();},650);});
  if(heart&&heart.ready){ heart.setMode('durumlar',condForCase(),vk.cur); heart.setXray(xray.checked); }
  insets();
}
function startCase(id){
  const pool=CASES.filter(c=>c.id!==vk.id); const c=id?caseOf(id):pool[Math.floor(Math.random()*pool.length)]; if(!c) return;
  vkStop(); vk.id=c.id; vk.cur=c.cond; vk.dx=false; vk.si=0; vk.fin=false; vk.busy=false; vk.flags=new Set(); vk.hintLeft=1;
  const nWrong={1:2,2:3,3:99}[vk.lv];
  vk.steps=c.steps.filter(st=>st.lv<=vk.lv).map(st=>{ const ok=st.o.filter(o=>o[1]), wr=st.o.filter(o=>!o[1]).slice(0,nWrong); return Object.assign({},st,{opts:shuffle(ok.concat(wr))}); });
  vk.res=vk.steps.map(()=>({wrong:[],hints:vk.lv===1?1:0,done:false,ok:false,pts:0}));
  if(history.replaceState) history.replaceState(null,'','#vaka/'+c.id);
  selected=null; heart&&heart.select(null);
  if(mode!=='vaka'){ location.hash='#vaka/'+c.id; return; }
  applyV3D(); render(); renderNav(); card.scrollTop=0;
}
function vkStop(){ if(heart&&heart.treating&&heart.treating()) heart.stopTreat(); vk.busy=false; $('txcap')&&($('txcap').hidden=true); }
function stageFlash(){ const f=$('flash'); if(!f) return; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function switchCond(k){ vk.cur=k; sim.setCondition(k); $('monName').textContent=COND[k].n; $('lead').textContent=COND[k].lead||'DII'; if(heart&&heart.ready) heart.setMode('durumlar',COND[k],k); monitor.classList.remove('swap'); void monitor.offsetWidth; monitor.classList.add('swap'); }
function vkFinishStep(st,r){
  r.done=true; (st.flags||[]).forEach(f=>vk.flags.add(f));
  if(st.dx&&!vk.dx){ vk.dx=true; $('monName').textContent=COND[vk.cur].n; if(heart&&heart.ready) heart.setMode('durumlar',COND[vk.cur],vk.cur); }
  if(st.anim&&heart&&heart.ready){
    vk.busy=true; const cap=$('txcap'); cap.textContent=st.anim.t; cap.hidden=false;
    const fx=COND[caseOf(vk.id).cond].fx||{};
    heart.treat(st.anim.k,{c:st.anim.c,vessel:fx.infarct==='rca'?'rca':'lad',onFlash:stageFlash,onFire:()=>{ if(st.next) switchCond(st.next); },onDone:()=>{ vk.busy=false; cap.hidden=true; render(); }});
  } else if(st.next) switchCond(st.next);
}
function vkAnswer(i){
  const st=vk.steps[vk.si], r=vk.res[vk.si]; if(!st||r.done||vk.busy||r.wrong.includes(i)) return;
  const ok=!!st.opts[i][1];
  if(ok){ r.ok=r.wrong.length===0||vk.lv<3; r.picked=i; r.pts=Math.max(0,10-4*r.wrong.length-HINT_COST[vk.lv]*(vk.lv===1?0:r.hints)); vkFinishStep(st,r); }
  else { r.wrong.push(i); if(vk.lv===3||r.wrong.length>=(vk.lv===1?st.opts.length-1:2)){ r.ok=false; r.pts=0; r.picked=i; vkFinishStep(st,r); } }
  render(); renderNav();
}
function vkHint(){
  const st=vk.steps[vk.si], r=vk.res[vk.si]; if(!st||r.done||r.hints>=(st.h||[]).length) return;
  if(vk.lv===3){ if(vk.hintLeft<=0) return; vk.hintLeft--; }
  r.hints++; render();
}
function vkNext(){
  if(vk.busy) return;
  if(vk.si<vk.steps.length-1){ vk.si++; render(); card.scrollTop=0; return; }
  vk.fin=true; const tot=vk.res.reduce((a,r)=>a+r.pts,0), pct=Math.round(100*tot/(10*vk.steps.length));
  const b=vk.best[vk.id]||{}; if(!(b[vk.lv]>=pct)){ b[vk.lv]=pct; vk.best[vk.id]=b; vkSave(); }
  vk.pct=pct; render(); renderNav(); card.scrollTop=0;
}
function navVaka(){
  return `<div class="grp-h">Seviye</div><div class="vlv" role="group" aria-label="Detay seviyesi">${LEVELS.map(l=>`<button type="button" data-vlv="${l.id}" aria-pressed="${vk.lv===l.id}">${esc(l.n)}</button>`).join('')}</div>
    <p class="vlvd">${esc((LEVELS.find(l=>l.id===vk.lv)||{}).d||'')}</p>
    <div class="grp-h">Vakalar<span>${CASES.length}</span></div>`+
    CASES.map((c,i)=>{ const b=vk.best[c.id]&&vk.best[c.id][vk.lv]; return `<button class="item qitem" type="button" data-vcase="${c.id}" aria-current="${c.id===vk.id}"><span>Vaka ${i+1}<em>${esc(c.brief)}</em></span>${b!=null?`<small>%${b}</small>`:''}</button>`; }).join('');
}
function chip(it){ const [t,id]=it, hit=id&&vk.flags.has(id); return `<span class="pchip${hit?' hit':''}">${esc(t)}</span>`; }
function patientHTML(c){
  const p=c.p, bmi=p.kilo&&p.boy?(p.kilo/Math.pow(p.boy/100,2)).toFixed(1):null;
  const dl=o=>`<dl class="read">${Object.entries(o).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  return `<details class="pcard" ${vk.si===0||vk.fin?'open':''}><summary><span class="pid">${p.yas} yaş · ${esc(p.cins)} · ${p.kilo} kg${bmi?` · VKİ ${bmi}`:''}</span><span class="eyebrow">Hasta</span></summary>
    <p class="psk">${esc(c.sikayet)}</p>
    <div class="prow2"><b>Kronik</b><div>${p.kronik.map(chip).join('')}</div></div>
    <div class="prow2"><b>İlaçlar</b><div>${p.ilac.map(chip).join('')}</div></div>
    <div class="prow2"><b>Alerji</b><div>${p.alerji.map(chip).join('')}</div></div>
    <div class="eyebrow pk">Vital bulgular</div>${dl(c.vital)}
    ${c.lab?`<div class="eyebrow pk">Laboratuvar</div>${dl(c.lab)}`:''}
  </details>`;
}
function vakaHTML(){
  if(!vk.id){
    return `${closeBtn}<div><div class="eyebrow">Vaka simülatörü</div><h2>Hastayı sen yönet</h2></div>
      <p>Her vakada bir hasta gelir: yaşı, kilosu, kronik hastalıkları, ilaçları ve alerjileriyle. Monitördeki EKG’den tanıyı koyar, sonra ne yapılacağına karar verirsin. Doğru tedavi seçildiğinde gövdenin içindeki kalpte canlandırılır: şok, kateterle damarın açılması, damardan ilaç…</p>
      <p>Hasta özellikleri önemli: bazı ilaçlar ve hastalıklar kararını değiştirir. Kararından sonra ilgili satır hasta kartında turuncu yanar.</p>
      <div class="eyebrow">Önce seviyeni seç</div>
      <div class="vlvc">${LEVELS.map(l=>`<button type="button" class="vlvb" data-vlv="${l.id}" aria-pressed="${vk.lv===l.id}"><b>${esc(l.n)}</b><span>${esc(l.d)}</span></button>`).join('')}</div>
      <button class="btn qnext" type="button" data-vstart="">Rastgele vaka başlat</button>
      <div class="disc">Eğitim amaçlıdır, tıbbi tavsiye değildir. Doz ve protokoller kurumlara ve güncel kılavuzlara göre değişir.</div>`;
  }
  const c=caseOf(vk.id), n=vk.steps.length;
  if(vk.fin){
    const rows=vk.steps.map((st,i)=>{const r=vk.res[i]; return `<li class="${r.ok?'ok':'no'}"><b>${r.ok?'✓':'✗'} ${r.pts}/10</b> ${esc(st.q)}</li>`;}).join('');
    return `${closeBtn}<div><div class="eyebrow">Vaka bitti · ${esc(LVN(vk.lv))}</div><h2>${esc(c.title)}</h2></div>
      <div class="vscore"><b>%${vk.pct}</b><span>${vk.pct>=85?'Çok iyi yönettin.':vk.pct>=60?'İyi; kaçırdığın noktalara bak.':'Tekrar denemeye değer.'}</span></div>
      <ul class="vsteps">${rows}</ul>
      <p>${esc(c.ozet)}</p>
      ${patientHTML(c)}
      <p class="qlink"><a href="#durumlar/${c.cond}">${esc(COND[c.cond].n)}: Durumlar’da ayrıntılı aç →</a>${(c.ders||[]).map(d=>{const l=LESSONS.find(x=>x.id===d); return l?`<br><a href="#ogren/${d}">Ders: ${esc(l.t)} →</a>`:'';}).join('')}</p>
      <div class="vbtns"><button class="btn" type="button" data-vstart="${c.id}">Aynı vakayı tekrar</button><button class="btn qnext" type="button" data-vstart="">Başka vaka</button></div>`;
  }
  const st=vk.steps[vk.si], r=vk.res[vk.si];
  const opts=st.opts.map((o,i)=>{ const isW=r.wrong.includes(i), cls=r.done?(o[1]?' ok':isW?' no':' dim'):isW?' no':'';
    const why=(r.done&&(o[1]||isW))||isW?`<em class="why">${esc(o[2])}</em>`:'';
    return `<button type="button" class="qopt vopt${cls}" data-va="${i}" ${r.done||isW?'disabled':''}><kbd>${i+1}</kbd><span>${esc(o[0])}${why}</span></button>`; }).join('');
  const hs=(st.h||[]).slice(0,r.hints), more=(st.h||[]).length>r.hints&&!r.done;
  const hintBtn=!more?'':vk.lv===1?`<button type="button" class="hbtn" data-vhint>Bir ipucu daha</button>`:vk.lv===2?`<button type="button" class="hbtn" data-vhint>İpucu al (−2 puan)</button>`:vk.hintLeft>0?`<button type="button" class="hbtn" data-vhint>İpucu al (tek hakkın, −3 puan)</button>`:`<span class="hnone">İpucu hakkın bitti</span>`;
  const hint=(hs.length||hintBtn)?`<div class="hintbox"><div class="eyebrow">İpucu</div>${hs.map(h=>`<p>${esc(h)}</p>`).join('')}${hintBtn}</div>`:'';
  const prev=vk.res.slice(0,vk.si).map((x,i)=>`<li class="${x.ok?'ok':'no'}">${x.ok?'✓':'✗'} ${esc(vk.steps[i].q)}</li>`).join('');
  const nextB=r.done?`<button class="btn qnext" type="button" data-vnext ${vk.busy?'disabled':''}>${vk.busy?'Tedavi uygulanıyor…':vk.si<n-1?'Sonraki adım':'Vakayı bitir'} ${vk.busy?'':'<kbd>Enter</kbd>'}</button>`:'';
  return `${closeBtn}<div><div class="eyebrow">Vaka · ${esc(LVN(vk.lv))} · Adım ${vk.si+1}/${n}</div><h2 class="qq">${esc(c.brief)}</h2></div>
    <div class="vprog">${vk.steps.map((_,i)=>`<i class="${i<vk.si?(vk.res[i].ok?'ok':'no'):i===vk.si?'cur':''}"></i>`).join('')}</div>
    ${patientHTML(c)}
    ${prev?`<ul class="vprev">${prev}</ul>`:''}
    <div class="vq"><b>${esc(st.q)}</b></div>
    <div class="qopts">${opts}</div>
    ${r.done?`<div class="qres ${r.ok?'ok':'no'}">${r.ok?`Doğru · ${r.pts} puan`:'Doğru cevap yeşil ile işaretli'}</div>`:''}
    ${hint}
    ${nextB}
    <button class="lnk" type="button" data-vmenu>Vaka listesine dön</button>`;
}
document.addEventListener('keydown',e=>{
  if(mode!=='vaka'||!vk.id||vk.fin||e.target.closest('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey) return;
  const st=vk.steps[vk.si], r=vk.res[vk.si]; if(!st) return;
  if(/^[1-9]$/.test(e.key)&&!r.done&&+e.key<=st.opts.length){ vkAnswer(+e.key-1); e.preventDefault(); }
  else if(e.key==='Enter'&&r.done&&!vk.busy&&!e.target.closest('button,a')){ vkNext(); e.preventDefault(); }
});

/* Hakkında */
$('srcList').innerHTML=(SOURCES||[]).map(([t,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
$('btnAbout').addEventListener('click',()=>{const d=$('about'); d.showModal?d.showModal():d.setAttribute('open','');});

/* ---------- EKG ---------- */
const cv=$('ecg'), ctx=cv.getContext('2d');
const css=getComputedStyle(document.documentElement), cssv=n=>css.getPropertyValue(n).trim();
const ECG=cssv('--ecg-ink')||'#17171b', PAPER=cssv('--ecg-paper')||'#fff8f7', GRID=cssv('--ecg-minor')||'#f8dada', GRID2=cssv('--ecg-major')||'#eba9ab', MUTED=cssv('--ecg-label')||'#9a4b50';
function sizeCanvas(){const r=cv.getBoundingClientRect(), d=Math.min(2,window.devicePixelRatio||1); if(!r.width||!r.height)return; cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d); ctx.setTransform(d,0,0,d,0,0);}
function drawECG(){
  const W=cv.clientWidth, H=cv.clientHeight; if(!W) return;
  const win=Math.max(W<560?3:5,W/(1.1*H)), pps=W/win, ppmv=pps*0.4, base=H*0.6, t0=sim.t-win;
  ctx.fillStyle=PAPER; ctx.fillRect(0,0,W,H); ctx.lineWidth=1;
  for(let k=Math.ceil(t0/0.04);k*0.04<=sim.t;k++){const x=(k*0.04-t0)*pps; ctx.strokeStyle=k%5===0?GRID2:GRID; ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,H); ctx.stroke();}
  const step=ppmv*0.1;
  for(let k=-Math.floor(base/step);k*step<=H-base;k++){const y=base+k*step; ctx.strokeStyle=k%5===0?GRID2:GRID; ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(W,y+0.5); ctx.stroke();}
  ctx.strokeStyle=ECG; ctx.lineWidth=1.6; ctx.lineJoin='round'; ctx.beginPath();
  strokeCols(ctx,traceCols(t0,pps,Math.ceil(W)),t=>sim.ecgAt(t),v=>base-v*ppmv,0);
  ctx.stroke();
  ctx.fillStyle='#b01f2d'; ctx.beginPath(); ctx.arc(W-3,base-sim.ecgAt(sim.t)*ppmv,3,0,7); ctx.fill();
  const c=COND[ecgKey()], r=c.r, X=t=>(t-t0)*pps, lb=ecgLabels();
  if(lb==='none') return; // soruda ipucu yazıları gizli
  ctx.font='500 11px "JetBrains Mono", monospace'; ctx.fillStyle=MUTED; ctx.textAlign='center';
  const lab=(txt,x,y)=>{if(x>14&&x<W-14) ctx.fillText(txt,x,y);};
  const done=sim.vent.filter(e=>e.t+0.6<sim.t&&e.t>t0+0.1), e=done[done.length-1];
  if(e&&r.vent!=='torsades'){
    const M=sim.MORPH[e.morph]||sim.MORPH.narrow, wide=M.J>0.1;
    let pk=0,pv=0; for(let d=0;d<M.J;d+=0.004){const v=sim.ecgAt(e.t+d); if(Math.abs(v)>Math.abs(pv)){pv=v;pk=d;}}
    lab(wide?'QRS (geniş)':'QRS',X(e.t+pk),pv>0?base-pv*ppmv-6:base-pv*ppmv+14);
    const tc=e.t+sim.qt(e.rr)+(M.qt||0)+M.T[0]; const tv=sim.ecgAt(tc);
    lab('T',X(tc),tv>=0?base-tv*ppmv-6:base-tv*ppmv+14);
  }
  if(r.atrial==='sinus'&&!['vf','torsades','vt','none'].includes(r.vent)&&(r.pAmp==null||r.pAmp>0.06)) sim.atrial.filter(a=>a.type==='sinus'&&a.t>t0&&a.t+0.12<sim.t).forEach(a=>{const v=sim.ecgAt(a.t+0.05); lab('P',X(a.t+0.05),base-Math.max(v,0.05)*ppmv-6);});
  const mid=(txt)=>{ if(lb==='all') lab(txt,W*0.5,H-10); };
  if(r.atrial==='af') mid('f dalgaları: düzensiz taban çizgisi');
  if(r.atrial==='flutter') mid('F dalgaları (testere dişi)');
  if(r.vent==='vf') mid('Kaotik dalgalanma, QRS yok');
  if(r.vent==='none') mid('Düz çizgi');
  if(r.vent==='torsades') mid('Genliği dönerek değişen geniş QRS’ler');
}


/* ---------- Döngü ---------- */
let last=0, hrTick=0;
const RED=[214,40,52], AF=[224,122,31], OFF=[229,220,221];
const mix=(a,b,k)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*k)).join(',')})`;
function loop(ts){
  requestAnimationFrame(loop);
  const dt=last?Math.min(0.05,(ts-last)/1000):0; last=ts;
  if(mode==='durumlar'||(mode==='vaka'&&vk.id)){
    sim.step(dt);
    if(cv.width<10) sizeCanvas();
    drawECG();
    const m=sim.mechanics();
    if(bA) bA.style.background = m.af?mix(OFF,AF,m.fib):mix(OFF,RED,m.ca);
    if(bV) bV.style.background = mix(OFF,RED,m.vf&&COND[ecgKey()].r.vent==='vf'?0.3+0.3*Math.random():m.cv);
    if(ts-hrTick>500){hrTick=ts; const hr=sim.heartRate(), v=COND[ecgKey()].r.vent; $('hrv').textContent= v==='vf'?'—':hr==null?'--':hr;}
  }
  if(mode==='sina'&&quiz.cur&&quiz.cur.t==='ecg'){
    sim.step(dt); if(cv.width<10) sizeCanvas(); drawECG();
    if(ts-hrTick>500){hrTick=ts; const hr=sim.heartRate(), v=COND[quiz.cur.key].r.vent; $('hrv').textContent= v==='vf'?'—':hr==null?'--':hr;}
  }
  if(mode==='ogren'){
    sim.step(dt); if(c12.width<10) size12(); draw12();
    heart&&heart.setVector(vecAt(sim.t));
  }
  heart&&heart.frame(mode==='durumlar'||mode==='ogren'||mode==='vaka'||(mode==='sina'&&quiz.cur&&quiz.cur.t==='ecg'&&quiz.cur.done)?sim:null);
  drawLabels();
}
window.__kalp={sim,get heart(){return heart;},get vk(){return vk;}};
fromHash();
requestAnimationFrame(loop);
})();
