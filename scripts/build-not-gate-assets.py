"""Fix A9-NOT raster transparency (Pillow, no visual edits, no functional component).

The ORIGINAL FOUNDER SOURCE for NOT staged at commit
e29d1aeaf9d6f454f06875b3b4897d08e0ad20fb ("chore(a9): stage NOT Founder
source asset for correction", branch asset/A9-NOT-founder-source) is an
opaque RGB PNG (sha256
58271344adea31d04b59d2a4c97f21eef674b70b0967d9708d30e10afbb8a827, PNG
colourtype 2, bit depth 8, 1536x1024). Like A9-OR/A9-NAND/A9-NOR/A9-XOR
before it, it would render as a large opaque white/near-white rectangle on
any non-white canvas. That RGB source remains recoverable byte-for-bit from
git history at that transport commit for audit; after this script runs
once, it is not read again (LOCKED_SHA below pins the CORRECTED FOUNDER
REFERENCE).

`derive_rgba_from_rgb_source` is the exact method already qualified and
shipped for A9-OR/A9-NAND/A9-NOR/A9-XOR (scripts/build-*-gate-assets.py):
the exterior background (near-white, connected to the four canvas corners)
is flood-filled and its alpha zeroed; a thin (2 px) feather band around
that region gets a proportional alpha so the true anti-aliased silhouette
edge is preserved without a hard cliff or a white halo. No RGB channel is
redrawn, recoloured or cropped anywhere, so every interior light pixel
(the NOT/INVERTER/MYBlab labels, the inverter symbol and its output bubble,
the A/Q key caps, metal highlights) keeps both its original colour and
full opacity. Measured on the real NOT raster (background median
(254, 254, 254), border max deviation 1), the flood-filled region is
stable from threshold 24 to 40 (+934 px, silhouette anti-aliasing only),
with no leakage into the component body, so the qualified thresholds
(24 / 90 / 2px) are reused unchanged.

RGB preservation proof: the script asserts the corrected RGB channels are
array-equal to the original RGB source, and records the sha256 of the raw
RGB sample stream (row-major, 3 bytes/pixel) in manifest.json
derivation.transparency.rgbChannelsSha256 so the JS raster test can
re-verify it from the corrected PNG alone.

This is A9-NOT-ASSET-FIX, a raster asset correction only. NOT_GATE has no
functional component/registration/simulation contract yet — that is the
separate, not-yet-authorized A9-NOT ticket. Accordingly this script does
not compute or register electrical PhysicalContacts for A/Q. The only raster
probe below is a generic check that the two visible metal lead zones (A lead
at the top, Q lead at the bottom) stay substantially opaque after the
correction — a physical-preservation check, not an electrical pin
registration.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'frontend/public/assets/components/not-gate'
REFERENCE = 'not-gate.founder-reference.png'

PRIOR_OPAQUE_SHA = '58271344adea31d04b59d2a4c97f21eef674b70b0967d9708d30e10afbb8a827'
PRIOR_SHA_RECOVERABLE_AT = 'e29d1aeaf9d6f454f06875b3b4897d08e0ad20fb'
LOCKED_SHA = '43f13e75f460575406a6c1c9df93813157073403f15ccf96a05ce7b6165011cd'

BORDER_MATCH_THRESHOLD = 24   # max per-channel diff from background still flood-filled (alpha 0)
FEATHER_HIGH_THRESHOLD = 90   # diff at/above which a boundary-adjacent pixel is fully opaque
FEATHER_BAND_PX = 2           # dilation radius (px) of the alpha feather band around the flood fill

# Generic physical-preservation raster zones, NOT electrical PhysicalContacts.
# Measured directly on the NOT raster (own measurement, not copied from the
# two-input gates, whose leads sit side by side at one row): the NOT leads
# are vertical, A metal lead above the body and Q metal lead below it.
METAL_ZONES = [
    ('a-lead-metal', 250, 705, 828),
    ('q-lead-metal', 900, 718, 815),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def derive_rgba_from_rgb_source(rgb_image):
    """Deterministically turn a frozen opaque RGB Founder source into RGBA.

    Only the alpha channel is written; every RGB sample is preserved as-is.
    Identical method to A9-OR/A9-NAND/A9-NOR/A9-XOR's derive_rgba_from_rgb_source.
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
    reread = np.array(Image.open(PACK / REFERENCE))
    assert np.array_equal(reread[..., :3], original_rgb), 'encoded RGB channels must stay byte-identical'
else:
    assert LOCKED_SHA is not None and current_sha == LOCKED_SHA, \
        'reference sha matches neither the known prior opaque source nor a locked corrected sha'

