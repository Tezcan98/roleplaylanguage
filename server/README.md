# server — köy meydanı çok oyunculu sunucusu

Oyuncuların köy meydanında birbirini görmesini, yazılı konuşma balonlarını ve onaylı
birebir sesli sohbetin (WebRTC) sinyalleşmesini sağlayan küçük bir WebSocket sunucusu.
Oyunun geri kalanı sunucuya ihtiyaç duymaz.

## Şu an nerede çalışıyor

| | |
|---|---|
| Adres | `wss://31-58-245-116.sslip.io/ws/village` · durum: https://31-58-245-116.sslip.io/health |
| Makine | 31.58.245.116, `/opt/yilmaz-village` |
| Servis | `systemctl status yilmaz-village` (port 8097, yalnızca 127.0.0.1; `DynamicUser`, 256 MB sınır) |
| nginx | `/etc/nginx/sites-available/yilmaz-village` (yalnızca bu alan adı; diğer sitelere dokunulmadı) |
| Sertifika | Let's Encrypt `31-58-245-116.sslip.io`, certbot kendisi yeniler (yenilemede `nginx reload`) |
| Yedek | Kurulumdan önceki nginx ayarları: `/root/nginx-backup-before-yilmaz-*.tgz` |
| TURN | Sesli sohbet için yerleşik röle (`src/TurnRelay.js`, node-turn): UDP 3478 ve 49160-49260, servis ortamında `TURN_PUBLIC_IP`. Oyunculara katılırken rastgele, ayrılınca silinen hesaplar verilir; iç ağ / yerel adreslere aktarım kapalıdır. coturn sistemdeki libevent sürüm uyuşmazlığı yüzünden kurulmadı (sisteme dokunmamak için). |

`sslip.io` adı IP'yi kendiliğinden çözer, DNS ayarı gerekmez. Kendi alt alan adına
(ör. `meydan.te-robotik.com.tr`) geçmek için: DNS'te A kaydı → 31.58.245.116, nginx
dosyasında `server_name`, `certbot certonly --webroot -w /var/www/yilmaz-acme -d <ad>`,
sonra `web/assets/manifest.json` → `villageServer`.

## Güncelleme

```bash
scp -r server/package.json server/src root@31.58.245.116:/opt/yilmaz-village/
ssh root@31.58.245.116 'cd /opt/yilmaz-village && npm install --omit=dev && systemctl restart yilmaz-village'
node server/deploy/check.mjs wss://31-58-245-116.sslip.io/ws/village
```

Günlük: `journalctl -u yilmaz-village -f`. Tamamen kaldırmak:
`systemctl disable --now yilmaz-village`, `rm /etc/systemd/system/yilmaz-village.service /etc/nginx/sites-enabled/yilmaz-village`, `nginx -t && systemctl reload nginx`, `rm -r /opt/yilmaz-village`.

## Güvenlik

- Yalnızca izinli sayfalar bağlanabilir (`ALLOWED_ORIGINS`: GitHub Pages, uygulama, localhost).
- IP başına en çok 8 bağlantı, istemci başına mesaj sınırı (taşan kopar), 1,2 sn'de bir konuşma balonu.
- Kullanıcı adı ve balonlarda küfür filtresi (`src/ChatFilter.js`), 140 karakter sınırı.
- Ses sinyali yalnızca birbirini onaylamış iki oyuncu arasında aktarılır; ses sunucudan geçmez.
- Sessiz bağlantılar 30 sn'de bir yoklanır ve düşürülür.
- Sesli sohbet farklı ağlarda TURN üzerinden geçer; istemci bağlantı sonucunu bildirir (`journalctl -u yilmaz-village | grep voice`).

## Başka bir makineye kurulum

- **Docker (en kolay, 80/443 boşsa):** `DOMAIN=alan.adi docker compose up -d --build` (Caddy sertifikayı kendisi alır).
- **nginx zaten varsa:** `deploy/yilmaz-village.service` + `deploy/nginx.conf` (yukarıdaki kurulum böyle yapıldı).

Ayarlar (ortam değişkenleri): `PORT`, `HOST`, `ALLOWED_ORIGINS`, `MAX_PER_IP`, `TRUST_PROXY`, `PIPER_DIR`, `CHESS_SCORES` — ayrıntı `src/index.mjs`.

## Sesler (Piper) ve satranç skor tablosu

