/* Kalp Simülatörü: Hasta oluştur ve senaryo oluştur.
   HASTA: formdaki seçenekler (kronik hastalık, anlık durum, kullandığı ilaç, alerji). Her seçeneğin kısa bir anahtarı var.
   RX: hastalığa göre tedavi seçenekleri. Her seçenek:
     n ad · cls sınıf/rol · dose doz ve uygulama · note kısa açıklama · first ilk basamak mı
     base  hastalığın kendisinden gelen uyarı [düzey, neden]   (düzey: 'ok' | 'info' | 'warn' | 'no')
     rules hastaya özel uyarılar [[anahtar, düzey, neden], ...]  anahtar '!x' ise "x yoksa" demektir
     calc  yaş/kilo/cinsiyetten hesaplanan uyarı: P => [düzey, neden] | null
     anim  uygulanınca kalpte oynatılan animasyon {k, t, c}  ·  next  sonrasında geçilen ritim  ·  res  uygulama sonrası not
   Değerler erişkin içindir; ESC 2020–2024, ERC 2021 ve AHA kılavuzlarından özetlenmiştir. Eğitim amaçlıdır. */
(function(){
'use strict';
const HASTA={
  kronik:[['astim','Astım'],['koah','KOAH'],['hfref','Kalp yetmezliği (EF <%40)'],['kah','Koroner arter hastalığı'],['kbh','Kronik böbrek hastalığı (eGFR <30)'],
    ['kc','Karaciğer sirozu'],['dm','Diyabet'],['ht','Hipertansiyon'],['inme','İnme / TİA öyküsü'],['kanama','Aktif ya da yakın zamanda majör kanama'],['gebe','Gebelik']],
  durum:[['inst','Hemodinamik instabil (SKB <90, şok, bilinç bulanıklığı, iskemik ağrı, akut KY)']],
  ilac:[['bb','Beta bloker'],['kkb','Verapamil / diltiazem'],['dig','Digoksin'],['antikoag','Varfarin ya da DOAK'],['pde5','Sildenafil / tadalafil (son 48 saat)'],
    ['qt','QT uzatan ilaç (ör. azitromisin, haloperidol, sotalol)'],['dipir','Dipiridamol'],['teof','Teofilin / aminofilin'],['acei','ACEİ / ARB / spironolakton']],
  alerji:[['asa','Aspirin / NSAİİ'],['hit','Heparin (HIT öyküsü)'],['kontrast','İyotlu kontrast madde'],['amio','Amiodaron'],['lido','Lidokain / amid lokal anestezik'],['pen','Penisilin']]
};
const ALL={}; for(const g in HASTA) for(const [k,n] of HASTA[g]) ALL[k]=n;

/* Ortak parçalar */
const IV=(t,c)=>({k:'iv',t,c});
const CV=(t)=>({k:'cardiovert',t});
const amio=(dose,note,next)=>({n:'Amiodaron',cls:'Antiaritmik (sınıf III)',dose,note,anim:IV('IV amiodaron',0xb5651d),next,
  rules:[['amio','no','Amiodaron alerjisi var.'],['kontrast','warn','Amiodaron iyot içerir; prospektüste iyot aşırı duyarlılığı kontrendikasyon sayılır. Kontrast reaksiyonu gerçek iyot alerjisi değildir, yine de dikkat.'],
    ['qt','warn','QT uzatan ilaçla birlikte torsades riski artar.'],['dig','warn','Digoksin düzeyini yaklaşık iki katına çıkarır: digoksin dozunu yarıya indir.'],
    ['antikoag','info','Varfarin etkisini artırır: INR yakın izlenmeli.'],['kc','warn','Hepatotoksik: karaciğer hastalığında dikkat.'],['gebe','warn','Fetal tiroid ve gelişim etkileri: gebelikte mümkünse kaçın.']]});
const sync=(j,next,extra)=>({n:'Senkronize elektriksel kardiyoversiyon',cls:'Elektriksel tedavi',dose:j+', sedasyon/analjezi altında, QRS’e senkronize',
  note:'Hemodinamik instabil taşiaritmide ilk tedavi.',anim:CV('Senkronize kardiyoversiyon'),next,rules:[['inst','info','Bu hasta instabil: ilaçla vakit kaybetmeden ilk tercih.']].concat(extra||[])});
const bbIV={n:'Metoprolol',cls:'Beta bloker (IV)',dose:'2,5–5 mg IV 2 dk’da; 5 dk arayla, toplam 15 mg’a kadar',note:'Hız kontrolü.',anim:IV('IV metoprolol',0x1f8fe0),
  rules:[['astim','warn','Kardiyoselektif olsa da bronkospazm yapabilir; aktif ya da ağır astımda kaçın.'],['koah','info','KOAH’ta kardiyoselektif beta bloker genelde tolere edilir.'],
    ['hfref','warn','Akut dekompanse KY’de verilmez; stabil HFrEF’te düşük dozla dikkatli.'],['inst','no','Hipotansiyonu ve düşük debiyi derinleştirir.'],
    ['kkb','warn','IV verapamil/diltiazem ile birlikte AV blok ve hipotansiyon riski.'],['bb','info','Zaten beta bloker kullanıyor: doz ve uyumu gözden geçir.']]};
const ndhp=(name,dose,next)=>({n:name,cls:'Nondihidropiridin KKB (IV)',dose,note:'AV düğümünü yavaşlatır.',anim:IV('IV '+name.toLocaleLowerCase('tr'),0x1f8fe0),next,
  rules:[['hfref','no','LVEF <%40’ta negatif inotrop etki: kontrendike.'],['inst','no','Hipotansiyonu derinleştirir.'],['bb','warn','Beta bloker kullanan hastada AV blok, bradikardi ve hipotansiyon riski.'],
    ['dig','warn','Digoksin düzeyini artırır ve AV blok riskini büyütür.'],['kkb','info','Zaten oral KKB kullanıyor.']]});
const doak={n:'Apiksaban (DOAK)',cls:'Antikoagülan',dose:'5 mg 2×1 (≥2 kriterde 2,5 mg 2×1: yaş ≥80, kilo ≤60 kg, kreatinin ≥1,5 mg/dL)',
  note:'İnme önleme: CHA₂DS₂-VA ≥2’de önerilir, 1’de düşünülür.',
  rules:[['gebe','no','DOAK gebelikte kontrendike: düşük molekül ağırlıklı heparin kullanılır.'],['kanama','no','Aktif kanamada antikoagülan başlanmaz.'],
    ['kbh','warn','KrKl <15’te önerilmez; 15–29’da doz azaltılır, dikkat.'],['kc','warn','Child-Pugh C sirozda kontrendike; B’de dikkat.'],['antikoag','info','Zaten antikoagülan kullanıyor: ikinci bir ajan ekleme.']],
  calc:P=>{ let n=0; if(P.yas>=80)n++; if(P.kilo&&P.kilo<=60)n++; if(P.sel.has('kbh'))n++; return n>=2?['info',`Bu hastada doz azaltma kriteri ${n}: 2,5 mg 2×1.`]:null; }};
const varf={n:'Varfarin',cls:'Antikoagülan (VKA)',dose:'Hedef INR 2–3',note:'Mekanik kapak ya da orta-ağır mitral darlıkta tercih; diğerlerinde DOAK önce gelir.',
  rules:[['gebe','no','Teratojen (özellikle 6–12. haftalar): gebelikte kullanılmaz.'],['kanama','no','Aktif kanamada başlanmaz.'],['kc','warn','Sirozda INR zaten bozuk olabilir; yakın izlem.']]};
const causeAV={n:'AV düğümü yavaşlatan ilaçları gözden geçir',cls:'Nedene yönelik',dose:'Beta bloker, verapamil/diltiazem, digoksin, amiodaron',
  note:'İlaç kaynaklı bradikardi sık ve geri döndürülebilir.',base:['info',''],
  rules:[['bb','info','Beta bloker kullanıyor: kes; zehirlenmede glukagon (3–10 mg IV).'],['kkb','info','KKB kullanıyor: kes; zehirlenmede IV kalsiyum ve yüksek doz insülin.'],
    ['dig','info','Digoksin kullanıyor: düzey ve potasyum bak; ağır toksisitede digoksine özgü Fab.']]};
const atropin=(base,next)=>({n:'Atropin',cls:'Antikolinerjik',dose:'0,5 mg IV, 3–5 dk arayla, en fazla 3 mg',note:'Semptomatik bradikardide ilk ilaç.',first:!base,base,
  anim:IV('IV atropin',0x7b4dff),next,res:next?'Kalp hızı yükseldi.':'Yanıt yok ya da yetersiz: pacinge geç.'});
const tcp={n:'Transkütan pacing',cls:'Elektriksel tedavi',dose:'Demand modda 60–70/dk, mekanik yakalanma (nabız) doğrulanmalı; analjezi/sedasyon',
  note:'Atropine yanıtsız instabil bradikardide köprü tedavi.',anim:CV('Transkütan pacing'),next:'paced',rules:[['inst','info','Bu hasta instabil: atropin yanıtsızsa hemen.']]};
const adrInf={n:'Adrenalin infüzyonu',cls:'Kronotrop',dose:'2–10 µg/dk IV infüzyon (alternatif: dopamin 5–20 µg/kg/dk, izoprenalin 5 µg/dk)',note:'Pacing hazırlanırken köprü.',anim:IV('Adrenalin infüzyonu',0xe0523f),
  rules:[['kah','warn','Miyokard oksijen tüketimini artırır: iskemi riski.']]};
const ppm=(first)=>({n:'Kalıcı kalp pili',cls:'Cihaz',dose:'Geri döndürülebilir neden (ilaç, iskemi, elektrolit) dışlandıktan sonra',note:'Mobitz II ve tam blokta kalıcı tedavi.',first,
  anim:IV('Kalıcı kalp pili yerleştiriliyor',0xf2a000),next:'paced'});
const asa=(dose)=>({n:'Aspirin',cls:'Antiagregan',dose,first:true,anim:IV('Aspirin',0xe8e2d6),
  rules:[['asa','no','Aspirin alerjisi: klopidogrel ile devam; gerekirse aspirin desensitizasyonu.'],['kanama','no','Aktif kanamada verilmez.'],['antikoag','info','OAK kullanan hastada kanama riski: tedavi süresi kısa tutulur.']]});
const heparin=(dose,note)=>({n:'Heparin (UFH)',cls:'Antikoagülan',dose,note,anim:IV('IV heparin',0x5b6fd6),
  rules:[['hit','no','HIT öyküsü: heparin verilmez; bivalirudin ya da argatroban.'],['kanama','no','Aktif kanamada verilmez.'],['antikoag','warn','Zaten OAK kullanıyor: INR/ilaç zamanlamasına göre doz.']]});
const nitrat=(base)=>({n:'Nitrat (dilaltı)',cls:'Vazodilatör',dose:'0,4 mg SL, 5 dk arayla 3 kez; ağrı sürerse IV infüzyon',note:'Ağrı, HT ve akciğer konjesyonu için.',base,
  rules:[['pde5','no','Son 24–48 saatte PDE5 inhibitörü: ağır, dirençli hipotansiyon.'],['inst','no','SKB <90’da verilmez.']]});
const fibrin={n:'Fibrinolitik (tenekteplaz)',cls:'Trombolitik',dose:'Kiloya göre tek bolus (30–50 mg); ≥75 yaşta yarım doz',
  note:'Primer PKG 120 dk içinde yapılamayacaksa ve ağrı <12 saatse.',
  rules:[['kanama','no','Aktif kanama: mutlak kontrendikasyon.'],['inme','warn','İskemik inme son 3 ayda ise mutlak, daha eskiyse rölatif kontrendikasyon; hemorajik inme öyküsü her zaman mutlak.'],
    ['antikoag','warn','OAK kullanımı rölatif kontrendikasyon.'],['ht','info','Kontrolsüz HT (>180/110) rölatif kontrendikasyon.'],['gebe','warn','Gebelik rölatif kontrendikasyon.']],
  calc:P=>P.yas>=75?['info','Bu hasta ≥75 yaşında: yarım doz.']:null};

const AF=(cvJ)=>[
  sync(cvJ,'nsr',[['!antikoag','warn','AF ≥48 saat ya da süresi bilinmiyorsa elektif kardiyoversiyon öncesi ≥3 hafta antikoagülasyon ya da TEE ile trombüs dışlanmalı (instabilse beklenmez).']]),
  Object.assign({},bbIV,{first:true}),
  ndhp('Diltiazem','0,25 mg/kg IV 2 dk’da (ortalama 15–20 mg); 15 dk sonra 0,35 mg/kg',null),
  {n:'Digoksin',cls:'Kardiyak glikozit',dose:'0,25–0,5 mg IV yükleme; 24 saatte en fazla 1–1,5 mg',note:'Etkisi saatler içinde başlar; KY’de hız kontrolüne eklenir.',anim:IV('IV digoksin',0x12a36b),
    rules:[['kbh','warn','Böbrekten atılır: doz azalt, düzey izle.'],['dig','warn','Zaten digoksin kullanıyor: toksisite riski, önce düzey.'],['hfref','info','HFrEF’te beta blokere eklenebilir.']]},
  amio('300 mg IV 1 saatte (KY ya da instabilitede), sonra 900 mg/24 sa','Ritim ve hız kontrolü; HFrEF’te güvenli seçenek.','nsr'),
  doak,varf];
const RX={
  af:AF('Bifazik 120–200 J'),
  flutter:AF('Bifazik 50–100 J').concat([{n:'Kavotriküspit istmus ablasyonu',cls:'Girişimsel',dose:'Elektif',note:'Tipik flutterda başarı >%90: tekrarlayanlarda ilk tercih.'}]),
  svt:[
    {n:'Modifiye Valsalva manevrası',cls:'Vagal manevra',dose:'Yarı oturur pozisyonda 15 sn 40 mmHg ıkınma, ardından sırtüstü yatırıp bacakları 45° kaldırma',
      note:'Stabil SVT’de ilk basamak (başarı ~%40).',first:true,anim:{k:'vagal',t:'Modifiye Valsalva'},res:'Bu sefer sonlanmadı: adenozine geç.'},
    {n:'Adenozin',cls:'Purinerjik ajan',dose:'6 mg hızlı IV puşe + 20 mL SF yıkama; gerekirse 12 mg, sonra 12 mg (18 mg)',note:'AV düğümü saniyeler içinde bloke eder.',first:true,
      anim:IV('Adenozin hızlı IV bolus',0x2f7bff),next:'nsr',res:'Kısa bir asistoliyi takiben sinüs ritmi.',
      rules:[['astim','warn','Bronkospazm yapabilir: ağır/aktif astımda kaçın, hafif astımda bronkodilatör hazırken verilebilir.'],['koah','warn','Bronkospazm riski: dikkat.'],
        ['dipir','warn','Dipiridamol adenozin yıkımını engeller: etkisi artar, başlangıç dozu 3 mg.'],['teof','warn','Teofilin adenozin reseptörlerini bloke eder: etkisi azalır, daha yüksek doz gerekebilir.'],
        ['inst','warn','İnstabil hastada kardiyoversiyonu geciktirme.']]},
    ndhp('Verapamil','5–10 mg IV 2 dk’da; 15–30 dk sonra tekrar','nsr'),
    Object.assign({},bbIV,{next:'nsr'}),
    sync('Bifazik 70–120 J','nsr')],
  wpw:[
    sync('Bifazik 120–200 J','nsr',[]),
    {n:'Prokainamid',cls:'Antiaritmik (sınıf Ia)',dose:'10–15 mg/kg IV, 20–50 mg/dk hızla',note:'Preeksite AF’de aksesuar yoldan iletimi yavaşlatır.',first:true,anim:IV('IV prokainamid',0xb5651d),next:'nsr',
      rules:[['hfref','warn','Negatif inotrop: ağır KY’de dikkat.'],['qt','warn','QT’yi uzatır: QT uzatan ilaçla birlikte dikkat.'],['inst','no','İnstabilse kardiyoversiyon.'],['kbh','warn','Aktif metaboliti (NAPA) birikir.']]},
    {n:'İbutilid',cls:'Antiaritmik (sınıf III)',dose:'1 mg IV 10 dk’da (<60 kg: 0,01 mg/kg); gerekirse bir kez tekrar',note:'Alternatif farmakolojik kardiyoversiyon.',anim:IV('IV ibutilid',0xb5651d),next:'nsr',
      rules:[['qt','warn','Torsades riski; QT uzatan ilaçla verilmez.']]},
    {n:'Adenozin',cls:'AV düğüm blokörü',dose:'—',base:['no','Preeksite AF’de AV düğümünü bloke etmek iletimi aksesuar yola kaydırır, hızı artırıp VF’ye yol açabilir.']},
    {n:'Verapamil / diltiazem',cls:'AV düğüm blokörü',dose:'—',base:['no','Preeksite AF’de kontrendike: aksesuar yoldan hızlı iletim ve VF riski.']},
    {n:'Digoksin',cls:'AV düğüm blokörü',dose:'—',base:['no','Aksesuar yolun refrakter süresini kısaltır: VF riski.']},
    {n:'Beta bloker (IV)',cls:'AV düğüm blokörü',dose:'—',base:['no','Preeksite AF’de AV düğüm blokörleri verilmez.']},
    {n:'Kateter ablasyonu',cls:'Girişimsel',dose:'Elektif',note:'Semptomatik WPW’de ve yüksek riskli yolda kalıcı tedavi.'}],
  vt:[
    sync('Bifazik 120–150 J, artarak','nsr',[]),
    amio('300 mg IV 10–20 dk’da, sonra 900 mg/24 sa','Yapısal kalp hastalığı ya da KY’de tercih.','nsr'),
    {n:'Prokainamid',cls:'Antiaritmik (sınıf Ia)',dose:'10–15 mg/kg IV, 20–50 mg/dk hızla',note:'Yapısal kalp hastalığı yoksa stabil VT’de etkili (ESC 2022).',anim:IV('IV prokainamid',0xb5651d),next:'nsr',
      rules:[['hfref','warn','Negatif inotrop: ağır KY’de kaçın.'],['qt','warn','QT’yi uzatır.'],['inst','no','İnstabilse kardiyoversiyon.'],['kbh','warn','NAPA birikir.']]},
    {n:'Lidokain',cls:'Antiaritmik (sınıf Ib)',dose:'1–1,5 mg/kg IV, sonra 0,5–0,75 mg/kg; infüzyon 1–4 mg/dk',note:'Özellikle iskemik VT’de alternatif.',anim:IV('IV lidokain',0x12a36b),next:'nsr',
      rules:[['lido','no','Lidokain/amid lokal anestezik alerjisi.'],['kc','warn','Karaciğerde yıkılır: doz azalt.'],['hfref','warn','KY’de klirens azalır: doz azalt.']]},
    {n:'Verapamil',cls:'KKB',dose:'—',base:['no','Geniş QRS’li taşikardi aksi kanıtlanana kadar VT’dir; verapamil hemodinamik çöküşe yol açabilir.']},
    {n:'Elektrolitleri düzelt',cls:'Destek',dose:'K⁺ >4,0 mmol/L, Mg²⁺ >2,0 mg/dL',note:'Tekrarı önler.'}],
  torsades:[
    {n:'Magnezyum sülfat',cls:'Elektrolit',dose:'2 g IV 10–15 dk’da (nabızsızsa bolus); gerekirse tekrar ya da infüzyon',note:'Serum Mg normal olsa bile ilk tedavi.',first:true,anim:IV('IV magnezyum sülfat',0x0f6fd6),next:'nsr',
      rules:[['kbh','warn','Hipermagnezemi riski: tekrar dozlarda düzey izle.']]},
    {n:'QT uzatan ilaçları kes',cls:'Nedene yönelik',dose:'Antiaritmik, makrolid, antipsikotik, metadon vb.',first:true,base:['info',''],rules:[['qt','info','Bu hastanın kullandığı QT uzatan ilaç hemen kesilmeli.']]},
    {n:'Potasyum replasmanı',cls:'Elektrolit',dose:'Hedef K⁺ 4,5–5,0 mmol/L',rules:[['kbh','warn','Böbrek yetmezliğinde yavaş ve düzey izleyerek.']]},
    {n:'Geçici overdrive pacing',cls:'Elektriksel tedavi',dose:'90–110/dk (alternatif: izoprenalin infüzyonu)',note:'Bradikardi ve duraklamalara bağlı tekrarlayan torsadesta.'},
    {n:'Defibrilasyon',cls:'Elektriksel tedavi',dose:'Nabızsızsa ya da VF’ye dönerse asenkron 150–200 J',anim:{k:'defib',t:'Defibrilasyon'},next:'nsr'},
    {n:'Amiodaron',cls:'Antiaritmik',dose:'—',base:['no','QT’yi daha da uzatır: torsadesı kötüleştirir.']}],
  vf:[
    {n:'Defibrilasyon',cls:'Elektriksel tedavi',dose:'Bifazik 150–200 J; sonra eşit ya da artan enerji. Şoktan hemen sonra 2 dk KPR',first:true,anim:{k:'defib',t:'Defibrilasyon'},next:'nsr',res:'Spontan dolaşım döndü.'},
    {n:'Kardiyopulmoner resüsitasyon',cls:'Temel yaşam desteği',dose:'100–120/dk, 5–6 cm derinlik, 30:2; kesintiyi <5 sn tut',first:true,anim:{k:'cpr',t:'Göğüs kompresyonları'}},
    {n:'Adrenalin',cls:'Vazopresör',dose:'1 mg IV/IO 3. şoktan sonra, sonra her 3–5 dk',anim:IV('Adrenalin 1 mg IV',0xe0523f)},
    amio('300 mg IV/IO bolus 3. şoktan sonra; 150 mg 5. şoktan sonra','Şoka dirençli VF/nabızsız VT.',null),
    {n:'Lidokain',cls:'Antiaritmik',dose:'1–1,5 mg/kg IV/IO (amiodaron yoksa)',anim:IV('IV lidokain',0x12a36b),rules:[['lido','no','Lidokain alerjisi.']]},
    {n:'Geri döndürülebilir nedenler (4H 4T)',cls:'Nedene yönelik',dose:'Hipoksi, hipovolemi, hipo/hiperkalemi, hipotermi; tromboz, tamponad, tansiyon pnömotoraks, toksinler'}],
  asys:[
    {n:'Kardiyopulmoner resüsitasyon',cls:'Temel yaşam desteği',dose:'100–120/dk, 30:2; ritim kontrolü 2 dk’da bir',first:true,anim:{k:'cpr',t:'Göğüs kompresyonları'}},
    {n:'Adrenalin',cls:'Vazopresör',dose:'1 mg IV/IO mümkün olan en kısa sürede, sonra her 3–5 dk',first:true,anim:IV('Adrenalin 1 mg IV',0xe0523f)},
    {n:'Defibrilasyon',cls:'Elektriksel tedavi',dose:'—',base:['no','Şok verilebilir ritim değil. İnce VF’yi dışlamak için kazancı artır ve başka derivasyona bak.']},
    {n:'Atropin',cls:'Antikolinerjik',dose:'—',base:['no','Asistoli/NEA’da artık önerilmiyor (ERC 2010’dan beri).']},
    {n:'Geri döndürülebilir nedenler (4H 4T)',cls:'Nedene yönelik',dose:'Özellikle hiperkalemi, hipoksi, hipovolemi, tamponad'}],
  brady:[atropin(null,'nsr'),tcp,adrInf,causeAV],
  arrest:[atropin(null,'nsr'),tcp,causeAV,ppm(false)],
  mobitz2:[atropin(['warn','İnfranodal blokta çoğunlukla etkisiz; pacinge köprü olabilir.'],null),tcp,adrInf,ppm(true),causeAV],
  avb3:[atropin(['warn','Geniş QRS’li (infranodal) tam blokta genellikle etkisiz; dar QRS’de denenebilir.'],null),tcp,adrInf,ppm(true),causeAV],
  avb1:[causeAV,{n:'Gözlem',cls:'İzlem',dose:'Tek başına tedavi gerekmez',first:true}],
  wenck:[causeAV,{n:'Gözlem',cls:'İzlem',dose:'Asemptomatikse tedavi gerekmez; inferior MI’da sık ve geçicidir',first:true},atropin(null,'nsr')],
  stemi_ant:[],stemi_inf:[],
  hyperk:[
    {n:'Kalsiyum glukonat %10',cls:'Membran stabilizasyonu',dose:'30 mL IV 5–10 dk’da (ya da CaCl₂ %10 10 mL); EKG düzelmezse tekrar',note:'K⁺’u düşürmez; EKG değişikliği varsa ilk ilaç, etkisi dakikalar içinde.',first:true,anim:IV('IV kalsiyum glukonat',0x9a7b4f),
      res:'QRS daraldı; potasyum hâlâ yüksek, hücre içine kaydır.',rules:[['dig','warn','Digoksin kullanan hastada yavaş ver (20–30 dk). “Taş kalp” endişesi zayıf kanıta dayanır, gerekiyorsa verilir.']]},
    {n:'İnsülin + dekstroz',cls:'K⁺’u hücre içine kaydırma',dose:'10 Ü kısa etkili insülin IV + 25 g glukoz; saatlik kan şekeri',first:true,anim:IV('İnsülin + dekstroz',0x12a36b),next:'nsr',
      rules:[['kbh','warn','Hipoglisemi riski yüksek: dekstroz infüzyonu ve saatlik şeker.'],['dm','info','Kan şekeri >250 mg/dL ise ek dekstroz gerekmeyebilir.']]},
    {n:'Salbutamol nebül',cls:'K⁺’u hücre içine kaydırma',dose:'10–20 mg nebül',rules:[['bb','info','Beta bloker kullananda etkisi azalabilir.'],['kah','warn','Taşikardi ve iskemi yapabilir.']]},
    {n:'Sodyum bikarbonat',cls:'Destek',dose:'Yalnız metabolik asidoz eşlik ediyorsa'},
    {n:'Potasyum bağlayıcı',cls:'Atılımı artırma',dose:'Sodyum zirkonyum siklosilikat 10 g 3×1'},
    {n:'Hemodiyaliz',cls:'Atılımı artırma',dose:'Dirençli hiperkalemide',rules:[['kbh','info','İleri böbrek hastasında erken diyaliz planla.']]},
    {n:'K⁺ yükselten ilaçları kes',cls:'Nedene yönelik',dose:'ACEİ, ARB, MRA, NSAİİ, trimetoprim',rules:[['acei','info','Bu hasta ACEİ/ARB/MRA kullanıyor: kes.']]}],
  hypok:[
    {n:'IV potasyum klorür',cls:'Elektrolit',dose:'Periferden ≤10 mmol/sa, santral hattan ≤20 mmol/sa; monitörle',first:true,anim:IV('IV potasyum',0x12a36b),next:'nsr',rules:[['kbh','warn','Böbrek yetmezliğinde yavaş ve sık düzeyle.']]},
    {n:'Magnezyum',cls:'Elektrolit',dose:'2 g IV',note:'Hipomagnezemi düzelmeden potasyum yükselmez.',first:true,anim:IV('IV magnezyum',0x0f6fd6),rules:[['kbh','warn','Hipermagnezemi riski.']]},
    {n:'Oral KCl',cls:'Elektrolit',dose:'40–100 mmol/gün bölünmüş dozlarda',note:'Hafif hipokalemide.'},
    {n:'Riskli ilaçları gözden geçir',cls:'Nedene yönelik',dose:'Loop/tiyazid diüretik, digoksin, QT uzatanlar',rules:[['dig','warn','Hipokalemi digoksin toksisitesini artırır.'],['qt','warn','QT zaten uzamış: QT uzatan ilacı kes.']]}],
  pe:[
    heparin('80 Ü/kg IV bolus, 18 Ü/kg/sa infüzyon (ya da DMAH 1 mg/kg 2×1)','Şüphe yüksekse tanı beklenmeden başlanır.'),
    {n:'Sistemik tromboliz (alteplaz)',cls:'Trombolitik',dose:'100 mg 2 saatte',note:'Yüksek riskli (şok, hipotansiyon) PE’de.',anim:IV('Alteplaz',0xe0523f),next:'nsr',
      base:['warn','Yalnız hemodinamik instabilitede; orta riskte rutin değil.'],rules:[['inst','info','Bu hasta instabil: tromboliz endikasyonu var.'],['kanama','no','Aktif kanama: mutlak kontrendikasyon.'],['inme','warn','İnme öyküsü: kontrendikasyonları gözden geçir.']]},
    Object.assign({},doak,{dose:'10 mg 2×1 7 gün, sonra 5 mg 2×1',note:'Stabil hastada uzun dönem.',calc:null}),
    {n:'Oksijen ve dikkatli sıvı',cls:'Destek',dose:'SpO₂ <%90’da oksijen; RV yüklenmesinde agresif sıvıdan kaçın'}],
  tamponade:[
    {n:'Perikardiyosentez',cls:'Girişimsel',dose:'Eko eşliğinde subksifoid yaklaşım',note:'Kesin tedavi; hipotansif tamponadda acil.',first:true,next:'tachy',res:'Basınç düştü; nabız ve tansiyon düzeliyor.'},
    {n:'IV sıvı',cls:'Destek',dose:'250–500 mL bolus',note:'Önyükü destekler, drenaja köprü.'},
    {n:'Diüretik / nitrat',cls:'—',dose:'—',base:['no','Önyükü azaltır: tamponadda dolaşım kollapsına yol açabilir.']},
    {n:'Pozitif basınçlı ventilasyon',cls:'—',dose:'—',base:['warn','Venöz dönüşü azaltır; mümkünse drenaj önce.']},
    {n:'Antikoagülanı durdur',cls:'Nedene yönelik',dose:'Hemorajik efüzyonda',rules:[['antikoag','warn','Hasta antikoagülan kullanıyor: kes, gerekirse geri çevir.']]}],
  peri:[
    {n:'İbuprofen (ya da aspirin)',cls:'NSAİİ',dose:'İbuprofen 600 mg 3×1 1–2 hafta (aspirin 750–1000 mg 3×1), PPI ile; azaltarak kes',first:true,
      rules:[['asa','no','Aspirin/NSAİİ alerjisi: kolşisin + düşük doz kortikosteroid.'],['kbh','warn','Böbrek fonksiyonunu bozar.'],['kanama','warn','GİS kanama riski.'],['antikoag','warn','Antikoagülanla kanama riski artar.'],['gebe','warn','20. haftadan sonra NSAİİ’den kaçın.'],['hfref','warn','KY’de sıvı tutulumu yapar.']]},
    {n:'Kolşisin',cls:'Antiinflamatuvar',dose:'0,5 mg 2×1 (<70 kg: 1×1), 3 ay',note:'Nüksü yarıya indirir.',first:true,
      rules:[['kbh','warn','Böbrek yetmezliğinde doz azalt ya da kaçın.'],['kc','warn','Karaciğer yetmezliğinde dikkat.']],calc:P=>P.kilo&&P.kilo<70?['info','Bu hasta <70 kg: 0,5 mg 1×1.']:null},
    {n:'Kortikosteroid',cls:'İkinci basamak',dose:'Prednizon 0,2–0,5 mg/kg/gün',note:'NSAİİ verilemiyorsa ya da otoimmün nedende; nüksü artırabilir.'}],
  tachy:[{n:'Nedeni tedavi et',cls:'Nedene yönelik',dose:'Ağrı, ateş, hipovolemi, anemi, hipoksi, tirotoksikoz, PE',first:true},
    {n:'Hız düşürücü ilaç',cls:'Beta bloker',dose:'—',base:['warn','Kompansatuvar sinüs taşikardisini bastırmak tehlikeli olabilir; neden aranmalı.']}],
  pvc:[{n:'Güvence ve tetikleyiciler',cls:'İzlem',dose:'Kafein, alkol, uykusuzluk, elektrolit',first:true},
    Object.assign({},bbIV,{dose:'Oral metoprolol 25–100 mg/gün',note:'Semptomatik VES’te.'}),
    {n:'Kateter ablasyonu',cls:'Girişimsel',dose:'VES yükü >%10–15 ya da VES’e bağlı KY’de'}],
  nsr:[{n:'Tedavi gerekmez',cls:'—',dose:'Normal ritim',first:true}],
  rbbb:[{n:'Tek başına tedavi gerekmez',cls:'İzlem',dose:'Yeni RBBB + nefes darlığında PE’yi düşün',first:true}],
  lbbb:[{n:'Altta yatan hastalığı araştır',cls:'İzlem',dose:'Eko; yeni LBBB + iskemik ağrıda Sgarbossa ve STEMI eşdeğeri yaklaşımı',first:true},
    {n:'Kardiyak resenkronizasyon (CRT)',cls:'Cihaz',dose:'LBBB, QRS ≥150 ms ve EF ≤%35 olan semptomatik KY’de',rules:[['hfref','info','Bu hastada KY var: CRT uygunluğu değerlendirilmeli.']]}],
  paced:[{n:'Cihaz kontrolü',cls:'İzlem',dose:'Yakalama, algılama, pil ömrü',first:true}]
};
const stemi=inf=>[
  {n:'Primer PKG',cls:'Reperfüzyon',dose:'Tanıdan sonra ≤120 dk içinde (hedef ≤90 dk); radyal yol',note:'STEMI’de tercih edilen reperfüzyon.',first:true,anim:{k:'pci',t:'Primer PKG: balon ve stent'},next:'nsr',res:'Damar açıldı, ST segmenti geriliyor.',
    rules:[['kontrast','warn','Kontrast alerjisi: steroid + antihistaminik premedikasyon; PKG’yi geciktirme.'],['kbh','warn','Kontrast nefropatisi: kontrast miktarını sınırla, hidrasyon.']]},
  asa('150–300 mg çiğnenerek (ya da 75–250 mg IV)'),
  {n:'Tikagrelor',cls:'P2Y12 inhibitörü',dose:'180 mg yükleme, sonra 90 mg 2×1',first:true,
    rules:[['kanama','no','Aktif kanama.'],['antikoag','warn','OAK kullanan hastada tikagrelor yerine klopidogrel.'],['kc','warn','Orta-ağır karaciğer yetmezliğinde kontrendike.'],['inme','info','Hemorajik inme öyküsünde kontrendike.']]},
  {n:'Prasugrel',cls:'P2Y12 inhibitörü',dose:'60 mg yükleme (PKG sırasında), sonra 10 mg/gün',
    rules:[['inme','no','İnme/TİA öyküsünde kontrendike.'],['kanama','no','Aktif kanama.'],['antikoag','warn','OAK ile birlikte önerilmez.']],
    calc:P=>(P.yas>=75||(P.kilo&&P.kilo<60))?['warn','≥75 yaş ya da <60 kg: genelde önerilmez; verilecekse 5 mg idame.']:null},
  {n:'Klopidogrel',cls:'P2Y12 inhibitörü',dose:'600 mg yükleme, sonra 75 mg/gün',note:'OAK kullananda ya da güçlü P2Y12 verilemiyorsa.',rules:[['antikoag','info','OAK kullanan hastada tercih edilen P2Y12.']]},
  heparin('70–100 Ü/kg IV bolus (PKG sırasında)','PKG sırasında rutin antikoagülasyon.'),
  fibrin,
  nitrat(inf?['warn','Alt MI’da sağ ventrikül tutulumu (V4R’de ST yükselmesi) varsa önyük bağımlıdır: verme.']:null),
  Object.assign({},bbIV,{note:'KY bulgusu yoksa ağrı, taşikardi ya da HT için.',rules:bbIV.rules.concat([['hfref','no','Akut KY bulgusu varsa verilmez.']])}),
  {n:'Oksijen',cls:'Destek',dose:'Yalnız SpO₂ <%90 ise',note:'Normoksemide rutin oksijen yarar sağlamaz.'},
  {n:'Opioid (morfin)',cls:'Analjezi',dose:'2–4 mg IV titre',base:['info','Oral P2Y12 emilimini geciktirir; yalnız dirençli ağrıda.']}
].concat(inf?[{n:'IV sıvı',cls:'Destek',dose:'250–500 mL bolus',note:'Sağ ventrikül infarktına bağlı hipotansiyonda önyükü destekler.',rules:[['hfref','warn','KY’de dikkatli; akciğer konjesyonunu izle.']]}]:[]);
RX.stemi_ant=stemi(false); RX.stemi_inf=stemi(true);

const LV={ok:0,info:1,warn:2,no:3};
/* P: {yas, cins, kilo, boy, sel:Set} → her seçenek için {…, st, why:[[düzey, neden]]} */
function evalRx(cond,P){
  return (RX[cond]||[]).map((r,i)=>{
    const why=[]; if(r.base&&r.base[1]) why.push(r.base);
    for(const [k,l,w] of r.rules||[]){ const neg=k[0]==='!', key=neg?k.slice(1):k; if(neg!==P.sel.has(key)) why.push([l,w,key]); }
    if(r.calc){ const c=r.calc(P); if(c) why.push(c); }
    let st=r.base?r.base[0]:'ok'; for(const [l] of why) if(LV[l]>LV[st]) st=l;
    return Object.assign({},r,{i,st,why});
  });
}
window.KALP=Object.assign(window.KALP||{},{HASTA,HASTA_ALL:ALL,RX,evalRx,RXLV:LV});
})();
