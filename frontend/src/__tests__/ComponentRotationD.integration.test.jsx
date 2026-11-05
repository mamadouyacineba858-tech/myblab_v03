import { computeSceneBounds } from "../utils/sceneBounds.js"
import React from "react"
import { afterEach, describe, expect, it } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { getComponentRotation, getOrientedComponentDef, rotateLocalPoint } from "../utils/componentOrientation.js"
import { getPinPosition } from "../utils/geometry.js"
import { getPinPresentationPosition } from "../utils/pinPresentationGeometry.js"
import { buildWirePaths } from "../utils/circuitSelectors.js"
import { computeMultiBreadboardPlacement } from "../utils/breadboardAssociation.js"
import { resolveComponentContactHoles } from "../utils/breadboardGeometry.js"
import { deriveBreadboardVirtualWires } from "../utils/breadboardConnectivity.js"
import { ReactDocumentMapper } from "../bridge/ReactDocumentMapper.js"
import { toEngineInput } from "../simulator/engineAdapter.js"
import { runSimulation, getLedState } from "../simulator/engine.js"
import { resetInstruments } from "../instruments/instrumentsStore.js"

afterEach(() => { cleanup(); resetInstruments() })
const wrapper = ({ children }) => React.createElement(CircuitProvider, null, children)
const fixture = () => ({
  version: 1,
  components: [
    { uid: "p", type: "POWER", x: 100, y: 100, parameters: { voltage: 5 } },
    { uid: "r", type: "RESISTOR", x: 300, y: 100, parameters: { resistance: 220 } },
    { uid: "d", type: "LED", x: 500, y: 100 },
  ],
  wires: [
    { id: "w1", fromUid: "p", fromPin: "5V", toUid: "r", toPin: "A" },
    { id: "w2", fromUid: "r", fromPin: "B", toUid: "d", toPin: "anode" },
    { id: "w3", fromUid: "d", fromPin: "cathode", toUid: "p", toPin: "GND" },
  ],
})

