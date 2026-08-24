# MB-OBS-002 — Temporal Observation Blueprint

**Phase:** 2 — Instrumentation & Observability  
**Step:** P2-1D — Temporal Observation Blueprint  
**Status:** CSA REVIEW READY — **NO IMPLEMENTATION GO**  
**Scope:** Simulation → Temporal Observation boundary

## 1. Purpose

Define the smallest architecture that extends MB-OBS-001 from instantaneous observation to deterministic temporal observation without creating a second clock, duplicating simulation logic, or moving sampling into Measurement or Presentation.

MB-OBS-002 builds the temporal data contract only. It does not build an oscilloscope UI or waveform renderer.

## 2. Verified Starting Point

The pre-implementation audit established:

- `observationContract.js` is instantaneous and currently returns one result per request;
- `SimulatedClock` / `Scheduler` already provide deterministic simulation time;
- `RuntimeOrchestrator` already composes scheduler time with runtime signal evaluation;
- PWM is already evaluated deterministically by the existing Arduino runtime;
- `resolveSignals()` already accepts `externalSignals`;
- Measurement delegates to Observation and has no temporal-series responsibility;
- no temporal sampling, waveform, or time-series representation currently exists;
- MB-OBS-002 is a planning candidate and has no prior implementation.

These existing capabilities are dependencies, not evidence that MB-OBS-002 itself is implemented.

## 3. Architectural Goal

```text
                    existing simulation time
                    SimulatedClock / Scheduler
                              │
                              ▼
                     RuntimeOrchestrator
                              │
                    evaluated runtime signals
                              │
                              ▼
                  Temporal Observation Engine
                              │
                              ▼
                  Temporal Observation Series
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
            Measurement              Future Probe/
                                     Oscilloscope
```

The temporal Observation layer is a consumer/composer of existing simulation capabilities. It MUST NOT become a second simulation engine.

## 4. Core Architectural Decisions

### D1 — One authoritative clock

`SimulatedClock` remains the only owner of simulation time.

Temporal Observation MUST consume simulation time through existing scheduler/runtime APIs. It MUST NOT create or own another clock.

### D2 — Deterministic explicit sampling

Sampling is driven by explicit simulation-time parameters, not elapsed wall-clock time.

Conceptually:

```text
initial simulation state
        ↓
advance simulation by deterministic Δt
        ↓
evaluate runtime signals at current simulation time
        ↓
observe target
        ↓
append sample
        ↓
repeat until temporal window is complete
```

The final implementation may choose a different internal composition, but the observable semantics MUST remain equivalent and deterministic.

### D3 — Reuse existing runtime signals

The implementation MUST reuse the existing runtime signal path and `externalSignals` mechanism rather than reproduce PWM or solver logic inside Observation.

### D4 — No raw PWM introspection

Observation consumes evaluated simulation signals. It MUST NOT expose or depend on a public raw `PwmSignal` object/API.

### D5 — Measurement remains downstream

Measurement consumes Observation results. It does not own temporal sampling, clock advancement, or waveform accumulation.

### D6 — Presentation remains downstream

No UI, charting, waveform rendering, or oscilloscope state belongs to this ticket.

## 5. Temporal Request Semantics

The public semantic request is:

```text
TemporalObservationRequest
  target
  quantity
  startTime
  endTime
  samplePeriod
```

### Validation

- all temporal values MUST be finite numbers;
- `startTime >= 0` unless the existing simulation contract explicitly permits another domain;
- `endTime >= startTime`;
- `samplePeriod > 0`;
- no NaN or infinity;
- malformed requests fail explicitly;
- no partial result is returned for an invalid request.

### Sampling points

The Blueprint deliberately requires the implementation to fix and test endpoint semantics before coding.

**Chosen semantic:** samples are generated at:

```text
startTime,
startTime + samplePeriod,
startTime + 2*samplePeriod,
...
```

while the next point is `<= endTime` within the contract's numeric tolerance. `endTime` is therefore included only when it lies on the sampling grid.

The implementation MUST NOT silently invent an additional off-grid endpoint sample.

## 6. Temporal Result Semantics

Conceptual result:

```text
TemporalObservationResult
  target
  quantity
  unit
  startTime
  endTime
  samplePeriod
  samples
  status
  reason?
```

Each sample:

```text
ObservationSample
  time
  value
```

The implementation MAY retain additional fields already defined by MB-OBS-001 when useful, but MUST NOT expose solver-specific structures.

Sample ordering is ascending by simulation time.

## 7. Status Semantics

Reuse MB-OBS-001's semantic distinction:

- `VALID` — requested temporal observation completed and samples are semantically valid;
- `UNAVAILABLE` — request is structurally valid but the requested observation cannot be produced for the circuit/runtime state;
- `INVALID` — temporal request or relevant contract state is malformed/invalid.

The implementation MUST define behaviour for a valid window containing unavailable individual samples before implementation. The preferred rule is to preserve sample positions with explicit per-sample status rather than silently dropping time points; the exact representation requires CSA confirmation if it differs from the MB-OBS-001 result shape.

## 8. Runtime Composition

