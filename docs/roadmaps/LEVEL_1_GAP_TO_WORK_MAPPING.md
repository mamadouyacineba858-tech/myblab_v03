# MYBlab — Level 1 Gap → Work Mapping

## Purpose

This is the planning bridge between the capability audit and future PMO work.

It deliberately does **not** nominate a next ticket yet. Its purpose is to prevent the team from losing time rediscovering the same state after each delivery.

## Mapping model

```text
Current capability gap
        ↓
Existing Program / Epic
        ↓
Existing ticket / specification / ADR
        ↓
Dependency or prerequisite
        ↓
Governance gap
        ↓
Candidate work package
        ↓
PMO ticket
```

## Current Level 1 blockers

| Capability gap | What must be established before implementation selection | Current planning state |
| --- | --- | --- |
| Breadboard / workbench | Determine whether an existing Epic/specification already covers it; otherwise define the strategic owner and architectural boundary | OPEN — mapping required |
| Measurement instruments | Identify the instrument architecture, required simulation outputs and presentation boundary | OPEN — mapping required |
| Oscilloscope / waveform observation | Determine signal-observation contract and relationship with simulation/runtime | OPEN — mapping required |
| End-to-end UX coherence | Map existing Experience work and identify remaining benchmark-level gaps | OPEN — mapping required |
| Simulation → visible product behaviour | Map existing SIM capabilities to user-facing observation requirements | OPEN — mapping required |
| Embedded workflow | Map Arduino/embedded architecture to a complete user workflow and identify missing links | OPEN — mapping required |

## Existing technical strengths that must be preserved

The planning phase must not restart these foundations unnecessarily:

- Core mutation architecture and CF3 mutation channel;
- component visualization manager and current renderer registry;
- circuit document/state infrastructure;
- simulation preparation/resolution/production architecture;
- PWM and passive DC simulation progress;
- current wiring and waypoint work;
- existing History/Undo/Redo guarantees;
- existing validation and registry architecture.

These are inputs to the next planning phase, not targets for gratuitous redesign.

## Dependency-first rule

A gap may be P0 without being the immediate next ticket.

For example, a Level 1 blocker may depend on a missing simulation contract, a missing presentation contract, a missing component model, or a missing governance decision. The dependency must be identified before implementation is ordered.

## Planning output required before selecting the next ticket

For each Level 1 blocker, produce:

1. owning Program/Epic;
2. existing related tickets/specifications/ADRs;
3. current implementation evidence;
4. missing technical capability;
5. architectural dependencies;
6. governance/documentation gap;
7. candidate ticket(s);
8. whether the work can run in parallel;
9. expected effect on the Level 1 exit gates.

Only after all nine fields are mapped should the CSA select the next work package.
