# NMOS â€” A8 Asset Pack

Founder reference: PASS / FROZEN, bit-identical. Runtime qualification: CSA R3.

Identity: IRFZ44N / TO-220 / marked front view / three leads.
Runtime: 144x288 @1x and 432x864 @3x, PNG + WebP, one default state.
Complex classification is explicitly authorized by CSA R3 on the R2 measurements; existing repository limit: 175 KiB per runtime variant. RENDER_BUDGET is unchanged.

## Reproduction
Source: immutable REFERENCE.png, front-view region (77,22,467,802), 390x780. This excludes other views without removing body or leads. Isotropic Pillow 12.3.0 Lanczos reduction/resize; scale 144/390 or 432/390 on both axes. No blur, recoloring or geometry edits.
PNG 1x: RGBA, optimize=True, compress_level=9, lossless.
PNG 3x: 256-color FASTOCTREE, Dither.NONE; optimize=True, compress_level=9.
WebP 1x: lossless=True, quality=100, method=6, exact=True.
WebP 3x: lossless=False, quality=100, method=6, exact=True; alpha retained.
No additional compression is required or intended.

## Measurement boundary
See frontend/scripts/nmos-pixel-probe.md. Mechanical terminals are LEFT/CENTER/RIGHT only. Electrical G/D/S mapping still requires manufacturer documentation. Existing captions are preserved, not treated as qualified pin identities. Baked leads below the measured roots require future assembly clipping assessment. No product code is registered in R3.

REFERENCE.png must never be edited, resized, recoded or replaced.
