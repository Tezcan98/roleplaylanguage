# Güvenlik kaydı (90 gün, şifreli) — operatör rehberi

Meydandaki yazılı konuşmalar ve karakterlerle serbest sohbet, sunucuda **şifreli** olarak 90 gün saklanır
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

`--flagged`: kelime filtresinin / Türkçe kontrolünün geri tuttuğu balonlar (⚠ ile işaretli). Her satırda: zaman,
yer (meydan:oda / sohbet:karakter), kullanıcı adı, cihaz kimliği, Play Games kimliği, IP ve metin.

## Kişiye ulaşmak

- **Play Games kimliği** bir Google hesabına bağlıdır; uygulama e-posta görmez. Ciddi durumlarda (yasal süreç)
  Google bu kimliği hesapla eşleştirebilir.
- **Cihaz kimliği** ile o cihazı engellemek mümkündür (sunucuya engel listesi eklenebilir).
- IP adresi, kolluk talebinde internet sağlayıcısıyla eşleştirilebilir.

## Play Games girişini açmak (Play Console, bir kerelik)

1. Play Console → uygulama → **Play Games Services → Kurulum ve yönetim → Yapılandırma** → "Hayır, oyunum
   Google API'lerini kullanmıyor" ile yeni bir Games Services projesi oluştur.
2. **Kimlik bilgileri** → Android kimlik bilgisi ekle: paket adı `com.anadoluailesi.app`, SHA-1 olarak hem
   **uygulama imzalama anahtarının** SHA-1'ini (Play Console → Uygulama bütünlüğü) hem de yükleme anahtarının
   SHA-1'ini (`keytool -list -v -keystore ~/AnadoluAilesi-imza/upload.jks -alias anadolu`) ekle.
3. Yapılandırmadaki **proje kimliğini** (rakamlar) `mobile/android/app/src/main/res/values/strings.xml` içindeki
   `game_services_project_id`'ye yaz (şu an `0` = kapalı) ve yeni sürüm derle.
4. Yayınlamadan önce Play Games Services yapılandırmasını **yayınla** ve test kullanıcılarını ekle.

## Yasal

KVKK ve GDPR kapsamında kişisel veridir: gizlilik politikası (`docs/store/privacy-policy.md`) ve Play Console
"Veri güvenliği" formu buna göre güncellendi. Metinleri yayından önce bir hukukçuya gözden geçirt.
