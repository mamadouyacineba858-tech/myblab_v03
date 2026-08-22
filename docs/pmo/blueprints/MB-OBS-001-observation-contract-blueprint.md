# MB-OBS-001 — Observation Contract Blueprint

**Phase:** 2 — Instrumentation & Observability  
**Step:** P2-1C — Blueprint, CSA-ready revision  
**Status:** CSA REVIEW READY — **NO IMPLEMENTATION GO**  
**Date:** 2026-08-23  
**Scope:** Simulation → Observation boundary

## 1. Purpose

Define the smallest canonical contract that allows MYBlab Presentation capabilities to observe simulation results without depending directly on solver internals.

This blueprint does **not** implement an instrument, waveform UI, or a new solver.

## 2. Problem / Gap

The current simulation pipeline already produces useful information, including logical pin signals and DC analysis results containing electrical quantities such as voltage/current. These results are currently internal simulation outputs rather than a stable observation boundary.

The architectural gap is therefore not a missing solver capability. It is the absence of a canonical, qualified Observation contract between Simulation and Presentation.

## 3. V1 Architectural Decision — Minimum Useful Surface

MB-OBS-001 establishes the observation boundary; it does not promise that every theoretical target/quantity is immediately measurable.

### V1 supported targets

The implementation MUST support only targets that can be resolved from the current simulation model with deterministic semantics:

- **PIN** — primary V1 target for logical and electrical observations;
- **NET** — V1 only where the current model provides an unambiguous net-level value.

`COMPONENT` and `BRANCH` remain contract-extensible concepts but are **not V1 implementation requirements** unless the repository proves a canonical deterministic value for them without inventing new solver semantics.

Unsupported target kinds MUST return an explicit unsupported/unavailable result; they MUST NOT be silently approximated.

## 4. V1 Quantities

The initial public quantity set is deliberately limited to:

- `LOGICAL_STATE` — logical pin state where supported;
- `VOLTAGE` — electrical potential of a supported observation target relative to the simulation's defined reference;
- `CURRENT` — current through a target for which the existing simulation model provides a canonical current value and direction.

No additional physical quantity is part of MB-OBS-001.

## 5. Voltage Semantics

`VOLTAGE` in MB-OBS-001 means **single-target potential relative to the simulation's canonical reference**, not an arbitrary voltage difference between two independently selected targets.

A two-point differential voltage measurement is **out of scope for MB-OBS-001**. It may be introduced by a later measurement contract only after its reference semantics are explicitly ruled.

The contract MUST therefore not expose an ambiguous field such as `voltage` without defining its reference.

## 6. Current Semantics

`CURRENT` is valid only where the existing simulation model supplies a canonical current associated with the selected target.

The result MUST define a stable sign convention. For MB-OBS-001 V1, the convention is:

> **Positive current follows the canonical direction already defined by the simulation contribution/model for that target.**

MB-OBS-001 MUST NOT invent a new physical current direction solely for presentation. If a target has no canonical direction/value in the existing model, the observation is `UNAVAILABLE`, not guessed.

The implementation must preserve the existing simulation convention rather than reinterpret current signs at the Observation boundary.

## 7. Observation Request

A request identifies:

- `target`: the object being observed;
- `quantity`: the physical/logical quantity requested;
- `time`: the simulation time at which an instantaneous observation is evaluated.

The request must not expose solver implementation details.

Conceptual shape:

```text
ObservationRequest
  target
  quantity
  time
```

## 8. Observation Result

An instantaneous result must communicate at least:

- target;
- quantity;
- value when available;
- unit;
- simulation time;
- validity/status;
- reason when the result cannot be provided.

A result must never rely on an unexplained `null` value to represent an unavailable measurement.

Conceptual shape:

```text
ObservationResult
  target
  quantity
  value
  unit
  time
  status
  reason?
```

The exact JavaScript/TypeScript representation remains an implementation concern and must be specified by the execution ticket without exposing solver-specific objects.

## 9. Validity / Failure Semantics

The externally meaningful status set is:

- `VALID` — requested quantity was resolved successfully;
- `UNAVAILABLE` — the request is structurally meaningful, but the current circuit/simulation cannot provide a measurement;
- `INVALID` — the request itself or the relevant simulation state violates the observation contract.

### Examples

| Situation | Expected status |
|---|---|
| Supported PIN + supported quantity + resolvable value | `VALID` |
| Supported target, but quantity not produced by current model | `UNAVAILABLE` |
| Target exists but required physical result is not calculable for current circuit state | `UNAVAILABLE` |
| Unknown target identifier / malformed request | `INVALID` |
| Unsupported target kind explicitly requested | `INVALID` with explicit reason |
| Repeated request at same simulation time and unchanged state | same semantic result |

