# MYBlab — Level 1 Definition of Done

## Purpose

This document defines the product-level completion gate for MYBlab Level 1.

Level 1 means a credible Tinkercad-class electronic design and simulation experience. Ticket completion, code presence, renderer count, or unit-test count cannot by themselves satisfy this gate.

## Governing rule

A Level 1 capability is DONE only when all applicable dimensions are demonstrated:

1. Technical — the system can perform the capability correctly.
2. Product — a normal user can complete and understand the workflow.
3. Evidence — the team can reproduce and prove the workflow.
4. Coherence — the capability integrates with the surrounding MYBlab experience.
5. Recovery — relevant failures are understandable and recoverable.

For essential Level 1 capabilities, S3 / benchmark-ready is the minimum acceptable maturity.

## Scenario gates

### L1-A — Basic circuit
PASS only if a user can place a source, resistor and LED, wire them, start simulation, observe the result, modify the circuit, use undo/redo, save, reopen and continue.

### L1-B — Interactive circuit
PASS only if a user can create a circuit containing an interactive control, operate it during the intended workflow, and observe the simulated response coherently.

### L1-C — Dynamic circuit
PASS only if a user can create or configure a time-dependent behaviour such as PWM and observe a meaningful dynamic result rather than only hidden engine state.

### L1-D — Breadboard/workbench
PASS only if the product provides a credible physical/logical assembly workflow with connectivity semantics, placement, wiring, simulation integration and understandable feedback. A breadboard image or renderer alone is FAIL.

### L1-E — Measurement
PASS only if a user can interrogate meaningful voltage/current quantities through an understandable instrument workflow and obtain interpretable values. Internal engine values alone are FAIL.

### L1-F — Waveform observation
PASS only if a user can observe a time-varying signal through an appropriate temporal visualization and interpret the result. A hidden signal trace or debug value is FAIL.

### L1-G — Embedded workflow
PASS only if a representative embedded/Arduino circuit can proceed from circuit construction through program/runtime behaviour to observable circuit response.

### L1-H — Recovery
PASS only if representative invalid or incomplete circuits produce understandable feedback, can be corrected, and allow the user to continue without destructive recovery.

### L1-I — Project lifecycle
PASS only if a representative project can be created, saved, closed/reopened, edited further and simulated without losing essential semantics.

### L1-J — Multi-object editing
PASS only if representative selection, movement, wiring/modification and undo/redo operations behave correctly in the real workspace, including grouped operations where supported.

## Evidence hierarchy

Strongest evidence wins:

1. reproducible end-to-end workflow;
2. automated integration test representing the workflow;
3. validated UI evidence;
4. subsystem automated tests;
5. source inspection;
6. architecture/governance documentation;
7. roadmap declaration.

A lower evidence level cannot certify a higher product claim.

## Level 1 release gate

Level 1 may be declared only when:

- every essential scenario above is PASS or explicitly ruled non-essential by a traceable CSA/PMO decision;
- no critical capability remains below S3;
- no critical open architectural dependency makes the demonstrated workflow misleading or temporary;
- the roadmap, capability matrix and historical register agree with the integrated repository state;
- acceptance evidence is traceable to the relevant implementation and commit;
- CSA records the final Level 1 decision.

## Explicit non-criteria

The following do not prove Level 1:

- a large component count;
- high unit-test count alone;
- simulation sophistication without user observation;
- polished canvas visuals alone;
- isolated Arduino rendering;
- isolated breadboard rendering;
- 3D;
- roadmap labels unsupported by repository evidence;
- closing every planned ticket while an essential scenario still fails.

## Long-term boundary

3D is not required for Level 1. Level 1 architecture should nevertheless avoid gratuitously blocking later spatial/3D evolution toward Level 3.