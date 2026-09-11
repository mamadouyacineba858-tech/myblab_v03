import { describe, it, expect } from "vitest"
import { compileFirmware } from "../firmwareCompiler.js"
import { FirmwareExecutor } from "../firmwareExecutor.js"
import { FirmwareRuntimeController } from "../firmwareRuntimeController.js"
import { ArduinoSimulator } from "../../../simulator/arduino/ArduinoSimulator.js"
import { createScheduler } from "../../../simulator/scheduler.js"
import { Signal } from "../../../simulator/signals.js"

/**
 * MB-L1-ARD-003 — §28 : Test Blink Core obligatoire, SANS React, avec le
 * VRAI ArduinoSimulator ET le VRAI Scheduler (pas de fake runtime, pas de
 * scheduler de test) — la preuve finale que le Firmware Runtime piloté par
 * le Scheduler produit des transitions GPIO réelles et déterministes.
 */
const BLINK_SOURCE = "void setup() {\n  pinMode(2, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(2, HIGH);\n  delay(500);\n  digitalWrite(2, LOW);\n  delay(500);\n}\n"

function buildRealController() {
  const compiled = compileFirmware(BLINK_SOURCE)
  expect(compiled.ok).toBe(true)

  const runtime = new ArduinoSimulator()
  runtime.start()
  const executor = new FirmwareExecutor(compiled.ir, runtime)
  const scheduler = createScheduler()
  const controller = new FirmwareRuntimeController({ scheduler, executor })
  return { controller, runtime }
}

describe("MB-L1-ARD-003 — Blink Core (real ArduinoSimulator + real Scheduler)", () => {
  it("§28 — séquence exacte : start/t=0 HIGH, advance(499) HIGH, advance(1) LOW, advance(499) LOW, advance(1) HIGH, advance(500) LOW", () => {
    const { controller, runtime } = buildRealController()
    const signalAt = (t) => runtime.tick(t).get("D2")

    controller.start()
    expect(signalAt(controller.getCurrentTime())).toBe(Signal.HIGH)

    controller.advance(499)
    expect(signalAt(controller.getCurrentTime())).toBe(Signal.HIGH)

    controller.advance(1)
    expect(controller.getCurrentTime()).toBe(500)
    expect(signalAt(controller.getCurrentTime())).toBe(Signal.LOW)

    controller.advance(499)
    expect(signalAt(controller.getCurrentTime())).toBe(Signal.LOW)

    controller.advance(1)
    expect(controller.getCurrentTime()).toBe(1000)
    expect(signalAt(controller.getCurrentTime())).toBe(Signal.HIGH)

    controller.advance(500)
    expect(controller.getCurrentTime()).toBe(1500)
    expect(signalAt(controller.getCurrentTime())).toBe(Signal.LOW)
  })

  it("AC-14 — le vrai Scheduler est bien la source de temps consultée (getCurrentTime reflète les advance() cumulés)", () => {
    const { controller } = buildRealController()
    controller.start()
    controller.advance(200)
    controller.advance(300)
    expect(controller.getCurrentTime()).toBe(500)
  })

  it("stop() puis reset() puis start() reproduit exactement la même séquence depuis le début", () => {
    const { controller, runtime } = buildRealController()
    controller.start()
    controller.advance(500)
    controller.stop()
    controller.reset()

    expect(controller.getCurrentTime()).toBe(0)
    controller.start()
    expect(runtime.tick(0).get("D2")).toBe(Signal.HIGH)
  })
})
