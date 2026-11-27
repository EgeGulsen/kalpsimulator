# Kalp Simülatörü

Gerçek bir insan kalbi modeli üzerinde kasları, ileti sistemini ve otonom sinirleri 3D olarak incelemek;
27 ritim bozukluğunu ve klinik tabloyu (AF, flutter, AV bloklar, dal blokları, WPW, VT, torsades, VF,
asistoli, kalp pili, ön/alt duvar MI, tamponad, pulmoner emboli, perikardit, hiper/hipokalemi…)
canlandırılmış kalp ve örnek EKG ile izlemek; **Öğren** bölümünde 12 derivasyonlu EKG'yi kalbin etrafına
yerleştirilmiş elektrotlarla adım adım öğrenmek için eğitim amaçlı bir web uygulaması.

> **Tıbbi tavsiye değildir.** Uyarı yayılımı, ileti sisteminin modeldeki yeri ve EKG çizgileri yaklaşık örneklerdir.

## Çalıştırma (npm ile, önerilen)

1. [Node.js](https://nodejs.org) LTS sürümünü kurun (18 veya üstü). Kontrol: `node -v`
2. Zip'i açın (örneğin masaüstüne `kalp-simulatoru` klasörü olarak).
3. Terminali bu klasörde açın ve:

```bash
npm install      # yalnızca ilk sefer: Vite'ı node_modules içine indirir
npm run dev      # http://localhost:5173 adresini tarayıcıda açar
```

Durdurmak için terminalde `Ctrl + C`. Diğer komutlar:

```bash
npm run build    # yayınlanabilir kopyayı dist/ klasörüne üretir
npm run preview  # dist/ klasörünü yerelde dener
```

three.js (r147, MIT) ve yazı tipleri CDN'den yüklenir, bu yüzden sayfa açılırken internet gerekir.
3D model (`assets/heart.glb`) `fetch` ile okunduğu için `index.html`'e çift tıklamak modeli yükleyemez; mutlaka
bir yerel sunucu kullanın. Node kurmak istemezseniz Python da yeter: `python3 -m http.server 8000` → `http://localhost:8000`.

Doğrudan bir bölüme bağlantı verilebilir: `#durumlar/af`, `#durumlar/stemi_ant`, `#ogren/avr`, `#ogren/rprog`, `#ogren/sss` …

## Beş mercek

Kalp ders kitabı sırasıyla beş mercekte öğretilir: **Anatomi + Histoloji → Fizyoloji → Fizyopatoloji →
Farmakoloji → Mikrobiyoloji**. Her hastalık bir **hastalık yolunda** (`#yol/<id>`) bu beş katmanda gezilir ve
bir vakayla biter. Ayrıntı ve yeni organ ekleme sırası: [docs/ORGAN-SABLONU.md](docs/ORGAN-SABLONU.md).

## Sına (kendini sınama)

`#sina` bölümünde üç soru türü var; **Karışık** üçünden rastgele seçer:

- **EKG’den tanı koy:** kayan EKG şeridinden durumu seç (25 senaryo). Cevaptan sonra EKG bulguları ve 3D kalp gösterilir.
- **Kalpte bul ve tıkla:** adı verilen yapıyı (dallar, venler, kapaklar, ileti sistemi…) 3D kalpte tıkla. 3 hak vardır;
  bilemezsen kalp doğru tarafa çevrilir ve yapı işaretlenir. Soru sırasında isim etiketleri gizlenir.
- **EKG bilgisi:** açıklamalı çoktan seçmeli sorular (`js/quiz.js` → `MCQ`), her biri ilgili derse bağlanır.

Klavye: 1–4 cevap, Enter sonraki soru. Skor ve en iyi seri tarayıcıda saklanır.
Doğrudan bağlantı: `#sina/ecg`, `#sina/bul`, `#sina/bilgi`, `#sina/karisik`.

## Vaka (hasta simülatörü)

`#vaka` bölümünde 8 öğretici kalp vakası var (ör. ön duvar STEMI, inferior MI + sağ ventrikül, AF, SVT,
hiperkalemi, tam AV blok, torsades, VF arrest). Her vakada hasta kartı (yaş, cinsiyet, kilo/VKİ, kronik hastalıklar,
ilaçlar, alerjiler), şikâyet, vital bulgular ve gerekirse laboratuvar vardır. Öğrenci adım adım önce **tanıyı**,
sonra **tedaviyi** seçer; her seçeneğin neden doğru/yanlış olduğu açıklanır.

- **Seviye** vaka başlamadan seçilir: *Başlangıç* (az seçenek, ipucu kutusu açık, EKG dalgaları etiketli, yanlışta
  yeniden dene), *Orta* (daha çok adım ve seçenek, ipucu −2 puan), *İleri* (tüm adımlar ve seçenekler, tek ipucu −3,
  ikinci şans yok). Puan: adım başına 10, yanlış başına −4. En iyi skor tarayıcıda saklanır.
- **Tedavi animasyonları** 3D modelde oynar ve bitince monitördeki ritim değişir: defibrilasyon/kardiyoversiyon
  (pedler, şok, sıçrama), primer PKG (kateter, balon, stent; tıkanıklık açılır), IV ilaç (kolda damar yolu,
  ilaç SVC → sağ kalp → pulmoner artere akar), vagal manevra (vagus parlar), KPR (göğüs basısı).
- **Gövde:** Durumlar ve Vaka bölümlerinde kalp, omuzdan bele kadar yarı saydam bir gövdenin (kaburgalar,
  sternum, köprücük kemikleri, omurga) içinde görünür; araç çubuğundaki **Gövde** ile kapatılabilir.

Klavye: 1–9 cevap, Enter sonraki adım. Doğrudan bağlantı: `#vaka/gogus`, `#vaka/arrest`, `#vaka/svt` …
Yeni vaka eklemek için `js/cases.js` → `CASES` dizisine bir nesne ekleyin (`cond` bir `COND` anahtarı olmalı;
adımlar `{lv, q, o:[[metin, doğru_mu, açıklama]], h:[ipuçları], dx?, anim?:{k:'defib'|'cardiovert'|'pci'|'iv'|'vagal'|'cpr'}, next?}`).

## Parçaları incele

Alttaki **Parçalar** düğmesi soldaki listeyi parça paneline çevirir. Her parça (odacıklar, septumlar, kapaklar,
damarlar, ileti sistemi, sinirler) için göster/gizle (●/○) ve şeffaflık kaydırıcısı vardır. Bir parçanın adına
tıklayınca seçilen moda göre: **Parlasın** (diğer dokuların arasında turuncu parlar; "Diğerleri" kaydırıcısı geri
kalan her şeyi saydamlaştırır), **Yalnız o kalsın** (ekranda sadece o parça kalır, kamera ona yaklaşır) veya **Normal**.
"Tümünü göster" ayarları sıfırlar.

## Öğren bölümü

- 13 ders: EKG nedir, P/QRS/T (normal süre ve genlikler), "dalga elektroda doğru gelirse çizgi yukarı" kuralı,
  12 derivasyonun baktığı duvarlar, aVR neden ters, V1 neden rS, R progresyonu ve "zayıf R progresyonu / eski ön duvar MI"
  uyarısı, eksen, hız hesabı, sistematik okuma, elektrot hataları, otomatisite, kalp döngüsü.
- 12 derivasyon (4×3 ızgara) canlı çizilir; bir derivasyona tıklayınca 3D kalpte elektrotu, baktığı yön ve anlık
  kalp vektörü gösterilir. "Bu derivasyonun gözünden bak" kamerayı o elektrotun yerine taşır.
- Örnek kayıtlar: Normal, Eski ön duvar MI (V1–V3 QS), Kol elektrotları ters takılmış.
- 22 soruluk aranabilir Sık Sorulan Sorular.

## Klasör yapısı

```
index.html              Sayfa iskeleti
package.json            npm komutları (Vite geliştirme sunucusu)
vite.config.js          Vite ayarları
css/style.css           Tüm stiller (koyu tema)
js/content.js           Anatomi içerikleri: 63 yapı ve alt yapı (S, p = üst yapı), gruplar (GROUPS), kaynaklar (SOURCES)
js/scenarios.js         Senaryolar (COND) ve kategoriler (CATS): neden, mekanizma, EKG, klinik not
js/lessons.js           Öğren bölümünün dersleri (LESSONS) ve klinik soru–cevap (FAQ: [konu, soru, cevap])
js/quiz.js              Sına bölümünün çoktan seçmeli soruları (MCQ) ve EKG soru havuzu (ECG_POOL)
js/cases.js             Vaka bölümünün hasta vakaları (CASES) ve seviyeler (LEVELS)
js/ecg12.js             12 derivasyon modeli: derivasyon yönleri, kalp vektörü, örnek kayıtlar
js/sim.js               Ritim zamanlayıcısı, sentetik EKG (DII/DIII/V1/V2), ileti zamanlamaları
js/heart3d.js           GLB modeli yükler; uyarı dalgası, kasılma, ileti sistemi, duruma özel efektler,
                        gövde ve tedavi animasyonları
js/scenarios2.js        Aşama 1 durumları (kalp yetmezliği, kapaklar, kardiyomiyopatiler, endokardit, miyokardit,
                        romatizmal ateş), tüm durumlara bulgu/lab ve hasta oluşturucu tedavileri
js/cases3.js            Hastalık yollarını bitiren vakalar (endokardit, ARF, miyokardit, KY, aort darlığı)
js/organ-kalp.js        Kalbin beş mercekli organ kaydı (histoloji, fizyoloji, farmakoloji, mikrobiyoloji, yollar)
js/viz.js               Mercek görselleri: mikroskop, fizyoloji grafikleri, ilaç ve patogenez sahneleri
js/i18n.js, js/en-*.js  İngilizce dil desteği ve çeviri paketleri
docs/ORGAN-SABLONU.md   Yeni bir organı beş mercekle eklemek için şablon
js/app.js               Arayüz, mod geçişi (#anatomi / #durumlar / #ogren / #sina), EKG ve 12 derivasyon çizimi
assets/heart.glb        Kalp modeli (19 parça: odacıklar, septumlar, kapaklar, koronerler, büyük damarlar)
assets/heart.landmarks.json  Modelden çıkarılan referans noktaları (tepe, taban, kapak merkezleri…)
tools/build_model.py    GLB'yi BodyParts3D STL dosyalarından yeniden üretir
tools/copy-static.mjs   npm run build sonrası js/, css/, assets/ klasörlerini dist/ içine kopyalar
arsiv/v1.html           İlk 2D sürüm (referans için)
```

## Alt yapılar (dallar, aurikulalar…)

Modelde koroner arterler, venler, aort ve pulmoner damarlar tek parça olarak gelir. `js/heart3d.js` içindeki `RULE`
tablosu her köşeyi kalbin kendi eksenlerine göre (taban→tepe yüksekliği, septuma uzaklık, ön/arka) bir alt yapıya
atar (ör. LAD gövdesi / diyagonal / sağ ventrikül dalları; RCA / konus / akut marjinal / PDA / posterolateral).
Tıklanan noktanın adı bu tablodan gelir. Sınırlar yaklaşıktır; yeni bir alt yapı eklemek için kurala bir ad ve
`content.js`'e aynı adla bir girdi ekleyin.

## Yeni senaryo eklemek

`js/scenarios.js` içindeki `COND` nesnesine bir girdi ekleyin. Metin alanları: `n`, `tag`, `sum`, `why[]`,
`how`, `bul[]` (bulgular), `ecg[]`, `lab[]` (laboratuvar/görüntüleme), `mus`, `ner`, `cli`, `note`, `read{}`, `lead`. Davranış:

- `r` (ritim): `atrial: 'sinus'|'af'|'flutter'|'retro'|'none'`, `rate`, `pr`, `av: 'wenck'|'mobitz2'|'complete'`,
  `vent: 'af'|'flutter'|'escape'|'vt'|'torsades'|'vf'|'none'|'svt'|'paced'`, `ventRate`,
  `morph` (EKG şekli, `js/sim.js` → `MORPH`), `act` (ventrikül aktivasyon haritası:
  `normal|rbbb|lbbb|wpw|vt|paced|slow`), `pvc:'bigeminy'`, `volt`, `alternans`, `pAmp`, `prDep`
- `off`: çalışmayan ileti yapıları (koyu sarı), `nerveOn`: baskın otonom sinir
- `fx` (3D efekt): `af`, `flutter`, `svt`, `block`, `blockFlash`, `ap`, `focus`, `scar`, `chaos`, `dead`,
  `lead`, `infarct: 'lad'|'rca'`, `sac: 'fluid'|'inflamed'`, `swing`, `rvDilate`, `clot`,
  `veg: 'mit'|'aov'|'tri'` (vejetasyon), `lvDilate`

## Modeli yeniden üretmek

```bash
pip install trimesh fast_simplification scipy shapely networkx rtree
python3 tools/build_model.py <BodyParts3D_stl_klasörü> assets/heart.glb
```

## Lisanslar

- Kod: projenin sahibinin seçeceği lisans.
- 3D kalp modeli: [BodyParts3D](https://lifesciencedb.jp/bp3d/), © 2008 Life Science Integrated Database Center,
  [CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/). `assets/heart.glb` bu verinin sadeleştirilmiş
  ve bölümlere ayrılmış bir türevidir; aynı lisansla paylaşılmalıdır ve kaynak gösterilmelidir (sayfanın altında yer alır).
- three.js: MIT.
