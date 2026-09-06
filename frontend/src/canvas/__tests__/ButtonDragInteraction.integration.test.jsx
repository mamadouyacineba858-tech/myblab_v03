/**
 * ButtonDragInteraction.integration.test.jsx — MB-VIS-BUTTON-INTERACTION-003.
 *
 * Verrouille la correction du conflit d'événements diagnostiqué par
 * MB-VIS-CONTACT-AUDIT-002 : `preventDefault()` appelé sur `pointerdown`
 * (BUTTON et BUTTON_LATCHING, CircuitComponent.jsx) supprimait le
 * `mousedown` de compatibilité dont dépend seul `.circuit-component`
 * (`handleBodyMouseDown` → `selectOnly()`/`startDrag()`) — confirmé
 * empiriquement en navigateur réel (séquence observée :
 * `pointerdown → pointerup → click`, jamais de `mousedown`).
 *
 * jsdom ne reproduit PAS la suppression navigateur réelle du `mousedown`
 * de compatibilité suite à un `preventDefault()` sur `pointerdown` (c'est un
 * comportement de la spec Pointer Events implémenté par le moteur de rendu,
 * pas par jsdom) — ce fichier teste donc la cause racine directement
 * (A/B : `pointerdown` n'appelle plus `preventDefault()`) ET le
 * comportement de bout en bout attendu une fois la cause supprimée
 * (mousedown réel sur le corps → sélection/drag), plutôt que de tenter de
 * simuler la suppression elle-même (déjà prouvée en navigateur réel,
 * MB-VIS-CONTACT-AUDIT-002 §7).
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render, act, fireEvent } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { useCircuitInteraction } from "../../context/useCircuitInteraction.js"
import { CircuitComponent } from "../CircuitComponent.jsx"

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
          <CircuitComponent key={c.uid} component={c} />
        ))}
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

function realMouseDown(node, { clientX, clientY }) {
  const evt = new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX, clientY, button: 0 })
  act(() => { node.dispatchEvent(evt) })
  return evt
}
function movePointer(clientX, clientY) {
  act(() => { window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY, bubbles: true })) })
}
function releasePointer() {
  act(() => { window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })) })
}

describe("MB-VIS-BUTTON-INTERACTION-003 — A/B : pointerdown ne supprime plus le mousedown (cause racine)", () => {
  it("A — BUTTON : pointerdown sur le corps n'appelle plus event.preventDefault()", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON", 100, 100) })
    const root = document.querySelector(".part-button")
    const evt = new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
    let prevented = false
    evt.preventDefault = () => { prevented = true }
    act(() => { root.dispatchEvent(evt) })
    expect(prevented).toBe(false)
  })

  it("B — BUTTON_LATCHING : pointerdown sur le corps n'appelle plus event.preventDefault()", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON_LATCHING", 100, 100) })
    const root = document.querySelector(".part-latching-button")
    const evt = new PointerEvent("pointerdown", { bubbles: true, cancelable: true })
    let prevented = false
    evt.preventDefault = () => { prevented = true }
    act(() => { root.dispatchEvent(evt) })
    expect(prevented).toBe(false)
  })
})

describe("MB-VIS-BUTTON-INTERACTION-003 — A/B bout en bout : le drag fonctionne à nouveau", () => {
  it("A — BUTTON : un mousedown réel sur le corps sélectionne puis déplace le composant (Document mis à jour au relâchement)", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON", 100, 100) })
    const [button] = getApi().components
    const root = document.querySelector(".part-button")

    realMouseDown(root, { clientX: button.x + 10, clientY: button.y + 10 })
    expect(getApi().activeItem).toEqual({ type: "component", id: button.uid })

    // Deltas multiples de GRID_SIZE (20, utils/grid.js) : la position finale
    // passe par snapToGrid() (comportement préexistant du drag, non
    // modifié par ce ticket) — des deltas non multiples produiraient un
    // arrondi correct mais rendraient l'assertion ci-dessous fragile.
    movePointer(button.x + 10 + 40, button.y + 10 + 20)
    releasePointer()

    const moved = getApi().components.find((c) => c.uid === button.uid)
    expect(moved.x).toBe(button.x + 40)
    expect(moved.y).toBe(button.y + 20)
  })

  it("B — BUTTON_LATCHING : un mousedown réel sur le corps sélectionne puis déplace le composant", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON_LATCHING", 100, 100) })
    const [latch] = getApi().components
    const root = document.querySelector(".part-latching-button")

    realMouseDown(root, { clientX: latch.x + 10, clientY: latch.y + 10 })
    expect(getApi().activeItem).toEqual({ type: "component", id: latch.uid })

    movePointer(latch.x + 10 + 40, latch.y + 10 + 20)
    releasePointer()

    const moved = getApi().components.find((c) => c.uid === latch.uid)
    expect(moved.x).toBe(latch.x + 40)
    expect(moved.y).toBe(latch.y + 20)
  })

  it("A — BUTTON : un second drag consécutif fonctionne encore (pas de régression d'état après le premier)", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON", 100, 100) })
    const [button] = getApi().components
    const root = document.querySelector(".part-button")

    realMouseDown(root, { clientX: button.x + 10, clientY: button.y + 10 })
    movePointer(button.x + 10 + 20, button.y + 10 + 20)
    releasePointer()
    const afterFirst = getApi().components.find((c) => c.uid === button.uid)
    expect(afterFirst.x).toBe(button.x + 20)
    expect(afterFirst.y).toBe(button.y + 20)

    realMouseDown(root, { clientX: afterFirst.x + 10, clientY: afterFirst.y + 10 })
    movePointer(afterFirst.x + 10 + 20, afterFirst.y + 10 + 20)
    releasePointer()
    const afterSecond = getApi().components.find((c) => c.uid === button.uid)
    expect(afterSecond.x).toBe(afterFirst.x + 20)
    expect(afterSecond.y).toBe(afterFirst.y + 20)
  })
})

describe("MB-VIS-BUTTON-INTERACTION-003 — C/D : comportements momentary/latching non régressés", () => {
  it("C — BUTTON : pointerdown -> state pressed, pointerup -> state released (indépendant du drag)", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON", 0, 0) })
    const root = document.querySelector(".part-button")

    act(() => { fireEvent.pointerDown(root) })
    expect(getApi().components[0].state).toBe("pressed")

    act(() => { fireEvent.pointerUp(root) })
    expect(getApi().components[0].state).toBe("released")
  })

  it("D — BUTTON_LATCHING : click bascule ON puis OFF (indépendant du drag)", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON_LATCHING", 0, 0) })
    const root = document.querySelector(".part-latching-button")

    act(() => { fireEvent.click(root) })
    expect(getApi().components[0].state).toBe("on")

    act(() => { fireEvent.click(root) })
    expect(getApi().components[0].state).toBe("off")
  })
})

describe("MB-VIS-BUTTON-INTERACTION-003 — E : câblage BUTTON/BUTTON_LATCHING non régressé", () => {
  it("E — BUTTON : pin1 et pin2 acceptent chacun un wire vers un RESISTOR", () => {
    const { getApi } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
      getApi().addComponent("RESISTOR", 400, 300)
    })
    const [button, resA, resB] = getApi().components
    act(() => { getApi().addWire(button.uid, "pin1", resA.uid, "A") })
    act(() => { getApi().addWire(button.uid, "pin2", resB.uid, "A") })
    expect(getApi().wires).toHaveLength(2)
    expect(getApi().isPinConnected(button.uid, "pin1")).toBe(true)
    expect(getApi().isPinConnected(button.uid, "pin2")).toBe(true)
  })

  it("E — BUTTON_LATCHING : pin1 et pin2 acceptent chacun un wire vers un RESISTOR", () => {
    const { getApi } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON_LATCHING", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
      getApi().addComponent("RESISTOR", 400, 300)
    })
    const [latch, resA, resB] = getApi().components
    act(() => { getApi().addWire(latch.uid, "pin1", resA.uid, "A") })
    act(() => { getApi().addWire(latch.uid, "pin2", resB.uid, "A") })
    expect(getApi().wires).toHaveLength(2)
    expect(getApi().isPinConnected(latch.uid, "pin1")).toBe(true)
    expect(getApi().isPinConnected(latch.uid, "pin2")).toBe(true)
  })

  it("E — le composant reste déplaçable après câblage, le wire suit (extrémité recalculée)", () => {
    const { getApi } = renderHarness()
    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
      getApi().addComponent("RESISTOR", 400, 100)
    })
    const [button, resistor] = getApi().components
    act(() => { getApi().addWire(button.uid, "pin1", resistor.uid, "A") })
    const root = document.querySelector(".part-button")

    realMouseDown(root, { clientX: button.x + 10, clientY: button.y + 10 })
    movePointer(button.x + 10 + 40, button.y + 10 + 20)
    releasePointer()

    const moved = getApi().components.find((c) => c.uid === button.uid)
    expect(moved.x).toBe(button.x + 40)
    const path = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id)
    // [MB-VIS-BUTTON-ASSET-006] dx=14 (pin1 de BUTTON), remesuré sur le
    // nouveau paquet d'assets Tinkercad-style — voir componentDefinitions.js.
    expect(path.d.startsWith(`M ${moved.x + 14} ${moved.y + 30}`)).toBe(true)
  })
})

describe("MB-VIS-BUTTON-INTERACTION-003 — F : le Pin continue de bloquer le drag lorsqu'il est directement ciblé", () => {
  it("F — un mousedown sur le <button> .myblab-pin (pin1 de BUTTON) ne déclenche ni sélection ni drag du composant", () => {
    const { getApi } = renderHarness()
    act(() => { getApi().addComponent("BUTTON", 100, 100) })
    const pin1 = [...document.querySelectorAll(".myblab-pin")].find((p) => p.getAttribute("aria-label") === "1")
    expect(pin1).toBeTruthy()

    // clientX/Y purement documentaires (le nœud cible est déjà résolu via
    // querySelectorAll, aucune assertion ne dépend de ces valeurs) — 114 =
    // 100 + dx pin1 (14, MB-VIS-BUTTON-ASSET-006).
    realMouseDown(pin1, { clientX: 114, clientY: 130 })
    expect(getApi().activeItem).toBe(null)

    movePointer(150, 160)
    releasePointer()
    const comp = getApi().components[0]
    expect(comp.x).toBe(100)
    expect(comp.y).toBe(100)
  })
})

describe("MB-VIS-BUTTON-INTERACTION-003 — G : non-régression d'un composant passif (RESISTOR)", () => {
  it("G — RESISTOR reste sélectionnable, déplaçable, et accepte les wires (comportement générique non cassé)", () => {
    const { getApi } = renderHarness()
    act(() => {
      getApi().addComponent("RESISTOR", 100, 100)
      getApi().addComponent("LED", 400, 100)
    })
    const [resistor, led] = getApi().components
    const root = document.querySelector(".part-resistor")

    realMouseDown(root, { clientX: resistor.x + 10, clientY: resistor.y + 10 })
    expect(getApi().activeItem).toEqual({ type: "component", id: resistor.uid })
    movePointer(resistor.x + 10 + 40, resistor.y + 10 + 20)
    releasePointer()
    const moved = getApi().components.find((c) => c.uid === resistor.uid)
    expect(moved.x).toBe(resistor.x + 40)

    act(() => { getApi().addWire(moved.uid, "A", led.uid, "anode") })
    expect(getApi().isPinConnected(moved.uid, "A")).toBe(true)
  })
})
