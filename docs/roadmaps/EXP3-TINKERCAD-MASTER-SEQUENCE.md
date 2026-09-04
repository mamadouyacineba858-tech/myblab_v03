# EXP3 → TINKERCAD → BEYOND — MASTER OPERATIONAL SEQUENCE

Date: 2026-09-05
Programme: Experience
Epic: EXP3 — Parité visuelle composants & expérience — seuil Tinkercad
Status: **CSA CONSOLIDATED ROADMAP**

## 1. Purpose

This document is the operational companion to `docs/roadmaps/ROADMAP_PLATFORM.md` for the Experience trajectory.

It consolidates the post-`MB-VIS-COMP-037` architectural findings and defines the logical ticket chain leading to:

```text
MYBlab actuel
    ↓
NIVEAU 1 — Atteindre Tinkercad
    ↓
NIVEAU 2 — Dépasser Tinkercad
    ↓
NIVEAU 3 — Laboratoire électronique virtuel avancé,
           réaliste, instrumenté, immersif et extensible
```

**Tinkercad is a benchmark, not an implementation specification.**

This document is a roadmap only. It does not grant implementation authority. Every ticket still requires the normal cycle:

`Audit / Blueprint → Ticket PMO → CSA GO → Implementation → Validation → CSA Technical/Visual GO → commit/push`.

## 2. Evidence used for the recalibration

The sequence is based on the actual repository state observed after `MB-VIS-COMP-036` POWER and `MB-VIS-COMP-037` ARDUINO, plus the read-only architectural audit `EXP3-RECALAGE-002` and the UX/CANVAS amendment.

The audit established, among other points, that the current zoom is global, `clientToCanvas()` is not zoom-aware for drag/marquee/waypoint paths, the component boxes are not mutually scaled, there is no component-level focus/local scale, the Sidebar is a flat list with only LED using the real raster preview, there is no Inspector, no pan/fit/focus system, and the single React context causes all canvas consumers to re-render during drag. fileciteturn312file0

The audit also establishes the invariants that must survive the evolution: Document as source of truth, canonical/presentation separation, canonical pin geometry, no zoom logic inside PartRenderer, one history entry per user drag, one active pointer interaction, declarative raster backend, and conscious revision of tests when a currently absent capability is introduced. fileciteturn312file0

## 3. Current baseline — locked

### Completed

- `MB-VIS-COMP-031` — Buzzer: **DONE**
- `MB-VIS-COMP-032` — Potentiometer: **DONE**
- `MB-VIS-COMP-033` — RGB LED: **DONE**
- `MB-VIS-COMP-034` — NPN transistor: **DONE**
- `MB-VIS-COMP-035` — Servo: **DONE**
- `MB-VIS-COMP-036` — POWER: **DONE / CSA Visual GO**
- `MB-VIS-COMP-037` — ARDUINO: **DONE / CSA Visual GO**

The 16 component types are now on the raster backend. No component asset reopening is authorized merely to compensate for Canvas/UX deficiencies.

### Current authoritative architectural conclusion

```text
REALISTIC ASSET
      ↓
PRESENTATION LAYER
      ↓
CANVAS / VIEWPORT
      ↓
USER INTERACTION

while preserving

DOCUMENT / ELECTRICAL GEOMETRY / PIN IDENTITY / CONNECTIONS
```

The visual scale of a component is a Presentation concern and must never become a mutation of the electrical model.

## 4. Level 1 — Reach Tinkercad

### Phase A — Coordinate and Viewport foundation

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 1 | **MB-VIS-CANVAS-049** | **Coordinate & Interaction Foundation** — make screen→document conversion zoom-aware and coherent across drag, marquee, waypoint and existing drop paths; establish interaction-coordinate tests at `zoom != 1`; preserve canonical geometry | COMP-037 + audit |
| 2 | **MB-VIS-CANVAS-050** | **Canvas Navigation** — pan, reliable global zoom, reset, cursor-oriented navigation, fit-to-content, fit-to-selection and focus primitives | CANVAS-049 |
| 3 | **MB-VIS-CANVAS-051** | **Canvas Performance Isolation** — reduce high-frequency re-render fan-out, isolate interaction state from slow-changing state, validate real drag performance on 100+ components before/after | CANVAS-049 |

