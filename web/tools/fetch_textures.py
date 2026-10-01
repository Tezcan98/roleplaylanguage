"""
Downloads CC0 photo textures from Poly Haven and stores them as small 512 px WebP files
in assets/textures/ (colour map + normal map for surfaces the camera sees up close),
then writes the "textures" section of assets/manifest.json.

Usage: python3 tools/fetch_textures.py      (needs Pillow with WebP support)
"""
import io
import json
import pathlib
import urllib.request

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'textures'
SIZE = 512
QUALITY = 78

# game texture name → (Poly Haven asset id, with normal map?, repeat multiplier[, tint])
# The multiplier converts the procedural tiling to the photo's real-world size;
# the tint is multiplied into the material colour (photo grass is rather grey).
TEXTURES = {
    'grass': ('leafy_grass', True, 2, '#CFEFA0'),
    'dirt': ('dirt_floor', True, 2),
    'floorWood': ('wood_floor', True, 2),
    'darkWood': ('wood_planks_dirt', False, 1),
    'lightWood': ('brown_planks_03', False, 1),
    'plaster': ('beige_wall_002', True, 1.5),
    'whiteWall': ('white_stucco', True, 1.5),
    'roof': ('clay_roof_tiles_02', True, 1),
    'stone': ('cobblestone_floor_01', True, 1.5),
    'brick': ('brick_wall_001', True, 1.5),
    'bark': ('bark_brown_02', False, 1),
    'metal': ('metal_plate', False, 1),
}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'yilmaz-ailesi-texture-fetch'})
    with urllib.request.urlopen(req) as r:
        return r.read()


def save(url, path):
    img = Image.open(io.BytesIO(fetch(url))).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
    img.save(path, 'WEBP', quality=QUALITY, method=6)
    return path.stat().st_size


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / 'assets' / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    textures = {}
    total = 0
    for name, (asset, with_normal, scale, *tint) in TEXTURES.items():
        files = json.loads(fetch(f'https://api.polyhaven.com/files/{asset}'))
        entry = {'map': f'assets/textures/{name}.webp', 'scale': scale}
        if tint:
            entry['tint'] = tint[0]
        total += save(files['Diffuse']['1k']['jpg']['url'], OUT / f'{name}.webp')
        if with_normal:
            entry['normal'] = f'assets/textures/{name}_n.webp'
            total += save(files['nor_gl']['1k']['jpg']['url'], OUT / f'{name}_n.webp')
        textures[name] = entry
        print(f'✓ {name:10} ← {asset}')
    manifest['textures'] = textures
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    (OUT / 'CREDITS.md').write_text(
        '# Texture credits\n\nAll textures are CC0 from [Poly Haven](https://polyhaven.com), resized to 512 px WebP.\n\n'
        + '\n'.join(f'- `{n}` — https://polyhaven.com/a/{a}' for n, (a, *_rest) in TEXTURES.items()) + '\n')
    print(f'total {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
