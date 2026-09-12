import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { DEFAULT_FIRMWARE_SOURCE } from "../arduino/firmwareDefaults.js"
const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
function fixture(type = "RESISTOR") {
  const { result } = renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
  act(() => result.current.addComponent(type, 20, 40))
  const uid = result.current.components[0].uid
  return { result, uid, edit: patch => act(() => result.current.updateComponentProperties(uid, patch)) }
}
describe("L1-PROP-001 persistent property command channel", () => {
  it("ADD materializes defaults independently from electrical parameters", () => {
    const { result, edit } = fixture()
    expect(result.current.components[0].properties).toEqual({ name: "" })
    expect(result.current.components[0].parameters).toEqual({ resistance: 220 })
    const original = result.current.exportCircuit().components[0]
    edit({ name: "R entrée" })
    expect(result.current.exportCircuit().components[0]).toEqual({ ...original, properties: { name: "R entrée" } })
  })
  it("one edit creates one History entry; Undo/Redo are exact and new edits invalidate redo", () => {
    const { result, edit } = fixture("LED")
    const count = result.current.getUndoCount()
    edit({ name: "LED témoin" })
    expect(result.current.getUndoCount()).toBe(count + 1)
    edit({ name: "LED témoin" }); edit({})
    expect(result.current.getUndoCount()).toBe(count + 1)
    act(() => result.current.undo())
    expect(result.current.components[0].properties.name).toBe("")
    act(() => result.current.redo())
    expect(result.current.components[0].properties.name).toBe("LED témoin")
    act(() => result.current.undo())
    edit({ name: "B" })
    expect(result.current.canRedo()).toBe(false)
    act(() => result.current.redo())
    expect(result.current.components[0].properties.name).toBe("B")
  })
  it.each([{ name: 123 }, { name: "x".repeat(81) }, { surprise: 1 }, null, []])("invalid edits leave Document and History untouched: %j", patch => {
    const { result, edit } = fixture()
    const document = result.current.exportCircuit()
    const count = result.current.getUndoCount()
    edit(patch)
    expect(result.current.exportCircuit()).toEqual(document)
    expect(result.current.getUndoCount()).toBe(count)
  })
  it("Unicode export/import and ADD undo/redo preserve name and firmware separately", () => {
    const { result, edit } = fixture("ARDUINO")
    expect(result.current.components[0].firmware.source).toBe(DEFAULT_FIRMWARE_SOURCE)
    act(() => result.current.undo()); act(() => result.current.redo())
    expect(result.current.components[0].properties).toEqual({ name: "" })
    edit({ name: "  Capteur température 💡  " })
    const exported = JSON.parse(JSON.stringify(result.current.exportCircuit()))
    act(() => result.current.clearCircuit())
    act(() => result.current.importCircuit(exported))
    expect(result.current.components[0].properties.name).toBe("  Capteur température 💡  ")
    expect(result.current.components[0].firmware.source).toBe(DEFAULT_FIRMWARE_SOURCE)
  })
  it("legacy imports can be edited and undo resolves their effective empty name", () => {
    const { result } = fixture()
    const legacy = result.current.exportCircuit()
    delete legacy.components[0].properties
    act(() => result.current.importCircuit(legacy))
    const uid = result.current.components[0].uid
    act(() => result.current.updateComponentProperties(uid, { name: "legacy" }))
    expect(result.current.components[0].properties.name).toBe("legacy")
    act(() => result.current.undo())
    expect(result.current.components[0].properties.name).toBe("")
  })
})
