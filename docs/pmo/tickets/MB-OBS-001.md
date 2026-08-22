# MB-OBS-001 — Canonical Observation Contract

**PMO Status:** READY FOR IMPLEMENTATION — CSA GO 2026-08-23  
**Phase:** 2 — Instrumentation & Observability  
**Blueprint:** `docs/pmo/blueprints/MB-OBS-001-observation-contract-blueprint.md`  
**Prerequisite:** P2-1A technical audit + P2-1B gap analysis + P2-1C blueprint  
**Implementation scope:** Simulation → Observation boundary only

## A. Objective

Introduce the minimal canonical Observation contract that allows Presentation capabilities to consume already-produced simulation results without directly depending on solver internals.

MB-OBS-001 establishes the foundation for later measurement and temporal observation work. It does not build a user-facing instrument.

## B. Architectural Contract

```text
Simulation results
      ↓
Observation Contract
      ↓
Future instruments / diagnostics
      ↓
Presentation
```

Presentation MUST NOT use `resolveSignals()`, `dcAnalysis`, `pinSignals`, solver registries, or other solver-internal structures as its public measurement API.

## C. V1 Supported Surface

### Targets

- `PIN` is the primary V1 target.
- `NET` is supported only where the current model exposes an unambiguous net-level value.
- `COMPONENT` and `BRANCH` remain future-compatible contract concepts but are not V1 implementation requirements.

Unsupported targets MUST fail explicitly. No approximation is permitted.

### Quantities

V1 is limited to:

- `LOGICAL_STATE`;
- `VOLTAGE`;
- `CURRENT` where the existing model provides a canonical current.

No additional physical quantity may be introduced within this ticket.

## D. Voltage Semantics

`VOLTAGE` means the potential of the supported observation target relative to the simulation's canonical reference.

Differential voltage between two independently selected targets is **out of scope**.

The implementation MUST NOT expose an ambiguous voltage value without an explicit reference semantic.

## E. Current Semantics

`CURRENT` may be returned only when the existing simulation model provides a canonical current for the selected target.

The existing simulation current-direction/sign convention MUST be preserved. The Observation layer MUST NOT invent a new direction convention.

If no canonical current exists, the result is `UNAVAILABLE`.

## F. Request Contract

Conceptual semantic shape:

```text
ObservationRequest
  target
  quantity
  time
```

`time` is simulation time for an instantaneous observation.

The exact code representation is implementation-defined, but it MUST NOT expose solver-specific objects.

## G. Result Contract

Conceptual semantic shape:

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

A result MUST explicitly communicate availability and semantics. An unexplained `null` MUST NOT be used as an availability protocol.

## H. Status Semantics

- `VALID`: the requested observation was resolved successfully.
- `UNAVAILABLE`: the request is structurally valid, but the current circuit/simulation cannot provide the requested quantity.
- `INVALID`: the request itself or relevant simulation state violates the observation contract.

Required examples:

| Situation | Status |
|---|---|
| Supported PIN + supported quantity + resolved value | `VALID` |
| Supported target but quantity not produced by current model | `UNAVAILABLE` |
| Required physical result cannot be calculated for current circuit state | `UNAVAILABLE` |
| Unknown/malformed target identifier | `INVALID` |
| Unsupported target kind explicitly requested | `INVALID` with reason |

No silent fallback or approximate value is allowed.

## I. Temporal Semantics

MB-OBS-001 is instantaneous only.

Simulation time remains authoritative. The implementation MUST NOT introduce `Date.now()`, `performance.now()`, browser timers, wall-clock timestamps, or a second simulation clock.

For identical document state, simulation configuration, and simulation time, repeated observations MUST be deterministic.

Waveform sampling, temporal series, and oscilloscope rendering belong to `MB-OBS-002` and are explicitly excluded.

## J. Responsibilities

### Simulation

Owns physical/logical resolution, solver internals, signal evaluation, simulation time, underlying validity, and established physical conventions.

### Observation

Owns request/result semantics, normalization of already-produced results, explicit quantity/unit/status, and the stable boundary.

### Presentation

Owns interaction, display, formatting, and visual state.

Presentation MUST NOT become a second simulation engine.

## K. Document Boundary

Observing a value MUST NOT mutate the circuit Document.

No persistent measurement state may be introduced into the Document by this ticket.

## L. Required Evidence

### Architecture

