# MB-MEASURE-001 — Reference Measurement Instrument Blueprint

**Blueprint-ID:** `MB-MEASURE-001-blueprint`
**Ticket-ID:** `MB-MEASURE-001` (`docs/pmo/tickets/MB-MEASURE-001.md`)
**Phase:** 2 — Instrumentation & Observability (Level 1, Capacity L1-E — Measurement)
**Prerequisite:** `MB-OBS-001` — Canonical Observation Contract (DONE)
**Status:** CSA REVIEW READY — **NO IMPLEMENTATION GO**
**Date:** 2026-08-23
**Scope:** Observation → Measurement boundary only

Verifiability convention used below, per `SPEC-PMO-003`: `[FAIT]` = directly verified against the local repository state at `docs/pmo/blueprints` review time; `[ANALYSE]` = reasoned judgment; `[QUESTION OUVERTE]` = requires arbitration before this Blueprint can move to implementation-ready.

## §A. Identity & Status

| Field | Value |
|---|---|
| Blueprint-ID | `MB-MEASURE-001-blueprint` |
| Ticket-ID | `MB-MEASURE-001` |
| Status | `CSA REVIEW READY — NO IMPLEMENTATION GO` |
| Author | Claude — Repository Analyst |
| Depends on | `MB-OBS-001` (status: DONE) |
| Followed by | `MB-OBS-002` |

## §B. Level 1 Product Gap

`MB-OBS-001` [FAIT] already exists in the repository at `frontend/src/observation/observationContract.js`, and gives Presentation a canonical way to read already-produced Simulation results without touching solver internals. What is still missing is a *user-facing* instrument: nothing in the repository today lets a user express "measure `VOLTAGE`/`CURRENT` on this target" and get back a qualified value. [ANALYSE] The gap is therefore not a missing physical capability — Observation already exposes `VOLTAGE`/`CURRENT`/`LOGICAL_STATE` — it is the absence of a thin, Observation-only consumer that a user can actually operate.

## §C. User Scenario

```text
Create circuit
    ↓
POWER → supported component → GND
    ↓
Run simulation
    ↓
Create / activate instrument
    ↓
Select VOLTAGE or CURRENT
    ↓
Select target PIN
    ↓
Measurement
    ↓
Observation
    ↓
Simulation
    ↓
ObservationResult
    ↓
Instrument
    ↓
Value + unit + status shown to the user
```

The user must be able to read, for example:

```text
VOLTAGE
Target: <pin>
Value: <x>
Unit: V
Status: VALID
```

without ever needing to know that `resolveSignals()`, `dcAnalysis`, `pinSignals`, or `dcContributionRegistry` exist.

### Minimal UI demonstration scope (required, not more)

The user scenario above requires exactly four interactions, no more:

1. select `VOLTAGE` or `CURRENT`;
2. select a target among those V1 supports (§G);
3. trigger/read the measurement;
4. see `value` + `unit` + `status`/`reason` displayed.

[ANALYSE] This is the full authorized UI surface for MB-MEASURE-001. It is not an opening for a general UX/instrumentation initiative. Explicitly out of scope regardless of implementation convenience: visual polish, complex layout, a generic instrumentation panel, an oscilloscope, a measurement history, waveform display, or 3D presentation. This matches, and does not extend, the Ticket's Explicit Non-Goals (`docs/pmo/tickets/MB-MEASURE-001.md`, section P).

## §D. Functional Contract

### Request (conceptual shape)

```text
MeasurementRequest
  instrument
  mode        (VOLTAGE | CURRENT)
  target
  time
```

### Result (conceptual shape)

```text
MeasurementResult
  target
  quantity
  value
  unit
  time
  status
  reason?
```

[ANALYSE] This mirrors `ObservationRequest`/`ObservationResult` from `MB-OBS-001` closely enough that Measurement should be a thin adapter, not a parallel protocol. The Result MUST stay compatible with `ObservationResult`.

## §E. Voltage Semantics

Inherited without extension from `MB-OBS-001` [FAIT — `docs/pmo/tickets/MB-OBS-001.md`, section D]:

```text
Vmesure(target) = V(target) − V(reference canonique)
```

Differential voltage between two independently selected targets is out of scope for V1. This was already ruled by `MB-OBS-001` and is not reopened here.

## §F. Current Semantics

