# MB-OBS-002 — Temporal Observation & Deterministic Sampling

**PMO Status:** CSA REVIEW READY — NO IMPLEMENTATION GO  
**Phase:** 2 — Instrumentation & Observability  
**Blueprint:** `docs/pmo/blueprints/MB-OBS-002-temporal-observation-blueprint.md`  
**Prerequisite:** MB-OBS-001 closed; MB-MEASURE-001 integrated; temporal runtime/PWM infrastructure existing and verified by pre-implementation audit  
**Implementation scope:** Observation temporal boundary only

## A. Objective

Extend the canonical Observation boundary established by MB-OBS-001 from instantaneous observation to deterministic temporal observation.

The ticket MUST reuse the existing simulated-time and runtime infrastructure. It MUST NOT create a second **time mechanism**, duplicate the solver, or move temporal sampling responsibility into Measurement or Presentation.

## B. Architectural Contract

```text
SimulatedClock / Scheduler
          ↓
RuntimeOrchestrator / runtime signals
          ↓
Observation temporal layer
          ↓
Temporal Observation Series
          ↓
Measurement / future temporal instruments
          ↓
Presentation
```

The existing MB-OBS-001 instantaneous contract remains valid and MUST remain usable.

## C. Scope IN

1. Deterministic temporal Observation.
2. Explicit sampling request semantics.
3. Explicit temporal window semantics.
4. Ordered temporal series result.
5. Reuse of the existing `SimulatedClock` / `Scheduler` implementation as the canonical simulation-time mechanism.
6. Consumption of runtime-produced `externalSignals` where required to observe time-dependent signals.
7. Observation of the existing PWM runtime as the reference temporal scenario.
8. Architecture, behavioural, determinism, and non-regression tests.
9. Focused PMO documentation and delivery evidence.

## D. Scope OUT

This ticket MUST NOT:

- build an oscilloscope UI;
- render waveforms;
- build charting/visualization components;
- move sampling responsibility into Measurement;
- introduce a second time mechanism or alternate clock implementation;
- use `Date.now()`, `performance.now()`, browser timers, or wall-clock scheduling for simulation time;
- create a second solver or duplicate signal-resolution logic;
- introduce new physical equations merely to support temporal Observation;
- expose raw `PwmSignal` objects or add PWM introspection APIs;
- refactor the global simulation runtime;
- modify CF3 mutation/history architecture;
- modify Document persistence semantics;
- change the canonical Registry;
- introduce unrelated component behaviour.

## E. Temporal Request Contract

The temporal contract MUST define, at minimum:

```text
TemporalObservationRequest
  target
  quantity
  startTime
  endTime
  samplePeriod
```

Required rules:

- `startTime` and `endTime` use simulation time units already established by the runtime;
- `startTime <= endTime`;
- `samplePeriod` is finite and strictly positive;
- sampling points are deterministic and ordered;
- no wall-clock source is permitted;
- invalid temporal requests return an explicit contract error/status and MUST NOT partially mutate state.

Sampling points are `startTime + n * samplePeriod` while the next point is `<= endTime` under the approved numeric tolerance. `endTime` is included only when it lies on the sampling grid; no artificial off-grid endpoint sample is added.

## F. Temporal Result Contract

Conceptual shape:

```text
TemporalObservationResult
  target
  quantity
  unit
  startTime
  endTime
  samplePeriod
  samples[]
  status
  reason?
```

Each sample MUST contain at least:

```text
{ time, value, status, reason? }
```

The **global** `status` describes validity of the temporal request/overall execution. Per-sample `status` describes availability at that exact simulation time. An unavailable sample MUST NOT silently disappear from the requested time grid.

The result MUST preserve sample ordering and simulation-time semantics. No unexplained `null` is an availability protocol.

## G. Runtime Integration

The implementation MUST consume the existing runtime time/signal path rather than recreate it.

In particular:

- `SimulatedClock` remains the canonical source/mechanism of simulation time;
- `Scheduler` remains responsible for advancing simulation time;
- existing runtime signal evaluation MUST be reused;
- existing `externalSignals` support in signal resolution MUST be consumed where required;
- Observation MUST NOT expose raw PWM internals;
- existing `resolveSignals()` semantics MUST remain authoritative for final signal interpretation.

### G.1 Runtime ownership ruling

The current repository has **no production live instance** of `Scheduler`/`RuntimeOrchestrator` wired into the application flow. Therefore MB-OBS-002 MUST NOT be designed around mutating an ambient/live Scheduler.

For a temporal request, the implementation MAY instantiate a **local, request-scoped, disposable instance of the existing `Scheduler` and `RuntimeOrchestrator` classes**, using the same canonical `SimulatedClock` mechanism, provided that:

1. no alternate time source or second clock implementation is introduced;
2. the instance is created only within the request scope (or explicitly injected by an approved caller);
3. it is never stored as global/shared ambient state;
4. it is never returned as persistent application state;
5. it does not mutate any live simulation state;
6. identical inputs produce identical results;
7. the implementation reuses existing `advance()`, runtime evaluation, and `externalSignals` composition APIs rather than duplicating them.

This is an **instance-isolation rule**, not permission to create a second simulation-time mechanism.

## H. MB-OBS-001 Compatibility

MB-OBS-001 is already delivered and its instantaneous contract MUST remain valid.

The preferred implementation boundary is a **new dedicated temporal Observation module** under `frontend/src/observation/`, leaving the public `observe()` contract unchanged.

If runtime signal consumption cannot be achieved without touching `observationContract.js`, the only currently approved exception is a **strictly additive internal/exported helper or optional `externalSignals` pathway** that reuses the existing Observation logic without changing the semantics or signature of the existing public `observe()` call. The implementer MUST prove this necessity in the file-impact inventory before editing.

