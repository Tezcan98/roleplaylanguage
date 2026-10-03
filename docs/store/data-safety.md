# Google Play Data safety — taslak

Bu dosya Play Console'daki Data safety formunu doldurmak için başlangıç taslağıdır. Google, SDK'lar dahil uygulamanın gerçek veri akışlarının beyan edilmesini ister; yayınlamadan önce son Android yapılandırması ve AdMob ayarlarıyla karşılaştırılmalıdır.

## Veri toplama / paylaşma

**Uygulama veri topluyor veya paylaşıyor mu?** Evet. Çok oyunculu meydan, karakterlerle serbest sohbet (Google Gemini), konuşma tanıma, Google Play satın almaları ve AdMob nedeniyle cihaz dışına veri çıkabilir.

| Veri türü | Toplanıyor/paylaşılıyor | Amaç | İsteğe bağlı mı? | Not |
|---|---|---|---|---|
| Kullanıcı adı / ad | Evet | Uygulama işlevselliği | Kullanıcı meydanı kullanmadan oyunun tek oyunculu kısmını oynayabilir | Meydanda diğer oyunculara gösterilir ve sunucuya gönderilir. |
| Ses kayıtları / ses verisi | Özelliğe bağlı | Uygulama işlevselliği | Evet | Konuşma tanıma veya birebir sesli sohbet başlatılırsa kullanılır. Kalıcı ses kaydı oyunun özelliği değildir; uzak STT etkinse hizmete geçici aktarım olabilir. |
| Cihaz/reklam verileri | AdMob yapılandırmasına bağlı | Reklamcılık | AdMob'un kendi SDK akışına bağlı | AdMob'un güncel Data safety/SDK beyanları ayrıca kontrol edilmelidir. |
| Uygulama içi mesajlar (karakterlerle serbest sohbet) | Evet, Google Gemini ile paylaşılır | Uygulama işlevselliği | Evet (serbest sohbet isteğe bağlı) | Mesaj, son birkaç mesaj, anlam dili ve kullanıcı adı sunucu üzerinden Gemini API'ye gider; sunucu kaydetmez. "Messages → Other in-app messages" olarak beyan edin. |
| Genel konuşma metinleri (meydan) | Evet | Uygulama işlevselliği | Evet | Meydanda yazılan/söylenen genel mesajlar sunucu üzerinden diğer oyunculara aktarılır, saklanmaz. |
| Cihaz kimliği (uygulamanın ürettiği rastgele kimlik) | Evet | Uygulama işlevselliği | Hayır (meydan için gerekli) | Reklam kimliği değil; yalnızca kopan bağlantının yerine yenisini koymak için. "Device or other IDs" olarak beyan edin. |
| Satın alma geçmişi | Google Play Faturalandırma | Uygulama işlevselliği | Evet | Ödemeyi Google işler; uygulama yalnızca satın almanın başarılı olduğunu öğrenir. "Financial info → Purchase history" Google Play üzerinden. |
| Oyun skorları (satranç) | Evet | Uygulama işlevselliği | Evet | Kullanıcı adı + oyun sayıları sunucuda saklanır, meydanda gösterilir. |

## Güvenlik

- Çok oyunculu ve WebRTC sinyalleşmesi üretimde HTTPS/WSS üzerinden sunulmalıdır.
- Oyun ilerlemesi ve ayarlar cihazda localStorage'da tutulur.
- Sunucuda kalıcı hesap/profil sistemi yoktur.
- Kullanıcı adları ve genel konuşma metinleri çok oyunculu sunucudan diğer oyunculara aktarılır.

## Önemli kontrol

Uzak STT sunucusu veya AdMob'un gerçek yapılandırması değişirse bu dosya ve Play Console beyanı da güncellenmelidir.

Google'ın güncel Data safety açıklaması: Play Console yardım merkezindeki **Data safety** dokümantasyonunu esas alın.
