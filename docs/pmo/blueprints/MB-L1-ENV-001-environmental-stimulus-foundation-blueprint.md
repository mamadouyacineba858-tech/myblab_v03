# MB-L1-ENV-001 — Environmental Stimulus Foundation (LIGHT → LDR) — Blueprint

**PMO Status:** IMPLEMENTED
**Base SHA:** `5251785341ccdfe240ca96932b71ba41f8ac2cde` (`feat(level1): canonicalize multi-breadboard wire validation`)
**Branch:** `feat/MB-L1-ENV-001-environmental-stimulus-foundation`
**Ticket:** `docs/pmo/tickets/MB-L1-ENV-001.md`

## 1. Objective

Introduce the first environmental runtime capability of MYBlab:

```text
LIGHT
  ↓
LDR
  ↓
effective electrical resistance
  ↓
coherent Simulation / Observation / Measurement
```

This is the first vertical slice of an architecture that can later accommodate other environmental relations (e.g. `TEMPERATURE → THERMISTOR`), explicitly out of scope here.

## 2. Pre-implementation architectural facts (confirmed at base SHA)

- Simulation live: `safeComponents + safeWires + breadboards → ReactDocumentMapper.toCore → toEngineInput → runSimulationWithRuntime → pinSignals` (`frontend/src/hooks/useCircuitState.js`).
- `runSimulationWithRuntime` (`frontend/src/simulator/simulationRuntimeIntegration.js`) is the Arduino Runtime composition point (Scheduler, RuntimeOrchestrator, ArduinoSimulator, `externalSignals: Map<"uid:pinId", Signal>`).
- `externalSignals` is a pure electrical-pin contract and must never carry LIGHT or a resistance value.
- `resolution.js` already exposes `resolveComponentParameters → getDcContribution → contribute({ pins, params, supplyVoltage })`; LDR's DC contribution already consumes `params.resistance` via the existing resistive model.
- Observation (`observationContract.js`) has its own composition path (`observe → prepareCircuit → resolveSignals`), independent of `toEngineInput()`.
- Measurement delegates to Observation.
- Consequence: an implementation confined to `engineAdapter.js` would have produced `Simulation live ≠ Observation ≠ Measurement` — explicitly forbidden. The environmental primitive had to be composed at the point each of these three paths calls `prepareCircuit()`/`resolveSignals()` (or, for the non-Runtime Simulation path, `runSimulation()`).

## 3. Architectural decision

A single, pure, central primitive computes effective electrical parameters from persistent component parameters + an environmental stimulus:

```text
persistent component parameters + environmental stimulus
        ↓
applyEnvironmentalStimuli()  (frontend/src/simulator/environmentalStimulus.js)
        ↓
effective components (same array reference when no valid stimulus is
active; otherwise a new array where only the affected components are
shallow-cloned with overridden `parameters`)
```

The environmental runtime is explicitly **not**: an Arduino RuntimeOrchestrator, an `externalSignal`, a new Scheduler, a CommandBus mutation, a History entry, or a serialized Document property.

## 4. Environmental contract V1

- Single stimulus: `LIGHT`, a number normalized to `[0, 1]` (not lux; no photometric calibration claim).
- `0` = maximal darkness of the V1 pedagogical model; `1` = maximal illumination.
- Invalid values (`NaN`, `±Infinity`, `< 0`, `> 1`, non-numeric) are defensively rejected/ignored depending on the boundary — never silently clamped, and never allowed to contaminate Simulation or the Document.

## 5. LIGHT → LDR V1 model

Deterministic, monotone, log-interpolated between the **already-declared canonical bounds** of LDR's `resistance` parameter (`frontend/src/simulator/canonicalRegistry.js`: `minimum: 100`, `maximum: 10000000` — read via `getCanonicalEntry`, never duplicated):

```text
R(light) = Rmax * (Rmin / Rmax) ^ light
```

