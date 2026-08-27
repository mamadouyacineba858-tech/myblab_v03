# Strategic Capability Gap — MYBlab

## 1. Purpose

This document establishes the strategic capability map used to answer two questions before selecting the next PMO ticket:

1. **Où sommes-nous ?** — what capability maturity is actually present in MYBlab.
2. **Où allons-nous ?** — what capabilities are required to reach the next strategic level.

It complements `ROADMAP_PLATFORM.md`. It does not replace the roadmap, the architecture, ADRs, or PMO specifications, and it does not prescribe implementation mechanisms.

The strategic trajectory remains:

```text
NIVEAU 1 — Atteindre le niveau Tinkercad
        ↓
NIVEAU 2 — Dépasser Tinkercad
        ↓
NIVEAU 3 — Tendre vers un laboratoire électronique virtuel avancé
```

Tinkercad is an intermediate benchmark, not the final destination.

---

## 2. Current strategic assessment

**Niveau 1 — NON ATTEINT.**

The existence of substantial Core, Simulation, canvas, interaction, wiring and embedded foundations must not be interpreted as proof that the product experience has reached the Level 1 benchmark.

In particular, the product remains materially below the Level 1 threshold in several visible and user-facing dimensions: component representation, breadboard/workbench experience, instrumentation, observation, visual simulation feedback, product coherence and overall workspace quality.

The assessment must therefore distinguish:

```text
Architecture maturity  ≠  Product-experience maturity
Simulation progress    ≠  Level 1 completion
Technical capability   ≠  Benchmark completion
```

---

## 3. Level 1 capability gap matrix

Status vocabulary is intentionally qualitative:

- **NON ATTEINT** — the capability is absent or materially below the benchmark.
- **PARTIEL** — meaningful foundations exist, but the benchmark is not yet reached.
- **ATTEINT** — evidence demonstrates that the Level 1 threshold is satisfied.

| Domain | Current assessment | Level 1 gap | Priority |
| --- | --- | --- | --- |
| Workspace / canvas | PARTIEL | Major | P0 |
| Placement and manipulation | PARTIEL | Major | P0 |
| Selection / grouping | PARTIEL | Moderate | P1 |
| Wiring | PARTIEL | Major | P0 |
| Wire routing / presentation | PARTIEL | Moderate | P1 |
| Component library | PARTIEL | Major | P0 |
| Component visual representation | PARTIEL | Major | P0 |
| Breadboard | NON ATTEINT / insufficiently demonstrated | Critical | P0 |
| Common electronic components | PARTIEL | Major | P0 |
| Electrical simulation | PARTIEL | Major | P0 |
| Temporal simulation | PARTIEL | Moderate | P1 |
| Arduino / embedded experience | PARTIEL | Major | P0 |
| Measurement instruments | NON ATTEINT / insufficient | Critical | P0 |
| Oscilloscope / waveform observation | NON ATTEINT / insufficient | Critical | P0 |
| Multimeter / electrical measurement | NON ATTEINT / insufficient | Critical | P0 |
| Simulation visual feedback | PARTIEL | Major | P0 |
| UX / interaction coherence | PARTIEL | Critical | P0 |
| Integrated electronics workspace | PARTIEL | Major | P0 |
| User robustness / coherence | PARTIEL | Moderate | P1 |
| Pedagogical experience | NON ATTEINT | Not required for Level 1 completion; strategic bridge toward Level 2 | P2 |
| 3D / spatial environment | NON ATTEINT | Not required for Level 1 | N3 |

This matrix is a strategic assessment, not a claim that every row already has a dedicated PMO ticket.

---

## 4. Definition of Level 1

Level 1 is reached only when the user-facing MYBlab experience provides a coherent electronic design and simulation workspace comparable to the chosen benchmark across the essential dimensions below.

### A. Workspace

A stable, coherent and usable circuit-design workspace with predictable manipulation and navigation.

### B. Components

A sufficiently complete and coherent library of common components, with representations that are understandable and visually consistent.

### C. Wiring

Reliable circuit assembly and wire interaction, including clear connection semantics and usable visual routing.

### D. Breadboard

