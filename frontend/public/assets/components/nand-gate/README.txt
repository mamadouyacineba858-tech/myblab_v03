A9-NAND frozen raster pack
NAND_GATE — A/B -> Q = NOT(A AND B)
Founder PASS/FROZEN
Reference: nand-gate.founder-reference.png
1536x1024 RGBA — SHA-256: fc35f979ec5faf2b062ecef55df9a20e34e7d55e31812514cc7bbb3b1238fbb9

Corrected from the original opaque RGB source (SHA-256
676a9f047f9bbcb4a353cf612806530876b91e672371a3880e343620e4bdf96d) after the
same opaque-white-rectangle defect found and fixed on A9-OR. The exterior
background (near-white, connected to the four canvas corners) was
flood-filled to alpha 0, with a 2 px proportional feather band at the
silhouette edge, using the method qualified for A9-OR; every RGB sample is
otherwise byte-identical to the prior source. See
scripts/build-nand-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime: 144x96 (1x), 432x288 (3x), PNG/WebP.
No crop, redraw, recolour or deformation beyond the transparency correction
above. Physical contact coordinates must be established by real pixel-probe
during implementation.