- **Kadın sesi:** anne, nine, öğretmen ve kızlar `tr_TR-dfki-medium` sesiyle konuşur. `PIPER_DIR` klasöründe
  `tr_TR-fahrettin-medium`, `tr_TR-fettah-medium` **ve** `tr_TR-dfki-medium` (`.onnx` + `.onnx.json`) bulunmalı.
  dfki eksikse sunucu o satırlar için hata verir, oyun da kadın karakterleri tarayıcının (kadın) sesine geçirir;
  yine de doğru ses için modeli ekleyin: `https://huggingface.co/rhasspy/piper-voices/tree/main/tr/tr_TR/dfki/medium`.
  Kontrol: `curl -o /dev/null -w '%{http_code}\n' 'https://31-58-245-116.sslip.io/api/tts?v=dfki&t=Merhaba'` → 200.
- **Satranç:** İsmail Dede'nin skor tablosu (en çok maç yapanlar) `CHESS_SCORES` dosyasında tutulur
  (varsayılan `/tmp/yilmaz-chess-scores.json`; systemd birimi `/var/lib/yilmaz-village/` kullanır, yeniden başlatmada silinmez).

## Ses deposu (her cümle bir kez üretilir)

Her karakterin kendi doğal sesi var: kadınlar ve erkekler Gemini TTS ile (`v=g-<Ses>`; erkekler için Gemini
yapamazsa Piper). Üretilen her satır sunucunun önbelleğine yazılır (`TTS_CACHE`, systemd'de
`/var/lib/yilmaz-village/tts`, yeniden başlatmada silinmez) ve aynı cümle için Gemini bir daha çağrılmaz.
Ayrıca oyunun bütün sabit cümleleri **depoya** kaydedilir: `web/assets/speech/*.mp3` + `index.json`.
Oyun önce buraya bakar, cümle varsa sunucuya hiç gitmez. Doldurmak için GitHub → Actions → **voices** → Run
workflow (her gece de kendiliğinden çalışır, eksikleri tamamlar; Gemini'nin günlük sınırına gelirse ertesi gün
devam eder) ya da elle: `node web/tools/build-voices.mjs --server=https://31-58-245-116.sslip.io/api/tts`.

## Meydan moderasyonu (Jev / Laya)

Meydandaki her konuşma balonu gösterilmeden önce `src/Moderator.js` kontrol eder. **Türkçe olmayan**
mesajlar ve **zararlı** olanlar (cinsellik, uyuşturucu/alkol/sigara, küfür, kötü alışkanlıklar, şiddet/tehdit,
zorbalık, nefret, kendine zarar, telefon/adres gibi kişisel bilgi) kimseye gösterilmez, konuşana nedeni söylenir
ve `MODERATION_LOG` dosyasına (JSON satırları) yazılır. On dakikada üç kez engellenen oyuncu beş dakika mesaj gönderemez.

1. Kelime listesi (`ChatFilter`) ve yazı/kelime ile dil kontrolü: her zaman açık, anında.
2. **Karar modeli** (System 1, `POST /v1/systemone`), ayarlanırsa:
   - **Jev** (TypeSafe, barındırılan): `TYPESAFE_API_KEY=…` yeter (adres `https://api.typesafe.ai`).
   - **Laya** (açık ağırlıklı, kendi makinende, veri dışarı çıkmaz, ~30 ms):
     `pip install "laya[serve]" && LAYA_HOST=127.0.0.1 LAYA_MODELS=multilingual laya-serve`, sonra
     `MODERATION_URL=http://127.0.0.1:8000 MODERATION_MODEL=multilingual`.
     Laya modeli yüzlerce MB bellek ister: köy sunucusunun 256 MB sınırına sığmaz, ayrı bir servis olarak çalıştırın.
   - İsterseniz Gemini: `MODERATION=gemini` (`GEMINI_API_KEY`).
   Model yanıt vermezse 1. katman çalışmaya devam eder (`MODERATION_FAIL_CLOSED=1` → o sırada hiçbir balon gösterilmez).

Günlük: `tail -f /tmp/yilmaz-moderation.log` (systemd'de `journalctl -u yilmaz-village | grep moderation`).

## Test

```bash
npm test -w server                                                    # protokol testleri (~1 sn)
node server/deploy/check.mjs wss://31-58-245-116.sslip.io/ws/village  # canlı sunucu
npm run playtest:multiplayer -w web -- --village=wss://31-58-245-116.sslip.io/ws/village  # iki tarayıcıyla, canlı sunucu
```
