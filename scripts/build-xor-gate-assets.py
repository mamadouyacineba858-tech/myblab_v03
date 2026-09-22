"""Fix A9-XOR raster transparency (Pillow, no visual edits, no functional component).

The Founder XOR reference staged at commit
211119a3ca92610b74275ed65f99eb22990bcceb ("chore(a9): stage XOR Founder
source asset for correction", branch asset/A9-XOR-founder-source) is an
opaque RGB PNG (sha256
8ff6d6af57779a88019a385f6d0c480f9ecd558c9d41d6d4e06b84bf9a974fe9, PNG
colourtype 2, 1536x1024). Like A9-OR/A9-NAND/A9-NOR before it, it rendered
as a large opaque white/near-white rectangle on any non-white canvas. That
RGB source remains recoverable byte-for-bit from git history at that
transport commit for audit; after this script runs once, it is not read
again (LOCKED_SHA below pins the corrected RGBA result).

`derive_rgba_from_rgb_source` is the exact method already qualified and
shipped for A9-OR/A9-NAND/A9-NOR (scripts/build-or-gate-assets.py,
scripts/build-nand-gate-assets.py, scripts/build-nor-gate-assets.py): the
exterior background (near-white, connected to the four canvas corners) is
flood-filled and its alpha zeroed; a thin (2 px) feather band around that
region gets a proportional alpha so the true anti-aliased silhouette edge
is preserved without a hard cliff or a white halo. No RGB channel is
redrawn, recoloured or cropped anywhere, at any distance from the
background, so every interior light pixel (labels, the XOR symbol and its
extra curved input line, metal highlights) keeps both its original colour
and full opacity. Measured on the real XOR raster, the OR/NAND/NOR
thresholds (24 / 90 / 2px) already isolate a single connected background
region with no leakage into the component body, so they are reused
unchanged.

This is A9-XOR-ASSET-FIX, a raster asset correction only. XOR_GATE has no
functional component/registration/simulation contract yet — that is the
separate, not-yet-authorized A9-XOR ticket. Accordingly this script does
not compute or register electrical PhysicalContacts for A/B/Q. The only
raster probe below is a generic check that the three visible metal foot
zones (top and bottom leads) stay substantially opaque after the
correction — a physical-preservation check, not an electrical pin
registration.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'frontend/public/assets/components/xor-gate'
REFERENCE = 'xor-gate.founder-reference.png'

PRIOR_OPAQUE_SHA = '8ff6d6af57779a88019a385f6d0c480f9ecd558c9d41d6d4e06b84bf9a974fe9'
PRIOR_SHA_RECOVERABLE_AT = '211119a3ca92610b74275ed65f99eb22990bcceb'
LOCKED_SHA = 'be3c922f8c6a7c0095f4dbe0b273a26123316200341023a42ab896f0aef081bd'

BORDER_MATCH_THRESHOLD = 24   # max per-channel diff from background still flood-filled (alpha 0)
FEATHER_HIGH_THRESHOLD = 90   # diff at/above which a boundary-adjacent pixel is fully opaque
FEATHER_BAND_PX = 2           # dilation radius (px) of the alpha feather band around the flood fill

# Generic physical-preservation raster zones, NOT electrical PhysicalContacts.
# Measured directly on the corrected XOR raster (own measurement, not copied
# from AND/OR/NAND/NOR): at source row 890, three visible metal lead zones
# (left/middle/right) sit above the coloured lead tips.
METAL_ZONES = [
    ('left-foot', 440, 522),
    ('middle-foot', 718, 800),
    ('right-foot', 993, 1075),
]
METAL_ROW = 890


def digest(data):
    return hashlib.sha256(data).hexdigest()


def derive_rgba_from_rgb_source(rgb_image):
    """Deterministically turn a frozen opaque RGB Founder source into RGBA.

    Only the alpha channel is written; every RGB sample is preserved as-is.
    Identical method to A9-OR/A9-NAND/A9-NOR's derive_rgba_from_rgb_source.
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


def write_text(name, text):
    (PACK / name).write_text(text, encoding='utf-8', newline='\n')


source = (PACK / REFERENCE).read_bytes()
current_sha = digest(source)

