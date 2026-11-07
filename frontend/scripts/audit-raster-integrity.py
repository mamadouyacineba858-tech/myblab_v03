#!/usr/bin/env python3
"""Read-only audit of committed raster assets. Never rewrites trusted hashes."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "components"

def entries(document):
    if isinstance(document, list):
        return document
    if isinstance(document, dict):
        files = document.get("files", [])
        if isinstance(files, list):
            return files
        if isinstance(files, dict):
            return [dict(value, file=name) for name, value in files.items() if isinstance(value, dict)]
        return []
    return []

def main():
    failures = []
    checked = 0
    for integrity_path in sorted(ROOT.rglob("ASSET-INTEGRITY.json")):
        try:
            records = entries(json.loads(integrity_path.read_text(encoding="utf-8")))
            for record in records:
                if not isinstance(record, dict):
                    failures.append(f"{integrity_path}: unsupported record {record!r}")
                    continue
                name = record.get("file")
                if not isinstance(name, str) or Path(name).name != name:
                    failures.append(f"{integrity_path}: invalid file name {name!r}")
                    continue
                asset = integrity_path.parent / name
                if not asset.is_file():
                    failures.append(f"{asset}: MISSING")
                    continue
                data = asset.read_bytes()
                checked += 1
                actual_hash = hashlib.sha256(data).hexdigest()
                expected_hash = record.get("sha256")
                expected_bytes = record.get("bytes")
                if expected_hash != actual_hash or expected_bytes != len(data):
                    failures.append(
                        f"{asset.relative_to(ROOT)}: bytes {len(data)} (expected {expected_bytes}); "
                        f"sha256 {actual_hash} (expected {expected_hash})"
                    )
        except (OSError, ValueError, TypeError, AttributeError) as exc:
            failures.append(f"{integrity_path}: {exc}")
    print(f"Raster integrity: {checked} files checked, {len(failures)} discrepancies")
    for failure in failures:
        print("FAIL", failure)
    if failures:
        print("No metadata or image was changed. Investigate provenance before repairing.")
    return 1 if failures else 0

if __name__ == "__main__":
    sys.exit(main())
