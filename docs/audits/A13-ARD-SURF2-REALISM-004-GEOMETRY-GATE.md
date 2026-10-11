# A13-ARD-SURF2-REALISM-004 — Arduino UNO geometry and visual acceptance gate

Status: **OPEN — BLOCKED / FOUNDER VISUAL FAIL**. This record is not an asset approval, test PASS, CI PASS, or authorization to merge.

## Repository evidence (branch `feat/A13-ARD-SURF1-digital-pin-surface`, baseline `d001e30dbf7fde7c6b872f9b7dc33e3cc0bb9e41`)

- Runtime `ArduinoPart.jsx` still renders `DigitalPinLabels` as DOM spans. These overlays must be removed only when the native raster replaces them.
- Canonical dimensions: 120 × 140 logical units; raster derivatives: 120 × 140 (1x), 360 × 420 (3x).
- `manifest.json` lists electrical GND (0,110) and 5V (120,50), while Canvas presentation contacts are GND (15,108) and 5V (115,50). **Do not change electrical coordinates**; represent electrical and presentation positions separately.
- D0–D13 presentation contacts are y=33, x=[110,106,102,98,94,90,86,82,79,75,71,67,63,59] respectively. All 16 contacts must be validated against the *final* raster.
- The existing `arduino.approved.body.svg` depicts header holes at different positions from these presentation contacts; it cannot be treated as pixel-qualified.

## Visual acceptance

Founder explicitly rejects the previous schematic Python candidate as below Tinkercad. A reference illustration is **not** a qualified runtime master. Acceptance requires a detailed and geometrically faithful Arduino UNO R3 with realistic connectors, headers, components, board silhouette, native legible D13→D0 / POWER / ANALOG IN silkscreen, and no HTML callout or overlay. Assess at the actual 2.45x Canvas scale against the Founder-supplied Tinkercad reference.

## Technical gate before asset publication

1. Acquire or produce an appropriately licensed, genuinely high-quality master; preserve provenance and source.
2. Match all 16 presentation contact centers on the actual final rendered image, with reproducible pixel-probe evidence; report max errors and any out-of-board contact separately.
3. Export transparent-background PNG/WebP 1x and 3x, preserve aspect and visual quality, and generate SHA-256 manifest and reproducible derivation instructions.
4. Remove `DigitalPinLabels` and update tests to enforce **native** labels and preserved electrical/presentation geometry.
5. Run targeted tests, full suite, build and lint, preserve existing CI workflows, and attach exact commands/results and commit/workflow links.
6. Keep PR #20 in draft and prohibit merge until Founder Canvas PASS and CSA signoff.

## Current execution result

No conforming final master has been demonstrated; no new runtime raster, source implementation or tests are claimed as completed. This gate document records an unresolved blocker, not successful delivery.
