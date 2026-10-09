# Anadolu Ailesi — Gizlilik Politikası

**Son güncelleme:** 10 Ekim 2026

Anadolu Ailesi, Türkçe öğrenmeyi hikâye ve 3D köy yaşamı üzerinden sunan bir oyundur. Bu metin, uygulamanın hangi verileri kullandığını sade biçimde açıklar.

## 1. Mikrofon ve konuşma

Uygulama mikrofonu iki özellik için kullanabilir:

- **Konuşma tanıma:** Oyuncunun söylediği Türkçe cümleyi oyundaki konuşma etkinliklerinde değerlendirmek için kullanılır.
- **Birebir sesli sohbet:** Köy meydanında iki oyuncu birbirinin isteğini kabul ettiğinde sesli iletişim kurulabilir.

Oyunun kendisi **ses kayıtlarını kalıcı olarak saklamaz**. Android'de konuşma tanıma için cihazın yerel konuşma tanıma servisi kullanılır. İsteğe bağlı bir uzak STT sunucusu yapılandırılırsa ses verisi tanıma amacıyla bu sunucuya geçici olarak gönderilebilir; bu sunucunun işletmecisi veriyi saklamayacak şekilde yapılandırılmalıdır.

Sesli sohbet WebRTC ile iki oyuncu arasında kurulur; sinyalleşme sunucusu bağlantının kurulmasına yardımcı olur ancak konuşma kaydı tutmak oyunun özelliği değildir.

## 2. Kullanıcı adı ve cihaz kimliği

Köy meydanında çok oyunculu bağlantı için seçtiğiniz kullanıcı adı diğer oyunculara gösterilir. Kullanıcı adı cihazınızda da ayarlanabilir.

Bağlantı koptuğunda yeniden bağlanan oyuncunun eski oturumunu kapatabilmek için uygulama, cihazda rastgele üretilen bir **cihaz kimliğini** sunucuya gönderir. Bu kimlik reklam kimliği değildir, kişiyi tanımlamaz ve yalnızca bağlantı süresince kullanılır.

Dev satranç tahtasındaki **skor tablosu** için kullanıcı adı ile oynanan, kazanılan ve berabere biten oyun sayıları sunucuda saklanır ve meydandaki herkese gösterilir.

## 2a. Karakterlerle serbest sohbet (yapay zekâ)

Oyundaki bazı karakterlerle serbest sohbet edilebilir. Bu sohbette yazdığınız ya da söylediğiniz (yazıya çevrilmiş) mesaj, sohbetin son birkaç mesajı, seçtiğiniz anlam dili ve kullanıcı adınız, oyunun sunucusu üzerinden **Google Gemini** hizmetine gönderilir ve karakterin cevabı oradan gelir. Oyunun sunucusu bu mesajları kaydetmez. Google'ın Gemini API kullanım koşulları ve gizlilik politikası ayrıca geçerlidir. Sohbette kişisel bilgilerinizi paylaşmamanızı öneririz.

## 2b. Karakter sesleri

Karakterlerin sabit repliklerinin sesi oyunun sunucusunda üretilir: erkek sesleri sunucudaki açık kaynaklı Piper ile, kadın sesleri Google Gemini metinden sese hizmetiyle. Bunun için sunucuya yalnızca söylenecek cümlenin metni gönderilir; üretilen ses dosyası herkes için aynı olduğundan sunucuda saklanır ve tekrar kullanılır. Kişisel veri içermez.

## 2c. Güvenlik kaydı (90 gün)

Oyuncuları, özellikle çocukları korumak için **köy meydanındaki yazılı konuşmalar** (konuşma balonları) ve **karakterlerle serbest sohbetteki mesajlar**, sunucuda **şifreli olarak 90 gün** saklanır; sonra otomatik olarak silinir. Kayıtta mesajın metni (karakter sohbetinde karakterin cevabı da), zamanı, oda, kullanıcı adı, cihaz kimliği, varsa Google Play Games oyuncu kimliği ve IP adresi bulunur.

- Kayıtlar, yalnızca yetkili güvenlik görevlisinde bulunan bir anahtarla açılabilecek şekilde şifrelenir; oyunun sunucusu kayıtları yazabilir ama okuyamaz.
- Kayıtlar yalnızca zararlı veya tehlikeli konuşmaları (taciz, zorbalık, tehdit, uygunsuz içerik, kişisel bilgi isteme vb.) incelemek, gerekirse ilgili hesabı engellemek ve yasal bir talep olduğunda yetkili makamlarla paylaşmak için kullanılır.
- **Sesli sohbet kaydedilmez:** iki oyuncu arasında doğrudan kurulur.
- Oyun içinde meydana ilk girişte ve sohbet kutusunda bu kayıt hakkında bilgi verilir.

