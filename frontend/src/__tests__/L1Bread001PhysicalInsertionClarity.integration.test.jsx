/**
 * L1Bread001PhysicalInsertionClarity.integration.test.jsx — L1-BREAD-001
 * "Physical Insertion Clarity & Dense Assembly Feedback".
 *
 * PRESENTATION-ONLY (Blueprint D1) : aucune nouvelle règle de placement, de
 * géométrie, de mutation ou d'état métier. Ce fichier verrouille, via le
 * pipeline réel (CircuitProvider, vrai CommandBus/History, vrai rendu
 * <SimulationCanvas>) :
 *   - le "placement target ring" (Breadboard.jsx, D3) : second <circle>
 *     décoratif, coaxial au trou canonique, dérivé de breadboardFeedback /
 *     breadboardInsertPreview déjà existants (jamais un second moteur de
 *     placement) ;
 *   - l'indicateur compact valid/invalid du ghost Sidebar
 *     (ComponentInsertGhost.jsx, D6) ;
 *   - l'absence de mutation/entrée d'historique pendant un preview ;
 *   - le nettoyage complet de l'état temporaire après le geste ;
 *   - l'absence de branche spécifique à un type dans les nouveaux chemins.
 *
 * Toutes les positions client/document réutilisées ci-dessous (RESISTOR,
 * LED, POTENTIOMETER, BUTTON, POWER, multi-breadboard, collision) sont
 * EXACTEMENT celles déjà verrouillées et prouvées par
 * MB-VIS-BREAD-042-InsertionSnapFeedback.integration.test.jsx (fichier
 * LOCKED, non modifié par ce ticket) — jamais recalculées à la main ici.
 */
import React from "react"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { SimulationCanvas } from "../canvas/SimulationCanvas.jsx"

const testDirectory = dirname(fileURLToPath(import.meta.url))

function renderCanvas() {
  const canvasRef = React.createRef()
  let api = null
  function Probe() {
    api = { ...useCircuit(), ...useCircuitInteraction() }
    return null
  }
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(n) => { canvasRef.current = n }}>{children}</div>
    </CircuitProvider>
  )
  const utils = render(<><Probe /><SimulationCanvas /></>, { wrapper })
  return { ...utils, getApi: () => api }
}

function targetRings(svg) {
  return [...svg.querySelectorAll(".breadboard__target-ring")]
}

