# MYBlab — Level 1 Capability Matrix

## Purpose

This is the planning bridge between strategic gaps and executable work. It must prevent the team from rediscovering the next ticket after every integration.

Status values are deliberately conservative until scenario evidence exists.

| Capability | Current reading | Level 1 target | Primary gap | Key dependencies to confirm | Required proof | Scenario |
|---|---|---|---|---|---|---|
| Workspace/canvas | S1/S2 | S3 | Product completeness | Presentation, Document, mutation | End-to-end workspace evaluation | A,J |
| Navigation/select/edit | S1/S2 | S3 | Workflow robustness | Selection, pointer, history | Interaction + integration evidence | J |
| Component library | S1/S2 | S3 | Representative coverage | Registry, renderers, electrical models | Representative circuits | A,B,G |
| Component manipulation | S2 candidate | S3 | Product proof | CF3, validation, history | Placement/move/undo workflow | A,J |
| Wiring | S2 candidate | S3 | Complete authoring proof | ADD_WIRE, validation, geometry | Representative circuits | A,D |
| Wire routing | S2 candidate | S3 | Interaction/evidence | Waypoints, presentation, Document | Routing workflow | A,J |
| Breadboard/workbench | S0/S1 | S3 | Physical/logical assembly model | Connectivity model, placement, simulation, validation | Breadboard scenario | D |
| Static simulation | S2 | S3 | Product exposure/correctness evidence | Solver, registry, UI mapping | Representative circuit suite | A,E |
| Dynamic/PWM | S1/S2 | S3 | User observation | Scheduler/signals, presentation, instrument path | Dynamic scenario | C,F |
| Visual simulation feedback | S1/S2 | S3 | State-to-user mapping | Simulation → Presentation boundary | Observable UI evidence | A,B,C |
| Voltage/current measurement | S0/S1 | S3 | Instrument workflow | Simulation observation contract, probes, presentation | Instrument scenario | E |
| Waveform/oscilloscope | S0/S1 | S3 | Temporal observation | Signal sampling/timebase/instrument UI | Oscilloscope scenario | F |
| Embedded/Arduino | S1/S2 | S3 | End-to-end integration proof | Runtime, pins/signals, simulation, UI | Embedded scenario | G |
| Save/reopen lifecycle | Unknown | S3 | Explicit audit/evidence | Document serialization/storage/versioning | Reopen scenario | I |
| Failure/recovery | Unknown | S3 | User-facing diagnostics | Validation, simulation errors, UI | Negative/recovery suite | H |
| UX coherence | Not certified | S3 | Cross-workflow consistency | All essential workflows | Guided product evaluation | A-J |
| Performance | Not certified | S3 | Representative workload evidence | Rendering/simulation/state | Performance acceptance scenarios | cross-cutting |
| Accessibility/clarity | Not certified | S3 | Understandable controls/states | Presentation/UX | UX review | cross-cutting |
| 3D/spatial lab | Future | Not Level 1 | N/A | Future Level 3 architecture | Future evidence | Level 3 |

## Dependency interpretation

A visible gap is not automatically the next implementation. For every row the planning order is:

```text
Capability gap
 → user outcome
 → evidence gap
 → technical dependency
 → architectural dependency
 → governance dependency
 → existing reusable foundation
 → smallest safe work package
```

## Ticket mapping rule

Phase 2 must add explicit ticket/work-package references to this matrix. No implementation ticket should exist without at least one capability row and acceptance scenario, except pure governance/maintenance work with an explicit enabling dependency.

## Readiness rule

A capability is not promoted to S3 because code exists. Promotion requires Technical + Product + Evidence readiness and a reproducible scenario.

## Parallelization rule

Work may proceed in parallel only when shared contracts are stable and the parallel streams cannot silently create competing mutation, simulation, persistence or presentation semantics.