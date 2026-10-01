# Google Play Data Safety — önerilen cevaplar

> Bu dosya Play Console'daki gerçek formun yerine geçmez. Yayından önce kullanılan AdMob sürümünün ve gerçek sunucu yapılandırmasının veri pratiğiyle karşılaştırılmalıdır.

## Uygulama veri topluyor mu?

**Evet.** Çok oyunculu özelliklerde kullanıcı adı ve çevrimiçi iletişim verileri işlenir. AdMob SDK'sının kendi veri işleme bildirimleri de Play Console formuna dahil edilmelidir.

## Veri türleri

| Veri | Önerilen beyan | Amaç | Paylaşım / işleme |
|---|---|---|---|
| Kullanıcı adı | Evet | Uygulama işlevselliği, çok oyunculu | Diğer oyunculara gösterilir |
| Ses / konuşma | Uygulamanın gerçek yapılandırmasına göre | Konuşma tanıma ve birebir sesli sohbet | Sesli sohbet karşı oyuncuya iletilir; kalıcı kayıt tutulmaz |
| Uygulama etkinliği / ilerleme | Cihazda tutulur | Oyun işlevselliği | Uygulamanın sunucusuna ilerleme kaydı gönderilmez |
| Reklamla ilgili veriler | AdMob'a göre | Reklam | Google/AdMob SDK'sı |
| Cihaz / tanılama verileri | AdMob ve Play Console SDK beyanlarına göre | Reklam, güvenilirlik ve tanılama | İlgili hizmet sağlayıcı |

## Güvenlik

- Kullanıcı adı ve genel konuşma metni çok oyunculu sunucu üzerinden iletilir.
- Sesli sohbet WebRTC ile iki oyuncu arasında kurulur.
- Oyun kendi tarafında ses kaydı arşivi oluşturmaz.
- Oyun ilerlemesi localStorage'da tutulur.

## Saklama

Oyun içindeki ilerleme ve ayarlar cihazda tutulur. Çok oyunculu sunucuda kalıcı oyuncu profili veya oyun ilerlemesi tutulmaması hedeflenmektedir. Sunucu logları ve altyapı sağlayıcısının teknik logları varsa gerçek saklama süresi ayrıca belgelenmelidir.

## Çocuklar

Hedef kitle çocuk olarak seçilecekse bu cevaplar yeniden değerlendirilmelidir. Özellikle kullanıcı etkileşimi, sesli sohbet ve reklamlar için Google Play Families kuralları kontrol edilmelidir.
