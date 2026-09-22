# A9-XOR frozen raster pack (A9-XOR-ASSET-FIX)
XOR_GATE — A/B -> Q = A XOR B
Founder-approved visual identity; asset-only transparency correction (technical pass), pending the Founder's own visual re-qualification of the corrected bytes.
Reference: xor-gate.founder-reference.png
1536x1024 RGBA — SHA-256: be3c922f8c6a7c0095f4dbe0b273a26123316200341023a42ab896f0aef081bd

Corrected from the original opaque RGB source (SHA-256
8ff6d6af57779a88019a385f6d0c480f9ecd558c9d41d6d4e06b84bf9a974fe9, recoverable
at git commit 211119a3ca92610b74275ed65f99eb22990bcceb) which rendered as a
large opaque white rectangle around the component, the same defect found and
fixed on A9-OR/A9-NAND/A9-NOR. The exterior background (near-white, connected to the
four canvas corners) was flood-filled to alpha 0, with a 2 px proportional
feather band at the silhouette edge, using the method qualified for
A9-OR/A9-NAND/A9-NOR; every RGB sample is otherwise byte-identical to the prior
source. See scripts/build-xor-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime: 144x96 (1x), 432x288 (3x), PNG/WebP.
No crop, redraw, recolour or deformation beyond the transparency correction
above.

This is an asset-only correction (A9-XOR-ASSET-FIX): XOR_GATE has no
functional component, registration or simulation contract yet. Electrical
A/B/Q pixel-probe and PhysicalContacts coordinates belong to the separate,
not-yet-authorized functional A9-XOR ticket.
