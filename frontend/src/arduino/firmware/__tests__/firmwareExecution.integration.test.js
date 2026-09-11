import { describe, it, expect } from "vitest"
import { compileFirmware } from "../firmwareCompiler.js"
import { FirmwareExecutor } from "../firmwareExecutor.js"
import { ArduinoSimulator } from "../../../simulator/arduino/ArduinoSimulator.js"
import { Signal } from "../../../simulator/signals.js"

/**
 * MB-L1-ARD-002 — §32 : preuve d'intégration avec le VRAI ArduinoSimulator
 * (pas un fake runtime) — source -> compileFirmware() -> FirmwareExecutor
 * -> ArduinoSimulator réel -> tick() -> Signal.HIGH/LOW observé.
 *
 * ArduinoSimulator.js n'est pas modifié par ce ticket (§39) : ce test
 * prouve que son API `digitalWrite(pin, level)`/`start()`/`tick()`
 * existante satisfait déjà l'interface RuntimePort attendue par
 * FirmwareExecutor, sans aucune adaptation.
 */
describe("MB-L1-ARD-002 — intégration réelle avec ArduinoSimulator", () => {
  it("programme HIGH : D2 devient Signal.HIGH après start() + runLoopOnce() + tick()", () => {
    const source = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n}\n"
    const compiled = compileFirmware(source)
    expect(compiled.ok).toBe(true)

    const runtime = new ArduinoSimulator()
    runtime.start()

    const executor = new FirmwareExecutor(compiled.ir, runtime)
    executor.start()
    executor.runLoopOnce()

    const signalMap = runtime.tick(0)
    expect(signalMap.get("D2")).toBe(Signal.HIGH)
  })

  it("programme LOW : D2 devient Signal.LOW après start() + runLoopOnce() + tick()", () => {
    const source = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, LOW);\n}\n"
    const compiled = compileFirmware(source)
    expect(compiled.ok).toBe(true)

    const runtime = new ArduinoSimulator()
    runtime.start()

    const executor = new FirmwareExecutor(compiled.ir, runtime)
    executor.start()
    executor.runLoopOnce()

    const signalMap = runtime.tick(0)
    expect(signalMap.get("D2")).toBe(Signal.LOW)
  })

  it("programme minimal 2 (§6) : D3 LOW après setup, D3 HIGH après une itération de loop", () => {
    const source = "void setup() {\n  pinMode(3, OUTPUT);\n  digitalWrite(3, LOW);\n}\n\nvoid loop() {\n  digitalWrite(3, HIGH);\n}\n"
    const compiled = compileFirmware(source)
    expect(compiled.ok).toBe(true)

    const runtime = new ArduinoSimulator()
    runtime.start()
    const executor = new FirmwareExecutor(compiled.ir, runtime)

    executor.start()
    expect(runtime.tick(0).get("D3")).toBe(Signal.LOW)

    executor.runLoopOnce()
    expect(runtime.tick(1).get("D3")).toBe(Signal.HIGH)
  })

  it("§33 — l'ordre des instructions est conservé sur le runtime réel (dernier HIGH gagne)", () => {
    const source = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  digitalWrite(2, LOW);\n  digitalWrite(2, HIGH);\n}\n"
    const compiled = compileFirmware(source)
    const runtime = new ArduinoSimulator()
    runtime.start()
    const executor = new FirmwareExecutor(compiled.ir, runtime)
    executor.start()
    executor.runLoopOnce()
    expect(runtime.tick(0).get("D2")).toBe(Signal.HIGH)
  })

  it("T35 — un source invalide ne compile pas, et le runtime réel n'est jamais touché (aucun HIGH partiel)", () => {
    const source = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  Serial.begin(9600);\n}\n"
    const compiled = compileFirmware(source)
    expect(compiled.ok).toBe(false)

    const runtime = new ArduinoSimulator()
    runtime.start()
    // Le compilateur a échoué : aucun FirmwareExecutor n'est même construit,
    // exactement le comportement attendu de l'appelant (composition future,
    // MB-L1-ARD-004) — le runtime reste dans son état initial.
    expect(runtime.tick(0).size).toBe(0)
  })
})
