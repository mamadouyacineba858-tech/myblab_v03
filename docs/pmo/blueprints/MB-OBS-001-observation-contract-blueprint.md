# MB-OBS-001 — Observation Contract Blueprint

**Phase:** 2 — Instrumentation & Observability
**Step:** P2-1C — Blueprint
**Status:** DRAFT FOR CSA RULING — no implementation authorized
**Date:** 2026-08-22
**Scope:** Simulation → Observation boundary

## 1. Purpose

Define the smallest canonical contract that allows MYBlab Presentation capabilities to observe simulation results without depending directly on solver internals.

This blueprint does **not** implement an instrument, waveform UI, or a new solver.

## 2. Problem / Gap

The current simulation pipeline already produces useful information, including logical pin signals and DC analysis results containing electrical quantities such as voltage/current. These results are currently internal simulation outputs rather than a stable observation boundary.

The architectural gap is therefore not a missing solver capability. It is the absence of a canonical, qualified Observation contract between Simulation and Presentation.

## 3. Target Architecture

```text
Simulation
  ├─ pinSignals
  └─ dcAnalysis
        ↓
  Observation Contract
        ↓
  Measurement / Probe / Oscilloscope / Diagnostics
        ↓
  Presentation
```

Presentation MUST NOT read `resolveSignals()`, `dcAnalysis`, `pinSignals`, solver registries, or other solver internals directly as a public instrument API.

## 4. Canonical Concepts

### 4.1 Observation Request

A request identifies:

- `target`: the object being observed;
- `quantity`: the physical/logical quantity requested;
- `time`: the simulation time at which an instantaneous observation is evaluated.

The request must not expose solver implementation details.

### 4.2 Target

The contract must be designed to represent, without prematurely implementing unsupported targets:

- component;
- pin;
- net;
- branch.

The implementation must only enable target types that are demonstrably resolvable by the current simulation model. Unsupported target types must fail explicitly rather than being silently approximated.

### 4.3 Quantity

Initial contract candidates:

- `VOLTAGE`;
- `CURRENT`;
- `LOGICAL_STATE`.

The list is intentionally minimal. Additional quantities require explicit architectural justification and tests.

### 4.4 Observation Result

An instantaneous result must communicate at least:

- target;
- quantity;
- value when available;
- unit;
- simulation time;
- validity/status;
- reason when the result cannot be provided.

A result must never rely on an unexplained `null` value to represent an unavailable measurement.

## 5. Validity Model

The minimum semantic distinction is:

- `VALID` — requested quantity was resolved successfully;
- `UNAVAILABLE` — the simulation currently cannot provide the requested observation for a known reason;
- `INVALID` — the request or simulation state is invalid and must not be interpreted as a measurement.

The implementation may use a more precise internal representation, but it must preserve these externally meaningful distinctions.

## 6. Temporal Contract

MB-OBS-001 is primarily an instantaneous-observation contract.

It MUST use simulation time, not wall-clock time. Existing deterministic scheduler/runtime mechanisms remain the authoritative time source.

The contract must leave room for a later temporal observation extension (`MB-OBS-002`) without creating a second observation architecture.

MB-OBS-001 MUST NOT implement waveform sampling, oscilloscope rendering, or a new clock.

## 7. Separation of Concerns

### Simulation owns

- physical/logical resolution;
- solver internals;
- signal evaluation;
- simulation time;
- validity of the underlying result.

### Observation owns

- canonical request/result semantics;
- normalization of simulation outputs into the public observation contract;
- explicit units/status;
- boundary stability.

### Presentation owns

- instrument interaction;
- display;
- formatting;
- visual state.

Presentation MUST NOT become a second simulation engine.

## 8. Reuse Strategy

The contract must be reusable by:

1. a future reference measurement instrument (`MB-MEASURE-001`);
2. a probe/diagnostic capability;
3. a future temporal observation extension (`MB-OBS-002`);
4. an oscilloscope or waveform UI built later.

MB-OBS-001 must therefore avoid instrument-specific naming or UI assumptions.

## 9. Determinism

For the same document, simulation configuration, and simulation time, an instantaneous observation must produce the same semantic result.

The implementation MUST NOT introduce `Date.now()`, `performance.now()`, browser timers, or another wall-clock source into simulation observation semantics.

## 10. Document Boundary

Reading an observation does not require mutating the circuit Document.

MB-OBS-001 MUST NOT introduce persistent measurement state into the circuit Document unless a later, separately ruled requirement explicitly requires it.

## 11. Required Evidence

Before implementation can be accepted, the work must demonstrate:

### Architecture

- Presentation does not access solver internals directly;
- one canonical observation boundary exists;
- the existing simulation time source remains authoritative;
- no second solver or clock is introduced.

### Behaviour

At minimum, tests must cover:

- valid voltage observation;
- valid current observation where the current simulation model supports it;
- valid logical-state observation;
- unsupported target/quantity;
- unavailable result;
- invalid request;
- explicit unit/status;
- deterministic repeated observation at the same simulation time.

### Integration

The contract must be consumable without coupling an instrument to `resolveSignals()` or `dcAnalysis` internals.

### Traceability

The implementation must identify the exact files changed, tests executed, and commit used as integration evidence.

## 12. Strict Scope

### Allowed in MB-OBS-001

- introduce the minimal Observation contract;
- introduce the minimal adapter/resolver needed to expose already-produced simulation results;
- add focused unit/integration tests;
- add architecture tests protecting the Simulation/Observation/Presentation boundary;
- add narrowly scoped documentation required by the contract.

### Explicitly forbidden

- building a multimètre UI;
- building an oscilloscope UI;
- waveform rendering;
- adding a second clock;
- refactoring the solver globally;
- replacing the existing simulation engine;
- changing CF3 mutation architecture;
- changing HistoryManager/HistoryService;
- changing Document persistence semantics;
- changing the canonical component registry;
- introducing unrelated component behaviour;
- silently converting unsupported observations into approximate values.

## 13. Expected Minimal Data Shape

The exact TypeScript/JavaScript representation is deliberately left to the implementation ticket, but the semantic shape is:

```text
ObservationRequest
  target
  quantity
  time

ObservationResult
  target
  quantity
  value
  unit
  time
  status
  reason?
```

The implementation must not expose solver-specific objects as the public contract.

## 14. Non-Goals

MB-OBS-001 does not attempt to make MYBlab a complete electrical measurement environment.

It establishes the foundation needed to reach that capability incrementally:

```text
MB-OBS-001
  ↓
MB-MEASURE-001
  ↓
MB-OBS-002
  ↓
Oscilloscope / temporal instruments
```

## 15. CSA Gate Before Implementation

Implementation remains blocked until the CSA explicitly validates:

1. target granularity;
2. initial quantity set;
3. validity semantics;
4. time semantics;
5. Observation boundary ownership;
6. exact implementation scope;
7. required evidence;
8. the corresponding PMO ticket.

**Current decision:** BLUEPRINT READY FOR CSA REVIEW — **NO IMPLEMENTATION GO**.
