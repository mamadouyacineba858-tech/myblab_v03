# MB-L1-PROP-005 — Visual Correction V2

**Status:** IMPLEMENTED BY CSA — PROJECT CANVAS GATE PENDING.

## Trigger

The first Project Canvas Gate confirmed that the capacitance-to-marking logic works (`104`, `102`, `101`, independent instances), but the Candidate C body was rejected visually by the CTO: the silhouette remained too flat/oval and the leads did not read as polished metal.

## CSA ruling

Keep all validated Product Model logic unchanged. Correct only the physical presentation:

- replace `capacitor.base.*` with a rounder, taller glossy orange radial ceramic-disc body;
- preserve the neutral raster rule: no `104` or any capacitance value is baked into the image;
- preserve the 70×40 / 210×120 canonical raster contract;
- preserve CAPACITOR assembly roots `(23,27)` / `(47,27)` and PhysicalContacts `(23,62)` / `(47,62)`;
- upgrade only the presentation style of CAPACITOR leads from `wire` to `wire-glossy`, using a bright nickel/tin stroke with white/dark edge reflections;
- do not modify `capacitorMarking.js`, `CapacitorPart.jsx`, `canonicalRegistry.js`, Document/History/export, solver, breadboard or wires.

## New base asset hashes

- `capacitor.base.1x.png` — 2431 bytes — `d3b8db64b9eced49ba5996de25eb7535861b12fc87fc8a443c2d5d3961dec903`
- `capacitor.base.1x.webp` — 2010 bytes — `40b38ab6895347dccde2c6346a5ac59dccd51bb7f60b3a20b19f2a53ba27f691`
- `capacitor.base.3x.png` — 11105 bytes — `b30fc2e6517d5b2ca5f9fbb8de7f64c860f4becd6e7adfbbb125cddf75f46dae`
- `capacitor.base.3x.webp` — 7862 bytes — `6ee9f24536e58fb6b383c8fc3c35844d7805e84e949e8d80e002bde6de91d2c0`

The four legacy `capacitor.default.*` entries and hashes remain unchanged.

## Files changed in V2

- `frontend/public/assets/components/capacitor/capacitor.base.1x.png`
- `frontend/public/assets/components/capacitor/capacitor.base.1x.webp`
- `frontend/public/assets/components/capacitor/capacitor.base.3x.png`
- `frontend/public/assets/components/capacitor/capacitor.base.3x.webp`
- `frontend/public/assets/components/capacitor/manifest.json`
- `frontend/public/assets/components/capacitor/ASSET-INTEGRITY.json`
- `frontend/src/visualization/assemblyProfiles.js`
- `frontend/src/components/assembly/AssemblyLeadsLayer.css`
- `frontend/src/visualization/__tests__/capacitorVisualV2.test.js`

## Final gate

The correction remains OPEN until the CTO validates the real Canvas appearance. Functional marking logic is not reopened by this correction.