Inherited without extension from `MB-OBS-001` [FAIT — `docs/pmo/tickets/MB-OBS-001.md`, section E]: Measurement requests `CURRENT` for a target/time pair and accepts only the canonical current the simulation model already produces, with the existing sign/direction convention preserved. No canonical current → `UNAVAILABLE`, never approximated.

## §G. Target Granularity

- `PIN` — primary V1 target, allowed.
- `NET` — allowed only where Observation already reports an unambiguous value.
- `COMPONENT`, `BRANCH` — out of scope for this ticket.

[FAIT] This matches the target surface `MB-OBS-001` already implements (`observationContract.js` supports `PIN`/`NET` targets; `COMPONENT`/`BRANCH` are not implemented).

## §H. Observation Integration

```text
Simulation
  ├─ pinSignals
  └─ dcAnalysis / existing simulation results
        ↓
  Observation Contract        (frontend/src/observation/observationContract.js) [FAIT]
        ↓
  Measurement (this ticket)   — new module, not yet created
        ↓
  Presentation
```

[FAIT] `frontend/src/observation/observationContract.js` (12.7 KB) and its tests `frontend/src/observation/__tests__/observationContract.test.js` and `observationArchitecture.test.js` already exist and were last modified 2026-08-23, consistent with `MB-OBS-001`'s `DONE` status. Measurement's only integration point is this file's public contract — Measurement MUST NOT import `frontend/src/simulator/resolution.js`, `dcContributionRegistry.js`, or `canonicalRegistry.js` directly.

## §I. Measurement Result

The `MeasurementResult` shape (§D) must carry `target`, `quantity`, `value`, `unit`, `time`, `status`, and an optional `reason`, staying a direct pass-through/normalization of `ObservationResult` — not a second protocol.

## §J. Invalid / Unavailable

Status vocabulary reused as-is from `MB-OBS-001` — no new failure category is introduced:

- `VALID` — resolved successfully through Observation.
- `UNAVAILABLE` — well-formed request, but Simulation/Observation cannot currently supply the quantity (e.g. no canonical current for that target).
- `INVALID` — the request itself cannot be interpreted as a valid measurement request: an unknown/malformed target identifier, or an explicitly unsupported target kind (exactly `MB-OBS-001`, section H).

Two distinct required negative cases:

- **UNAVAILABLE:** requesting `CURRENT` on a target for which the model has no canonical current → `status = UNAVAILABLE` with an explicit reason (`MEASURE-E2E-003`).
- **INVALID:** requesting a measurement with a malformed/unknown target identifier, or a target kind explicitly not supported (e.g. `COMPONENT`/`BRANCH`) → `status = INVALID` with an explicit reason (`MEASURE-E2E-004`).

`INVALID` and `UNAVAILABLE` MUST remain observably distinct outcomes — a test asserting one MUST NOT also satisfy the other. No value may ever be invented to pass a test.

## §K. Simulation Time

Measurement is instantaneous only. It receives `time`, never generates it. Forbidden: `Date.now()`, `performance.now()`, `setTimeout()`, `setInterval()`, or any second clock. [FAIT] The repository already has a dedicated deterministic-time surface (`frontend/src/simulator/clock.js`, `scheduler.js`, and `frontend/src/simulator/__tests__/timeArchitecture.test.js`) that Measurement must not duplicate or bypass. Waveform/temporal sampling belongs to `MB-OBS-002`.

## §L. Determinism

For identical document state, identical simulation configuration, identical simulated time, and an identical request, two measurements must be semantically equal. This is inherited directly from the determinism guarantee `MB-OBS-001` already imposes on Observation; Measurement adds no new source of non-determinism.

## §M. Architecture Boundaries

### Simulation owns
Physical/logical resolution, solver internals, signal evaluation, simulation time, and the physical conventions already established.

### Observation owns (unchanged by this ticket)
Canonical request/result semantics, normalization, explicit quantity/unit/status, the stable Simulation/Presentation boundary.

### Measurement owns (this ticket)
Translating a user-facing measurement intent into an `ObservationRequest` and translating the returned `ObservationResult` into a `MeasurementResult`. No physics, no solver access.

### Presentation owns
Instrument UI, interaction, display, formatting. MUST NOT reach Simulation internals, even through Measurement.

## §N. File Impact Inventory

[FAIT] Confirmed present in the repository today (`frontend/src/`):

