# Anadolu Ailesi — Gizlilik Politikası

**Son güncelleme:** 1 Ekim 2026

Anadolu Ailesi, Türkçe öğrenmeyi hikâye ve 3D köy yaşamı üzerinden sunan bir oyundur. Bu metin, uygulamanın hangi verileri kullandığını sade biçimde açıklar.

## 1. Mikrofon ve konuşma

Uygulama mikrofonu iki özellik için kullanabilir:

- **Konuşma tanıma:** Oyuncunun söylediği Türkçe cümleyi oyundaki konuşma etkinliklerinde değerlendirmek için kullanılır.
- **Birebir sesli sohbet:** Köy meydanında iki oyuncu birbirinin isteğini kabul ettiğinde sesli iletişim kurulabilir.

Oyunun kendisi **ses kayıtlarını kalıcı olarak saklamaz**. Android'de konuşma tanıma için cihazın yerel konuşma tanıma servisi kullanılır. İsteğe bağlı bir uzak STT sunucusu yapılandırılırsa ses verisi tanıma amacıyla bu sunucuya geçici olarak gönderilebilir; bu sunucunun işletmecisi veriyi saklamayacak şekilde yapılandırılmalıdır.

Sesli sohbet WebRTC ile iki oyuncu arasında kurulur; sinyalleşme sunucusu bağlantının kurulmasına yardımcı olur ancak konuşma kaydı tutmak oyunun özelliği değildir.

## 2. Kullanıcı adı

Köy meydanında çok oyunculu bağlantı için seçtiğiniz kullanıcı adı diğer oyunculara gösterilir. Kullanıcı adı cihazınızda da ayarlanabilir.

## 3. Oyun ilerlemesi ve ayarlar

Oyun ilerlemesi, kelime bilgisi, kredi bakiyesi ve bazı ayarlar cihazdaki **localStorage** alanında tutulur. Bunlar oyunun kendi sunucusuna ilerleme kaydı olarak gönderilmez.

## 4. Reklamlar

Bazı sesli sınavlara erişmek için isteğe bağlı **ödüllü reklam** izlenebilir. Android sürümünde reklamlar Google AdMob üzerinden gösterilir. AdMob, kendi hizmeti kapsamında cihaz ve reklamla ilgili verileri işleyebilir. Google'ın güncel reklam ve gizlilik politikaları ayrıca geçerlidir.

## 5. İsteğe bağlı ses modelleri

Doğal/neural karakter sesleri etkinleştirilirse gerekli ses modelleri **Hugging Face** üzerinden indirilebilir. Bu modeller cihazda kullanılmak üzere önbelleğe alınır. Neural sesler Android sürümünde varsayılan olarak kapalıdır.

## 6. Çok oyunculu güvenlik

Köy meydanında kullanıcı adları ve genel konuşma metinleri sunucudan diğer oyunculara aktarılır. Kötüye kullanımı azaltmak için kullanıcı adı ve genel konuşmada Türkçe, Arapça ve İngilizce kısa bir küfür filtresi uygulanır. Oyuncular ayrıca cihazlarında başka oyuncuları engelleyebilir.

## 7. Saklama ve silme

- Yerel oyun ilerlemesi ve ayarlar, uygulamanın cihazdaki localStorage verisi temizlendiğinde silinir.
- Kullanıcı adı, çok oyunculu bağlantı açık olduğu sürece sunucu tarafında oturum verisi olarak tutulur; kalıcı hesap sistemi yoktur.
- Sunucunun geçici bağlantı/log verileri üretim sunucusunun yapılandırmasına bağlıdır ve yayın öncesinde gerçek saklama süresi ayrıca belirlenmelidir.
- Kalıcı kullanıcı hesabı veya hesap silme özelliği eklenirse bu politika ve Play Console beyanları buna göre güncellenmelidir.

## 8. Çocuklar ve ebeveynler

Uygulamada çevrimiçi oyuncu etkileşimi ve sesli sohbet bulunur. Uygulamanın hedef kitlesi çocuklar olarak seçilecekse Google Play'in çocuklar/aileler için güncel şartları ayrıca değerlendirilmelidir; özellikle sesli sohbet özelliği için uygun yaş ve güvenlik ayarları belirlenmelidir.

## 9. İletişim

Gizlilik politikasıyla ilgili sorularınız için uygulamanın Google Play mağaza sayfasında yayınlanan geliştirici iletişim adresini kullanabilirsiniz.

> Bu belge Play Console için taslaktır. Yayına almadan önce gerçek geliştirici/şirket adı, iletişim adresi ve varsa veri işleyen hizmetlerin hukuki bilgileri eklenmelidir.
