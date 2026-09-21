# A9-AND frozen raster pack

The original `and-gate.founder-reference.png`, `FOUNDER-ASSET.json` and
`README.txt` are retained from the Founder package. The reference is 1536x1024
RGBA; its SHA-256 is locked independently in the renderer test and generator.

Run `python scripts/build-and-gate-assets.py` from the repository root with
Pillow installed. This verifies the original, probes the visible metal, and
builds premultiplied-alpha Lanczos derivatives at 144x96 (1x) and 432x288 (3x).
WebP uses quality 92/method 6; PNG is lossless. No crop, recolour, redraw,
rotation, deformation or alpha removal occurs. Integrity text hashes use LF.

Three functional columns correspond to A, B and Q. At source row y=950,
RGB minimum >=130 and alpha >=200 give metal spans [492,532], [740,780],
[1005,1045]. Their centres scale to (48,89.0625), (71.25,89.0625),
(96.09375,89.0625). The lower feet are the three electrical contact sites;
the visible upper ends and labels remain in the frozen artwork without
creating extra terminals.

The declarative AssemblyProfile connects those measured feet to PhysicalContacts
(48,90), (72,90), (96,90), a spacing of 2x12 pixels. Maximum correction is
1.201 pixels, below the contact width. No clipping or breadboard-engine changes.
The manifest records the actual probe and variant measurements.
