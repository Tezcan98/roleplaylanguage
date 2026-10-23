# Türk Ailem — Gizlilik Politikası

**Son güncelleme:** 23 Ekim 2026

Türk Ailem, çocukların dil gelişimini ve sosyalleşmesini hikâye ve 3D köy yaşamı üzerinden destekleyen bir oyundur. Bu metin, uygulamanın hangi verileri kullandığını sade biçimde açıklar.

## 1. Mikrofon ve konuşma

Uygulama mikrofonu üç özellik için kullanabilir:

- **Konuşma tanıma:** Oyuncunun söylediği Türkçe cümleyi oyundaki konuşma etkinliklerinde değerlendirmek için kullanılır.
- **Bas-konuş:** Köy meydanında konuş düğmesine basılı tutulduğunda söylenen cümle yazıya çevrilir ve herkesin göreceği bir konuşma balonu olarak gösterilir.
- **Sesli sohbet:** Köy meydanında iki oyuncu birbirinin isteğini kabul ettiğinde ya da kahvehane, cami avlusu gibi toplu konuşma alanlarında konuş düğmesine basılı tutulduğunda sesli iletişim kurulur.

Hikâyedeki konuşma etkinliklerinde söylenenler kaydedilmez. Android'de konuşma tanıma için cihazın yerel konuşma tanıma servisi kullanılır. İsteğe bağlı bir uzak STT sunucusu yapılandırılırsa ses verisi tanıma amacıyla bu sunucuya geçici olarak gönderilebilir; bu sunucunun işletmecisi veriyi saklamayacak şekilde yapılandırılmalıdır.

Sesli sohbet WebRTC ile oyuncular arasında kurulur. **Güvenlik için, oyuncunun mikrofonu sesli sohbette ya da meydanda bas-konuş ile konuşurken açıkken kendi sesi kısa parçalar hâlinde oyunun sunucusuna da gönderilir ve güvenlik kaydında saklanır** (bkz. 2c). İçinde konuşma olmayan (sessiz) parçalar gönderilmez ve saklanmaz. Bu bilgi meydana ilk girişteki onay kartında verilir ve onay alınır (bkz. 2c).

## 2. Kullanıcı adı ve cihaz kimliği

Köy meydanında çok oyunculu bağlantı için seçtiğiniz kullanıcı adı diğer oyunculara gösterilir. Kullanıcı adı cihazınızda da ayarlanabilir.

Bağlantı koptuğunda yeniden bağlanan oyuncunun eski oturumunu kapatabilmek için uygulama, cihazda rastgele üretilen bir **cihaz kimliğini** sunucuya gönderir. Bu kimlik reklam kimliği değildir, kişiyi tanımlamaz ve yalnızca bağlantı süresince kullanılır.

Dev satranç tahtasındaki **skor tablosu** için kullanıcı adı ile oynanan, kazanılan ve berabere biten oyun sayıları sunucuda saklanır ve meydandaki herkese gösterilir.

## 2a. Karakterlerle serbest sohbet (yapay zekâ)

Oyundaki bazı karakterlerle serbest sohbet edilebilir. Bu sohbette yazdığınız ya da söylediğiniz (yazıya çevrilmiş) mesaj, sohbetin son birkaç mesajı, seçtiğiniz anlam dili ve kullanıcı adınız, oyunun sunucusu üzerinden **Google Gemini** hizmetine gönderilir ve karakterin cevabı oradan gelir. Oyunun sunucusu bu mesajları kaydetmez. Google'ın Gemini API kullanım koşulları ve gizlilik politikası ayrıca geçerlidir. Sohbette kişisel bilgilerinizi paylaşmamanızı öneririz.

## 2b. Karakter sesleri

Karakterlerin sabit repliklerinin sesi oyunun sunucusunda üretilir: erkek sesleri sunucudaki açık kaynaklı Piper ile, kadın sesleri Google Gemini metinden sese hizmetiyle. Bunun için sunucuya yalnızca söylenecek cümlenin metni gönderilir; üretilen ses dosyası herkes için aynı olduğundan sunucuda saklanır ve tekrar kullanılır. Kişisel veri içermez.

## 2c. Güvenlik kaydı (90 gün)

Oyuncuları, özellikle çocukları korumak için **köy meydanındaki yazılı konuşmalar** (konuşma balonları) ve **karakterlerle serbest sohbetteki mesajlar** sunucuda **şifreli olarak 90 gün**, **sesli sohbetler ve bas-konuş** (birebir sohbet, toplu konuşma alanları ve meydanda bas-konuş; her oyuncunun mikrofonu açıkken kendi sesi) ise **şifreli olarak 48 saat** saklanır; sonra otomatik olarak silinir. Kayıtta mesajın metni ya da ses parçası (karakter sohbetinde karakterin cevabı da), zamanı, oda, kiminle konuşulduğu, kullanıcı adı, cihaz kimliği, varsa Google Play Games oyuncu kimliği ve IP adresi bulunur.

