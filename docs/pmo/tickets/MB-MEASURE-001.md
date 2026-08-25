# MB-MEASURE-001 — Reference Measurement Instrument

**PMO Status:** IMPLEMENTED — GO transmis hors document le 2026-08-23 (voir §U, mise à jour post-implémentation, et le Delivery Report)
**Phase:** 2 — Instrumentation & Observability (Level 1, Capacity L1-E — Measurement)
**Blueprint:** `docs/pmo/blueprints/MB-MEASURE-001-reference-measurement-instrument-blueprint.md`
**Prerequisite:** `MB-OBS-001` — Canonical Observation Contract (DONE)
**Next:** `MB-OBS-002` — Temporal Observation Extension
**Implementation scope:** Livré — voir `docs/pmo/delivery-reports/MB-MEASURE-001-delivery-report.md`. Périmètre exact : sections C–H et Q de ce ticket, inchangé par le GO.

## A. Objective

Introduce the first user-facing measurement capability of MYBlab: an instrument able to present `VOLTAGE` and `CURRENT` values already qualified by the `MB-OBS-001` Observation contract, without accessing Simulation internals directly.

MB-MEASURE-001 does not extend the solver, does not introduce new physics, and does not redefine an existing electrical convention. It exploits the boundary `MB-OBS-001` already established.

## B. Architectural Contract

```text
Simulation
    ↓
Observation Contract
    ↓
Instrument (Measurement)
    ↓
Presentation
```

This ticket inherits, and does not renegotiate, the boundary rule already ruled by `MB-OBS-001`: Presentation-facing code MUST NOT bypass Observation to reach `resolveSignals()`, `dcAnalysis`, `pinSignals`, or solver registries directly.

## C. V1 Supported Surface

### Targets

- `PIN` is the primary V1 target.
- `NET` is usable only where Observation already exposes an unambiguous net-level value.
- `COMPONENT` and `BRANCH` are out of scope for this ticket.

### Modes

V1 is limited to two measurement modes:

- `VOLTAGE`;
- `CURRENT`.

No other physical quantity may be introduced by this ticket.

## D. Voltage Semantics — inherited, not extended

A voltage measurement means the potential of the target relative to the simulation's canonical reference, exactly as defined by `MB-OBS-001`:

```text
Vmesure(target) = V(target) − V(reference canonique)
```

Differential voltage between two independently selected targets (`V(A) − V(B)`) is **out of scope**. This is not a V1 gap to fill; it is an explicit exclusion already recorded in `MB-OBS-001`.

MB-MEASURE-001 MUST NOT introduce a second-target selection mechanism to compute a differential value.

## E. Current Semantics — inherited, not extended

MB-MEASURE-001 does not redefine current. It requests `CURRENT` from the Observation contract for a `target`/`time` pair and accepts only the canonical current already produced by Simulation, exactly as scoped by `MB-OBS-001`.

If Observation reports no canonical current for the target, the result is `UNAVAILABLE` — never approximated or recomputed by Measurement.

## F. Polarity / Direction

- **Voltage:** referenced to the simulation's canonical reference; no new differential polarity is introduced.
- **Current:** the instrument displays the sign/direction convention Simulation already establishes; it does not transform, invert, or reinterpret it.

**Rule:** Measurement presents an existing semantic; Measurement does not create new physics.

## G. Target Granularity

```text
             MB-MEASURE-001
                   │
                   ▼
              Observation
          ┌────────┴────────┐
          │                 │
         PIN               NET
          │                 │
       allowed        only if Observation
                       reports it unambiguous
```

No new `BRANCH` abstraction may be introduced by this ticket.

## H. Functional Contract

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

The result MUST stay compatible with `ObservationResult` as defined by `MB-OBS-001`. This ticket MUST NOT create a second, parallel result protocol.

### Minimal UI Demonstration Scope

MB-MEASURE-001 requires exactly one minimal user-facing demonstration of the instrument — no more:

