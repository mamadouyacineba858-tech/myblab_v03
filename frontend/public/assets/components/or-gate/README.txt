A9-OR frozen raster pack
Founder reference: or-gate.founder-reference.png
SHA-256: 113b775b8d35968cfab1e394fc5d5277d968062b7a01507ebe63fb50df7a8ee3
Dimensions: 1536x1024 RGBA.

Corrected from the original opaque RGB source (SHA-256
56a3c8991d902c337dac73a1ed451df34184a67c2e443a7e051a778ee6d73b67, frozen at
git commit 0856b3f2cb5c21a63beabd1c369c97afe3d0069d) after the Founder Canvas
Gate showed a large opaque white rectangle around the component. The
exterior background (near-white, connected to the four canvas corners) was
flood-filled to alpha 0, with a 2 px proportional feather band at the
silhouette edge; every RGB sample is otherwise byte-identical to the prior
source. See scripts/build-or-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime derivatives follow the successful A9-AND pipeline: full-source
premultiplied-alpha Lanczos resize to 144x96 (1x) and 432x288 (3x);
PNG lossless and WebP quality 92/method 6.

Founder source is FROZEN: no crop, redraw, recolour, rotation, deformation
or additional alpha edits beyond the transparency correction above. A/B/Q
physical coordinates must be established by real pixel-probe during
implementation and qualified against the 12 px breadboard pitch using
existing generic assembly mechanisms.

Measured lower-foot roots and 12 px-pitch contacts: see manifest.json derivation.pixelProbe.
