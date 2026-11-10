# Durum çubuğu bildirimi (haber)

Oyuncuların telefonunun durum çubuğuna "Altın satışta!" gibi bir mesaj düşürür. **Firebase yok, anahtar yok:**
uygulama kendisi sunucudaki bir dosyayı kontrol eder.

**Nasıl çalışır:** Android uygulaması (1.0.37 ve sonrası) açıldıktan ~25 sn sonra bir kez "Haberler 🔔" kartı gösterir.
"Evet" derse Android'in izin sorusu çıkar (Android 13+), izin verilirse saatte bir (internet varken)
`https://anadoluailesi.com.tr/haber.json` okunur (`mobile/android/.../NewsWorker.java`). Dosyadaki `id` yeniyse
mesaj durum çubuğuna düşer; dokununca oyun açılır. "Hayır" derse hiç kontrol edilmez, bir daha sorulmaz.
Mesaj, **yayınlandıktan sonra en geç ~1 saat içinde** ulaşır. Telefona yeni kurulan oyuncu eski mesajı görmez.

**Yayınlamak** (komut siteyi de canlıya alır):

```
node tools/push.mjs "Başlık" "Mesaj"
node tools/push.mjs "Başlık" "Mesaj" --dry    # yalnızca gösterir
```

Eski sürümler (1.0.36 ve öncesi) bu bildirimi alamaz; Play'den güncellemeleri gerekir.