**Gate A:** drag, marquee, waypoint, breadboard drag, selection and wires remain coherent at multiple global zoom levels; no regression of Document/History invariants.

### Phase B — Component observability and local visual scale

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 4 | **MB-VIS-CANVAS-052** | **Component Focus & Local Visual Zoom** — generic focus/center/exit-focus and bounded local visual scale, reusable for every component type, without changing electrical coordinates | CANVAS-050 + CANVAS-051 |
| 5 | **MB-VIS-CONTACT-053** | **Contact / Pin Presentation System** — align visible leads, pin presentation, hit targets and interaction behavior at global and local scales | CANVAS-052 |
| 6 | **MB-VIS-WIRE-054** | **Wire Visual System** — geometry, thickness, routing, corners, junctions and endpoint coherence across component↔component and component↔breadboard paths | CONTACT-053 |
| 7 | **MB-VIS-WIRE-055** | **Dynamic Wire States** — readable visual states derived from simulation/electrical state without duplicating state ownership in Presentation | WIRE-054 |

**Gate B:** a selected, locally focused and globally zoomed component remains electrically identical, visually coherent and fully connectable.

### Phase C — Breadboard and laboratory object interaction

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 8 | **MB-VIS-BREAD-056** | **Breadboard Visual & Assembly** — bring breadboard visuals, placement feedback, contact visibility and assembly behavior to the same interaction quality as the components | CONTACT-053 + WIRE-054 |

**Gate C:** component, pin, wire and breadboard form one coherent interaction system at all supported scales.

### Phase D — Component Library 2.0 and laboratory controls

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 9 | **MB-VIS-LIB-057** | **Component Library 2.0** — real previews, search, categories, sections, recent components, scalable catalogue structure, consistent identity with canvas assets | CANVAS-050 |
| 10 | **MB-VIS-UI-058** | **Laboratory Toolbar / Menu 2.0** — structured File / Edit / View / Components / Wiring / Simulation / Tools command surface; include Undo/Redo and viewport actions | CANVAS-050 + LIB-057 |
| 11 | **MB-VIS-UI-059** | **Component Inspector** — selection-aware properties and supported presentation controls without introducing a second Document source of truth | CANVAS-052 + LIB-057 |
| 12 | **MB-VIS-COMP-060** | **Component Transformations** — controlled rotation / mirror / visual scale where justified, with canonical pin semantics preserved | CONTACT-053 + UI-059 |

**Gate D:** palette, toolbar, inspector and canvas behave as one laboratory workspace rather than independent widgets.

### Phase E — Visual depth, states and workspace cohesion

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 13 | **MB-VIS-CANVAS-061** | **Visual Depth & Interaction Feedback** — hover, selection, focus, depth cues, shadows and valid/invalid interaction feedback | CANVAS-052 + COMP-060 |
| 14 | **MB-VIS-STATE-062** | **Unified Component Visual States** — standardize readable component states across simulation, interaction and zoom contexts | WIRE-055 + COMP-060 |
| 15 | **MB-VIS-LAB-063** | **Laboratory Workspace Cohesion** — unify palette + toolbar + inspector + canvas + breadboard + feedback into one coherent UX | 052–062 |

### Phase F — Quality gate

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 16 | **MB-VIS-QA-064** | **Visual Regression & Interaction Qualification** — browser proof, multi-zoom interaction tests, representative circuits, baseline comparison, performance evidence, asset integrity and no-new-regression gate | LAB-063 |
| 17 | **MB-VIS-TINKERCAD-065** | **Tinkercad Gate — Niveau 1** — formal comparative audit and CSA decision on whether MYBlab has reached the benchmark | QA-064 |

