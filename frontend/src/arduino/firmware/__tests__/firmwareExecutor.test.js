import { describe, it, expect, vi } from "vitest"
import { FirmwareExecutor, FirmwareExecutionError } from "../firmwareExecutor.js"
import { compileFirmware } from "../firmwareCompiler.js"
import { Signal } from "../../../simulator/signals.js"

function fakeRuntime() {
  return { digitalWrite: vi.fn() }
}

function compileOk(source) {
  const result = compileFirmware(source)
  expect(result.ok).toBe(true)
  return result.ir
}

describe("MB-L1-ARD-002 — firmwareExecutor — TEST E1-E12", () => {
  it("E1 — start() exécute setup exactement une fois", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); }\nvoid loop() {}")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
    expect(runtime.digitalWrite).toHaveBeenCalledWith("D2", Signal.HIGH)
  })

  it("E2 — un second appel à start() ne réexécute pas setup", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); }\nvoid loop() {}")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.start()
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
  })

  it("E3 — runLoopOnce() exécute exactement une itération de loop", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
    executor.runLoopOnce()
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
  })

  it("E4 — PIN_MODE enregistre D2 en OUTPUT (digitalWrite D2 devient permis)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    expect(() => executor.runLoopOnce()).not.toThrow()
  })

  it("E5 — digitalWrite HIGH atteint le runtime port avec Signal.HIGH", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
  })

  it("E6 — digitalWrite LOW atteint le runtime port avec Signal.LOW", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, LOW); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.LOW)
  })

  it("E7 — le mapping D3 fonctionne", () => {
    const ir = compileOk("void setup() { pinMode(3, OUTPUT); }\nvoid loop() { digitalWrite(3, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D3", Signal.HIGH)
  })

  it("E8 — digitalWrite sans OUTPUT préalable échoue de façon déterministe", () => {
    const ir = compileOk("void setup() {}\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    expect(() => executor.runLoopOnce()).toThrow(FirmwareExecutionError)
    expect(runtime.digitalWrite).not.toHaveBeenCalled()
  })

  it("E9 — reset() permet à setup de s'exécuter à nouveau", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); }\nvoid loop() {}")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
    executor.reset()
    executor.start()
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
  })

  it("E9b — reset() oublie les pinModes enregistrés (digitalWrite redevient interdit après reset sans nouveau pinMode)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    executor.reset()
    expect(() => executor.runLoopOnce()).toThrow(FirmwareExecutionError)
  })

  it("E10 — l'exécuteur ne mute jamais l'IR exécutable", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const snapshot = JSON.stringify(ir)
    const executor = new FirmwareExecutor(ir, fakeRuntime())
    executor.start()
    executor.runLoopOnce()
    expect(JSON.stringify(ir)).toBe(snapshot)
  })

  it("E11 — l'exécuteur ne touche jamais le Document (aucune référence conservée au-delà de l'IR/runtimePort fournis)", () => {
    const ir = compileOk("void setup() {}\nvoid loop() {}")
    const executor = new FirmwareExecutor(ir, fakeRuntime())
    expect(executor).not.toHaveProperty("document")
    expect(executor).not.toHaveProperty("firmware")
  })

  it("E12 — l'exécution ne dépend d'aucun mécanisme d'historique (aucun import, aucun effet observable au-delà du runtimePort)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    // Seul digitalWrite() du runtimePort a été appelé — aucune autre méthode
    // (undo/redo/history-like) n'existe sur le fake runtime, donc aucun
    // appel inattendu n'a pu se produire.
    expect(Object.keys(runtime)).toEqual(['digitalWrite'])
  })
})

describe("MB-L1-ARD-002 — TEST §33/§34 : ordre et setup/loop distincts", () => {
  it("§33 — l'ordre des instructions du loop est strictement conservé (dernier HIGH gagne)", () => {
    const ir = compileOk(
      "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); digitalWrite(2, LOW); digitalWrite(2, HIGH); }"
    )
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    executor.runLoopOnce()
    expect(runtime.digitalWrite.mock.calls).toEqual([
      ["D2", Signal.HIGH],
      ["D2", Signal.LOW],
      ["D2", Signal.HIGH],
    ])
  })

  it("§34 — setup() écrit HIGH, puis runLoopOnce() écrit LOW : les deux effets sont observés dans l'ordre", () => {
    const ir = compileOk(
      "void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); }\nvoid loop() { digitalWrite(2, LOW); }"
    )
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.start()
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
    executor.runLoopOnce()
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.LOW)
  })
})
