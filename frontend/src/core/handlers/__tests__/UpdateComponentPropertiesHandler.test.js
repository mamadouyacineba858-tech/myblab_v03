import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { UpdateComponentPropertiesHandler } from "../component/UpdateComponentPropertiesHandler.js"
import { AddComponentHandler } from "../component/AddComponentHandler.js"
import { createHandlerTestContext } from "./fixtures/testHistoryContext.js"
import { validateComponentProperties } from "../../../config/componentProperties.js"

function fixture() {
  const component = { id: "c", type: "ARDUINO", position: { x: 10, y: 20 }, pins: [{ id: "D2" }], parameters: {}, properties: { name: "" }, firmware: { source: "original" }, state: "state" }
  const ctx = createHandlerTestContext({ components: [component], wires: [] })
  return { ...ctx, handler: new UpdateComponentPropertiesHandler({ ...ctx, validateProperties: validateComponentProperties }), component }
}
function command(beforeProperties = { name: "" }, afterProperties = { name: "LED témoin" }) {
  return { type: "UPDATE_COMPONENT_PROPERTIES", payload: { componentId: "c", beforeProperties, afterProperties } }
}
describe("L1-PROP-001 dedicated Handler", () => {
  it("updates only properties, snapshots History, and restores exact Undo/Redo", () => {
    const { handler, documentApi, historyService, historyManager, component } = fixture()
    const cmd = command()
    const before = documentApi.getDocument()
    handler.execute(cmd, before)
    expect(documentApi.getDocument().components[0]).toEqual({ ...component, properties: { name: "LED témoin" } })
    expect(before.components[0]).toEqual(component)
    expect(historyManager.undoStack).toHaveLength(1)
    expect(historyManager.undoStack[0].getLastResult().change.type).toBe("UPDATE_COMPONENT_PROPERTIES")
    cmd.payload.beforeProperties.name = "mutated"
    cmd.payload.afterProperties.name = "mutated"
    historyService.undo()
    expect(documentApi.getDocument().components[0]).toEqual(component)
    historyService.redo()
    expect(documentApi.getDocument().components[0].properties).toEqual({ name: "LED témoin" })
  })
  it("does not record identical snapshots", () => {
    const { handler, documentApi, historyManager } = fixture()
    handler.execute(command({ name: "" }, { name: "" }), documentApi.getDocument())
    expect(historyManager.undoStack).toHaveLength(0)
  })
  it.each([null, [], new Date(), Object.create({ name: "inherited" })])("rejects non-plain before/after objects", invalid => {
    const { handler, documentApi, historyManager } = fixture()
    expect(() => handler.execute(command(invalid), documentApi.getDocument())).toThrow()
    expect(() => handler.execute(command({ name: "" }, invalid), documentApi.getDocument())).toThrow()
    expect(historyManager.undoStack).toHaveLength(0)
  })
  it("rejects invalid id, missing component, required snapshots and semantic errors before History", () => {
    const { handler, documentApi, historyManager } = fixture()
    for (const componentId of ["", 123, "missing"]) {
      const cmd = command(); cmd.payload.componentId = componentId
      expect(() => handler.execute(cmd, documentApi.getDocument())).toThrow()
    }
    expect(() => handler.execute({ payload: { componentId: "c" } }, documentApi.getDocument())).toThrow()
    expect(() => handler.execute(command({ name: "" }, { name: 123 }), documentApi.getDocument())).toThrow()
    expect(historyManager.undoStack).toHaveLength(0)
  })
  it("ADD/REDO clones supplied properties without domain knowledge", () => {
    const ctx = createHandlerTestContext({ components: [], wires: [] })
    const handler = new AddComponentHandler(ctx)
    const cmd = { type: "ADD_COMPONENT", payload: { componentType: "CUSTOM", componentId: "c", properties: { name: "custom" } } }
    handler.execute(cmd, ctx.documentApi.getDocument())
    expect(ctx.documentApi.getDocument().components[0].properties).toEqual({ name: "custom" })
    ctx.historyService.undo(); ctx.historyService.redo()
    expect(ctx.documentApi.getDocument().components[0].properties).toEqual({ name: "custom" })
    expect(handler._applyRedo(cmd, { components: [] }).newComponent.properties).not.toBe(cmd.payload.properties)
  })
  it("Core Handler imports no type catalogue, Simulation or Presentation", () => {
    const source = readFileSync(new URL("../component/UpdateComponentPropertiesHandler.js", import.meta.url), "utf8")
    expect(source).not.toMatch(/simulator|componentDefinitions|componentProperties|ARDUINO|LED|RESISTOR|react|Presentation/)
  })
})
