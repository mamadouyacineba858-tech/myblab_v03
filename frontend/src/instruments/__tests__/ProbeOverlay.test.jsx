import React from "react"
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { ProbeOverlay } from "../ProbeOverlay.jsx"
import { getInstruments, resetInstruments, updateInstruments } from "../instrumentsStore.js"

afterEach(() => {
  cleanup()
  resetInstruments()
  delete document.elementFromPoint
})

describe("ProbeOverlay", () => {
  it("affiche les sondes affectées et les déplace vers une broche par geste pointeur", () => {
    const canvas = document.createElement("div")
    canvas.getBoundingClientRect = () => ({ left: 100, top: 50, right: 700, bottom: 450, width: 600, height: 400 })
    const pins = [
      { uid: "resistor-1", pin: "A", x: 120, y: 80 },
      { uid: "resistor-1", pin: "B", x: 220, y: 80 },
    ].map(({ uid, pin, x, y }) => {
      const element = document.createElement("button")
      element.className = "myblab-pin"
      element.dataset.wireUid = uid
      element.dataset.wirePin = pin
      element.getBoundingClientRect = () => ({ left: x, top: y, right: x + 12, bottom: y + 12, width: 12, height: 12 })
      canvas.append(element)
      return element
    })
    const canvasRef = { current: canvas }
    updateInstruments((state) => { state.voltmeter.plus = { uid: "resistor-1", pin: "A" } })
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => pins[1] })

    render(React.createElement(ProbeOverlay, { canvasRef, components: [], viewport: { zoom: 1 } }))

    const marker = screen.getByTestId("probe-marker-voltmeter-plus")
    expect(marker.getAttribute("aria-label")).toContain("broche A")
    fireEvent.pointerDown(marker, { clientX: 126, clientY: 86, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 226, clientY: 86, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 226, clientY: 86, pointerId: 1 })

    expect(getInstruments().voltmeter.plus).toEqual({ uid: "resistor-1", pin: "B" })
    expect(screen.getByTestId("probe-marker-voltmeter-plus").getAttribute("aria-label")).toContain("broche B")
  })
})