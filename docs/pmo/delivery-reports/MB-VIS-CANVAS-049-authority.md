# MB-VIS-CANVAS-049 — Authority

Status: IMPLEMENTATION AUTHORIZED

The CSA authorizes implementation of `MB-VIS-CANVAS-049 — Coordinate & Interaction Foundation` under:

- `docs/pmo/tickets/MB-VIS-CANVAS-049.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-049-blueprint.md`

## Authorized scope

- unify screen→document coordinate conversion;
- make drag, marquee, waypoint interactions and Breadboard movement correct at non-unit zoom;
- align Sidebar drop/preview semantics with Canvas interaction coordinates;
- add/adjust tests covering `zoom != 1`;
- preserve snapping, selection, drag preview and History invariants;
- preserve canonical component/pin geometry;
- preserve the current declarative rendering architecture.

## Explicitly forbidden in this execution

- pan;
- focus/local zoom;
- rotation/mirror;
- visual component scale;
- Inspector/Toolbar/Library redesign;
- asset regeneration or enlargement;
- solver/connectivity/simulation changes;
- new per-type central renderer branches;
- broad React state architecture refactor unless a strictly necessary mechanical change is demonstrated and approved separately.

## Mandatory proof

- interaction at zoom < 1;
- interaction at zoom > 1;
- component drag;
- marquee;
- waypoint drag/insertion;
- Breadboard drag;
- Sidebar drop/preview;
- snapping and History regression;
- tests, build/typecheck, `git diff --check`;
- browser proof with reproducible steps.

STOP after implementation and proof. Do not proceed to MB-VIS-CANVAS-050 or any later ticket without a new CSA decision.