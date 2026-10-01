# Google Play Data safety — taslak

Bu dosya Play Console'daki Data safety formunu doldurmak için başlangıç taslağıdır. Google, SDK'lar dahil uygulamanın gerçek veri akışlarının beyan edilmesini ister; yayınlamadan önce son Android yapılandırması ve AdMob ayarlarıyla karşılaştırılmalıdır.

## Veri toplama / paylaşma

**Uygulama veri topluyor veya paylaşıyor mu?** Evet. Çok oyunculu meydan, konuşma tanıma ve AdMob nedeniyle cihaz dışına veri çıkabilir.

| Veri türü | Toplanıyor/paylaşılıyor | Amaç | İsteğe bağlı mı? | Not |
|---|---|---|---|---|
| Kullanıcı adı / ad | Evet | Uygulama işlevselliği | Kullanıcı meydanı kullanmadan oyunun tek oyunculu kısmını oynayabilir | Meydanda diğer oyunculara gösterilir ve sunucuya gönderilir. |
| Ses kayıtları / ses verisi | Özelliğe bağlı | Uygulama işlevselliği | Evet | Konuşma tanıma veya birebir sesli sohbet başlatılırsa kullanılır. Kalıcı ses kaydı oyunun özelliği değildir; uzak STT etkinse hizmete geçici aktarım olabilir. |
| Cihaz/reklam verileri | AdMob yapılandırmasına bağlı | Reklamcılık | AdMob'un kendi SDK akışına bağlı | AdMob'un güncel Data safety/SDK beyanları ayrıca kontrol edilmelidir. |

## Güvenlik

- Çok oyunculu ve WebRTC sinyalleşmesi üretimde HTTPS/WSS üzerinden sunulmalıdır.
- Oyun ilerlemesi ve ayarlar cihazda localStorage'da tutulur.
- Sunucuda kalıcı hesap/profil sistemi yoktur.
- Kullanıcı adları ve genel konuşma metinleri çok oyunculu sunucudan diğer oyunculara aktarılır.

## Önemli kontrol

Uzak STT sunucusu veya AdMob'un gerçek yapılandırması değişirse bu dosya ve Play Console beyanı da güncellenmelidir.

Google'ın güncel Data safety açıklaması: Play Console yardım merkezindeki **Data safety** dokümantasyonunu esas alın.