### Niveau 1 exit condition

`MB-VIS-TINKERCAD-065` is not a cosmetic review. The gate is passed only when the user-visible experience is judged coherent across:

- realistic component representation and proportions;
- component selection, movement and multi-selection;
- global zoom, pan, focus and fit behavior;
- local visual scale without electrical model mutation;
- visible and connectable pins/leads;
- wires and breadboard assembly;
- library discovery and component insertion;
- toolbar/menu and inspector affordances;
- visual states and interaction feedback;
- performance at representative circuit sizes;
- regression safety and reproducible browser proof.

## 5. Level 2 — Dépasser Tinkercad

The Level 2 chain starts only after `MB-VIS-TINKERCAD-065` has been passed or a CSA decision explicitly authorizes selective Level 2 work.

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 18 | **MB-VIS-UX-066** | **Advanced Command & Context Layer** — faster discovery and context-sensitive workflows around the current selection and task | TINKERCAD-065 |
| 19 | **MB-VIS-CANVAS-067** | **Precision Canvas Tools** — advanced alignment, distribution, guides, intelligent snapping and multi-object operations | UX-066 |
| 20 | **MB-VIS-COMP-068** | **Advanced Component Manipulation** — richer transforms and configurable presentation while preserving canonical electrical semantics | CANVAS-067 + CONTACT-053 |
| 21 | **MB-VIS-WIRE-069** | **Assisted Wiring & Routing** — higher-level routing assistance, cleaner paths and task-aware feedback without taking ownership from the electrical model | WIRE-055 + CANVAS-067 |
| 22 | **MB-VIS-INSTR-070** | **Measurement & Instrumentation Workspace** — make simulated quantities observable through dedicated, composable laboratory instruments | SIM + UI-059 |
| 23 | **MB-VIS-STATE-071** | **Deep Simulation Observability** — richer temporal/state visualization, probes and contextual inspection of circuit behavior | SIM + INSTR-070 |
| 24 | **MB-VIS-LAB-072** | **Customizable Laboratory Workspace** — adaptable panels, layouts and task-oriented workspace modes | LAB-063 + UI-059 |
| 25 | **MB-VIS-KL-073** | **Guided Experiment & Diagnostic Experience** — connect simulation results, explanations and guided actions to the visual laboratory | KL + STATE-071 |
| 26 | **MB-VIS-PERF-074** | **Large-Circuit Experience** — qualify and optimize interaction/rendering for substantially larger circuits and richer scenes | CANVAS-051 + LAB-072 |
| 27 | **MB-VIS-TINKERCAD-075** | **Beyond-Tinkercad Gate — Niveau 2** — prove measurable user-value advantages beyond baseline parity | 066–074 |

### Level 2 principle

The goal is not to make MYBlab a copy of Tinkercad with more buttons. The goal is to build superior workflows: better observation, precision, diagnosis, manipulation, simulation visibility and laboratory organization.

## 6. Level 3 — Laboratoire électronique virtuel avancé

Level 3 is intentionally strategic. Each major technical direction must receive its own architecture review and ADR when necessary.

