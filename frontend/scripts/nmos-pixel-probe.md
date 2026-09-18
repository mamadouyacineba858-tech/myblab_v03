# A8-NMOS R3 — runtime pixel probe

No product registration or G/D/S electrical assignment. Coordinate origin: top-left; x right, y down; coordinates are pixel centers, inclusive bounding boxes. Measurements on final PNG runtime.

## Source and quality
Frozen REFERENCE.png SHA-256: `6d6311bcd8c1faa3c8c0f30239a1c79dd65b73b824b42c552503e4cba6b3dc04`. Front view at [77,22,467,802], 390x780, uniformly resized with Lanczos to 144x288 / 432x864. The full body and all three metal leads remain. Existing captions below the leads and colored edge remnants are also preserved from the approved source; no cleanup/redraw is performed.
PNG 1x lossless; PNG 3x 256-color FASTOCTREE without dithering; WebP 1x lossless, 3x quality 100/method 6. Visual review preserves package texture, marking and metallic highlights without the severe flattening observed at 64 colors in R2. The PNG palette also quantizes alpha (3x maximum 253); semi-transparent antialiasing is retained.

## Probe method
Decode final PNG to RGBA. Report alpha>0 bounds separately from the operational opaque silhouette (alpha>=128). Use 4-connected components at alpha>=128 to separate body/leads from captions. The largest connected component is the component body and leads. Root row is the first row in the observed body/lead transition with three separated substantial intervals (minimum width 4 pixels @1x, 12 @3x). Root x is the center of each interval; no 12px alignment is imposed. Root location uncertainty is approximately one @1x pixel due to antialiasing and the rounded body exit.

| Measurement | @1x | @3x | @3x / 3 |
|---|---|---|---|
| Alpha>0 bbox | [19,4,133,286] | [62,12,395,852] | [20.67,4,131.67,284] |
| Alpha>=128 bbox | [22,8,130,283] | [65,24,393,851] | [21.67,8,131,283.67] |
| Main body + leads bbox | [22,8,130,267] | [65,24,393,802] | [21.67,8,131,267.33] |
| LEFT mechanical root | [45,170] | [136.5,511] | [45.5,170.33] |
| CENTER mechanical root | [75.5,170] | [227.5,511] | [75.83,170.33] |
| RIGHT mechanical root | [107,170] | [322,511] | [107.33,170.33] |
| LEFT-CENTER spacing | 30.5 | 91 | 30.33 |
| CENTER-RIGHT spacing | 31.5 | 94.5 | 31.5 |
| LEFT last lead row | 266 | 801 | 267 |
| CENTER last lead row | 266 | 801 | 267 |
| RIGHT last lead row | 267 | 802 | 267.33 |

Root intervals @1x at y170: LEFT x37..53, CENTER x68..83, RIGHT x99..115. At y169, body silhouette is still continuous x29..123. At y170 the three separated leads emerge. @3x y511: x112..161, x203..252, x297..347. Root recouping deviations are <=0.5px horizontally and 0.34px vertically. Lead-tip deviations are <=1px. Very faint alpha>0 bounds differ more, because Lanczos ringing and palette alpha vary with resolution; they are not mechanical roots.

## Future assembly clipping
`bodyClip likely required = YES`. Opaque baked leads continue from y170 to y266/267: 96/97px below the roots. At 3x they continue 290/291px below y511. Drawing AssemblyLeadsLayer from the same roots without clipping would duplicate the existing leads. Existing caption components are at y273..283 @1x / y818..851 @3x, separately measured and excluded from the useful mechanical silhouette. Future clipping below the root transition would also exclude these captions from the body image; the immutable reference remains untouched. No assemblyProfiles.js entry or clipping value is implemented in R3.

## Boundary
PhysicalContacts and electrical G/D/S pinout remain unqualified. The raster contains pre-existing colored fringes at semitransparent edges and G/D/S captions; these are documented source properties, not newly created defects or proof of electrical mapping. Founder Canvas evaluation still applies after the later implementation.

## PINOUT QUALIFICATION (R4, T3 PASS)

Manufacturer: International Rectifier / Infineon. IRFZ44NPbF (lead-free IRFZ44N), TO-220AB package outline and part-marking drawing, datasheet page 8 (09/2010). Source: https://www.infineon.com/assets/row/public/documents/24/49/infineon-irfz44n-datasheet-en.pdf. Drawing inspected as a rendered page, not inferred from the raster alone.
Marked front view has the mounting hole/tab above the marked black body, and three leads pointing down. Lead assignments for HEXFET are pin 1 Gate, pin 2 Drain, pin 3 Source. The reverse view is distinguished by the large exposed thermal pad. The runtime shows the part number/logo, not this reverse pad, so it uses the same front orientation: LEFT -> pin1/Gate, CENTER -> pin2/Drain, RIGHT -> pin3/Source. The preserved source captions agree but are not used as independent electrical evidence.

## FUNCTIONAL PHYSICAL FIT (R4, T4/T5)

Measured roots remain Gate(45,170), Drain(75.5,170), Source(107,170). assemblyGeometry.js accepts finite fractional root coordinates. Functional contacts are Gate(64,204), Drain(76,204), Source(88,204), each wireConnectable and breadboardInsertable. Their center 76 differs by 0.17px from the measured root mean75.83. The contacts have exact pitch12/12 and common y204, below the visible body.
Contact y204 =170+34: the clearance is consistent with the existing radial profiles (~30-37px; LED/THERMISTOR/POLARIZED_CAPACITOR/PNP). It is 17*12 and is within canonical height288. breadboardPlacementAdapter.js aligns an origin from contacts; it imposes no independent requirement that every local offset be a multiple of12 (existing PNP y62 and SLIDE_SWITCH y44 demonstrate this). The physical fit test verifies three distinct adjacent holes and convergence of targets, hole centers and pin presentation, including a nearby placement candidate.

CircuitComponent.jsx applies bodyClip.bottom via CSS `inset(0 0 bottom px 0)` to the body, independently of AssemblyLeadsLayer. Hence retained raster bottom =288-118=170, exactly the measured root transition. bodyClip.bottom118 removes the baked metal portions and captions below that transition; AssemblyLeadsLayer becomes the unique representation of the functional leads. No runtime asset bytes change in R4.

## SCALE_REFERENCE

The existing visualContract test requires one scale reference per registered type. Datasheet page8 dimensions: E maximum10.67mm (width), D maximum16.51mm (body/tab height), L maximum14.73mm (lead length). Indicative full envelope = [E,D+L] = [10.67,31.24]mm. Canonical box [144,288]; impliedUnitsPerMm =max(box)/max(envelope)=288/31.24. No global scale/budget/tolerance changes.