- selecting `VOLTAGE` or `CURRENT`;
- selecting a target among those V1 supports (section C);
- triggering/reading the measurement;
- displaying `value` + `unit` + `status`/`reason`.

This is the entire authorized UI surface. It is not an entry point for a general UX initiative: visual polish, complex layout, generic instrumentation panels, an oscilloscope, a measurement history, waveform display, or 3D presentation are explicitly out of scope (see section P), regardless of how small they may seem during implementation.

## I. Status Semantics

Measurement reuses the status vocabulary already established by `MB-OBS-001`, without redefining it:

- `VALID` — the requested measurement was resolved through Observation.
- `UNAVAILABLE` — the request is well-formed, but Simulation/Observation cannot currently provide the quantity (e.g. no canonical current for the target).
- `INVALID` — the request itself cannot be interpreted as a valid measurement request: an unknown/malformed target identifier, or an explicitly unsupported target kind. This is exactly the `INVALID` semantic already defined by `MB-OBS-001` (section H) — MB-MEASURE-001 introduces no new failure category.

`INVALID` MUST be demonstrable as a distinct, explicit case — separate from `UNAVAILABLE` and separate from re-evaluation after a circuit change (see section N).

No value may ever be invented to satisfy a test or a missing case.

## J. Temporal Scope

MB-MEASURE-001 is **instantaneous only**. It receives `time` from the caller/Observation and never creates its own clock.

Forbidden inside this ticket's scope:

```text
Date.now()
performance.now()
setTimeout()
setInterval()
```

Waveform sampling, temporal series, and oscilloscope rendering belong to `MB-OBS-002` and are explicitly excluded here.

## K. Determinism

For identical document state, identical simulation configuration, identical simulated time, and an identical request:

```text
MeasurementResult₁ === MeasurementResult₂  (semantically)
```

This is inherited directly from the determinism guarantee already imposed by `MB-OBS-001`; Measurement MUST NOT introduce a second clock or any non-deterministic input.

## L. Responsibilities

### Simulation
Owns physical/logical resolution, solver internals, simulation time, and the physical conventions already established.

### Observation (`MB-OBS-001`, unchanged by this ticket)
Owns request/result semantics, normalization, explicit quantity/unit/status, and the stable Simulation/Presentation boundary.

### Measurement (this ticket)
Owns translation of a user-facing measurement intent (`instrument`, `mode`, `target`) into an `ObservationRequest`, and presentation of the returned `ObservationResult` as a `MeasurementResult`. Measurement owns no physics and no solver access.

### Presentation
Owns instrument UI, interaction, display, and formatting. Presentation MUST NOT access Simulation internals directly, even through Measurement.

## M. Document Boundary

Performing a measurement MUST NOT mutate the circuit Document. No persistent measurement state may be introduced into the Document by this ticket.

## N. Required Evidence

### Architecture
1. Instrument code reaches Simulation only through the Observation contract.
2. No new physical equation or solver access exists anywhere in the changed code.
3. Existing voltage/current conventions are unchanged.

### Behaviour
Tests MUST cover at least:
1. valid `VOLTAGE` measurement on a supported PIN (`MEASURE-E2E-001`);
2. valid `CURRENT` measurement where Observation supplies a canonical current (`MEASURE-E2E-002`);
3. `CURRENT` requested where no canonical current exists → `UNAVAILABLE` with explicit reason (`MEASURE-E2E-003`);
4. malformed/unknown target, or an explicitly unsupported target kind → `INVALID` with explicit reason, demonstrably distinct from `UNAVAILABLE` (`MEASURE-E2E-004`);
5. measurement re-evaluated correctly after the circuit is modified — no stale cached value presented as current (`MEASURE-E2E-005`);
6. deterministic repeated measurement at an unchanged simulation time and state.

