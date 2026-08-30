# MB-VIS — Component Library Execution Roadmap V1

**Status:** PROPOSED — ready for execution after CSA approval
**Architecture reference:** `docs/architecture/COMPONENT_LIBRARY_ARCHITECTURE_V1.md`
**Scope:** Canvas component library industrialization
**Benchmark:** Tinkercad for behavior/interaction; MYBlab target is greater physical and visual realism.

## Objective

Transform the approved component architecture into a small sequence of executable tickets that makes component creation repeatable and scalable.

## Non-negotiable constraints

- Do not rewrite the Canvas.
- Keep React + SVG for V1.
- Do not migrate to WebGL/Canvas/Pixi/Konva without a later evidence-based performance decision.
- Do not move electrical truth into renderers.
- Do not change breadboard connectivity or signal propagation unless a ticket proves a defect.
- Do not start a mass component migration before the pilot ticket is validated.
- Every ticket must preserve existing behavior and pass the relevant regression suite.

## Sequence

```text
VIS-COMP-001  Contract + geometry invariants
       ↓
VIS-COMP-002  Visual-state registry
       ↓
VIS-COMP-003  Shared visual primitives
       ↓
VIS-COMP-004  State / interaction capabilities
       ↓
VIS-COMP-005  Completeness + contract guards
       ↓
VIS-COMP-006  Pilot component industrialization
       ↓
VIS-COMP-007  Library rollout gate
```

Tickets 001–005 are architecture hardening. Ticket 006 proves the industrial workflow on one representative component. Ticket 007 is the gate before broad library expansion.

## Definition of success

A new static component can be introduced by definition + renderer + registration + tests without modifying generic Canvas, wiring, breadboard, or signal-propagation control flow. Dynamic components may additionally register their declared state/interaction/visual behavior.
