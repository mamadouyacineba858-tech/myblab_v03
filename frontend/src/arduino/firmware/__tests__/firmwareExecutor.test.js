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

describe("MB-L1-ARD-003 — firmwareExecutor.resume() — TEST T1-T15 (API temporelle)", () => {
  it("T1 — setup sans delay fonctionne comme ARD-002 (un seul appel resume() exécute tout)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); }\nvoid loop() {}")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
    expect(runtime.digitalWrite).toHaveBeenCalledWith("D2", Signal.HIGH)
  })

  it("T2 — setup suspendu par delay : l'instruction suivante n'exécute pas avant l'échéance", () => {
    const ir = compileOk(
      "void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); delay(100); digitalWrite(2, LOW); }\nvoid loop() {}"
    )
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
    executor.resume(50) // avant l'échéance (100)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1) // aucun nouvel appel
  })

  it("T3 — setup reprend à l'instruction suivante exactement à l'échéance", () => {
    const ir = compileOk(
      "void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); delay(100); digitalWrite(2, LOW); }\nvoid loop() {}"
    )
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    executor.resume(100)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.LOW)
  })

  it("T4 — loop écrit HIGH à t=0 (setup sans delay enchaîne immédiatement sur loop)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
  })

  it("T5 — reste HIGH avant expiration du delay", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    const callsBefore = runtime.digitalWrite.mock.calls.length
    executor.resume(499)
    expect(runtime.digitalWrite.mock.calls.length).toBe(callsBefore) // aucun nouvel appel
  })

  it("T6 — LOW exactement à expiration (t=500)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    executor.resume(500)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.LOW)
  })

  it("T7 — le second delay respecte sa propre échéance (t=999 encore LOW, t=1000 HIGH)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    executor.resume(500)
    const callsAt999 = runtime.digitalWrite.mock.calls.length
    executor.resume(999)
    expect(runtime.digitalWrite.mock.calls.length).toBe(callsAt999)
    executor.resume(1000)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
  })

  it("T8 — loop redémarre proprement après sa fin (deuxième tour identique au premier)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    executor.resume(500)
    executor.resume(1000)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH) // même comportement qu'à t=0
    executor.resume(1500)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.LOW)
  })

  it("T9 — séquence Blink complète 0/499/500/999/1000/1500 (§10/§28)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    const lastValue = () => runtime.digitalWrite.mock.calls.at(-1)?.[1]

    executor.resume(0)
    expect(lastValue()).toBe(Signal.HIGH)
    executor.resume(499)
    expect(lastValue()).toBe(Signal.HIGH)
    executor.resume(500)
    expect(lastValue()).toBe(Signal.LOW)
    executor.resume(999)
    expect(lastValue()).toBe(Signal.LOW)
    executor.resume(1000)
    expect(lastValue()).toBe(Signal.HIGH)
    executor.resume(1500)
    expect(lastValue()).toBe(Signal.LOW)
  })

  it("T10 — reset() réexécute setup depuis le début", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); digitalWrite(2, HIGH); delay(100); digitalWrite(2, LOW); }\nvoid loop() {}")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    executor.resume(100)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
    executor.reset()
    executor.resume(0)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(3)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
  })

  it("T11 — digitalWrite sans OUTPUT préalable échoue de façon déterministe (API temporelle aussi)", () => {
    const ir = compileOk("void setup() {}\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    expect(() => executor.resume(0)).toThrow(FirmwareExecutionError)
  })

  it("T12 — resume() est déterministe : deux instances indépendantes, même séquence d'appels, même résultat", () => {
    const source = "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }"
    const ir = compileOk(source)
    const runtimeA = fakeRuntime()
    const runtimeB = fakeRuntime()
    const executorA = new FirmwareExecutor(ir, runtimeA)
    const executorB = new FirmwareExecutor(ir, runtimeB)
    for (const t of [0, 499, 500, 999, 1000, 1500]) {
      executorA.resume(t)
      executorB.resume(t)
    }
    expect(runtimeA.digitalWrite.mock.calls).toEqual(runtimeB.digitalWrite.mock.calls)
  })

  it("T13 — grand dt déterministe : sauter directement à t=1000 depuis t=0 reprend exactement à l'instruction suspendue, sans ticks intermédiaires inventés (§13)", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1) // HIGH à t=0, delay(500) arme waitingUntil=500
    executor.resume(1000) // saut direct (dt=1000), pas de resume(500) intermédiaire
    // §13 : reprend l'instruction suspendue (LOW) au temps COURANT (1000, pas
    // un t=500 artificiel), puis le second delay(500) arme sa nouvelle
    // échéance depuis ce même t=1000 (waitingUntil=1500) — un seul nouvel
    // appel, jamais un tick par ms ni une réévaluation à t=500.
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
    expect(runtime.digitalWrite.mock.calls[1]).toEqual(["D2", Signal.LOW])

    // La nouvelle échéance est bien 1000+500=1500 (relative au temps de
    // reprise réel), pas 500+500=1000 : à t=1499 encore LOW, à t=1500 HIGH.
    executor.resume(1499)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
    executor.resume(1500)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(3)
    expect(runtime.digitalWrite.mock.calls[2]).toEqual(["D2", Signal.HIGH])
  })

  it("T14 — aucun accès à une horloge système (Date.now/performance.now) dans firmwareExecutor.js", () => {
    // Garde comportementale légère ; la preuve structurelle complète est
    // dans firmwareTemporalArchitecture.test.js.
    const ir = compileOk("void setup() {}\nvoid loop() { delay(1); }")
    const executor = new FirmwareExecutor(ir, fakeRuntime())
    const dateSpy = vi.spyOn(Date, "now")
    executor.resume(0)
    expect(dateSpy).not.toHaveBeenCalled()
    dateSpy.mockRestore()
  })

  it("T15 — resume() ne mute jamais l'IR exécutable", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }")
    const snapshot = JSON.stringify(ir)
    const executor = new FirmwareExecutor(ir, fakeRuntime())
    executor.resume(0)
    executor.resume(500)
    executor.resume(1000)
    expect(JSON.stringify(ir)).toBe(snapshot)
  })

  it("§12 — protection anti-boucle-infinie : un loop sans délai n'exécute qu'une seule itération par resume()", () => {
    const ir = compileOk("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    const runtime = fakeRuntime()
    const executor = new FirmwareExecutor(ir, runtime)
    executor.resume(0)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(1)
    executor.resume(1)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(2)
    executor.resume(2)
    expect(runtime.digitalWrite).toHaveBeenCalledTimes(3)
  })
})
