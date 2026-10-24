# Google Play Data safety — taslak

Bu dosya Play Console'daki Data safety formunu doldurmak için başlangıç taslağıdır. Google, SDK'lar dahil uygulamanın gerçek veri akışlarının beyan edilmesini ister; yayınlamadan önce son Android yapılandırması ve AdMob ayarlarıyla karşılaştırılmalıdır.

## Veri toplama / paylaşma

**Uygulama veri topluyor veya paylaşıyor mu?** Evet. Çok oyunculu meydan, karakterlerle serbest sohbet (Google Gemini), konuşma tanıma, Google Play satın almaları ve AdMob nedeniyle cihaz dışına veri çıkabilir.

| Veri türü | Toplanıyor/paylaşılıyor | Amaç | İsteğe bağlı mı? | Not |
|---|---|---|---|---|
| Kullanıcı adı / ad | Evet | Uygulama işlevselliği | Kullanıcı meydanı kullanmadan oyunun tek oyunculu kısmını oynayabilir | Meydanda diğer oyunculara gösterilir ve sunucuya gönderilir; sunucuda kelime listesiyle denetlenir (başka hizmete gitmez). |
| Ses kayıtları / ses verisi | Evet (meydanda) | Uygulama işlevselliği, Güvenlik/dolandırıcılık önleme | Evet (meydan isteğe bağlı) | Sesli sohbette (birebir, toplu konuşma alanları) ve meydanda bas-konuşta (bilgisayar tarayıcısında; telefonda yalnız metni) oyuncunun kendi sesi **güvenlik kaydında şifreli olarak 48 saat** saklanır; sessiz parçalar gönderilmez. Şikayette son 10 dakikanın sesi yazıya dökülmek üzere Google Gemini'ye gider ("shared"). Hikâyedeki konuşma etkinliklerinin sesi kaydedilmez. "Audio → Voice or sound recordings": collected, shared, encrypted in transit and at rest. |
| Cihaz/reklam verileri | AdMob yapılandırmasına bağlı | Reklamcılık | AdMob'un kendi SDK akışına bağlı | AdMob'un güncel Data safety/SDK beyanları ayrıca kontrol edilmelidir. |
| Uygulama içi mesajlar (karakterlerle serbest sohbet) | Evet, Google Gemini ile paylaşılır | Uygulama işlevselliği | Evet (serbest sohbet isteğe bağlı) | Mesaj, son birkaç mesaj, anlam dili ve kullanıcı adı sunucu üzerinden Gemini API'ye gider; mesaj ve cevap güvenlik kaydında şifreli olarak 90 gün saklanır. "Messages → Other in-app messages" olarak beyan edin. |
| Genel konuşma metinleri (meydan) | Evet | Uygulama işlevselliği, Güvenlik/dolandırıcılık önleme | Evet | Meydanda yazılan/söylenen genel mesajlar diğer oyunculara aktarılır ve **güvenlik kaydında şifreli olarak 90 gün saklanır**. "Messages → Other in-app messages": collected, encrypted in transit and at rest. |
| Cihaz kimliği (uygulamanın ürettiği rastgele kimlik) | Evet | Uygulama işlevselliği | Hayır (meydan için gerekli) | Reklam kimliği değil; yalnızca kopan bağlantının yerine yenisini koymak için. "Device or other IDs" olarak beyan edin. |
| Satın alma geçmişi | Google Play Faturalandırma | Uygulama işlevselliği | Evet | Ödemeyi Google işler; uygulama yalnızca satın almanın başarılı olduğunu öğrenir. "Financial info → Purchase history" Google Play üzerinden. |
| Play Games oyuncu kimliği | Evet (Android, giriş yapılırsa) | Güvenlik/dolandırıcılık önleme | Evet | Güvenlik kaydında konuşmalarla birlikte saklanır. "Personal info → User IDs". |
| IP adresi | Evet (güvenlik kaydında) | Güvenlik/dolandırıcılık önleme | Hayır | Şifreli, 90 gün. "Device or other IDs" / "Approximate location" değil: yalnızca kayıt için. |
| Oyun istatistikleri (anonim sayılar) | Evet | Analitik | Hayır | Hangi bölüme gidildiği, süre, kaç kez konuşulduğu/etkinlik yapıldığı: yalnızca sayılar, metin ya da ses yok; cihaz kimliğinin kısa özeti ile; paylaşılmaz. |
| Oyun skorları (satranç) | Evet | Uygulama işlevselliği | Evet | Kullanıcı adı + oyun sayıları sunucuda saklanır, meydanda gösterilir. |

## Güvenlik

- Çok oyunculu ve WebRTC sinyalleşmesi üretimde HTTPS/WSS üzerinden sunulmalıdır.
- Oyun ilerlemesi ve ayarlar cihazda localStorage'da tutulur.
- Sunucuda kalıcı hesap/profil sistemi yoktur.
- Kullanıcı adları ve genel konuşma metinleri çok oyunculu sunucudan diğer oyunculara aktarılır.

## Önemli kontrol

Uzak STT sunucusu veya AdMob'un gerçek yapılandırması değişirse bu dosya ve Play Console beyanı da güncellenmelidir.

Google'ın güncel Data safety açıklaması: Play Console yardım merkezindeki **Data safety** dokümantasyonunu esas alın.
