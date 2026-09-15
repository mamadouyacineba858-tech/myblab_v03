# MYBlab — Component Library Architecture V1

**Status:** Architectural decision record / reference
**Scope:** Canvas and component library
**Benchmark:** Tinkercad for interaction and behavior; MYBlab targets greater visual realism and, later, an advanced immersive virtual electronics laboratory.

## 1. Decision

MYBlab keeps the current **React + SVG** rendering approach for the component library. No migration to Canvas 2D, WebGL, Pixi, Konva, or another low-level rendering engine is authorized by this document.

The immediate scalability problem is not proven to be the rendering technology itself. The priority is to industrialize the component contract and remove avoidable coupling between electrical truth, canvas behavior, and visual rendering.

A future rendering migration may be considered only after an evidence-based performance benchmark demonstrates that the current approach is insufficient at the required component/circuit scale.

## 2. Fundamental architectural invariant

**Electrical geometry is independent from visual geometry.**

A component renderer must never become the source of truth for electrical connectivity.

Pins are electrical anchors identified by stable IDs and defined in the component contract. Visual leads, bodies, shadows, highlights, materials, and other graphical details may change without changing the electrical identity or connectivity of the pins.

Conceptually:

```text
                    COMPONENT
                        |
          +-------------+-------------+
          |             |             |
      ELECTRICAL      LOGIC        VISUAL
          |             |             |
         PINS          STATE       RENDERER
          |                           |
      WIRES / BB                      SVG
```

## 3. Component Contract V1

The component contract is conceptually unified but does not require all data to live in one physical file.

### Identity

- `id`
- `label`
- `icon`

### Logical geometry

- `width`
- `height`
- orientation/rotation capability reserved for future implementation

### Electrical geometry

Each pin declares at least:

- stable `id`
- electrical `role`
- relative local position (`dx`, `dy`)
- optional presentation label

The pin definition is the source of truth used by the electrical connectivity pipeline and must remain independent from SVG implementation details.

### Visual contract

A component declares or registers:

- its visual renderer;
- any dynamic visual-state resolver required by the component;
- visual geometry and presentation details.

The renderer receives resolved state/props rather than implementing electrical resolution itself.

### Behavior

The contract must eventually make explicit, rather than infer through scattered type checks:

- whether an instance has internal state;
- its initial state;
- whether state changes are transient or historized;
- whether custom interaction behavior exists.

### Electrical behavior

Electrical behavior remains separated from presentation and may be registered through the existing simulation registry patterns.

## 4. Geometry separation

The architecture distinguishes four concepts:

1. **Logical bounds** — canvas/document dimensions used by the core interaction model.
2. **Electrical anchors** — exact pin positions used for connectivity and wiring.
3. **Physical geometry** — dimensions and proportions representing the real-world component (body, leads, diameter, length, etc.).
4. **Visual bounds** — the graphical extent, which may include shadows, highlights, labels, or other rendering details.

These concepts must not be silently conflated.

For example, a capacitor may have a physical body diameter, lead diameter and lead length that differ from its logical canvas bounds, while its two electrical pins remain stable anchors.

## 5. Rendering architecture

The existing visual registry approach is retained.

The visual pipeline should evolve toward:

```text
component definition
        |
visual registry / resolver
        |
resolved generic visual props
        |
realistic component renderer
        |
shared visual primitives
```

The generic dispatcher should not accumulate component-specific electrical logic such as `type === "LED"` or `type === "RGB_LED"` when that logic can be represented by a dedicated registry/resolver.

## 6. Visual primitive library

A reusable visual primitive library is a high-priority productivity investment.

Examples include:

- straight and curved metal leads;
- terminals;
- plastic bodies;
- ceramic bodies;
- disks;
- lenses;
- metallic surfaces;
- highlights;
- shadows;
- markings and bands.

Components should compose these primitives instead of independently recreating common SVG geometry.

The goal is to change the workflow from **drawing every component from scratch** to **assembling a reusable component visual system**.

## 7. Registries and Open/Closed behavior

The project already demonstrates useful registry patterns in the electrical and wire layers. These patterns should be extended selectively rather than replaced with a new architecture.

Priority candidates:

1. visual-state resolution registry;
2. internal-conduction/bridge registry where needed;
3. explicit component capabilities for state and interaction;
4. structural completeness tests ensuring declared component types have their required registrations.

Adding a component should increasingly mean registering new component-specific data/strategies without modifying generic Canvas or simulation control flow.

## 8. Core Canvas responsibilities

The Core Canvas remains responsible for behavior common to all components:

- position;
- selection;
- marquee selection;
- generic drag;
- zoom;
- pin interaction and wiring orchestration.

Component-specific behavior must be exposed through declared capabilities or registries instead of accumulating literal type checks in generic Canvas code.

## 9. Breadboard and simulation boundaries

The existing breadboard geometry/connectivity and simulation propagation architecture should be preserved unless a concrete defect requires change.

In particular:

- wires depend on stable pin identities/anchors, not visual pixels;
- breadboard placement should derive from component pin definitions;
- electrical propagation remains independent of renderer implementation;
- visual realism must never require changes to the electrical model merely to reposition graphical details.

## 10. Rotation and hitboxes

Rotation and independent hitboxes are recognized as architectural requirements for the long-term component model, but they are **not immediate refactoring projects** under V1.

The contract should leave room for:

```text
instance transform
    position
    rotation
    scale

interaction bounds
visual bounds
physical geometry
```

Implementation should be introduced deliberately when required by a feature, rather than through a speculative Canvas rewrite.

## 11. Standard procedure for adding a component

The target workflow is:

1. Define identity, logical geometry and electrical pins.
2. Define physical geometry needed for realistic proportions.
3. Register the canonical electrical model when required.
4. Implement the visual renderer.
5. Compose shared visual primitives wherever possible.
6. Register the renderer.
7. Register dynamic visual-state behavior only if required.
8. Declare state/interaction capabilities only if required.
9. Add/extend generic contract tests.
10. Validate placement, wiring and simulation independently from visual appearance.

A purely static component should not require modifications to generic Canvas control flow.

## 12. Explicitly out of scope for V1

The following are deliberately **not** immediate work items:

- rewriting the Canvas;
- migrating React/SVG to WebGL/Canvas/Pixi/Konva;
- complete drag-system unification;
- full rotation implementation;
- advanced hitbox implementation;
- performance optimization through LOD/sprite atlases/culling before measurement proves the need.

These remain future options, not current prerequisites for the component library.

## 13. Definition of success

The architecture is considered ready for library industrialization when a new component can be added without modifying generic Canvas, wiring, breadboard, or signal-propagation control flow, except where a genuinely new cross-cutting capability is introduced.

The visual implementation must be able to improve substantially without changing electrical connectivity.

The component workflow should scale from the current set toward dozens of components using reusable primitives, declarative contracts and registry-based extension points.

## 14. Strategic trajectory

The component library is part of the broader MYBlab trajectory:

```text
Tinkercad benchmark
        |
        v
MYBlab >= Tinkercad
        |
        v
Greater physical/visual realism
        |
        v
Advanced virtual electronics laboratory
        |
        v
Immersive laboratory experience
```

This document is the architectural memory for that direction. Future tickets involving the Canvas or component library should be checked against these invariants before implementation.