The audit found the existing runtime path:

```text
SimulatedClock
    ↓
Scheduler
    ↓
RuntimeOrchestrator
    ↓
Arduino/runtime tick
    ↓
externalSignals
    ↓
resolveSignals
```

Temporal Observation MUST compose with this path rather than introduce another path.

The implementation MUST explicitly determine where runtime advancement and observation occur so that each sample corresponds to one well-defined simulation time.

### Required invariant

For every sample:

```text
sample.time == authoritative simulation time used for signal evaluation
```

No sample may be timestamped independently from the simulation time that produced its value.

## 9. PWM Reference Scenario

The reference scenario is an existing PWM signal whose deterministic transitions are already covered by the simulation runtime tests.

The temporal Observation proof MUST demonstrate multiple samples spanning at least one known PWM transition.

Expected evidence must show that Observation receives the evaluated signal state at each simulation time, rather than inspecting a raw PWM object.

No PWM equation, frequency model, or Arduino API is to be added by MB-OBS-002.

## 10. MB-OBS-001 Compatibility

The instantaneous contract remains the foundation.

Compatibility requirements:

1. existing instantaneous requests continue to work;
2. existing `VALID` / `UNAVAILABLE` / `INVALID` semantics remain meaningful;
3. existing units and physical conventions remain unchanged;
4. existing current sign convention remains unchanged;
5. Document remains read-only;
6. no solver-specific object leaks through the Observation boundary.

If extending `observationContract.js` is the minimal solution, the implementation MUST document why. A new temporal module is preferable when it preserves the V1 boundary cleanly, but the decision is implementation evidence subject to the CSA-approved file-impact inventory.

## 11. Measurement Boundary

`measurementContract.js` remains an adapter/consumer.

MB-OBS-002 MUST NOT place:

- clock advancement;
- sampling loops;
- temporal buffering;
- waveform accumulation;

inside Measurement.

A future measurement instrument may consume `TemporalObservationResult` after this ticket, but no temporal UI is required now.

## 12. Architecture Locks

The implementation MUST add or extend tests that fail if:

1. a second clock is instantiated for temporal Observation;
2. `Date.now()` or other wall-clock APIs are used for sample timing;
3. browser timers drive sampling;
4. Observation imports or exposes raw `PwmSignal` internals;
5. Measurement becomes the owner of sampling;
6. Presentation accesses solver/runtime internals directly;
7. circuit Document state is mutated by sampling.

Existing time-architecture and PWM anti-introspection tests MUST remain green.

## 13. Required Test Matrix

| Area | Required proof |
|---|---|
| Request validation | invalid range/period rejected |
| Sample grid | exact deterministic sample points |
| Endpoint | endTime included only when on grid |
| Ordering | samples strictly ascending |
| Determinism | identical run produces identical series |
| Clock | no second clock / no wall-clock timing |
| Runtime | sample timestamp equals evaluated runtime time |
| PWM | transition observed at known simulation times |
| Availability | unavailable semantics explicit |
| Document | no persistent circuit mutation |
| MB-OBS-001 | instantaneous tests remain green |
| Measurement | no sampling logic introduced there |
| Architecture | boundary/ownership locks enforced |

## 14. File-Impact Rule

Before implementation, the implementer MUST inspect and list every file expected to change.

The likely minimum impact is:

```text
frontend/src/observation/**
frontend/src/observation/__tests__/**
```

Additional runtime composition files may be required only if the existing public APIs cannot be composed without modification. Such a change requires explicit evidence and CSA approval before editing.

The following are protected by default:

- `frontend/src/simulator/clock.js`
- `frontend/src/simulator/scheduler.js`
- `frontend/src/simulator/runtimeOrchestrator.js`
- `frontend/src/simulator/pwmSignal.js`
- `frontend/src/simulator/arduino/ArduinoSimulator.js`
- `frontend/src/simulator/resolution.js`
- `frontend/src/measurement/measurementContract.js`

No modification to these files is authorized merely for convenience.

## 15. Non-Goals

- oscilloscope UI;
- waveform rendering;
- charting;
- persistence of measurement history;
- new physical simulation;
- new PWM implementation;
- raw PWM introspection;
- solver refactor;
- runtime redesign;
- Measurement redesign;
- Presentation redesign;
- unrelated cleanup.

## 16. Acceptance Gate

MB-OBS-002 can only be considered complete when:

> An existing time-dependent simulation signal can be observed at multiple deterministic simulation times through the single existing simulation-time authority, producing a documented and reproducible temporal series, while preserving MB-OBS-001 semantics and without moving temporal ownership into Measurement or Presentation.

## 17. CSA Review Questions

Before implementation, CSA MUST explicitly approve:

1. temporal request/result schema;
2. endpoint/sample-grid semantics;
3. handling of unavailable individual samples;
4. location of runtime composition;
5. whether `observationContract.js` is extended or a temporal module is introduced;
6. exact protected files;
7. required architecture locks;
8. PWM reference scenario;
9. required test commands and evidence.

**Current decision: CSA REVIEW READY — NO IMPLEMENTATION GO.**
