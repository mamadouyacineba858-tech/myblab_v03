"""Reproduce A9-AND technical raster derivatives (Pillow, no visual edits)."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'frontend/public/assets/components/and-gate'
REFERENCE = 'and-gate.founder-reference.png'
LOCKED_SHA = '7aba60ecd45f4c10314f81690938bae91370949206ce145a2e6e90b1bd74d0d7'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write_json(name, data):
    (PACK / name).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8', newline='\n')

source = (PACK / REFERENCE).read_bytes()
assert digest(source) == LOCKED_SHA
meta = json.loads((PACK / 'FOUNDER-ASSET.json').read_text(encoding='utf-8'))
assert meta['sha256'] == LOCKED_SHA
im = Image.open(PACK / REFERENCE)
assert im.mode == 'RGBA' and im.size == tuple(meta['dimensions']) == (1536, 1024)
# Probe the actual metal, not bounding boxes or pin names. These are the
# visible lower feet in the three columns identified A/B/Q by the source.
probe = []
for pin, lo, hi in [('A', 450, 575), ('B', 700, 825), ('Q', 965, 1090)]:
    xs = [x for x in range(lo, hi) if min(im.getpixel((x, 950))[:3]) >= 130 and im.getpixel((x, 950))[3] >= 200]
    centre = (min(xs) + max(xs)) / 2
    probe.append({'pin': pin, 'sourceRow': 950, 'metalSpan': [min(xs), max(xs)],
                  'sourceRoot': [centre, 950], 'runtimeRoot': [centre * 3 / 32, 950 * 3 / 32]})
assets = []
for scale in [1, 3]:
    size = (144 * scale, 96 * scale)
    # Premultiplied alpha prevents colour fringes; full image, isotropic resize.
    runtime = im.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    for fmt in ['png', 'webp']:
        name = f'and-gate.default.{scale}x.{fmt}'
        options = {'optimize': True} if fmt == 'png' else {'quality': 92, 'method': 6}
        runtime.save(PACK / name, **options)
        raw = (PACK / name).read_bytes()
        assets.append({'file': name, 'state': 'default', 'scale': scale, 'format': fmt,
                       'width': size[0], 'height': size[1], 'bytes': len(raw), 'sha256': digest(raw)})
write_json('manifest.json', {
    'component': 'AND_GATE', 'assetStatus': 'FOUNDER_PASS_FROZEN', 'variant': 'default',
    'runtimeView': 'front', 'backend': 'raster', 'complexity': 'complex',
    'budget': {'complexity': 'complex'}, 'states': ['default'],
    'canonical': {'width': 144, 'height': 96}, 'assets': assets,
    'reference': {'file': REFERENCE, 'sha256': LOCKED_SHA, 'width': 1536, 'height': 1024},
    'derivation': {'source': REFERENCE, 'method': 'Full-source isotropic Lanczos resize with premultiplied alpha; no crop, rotation, recolor, redraw or alpha removal.',
                   'scale': '3/32 at 1x; 9/32 at 3x', 'webp': 'quality 92, method 6',
                   'probeThreshold': 'At source y=950, RGB minimum >=130 and alpha >=200', 'pixelProbe': probe},
    'notes': ['Three electrical pins A/B/Q; no additional electrical pins for upper decorative/labeled ends.',
              'PhysicalContacts at (48,90), (72,90), (96,90); generic AssemblyLeadsLayer joins measured lower feet to grid targets.',
              'No bodyClip; reference remains byte-identical.']})
files = {}
for path in sorted(PACK.iterdir()):
    if path.is_file() and path.name != 'ASSET-INTEGRITY.json':
        raw = path.read_bytes()
        if path.suffix in ['.json', '.md', '.txt']:
            raw = raw.replace(b'\r\n', b'\n')
        files[path.name] = {'sha256': digest(raw), 'bytes': len(raw)}
write_json('ASSET-INTEGRITY.json', {'component': 'AND_GATE', 'textNormalization': 'LF', 'files': files})
assert (PACK / REFERENCE).read_bytes() == source
print(json.dumps({'referenceSha256': digest(source), 'probe': probe, 'assets': assets}, indent=2))
