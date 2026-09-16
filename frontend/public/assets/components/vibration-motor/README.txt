MYBlab v0.3 — A6-OUT1-R1 VIBRATION_MOTOR
Raster asset pack prepared from the audited MYBlab raster conventions.

Canonical box: 72 x 96 px
Functional PhysicalContacts target:
  plus  = (24, 84)
  minus = (48, 84)
Horizontal pitch: 24 px = 2 x BREADBOARD_PITCH (12 px)
Target: breadboard-insertable after repository integration/probe validation.

IMPORTANT:
The raster contains visual lead material from the generated source.
During implementation, alpha-pixel probe MUST determine bodyClip and mechanical
lead roots. AssemblyLeadsLayer must render the functional leads from those roots
to the locked PhysicalContacts above. Do not use baked raster lead endpoints as
electrical truth.

Files follow the existing MYBlab convention:
  *.default.1x.png / webp
  *.default.3x.png / webp
  manifest.json
  ASSET-INTEGRITY.json
