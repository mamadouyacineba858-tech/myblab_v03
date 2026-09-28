# MYBlab — Level 1 Exit Criteria

## Objective

Level 1 is complete only when MYBlab reaches a coherent user-facing benchmark comparable to the selected Tinkercad reference across the essential dimensions of electronic design and simulation.

This is an acceptance framework, not an implementation specification.

## Exit gates

A Level 1 review must explicitly evaluate all gates below.

### Gate 1 — Workspace
- [ ] Circuit workspace is coherent and usable.
- [ ] Navigation and canvas interaction are predictable.
- [ ] Core editing actions feel consistent.

### Gate 2 — Components
- [ ] Common components required by the benchmark are available.
- [ ] Component representation is visually coherent.
- [ ] Pins, orientation and interaction affordances are understandable.

### Gate 3 — Wiring
- [ ] Components can be connected reliably.
- [ ] Connections are visually clear.
- [ ] Wire manipulation/routing is usable for normal circuits.

### Gate 4 — Breadboard
- [ ] Breadboard is represented as a usable electronic work surface.
- [ ] Typical breadboard assembly workflows are supported.
- [ ] Breadboard behaviour is coherent with simulation and wiring.

### Gate 5 — Simulation
- [ ] Representative Level 1 circuits simulate correctly.
- [ ] Simulation results are stable and deterministic where expected.
- [ ] Simulation state is visible to the user.

### Gate 6 — Embedded
- [ ] A first embedded/Arduino workflow is coherent from circuit to execution.
- [ ] Embedded behaviour is observable in the circuit experience.

### Gate 7 — Instruments
- [ ] Basic voltage/current measurement is available through an appropriate instrument workflow.
- [ ] Waveform/time-domain observation is available where required.
- [ ] Instrument observations are meaningfully connected to simulated state.

### Gate 8 — Visual feedback
- [ ] Important simulation states are visible on the workspace.
- [ ] The user can understand circuit behaviour without inspecting internal engine state.

### Gate 9 — UX coherence
- [ ] Major workflows behave as one product.
- [ ] There are no major gaps between technically available capabilities and their UI representation.
- [ ] Normal user workflows do not require architectural knowledge.

### Gate 10 — Product coherence
- [ ] A representative set of Level 1 circuits can be designed, wired, simulated and observed end-to-end.
- [ ] No P0 capability gap from `STRATEGIC_CAPABILITY_GAP.md` remains materially open.
- [ ] The CSA explicitly records the Level 1 decision as PASS.

## Explicit non-gates

The following are not required to pass Level 1 unless a future governance decision says otherwise:

- full 3D environment;
- immersive laboratory;
- advanced spatial interaction;
- advanced pedagogical adaptation;
- full Level 2 differentiation features;
- Level 3 physical realism.

## Evidence rule

A Level 1 gate must be supported by observable evidence: tests, validated workflows, screenshots/video when appropriate, or other reproducible evidence. Architectural presence alone is insufficient.

## Decision rule

```text
All mandatory gates PASS
        +
No unresolved critical/P0 Level 1 gap
        +
CSA validation
        =
LEVEL 1 ACHIEVED
```

Until these conditions are satisfied, MYBlab remains **below Level 1**, regardless of progress in individual technical programs.
