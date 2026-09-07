/**
 * ContactFoundationPinWireCoherence.integration.test.jsx —
 * MB-VIS-CONTACT-FOUNDATION-001.
 *
 * Verrouille l'invariant central de ce ticket, via le pipeline RÉEL
 * (CircuitProvider) :
 *
 *     contact physique réel == position de présentation du Pin == extrémité de fil
 *
 * et démontre que cette égalité reste vraie après sélection, drag, câblage,
 * zoom global, focus/échelle locale (MB-VIS-CANVAS-052) et Enter/Escape —
 * pour BUTTON, le type dont `dx` a été corrigé par ce ticket (8/51, depuis
 * 0/60 — voir componentDefinitions.js).
 *
 * Les invariants de focus/échelle locale eux-mêmes (bornes, Document
 * inchangé, History, généricité 16 types...) sont déjà exhaustivement
 * verrouillés par ComponentFocusLocalZoom.integration.test.jsx
 * (MB-VIS-CANVAS-052) — ce fichier ne les reproduit pas, il vérifie
 * spécifiquement que la correction de dx/dy de ce ticket reste cohérente
 * à travers ce même mécanisme, jamais qu'il fonctionne en général.
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { CircuitComponent } from "../canvas/CircuitComponent.jsx"
import { WiresLayer } from "../wires/WiresLayer.jsx"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPresentationPosition } from "../utils/pinPresentationGeometry.js"

function renderHarness() {
  const canvasNode = { current: null }
  let api = null

  function Harness() {
    const circuit = useCircuit()
    const interaction = useCircuitInteraction()
    api = { ...circuit, ...interaction }
    return (
      <>
        {interaction.components.map((c) => (
          <CircuitComponent
            key={c.uid}
            component={c}
            focused={c.uid === circuit.focusedComponentId}
            localScale={c.uid === circuit.focusedComponentId ? interaction.localScale : 1}
          />
        ))}
        <WiresLayer wirePaths={interaction.wirePaths} />
      </>
    )
  }

  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasNode}>
      <div ref={(node) => { canvasNode.current = node }}>{children}</div>
    </CircuitProvider>
  )

  const utils = render(<Harness />, { wrapper })
  return { ...utils, getApi: () => api, canvasNode }
}

function pointerEvent({ button = 0, clientX = 0, clientY = 0, target } = {}) {
  return { button, clientX, clientY, ctrlKey: false, metaKey: false, target, preventDefault: () => {}, stopPropagation: () => {} }
}
function movePointer(clientX, clientY) {
  act(() => { window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY })) })
}
function releasePointer() {
  act(() => { window.dispatchEvent(new PointerEvent("pointerup")) })
}

describe("MB-VIS-CONTACT-FOUNDATION-001 — cohérence Pin DOM / extrémité de fil / point de présentation (BUTTON)", () => {
  it("Pin DOM (non focalisé) : 4 contacts physiques / 2 pins ; le contact par défaut coïncide avec getPinPresentationPosition()", () => {
    const { getApi, container } = renderHarness()
    act(() => { getApi().addComponent("BUTTON", 100, 100) })
    const [button] = getApi().components
    const def = getComponentDef("BUTTON")
    // Géométrie canonique / cardinalité électrique inchangées.
    expect(def.pins.find((p) => p.id === "pin1")).toMatchObject({ dx: 14, dy: 30 })
    expect(def.pins.find((p) => p.id === "pin2")).toMatchObject({ dx: 46, dy: 30 })

    // [FT-B-001-S2] 4 hit targets (2 pins × 2 contacts physiques).
    const nodes = [...container.querySelectorAll(".myblab-pin")]
    expect(nodes).toHaveLength(4)
    expect([...new Set(nodes.map((n) => n.getAttribute("data-wire-pin")))].sort()).toEqual(["pin1", "pin2"])
    expect([...new Set(nodes.map((n) => n.getAttribute("data-wire-contact")))].sort()).toEqual(["1a", "1b", "2a", "2b"])

    for (const pin of def.pins) {
      // Le CONTACT PAR DÉFAUT (getPinPresentationPosition sans argument
      // `contact`) reste positionné à l'ancienne projection de présentation.
      const expected = getPinPresentationPosition(button, pin)
      const defaultNode = nodes.find((n) =>
        n.getAttribute("data-wire-pin") === pin.id && n.getAttribute("data-wire-contact") === `${pin.id === "pin1" ? "1" : "2"}a`)
      expect(defaultNode).toBeTruthy()
      expect(Number(defaultNode.style.left.replace("px", ""))).toBe(expected.x - button.x)
      expect(Number(defaultNode.style.top.replace("px", ""))).toBe(expected.y - button.y)
    }
  })

  it("l'extrémité de fil dessinée coïncide avec le point de présentation du pin (non focalisé)", () => {
    const { getApi } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
    })
    const [button, resistor] = getApi().components
    act(() => { getApi().addWire(button.uid, "pin1", resistor.uid, "A") })

    const path = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id)
    const expected = getPinPresentationPosition(button, getComponentDef("BUTTON").pins[0])
    expect(path.d.startsWith(`M ${expected.x} ${expected.y}`)).toBe(true)
  })

  it("le drag met à jour le Document ; Pin DOM et extrémité de fil restent cohérents après relâchement", () => {
    const { getApi, container, canvasNode } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
    })
    const [button, resistor] = getApi().components
    act(() => { getApi().addWire(button.uid, "pin1", resistor.uid, "A") })

    act(() => {
      getApi().startDrag(pointerEvent({ button: 0, clientX: button.x + 5, clientY: button.y + 5, target: canvasNode.current }), button.uid)
    })
    movePointer(button.x + 5 + 40, button.y + 5 + 20)
    releasePointer()

    const moved = getApi().components.find((c) => c.uid === button.uid)
    expect(moved.x).toBe(button.x + 40)
    expect(moved.y).toBe(button.y + 20)

    const expectedPin1 = getPinPresentationPosition(moved, getComponentDef("BUTTON").pins[0])
    const node = [...container.querySelectorAll(".myblab-pin")].find((n) => n.getAttribute("aria-label") === "1")
    expect(Number(node.style.left.replace("px", ""))).toBe(expectedPin1.x - moved.x)

    const path = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id)
    expect(path.d.startsWith(`M ${expectedPin1.x} ${expectedPin1.y}`)).toBe(true)
  })

  it("focus + échelle locale : l'extrémité de fil suit la MÊME projection que le transform CSS du Pin DOM (aucune double mise à l'échelle, aucun décalage)", () => {
    const { getApi, container } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
    })
    const [button, resistor] = getApi().components
    act(() => { getApi().addWire(button.uid, "pin1", resistor.uid, "A") })

    act(() => { getApi().focusComponent(button.uid) })
    act(() => { getApi().adjustLocalScale(1.5) }) // 1.5 (default) + 1.5 -> clamp 3.0

    const scale = getApi().localScale
    expect(scale).toBe(3)

    // Pin DOM : position INCHANGÉE (non recalculée) — l'agrandissement vient
    // uniquement de l'héritage du transform CSS du wrapper (Blueprint D5).
    const def = getComponentDef("BUTTON")
    const unscaledPin1 = getPinPresentationPosition(button, def.pins[0])
    const node = [...container.querySelectorAll(".myblab-pin")].find((n) => n.getAttribute("aria-label") === "1")
    expect(Number(node.style.left.replace("px", ""))).toBe(unscaledPin1.x - button.x)

    // Wrapper : transform: scale(3) appliqué.
    const wrapperNode = container.querySelector(".circuit-component[data-focused]")
    expect(wrapperNode.style.transform).toBe("scale(3)")

    // Extrémité de fil : DOIT refléter la même projection que le transform
    // CSS (centre du composant + (position - centre) * scale) — jamais la
    // position non-scalée du Pin DOM.
    const scaledPin1 = getPinPresentationPosition(button, def.pins[0], { scale: 3 })
    const center = { x: button.x + def.width / 2, y: button.y + def.height / 2 }
    expect(scaledPin1.x).toBeCloseTo(center.x + (unscaledPin1.x - center.x) * 3, 6)
    const path = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id)
    expect(path.d.startsWith(`M ${scaledPin1.x} ${scaledPin1.y}`)).toBe(true)

    // Sortie focus (Blueprint G) : retour exact à la géométrie non focalisée.
    act(() => { getApi().exitFocus() })
    const pathAfter = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id)
    expect(pathAfter.d.startsWith(`M ${unscaledPin1.x} ${unscaledPin1.y}`)).toBe(true)
  })

  it("le zoom global (viewport) ne modifie aucune coordonnée en unités canvas (Pin/wire inchangés dans ce repère)", () => {
    const { getApi } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
    })
    const [button, resistor] = getApi().components
    act(() => { getApi().addWire(button.uid, "pin1", resistor.uid, "A") })
    const pathBefore = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d

    act(() => { getApi().zoomIn() })
    act(() => { getApi().zoomIn() })

    const pathAfter = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d
    expect(pathAfter).toBe(pathBefore)
  })
})
