# SN74HC161N — A9-COUNTER1-VIS-CORR-001 — CSA LOCKED ASSET

Reference: Texas Instruments SN74HC161N
Package: PDIP-16 (N)
Founder visual status: PASS
Correction scope: VISUAL ONLY
Runtime canvas: 120 × 64 (1x), 360 × 192 (3x)
Runtime formats: PNG + lossless WebP
Physical contacts: 16, UNCHANGED from A9-COUNTER1
Electrical pitch: 12 px

Correction:
- replaces the oblique/perspective runtime appearance with a horizontal top-down PDIP-16;
- preserves the existing 16 PhysicalContacts and pinout;
- does not authorize any change to BINARY_COUNTER_74HC161 logic, timed state,
  Scheduler, simulation registries, electrical semantics, or functional tests.

Pinout:
1 MR/CLR, 2 CP/CLK, 3 D0/A, 4 D1/B, 5 D2/C, 6 D3/D,
7 CEP/ENP, 8 GND, 9 PE/LOAD, 10 CET/ENT, 11 Q3/QD,
12 Q2/QC, 13 Q1/QB, 14 Q0/QA, 15 TC/RCO, 16 VCC.

The corrected Founder source is preserved bit-identically in this pack.
The 120x64 runtime raster received Founder PASS. The 3x derivative is generated
from that approved runtime geometry. Electrical contact geometry remains separate.
