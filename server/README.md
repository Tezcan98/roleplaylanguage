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

Ayarlar (ortam değişkenleri): `PORT`, `HOST`, `ALLOWED_ORIGINS`, `MAX_PER_IP`, `TRUST_PROXY` — ayrıntı `src/index.mjs`.

## Test

```bash
npm test -w server                                                    # protokol testleri (~1 sn)
node server/deploy/check.mjs wss://31-58-245-116.sslip.io/ws/village  # canlı sunucu
npm run playtest:multiplayer -w web -- --village=wss://31-58-245-116.sslip.io/ws/village  # iki tarayıcıyla, canlı sunucu
```