1. Presentation cannot access solver internals through the observation API.
2. Exactly one canonical observation boundary is introduced for V1.
3. Existing simulation time remains authoritative.
4. No second solver or clock exists.
5. V1 target and quantity support is explicit.

### Behaviour

Tests MUST cover at least:

1. valid logical-state observation;
2. valid voltage observation on a supported PIN;
3. valid current observation where the existing model supplies it;
4. unsupported quantity;
5. unsupported target;
6. unavailable physical result;
7. malformed/unknown target;
8. explicit unit/status/reason;
9. deterministic repeated observation at identical simulation time;
10. preservation of the existing current sign convention.

### Integration

A future instrument MUST be able to consume the contract without importing or depending on `resolveSignals()` or `dcAnalysis` internals.

### Traceability

The delivery record MUST identify exact files changed, tests executed, and the integration commit.

## M. Allowed Files / Scope Rule

The implementer MUST first produce a file-impact inventory before editing.

Allowed changes are limited to:

- the minimal Observation contract/module;
- the minimal adapter/resolver required to expose already-produced simulation results;
- focused unit/integration tests;
- architecture tests protecting the Simulation/Observation/Presentation boundary;
- narrowly scoped PMO/technical documentation required by the contract.

Any additional file requires explicit CSA approval before modification.

## N. Explicit Non-Goals

The implementation MUST NOT:

- build a multimeter UI;
- build an oscilloscope UI;
- implement waveform rendering or sampling;
- add a second clock;
- refactor the solver globally;
- replace the simulation engine;
- change CF3 mutation architecture;
- change HistoryManager/HistoryService;
- change Document persistence semantics;
- change the canonical Registry;
- add unrelated component behaviour;
- add new physical equations merely to satisfy an observation;
- silently approximate unsupported observations.

## O. Acceptance Criteria

**AC-01 — Canonical boundary**  
A single documented Observation boundary exists between simulation outputs and consumers.

**AC-02 — Solver isolation**  
Consumer code does not depend directly on `resolveSignals()`, `dcAnalysis`, `pinSignals`, or solver registries as its observation API.

**AC-03 — PIN logical observation**  
A supported PIN can return its logical state through the Observation contract.

**AC-04 — PIN voltage observation**  
A supported PIN can return voltage with explicit unit, simulation time, reference semantics, and status.

**AC-05 — Current observation**  
A target with an existing canonical current can return that current while preserving the simulation's existing sign convention.

**AC-06 — Unsupported/unavailable semantics**  
Unsupported requests and unavailable results are distinguishable and never silently approximated.

**AC-07 — Determinism**  
The same state observed at the same simulation time produces the same semantic result.

**AC-08 — Time integrity**  
No wall-clock source or second simulation clock is introduced.

**AC-09 — Document integrity**  
Observation does not mutate persistent circuit Document state.

**AC-10 — Future compatibility**  
The contract can be consumed by `MB-MEASURE-001` and extended by `MB-OBS-002` without replacing the V1 boundary.

**AC-11 — Test evidence**  
All required behavioural and architecture tests are present and passing, with exact command/result recorded in the Delivery Report.

**AC-12 — Scope integrity**  
No non-approved file or unrelated subsystem is modified.

## P. Dependencies

- Existing simulation result production (`pinSignals`, supported DC analysis outputs).
- Existing deterministic simulation time mechanism.
- Existing architecture/governance constraints documented by the Phase 2 framework.

No new dependency on a UI framework, external measurement library, or wall-clock service is permitted.

## Q. Execution Protocol

1. Inspect repository state and produce file-impact inventory.
2. Verify each proposed target/quantity against the current simulation model.
3. Implement only the minimal Observation boundary.
4. Add focused tests before broad integration claims.
5. Run required tests and `git diff --check`.
6. Produce a Delivery Report containing evidence and exact commit.
7. Stop on any out-of-scope architectural discovery; do not expand the ticket autonomously.

## R. CSA RULING

**GO — MB-OBS-001 IMPLEMENTATION AUTHORIZED.**

Authorized scope is exactly the contract and acceptance criteria above. This GO does **not** authorize MB-MEASURE-001, MB-OBS-002, waveform/oscilloscope work, or unrelated refactoring.

**Implementation must stop and request a new CSA ruling if the existing simulation model cannot support a required V1 semantic without introducing new physical/solver behaviour.**