if current_sha == PRIOR_OPAQUE_SHA:
    # First run: perform the actual RGB(opaque) -> RGBA(transparent) correction.
    rgb_image = Image.open(PACK / REFERENCE)
    assert rgb_image.mode == 'RGB' and rgb_image.size == (1536, 1024)
    original_rgb = np.array(rgb_image.convert('RGB'))

    corrected = derive_rgba_from_rgb_source(rgb_image)
    corrected_arr = np.array(corrected)
    assert np.array_equal(corrected_arr[..., :3], original_rgb), 'RGB channels must stay byte-identical'

    corrected.save(PACK / REFERENCE, optimize=True)
    source = (PACK / REFERENCE).read_bytes()
    current_sha = digest(source)
    assert current_sha != PRIOR_OPAQUE_SHA
else:
    assert LOCKED_SHA is not None and current_sha == LOCKED_SHA, \
        'reference sha matches neither the known prior opaque source nor a locked corrected sha'

meta_path = PACK / 'FOUNDER-ASSET.json'
im = Image.open(PACK / REFERENCE)
assert im.mode == 'RGBA' and im.size == (1536, 1024)
arr = np.array(im)
assert (arr[0, 0, 3], arr[0, -1, 3], arr[-1, 0, 3], arr[-1, -1, 3]) == (0, 0, 0, 0), 'corners must be transparent'
assert (arr[..., 3] == 255).sum() > 450000, 'component interior must remain substantially opaque'
assert (arr[..., 3] == 0).sum() > 450000, 'exterior background must be genuinely transparent'
assert ((arr[..., 3] > 0) & (arr[..., 3] < 255)).sum() > 0, 'a real anti-aliasing feather band must exist'

# Generic physical-preservation raster check, NOT an electrical/PhysicalContacts
# registration. The exact A/B/Q electrical pixel-probe belongs to the separate,
# not-yet authorized functional A9-XOR ticket.
metal_zones = []
for label, lo, hi in METAL_ZONES:
    opaque = sum(1 for x in range(lo, hi) if im.getpixel((x, METAL_ROW))[3] >= 200)
    metal_zones.append({'zone': label, 'row': METAL_ROW, 'regionX': [lo, hi], 'opaquePixelCount': opaque})
    assert opaque > 60, f'{label} metal zone lost opacity after transparency correction'

assets = []
for scale in [1, 3]:
    size = (144 * scale, 96 * scale)
    # Premultiplied alpha prevents colour fringes; full image, isotropic resize.
    runtime = im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    for fmt in ['png', 'webp']:
        name = f'xor-gate.default.{scale}x.{fmt}'
        options = {'optimize': True} if fmt == 'png' else {'quality': 92, 'method': 6}
        runtime.save(PACK / name, **options)
        raw = (PACK / name).read_bytes()
        assets.append({'file': name, 'scale': scale, 'format': fmt,
                       'width': size[0], 'height': size[1], 'bytes': len(raw), 'sha256': digest(raw)})

write_json('manifest.json', {
    'component': 'XOR_GATE', 'assetStatus': 'FOUNDER_PASS_FROZEN', 'backend': 'raster',
    'canonical': {'width': 144, 'height': 96}, 'assets': assets,
    'reference': {'file': REFERENCE, 'sha256': current_sha, 'width': 1536, 'height': 1024},
    'derivation': {
        'method': 'Full-source premultiplied-alpha Lanczos resize; no crop/redraw/recolor/deformation.',
        'pixelProbe': 'NOT_MEASURED_IN_A9-XOR-ASSET-FIX_SCOPE',
        'pixelProbeMethod': 'Electrical A/B/Q pixel-probe and PhysicalContacts belong to the separate, '
                             'not-yet-authorized functional A9-XOR ticket; this asset-fix ticket does not '
                             'register them. A generic physical-preservation check (metalZoneCheck below) '
                             'verifies the visible metal leads stayed opaque through the correction.',
        'metalZoneCheck': metal_zones,
        'transparency': {
            'note': 'Founder reference corrected from opaque RGB to true RGBA: exterior background '
                    '(connected to the four canvas corners) flood-filled to alpha 0, with a 2 px '
                    'proportional feather band at the silhouette edge, using the same method qualified '
                    'for A9-OR/A9-NAND/A9-NOR. No RGB channel redrawn.',
            'priorSha256': PRIOR_OPAQUE_SHA,
            'priorShaRecoverableAt': PRIOR_SHA_RECOVERABLE_AT,
            'borderMatchThreshold': BORDER_MATCH_THRESHOLD, 'featherHighThreshold': FEATHER_HIGH_THRESHOLD,
            'featherBandPx': FEATHER_BAND_PX,
        },
    },
    'notes': ['Pins A/B/Q.',
              'Q = A XOR B.',
              'Qualify physical contacts against 12 px breadboard pitch.',
              'Do not invent VCC/GND for this abstract Level-1 gate.',
              'No bodyClip; reference RGB content remains byte-identical to the pre-correction source, '
              'only alpha changed.',
              'This is an asset-only correction: no functional XOR_GATE component, registration or '
              'simulation contract is introduced by this ticket.',
              'These corrected bytes are a technical candidate: they await the Founder\'s own visual '
              're-qualification (Canvas/visual asset gate) before being treated as a fresh Founder PASS.']})

