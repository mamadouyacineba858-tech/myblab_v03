# RELAY — A8 Asset Pack

Status: **FOUNDER PASS / FROZEN**

Realistic 5-pin PCB relay asset for MYBlab A8 Semiconductor / Power Control.

## Visual reference
SONGLE-style `SRD-5VDC-SL-C`, blue translucent enclosure.

## Runtime files
- `relay.default.1x.png`
- `relay.default.1x.webp`
- `relay.default.3x.png`
- `relay.default.3x.webp`

## Reference
`REFERENCE.png` preserves the complete Founder-approved reference sheet.

## Integration target
`frontend/public/assets/components/relay/`

## Frozen visual contract
Do not regenerate, redraw, recolor, stretch, destructively recompress or alter the approved appearance.

## A8-RELAY integration
Canonical IDs: `coilA`, `coilB`, `common`, `normallyClosed`, `normallyOpen`.
Nonpolar Level-1 coil: `coilResistance = 69.4 Ω`. Opposite HIGH/LOW signals
select COM-NO; all other combinations fail safe to COM-NC without memory.
The deterministic pixel-probe, functional two-row footprint and fifth hidden
contact limitation are documented in `REFERENCE.md`. Electrical routing is
not inferred from the photo. Founder PASS / FROZEN remains unchanged.