| Order | Ticket | Objective | Dependency |
|---:|---|---|---|
| 28 | **MB-VIS-LAB-076** | **Physical Laboratory Scene Model** — move from a 2D component workspace toward a richer spatial laboratory representation | LEVEL-2 GATE |
| 29 | **MB-VIS-INSTR-077** | **Advanced Virtual Instrumentation** — oscilloscopes, generators, meters and observation workflows as coherent lab objects | INSTR-070 + LAB-076 |
| 30 | **MB-VIS-STATE-078** | **Advanced Phenomenon Visualization** — richer representation of temporal, electrical and physical simulation phenomena | STATE-071 + SIM evolution |
| 31 | **MB-VIS-UX-079** | **Spatial Interaction & Manipulation** — scalable interaction model for richer lab scenes | LAB-076 |
| 32 | **MB-VIS-COMP-080** | **Advanced Physical Component Representation** — assemblies, connectors, mechanisms and more complex physical objects | COMP-068 + LAB-076 |
| 33 | **MB-VIS-LAB-081** | **Experiment Scenario System** — reusable laboratory setups and experiment contexts | LAB-076 + KL-073 |
| 34 | **MB-VIS-KL-082** | **Immersive Learning Integration** — connect advanced visualization, experimentation and pedagogical guidance | KL-073 + LAB-081 |
| 35 | **MB-VIS-PERF-083** | **Advanced Scene Performance** — qualify richer scenes and interaction at scale | PERF-074 + LAB-076 |
| 36 | **MB-VIS-MASTER-084** | **Advanced Virtual Laboratory Gate — Niveau 3** | 076–083 |

Level 3 does **not** imply a mandatory 3D technology today. It defines the destination; technology remains a future architectural decision governed by evidence.

## 7. Cross-ticket architectural invariants

The following are mandatory throughout the sequence unless a future CSA/ADR decision explicitly changes them:

1. **Document remains the single source of truth.**
2. **Electrical/canonical geometry is independent from visual presentation.**
3. **Pin identity is stable and keyed semantically, never by incidental array order or raster position.**
4. **Visual scale never mutates electrical coordinates or simulation semantics.**
5. **No central renderer branch is introduced when a declarative capability can express the same requirement.**
6. **Validated realistic assets are reused; asset enlargement is not a substitute for Canvas/Viewport capabilities.**
7. **All pointer interactions use one coherent screen↔document coordinate model.**
8. **Hit target, visible pin/lead, wire endpoint and selected visual must remain coherent at supported scales.**
9. **History semantics remain one user interaction → one intended history action.**
10. **Presentation state does not become a second business model.**
11. **High-frequency interaction state must not unnecessarily re-render the complete laboratory.**
12. **Newly introduced capabilities must be tested at the scales and interaction combinations where they can actually fail.**
13. **The browser is part of the acceptance evidence for visual tickets.**
14. **No ticket advances to implementation without the CSA GO for its Blueprint and PMO ticket.**

## 8. Explicit non-goals for the immediate sequence

- Do not regenerate or enlarge all 16 realistic assets merely because their on-screen perception is small.
- Do not modify canonical component dimensions to compensate for a presentation problem.
- Do not introduce 3D, WebGL or a new rendering architecture merely to solve the current Canvas UX gap.
- Do not add Inspector, Toolbar, Library and local zoom as unrelated isolated widgets; they must converge on a coherent laboratory UX.
- Do not use Tinkercad as a source-code specification; compare user-visible outcomes and workflows.

## 9. Execution rule

Only one operational ticket is considered active at a time unless the CSA explicitly authorizes a parallel workstream.

For each ticket:

```text
1. Read current repository state
2. Audit if the ticket changes an architectural boundary
3. CSA Blueprint
4. PMO Ticket
5. CSA GO
6. Implementation agent
7. Tests + browser proof + build/typecheck + diff checks
8. CSA technical/visual validation
9. Commit/push
10. Reconcile roadmap status
```

No future ticket is considered implemented merely because it appears in this roadmap.

## 10. Source-of-truth rule for roadmap evolution

`ROADMAP_PLATFORM.md` remains the global platform roadmap.

This file is the **operational master sequence for EXP3 → Tinkercad → Beyond** until the sequence is fully absorbed into the main roadmap during the next roadmap consolidation. The older EXP3 numbered sequence is historical and must not be used to reopen already validated component work.

Related evidence:

- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/roadmaps/amendments/AUDIT-EXP3-002-CANVAS-UX-2026-09-04.md`
- `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md`

This file does not replace the architecture documents or PMO tickets; it establishes the durable order in which the Experience capabilities are to be considered.
