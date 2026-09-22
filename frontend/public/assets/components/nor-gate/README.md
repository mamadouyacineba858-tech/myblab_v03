# A9-NOR frozen raster pack (A9-NOR-ASSET-FIX)
NOR_GATE — A/B -> Q = NOT(A OR B)
Founder-approved visual identity; asset-only transparency correction (technical pass), pending the Founder's own visual re-qualification of the corrected bytes.
Reference: nor-gate.founder-reference.png
1536x1024 RGBA — SHA-256: 49a20318651184977210e9efd518006bc20fbeb5bff62d473edac383b4a97be2

Corrected from the original opaque RGB source (SHA-256
625ce6ce6cc2d07d4cc6b8187d70d2a457eeeb44b20ecb5a7c07d900983b43d4, recoverable
at git commit ed341cebf8334bf878c7968777615ceeda3bb483) which rendered as a
large opaque white rectangle around the component, the same defect found and
fixed on A9-OR/A9-NAND. The exterior background (near-white, connected to the
four canvas corners) was flood-filled to alpha 0, with a 2 px proportional
feather band at the silhouette edge, using the method qualified for
A9-OR/A9-NAND; every RGB sample is otherwise byte-identical to the prior
source. See scripts/build-nor-gate-assets.py:derive_rgba_from_rgb_source and
manifest.json derivation.transparency.

Runtime: 144x96 (1x), 432x288 (3x), PNG/WebP.
No crop, redraw, recolour or deformation beyond the transparency correction
above.

This is an asset-only correction (A9-NOR-ASSET-FIX): NOR_GATE has no
functional component, registration or simulation contract yet. Electrical
A/B/Q pixel-probe and PhysicalContacts coordinates belong to the separate,
not-yet-authorized functional A9-NOR ticket.
