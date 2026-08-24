# MB-OBS-002 — Temporal Observation Blueprint

**Phase:** 2 — Instrumentation & Observability  
**Step:** P2-1D — Temporal Observation Blueprint  
**Status:** CSA REVIEW READY — **NO IMPLEMENTATION GO**  
**Scope:** Simulation → Temporal Observation boundary

## 1. Purpose

Define the smallest architecture that extends MB-OBS-001 from instantaneous observation to deterministic temporal observation without creating an alternate time mechanism, duplicating simulation logic, or moving sampling into Measurement or Presentation.

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
- MB-OBS-002 is a planning candidate and has no prior implementation;
- there is currently no production live `Scheduler`/`RuntimeOrchestrator` instance wired into the application flow.

These existing capabilities are dependencies, not evidence that MB-OBS-002 itself is implemented.

## 3. Architectural Goal

```text
                    existing simulation time mechanism
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

The temporal Observation layer is a consumer/composer of existing simulation capabilities. It MUST NOT become a second simulation engine or introduce an alternate time mechanism.

## 4. Core Architectural Decisions

### D1 — Canonical simulation-time mechanism

`SimulatedClock` remains the canonical implementation of simulation time and `Scheduler` remains its existing advancement abstraction.

"Single clock" in this ticket means **one canonical time mechanism**, not a prohibition on creating a request-scoped instance of the existing classes. Temporal Observation MUST NOT introduce another clock class, wall-clock source, timer, or competing time algorithm.

### D2 — Deterministic explicit sampling

Sampling is driven by explicit simulation-time parameters, not elapsed wall-clock time.

Conceptually:

```text
validate request
      ↓
compute deterministic sample grid
      ↓
create request-scoped runtime objects when runtime signals are required
      ↓
advance existing Scheduler abstraction to each requested time
      ↓
evaluate existing runtime signals
      ↓
resolve Observation at that time
      ↓
append sample
      ↓
return deterministic series
```

The runtime objects used by one request are local/disposable and MUST NOT become ambient application state.

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
  status
  reason?
```

The global `status` describes request/execution validity. Per-sample `status` describes availability at the exact sample time. Unavailable samples MUST remain represented at their requested time position rather than silently disappearing.

The implementation MAY retain additional fields already defined by MB-OBS-001 when useful, but MUST NOT expose solver-specific structures.

Sample ordering is ascending by simulation time.

## 7. Status Semantics

Reuse MB-OBS-001's semantic distinction:

- `VALID` — requested temporal observation completed and the request/execution is valid;
- `UNAVAILABLE` — request is structurally valid but the requested observation cannot be produced for the circuit/runtime state;
- `INVALID` — temporal request or relevant contract state is malformed/invalid.

Per-sample availability MUST be represented explicitly. A single unavailable sample MUST NOT erase otherwise valid samples from the series.

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

There is currently **no production live Scheduler/RuntimeOrchestrator instance** in the application flow. Therefore the temporal engine MUST NOT depend on or mutate an ambient Scheduler.

### Request-scoped runtime ownership

When a temporal request requires time-dependent runtime signals, the implementation MAY create a **local, request-scoped, disposable instance of the existing `Scheduler`/`RuntimeOrchestrator` classes**.

This is permitted only because the existing classes are the canonical time mechanism. It does NOT authorize a second clock implementation or competing time source.

The request-scoped runtime MUST:

1. start from an explicitly defined initial simulation time;
2. use the existing `advance(dt)` semantics;
3. reuse existing runtime evaluation and `externalSignals` composition;
4. never be stored in global/singleton/ambient state owned by Observation;
5. never mutate a live simulation instance;
6. be discarded after the request unless an approved caller explicitly owns the injected instance;
7. produce the same semantic result for identical inputs.

For a future live simulation integration, Observation MUST NOT silently take ownership of that live runtime. A separate explicit integration contract would be required.

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

The preferred implementation boundary is a **new dedicated temporal Observation module** under `frontend/src/observation/`, leaving the public `observe()` contract unchanged.

If runtime signal consumption cannot be achieved without touching `observationContract.js`, the only currently approved exception is a **strictly additive internal/exported helper or optional `externalSignals` pathway** that reuses the existing Observation logic without changing the semantics or signature of the existing public `observe()` call. The implementer MUST prove this necessity in the file-impact inventory before editing.

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

1. a second clock implementation or alternate time source is introduced;
2. `Date.now()` or other wall-clock APIs are used for sample timing;
3. browser timers drive sampling;
4. Observation imports or exposes raw `PwmSignal` internals;
5. Measurement becomes the owner of sampling;
6. Presentation accesses solver/runtime internals directly;
7. circuit Document state is mutated by sampling;
8. Observation retains a persistent ambient Scheduler/RuntimeOrchestrator it owns.

Existing time-architecture and PWM anti-introspection tests MUST remain green.

## 13. Required Test Matrix

| Area | Required proof |
|---|---|
| Request validation | invalid range/period rejected |
| Sample grid | exact deterministic sample points |
| Endpoint | endTime included only when on grid |
| Ordering | samples strictly ascending |
| Determinism | identical run produces identical series |
| Clock | canonical time mechanism / no wall-clock timing |
| Runtime | sample timestamp equals evaluated runtime time |
| Runtime isolation | request-scoped runtime is discarded and does not mutate ambient state |
| PWM | transition observed at known simulation times |
| Availability | per-sample unavailable semantics explicit |
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

> An existing time-dependent simulation signal can be observed at multiple deterministic simulation times through the canonical existing simulation-time mechanism, using request-scoped runtime composition where required without persistent ambient ownership, producing a documented and reproducible temporal series, while preserving MB-OBS-001 semantics and without moving temporal ownership into Measurement or Presentation.

## 17. CSA Ruling Addendum

The following decisions are now incorporated into the pre-implementation perimeter:

1. **Per-sample status — APPROVED.** Each sample carries `{time, value, status, reason?}`. The global status does not erase per-sample availability information.
2. **Dedicated temporal module — APPROVED.** The preferred boundary is a new temporal Observation module; the existing public `observe()` contract remains unchanged.
3. **Request-scoped runtime — APPROVED WITH CONSTRAINTS.** Because no live Scheduler/RuntimeOrchestrator is currently wired into production, a local disposable instance of the existing Scheduler/RuntimeOrchestrator may be used for a temporal request requiring runtime signals. This is not a second time mechanism. It MUST be request-scoped, non-ambient, deterministic, and discarded after the request. No alternate clock class/source is permitted.
4. **Observation/runtime bridge — APPROVED WITH CONSTRAINTS.** If the existing Observation internals cannot consume `externalSignals` without duplication, a strictly additive helper/path may be added to the MB-OBS-001 observation module. The public `observe()` signature and instantaneous semantics MUST remain unchanged. Necessity MUST be proven in the file-impact inventory before editing.

These decisions replace the previously open questions on sample status, temporal module boundary, and runtime ownership.

## 18. CSA Review Gate

**Current decision: CSA REVIEW READY — NO IMPLEMENTATION GO.**

The perimeter is now sufficiently explicit for a Qwen read-only implementation-planning audit. No production implementation is authorized until that audit and the subsequent implementation-agent scope are reviewed.
