# REFERENCE — PMOS

## Identity
- MYBlab family: A8 — Semiconductor / Power Control
- Planned canonical type: `PMOS`
- Visual reference device: IRF9540N
- Package: TO-220
- Visible terminals on the approved reference: G / D / S
- Asset status: `FOUNDER PASS / FROZEN`

## Visual source
`REFERENCE.png` is the complete Founder-approved multi-view reference sheet.
The runtime PNG/WebP files are front-view derivatives of that approved visual.

## Architectural boundary
This reference freezes the visual identity only.

It does **not** freeze:
- PMOS simulation physics;
- threshold voltage;
- electrical orientation;
- canonical parameter set;
- PhysicalContacts;
- mechanical root coordinates.

Those decisions belong to the future A8 PMOS implementation ticket.

The implementation must not infer electrical truth solely from left-to-right lead positions in the raster.

## Mechanical qualification
Pixel-probe the frozen runtime raster before integration. If visual lead roots and breadboard-compatible contacts differ, preserve the approved raster and bridge them through the existing assembly geometry mechanism rather than deforming the image.

## Founder decision
Visual candidate accepted on 2026-09-18.
