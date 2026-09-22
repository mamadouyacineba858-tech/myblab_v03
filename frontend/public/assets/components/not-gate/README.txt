A9-NOT / Inverter raster pack (A9-NOT-ASSET-FIX)
NOT_GATE — A -> Q = NOT(A)
Founder-approved visual identity; asset-only transparency correction (technical pass), pending the Founder's own visual re-qualification of the corrected bytes (direct Asset Gate).

ORIGINAL FOUNDER SOURCE
1536x1024 RGB (PNG colour type 2, 8-bit, no alpha) — SHA-256:
58271344adea31d04b59d2a4c97f21eef674b70b0967d9708d30e10afbb8a827
Recoverable at git commit e29d1aeaf9d6f454f06875b3b4897d08e0ad20fb.

CORRECTED FOUNDER REFERENCE
Reference: not-gate.founder-reference.png
1536x1024 RGBA (PNG colour type 6, 8-bit) — SHA-256:
43f13e75f460575406a6c1c9df93813157073403f15ccf96a05ce7b6165011cd

The original source rendered as a large opaque white rectangle around the
component, the same defect found and fixed on A9-OR/A9-NAND/A9-NOR/A9-XOR.
The exterior background (near-white, connected to the four canvas corners)
was flood-filled to alpha 0, with a 2 px proportional feather band at the
silhouette edge (borderMatchThreshold 24, featherHighThreshold 90,
featherBandPx 2); every RGB sample is byte-identical to the original source.
See scripts/build-not-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime: 144x96 (1x), 432x288 (3x), PNG/WebP.
No crop, redraw, recolour or deformation beyond the transparency correction
above.

This component has exactly two intended electrical contacts: A and Q.
Do not copy the three-contact geometry used by the two-input gates.
This is an asset-only correction (A9-NOT-ASSET-FIX): NOT_GATE has no
functional component, registration or simulation contract yet. Electrical
A/Q pixel-probe and PhysicalContacts coordinates belong to the separate,
not-yet-authorized functional A9-NOT ticket. Do not invent VCC/GND.
