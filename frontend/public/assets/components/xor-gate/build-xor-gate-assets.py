from pathlib import Path
from PIL import Image
import hashlib
P=Path(__file__).resolve().parents[1]/"frontend/public/assets/components/xor-gate"
R=P/"xor-gate.founder-reference.png"; S="8ff6d6af57779a88019a385f6d0c480f9ecd558c9d41d6d4e06b84bf9a974fe9"
assert hashlib.sha256(R.read_bytes()).hexdigest()==S
im=Image.open(R).convert("RGBA"); assert im.size==(1536,1024)
for s in (1,3):
 out=im.convert("RGBa").resize((144*s,96*s),Image.Resampling.LANCZOS).convert("RGBA")
 out.save(P/f"xor-gate.default.{s}x.png",optimize=True)
 out.save(P/f"xor-gate.default.{s}x.webp",quality=92,method=6)
assert hashlib.sha256(R.read_bytes()).hexdigest()==S