im = Image.open(PACK / REFERENCE)
assert im.mode == 'RGBA' and im.size == (1536, 1024)
arr = np.array(im)
rgb_channels_sha = digest(np.ascontiguousarray(arr[..., :3]).tobytes())
alpha = arr[..., 3]
alpha_stats = {
    'totalPixels': int(alpha.size),
    'alpha0': int((alpha == 0).sum()),
    'alpha255': int((alpha == 255).sum()),
    'alphaPartial': int(((alpha > 0) & (alpha < 255)).sum()),
    'cornerAlpha': [int(alpha[0, 0]), int(alpha[0, -1]), int(alpha[-1, 0]), int(alpha[-1, -1])],
}
assert alpha_stats['cornerAlpha'] == [0, 0, 0, 0], 'corners must be transparent'
assert alpha_stats['alpha255'] > 250000, 'component body must remain substantially opaque'
assert alpha_stats['alpha0'] > 1000000, 'exterior background must be genuinely transparent'
assert alpha_stats['alphaPartial'] > 0, 'a real anti-aliasing feather band must exist'

# Generic physical-preservation raster check, NOT an electrical/PhysicalContacts
# registration. The exact A/Q electrical pixel-probe belongs to the separate,
# not-yet authorized functional A9-NOT ticket.
metal_zones = []
for label, row, lo, hi in METAL_ZONES:
    opaque = sum(1 for x in range(lo, hi) if im.getpixel((x, row))[3] >= 200)
    metal_zones.append({'zone': label, 'row': row, 'regionX': [lo, hi], 'opaquePixelCount': opaque})
    assert opaque > 80, f'{label} metal zone lost opacity after transparency correction'

assets = []
for scale in [1, 3]:
    size = (144 * scale, 96 * scale)
    # Premultiplied alpha prevents colour fringes; full image, isotropic resize.
    runtime = im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    for fmt in ['png', 'webp']:
        name = f'not-gate.default.{scale}x.{fmt}'
        options = {'optimize': True} if fmt == 'png' else {'quality': 92, 'method': 6}
        runtime.save(PACK / name, **options)
        raw = (PACK / name).read_bytes()
        assets.append({'file': name, 'scale': scale, 'format': fmt,
                       'width': size[0], 'height': size[1], 'bytes': len(raw), 'sha256': digest(raw)})

write_json('manifest.json', {
    'component': 'NOT_GATE', 'assetStatus': 'FOUNDER_PASS_FROZEN', 'backend': 'raster',
    'correctedReferenceStatus': 'TECHNICAL_CANDIDATE_PENDING_FOUNDER_ASSET_GATE',
    'canonical': {'width': 144, 'height': 96}, 'assets': assets,
    'reference': {'file': REFERENCE, 'sha256': current_sha, 'width': 1536, 'height': 1024,
                  'mode': 'RGBA', 'pngColorType': 6, 'bitDepth': 8},
    'originalFounderSource': {'sha256': PRIOR_OPAQUE_SHA, 'width': 1536, 'height': 1024,
                              'mode': 'RGB', 'pngColorType': 2, 'bitDepth': 8,
                              'recoverableAt': PRIOR_SHA_RECOVERABLE_AT},
    'derivation': {
        'method': 'Full-source premultiplied-alpha Lanczos resize; no crop/redraw/recolor/deformation.',
        'pixelProbe': 'NOT_MEASURED_IN_A9-NOT-ASSET-FIX_SCOPE',
        'pixelProbeMethod': 'Electrical A/Q pixel-probe and PhysicalContacts belong to the separate, '
                             'not-yet-authorized functional A9-NOT ticket; this asset-fix ticket does not '
                             'register them. A generic physical-preservation check (metalZoneCheck below) '
                             'verifies the visible metal leads stayed opaque through the correction.',
        'metalZoneCheck': metal_zones,
        'transparency': {
            'note': 'Founder reference corrected from opaque RGB to true RGBA: exterior background '
                    '(connected to the four canvas corners) flood-filled to alpha 0, with a 2 px '
                    'proportional feather band at the silhouette edge, using the same method qualified '
                    'for A9-OR/A9-NAND/A9-NOR/A9-XOR. No RGB channel redrawn.',
            'priorSha256': PRIOR_OPAQUE_SHA,
            'priorShaRecoverableAt': PRIOR_SHA_RECOVERABLE_AT,
            'borderMatchThreshold': BORDER_MATCH_THRESHOLD, 'featherHighThreshold': FEATHER_HIGH_THRESHOLD,
            'featherBandPx': FEATHER_BAND_PX,
            'rgbChannelsSha256': rgb_channels_sha,
            'rgbChannelsIdenticalToOriginal': True,
            'alphaStats': alpha_stats,
        },
    },
    'notes': ['Exactly two intended electrical pins: A input and Q output.',
              'Q = NOT(A).',
              'Do not reuse the three-contact geometry of AND/OR/NAND/NOR/XOR.',
              'Qualify A/Q physical contacts against 12 px breadboard pitch.',
              'Do not invent VCC/GND for this abstract Level-1 inverter.',
              'No bodyClip; reference RGB content remains byte-identical to the original Founder source, '
              'only alpha changed.',
              'This is an asset-only correction: no functional NOT_GATE component, registration or '
              'simulation contract is introduced by this ticket.',
              'These corrected bytes are a technical candidate: they await the Founder\'s own visual '
              're-qualification (direct Asset Gate) before being treated as a fresh Founder PASS.']})