No unrelated refactor of MB-OBS-001 is authorized.

## I. Determinism / Time Integrity

For identical:

- circuit Document state;
- simulation configuration;
- temporal request;
- initial simulation time;
- runtime inputs;

MB-OBS-002 MUST produce the same ordered semantic series.

The implementation MUST NOT depend on:

- wall-clock time;
- asynchronous browser timers;
- `requestAnimationFrame`;
- implicit real-time scheduling;
- random sampling.

A temporal architecture test MUST protect the canonical single-time-mechanism invariant and the absence of real-time sampling dependencies.

## J. PWM Reference Scenario

The reference temporal scenario is an already-supported PWM signal.

The ticket MUST prove that an existing PWM signal can be observed at multiple deterministic simulation times through the existing runtime path.

The implementation MUST NOT add a new PWM model or expose the underlying `PwmSignal` object.

## K. Document Integrity

Temporal observation MUST be read-only with respect to the circuit Document.

Sampling MUST NOT persist measurement history into the circuit Document.

The request-scoped runtime objects described in G.1 MUST also be discarded after the request and MUST NOT become persistent application state.

## L. Required Evidence

### Architecture

1. One canonical simulation-time mechanism remains in use.
2. Temporal Observation does not create a second simulation-time implementation, solver, or ambient runtime state.
3. Observation consumes runtime-produced signals through an approved boundary.
4. Measurement remains an adapter/consumer and does not own sampling.
5. Presentation remains outside the temporal engine.
6. Runtime objects used for one request are request-scoped and disposable unless an approved caller explicitly owns them.

### Behaviour

Tests MUST cover at least:

1. valid temporal request;
2. invalid start/end range;
3. invalid sample period;
4. deterministic sample ordering;
5. exact sample-count/endpoint semantics;
6. empty or unavailable observation result semantics;
7. per-sample unavailable status semantics;
8. multi-sample observation of a PWM signal;
9. expected PWM transitions at deterministic simulation times;
10. repeated identical temporal requests producing identical series;
11. no circuit Document mutation;
12. preservation of MB-OBS-001 instantaneous behaviour.

### Architecture lock

Tests MUST fail if the temporal Observation implementation introduces:

- a second clock implementation or alternate time source;
- wall-clock sampling;
- browser timers;
- raw PWM introspection;
- direct Presentation access to solver internals;
- temporal logic inside Measurement;
- persistent ambient Scheduler/RuntimeOrchestrator state owned by Observation.

## M. Allowed Files / Scope Rule

Before editing, the implementer MUST produce a file-impact inventory.

Allowed changes are limited to:

- the minimal temporal Observation module/contract;
- the minimal adapter/composition required to consume existing runtime signals;
- focused temporal Observation tests;
- architecture tests protecting the temporal boundary;
- narrowly scoped PMO/technical documentation.

Any additional production file requires explicit CSA approval before modification.

## N. Acceptance Criteria

**AC-01 — Temporal contract**  
A documented and tested temporal Observation request/result contract exists.

**AC-02 — Deterministic sampling**  
A temporal request produces an ordered, deterministic series using simulation time only.

**AC-03 — Canonical time**  
No alternate time source or second simulation-time mechanism exists.

**AC-04 — Runtime signal integration**  
Observation can consume existing runtime-produced time-dependent signals through an approved boundary.

**AC-05 — PWM reference**  
An existing PWM signal can be observed at multiple deterministic simulation times and its transitions are correctly represented.

**AC-06 — No raw PWM exposure**  
The implementation does not add public `PwmSignal` introspection.

**AC-07 — Document integrity**  
Temporal sampling does not mutate persistent circuit Document state.

**AC-08 — MB-OBS-001 compatibility**  
Existing instantaneous Observation behaviour remains valid.

**AC-09 — Measurement boundary**  
Sampling is not moved into or duplicated by `measurementContract.js`.

**AC-10 — Presentation isolation**  
No temporal UI or waveform rendering is introduced.

**AC-11 — Test evidence**  
All required architecture and behavioural tests pass and exact commands/results are recorded in the Delivery Report.

**AC-12 — Scope integrity**  
No non-approved subsystem is modified.

## O. Dependencies

- MB-OBS-001 canonical Observation contract.
- MB-MEASURE-001 reference measurement instrument.
- Existing `SimulatedClock` / `Scheduler` infrastructure.
- Existing `RuntimeOrchestrator` / runtime integration.
- Existing `externalSignals` resolution path.
- Existing deterministic PWM runtime.

No external timing service, measurement library, or UI framework dependency is permitted.

## P. Execution Protocol

1. Synchronize repository and verify clean baseline.
2. Read MB-OBS-001, MB-MEASURE-001, relevant simulation/runtime contracts, and this ticket.
3. Produce a factual file-impact inventory.
4. Validate the temporal contract and endpoint/sample semantics against the Blueprint.
5. Implement only the approved temporal Observation scope.
6. Add focused tests before broad integration claims.
7. Run required tests, build, and `git diff --check`.
8. Produce a Delivery Report with exact evidence and integration commit.
9. Stop immediately on any architectural discovery requiring a new solver, alternate time mechanism, physical model, or out-of-scope subsystem; request CSA ruling instead.

## Q. CSA Gate

**Current decision: CSA REVIEW READY — NO IMPLEMENTATION GO.**

The runtime-ownership clarification in §G.1 and the Observation-boundary clarification in §H are now part of the approved pre-implementation perimeter.

This ticket defines the implementation perimeter. It does NOT authorize implementation until the corresponding Blueprint and CSA ruling are approved.

The future implementation must not be started from this document alone.
