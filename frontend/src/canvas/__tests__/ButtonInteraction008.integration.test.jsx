import React from "react"
import { describe, it, expect, vi } from "vitest"
import { act, fireEvent, render } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { useCircuitInteraction } from "../../context/useCircuitInteraction.js"
import { CircuitComponent } from "../CircuitComponent.jsx"

function renderHarness() {
  const canvasRef = { current: null }
  let api = null

  function Harness() {
    const stable = useCircuit()
    const interaction = useCircuitInteraction()
    api = { ...stable, ...interaction }

    return interaction.components.map((component) => (
      <CircuitComponent key={component.uid} component={component} />
    ))
  }

  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )

  const utils = render(<Harness />, { wrapper })
  return { ...utils, getApi: () => api }
}

function mouseDown(node, clientX, clientY) {
  fireEvent.mouseDown(node, {
    button: 0,
    clientX,
    clientY,
  })
}

function pointerMove(clientX, clientY) {
  fireEvent.pointerMove(window, { clientX, clientY })
}

function pointerUp(clientX = 0, clientY = 0) {
  fireEvent.pointerUp(window, { clientX, clientY })
}

describe("MB-VIS-BUTTON-INTERACTION-008", () => {
  it("B1 ? BUTTON n'acquiert jamais le pointer capture sur son corps", () => {
    const { getApi } = renderHarness()

    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
    })

    const body = document.querySelector(".part-button")
    const capture = vi.fn()
    body.setPointerCapture = capture
    body.hasPointerCapture = () => false

    fireEvent.pointerDown(body, {
      pointerId: 41,
      clientX: 110,
      clientY: 110,
    })

    expect(capture).not.toHaveBeenCalled()
    expect(getApi().components[0].state).toBe("pressed")

    fireEvent.pointerUp(body, {
      pointerId: 41,
      clientX: 110,
      clientY: 110,
    })
    expect(getApi().components[0].state).toBe("released")

    // Sans pointer capture, quitter physiquement le corps doit aussi
    // rel?cher le momentary et emp?cher tout ?tat "pressed" bloqu?.
    fireEvent.pointerDown(body, {
      pointerId: 42,
      clientX: 110,
      clientY: 110,
    })
    expect(getApi().components[0].state).toBe("pressed")

    fireEvent.pointerLeave(body, {
      pointerId: 42,
      clientX: 170,
      clientY: 170,
    })
    expect(getApi().components[0].state).toBe("released")

    pointerUp(170, 170)
    expect(getApi().components[0].state).toBe("released")
  })

  it("B2 ? apr?s un drag du BUTTON, une pin d?marre encore le wire gesture et jamais le drag composant", () => {
    const { getApi } = renderHarness()

    act(() => {
      getApi().addComponent("BUTTON", 100, 100)
    })

    const button = getApi().components[0]
    const body = document.querySelector(".part-button")

    fireEvent.pointerDown(body, {
      pointerId: 51,
      clientX: 110,
      clientY: 110,
    })
    mouseDown(body, 110, 110)
    pointerMove(150, 130)
    pointerUp(150, 130)

    const moved = getApi().components.find((c) => c.uid === button.uid)
    expect(moved.x).toBe(140)
    expect(moved.y).toBe(120)

    // Le release momentary appartient au handler React du corps du bouton.
    // Ce test cible exclusivement la non-r?tention du pointeur et le
    // c?blage post-drag ; il ne simule pas artificiellement un pointerup
    // directement sur window comme s'il s'agissait du corps.
    fireEvent.pointerUp(body, {
      pointerId: 51,
      clientX: 150,
      clientY: 130,
    })
    expect(getApi().components.find((c) => c.uid === button.uid).state)
      .toBe("released")

    const pin1 = [...document.querySelectorAll(".myblab-pin")]
      .find((node) => node.getAttribute("data-wire-pin") === "pin1")

    expect(pin1).toBeTruthy()

    fireEvent.pointerDown(pin1, {
      button: 0,
      pointerId: 52,
      clientX: 154,
      clientY: 150,
    })

    expect(getApi().wireGesture).toMatchObject({
      uid: button.uid,
      pinId: "pin1",
      pointerId: 52,
    })

    const afterPinGesture = getApi().components.find((c) => c.uid === button.uid)
    expect(afterPinGesture.x).toBe(140)
    expect(afterPinGesture.y).toBe(120)
  })

  it("L1 ? un drag du BUTTON_LATCHING ne toggle pas son ?tat", () => {
    const { getApi } = renderHarness()

    act(() => {
      getApi().addComponent("BUTTON_LATCHING", 100, 100)
    })

    const latch = getApi().components[0]
    const body = document.querySelector(".part-latching-button")

    fireEvent.pointerDown(body, {
      pointerId: 61,
      clientX: 110,
      clientY: 110,
    })
    mouseDown(body, 110, 110)
    pointerMove(150, 130)
    pointerUp(150, 130)

    fireEvent.click(body, {
      clientX: 150,
      clientY: 130,
    })

    const moved = getApi().components.find((c) => c.uid === latch.uid)
    expect(moved.x).toBe(140)
    expect(moved.y).toBe(120)
    expect(moved.state).toBe("off")

    // Un vrai drag reste un drag m?me si le pointeur revient ? son
    // point de d?part avant que le navigateur produise le click.
    fireEvent.pointerDown(body, {
      pointerId: 62,
      clientX: 150,
      clientY: 130,
    })
    fireEvent.pointerMove(body, {
      pointerId: 62,
      clientX: 180,
      clientY: 160,
    })
    fireEvent.pointerMove(body, {
      pointerId: 62,
      clientX: 150,
      clientY: 130,
    })
    fireEvent.click(body, {
      clientX: 150,
      clientY: 130,
    })

    expect(getApi().components.find((c) => c.uid === latch.uid).state)
      .toBe("off")
  })

  it("L2 ? un vrai clic immobile toggle exactement une fois, puis le suivant revient OFF", () => {
    const { getApi } = renderHarness()

    act(() => {
      getApi().addComponent("BUTTON_LATCHING", 100, 100)
    })

    const body = document.querySelector(".part-latching-button")

    fireEvent.pointerDown(body, {
      pointerId: 71,
      clientX: 110,
      clientY: 110,
    })
    fireEvent.click(body, {
      clientX: 110,
      clientY: 110,
    })
    expect(getApi().components[0].state).toBe("on")

    fireEvent.pointerDown(body, {
      pointerId: 72,
      clientX: 110,
      clientY: 110,
    })
    fireEvent.click(body, {
      clientX: 110,
      clientY: 110,
    })
    expect(getApi().components[0].state).toBe("off")
  })

  it("R1 ? les pins du BUTTON_LATCHING restent ind?pendantes du drag du corps", () => {
    const { getApi } = renderHarness()

    act(() => {
      getApi().addComponent("BUTTON_LATCHING", 100, 100)
    })

    const latch = getApi().components[0]
    const pin2 = [...document.querySelectorAll(".myblab-pin")]
      .find((node) => node.getAttribute("data-wire-pin") === "pin2")

    fireEvent.pointerDown(pin2, {
      button: 0,
      pointerId: 81,
      clientX: 147,
      clientY: 130,
    })

    expect(getApi().wireGesture).toMatchObject({
      uid: latch.uid,
      pinId: "pin2",
      pointerId: 81,
    })

    expect(getApi().components[0].x).toBe(100)
    expect(getApi().components[0].y).toBe(100)
  })
})
