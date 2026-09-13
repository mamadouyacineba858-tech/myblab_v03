# MB-L1-ENV-001 — Environmental Stimulus Foundation — LIGHT → LDR

**PMO Status:** IMPLEMENTED — CSA GO executed
**Blueprint:** `docs/pmo/blueprints/MB-L1-ENV-001-environmental-stimulus-foundation-blueprint.md`
**Base SHA (mandatory):** `5251785341ccdfe240ca96932b71ba41f8ac2cde` (`feat(level1): canonicalize multi-breadboard wire validation`)
**Branch:** `feat/MB-L1-ENV-001-environmental-stimulus-foundation` (created via `git switch --detach <base SHA>` then `git switch -c <branch>`)

## Objective

Introduce the first environmental runtime capability of MYBlab: `LIGHT → LDR → effective resistance`, consumed coherently by Simulation live, Observation, temporal Observation, and Measurement, through one single pure central primitive.

## Scope IN

- A pure, central primitive computing effective electrical parameters from persistent parameters + a volatile environmental stimulus.
- A dedicated, minimal environmental Registry (`component.type → environmental response`), `LDR → LIGHT` only.
- `LIGHT` stimulus: normalized `[0, 1]` number.
- `R(light) = Rmax * (Rmin / Rmax) ^ light`, bounds read from the existing canonical Registry (never duplicated).
- Integration of the primitive into Simulation live (`simulationRuntimeIntegration.js`), Observation (`observationContract.js`), temporal Observation (`temporalObservationContract.js`, additive `options.environmentalStimuli`), and Measurement (`measurementContract.js`, `MeasurementPanel.jsx`, `LiveMeasurementPanel.jsx`).
- A minimal, volatile application API (`environmentalStimuli`, `setEnvironmentalStimulus`, `clearEnvironmentalStimulus`) in `useCircuitState.js`/`CircuitContext.jsx`.
- LDR canonical description text update (`canonicalRegistry.js`) reflecting the new model.
- Unit, architectural, and product-integration tests; PMO documentation.

## Scope OUT

- `TEMPERATURE → THERMISTOR` or any other environmental relation.
- Any environmental UI (slider, weather/light panel, Navbar/Sidebar/Canvas change).
- Any modification to `engine.js`, `resolution.js`, `preparation.js`, `production.js`, `dcContributionRegistry.js`, `dcSourceRegistry.js`, `runtimeOrchestrator.js`, `scheduler.js`, `clock.js`, `arduino/**`, `core/**`, `history/**`, `bridge/**`, breadboard/canvas/wires utilities, or `App.jsx`.
- A second Arduino Runtime/Scheduler/clock for LDR.
- Any change to `minimum`/`maximum`/`defaultValue`/pins/capabilities/`modelAvailable`/canonical ordering in `canonicalRegistry.js`.
- Persisting, exporting, importing, or historizing LIGHT.

## Invariants ENV-01 → ENV-25 (all held, verified by test)

