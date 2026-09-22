from pathlib import Path
from PIL import Image
import hashlib
P=Path(__file__).resolve().parents[1]/"frontend/public/assets/components/nor-gate"
R=P/"nor-gate.founder-reference.png"; S="625ce6ce6cc2d07d4cc6b8187d70d2a457eeeb44b20ecb5a7c07d900983b43d4"
assert hashlib.sha256(R.read_bytes()).hexdigest()==S
im=Image.open(R).convert("RGBA"); assert im.size==(1536,1024)
for s in (1,3):
 out=im.convert("RGBa").resize((144*s,96*s),Image.Resampling.LANCZOS).convert("RGBA")
 out.save(P/f"nor-gate.default.{s}x.png",optimize=True)
 out.save(P/f"nor-gate.default.{s}x.webp",quality=92,method=6)
assert hashlib.sha256(R.read_bytes()).hexdigest()==S
