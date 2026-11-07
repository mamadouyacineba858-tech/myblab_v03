#!/usr/bin/env python3
"""Produce optimized *derived* PNGs for four over-budget raster variants.

The original bytes remain recoverable in Git history. Abort instead of lowering
the visual quality beyond the explicitly enforced pixel-error thresholds.
Requires Pillow. Never changes any file unless all four candidates qualify.
"""
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1] / "public/assets/components"
PACKS = ("tilt-sensor", "ir-receiver", "inductor", "zener-diode")
LIMIT = 30 * 1024
MAX_MEAN_CHANNEL_ERROR = 2.0
MAX_CHANGED_PIXEL_RATIO = 0.12

def candidate(original):
    rgba = original.convert("RGBA")
    results = []
    for colors in (256, 192, 128, 96, 64, 48, 32):
        # RGB palette with preserved alpha channel; no geometry changes.
        rgb = rgba.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
        restored = rgb.convert("RGBA")
        restored.putalpha(rgba.getchannel("A"))
        out = io.BytesIO()
        restored.save(out, format="PNG", optimize=True, compress_level=9)
        data = out.getvalue()
        diff = ImageChops.difference(rgba, restored)
        mean = sum(ImageStat.Stat(diff).mean[:3]) / 3
        changed = sum(1 for px in diff.getdata() if px[0] or px[1] or px[2]) / (rgba.width * rgba.height)
        print(f"  colors={colors} bytes={len(data)} mean={mean:.3f} changed={changed:.2%}", flush=True)
        if len(data) <= LIMIT and mean <= MAX_MEAN_CHANNEL_ERROR and changed <= MAX_CHANGED_PIXEL_RATIO:
            results.append((len(data), mean, changed, data))
    return min(results, key=lambda r: (r[1], r[2], r[0])) if results else None

def main():
    staged = []
    for slug in PACKS:
        path = ROOT / slug / f"{slug}.default.3x.png"
        with Image.open(path) as source:
            source.load()
            found = candidate(source)
        if found is None:
            raise SystemExit(f"STOP {slug}: no candidate satisfies size AND visual thresholds")
        size, mean, changed, data = found
        integrity_path = path.parent / "ASSET-INTEGRITY.json"
        integrity = json.loads(integrity_path.read_text(encoding="utf-8-sig"))
        records = integrity if isinstance(integrity, list) else integrity.get("files", [])
        if not isinstance(records, list):
            raise SystemExit(f"STOP {slug}: unsupported integrity schema")
        match = [r for r in records if isinstance(r, dict) and r.get("file") == path.name]
        if len(match) != 1:
            raise SystemExit(f"STOP {slug}: missing/ambiguous integrity record")
        match[0]["bytes"] = size
        match[0]["sha256"] = hashlib.sha256(data).hexdigest()
        staged.append((path, data, integrity_path, (json.dumps(integrity, indent=2, ensure_ascii=False) + "\n").encode("utf-8")))
        print(f"{slug}: {size} bytes, mean RGB error {mean:.3f}, changed pixels {changed:.2%}")
    for path, data, integrity_path, metadata in staged:
        path.write_bytes(data)
        integrity_path.write_bytes(metadata)
    print("All four qualified optimized variants and matching metadata written.")

if __name__ == "__main__":
    main()
