# Reklam engelleme (AdMob konsolu)

Oyunda reklamlar en fazla **"ebeveyn rehberliği" (PG)** derecesinde istenir (`AdMobAdProvider.js`,
`maxAdContentRating: ParentalGuidance`): yetişkin ve müstehcen reklam gelmez. İslam'a aykırı konular
(alkol, kumar, flört vb.) ise koddan değil, **AdMob konsolundan** engellenir. Bir kez yapılır, bütün
sürümlerde hemen geçerli olur.

## 1. İçerik derecesi

apps.admob.com → **Engelleme denetimleri (Blocking controls)** → **Tüm uygulamalar** → **İçerik** →
**Maksimum reklam içeriği derecesi**: **G** (genel izleyici) ya da **PG**. Konsoldaki ayar koddakinden
daha sıkıysa konsolunki geçerli olur. Sadece G seçilirse reklam bulma oranı biraz düşer.

## 2. Hassas kategoriler (Sensitive categories)

Aynı yerde → **Hassas kategoriler** → bunların hepsini **engelle**:

- Flört / arkadaşlık siteleri (Dating)
- Cinsellik ve cinsel sağlık (References to sex and sexuality, Sexual & reproductive health)
- Kumar ve bahis (Gambling & betting) — kısıtlı kategori, açıksa kapat
- Alkol (Alcohol) — kısıtlı kategori, açıksa kapat
- Astroloji, fal ve doğaüstü (Astrology & esoteric)
- Hızlı zengin olma (Get rich quick)
- Estetik ve vücut değişikliği (Cosmetic procedures & body modification)
- Zayıflama (Weight loss), ilaç ve takviyeler (Drugs & supplements)
- Siyaset (Politics) ve din (Religion) — başka dinlerin propagandası gelmesin

## 3. Genel kategoriler (General categories)

**Genel kategoriler** listesinde gece hayatı, iç çamaşırı / mayo moda, müzik festivalleri gibi istemediğin
alanları da tek tek engelleyebilirsin.

## 4. Gelen tek tek reklamlar

**Engelleme denetimleri → Reklam inceleme merkezi (Ad review center)**: oyunda gösterilmiş reklamları
görüp uygunsuz olanı **Engelle** ile kaldırırsın. Bir reklamverenin sitesini **Reklamveren URL'leri**
bölümüne yazarak o reklamverenin bütün reklamlarını engelleyebilirsin.

Not: Ne kadar çok kategori engellenirse reklam bulma oranı (`/api/ad-stats` sayfasındaki doluluk) o kadar düşer.
