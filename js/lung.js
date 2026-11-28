/* Kalp Simülatörü: akciğer atlası arayüzü (#akciger/...).
   Kalp sayfalarıyla aynı düzen: solda liste, ortada 3D akciğer ve altında grafi/ses paneli, sağda konu kartı.
   Adresler: #akciger · #akciger/anatomi/<yapı> · #akciger/histoloji/<id> · #akciger/embriyoloji/<id>
             #akciger/hastalik/<id>[/<bölüm>] · #akciger/ses/<id> · #akciger/muayene · #akciger/<fizyoloji|mikrobiyoloji|farmakoloji|vaka>
   app.js, adres #akciger ile başlayınca KalpLung.show(parçalar) çağırır; başka bir sayfaya geçince KalpLung.hide(). */
(function(){
'use strict';
const I18=window.KalpI18n||{lang:'tr',L:a=>a};
const LG=(a,b)=>I18.L(a,b);
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>window.matchMedia('(max-width:980px)').matches;
const LCOL={anatomi:'#ef6a5b',fizyoloji:'#0e8f7e',fizyopatoloji:'#7b61ff',farmakoloji:'#2b8be0',mikrobiyoloji:'#c7792f',vaka:'#1b2333'};
const OCOL={kalp:['#e5484d','♥'],beyin:['#7b61ff','✦'],bobrek:['#c7792f','◖'],kan:['#b3263a','●'],sistemik:['#66738a','◎'],karaciger:['#8a5a2b','◆'],kemik:['#8a8f99','▮'],endokrin:['#d0a215','⬡'],damar:['#3b6fd6','≈'],plevra:['#0e8f7e','◠'],akciger:['#ef6a5b','◍']};
const ONAME={kalp:['Kalp','Heart'],beyin:['Beyin ve sinir sistemi','Brain and nervous system'],bobrek:['Böbrek','Kidney'],kan:['Kan ve dolaşım','Blood and circulation'],sistemik:['Tüm vücut','Whole body'],karaciger:['Karaciğer','Liver'],kemik:['Kemik','Bone'],endokrin:['Endokrin','Endocrine'],damar:['Damarlar','Vessels'],plevra:['Plevra','Pleura'],akciger:['Akciğer','Lung']};
const SECS=[['mek',LG('Mekanizma','Mechanism')],['gor',LG('Görünüm','Appearance')],['mua',LG('Muayene ve ses','Exam and sounds')],['tani',LG('Tanı','Diagnosis')],['etki',LG('Başka nereyi etkiler','What else it affects')],['ted',LG('Tedavi','Treatment')]];

let O=null, P={}, HI={}, EM={}, SE={}, HA={};
let lens='anatomi', page='part', cur='rul', sec='mek', marks=false, vtab='cxr', built=false, on=false, lung=null, raf=0, curSound=null;
const calc={curb:new Set(),wells:new Set(),light:{},gold:{}};
const seen={p:[],h:[],e:[],d:[],s:[]};
try{ const sv=JSON.parse(localStorage.getItem('kalp.akseen')||'null'); if(sv) for(const k in seen) if(Array.isArray(sv[k])) seen[k]=sv[k]; }catch(e){}
const mark=(k,id)=>{ if(!id||seen[k].includes(id)) return; seen[k].push(id); try{ localStorage.setItem('kalp.akseen',JSON.stringify(seen)); }catch(e){} };
const isSeen=(k,id)=>seen[k].includes(id);
const dot=(k,id)=>`<span class="seen${isSeen(k,id)?' y':''}" aria-hidden="true">✓</span>`;
const byId=a=>Object.fromEntries(a.map(x=>[x.id,x]));

function data(){
  if(O) return; O=window.KALP.ORGANS.akciger; P=byId(O.PARTS); HI=byId(O.HISTO); EM=byId(O.EMBRYO); SE=byId(O.SESLER); HA=byId(O.HAST);
}
function build(){
  if(built) return; built=true; data();
  const root=$('lung');
  root.innerHTML=`<aside class="panel nav lnav" id="lnav" aria-label="${LG('Akciğer listesi','Lung list')}"></aside>
  <div class="stage lstage" id="lstage" aria-label="${LG('3D akciğer modeli. Sürükleyerek döndür, kaydırarak yakınlaştır, tıklayarak bir yapıyı seç.','3D lung model. Drag to rotate, scroll to zoom, click to select a structure.')}">
    <div class="loading" id="lload"><span class="spin" aria-hidden="true"></span>${LG('3D akciğer yükleniyor…','Loading the 3D lungs…')}</div>
    <div class="tip" id="ltip" hidden></div>
    <div class="lvbar" role="group" aria-label="${LG('Görünüm','View')}">
      <button type="button" data-lv="front" aria-pressed="true">${LG('Önden','Front')}</button><button type="button" data-lv="lat" aria-pressed="false">${LG('Yandan','Side')}</button><button type="button" data-lv="post" aria-pressed="false">${LG('Arkadan','Back')}</button>
      <i></i><button type="button" id="lXray" aria-pressed="true">${LG('Saydam','See-through')}</button><button type="button" id="lBreath" aria-pressed="true">${LG('Nefes','Breathing')}</button>
    </div>
    <div class="lcap" id="lcap" hidden></div>
  </div>
  <section class="viz show lviz" id="lviz" aria-label="${LG('Grafi ve ses','X-ray and sounds')}"><div class="vzh"><div class="vzt"><span class="eyebrow" id="lvEye"></span><b id="lvTitle"></b></div><div class="vzc" id="lvCtl"></div></div><div class="vzb" id="lvBody"></div></section>
  <aside class="panel card lcard" id="lcard" aria-live="polite"></aside>`;
  try{
    lung=window.KalpLung3D.create($('lstage'),{phase:()=>window.KalpLungAudio&&window.KalpLungAudio.phase(),
      onReady:()=>{ $('lload').hidden=true; apply3D(); },
      onError:()=>{ $('lload').textContent=LG('3D model yüklenemedi.','The 3D model could not be loaded.'); },
      onPick:id=>pick3D(id),
      onHover:(id,x,y)=>{ const t=$('ltip'); if(!id){ t.hidden=true; return; } const r=$('lstage').getBoundingClientRect(); t.textContent=P[id]?P[id].n:id; t.hidden=false; t.style.left=(x-r.left)+'px'; t.style.top=(y-r.top)+'px'; }});
    $('lstage').insertBefore(lung.canvas,$('lstage').firstChild);
  }catch(e){ $('lload').textContent=LG('3D görünüm bu tarayıcıda açılamadı (WebGL gerekli).','3D view is not available in this browser (WebGL required).'); console.error(e); }
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChange);
  root.addEventListener('input',onChange);
  window.addEventListener('resize',()=>{ if(on) drawViz(); });
}

/* ---------- liste ---------- */
function prog(k,ids,label){ const n=ids.filter(id=>isSeen(k,id)).length, pct=ids.length?Math.round(100*n/ids.length):0;
  return `<div class="prog"><span>${esc(label)}: ${n}/${ids.length}</span><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${ids.length}" aria-valuenow="${n}" aria-label="${esc(label)}"><i style="width:${pct}%"></i></div></div>`; }
function orgHead(){ return `<div class="orgsw"><span class="orgic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v7M12 10c-1.5 1.2-3 1.5-4 1M12 10c1.5 1.2 3 1.5 4 1"/><path d="M8.5 7.5C5 8 3 12 3 16.5 3 19 4.5 20.5 6.5 20s3.5-2 3.5-5V9"/><path d="M15.5 7.5C19 8 21 12 21 16.5c0 2.5-1.5 4-3.5 3.5S14 18 14 15V9"/></svg></span><span><small>${LG('Organ','Organ')}</small><b>${LG('Akciğerler','Lungs')}</b></span>
  <span class="orglinks"><a class="orgto" href="#anatomi" title="${LG('Kalp atlasına geç','Go to the heart atlas')}">${LG('Kalp','Heart')} →</a><a class="orgto" href="#ana" title="${LG('Vücut haritası','Body map')}">${LG('Vücut haritası','Body map')}</a></span></div>`; }
function navHTML(){
  if(lens==='anatomi'){
    const G=[['lob',LG('Loblar','Lobes')],['hava',LG('Hava yolları','Airways')],['damar',LG('Damarlar','Vessels')],['duvar',LG('Plevra, diyafram ve komşuluk','Pleura, diaphragm and neighbours')]];
    const all=O.PARTS.map(x=>x.id).concat(O.HISTO.map(x=>'h'+x.id),O.EMBRYO.map(x=>'e'+x.id));
    const n=O.PARTS.filter(x=>isSeen('p',x.id)).length+O.HISTO.filter(x=>isSeen('h',x.id)).length+O.EMBRYO.filter(x=>isSeen('e',x.id)).length;
    return orgHead()+`<div class="prog"><span>${LG('İncelenen','Studied')}: ${n}/${all.length}</span><div class="bar"><i style="width:${Math.round(100*n/all.length)}%"></i></div></div>`+
      G.map(([g,t])=>`<div class="grp-h">${esc(t)}</div>`+O.PARTS.filter(x=>x.g===g).map(x=>`<button class="item" type="button" data-part="${x.id}" aria-current="${page==='part'&&cur===x.id}">${esc(x.n)}${dot('p',x.id)}</button>`).join('')).join('')+
      `<div class="grp-h">${LG('Histoloji','Histology')}<span>${O.HISTO.length}</span></div>`+O.HISTO.map((x,i)=>`<button class="item" type="button" data-histo="${x.id}" aria-current="${page==='histo'&&cur===x.id}"><span class="num">${i+1}</span>${esc(x.n)}${dot('h',x.id)}</button>`).join('')+
      `<div class="grp-h">${LG('Embriyoloji','Embryology')}<span>${O.EMBRYO.length}</span></div>`+O.EMBRYO.map((x,i)=>`<button class="item" type="button" data-emb="${x.id}" aria-current="${page==='emb'&&cur===x.id}"><span class="num">${i+1}</span><span class="it2">${esc(x.n)}<small>${esc(x.hafta)}</small></span>${dot('e',x.id)}</button>`).join('');
  }
  if(lens==='fizyopatoloji'){
    return orgHead()+prog('d',O.HAST.map(x=>x.id),LG('Çalışılan hastalık','Diseases studied'))+
      O.GRP.map(([g,t])=>{ const L=O.HAST.filter(x=>x.grp===g); return L.length?`<div class="grp-h">${esc(t)}<span>${L.length}</span></div>`+L.map(x=>`<button class="item" type="button" data-dis="${x.id}" aria-current="${page==='dis'&&cur===x.id}"><i class="k" style="background:${LCOL.fizyopatoloji}"></i>${esc(x.n)}${dot('d',x.id)}</button>`).join(''):''; }).join('')+
      `<div class="grp-h">${LG('Muayene ve akciğer sesleri','Examination and lung sounds')}</div><button class="item" type="button" data-mua aria-current="${page==='mua'}"><i class="k" style="background:var(--teal)"></i>${LG('Fizik muayene karşılaştırması','Physical exam comparison')}</button>`+
      O.SESLER.map(x=>`<button class="item" type="button" data-ses="${x.id}" aria-current="${page==='ses'&&cur===x.id}"><span class="sico" aria-hidden="true">♪</span>${esc(x.n)}${dot('s',x.id)}</button>`).join('');
  }
  return orgHead()+`<div class="grp-h">${esc(lensName(lens))}</div><p class="soon-n">${LG('Bu mercek akciğer için sıradaki adımda ekleniyor.','This lens is being added for the lung in the next step.')}</p>`+
    `<a class="item" href="#akciger/anatomi/rul"><i class="k" style="background:${LCOL.anatomi}"></i>${LG('Anatomiye git','Go to anatomy')}</a><a class="item" href="#akciger/hastalik/pnomoni"><i class="k" style="background:${LCOL.fizyopatoloji}"></i>${LG('Hastalıklara git','Go to diseases')}</a>`;
}
const DZ={rul:['tb','atelektazi','kanser'],rml:['pnomoni'],rll:['pnomoni','pe','ipf'],lul:['kanser','tb'],lll:['efuzyon','ipf'],trakea:['atelektazi','ptx'],brons:['astim','koah','kanser'],pa:['pe','koah'],pv:['odem'],diyafram:['koah','efuzyon'],plevra:['ptx','efuzyon','pe'],kalp:['odem','pe','koah']};
const lensName=k=>{ const L=O.LENSES.find(l=>l.k===k); return L?L.n:k==='vaka'?LG('Vakalar','Cases'):k; };
const lensEye=(k,extra)=>{ const i=O.LENSES.findIndex(l=>l.k===k); return `<div class="eyebrow">${LG('Akciğer','Lung')} · ${LG('Mercek','Lens')} ${i+1}/5 · ${esc(lensName(k))}${extra?' · '+esc(extra):''}</div>`; };

/* ---------- kartlar ---------- */
function ptsHTML(pts){ return `<ul class="key">${pts.map(([t,x])=>`<li><span><b>${esc(t)}.</b> ${esc(x)}</span></li>`).join('')}</ul>`; }
function nextBtn(href,label){ return `<a class="bigbtn" href="${href}">${LG('Anladım, sonraki','Got it, next')}<small>${esc(label)}</small></a>`; }
function partCard(){
  const x=P[cur], i=O.PARTS.indexOf(x), nx=O.PARTS[(i+1)%O.PARTS.length];
  const hs=O.HISTO.filter(h=>h.part===x.id), dz=(DZ[x.id]||[]).map(id=>HA[id]).filter(Boolean);
  return `<div>${lensEye('anatomi',x.g==='lob'?LG('Lob','Lobe'):'')}<h2>${esc(x.n)}</h2></div><p>${esc(x.d)}</p>${ptsHTML(x.pts)}
    <div class="note"><b>${LG('Klinik','Clinical')}:</b> ${esc(x.klinik)}</div>
    ${x.id==='kalp'?`<a class="btn" href="#anatomi">${LG('Kalp atlasını aç','Open the heart atlas')} →</a>`:''}
    ${hs.length?`<div><div class="eyebrow" style="margin-bottom:6px">${LG('Mikroskopta','Under the microscope')}</div><div class="lchips">${hs.map(h=>`<a class="lchip" href="#akciger/histoloji/${h.id}"><i style="background:${LCOL.anatomi}"></i>${esc(h.n)}</a>`).join('')}</div></div>`:''}
    ${dz.length?`<div><div class="eyebrow" style="margin-bottom:6px">${LG('Bu bölgeyi tutan hastalıklar','Diseases that involve this region')}</div><div class="lchips">${dz.map(h=>`<a class="lchip" href="#akciger/hastalik/${h.id}/gor"><i style="background:${LCOL.fizyopatoloji}"></i>${esc(h.n)}</a>`).join('')}</div></div>`:''}
    <div class="actions">${nextBtn('#akciger/anatomi/'+nx.id,nx.n)}</div>`;
}
function histoCard(){
  const x=HI[cur], i=O.HISTO.indexOf(x), nx=O.HISTO[i+1];
  return `<div>${lensEye('anatomi',LG('Histoloji','Histology'))}<h2>${esc(x.n)}</h2><div class="sub2">${esc(x.boya)} · ${esc(x.mag)}</div></div><p>${esc(x.d)}</p>${ptsHTML(x.pts)}
    <div class="note"><b>${LG('Klinik','Clinical')}:</b> ${esc(x.klinik)}</div>
    <div class="actions">${nx?nextBtn('#akciger/histoloji/'+nx.id,nx.n):nextBtn('#akciger/embriyoloji/'+O.EMBRYO[0].id,O.EMBRYO[0].n)}</div>`;
}
function embCard(){
  const x=EM[cur], i=O.EMBRYO.indexOf(x), nx=O.EMBRYO[i+1];
  return `<div>${lensEye('anatomi',LG('Embriyoloji','Embryology'))}<h2>${esc(x.n)}</h2><div class="sub2">${esc(x.hafta)}</div></div>
    <ol class="tline">${O.EMBRYO.map((e,k)=>`<li class="${k<i?'d':k===i?'on':''}"><a href="#akciger/embriyoloji/${e.id}" title="${esc(e.n)}"><b>${k+1}</b><span>${esc(e.hafta)}</span></a></li>`).join('')}</ol>
    <p>${esc(x.d)}</p>${ptsHTML(x.pts)}<div class="note"><b>${LG('Klinik','Clinical')}:</b> ${esc(x.klinik)}</div>
    <div class="actions">${nx?nextBtn('#akciger/embriyoloji/'+nx.id,nx.n):nextBtn('#akciger/hastalik/'+O.HAST[0].id,LG('Hastalıklar','Diseases'))}</div>`;
}
function sesChips(ids){ return `<div class="sesb">${ids.map(id=>{ const s=SE[id]; return s?`<button type="button" class="sbtn" data-play="${id}" aria-pressed="${curSound===id}"><span aria-hidden="true">${curSound===id?'■':'▶'}</span>${esc(s.n)}</button>`:''; }).join('')}</div>`; }
function calcHTML(k){
  if(k==='CURB65'||k==='WELLS'){ const C=O[k], set=k==='CURB65'?calc.curb:calc.wells, sc=C.items.filter(it=>set.has(it[0])).reduce((a,it)=>a+it[2],0);
    const res=C.sonuc.find(([a,b])=>sc>=a&&sc<=b)||C.sonuc[C.sonuc.length-1];
    return `<div class="calc" data-calc="${k}"><div class="eyebrow">${LG('Hesapla','Calculate')}</div><b>${esc(C.n)}</b>${C.items.map(([id,t,p])=>`<label class="cchk"><input type="checkbox" data-ck="${k}:${id}" ${set.has(id)?'checked':''}><span>${esc(t)}</span><em>+${String(p).replace('.',I18.lang==='en'?'.':',')}</em></label>`).join('')}
      <div class="cres"><b>${String(sc).replace('.',I18.lang==='en'?'.':',')} ${LG('puan','points')}</b><span>${esc(res[2])}</span></div></div>`; }
  if(k==='LIGHT'){ const v=calc.light, num=x=>parseFloat(String(x||'').replace(',','.'));
    const pp=num(v.pp)/num(v.sp), ll=num(v.pl)/num(v.sl), lu=num(v.pl)/num(v.ul);
    const have=[pp,ll,lu].some(x=>isFinite(x)&&x>0);
    const hits=[isFinite(pp)&&pp>0.5,isFinite(ll)&&ll>0.6,isFinite(lu)&&lu>2/3];
    const f=(x,d)=>isFinite(x)?x.toFixed(d).replace('.',I18.lang==='en'?'.':','):'—';
    const inp=(id,t,u)=>`<label class="cnum"><span>${esc(t)}</span><input inputmode="decimal" data-lt="${id}" value="${esc(v[id]||'')}" placeholder="${u}"></label>`;
    return `<div class="calc"><div class="eyebrow">${LG('Hesapla','Calculate')}</div><b>${esc(O.LIGHT.n)}</b><div class="cgrid">${inp('pp',LG('Plevral protein','Pleural protein'),'g/dL')}${inp('sp',LG('Serum protein','Serum protein'),'g/dL')}${inp('pl',LG('Plevral LDH','Pleural LDH'),'U/L')}${inp('sl',LG('Serum LDH','Serum LDH'),'U/L')}${inp('ul',LG('Serum LDH üst sınırı','Serum LDH upper limit'),'U/L')}</div>
      <ul class="crow"><li class="${hits[0]?'hit':''}">${LG('Protein oranı','Protein ratio')} ${f(pp,2)} <small>&gt;0,5</small></li><li class="${hits[1]?'hit':''}">${LG('LDH oranı','LDH ratio')} ${f(ll,2)} <small>&gt;0,6</small></li><li class="${hits[2]?'hit':''}">${LG('Plevral LDH / ÜS','Pleural LDH / ULN')} ${f(lu,2)} <small>&gt;0,67</small></li></ul>
      <div class="cres">${have?(hits.some(Boolean)?`<b class="no">${LG('Eksüda','Exudate')}</b><span>${LG('En az bir ölçüt karşılandı: plevranın kendisi hastalanmış (enfeksiyon, malignite, TB, PE…). Sıvıda pH, glukoz, hücre, kültür ve sitoloji iste.','At least one criterion met: the pleura itself is diseased (infection, malignancy, TB, PE…). Send pH, glucose, cell count, culture and cytology.')}</span>`:`<b class="ok">${LG('Transüda','Transudate')}</b><span>${LG('Hiçbir ölçüt yok: sistemik bir denge sorunu (kalp yetmezliği, siroz, nefrotik sendrom). Nedeni tedavi et.','No criterion met: a systemic balance problem (heart failure, cirrhosis, nephrotic syndrome). Treat the cause.')}</span>`):`<span>${LG('Örnek: plevral protein 4,2 · serum 6,5 · plevral LDH 380 · serum LDH 200 · üst sınır 250','Example: pleural protein 4.2 · serum 6.5 · pleural LDH 380 · serum LDH 200 · upper limit 250')}</span>`}</div></div>`; }
  if(k==='GOLD'){ const v=calc.gold, num=x=>parseFloat(String(x||'').replace(',','.'));
    const r=num(v.f1)/num(v.fvc), pct=num(v.pct), pre=num(v.pre), rev=isFinite(pre)&&pre>0&&isFinite(num(v.f1))?(num(v.f1)-pre):NaN, revP=rev/pre*100;
    const inp=(id,t,u)=>`<label class="cnum"><span>${esc(t)}</span><input inputmode="decimal" data-gd="${id}" value="${esc(v[id]||'')}" placeholder="${u}"></label>`;
    const f=(x,d)=>isFinite(x)?x.toFixed(d).replace('.',I18.lang==='en'?'.':','):'—';
    let out=`<span>${LG('Örnek KOAH: FEV₁ 1,6 L · FVC 3,0 L · FEV₁ %58. Örnek astım: öncesi FEV₁ 2,1 L, sonrası 2,5 L.','COPD example: FEV₁ 1.6 L · FVC 3.0 L · FEV₁ 58%. Asthma example: pre FEV₁ 2.1 L, post 2.5 L.')}</span>`;
    if(isFinite(r)){ const obs=r<0.7; const g=!obs?'':pct>=80?'GOLD 1':pct>=50?'GOLD 2':pct>=30?'GOLD 3':isFinite(pct)?'GOLD 4':'';
      out=`<b class="${obs?'no':'ok'}">FEV₁/FVC ${f(r,2)} · ${obs?LG('Obstrüksiyon','Obstruction'):LG('Obstrüksiyon yok','No obstruction')}${g?' · '+g:''}</b><span>${obs?LG('Bronkodilatör sonrası oran <0,70 ise KOAH’la uyumlu kalıcı hava akımı kısıtlaması. Evre FEV₁ yüzdesiyle: ≥80 hafif, 50–79 orta, 30–49 ağır, <30 çok ağır.','A post-bronchodilator ratio <0.70 fits fixed airflow limitation (COPD). Grade by FEV₁ %: ≥80 mild, 50–79 moderate, 30–49 severe, <30 very severe.'):LG('Oran normal. FVC düşükse restriktif bir süreç (fibrozis, göğüs duvarı) için akciğer hacimleri ve DLCO iste.','Ratio normal. If FVC is low, check lung volumes and DLCO for restriction (fibrosis, chest wall).')}</span>`; }
    if(isFinite(rev)) out+=`<b class="${rev>=0.2&&revP>=12?'no':'ok'}">${LG('Geri dönüşlülük','Reversibility')}: +${f(rev*1000,0)} mL (%${f(revP,0)})</b><span>${rev>=0.2&&revP>=12?LG('≥%12 ve ≥200 mL: anlamlı geri dönüşlülük, astımı destekler.','≥12% and ≥200 mL: significant reversibility, supports asthma.'):LG('Anlamlı geri dönüşlülük yok.','No significant reversibility.')}</span>`;
    return `<div class="calc"><div class="eyebrow">${LG('Hesapla','Calculate')}</div><b>${LG('Spirometri yorumu','Spirometry interpretation')}</b><div class="cgrid">${inp('f1',LG('FEV₁ (sonrası)','FEV₁ (post)'),'L')}${inp('fvc','FVC','L')}${inp('pct',LG('FEV₁ % beklenen','FEV₁ % predicted'),'%')}${inp('pre',LG('FEV₁ (öncesi)','FEV₁ (pre)'),'L')}</div><div class="cres">${out}</div></div>`; }
  return '';
}
function disCard(){
  const x=HA[cur], i=O.HAST.indexOf(x), nx=O.HAST[(i+1)%O.HAST.length], si=SECS.findIndex(s=>s[0]===sec), nsec=SECS[si+1];
  let body='';
  if(sec==='mek') body=`<p class="lead2">${esc(x.ozet)}</p><div><div class="eyebrow">${LG('Neden','Cause')}</div><ul class="dots">${x.why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>
    <div><div class="eyebrow">${LG('Mekanizma','Mechanism')}</div><p class="long">${esc(x.how)}</p></div><div><div class="eyebrow">${LG('Belirti ve bulgular','Symptoms and signs')}</div><ul class="dots">${x.bul.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`;
  if(sec==='gor') body=`<div class="note n2"><b>${LG('3D modelde','On the 3D model')}:</b> ${esc(fxText(x))}</div><div><div class="eyebrow">${LG('Akciğer grafisi ve BT','Chest X-ray and CT')}</div><ul class="dots">${x.xrt.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>
    <button type="button" class="btn" data-marks aria-pressed="${marks}">${marks?LG('İşaretleri gizle','Hide labels'):LG('Grafide bulguları işaretle','Label the findings on the X-ray')}</button>`;
  if(sec==='mua') body=`<dl class="mua">${x.mua.map(([t,d])=>`<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
    <div><div class="eyebrow" style="margin-bottom:6px">${LG('Dinle','Listen')}</div>${sesChips(x.ses)}<p class="hint2">${LG('Sesler tarayıcıda üretilen öğretici örneklerdir; kulaklıkla dinle. Alttaki şerit sesin solunum döngüsündeki yerini gösterir.','Sounds are teaching examples synthesised in the browser; use headphones. The strip below shows where the sound sits in the breath cycle.')}</p></div>
    <a class="lnk2" href="#akciger/muayene">${LG('Tüm hastalıkların muayene karşılaştırması','Exam comparison across all diseases')} →</a>`;
  if(sec==='tani') body=`<ul class="key">${x.tani.map(([t,d])=>`<li><span><b>${esc(t)}.</b> ${esc(d)}</span></li>`).join('')}</ul>${x.kriter?calcHTML(x.kriter):''}`;
  if(sec==='etki') body=`<p class="hint2">${LG('Bu hastalık yalnız akciğerde kalmaz. Her kart organı, mekanizmayı ve varsa ilgili sayfayı gösterir.','This disease does not stay in the lung. Each card shows the organ, the mechanism and the related page where there is one.')}</p>
    <div class="etki">${x.etki.map(([o,t,d,href])=>{ const c=OCOL[o]||OCOL.sistemik, on=ONAME[o]||[o,o]; return `<div class="ek" style="--c:${c[0]}"><div class="ekh"><i aria-hidden="true">${c[1]}</i><span><small>${esc(LG(on[0],on[1]))}</small><b>${esc(t)}</b></span></div><p>${esc(d)}</p>${href?`<a class="lnk2" href="${href}">${href.startsWith('#akciger')?LG('Akciğer sayfasında aç','Open the lung page'):LG('Kalp sayfasında aç','Open the heart page')} →</a>`:''}</div>`; }).join('')}</div>`;
  if(sec==='ted') body=`<ul class="key">${x.tedavi.map(t=>`<li><span>${esc(t)}</span></li>`).join('')}</ul><div class="note">${LG('İlaçların bronşta ve damarda nasıl etki ettiği Farmakoloji merceğinde (sıradaki adım) anlatılacak. Doz ve protokoller eğitim amaçlıdır.','How the drugs act on the bronchus and vessels will be covered in the Pharmacology lens (next step). Doses and protocols are for teaching only.')}</div>`;
  return `<div>${lensEye('fizyopatoloji',esc(x.tag))}<h2>${esc(x.n)}</h2></div>
    <div class="dtabs" role="tablist">${SECS.map(([k,t],j)=>`<button type="button" role="tab" data-sec="${k}" aria-selected="${k===sec}"><b>${j+1}</b>${esc(t)}</button>`).join('')}</div>
    ${body}
    <div class="actions">${nsec?`<a class="bigbtn" href="#akciger/hastalik/${x.id}/${nsec[0]}">${LG('Anladım, sonraki','Got it, next')}<small>${esc(nsec[1])}</small></a>`:nextBtn('#akciger/hastalik/'+nx.id,nx.n)}</div>
    <div class="disc">${LG('Kaynak: Harrison’s Principles of Internal Medicine; GOLD, GINA, ESC ve BTS kılavuzları (kendi cümlelerimizle). Tıbbi tavsiye değildir.','Source: Harrison’s Principles of Internal Medicine; GOLD, GINA, ESC and BTS guidelines (in our own words). Not medical advice.')}</div>`;
}
function fxText(x){
  const t=[], has=k=>x.fx.some(f=>f.t===k);
  const M={pnomoni:LG('Sağ alt lob koyu kırmızı-kahverengi ve opak: alveoller eksüdayla dolu (hepatizasyon).','The right lower lobe is dark red-brown and opaque: alveoli filled with exudate (hepatisation).'),
    koah:LG('İki akciğer büyümüş, diyafram düzleşip aşağı inmiş; üst loblarda büller ve parlak (hiperlüsens) alanlar.','Both lungs are enlarged and the diaphragm is flat and low; bullae and hyperlucent areas in the upper lobes.'),
    astim:LG('Bronş ağacı kırmızı ve iltihaplı, akciğerler hafif aşırı havalanmış.','The bronchial tree is red and inflamed; the lungs are mildly hyperinflated.'),
    odem:LG('Kalp büyük; hilus çevresinde yaygın pus-kırmızı ödem, bazallerde nodüler dansite ve iki yanda sıvı seviyesi.','The heart is large; perihilar oedema, nodular basal density and fluid levels on both sides.'),
    pe:LG('Sağ ve sol pulmoner arterde koyu pıhtı; sağ alt lob tabanında plevraya oturan kırmızı enfarkt, kalp sağ tarafta yüklenmiş.','Dark clot in the right and left pulmonary arteries; a red pleura-based infarct at the right base; the right heart is strained.'),
    ptx:LG('Sağ akciğer hilusa doğru çökmüş; mavi saydam çizgi akciğerin eski sınırını, aradaki boşluk plevral havayı gösterir. Mediyasten sola itilmiş (tansiyon).','The right lung has collapsed towards the hilum; the blue outline marks its former edge and the gap is pleural air. The mediastinum is pushed left (tension).'),
    efuzyon:LG('Sol hemitoraksın alt kısmı mavi sıvıyla dolu; sıvı seviyesi lateralde yükselir (menisküs).','The lower left hemithorax is filled with blue fluid; the level rises laterally (meniscus).'),
    tb:LG('Sağ üst lob apeksinde kalın duvarlı kavite, çevresinde ve sol üst lobda nodüller; hilusta lenf nodu.','A thick-walled cavity at the right apex with surrounding and left upper-lobe nodules; a hilar lymph node.'),
    ipf:LG('Bazal ve periferik ağ (retiküler) paterni, akciğer hacmi küçük, diyafram yüksek.','A basal and peripheral reticular pattern; small lungs, high diaphragm.'),
    kanser:LG('Sağ hilusta lobüle santral kitle ve mediyastinal lenf nodları; sol üst lobda periferik nodül.','A lobulated central mass at the right hilum with mediastinal nodes; a peripheral nodule in the left upper lobe.'),
    ards:LG('İki akciğerde yaygın, özellikle arka (bağımlı) bölgelerde yoğun konsolidasyon; kalp normal boyutta.','Diffuse bilateral consolidation, densest posteriorly (dependent); normal heart size.'),
    atelektazi:LG('Sağ üst lob küçülüp koyulaşmış ve hilusa doğru çekilmiş; mediyasten sağa kaymış.','The right upper lobe is small, dense and pulled towards the hilum; the mediastinum is shifted right.')};
  void t; void has; return M[x.id]||'';
}
function sesCard(){
  const x=SE[cur], i=O.SESLER.indexOf(x), nx=O.SESLER[(i+1)%O.SESLER.length];
  return `<div>${lensEye('fizyopatoloji',LG('Akciğer sesi','Lung sound'))}<h2>${esc(x.n)}</h2><div class="sub2">${esc(x.tur)}</div></div>
    ${sesChips([x.id])}<p>${esc(x.d)}</p>
    <dl class="read"><div><dt>${LG('Zamanlama','Timing')}</dt><dd>${esc(x.zaman)}</dd></div><div><dt>${LG('Nerede','Where')}</dt><dd>${esc(x.nerede)}</dd></div></dl>
    <div><div class="eyebrow">${LG('Neden oluşur','How it arises')}</div><p class="long">${esc(x.mek)}</p></div>
    ${x.hast.length?`<div><div class="eyebrow" style="margin-bottom:6px">${LG('Duyulduğu hastalıklar','Heard in')}</div><div class="lchips">${x.hast.map(id=>HA[id]?`<a class="lchip" href="#akciger/hastalik/${id}/mua"><i style="background:${LCOL.fizyopatoloji}"></i>${esc(HA[id].n)}</a>`:'').join('')}</div></div>`:''}
    <p class="hint2">${LG('Sentezlenmiş öğretici örnek; gerçek kayıt değildir.','A synthesised teaching example, not a real recording.')}</p>
    <div class="actions">${nextBtn('#akciger/ses/'+nx.id,nx.n)}</div>`;
}
function muaCard(){
  return `<div>${lensEye('fizyopatoloji',LG('Muayene','Examination'))}<h2>${LG('Fizik muayene karşılaştırması','Physical exam comparison')}</h2></div>
    <p>${LG('Göğüs muayenesi dört adımdır. Aynı bulgu kombinasyonu farklı hastalıkları ayırır: tablo alttaki panelde.','Chest examination has four steps. The pattern of findings separates the diseases: the table is in the panel below.')}</p>
    <ul class="key"><li><span><b>${LG('İnspeksiyon','Inspection')}.</b> ${LG('Solunum sayısı ve düzeni, yardımcı kaslar, göğüs şekli (fıçı göğüs), asimetri, siyanoz, çomak parmak.','Rate and pattern, accessory muscles, chest shape (barrel chest), asymmetry, cyanosis, clubbing.')}</span></li>
      <li><span><b>${LG('Palpasyon','Palpation')}.</b> ${LG('Trakea yeri, göğüs ekspansiyonu, vokal fremitus (hasta “otuz üç” der). Katı ortam (konsolidasyon) titreşimi artırır; hava ya da sıvı (pnömotoraks, efüzyon) azaltır.','Tracheal position, chest expansion, tactile fremitus (patient says “ninety-nine”). Solid tissue (consolidation) increases it; air or fluid (pneumothorax, effusion) reduces it.')}</span></li>
      <li><span><b>${LG('Perküsyon','Percussion')}.</b> ${LG('Rezonan normal; mat konsolidasyon ve atelektazi; taş gibi mat efüzyon; hiperrezonan pnömotoraks ve amfizem.','Resonant is normal; dull in consolidation and collapse; stony dull in effusion; hyperresonant in pneumothorax and emphysema.')}</span></li>
      <li><span><b>${LG('Oskültasyon','Auscultation')}.</b> ${LG('Solunum sesinin türü ve şiddeti, ek sesler, vokal rezonans: bronkofoni, egofoni (“i” → “e”), fısıltı pektorilokisi konsolidasyonu gösterir.','Type and intensity of breath sounds, added sounds and vocal resonance: bronchophony, egophony (“ee” → “ay”) and whispered pectoriloquy point to consolidation.')}</span></li></ul>
    <div><div class="eyebrow" style="margin-bottom:6px">${LG('Sesleri dinle','Listen to the sounds')}</div>${sesChips(O.SESLER.map(s=>s.id))}</div>
    <div class="actions">${nextBtn('#akciger/ses/'+O.SESLER[0].id,O.SESLER[0].n)}</div>`;
}
function soonCard(){
  const plan={fizyoloji:[LG('Solunum mekaniği: basınç–hacim, kompliyans, plevral basınç döngüsü','Mechanics: pressure–volume, compliance, the pleural pressure cycle'),LG('Akciğer hacimleri ve spirometri','Lung volumes and spirometry'),LG('V/Q ve West bölgeleri, hipoksik vazokonstriksiyon','V/Q and West zones, hypoxic vasoconstriction'),LG('Difüzyon, alveoler gaz denklemi, A-a gradiyenti hesaplayıcı','Diffusion, the alveolar gas equation, an A–a gradient calculator'),LG('O₂–Hb ayrışma eğrisi (kaydırmalı), CO₂ taşınması','O₂–Hb dissociation curve (with shifts), CO₂ transport'),LG('Arter kan gazı yorumlayıcı ve solunumun kontrolü','ABG interpreter and control of breathing')],
    mikrobiyoloji:[LG('Toplumda gelişen pnömoni etkenleri (pnömokok, H. influenzae, atipikler)','Community-acquired pneumonia organisms (pneumococcus, H. influenzae, atypicals)'),LG('Hastane ve ventilatör pnömonisi (Pseudomonas, MRSA, Klebsiella)','Hospital and ventilator pneumonia (Pseudomonas, MRSA, Klebsiella)'),LG('Tüberküloz: granülom, Ghon kompleksi, IGRA/PPD, Xpert','Tuberculosis: granuloma, Ghon complex, IGRA/PPD, Xpert'),LG('Aspirasyon ve akciğer apsesi, mantar (Aspergillus, PJP), viral (influenza, COVID-19, RSV)','Aspiration and lung abscess, fungi (Aspergillus, PJP), viruses (influenza, COVID-19, RSV)')],
    farmakoloji:[LG('β2 agonist ve antimuskarinikler (hücre düzeyinde animasyon)','β2 agonists and antimuscarinics (cell-level animation)'),LG('İnhale kortikosteroid, lökotrien antagonisti, teofilin, roflumilast, biyolojikler','Inhaled corticosteroids, leukotriene antagonists, theophylline, roflumilast, biologics'),LG('Antikoagülan ve tromboliz (pulmoner emboli)','Anticoagulants and thrombolysis (pulmonary embolism)'),LG('Antibiyotikler ve anti-TB ilaçları, antifibrotikler, oksijen tedavisi','Antibiotics and anti-TB drugs, antifibrotics, oxygen therapy')],
    vaka:[LG('Hasta vakaları: öykü → muayene (dinleme) → grafi → kan gazı → tanı → tedavi','Patient cases: history → exam (auscultation) → X-ray → blood gas → diagnosis → treatment'),LG('Hastadan başla: vakada etkilenen organlar vücutta yanar','Patient-first: the organs a case affects light up on the body')]}[lens]||[];
  return `<div><div class="eyebrow">${LG('Akciğer','Lung')} · ${esc(lensName(lens))}</div><h2>${LG('Sıradaki adımda','Coming in the next step')}</h2></div>
    <p>${LG('Akciğer atlası adım adım ekleniyor. Bu adımda anatomi (histoloji ve embriyoloji dahil) ve hastalıklar hazır. Bu mercekte gelecek konular:','The lung atlas is being added step by step. This step brings anatomy (with histology and embryology) and diseases. Coming in this lens:')}</p>
    <ul class="dots">${plan.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>
    <div class="actions"><a class="bigbtn" href="#akciger/hastalik/pnomoni">${LG('Hastalıklara git','Go to diseases')}<small>${LG('Pnömoni','Pneumonia')}</small></a></div>`;
}

/* ---------- alt panel: grafi, ses, çizimler ---------- */
let phonoT=null;
function vizHTML(){
  const V=window.LungViz;
  if(page==='histo'){ const x=HI[cur]; return {eye:LG('Mikroskop','Microscope'),title:x.n,ctl:'',body:`<div class="vzsvg">${V.histo(x.id,x.lb)}</div>`,kind:'svg'}; }
  if(page==='emb'){ const x=EM[cur]; return {eye:LG('Gelişim','Development')+' · '+x.hafta,title:x.n,ctl:'',body:`<div class="vzsvg">${V.embryo(x.id,x.lb)}</div>`,kind:'svg'}; }
  if(page==='mua'){ const T=O.MUA_TABLO; return {eye:LG('Karşılaştırma','Comparison'),title:LG('Göğüs muayenesi bulguları','Chest examination findings'),ctl:'',kind:'tbl',
    body:`<div class="mtbl"><table><thead><tr>${T.bas.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${T.sat.map(r=>`<tr>${r.map((c,j)=>j?`<td>${esc(c)}</td>`:`<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`}; }
  if(page==='ses'){ const x=SE[cur]; return {eye:LG('Fonopnömogram','Phonopneumogram'),title:x.n,ctl:sesChips([x.id]),kind:'ph',body:`<div class="lph"><canvas id="lPhono" aria-label="${LG('Solunum döngüsü ve ek seslerin zamanlaması','Breath cycle and timing of added sounds')}"></canvas></div>`}; }
  if(page==='dis'){ const x=HA[cur];
    return {eye:LG('Görünüm ve ses','Appearance and sound'),title:x.n,kind:'dis',
      ctl:`<button type="button" class="btn" data-marks aria-pressed="${marks}">${LG('İşaretle','Labels')}</button>`,
      body:`<div class="lcx"><canvas id="lCxr" aria-label="${LG('Akciğer grafisi şeması','Chest X-ray schematic')}"></canvas><span class="cxl">${LG('PA akciğer grafisi (şema)','PA chest X-ray (schematic)')}</span></div><div class="lph"><div class="lphh">${sesChips(x.ses)}</div><canvas id="lPhono" aria-label="${LG('Solunum döngüsü','Breath cycle')}"></canvas></div>`}; }
  return {eye:LG('Karşılaştır','Compare'),title:LG('Normal PA akciğer grafisi','Normal PA chest X-ray'),kind:'dis',ctl:`<button type="button" class="btn" data-marks aria-pressed="${marks}">${LG('İşaretle','Labels')}</button>`,
    body:`<div class="lcx"><canvas id="lCxr"></canvas><span class="cxl">${LG('PA akciğer grafisi (şema)','PA chest X-ray (schematic)')}</span></div><div class="lph"><div class="lphh">${sesChips(['vez','bro'])}</div><canvas id="lPhono"></canvas></div>`};
}
function renderViz(){
  const v=vizHTML(), el=$('lviz'); el.dataset.kind=v.kind; $('lvEye').textContent=v.eye; $('lvTitle').textContent=v.title; $('lvCtl').innerHTML=v.ctl; $('lvBody').innerHTML=v.body;
  requestAnimationFrame(drawViz);
}
function drawViz(){
  const c=$('lCxr'); if(c) window.LungViz.cxr(c,page==='dis'?cur:'normal',{marks});
  drawPhono();
}
function css(n,d){ try{ return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||d; }catch(e){ return d; } }
function drawPhono(){
  const c=$('lPhono'); if(!c) return; const A=window.KalpLungAudio;
  const id=A&&A.playing?A.playing:page==='ses'?cur:page==='dis'?HA[cur].ses[0]:'vez';
  window.LungViz.phono(c,id,A&&A.playing?A.elapsed():null,{ink:css('--ink','#1b2333'),mute:css('--mute','#66738a'),teal:css('--teal','#0e8f7e'),line:css('--line','#e3e8f0'),amber:css('--amber','#f2a93b'),coral:css('--coral','#ef6a5b'),violet:css('--violet','#7b61ff')});
}
function tick(){ raf=requestAnimationFrame(tick); if(window.KalpLungAudio&&window.KalpLungAudio.playing) drawPhono(); }

/* ---------- 3D ---------- */
function apply3D(){
  if(!lung||!lung.ready) return;
  if(page==='dis'){ lung.setFx(HA[cur].fx); lung.select(null,false); lung.home(); setCap(fxText(HA[cur])); }
  else if(page==='part'){ lung.setFx([]); lung.select(cur); setCap(''); }
  else if(page==='histo'){ lung.setFx([]); lung.select(HI[cur].part); setCap(''); }
  else { lung.setFx([]); lung.select(null,false); setCap(''); }
}
function setCap(t){ const c=$('lcap'); if(!c) return; c.hidden=!t; c.textContent=t; }
function pick3D(id){
  if(!id) return;
  if(lens==='anatomi') location.hash='#akciger/anatomi/'+id;
  else { const t=$('ltip'); t.textContent=P[id]?P[id].n+' · '+LG('anatomide aç','open in anatomy'):id; }
}

/* ---------- olaylar ---------- */
function onClick(e){
  const b=e.target.closest('button,a'); if(!b) return;
  const d=b.dataset;
  if(d.part!=null){ location.hash='#akciger/anatomi/'+d.part; return; }
  if(d.histo!=null){ location.hash='#akciger/histoloji/'+d.histo; return; }
  if(d.emb!=null){ location.hash='#akciger/embriyoloji/'+d.emb; return; }
  if(d.dis!=null){ location.hash='#akciger/hastalik/'+d.dis; return; }
  if(d.ses!=null){ location.hash='#akciger/ses/'+d.ses; return; }
  if(d.mua!=null){ location.hash='#akciger/muayene'; return; }
  if(d.sec!=null){ location.hash='#akciger/hastalik/'+cur+'/'+d.sec; return; }
  if(d.marks!=null){ marks=!marks; document.querySelectorAll('#lung [data-marks]').forEach(x=>{ x.setAttribute('aria-pressed',marks); if(x.closest('#lcard')) x.textContent=marks?LG('İşaretleri gizle','Hide labels'):LG('Grafide bulguları işaretle','Label the findings on the X-ray'); }); drawViz(); if(narrow()&&b.closest('#lcard')) $('lviz').scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'}); return; }
  if(d.play!=null){ const A=window.KalpLungAudio; if(!A||!A.supported()) return; if(A.playing===d.play){ A.stop(); curSound=null; } else { A.play(d.play); curSound=d.play; }
    document.querySelectorAll('#lung [data-play]').forEach(x=>{ const p=x.dataset.play===curSound; x.setAttribute('aria-pressed',p); x.firstElementChild.textContent=p?'■':'▶'; }); drawPhono(); return; }
  if(d.lv!=null){ lung&&lung.view(d.lv); document.querySelectorAll('#lung [data-lv]').forEach(x=>x.setAttribute('aria-pressed',x===b)); return; }
  if(b.id==='lXray'){ const p=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',p); lung&&lung.setXray(p); return; }
  if(b.id==='lBreath'){ const p=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',p); lung&&lung.setBreath(p); return; }
}
function onChange(e){
  const t=e.target, d=t.dataset;
  if(d.ck){ const [k,id]=d.ck.split(':'), set=k==='CURB65'?calc.curb:calc.wells; if(t.checked) set.add(id); else set.delete(id); refreshCalc(); }
  if(d.lt!=null){ calc.light[d.lt]=t.value; refreshCalc(t); }
  if(d.gd!=null){ calc.gold[d.gd]=t.value; refreshCalc(t); }
}
function refreshCalc(input){ const x=HA[cur]; if(!x||!x.kriter) return; const box=document.querySelector('#lcard .calc'); if(!box) return;
  const tmp=document.createElement('div'); tmp.innerHTML=calcHTML(x.kriter); const nb=tmp.firstElementChild;
  if(input){ box.querySelector('.cres').replaceWith(nb.querySelector('.cres')); const cr=box.querySelector('.crow'); if(cr) cr.replaceWith(nb.querySelector('.crow')); }
  else box.replaceWith(nb); }

/* ---------- sayfa ---------- */
const TABS={anatomi:'anatomi',fizyoloji:'fizyoloji',mikrobiyoloji:'mikrobiyoloji',durumlar:'fizyopatoloji',farmakoloji:'farmakoloji',vaka:'vaka'};
const TABHREF={anatomi:'#akciger/anatomi',fizyoloji:'#akciger/fizyoloji',mikrobiyoloji:'#akciger/mikrobiyoloji',durumlar:'#akciger/hastalik',farmakoloji:'#akciger/farmakoloji',vaka:'#akciger/vaka'};
let tabOrig=null;
function tabs(enter){
  const ids=Object.keys(TABS);
  if(enter){ if(!tabOrig){ tabOrig={}; ids.forEach(k=>{ const a=$('tab-'+k); if(a) tabOrig[k]=a.getAttribute('href'); }); }
    ids.forEach(k=>{ const a=$('tab-'+k); if(!a) return; a.setAttribute('href',TABHREF[k]); if(TABS[k]===lens) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    const s=$('tab-sina'); if(s) s.removeAttribute('aria-current'); document.body.classList.add('org-akciger'); }
  else if(tabOrig){ ids.forEach(k=>{ const a=$('tab-'+k); if(a&&tabOrig[k]) a.setAttribute('href',tabOrig[k]); }); document.body.classList.remove('org-akciger'); }
}
function render(){
  const nv=$('lnav'), cd=$('lcard'); const top=nv.scrollTop;
  nv.innerHTML=navHTML(); nv.scrollTop=top;
  cd.innerHTML=page==='part'?partCard():page==='histo'?histoCard():page==='emb'?embCard():page==='dis'?disCard():page==='ses'?sesCard():page==='mua'?muaCard():soonCard();
  cd.scrollTop=0;
  renderViz(); tabs(true);
  const a=nv.querySelector('[aria-current="true"]'); if(a&&!narrow()) a.scrollIntoView({block:'nearest'});
}
function route(h){
  const prevPage=page, prevCur=cur;
  const k=h[1]||'anatomi', id=h[2];
  if(k==='anatomi'){ lens='anatomi'; page='part'; cur=P[id]?id:(page===prevPage&&P[prevCur]?prevCur:'rul'); mark('p',cur); }
  else if(k==='histoloji'){ lens='anatomi'; page='histo'; cur=HI[id]?id:O.HISTO[0].id; mark('h',cur); }
  else if(k==='embriyoloji'){ lens='anatomi'; page='emb'; cur=EM[id]?id:O.EMBRYO[0].id; mark('e',cur); }
  else if(k==='hastalik'){ lens='fizyopatoloji'; page='dis'; const nid=HA[id]?id:(prevPage==='dis'&&HA[prevCur]?prevCur:O.HAST[0].id); if(nid!==prevCur||prevPage!=='dis'){ marks=false; } cur=nid; sec=SECS.some(s=>s[0]===h[3])?h[3]:'mek'; mark('d',cur); }
  else if(k==='ses'){ lens='fizyopatoloji'; page='ses'; cur=SE[id]?id:O.SESLER[0].id; mark('s',cur); }
  else if(k==='muayene'){ lens='fizyopatoloji'; page='mua'; }
  else if(['fizyoloji','mikrobiyoloji','farmakoloji','vaka'].includes(k)){ lens=k; page='soon'; }
  else { lens='anatomi'; page='part'; cur='rul'; }
  const A=window.KalpLungAudio; if(A&&A.playing&&(page!==prevPage||cur!==prevCur)){ A.stop(); curSound=null; }
  render(); apply3D();
  if(narrow()&&(page!==prevPage||cur!==prevCur)&&h[3]==null) window.scrollTo({top:0,behavior:'auto'});
  else if(narrow()&&h[3]!=null) $('lcard').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
}
const API={
  show(h){ build(); if(!on){ on=true; $('lung').hidden=false; lung&&lung.pause(false); if(!raf) tick(); } route(h); try{ localStorage.setItem('kalp.last',location.hash); }catch(e){} },
  hide(){ if(!on) return; on=false; $('lung').hidden=true; lung&&lung.pause(true); cancelAnimationFrame(raf); raf=0; const A=window.KalpLungAudio; if(A) A.stop(); curSound=null; tabs(false); },
  get on(){ return on; },
  index(add){ data(); const J=a=>(a||[]).map(x=>Array.isArray(x)?x.join(' '):x).join(' ');
    O.PARTS.forEach(x=>add(LG('Akciğer anatomisi','Lung anatomy'),LCOL.anatomi,'#akciger/anatomi/'+x.id,x.n,LG('Akciğer','Lung'),x.d+' '+J(x.pts)+' '+x.klinik));
    O.HISTO.forEach(x=>add(LG('Akciğer histolojisi','Lung histology'),LCOL.anatomi,'#akciger/histoloji/'+x.id,x.n,x.boya+' · '+x.mag,x.d+' '+J(x.pts)+' '+x.klinik));
    O.EMBRYO.forEach(x=>add(LG('Embriyoloji','Embryology'),LCOL.anatomi,'#akciger/embriyoloji/'+x.id,x.n,x.hafta,x.d+' '+J(x.pts)+' '+x.klinik));
    O.HAST.forEach(x=>add(LG('Akciğer hastalığı','Lung disease'),LCOL.fizyopatoloji,'#akciger/hastalik/'+x.id,x.n,x.tag,[x.ozet,J(x.why),x.how,J(x.bul),J(x.xrt),J(x.tani),J(x.etki)].join(' ')));
    O.SESLER.forEach(x=>add(LG('Akciğer sesi','Lung sound'),'var(--teal)','#akciger/ses/'+x.id,x.n,x.tur,x.d+' '+x.mek));
    add(LG('Muayene','Examination'),'var(--teal)','#akciger/muayene',LG('Fizik muayene karşılaştırması','Physical exam comparison'),LG('Akciğer','Lung'),'fremitus perküsyon oskültasyon trakea');
  }
};
window.KalpLung=API;
})();