// Même patron que BreadboardInsertionMutationChannel.integration.test.jsx :
// le noeud canvas de test n'a pas de position CSS sous jsdom
// (getBoundingClientRect -> zéro), donc la coordonnée canvas d'un pointeur
// est directement son clientX/clientY.
function pointerDown(api, component) {
  const event = {
    button: 0,
    clientX: component.x + 10,
    clientY: component.y + 10,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  act(() => { api.startDrag(event, component.uid) })
}

function pointerMove(component, { dx, dy = 0 }) {
  const event = new PointerEvent("pointermove", {
    clientX: component.x + 10 + dx,
    clientY: component.y + 10 + dy,
  })
  act(() => { window.dispatchEvent(event) })
}

function dragExistingComponent(api, component, target) {
  pointerDown(api, component)
  pointerMove(component, { dx: target.x - component.x, dy: target.y - component.y })
}

function pointerUp() {
  act(() => { window.dispatchEvent(new PointerEvent("pointerup")) })
}

describe("L1-BREAD-001 — physical insertion clarity (target rings + ghost status)", () => {
  it("T1 — Sidebar preview valide (RESISTOR) : exactement deux target rings valid", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })

    expect(getApi().breadboardInsertPreview.valid).toBe(true)
    const svg = container.querySelector("svg.breadboard")
    const rings = targetRings(svg)
    expect(rings.length).toBe(2)
    expect(rings.every((r) => r.classList.contains("breadboard__target-ring--valid"))).toBe(true)
    expect(rings.some((r) => r.classList.contains("breadboard__target-ring--invalid"))).toBe(false)
  })

  it("T2 — Sidebar preview invalide par collision : target rings invalid, aucun valid pour ces trous", () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      // Occupe déjà col5/row3 + col12/row3 (même fixture que MB-VIS-BREAD-042).
      getApi().addComponent("RESISTOR", 58, 21)
    })
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })

    expect(getApi().breadboardInsertPreview.valid).toBe(false)
    const svg = container.querySelector("svg.breadboard")
    const rings = targetRings(svg)
    expect(rings.length).toBeGreaterThan(0)
    expect(rings.every((r) => r.classList.contains("breadboard__target-ring--invalid"))).toBe(true)
    expect(rings.some((r) => r.classList.contains("breadboard__target-ring--valid"))).toBe(false)
  })

  it("T3 — endSidebarComponentDrag() nettoie : aucun target ring après nettoyage", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })
    expect(targetRings(container.querySelector("svg.breadboard")).length).toBe(2)

    act(() => { getApi().endSidebarComponentDrag() })
    expect(targetRings(container.querySelector("svg.breadboard")).length).toBe(0)
  })

  it("T4 — drag d'un composant EXISTANT : target rings sur les trous candidats, aucun second ghost", () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addComponent("RESISTOR", 500, 500)
    })
    const resistor = getApi().components.find((c) => c.type === "RESISTOR")

    dragExistingComponent(getApi(), resistor, { x: 58, y: 21 })

    const svg = container.querySelector("svg.breadboard")
    const rings = targetRings(svg)
    expect(rings.length).toBe(2)
    expect(rings.every((r) => r.classList.contains("breadboard__target-ring--valid"))).toBe(true)
    // Aucun second renderer : le composant existant garde son propre
    // renderer, jamais de ComponentInsertGhost pour un drag de composant posé.
    expect(container.querySelectorAll(".component-insert-ghost").length).toBe(0)

    pointerUp()
  })

  it("T5 — pointerup : les target rings temporaires disparaissent, la position finale reste celle du moteur existant", () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addComponent("RESISTOR", 500, 500)
    })
    const resistor = getApi().components.find((c) => c.type === "RESISTOR")
    dragExistingComponent(getApi(), resistor, { x: 58, y: 21 })
    pointerUp()

    const svg = container.querySelector("svg.breadboard")
    expect(targetRings(svg).length).toBe(0)
    const after = getApi().components.find((c) => c.uid === resistor.uid)
    expect(after.x).toBe(58)
    expect(after.y).toBe(21)
  })

  it("T6 — BUTTON : quatre contacts physiques ciblés -> quatre target rings", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("BUTTON") })
    act(() => { getApi().updateSidebarComponentDragPosition(80, 40) })

    expect(getApi().breadboardInsertPreview.valid).toBe(true)
    const svg = container.querySelector("svg.breadboard")
    const rings = targetRings(svg)
    expect(rings.length).toBe(4)
    expect(rings.every((r) => r.classList.contains("breadboard__target-ring--valid"))).toBe(true)
  })

  it("T7 — POTENTIOMETER : trois target rings", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("POTENTIOMETER") })
    act(() => { getApi().updateSidebarComponentDragPosition(80, 40) })

    expect(getApi().breadboardInsertPreview.valid).toBe(true)
    const svg = container.querySelector("svg.breadboard")
    expect(targetRings(svg).length).toBe(3)
  })

  it("T8 — POWER (wire-only) : aucun faux target ring, aucun ghost d'insertion publié", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("POWER") })
    act(() => { getApi().updateSidebarComponentDragPosition(80, 40) })

    expect(getApi().breadboardInsertPreview).toBe(null)
    const svg = container.querySelector("svg.breadboard")
    expect(targetRings(svg).length).toBe(0)
    expect(container.querySelectorAll(".component-insert-ghost").length).toBe(0)
  })

  it("T9 — multi-breadboard : les rings n'apparaissent que sur le breadboard survolé (A puis B)", () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addBreadboard(1200, 1200)
    })
    const [svgA, svgB] = [...container.querySelectorAll("svg.breadboard")]

    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })
    expect(targetRings(svgA).length).toBe(2)
    expect(targetRings(svgB).length).toBe(0)

    // Même session de drag, bascule vers B (D9/D1) — voir MB-VIS-BREAD-042 T11.
    act(() => { getApi().updateSidebarComponentDragPosition(1298, 1241) })
    expect(targetRings(svgA).length).toBe(0)
    expect(targetRings(svgB).length).toBe(2)
  })

  it("T10 — collision sur A ne contamine pas B (B reste valid, aucune fuite d'état invalide)", () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addBreadboard(1200, 1200)
      // Occupe col5/row3 + col12/row3 de A (RESISTOR réel).
      getApi().addComponent("RESISTOR", 58, 21)
    })
    const [svgA, svgB] = [...container.querySelectorAll("svg.breadboard")]

    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    // Survol du trou LOCAL équivalent sur B — B est libre, doit rester valid
    // malgré la collision réelle sur A (isolation inter-breadboard).
    act(() => { getApi().updateSidebarComponentDragPosition(1298, 1241) })

    expect(getApi().breadboardInsertPreview.valid).toBe(true)
    const ringsB = targetRings(svgB)
    expect(ringsB.length).toBe(2)
    expect(ringsB.every((r) => r.classList.contains("breadboard__target-ring--valid"))).toBe(true)
    expect(ringsB.some((r) => r.classList.contains("breadboard__target-ring--invalid"))).toBe(false)
    // A n'a plus d'aperçu actif à ce stade de la session (le drag a basculé
    // vers B) : aucun ring temporaire ne doit y traîner.
    expect(targetRings(svgA).length).toBe(0)
  })

  it("T11 — target ring geometry lock : cx/cy exactement identiques au trou canonique correspondant", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("POTENTIOMETER") })
    act(() => { getApi().updateSidebarComponentDragPosition(80, 40) })

    const svg = container.querySelector("svg.breadboard")
    const holesByPosition = new Map(
      [...svg.querySelectorAll(".breadboard__hole")].map((el) => [`${el.getAttribute("cx")}:${el.getAttribute("cy")}`, el])
    )
    const rings = targetRings(svg)
    expect(rings.length).toBeGreaterThan(0)
    for (const ring of rings) {
      const key = `${ring.getAttribute("cx")}:${ring.getAttribute("cy")}`
      expect(holesByPosition.has(key), `aucun trou canonique coaxial pour le ring ${key}`).toBe(true)
    }
  })

  it("T12 — target ring non-interactif : pointer-events none sur chaque ring", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })

    const svg = container.querySelector("svg.breadboard")
    const rings = targetRings(svg)
    expect(rings.length).toBeGreaterThan(0)
    for (const ring of rings) {
      expect(ring.getAttribute("pointer-events")).toBe("none")
      expect(ring.getAttribute("fill")).toBe("none")
    }
  })

  it("T13 — ghost Sidebar : statut valid présent", () => {
    const { container, getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })

    const status = container.querySelector(".component-insert-ghost__status")
    expect(status).not.toBeNull()
    expect(status.getAttribute("data-state")).toBe("valid")
    expect(container.querySelector(".component-insert-ghost--valid")).not.toBeNull()
  })

  it("T14 — ghost Sidebar : statut invalid présent (collision)", () => {
    const { container, getApi } = renderCanvas()
    act(() => {
      getApi().addBreadboard(0, 0)
      getApi().addComponent("RESISTOR", 58, 21)
    })
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })

    const status = container.querySelector(".component-insert-ghost__status")
    expect(status).not.toBeNull()
    expect(status.getAttribute("data-state")).toBe("invalid")
    expect(container.querySelector(".component-insert-ghost--invalid")).not.toBeNull()
  })

  it("T15 — le preview n'ajoute aucun composant au Document", () => {
    const { getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    const before = getApi().components.length
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })
    expect(getApi().components.length).toBe(before)
    act(() => { getApi().endSidebarComponentDrag() })
    expect(getApi().components.length).toBe(before)
  })

  it("T16 — le preview n'ajoute aucune entrée History", () => {
    const { getApi } = renderCanvas()
    act(() => { getApi().addBreadboard(0, 0) })
    const count = getApi().getUndoCount()
    act(() => { getApi().startSidebarComponentDrag("RESISTOR") })
    act(() => { getApi().updateSidebarComponentDragPosition(98, 41) })
    expect(getApi().getUndoCount()).toBe(count)
    act(() => { getApi().endSidebarComponentDrag() })
    expect(getApi().getUndoCount()).toBe(count)
  })

  it("T17 — aucune branche spécifique à un type dans les nouveaux chemins de feedback", () => {
    const files = [
      resolve(testDirectory, "../canvas/Breadboard.jsx"),
      resolve(testDirectory, "../canvas/ComponentInsertGhost.jsx"),
    ]
    for (const file of files) {
      const source = stripComments(readFileSync(file, "utf8"))
      expect(source).not.toMatch(/type\s*===\s*["'](LED|BUTTON|POTENTIOMETER)["']/)
      expect(source).not.toMatch(/case\s+["'](LED|BUTTON|POTENTIOMETER)["']/)
      expect(source).not.toMatch(/switch\s*\(\s*type\s*\)/)
    }
  })

  it("T18 — aucun fichier de géométrie/connectivité/mutation verrouillé ne porte de marqueur L1-BREAD-001", () => {
    const forbiddenFiles = [
      "utils/breadboardGeometry.js",
      "utils/breadboardPlacementAdapter.js",
      "utils/breadboardAssociation.js",
      "utils/breadboardConnectivity.js",
      "utils/breadboardElectricalIdentity.js",
      "utils/breadboardWireEndpoint.js",
      "utils/contactModel.js",
      "utils/assemblyGeometry.js",
      "utils/normalizeDocumentBreadboards.js",
      "core/handlers/breadboard/AddBreadboardHandler.js",
      "core/handlers/breadboard/MoveBreadboardHandler.js",
      "core/handlers/breadboard/DeleteBreadboardHandler.js",
      "core/handlers/breadboard/breadboardSolidarity.js",
      "hooks/useCircuitState.js",
      "canvas/CircuitComponent.jsx",
      "wires/WiresLayer.jsx",
      "wires/BreadboardWiresLayer.jsx",
      "canvas/BreadboardWireEndpoints.jsx",
    ]
    for (const rel of forbiddenFiles) {
      const content = readFileSync(resolve(testDirectory, "..", rel), "utf8")
      expect(content, `${rel} ne doit porter aucun marqueur L1-BREAD-001`).not.toMatch(/L1-BREAD-001/)
    }
  })
})

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
}
