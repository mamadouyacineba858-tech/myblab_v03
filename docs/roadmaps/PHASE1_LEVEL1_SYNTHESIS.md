# MYBlab — Phase 1 Strategic Synthesis

## Purpose

This document closes the analytical part of Phase 1 without selecting the next implementation ticket.

It answers two questions separately:

1. **Where are we?** — factual product, architecture, roadmap and traceability state.
2. **What must become true before Level 1 can be declared?** — capability and evidence requirements.

It is the bridge between the existing global audit and the future Phase 2 roadmap reconciliation.

## 1. Current strategic position

MYBlab has serious technical foundations and meaningful progress in Core, Presentation and Simulation. The repository nevertheless does **not** provide sufficient evidence to declare a Tinkercad-class Level 1 product.

The strategic position is therefore:

```text
Technical maturity       → significant
Architectural maturity   → advancing
Simulation maturity     → significant
Product maturity         → Level 1 not demonstrated
Laboratory maturity      → Level 1 not demonstrated
```

This is not a negative assessment of the engineering work. It is a correction of the unit of measurement: **the target is a usable electronic laboratory workflow, not a collection of completed technical tickets.**

## 2. What is already real

The current repository demonstrates, among other things:

- a functional circuit workspace/canvas foundation;
- component selection and manipulation;
- production visualization infrastructure and a growing renderer set;
- canonical CF3 mutation paths including `ADD_COMPONENT`, `ADD_WIRE`, `UPDATE_WIRE_WAYPOINTS` and `MOVE_COMPONENT`;
- undo/redo infrastructure and recent history integration;
- a structured simulation pipeline;
- progression through MB-SIM-015, including PWM and passive DC network capabilities;
- Arduino/embedded architectural direction;
- persistent wire waypoints and presentation-preview separation.

These capabilities are **foundations and partial product capabilities**, not a Level 1 certificate.

## 3. What is not yet demonstrated as a complete product capability

The critical missing evidence is concentrated around the laboratory experience:

### 3.1 Breadboard/workbench
A credible breadboard workflow is not demonstrated as a complete user capability.

The roadmap must therefore distinguish a true breadboard model from a visual breadboard renderer. The target includes connectivity semantics, placement, interaction, diagnosis and simulation integration.

### 3.2 Measurement
A credible voltage/current measurement workflow is not demonstrated.

This must be treated as a laboratory capability, not merely a future UI panel. The user must be able to place/use an instrument, interrogate a circuit and interpret the result.

### 3.3 Waveform observation
A user-facing oscilloscope/time-domain observation workflow is not demonstrated.

Internal signal computation is not equivalent to user-observable measurement.

### 3.4 End-to-end simulation experience
Simulation is technically advanced, but the repository evidence does not yet establish that representative users can construct, simulate, observe, diagnose and modify circuits through one coherent workflow.

### 3.5 Project lifecycle and recovery
Save/reopen continuity, understandable failure handling and recovery require explicit evidence before Level 1 closure.

### 3.6 Product coherence
The canvas, component system, wiring, simulation, embedded behaviour and future instruments must operate as one coherent environment rather than as isolated subsystems.

## 4. Level 1 benchmark model

Level 1 should mean:

> **A credible Tinkercad-class electronic design and simulation experience, validated by representative end-to-end user scenarios.**

It should not mean:

- visual similarity alone;
- number of components;
- number of passing unit tests;
- number of closed tickets;
- engine sophistication;
- presence of 3D.

Tinkercad is the **first benchmark**, not the final destination.

## 5. Three-level strategic trajectory

```text
LEVEL 1
Reach a credible Tinkercad-class baseline

        ↓

LEVEL 2
Surpass the benchmark with capabilities that are specifically valuable in MYBlab

        ↓

LEVEL 3
Evolve toward an advanced virtual electronics laboratory,
including justified spatial/3D capabilities
```

### Boundary rule

3D is **not a Level 1 requirement**. It belongs to the long-term Level 3 direction unless a future CSA ruling explicitly changes this boundary.

However, Level 1 architecture should avoid decisions that unnecessarily make a later spatial/3D evolution impossible.

## 6. Essential Level 1 scenarios

