/* Kalp Simülatörü: Fizyopatoloji katmanının tamamlanması (Aşama 1.4).
   1) Yeni durumlar: kalp yetmezliği (HFrEF/HFpEF), kapak hastalıkları, kardiyomiyopatiler, enfektif endokardit,
      miyokardit, akut romatizmal ateş. Alanlar scenarios.js ile aynıdır.
   2) Mevcut 27 durumun her birine "bulgu" (bul) ve "laboratuvar/görüntüleme" (lab) eklenir; kart
      neden → mekanizma → bulgu → EKG/lab sırasıyla okunur.
   3) Yeni durumlar için hasta oluşturucu tedavi seçenekleri (RX).
   Klinik referans: Harrison's Principles of Internal Medicine; değerler ESC/AHA kılavuzlarından özetlenmiştir. Eğitim amaçlıdır. */
(function(){
'use strict';
const K=window.KALP; const COND=K.COND;
K.CATS.push(['yapisal','Kalp yetmezliği, kapak ve kardiyomiyopati'],['enf','Enfeksiyöz ve inflamatuvar']);
COND.peri.cat='enf';

const NEW={
hfref:{cat:'yapisal',n:'Kalp yetmezliği, düşük ejeksiyon fraksiyonlu (HFrEF)',tag:'Kronik · dekompanse olabilir',lead:'V5',
  sum:'Sol ventrikül kasılma gücünü kaybetmiştir (LVEF ≤%40). Debiyi korumak için devreye giren nörohormonal sistemler kısa vadede yardım eder, uzun vadede yeniden şekillenmeyi (remodeling) ve konjesyonu hızlandırır.',
  why:['İskemik kalp hastalığı ve geçirilmiş MI (en sık)','Dilate kardiyomiyopati: genetik (TTN), alkol, antrasiklin, miyokardit sonrası','Uzun süreli kontrolsüz hipertansiyon, kapak hastalıkları','Taşikardiye bağlı kardiyomiyopati, peripartum kardiyomiyopati'],
  how:'Atım hacmi düşünce baroreseptör yükü azalır; sempatik sistem ve RAAS aktive olur. Anjiyotensin II vazokonstriksiyon ve aldosteron yoluyla tuz-su tutar, önyük artar; Frank–Starling eğrisi yassılaştığı için bu artış debiye yansımaz, akciğer ve sistemik konjesyon olarak geri döner. Sürekli katekolamin ve aldosteron etkisi miyosit apoptozu, fibrozis ve sferik genişleme yapar (remodeling). Natriüretik peptitler (BNP) karşı düzenleyicidir ama yetersiz kalır.',
  ecg:['Spesifik değil; çoğunlukla sinüs taşikardisi','Eski MI’ya ait patolojik Q dalgaları','LBBB ve geniş QRS (≥150 ms: CRT adayı)','AF sık eşlik eder'],
  bul:['Efor dispnesi, ortopne, paroksismal nokturnal dispne','S3 (ventriküler gallop), akciğerde bazal raller','Juguler venöz dolgunluk, hepatojuguler reflü, bilateral ödem','Düşük debi: soğuk ekstremite, oligüri, bilinç bulanıklığı'],
  lab:['NT-proBNP >125 pg/mL (kronik), >300 pg/mL (akut) yetersizliği destekler','Eko: LVEF ≤%40, genişlemiş LV, bölgesel ya da global hipokinezi','Akciğer grafisi: kardiyomegali, Kerley B çizgileri, plevral efüzyon','Na, K, kreatinin: diüretik ve RAAS blokajı izlemi için'],
  mus:'Sol ventrikül genişlemiş ve kasılması zayıf; atımlar küçük.',
  ner:'Sempatik aktivite kronik olarak yüksek (parlak); bu tablo beta blokörün neden yaşam uzattığını açıklar.',
  cli:'Dört temel ilaç sınıfı mortaliteyi azaltır: ARNI (ya da ACEİ/ARB), beta blokör, MRA ve SGLT2 inhibitörü. Konjesyonda lup diüretik semptom içindir. Seçilmiş hastada ICD ve CRT.',
  read:{Ritim:'Sinüs taşikardisi',P:'Var',PR:'170 ms',QRS:'Geniş (LBBB)'},
  r:{atrial:'sinus',rate:96,sv:0.01,pr:0.17,morph:'lbbbV1',act:'lbbb'},off:[],nerveOn:['symp'],fx:{lvDilate:1}},
hfpef:{cat:'yapisal',n:'Kalp yetmezliği, korunmuş ejeksiyon fraksiyonlu (HFpEF)',tag:'Diyastolik disfonksiyon',lead:'V5',
  sum:'LVEF ≥%50 ama ventrikül sertleşmiştir; normal hacmi ancak yüksek dolum basıncıyla alabilir. Yaşlı, hipertansif, obez ve diyabetik hastalarda sıktır.',
  why:['Hipertansiyona bağlı konsantrik hipertrofi','Yaş, obezite, diyabet, kronik böbrek hastalığı','Atriyal fibrilasyon','Daha nadir: amiloidoz (TTR), hipertrofik kardiyomiyopati, konstriktif perikardit (ayırıcı tanıda)'],
  how:'Hipertrofi ve interstisyel fibrozis gevşemeyi (aktif, enerji gerektiren relaksasyon) ve kompliyansı (pasif sertlik) bozar. Basınç–hacim döngüsünde diyastol sonu basınç–hacim ilişkisi (EDPVR) yukarı-sola kayar: aynı hacim için LV dolum basıncı yükselir ve sol atriyum ile pulmoner venlere yansır. Atriyal katkı önemlidir; AF ve taşikardi diyastolü kısalttığı için tabloyu ani bozar.',
  ecg:['LVH voltaj kriterleri (Sokolow–Lyon SV1+RV5 ≥35 mm)','Lateral derivasyonlarda strain tipi ST çökmesi ve T negatifliği','Sol atriyal genişleme (geniş, çentikli P)','AF sık'],
  bul:['Efor dispnesi, efor kapasitesinde azalma','S4 (atriyal gallop)','Hipertansiyon, periferik ödem'],
  lab:['Eko: LVEF ≥%50, LV hipertrofisi, sol atriyum genişlemesi, E/e′ >14','NT-proBNP yüksek (obezitede yalancı düşük olabilir)','H₂FPEF skoru; gerekirse egzersiz ekosu ya da invaziv hemodinami'],
  mus:'Ventrikül duvarı kalın ve sert; kasılma iyi ama gevşeme yavaş.',
  ner:'Sempatik etki artmış.',
  cli:'SGLT2 inhibitörü hastaneye yatışı azaltır; konjesyonda diüretik. Hipertansiyon, AF ve obezite agresif yönetilir.',
  read:{Ritim:'Sinüs',P:'Geniş',PR:'180 ms',QRS:'Yüksek voltaj, strain'},
  r:{atrial:'sinus',rate:78,sv:0.02,pr:0.18,morph:'lvh',pAmp:0.18},off:[],nerveOn:['symp']},
as:{cat:'yapisal',n:'Aort darlığı',tag:'Kapak · yaşlıda en sık',lead:'V5',
  sum:'Aort kapak açıklığı daralır (ağırda alan <1 cm², ortalama gradyan ≥40 mmHg). Sol ventrikül sabit bir dirence karşı pompalar ve konsantrik hipertrofiyle uyum sağlar.',
  why:['Kalsifik dejeneratif darlık (>65 yaş, ateroskleroza benzer süreç)','Biküspit aort kapağı (daha genç yaşta, <65)','Romatizmal kalp hastalığı (çoğunlukla mitral tutulumla birlikte)'],
  how:'Ardyük kronik olarak arttığı için duvar gerilimini (Laplace: σ = P·r / 2h) normalleştirmek üzere duvar kalınlaşır. Kalın duvar daha çok oksijen ister, subendokard ise daha az perfüze olur: koroneri normal olsa bile angina. Sabit çıkış direnci efor sırasında debinin artmasını engeller (efor senkopu). Sonunda ventrikül dekompanse olur ve kalp yetmezliği gelişir. Semptom başladıktan sonra tedavisiz sağkalım kısadır (angina ~5, senkop ~3, KY ~2 yıl).',
  ecg:['LVH ve strain paterni','Sol atriyal genişleme','İleti sistemine kalsiyum uzanırsa AV blok ya da dal bloğu'],
  bul:['Klasik üçlü: angina, efor senkopu, kalp yetmezliği','Sağ 2. interkostal aralıkta kreşendo–dekreşendo sistolik ejeksiyon üfürümü, karotise yayılır','Pulsus parvus et tardus; S2’nin aort komponenti azalır','Ağırda üfürümün tepe noktası sistolde geç olur'],
  lab:['Eko: kapak alanı <1 cm², ortalama gradyan ≥40 mmHg, tepe hız ≥4 m/sn','Düşük akım–düşük gradyanda dobutamin eko ya da BT kalsiyum skoru','Koroner anjiyografi (TAVI ya da cerrahi öncesi)'],
  mus:'Sol ventrikül duvarı kalınlaşmış; aort kapağından dar bir jetle çıkış.',
  ner:'İleti sistemi çoğunlukla normal.',
  cli:'Semptomatik ağır darlıkta kapak değişimi: TAVI ya da cerrahi (SAVR). Semptomlu hastada etkili ilaç tedavisi yoktur; vazodilatörler (nitrat) senkopa yol açabilir.',
  read:{Ritim:'Sinüs',P:'Var',PR:'180 ms',QRS:'Yüksek voltaj, strain'},
  r:{atrial:'sinus',rate:70,sv:0.02,pr:0.18,morph:'lvh'},off:[],nerveOn:[]},
ms:{cat:'yapisal',n:'Mitral darlık',tag:'Kapak · romatizmal',lead:'DII',
  sum:'Mitral kapak yaprakları kalınlaşır, komissürler yapışır ve kapak “balık ağzı” şeklinde daralır. Sol atriyum basıncı artar, akciğerlere ve sağ kalbe yansır.',
  why:['Romatizmal kalp hastalığı (açık ara en sık; geçirilmiş akut romatizmal ateşten yıllar sonra)','Yaşlılarda mitral anülüs kalsifikasyonu','Nadir: konjenital, karsinoid, lupus'],
  how:'Normal mitral alan 4–6 cm²; <1,5 cm² ağır darlıktır. Akım sabit bir dirençten geçtiği için atriyoventriküler gradyan akımın karesiyle artar: taşikardi diyastolü kısaltınca gradyan ve sol atriyum basıncı fırlar (efor, gebelik, AF). Sol atriyum genişler, AF ve sol atriyal apendikste trombüs gelişir. Kronik pulmoner venöz hipertansiyon zamanla arteriyel bileşen kazanır ve sağ ventrikül yüklenir.',
  ecg:['Sol atriyal genişleme: DII’de geniş, çentikli P (P mitrale), V1’de negatif bileşeni derin bifazik P','AF sık','İleri evrede sağ aks sapması ve RVH'],
  bul:['Efor dispnesi, ortopne; gebelikte ya da AF başlangıcında ani kötüleşme','Açılma sesi (opening snap) ardından apekste diyastolik rulman; S1 sert','Hemoptizi, ses kısıklığı (Ortner), sistemik emboli (inme)','Mitral yüz (malar flush)'],
  lab:['Eko: kalınlaşmış yapraklar, ön yaprakta “hokey sopası”, kapak alanı, ortalama gradyan, PAB','TEE: sol atriyal apendiks trombüsü (balon valvotomi öncesi)','Akciğer grafisi: sol atriyal genişleme, sol kalp kenarında düzleşme'],
  mus:'Sol atriyum genişlemiş ve zorlanıyor; sol ventrikül dolumu kısıtlı.',
  ner:'Sol atriyum genişledikçe AF riski artar.',
  cli:'Hız kontrolü (beta blokör) diyastolü uzatır. AF varsa varfarin (romatizmal orta-ağır MS’te DOAK değil). Uygun anatomide perkütan balon mitral valvotomi, değilse cerrahi. Romatizmal hastada sekonder penisilin profilaksisi sürer.',
  read:{Ritim:'Sinüs',P:'Geniş, çentikli',PR:'180 ms',QRS:'Dar'},
  r:{atrial:'sinus',rate:92,sv:0.01,pr:0.18,morph:'narrow',pAmp:0.22},off:[],nerveOn:['symp'],fx:{veg:'mit'}},
mr:{cat:'yapisal',n:'Mitral yetersizlik',tag:'Kapak',lead:'DII',
  sum:'Sistolde kanın bir kısmı aorta değil sol atriyuma kaçar. Primer (kapağın kendisi) ya da sekonder (ventrikülün genişlemesi) olabilir.',
  why:['Primer: mitral kapak prolapsusu (miksomatöz dejenerasyon), romatizmal, endokardit','Sekonder (fonksiyonel): dilate ya da iskemik kardiyomiyopatide anülüs genişlemesi ve papiller kas yer değiştirmesi','Akut: MI sonrası papiller kas rüptürü, endokarditte korda rüptürü'],
  how:'Regürjitan hacim düşük basınçlı sol atriyuma kaçtığı için ardyük görece azalır; kronik formda ventrikül eksantrik hipertrofiyle genişler, ileri EF yanıltıcı biçimde korunur (normal kabul edilen EF burada ~%60’tır). Akut formda sol atriyum hazırlıksızdır: basınç hızla yükselir, akut akciğer ödemi ve kardiyojenik şok gelişir.',
  ecg:['Sol atriyal genişleme','AF','Kronikte LV hacim yükü bulguları'],
  bul:['Apekste holosistolik üfürüm, aksillaya yayılır','S3 (hacim yükü), S1 hafif','Efor dispnesi, yorgunluk; akutta ani akciğer ödemi'],
  lab:['Eko: regürjitan jet, vena kontrakta ≥7 mm, EROA ≥40 mm² (primerde ağır)','LV sistol sonu çapı ve EF: cerrahi zamanlaması için','TEE: kapak anatomisi ve onarılabilirlik'],
  mus:'Sol atriyum ve ventrikül genişlemiş; her sistolde geriye kaçış.',
  ner:'İleti sistemi normal; AF eşlik edebilir.',
  cli:'Primer ağır MR’de semptom, LVEF ≤%60 ya da LVESD ≥40 mm olunca cerrahi onarım. Sekonderde önce KY ilaçları ve CRT; seçilmiş hastada perkütan kenar-kenar onarım (TEER).',
  read:{Ritim:'Sinüs',P:'Geniş',PR:'170 ms',QRS:'Dar'},
  r:{atrial:'sinus',rate:84,sv:0.02,pr:0.17,morph:'narrow',pAmp:0.18},off:[],nerveOn:[]},
ar:{cat:'yapisal',n:'Aort yetersizliği',tag:'Kapak',lead:'V5',
  sum:'Diyastolde kan aorttan sol ventriküle geri kaçar. Ventrikül hem hacim hem basınç yükü taşır.',
  why:['Aort kökü genişlemesi: hipertansiyon, Marfan, biküspit aortopati, aort diseksiyonu (akut)','Kapak: biküspit, romatizmal, endokardit','Ankilozan spondilit, sifiliz (aortit)'],
  how:'Geri kaçan hacim bir sonraki atımda tekrar atılır: atım hacmi ve sistolik basınç artar, diyastolik basınç düşer (geniş nabız basıncı). Ventrikül eksantrik hipertrofiyle büyür (kalbin en büyük boyutlarına ulaşabilir: cor bovinum). Düşük diyastolik basınç koroner perfüzyonu azaltır.',
  ecg:['LVH','Lateral derivasyonlarda belirgin Q ve yüksek R (hacim yükü)'],
  bul:['Sol sternal kenarda erken diyastolik dekreşendo üfürüm (öne eğilip ekspiryumda)','Geniş nabız basıncı: Corrigan (sıçrayıcı nabız), de Musset, Quincke, Duroziez','Austin Flint üfürümü (fonksiyonel mitral rulman)'],
  lab:['Eko: jet genişliği, vena kontrakta >6 mm, desendan aortta holodiyastolik geri akım','Aort kökü ve çıkan aort çapı (BT/MR)','Akutta acil TEE ve diseksiyon araştırması'],
  mus:'Sol ventrikül genişlemiş, güçlü ama hacim yüklü.',
  ner:'İleti sistemi normal.',
  cli:'Semptomatik ağır AR’de ya da LVEF ≤%50 / LVESD >50 mm olunca cerrahi. Akut ağır AR cerrahi acildir; beta blokör refleks taşikardiyi engellediği için zararlı olabilir.',
  read:{Ritim:'Sinüs',P:'Var',PR:'160 ms',QRS:'Yüksek voltaj'},
  r:{atrial:'sinus',rate:80,sv:0.02,pr:0.16,morph:'lvh'},off:[],nerveOn:[],fx:{lvDilate:1}},
hcm:{cat:'yapisal',n:'Hipertrofik kardiyomiyopati',tag:'Genetik · genç sporcuda ani ölüm',lead:'V5',
  sum:'Açıklanamayan sol ventrikül hipertrofisi (≥15 mm), çoğunlukla asimetrik septal. Hastaların üçte ikisinde dinlenme ya da eforla sol ventrikül çıkış yolu obstrüksiyonu (LVOTO) vardır.',
  why:['Sarkomer protein gen mutasyonları, otozomal dominant (MYH7, MYBPC3 en sık)','Ayırıcı tanı: sporcu kalbi, hipertansif kalp, Fabry, amiloidoz, Danon'],
  how:'Miyosit dizilim bozukluğu (disarray) ve fibrozis re-entry için substrat oluşturur: VT/VF ve ani ölüm. Kalın septum çıkış yolunu daraltır; sistolde mitral ön yaprak septuma çekilir (sistolik ön hareket, SAM, Venturi etkisi) ve hem obstrüksiyon hem mitral yetersizlik yapar. Obstrüksiyon dinamiktir: önyükün azalması (ayağa kalkma, Valsalva, dehidratasyon), ardyükün azalması (nitrat) ve kontraktilitenin artması (efor, inotrop) daralmayı artırır. Diyastolik disfonksiyon belirgindir.',
  ecg:['LVH voltajı, derin dar septal Q dalgaları (inferolateral)','Yaygın T negatifliği (apikal formda dev negatif T)','AF ve NSVT'],
  bul:['Efor dispnesi, angina, efor senkopu; ilk bulgu ani ölüm olabilir','Sol sternal kenarda sistolik üfürüm: Valsalva ve ayağa kalkmakla artar, çömelme ve el sıkmayla azalır','S4, çift tepeli karotis nabzı'],
  lab:['Eko: septum ≥15 mm (aile öyküsünde ≥13), SAM, LVOT gradyanı ≥30 mmHg (≥50 anlamlı)','Kardiyak MR: hipertrofi dağılımı, geç gadolinyum tutulumu (fibrozis)','Holter, genetik test ve birinci derece akraba taraması'],
  mus:'Septum belirgin kalın; çıkış yolu sistolde daralıyor.',
  ner:'İleti sistemi çalışıyor; fibrozis ventriküler aritmiye zemin hazırlar.',
  cli:'Semptomda beta blokör ya da verapamil (önyükü ve dolumu iyileştirir); kardiyak miyozin inhibitörü (mavakamten). Dehidratasyon, nitrat ve yüksek doz diüretikten kaçınılır. Dirençli obstrüksiyonda septal miyektomi ya da alkol septal ablasyonu. Ani ölüm riskine göre ICD.',
  read:{Ritim:'Sinüs',P:'Var',PR:'160 ms',QRS:'Yüksek voltaj, derin Q'},
  r:{atrial:'sinus',rate:68,sv:0.03,pr:0.16,morph:'hcm'},off:[],nerveOn:[]},
dcm:{cat:'yapisal',n:'Dilate kardiyomiyopati',tag:'Kardiyomiyopati',lead:'V5',
  sum:'Sol ventrikül (bazen iki ventrikül) genişlemiş ve sistolik işlevi azalmıştır; bunu açıklayacak koroner hastalık ya da anormal yüklenme yoktur.',
  why:['Genetik (TTN kesme mutasyonları, LMNA: ileti bozukluğu ve ani ölümle)','Alkol, kokain, antrasiklin ve trastuzumab','Miyokardit sonrası (Koksaki B, parvovirüs B19), Chagas','Peripartum, taşikardiye bağlı, tiroid hastalığı, tiamin eksikliği'],
  how:'Miyosit kaybı ve fibrozisle ventrikül duvarı incelir ve sferik hale gelir. Laplace yasasına göre artan yarıçap duvar gerilimini artırır ve oksijen ihtiyacını büyütür; anülüs genişleyince sekonder mitral yetersizlik eklenir. Sonuç HFrEF tablosudur.',
  ecg:['Sinüs taşikardisi, LBBB','AF, VES ve NSVT','LMNA’da PR uzaması ve AV blok'],
  bul:['HFrEF semptomları','S3, apekste mitral yetersizlik üfürümü','Apeks vurusu aşağı-dışa kaymış'],
  lab:['Eko: genişlemiş LV, global hipokinezi, LVEF ≤%40','Koroner anjiyografi/BT: iskemik neden dışlanır','Kardiyak MR: orta duvar geç tutulum (iskemik olmayan patern); genetik test'],
  mus:'Sol ventrikül genişlemiş, duvarlar ince, kasılma zayıf.',
  ner:'Sempatik aktivite artmış.',
  cli:'HFrEF tedavisi (ARNI/ACEİ, beta blokör, MRA, SGLT2i). Alkolde tam bırakma EF’yi düzeltebilir. LMNA gibi yüksek riskli genlerde daha erken ICD.',
  read:{Ritim:'Sinüs taşikardisi',P:'Var',PR:'170 ms',QRS:'Geniş (LBBB)'},
  r:{atrial:'sinus',rate:98,sv:0.01,pr:0.17,morph:'lbbbV1',act:'lbbb'},off:[],nerveOn:['symp'],fx:{lvDilate:1}},
endo:{cat:'enf',n:'Enfektif endokardit',tag:'Enfeksiyon · vejetasyon',lead:'DII',
  sum:'Kalbin endokard yüzeyinin, en sık kapakların enfeksiyonudur. Trombosit, fibrin ve mikroorganizmalardan oluşan vejetasyon kapağı tahrip eder ve parçalanarak emboli yapar.',
  why:['Önceden hasarlı ya da yapay kapak, önceki endokardit, doğumsal kalp hastalığı','IV madde kullanımı (triküspit kapak, S. aureus)','Hemodiyaliz, kalıcı kateter, kalp cihazları (pil/ICD), sağlık hizmetiyle ilişkili bakteriyemi','Diş eti hastalığı ve kötü ağız hijyeni (viridans streptokoklar)'],
  how:'Türbülanslı akım (yüksek basınçtan alçağa jet) endotelde hasar yapar; açığa çıkan matrikse trombosit ve fibrin yapışır (steril trombotik vejetasyon). Geçici bakteriyemide fibronektin ya da dekstran bağlayan bakteriler bu zemine tutunur, biyofilm içinde konakçı savunmasından ve antibiyotikten korunarak çoğalır. Vejetasyon kapağı perfore eder (akut yetersizlik), anülüse ilerleyip apse ve ileti bloğu yapabilir, parçalanarak beyin, dalak, böbrek ya da (sağ kalpte) akciğere emboli gönderir. Dolaşan immün kompleksler glomerülonefrit, Osler nodülü ve Roth lekesi yapar.',
  ecg:['Ateşe bağlı sinüs taşikardisi','Yeni PR uzaması ya da AV blok: aort kökü apsesini düşündürür (acil cerrahi göstergesi)'],
  bul:['Ateş ve yeni ya da değişen kapak üfürümü','Janeway lezyonları (ağrısız, avuç-taban: septik emboli), Osler nodülleri (ağrılı, parmak ucu: immün)','Splinter hemoraji, Roth lekesi, konjonktival peteşi','Embolik inme, dalak ya da böbrek infarktı; sağ taraflıda septik pulmoner emboli'],
  lab:['Kan kültürü: antibiyotikten önce, farklı yerlerden 30 dk arayla en az 3 set','Eko: TTE ile başla; yapay kapak, cihaz ya da negatif TTE ama yüksek şüphede TEE','CRP ve sedimentasyon yüksek, normokrom anemi, hematüri','Gerekirse FDG-PET/BT (yapay kapak), beyin MR'],
  mus:'Mitral kapakta vejetasyon (sarımsı küme). Kas kasılması korunur; ateşe bağlı taşikardi.',
  ner:'Sempatik etki artmış. Anülüs apsesi AV düğüme ilerlerse blok gelişir.',
  cli:'Uzun süreli (4–6 hafta) yüksek doz bakterisidal IV antibiyotik; ampirikte vankomisin + seftriakson (ya da yapay kapakta gentamisin, rifampin eklenir). Cerrahi göstergeleri: kapak yetersizliğine bağlı KY, kontrol edilemeyen enfeksiyon (apse, sürekli pozitif kültür, mantar), büyük vejetasyonla emboli riski.',
  read:{Ritim:'Sinüs taşikardisi',P:'Var',PR:'150 ms',QRS:'Dar'},
  r:{atrial:'sinus',rate:112,sv:0,pr:0.15,morph:'narrow'},off:[],nerveOn:['symp'],fx:{veg:'mit'}},
miyo:{cat:'enf',n:'Akut miyokardit',tag:'İnflamasyon · genç hasta',lead:'DII',
  sum:'Miyokardın inflamasyonudur. Çoğu viraldir ve kendiliğinden düzelir; bir kısmı aritmi, fulminan kalp yetmezliği ya da dilate kardiyomiyopatiye ilerler.',
  why:['Virüsler: parvovirüs B19, HHV-6, Koksaki B (enterovirüsler), adenovirüs, SARS-CoV-2','Bakteriyel toksin: difteri; spiroket: Lyme (AV blok)','Parazit: Chagas (Trypanosoma cruzi)','İmmün aracılı: dev hücreli miyokardit, sarkoidoz, eozinofilik (ilaç), immün kontrol noktası inhibitörleri, mRNA aşısı sonrası (nadir, genç erkek)'],
  how:'Faz 1: virüs (ör. Koksaki B, CAR reseptörü üzerinden) miyosite girer ve doğrudan hasar yapar. Faz 2: doğal ve kazanılmış bağışıklık devreye girer; T lenfositler ve sitokinler miyositleri öldürür, çapraz reaksiyon veren antikorlar oluşabilir. Faz 3: inflamasyon ya söner ya da sürer ve fibrozis, ventrikül genişlemesi ve DCM gelişir. Ödem ve nekroz troponini yükseltir, epikardiyal tutulum ST değişikliği yapar.',
  ecg:['Yaygın ST yükselmesi ya da T negatifliği (perikardit benzeri, miyoperikardit)','Sinüs taşikardisi, VES, NSVT','AV blok (Lyme, sarkoidoz ve dev hücrelide sık), QRS genişlemesi kötü prognoz'],
  bul:['Viral prodrom (üst solunum yolu ya da gastroenterit) sonrası göğüs ağrısı','Nedeni açıklanamayan çarpıntı, senkop, yeni kalp yetmezliği','Fulminan formda kardiyojenik şok'],
  lab:['Yüksek troponin; koroner arterler normal (anjiyografi ya da BT)','Kardiyak MR (Lake Louise ölçütleri): T2 ödem + subepikardiyal/orta duvar geç gadolinyum tutulumu','Endomiyokardiyal biyopsi: fulminan, dev hücreli ya da tedaviye yanıtsız formlarda (Dallas ölçütleri)','CRP yüksek; eko’da bölgesel ya da global hipokinezi'],
  mus:'Sol ventrikül duvarı inflamasyonlu; kasılma hafifçe zayıflamış.',
  ner:'Sempatik etki artmış.',
  cli:'Destek tedavisi ve KY ilaçları; aritmi izlemi. Fulminan formda mekanik dolaşım desteği. Dev hücreli ve eozinofilikte immünsüpresyon. En az 3–6 ay yarışma sporu yasağı (ani ölüm riski). Yüksek doz NSAİİ yalnız belirgin perikard tutulumunda.',
  read:{Ritim:'Sinüs taşikardisi',P:'Var',PR:'150 ms',QRS:'Dar, yaygın ST ↑'},
  r:{atrial:'sinus',rate:108,sv:0,pr:0.15,morph:'myo'},off:[],nerveOn:['symp'],fx:{sac:'inflamed'}},
arf:{cat:'enf',n:'Akut romatizmal ateş (karditis)',tag:'Streptokok sonrası · otoimmün',lead:'DII',
  sum:'A grubu streptokok farenjitinden 2–4 hafta sonra gelişen, kalp, eklem, deri ve beyni tutan otoimmün hastalık. Kalıcı hasar yalnız kalpte kalır: romatizmal kalp hastalığı.',
  why:['Tedavi edilmemiş ya da eksik tedavi edilmiş A grubu β-hemolitik streptokok (S. pyogenes) farenjiti (deri enfeksiyonu genellikle değil)','5–15 yaş, kalabalık ve yoksul yaşam koşulları','Genetik yatkınlık (HLA-DR7, DR4); geçirilmiş ARF’de nüks riski yüksek'],
  how:'Moleküler benzerlik: streptokokun M proteini ve N-asetil-glukozamin karbonhidratına karşı oluşan antikorlar ve T hücreleri, kalp miyozini, laminin ve kapak endotelindeki benzer epitoplarla çapraz reaksiyon verir. Pankardit gelişir: endokarditte kapak (en sık mitral, sonra aort) kenarlarında küçük siğilimsi vejetasyonlar ve valvülit (yetersizlik); miyokardda Aschoff cisimcikleri; perikardit. Tekrarlayan ataklarla kapak fibrozu, komissür füzyonu ve kordaların kısalması yıllar içinde mitral darlığa götürür.',
  ecg:['PR uzaması (1. derece AV blok; minör Jones ölçütü)','Sinüs taşikardisi, perikardit eşlik ederse ST yükselmesi'],
  bul:['Gezici büyük eklem poliartriti (salisilata hızlı yanıt)','Karditis: yeni mitral yetersizlik üfürümü (apikal holosistolik), Carey Coombs üfürümü','Sydenham koresi (geç, haftalar–aylar sonra), eritema marginatum, deri altı nodüller','Ateş'],
  lab:['Streptokok kanıtı: yüksek ya da yükselen ASO, anti-DNaz B, boğaz kültürü ya da hızlı antijen testi','CRP ≥3 mg/dL ve/veya sedimentasyon ≥60 mm/sa','Eko (subklinik karditis dahil): mitral ya da aort yetersizliği','PR uzaması; Jones ölçütleri ile tanı'],
  mus:'Mitral kapak kenarlarında romatizmal vejetasyonlar; miyokard ve perikardda inflamasyon.',
  ner:'AV düğümde ileti yavaşlamış: PR uzun.',
  cli:'Streptokok eradikasyonu (benzatin penisilin G 1,2 milyon Ü IM tek doz), eklem ve ateş için aspirin/NSAİİ, ağır karditiste kortikosteroid, korede destek. Asıl önemli olan sekonder profilaksidir: 3–4 haftada bir benzatin penisilin, karditis ve kapak hasarına göre en az 10 yıl ya da 40 yaşına kadar.',
  read:{Ritim:'Sinüs taşikardisi',P:'Var',PR:'240 ms (uzun)',QRS:'Dar'},
  r:{atrial:'sinus',rate:104,sv:0.01,pr:0.24,morph:'narrow'},off:[],nerveOn:['symp'],fx:{veg:'mit',sac:'inflamed'}}
};
Object.values(NEW).forEach(c=>{c.off=c.off||[]; c.nerveOn=c.nerveOn||[]; c.fx=c.fx||{};});
Object.assign(COND,NEW);

/* Mevcut durumlar için bulgu (bul) ve laboratuvar/görüntüleme (lab) */
const BL={
nsr:[['Nabız düzenli, 60–100/dk','Fizyolojik solunumsal sinüs aritmisi'],['Normal 12 derivasyon EKG; ek inceleme gerekmez']],
tachy:[['Çarpıntı; bulgular nedene göredir (ateş, solukluk, dehidratasyon, tremor)','Sinüs taşikardisi kendisi değil neden tedavi edilir'],['Hemogram, TSH, elektrolitler, laktat; şüpheye göre D-dimer ya da kültür']],
brady:[['Çoğunlukla belirtisiz; ağırda yorgunluk, baş dönmesi, senkop','Hipotermi ya da hipotiroidi bulguları aranır'],['TSH, elektrolitler, ilaç düzeyi (digoksin); semptomla uyum için Holter']],
arrest:[['Baş dönmesi, presenkop, efor intoleransı (kronotropik yetersizlik)','Taşi-bradi sendromunda çarpıntı ve duraklama'],['Holter ya da olay kaydedici; semptom ile duraklamanın eşleşmesi tanı koydurur']],
af:[['Düzensiz düzensiz nabız, nabız defisiti','Çarpıntı, dispne, yorgunluk; ilk bulgu inme olabilir'],['Eko (kapak, sol atriyum), TSH, böbrek işlevi; CHA₂DS₂-VA ve kanama riski hesaplanır']],
flutter:[['Düzenli, çoğunlukla ~150/dk nabız (2:1)','Çarpıntı, efor kapasitesinde azalma'],['Eko; vagal manevra ya da adenozin flutter dalgalarını ortaya çıkarabilir']],
svt:[['Ani başlayıp ani biten düzenli çarpıntı','Boyunda düzenli dalgalanma (frog sign), poliüri'],['Atak dışı EKG’de preeksitasyon aranır; elektrofizyolojik çalışma']],
avb1:[['Belirtisiz; S1 hafiflemiş olabilir'],['İlaç (beta blokör, KKB, digoksin) ve elektrolit gözden geçirilir']],
wenck:[['Gruplanmış atımlar, düzenli aralıklarla duraklama','Genellikle belirtisiz'],['İnferior MI ya da ilaç etkisi araştırılır; eforla düzelir (nodal)']],
mobitz2:[['Baş dönmesi, presenkop, senkop'],['Holter; infranodal hastalık için QRS genişliğine bak; kalıcı pil endikasyonu']],
avb3:[['Bradikardi, senkop (Stokes–Adams), yorgunluk','Değişken şiddette S1, juguler venada top dalgaları (cannon a)'],['Elektrolit, troponin, ilaç düzeyi; Lyme serolojisi (endemik bölgede)']],
rbbb:[['Belirtisiz; S2’nin geniş çiftleşmesi'],['Yeni RBBB + dispnede pulmoner emboli araştırılır']],
lbbb:[['Paradoks S2 çiftleşmesi','Altta yatan yapısal kalp hastalığı bulguları'],['Eko (LVEF); yeni LBBB + iskemik ağrıda Sgarbossa ölçütleri']],
wpw:[['Paroksismal çarpıntı, nadiren senkop'],['Elektrofizyolojik çalışma ve ablasyon; yolun refrakter süresi riski belirler']],
pvc:[['Kalpte “tekleme”, düşme hissi; kompansatuvar duraklama'],['Holter (yük >%10–15 kardiyomiyopati riski), eko, elektrolitler (K, Mg)']],
vt:[['Çarpıntı, hipotansiyon, senkop; juguler venada top dalgaları','Nabızlı ya da nabızsız olabilir'],['Elektrolitler, troponin; eko ve kardiyak MR ile skar araştırılır']],
torsades:[['Tekrarlayan senkop, nöbet benzeri atak'],['QTc, K, Mg, Ca; QT uzatan ilaç listesi; konjenital uzun QT için aile taraması']],
vf:[['Yanıtsız, solunum yok ya da agonal, nabız yok'],['Ritim analizi defibrilatörden; dönüş sonrası koroner anjiyografi, elektrolit, troponin']],
asys:[['Yanıtsız, nabızsız'],['Geri döndürülebilir nedenler (4H 4T): hipoksi, hipovolemi, hiper/hipokalemi, hipotermi, tromboz, tamponad, toksin, tansiyon pnömotoraksı']],
paced:[['Pil cebinde cihaz; düzenli nabız'],['Cihaz sorgulaması: yakalama, algılama eşikleri, pil ömrü']],
stemi_ant:[['>20 dk süren baskı tarzı göğüs ağrısı, terleme, bulantı','Kardiyojenik şokta hipotansiyon, soğuk ekstremite, raller'],['Yüksek duyarlı troponin (tanıyı STEMI’de geciktirmez), eko’da ön duvar hipokinezi','Acil koroner anjiyografi']],
stemi_inf:[['Göğüs ya da epigastrik ağrı, bulantı, bradikardi, hipotansiyon','RV tutulumunda: hipotansiyon + boyun ven dolgunluğu + temiz akciğer'],['Sağ derivasyonlar (V4R’de ST ↑), troponin, eko’da inferior ve RV duvarı']],
tamponade:[['Beck üçlüsü: hipotansiyon, juguler ven dolgunluğu, derinden gelen kalp sesleri','Pulsus paradoksus >10 mmHg, taşikardi'],['Eko: perikardiyal sıvı, sağ atriyum ve RV diyastolik kollapsı, pletorik IVC']],
pe:[['Ani dispne, plöritik ağrı, taşipne, taşikardi; hemoptizi','Masif PE’de hipotansiyon ve şok'],['Wells skoru; düşük olasılıkta D-dimer, yüksekte BT pulmoner anjiyografi','Eko’da RV dilatasyonu; troponin ve BNP risk sınıflaması için']],
peri:[['Öne eğilince azalan, yatınca artan plöritik göğüs ağrısı','Perikardiyal frotman (üç bileşenli)'],['CRP yüksek, troponin çoğunlukla normal (yüksekse miyoperikardit)','Eko: efüzyon ve tamponad değerlendirmesi']],
hyperk:[['Kas güçsüzlüğü, parestezi, bradikardi; çoğu zaman belirtisiz'],['K⁺ >5,5 mmol/L (ağır ≥6,5); yalancı hiperkalemi (hemoliz) dışlanır','Kreatinin, kan gazı, glukoz']],
hypok:[['Kas güçsüzlüğü, kramp, ileus, çarpıntı'],['K⁺ <3,5 mmol/L; Mg ölçülür (düzeltilmeden K düzelmez)','İdrar K ve kan gazı ile neden ayırımı']]
};
for(const k in BL) if(COND[k]){ COND[k].bul=BL[k][0]; COND[k].lab=BL[k][1]; }

/* Hasta oluşturucu: yeni durumların tedavi seçenekleri (patients.js ile aynı yapı) */
const RX=K.RX;
if(RX){
  const furo={n:'Furosemid',cls:'Lup diüretik',dose:'Akutta evdeki oral dozun 1–2,5 katı IV (diüretik kullanmıyorsa 20–40 mg IV)',note:'Konjesyonu çözer; mortaliteyi değiştirmez.',first:true,anim:{k:'iv',t:'IV furosemid',c:0x2b8be0},
    rules:[['inst','warn','Hipotansiyon ve düşük debide perfüzyon sağlanmadan dikkatli.'],['kbh','info','eGFR düşükse daha yüksek doz gerekir.'],['dig','warn','Hipokalemi digoksin toksisitesini artırır: K⁺ izle.']]};
  const arni={n:'Sakubitril/valsartan (ARNI)',cls:'Anjiyotensin reseptör–neprilizin inhibitörü',dose:'24/26 mg 2×1 ile başla, 2–4 haftada bir artır; hedef 97/103 mg 2×1',note:'HFrEF’te ACEİ’den üstün; ACEİ’den geçişte 36 saat ara.',first:true,
    rules:[['acei','warn','ACEİ kullanıyorsa 36 saat ara ver (anjiyoödem).'],['gebe','no','Gebelikte kontrendike (fetotoksik).'],['kbh','warn','eGFR <30’da düşük dozla başla; K⁺ ve kreatinin izle.'],['inst','no','SKB <100 ya da şokta başlanmaz.']]};
  const bbHF={n:'Bisoprolol / karvedilol / metoprolol süksinat',cls:'Beta blokör (KY’de kanıtlı)',dose:'Bisoprolol 1,25 mg/gün ile başla, 2 haftada bir iki katına; hedef 10 mg/gün',note:'Öwolemik ve stabil hastada başlanır ya da sürdürülür.',first:true,
    rules:[['inst','no','Akut dekompanse, şokta başlanmaz.'],['astim','warn','Kardiyoselektif seç (bisoprolol); ağır astımda dikkat.'],['kkb','warn','Verapamil/diltiazem ile birlikte bradikardi ve AV blok.']]};
  const mra={n:'Spironolakton / eplerenon (MRA)',cls:'Mineralokortikoid reseptör antagonisti',dose:'Spironolakton 25 mg/gün',note:'Mortaliteyi azaltır.',first:true,
    rules:[['kbh','warn','eGFR <30 ya da K⁺ >5,0’da başlanmaz.'],['acei','info','RAAS blokörüyle birlikte hiperkalemi: K⁺ yakın izle.']]};
  const sglt={n:'Dapagliflozin / empagliflozin (SGLT2i)',cls:'SGLT2 inhibitörü',dose:'10 mg/gün',note:'Diyabeti olmayan hastada da yatışı ve ölümü azaltır; HFpEF’te de yararlı.',first:true,
    rules:[['kbh','info','eGFR ≥20–25’te başlanabilir.'],['dm','info','Diyabette ketoasidoz riski: hasta günü kuralları.']]};
  const pen={n:'Benzatin penisilin G',cls:'Beta laktam antibiyotik',dose:'1,2 milyon Ü IM tek doz (<27 kg: 600.000 Ü); sekonder profilakside 3–4 haftada bir',first:true,
    rules:[['pen','no','Penisilin alerjisi: eradikasyonda azitromisin ya da (anafilaksi değilse) sefaleksin; profilakside eritromisin.']]};
  RX.hfref=[furo,arni,bbHF,mra,sglt,{n:'ICD / CRT',cls:'Cihaz',dose:'≥3 ay optimal tedaviye rağmen LVEF ≤%35; CRT için ayrıca LBBB ve QRS ≥150 ms',rules:[['hfref','info','KY tanısı var: cihaz uygunluğu değerlendirilir.']]},
    {n:'Verapamil / diltiazem',cls:'Nondihidropiridin KKB',dose:'—',base:['no','HFrEF’te negatif inotrop: kontrendike.']}];
  RX.dcm=RX.hfref;
  RX.hfpef=[sglt,furo,{n:'Kan basıncı ve AF kontrolü',cls:'Altta yatan neden',dose:'Hedef KB <130/80; AF’de ritim ya da hız kontrolü',first:true},{n:'Kilo verme ve egzersiz',cls:'Yaşam tarzı',dose:'Obez HFpEF’te semptom ve efor kapasitesini iyileştirir'}];
  RX.as=[{n:'TAVI ya da cerrahi kapak değişimi (SAVR)',cls:'Girişim',dose:'Semptomatik ağır AS; yaş, cerrahi risk ve anatomiye göre kalp takımı kararı',first:true,
      calc:P=>P.yas>=75?['info','≥75 yaşta TAVI genellikle tercih edilir.']:P.yas&&P.yas<65?['info','<65 yaş ve düşük riskte cerrahi tercih edilir (dayanıklılık).']:null},
    {n:'Nitrat',cls:'Vazodilatör',dose:'—',base:['warn','Ağır AS’de sabit çıkış direnci: önyük düşünce senkop ve şok riski.']},
    {n:'Statin ve KB kontrolü',cls:'Destek',dose:'Eşlik eden aterosklerozda; AS ilerlemesini durdurmaz'}];
  RX.ms=[{n:'Beta blokör',cls:'Hız kontrolü',dose:'Bisoprolol 2,5–10 mg/gün',note:'Diyastolü uzatır, gradyanı düşürür.',first:true,rules:[['astim','warn','Ağır astımda dikkat.']]},
    {n:'Varfarin',cls:'Antikoagülan',dose:'INR 2–3',note:'Orta-ağır MS + AF ya da sol atriyal trombüs: DOAK yerine varfarin.',first:true,rules:[['gebe','no','Gebelikte ilk trimesterde teratojen.'],['kanama','no','Aktif kanama.']]},
    {n:'Perkütan balon mitral valvotomi',cls:'Girişim',dose:'Uygun anatomi, ağır MS, sol atriyal trombüs yok',first:true},
    furo,pen];
  RX.mr=[{n:'Cerrahi onarım',cls:'Girişim',dose:'Primer ağır MR + semptom ya da LVEF ≤%60 / LVESD ≥40 mm',first:true},{n:'Perkütan kenar-kenar onarım (TEER)',cls:'Girişim',dose:'Sekonder MR’de optimal KY tedavisine rağmen semptom'},furo,arni];
  RX.ar=[{n:'Aort kapak cerrahisi',cls:'Girişim',dose:'Semptomatik ağır AR ya da LVEF ≤%50 / LVESD >50 mm; akutta acil',first:true},{n:'Vazodilatör (ACEİ/DHP KKB)',cls:'Semptomatik destek',dose:'Cerrahi adayı olmayan hastada'},
    Object.assign({},bbHF,{first:false,base:['warn','Akut ağır AR’de beta blokör kompansatuvar taşikardiyi engeller: zararlı.']})];
  RX.hcm=[{n:'Beta blokör (bisoprolol, metoprolol)',cls:'Negatif inotrop / kronotrop',dose:'Semptoma göre titre',note:'LVOT gradyanını azaltır, dolumu iyileştirir.',first:true,rules:[['astim','warn','Ağır astımda verapamil düşünülebilir.']]},
    {n:'Verapamil',cls:'Nondihidropiridin KKB',dose:'120–480 mg/gün',note:'Beta blokör tolere edilemezse.',rules:[['bb','warn','Beta blokörle birlikte AV blok riski.']]},
    {n:'Mavakamten',cls:'Kardiyak miyozin inhibitörü',dose:'Eko ile LVEF izlenerek titre',note:'Obstrüktif HCM’de gradyanı ve semptomu azaltır.',rules:[['gebe','no','Gebelikte kontrendike.']]},
    {n:'Nitrat / dihidropiridin',cls:'Vazodilatör',dose:'—',base:['no','Ardyükü ve önyükü düşürür: obstrüksiyonu artırır.']},
    {n:'Septal miyektomi ya da alkol septal ablasyonu',cls:'Girişim',dose:'İlaca dirençli, gradyan ≥50 mmHg'},{n:'ICD',cls:'Cihaz',dose:'HCM Risk-SCD skoruna göre ya da ani ölümden sağ kalanlarda'}];
  RX.endo=[{n:'Kan kültürü (3 set) ardından ampirik antibiyotik',cls:'Tanı ve tedavi',dose:'Kültürler alınmadan antibiyotik başlanmaz (septik şok hariç)',first:true},
    {n:'Vankomisin + seftriakson (ampirik, doğal kapak)',cls:'Antibiyotik',dose:'Vankomisin 15–20 mg/kg 2–3×/gün (düzey izlemi) + seftriakson 2 g/gün IV',first:true,anim:{k:'iv',t:'IV antibiyotik',c:0x7b61ff},
      rules:[['kbh','warn','Vankomisin nefrotoksik: düzeye göre doz.'],['pen','info','Seftriakson penisilin alerjisinde çoğunlukla kullanılabilir; anafilakside dikkat.']]},
    {n:'Kloksasilin/ sefazolin (MSSA)',cls:'Antibiyotik',dose:'Kültür sonucuna göre 4–6 hafta',rules:[['pen','warn','Penisilin alerjisi: anafilaksi değilse sefazolin, değilse vankomisin/daptomisin.']]},
    {n:'Erken cerrahi',cls:'Girişim',dose:'KY, kontrolsüz enfeksiyon (apse, sürekli bakteriyemi), vejetasyon >10 mm + emboli',first:true},
    {n:'Antikoagülan başlama',cls:'—',dose:'—',base:['warn','Endokarditte emboli önleme amacıyla antikoagülan önerilmez; embolik inmede kanama riski.']},
    {n:'Diş tedavisi öncesi profilaksi (yüksek risk)',cls:'Korunma',dose:'Amoksisilin 2 g işlemden 30–60 dk önce',note:'Yapay kapak, önceki endokardit, bazı doğumsal kalp hastalıkları.',rules:[['pen','warn','Penisilin alerjisinde klindamisin artık önerilmez; azitromisin ya da doksisiklin.']]}];
  RX.miyo=[{n:'Destek tedavisi ve monitörizasyon',cls:'Destek',dose:'Aritmi izlemi, KY varsa kılavuz ilaçları',first:true},{n:'Spor kısıtlaması',cls:'Korunma',dose:'En az 3–6 ay yarışma sporu yok',first:true},
    {n:'Yüksek doz NSAİİ',cls:'Antiinflamatuvar',dose:'—',base:['warn','Hayvan modellerinde miyokardit hasarını artırabilir; yalnız belirgin perikard tutulumunda düşük dozda.']},
    {n:'İmmünsüpresyon (steroid ± diğer)',cls:'İmmün tedavi',dose:'Biyopsiyle dev hücreli, eozinofilik ya da sarkoid miyokarditte'},
    {n:'Mekanik dolaşım desteği (ECMO, Impella)',cls:'İleri destek',dose:'Fulminan miyokarditte kardiyojenik şok'}];
  RX.arf=[pen,{n:'Aspirin ya da naproksen',cls:'Antiinflamatuvar',dose:'Aspirin 50–100 mg/kg/gün bölünmüş dozda; artrit ve ateş için',first:true,rules:[['asa','no','Aspirin/NSAİİ alerjisi: kısa süre steroid.']],calc:P=>P.yas&&P.yas<16?['info','Çocukta viral enfeksiyonla birlikte Reye sendromu riski: grip ve suçiçeğinde dikkat.']:null},
    {n:'Prednizolon',cls:'Kortikosteroid',dose:'1–2 mg/kg/gün; ağır karditis ya da KY’de'},
    {n:'Sekonder profilaksi',cls:'Korunma',dose:'Benzatin penisilin 3–4 haftada bir; karditissiz 5 yıl/21 yaş, kalıcı kapak hastalığında ≥10 yıl/40 yaş',first:true,rules:[['pen','warn','Penisilin alerjisi: eritromisin.']]}];
}
})();
/* İlaç merceği için gizli ara durumlar (listelerde görünmez) */
(function(){
const COND=window.KALP.COND, base=COND.af, nsr=COND.nsr;
COND.af_dig=Object.assign({},base,{cat:'_rx',hid:1,n:'AF + digoksin etkisi',tag:'İlaç etkisi',read:{Ritim:'Düzensiz, daha yavaş',P:'Yok, f dalgaları',PR:'Yok',QRS:'Dar, kaşık ST'},r:Object.assign({},base.r,{morph:'dig',afSlow:1.55})});
COND.nsr_qt=Object.assign({},nsr,{cat:'_rx',hid:1,n:'Sinüs ritmi + amiodaron etkisi',tag:'İlaç etkisi',read:{Ritim:'Sinüs bradikardisi',P:'Var',PR:'190 ms',QRS:'Dar, QT uzun'},r:{atrial:'sinus',rate:56,sv:0.02,pr:0.19,morph:'qtlong'}});
})();