- Kayıtlar, yalnızca yetkili güvenlik görevlisinde bulunan bir anahtarla açılabilecek şekilde şifrelenir; oyunun sunucusu kayıtları yazabilir ama okuyamaz.
- Kayıtlar yalnızca zararlı veya tehlikeli konuşmaları (taciz, zorbalık, tehdit, uygunsuz içerik, kişisel bilgi isteme vb.) incelemek, gerekirse ilgili hesabı engellemek ve yasal bir talep olduğunda yetkili makamlarla paylaşmak için kullanılır.
- **Onay:** Köy meydanına (çok oyunculu alana) ilk girişte bu kayıtlar ve nasıl işlendikleri bir kartta anlatılır; oyuncu "Okudum, kayıt tutulmasını ve bu şekilde işlenmesini kabul ediyorum" kutusunu işaretleyip kabul etmeden meydana bağlanamaz (kabul etmezse oyunu çevrimdışı oynamaya devam eder). Onay cihazda saklanır ve kanıt olarak tarihiyle birlikte güvenlik kaydına yazılır. 18 yaşından küçük oyunculardan metni anne-babalarıyla okumaları istenir.
- **Şikayet:** Oyuncular rahatsız oldukları birini oyun içindeki 🚩 düğmesiyle şikayet edebilir. Bu durumda şikayet edilen oyuncunun son 10 dakikada yazdıkları ve sesli söyledikleri (sunucunun belleğinde yalnızca 10 dakika tutulur) yazıya dökülüp değerlendirilmek üzere **Google Gemini** hizmetine gönderilir. Sonuç (döküm, karar, gerekçe) şikayet kaydıyla birlikte sunucuda saklanır ve bir yetkiliye iletilir; engelleme kararını yetkili verir. Aynı oyuncu kısa sürede birden çok kişi tarafından şikayet edilirse, ses kayıtları incelenmek üzere yetkiliye e-postayla gönderilebilir. Sürekli asılsız şikayette bulunan oyuncu bir süre şikayet edemez. Şikayet edilen oyuncuya kimin şikayet ettiği söylenmez.
- **Engelleme:** Engellenen oyuncunun cihaz kimliği, varsa Play Games kimliği ve kullanıcı adı, engel süresince sunucuda tutulur; engellenen oyuncu diğer oyuncularla etkileşime giremez.
- Oyun içinde meydana ilk girişte ve sohbet kutusunda bu kayıt hakkında bilgi verilir.

## 2d. Google Play Games girişi (Android)

Android sürümünde oyun, Google Play Games'e otomatik olarak giriş yapmayı dener. Giriş yapılırsa yalnızca **Play Games oyuncu kimliği** (ve görünen ad) alınır ve güvenlik kaydında kullanılır. Oyun e-posta adresinizi veya Google hesap bilginizi görmez. Play Games'e giriş yapmadan da oynayabilirsiniz.

## 3. Oyun ilerlemesi ve ayarlar

Oyun ilerlemesi, kelime bilgisi, kredi bakiyesi ve bazı ayarlar cihazdaki **localStorage** alanında tutulur. Bunlar oyunun kendi sunucusuna ilerleme kaydı olarak gönderilmez.

## 3a. Anonim oyun istatistikleri

Oyunu geliştirmek için oyunun sunucusu **anonim kullanım sayıları** toplar: oyunun kaç cihazda açıldığı, hangi bölüme kadar gidildiği, ne kadar süre oynandığı ve hangi yerlerin, karakterlerin ve etkinliklerin kaç kez kullanıldığı (ör. "annenle konuşma: 3", "köy meydanında yazılan cümle sayısı: 5"). Bu sayılar **yalnızca sayıdır**: kimin ne yazdığı ya da söylediği, kullanıcı adı, ad, konum, rehber ya da reklam kimliği bu kayda **girmez**. Cihazlar, oyunun kendi ürettiği rastgele cihaz kimliğinin kısaltılmış bir özetiyle ayırt edilir (reklam kimliği değildir, kişiyi tanımlamaz). Günlük sayılar sunucuda 30 gün ayrıntılı tutulur; cihaz başına küçük bir özet (ilk ve son gün, en ileri bölüm, toplam süre) süresiz saklanır ve istek üzerine silinir (bkz. 9. İletişim). Reklam sayıları ayrıca ve yine anonim olarak aynı şekilde sayılır. Bu veriler kimseyle paylaşılmaz ve reklam amacıyla kullanılmaz.

## 4. Reklamlar, satın almalar ve bildirimler

