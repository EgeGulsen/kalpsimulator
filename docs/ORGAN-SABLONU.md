# Organ şablonu (beş mercek)

Kalp, sitenin ilk "tam" organıdır ve sonraki organlar (akciğer, böbrek, karaciğer/GİS, sinir sistemi) aynı
şablonla eklenecek. Bu belge şablonun parçalarını ve yeni bir organ eklerken izlenecek sırayı anlatır.

## Beş mercek ve sırası

Her organ ders kitabı sırasıyla, beş mercekte öğretilir:

| # | Mercek | Ne öğretir | Kalpteki karşılığı (adres) |
|---|--------|------------|----------------------------|
| 1 | Anatomi + Histoloji | Yapı: 3D model, katmanlar, doku ve hücre | `#anatomi`, `#histoloji/<id>` |
| 2 | Fizyoloji | Normal işleyiş: akım, basınç, sinyal | `#fizyoloji/<id>`, `#ogren/<ders>` |
| 3 | Mikrobiyoloji | Etken, patogenez, tanı ölçütleri, tedavi ve korunma | `#mikrobiyoloji/<id>` |
| 4 | Fizyopatoloji | Bozulma: neden → mekanizma → bulgu → EKG/lab | `#durumlar/<durum>` |
| 5 | Farmakoloji | İlaç nereye bağlanır, hücrede ve organda ne değişir | `#farmakoloji/<id>` |

Bunlara ek olarak:

- **Hastalık yolu** (`#yol/<id>`): bir hastalığı beş mercekte sırayla gezdiren sayfa; sonunda vaka.
- **Vaka** (`#vaka/<id>`): her hastalık yolu en az bir vakayla biter.
- Her konu kartının altındaki **"Bu hastalık 5 katmanda"** şeridi, kullanıcıyı aynı hastalığın diğer merceklerine taşır.

## Veri: `window.KALP.ORGANS.<organ>`

Kalbin kaydı `js/organ-kalp.js` içindedir. Arayüz (`js/app.js`) yalnız bu yapıyı okur; çizimler `js/viz.js`'tedir.

```js
window.KALP.ORGANS.kalp = {
  id, n,
  LENSES,      // 5 mercek: {k, n, s (kısa ad), d (tek cümle)}
  HISTO,       // histoloji kesitleri
  FIZYO,       // fizyoloji konuları
  FIZYO_EKG,   // fizyoloji merceğine bağlanan EKG dersleri (LESSONS id'leri)
  FARMA_GRP,   // ilaç grupları [[anahtar, ad], ...]
  FARMA,       // ilaç sınıfları
  MIKRO,       // enfeksiyöz hastalıklar
  DUKE, JONES, // tanı ölçütü hesaplayıcıları (Mikrobiyoloji kartında işaretlenebilir)
  YOLLAR       // hastalık yolları
}
```

### Bağlantı biçimi (ref)

Konular birbirine kısa adreslerle bağlanır: `a:<yapı>` anatomi · `h:<histoloji>` · `f:<fizyoloji>` ·
`l:<EKG dersi>` · `p:<durum>` · `d:<ilaç>` · `m:<mikrobiyoloji>` · `v:<vaka>`. `app.js` içindeki `refInfo()`
bunları mercek, ad ve adrese çevirir; bilinmeyen bir adres sessizce atlanır.

### Alanlar

**HISTO** `{id, n, part, mag, boya, d, pts[[başlık, metin]], klinik, lb{}}`
`part`: 3D'de yakınlaşılacak yapı. `lb`: mikroskop çizimindeki etiketler. Çizim `KalpViz.histo(id, lb)` içinde
aynı `id` ile yazılır (SVG, solda dairesel alan, sağda etiket sütunu).

**FIZYO** `{id, n, viz, cond, part, d, pts, klinik, ctl[[anahtar, etiket]], lb{}, links[]}`
`viz`: `KalpViz.physio` içindeki canlı çizim (canvas). `ctl` düğmeleri çizimin durumunu değiştirir
(ör. Normal / Önyük ↑ / HFrEF). `cond`: 3D kalpte ve EKG'de çalışan ritim.

**COND** (fizyopatoloji, `js/scenarios.js` + `js/scenarios2.js`) kart sırası: `why[]` neden → `how` mekanizma →
`bul[]` bulgular → `ecg[]` + `lab[]`. Ritim ve 3D efekt alanları için README'deki "Yeni senaryo eklemek".