`light = 0 → R = Rmax`; `light = 1 → R = Rmin` (both endpoints returned exactly, bypassing the `Math.pow` round-trip that would otherwise miss bit-exact equality at `light = 1`); `0 < light < 1 → Rmin < R < Rmax`, strictly decreasing as `light` increases.

This formula lives exclusively in `frontend/src/simulator/environmentalResponseRegistry.js` (the environmental Registry) — never in `resolution.js`, `dcContributionRegistry.js`, `useCircuitState.js`, `MeasurementPanel.jsx`, `LiveMeasurementPanel.jsx`, or any other Presentation file.

## 6. No-stimulus invariant

Without an active LIGHT stimulus, historical behaviour is strictly preserved: LDR keeps using `resolveComponentParameters(...)` against its persistent default/override `resistance`; `runSimulationWithRuntime`, `observe(...)`, `observeTemporal(...)` and `measure(...)` are all byte-for-byte unchanged. `applyEnvironmentalStimuli` returns the **same** `components` array reference in this case (no clone), preserving `runSimulationWithRuntime`'s pre-existing GATE 0 (`return runSimulation(components, wires)` for a Runtime-less circuit, identical Map reference semantics).

## 7. Single source of truth — effective components

`applyEnvironmentalStimuli(components, environmentalStimuli)` (`frontend/src/simulator/environmentalStimulus.js`):

1. Accepts Simulation components and the volatile environmental state.
2. Never mutates the received components, their `parameters`, or the input array.
3. Only replaces the `parameters` of components actually affected by a registered environmental response for an active, valid stimulus.
4. Leaves every unaffected component at the exact same reference.
5. Returns the exact same array reference when no stimulus applies (whole circuit unaffected).
6. Delegates "which type responds to which stimulus, and how" entirely to a dedicated Registry — no `if (comp.type === "LDR")` chain.

This single primitive is shared, unmodified, by Simulation live (`simulationRuntimeIntegration.js`), Observation (`observationContract.js`), Observation temporelle (via `observe()`, no separate call), and Measurement (via Observation).

## 8. Environmental Registry

`frontend/src/simulator/environmentalResponseRegistry.js` declares, for this ticket, exactly one entry: `LDR → LIGHT response`. It computes **only** the overridden parameter set (`{ resistance }`), never current, voltage, or logical propagation — those remain the sole responsibility of the pre-existing, unmodified `dcContributionRegistry.js`/`resolution.js`. No other consumer file contains a literal `=== "LDR"` comparison (protected by `environmentArchitecture.test.js`, T24).

## 9. Simulation integration

`frontend/src/simulator/simulationRuntimeIntegration.js` — `runSimulationWithRuntime(components, wires, options)`:

```text
effectiveComponents = applyEnvironmentalStimuli(components, options.environmentalStimuli)
if (no ARDUINO component):
    return runSimulation(effectiveComponents, wires)
else:
    prepared = prepareCircuit(effectiveComponents, wires)
    { pinSignals } = resolveSignals(effectiveComponents, prepared, externalSignals)
```

`engine.js` (`runSimulation()`) is untouched. The historical Arduino firmware/Runtime pipeline (`RuntimeOrchestrator`, `ArduinoSimulator`, `externalSignals`) is unmodified and composes transparently alongside the environmental primitive.

## 10. Observation integration

`frontend/src/observation/observationContract.js` — `observe()` gains a 5th optional parameter, `environmentalStimuli = null`, fully additive: every existing 3- and 4-argument call site is unchanged. Internally, `observe()` computes the same `effectiveComponents` via `applyEnvironmentalStimuli` before calling `prepareCircuit()`/`resolveSignals()` — the identical primitive Simulation live composes, never a second formula.

## 11. Temporal Observation integration

`frontend/src/observation/temporalObservationContract.js` — `observeTemporal()` accepts `options.environmentalStimuli` and forwards it, unchanged, to `observe()` at every sampled instant. LIGHT is constant across a single `observeTemporal()` call in this ticket; no new clock, no per-sample recomputation logic.

