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

## Şu anki ayarlar (25 Ekim 2026, konsolda yapıldı)

- **İçerik derecesi:** en çok **PG** (Ebeveyn Rehberliği; T ve MA engelli). Kod da PG istiyor.
- **Hassas kategoriler:** Siyaset dışında hepsi engelli (cinsellik, cinsel sağlık, din, flört, ilaç ve takviye, kilo verme,
  kolay yoldan zengin olma, kozmetik prosedürler, sansasyon, sosyal kumar); kısıtlı kategorilerde **alkol** ve **kumar ve
  bahis** engelli. Siyaset açık: İslam'a aykırı değil ve gösterimlerin ~%20'si.
- **Genel kategoriler (74 engelli):** Akşam yemekleri ve gece hayatı, giyim (iç çamaşırı, mayo dahil), güzellik ve kişisel
  bakım tamamen; ayrıca alkollü içecekler, eğlence amaçlı kumar (poker, kumarhane), oranlı bahis, bahis / eşantiyon
  promosyonları, astroloji ve burçlar, psişik ve falcılık, romantizm ve ilişkiler, tütün ve elektronik sigara, ve faizli
  krediler (krediler, kredi kartları, konut / bireysel krediler). Kredi raporları ve bağımlılıktan kurtulma açık.
