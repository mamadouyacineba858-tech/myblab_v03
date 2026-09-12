import React from "react"
import { describe, it, expect, afterEach, vi } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
const testDirectory = dirname(fileURLToPath(import.meta.url))
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { ComponentInspector, PropertyField } from "../components/ComponentInspector.jsx"
import { COMPONENT_TYPES } from "../config/componentDefinitions.js"

let api
const originalSchema = COMPONENT_TYPES.LED.propertySchema
afterEach(() => { cleanup(); COMPONENT_TYPES.LED.propertySchema = originalSchema })
function Probe() { api = useCircuit(); return <ComponentInspector /> }
function mount(type, theme = "dark") {
  const rendered = render(<div className={`theme-${theme}`}><CircuitProvider><Probe /></CircuitProvider></div>)
  if (type) add(type)
  return rendered
}
function add(type) {
  act(() => api.addComponent(type, 20, 40))
  const uid = api.exportCircuit().components.at(-1).uid
  act(() => api.selectOnly({ type: "component", id: uid }))
  return uid
}
function changeName(value) {
  const input = screen.getByLabelText("Nom")
  act(() => input.focus())
  fireEvent.change(input, { target: { value } })
  return input
}

describe("L1-PROP-002 rich inspector", () => {
  it("preserves empty selection", () => {
    mount()
    expect(screen.getByText("Aucun composant sélectionné")).toBeTruthy()
    expect(screen.queryByRole("textbox")).toBeNull()
  })
  it("LED shows canonical type, identity, an editable empty name and an electrical-only empty message", () => {
    mount("LED")
    expect(screen.getByText("LED")).toBeTruthy()
    expect(screen.getByRole("region", { name: "Identité" })).toBeTruthy()
    expect(screen.getByLabelText("Nom").value).toBe("")
    expect(screen.getByLabelText("Nom").type).toBe("text")
    expect(screen.getByLabelText("Nom").maxLength).toBe(80)
    expect(screen.getByText("Aucun paramètre électrique configurable")).toBeTruthy()
    expect(screen.queryByText("Aucun paramètre configurable pour ce composant")).toBeNull()
  })
  it("resistor retains name, electrical value 220 and unit Ω", () => {
    mount("RESISTOR")
    expect(screen.getByLabelText("Nom")).toBeTruthy()
    expect(screen.getByDisplayValue("220").type).toBe("number")
    expect(screen.getByText("Ω")).toBeTruthy()
  })
  it("typing changes no Document/History; blur commits once and leaves parameters independent", () => {
    mount("RESISTOR")
    const document = api.exportCircuit()
    const count = api.getUndoCount()
    const input = changeName("R entrée")
    expect(api.exportCircuit()).toEqual(document)
    expect(api.getUndoCount()).toBe(count)
    act(() => input.blur())
    expect(api.getUndoCount()).toBe(count + 1)
    expect(api.selectedComponent.properties).toEqual({ name: "R entrée" })
    expect(api.selectedComponent.parameters).toEqual(document.components[0].parameters)
    expect(screen.getByText("Résistance")).toBeTruthy()
  })
  it("Undo and Redo update the field; identical commits and empty patches add no History", () => {
    mount("LED")
    const input = changeName("LED témoin")
    act(() => input.blur())
    const count = api.getUndoCount()
    act(() => api.undo())
    expect(screen.getByLabelText("Nom").value).toBe("")
    act(() => api.redo())
    expect(screen.getByLabelText("Nom").value).toBe("LED témoin")
    const same = changeName("LED témoin")
    act(() => same.blur())
    expect(api.getUndoCount()).toBe(count)
  })
  it("Escape cancels the draft including the synchronous blur, then permits a later edit", () => {
    mount("LED")
    const count = api.getUndoCount()
    const input = changeName("discard me")
    fireEvent.keyDown(input, { key: "Escape" })
    expect(input.value).toBe("")
    expect(api.selectedComponent.properties.name).toBe("")
    expect(api.getUndoCount()).toBe(count)
    const next = changeName("keep me")
    act(() => next.blur())
    expect(api.selectedComponent.properties.name).toBe("keep me")
    expect(api.getUndoCount()).toBe(count + 1)
  })
  it("Enter commits through one blur and preserves Unicode and spaces exactly", () => {
    mount("LED")
    const count = api.getUndoCount()
    const name = "  Capteur température 💡  "
    const input = changeName(name)
    fireEvent.keyDown(input, { key: "Enter" })
    expect(document.activeElement).not.toBe(input)
    expect(api.selectedComponent.properties.name).toBe(name)
    expect(api.getUndoCount()).toBe(count + 1)
  })
  it("IME Enter does not prematurely commit text composition", () => {
    mount("LED")
    const count = api.getUndoCount()
    const input = changeName("温度")
    fireEvent.keyDown(input, { key: "Enter", isComposing: true })
    expect(api.getUndoCount()).toBe(count)
    expect(document.activeElement).toBe(input)
    act(() => input.blur())
    expect(api.selectedComponent.properties.name).toBe("温度")
  })
  it("rejects an overlong draft even if programmatic input bypasses maxlength", () => {
    mount("LED")
    const count = api.getUndoCount()
    const input = changeName("x".repeat(81))
    act(() => input.blur())
    expect(api.selectedComponent.properties.name).toBe("")
    expect(api.getUndoCount()).toBe(count)
    expect(input.value).toBe("")
  })
  it("electrical edits still update parameters only", () => {
    mount("RESISTOR")
    const input = changeName("R entrée"); act(() => input.blur())
    const count = api.getUndoCount()
    fireEvent.change(screen.getByDisplayValue("220"), { target: { value: "1000" } })
    fireEvent.blur(screen.getByDisplayValue("1000"))
    expect(api.selectedComponent.parameters).toEqual({ resistance: 1000 })
    expect(api.selectedComponent.properties).toEqual({ name: "R entrée" })
    expect(api.getUndoCount()).toBe(count + 1)
  })
  it("loads the effective name on selection changes and after export/import", () => {
    mount("LED")
    const first = api.selectedComponent.uid
    const name = "LED témoin"
    const input = changeName(name); act(() => input.blur())
    add("RESISTOR")
    expect(screen.getByLabelText("Nom").value).toBe("")
    changeName("uncommitted")
    act(() => api.selectOnly({ type: "component", id: first }))
    expect(screen.getByLabelText("Nom").value).toBe(name)
    const exported = JSON.parse(JSON.stringify(api.exportCircuit()))
    act(() => api.importCircuit(exported))
    act(() => api.selectOnly({ type: "component", id: first }))
    expect(screen.getByLabelText("Nom").value).toBe(name)
  })
  it("takes the field label and control from the existing schema", () => {
    COMPONENT_TYPES.LED.propertySchema = { name: { ...originalSchema.name, label: "Custom schema label" } }
    mount("LED")
    expect(screen.getByLabelText("Custom schema label").type).toBe("text")
    expect(screen.queryByLabelText("Nom")).toBeNull()
  })
  it("unsupported controls use a non-editable fallback without commits", () => {
    const commit = vi.fn()
    render(<PropertyField definition={{ label: "Future", control: "select" }} value="preserved" onCommit={commit} />)
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.getByText("preserved")).toBeTruthy()
    expect(commit).not.toHaveBeenCalled()
  })
  it.each(["light", "dark"])("uses existing readable %s theme styles for the name field", theme => {
    const style = document.createElement("style")
    style.textContent = readFileSync(resolve(testDirectory, "../components/ComponentInspector.css"), "utf8") + readFileSync(resolve(testDirectory, "../App.css"), "utf8")
    document.head.append(style)
    try {
      mount("LED", theme)
      const computed = getComputedStyle(screen.getByLabelText("Nom"))
      expect(computed.color).toBe(theme === "light" ? "rgb(15, 23, 42)" : "rgb(226, 232, 240)")
      expect(computed.backgroundColor).toBe(theme === "light" ? "rgb(226, 232, 240)" : "rgb(30, 41, 59)")
    } finally { style.remove() }
  })
})