The roadmap should ultimately prove at least these workflows:

| Scenario | What it proves |
|---|---|
| Basic circuit | Component placement, wiring, simulation and visible result |
| Interactive circuit | Presentation ↔ simulation interaction |
| Dynamic circuit | Time-dependent behaviour becomes user-observable |
| Breadboard | Physical/logical workbench authoring capability |
| Measurement | User can interrogate electrical quantities |
| Waveform | User can observe and interpret temporal behaviour |
| Embedded | Arduino/program → circuit behaviour end-to-end |
| Recovery | Invalid circuit → understandable correction → continue |
| Lifecycle | Save → reopen → continue → simulate |
| Multi-object editing | Selection/move/edit + history guarantees in real workflow |

Level 1 should remain open until the essential scenarios are reproducibly executable and accepted by CSA.

## 7. Evidence rule

Evidence must be interpreted hierarchically:

```text
End-to-end reproducible workflow
        >
Integration test representing the workflow
        >
Validated UI evidence
        >
Underlying automated tests
        >
Source inspection
        >
Architecture documents
        >
Roadmap statements
```

A lower level of evidence cannot be used to claim a higher-level product result.

## 8. Capability readiness model

Every candidate capability should be classified on three independent axes:

| Axis | Question |
|---|---|
| Technical readiness | Can the architecture/software perform it? |
| Product readiness | Can a normal user perform and understand it? |
| Evidence readiness | Can the team prove it reliably? |

A capability should not be considered Level 1-ready until all three are sufficiently mature.

## 9. Roadmap correction required in Phase 2

The current roadmap must evolve from a primarily ticket-oriented reading toward a **capability-driven roadmap**.

The required planning chain is:

```text
Vision objective
   ↓
Level / benchmark
   ↓
Required capability
   ↓
Current maturity
   ↓
Evidence gap
   ↓
Technical dependency
   ↓
Architectural dependency
   ↓
Existing ticket/spec/ADR
   ↓
Missing governance artifact
   ↓
Candidate work package
   ↓
Acceptance evidence
```

This is the mechanism intended to prevent the recurring loss of time when the team finishes one ticket and must rediscover the next one from scratch.

## 10. Historical traceability correction required in Phase 2

The audit identified delivered work whose governance trail is incomplete, especially in the Simulation program and several older Core Foundation items.

The correction must preserve history rather than rewrite it.

The target traceability chain is:

```text
Roadmap objective
 → Capability
 → Ticket/specification
 → Ruling / ADR
 → Implementation
 → Tests
 → Commit
 → Integration
 → Delivery Report
 → Evidence
```

Where an old delivery has no PMO ticket, the roadmap should record it as **historical delivered work requiring retrospective traceability**, not pretend that it is a future ticket.

## 11. Phase 2 must answer the ordering problem

The next roadmap phase must not simply ask:

> What ticket has the smallest number?

It must ask:

> Which unresolved capability closes the greatest Level 1 gap with the least architectural risk, given its dependencies and available parallel work?

Candidate work must therefore be ranked against at least:

1. contribution to an essential Level 1 scenario;
2. dependency criticality;
3. architectural risk;
4. amount of reusable foundation created;
5. evidence impact;
6. ability to unblock other capabilities;
7. governance/traceability cost;
8. opportunity for safe parallelization.

## 12. What Phase 1 does not decide

Phase 1 does **not** select:

- the next ticket;
- the next implementation family;
- breadboard as automatically first;
- instruments as automatically first;
- 3D as an immediate target;
- a specific refactor solely because it is technically interesting.

Those decisions belong to Phase 2 after dependency and roadmap reconciliation.

## 13. Phase 1 conclusion

The project is no longer in the state where progress can be measured reliably by the canvas alone. The technical foundation is considerably richer than the visible product experience, but the product is still far from a demonstrated Level 1 electronic laboratory.

The strategic objective is now unambiguous:

> **Turn the existing technical foundation into a coherent, reproducible electronic-design and simulation workflow that reaches the Tinkercad benchmark; then use the same evidence-driven roadmap to exceed that benchmark and progress toward the advanced, realistic and eventually 3D MYBlab laboratory.**

Phase 2 should now be performed against this model.
