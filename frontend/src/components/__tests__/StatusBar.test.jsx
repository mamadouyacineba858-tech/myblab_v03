import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const circuit = vi.hoisted(() => ({ value: {} }))

vi.mock("../../context/useCircuit.js", () => ({ useCircuit: () => circuit.value }))

// Expose React for the secondary Vitest JSX transform.
globalThis.React = React
const { StatusBar } = await import("../StatusBar.jsx")

describe("StatusBar wire count", () => {
  it("counts persisted wires, including breadboard-hole wires absent from wirePaths", () => {
    circuit.value = { isWiringActive: false, simulationActive: true, documentCounts: { components: 2, wires: 3, breadboards: 1 } }
    render(<StatusBar />)
    expect(screen.getByText(/Fils : 3/)).toBeTruthy()
    expect(screen.getByText(/Composants : 2/)).toBeTruthy()
    expect(screen.getByText(/Plaques : 1/)).toBeTruthy()
  })

  it("shows zero wires when the document has none", () => {
    circuit.value = { isWiringActive: false, simulationActive: false, documentCounts: { components: 0, wires: 0, breadboards: 0 } }
    render(<StatusBar />)
    expect(screen.getByText(/Fils : 0/)).toBeTruthy()
    expect(screen.getByText(/Circuit vide/)).toBeTruthy()
  })
  it("never counts a drag-preview component or a wire geometry that is not persisted", () => {
    circuit.value = {
      isWiringActive: true,
      simulationActive: false,
      documentCounts: { components: 3, wires: 5, breadboards: 1 },
      // These legacy fields must not override canonical persisted counts.
      wires: [{ id: "temporary-preview" }],
    }
    render(<StatusBar />)
    expect(screen.getByText(/Composants : 3/)).toBeTruthy()
    expect(screen.getByText(/Fils : 5/)).toBeTruthy()
    expect(screen.getByText(/Plaques : 1/)).toBeTruthy()
    expect(screen.queryByText(/Circuit vide/)).toBeNull()
  })

  it("keeps canonical counters stable when simulation is active", () => {
    circuit.value = {
      isWiringActive: false,
      simulationActive: true,
      documentCounts: { components: 3, wires: 5, breadboards: 1 },
    }
    render(<StatusBar />)
    expect(screen.getByText(/Composants : 3/)).toBeTruthy()
    expect(screen.getByText(/Fils : 5/)).toBeTruthy()
    expect(screen.getByText(/Plaques : 1/)).toBeTruthy()
    expect(screen.getByText(/Simulation active/)).toBeTruthy()
  })

})