### Integration
A Measurement instrument MUST be demonstrable end-to-end (create circuit → simulate → measure → read `VOLTAGE`/`CURRENT`/`UNAVAILABLE`) without the user ever needing to know `resolveSignals()`, `dcAnalysis`, `pinSignals`, or `dcContributionRegistry` exist.

### Traceability
The eventual Delivery Report must identify exact files changed, tests executed, and the integration commit — per `SPEC-PMO-004`.

## O. Allowed Files / Scope Rule (for the future implementation ticket)

Once authorized, the implementation is limited to:

- a minimal Measurement module consuming the Observation contract exclusively;
- focused unit/integration tests for that module;
- architecture tests protecting the Observation/Measurement/Presentation boundary;
- narrowly scoped PMO/technical documentation required by this contract.

Any file outside this list requires explicit CSA approval before modification. This ticket itself authorizes no code change.

## P. Explicit Non-Goals

Beyond the Minimal UI Demonstration Scope defined in section H, MB-MEASURE-001 MUST NOT:

- introduce differential voltage measurement between two independently selected targets;
- let the user freely select two arbitrary references;
- introduce a new branch-current concept;
- introduce a new current sign convention;
- build an oscilloscope;
- implement waveform rendering or sampling;
- keep a measurement history;
- touch breadboard or 3D presentation concerns;
- touch the Arduino E2E surface;
- introduce a second clock;
- refactor Simulation;
- refactor Core;
- modify HistoryManager, HistoryService, Document persistence, or CF3.

## Q. Acceptance Criteria

| ID | Criterion | Verdict expected |
|---|---|---|
| AC-01 | Instrument consumes Observation only | mandatory |
| AC-02 | No direct access to the solver | mandatory |
| AC-03 | `VOLTAGE` measurement functional on a supported target | mandatory |
| AC-04 | `CURRENT` measurement functional when available | mandatory |
| AC-05 | Explicit `V` / `A` units | mandatory |
| AC-06 | `VALID` correctly presented | mandatory |
| AC-07 | `UNAVAILABLE` correctly presented | mandatory |
| AC-08 | `INVALID` correctly presented | mandatory |
| AC-09 | Simulated time preserved (no wall-clock) | mandatory |
| AC-10 | No Document state mutated by a measurement | mandatory |
| AC-11 | Determinism demonstrated | mandatory |
| AC-12 | Re-evaluation after circuit change demonstrated | mandatory |
| AC-13 | No physics duplicated inside Measurement | mandatory |
| AC-14 | End-to-end user scenario demonstrated | mandatory |
| AC-15 | Unit, architecture, and integration tests present | mandatory |
| AC-16 | Delivery Report complete per `SPEC-PMO-004` | mandatory |
| AC-17 | No out-of-scope file modified | mandatory |

Traceability to the end-to-end scenarios in the Blueprint (§R): AC-03/AC-06 ↔ `MEASURE-E2E-001`; AC-04/AC-06 ↔ `MEASURE-E2E-002`; AC-07 ↔ `MEASURE-E2E-003`; AC-08 ↔ `MEASURE-E2E-004`; AC-12 ↔ `MEASURE-E2E-005`.

## R. Dependencies

- `MB-OBS-001` (canonical Observation contract) — direct, mandatory dependency.
- Existing Simulation results (`pinSignals`, supported DC analysis outputs), reached only through Observation.
- Existing deterministic simulation time mechanism, read-only.

No new dependency on a UI framework, external measurement library, or wall-clock service is permitted.

## S. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Instrument conflated with the engine | CRITICAL | Enforce `Instrument → Observation → Simulation`; never `Instrument → Simulation internals`. |
| R2 | Current re-invented at the Measurement layer | CRITICAL | Measurement consumes only the canonical current Observation already returns. |
| R3 | V1 voltage silently turned into differential voltage | CRITICAL | Differential voltage stays explicitly out of scope, per `MB-OBS-001`. |
| R4 | Solver modified to make the instrument "more realistic" | CRITICAL | STOP → new CSA ruling → new ticket if justified. |
| R5 | UI built before the contract is proven | HIGH | Contract and integration tests land before visual polish. |