## 2d. Google Play Games girişi (Android)

Android sürümünde oyun, Google Play Games'e otomatik olarak giriş yapmayı dener. Giriş yapılırsa yalnızca **Play Games oyuncu kimliği** (ve görünen ad) alınır ve güvenlik kaydında kullanılır. Oyun e-posta adresinizi veya Google hesap bilginizi görmez. Play Games'e giriş yapmadan da oynayabilirsiniz.

## 3. Oyun ilerlemesi ve ayarlar

Oyun ilerlemesi, kelime bilgisi, kredi bakiyesi ve bazı ayarlar cihazdaki **localStorage** alanında tutulur. Bunlar oyunun kendi sunucusuna ilerleme kaydı olarak gönderilmez.

## 4. Reklamlar, satın almalar ve bildirimler

- **Reklamlar:** Kredi kazanmak için isteğe bağlı **ödüllü video** izlenebilir; hikâye modunda günler arasında **tam ekran reklam** gösterilir (reklamsız mod satın alınınca gösterilmez). Android sürümünde reklamlar Google AdMob üzerinden gösterilir. AdMob, kendi hizmeti kapsamında cihaz ve reklamla ilgili verileri (ör. reklam kimliği) işleyebilir; uygulama ilk açılışta gerekli yerlerde reklam izni (rıza) ister. Google'ın güncel reklam ve gizlilik politikaları ayrıca geçerlidir.
- **Satın almalar:** Kredi paketleri **Google Play Faturalandırma** ile satılır. Ödeme bilgileriniz Google tarafından işlenir; uygulama ve sunucusu kart veya ödeme bilgisi görmez ve saklamaz. Kredi bakiyesi cihazda tutulur.
- **Bildirimler:** Android'de izin verirseniz uygulama günlük ödül için cihazda yerel bir hatırlatma bildirimi planlar. Bunun için sunucuya veri gönderilmez.

## 5. İsteğe bağlı ses modelleri

Doğal/neural karakter sesleri etkinleştirilirse gerekli ses modelleri **Hugging Face** üzerinden indirilebilir. Bu modeller cihazda kullanılmak üzere önbelleğe alınır. Neural sesler Android sürümünde varsayılan olarak kapalıdır.

## 6. Çok oyunculu güvenlik

Köy meydanında kullanıcı adları ve genel konuşma metinleri sunucudan diğer oyunculara aktarılır. Kötüye kullanımı azaltmak için kullanıcı adı ve genel konuşmada Türkçe, Arapça ve İngilizce kısa bir küfür filtresi uygulanır. Oyuncular ayrıca cihazlarında başka oyuncuları engelleyebilir.

## 7. Saklama ve silme

- Yerel oyun ilerlemesi ve ayarlar, uygulamanın cihazdaki localStorage verisi temizlendiğinde silinir.
- Kullanıcı adı ve cihaz kimliği, çok oyunculu bağlantı açık olduğu sürece sunucu tarafında oturum verisi olarak tutulur; kalıcı hesap sistemi yoktur.
- Güvenlik kaydı (meydan ve karakter sohbeti mesajları) şifreli olarak 90 gün saklanır ve sonra otomatik silinir.
- Satranç skor tablosundaki kullanıcı adı ve oyun sayıları sunucuda kalır; silinmesini istediğiniz kullanıcı adı için geliştiriciye yazabilirsiniz.
- Karakter sesleri (kişisel veri içermeyen ses dosyaları) sunucuda önbellek olarak saklanır.
- Sunucunun geçici bağlantı/log verileri üretim sunucusunun yapılandırmasına bağlıdır ve yayın öncesinde gerçek saklama süresi ayrıca belirlenmelidir.
- Kalıcı kullanıcı hesabı veya hesap silme özelliği eklenirse bu politika ve Play Console beyanları buna göre güncellenmelidir.

## 8. Çocuklar ve ebeveynler

Uygulamada çevrimiçi oyuncu etkileşimi ve sesli sohbet bulunur. Uygulamanın hedef kitlesi çocuklar olarak seçilecekse Google Play'in çocuklar/aileler için güncel şartları ayrıca değerlendirilmelidir; özellikle sesli sohbet özelliği için uygun yaş ve güvenlik ayarları belirlenmelidir.

## 9. İletişim

Gizlilik politikasıyla ilgili sorularınız için uygulamanın Google Play mağaza sayfasında yayınlanan geliştirici iletişim adresini kullanabilirsiniz.

> Bu belge Play Console için taslaktır. Yayına almadan önce gerçek geliştirici/şirket adı, iletişim adresi ve varsa veri işleyen hizmetlerin hukuki bilgileri eklenmelidir.
