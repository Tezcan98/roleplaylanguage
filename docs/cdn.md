# CDN (Cloudflare, ücretsiz plan)

sehem2.com.tr zaten Cloudflare'in arkasında (turuncu bulut): ziyaretçiler dosyaları en yakın Cloudflare
sunucusundan alır, bizim sunucuya yalnızca Cloudflare'de olmayan istekler gelir.

## Sunucuda yapılan (nginx, `/etc/nginx/sites-available/sehem2.com.tr`)

- `/oyun/bundle/` (adında sürüm karması olan JS/CSS): 30 gün, `immutable`.
- `/oyun/assets/` (modeller, dokular, sesler, çeviriler): `public, max-age=600, stale-while-revalidate=86400` —
  Cloudflare ve tarayıcı 10 dakika tutar, sonra arka planda tazeler. Yeni bir yükleme en geç ~10 dakikada görünür.
- `application/json` gzip ile sıkıştırılır.
- Yedek: `/root/sehem2.com.tr.bak-<tarih>`.

Kontrol: `curl -sI https://sehem2.com.tr/oyun/tr/assets/icons/icon-512.png | grep cf-cache-status` → `HIT`.

## Panelde yapılacak tek ayar (bir dakika)

Cloudflare `.png .jpg .mp3 .ogg .js .css` gibi uzantıları kendiliğinden saklar, ama 3D modelleri (`.glb`) ve
çeviri dosyalarını (`.json`) saklamaz (`cf-cache-status: DYNAMIC`). Bunlar için:

1. dash.cloudflare.com → sehem2.com.tr → **Caching → Cache Rules → Create rule**
2. Ad: `oyun dosyaları`
3. **Edit expression** seçip şunu yapıştır:
   `(starts_with(http.request.uri.path, "/oyun/") and http.request.uri.path contains "/assets/")`
4. **Cache eligibility**: `Eligible for cache`
5. **Edge TTL**: `Use cache-control header if present` · **Browser TTL**: `Respect origin`
6. Deploy.

Sonra: `curl -sI https://sehem2.com.tr/oyun/tr/assets/models/animal_horse.glb | grep cf-cache-status` iki kez
çalıştırılınca ikincisi `HIT` olmalı.

API (`/ws/village`, `/api/tts`, `/api/npc-chat`, `/health`) Cloudflare'de saklanmaz; TTS sesleri sunucunun
kendi disk önbelleğindedir.
