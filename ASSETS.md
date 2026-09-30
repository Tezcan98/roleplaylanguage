# 3D modeller (Meshy.ai) ve dokular

Oyundaki her nesnenin önce prosedürel (kodla çizilmiş) bir hali var. Aşağıdaki id ile bir GLB modeli
`assets/models/` klasörüne koyup `assets/manifest.json` → `models` içine eklersen, o nesne yerine
model kullanılır. Model, prosedürel halin boyutuna **otomatik oturtulur**; ölçekle uğraşman gerekmez.

```json
"models": {
  "char.anne": "assets/models/anne.glb",
  "prop.sedir": { "path": "assets/models/sedir.glb", "rotateY": 180 }
}
```

`rotateY`: model ters duruyorsa derece cinsinden çevir. `fit`: `"contain"` (varsayılan), `"height"` veya `"none"`.

## Meshy ayarları (mobil için küçük kalsın)

- **Text to 3D → Art style: Realistic**, Topology: Quad, **Target polycount: 5.000–10.000** (karakterler 10–15k)
- Texture: **PBR, 1024 px**. Export: **GLB**.
- Karakterlerde **Rigging + Animation** aç, en az `Idle` ve `Walk` animasyonlarını ekle. Oyun adında
  "walk" geçen klibi yürürken, diğerini dururken oynatır.
- Model **+Z yönüne (kameraya) baksın**, ayakları yerde (y = 0) olsun.
- İndirdikten sonra küçült (tipik olarak 5–20 MB → 0,3–1,5 MB):

```bash
npx @gltf-transform/cli optimize in.glb assets/models/out.glb --compress meshopt --texture-compress webp --texture-size 1024
```

Tüm promptlarda aynı stil cümlesini kullan ki nesneler birbirine uysun:

> **STİL:** *realistic stylized game asset, soft natural colors, clean PBR materials, Anatolian village, warm daylight, single object, centered, no background*

## Karakterler (`char.*`)

| id | Prompt (İngilizce ver) |
|---|---|
| `char.ahmet` | 10-year-old Turkish boy, short brown hair, yellow t-shirt, blue jeans, sneakers, friendly face, full body, T-pose, STİL |
| `char.anne` | Turkish mother in her late 30s, brown hair in a bun, pink blouse, long plum skirt, white apron, warm smile, full body, T-pose, STİL |
| `char.baba` | Turkish father in his 40s, short black hair, black mustache, blue shirt with rolled sleeves, dark trousers, full body, T-pose, STİL |
| `char.dede` | Turkish grandfather in his 70s, white mustache, round glasses, dark flat cap, cream shirt, brown knitted vest, grey trousers, slightly bent posture, full body, T-pose, STİL |
| `char.ogretmen` | Turkish female primary-school teacher in her 30s, dark shoulder-length hair, green cardigan, long skirt, glasses, holding nothing, full body, T-pose, STİL |
| `char.elif` | 10-year-old Turkish girl, long dark ponytail, red school pinafore over white shirt, full body, T-pose, STİL |
| `char.can` | 10-year-old Turkish boy, curly black hair, navy school uniform sweater, grey trousers, full body, T-pose, STİL |

## Ev ve avlu (`prop.*`)

| id | Prompt |
|---|---|
| `prop.house` | small one-storey Turkish village house, white lime-plastered walls, red clay tile hipped roof, brick chimney, wooden front door, two windows with wooden sills, 10 m wide, STİL |
| `prop.cesme` | traditional Ottoman stone village fountain (çeşme) with brass tap and small basin, STİL |
| `prop.pergola` | wooden pergola covered with grapevine leaves and hanging purple grape bunches, with a rustic wooden table underneath, STİL |
| `prop.car` | old 1990s white boxy four-door sedan, slightly dusty, one flat front tyre, STİL |
| `prop.tree` | walnut tree with full rounded green canopy, 6 m tall, STİL |
| `prop.gate` | rustic wooden garden gate arch with small wooden sign board, STİL |

## Ev içi

| id | Prompt |
|---|---|
| `prop.sedir` | traditional Turkish sedir divan along a wall, low wooden base, plum floral upholstery, four cushions in pink and mustard, 5 m long, STİL |
| `prop.sini` | Turkish breakfast on a round brass tray table (sini) on low legs: tulip tea glasses, simit, white cheese, olives, tomatoes, STİL |
| `prop.caydanlik` | Turkish double teapot (çaydanlık), red enamel, STİL |
| `prop.kitchen` | small village kitchen counter with white cabinets, steel worktop, STİL |
| `prop.bookshelf` | old wooden bookshelf with colourful books, 2 m tall, STİL |
| `prop.desk` | child's wooden study desk with pencil holder and open notebook, STİL |
| `prop.chair` | simple wooden chair, STİL |
| `prop.bed` | single wooden bed with a colourful patchwork quilt and white pillow, STİL |
| `prop.tv` | small flat TV on a low wooden TV stand, STİL |

## Eşyalar (`item.<tür>`)

| id | Prompt |
|---|---|
| `item.mont` | red children's winter jacket on a hanger, STİL |
| `item.kova` | blue galvanized metal bucket with handle, STİL |
| `item.anahtar` | steel wrench, STİL |
| `item.domates` | ripe red tomato with green stem, STİL |
| `item.ekmek` | Turkish white bread loaf (somun), STİL |
| `item.kitap` | children's Turkish school textbook with red cover, STİL |

Not: çamaşırlar (`çorap`, `havlu`, `gömlek`) aynı türü (`camasir`) paylaşıyor; model eklenirse üçü de aynı modeli kullanır.

## Dokular

Gerçek fotoğraf dokuları Poly Haven'dan (CC0) gelir: `python3 tools/fetch_textures.py`. Toplam ~0,6 MB.
Başka bir doku istersen scriptteki `TEXTURES` tablosunu değiştir. Kilim, sedir kumaşı, yorgan ve bayrak gibi
kültürel desenler bilerek prosedürel bırakıldı.