| File | Role | Status |
|---|---|---|
| `observation/observationContract.js` | Observation contract Measurement must consume | existing, read-only dependency |
| `observation/__tests__/observationContract.test.js` | Existing Observation behaviour tests | existing, read-only reference |
| `observation/__tests__/observationArchitecture.test.js` | Existing Observation boundary tests | existing, read-only reference |
| `simulator/preparation.js` | Upstream of Observation; not a direct Measurement dependency | existing, read-only |
| `simulator/resolution.js` | Upstream of Observation; forbidden direct dependency | existing, read-only, modification forbidden by default |
| `simulator/dcContributionRegistry.js` | Upstream of Observation; forbidden direct dependency | existing, read-only, modification forbidden by default |
| `simulator/canonicalRegistry.js` | Upstream of Observation; forbidden direct dependency | existing, read-only, modification forbidden by default |
| `simulator/clock.js`, `simulator/scheduler.js` | Authoritative simulation time; read/transmit only | existing, read-only |

[QUESTION OUVERTE] The exact file(s) to create under `frontend/src/measurement/` (module name, test file names) are **not decided by this Blueprint**. They are deferred to a dedicated implementation blueprint produced only after this cadrage Blueprint receives a CSA GO. Assuming a specific file layout now would pre-empt an arbitration this Blueprint is not authorized to make.

## §O. Allowed Files

Once (and only if) implementation is authorized:

- a minimal Measurement module consuming `observationContract.js` exclusively;
- focused unit/integration tests for that module, under a `measurement/__tests__/` path mirroring the `observation/__tests__/` convention already in use;
- architecture tests protecting the Observation/Measurement/Presentation boundary;
- narrowly scoped documentation required by this contract.

## §P. Forbidden Files

Modification forbidden by default, per inheritance from `MB-OBS-001`'s own forbidden list:

```text
frontend/src/simulator/resolution.js
frontend/src/simulator/dcContributionRegistry.js
frontend/src/simulator/canonicalRegistry.js
frontend/src/core/**
frontend/src/history/** (HistoryManager, HistoryService)
Document persistence / CF3 mutation architecture
```

If implementation discovers one of these must change, execution MUST stop and request a new CSA ruling rather than proceeding.

## §Q. Tests

Required coverage (behavioural, to be written only once implementation is authorized):

