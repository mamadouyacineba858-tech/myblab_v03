"""Reproduce A9-OR raster derivatives from the frozen Founder source."""
from pathlib import Path
import hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
PACK=ROOT/"frontend/public/assets/components/or-gate"
REF=PACK/"or-gate.founder-reference.png"
LOCKED_SHA="56a3c8991d902c337dac73a1ed451df34184a67c2e443a7e051a778ee6d73b67"
assert hashlib.sha256(REF.read_bytes()).hexdigest()==LOCKED_SHA
im=Image.open(REF).convert("RGBA")
assert im.size==(1536,1024)
for s in (1,3):
    out=im.convert("RGBa").resize((144*s,96*s),Image.Resampling.LANCZOS).convert("RGBA")
    out.save(PACK/f"or-gate.default.{s}x.png",optimize=True)
    out.save(PACK/f"or-gate.default.{s}x.webp",quality=92,method=6)
assert hashlib.sha256(REF.read_bytes()).hexdigest()==LOCKED_SHA
