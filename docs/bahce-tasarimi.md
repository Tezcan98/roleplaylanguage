# Bahçe: tasarım ve oyun döngüsü

İkinci gün dedenin öğrettiği, sonrasında tekrar oynanabilen küçük bir tarım oyunu. Avludaki yerleşimle aynı dokuz ekim gözü kullanılır. Görseller `GardenArt.js` içinde özgün vektör çizimleridir; ürünlerin avluda da ayrı 3B büyüme durumları vardır.

## İncelenen oyunlardan çıkarımlar

- [FarmVille 3 — ekim ve hasat](https://zyngasupport.helpshift.com/hc/en/91-farmville-3/faq/14485-how-do-i-plant-and-harvest-crops/): boş alanı seçme, ürünü alanlara sürükleyerek ekme, büyümeyi bekleme ve araçla hasat. Bizde seçilen araçla dokunma/sürükleme; her gözde okunabilir durum, süre ve büyüme aşaması.
- [Hay Day](https://supercell.com/en/games/hayday/) ve [resmî para rehberi](https://support.supercell.com/hay-day/en/articles/coins-diamonds.html): ürün satışı yeni üretimi besleyen bir döngü. Bizde hasat sepeti → bahçe parası → yeni tohum. Ana hikâyenin alışveriş parasıyla karışmaz.
- [Stardew Valley — sulama](https://stardewvalleywiki.com/Watering_Cans): susuz ürünün gelişiminin durması anlaşılır bir bakım kuralı. Bizde can suyu büyümeyi başlatır; oyuncu oyundan çıkınca gelişim sürer ve ürün solmaz. Günlük bakım zorunluluğu eklenmedi.

Bu oyunların varlıkları kopyalanmadı. Ahşap çerçeveli toprak, sıcak krem panel, adaçayı yeşili araç seçimi, çizilmiş ürünler ve sakin yaprak hareketleri köy ortamına uyarlandı.

## İlk ders

İlk gün dede yarın ekmeyi öğreteceğini söyler. İkinci gün üç fasulye tohumu verir. Oyuncu öndeki üç gözü tek tek çapalar, her birine tohum eker ve sular. Aktif ders aracını arayüz seçer; kalan altı göz ders tamamlanınca açılır. Ders okul hazırlığına geri döner; hasadı beklemek zorunlu değildir.

İlerlemiş kayıtlar ana görevlerine dokunmadan dededen aynı dersi yan görev olarak alabilir. Eski sabah görevi indeksleri ve kısmi ekimler korunur. Tohum hediyesi tekrar alınamaz.

## Tekrar oynama

1. Çapa ile boş toprağı hazırla.
2. Tohumlukta ürünü seç, hazır göze ek.
3. Can suyu ver. Sayaç gerçek zamanla çalışır ve kayıt sonrası devam eder.
4. Filiz → yapraklanma → olgun ürün. Sepet aracı yalnızca olgun ürünü toplar.
5. Sepeti sat, istediğin yeni tohumları al ve yeniden ek.

| Ürün | Süre | Tohum bedeli | Hasat | Sepet değeri |
|---|---:|---:|---:|---:|
| Fasulye | 2 dk | 1 | 2 ürün | 6 |
| Domates | 4 dk | 2 | 2 ürün | 10 |
| Biber | 6 dk | 3 | 2 ürün | 16 |

Bunlar ilk deneme dengeleri; oyuncu verisiyle ayarlanmalıdır. Dersin üç tohumu ilk döngüyü başlatır. Su ve araçlar ücretsizdir, başka noktaya gidip eşya getirme görevi yoktur.

## Telefon bildirimleri

Yerel telefon bildirimleri kullanılır; sunucudan push gönderimi gerekmez. İlk ekim/sulama sırasında sistemin bildirim izni istenir. Reddedilen izin tekrar tekrar sorulmaz.

- Her gözün ekim zamanı ve sulanma zamanı ayrı kaydedilir.
- Ekilen tohum 5 dakika sulanmazsa tek bir toplu can suyu hatırlatması planlanır.
- Sulama sırasında ürünün büyüme süresine göre hasat bildirimi planlanır. Aynı dakika içinde olgunlaşacak gözler, son ürün de olgunlaştıktan sonra tek bildirime toplanır.
- Sulanan/hasat edilen gözlerin bekleyen bildirimleri iptal edilir. Günlük ödül bildirimleriyle farklı kimlikler kullanılır.
- Aynı plan yeniden oluşturulmaz; geçmiş bildirimler uygulama açıldıkça tekrarlanmaz. Telefonun arka plan ve pil ayarları teslim zamanını geciktirebilir.

Bildirim planlama ve izin/iptal davranışı sahte yerel adaptörle test edildi; fiziksel telefonda teslim henüz doğrulanmadı.

## Telefon ve erişilebilirlik

Yatayda solda tarla, sağda kaydırılabilir tohumluk, altta araçlar. Kısa ekranlarda başlık ve araç çubuğu küçülür; araçlar ve kapat düğmesi en az 44 px kalır. Güvenli ekran kenarları hesaba katılır. Klavye, Escape ile kapatma, odak sınırı ve azaltılmış hareket tercihi desteklenir.

## Doğrulama

26 bahçe, bildirim ve sürüm tanıtımı testi: gerçek görev yöneticisi, eski kayıt geçişi, yan görev, tek tek ekim, sulama, çevrimdışı büyüme, erken/tekrar hasat, tohum tüketimi, sepet satışı, para sınırı ve statik birleştirme sonrası gerçek 3B tarhlar. İçerik/çeviri kontrolü ve üretim derlemesi çalıştırıldı.

Çizimlerin statik [önizlemesi](previews/garden-art.svg) gözle incelendi. Bu dosya oyun ekran görüntüsü değildir. Tarayıcı erişimi Work ayarlarında kapalı olduğundan arayüzün cihazda görünümü ve dokunma/sürükleme etkileşimi henüz görsel olarak doğrulanamadı. Yayın öncesi S22 boyutunda bu kontrol tamamlanmalıdır.

## İlk girişte sürüm tanıtımı

Yeni bahçe özelliği, oyun güncellemeden sonra ilk kez açıldığında hikâye kartlarının ardından resimli bir kartla tanıtılır. Kart ikinci gün dersi, ilerlemiş oyuncuların dededen yan görev alması, ürünler ve bildirimleri açıklar. Altı açıklama diline çevrilmiştir. Kullanıcı Tamam dediğinde cihaz ayarlarına sürüme özel bir anahtar yazılır; sonraki girişlerde ve aynı özelliğin OTA düzeltmelerinde yeniden gösterilmez. Oyun kaydını değiştirmez.