1. valid `VOLTAGE` measurement on a supported PIN (`MEASURE-E2E-001`);
2. valid `CURRENT` measurement where Observation supplies a canonical current (`MEASURE-E2E-002`);
3. `CURRENT` requested with no canonical current available → `UNAVAILABLE` with reason (`MEASURE-E2E-003`);
4. malformed/unknown target, or an explicitly unsupported target kind → `INVALID` with reason, observably distinct from case 3 (`MEASURE-E2E-004`);
5. re-evaluation after circuit modification — no stale value presented as current (`MEASURE-E2E-005`);
6. deterministic repeat at unchanged simulation time/state;
7. architecture test asserting Measurement imports only `observationContract.js` from the Simulation/Observation layer (mirroring `observation/__tests__/observationArchitecture.test.js`'s existing pattern [FAIT]).

## §R. End-to-End Scenario

Five scenarios are required, each proving a distinct status/behaviour and each mapped to a Ticket acceptance criterion (`docs/pmo/tickets/MB-MEASURE-001.md`, section Q).

**MEASURE-E2E-001 — VOLTAGE VALID:** create circuit → POWER → supported component → GND → run simulation → activate instrument → select `VOLTAGE` → select a supported target PIN → Measurement → Observation → Simulation → `ObservationResult` → Instrument → user reads `value`/`unit`/`status = VALID`. Proves AC-03, AC-06.

**MEASURE-E2E-002 — CURRENT VALID:** same flow with `CURRENT` on a target for which Simulation provides a canonical current → user reads `value`/`unit`/`status = VALID`. Proves AC-04, AC-06.

**MEASURE-E2E-003 — UNAVAILABLE:** request `CURRENT` on a target with no canonical current → Observation returns `UNAVAILABLE` with an explicit reason → the instrument shows "measurement unavailable", never an invented value. Proves AC-07.

**MEASURE-E2E-004 — INVALID:** request a measurement with a malformed/unknown target identifier, or an explicitly unsupported target kind (e.g. `COMPONENT`/`BRANCH`) → `status = INVALID` with an explicit reason. This scenario MUST be exercised independently from MEASURE-E2E-003 and MEASURE-E2E-005 — it proves the request itself is rejected, not that a value is momentarily unavailable or stale. Reuses the `INVALID` semantic already defined by `MB-OBS-001` (section H); no new failure category is introduced. Proves AC-08.

**MEASURE-E2E-005 — RE-EVALUATION / REGRESSION:** measure A on a target → modify the circuit → trigger a new resolution → measure B on the same target; B must reflect the new state, not a value cached from A. Proves AC-12.

## §S. Acceptance Criteria

See `docs/pmo/tickets/MB-MEASURE-001.md`, section Q (AC-01 through AC-17). This Blueprint does not restate them to avoid two sources of truth; any change to acceptance criteria must be made in the Ticket.

## §T. Risks

See `docs/pmo/tickets/MB-MEASURE-001.md`, section S (R1–R5): instrument/engine conflation, current re-invention, differential-voltage creep, solver modification for "realism", and UI-before-contract sequencing. All five are CRITICAL or HIGH and are the primary reason this Blueprint carries no implementation GO yet.

## §U. STOP Conditions

Implementation, once authorized, must stop immediately and request a new CSA ruling if:

1. a new physical equation appears necessary;
2. a new current convention appears necessary;
3. differential voltage becomes necessary;
4. direct solver access appears necessary;
5. a change to `resolution.js` appears necessary;
6. a change to the Document appears necessary;
7. a new clock appears necessary;
8. a file outside §O appears indispensable;
9. the Observation contract proves insufficient for a V1 need;
10. a result would need to be approximated to make a test pass.

In every case: STOP → factual report → CSA → decision. No autonomous scope expansion.

## §V. Evidence Requirements

| Proof | What must be demonstrated |
|---|---|
| P1 — Architecture | `Instrument → Observation → Simulation`, verified by an architecture test |
| P2 — Behaviour | `VALID` / `UNAVAILABLE` / `INVALID` states all exercised |
| P3 — User | A user can actually perform a measurement end-to-end |
| P4 — Integration | Simulation ↔ Observation ↔ Measurement ↔ Presentation demonstrated together |
| P5 — Traceability | Ticket → Blueprint → code → tests → Delivery Report → roadmap, all cross-referenced |

## §W. PMO Traceability

```text
P2-1
 └─ MB-OBS-001 ✅ DONE
     └─ MB-MEASURE-001
         ├─ Ticket:      docs/pmo/tickets/MB-MEASURE-001.md
         ├─ Blueprint:   docs/pmo/blueprints/MB-MEASURE-001-reference-measurement-instrument-blueprint.md  (this file)
         ├─ next:        read-only audit (Qwen), audit report to CSA
         ├─ then:        explicit CSA GO / NO-GO on implementation
         └─ followed by: MB-OBS-002
```

## §X. CSA Ruling

**CSA REVIEW READY — NO IMPLEMENTATION GO.**

Before any implementation GO, CSA must explicitly validate: (1) V1 target granularity, (2) V1 mode set (`VOLTAGE`/`CURRENT` only), (3) voltage reference semantics (inherited, not reopened), (4) current sign semantics (inherited, not reopened), (5) status/validity semantics, (6) simulation-time semantics, (7) the Measurement/Observation/Presentation boundary, (8) exact implementation scope including the still-open file layout under `frontend/src/measurement/` (§N), (9) required evidence (§V), and (10) the corresponding PMO ticket.

This Blueprint authorizes documentation and read-only audit activity only. It does not authorize any code change.

## Amendment Log

| Date | Reason | Change |
|---|---|---|
| 2026-08-23 | Qwen read-only audit — VALIDÉ SOUS RÉSERVES MINEURES | Reserve 1: §R rebuilt as five explicitly distinct scenarios (`MEASURE-E2E-001` VOLTAGE VALID, `-002` CURRENT VALID, `-003` UNAVAILABLE, `-004` INVALID, `-005` RE-EVALUATION/REGRESSION), each mapped to a Ticket AC; `INVALID` added to §Q Tests and clarified in §J as distinct from `UNAVAILABLE`. Reserve 2: added "Minimal UI demonstration scope" to §C, cross-referenced from the Ticket's Explicit Non-Goals. |

This amendment is documentation-only. §A/§X status is unchanged: **CSA REVIEW READY — NO IMPLEMENTATION GO.**
