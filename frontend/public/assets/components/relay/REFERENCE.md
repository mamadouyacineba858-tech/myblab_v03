# REFERENCE — RELAY

## Identity
- MYBlab family: A8 — Semiconductor / Power Control
- Planned canonical type: `RELAY`
- Visual reference: SONGLE SRD-5VDC-SL-C style
- Package: 5-pin PCB relay
- Coil marking: 5 VDC
- Asset status: `FOUNDER PASS / FROZEN`

## Founder-approved source
`REFERENCE.png` is the complete approved multi-view sheet and includes:
- front view;
- rear/internal view;
- side view;
- underside reference.

The runtime raster is derived from the approved front view.

## Architectural boundary
This asset pack freezes **visual identity only**.

It does not freeze:
- relay simulation model;
- coil resistance/current;
- actuation threshold;
- contact switching timing;
- pin numbering semantics;
- COM/NO/NC mapping;
- PhysicalContacts.

Those belong to the future RELAY implementation ticket.

## Mechanical qualification
Pixel-probe the frozen runtime raster before integration. Preserve the approved raster even if visual roots differ from breadboard-compatible contacts; bridge them through MYBlab's assembly geometry rather than deforming the asset.

## Founder decision
Visual candidate accepted on 2026-09-18.

## A8-RELAY functional assembly
REFERENCE SHA-256: `e1ac7d17db443c7ec10854197a23d56b3eb796b706acf4bd4842fefeeed2c9f0`.
The underside confirms two rows (2 + 3); decorative 1..5 are not electrical IDs.
MYBlab uses a functional grid footprint: coilA(60,288), NC(228,288);
coilB(60,312), COM(132,312), NO(228,312). This is a simulator routing
convention, not a claim of a datasheet pinout or true scaled PCB dimensions.
Rows are separated by 24 px, straddling the breadboard groove when inserted;
distinct holes and strip groups prevent accidental contact shorts.
Contacts extend below the 288x288 visual box to preserve every frozen pixel.
At alpha>=128 the bbox is [30,8,261,277]. Scan y240 gives intervals
[53,68]/[132,142]/[179,189]/[228,238], midpoints 60.5/137/184/233.
These four roots remain pixel-probe evidence only; after Founder Canvas Gate R1
they are not projected onto the five functional contacts because that produced
long/crossed synthetic diagonals. The frozen raster itself preserves the four
visible mechanical legs. NC is the fifth connection, not directly visible in
this projection. No pixel-probed root or fifth raster leg is invented: all five
functional endpoints use generic root=target presentation fallback.
Level-1: nonpolar coil resistance 69.4 ohms; opposite resolved HIGH/LOW
energizes COM-NO. All other signals select COM-NC, without retained state.
No timing, inductance, flyback, or contact current physics is implemented.