## T. Execution Protocol (once authorized)

1. Produce a file-impact inventory before editing anything.
2. Verify each proposed target/mode against what Observation actually returns today.
3. Implement only the minimal Measurement module.
4. Add focused tests before any end-to-end integration claim.
5. Run required tests.
6. Produce a Delivery Report per `SPEC-PMO-004`.
7. Stop immediately and request a new CSA ruling on any of the conditions listed in the Blueprint's STOP Conditions section.

## U. CSA Ruling

**NO-GO — IMPLEMENTATION NOT AUTHORIZED.** *(ruling initial, 2026-08-23 matin — voir mise à jour ci-dessous)*

This ticket and its Blueprint are authorized to exist as framing artifacts only. Authorized next steps are: (1) read-only audit of Ticket + Blueprint, (2) audit report returned to CSA, (3) a subsequent, explicit CSA GO/NO-GO ruling on implementation.

This ruling does **not** authorize any code change, any new file under `frontend/src/measurement/`, or any modification to `MB-OBS-001`'s already-ruled semantics.

### Mise à jour post-implémentation (2026-08-23, soir)

Un GO explicite a été transmis hors de ce document, via la mission d'implémentation PMO qui a produit `docs/pmo/delivery-reports/MB-MEASURE-001-delivery-report.md` (résultat consigné : « MB-MEASURE-001 — IMPLEMENTED »). Ce GO couvre exactement le périmètre déjà cadré aux sections C à H et Q de ce ticket, tel que corrigé par l'audit Qwen du même jour (voir §V) ; il n'étend ni ne renégocie aucune sémantique déjà tranchée par `MB-OBS-001`.

Le NO-GO ci-dessus reste la trace historique de la décision de cadrage initiale du matin du 2026-08-23 ; il est **superseded** par ce GO ultérieur du même jour, sans réécriture de l'historique — conformément au principe déjà appliqué ailleurs dans ce dépôt (cf. `docs/roadmaps/amendments/2026-08-22-platform-roadmap-reconciliation.md`, §3 : « un état technique intégré ne doit plus rester invisible dans la roadmap »).

**Statut effectif à partir de cette mise à jour : GO — MB-MEASURE-001 IMPLEMENTED**, sous réserve stricte du périmètre déjà livré (voir Delivery Report §B/§N pour la liste exacte des fichiers).

## V. Amendment Log

| Date | Reason | Change |
|---|---|---|
| 2026-08-23 | Qwen read-only audit — VALIDÉ SOUS RÉSERVES MINEURES | Reserve 1: made `INVALID` explicitly distinct and testable, separate from `UNAVAILABLE` and from re-evaluation/regression (sections H, I, N, Q). Reserve 2: added the Minimal UI Demonstration Scope (section H) and reinforced it is not a general UX authorization (section P). |
| 2026-08-23 (soir) | GO transmis hors document via la mission d'implémentation PMO ; Delivery Report produit le jour même | Statut du ticket passé de NO-GO à IMPLEMENTED (§U, "Mise à jour post-implémentation"). Aucun changement de périmètre : le GO couvre exactement les sections C–H et Q telles que corrigées par l'audit Qwen ci-dessus. |
| 2026-08-25 | Régularisation de gouvernance CSA — correction de l'incohérence entre ce ticket (resté NO-GO) et le Delivery Report (IMPLEMENTED) déjà publié | Mise à jour de l'en-tête PMO Status, de `Implementation scope`, et ajout de la section "Mise à jour post-implémentation" en §U. Aucune section C–T modifiée ; aucun changement de périmètre technique. |

Ce ticket n'est plus un artefact de cadrage seul : il documente désormais une implémentation livrée. Le ruling NO-GO initial (2026-08-23 matin) est conservé ci-dessus comme trace historique, mais **n'est plus le statut en vigueur** — voir "Mise à jour post-implémentation".
