import React from "react"
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import { CircuitProvider } from "../../../context/CircuitContext.jsx"
import { useCircuit } from "../../../context/useCircuit.js"
import { Navbar } from "../../../components/Navbar.jsx"
let api
function Probe() { api = useCircuit(); return <Navbar /> }
afterEach(cleanup)
function mount() { render(<CircuitProvider><Probe /></CircuitProvider>) }
function add() {
  act(() => api.addComponent("ARDUINO", 0, 0))
  const uid = api.exportCircuit().components.at(-1).uid
  act(() => api.selectOnly({ type: "component", id: uid }))
  return uid
}
const source = "void setup() { pinMode(2, OUTPUT); } void loop() {}"
describe("ARD-004 Workspace", () => {
  it("disabled without Arduino; opens Document source using stable context only", () => {
    mount()
    expect(screen.getByText(/Code/).disabled).toBe(true)
    add()
    expect(screen.getByText(/Code/).disabled).toBe(false)
    fireEvent.click(screen.getByText(/Code/))
    expect(screen.getByLabelText("Sketch").value).toBe(api.selectedComponent.firmware.source)
  })
  it("draft does not mutate; Apply persists exactly one History entry; identical source is a no-op", () => {
    mount(); add(); fireEvent.click(screen.getByText(/Code/))
    const original = api.selectedComponent.firmware.source
    const count = api.getUndoCount()
    fireEvent.change(screen.getByLabelText("Sketch"), { target: { value: source } })
    expect(api.selectedComponent.firmware.source).toBe(original)
    expect(api.getUndoCount()).toBe(count)
    fireEvent.click(screen.getByText("Appliquer"))
    expect(api.selectedComponent.firmware.source).toBe(source)
    expect(api.getUndoCount()).toBe(count + 1)
    fireEvent.click(screen.getByText("Appliquer"))
    expect(api.getUndoCount()).toBe(count + 1)
  })
  it("uses compiler for success and diagnostics without applying draft", () => {
    mount(); add(); fireEvent.click(screen.getByText(/Code/))
    fireEvent.change(screen.getByLabelText("Sketch"), { target: { value: source } })
    fireEvent.click(screen.getByText("Compiler"))
    expect(screen.getByRole("status").textContent).toContain("Compilation")
    fireEvent.change(screen.getByLabelText("Sketch"), { target: { value: "invalid" } })
    fireEvent.click(screen.getByText("Compiler"))
    expect(screen.getByRole("status").textContent).toContain("MISSING_SETUP")
  })
  it("switches Arduino, closes on deselection and stays closed on reselection; Close works", () => {
    mount(); const first = add(); fireEvent.click(screen.getByText(/Code/))
    fireEvent.change(screen.getByLabelText("Sketch"), { target: { value: "unsaved" } })
    add()
    expect(screen.getByLabelText("Sketch").value).toBe(api.selectedComponent.firmware.source)
    act(() => api.clearSelection())
    expect(screen.queryByLabelText("Sketch")).toBeNull()
    act(() => api.selectOnly({ type: "component", id: first }))
    expect(screen.queryByLabelText("Sketch")).toBeNull()
    fireEvent.click(screen.getByText(/Code/))
    fireEvent.click(screen.getByLabelText("Fermer Arduino Code"))
    expect(screen.queryByLabelText("Sketch")).toBeNull()
  })
})
