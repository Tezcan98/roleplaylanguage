# Güvenlik kaydı (90 gün, şifreli) — operatör rehberi

Meydandaki yazılı konuşmalar ve karakterlerle serbest sohbet sunucuda **şifreli** olarak 90 gün (`audit-*.log`),
**sesli sohbetler** (birebir ve kahvehane / cami avlusu; her oyuncunun mikrofonu açıkken kendi sesi, ~10 saniyelik
Opus parçaları, 8 kbit/s, sessiz parçalar hiç gönderilmez) **48 saat** (`voice-*.log`, saatlik dosyalar,
`AUDIT_VOICE_HOURS`) saklanır
(`server/src/AuditLog.js`). Sunucu yazar ama okuyamaz: her günün anahtarı **operatörün açık anahtarıyla**
kilitlenir; açmak için **gizli anahtar** gerekir ve o sunucuda değildir.

## Anahtarlar

- Açık anahtar (sunucuda): `/etc/yilmaz-village/audit-public.pem` (`AUDIT_PUBLIC_KEY`, systemd `audit.conf`)
- **Gizli anahtar (sadece operatörde):** `~/AnadoluAilesi-imza/guvenlik-logu/audit-private.pem`
  - **Yedeğini güvenli bir yere al** (şifreli USB, şifre yöneticisi). Kaybolursa eski kayıtlar açılamaz.
  - Asla sunucuya, repoya veya e-postaya koyma.
- Yeni anahtar çifti: `node server/tools/audit-keygen.mjs <klasör>` (eski kayıtlar eski anahtarla açılır).

## Kayıtları okumak

```bash
# 1) sunucudan bilgisayarına kopyala
ssh -i ~/.ssh/id_ed25519 tezcan@31.77.63.14 'sudo sh -c "cd /var/lib/private/yilmaz-village/audit && tar czf - audit-*.log"' > audit.tgz
mkdir -p audit && tar xzf audit.tgz -C audit
# 2) gizli anahtarla oku
node server/tools/audit-read.mjs --key ~/AnadoluAilesi-imza/guvenlik-logu/audit-private.pem --dir audit \
     [--flagged] [--who <kullanıcı adı | cihaz kimliği | Play Games kimliği>] [--text <kelime>] [--from 2026-10-01] [--to 2026-10-31] [--json]
```

Ses parçalarını dosya olarak çıkarmak için `--audio ./sesler` ekle (her parça ayrı bir `.webm` / `.ogg` / `.m4a`;
tarayıcıda ya da VLC'de açılır). `--who <ad>` ile tek bir oyuncunun sesleri.

`--flagged`: kelime filtresinin / Türkçe kontrolünün geri tuttuğu balonlar (⚠ ile işaretli). Her satırda: zaman,
yer (meydan:oda / sohbet:karakter), kullanıcı adı, cihaz kimliği, Play Games kimliği, IP ve metin.

## Şikayetler (🚩 Şikayet et)

Oyuncu üst çubuktaki 🚩 (ya da sesli sohbet çubuğundaki 🚩) ile birini seçip şikayet eder. Sunucu, şikayet edilen
oyuncunun **son 10 dakikasını** (yazılar + ses; yalnızca bellekte tutulur) Gemini'ye verir: yazıya döker ve
"ahlaksız / ticari / temiz" der (`server/src/Reports.js`).

- **Ahlaksız ya da ticari** (ya da Gemini cevap vermediyse): yetkiliye mail gider — döküm, gerekçe ve üç bağlantı:
  7 gün engelle · kalıcı engelle · şikayeti kapat. **Sen karar verene kadar kimse engellenmez.**
- **Temiz**: mail gitmez, kayıt listede kalır. **Ama** aynı oyuncuyu 24 saat içinde **3 farklı kişi** şikayet
  ettiyse Gemini temiz dese de mail gelir; ses parçaları **ekte** (~10 sn'lik dosyalar, kendin dinle).
- **Asılsız şikayet**: bir oyuncunun **5 şikayeti** temiz çıkarsa **3 gün şikayet edemez**
  (`<REPORTS_DIR>/reporters.json`; 3 kişilik şikayetler sayılmaz).
- Hepsi: `https://<sunucu>/api/reports?key=<REPORT_KEY>` (engeli buradan kaldırmak da mümkün).
- Engel cihaz kimliği + Play Games kimliği + kullanıcı adıyla tutulur (`<REPORTS_DIR>/bans.json`). Oyuncuya
  **söylenmez**: meydana girer ama **tek başınadır** (kendine ait boş bir oda; kimseyi görmez, kimse onu görmez,
  oda sayılarında görünmez). O an meydandaysa bağlantısı kopmuş gibi düşer, oyun kendiliğinden geri bağlanır.
- Mail: `MAIL_API_URL`, `MAIL_API_KEY`, `REPORT_MAIL_TO` (SMTP başka sunucuda; ayrıntı `docs/TODO.md`).
  Ayarlı değilken mail yalnızca sunucu loguna yazılır, şikayetler yine listede.

## Kişiye ulaşmak

- **Play Games kimliği** bir Google hesabına bağlıdır; uygulama e-posta görmez. Ciddi durumlarda (yasal süreç)
  Google bu kimliği hesapla eşleştirebilir.
- **Cihaz kimliği** ile o cihazı engellemek mümkündür (sunucuya engel listesi eklenebilir).
- IP adresi, kolluk talebinde internet sağlayıcısıyla eşleştirilebilir.

## Play Games girişini açmak (Play Console, bir kerelik)

1. Play Console → uygulama → **Play Games Services → Kurulum ve yönetim → Yapılandırma** → "Hayır, oyunum
   Google API'lerini kullanmıyor" ile yeni bir Games Services projesi oluştur.
2. **Kimlik bilgileri** → Android kimlik bilgisi ekle: paket adı `com.anadolu`, SHA-1 olarak hem
   **uygulama imzalama anahtarının** SHA-1'ini (Play Console → Uygulama bütünlüğü) hem de yükleme anahtarının
   SHA-1'ini (`keytool -list -v -keystore ~/AnadoluAilesi-imza/upload.jks -alias anadolu`) ekle.
3. Yapılandırmadaki **proje kimliğini** (rakamlar) `mobile/android/app/src/main/res/values/strings.xml` içindeki
   `game_services_project_id`'ye yaz (şu an `0` = kapalı) ve yeni sürüm derle.
4. Yayınlamadan önce Play Games Services yapılandırmasını **yayınla** ve test kullanıcılarını ekle.

## Yasal

KVKK ve GDPR kapsamında kişisel veridir: gizlilik politikası (`docs/store/privacy-policy.md`) ve Play Console
"Veri güvenliği" formu buna göre güncellendi. Metinleri yayından önce bir hukukçuya gözden geçirt.