A credible breadboard/workbench experience rather than a canvas containing isolated symbolic components.

### E. Simulation

A sufficiently complete electrical simulation path for the common circuits expected at the Level 1 benchmark.

### F. Embedded systems

A coherent first embedded/Arduino workflow integrated with the circuit experience.

### G. Instruments

Basic measurement and observation capabilities must exist. This includes, at minimum, the conceptual role of a multimeter and waveform observation comparable to an oscilloscope where required by the benchmark.

### H. Visual feedback

Simulation state must be observable in the workspace. The user should not have to infer the majority of circuit behaviour from invisible engine state.

### I. UX / interaction

The interaction model must feel like one coherent laboratory/design environment rather than a collection of technically working subsystems.

### J. Product coherence

The major capabilities must work together sufficiently that MYBlab can reasonably be evaluated as a usable electronic simulator, not merely as a set of implemented foundations.

---

## 5. Level 2 boundary

The following must not be treated as prerequisites for declaring Level 1 complete merely because they are strategically attractive:

- advanced pedagogical adaptation;
- advanced explanations and learning systems;
- capabilities whose primary purpose is to exceed the benchmark rather than reach it;
- advanced physical realism;
- advanced immersive laboratory behaviour;
- advanced spatial interaction;
- 3D representation as a product objective.

These belong to the Level 2 / Level 3 trajectory unless a future architectural decision explicitly moves a capability earlier.

---

## 6. Level 3 boundary

Level 3 is the long-term direction toward a virtual electronics laboratory. It may include:

- advanced physical representation and realism;
- laboratory-like environment;
- advanced instrumentation and observation;
- complex components and assemblies;
- visualization of simulated phenomena;
- spatial interaction;
- 3D representation when architecture and product strategy justify it;
- coherent integration between experience, simulation and learning.

No Level 3 capability is implicitly authorized for implementation by this document.

---

## 7. How the capability map drives the roadmap

The next PMO ticket must not be selected solely because it is the next open item in a local ticket sequence.

The decision sequence is:

```text
1. Où sommes-nous ?
        ↓
2. Quel est l'écart réel ?
        ↓
3. Quelle capacité manque ?
        ↓
4. Quel Programme / Épic couvre cette capacité ?
        ↓
5. Quelles dépendances existent ?
        ↓
6. Quel Ticket PMO est nécessaire ?
        ↓
7. CSA ruling / gouvernance
        ↓
8. Implémentation
        ↓
9. Tests et validation
        ↓
10. Delivery Report
        ↓
11. Mise à jour roadmap + capability matrix
        ↓
12. Nouvelle évaluation « Où sommes-nous ? »
```

This is a governance rule for prioritization, not an implementation workflow for the software itself.

---

## 8. Delivery reconciliation rule

Every meaningful delivery must leave four aligned traces:

```text
Ticket PMO
   ↓
Commit(s)
   ↓
Delivery / validation evidence
   ↓
Roadmap + Strategic Capability Gap update
```

A completed technical ticket must not silently leave the roadmap in an obsolete state.

Conversely, a strategic gap must not automatically generate implementation work without an appropriate Epic, dependency analysis and PMO specification.

---

## 9. Parallelism rule

Multiple capability gaps may be addressed in parallel when architectural boundaries permit it.

Parallelism is allowed to accelerate progress, but it must not create a permanent bypass around Core, Simulation, Embedded, Experience or other architectural boundaries established by the reference architecture.

The strategic question remains:

> Does this work materially reduce a validated capability gap, preserve architectural integrity, or establish a justified dependency for a future level?

---

## 10. Current strategic conclusion

MYBlab should currently be described as:

> **Technically maturing foundations with significant Core and Simulation progress, but still below the Level 1 product-experience benchmark.**

Therefore, before opening another unrelated sequence of tickets, the roadmap must use this capability map to identify the highest-value gaps preventing Level 1 completion.

The objective is not to reproduce Tinkercad as the final product. The objective is to cross the Level 1 benchmark deliberately, then use the resulting foundation to identify and build MYBlab's own advantages at Level 2 and ultimately Level 3.
