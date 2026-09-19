# REFERENCE — VOLTAGE_REGULATOR

## Identity
- MYBlab family: A8 — Semiconductor / Power Control
- Planned canonical type: `VOLTAGE_REGULATOR`
- Visual reference device: L7805CV
- Package: TO-220
- Nominal reference output: 5 V
- Visible pin reference: 1 IN / 2 GND / 3 OUT
- Asset status: `FOUNDER PASS / FROZEN`

## Visual source
`REFERENCE.png` is the complete Founder-approved multi-view reference.
The runtime PNG/WebP files are front-view derivatives of that approved visual.

## Architectural boundary
This pack freezes visual identity only. It does not by itself define dropout behavior, current limiting, thermal behavior, transient response, exact Level-1 regulation law, or PhysicalContacts. Those decisions belong to the future A8 voltage-regulator implementation ticket.

Do not infer the complete electrical model solely from the visual reference.

## Mechanical qualification
Pixel-probe the frozen runtime raster before integration. If visual roots differ from breadboard-compatible contacts, preserve the raster and bridge them through the existing assembly geometry mechanism.

## Founder decision
Visual candidate accepted on 2026-09-18.
