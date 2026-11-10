# Durum çubuğu bildirimi (push)

Oyuncuların telefonuna "Altın satışta!" gibi bir bildirim gönderir (Firebase Cloud Messaging, konu: `all`).

**Nasıl çalışır:** uygulama (1.0.37 ve sonrası) açıldıktan ~25 sn sonra bir kez "Haberler 🔔" kartı gösterir;
"Evet" derse Android izni sorulur, izin verilirse telefon `all` konusuna abone olur (`web/src/main.js` → `joinNews`).
"Hayır" bir daha sorulmaz. Eski sürümler bildirim almaz (Play'den güncellemeleri gerekir).

**Göndermek:**

```
node tools/push.mjs "Başlık" "Mesaj"          # herkese gider
node tools/push.mjs "Başlık" "Mesaj" --dry    # yalnızca doğrular, göndermez
```

**Gönderici anahtarı:** Firebase konsol → Project settings → Service accounts → "Generate new private key".
İndirilen JSON'u `~/AnadoluAilesi-imza/fcm-service-account.json` olarak koy (ya da yolu `FCM_KEY` ile ver).
**Repo'ya asla koyma**, sunucuya da koyma: bu anahtar projedeki herkese bildirim atabilir.