write_json('FOUNDER-ASSET.json', {
    'ticket': 'A9-XOR',
    'componentType': 'XOR_GATE',
    'status': 'FOUNDER_PASS_FROZEN',
    'referenceFile': REFERENCE,
    'sha256': current_sha,
    'dimensions': [1536, 1024],
    'mode': 'RGBA',
    'pins': ['A', 'B', 'Q'],
    'logic': 'Q = A XOR B',
    'note': 'A9-XOR-ASSET-FIX: corrected from an opaque RGB source (sha256 ' + PRIOR_OPAQUE_SHA + ', '
            'recoverable at commit ' + PRIOR_SHA_RECOVERABLE_AT + ') to true RGBA using the '
            'border-connected segmentation method qualified for A9-OR/A9-NAND/A9-NOR: exterior background '
            'made transparent, all RGB content preserved byte-identical. This is a technical transparency '
            'correction of the Founder-approved visual identity; the new RGBA bytes await the Founder\'s '
            'own visual re-qualification (Canvas/visual asset gate) before being treated as a fresh '
            'Founder PASS on those bytes.',
})

readme = f"""# A9-XOR frozen raster pack (A9-XOR-ASSET-FIX)
XOR_GATE — A/B -> Q = A XOR B
Founder-approved visual identity; asset-only transparency correction (technical pass), pending the Founder's own visual re-qualification of the corrected bytes.
Reference: {REFERENCE}
1536x1024 RGBA — SHA-256: {current_sha}

Corrected from the original opaque RGB source (SHA-256
{PRIOR_OPAQUE_SHA}, recoverable
at git commit {PRIOR_SHA_RECOVERABLE_AT}) which rendered as a
large opaque white rectangle around the component, the same defect found and
fixed on A9-OR/A9-NAND/A9-NOR. The exterior background (near-white, connected to the
four canvas corners) was flood-filled to alpha 0, with a 2 px proportional
feather band at the silhouette edge, using the method qualified for
A9-OR/A9-NAND/A9-NOR; every RGB sample is otherwise byte-identical to the prior
source. See scripts/build-xor-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime: 144x96 (1x), 432x288 (3x), PNG/WebP.
No crop, redraw, recolour or deformation beyond the transparency correction
above.

This is an asset-only correction (A9-XOR-ASSET-FIX): XOR_GATE has no
functional component, registration or simulation contract yet. Electrical
A/B/Q pixel-probe and PhysicalContacts coordinates belong to the separate,
not-yet-authorized functional A9-XOR ticket.
"""
write_text('README.md', readme)
write_text('README.txt', readme.replace('# ', '').replace('\n\n\n', '\n\n'))

files = {}
for path in sorted(PACK.iterdir()):
    if path.is_file() and path.name != 'ASSET-INTEGRITY.json':
        raw = path.read_bytes()
        if path.suffix in ['.json', '.md', '.txt']:
            raw = raw.replace(b'\r\n', b'\n')
        files[path.name] = {'sha256': digest(raw), 'bytes': len(raw)}
write_json('ASSET-INTEGRITY.json', {'component': 'XOR_GATE', 'textNormalization': 'LF', 'files': files})

assert (PACK / REFERENCE).read_bytes() == source
print(json.dumps({'referenceSha256': current_sha, 'metalZoneCheck': metal_zones, 'assets': assets}, indent=2))
