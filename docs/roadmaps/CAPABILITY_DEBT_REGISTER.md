# MYBlab — Capability Debt Register

## Definition

Capability Debt is the gap between technical work already implemented and the complete user capability that the product still cannot demonstrate.

It is distinct from technical debt.

```text
Technical foundation exists
        +
User workflow incomplete or unproven
        =
Capability Debt
```

The purpose of this register is to prevent MYBlab from accumulating sophisticated subsystems without converting them into Level 1 product value.

## Initial register

| ID | Existing foundation | Unfinished product capability | Level 1 impact | Evidence needed | Initial severity |
|---|---|---|---|---|---|
| CD-001 | Simulation pipeline through passive DC work | Complete construct→simulate→observe workflow not certified | A,E | End-to-end circuit scenarios | Critical |
| CD-002 | PWM/dynamic simulation foundations | User-visible temporal observation incomplete/unproven | C,F | Dynamic + waveform scenarios | Critical |
| CD-003 | Component/rendering infrastructure | Representative component workflow/coverage not benchmark-certified | A,B,G | Product inventory + representative scenarios | High |
| CD-004 | ADD_WIRE + waypoints + reactive visualization | Complete benchmark-level wiring/routing experience not certified | A,D,J | Wiring/routing workflow | High |
| CD-005 | CF3/history foundations including MOVE_COMPONENT | Product-level editing/history workflow needs scenario certification | J | Multi-object scenario | Medium |
| CD-006 | Embedded/Arduino foundations | Circuit→program/runtime→observable behaviour not certified | G | Embedded end-to-end scenario | Critical |
| CD-007 | Validation architecture | User-facing invalid-circuit diagnosis/recovery not certified | H | Recovery scenarios | High |
| CD-008 | Document/project foundations | Save/reopen/continue lifecycle not explicitly certified | I | Lifecycle scenario | High |
| CD-009 | Electrical solver/state data | Voltage/current instrument workflow absent/unproven | E | Measurement scenario | Critical |
| CD-010 | Canvas/product presentation foundations | Breadboard/workbench assembly model absent/unproven | D | Breadboard scenario | Critical |

## Severity meaning

- Critical — blocks an essential Level 1 scenario or laboratory identity.
- High — materially prevents benchmark-ready coherence or robustness.
- Medium — meaningful gap, but not necessarily the first dependency to close.
- Low — polish or optimization that does not currently block Level 1.

Severity is not execution priority. Dependencies may require a lower-severity enabling item first.

## Lifecycle

Each debt item must eventually be linked to:

- capability matrix row;
- relevant roadmap epic/program;
- technical and architectural dependencies;
- ticket/work package(s);
- acceptance scenario;
- evidence;
- integration commit;
- closure decision.

## Closure rule

Capability Debt is closed only when the user capability is demonstrated, not merely when another subsystem or API is implemented.

Example:

```text
Oscilloscope API implemented        → debt remains open
Oscilloscope renders a trace        → debt may remain open
User completes waveform scenario F  → debt can be closed
```

## Maintenance rule

Phase 2 should refine this register from repository evidence. Future delivery reports should state whether they create, reduce, close or leave unchanged any Capability Debt item.