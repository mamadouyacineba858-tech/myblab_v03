# MYBlab — INDUCTOR — Founder PASS asset pack

Status: FOUNDER PASS / FROZEN VISUAL

Destination prévue:
`frontend/public/assets/components/inductor/`

Runtime assets:
- inductor.default.1x.png — 144×108 RGBA
- inductor.default.1x.webp — 144×108
- inductor.default.3x.png — 432×324 RGBA
- inductor.default.3x.webp — 432×324
- manifest.json
- ASSET-INTEGRITY.json

Pixel probe 1x:
- opaque bounds: [1, 4, 142, 67]

Règles:
- ne pas régénérer, redessiner, étirer ou recomprimer le raster Founder PASS;
- l'image validée est non polarisée et horizontale;
- les PhysicalContacts et la compatibilité breadboard 12 px doivent être déterminés à partir
  de ce raster packagé lors du ticket d'implémentation;
- si les racines visuelles ne coïncident pas avec les contacts électriques, utiliser
  AssemblyProfile/AssemblyLeadsLayer plutôt que modifier le raster.