**FARMA** `{id, grp, n, ex, hedef, part, before, after, mid?, sc, mek, steps[4], ekg, end[], kontr[], yan[], rx, klinik}`
- `before` → `after`: ilaçtan önce ve sonra 3D kalpte ve EKG'de çalışan durum (`mid` varsa arada gösterilir,
  ör. adenozinde kısa AV blok). Gizli ara durumlar `cat:'_rx', hid:1` ile listelerden saklanır.
- `sc`: hücre düzeyi sahne. `t:'mem'` zar sahnesi (`tgt: gpcr|ch|pump|cot|enz`, `tl`, `lig`, `mol`, `ion`,
  `flow`, `cas[]`, `eff`); `t:'zin'` zincir/kaskad sahnesi (`nodes[]`, `enz{}`, `blk{}`, `act{}`, `side{}`, `extra`).
- `steps`: dört adım; kart ve sahne birlikte ilerler. 4. adımda 3D kalpte IV tedavi animasyonu oynar ve `after`'a geçilir.
- `rx`: hasta oluşturucudaki (Vakalar → Hasta oluştur) eşleşen tedavilerin adlarına uyan düzenli ifade; kartta
  "Hasta oluşturucudaki uyarılar" bu sayede aynı veriden gelir.

**MIKRO** `{id, n, cond, part, xray?, d, etken[[ad, tür, ipucu]], pat[4], lb{}, tani:'duke'|'jones'|null, tedavi[], korunma, links[]}`
`pat` dört patogenez adımıdır; `KalpViz.micro(id, adım, lb)` aynı `id` ile sahneyi çizer.

**YOLLAR** `{id, n, cond, vaka, a, f, m, p, d}` her katman `[[ref, ...], 'bu hastalık için o katmanda ne öğrenilir']`.
Doğrudan bir etkeni olmayan hastalıkta `m` için boş ref listesi ve kısa bir not yazılır.

## Yeni bir organ eklemek (sıra)

1. **3D model**: `tools/build_model.py` benzeri bir betikle GLB ve yapı listesi (`content.js` `S`).
2. **Veri dosyası**: `js/organ-<ad>.js` içinde `window.KALP.ORGANS.<ad>` kaydı (yukarıdaki alanlar).
3. **Çizimler**: yeni histoloji kesitleri ve fizyoloji grafikleri için `js/viz.js` içine aynı `id` ile çizim.
4. **Fizyopatoloji**: organın durumları `COND` içine (yeni bir `cat` ile).
5. **Vakalar**: her hastalık yolu için en az bir vaka (`js/cases*.js`, aynı yapı).
6. **İngilizce**: her yeni dosyanın `js/en-*.js` paketi ve `js/i18n.js` listesine eklenmesi (aşağıda).
7. **Kontrol**: masaüstü ve telefon genişliğinde her mercek, açık ve koyu tema, TR ve EN.

Şu an arayüz tek organı (`ORGANS.kalp`) okur. İkinci organ eklendiğinde yalnız `app.js`'teki `ORG` seçimi
(organ seçici ana ekranı, Aşama 2) değişecek; mercek sayfaları aynı kalır.

## İngilizce paketler

Türkçe içerik kaynaktır. İngilizce paketler `KalpI18n.add({...})` ile yüklenir ve şu biçimleri kullanır:

- Nesneler derin birleşir; diziler tümden değişir; `{$replace:1}` içeren nesne tümden değişir.
- `'X+': [...]` listeye ekler (ör. `'CASES+'`, `'CATS+'`).
- `'X~': [...]` liste öğelerini `id` (ya da `k`) ile eşleyip yalnız metinlerini birleştirir. Organ kayıtları
  bu biçimi kullanır (`'HISTO~'`, `'FARMA~'` …), böylece İngilizce paket sayısal ve teknik alanları tekrar etmez.
- Statik arayüz metinleri `js/en-ui.js` içindeki `UI` sözlüğüne (tam eşleşme) ya da `RULES` (düzenli ifade) eklenir;
  `app.js` içinde üretilen metinlerde `LG('türkçe', 'english')` kullanılır.

Kalp için paketler: `en-scenarios2.js`, `en-cases3.js`, `en-organ-kalp.js`.

## Kaynak ve dil

Klinik içerik Harrison's Principles of Internal Medicine ve güncel ESC/AHA kılavuzları referans alınarak kendi
cümlelerimizle yazılır; hedef okur 1.–3. sınıf tıp öğrencisidir. Doz ve protokoller eğitim amaçlıdır.
