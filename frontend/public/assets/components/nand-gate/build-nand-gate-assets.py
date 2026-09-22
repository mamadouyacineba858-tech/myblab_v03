from pathlib import Path
from PIL import Image
import hashlib
P=Path(__file__).resolve().parents[1]/"frontend/public/assets/components/nand-gate"
R=P/"nand-gate.founder-reference.png"; S="676a9f047f9bbcb4a353cf612806530876b91e672371a3880e343620e4bdf96d"
assert hashlib.sha256(R.read_bytes()).hexdigest()==S
im=Image.open(R).convert("RGBA"); assert im.size==(1536,1024)
for s in (1,3):
 out=im.convert("RGBa").resize((144*s,96*s),Image.Resampling.LANCZOS).convert("RGBA")
 out.save(P/f"nand-gate.default.{s}x.png",optimize=True)
 out.save(P/f"nand-gate.default.{s}x.webp",quality=92,method=6)
assert hashlib.sha256(R.read_bytes()).hexdigest()==S
