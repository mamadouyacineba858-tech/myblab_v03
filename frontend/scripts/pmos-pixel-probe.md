# A8-PMOS pixel probe and assembly contract

CSA-qualified 1x runtime: 144 × 288; alpha >= 128 bbox [16,5,127,283].
First stable three-lead separation: y=171.
Left range 33–47, center 64–78, right 96–110.
Measured root centers: Gate 40, Drain 71, Source 103; spacing 31 / 32 px.
The qualified 1x PNG remains bit-identical during runtime normalization.

Locked front-view mapping: LEFT Gate, CENTER Drain, RIGHT Source.
Functional PhysicalContacts: Gate (60,204), Drain (72,204), Source (84,204).
These contacts are architectural breadboard coordinates, not raster measurements.
Their exact pitch is 12 / 12 px. All are wire-connectable and breadboard-insertable.
Assembly roots: G(40,171), D(71,171), S(103,171), metallic-wire.
bodyClip.bottom = 117: CSS inset bottom, 288 − 117 = 171.
No deformation or generic geometry change is needed.

Manufacturer source: [Infineon IRF9540NPbF datasheet, page 8](https://www.infineon.com/dgdl/Infineon-IRF9540N-DataSheet-v01_01-EN.pdf?fileId=5546d462533600a401535611cfa21dc8).
TO-220AB lead assignments: 1 Gate, 2 Drain, 3 Source; tab Drain.
Indicative package envelope: width max 10.54 mm; body 15.24 + leads 14.09 = 29.33 mm.
This package reference does not change the global visual scale.
