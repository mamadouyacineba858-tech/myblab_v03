# Delivery Report — MB-L1-ARD-001 : Arduino Firmware Document Contract

**Base SHA:** `9f9317934814e210dfa4e1245b4c9a8bd7a6f908` (verified via `git checkout --detach` before branching)
**Branch:** `feat/MB-L1-ARD-001-firmware-document-contract`
**Final SHA:** see commit confirmation at the end of this report

## Files added

- `frontend/src/arduino/firmwareDefaults.js`
- `frontend/src/arduino/__tests__/firmwareDefaults.test.js`
- `frontend/src/core/handlers/component/UpdateArduinoFirmwareHandler.js`
- `frontend/src/core/handlers/__tests__/UpdateArduinoFirmwareHandler.test.js`
- `frontend/src/__tests__/ArduinoFirmwareDocument.integration.test.jsx`
- `docs/pmo/blueprints/MB-L1-ARD-001-arduino-firmware-document-contract-blueprint.md`
- `docs/pmo/tickets/MB-L1-ARD-001.md`
- `docs/pmo/delivery-reports/MB-L1-ARD-001-delivery-report.md` (this file)

## Files changed

- `frontend/src/hooks/useCircuitState.js` — imports `UpdateArduinoFirmwareHandler`/`createDefaultFirmware`; registers `UPDATE_ARDUINO_FIRMWARE` (10th and last command on the channel); `addComponent()` materializes `createDefaultFirmware(type)` into the ADD_COMPONENT payload (undefined for non-ARDUINO, never transmitted in that case); new `updateArduinoFirmware(componentId, nextSource)` action following the exact same idempotent-dispatch pattern as `updateComponentParameters` (MB-L1-CVE-001).
- `frontend/src/core/handlers/component/AddComponentHandler.js` — `_applyMutation`/`_applyRedo` generically spread an optional `firmware` field from the payload (only if present) — the Handler still knows nothing about any concrete type.
- `frontend/src/utils/circuitModel.js` — `normalizeComponent()` preserves `firmware` (`{...component.firmware}` when it's a well-formed object), exact mirror of the existing `parameters` handling (FT-C-BAT-001-R2 pattern).
- `frontend/src/context/CircuitContext.jsx` — exposes `updateArduinoFirmware` via the stable context (`stableValue`), same status as `updateComponentParameters`.
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` — closed-set CommandBus registry lock amended from 9 to 10 entries (`UPDATE_ARDUINO_FIRMWARE` appended), plus a handler-existence assertion — the 6th such amendment in this repository's history (ADD_WIRE, UPDATE_WIRE_WAYPOINTS, MOVE_COMPONENT, ADD_BREADBOARD+MOVE_BREADBOARD+DELETE_BREADBOARD, UPDATE_COMPONENT_PARAMETERS, now UPDATE_ARDUINO_FIRMWARE — each previously amended identically for a CSA-authorized extension).

`ReactDocumentMapper.js`, `engineAdapter.js`, `HistoryService.js`, `Command.js`, `CommandBus.js`, `CommandRegistry.js`, `ArduinoSimulator.js`, `runtimeOrchestrator.js`, `simulationRuntimeIntegration.js`, `scheduler.js`, `resolution.js`, `pwmSignal.js` — **all untouched**. `ReactDocumentMapper.js` audited (§22) and confirmed to already transport `firmware` generically (non-structural key, deep-cloned by `_applyMapping`'s automatic copy path) — no change needed.

## Architecture

```text
Document (component.firmware = { source: string })
      ↓
useCircuitState.js (composition layer)
      ↓
CommandBus → UpdateArduinoFirmwareHandler → HistoryService → Document API
```

`frontend/src/arduino/firmwareDefaults.js` is the single source of truth for the V1 firmware contract (`DEFAULT_FIRMWARE_SOURCE`, `hasFirmwareCapability`, `createDefaultFirmware`, `isValidFirmwareStructure`) — zero Simulation/Runtime knowledge.

## Command contract

```js
new Command("UPDATE_ARDUINO_FIRMWARE", { componentId, beforeFirmware, afterFirmware })
```

Not a generic `UPDATE_COMPONENT` (the pre-existing, deliberately-unregistered `UpdateComponentHandler.js` was audited and confirmed to remain dormant — `cf1DocumentArchitecture.test.js` still asserts its non-registration). Not a reuse of `UPDATE_COMPONENT_PARAMETERS` — firmware is not an electrical parameter.

## Document firmware shape

```js
{ uid, type: "ARDUINO", x, y, parameters: {}, firmware: { source: "void setup() {\n}\n\nvoid loop() {\n}\n" } }
```

A non-ARDUINO component never acquires a `firmware` key (verified: `Object.hasOwn(resistor, 'firmware') === false`).

## Handler behavior

`UpdateArduinoFirmwareHandler` validates (in order): payload shape (`componentId`/`beforeFirmware`/`afterFirmware` present), `isValidFirmwareStructure()` on both snapshots, component existence, `component.type === "ARDUINO"` — rejects (throws) otherwise, with zero mutation. `_applyMutation`/`_applyRedo`/`_applyInverse` touch only `component.firmware`, never any other field (position/parameters/type/pins all verified unchanged).

## History / Undo / Redo

One user commit = one History entry (verified: `getUndoCount()` increments by exactly 1 per `updateArduinoFirmware()` call, 0 for an identical-source no-op). Undo restores `beforeFirmware` exactly; Redo reapplies `afterFirmware` exactly; a new dispatch after Undo invalidates the stale Redo (existing History invariant, unmodified).

## Export / Import

`exportCircuit()`/`importCircuit()` preserve `firmware.source` through a full round-trip (JSON serialize/deserialize). The exported firmware object contains exactly one key (`source`) — no `pinOutputs`, `_pwmSignals`, `currentTime`, `running`, `RuntimeOrchestrator` or `ArduinoSimulator` reference anywhere in the exported JSON (verified by regex on the full serialized document).

## Tests targeted

- `frontend/src/core/handlers/__tests__/UpdateArduinoFirmwareHandler.test.js` — **10/10 PASS** (T3-T10, T20).
- `frontend/src/arduino/__tests__/firmwareDefaults.test.js` — **5/5 PASS**.
- `frontend/src/__tests__/ArduinoFirmwareDocument.integration.test.jsx` — **8/8 PASS** (T1, T2, full §28 lifecycle, T15/T16/T17, T19, idempotence guards) — real `useCircuitState → CommandBus → Handler → History → Document` pipeline throughout, zero direct object mutation.

## Architecture tests

- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` — **14/14 PASS**, amended and reconfirmed (10-command closed set).
- `frontend/src/simulator/__tests__/runtimeArchitecture.test.js` — **13/13 PASS**, unchanged (confirms this ticket did not touch Runtime independence).
- Handler-level structural guard (T20): `UpdateArduinoFirmwareHandler.js` contains zero reference (code, not comments) to `ArduinoSimulator`, `runtimeOrchestrator`, `simulationRuntimeIntegration`, or any `simulator/` import.

## Full suite

```
npm --prefix frontend run test:ci
Test Files  12 failed | 193 passed (205)
     Tests  50 failed | 2732 passed (2782)
```

Identical to the locked baseline (50 FAIL / 12 files, same file names, same counts). Tests grew from 2759 to 2782 (23 new tests), files from 202 to 205 (3 new test files). **Zero new regression.**

Also targeted-verified: `AddComponentHandler.test.js` (7/7), `MoveComponentHandler.test.js` (25/25), `UpdateComponentParametersHandler.test.js` (8/8), `UpdateComponentHandler.test.js` (8/8, the dormant generic handler — untouched, still passing), `circuitModel.test.js` (10/10), `componentDefinitions.test.js` (7/7), `useCircuitStateArduinoBridge.test.jsx` (6/6), `ArduinoPart.raster.test.jsx` (14/14), `ComponentValueEditing.integration.test.jsx` (14/14), `LiveMeasurementPanel.test.jsx` (11/11) — 200/200 combined, zero regression across every prior ticket's suite.

## Build

```
npm --prefix frontend run build
✓ built in 1.26s
```
PASS.

## Typecheck

```
cd frontend && npx tsc -b
```
PASS (no output, exit 0).

## git diff --check

PASS (no output — clean).

## Baseline comparison

| | Files failed | Tests failed | Tests passed | Tests total |
|---|---|---|---|---|
| Before (MB-MEASURE-002 baseline) | 12 | 50 | 2709 | 2759 |
| After (this ticket) | 12 | 50 | 2732 | 2782 |

Same 12 file names, same 50-failure breakdown (already classified in `MB-VIS-QA-047`/reconfirmed every ticket since). `after_failures (50) <= baseline_failures (50)`, and specifically `0` new failures.

## Known limitations

None specific to this ticket's scope. As explicitly designed: no parser, no firmware execution, no code editor exist yet — `component.firmware.source` is stored and round-tripped but not yet interpreted by anything. This is the intended state of Sub-capability A; execution is `MB-L1-ARD-002`'s responsibility.

## Browser sanity check

No browser-QA gate is mandated by this ticket (no UI was added — AC-24). As a diligence check given the shared, high-traffic files touched (`useCircuitState.js`, `AddComponentHandler.js`, `circuitModel.js`), a light real-browser pass was performed: placed an ARDUINO component (renders correctly, `ComponentInspector` shows "Aucun paramètre configurable" as expected — unaffected by the internal `firmware` field), Undo/Redo cycle confirmed (component count 1→0→1), **0 console error** throughout.

## AC-01 → AC-25

| AC | Status |
|---|---|
| AC-01 Firmware par défaut à la création | PASS — T1 |
| AC-02 Firmware appartient au Document | PASS |
| AC-03 Firmware ≠ parameters | PASS |
| AC-04 Composant non-Arduino sans firmware | PASS — T2 |
| AC-05 UPDATE_ARDUINO_FIRMWARE existe | PASS |
| AC-06 Cible uniquement un Arduino existant | PASS — T5 |
| AC-07 Cible inexistante échoue proprement | PASS — T4 |
| AC-08 Cible non-Arduino échoue proprement | PASS — T5 |
| AC-09 Firmware invalide échoue proprement | PASS — T6/T7 |
| AC-10 Mutation modifie seulement component.firmware | PASS — T3 |
| AC-11 Aucun autre champ altéré | PASS — T3 (position/parameters/type/id vérifiés) |
| AC-12 Undo restaure exactement le firmware précédent | PASS — T8 |
| AC-13 Redo restaure exactement le firmware suivant | PASS — T9 |
| AC-14 Redo invalidé après nouvelle action | PASS — T10 |
| AC-15 Export conserve firmware.source | PASS — T15 |
| AC-16 Import restaure firmware.source | PASS — T16 |
| AC-17 Round-trip export/import | PASS — T17 |
| AC-18 Runtime volatile non exporté | PASS — T18 |
| AC-19 Clear circuit sans firmware orphelin | PASS — T19 |
| AC-20 Supprimer Arduino supprime son firmware | PASS — T19 (deleteComponent) |
| AC-21 Aucune dépendance Core → Simulator Arduino | PASS — T20, runtimeArchitecture.test.js |
| AC-22 Aucune modification du Scheduler | PASS — scheduler.js absent du diff |
| AC-23 Aucune modification du moteur firmware/runtime | PASS — ArduinoSimulator.js/runtimeOrchestrator.js/simulationRuntimeIntegration.js absents du diff |
| AC-24 Aucun éditeur code ajouté | PASS |
| AC-25 Aucune parsing Arduino ajoutée | PASS |

## Gates summary

GATE 1 Base SHA exacte PASS · GATE 2 Scope strict PASS · GATE 3 Handler unit tests PASS · GATE 4 Integration tests PASS · GATE 5 Architecture tests PASS · GATE 6 History tests PASS · GATE 7 Export/import tests PASS · GATE 8 Full canonical suite NO NEW REGRESSION · GATE 9 Build PASS · GATE 10 Typecheck PASS · GATE 11 git diff --check PASS · GATE 12 No runtime/scheduler changes PASS · GATE 13 git status clean except known unrelated pre-existing files PASS.

**All 13 gates PASS.**

## Commit / Push

See `[CLAUDE — MB-L1-ARD-001 — RAPPORT FINAL]` chat message for the final commit SHA, push confirmation, `git status` and ahead/behind verification.
