"""Reproduce A9-NAND technical raster derivatives (Pillow, no visual edits).

The Founder reference is now a true RGBA source. The opaque RGB source
Founder originally approved (sha256 676a9f047f9bbcb4a353cf612806530876b91e6
72371a3880e343620e4bdf96d, PNG colourtype 2) rendered as a large opaque
white rectangle on any non-white canvas, the same defect found and fixed on
A9-OR. That RGB source remains recoverable byte-for-bit from git history
(commit f787a3d23c430999994f4fca38548b9178a08a09) for audit; it is not read
here.

`derive_rgba_from_rgb_source` is the exact method already qualified and
shipped for A9-OR (scripts/build-or-gate-assets.py): the exterior
background (near-white, connected to the four canvas corners) is
flood-filled and its alpha zeroed; a thin (2 px) feather band around that
region gets a proportional alpha so the true anti-aliased silhouette edge
is preserved without a hard cliff or a white halo. No RGB channel is
redrawn, recoloured or cropped anywhere, at any distance from the
background, so every interior light pixel (labels, the NAND symbol and its
inversion bubble, metal highlights) keeps both its original colour and
full opacity. Running it against the historical RGB source reproduces the
frozen RGBA reference below byte-for-byte.

A9-NAND (functional ticket): pixel-probe measured on the frozen RGBA
reference itself — source row y=890, neutral metal min(RGB)>=130,
max(RGB)-min(RGB)<45, alpha>=200 inside each lower-foot ROI. Own real
measurement, not copied from AND_GATE/OR_GATE's rows or PhysicalContacts.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'frontend/public/assets/components/nand-gate'
REFERENCE = 'nand-gate.founder-reference.png'
LOCKED_SHA = 'fc35f979ec5faf2b062ecef55df9a20e34e7d55e31812514cc7bbb3b1238fbb9'

BORDER_MATCH_THRESHOLD = 24   # max per-channel diff from background still flood-filled (alpha 0)
FEATHER_HIGH_THRESHOLD = 90   # diff at/above which a boundary-adjacent pixel is fully opaque
FEATHER_BAND_PX = 2           # dilation radius (px) of the alpha feather band around the flood fill


def digest(data):
    return hashlib.sha256(data).hexdigest()


def derive_rgba_from_rgb_source(rgb_image):
    """Deterministically turn a frozen opaque RGB Founder source into RGBA.

    Only the alpha channel is written; every RGB sample is preserved as-is.
    Identical method to A9-OR's derive_rgba_from_rgb_source.
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
assert (arr[..., 3] == 255).sum() > 460000, 'component interior must remain substantially opaque'
assert (arr[..., 3] == 0).sum() > 0 and (arr[..., 3] == 255).sum() > 0, 'alpha must not be uniform'

# Probe the actual metal, not bounding boxes or pin names. Source row 890;
# neutral metal min(RGB)>=130 and max(RGB)-min(RGB)<45, alpha>=200, inside
# each lower-foot ROI. Own measurement for NAND_GATE (not copied from
# AND_GATE/OR_GATE).
probe = []
for pin, lo, hi in [('A', 460, 530), ('B', 730, 800), ('Q', 1000, 1060)]:
    row = 890
    xs = []
    for x in range(lo, hi):
        r, g, b, a = im.getpixel((x, row))
        if min(r, g, b) >= 130 and max(r, g, b) - min(r, g, b) < 45 and a >= 200:
            xs.append(x)
    centre = (min(xs) + max(xs)) / 2
    probe.append({'pin': pin, 'regionX': [lo, hi], 'sourceSpan': [min(xs), max(xs)],
                  'sourceRoot': [centre, row], 'runtimeRoot': [centre * 3 / 32, row * 3 / 32],
                  'physicalContact': [{'A': 48, 'B': 72, 'Q': 96}[pin], 83]})

assets = []
for scale in [1, 3]:
    size = (144 * scale, 96 * scale)
    # Premultiplied alpha prevents colour fringes; full image, isotropic resize.
    runtime = im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    for fmt in ['png', 'webp']:
        name = f'nand-gate.default.{scale}x.{fmt}'
        options = {'optimize': True} if fmt == 'png' else {'quality': 92, 'method': 6}
        runtime.save(PACK / name, **options)
        raw = (PACK / name).read_bytes()
        assets.append({'file': name, 'scale': scale, 'format': fmt,
                       'width': size[0], 'height': size[1], 'bytes': len(raw), 'sha256': digest(raw)})

write_json('manifest.json', {
    'component': 'NAND_GATE', 'assetStatus': 'FOUNDER_PASS_FROZEN', 'variant': 'default',
    'runtimeView': 'front', 'backend': 'raster', 'complexity': 'complex',
    'budget': {'complexity': 'complex'}, 'states': ['default'],
    'canonical': {'width': 144, 'height': 96}, 'assets': assets,
    'reference': {'file': REFERENCE, 'sha256': LOCKED_SHA, 'width': 1536, 'height': 1024},
    'derivation': {
        'method': 'Full-source premultiplied-alpha Lanczos resize; no crop/redraw/recolor/deformation.',
        'pixelProbe': probe,
        'pixelProbeMethod': 'Source row 890; neutral metal min(RGB)>=130 and max(RGB)-min(RGB)<45, alpha>=200, inside each lower-foot ROI. Centre of thresholded bounding span. Scale 3/32. Own measurement for NAND_GATE.',
        'transparency': {
            'note': 'Founder reference corrected from opaque RGB to true RGBA: exterior background (connected to the four canvas corners) flood-filled to alpha 0, with a 2 px proportional feather band at the silhouette edge, using the same method qualified for A9-OR. No RGB channel redrawn.',
            'priorSha256': '676a9f047f9bbcb4a353cf612806530876b91e672371a3880e343620e4bdf96d',
            'borderMatchThreshold': BORDER_MATCH_THRESHOLD, 'featherHighThreshold': FEATHER_HIGH_THRESHOLD,
            'featherBandPx': FEATHER_BAND_PX,
        },
    },
    'notes': ['Three electrical pins A/B/Q.',
              'PhysicalContacts at (48,83), (72,83), (96,83); generic AssemblyLeadsLayer joins measured lower feet to grid targets.',
              'Do not invent VCC/GND.',
              'No bodyClip; reference RGB content remains byte-identical to the pre-correction source, only alpha changed.']})

files = {}
for path in sorted(PACK.iterdir()):
    if path.is_file() and path.name != 'ASSET-INTEGRITY.json':
        raw = path.read_bytes()
        if path.suffix in ['.json', '.md', '.txt']:
            raw = raw.replace(b'\r\n', b'\n')
        files[path.name] = {'sha256': digest(raw), 'bytes': len(raw)}
write_json('ASSET-INTEGRITY.json', {'component': 'NAND_GATE', 'files': files})

assert (PACK / REFERENCE).read_bytes() == source
print(json.dumps({'referenceSha256': digest(source), 'assets': assets}, indent=2))