write_json('FOUNDER-ASSET.json', {
    'ticket': 'A9-NOT',
    'componentType': 'NOT_GATE',
    'status': 'FOUNDER_PASS_FROZEN',
    'correctedReferenceStatus': 'TECHNICAL_CANDIDATE_PENDING_FOUNDER_ASSET_GATE',
    'referenceFile': REFERENCE,
    'sha256': current_sha,
    'originalFounderSourceSha256': PRIOR_OPAQUE_SHA,
    'dimensions': [1536, 1024],
    'mode': 'RGBA',
    'pins': ['A', 'Q'],
    'logic': 'Q = NOT(A)',
    'note': 'A9-NOT-ASSET-FIX: ORIGINAL FOUNDER SOURCE (opaque RGB, sha256 ' + PRIOR_OPAQUE_SHA + ', '
            'recoverable at commit ' + PRIOR_SHA_RECOVERABLE_AT + ') corrected to this CORRECTED FOUNDER '
            'REFERENCE (true RGBA) using the border-connected segmentation method qualified for '
            'A9-OR/A9-NAND/A9-NOR/A9-XOR: exterior background made transparent, all RGB content preserved '
            'byte-identical. This is a technical transparency correction of the Founder-approved visual '
            'identity; the new RGBA bytes await the Founder\'s own visual re-qualification (direct Asset '
            'Gate) before being treated as a fresh Founder PASS on those bytes.',
})

readme = f"""# A9-NOT / Inverter raster pack (A9-NOT-ASSET-FIX)
NOT_GATE — A -> Q = NOT(A)
Founder-approved visual identity; asset-only transparency correction (technical pass), pending the Founder's own visual re-qualification of the corrected bytes (direct Asset Gate).

ORIGINAL FOUNDER SOURCE
1536x1024 RGB (PNG colour type 2, 8-bit, no alpha) — SHA-256:
{PRIOR_OPAQUE_SHA}
Recoverable at git commit {PRIOR_SHA_RECOVERABLE_AT}.

CORRECTED FOUNDER REFERENCE
Reference: {REFERENCE}
1536x1024 RGBA (PNG colour type 6, 8-bit) — SHA-256:
{current_sha}

The original source rendered as a large opaque white rectangle around the
component, the same defect found and fixed on A9-OR/A9-NAND/A9-NOR/A9-XOR.
The exterior background (near-white, connected to the four canvas corners)
was flood-filled to alpha 0, with a 2 px proportional feather band at the
silhouette edge (borderMatchThreshold 24, featherHighThreshold 90,
featherBandPx 2); every RGB sample is byte-identical to the original source.
See scripts/build-not-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime: 144x96 (1x), 432x288 (3x), PNG/WebP.
No crop, redraw, recolour or deformation beyond the transparency correction
above.

This component has exactly two intended electrical contacts: A and Q.
Do not copy the three-contact geometry used by the two-input gates.
This is an asset-only correction (A9-NOT-ASSET-FIX): NOT_GATE has no
functional component, registration or simulation contract yet. Electrical
A/Q pixel-probe and PhysicalContacts coordinates belong to the separate,
not-yet-authorized functional A9-NOT ticket. Do not invent VCC/GND.
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
write_json('ASSET-INTEGRITY.json', {'component': 'NOT_GATE', 'textNormalization': 'LF', 'files': files})

assert (PACK / REFERENCE).read_bytes() == source
print(json.dumps({'referenceSha256': current_sha, 'rgbChannelsSha256': rgb_channels_sha,
                  'alphaStats': alpha_stats, 'metalZoneCheck': metal_zones, 'assets': assets}, indent=2))