`INVALID` means the request cannot be interpreted as a valid observation request. `UNAVAILABLE` means the request is valid in form but the requested observation cannot currently be produced.

No silent fallback or approximate value is permitted.

## 10. Temporal Semantics

MB-OBS-001 is an **instantaneous-observation** contract.

The `time` field is simulation time. The authoritative source remains the existing deterministic simulation scheduler/runtime mechanism.

The implementation MUST NOT use:

- `Date.now()`;
- `performance.now()`;
- browser timers;
- wall-clock timestamps;
- a second simulation clock.

For identical document state, simulation configuration, and simulation time, repeated instantaneous observations MUST be semantically deterministic.

Temporal series/waveform sampling is deferred to `MB-OBS-002` and MUST NOT be implemented here.

## 11. Target Resolution Rule

Target resolution must be explicit and deterministic.

For V1:

```text
PIN
  → logical state where supported
  → voltage where supported
  → current only where the existing model defines a canonical current for that target

NET
  → only when the existing model provides an unambiguous net-level value
```

The Observation layer MUST NOT derive new electrical quantities by ad-hoc arithmetic merely to satisfy a request.

## 12. Architecture Boundary

```text
Simulation
  ├─ pinSignals
  └─ dcAnalysis / existing simulation results
        ↓
  Observation Contract
        ↓
  Measurement / Probe / Diagnostics / future Oscilloscope
        ↓
  Presentation
```

### Simulation owns

- physical/logical resolution;
- solver internals;
- signal evaluation;
- simulation time;
- validity of underlying results;
- physical conventions already established by the simulation model.

### Observation owns

- canonical request/result semantics;
- normalization of already-produced simulation outputs;
- explicit quantity/unit/status;
- stable Simulation/Presentation boundary.

### Presentation owns

- instrument interaction;
- display;
- formatting;
- visual state.

Presentation MUST NOT read `resolveSignals()`, `dcAnalysis`, `pinSignals`, solver registries, or other solver internals as a public instrument API.

## 13. Document Boundary

Reading an observation does not require mutating the circuit Document.

MB-OBS-001 MUST NOT introduce persistent measurement state into the circuit Document unless a later, separately ruled requirement explicitly requires it.

## 14. Reuse Strategy

The contract must be reusable by:

1. `MB-MEASURE-001` — reference measurement instrument;
2. future probe/diagnostic capability;
3. `MB-OBS-002` — temporal observation extension;
4. future oscilloscope/waveform presentation.

MB-OBS-001 MUST remain instrument-agnostic.

## 15. Required Evidence

### Architecture

- Presentation does not access solver internals directly;
- one canonical observation boundary exists;
- the existing simulation time source remains authoritative;
- no second solver or clock is introduced;
- V1 target/quantity support is explicit.

### Behaviour

At minimum:

- valid logical-state observation;
- valid voltage observation for a supported PIN;
- valid current observation where the current model provides it;
- unsupported quantity;
- unsupported target;
- unavailable physical result;
- malformed/unknown target;
- explicit unit/status/reason;
- deterministic repeated observation at the same simulation time;
- preservation of the existing current sign convention.

### Integration

The contract must be consumable by a future instrument without coupling it to `resolveSignals()` or `dcAnalysis` internals.

### Traceability

The implementation delivery must identify exact files changed, tests executed, and integration commit.

## 16. Strict Scope

### Allowed

- introduce the minimal Observation contract;
- introduce only the minimal adapter/resolver required to expose already-produced simulation results;
- add focused unit/integration tests;
- add architecture tests protecting the boundary;
- add narrowly scoped contract documentation.

### Explicitly forbidden

- multimètre UI;
- oscilloscope UI;
- waveform rendering/sampling;
- second clock;
- global solver refactor;
- replacement of simulation engine;
- CF3 mutation architecture changes;
- HistoryManager/HistoryService changes;
- Document persistence changes;
- canonical Registry changes;
- unrelated component behaviour;
- new physical equations merely to make an observation pass;
- silent approximation of unsupported observations.

## 17. Non-Goals

MB-OBS-001 does not make MYBlab a complete electrical measurement environment.

It establishes the foundation:

```text
MB-OBS-001
  ↓
MB-MEASURE-001
  ↓
MB-OBS-002
  ↓
Oscilloscope / temporal instruments
```

## 18. CSA Gate

Before implementation, CSA MUST explicitly validate:

1. V1 target granularity;
2. V1 quantity set;
3. voltage reference semantics;
4. current sign semantics;
5. validity semantics;
6. simulation-time semantics;
7. Observation ownership/boundary;
8. exact implementation scope;
9. required evidence;
10. corresponding PMO ticket.

**Current decision:** **CSA REVIEW READY — NO IMPLEMENTATION GO.**