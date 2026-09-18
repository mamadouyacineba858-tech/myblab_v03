# A8-PNP_TRANSISTOR — pixel-probe R2 and qualification R3

Base: 319718a974fa51fa724e6d9e7e77196fa2cd49dc.

## Frozen reference

Original Founder REFERENCE.md designates pnp-transistor.default.3x.png as the
approved reference. It has been copied byte-for-byte to REFERENCE.png before
runtime replacement. SHA256 before and after:
1ff4e4fe2db68537ce6f526c5dd86646e353aa4dd0f88072dc38d790f784d1d7.
Source reference dimensions: 1774x887, exact aspect ratio 2:1.

## Runtime normalization

Both runtime densities derive directly from REFERENCE.png using Pillow Lanczos
isotropic reduction, no crop or padding: 132x66 and 396x198, exact 3:1 ratio.
PNG optimize=True; WebP lossless=True, method=6.

| File | Bytes |
|---|---:|
| PNG 1x | 3307 |
| PNG 3x | 21255 |
| WebP 1x | 2684 |
| WebP 3x | 16684 |

Every runtime file is below the existing simple 30 KiB budget; max dimension
396 is below 1024. No complexity override, no global budget change.
manifest.json uses component/backend/canonical/assets[].
ASSET-INTEGRITY.json uses files[] with four runtime files and REFERENCE.png;
REFERENCE.png is not included in manifest.assets and is not a runtime variant.
All byte lengths and SHA256 match. The unchanged generic renderQualityGate
passes all five PNP-specific tests, including asset count, bytes, hashes,
dimensions, budget and density ratio.

## Pixel-probe R2

Measurements performed on the new PNG 1x after normalization:
- Alpha>0 bbox [52,0,80,66), upper bounds exclusive.
- Alpha>=128 bbox [55,1,77,65).
- Alpha=255 bbox [55,1,77,64).
- At y=24 the connected body interval is [56,75] (inclusive).
- At y=25 first separation into three leads: [58,60]/[65,67]/[72,73].
- Real runtime roots: C(59,25), B(66,25), E(72.5,25).
- Measured root pitch: 7 / 6.5 px.
- PhysicalContacts: C(54,62), B(66,62), E(78,62).
- Functional pitch: 12 / 12 px, all contacts connectable and insertable.
- Assembly profile through-hole, metallic-wire, bodyClip.bottom=41:
  clip at 66-41=25 masks baked leads whose alpha extends through y=65,
  below functional contacts y=62. Raster files retain their complete silhouette.
- Existing AssemblyLeadsLayer connects roots to independent functional contacts.
- Real STANDARD_V1 insertion origin (-18,-2) resolves columns 3/4/5, row 5,
  with contact targets exactly coincident with hole centers and pin hit targets.

## Electrical mapping source

Marked front BC557 / PNP, onsemi TO-92 CASE 29 STYLE 17:
https://www.onsemi.com/pdf/datasheet/bc556b-d.pdf
Facing the marked front with leads down: collector/base/emitter left/middle/right.
Isotropic normalization does not change the order. No NPN raster coordinates
are copied. DC remains Level-1, PNP LOW-active and NPN HIGH-active.

## SCALE_REFERENCE — CSA R3 limited authorization

Exactly one PNP entry is added to SCALE_REFERENCE. All other contents of
visualContract.js remain identical to base 319718a974fa51fa724e6d9e7e77196fa2cd49dc.
Canonical box: [132,66], identical to componentDefinitions.js.
physicalMm: [5.20,5.33], maximum body envelope A/B from onsemi CASE 29,
BC556B/BC557B/BC558B datasheet page 7, same URL as the electrical mapping above.
Mechanical ranges: A=4.45..5.20 mm, B=4.32..5.33 mm. These are indicative
body-only dimensions, excluding leads and transparent raster margins.
Existing convention: largest canonical dimension / largest physical dimension:
impliedUnitsPerMm = 132/5.33 = 24.765478424.
No runtime generation or coordinate change is performed in R3.
No RENDER_BUDGET, SCALE_AUDIT, SCALE, FILL_FACTOR, ASSET_CONTRACT or other
visual-contract structure is modified. Generic test remains unchanged.

## R3 validation — STOP CONDITION

- Blocking SCALE_REFERENCE coverage test: 1 passed.
- Targeted suite: 386 passed. PNP RenderQualityGate: 5 passed.
- Full suite, executed once: 4689 passed, 36 failed; 266 passed files,
  20 failed files (286 total).
- Comparison with A8-PREQ baseline: all 35 historical failure headings remain;
  exactly one additional PNP failure in partDimensionsGuard.test.js.
- The architectural source guard requires a literal JSX `<img>` in
  PnpTransistorPart.jsx. The renderer currently uses React.createElement,
  so it fails that source guard despite passing its runtime raster tests.
- Per CSA R3, work stops on this new PNP failure. No renderer/test repair,
  build/lint execution, staging, commit or push is performed after detection.
- git diff --check passes. Frozen reference and all runtime hashes match
  ASSET-INTEGRITY.json; RENDER_BUDGET and quality-gate test are unchanged.

## R4 validation — READY FOR CSA REVIEW

R4 supersedes the R3 stop above. Only the PNP renderer is functionally
changed in R4: equivalent JSX picture/source/img replaces React.createElement.
Paths, dimensions, attributes, styles, frozen assets and geometry are retained.
The React import follows the existing raster-renderer convention for the
official Vitest classic JSX transform.

- First check, complete partDimensionsGuard: 72 passed, 2 historical failures
  (renderer-list coverage and ThermistorPart). Both PNP checks pass; a focused
  run confirms 2 passed. The guard source and exception lists are unchanged.
- Targeted qualification: 386 passed. PNP RenderQualityGate: 5 passed.
- Full suite, executed once: 4690 passed, 35 failed (4725 tests);
  266 passed files, 20 failed files (286 total).
- All 35 failure identities match A8-PREQ; no new PNP failure remains.
- Build, lint on all changed JS/JSX files, and git diff --check pass.
- All 18 snapshotted R4 protected files/assets retain their SHA256 hashes.
  SCALE_REFERENCE retains the R3 entry; RENDER_BUDGET is unchanged.
- Staged whitespace check uses Git core.whitespace with cr-at-eol to recognize
  the frozen pack metadata's CRLF endings, retained by its existing -text
  attribute. The default staged check flags those CR characters; no frozen
  metadata is rewritten. No other A8 asset is staged.
