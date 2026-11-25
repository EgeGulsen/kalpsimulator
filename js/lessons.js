/* Kalp Simülatörü: "Öğren" bölümü dersleri ve sık sorulan sorular.
   body alanları güvenilir, elle yazılmış HTML'dir. <b class="lk" data-lead="V1"> öğeleri tıklanınca o derivasyonu seçer.
   Değerler erişkinler için genel kabul gören aralıklardır; eğitim amaçlıdır, tıbbi tavsiye değildir. */
(function(){
'use strict';
const L=id=>`<button type="button" class="lk" data-lead="${id}">${id}</button>`;
const LESSONS=[
{id:'nedir',t:'EKG nedir, nasıl okunur?',lead:'II',
 body:`<p>Elektrokardiyogram (EKG), kalp kası hücreleri uyarılırken ve dinlenmeye dönerken oluşan çok küçük elektrik akımlarının deriden kaydedilmesidir. Kalbin “resmi” değil, elektriğinin farklı açılardan çekilmiş bir grafiğidir.</p>
<ul>
<li><b>Yatay eksen zaman:</b> kâğıt standart olarak 25 mm/sn akar. Bir küçük kare (1 mm) <b>0,04 sn</b>, bir büyük kare (5 mm) <b>0,20 sn</b>; 5 büyük kare = 1 saniye.</li>
<li><b>Dikey eksen voltaj:</b> standart kalibrasyon 10 mm/mV. Bir küçük kare 0,1 mV, iki büyük kare 1 mV’dir. Kaydın başındaki dikdörtgen kalibrasyon işaretidir.</li>
<li><b>12 derivasyon:</b> 10 elektrotla (4 uzuv + 6 göğüs) kalbe 12 farklı açıdan bakılır. Her derivasyon aynı elektrik olayını kendi açısından gösterir; bu yüzden aynı atım derivasyonlarda farklı görünür.</li>
</ul>
<p>Yukarıdaki 12 derivasyonlu kayıt bu sitedeki modelden canlı üretilir. Bir derivasyona tıklayınca 3D kalbin etrafında o derivasyonun elektrodu ve bakış yönü gösterilir.</p>`},
{id:'dalgalar',t:'P, QRS, T: her dalga neyi gösterir?',lead:'II',
 body:`<table class="vt"><thead><tr><th>Bölüm</th><th>Neyi gösterir?</th><th>Normal değer (erişkin)</th></tr></thead><tbody>
<tr><td><b>P dalgası</b></td><td>Atriyumların depolarizasyonu (uyarılması). Önce sağ, hemen ardından sol atriyum.</td><td>Süre &lt; 0,12 sn (3 küçük kare); DII’de yükseklik &lt; 2,5 mm. DII’de pozitif, aVR’de negatif.</td></tr>
<tr><td><b>PR aralığı</b></td><td>P başlangıcından QRS başlangıcına: atriyumların uyarılması + AV düğümdeki bekleme + His–Purkinje iletimi.</td><td>0,12–0,20 sn (3–5 küçük kare)</td></tr>
<tr><td><b>QRS kompleksi</b></td><td>Ventriküllerin depolarizasyonu. Q: ilk negatif, R: ilk pozitif, S: R’den sonraki negatif dalga.</td><td>Süre &lt; 0,12 sn (çoğunlukla 0,07–0,10). Patolojik Q: ≥ 0,04 sn genişlikte ya da R’nin ≥ %25’i derinlikte.</td></tr>
<tr><td><b>ST segmenti</b></td><td>Ventrikül hücrelerinin hepsinin uyarılmış olduğu “plato” evresi; normalde elektrik farkı olmadığı için düzdür.</td><td>Taban çizgisinde (izoelektrik). J noktasında anlamlı yükselme MI, perikardit gibi durumlarda görülür.</td></tr>
<tr><td><b>T dalgası</b></td><td>Ventriküllerin repolarizasyonu (dinlenmeye dönüş).</td><td>Çoğu derivasyonda QRS ile aynı yönde. aVR’de negatif; V1 ve DIII’te negatif olabilir.</td></tr>
<tr><td><b>QT aralığı</b></td><td>QRS başlangıcından T sonuna: ventriküllerin uyarılıp dinlenmeye dönmesi için geçen toplam süre.</td><td>Hıza göre düzeltilir (QTc). QTc &lt; ~0,44 sn (erkek), &lt; ~0,46 sn (kadın); &gt; 0,50 sn torsades riski.</td></tr>
<tr><td><b>U dalgası</b></td><td>T’den sonra bazen görülen küçük dalga; kaynağı tartışmalıdır.</td><td>Hipokalemide belirginleşir.</td></tr>
</tbody></table>
<p><b>Atriyumların repolarizasyonu nerede?</b> Atriyumlar da dinlenmeye döner ama bu küçük sinyal QRS ile aynı anda olduğu için QRS’in içinde kaybolur.</p>
<p><b>QTc nasıl hesaplanır?</b> En sık Bazett formülü: QTc = QT / √RR (saniye cinsinden). Örnek: QT 0,40 sn, hız 75/dk (RR 0,8 sn) → QTc = 0,40 / 0,894 ≈ 0,45 sn.</p>`},
{id:'kural',t:'Altın kural: dalga elektroda doğru gelirse çizgi yukarı',lead:'II',
 body:`<p>Bir derivasyonun pozitif kutbunu kalbe bakan bir <b>göz</b> gibi düşün. Kalbin içinde uyarı yayılırken her an bütün hücrelerin elektriğinin toplamı tek bir okla (vektör) gösterilebilir. 3D kalpteki <b>sarı ok</b> bu vektördür.</p>
<ul>
<li>Depolarizasyon dalgası elektroda <b>doğru</b> geliyorsa çizgi <b>yukarı</b> (pozitif) çıkar.</li>
<li>Elektrottan <b>uzaklaşıyorsa</b> çizgi <b>aşağı</b> (negatif) iner.</li>
<li>Elektroda <b>dik</b> ilerliyorsa çizgi önce biraz yukarı sonra biraz aşağı gider (bifazik) ya da düz kalır.</li>
<li>Vektör ne kadar büyükse ve elektroda ne kadar doğrudan bakıyorsa dalga o kadar yüksek olur. Matematiksel olarak her derivasyon, kalp vektörünün kendi yönüne düşen izdüşümünü (iç çarpımını) çizer.</li>
</ul>
<p><b>Peki T dalgası neden QRS ile aynı yönde?</b> Repolarizasyon ters işaretli bir dalgadır ve ventrikülde ters yönde ilerler: uyarılma içten dışa (endokarddan epikarda) giderken, dinlenmeye dönüş dıştan içe doğru olur, çünkü dış katmanın aksiyon potansiyeli daha kısadır. İki “ters” birbirini götürür ve T, QRS ile aynı yöne bakar.</p>
<p>Denemek için ${L('II')} (vektörle aynı yöne bakar, dalgalar büyük ve pozitif) ile ${L('aVR')} (tam ters yöne bakar, her şey negatif) ve ${L('aVL')} (vektöre neredeyse dik, küçük dalgalar) derivasyonlarını karşılaştır.</p>`},
{id:'derivasyon',t:'12 derivasyon kalbin neresine bakar?',lead:'V4',
 body:`<p><b>Uzuv derivasyonları (frontal düzlem)</b> kalbe önden, bir saat kadranı gibi bakar: ${L('I')} 0° (sol yan), ${L('II')} +60°, ${L('aVF')} +90° (tam aşağı), ${L('III')} +120°, ${L('aVL')} −30° (sol üst), ${L('aVR')} −150° (sağ omuz). I, II, III iki elektrot arasındaki farkı ölçer (Einthoven üçgeni); aVR, aVL, aVF tek elektrotla diğer ikisinin ortalamasını karşılaştırır (Goldberger’in güçlendirilmiş derivasyonları).</p>
<p><b>Göğüs derivasyonları (yatay düzlem)</b> kalbi bir dilim gibi çevreler: ${L('V1')} ve ${L('V2')} septum ve sağ ventrikülün üzerinde, ${L('V3')} ve ${L('V4')} ön duvarda, ${L('V5')} ve ${L('V6')} sol yanda. Negatif kutup, üç uzuv elektrodunun birleştirildiği Wilson merkezi terminalidir.</p>
<table class="vt"><thead><tr><th>Bölge</th><th>Derivasyonlar</th><th>Genellikle besleyen arter</th></tr></thead><tbody>
<tr><td>Alt (inferior) duvar</td><td>II, III, aVF</td><td>RCA (kişilerin çoğunda), bazen LCx</td></tr>
<tr><td>Septum</td><td>V1, V2</td><td>LAD’nin septal dalları</td></tr>
<tr><td>Ön (anterior) duvar</td><td>V3, V4</td><td>LAD</td></tr>
<tr><td>Yan (lateral) duvar</td><td>I, aVL, V5, V6</td><td>LCx, LAD’nin diyagonal dalları</td></tr>
<tr><td>Sağ ventrikül</td><td>V1, sağ göğüs derivasyonları (V4R)</td><td>RCA</td></tr>
<tr><td>Arka (posterior) duvar</td><td>V1–V3’te “ayna” değişiklik; V7–V9</td><td>RCA veya LCx</td></tr>
</tbody></table>
<p><b>Elektrotların yeri:</b> V1 4. kaburga aralığında sternumun sağı, V2 solu; V4 5. kaburga aralığında köprücük kemiğinin orta hattı; V3 ikisinin ortası; V5 ön koltuk altı çizgisinde, V6 orta koltuk altı çizgisinde, V4 hizasında. Elektrotlar bir kaburga aralığı yukarı konursa R dalgaları küçülebilir ve yanlışlıkla “infarkt” şüphesi doğabilir.</p>
<p>Her derivasyonun gözünden bakmak için 12’li kayıttan birine tıkla, sonra “Bu derivasyonun gözünden bak” düğmesine bas.</p>`},
{id:'avr',t:'aVR neden normalde hep ters?',lead:'aVR',
 body:`<p>${L('aVR')} sağ omuzdan, kalbin sağ üstünden içeriye bakar. Normal bir kalpte ise:</p>
<ul>
<li>Uyarı sağ üstteki SA düğümden başlayıp sol-aşağı doğru yayılır, bu yüzden P vektörü aVR’den <b>uzaklaşır</b>: P negatiftir.</li>
<li>Ventriküllerin ortalama vektörü (kalp ekseni) sol-aşağıyı, yaklaşık +60°’yi gösterir. aVR ise −150°’ye bakar, yani neredeyse tam tersine. QRS bu yüzden derin negatiftir.</li>
<li>T de QRS ile aynı yöne baktığı için negatiftir.</li>
</ul>
<p>Kısacası aVR, DII’nin ayna görüntüsü gibidir. <b>Sinüs ritminde aVR’de pozitif P ve pozitif QRS</b> görülürse önce kol elektrotlarının ters takılıp takılmadığına bakılır (bunu “Elektrot hataları” dersinde deneyebilirsin). Daha nadir nedenler dekstrokardi (kalbin sağda olması) ve aşırı eksen sapmasıdır.</p>
<p><b>Klinik ipucu:</b> Birçok derivasyonda yaygın ST çökmesiyle birlikte aVR’de ST yükselmesi, sol ana koroner ya da çok damar hastalığına bağlı yaygın iskemiyi düşündürebilir.</p>`},
{id:'v1',t:'V1 neden negatif (rS) görünür?',lead:'V1',
 body:`<p>${L('V1')} sternumun hemen sağında, sağ ventrikülün ve septumun önündedir. QRS iki aşamada oluşur:</p>
<ol>
<li><b>Küçük r:</b> İlk uyarılan bölge septumdur ve septum <b>soldan sağa</b> (ve öne) doğru uyarılır, çünkü sol dal septuma daha erken ulaşır. Bu küçük vektör V1’e doğru gelir: küçük bir pozitif r çizilir. Aynı an V6 ve I’de küçük “septal q” olarak görülür.</li>
<li><b>Derin S:</b> Sonra iki ventrikül birlikte uyarılır. Sol ventrikül duvarı sağdakinin yaklaşık 3 katı kalın olduğu için toplam vektör sola ve geriye, yani V1’den <b>uzağa</b> döner: derin bir S çizilir.</li>
</ol>
<p>Bu yüzden normal V1 “rS” biçimindedir ve T dalgası burada normalde düz ya da negatif olabilir.</p>
<p><b>V1’de belirgin R neyi düşündürür?</b> Sağ ventrikül büyümesi (sağ ventrikül hipertrofisi), sağ dal bloğu (rsR’ “tavşan kulağı”), arka duvar MI (aynasal görüntü), WPW (bazı aksesuar yol yerleşimlerinde) ya da elektrotların yanlış yerleştirilmesi.</p>`},
{id:'rprog',t:'R progresyonu ve “zayıf R progresyonu” uyarısı',lead:'V3',variant:'oldant',
 body:`<p><b>Normal R progresyonu:</b> ${L('V1')}’den ${L('V6')}’ya doğru ilerledikçe R dalgası büyür, S dalgası küçülür. Çünkü elektrotlar sağ ventrikülün önünden sol ventrikülün yanına doğru kayar ve güçlü sol ventrikül vektörü onlara giderek daha çok “doğru” bakar. R ile S’nin eşitlendiği yer <b>geçiş zonu</b>dur; normalde ${L('V3')} ile ${L('V4')} arasındadır.</p>
<p><b>Zayıf (yavaş) R progresyonu:</b> R dalgalarının V1–V3/V4 boyunca beklenen kadar büyümemesidir. Yaygın kullanılan ölçüt: <b>V3’te R &lt; 3 mm</b>.</p>
<p><b>Neden “olası anterior infarktüs” uyarısı çıkar?</b> Ön duvar ve septumun bir bölümü eski bir infarktüsle ölüp skara dönüşürse o bölge artık elektrik üretmez. Ön duvardan V1–V4’e doğru gelen kuvvetler kaybolur; bu elektrotlar artık sadece geriye, yani kendilerinden uzağa giden kuvvetleri “görür”. Sonuç: R dalgaları küçülür ya da hiç oluşmaz (QS kompleksi). EKG cihazlarının otomatik yorumu bu örüntüyü gördüğünde “olası eski anterior MI” yazar.</p>
<p>Yukarıdaki kayıtta <b>Eski ön duvar MI</b> seçeneği açık: V1–V3’te R neredeyse yok, V4’te çok küçük. “Normal”e geçip farkı karşılaştır.</p>
<p><b>Ama tek başına tanı koydurmaz.</b> Aynı görünüm şunlarda da olur: elektrotların bir aralık yukarı konması (en sık neden), sol ventrikül hipertrofisi, sol dal bloğu, KOAH/amfizem, şişmanlık, göğüs duvarı deformitesi, dekstrokardi ya da normal bir varyasyon. Bu yüzden eski kayıtlar, klinik bilgi ve gerekirse ekokardiyografi ile birlikte değerlendirilir.</p>
<p><b>Erken geçiş</b> (V1–V2’de büyük R) ise sağ ventrikül hipertrofisi, arka duvar MI, sağ dal bloğu ya da WPW’yi düşündürebilir.</p>`},
{id:'eksen',t:'Kalp ekseni nasıl bulunur?',lead:'I',
 body:`<p>Kalp ekseni, ventrikül depolarizasyonunun (QRS) frontal düzlemdeki ortalama yönüdür. Normal aralık yaklaşık <b>−30° ile +90°</b> arasıdır.</p>
<p><b>Hızlı yöntem: ${L('I')} ve ${L('aVF')}</b></p>
<table class="vt"><thead><tr><th>I</th><th>aVF</th><th>Eksen</th></tr></thead><tbody>
<tr><td>+</td><td>+</td><td>Normal (0° ile +90°)</td></tr>
<tr><td>+</td><td>−</td><td>Sol eksen sapması olabilir; ${L('II')} pozitifse hâlâ normal (0° ile −30°)</td></tr>
<tr><td>−</td><td>+</td><td>Sağ eksen sapması (+90° ile +180°)</td></tr>
<tr><td>−</td><td>−</td><td>Aşırı eksen sapması (“kuzeybatı”); elektrot hatası ya da ventriküler ritim düşün</td></tr>
</tbody></table>
<p><b>Sol eksen sapması:</b> sol ön fasiküler blok, alt duvar MI, sol ventrikül hipertrofisi, WPW. <b>Sağ eksen sapması:</b> sağ ventrikül hipertrofisi, pulmoner emboli, sol arka fasiküler blok, yan duvar MI; ince-uzun yapılı gençlerde normal olabilir.</p>
<p><b>Daha kesin yöntem:</b> QRS’in pozitif ve negatif kısımlarının en eşit olduğu (izoelektrik) uzuv derivasyonunu bul; eksen ona diktir.</p>`},
{id:'hiz',t:'EKG’den kalp hızı nasıl hesaplanır?',lead:'II',
 body:`<ul>
<li><b>300 kuralı (düzenli ritim):</b> 300 ÷ iki R arasındaki büyük kare sayısı. 1 kare = 300, 2 = 150, 3 = 100, 4 = 75, 5 = 60, 6 = 50.</li>
<li><b>1500 kuralı (daha kesin):</b> 1500 ÷ iki R arasındaki küçük kare sayısı. Örnek: 20 küçük kare → 75/dk.</li>
<li><b>6 kuralı (düzensiz ritim, ör. AF):</b> 10 saniyelik kayıttaki QRS sayısı × 6.</li>
</ul>
<p>Normal dinlenme hızı 60–100/dk’dır; altı bradikardi, üstü taşikardi. Sporcularda 40’lı hızlar normal olabilir.</p>`},
{id:'okuma',t:'Adım adım sistematik EKG okuma',lead:'II',
 body:`<ol>
<li><b>Hasta bilgisi ve kalibrasyon:</b> Doğru kişi mi, tarih/saat, 25 mm/sn ve 10 mm/mV mi?</li>
<li><b>Hız:</b> 300 ya da 1500 kuralı.</li>
<li><b>Ritim:</b> RR düzenli mi? Her QRS’ten önce P var mı, her P’den sonra QRS geliyor mu? P, DII’de pozitif ve aVR’de negatifse sinüs ritmi.</li>
<li><b>Eksen:</b> I ve aVF.</li>
<li><b>Aralıklar:</b> PR (0,12–0,20), QRS (&lt; 0,12), QT/QTc.</li>
<li><b>P dalgası:</b> genişlik, yükseklik (atriyum büyümesi).</li>
<li><b>QRS:</b> patolojik Q, voltaj (hipertrofi ya da düşük voltaj), dal bloğu, R progresyonu.</li>
<li><b>ST segmenti:</b> yükselme ya da çökme, hangi derivasyon grubunda? Aynasal değişiklik var mı?</li>
<li><b>T dalgası:</b> negatif, sivri ya da düz mü?</li>
<li><b>Karşılaştır ve klinikle birleştir:</b> Eski EKG ile karşılaştır; tek bir EKG ve otomatik yorum tanı koymaz.</li>
</ol>`},
{id:'hata',t:'Elektrot hataları: kollar ters takılırsa',lead:'I',variant:'armswap',
 body:`<p>Sağ ve sol kol elektrotları yer değiştirirse kalp değil, “göz”lerin yeri değişir:</p>
<ul>
<li>${L('I')} tamamen ters döner: P, QRS ve T negatif olur.</li>
<li>${L('II')} ile ${L('III')} ve ${L('aVR')} ile ${L('aVL')} yer değiştirir. aVR pozitif görünür.</li>
<li>${L('aVF')} ve göğüs derivasyonları değişmez. Göğüs derivasyonları normal görünürken I’in ters olması bu hatanın ipucudur (dekstrokardide göğüs derivasyonlarında da R ilerlemesi bozulur).</li>
</ul>
<p>Yukarıdaki kayıtta <b>Kol elektrotları ters</b> seçeneği açık; “Normal”e geçerek karşılaştır.</p>`},
{id:'fizyoloji',t:'Kalp hücresi neden kendiliğinden atar?',lead:'II',
 body:`<p><b>Otomatisite:</b> SA düğüm hücrelerinin dinlenme potansiyeli sabit durmaz. “Funny” akım (If) ve kalsiyum kanalları sayesinde yavaşça eşik değere yükselir ve hücre kendiliğinden ateşler. Beyinden komut gerekmez; sinirler sadece hızı ayarlar. Bu yüzden nakledilen ve sinirleri kesilmiş bir kalp de atar.</p>
<p><b>Yedek pil hiyerarşisi:</b> SA düğüm 60–100/dk, AV bileşke 40–60/dk, ventrikül (Purkinje) 20–40/dk. En hızlı olan kalbi yönetir; o susarsa bir alttaki “kaçış ritmi” devreye girer.</p>
<p><b>Ventrikül kas hücresinin aksiyon potansiyeli:</b></p>
<ul>
<li>Faz 0: Hızlı sodyum girişi, hücre uyarılır (QRS).</li>
<li>Faz 1–2: Kısa geri dönüş ve kalsiyum girişiyle plato; kasılma bu sırada olur (ST segmenti).</li>
<li>Faz 3: Potasyum çıkışıyla repolarizasyon (T dalgası).</li>
<li>Faz 4: Dinlenme.</li>
</ul>
<p><b>Refrakter dönem:</b> Plato boyunca hücre yeniden uyarılamaz. Bu sayede kalp kası iskelet kası gibi sürekli kasılmaya (tetani) giremez ve uyarı geri dönüp kendini tekrar etmez. T dalgasının tepesi civarındaki “hassas dönem”de gelen bir erken uyarı VF başlatabilir (R-on-T).</p>
<p><b>AV düğüm neden bekletir?</b> ~0,1 sn’lik gecikme, atriyumların kanı ventriküllere boşaltmayı bitirmesine zaman tanır ve çok hızlı atriyal ritimlerin (AF, flutter) hepsinin ventriküllere geçmesini engeller.</p>`},
{id:'dongu',t:'Kalp döngüsü, kapaklar ve kalp sesleri',lead:'II',
 body:`<p><b>Kanın yolu:</b> Vücut → üst/alt ana toplardamarlar → sağ atriyum → triküspit kapak → sağ ventrikül → pulmoner kapak → pulmoner arter → akciğerler → pulmoner venler → sol atriyum → mitral kapak → sol ventrikül → aort kapağı → aort → vücut.</p>
<p><b>EKG ve mekanik olaylar:</b> P dalgasından hemen sonra atriyumlar kasılır. QRS’ten hemen sonra ventriküller kasılmaya başlar (sistol), T dalgası sırasında gevşemeye geçer. Elektrik her zaman kasılmadan biraz önce gelir.</p>
<ul>
<li><b>S1 (“lub”):</b> Sistol başında mitral ve triküspit kapakların kapanması. QRS’ten hemen sonra duyulur.</li>
<li><b>S2 (“dub”):</b> Sistol sonunda aort ve pulmoner kapakların kapanması. T dalgasının sonuna denk gelir. Nefes alırken pulmoner kapak biraz geç kapanır ve S2 ikiye ayrılır (fizyolojik çiftleşme).</li>
<li><b>Basınçlar (yaklaşık):</b> Sol ventrikül 120/10 mmHg, aort 120/80, sağ ventrikül 25/5, pulmoner arter 25/10 mmHg.</li>
<li><b>Ejeksiyon fraksiyonu (EF):</b> Her atımda sol ventrikülün boşalttığı kan oranı. Normal ≈ %55–70. %40’ın altı düşük EF’li kalp yetersizliği.</li>
<li><b>Dinleme odakları:</b> Aort: sağ 2. aralık; pulmoner: sol 2. aralık; triküspit: sol alt sternum kenarı; mitral: apeks (sol 5. aralık, orta köprücük çizgisi).</li>
</ul>`}
];

const FAQ=[
['Kalp neden durmadan atar, beyin mi yönetir?','Hayır. SA düğüm kendi kendine uyarı üretir (otomatisite). Sinirler ve hormonlar yalnızca hızı ve kasılma gücünü ayarlar. Beyin ölümü gerçekleşmiş birinde de kalp bir süre atmaya devam edebilir.'],
['Kalp krizi ile kalp durması aynı şey mi?','Değil. Kalp krizi (miyokard enfarktüsü) bir koroner arterin tıkanıp kasın bir bölümünün kansız kalmasıdır; kişi genellikle bilinçlidir. Kalp durması (kardiyak arrest) ise kalbin etkili pompalamayı bırakmasıdır, çoğu zaman VF yüzünden; kişi bilincini kaybeder ve hemen CPR ile defibrilasyon gerekir. Kalp krizi, kalp durmasına yol açabilir.'],
['Defibrilatör (şok) nasıl çalışır?','Güçlü bir elektrik akımı, kalp kası hücrelerinin büyük çoğunluğunu aynı anda uyarır ve kaotik VF dalgacıklarını “sıfırlar”. Ardından SA düğümün yeniden kontrolü alması beklenir. Düz çizgide (asistoli) şok verilmez, çünkü sıfırlanacak bir elektriksel etkinlik yoktur.'],
['Normal kalp hızı kaçtır?','Erişkinde dinlenirken 60–100/dk. Sporcularda ve uykuda 40–50 normal olabilir. Bebeklerde ve çocuklarda normal hız daha yüksektir.'],
['Sol ventrikül neden daha kalın?','Kanı yüksek basınçlı vücut dolaşımına pompalar (~120 mmHg), sağ ventrikül ise düşük basınçlı akciğer dolaşımına (~25 mmHg). Bu yüzden sol ventrikül duvarı yaklaşık 3 kat kalındır; EKG’de sol ventrikül kuvvetlerinin baskın olmasının nedeni de budur.'],
['Atriyumlar ve ventriküller neden aynı anda kasılmaz?','AV düğümdeki ~0,1 sn’lik gecikme sayesinde önce atriyumlar kasılıp ventrikülleri doldurur, sonra ventriküller kasılır. Aynı anda kasılsalar atriyumlar kanı kapalı kapaklara karşı itmeye çalışırdı.'],
['Bir EKG normal ise kalbim sağlam mıdır?','Her zaman değil. Dinlenme EKG’si yalnızca o 10 saniyeyi gösterir. Darlık olan bir koroner arter dinlenmede belirti vermeyebilir; ara sıra gelen ritim bozuklukları da kayda girmeyebilir. Bu yüzden efor testi, Holter ve görüntüleme gibi testler kullanılır.'],
['Troponin nedir?','Kalp kası hücrelerinde bulunan bir proteindir. Hücre hasar görünce kana karışır. Kanda yükselmesi kas hasarının en duyarlı göstergesidir ve MI tanısında EKG ile birlikte kullanılır.'],
['Anjina (göğüs ağrısı) ile MI farkı nedir?','Stabil anjinada efor sırasında kalbin oksijen ihtiyacı artar ama daralmış damar yetmez; dinlenince ağrı geçer ve kalıcı hasar olmaz. MI’da damar tamamen ya da neredeyse tamamen tıkanır, kas ölmeye başlar ve troponin yükselir.'],
['Stent ve bypass ne işe yarar?','Stent, kasıktaki ya da bilekteki atardamardan girilerek darlığın içine yerleştirilen metal bir kafestir; damarı açık tutar. Bypass ameliyatında göğüsteki ya da bacaktaki bir damar alınıp tıkanıklığın ötesine bağlanır ve kana yeni bir yol açılır. Hangisinin seçileceği darlıkların sayısına ve yerine göre değişir.'],
['AF neden inme (felç) yapar?','Atriyumlar düzenli kasılmadığı için kan, özellikle sol aurikulada durgunlaşır ve pıhtılaşır. Kopan pıhtı aorttan beyne gidip bir damarı tıkayabilir. Bu yüzden risk skoruna (CHA₂DS₂-VASc) göre kan sulandırıcı verilir.'],
['QT uzaması neden tehlikeli?','Ventriküllerin dinlenmeye dönmesi uzadıkça bazı hücreler erken ardıl depolarizasyonlar üretir ve torsades de pointes gibi ölümcül bir ritim başlayabilir. Bazı antibiyotikler, antidepresanlar, antiaritmikler, düşük potasyum ve magnezyum QT’yi uzatır.'],
['ST yükselmesi her zaman kalp krizi mi demek?','Hayır. Akut MI en önemli nedendir; ancak perikardit, erken repolarizasyon (gençlerde sık, zararsız), sol dal bloğu, sol ventrikül hipertrofisi, Brugada sendromu ve ventrikül anevrizması da ST yükselmesi yapabilir. MI’da yükselme bir arter bölgesine uyan derivasyonlardadır ve karşı derivasyonlarda aynasal çökme görülür.'],
['Neden 12 derivasyon? Bir tane yetmez mi?','Ritmi görmek için tek derivasyon çoğu zaman yeter (monitörler böyledir). Ama hasarın kalbin hangi duvarında olduğunu bulmak için kalbe farklı açılardan bakmak gerekir. Örneğin bir alt duvar MI’ı V1’de hiç görünmeyebilir ama II, III ve aVF’de belirgindir.'],
['Kalp pili (pacemaker) ne yapar?','Kalbin kendi hızı çok düştüğünde ya da ileti bloklandığında, kablosunun ucundan küçük elektrik uyarıları vererek kalbi uyarır. Modern piller kalbin kendi ritmini dinler ve yalnızca gerektiğinde uyarı verir. EKG’de QRS’ten önce ince bir “spike” görülür.'],
['Ekstrasistol (çarpıntı hissi) tehlikeli mi?','Yapısal olarak sağlıklı bir kalpte ara sıra gelen atriyal ya da ventriküler erken atımlar çok yaygındır ve genellikle zararsızdır. Çok sıksa, bayılma eşlik ediyorsa ya da altta kalp hastalığı varsa değerlendirilmelidir.'],
['Koroner dominans ne demek?','Kalbin alt yüzündeki arka inen arteri (PDA) hangi damarın verdiğini anlatır. Kişilerin %60–80’i sağ dominanttır (RCA verir); daha azı kodominant ya da sol dominanttır (LCx verir). “Dominant” olan taraf daha fazla kası beslemez; sol koroner sistem her zaman kasın büyük kısmını besler.'],
['Kalp kendi kendini nasıl besler?','Pompaladığı kanı içeriden kullanamaz; aortun hemen başından çıkan koroner arterlerle beslenir. Sol ventrikül sistolde damarları sıkıştırdığı için koroner kan akımının çoğu diyastolde olur. Bu yüzden çok yüksek hızlarda (kısa diyastol) iskemi kolaylaşır.'],
['EKG kağıdındaki kareler neyi anlatır?','25 mm/sn hızda bir küçük kare 0,04 sn, bir büyük kare 0,20 sn’dir. Dikeyde 10 mm/mV kalibrasyonla bir küçük kare 0,1 mV’dir.'],
['Dal bloğu ne demek, tehlikeli mi?','Sağ ya da sol daldan biri iletmez; o taraftaki ventrikül uyarıyı kas içinden yavaşça alır ve QRS genişler (≥ 0,12 sn). Sağ dal bloğu sağlıklı kişilerde de görülebilir. Yeni çıkmış bir sol dal bloğu ise altta yatan kalp hastalığını düşündürür ve göğüs ağrısıyla birlikteyse acil değerlendirilir.'],
['Kalp kası yenilenir mi?','Erişkin kalp kası hücreleri çok sınırlı yenilenir. MI’da ölen kas birkaç hafta içinde skar dokusuna dönüşür. Bu skar kasılmaz ve elektriği iyi iletmez; ileride VT için zemin olabilir. Bu yüzden tıkanan damarı hızla açmak (“zaman kastır”) çok önemlidir.'],
['Hiperkalemi EKG’yi neden bozar?','Hücre dışındaki potasyum artınca dinlenme potansiyeli yükselir ve sodyum kanallarının bir kısmı devre dışı kalır. Önce sivri T dalgaları, sonra PR uzaması, P kaybı, QRS genişlemesi ve sonunda sinüs dalgası ya da VF görülebilir. Acil tedavi gerektirir.']
];
window.KALP=Object.assign(window.KALP||{},{LESSONS,FAQ});
})();
