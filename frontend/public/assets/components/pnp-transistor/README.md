# PNP_TRANSISTOR runtime pack — CSA R2

Founder image identity is frozen in REFERENCE.png (unchanged original approved PNG).
The four normalized runtime variants are 132x66 at 1x and 396x198 at 3x.
All variants fit the existing simple 30 KiB budget and maxDimensionPx=1024.
No complexity or global budget override is applied.

manifest.json uses the existing assets[] and canonical schema.
ASSET-INTEGRITY.json uses files[] and covers four runtime files plus REFERENCE.png.
Runtime normalization is isotropic Lanczos reduction, with lossless encodings.
The entire source raster is retained; the assembly profile masks baked lead portions
at runtime and connects independently measured roots to 12px-pitch PhysicalContacts.
See REFERENCE.md and frontend/scripts/pnp-transistor-pixel-probe.md.
