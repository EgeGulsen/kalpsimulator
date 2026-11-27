/* Kalp Simülatörü: dil desteği (Türkçe / English).
   Türkçe içerik kaynak dildir. İngilizce seçiliyse:
     1) en-*.js dosyaları yüklenir; her biri KalpI18n.add({...}) ile çeviri paketi ekler.
     2) app.js açılırken KalpI18n.apply() paketleri window.KALP ve window.KalpECG12 üzerine birleştirir
        (nesneler derin birleşir, diziler tümden değişir, {$replace:1} içeren nesne tümden değişir;
         'X+' listeye ekler, 'X~' liste öğelerini id ile eşleyip yalnız metinlerini birleştirir).
     3) Arayüz metinleri (index.html ve app.js'in ürettiği HTML) bir sözlükle çevrilir; DOM'a sonradan eklenen
        metinler MutationObserver ile yakalanır. Sözlük tam eşleşmedir, sayılı metinler için düzenli ifade kuralları vardır.
   Dil seçimi localStorage 'kalp.lang' içinde saklanır; ilk açılışta tarayıcı diline bakılır. */
(function(){
'use strict';
let lang='tr';
const nav=()=>{ try{ return (navigator.language||'tr').toLowerCase().startsWith('tr')?'tr':'en'; }catch(e){ return 'tr'; } };
try{ const s=localStorage.getItem('kalp.lang'); lang=(s==='tr'||s==='en')?s:nav(); }catch(e){ lang=nav(); }
document.documentElement.lang=lang; document.documentElement.dataset.lang=lang;

const packs=[], dict=new Map(), rules=[];
function merge(t,s){
  for(const k of Object.keys(s)){
    const v=s[k];
    if(k.endsWith('~')&&Array.isArray(v)){ const a=t[k.slice(0,-1)]; if(Array.isArray(a)) for(const e of v){ const f=e.id!=null?'id':'k', x=a.find(o=>o&&o[f]===e[f]); if(x) merge(x,e); } continue; } // 'X~': öğeleri id (ya da k) ile eşleyip birleştir
    if(k.endsWith('+')&&Array.isArray(v)){ const b=k.slice(0,-1); t[b]=(Array.isArray(t[b])?t[b]:[]).concat(v); continue; } // 'X+': listeye ekle
    if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof v!=='function'){
      if(v.$replace){ const c=Object.assign({},v); delete c.$replace; t[k]=c; continue; }
      if(!t[k]||typeof t[k]!=='object'||Array.isArray(t[k])) t[k]={};
      merge(t[k],v);
    } else t[k]=v;
  }
}
const norm=s=>s.replace(/\s+/g,' ').trim();
/* Tek bir metni çevir: önce tam eşleşme, sonra kurallar. Bulunamazsa null. */
function tr(s){
  if(lang!=='en'||!s) return null;
  const k=norm(s); if(!k) return null;
  let out=dict.get(k);
  if(out==null) for(const [re,rep] of rules){ if(re.test(k)){ out=k.replace(re,rep); break; } }
  if(out==null) return null;
  const lead=s.match(/^\s*/)[0], tail=s.match(/\s*$/)[0];
  return lead+out+tail;
}
const ATTRS=['title','aria-label','placeholder','alt'];
function trAttrs(el){
  for(const a of ATTRS){ const v=el.getAttribute&&el.getAttribute(a); if(v){ const o=tr(v); if(o!=null&&o!==v) el.setAttribute(a,o); } }
}
function trTree(root){
  if(!root) return;
  if(root.nodeType===3){ const o=tr(root.data); if(o!=null&&o!==root.data) root.data=o; return; }
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11) return;
  if(root.nodeType===1){ if(root.tagName==='SCRIPT'||root.tagName==='STYLE') return; trAttrs(root); }
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType===1&&(n.tagName==='SCRIPT'||n.tagName==='STYLE')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n; while((n=w.nextNode())){
    if(n.nodeType===3){ const o=tr(n.data); if(o!=null&&o!==n.data) n.data=o; }
    else trAttrs(n);
  }
}
let applied=false, obs=null;
const I={
  get lang(){ return lang; },
  en:lang==='en',
  /* Çeviri paketi ekle. ui: {türkçe: english}, rules: [[RegExp, değiştirme], ...] */
  add(p){ packs.push(p); if(p.UI) for(const k in p.UI) dict.set(norm(k),p.UI[k]); if(p.RULES) for(const r of p.RULES) rules.push(r); },
  /* Kısa yol: İngilizcede b, Türkçede a */
  L:(a,b)=>lang==='en'?b:a,
  t:s=>{ const o=tr(s); return o==null?s:o; },
  apply(){
    if(applied) return; applied=true;
    if(lang!=='en') return;
    for(const p of packs){
      const c=Object.assign({},p); delete c.UI; delete c.RULES;
      if(c.ECG12){ if(window.KalpECG12) merge(window.KalpECG12,c.ECG12); delete c.ECG12; }
      window.KALP=window.KALP||{}; merge(window.KALP,c);
    }
    document.title=I.t(document.title);
    const md=document.querySelector('meta[name="description"]'); if(md&&md.content) md.content=I.t(md.content);
    trTree(document.body);
    obs=new MutationObserver(list=>{
      for(const m of list){
        if(m.type==='characterData') trTree(m.target);
        else if(m.type==='attributes') trAttrs(m.target);
        else for(const n of m.addedNodes) trTree(n);
      }
    });
    obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
    document.documentElement.classList.add('i18n-ok');
  },
  set(l){
    if(l!=='tr'&&l!=='en') return;
    try{ localStorage.setItem('kalp.lang',l); }catch(e){}
    if(l===lang) return;
    location.reload();
  }
};
window.KalpI18n=I;
/* İngilizce paketleri yalnız gerektiğinde yükle (betik bu noktaya, sırayla eklenir) */
if(lang==='en') for(const f of ['en-content','en-scenarios','en-lessons','en-quiz','en-cases','en-cases2','en-patients','en-scenarios2','en-cases3','en-organ-kalp','en-ui'])
  document.write('<script src="js/'+f+'.js"><\/script>');
})();