| Invariant | Statement | Evidence |
|---|---|---|
| ENV-01 | LIGHT never persisted in the Document | `useCircuitState.js` volatile `useState`, not in `components`/`wires`/`breadboards`/`documentApi.getDocument()`; integration test T10/T12 |
| ENV-02 | A LIGHT change creates no CommandBus command | `setEnvironmentalStimulus`/`clearEnvironmentalStimulus` never call `documentApi`/`CommandBus`; integration test T11 |
| ENV-03 | A LIGHT change creates no History entry | integration test T11 (`getUndoCount()` unchanged) |
| ENV-04/05 | No new Scheduler/Clock; no `Date.now`/`performance.now`/`setTimeout`/`setInterval` | `environmentArchitecture.test.js` T23 |
| ENV-06/07 | `externalSignals` keeps its exact `Map<"uid:pinId", Signal>` contract; LIGHT never encoded in it | `environmentArchitecture.test.js` (no `externalSignals` reference in the ENV subsystem) |
| ENV-08/09 | `RuntimeOrchestrator` stays Arduino/embedded-only; no `ArduinoSimulator` for LDR | `environmentArchitecture.test.js` T21 |
| ENV-10 | `resolution.js` ignores LIGHT | `environmentArchitecture.test.js` T19 |
| ENV-11 | `dcContributionRegistry.js` ignores LIGHT | `environmentArchitecture.test.js` T20 |
| ENV-12 | No LIGHT→LDR formula in Measurement | `environmentArchitecture.test.js` |
| ENV-13 | No LIGHT→LDR formula in Observation | `environmentArchitecture.test.js` |
| ENV-14 | `useCircuitState` has no LIGHT→LDR formula | `environmentArchitecture.test.js` (imports only `isValidLightStimulus`) |
| ENV-15 | One central primitive produces effective environmental parameters | `environmentalStimulus.js` — `applyEnvironmentalStimuli` |
| ENV-16 | Simulation live and Observation use the same primitive | `environmentArchitecture.test.js` (GATE 1); integration test T13/T14 |
| ENV-17 | Measurement consumes the effect via Observation | `measurementContract.js` forwards to `observe()`; integration test T15 |
| ENV-18 | Without environment, historical behaviour identical | unit test T1; integration T7 |
| ENV-19 | Document export byte/structure-equivalent under LIGHT | integration test T12 |
| ENV-20 | LIGHT normalized `[0,1]`, no silent clamp on public mutation | `isValidLightStimulus`; integration test T9 |
| ENV-21 | LDR is the sole environmental type this ticket | `environmentalResponseRegistry.js` |
| ENV-22 | THERMISTOR unchanged | unit test T7 |
| ENV-23 | No environmental UI | integration test T18 |
| ENV-24 | No `=== "LDR"` branch in generic consumers | `environmentArchitecture.test.js` T24 |
| ENV-25 | Formula reads Rmin/Rmax from the canonical contract, no duplicated constants | unit test T8 |

## Files concerned

See Blueprint §16 for the full, authorized file list (new + modified + documentation) — reproduced in the final diff below.

## Gates E1 → E11