## 12. Measurement integration

`frontend/src/measurement/measurementContract.js` — `measure()` accepts an optional `request.environmentalStimuli` and forwards it as `observe()`'s 5th argument. `MeasurementPanel.jsx`/`LiveMeasurementPanel.jsx` only relay the value from the live circuit context down to `measure()` — no physics of their own (`ENV-12`, protected by `environmentArchitecture.test.js`).

## 13. Application runtime state

`frontend/src/hooks/useCircuitState.js` holds `environmentalStimuli` (`{ LIGHT?: number }`) as ordinary, volatile React state — a plain object, deliberately distinct from the Arduino `orchestrators` Map (same lifetime *principle*, different shape/mechanism). Exposed via `frontend/src/context/CircuitContext.jsx`'s stable value (same exposure tier as `simulationActive`):

- `environmentalStimuli`
- `setEnvironmentalStimulus(kind, value)` — only `kind === "LIGHT"` is supported; an invalid value is ignored, never clamped.
- `clearEnvironmentalStimulus(kind)`

Never part of `components`/`wires`/`breadboards`, never read by `documentApi.getDocument()`, never exported/imported, never historized.

## 14. No environmental UI

No slider, weather panel, light panel, or Navbar/Sidebar/Canvas change. `Navbar.jsx`, `Sidebar.jsx`, `SimulationCanvas.jsx` are untouched (protected by an integration test, T18). The product path is demonstrated exclusively through the real `CircuitProvider`/`useCircuitState` in `frontend/src/__tests__/L1Env001EnvironmentalStimulus.integration.test.jsx`.

## 15. Canonical Registry

Only the LDR `resistance` parameter's `description` text was updated in `frontend/src/simulator/canonicalRegistry.js`, to stop asserting that LDR resistance is light-independent (now factually false) and instead document it as the historical fallback used absent an active LIGHT stimulus. `minimum`, `maximum`, `defaultValue`, pins, capabilities, `modelAvailable`, and canonical ordering are all byte-identical to the base SHA.

## 16. Files delivered

New:

- `frontend/src/simulator/environmentalResponseRegistry.js`
- `frontend/src/simulator/environmentalStimulus.js`
- `frontend/src/simulator/__tests__/environmentalStimulus.test.js`
- `frontend/src/simulator/__tests__/environmentArchitecture.test.js`
- `frontend/src/__tests__/L1Env001EnvironmentalStimulus.integration.test.jsx`

Modified (all within the ticket's authorized scope):

- `frontend/src/simulator/simulationRuntimeIntegration.js`
- `frontend/src/simulator/canonicalRegistry.js` (LDR description text only)
- `frontend/src/observation/observationContract.js`
- `frontend/src/observation/temporalObservationContract.js`
- `frontend/src/measurement/measurementContract.js`
- `frontend/src/measurement/MeasurementPanel.jsx`
- `frontend/src/measurement/LiveMeasurementPanel.jsx`
- `frontend/src/hooks/useCircuitState.js`
- `frontend/src/context/CircuitContext.jsx`
- `frontend/src/simulator/__tests__/canonicalRegistry.test.js` (updated assertion to match the new, authorized LDR description text)
- `frontend/src/observation/__tests__/temporalObservationArchitecture.test.js` (updated static-signature assertion to match `observe()`'s new, additive 5th parameter)

Documentation:

- `docs/pmo/blueprints/MB-L1-ENV-001-environmental-stimulus-foundation-blueprint.md` (this file)
- `docs/pmo/tickets/MB-L1-ENV-001.md`

## 17. Result

Implementation matches this Blueprint exactly. See `docs/pmo/tickets/MB-L1-ENV-001.md` §"Result" for gate-by-gate evidence and exact commit/test/build/lint output.
