import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { PALETTE_ITEMS } from "../config/componentDefinitions.js"

const circuit = vi.hoisted(() => ({
  addComponent: vi.fn(),
  addBreadboard: vi.fn(),
  clearCircuit: vi.fn(),
  isWiringActive: false,
  startSidebarComponentDrag: vi.fn(),
  endSidebarComponentDrag: vi.fn(),
}))
vi.mock("../context/useCircuit.js", () => ({ useCircuit: () => circuit }))
vi.mock("./ComponentPreview.jsx", () => ({
  ComponentPreview: ({ type }) => <span data-testid={"preview-" + type} />,
}))
import { Sidebar } from "./Sidebar.jsx"

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe("MYBLAB-ARDUINO-004 component library", () => {
  it("lists all catalog items by default and filters by name", () => {
    render(<Sidebar />)
    expect(screen.getByText(PALETTE_ITEMS.length + " composant(s)")).toBeTruthy()
    const arduino = PALETTE_ITEMS.find(item => item.id === "ARDUINO")
    expect(arduino).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText(/Arduino/), { target: { value: "ARDUINO" } })
    expect(screen.getByTestId("preview-ARDUINO")).toBeTruthy()
    expect(screen.queryByText("Aucun composant trouvé.")).toBeNull()
    fireEvent.change(screen.getByPlaceholderText(/Arduino/), { target: { value: "nonexistent-part-xyz" } })
    expect(screen.getByText("Aucun composant trouvé.")).toBeTruthy()
  })
  it("keeps component click insertion and breadboard action", () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un breadboard" }))
    expect(circuit.addBreadboard).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId("preview-ARDUINO").closest("button"))
    expect(circuit.addComponent).toHaveBeenCalledWith("ARDUINO", 200, 180)
  })
  it("filters categories without removing palette items", () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole("button", { name: "Cartes" }))
    expect(screen.getByTestId("preview-ARDUINO")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Tous" }))
    expect(screen.getByText(PALETTE_ITEMS.length + " composant(s)")).toBeTruthy()
  })
})