- **E1 — Base:** exact start SHA verified (`git cat-file -t`/`git show -s --oneline` both matched the mandatory SHA before any edit); branch created via `git switch --detach <SHA>` + `git switch -c <branch>`; no foreign work imported (clean `git status --short` at start). PASS.
- **E2 — Pure primitive:** `environmentalStimulus.test.js` — T1 (no stimulus → same reference), T2 (invalid LIGHT ignored, no corruption), T3 (LIGHT=0 → Rmax), T4 (LIGHT=1 → Rmin), T5 (0.25/0.5/0.75 → finite, bounded, strictly decreasing), RESISTOR/THERMISTOR unaffected. PASS.
- **E3 — Non-mutation:** `environmentalStimulus.test.js` T6 (original component/parameters/array all unchanged, `Object.freeze`d input accepted). PASS.
- **E4 — Simulation live:** integration test T13 (live circuit, LIGHT changed via the runtime API, effective resistance/current differ via the exact `prepareCircuit`/`resolveSignals` composition `simulationRuntimeIntegration.js` uses, `component.parameters` never touched). PASS.
- **E5 — Observation:** integration test T14 (same live components + same LIGHT via `observe()` produce the same CURRENT as computed independently — single formula). PASS.
- **E6 — Measurement:** integration test T15 (`measure()` reproduces `observe()`'s exact value for the same request + `environmentalStimuli`). PASS.
- **E7 — Temporal Observation:** `temporalObservationContract.js` forwards `options.environmentalStimuli` unchanged to every sampled `observe()` call — no new clock, protected by pre-existing `temporalObservationArchitecture.test.js` (updated only for the additive `observe()` signature, still asserting no wall-clock API). PASS.
- **E8 — Persistence isolation:** integration test T12 (`exportCircuit()` before/after a LIGHT change deep-equal; serialized export never contains the string `LIGHT`). PASS.
- **E9 — History isolation:** integration test T11 (`getUndoCount()` unchanged across multiple `setEnvironmentalStimulus`/`clearEnvironmentalStimulus` calls). PASS.
- **E10 — Arduino non-regression:** integration test T16 (ARDUINO + POWER + LDR circuit; Runtime branch of `runSimulationWithRuntime` exercised; `orchestrators` gets the Arduino entry; LDR conduction and LIGHT coexist without collision; LDR `parameters` still untouched). Pre-existing `useCircuitStateArduinoBridge.test.jsx`/`runtimeIntegration.test.js`/`simulationRuntimeIntegration.test.js` suites re-run unmodified and green. PASS.
- **E11 — Static architecture:** `environmentArchitecture.test.js` (12 tests) — no `Environment` import in `resolution.js`/`dcContributionRegistry.js`; no `ArduinoSimulator`/`CommandBus`/`History*` import in the ENV subsystem; no wall-clock API in the ENV subsystem; no LIGHT/LDR formula in Measurement/Presentation. PASS.

## Test strategy

1. **Baseline** established at the exact base SHA before any edit: `npm run test:ci` → `223 passed | 1 failed file (BatteryParts.raster.test.jsx, 3 pre-existing PNG/hash mismatches unrelated to this ticket) — 3028 passed / 3 failed`.
2. **New tests added:**
   - `frontend/src/simulator/__tests__/environmentalStimulus.test.js` (13 tests, T1–T8 + edge cases).
   - `frontend/src/simulator/__tests__/environmentArchitecture.test.js` (12 tests, T19–T24 + ENV-06/07/15/16 static locks).
   - `frontend/src/__tests__/L1Env001EnvironmentalStimulus.integration.test.jsx` (12 tests, T7/T9–T18, real `CircuitProvider`).
3. **Targeted suites** (canonicalRegistry, resolveComponentParameters, resolution*, runtime*, simulationRuntimeIntegration, observationContract, temporalObservationContract, measurementContract/Panel, CircuitProvider/useCircuitState, Arduino bridge) re-run unmodified except the two explicitly-authorized assertion updates below — all green.
4. **Two pre-existing test files updated** (assertions only, both a direct, authorized consequence of an in-scope ticket change, not a foreign regression):
   - `canonicalRegistry.test.js` — LDR `description` regex updated to match the new, ticket-authorized (§15) text; `minimum`/`maximum`/`defaultValue`/pins/capabilities/`modelAvailable` assertions untouched and still passing.
   - `temporalObservationArchitecture.test.js` — the static `observe()` signature regex updated to include the new, additive 5th parameter (`environmentalStimuli = null`); the invariant itself ("callable with 3 arguments, no new *required* parameter") is preserved and re-asserted.
5. **Full frontend suite after implementation:** `npm run test:ci` → `226 passed | 1 failed file — 3065 passed / 3 failed`. The 3 failures are the exact same pre-existing `BatteryParts.raster.test.jsx` PNG/hash mismatches present at the base SHA (BASELINE-ACCEPTED — reproduced byte-for-byte identical failure messages, confirmed on the same base SHA before any change; no new failures introduced).
6. **Build:** `npm run build` → PASS (`tsc -b && vite build`, 200 modules transformed, no errors).
7. **Lint:** `npm run lint` → baseline `145 problems (143 errors, 2 warnings)`; after implementation `146 problems (144 errors, 2 warnings)`. The single new entry is `'React' is defined but never used` in the new integration test file — the exact same pre-existing, repo-wide accepted category (the project's JSX test transform requires `import React` at runtime while ESLint's `no-unused-vars` flags it; already present in ~15 other test files, e.g. `AddWireMutationChannel.integration.test.jsx`, `useCircuitStateArduinoBridge.test.jsx`). No new lint *category* introduced; every `useCircuitState.js` diagnostic present in both runs is the same pre-existing diagnostic at a shifted line number (confirmed by diffing the two lint runs). Zero genuinely new lint errors.
8. **`git diff --check`:** PASS (no whitespace errors).

## Commit / push rules applied

- Only files within the ticket's authorized scope staged (`git status --short`/`git diff --name-only` reviewed before `git add`).
- Commit message: `feat(level1): add environmental light response for LDR`.
- Push: `git push -u origin feat/MB-L1-ENV-001-environmental-stimulus-foundation`.

## Result

- Base SHA verified: `5251785341ccdfe240ca96932b71ba41f8ac2cde`.
- Branch `feat/MB-L1-ENV-001-environmental-stimulus-foundation` created from that exact SHA (`git rev-parse HEAD` and `git merge-base HEAD <base SHA>` both equal the base SHA before any commit).
- All gates E1–E11 PASS, all invariants ENV-01–ENV-25 held, no new test/build/lint regression relative to the base SHA.
- Final commit SHA and push status: see the top commit of `feat/MB-L1-ENV-001-environmental-stimulus-foundation` (`git log -1`) and the delivery report in the session transcript — recorded there rather than hardcoded here, since this document is authored in the same commit it describes.

**Verdict: PASS.**
