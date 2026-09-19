# REFERENCE — H_BRIDGE

## Identity
- MYBlab family: A8 — Semiconductor / Power Control
- Planned canonical type: `H_BRIDGE`
- Visual reference device: L293D
- Package: DIP-16
- Asset status: `FOUNDER PASS / FROZEN`

## Visual source
`REFERENCE.png` is the complete Founder-approved multi-view reference.
The runtime PNG/WebP files are front-view derivatives of that approved visual.

## Architectural boundary
This pack freezes visual identity only. It does not define the future L293D/H-bridge simulation model, input truth table, enable behavior, motor direction semantics, supply-domain behavior, pin mapping or PhysicalContacts. Those belong to the future A8 H-bridge implementation ticket.

Do not infer the complete electrical contract solely from the image.

## Mechanical qualification
Pixel-probe the frozen runtime raster before integration. Preserve the approved raster if visual lead roots differ from breadboard-compatible contacts; bridge them through MYBlab's existing assembly geometry rather than deforming the asset.

## Founder decision
Visual candidate accepted on 2026-09-18.
