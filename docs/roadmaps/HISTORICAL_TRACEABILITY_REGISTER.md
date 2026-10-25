# MYBlab — Historical Traceability Register

## Purpose

This register is the durable memory bridge between roadmap intent and repository reality. It must preserve successful, blocked, superseded, retrospective and incomplete-governance work rather than remembering only the latest ticket.

It does not replace Git history, tickets, ADRs or delivery reports. It indexes them.

## Canonical chain

```text
Roadmap objective
 → Capability
 → Ticket/specification
 → Ruling / ADR
 → Implementation
 → Tests
 → Commit
 → Integration
 → Delivery Report / evidence
 → Capability state
 → Successor
```

## Initial verified/reconciled entries

| Work | Nature | Decision / governance | Integration evidence | Current historical reading | Traceability gap |
|---|---|---|---|---|---|
| MB-CF2-001 | Registry contract/closure | ADR-012/ADR-014 + CSA gates | Closure recorded on main | CLOSED | No critical gap identified in Phase 1 audit |
| MB-CF3-002 | ADD_WIRE CF3 migration | CSA-CF3-002-ADD-WIRE-001 | implementation + delivery report on main | CLOSED | None material identified |
| MB-CF3-003 | MOVE_COMPONENT CF3 migration | CSA-CF3-003-MOVE-001 | commit 918b392 integrated on main | Technically integrated | Formal delivery report/status reconciliation required |
| MB-VIS-002 | Renderer regularization | Retrospective PMO trail | a9064d8 + delivery artifacts | Delivered; strategic attachment unresolved | EXP-VIS acceptance/rejection unresolved |
| MB-VIS-004 | Reactive wire visualization | EXP2 arbitration / ADR references | merge 1575738 on main | VALIDATED/INTEGRATED | Roadmap state must reflect delivery |
| MB-VIS-005 | Persistent waypoint routing | ADR-008 amendment + CSA reprise | f8f5944 on main | Integrated | Formal delivery report missing; audit artifacts existed outside tracked history |
| MB-004.7 | Legacy move history | Historical pre-current-PMO work | 4779d00 on main | Historical guarantee preserved by CF3-003 | Mark as superseded mechanism, preserved behavioural guarantees |
| A2-BUTTON-LATCHING | Historical component feature | Pre-current-PMO ticket | 8eb723f on main | CLOSED | Retain as historical format |
| MB-HOOK-001 | Attempted integration layer | Explicitly blocked | No delivery commit | BLOCKED historical path | Record relationship to later CF3 architecture only if formally ruled |
| MB-SIM-002..012 | Simulation program | Sequencing roadmap + commits | integrated commits on main | Delivered technical sequence | Individual PMO ticket/report trail largely absent |
| MB-SIM-013 | PWM signal architecture | ADR/commit evidence | 2b18227 on main | Integrated | Missing individual PMO ticket/report |
| MB-SIM-014A | PWM frequency configuration | Commit evidence | ecb4263 on main | Integrated | Missing individual PMO ticket/report |
| MB-SIM-014 | PWM runtime | Commit evidence | ac437ec on main | Integrated | Missing individual PMO ticket/report |
| MB-SIM-015 | Passive DC network | Commit evidence | 8f09042 on main | Integrated | Missing individual PMO ticket/report |

## Status vocabulary

Use explicit historical states:

- PROPOSED
- READY
- IN PROGRESS
- BLOCKED
- IMPLEMENTED
- INTEGRATED
- CLOSED
- SUPERSEDED
- ABANDONED
- RETROSPECTIVELY REGULARIZED
- TRACEABILITY INCOMPLETE

A superseded item must remain visible. Its replacement must be named.

## Retrospective regularization rule

Do not fabricate historical tickets as if they existed before implementation. When governance artifacts are missing, record:

- what is factually proven by Git/code/tests;
- what governance artifact is absent;
- whether retrospective documentation is worth creating;
- whether the missing artifact has any current architectural consequence.

## Delivery closure fields

Future entries should capture at minimum:

- Work/Ticket ID;
- capability/epic;
- objective;
- predecessor/dependencies;
- ruling/ADR;
- implementation commit;
- integration commit/branch;
- test/evidence references;
- delivery report;
- final status;
- supersedes/is superseded by;
- capability debt affected;
- expected successor.

## Maintenance trigger

Update this register whenever an implementation is integrated, a ticket is blocked/abandoned/superseded, a retrospective governance decision is made, or roadmap reconciliation changes the interpretation of past work.