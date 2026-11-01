import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const circuit = vi.hoisted(() => ({ value: {} }))
const interaction = vi.hoisted(() => ({ value: {} }))

vi.mock("../../context/useCircuit.js", () => ({ useCircuit: () => circuit.value }))
vi.mock("../../context/useCircuitInteraction.js", () => ({ useCircuitInteraction: () => interaction.value }))

// StatusBar.jsx n'importe pas React : exposé avant son chargement pour le transform JSX de Vitest.
globalThis.React = React
const { StatusBar } = await import("../StatusBar.jsx")

describe("StatusBar wire count", () => {
  it("counts persisted wires, including breadboard-hole wires absent from wirePaths", () => {
    circuit.value = { isWiringActive: false, simulationActive: true, wires: [{ id: "a" }, { id: "b" }, { id: "c" }] }
    interaction.value = { components: [{ uid: "1" }, { uid: "2" }], wirePaths: [] }
    render(<StatusBar />)
    expect(screen.getByText(/Fils : 3/)).toBeTruthy()
    expect(screen.getByText(/Composants : 2/)).toBeTruthy()
  })

  it("shows zero wires when the document has none", () => {
    circuit.value = { isWiringActive: false, simulationActive: false, wires: [] }
    interaction.value = { components: [], wirePaths: [] }
    render(<StatusBar />)
    expect(screen.getByText(/Fils : 0/)).toBeTruthy()
  })
})
