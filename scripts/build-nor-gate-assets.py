"""Fix A9-NOR raster transparency (Pillow, no visual edits, no functional component).

The Founder reference is now a true RGBA source. The opaque RGB source
Founder originally approved (sha256 625ce6ce6cc2d07d4cc6b8187d70d2a457eeeb4
4b20ecb5a7c07d900983b43d4, PNG colourtype 2) rendered as a large opaque
white rectangle on any non-white canvas, the same defect found and fixed on
A9-OR and A9-NAND. That RGB source remains recoverable byte-for-bit from
git history (commit ed341cebf8334bf878c7968777615ceeda3bb483, which staged
it unmodified) for audit; it is not read here.

`derive_rgba_from_rgb_source` is the exact method already qualified and
shipped for A9-OR/A9-NAND (scripts/build-or-gate-assets.py,
scripts/build-nand-gate-assets.py): the exterior background (near-white,
connected to the four canvas corners) is flood-filled and its alpha
zeroed; a thin (2 px) feather band around that region gets a proportional
alpha so the true anti-aliased silhouette edge is preserved without a hard
cliff or a white halo. No RGB channel is redrawn, recoloured or cropped
anywhere, at any distance from the background, so every interior light
pixel (labels, the NOR symbol and its inversion bubble, metal highlights)
keeps both its original colour and full opacity. Running it against the
historical RGB source reproduces the frozen RGBA reference below
byte-for-byte. Measured on the real NOR raster, the OR/NAND thresholds
(24 / 90 / 2px) already isolate a single connected background region with
no leakage into the component body, so they are reused unchanged.

This is A9-NOR-ASSET-FIX, a raster asset correction only. NOR_GATE has no
functional component/registration/simulation contract yet — that is the
separate, not-yet-authorized A9-NOR ticket. Accordingly this script does
not compute or register electrical PhysicalContacts for A/B/Q. The only
raster probe below is a generic check that the three lower metal foot
zones visible on the raster stay substantially opaque after the
correction — a physical-preservation check, not an electrical pin
registration.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'frontend/public/assets/components/nor-gate'
REFERENCE = 'nor-gate.founder-reference.png'
LOCKED_SHA = '49a20318651184977210e9efd518006bc20fbeb5bff62d473edac383b4a97be2'

BORDER_MATCH_THRESHOLD = 24   # max per-channel diff from background still flood-filled (alpha 0)
FEATHER_HIGH_THRESHOLD = 90   # diff at/above which a boundary-adjacent pixel is fully opaque
FEATHER_BAND_PX = 2           # dilation radius (px) of the alpha feather band around the flood fill


def digest(data):
    return hashlib.sha256(data).hexdigest()


def derive_rgba_from_rgb_source(rgb_image):
    """Deterministically turn a frozen opaque RGB Founder source into RGBA.

    Only the alpha channel is written; every RGB sample is preserved as-is.
    Identical method to A9-OR/A9-NAND's derive_rgba_from_rgb_source.
    """
    rgb = rgb_image.convert('RGB')
    arr = np.array(rgb)
    h, w, _ = arr.shape
    bg = np.median(np.concatenate([arr[0, :], arr[-1, :], arr[:, 0], arr[:, -1]]), axis=0)
    dist = np.abs(arr.astype(np.int16) - bg).max(axis=-1).astype(np.float64)

    marker = (13, 250, 7)
    assert not np.all(arr == np.array(marker), axis=-1).any(), 'marker collides with source pixels'
    work = rgb.copy()
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(work, seed, marker, thresh=BORDER_MATCH_THRESHOLD)
    core = np.all(np.array(work) == np.array(marker), axis=-1)

    dilated = np.array(Image.fromarray((core * 255).astype('uint8'))
                        .filter(ImageFilter.MaxFilter(2 * FEATHER_BAND_PX + 1))) > 0
    rim = dilated & ~core

    alpha = np.full((h, w), 255.0)
    alpha[core] = 0.0
    frac = np.clip((dist - BORDER_MATCH_THRESHOLD) / (FEATHER_HIGH_THRESHOLD - BORDER_MATCH_THRESHOLD), 0, 1)
    alpha[rim] = frac[rim] * 255.0

    return Image.fromarray(np.dstack([arr, np.round(alpha).astype('uint8')]), mode='RGBA')


def write_json(name, data):
    (PACK / name).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8', newline='\n')


source = (PACK / REFERENCE).read_bytes()
assert digest(source) == LOCKED_SHA
meta = json.loads((PACK / 'FOUNDER-ASSET.json').read_text(encoding='utf-8'))
assert meta['sha256'] == LOCKED_SHA
im = Image.open(PACK / REFERENCE)
assert im.mode == 'RGBA' and im.size == tuple(meta['dimensions']) == (1536, 1024)
arr = np.array(im)
assert (arr[0, 0, 3], arr[0, -1, 3], arr[-1, 0, 3], arr[-1, -1, 3]) == (0, 0, 0, 0), 'corners must be transparent'
assert (arr[..., 3] == 255).sum() > 450000, 'component interior must remain substantially opaque'
assert (arr[..., 3] == 0).sum() > 450000, 'exterior background must be genuinely transparent'
assert (arr[..., 3] == 0).sum() > 0 and (arr[..., 3] == 255).sum() > 0, 'alpha must not be uniform'

# Generic physical-preservation raster check, NOT an electrical/PhysicalContacts
# registration. Measured on the corrected raster itself: at source row 890,
# the three visible lower metal foot zones (left/middle/right) must remain
# substantially opaque (alpha>=200) after the transparency correction. The
# exact A/B/Q electrical pixel-probe belongs to the separate, not-yet
# authorized functional A9-NOR ticket.
metal_zones = []
for label, lo, hi in [('left-foot', 440, 546), ('middle-foot', 714, 820), ('right-foot', 985, 1092)]:
    row = 890
    opaque = sum(1 for x in range(lo, hi) if im.getpixel((x, row))[3] >= 200)
    metal_zones.append({'zone': label, 'row': row, 'regionX': [lo, hi], 'opaquePixelCount': opaque})
    assert opaque > 60, f'{label} metal zone lost opacity after transparency correction'

assets = []
for scale in [1, 3]:
    size = (144 * scale, 96 * scale)
    # Premultiplied alpha prevents colour fringes; full image, isotropic resize.
    runtime = im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    for fmt in ['png', 'webp']:
        name = f'nor-gate.default.{scale}x.{fmt}'
        options = {'optimize': True} if fmt == 'png' else {'quality': 92, 'method': 6}
        runtime.save(PACK / name, **options)
        raw = (PACK / name).read_bytes()
        assets.append({'file': name, 'scale': scale, 'format': fmt,
                       'width': size[0], 'height': size[1], 'bytes': len(raw), 'sha256': digest(raw)})

write_json('manifest.json', {
    'component': 'NOR_GATE', 'assetStatus': 'FOUNDER_PASS_FROZEN', 'backend': 'raster',
    'canonical': {'width': 144, 'height': 96}, 'assets': assets,
    'reference': {'file': REFERENCE, 'sha256': LOCKED_SHA, 'width': 1536, 'height': 1024},
    'derivation': {
        'method': 'Full-source premultiplied-alpha Lanczos resize; no crop/redraw/recolor/deformation.',
        'pixelProbe': 'NOT_MEASURED_IN_A9-NOR-ASSET-FIX_SCOPE',
        'pixelProbeMethod': 'Electrical A/B/Q pixel-probe and PhysicalContacts belong to the separate, '
                             'not-yet-authorized functional A9-NOR ticket; this asset-fix ticket does not '
                             'register them. A generic physical-preservation check (metalZoneCheck below) '
                             'verifies the visible lower metal feet stayed opaque through the correction.',
        'metalZoneCheck': metal_zones,
        'transparency': {
            'note': 'Founder reference corrected from opaque RGB to true RGBA: exterior background '
                    '(connected to the four canvas corners) flood-filled to alpha 0, with a 2 px '
                    'proportional feather band at the silhouette edge, using the same method qualified '
                    'for A9-OR/A9-NAND. No RGB channel redrawn.',
            'priorSha256': '625ce6ce6cc2d07d4cc6b8187d70d2a457eeeb44b20ecb5a7c07d900983b43d4',
            'priorShaRecoverableAt': 'ed341cebf8334bf878c7968777615ceeda3bb483',
            'borderMatchThreshold': BORDER_MATCH_THRESHOLD, 'featherHighThreshold': FEATHER_HIGH_THRESHOLD,
            'featherBandPx': FEATHER_BAND_PX,
        },
    },
    'notes': ['Pins A/B/Q.',
              'Q = NOT(A OR B).',
              'Qualify physical contacts against 12 px breadboard pitch.',
              'Do not invent VCC/GND for this abstract Level-1 gate.',
              'No bodyClip; reference RGB content remains byte-identical to the pre-correction source, '
              'only alpha changed.',
              'This is an asset-only correction: no functional NOR_GATE component, registration or '
              'simulation contract is introduced by this ticket.']})

files = {}
for path in sorted(PACK.iterdir()):
    if path.is_file() and path.name != 'ASSET-INTEGRITY.json':
        raw = path.read_bytes()
        if path.suffix in ['.json', '.md', '.txt']:
            raw = raw.replace(b'\r\n', b'\n')
        files[path.name] = {'sha256': digest(raw), 'bytes': len(raw)}
write_json('ASSET-INTEGRITY.json', {'component': 'NOR_GATE', 'textNormalization': 'LF', 'files': files})

assert (PACK / REFERENCE).read_bytes() == source
print(json.dumps({'referenceSha256': digest(source), 'metalZoneCheck': metal_zones, 'assets': assets}, indent=2))