describe("D-FINAL — rotations, wires, breadboard and document", () => {
  it.each([0, 90, 180, 270])("positions at %i degrees use the same transform for pins and physical contacts", rotation => {
    const c = { uid: "b", type: "BUTTON", x: 100, y: 200, rotation }
    const def = getComponentDef(c.type)
    for (const pin of def.pins) {
      const expected = rotateLocalPoint(def, pin, rotation)
      expect(getPinPosition(c, pin)).toEqual({ x: c.x + expected.dx, y: c.y + expected.dy })
      for (const contact of pin.contacts) {
        const offset = rotateLocalPoint(def, contact, rotation)
        expect(getPinPresentationPosition(c, pin, { contact })).toEqual({ x: c.x + offset.dx, y: c.y + offset.dy })
      }
    }
  })

  it("rotations compose with local zoom around the same centre", () => {
    const c = { type: "RESISTOR", x: 100, y: 200, rotation: 90 }
    const def = getComponentDef(c.type), pin = def.pins[0]
    const bounds = computeSceneBounds([c])
    const flat = computeSceneBounds([{ ...c, rotation: 0 }])
    expect(bounds.minX + bounds.maxX).toBe(flat.minX + flat.maxX)
    expect(bounds.minY + bounds.maxY).toBe(flat.minY + flat.maxY)
    expect(bounds.maxX - bounds.minX).toBe(def.height)
    const p = getPinPresentationPosition(c, pin)
    const zoom = getPinPresentationPosition(c, pin, { scale: 2 })
    expect(zoom).toEqual({ x: c.x + def.width / 2 + 2 * (p.x - c.x - def.width / 2), y: c.y + def.height / 2 + 2 * (p.y - c.y - def.height / 2) })
  })

  it("rotation survives the real document, undo/redo, movement, export/import and electrical solve", () => {
    const hook = renderHook(() => useCircuit(), { wrapper })
    act(() => hook.result.current.importCircuit(fixture()))
    const before = hook.result.current.exportCircuit()
    const beforePaths = buildWirePaths(before.components, before.wires)
    const historyBefore = hook.result.current.getUndoCount()
    act(() => { expect(hook.result.current.rotateComponent("r")).toBe(true) })
    let doc = hook.result.current.exportCircuit()
    expect(doc.components.find(c => c.uid === "r").rotation).toBe(90)
    expect(doc.wires).toEqual(before.wires)
    expect(buildWirePaths(doc.components, doc.wires)).not.toEqual(beforePaths)
    expect(hook.result.current.getUndoCount()).toBe(historyBefore + 1)
    act(() => hook.result.current.undo())
    expect(hook.result.current.exportCircuit()).toEqual(before)
    act(() => hook.result.current.redo())
    act(() => hook.result.current.updateComponentParameters("r", { resistance: 330 }))
    const edited = hook.result.current.exportCircuit()
    act(() => hook.result.current.undo())
    expect(hook.result.current.exportCircuit().components.find(c => c.uid === "r").rotation).toBe(90)
    act(() => hook.result.current.redo())
    expect(hook.result.current.exportCircuit()).toEqual(edited)
    act(() => hook.result.current.updateComponentPositions(new Map([["r", { x: 360, y: 180 }]])))
    doc = hook.result.current.exportCircuit()
    expect(doc.components.find(c => c.uid === "r")).toMatchObject({ x: 360, y: 180, rotation: 90 })
    const encoded = JSON.stringify(doc)
    hook.unmount()
    const reopened = renderHook(() => useCircuit(), { wrapper })
    act(() => reopened.result.current.importCircuit(JSON.parse(encoded)))
    expect(reopened.result.current.exportCircuit()).toEqual(doc)
    const adapted = toEngineInput(ReactDocumentMapper.toCore(doc))
    expect(getLedState("d", runSimulation(adapted.components, adapted.wires)).on).toBe(true)
  })

  it("four consecutive quarter turns restore the wire geometry, and fixed equipment cannot rotate", () => {
    const hook = renderHook(() => useCircuit(), { wrapper })
    act(() => hook.result.current.importCircuit(fixture()))
    const initial = hook.result.current.exportCircuit()
    act(() => {
      for (let i = 0; i < 4; i++) hook.result.current.rotateComponent("r")
      expect(hook.result.current.rotateComponent("p")).toBe(false)
      expect(hook.result.current.rotateComponent("missing")).toBe(false)
    })
    const doc = hook.result.current.exportCircuit()
    expect(getComponentRotation(doc.components.find(c => c.uid === "r"))).toBe(0)
    expect(buildWirePaths(doc.components, doc.wires)).toEqual(buildWirePaths(initial.components, initial.wires))
    expect(doc.components.find(c => c.uid === "p")).toEqual(initial.components.find(c => c.uid === "p"))
  })

  it("rotated resistor snaps to actual holes and contributes the correct breadboard nets", () => {
    const board = { id: "bb", position: { x: 100, y: 100 } }
    const component = { uid: "r", type: "RESISTOR", x: 140, y: 140, rotation: 90 }
    const placement = computeMultiBreadboardPlacement([board], component.type, component, [], 90)
    expect(placement.valid).toBe(true)
    const placed = { ...component, ...placement.position }
    const pins = getOrientedComponentDef(placed).pins
    const contacts = resolveComponentContactHoles(board, pins, placed)
    expect(contacts.allResolved).toBe(true)
    const doc = ReactDocumentMapper.toCore({
      components: [placed, { ...placed, uid: "q" }],
      wires: [], breadboards: [board],
    })
    const direct = deriveBreadboardVirtualWires(doc)
    expect(direct).toHaveLength(2)
    expect(direct.map(w => [w.pinA.pinId, w.pinB.pinId])).toEqual([["A", "A"], ["B", "B"]])
    const collision = computeMultiBreadboardPlacement([board], component.type, placed, [{ ...placed, uid: "q" }], 90)
    expect(collision.valid).toBe(false)
    expect(contacts.results.map(r => r.pinId)).toEqual(["A", "B"])
  })
})