- **Reklamlar:** Kredi kazanmak için isteğe bağlı **ödüllü video** izlenebilir; hikâye modunda günler arasında **tam ekran reklam** gösterilir (reklamsız mod satın alınınca gösterilmez). Android sürümünde reklamlar Google AdMob üzerinden gösterilir. AdMob, kendi hizmeti kapsamında cihaz ve reklamla ilgili verileri (ör. reklam kimliği) işleyebilir; uygulama ilk açılışta gerekli yerlerde reklam izni (rıza) ister. Google'ın güncel reklam ve gizlilik politikaları ayrıca geçerlidir.
- **Satın almalar:** Kredi paketleri **Google Play Faturalandırma** ile satılır. Ödeme bilgileriniz Google tarafından işlenir; uygulama ve sunucusu kart veya ödeme bilgisi görmez ve saklamaz. Kredi bakiyesi cihazda tutulur.
- **Bildirimler:** Android'de izin verirseniz uygulama günlük ödül için cihazda yerel bir hatırlatma bildirimi planlar. Bunun için sunucuya veri gönderilmez.

## 5. İsteğe bağlı ses modelleri

Doğal/neural karakter sesleri etkinleştirilirse gerekli ses modelleri **Hugging Face** üzerinden indirilebilir. Bu modeller cihazda kullanılmak üzere önbelleğe alınır. Neural sesler Android sürümünde varsayılan olarak kapalıdır.

## 6. Çok oyunculu güvenlik

Köy meydanında kullanıcı adları ve genel konuşma metinleri sunucudan diğer oyunculara aktarılır. Kötüye kullanımı azaltmak için **kullanıcı adları ve meydandaki konuşma balonları otomatik denetimden geçer**: Türkçe, Arapça ve İngilizce bir küfür ve zararlı kelime listesi ile meydandaki balonların Türkçe olup olmadığına bakan bir kontrol. Bu denetim oyunun kendi sunucusunda yapılır; metin bunun için başka bir hizmete gönderilmez. Uygun bulunmayan kullanıcı adı kabul edilmez (oyuncuya nedeni söylenir), uygun bulunmayan balon diğer oyunculara gösterilmez ve güvenlik kaydına yazılır (bkz. 2c). Bu denetime ileride bir yapay zekâ sınıflandırma hizmeti (ör. Google Gemini) eklenirse, bu politika hangi verinin o hizmete gittiğini belirtecek şekilde önceden güncellenir. Oyuncular ayrıca cihazlarında başka oyuncuları engelleyebilir ve 🚩 düğmesiyle şikayet edebilir (bkz. 2c).

## 7. Saklama ve silme

- Yerel oyun ilerlemesi ve ayarlar, uygulamanın cihazdaki localStorage verisi temizlendiğinde silinir.
- Kullanıcı adı ve cihaz kimliği, çok oyunculu bağlantı açık olduğu sürece sunucu tarafında oturum verisi olarak tutulur; kalıcı hesap sistemi yoktur.
- Güvenlik kaydı şifreli olarak saklanır ve sonra otomatik silinir: meydan ve karakter sohbeti mesajları 90 gün, sesli sohbetler ve bas-konuş sesi 48 saat.
- Şikayet kayıtları (döküm ve karar) ve engel listesi, incelemeyi ve engeli yürütmek için sunucuda tutulur.
- Satranç skor tablosundaki kullanıcı adı ve oyun sayıları sunucuda kalır; silinmesini istediğiniz kullanıcı adı için geliştiriciye yazabilirsiniz.
- Karakter sesleri (kişisel veri içermeyen ses dosyaları) sunucuda önbellek olarak saklanır.
- Sunucunun geçici bağlantı/log verileri üretim sunucusunun yapılandırmasına bağlıdır ve yayın öncesinde gerçek saklama süresi ayrıca belirlenmelidir.
- Kalıcı kullanıcı hesabı veya hesap silme özelliği eklenirse bu politika ve Play Console beyanları buna göre güncellenmelidir.

## 8. Çocuklar ve ebeveynler

Uygulamada çevrimiçi oyuncu etkileşimi ve sesli sohbet bulunur. Uygulamanın hedef kitlesi çocuklar olarak seçilecekse Google Play'in çocuklar/aileler için güncel şartları ayrıca değerlendirilmelidir; özellikle sesli sohbet özelliği için uygun yaş ve güvenlik ayarları belirlenmelidir.

## 9. İletişim

Gizlilik politikasıyla ilgili sorularınız için uygulamanın Google Play mağaza sayfasında yayınlanan geliştirici iletişim adresini kullanabilirsiniz.

> Bu belge Play Console için taslaktır. Yayına almadan önce gerçek geliştirici/şirket adı, iletişim adresi ve varsa veri işleyen hizmetlerin hukuki bilgileri eklenmelidir.
